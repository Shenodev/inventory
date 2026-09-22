<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Admin;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $users = User::query()->orderBy('name')->get(['id', 'name', 'email', 'role', 'created_at']);

        return response()->json([
            'users' => $users->map(fn (User $u) => [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'role' => $u->role instanceof UserRole ? $u->role->value : (string) ($u->role ?? UserRole::Operator->value),
                'created_at' => $u->created_at?->toIso8601String(),
            ]),
        ]);
    }

    public function updateRole(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'role' => ['required', Rule::in(array_column(UserRole::cases(), 'value'))],
        ]);

        // Prevent self-demotion lockout
        if ($request->user()?->id === $user->id && $validated['role'] !== UserRole::Admin->value) {
            return response()->json(['message' => 'Cannot change your own admin role.'], 422);
        }

        $user->role = UserRole::from($validated['role']);
        $user->save();

        return response()->json([
            'message' => 'Role updated.',
            'user' => [
                'id' => $user->id,
                'email' => $user->email,
                'role' => $user->role->value,
            ],
        ]);
    }
}
