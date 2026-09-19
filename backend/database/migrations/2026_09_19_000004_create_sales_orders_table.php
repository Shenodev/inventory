<?php

declare(strict_types=1);

use App\Enums\SalesOrderStatus;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sales_orders', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('customer_id')->constrained()->restrictOnDelete();
            $table->enum('status', array_column(SalesOrderStatus::cases(), 'value'))->default(SalesOrderStatus::Reserved->value);
            $table->decimal('total_price', 12, 2)->default(0);
            $table->timestamps();

            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sales_orders');
    }
};
