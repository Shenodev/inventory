<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Enums\PurchaseOrderStatus;
use App\Enums\StockMovementType;
use App\Enums\TransactionType;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\AddPurchaseOrderItemRequest;
use App\Http\Requests\Api\StorePurchaseOrderRequest;
use App\Models\Product;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\StockMovement;
use App\Models\Transaction;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PurchaseOrderController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $status = $request->string('status')->trim()->toString() ?: null;

        if ($status !== null) {
            $allowed = array_map(
                fn (PurchaseOrderStatus $case): string => $case->value,
                PurchaseOrderStatus::cases(),
            );

            if (! in_array($status, $allowed, true)) {
                throw ValidationException::withMessages([
                    'status' => 'status must be one of: '.implode(', ', $allowed).'.',
                ]);
            }
        }

        $query = PurchaseOrder::query()
            ->with('supplier:id,name')
            ->withCount('items as item_count')
            ->latest('created_at')
            ->latest('id');

        if ($status !== null) {
            $query->where('status', $status);
        }

        $purchaseOrders = $query->get();

        return response()->json([
            'purchase_orders' => $purchaseOrders
                ->map(fn (PurchaseOrder $purchaseOrder): array => [
                    'id' => $purchaseOrder->id,
                    'supplier_id' => $purchaseOrder->supplier_id,
                    'supplier' => $purchaseOrder->supplier?->name,
                    'status' => $purchaseOrder->status->value,
                    'total_cost' => $purchaseOrder->total_cost,
                    'item_count' => (int) $purchaseOrder->item_count,
                    'created_at' => $purchaseOrder->created_at?->toIso8601String(),
                    'updated_at' => $purchaseOrder->updated_at?->toIso8601String(),
                ])
                ->all(),
        ]);
    }

    public function store(StorePurchaseOrderRequest $request): JsonResponse
    {
        $purchaseOrder = DB::transaction(function () use ($request): PurchaseOrder {
            $purchaseOrder = PurchaseOrder::query()->create([
                'supplier_id' => $request->integer('supplier_id'),
                'status' => PurchaseOrderStatus::Pending,
                'total_cost' => 0,
            ]);

            $purchaseOrder->load('supplier:id,name');

            $total = 0.0;

            foreach ($request->validated('items', []) as $line) {
                $unitCost = (float) $line['unit_cost'];
                $quantity = (int) $line['quantity'];

                $purchaseOrder->items()->create([
                    'product_id' => (int) $line['product_id'],
                    'quantity' => $quantity,
                    'unit_cost' => $unitCost,
                ]);

                $total += $unitCost * $quantity;
            }

            if ($request->has('items')) {
                $purchaseOrder->total_cost = round($total, 2);
                $purchaseOrder->save();
            }

            return $purchaseOrder;
        });

        $purchaseOrder->load(['supplier:id,name', 'items.product:id,sku,name']);

        return response()->json([
            'message' => 'Purchase order created.',
            'purchase_order' => $this->present($purchaseOrder),
        ], JsonResponse::HTTP_CREATED);
    }

    public function show(PurchaseOrder $purchaseOrder): JsonResponse
    {
        $purchaseOrder->load(['supplier:id,name', 'items.product:id,sku,name', 'transactions']);

        return response()->json([
            'purchase_order' => $this->present($purchaseOrder),
        ]);
    }

    public function storeItem(AddPurchaseOrderItemRequest $request, PurchaseOrder $purchaseOrder): JsonResponse
    {
        $updated = DB::transaction(function () use ($request, $purchaseOrder): PurchaseOrder {
            $locked = PurchaseOrder::query()
                ->whereKey($purchaseOrder->id)
                ->lockForUpdate()
                ->firstOrFail();

            $this->assertPending($locked);

            $productId = $request->integer('product_id');
            $quantity = $request->integer('quantity');
            $unitCost = (float) $request->string('unit_cost')->toString();

            if ($locked->items()->where('product_id', $productId)->exists()) {
                throw ValidationException::withMessages([
                    'product_id' => "This product is already on purchase order #{$locked->id}.",
                ]);
            }

            $locked->items()->create([
                'product_id' => $productId,
                'quantity' => $quantity,
                'unit_cost' => $unitCost,
            ]);

            $locked->total_cost = round((float) $locked->total_cost + $unitCost * $quantity, 2);
            $locked->save();

            return $locked;
        });

        $updated->load(['supplier:id,name', 'items.product:id,sku,name', 'transactions']);

        return response()->json([
            'message' => 'Item added to purchase order.',
            'purchase_order' => $this->present($updated),
        ], JsonResponse::HTTP_CREATED);
    }

    public function destroyItem(PurchaseOrder $purchaseOrder, PurchaseOrderItem $item): JsonResponse
    {
        if ($item->po_id !== $purchaseOrder->id) {
            throw (new ModelNotFoundException)->setModel(PurchaseOrderItem::class, [$item->id]);
        }

        $updated = DB::transaction(function () use ($purchaseOrder, $item): PurchaseOrder {
            $locked = PurchaseOrder::query()
                ->whereKey($purchaseOrder->id)
                ->lockForUpdate()
                ->firstOrFail();

            $this->assertPending($locked);

            $line = PurchaseOrderItem::query()
                ->whereKey($item->id)
                ->lockForUpdate()
                ->firstOrFail();

            $locked->total_cost = round((float) $locked->total_cost - (float) $line->unit_cost * $line->quantity, 2);
            $locked->save();

            $line->delete();

            return $locked;
        });

        $updated->load(['supplier:id,name', 'items.product:id,sku,name', 'transactions']);

        return response()->json([
            'message' => 'Item removed from purchase order.',
            'purchase_order' => $this->present($updated),
        ]);
    }

    /**
     * Atomically receive a purchase order: mark it received, raise the
     * inventory levels (pessimistically locked so concurrent receives never
     * lose updates), log the inbound stock movements and register the cost as
     * an expense transaction.
     */
    public function receive(PurchaseOrder $purchaseOrder): JsonResponse
    {
        $received = DB::transaction(function () use ($purchaseOrder): PurchaseOrder {
            $locked = PurchaseOrder::query()
                ->whereKey($purchaseOrder->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($locked->status !== PurchaseOrderStatus::Pending) {
                throw ValidationException::withMessages([
                    'status' => "Purchase order #{$locked->id} has already been received.",
                ]);
            }

            $items = $locked->items()->get();

            if ($items->isEmpty()) {
                throw ValidationException::withMessages([
                    'items' => 'Cannot receive a purchase order with no items.',
                ]);
            }

            $products = Product::query()
                ->whereIn('id', $items->pluck('product_id'))
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            foreach ($items as $item) {
                $product = $products->get($item->product_id);

                if (! $product instanceof Product) {
                    continue;
                }

                $product->total_stock += $item->quantity;
                $product->save();

                StockMovement::query()->create([
                    'product_id' => $product->id,
                    'order_id' => null,
                    'type' => StockMovementType::In,
                    'quantity' => $item->quantity,
                    'note' => "Purchase order #{$locked->id} received",
                ]);
            }

            $locked->status = PurchaseOrderStatus::Received;
            $locked->save();

            $locked->transactions()->create([
                'type' => TransactionType::Expense,
                'amount' => $locked->total_cost,
            ]);

            return $locked;
        });

        $received->load(['supplier:id,name', 'items.product:id,sku,name', 'transactions']);

        return response()->json([
            'message' => "Purchase order #{$received->id} received.",
            'purchase_order' => $this->present($received),
        ]);
    }

    private function assertPending(PurchaseOrder $purchaseOrder): void
    {
        if ($purchaseOrder->status !== PurchaseOrderStatus::Pending) {
            throw ValidationException::withMessages([
                'status' => "Purchase order #{$purchaseOrder->id} is {$purchaseOrder->status->value} and cannot be modified.",
            ]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function present(PurchaseOrder $purchaseOrder): array
    {
        return [
            'id' => $purchaseOrder->id,
            'supplier_id' => $purchaseOrder->supplier_id,
            'supplier' => $purchaseOrder->supplier?->name,
            'status' => $purchaseOrder->status->value,
            'total_cost' => $purchaseOrder->total_cost,
            'item_count' => $purchaseOrder->items->count(),
            'items' => $purchaseOrder->items
                ->map(fn (PurchaseOrderItem $item): array => [
                    'id' => $item->id,
                    'product_id' => $item->product_id,
                    'product_sku' => $item->product?->sku,
                    'product_name' => $item->product?->name,
                    'quantity' => $item->quantity,
                    'unit_cost' => $item->unit_cost,
                    'line_total' => number_format((float) $item->unit_cost * $item->quantity, 2, '.', ''),
                ])
                ->all(),
            'transactions' => $purchaseOrder->transactions
                ->map(fn (Transaction $transaction): array => [
                    'id' => $transaction->id,
                    'type' => $transaction->type->value,
                    'amount' => $transaction->amount,
                ])
                ->all(),
            'created_at' => $purchaseOrder->created_at?->toIso8601String(),
            'updated_at' => $purchaseOrder->updated_at?->toIso8601String(),
        ];
    }
}
