<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Product;
use App\Models\ReturnEntry;
use App\Models\SalesOrder;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ReturnEntry>
 */
class ReturnEntryFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'sales_order_id' => SalesOrder::factory(),
            'product_id' => Product::factory(),
            'quantity' => fake()->numberBetween(1, 5),
            'reason' => fake()->randomElement([
                'Damaged during delivery',
                'Wrong item shipped',
                'Customer changed mind',
                'Defective product',
                'Size / variant mismatch',
            ]),
        ];
    }
}
