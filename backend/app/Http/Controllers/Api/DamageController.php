<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Enums\StockMovementType;
use App\Enums\TransactionType;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreDamageRequest;
use App\Models\Product;
use App\Models\StockMovement;
use App\Models\Transaction;
use App\Services\InventoryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class DamageController extends Controller
{
    public function __construct(private readonly InventoryService $inventory) {}

    public function index(): JsonResponse
    {
        $movements = StockMovement::query()
            ->with(['product:id,sku,name,cost'])
            ->where('type', StockMovementType::Damage)
            ->latest('created_at')
            ->latest('id')
            ->limit(500)
            ->get();

        return response()->json([
            'damages' => $movements
                ->map(fn (StockMovement $movement): array => [
                    'id' => $movement->id,
                    'product_id' => $movement->product_id,
                    'sku' => $movement->product?->sku,
                    'name' => $movement->product?->name,
                    'cost' => $movement->product?->cost,
                    'quantity' => $movement->quantity,
                    'reason' => $movement->note,
                    'loss' => round((float) $movement->product?->cost * $movement->quantity, 2),
                    'created_at' => $movement->created_at?->toIso8601String(),
                ])
                ->all(),
        ]);
    }

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

        $this->inventory->evaluateLowStock($result['product']);

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

    /**
     * Atomically reverse a damage write-off ("report not damaged"): restore the
     * units to inventory, log an inbound movement that references the original
     * damage, offset the recorded expense with a negative expense (keeps the
     * financial audit trail intact) and remove the damage movement so it no
     * longer appears in the damages list or damaged-quantity totals.
     */
    public function reverse(Request $request, StockMovement $movement): JsonResponse
    {
        if ($movement->type !== StockMovementType::Damage) {
            throw ValidationException::withMessages([
                'movement' => 'Only a damage write-off can be reversed.',
            ]);
        }

        $result = DB::transaction(function () use ($movement): array {
            $product = Product::query()
                ->whereKey($movement->product_id)
                ->lockForUpdate()
                ->firstOrFail();

            $marker = "Reversed damage #{$movement->id}";

            $alreadyReversed = StockMovement::query()
                ->where('product_id', $product->id)
                ->where('type', StockMovementType::In)
                ->where('note', $marker)
                ->exists();

            if ($alreadyReversed) {
                throw ValidationException::withMessages([
                    'movement' => 'This damage report was already reversed.',
                ]);
            }

            $product->total_stock += $movement->quantity;
            $product->save();

            $reversal = $product->stockMovements()->create([
                'order_id' => null,
                'type' => StockMovementType::In,
                'quantity' => $movement->quantity,
                'note' => $marker,
            ]);

            $restored = round((float) $product->cost * $movement->quantity, 2);

            Transaction::create([
                'type' => TransactionType::Expense,
                'amount' => -$restored,
                'reference_type' => 'DamageReversal',
                'reference_id' => $reversal->id,
            ]);

            $movement->delete();

            return [
                'product' => $product,
                'reversal' => $reversal,
                'restored' => $restored,
            ];
        });

        $this->inventory->evaluateLowStock($result['product']);

        return response()->json([
            'message' => "{$result['reversal']->quantity} units restored to {$result['product']->name}.",
            'restored' => $result['restored'],
            'product_id' => $result['product']->id,
        ]);
    }
}
