<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Enums\SalesOrderStatus;
use App\Enums\StockMovementType;
use App\Enums\TransactionType;
use App\Http\Controllers\Controller;
use App\Models\ReturnEntry;
use App\Models\StockMovement;
use App\Models\Transaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class FinancialController extends Controller
{
    public function overview(): JsonResponse
    {
        $income = round((float) Transaction::query()
            ->where('type', TransactionType::Income)
            ->sum('amount'), 2);

        $expenses = round((float) Transaction::query()
            ->where('type', TransactionType::Expense)
            ->sum('amount'), 2);

        $cogs = round((float) DB::table('sales_order_items')
            ->join('sales_orders', 'sales_orders.id', '=', 'sales_order_items.so_id')
            ->join('products', 'products.id', '=', 'sales_order_items.product_id')
            ->where('sales_orders.status', SalesOrderStatus::Shipped->value)
            ->sum(DB::raw('sales_order_items.quantity * products.cost')), 2);

        $inventoryValuation = round((float) DB::table('products')
            ->sum(DB::raw('products.total_stock * products.cost')), 2);

        return response()->json([
            'overview' => [
                'total_income' => $income,
                'total_expenses' => $expenses,
                'net_profit' => round($income - $expenses, 2),
                'total_cogs' => $cogs,
                'gross_profit' => round($income - $cogs, 2),
                'inventory_valuation' => $inventoryValuation,
                'returns_quantity' => (int) ReturnEntry::query()->sum('quantity'),
                'damaged_quantity' => (int) StockMovement::query()
                    ->where('type', StockMovementType::Damage)
                    ->sum('quantity'),
            ],
        ]);
    }

    public function transactions(): JsonResponse
    {
        $transactions = Transaction::query()
            ->latest('created_at')
            ->latest('id')
            ->limit(500)
            ->get();

        return response()->json([
            'transactions' => $transactions
                ->map(fn (Transaction $transaction): array => [
                    'id' => $transaction->id,
                    'type' => $transaction->type->value,
                    'amount' => $transaction->amount,
                    'reference_type' => $transaction->reference_type,
                    'reference_id' => $transaction->reference_id,
                    'created_at' => $transaction->created_at?->toIso8601String(),
                ])
                ->all(),
        ]);
    }
}
