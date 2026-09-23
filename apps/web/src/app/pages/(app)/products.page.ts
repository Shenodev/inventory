import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  AbstractControl,
  FormGroup,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { RouteMeta } from '@analogjs/router';

import { formatCurrency, formatNumber } from '../../core/format';
import { apiErrorMessage } from '../../core/api-error';
import { Product, ProductsService } from '../../core/products/products.service';
import { BarcodeScannerComponent } from '../../shared/barcode-scanner.component';

export const routeMeta: RouteMeta = {
  title: 'Products · ShenoInventory',
};

const PAGE_SIZE = 50;
const LOW_STOCK_THRESHOLD = 10;

type StockStatus = 'in-stock' | 'low-stock' | 'out-of-stock';

@Component({
  selector: 'app-products-page',
  imports: [ReactiveFormsModule, BarcodeScannerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="font-heading text-2xl font-semibold text-white">Products</h1>
        <p class="mt-1 text-sm text-slate-400">
          {{ products().length }} products tracked across the warehouse.
        </p>
      </div>
      <div class="flex gap-3">
        <button
          type="button"
          (click)="openDamage()"
          class="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-2 text-sm font-medium text-red-300 transition-colors hover:bg-red-400/20"
        >
          Report Damage
        </button>
        <button
          type="button"
          (click)="load(true)"
          [disabled]="loading()"
          class="rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-surface hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {{ loading() ? 'Refreshing…' : 'Refresh' }}
        </button>
      </div>
    </header>

    @if (notice(); as message) {
      <div
        class="mt-6 flex items-center justify-between gap-4 rounded-xl border border-electric-cyan/30 bg-electric-cyan/10 px-5 py-4"
        role="status"
      >
        <p class="text-sm text-slate-200">{{ message }}</p>
        <button
          type="button"
          (click)="notice.set(null)"
          class="shrink-0 text-sm font-medium text-electric-cyan transition-colors hover:text-cyan-200"
        >
          Dismiss
        </button>
      </div>
    }

    @if (error(); as message) {
      <div
        class="mt-6 flex items-center justify-between gap-4 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4"
      >
        <p class="text-sm text-red-200">{{ message }}</p>
        <button
          type="button"
          (click)="load(true)"
          class="shrink-0 rounded-xl bg-red-500/90 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-500"
        >
          Retry
        </button>
      </div>
    }

    <section class="mt-6 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
      <article class="rounded-xl bg-surface p-6">
        <p class="text-sm font-medium text-slate-400">Products tracked</p>
        <p class="mt-2 font-heading text-2xl font-semibold text-white">
          {{ formatNumber(products().length) }}
        </p>
        <p class="mt-1 text-xs text-slate-500">Items in the catalog</p>
      </article>
      <article class="rounded-xl bg-surface p-6">
        <p class="text-sm font-medium text-slate-400">Out of stock</p>
        <p
          class="mt-2 font-heading text-2xl font-semibold"
          [class]="outOfStockCount() > 0 ? 'text-red-300' : 'text-white'"
        >
          {{ formatNumber(outOfStockCount()) }}
        </p>
        <p class="mt-1 text-xs text-slate-500">Nothing left to sell</p>
      </article>
      <article class="rounded-xl bg-surface p-6">
        <p class="text-sm font-medium text-slate-400">Low stock</p>
        <p
          class="mt-2 font-heading text-2xl font-semibold"
          [class]="lowStockCount() > 0 ? 'text-amber-300' : 'text-white'"
        >
          {{ formatNumber(lowStockCount()) }}
        </p>
        <p class="mt-1 text-xs text-slate-500">At or below each product's reorder point</p>
      </article>
      <article class="rounded-xl bg-surface p-6">
        <p class="text-sm font-medium text-slate-400">Available units</p>
        <p class="mt-2 font-heading text-2xl font-semibold text-electric-cyan">
          {{ formatNumber(totalAvailableUnits()) }}
        </p>
        <p class="mt-1 text-xs text-slate-500">Sum across all products</p>
      </article>
    </section>

    <section class="mt-6 rounded-xl border border-white/5 bg-surface p-4">
      <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Barcode quick scan</p>
      <p class="mt-1 text-xs text-slate-500">Scan a barcode with a handheld scanner (keyboard wedge) or camera — it will filter to the matching product. Supports barcode, SKU, name or location search.</p>
      <div class="mt-3">
        <app-barcode-scanner placeholder="Scan barcode or enter SKU / barcode…" (productFound)="onBarcodeFound($event)" (scanFailed)="onBarcodeFailed($event)" />
      </div>
      @if (barcodeNotice(); as bmsg) {
        <p class="mt-2 text-xs" [class]="barcodeIsError() ? 'text-amber-300' : 'text-emerald-300'">{{ bmsg }}</p>
      }
    </section>

    <div class="mt-6 flex flex-wrap items-center gap-3">
      <label class="relative flex min-w-0 flex-1 items-center">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          class="pointer-events-none absolute left-3 h-4 w-4 text-slate-500"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.4-3.4" />
        </svg>
        <input
          type="search"
          placeholder="Search by name, SKU, barcode or location…"
          [value]="query()"
          (input)="onQuery($event)"
          class="w-full rounded-xl border border-white/10 bg-surface py-2.5 pl-10 pr-10 text-sm text-white outline-none placeholder:text-slate-500 focus:border-electric-cyan"
        />
        @if (query() !== '') {
          <button
            type="button"
            (click)="clearQuery()"
            aria-label="Clear search"
            class="absolute right-2 rounded-lg p-1 text-slate-400 transition-colors hover:text-white"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="h-4 w-4">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        }
      </label>
      <span class="text-sm text-slate-500">{{ resultLabel() }}</span>
    </div>

    <div class="mt-4 flex flex-wrap gap-2" role="group" aria-label="Quick stock filters">
      <button
        type="button"
        role="switch"
        [attr.aria-checked]="lowStockFilter()"
        (click)="toggleLowStock()"
        [class]="filterToggleClass(lowStockFilter())"
      >
        Low Stock
        @if (lowStockCount() > 0) {
          <span class="ml-1 text-xs opacity-70">({{ formatNumber(lowStockCount()) }})</span>
        }
      </button>
      <button
        type="button"
        role="switch"
        [attr.aria-checked]="outOfStockFilter()"
        (click)="toggleOutOfStock()"
        [class]="filterToggleClass(outOfStockFilter())"
      >
        Out of Stock
        @if (outOfStockCount() > 0) {
          <span class="ml-1 text-xs opacity-70">({{ formatNumber(outOfStockCount()) }})</span>
        }
      </button>
    </div>

    <section class="mt-4 overflow-hidden rounded-xl bg-surface">
      <div class="max-h-[70vh] overflow-x-auto overflow-y-auto">
        <table class="w-full text-left text-sm">
          <thead
            class="sticky top-0 z-10 border-b border-white/5 bg-surface text-xs uppercase tracking-wide text-slate-500"
          >
            <tr>
              <th scope="col" class="px-6 py-3 font-medium">Product</th>
              <th scope="col" class="px-6 py-3 font-medium">Location</th>
              <th scope="col" class="px-6 py-3 font-medium">Barcode</th>
              <th scope="col" class="px-6 py-3 text-center font-medium">Total Stock</th>
              <th scope="col" class="px-6 py-3 text-center font-medium">Reserved</th>
              <th scope="col" class="px-6 py-3 text-center font-medium">Sold</th>
              <th scope="col" class="px-6 py-3 text-center font-medium">Available</th>
              <th scope="col" class="px-6 py-3 font-medium">Status</th>
              <th scope="col" class="px-6 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/5">
            @for (product of visibleProducts(); track product.id) {
              <tr class="transition-colors hover:bg-deep-slate/60">
                <td class="px-6 py-4">
                  <p class="font-medium text-white">{{ product.name }}</p>
                  <p class="mt-0.5 text-xs text-slate-500">
                    <span class="font-mono">{{ product.sku }}</span> · {{ price(product.price) }}
                  </p>
                </td>
                <td class="px-6 py-4">
                  <span class="inline-flex items-center gap-1 text-xs font-medium text-slate-300">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="h-3.5 w-3.5 text-slate-500"><path d="M12 21s-6-5.2-6-9a6 6 0 1 1 12 0c0 3.8-6 9-6 9Z"/><circle cx="12" cy="12" r="2"/></svg>
                    {{ product.location ?? '—' }}
                  </span>
                </td>
                <td class="px-6 py-4">
                  <span class="font-mono text-xs text-slate-300">{{ product.barcode ?? '—' }}</span>
                </td>
                <td class="px-6 py-4 text-center font-medium text-white">
                  {{ product.total_stock }}
                </td>
                <td class="px-6 py-4 text-center text-amber-300">
                  {{ product.reserved_stock }}
                </td>
                <td class="px-6 py-4 text-center text-slate-300">{{ product.sold_stock }}</td>
                <td
                  class="px-6 py-4 text-center font-medium"
                  [class]="availableClass(product.available_stock)"
                >
                  {{ product.available_stock }}
                </td>
                <td class="px-6 py-4">
                  <span
                    class="inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold"
                    [class]="statusChipClass(statusOf(product))"
                  >
                    {{ statusLabel(statusOf(product)) }}
                  </span>
                </td>
                <td class="px-6 py-4 text-right">
                  <div class="flex justify-end gap-2">
                    <button
                      type="button"
                      (click)="openLocationEdit(product)"
                      class="rounded-xl border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:border-electric-cyan/40 hover:text-electric-cyan"
                    >
                      Location
                    </button>
                    <button
                      type="button"
                      (click)="openAdjust(product)"
                      class="rounded-xl border border-white/10 px-3 py-1.5 text-sm font-medium text-slate-300 transition-colors hover:border-electric-cyan/40 hover:text-electric-cyan"
                    >
                      Adjust Stock
                    </button>
                  </div>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="9" class="px-6 py-10 text-center text-slate-500">
                  {{ emptyLabel() }}
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </section>

    @if (filteredProducts().length > visibleProducts().length) {
      <div class="mt-4 flex justify-center">
        <button
          type="button"
          (click)="showMore()"
          class="rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-surface hover:text-white"
        >
          Show more ({{ filteredProducts().length - visibleProducts().length }} remaining)
        </button>
      </div>
    }

    @if (locationProduct(); as product) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-deep-slate/80 px-4 py-8 backdrop-blur-sm"
        (click)="closeLocationEdit()"
      >
        <div
          class="w-full max-w-md rounded-xl border border-white/10 bg-surface p-6 text-left"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-location-title"
          (click)="$event.stopPropagation()"
        >
          <div class="flex items-start justify-between gap-4">
            <div>
              <h2 id="edit-location-title" class="font-heading text-lg font-semibold text-white">
                Edit location & barcode
              </h2>
              <p class="mt-1 text-sm text-slate-400">{{ product.name }} · {{ product.sku }}</p>
            </div>
            <button
              type="button"
              (click)="closeLocationEdit()"
              aria-label="Close dialog"
              class="rounded-xl p-1.5 text-slate-400 transition-colors hover:bg-deep-slate hover:text-white"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="h-5 w-5">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>

          <form class="mt-5" [formGroup]="locationForm" (ngSubmit)="submitLocation()">
            <label class="block text-sm font-medium text-slate-300" for="edit-location">
              Physical location
            </label>
            <input
              id="edit-location"
              type="text"
              formControlName="location"
              placeholder="e.g. Aisle 4, Shelf B"
              class="mt-1 w-full rounded-xl border border-white/10 bg-deep-slate px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-electric-cyan"
            />
            <p class="mt-1 text-xs text-slate-500">Exactly where the item is stored. Workers use this to pick.</p>

            <label class="mt-4 block text-sm font-medium text-slate-300" for="edit-barcode">
              Barcode
            </label>
            <input
              id="edit-barcode"
              type="text"
              formControlName="barcode"
              placeholder="e.g. 5901234123457"
              class="mt-1 w-full rounded-xl border border-white/10 bg-deep-slate px-4 py-3 font-mono text-white outline-none placeholder:text-slate-500 focus:border-electric-cyan"
            />

            @if (formError(); as message) {
              <p
                class="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300"
                role="alert"
              >
                {{ message }}
              </p>
            }

            <div class="mt-6 flex gap-3">
              <button
                type="button"
                (click)="closeLocationEdit()"
                [disabled]="savingLocation()"
                class="flex-1 rounded-xl border border-white/10 px-4 py-3 font-medium text-slate-300 transition-colors hover:bg-deep-slate hover:text-white disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                [disabled]="savingLocation()"
                class="flex-1 rounded-xl bg-electric-cyan px-4 py-3 font-medium text-deep-slate transition-colors hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {{ savingLocation() ? 'Saving…' : 'Save' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    }

    @if (activeProduct(); as product) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-deep-slate/80 px-4 py-8 backdrop-blur-sm"
        (click)="closeAdjust()"
      >
        <div
          class="w-full max-w-md rounded-xl border border-white/10 bg-surface p-6 text-left"
          role="dialog"
          aria-modal="true"
          aria-labelledby="adjust-stock-title"
          (click)="$event.stopPropagation()"
        >
          <div class="flex items-start justify-between gap-4">
            <div>
              <h2 id="adjust-stock-title" class="font-heading text-lg font-semibold text-white">
                Adjust stock
              </h2>
              <p class="mt-1 text-sm text-slate-400">{{ product.name }}</p>
              @if (product.location) {
                <p class="mt-1 text-xs text-slate-500">📍 {{ product.location }} · <span class="font-mono">{{ product.barcode ?? product.sku }}</span></p>
              }
            </div>
            <button
              type="button"
              (click)="closeAdjust()"
              aria-label="Close dialog"
              class="rounded-xl p-1.5 text-slate-400 transition-colors hover:bg-deep-slate hover:text-white"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="h-5 w-5">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>

          <p class="mt-4 rounded-xl bg-deep-slate px-4 py-3 text-sm text-slate-300">
            Currently <span class="font-medium text-white">{{ product.total_stock }}</span> units in
            stock, <span class="font-medium text-white">{{ product.available_stock }}</span>
            available.
          </p>

          <form class="mt-5" [formGroup]="form" (ngSubmit)="submitAdjust()">
            <span class="block text-sm font-medium text-slate-300">Movement</span>
            <div class="mt-2 grid grid-cols-2 gap-2">
              <label class="cursor-pointer">
                <input type="radio" formControlName="type" value="in" class="peer sr-only" />
                <span
                  class="flex items-center justify-center rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-slate-300 transition-colors peer-checked:border-electric-cyan peer-checked:bg-electric-cyan peer-checked:text-deep-slate"
                >
                  Add
                </span>
              </label>
              <label class="cursor-pointer">
                <input type="radio" formControlName="type" value="out" class="peer sr-only" />
                <span
                  class="flex items-center justify-center rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-slate-300 transition-colors peer-checked:border-electric-cyan peer-checked:bg-electric-cyan peer-checked:text-deep-slate"
                >
                  Remove
                </span>
              </label>
            </div>

            <label class="mt-4 block text-sm font-medium text-slate-300" for="quantity">
              Quantity
            </label>
            <input
              id="quantity"
              type="number"
              min="1"
              formControlName="quantity"
              class="mt-1 w-full rounded-xl border border-white/10 bg-deep-slate px-4 py-3 text-white outline-none focus:border-electric-cyan"
            />

            <label class="mt-4 block text-sm font-medium text-slate-300" for="note">
              Note <span class="text-slate-500">(optional)</span>
            </label>
            <input
              id="note"
              type="text"
              formControlName="note"
              placeholder="e.g. Stocktake correction"
              class="mt-1 w-full rounded-xl border border-white/10 bg-deep-slate px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-electric-cyan"
            />

            @if (formError(); as message) {
              <p
                class="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300"
                role="alert"
              >
                {{ message }}
              </p>
            }

            <div class="mt-6 flex gap-3">
              <button
                type="button"
                (click)="closeAdjust()"
                [disabled]="saving()"
                class="flex-1 rounded-xl border border-white/10 px-4 py-3 font-medium text-slate-300 transition-colors hover:bg-deep-slate hover:text-white disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                [disabled]="saving()"
                class="flex-1 rounded-xl bg-electric-cyan px-4 py-3 font-medium text-deep-slate transition-colors hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {{ saving() ? 'Saving…' : submitLabel() }}
              </button>
            </div>
          </form>
        </div>
      </div>
    }

    @if (damageOpen()) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-deep-slate/80 px-4 py-8 backdrop-blur-sm"
        (click)="closeDamage()"
      >
        <div
          class="w-full max-w-md rounded-xl border border-white/10 bg-surface p-6 text-left"
          role="dialog"
          aria-modal="true"
          aria-labelledby="report-damage-title"
          (click)="$event.stopPropagation()"
        >
          <div class="flex items-start justify-between gap-4">
            <div>
              <h2 id="report-damage-title" class="font-heading text-lg font-semibold text-white">
                Report damage
              </h2>
              <p class="mt-1 text-sm text-slate-400">
                Write off broken or unusable stock. Scan barcode or select product.
              </p>
            </div>
            <button
              type="button"
              (click)="closeDamage()"
              [disabled]="damaging()"
              aria-label="Close dialog"
              class="rounded-xl p-1.5 text-slate-400 transition-colors hover:bg-deep-slate hover:text-white disabled:opacity-50"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="h-5 w-5">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>

          <div class="mt-4">
            <app-barcode-scanner placeholder="Scan damaged item barcode…" (productFound)="onDamageBarcode($event)" />
          </div>

          <form class="mt-5" [formGroup]="damageForm" (ngSubmit)="submitDamage()">
            <label class="block text-sm font-medium text-slate-300" for="damage-product">
              Product
            </label>
            <select
              id="damage-product"
              formControlName="productId"
              (change)="onDamageProductSelected()"
              class="mt-1 w-full rounded-xl border border-white/10 bg-deep-slate px-3 py-3 text-sm text-white outline-none focus:border-electric-cyan"
              [class]="{ 'border-red-400/50': damageForm.controls.productId.touched && damageForm.controls.productId.invalid }"
            >
              <option [ngValue]="null" disabled>Select a product…</option>
              @for (product of products(); track product.id) {
                <option [ngValue]="product.id">
                  {{ product.name }} ({{ product.sku }}) · {{ product.barcode ?? 'no barcode' }} — {{ product.available_stock }} available · {{ product.location ?? 'no location' }}
                </option>
              }
            </select>
            @if (damageForm.controls.productId.touched && damageForm.controls.productId.invalid) {
              <p class="mt-2 text-xs text-red-300">Select a product to write off.</p>
            }

            <label class="mt-4 block text-sm font-medium text-slate-300" for="damage-quantity">
              Quantity damaged
            </label>
            <input
              id="damage-quantity"
              type="number"
              min="1"
              [attr.max]="damageQuantityMax()"
              formControlName="quantity"
              class="mt-1 w-full rounded-xl border border-white/10 bg-deep-slate px-4 py-3 text-white outline-none focus:border-electric-cyan"
              [class]="{ 'border-red-400/50': damageForm.controls.quantity.touched && damageForm.controls.quantity.invalid }"
            />
            @if (damageForm.controls.quantity.touched && damageForm.controls.quantity.invalid) {
              <p class="mt-2 text-xs text-red-300">Enter at least 1 damaged unit.</p>
            }
            @if (damageForm.hasError('exceedsAvailable')) {
              <p class="mt-2 text-xs text-red-300">{{ damageForm.getError('exceedsAvailable') }}</p>
            }

            <label class="mt-4 block text-sm font-medium text-slate-300" for="damage-reason">
              Reason <span class="text-slate-500">(optional)</span>
            </label>
            <textarea
              id="damage-reason"
              rows="2"
              maxlength="500"
              formControlName="reason"
              placeholder="e.g. Cracked during unload"
              class="mt-1 w-full rounded-xl border border-white/10 bg-deep-slate px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-electric-cyan"
            ></textarea>

            @if (formError(); as message) {
              <p
                class="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300"
                role="alert"
              >
                {{ message }}
              </p>
            }

            <div class="mt-6 flex gap-3">
              <button
                type="button"
                (click)="closeDamage()"
                [disabled]="damaging()"
                class="flex-1 rounded-xl border border-white/10 px-4 py-3 font-medium text-slate-300 transition-colors hover:bg-deep-slate hover:text-white disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                [disabled]="damaging()"
                class="flex-1 rounded-xl bg-red-400 px-4 py-3 font-medium text-deep-slate transition-colors hover:bg-red-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {{ damaging() ? 'Writing off…' : 'Write off' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    }
  `,
})
export default class ProductsPage {
  private readonly productsService = inject(ProductsService);
  private readonly formBuilder = inject(NonNullableFormBuilder);

  protected readonly products = signal<Product[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly notice = signal<string | null>(null);

  protected readonly query = signal('');
  protected readonly limit = signal(PAGE_SIZE);

  protected readonly lowStockFilter = signal(false);
  protected readonly outOfStockFilter = signal(false);

  protected readonly activeProduct = signal<Product | null>(null);
  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);

  protected readonly damageOpen = signal(false);
  protected readonly damaging = signal(false);

  protected readonly barcodeNotice = signal<string | null>(null);
  protected readonly barcodeIsError = signal(false);

  protected readonly locationProduct = signal<Product | null>(null);
  protected readonly savingLocation = signal(false);
  protected readonly locationForm = this.formBuilder.group({
    location: this.formBuilder.control('', [Validators.maxLength(100)]),
    barcode: this.formBuilder.control('', [Validators.maxLength(50)]),
  });

  protected readonly damageForm = this.formBuilder.group(
    {
      productId: this.formBuilder.control<number | null>(null, Validators.required),
      quantity: this.formBuilder.control(1, [
        Validators.required,
        Validators.min(1),
        Validators.max(1000000),
      ]),
      reason: this.formBuilder.control('', [Validators.maxLength(500)]),
    },
    { validators: [this.damageAvailableValidator()] }
  );

  protected readonly filteredProducts = computed(() => {
    const needle = this.query().trim().toLowerCase();
    const lowFilter = this.lowStockFilter();
    const outFilter = this.outOfStockFilter();

    return this.products().filter((product) => {
      const matchesQuery =
        needle === '' ||
        product.name.toLowerCase().includes(needle) ||
        product.sku.toLowerCase().includes(needle) ||
        (product.barcode ?? '').toLowerCase().includes(needle) ||
        (product.location ?? '').toLowerCase().includes(needle);

      if (!matchesQuery) {
        return false;
      }

      const available = product.available_stock;
      const isOutOfStock = available === 0;
      const isLowStock = available > 0 && available <= this.reorderPoint(product);

      if (lowFilter && outFilter) {
        return isLowStock || isOutOfStock;
      }

      if (lowFilter) {
        return isLowStock;
      }

      if (outFilter) {
        return isOutOfStock;
      }

      return true;
    });
  });

  protected readonly visibleProducts = computed(() =>
    this.filteredProducts().slice(0, this.limit())
  );

  protected readonly outOfStockCount = computed(
    () => this.products().filter((product) => product.available_stock === 0).length
  );

  protected readonly lowStockCount = computed(
    () =>
      this.products().filter(
        (product) => product.available_stock > 0 && product.available_stock <= this.reorderPoint(product)
      ).length
  );

  protected readonly totalAvailableUnits = computed(() =>
    this.products().reduce((sum, product) => sum + product.available_stock, 0)
  );

  protected readonly form = this.formBuilder.group({
    type: this.formBuilder.control<'in' | 'out'>('in', Validators.required),
    quantity: this.formBuilder.control(1, [Validators.required, Validators.min(1)]),
    note: this.formBuilder.control(''),
  });

  constructor() {
    afterNextRender(() => this.load());
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.activeProduct() !== null) {
      this.closeAdjust();
    }

    if (this.damageOpen()) {
      this.closeDamage();
    }

    if (this.locationProduct() !== null) {
      this.closeLocationEdit();
    }
  }

  protected load(force = false): void {
    this.loading.set(true);
    this.error.set(null);

    this.productsService.list(force).subscribe({
      next: ({ products }) => {
        this.products.set(products);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.error.set(this.messageFor(error, 'Unable to load products right now.'));
      },
    });
  }

  protected onQuery(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
    this.limit.set(PAGE_SIZE);
  }

  protected clearQuery(): void {
    this.query.set('');
    this.limit.set(PAGE_SIZE);
  }

  protected toggleLowStock(): void {
    this.lowStockFilter.update((active) => !active);
  }

  protected toggleOutOfStock(): void {
    this.outOfStockFilter.update((active) => !active);
  }

  protected filterToggleClass(active: boolean): string {
    return active
      ? 'rounded-xl border border-electric-cyan/40 bg-electric-cyan/10 px-4 py-2 text-sm font-medium text-electric-cyan transition-colors'
      : 'rounded-xl border border-white/10 bg-surface px-4 py-2 text-sm font-medium text-slate-400 transition-colors hover:text-slate-200';
  }

  protected showMore(): void {
    this.limit.update((current) => current + PAGE_SIZE);
  }

  protected resultLabel(): string {
    const needle = this.query().trim();
    const filtersActive = this.lowStockFilter() || this.outOfStockFilter();

    if (needle === '' && !filtersActive) {
      return `${this.products().length} product${this.products().length === 1 ? '' : 's'}`;
    }

    const count = this.filteredProducts().length;

    if (needle === '') {
      return `${count} of ${this.products().length} product${this.products().length === 1 ? '' : 's'}`;
    }

    return `${count} match${count === 1 ? '' : 'es'} for "${needle}"`;
  }

  protected emptyLabel(): string {
    if (this.loading()) {
      return 'Loading products…';
    }

    if (this.query().trim() !== '') {
      return 'No products match your search.';
    }

    if (this.lowStockFilter() || this.outOfStockFilter()) {
      return 'No products match the current stock filters.';
    }

    return 'No products found.';
  }

  protected onBarcodeFound(product: Product): void {
    this.query.set(product.barcode ?? product.sku);
    this.limit.set(PAGE_SIZE);
    this.barcodeNotice.set(`Scanned: ${product.name} — ${product.location ?? 'no location'} (barcode ${product.barcode ?? '—'})`);
    this.barcodeIsError.set(false);
    // ensure product is in list (in case lookup returned single); merge if needed
    if (!this.products().some((p) => p.id === product.id)) {
      this.products.update((list) => [...list, product]);
    }
  }

  protected onBarcodeFailed(code: string): void {
    // fallback to filtering by typed code
    this.query.set(code);
    this.barcodeNotice.set(`No exact barcode match for "${code}" — showing search results.`);
    this.barcodeIsError.set(true);
  }

  protected onDamageBarcode(product: Product): void {
    this.damageForm.controls.productId.setValue(product.id);
    this.damageForm.controls.quantity.updateValueAndValidity();
    this.notice.set(`Scanned ${product.name} for damage report.`);
  }

  protected openLocationEdit(product: Product): void {
    this.locationForm.setValue({
      location: product.location ?? '',
      barcode: product.barcode ?? '',
    });
    this.formError.set(null);
    this.locationProduct.set(product);
  }

  protected closeLocationEdit(): void {
    if (this.savingLocation()) return;
    this.locationProduct.set(null);
  }

  protected submitLocation(): void {
    const product = this.locationProduct();
    if (product === null || this.savingLocation()) return;

    const { location, barcode } = this.locationForm.getRawValue();
    this.savingLocation.set(true);
    this.formError.set(null);

    this.productsService.updateProduct(product.id, {
      location: location.trim() || null,
      barcode: barcode.trim() || null,
    }).subscribe({
      next: ({ product: updated }) => {
        this.products.update((list) => list.map((p) => p.id === updated.id ? updated : p));
        this.savingLocation.set(false);
        this.locationProduct.set(null);
        this.notice.set(`${updated.name} location updated to ${updated.location ?? '—'}.`);
      },
      error: (error: unknown) => {
        this.savingLocation.set(false);
        this.formError.set(this.messageFor(error, 'Unable to update location/barcode.'));
      },
    });
  }

  protected openAdjust(product: Product): void {
    this.form.reset({ type: 'in', quantity: 1, note: '' });
    this.formError.set(null);
    this.activeProduct.set(product);
  }

  protected closeAdjust(): void {
    if (this.saving()) {
      return;
    }

    this.activeProduct.set(null);
  }

  protected submitAdjust(): void {
    const product = this.activeProduct();

    if (product === null || this.saving()) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { type, quantity, note } = this.form.getRawValue();
    this.saving.set(true);
    this.formError.set(null);

    this.productsService
      .adjustStock(product.id, { type, quantity, note: note.trim() || null })
      .subscribe({
        next: (response) => {
          this.products.update((list) =>
            list.map((item) => (item.id === response.product.id ? response.product : item))
          );
          this.saving.set(false);
          this.activeProduct.set(null);
          this.notice.set(
            `${response.product.name}: ${type === 'in' ? 'added' : 'removed'} ${quantity} unit(s).`
          );
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.formError.set(this.messageFor(error, 'Unable to update stock right now.'));
        },
      });
  }

  protected submitLabel(): string {
    return this.form.controls.type.value === 'in' ? 'Add stock' : 'Remove stock';
  }

  protected openDamage(): void {
    this.damageForm.reset({ productId: null, quantity: 1, reason: '' });
    this.formError.set(null);
    this.damageOpen.set(true);
  }

  protected closeDamage(): void {
    if (this.damaging()) {
      return;
    }

    this.damageOpen.set(false);
  }

  protected onDamageProductSelected(): void {
    this.damageForm.controls.quantity.updateValueAndValidity();
  }

  protected damageQuantityMax(): number | null {
    const productId = this.damageForm.controls.productId.value;
    const product = this.products().find((item) => item.id === productId);
    return product === undefined ? null : product.available_stock;
  }

  protected submitDamage(): void {
    if (this.damaging()) {
      return;
    }

    if (this.damageForm.invalid) {
      this.damageForm.markAllAsTouched();
      return;
    }

    const { productId, quantity, reason } = this.damageForm.getRawValue();

    if (productId === null) {
      return;
    }

    this.damaging.set(true);
    this.formError.set(null);

    this.productsService
      .reportDamage({
        product_id: productId,
        quantity,
        reason: reason.trim() || null,
      })
      .subscribe({
        next: (response) => {
          this.products.update((list) =>
            list.map((item) =>
              item.id === response.damage.product_id
                ? { ...item, total_stock: item.total_stock - response.damage.quantity }
                : item
            )
          );
          this.damaging.set(false);
          this.damageOpen.set(false);
          this.notice.set(response.message);
        },
        error: (error: unknown) => {
          this.damaging.set(false);
          this.formError.set(this.messageFor(error, 'Unable to report the damage right now.'));
        },
      });
  }

  protected price(value: string): string {
    return formatCurrency(value);
  }

  protected formatNumber(value: number): string {
    return formatNumber(value);
  }

  protected availableClass(available: number): string {
    return available <= 0 ? 'text-red-300' : 'text-electric-cyan';
  }

  protected statusOf(product: Product): StockStatus {
    const available = product.available_stock;

    if (available === 0) {
      return 'out-of-stock';
    }

    if (available <= this.reorderPoint(product)) {
      return 'low-stock';
    }

    return 'in-stock';
  }

  protected statusLabel(status: StockStatus): string {
    if (status === 'out-of-stock') {
      return 'Out of stock';
    }

    if (status === 'low-stock') {
      return 'Low stock';
    }

    return 'In stock';
  }

  protected statusChipClass(status: StockStatus): string {
    if (status === 'out-of-stock') {
      return 'bg-red-500/10 text-red-300';
    }

    if (status === 'low-stock') {
      return 'bg-amber-400/10 text-amber-300';
    }

    return 'bg-electric-cyan/10 text-electric-cyan';
  }

  protected reorderPoint(product: Product): number {
    return product.min_stock ?? LOW_STOCK_THRESHOLD;
  }

  private damageAvailableValidator(): ValidatorFn {
    return (control: AbstractControl) => {
      const productId = (control as FormGroup).get('productId')?.value as number | null;
      const quantity = Number((control as FormGroup).get('quantity')?.value ?? 0);

      if (productId === null || quantity <= 0) {
        return null;
      }

      const product = this.products().find((item) => item.id === productId);

      if (product === undefined) {
        return null;
      }

      if (quantity > product.available_stock) {
        return {
          exceedsAvailable: `Only ${product.available_stock} unit${product.available_stock === 1 ? '' : 's'} available to write off.`,
        };
      }

      return null;
    };
  }

  private messageFor(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse && error.status === 422) {
      const errors = (error.error as { errors?: Record<string, string[]> } | null)?.errors;
      const first = errors ? Object.values(errors)[0]?.[0] : undefined;
      return first ?? fallback;
    }

    return apiErrorMessage(error, fallback);
  }
}
