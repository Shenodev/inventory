<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table): void {
            $table->decimal('cost', 10, 2)->default(0)->after('price');
        });

        DB::statement('
            UPDATE products p
            LEFT JOIN (
                SELECT product_id, AVG(unit_cost) AS avg_cost
                FROM purchase_order_items
                WHERE unit_cost > 0
                GROUP BY product_id
            ) c ON c.product_id = p.id
            SET p.cost = COALESCE(ROUND(c.avg_cost, 2), ROUND(p.price * 0.6, 2))
        ');
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table): void {
            $table->dropColumn('cost');
        });
    }
};
