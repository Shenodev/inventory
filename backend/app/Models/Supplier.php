<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\SupplierFactory;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $name
 * @property string|null $email
 * @property string|null $phone
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Collection<int, PurchaseOrder> $purchaseOrders
 */
class Supplier extends Model
{
    /** @use HasFactory<SupplierFactory> */
    use HasFactory;

    /** @var list<string> */
    protected $fillable = [
        'name',
        'email',
        'phone',
    ];

    /**
     * @return HasMany<PurchaseOrder, $this>
     */
    public function purchaseOrders(): HasMany
    {
        return $this->hasMany(PurchaseOrder::class);
    }
}
