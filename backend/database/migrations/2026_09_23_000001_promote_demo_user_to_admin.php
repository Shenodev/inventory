<?php

declare(strict_types=1);

use App\Enums\UserRole;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * The owner account (demo@shenodev.tech) was seeded with the default role
 * (operator). Every management action therefore 403'd for the very person who
 * should run the warehouse. Promote it to admin so the owner can manage
 * inventory, users and roles. New installs get this via UserSeeder; this
 * migration fixes databases that already exist.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::table('users')
            ->where('email', 'demo@shenodev.tech')
            ->update(['role' => UserRole::Admin->value]);
    }

    public function down(): void
    {
        // Best-effort revert: only touch accounts still holding the admin role
        // we just granted; do not clobber a role a human may have re-assigned.
        DB::table('users')
            ->where('email', 'demo@shenodev.tech')
            ->where('role', UserRole::Admin->value)
            ->update(['role' => UserRole::Operator->value]);
    }
};