<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\PurchaseOrderStatus;
use Database\Factories\PurchaseOrderFactory;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $supplier_id
 * @property PurchaseOrderStatus $status
 * @property string $total_cost
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Supplier $supplier
 * @property-read Collection<int, PurchaseOrderItem> $items
 * @property-read Collection<int, Transaction> $transactions
 */
class PurchaseOrder extends Model
{
    /** @use HasFactory<PurchaseOrderFactory> */
    use HasFactory;

    /** @var list<string> */
    protected $fillable = [
        'supplier_id',
        'status',
        'total_cost',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => PurchaseOrderStatus::class,
            'total_cost' => 'decimal:2',
        ];
    }

    /**
     * @return BelongsTo<Supplier, $this>
     */
    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    /**
     * @return HasMany<PurchaseOrderItem, $this>
     */
    public function items(): HasMany
    {
        return $this->hasMany(PurchaseOrderItem::class, 'po_id');
    }

    /**
     * @return MorphMany<Transaction, $this>
     */
    public function transactions(): MorphMany
    {
        return $this->morphMany(Transaction::class, 'reference');
    }

    public function isPending(): bool
    {
        return $this->status === PurchaseOrderStatus::Pending;
    }

    public function isReceived(): bool
    {
        return $this->status === PurchaseOrderStatus::Received;
    }
}
