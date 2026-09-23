<?php

declare(strict_types=1);

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\AccountController;
use App\Http\Controllers\Api\CustomerController;
use App\Http\Controllers\Api\DamageController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\FinancialController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\PurchaseOrderController;
use App\Http\Controllers\Api\SalesOrderController;
use App\Http\Controllers\Api\SupplierController;
use App\Http\Controllers\Api\WebhookController;
use Illuminate\Support\Facades\Route;

Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:login');
Route::post('/auth/refresh', [AuthController::class, 'refresh'])->middleware('throttle:api');

// Public but rate-limited: data-deletion & unsubscribe (GDPR)
Route::post('/account/data-request', [AccountController::class, 'dataRequest'])->middleware('throttle:api');
Route::match(['get', 'post'], '/account/data-request/confirm', [AccountController::class, 'confirm'])->middleware('throttle:api');
Route::match(['get', 'post'], '/unsubscribe', [AccountController::class, 'unsubscribe'])->middleware('throttle:api');

// Webhooks — always signature-verified, rate-limited
Route::post('/webhooks/inventory', [WebhookController::class, 'handle'])->middleware(['webhook.signature', 'throttle:api']);

Route::middleware(['auth:sanctum', 'abilities:access', 'throttle:api'])->group(function (): void {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/user', [AuthController::class, 'me']);

    Route::get('/dashboard', DashboardController::class);

    // Products: read for all, write for manager+
    Route::get('/products', [ProductController::class, 'index']);
    Route::get('/products/lookup', [ProductController::class, 'lookup']);
    Route::middleware('role:manager,admin')->group(function (): void {
        Route::patch('/products/{product}', [ProductController::class, 'update']);
        Route::put('/products/{product}', [ProductController::class, 'update']);
        Route::post('/products/{product}/stock', [ProductController::class, 'adjustStock']);
    });

    Route::get('/orders/reserved', [OrderController::class, 'reserved']);
    Route::get('/orders/sold', [OrderController::class, 'sold']);

    Route::apiResource('/suppliers', SupplierController::class);
    // Supplier writes require manager+
    Route::middleware('role:manager,admin')->group(function (): void {
        Route::post('/suppliers', [SupplierController::class, 'store']);
        Route::put('/suppliers/{supplier}', [SupplierController::class, 'update']);
        Route::patch('/suppliers/{supplier}', [SupplierController::class, 'update']);
        Route::delete('/suppliers/{supplier}', [SupplierController::class, 'destroy']);
    });

    Route::get('/customers', [CustomerController::class, 'index']);
    Route::post('/customers', [CustomerController::class, 'store'])->middleware('role:manager,admin,operator');

    Route::get('/purchase-orders', [PurchaseOrderController::class, 'index']);
    Route::post('/purchase-orders', [PurchaseOrderController::class, 'store'])->middleware('role:manager,admin');
    Route::get('/purchase-orders/{purchaseOrder}', [PurchaseOrderController::class, 'show']);
    Route::middleware('role:manager,admin')->group(function (): void {
        Route::post('/purchase-orders/{purchaseOrder}/items', [PurchaseOrderController::class, 'storeItem']);
        Route::delete('/purchase-orders/{purchaseOrder}/items/{item}', [PurchaseOrderController::class, 'destroyItem']);
        Route::post('/purchase-orders/{purchaseOrder}/receive', [PurchaseOrderController::class, 'receive']);
    });

    Route::get('/sales-orders', [SalesOrderController::class, 'index']);
    Route::post('/sales-orders', [SalesOrderController::class, 'store'])->middleware('role:manager,admin,operator');
    Route::get('/sales-orders/{salesOrder}', [SalesOrderController::class, 'show']);
    Route::middleware('role:manager,admin')->group(function (): void {
        Route::post('/sales-orders/{salesOrder}/items', [SalesOrderController::class, 'storeItem']);
        Route::delete('/sales-orders/{salesOrder}/items/{item}', [SalesOrderController::class, 'destroyItem']);
        Route::post('/sales-orders/{salesOrder}/fulfill', [SalesOrderController::class, 'fulfill']);
        Route::post('/sales-orders/{salesOrder}/return', [SalesOrderController::class, 'processReturn']);
    });
    Route::get('/returns', [SalesOrderController::class, 'returns']);

    Route::get('/damages', [DamageController::class, 'index']);
    Route::post('/damages', [DamageController::class, 'store'])->middleware('role:manager,admin');
    Route::post('/damages/{movement}/reverse', [DamageController::class, 'reverse'])->middleware('role:manager,admin');

    // Financials — admin/manager only (RLS + sensitivity)
    Route::middleware('role:manager,admin')->group(function (): void {
        Route::get('/financials/overview', [FinancialController::class, 'overview']);
        Route::get('/financials/transactions', [FinancialController::class, 'transactions']);
    });

    // Admin-only: user management and audit
    Route::prefix('admin')->middleware('role:admin')->group(function (): void {
        Route::get('/users', [\App\Http\Controllers\Api\Admin\UserController::class, 'index']);
        Route::post('/users', [\App\Http\Controllers\Api\Admin\UserController::class, 'store']);
        Route::patch('/users/{user}', [\App\Http\Controllers\Api\Admin\UserController::class, 'update']);
        Route::delete('/users/{user}', [\App\Http\Controllers\Api\Admin\UserController::class, 'destroy']);
        Route::patch('/users/{user}/role', [\App\Http\Controllers\Api\Admin\UserController::class, 'updateRole']);
        Route::get('/audit', [\App\Http\Controllers\Api\Admin\AuditController::class, 'index']);
    });
});
