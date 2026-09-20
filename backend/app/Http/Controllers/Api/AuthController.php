<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\LoginRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
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
        $deviceName = $request->string('device_name', 'web')->toString();

        $user = User::query()->where('email', $email)->first();

        $passwordIsValid = Hash::check($password, $user?->password ?? self::DUMMY_PASSWORD_HASH);

        if (! $user instanceof User || ! $passwordIsValid) {
            return response()->json([
                'message' => 'The provided credentials are incorrect.',
            ], JsonResponse::HTTP_UNAUTHORIZED);
        }

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

        return response()->json([
            'access_token' => $accessToken->plainTextToken,
            'refresh_token' => $refreshToken->plainTextToken,
            'token_type' => 'Bearer',
            'expires_in' => self::ACCESS_TOKEN_TTL_MINUTES * 60,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
            ],
        ]);
    }

    public function refresh(Request $request): JsonResponse
    {
        $refreshToken = $request->string('refresh_token')->toString();

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
        $request->user()?->currentAccessToken()?->delete();

        return response()->json([
            'message' => 'Logged out.',
        ]);
    }
}
