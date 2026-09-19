<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\ProductFactory;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $sku
 * @property string $name
 * @property string $price
 * @property int $total_stock
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Collection<int, OrderItem> $orderItems
 * @property-read Collection<int, StockMovement> $stockMovements
 * @property-read Collection<int, PurchaseOrderItem> $purchaseOrderItems
 * @property-read Collection<int, SalesOrderItem> $salesOrderItems
 * @property-read Collection<int, ReturnEntry> $returnEntries
 */
class Product extends Model
{
    /** @use HasFactory<ProductFactory> */
    use HasFactory;

    /** @var list<string> */
    protected $fillable = [
        'sku',
        'name',
        'price',
        'total_stock',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'price' => 'decimal:2',
            'total_stock' => 'integer',
        ];
    }

    /**
     * @return HasMany<OrderItem, $this>
     */
    public function orderItems(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    /**
     * @return HasMany<StockMovement, $this>
     */
    public function stockMovements(): HasMany
    {
        return $this->hasMany(StockMovement::class);
    }

    /**
     * @return HasMany<PurchaseOrderItem, $this>
     */
    public function purchaseOrderItems(): HasMany
    {
        return $this->hasMany(PurchaseOrderItem::class);
    }

    /**
     * @return HasMany<SalesOrderItem, $this>
     */
    public function salesOrderItems(): HasMany
    {
        return $this->hasMany(SalesOrderItem::class);
    }

    /**
     * @return HasMany<ReturnEntry, $this>
     */
    public function returnEntries(): HasMany
    {
        return $this->hasMany(ReturnEntry::class);
    }
}
