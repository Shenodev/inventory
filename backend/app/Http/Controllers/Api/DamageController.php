<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Enums\StockMovementType;
use App\Enums\TransactionType;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreDamageRequest;
use App\Models\Product;
use App\Services\InventoryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class DamageController extends Controller
{
    public function __construct(private readonly InventoryService $inventory) {}

    /**
     * Atomically report damaged stock: deduct the units from the inventory
     * levels, log the movement as a damage and register the replacement value
     * as an expense based on the product cost.
     */
    public function store(StoreDamageRequest $request): JsonResponse
    {
        $productId = $request->integer('product_id');

        $result = DB::transaction(function () use ($request, $productId): array {
            $product = Product::query()
                ->whereKey($productId)
                ->lockForUpdate()
                ->firstOrFail();

            $quantity = $request->integer('quantity');
            $available = $this->inventory->availableQuantity($product);

            if ($quantity > $available) {
                throw ValidationException::withMessages([
                    'quantity' => "Insufficient stock for {$product->name} ({$product->sku}): need to mark {$quantity} damaged, only {$available} available.",
                ]);
            }

            $product->total_stock -= $quantity;
            $product->save();

            $movement = $product->stockMovements()->create([
                'order_id' => null,
                'type' => StockMovementType::Damage,
                'quantity' => $quantity,
                'note' => $request->string('reason')->trim()->toString() ?: null,
            ]);

            $loss = round((float) $product->cost * $quantity, 2);

            $transaction = $product->transactions()->create([
                'type' => TransactionType::Expense,
                'amount' => $loss,
            ]);

            return [
                'product' => $product,
                'movement' => $movement,
                'transaction' => $transaction,
                'loss' => $loss,
            ];
        });

        return response()->json([
            'message' => "{$result['movement']->quantity} damaged units written off for {$result['product']->name}.",
            'damage' => [
                'product_id' => $result['product']->id,
                'sku' => $result['product']->sku,
                'name' => $result['product']->name,
                'cost' => $result['product']->cost,
                'quantity' => $result['movement']->quantity,
                'reason' => $result['movement']->note,
                'loss' => $result['loss'],
                'movement_id' => $result['movement']->id,
                'transaction_id' => $result['transaction']->id,
            ],
        ]);
    }
}
