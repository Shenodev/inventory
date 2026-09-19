<?php

declare(strict_types=1);

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\PurchaseOrderController;
use App\Http\Controllers\Api\SupplierController;
use Illuminate\Support\Facades\Route;

Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:login');

Route::middleware('auth:sanctum')->group(function (): void {
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    Route::get('/dashboard', DashboardController::class);

    Route::get('/products', [ProductController::class, 'index']);
    Route::post('/products/{product}/stock', [ProductController::class, 'adjustStock']);

    Route::get('/orders/reserved', [OrderController::class, 'reserved']);
    Route::get('/orders/sold', [OrderController::class, 'sold']);

    Route::apiResource('/suppliers', SupplierController::class);

    Route::get('/purchase-orders', [PurchaseOrderController::class, 'index']);
    Route::post('/purchase-orders', [PurchaseOrderController::class, 'store']);
    Route::get('/purchase-orders/{purchaseOrder}', [PurchaseOrderController::class, 'show']);
    Route::post('/purchase-orders/{purchaseOrder}/items', [PurchaseOrderController::class, 'storeItem']);
    Route::delete('/purchase-orders/{purchaseOrder}/items/{item}', [PurchaseOrderController::class, 'destroyItem']);
    Route::post('/purchase-orders/{purchaseOrder}/receive', [PurchaseOrderController::class, 'receive']);
});
