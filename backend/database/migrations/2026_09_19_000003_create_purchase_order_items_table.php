<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('purchase_order_items', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('po_id');
            $table->foreignId('product_id')->constrained()->restrictOnDelete();
            $table->unsignedInteger('quantity');
            $table->decimal('unit_cost', 10, 2);
            $table->timestamps();

            $table->foreign('po_id')->references('id')->on('purchase_orders')->cascadeOnDelete();
            $table->unique(['po_id', 'product_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('purchase_order_items');
    }
};
