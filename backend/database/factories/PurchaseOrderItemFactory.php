<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Product;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PurchaseOrderItem>
 */
class PurchaseOrderItemFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'po_id' => PurchaseOrder::factory(),
            'product_id' => Product::factory(),
            'quantity' => fake()->numberBetween(10, 120),
            'unit_cost' => fake()->randomFloat(2, 5, 300),
        ];
    }
}
