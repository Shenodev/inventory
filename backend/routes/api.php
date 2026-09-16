<?php

declare(strict_types=1);

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\ProductController;
use Illuminate\Support\Facades\Route;

Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:login');

Route::middleware('auth:sanctum')->group(function (): void {
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    Route::get('/dashboard', DashboardController::class);

    Route::get('/products', [ProductController::class, 'index']);
    Route::post('/products/{product}/stock', [ProductController::class, 'adjustStock']);

    Route::get('/orders/reserved', [OrderController::class, 'reserved']);
    Route::get('/orders/sold', [OrderController::class, 'sold']);
});
