<?php

declare(strict_types=1);

namespace App\Mail;

use App\Models\Product;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class LowStockAlert extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public readonly Product $product, public readonly int $available) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            to: [config('mail.alerts_to', 'admin@contact.shenodev.tech')],
            subject: "Low stock: {$this->product->name} ({$this->product->sku})",
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.low-stock-alert',
            with: [
                'name' => $this->product->name,
                'sku' => $this->product->sku,
                'available' => $this->available,
                'minStock' => $this->product->min_stock ?? config('inventory.low_stock_threshold'),
                'location' => $this->product->location ?? '—',
                'barcode' => $this->product->barcode ?? '—',
                'appUrl' => rtrim((string) config('app.url'), '/'),
            ],
        );
    }
}
