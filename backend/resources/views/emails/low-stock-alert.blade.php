<x-mail::message>
# Low-stock alert

**{{ $name }}** ({{ $sku }}) is running low.

@component('mail::table')
| Field | Value |
|-------|-------|
| Available | **{{ $available }}** |
| Reorder point | {{ $minStock }} |
| Location | {{ $location }} |
| Barcode | {{ $barcode }} |
@endcomponent

Restock this product soon to avoid stockouts.

@component('mail::button', ['url' => $appUrl . '/products'])
Open ShenoInventory
@endcomponent

— ShenoInventory ops
</x-mail::message>