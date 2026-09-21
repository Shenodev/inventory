<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Enums\UserRole;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureRole
{
    /**
     * Ensure authenticated user has one of the allowed roles.
     * Usage: ->middleware('role:admin,manager')
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (! $user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $allowed = array_map(
            fn (string $r): UserRole => UserRole::tryFrom(strtolower(trim($r))) ?? UserRole::Viewer,
            $roles
        );

        // Normalize: if no role param given, require admin
        if ($allowed === []) {
            $allowed = [UserRole::Admin];
        }

        $userRole = $user->role instanceof UserRole ? $user->role : UserRole::tryFrom((string) ($user->role ?? '')) ?? UserRole::Operator;

        if (! in_array($userRole, $allowed, true)) {
            return response()->json(['message' => 'Forbidden — insufficient permissions.'], 403);
        }

        return $next($request);
    }
}
