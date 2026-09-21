<?php

declare(strict_types=1);

/*
|--------------------------------------------------------------------------
| Row-Level Security (App-Level)
|--------------------------------------------------------------------------
| MySQL does not have native RLS like PostgreSQL. ShenoInventory enforces
| row-level access in application code via Policies + Gates + query scopes.
| rls.enabled=true logs and enforces scoping; policies deny by default.
| Future: if you move to Postgres/Supabase, map these policies to DB RLS.
*/

return [
    'enabled' => env('RLS_ENABLED', true),
    'audit' => env('RLS_AUDIT', true),
    // Per-model scoping: which models are tenant/user-scoped vs global.
    // Inventory catalog is global (warehouse OS), but financials and admin
    // actions are RBAC-gated via policies.
    'models' => [
        'global_read' => [
            \App\Models\Product::class,
            \App\Models\Customer::class,
            \App\Models\Supplier::class,
        ],
        'restricted_write' => [
            \App\Models\Product::class => \App\Policies\ProductPolicy::class,
            \App\Models\Transaction::class => \App\Policies\FinancialPolicy::class,
        ],
    ],
];
