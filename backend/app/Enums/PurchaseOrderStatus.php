<?php

declare(strict_types=1);

namespace App\Enums;

enum PurchaseOrderStatus: string
{
    case Pending = 'pending';
    case Received = 'received';
}
