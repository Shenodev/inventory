<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\OrderStatus;
use App\Enums\StockMovementType;
use App\Models\Product;
use App\Models\StockMovement;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class InventoryService
{
    public function __construct(private readonly LowStockMonitor $lowStockMonitor) {}

    /**
     * @return Collection<int, Product>
     */
    public function productsWithAvailability(): Collection
    {
        return $this->withAvailability(Product::query())
            ->orderBy('name')
            ->get();
    }

    /**
     * Manually add or remove stock and log the movement atomically.
     *
     * @return array{product: Product, movement: StockMovement}
     */
    public function adjustStock(Product $product, StockMovementType $type, int $quantity, ?string $note = null): array
    {
        $movement = DB::transaction(function () use ($product, $type, $quantity, $note): StockMovement {
            $locked = Product::query()
                ->whereKey($product->getKey())
                ->lockForUpdate()
                ->firstOrFail();

            $delta = $type === StockMovementType::Out ? -$quantity : $quantity;

            if ($locked->total_stock + $delta < 0) {
                throw ValidationException::withMessages([
                    'quantity' => "Unable to remove {$quantity} units: only {$locked->total_stock} units are in stock.",
                ]);
            }

            $locked->total_stock += $delta;
            $locked->save();

            return $locked->stockMovements()->create([
                'order_id' => null,
                'type' => $type,
                'quantity' => $quantity,
                'note' => $note,
            ]);
        });

        $updated = $this->withAvailability(Product::query()->whereKey($product->getKey()))->firstOrFail();

        $this->lowStockMonitor->evaluate(
            $updated,
            (int) $updated->total_stock - (int) ($updated->reserved_stock ?? 0) - (int) ($updated->sold_stock ?? 0),
        );

        return ['product' => $updated, 'movement' => $movement];
    }

    /**
     * @return array<string, int|string|null>
     */
    public function present(Product $product): array
    {
        $reserved = (int) ($product->reserved_stock ?? 0);
        $sold = (int) ($product->sold_stock ?? 0);

        return [
            'id' => $product->id,
            'sku' => $product->sku,
            'name' => $product->name,
            'price' => $product->price,
            'cost' => $product->cost,
            'total_stock' => $product->total_stock,
            'reserved_stock' => $reserved,
            'sold_stock' => $sold,
            'available_stock' => $product->total_stock - $reserved - $sold,
            'min_stock' => $product->min_stock,
            'location' => $product->location,
            'barcode' => $product->barcode,
        ];
    }

    /**
     * Units physically available to sell: total stock minus reserved and sold
     * legacy orders.
     */
    public function availableQuantity(Product $product): int
    {
        $reserved = (int) $product->orderItems()
            ->whereHas('order', fn (Builder $order): Builder => $order->where('status', OrderStatus::Reserved->value))
            ->sum('quantity');

        $sold = (int) $product->orderItems()
            ->whereHas('order', fn (Builder $order): Builder => $order->where('status', OrderStatus::Sold->value))
            ->sum('quantity');

        return $product->total_stock - $reserved - $sold;
    }

    /**
     * Recompute availability for a product and run the low-stock alert monitor
     * against it. Call after any stock mutation that bypasses adjustStock().
     */
    public function evaluateLowStock(Product $product): void
    {
        $this->lowStockMonitor->evaluate($product, $this->availableQuantity($product));
    }

    private function withAvailability(Builder $query): Builder
    {
        return $query
            ->withSum(['orderItems as reserved_stock' => fn (Builder $relation): Builder => $relation->whereHas(
                'order',
                fn (Builder $order): Builder => $order->where('status', OrderStatus::Reserved->value),
            )], 'quantity')
            ->withSum(['orderItems as sold_stock' => fn (Builder $relation): Builder => $relation->whereHas(
                'order',
                fn (Builder $order): Builder => $order->where('status', OrderStatus::Sold->value),
            )], 'quantity');
    }
}
