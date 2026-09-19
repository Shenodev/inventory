<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\SalesOrderItemFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $so_id
 * @property int $product_id
 * @property int $quantity
 * @property string $unit_price
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read SalesOrder $salesOrder
 * @property-read Product $product
 */
class SalesOrderItem extends Model
{
    /** @use HasFactory<SalesOrderItemFactory> */
    use HasFactory;

    /** @var list<string> */
    protected $fillable = [
        'so_id',
        'product_id',
        'quantity',
        'unit_price',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'quantity' => 'integer',
            'unit_price' => 'decimal:2',
        ];
    }

    /**
     * @return BelongsTo<SalesOrder, $this>
     */
    public function salesOrder(): BelongsTo
    {
        return $this->belongsTo(SalesOrder::class, 'so_id');
    }

    /**
     * @return BelongsTo<Product, $this>
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
