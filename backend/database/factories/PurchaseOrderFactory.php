<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\PurchaseOrderStatus;
use App\Models\PurchaseOrder;
use App\Models\Supplier;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PurchaseOrder>
 */
class PurchaseOrderFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'supplier_id' => Supplier::factory(),
            'status' => PurchaseOrderStatus::Pending,
            'total_cost' => 0,
        ];
    }

    public function pending(): static
    {
        return $this->state(fn (): array => ['status' => PurchaseOrderStatus::Pending]);
    }

    public function received(): static
    {
        return $this->state(fn (): array => ['status' => PurchaseOrderStatus::Received]);
    }
}
