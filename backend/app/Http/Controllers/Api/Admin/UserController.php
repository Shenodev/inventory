<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Admin;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreAdminUserRequest;
use App\Http\Requests\Api\UpdateAdminUserRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
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

    public function store(StoreAdminUserRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $user = User::create([
            'name' => $validated['name'],
            'email' => strtolower(trim($validated['email'])),
            'password' => Hash::make($validated['password']),
            'role' => UserRole::from($validated['role']),
        ]);

        return response()->json([
            'message' => 'User created.',
            'user' => $this->present($user),
        ], JsonResponse::HTTP_CREATED);
    }

    public function update(UpdateAdminUserRequest $request, User $user): JsonResponse
    {
        $validated = $request->validated();

        // Prevent self-demotion / self-disable lockout: the last admin must stay
        // able to administer. Use an explicit flag so PATCH can still send role.
        if ($request->user()?->id === $user->id && array_key_exists('role', $validated)) {
            if ($validated['role'] !== UserRole::Admin->value) {
                return response()->json(
                    ['message' => 'You cannot change your own role away from admin while signed in.'],
                    JsonResponse::HTTP_UNPROCESSABLE_ENTITY,
                );
            }
        }

        if (array_key_exists('name', $validated)) {
            $user->name = $validated['name'];
        }
        if (array_key_exists('email', $validated)) {
            $user->email = strtolower(trim($validated['email']));
        }
        if (array_key_exists('role', $validated)) {
            $user->role = UserRole::from($validated['role']);
        }
        if (! empty($validated['password'])) {
            $user->password = Hash::make($validated['password']);
        }
        $user->save();

        return response()->json([
            'message' => 'User updated.',
            'user' => $this->present($user),
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

    public function destroy(Request $request, User $user): JsonResponse
    {
        // Prevent self-deletion lockout: the signed-in admin must stay able to
        // administer the account they are signed in with.
        if ($request->user()?->id === $user->id) {
            return response()->json(
                ['message' => 'You cannot delete your own account while signed in.'],
                JsonResponse::HTTP_UNPROCESSABLE_ENTITY,
            );
        }

        // Drop the user's Sanctum tokens (they would otherwise orphan rows whose
        // tokenable no longer resolves), then delete the account.
        $user->tokens()->delete();

        $user->delete();

        return response()->json(['message' => 'User deleted.']);
    }

    /**
     * @return array{id: int, name: string, email: string, role: string, created_at: string|null}
     */
    private function present(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role instanceof UserRole ? $user->role->value : (string) ($user->role ?? UserRole::Operator->value),
            'created_at' => $user->created_at?->toIso8601String(),
        ];
    }
}
