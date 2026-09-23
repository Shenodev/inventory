<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Database\Seeder;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        User::query()->updateOrCreate(
            ['email' => 'demo@shenodev.tech'],
            [
                'name' => 'Sheno Demo',
                'password' => 'password',
                'role' => UserRole::Admin->value,
            ],
        );
    }
}
