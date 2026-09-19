<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Enums\OrderStatus;
use App\Enums\SalesOrderStatus;
use App\Enums\StockMovementType;
use App\Enums\TransactionType;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\AddSalesOrderItemRequest;
use App\Http\Requests\Api\StoreSalesOrderRequest;
use App\Models\Product;
use App\Models\SalesOrder;
use App\Models\SalesOrderItem;
use App\Models\StockMovement;
use App\Models\Transaction;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SalesOrderController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $status = $request->string('status')->trim()->toString() ?: null;

        if ($status !== null) {
            $allowed = array_map(
                fn (SalesOrderStatus $case): string => $case->value,
                SalesOrderStatus::cases(),
            );

            if (! in_array($status, $allowed, true)) {
                throw ValidationException::withMessages([
                    'status' => 'status must be one of: '.implode(', ', $allowed).'.',
                ]);
            }
        }

        $query = SalesOrder::query()
            ->with('customer:id,name')
            ->withCount('items as item_count')
            ->latest('created_at')
            ->latest('id');

        if ($status !== null) {
            $query->where('status', $status);
        }

        $salesOrders = $query->get();

        return response()->json([
            'sales_orders' => $salesOrders
                ->map(fn (SalesOrder $salesOrder): array => [
                    'id' => $salesOrder->id,
                    'customer_id' => $salesOrder->customer_id,
                    'customer' => $salesOrder->customer?->name,
                    'status' => $salesOrder->status->value,
                    'total_price' => $salesOrder->total_price,
                    'item_count' => (int) $salesOrder->item_count,
                    'created_at' => $salesOrder->created_at?->toIso8601String(),
                    'updated_at' => $salesOrder->updated_at?->toIso8601String(),
                ])
                ->all(),
        ]);
    }

    public function store(StoreSalesOrderRequest $request): JsonResponse
    {
        $salesOrder = DB::transaction(function () use ($request): SalesOrder {
            $salesOrder = SalesOrder::query()->create([
                'customer_id' => $request->integer('customer_id'),
                'status' => SalesOrderStatus::Reserved,
                'total_price' => 0,
            ]);

            $salesOrder->load('customer:id,name');

            $total = 0.0;

            foreach ($request->validated('items', []) as $line) {
                $unitPrice = (float) $line['unit_price'];
                $quantity = (int) $line['quantity'];

                $salesOrder->items()->create([
                    'product_id' => (int) $line['product_id'],
                    'quantity' => $quantity,
                    'unit_price' => $unitPrice,
                ]);

                $total += $unitPrice * $quantity;
            }

            if ($request->has('items')) {
                $salesOrder->total_price = round($total, 2);
                $salesOrder->save();
            }

            return $salesOrder;
        });

        $salesOrder->load(['customer:id,name', 'items.product:id,sku,name']);

        return response()->json([
            'message' => 'Sales order created.',
            'sales_order' => $this->present($salesOrder),
        ], JsonResponse::HTTP_CREATED);
    }

    public function show(SalesOrder $salesOrder): JsonResponse
    {
        $salesOrder->load(['customer:id,name', 'items.product:id,sku,name', 'transactions']);

        return response()->json([
            'sales_order' => $this->present($salesOrder),
        ]);
    }

    public function storeItem(AddSalesOrderItemRequest $request, SalesOrder $salesOrder): JsonResponse
    {
        $updated = DB::transaction(function () use ($request, $salesOrder): SalesOrder {
            $locked = SalesOrder::query()
                ->whereKey($salesOrder->id)
                ->lockForUpdate()
                ->firstOrFail();

            $this->assertReserved($locked);

            $productId = $request->integer('product_id');
            $quantity = $request->integer('quantity');
            $unitPrice = (float) $request->string('unit_price')->toString();

            if ($locked->items()->where('product_id', $productId)->exists()) {
                throw ValidationException::withMessages([
                    'product_id' => "This product is already on sales order #{$locked->id}.",
                ]);
            }

            $locked->items()->create([
                'product_id' => $productId,
                'quantity' => $quantity,
                'unit_price' => $unitPrice,
            ]);

            $locked->total_price = round((float) $locked->total_price + $unitPrice * $quantity, 2);
            $locked->save();

            return $locked;
        });

        $updated->load(['customer:id,name', 'items.product:id,sku,name', 'transactions']);

        return response()->json([
            'message' => 'Item added to sales order.',
            'sales_order' => $this->present($updated),
        ], JsonResponse::HTTP_CREATED);
    }

    public function destroyItem(SalesOrder $salesOrder, SalesOrderItem $item): JsonResponse
    {
        if ($item->so_id !== $salesOrder->id) {
            throw (new ModelNotFoundException)->setModel(SalesOrderItem::class, [$item->id]);
        }

        $updated = DB::transaction(function () use ($salesOrder, $item): SalesOrder {
            $locked = SalesOrder::query()
                ->whereKey($salesOrder->id)
                ->lockForUpdate()
                ->firstOrFail();

            $this->assertReserved($locked);

            $line = SalesOrderItem::query()
                ->whereKey($item->id)
                ->lockForUpdate()
                ->firstOrFail();

            $locked->total_price = round((float) $locked->total_price - (float) $line->unit_price * $line->quantity, 2);
            $locked->save();

            $line->delete();

            return $locked;
        });

        $updated->load(['customer:id,name', 'items.product:id,sku,name', 'transactions']);

        return response()->json([
            'message' => 'Item removed from sales order.',
            'sales_order' => $this->present($updated),
        ]);
    }

    /**
     * Atomically fulfill a reserved sales order: verify available stock, deduct
     * the inventory levels (pessimistically locked so concurrent fulfills never
     * oversell), log the outbound stock movements and register the revenue as
     * an income transaction.
     */
    public function fulfill(SalesOrder $salesOrder): JsonResponse
    {
        $fulfilled = DB::transaction(function () use ($salesOrder): SalesOrder {
            $locked = SalesOrder::query()
                ->whereKey($salesOrder->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($locked->status !== SalesOrderStatus::Reserved) {
                throw ValidationException::withMessages([
                    'status' => "Sales order #{$locked->id} is {$locked->status->value} and cannot be fulfilled.",
                ]);
            }

            $items = $locked->items()->get();

            if ($items->isEmpty()) {
                throw ValidationException::withMessages([
                    'items' => 'Cannot fulfill a sales order with no items.',
                ]);
            }

            $products = $this->lockProducts($items);

            foreach ($items as $item) {
                $product = $products->get($item->product_id);

                if (! $product instanceof Product) {
                    continue;
                }

                $available = $this->availableStock($product);

                if ($item->quantity > $available) {
                    throw ValidationException::withMessages([
                        'items' => "Insufficient stock for {$product->name} ({$product->sku}): need {$item->quantity}, only {$available} available.",
                    ]);
                }
            }

            foreach ($items as $item) {
                $product = $products->get($item->product_id);

                if (! $product instanceof Product) {
                    continue;
                }

                $product->total_stock -= $item->quantity;
                $product->save();

                StockMovement::query()->create([
                    'product_id' => $product->id,
                    'order_id' => null,
                    'type' => StockMovementType::Out,
                    'quantity' => $item->quantity,
                    'note' => "Sales order #{$locked->id} fulfilled",
                ]);
            }

            $locked->status = SalesOrderStatus::Shipped;
            $locked->save();

            $locked->transactions()->create([
                'type' => TransactionType::Income,
                'amount' => $locked->total_price,
            ]);

            return $locked;
        });

        $fulfilled->load(['customer:id,name', 'items.product:id,sku,name', 'transactions']);

        return response()->json([
            'message' => "Sales order #{$fulfilled->id} fulfilled.",
            'sales_order' => $this->present($fulfilled),
        ]);
    }

    private function assertReserved(SalesOrder $salesOrder): void
    {
        if ($salesOrder->status !== SalesOrderStatus::Reserved) {
            throw ValidationException::withMessages([
                'status' => "Sales order #{$salesOrder->id} is {$salesOrder->status->value} and cannot be modified.",
            ]);
        }
    }

    /**
     * @param  Collection<int, SalesOrderItem>  $items
     * @return Collection<int, Product>
     */
    private function lockProducts(Collection $items): Collection
    {
        /** @var Collection<int, Product> $products */
        $products = Product::query()
            ->whereIn('id', $items->pluck('product_id'))
            ->lockForUpdate()
            ->get()
            ->keyBy('id');

        return $products;
    }

    /**
     * Units physically available to sell, mirroring the Products page:
     * total stock minus reserved and sold legacy orders.
     */
    private function availableStock(Product $product): int
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
     * @return array<string, mixed>
     */
    private function present(SalesOrder $salesOrder): array
    {
        return [
            'id' => $salesOrder->id,
            'customer_id' => $salesOrder->customer_id,
            'customer' => $salesOrder->customer?->name,
            'status' => $salesOrder->status->value,
            'total_price' => $salesOrder->total_price,
            'item_count' => $salesOrder->items->count(),
            'items' => $salesOrder->items
                ->map(fn (SalesOrderItem $item): array => [
                    'id' => $item->id,
                    'product_id' => $item->product_id,
                    'product_sku' => $item->product?->sku,
                    'product_name' => $item->product?->name,
                    'quantity' => $item->quantity,
                    'unit_price' => $item->unit_price,
                    'line_total' => number_format((float) $item->unit_price * $item->quantity, 2, '.', ''),
                ])
                ->all(),
            'transactions' => $salesOrder->transactions
                ->map(fn (Transaction $transaction): array => [
                    'id' => $transaction->id,
                    'type' => $transaction->type->value,
                    'amount' => $transaction->amount,
                ])
                ->all(),
            'created_at' => $salesOrder->created_at?->toIso8601String(),
            'updated_at' => $salesOrder->updated_at?->toIso8601String(),
        ];
    }
}
