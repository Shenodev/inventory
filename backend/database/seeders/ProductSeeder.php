<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\StockMovementType;
use App\Models\Product;
use App\Models\StockMovement;
use Illuminate\Database\Seeder;

class ProductSeeder extends Seeder
{
    private const PRODUCT_COUNT = 50;

    public function run(): void
    {
        $products = Product::factory()
            ->count(self::PRODUCT_COUNT)
            ->state(fn (): array => [
                'price' => fake()->randomFloat(2, 9.99, 1499.99),
                'total_stock' => fake()->numberBetween(20, 300),
            ])
            ->create();

        $products->each(function (Product $product): void {
            StockMovement::query()->create([
                'product_id' => $product->id,
                'order_id' => null,
                'type' => StockMovementType::In,
                'quantity' => $product->total_stock,
                'note' => 'Initial stock',
            ]);
        });
    }
}
