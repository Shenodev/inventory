<?php

declare(strict_types=1);

namespace App\Enums;

enum UserRole: string
{
    case Admin = 'admin';
    case Manager = 'manager';
    case Operator = 'operator';
    case Viewer = 'viewer';

    public function canManageInventory(): bool
    {
        return in_array($this, [self::Admin, self::Manager], true);
    }

    public function canApproveFinancials(): bool
    {
        return $this === self::Admin;
    }

    public static function default(): self
    {
        return self::Operator;
    }
}
