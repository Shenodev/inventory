<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\LoginRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    /**
     * Bcrypt hash of a random value, verified against when the email does not
     * match a user so failed logins take the same time whether or not the
     * account exists (prevents user enumeration through timing).
     */
    private const DUMMY_PASSWORD_HASH = '$2y$12$lGt7.jfJfxksTPQ6kt8aLuxtXd.Zpq9WgIY8QwPXyJrm9Vm4pkANO';

    public function login(LoginRequest $request): JsonResponse
    {
        $email = $request->string('email')->lower()->toString();
        $password = $request->string('password')->toString();

        $user = User::query()->where('email', $email)->first();

        $passwordIsValid = Hash::check($password, $user?->password ?? self::DUMMY_PASSWORD_HASH);

        if (! $user instanceof User || ! $passwordIsValid) {
            return response()->json([
                'message' => 'The provided credentials are incorrect.',
            ], JsonResponse::HTTP_UNAUTHORIZED);
        }

        $token = $user->createToken($request->string('device_name', 'web')->toString())->plainTextToken;

        return response()->json([
            'token' => $token,
            'token_type' => 'Bearer',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
            ],
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
