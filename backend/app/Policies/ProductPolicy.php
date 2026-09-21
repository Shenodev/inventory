<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\UserRole;
use App\Models\Product;
use App\Models\User;

class ProductPolicy
{
    public function viewAny(User $user): bool
    {
        return true; // any authenticated user can list
    }

    public function view(User $user, Product $product): bool
    {
        return true;
    }

    public function update(User $user, Product $product): bool
    {
        // Location/barcode edits and stock adjustments require manager+
        $role = $user->role instanceof UserRole ? $user->role : UserRole::tryFrom((string) ($user->role ?? '')) ?? UserRole::Operator;
        return $role->canManageInventory();
    }

    public function adjustStock(User $user, Product $product): bool
    {
        $role = $user->role instanceof UserRole ? $user->role : UserRole::tryFrom((string) ($user->role ?? '')) ?? UserRole::Operator;
        return $role->canManageInventory();
    }
}
