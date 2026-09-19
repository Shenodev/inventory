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

        return response()->json([
            'overview' => [
                'total_income' => $income,
                'total_expenses' => $expenses,
                'net_profit' => round($income - $expenses, 2),
                'total_cogs' => $cogs,
                'gross_profit' => round($income - $cogs, 2),
                'returns_quantity' => (int) ReturnEntry::query()->sum('quantity'),
                'damaged_quantity' => (int) StockMovement::query()
                    ->where('type', StockMovementType::Damage)
                    ->sum('quantity'),
            ],
        ]);
    }
}
