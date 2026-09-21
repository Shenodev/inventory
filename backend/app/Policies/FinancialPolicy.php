<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\UserRole;
use App\Models\User;

class FinancialPolicy
{
    public function viewOverview(User $user): bool
    {
        // Financial overview is sensitive; restrict to manager+
        $role = $user->role instanceof UserRole ? $user->role : UserRole::tryFrom((string) ($user->role ?? '')) ?? UserRole::Operator;
        return in_array($role, [UserRole::Admin, UserRole::Manager], true);
    }

    public function viewTransactions(User $user): bool
    {
        $role = $user->role instanceof UserRole ? $user->role : UserRole::tryFrom((string) ($user->role ?? '')) ?? UserRole::Operator;
        return in_array($role, [UserRole::Admin, UserRole::Manager], true);
    }
}
