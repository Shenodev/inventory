<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\LoginRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cookie;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Laravel\Sanctum\PersonalAccessToken;

class AuthController extends Controller
{
    /**
     * Bcrypt hash of a random value, verified against when the email does not
     * match a user so failed logins take the same time whether or not the
     * account exists (prevents user enumeration through timing).
     */
    private const DUMMY_PASSWORD_HASH = '$2y$12$lGt7.jfJfxksTPQ6kt8aLuxtXd.Zpq9WgIY8QwPXyJrm9Vm4pkANO';

    /**
     * Short-lived bearer token. 15 minutes keeps a leaked token's blast radius
     * small, and the refresh endpoint issues fresh ones for sessions that are
     * still alive (the 7-day refresh token).
     */
    private const ACCESS_TOKEN_TTL_MINUTES = 15;

    /**
     * Longer-lived token that is only good for one thing: obtaining a new
     * access token. 7 days avoids forcing the user back to the sign-in page on
     * a typical work week while still bounding the window of reuse.
     */
    private const REFRESH_TOKEN_TTL_DAYS = 7;

    public function login(LoginRequest $request): JsonResponse
    {
        $email = $request->string('email')->lower()->toString();
        $password = $request->string('password')->toString();
        $deviceName = mb_substr($request->string('device_name', 'web')->toString(), 0, 40);

        $user = User::query()->where('email', $email)->first();

        $passwordIsValid = Hash::check($password, $user?->password ?? self::DUMMY_PASSWORD_HASH);

        if (! $user instanceof User || ! $passwordIsValid) {
            // Generic message, no user enumeration; not logging raw email beyond audit hash
            Log::info('Failed login attempt', ['email_hash' => hash('sha256', $email)]);
            return response()->json([
                'message' => 'The provided credentials are incorrect.',
            ], JsonResponse::HTTP_UNAUTHORIZED);
        }

        // Track login for audit / anomaly detection
        $user->forceFill([
            'last_login_at' => now(),
            'last_login_ip' => $request->ip(),
        ])->save();

        $accessToken = $user->createToken(
            "{$deviceName} access",
            ['access'],
            now()->addMinutes(self::ACCESS_TOKEN_TTL_MINUTES),
        );

        $refreshToken = $user->createToken(
            "{$deviceName} refresh",
            ['issue-access-token'],
            now()->addDays(self::REFRESH_TOKEN_TTL_DAYS),
        );

        // httpOnly refresh cookie: token no longer lives in JS-accessible storage alone
        // Secure=true only in production/https; SameSite=Lax prevents CSRF while allowing top-level navigation
        $secure = app()->environment('production') || $request->isSecure();
        $refreshCookie = cookie(
            'refresh_token',
            $refreshToken->plainTextToken,
            self::REFRESH_TOKEN_TTL_DAYS * 24 * 60,
            '/',
            null,
            $secure,
            true, // httpOnly
            false,
            'Lax'
        );

        $response = response()->json([
            'access_token' => $accessToken->plainTextToken,
            // refresh_token still returned for legacy/mobile clients, but also set as httpOnly cookie
            'refresh_token' => $refreshToken->plainTextToken,
            'token_type' => 'Bearer',
            'expires_in' => self::ACCESS_TOKEN_TTL_MINUTES * 60,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role instanceof \App\Enums\UserRole ? $user->role->value : (string) ($user->role ?? 'operator'),
                'email_verified' => $user->hasVerifiedEmail(),
            ],
        ]);

        return $response->withCookie($refreshCookie);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user instanceof User) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }
        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role instanceof \App\Enums\UserRole ? $user->role->value : (string) ($user->role ?? 'operator'),
                'email_verified' => $user->hasVerifiedEmail(),
            ],
        ]);
    }

    public function refresh(Request $request): JsonResponse
    {
        // Prefer httpOnly cookie, fallback to body for backward compat
        $refreshToken = $request->cookie('refresh_token') ?? $request->string('refresh_token')->toString();
        $refreshToken = is_string($refreshToken) ? trim($refreshToken) : '';

        $token = PersonalAccessToken::findToken($refreshToken);

        $tokenExpired = $token?->expires_at !== null && $token->expires_at->isPast();

        if (! $token instanceof PersonalAccessToken || ! $token->can('issue-access-token') || $tokenExpired) {
            return response()->json([
                'message' => 'The refresh token is invalid or has expired.',
            ], JsonResponse::HTTP_UNAUTHORIZED);
        }

        $user = $token->tokenable;

        if (! $user instanceof User) {
            return response()->json([
                'message' => 'The refresh token is invalid.',
            ], JsonResponse::HTTP_UNAUTHORIZED);
        }

        $accessToken = $user->createToken(
            $token->name.' access',
            ['access'],
            now()->addMinutes(self::ACCESS_TOKEN_TTL_MINUTES),
        );

        return response()->json([
            'access_token' => $accessToken->plainTextToken,
            'token_type' => 'Bearer',
            'expires_in' => self::ACCESS_TOKEN_TTL_MINUTES * 60,
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        // Revoke current access token + all refresh tokens for this device/session
        $user = $request->user();
        $current = $request->user()?->currentAccessToken();
        if ($current) {
            $current->delete();
        }
        // Optionally revoke all refresh tokens for user to fully logout everywhere:
        // $user?->tokens()->where('abilities', 'like', '%issue-access-token%')->delete();

        $response = response()->json([
            'message' => 'Logged out.',
        ]);

        // Clear refresh cookie
        return $response->withCookie(Cookie::forget('refresh_token', '/', null));
    }
}
