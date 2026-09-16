<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\OrderStatus;
use App\Enums\StockMovementType;
use App\Models\Customer;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\StockMovement;
use Illuminate\Database\Seeder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

class OrderSeeder extends Seeder
{
    private const SOLD_ORDERS = 15;

    private const RESERVED_ORDERS = 15;

    /**
     * @var array<int, int>
     */
    private array $available = [];

    public function run(): void
    {
        /** @var Collection<int, Customer> $customers */
        $customers = Customer::query()->get();

        /** @var Collection<int, Product> $products */
        $products = Product::query()->get();

        $this->available = $products
            ->mapWithKeys(fn (Product $product): array => [$product->id => $product->total_stock])
            ->all();

        $statuses = array_merge(
            array_fill(0, self::SOLD_ORDERS, OrderStatus::Sold),
            array_fill(0, self::RESERVED_ORDERS, OrderStatus::Reserved),
        );

        shuffle($statuses);

        DB::transaction(function () use ($customers, $products, $statuses): void {
            foreach ($statuses as $status) {
                $this->createOrder($customers, $products, $status);
            }
        });
    }

    /**
     * @param  Collection<int, Customer>  $customers
     * @param  Collection<int, Product>  $products
     */
    private function createOrder(Collection $customers, Collection $products, OrderStatus $status): void
    {
        $placedAt = now()->subDays(random_int(0, 60))->subMinutes(random_int(0, 1439));

        $selections = [];
        $total = 0.0;

        foreach ($products->random(random_int(1, 5)) as $product) {
            $inStock = $this->available[$product->id] ?? 0;

            if ($inStock < 1) {
                continue;
            }

            $quantity = random_int(1, min(10, $inStock));
            $this->available[$product->id] = $inStock - $quantity;

            $selections[] = ['product' => $product, 'quantity' => $quantity];
            $total += (float) $product->price * $quantity;
        }

        if ($selections === []) {
            return;
        }

        $order = Order::query()->create([
            'customer_id' => $customers->random()->id,
            'status' => $status,
            'total' => round($total, 2),
            'created_at' => $placedAt,
            'updated_at' => $placedAt,
        ]);

        foreach ($selections as $selection) {
            /** @var Product $product */
            $product = $selection['product'];
            $quantity = $selection['quantity'];

            OrderItem::query()->create([
                'order_id' => $order->id,
                'product_id' => $product->id,
                'quantity' => $quantity,
                'unit_price' => $product->price,
                'created_at' => $placedAt,
                'updated_at' => $placedAt,
            ]);

            if ($status !== OrderStatus::Sold) {
                continue;
            }

            $product->decrement('total_stock', $quantity);

            StockMovement::query()->create([
                'product_id' => $product->id,
                'order_id' => $order->id,
                'type' => StockMovementType::Out,
                'quantity' => $quantity,
                'note' => 'Order #'.$order->id.' sale',
                'created_at' => $placedAt,
                'updated_at' => $placedAt,
            ]);
        }
    }
}
