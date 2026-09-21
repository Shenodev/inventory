<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table): void {
            $table->string('location')->nullable()->after('total_stock');
            $table->string('barcode')->nullable()->unique()->after('location');
        });

        // Seed plausible warehouse locations and barcodes for existing rows
        $products = DB::table('products')->select('id', 'sku')->get();
        $aisles = ['A', 'B', 'C', 'D'];
        foreach ($products as $product) {
            $aisle = $aisles[array_rand($aisles)];
            $bay = random_int(1, 12);
            $shelf = chr(65 + random_int(0, 3));
            $location = "Aisle {$aisle}, Bay {$bay}, Shelf {$shelf}";
            // Generate EAN-like barcode from SKU or random
            $barcode = str_pad((string) $product->id, 12, '0', STR_PAD_LEFT) . random_int(10, 99);
            // Ensure unique
            $barcode = substr($barcode, -13);

            DB::table('products')->where('id', $product->id)->update([
                'location' => $location,
                'barcode' => $barcode,
            ]);
        }
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table): void {
            $table->dropColumn(['location', 'barcode']);
        });
    }
};
