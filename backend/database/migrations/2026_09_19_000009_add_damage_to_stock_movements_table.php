<?php

declare(strict_types=1);

use App\Enums\StockMovementType;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $values = implode(', ', array_map(
            fn (StockMovementType $case): string => "'".$case->value."'",
            StockMovementType::cases(),
        ));

        DB::statement("ALTER TABLE stock_movements MODIFY type ENUM({$values}) NOT NULL");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE stock_movements MODIFY type ENUM('in', 'out', 'adjustment') NOT NULL");
    }
};
