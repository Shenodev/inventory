<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Product;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Product>
 */
class ProductFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'sku' => strtoupper(fake()->unique()->bothify('SKU-####-???')),
            'name' => fake()->unique()->words(3, true),
            'price' => fake()->randomFloat(2, 5, 500),
            'cost' => fake()->randomFloat(2, 3, 200),
            'total_stock' => fake()->numberBetween(0, 500),
            'location' => 'Aisle '.fake()->randomElement(['A', 'B', 'C', 'D']).', Bay '.fake()->numberBetween(1, 12).', Shelf '.fake()->randomElement(['A', 'B', 'C', 'D']),
            'barcode' => fake()->unique()->ean13(),
        ];
    }
}
