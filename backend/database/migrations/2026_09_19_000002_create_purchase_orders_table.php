<?php

declare(strict_types=1);

use App\Enums\PurchaseOrderStatus;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('purchase_orders', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('supplier_id')->constrained()->restrictOnDelete();
            $table->enum('status', array_column(PurchaseOrderStatus::cases(), 'value'))->default(PurchaseOrderStatus::Pending->value);
            $table->decimal('total_cost', 12, 2)->default(0);
            $table->timestamps();

            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('purchase_orders');
    }
};
