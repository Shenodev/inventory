import { ChangeDetectionStrategy, Component, OnDestroy, computed, inject, input, output, signal } from '@angular/core';
import { ProductsService, Product } from '../core/products/products.service';

@Component({
  selector: 'app-barcode-scanner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex gap-2">
      <label class="relative flex flex-1 items-center">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="pointer-events-none absolute left-3 h-4 w-4 text-slate-500">
          <path d="M3 7h2v10H3zM7 7h2v10H7zM11 7h1v10h-1zM14 7h3v10h-3zM18 7h3v10h-3z" />
        </svg>
        <input
          type="text"
          [placeholder]="placeholder()"
          [value]="scanValue()"
          (input)="onInput($event)"
          (keydown.enter)="onEnter()"
          class="w-full rounded-xl border border-white/10 bg-surface py-2.5 pl-10 pr-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-electric-cyan"
        />
      </label>
      <button
        type="button"
        (click)="lookup()"
        [disabled]="scanValue().trim() === '' || scanning()"
        class="rounded-xl bg-electric-cyan px-4 py-2.5 text-sm font-medium text-deep-slate transition-colors hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {{ scanning() ? 'Scanning…' : 'Scan' }}
      </button>
      @if (supportsCamera()) {
        <button
          type="button"
          (click)="toggleCamera()"
          class="rounded-xl border border-white/10 px-3 py-2.5 text-sm font-medium"
          [class]="cameraActive() ? 'border-electric-cyan/40 bg-electric-cyan/10 text-electric-cyan' : 'text-slate-300 hover:bg-surface hover:text-white'"
          [attr.aria-pressed]="cameraActive()"
          title="Camera scan"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="h-5 w-5">
            <path d="M3 8h4l2-2h6l2 2h4a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" />
            <circle cx="12" cy="13" r="3.5" />
          </svg>
        </button>
      }
    </div>
    @if (cameraActive()) {
      <div class="mt-3 overflow-hidden rounded-xl border border-white/10 bg-deep-slate">
        <video #videoRef autoplay playsinline muted class="h-48 w-full object-cover"></video>
        <p class="px-3 py-2 text-center text-xs text-slate-500">Point camera at barcode — scanning automatically</p>
      </div>
    }
    @if (error()) {
      <p class="mt-2 text-xs text-red-300" role="alert">{{ error() }}</p>
    }
    @if (lastFound(); as product) {
      <p class="mt-2 text-xs text-emerald-300">Found: {{ product.name }} ({{ product.sku }}) — {{ product.barcode ?? 'no barcode' }} · {{ product.location ?? 'no location' }}</p>
    }
  `,
})
export class BarcodeScannerComponent implements OnDestroy {
  private readonly productsService = inject(ProductsService);

  ngOnDestroy(): void {
    this.stopCamera();
  }

  placeholder = input<string>('Scan barcode or enter SKU…');
  productFound = output<Product>();
  scanFailed = output<string>();

  protected readonly scanValue = signal('');
  protected readonly scanning = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly lastFound = signal<Product | null>(null);
  protected readonly cameraActive = signal(false);

  protected readonly supportsCamera = computed(() => {
    try {
      return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && 'BarcodeDetector' in window;
    } catch {
      return false;
    }
  });

  private stream: MediaStream | null = null;
  private detector: any = null;
  private rafId: number | null = null;

  protected onInput(event: Event): void {
    this.scanValue.set((event.target as HTMLInputElement).value);
    this.error.set(null);
    // Auto-lookup if looks like barcode (length > 7) typed rapidly - scanners send quickly + we detect on input debounce
    // For now manual enter or button
  }

  protected onEnter(): void {
    this.lookup();
  }

  protected lookup(): void {
    const code = this.scanValue().trim();
    if (!code) return;
    this.scanning.set(true);
    this.error.set(null);
    this.productsService.lookupByBarcode(code).subscribe({
      next: ({ product }) => {
        this.scanning.set(false);
        this.lastFound.set(product);
        this.productFound.emit(product);
        this.error.set(null);
      },
      error: () => {
        // fallback: try local filter - maybe SKU/barcode substring match
        // emit failure
        this.scanning.set(false);
        this.lastFound.set(null);
        const msg = `No product found for "${code}"`;
        this.error.set(msg);
        this.scanFailed.emit(code);
      },
    });
  }

  protected toggleCamera(): void {
    if (this.cameraActive()) {
      this.stopCamera();
    } else {
      this.startCamera();
    }
  }

  private async startCamera(): Promise<void> {
    this.error.set(null);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const BD: any = (window as any).BarcodeDetector;
      if (!BD) {
        this.error.set('Camera barcode detection not supported in this browser. Use the input field — scanners work as keyboard input.');
        return;
      }
      this.detector = new BD({ formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'qr_code', 'upc_a', 'upc_e'] });
      this.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      this.cameraActive.set(true);
      // Wait next tick for video element
      setTimeout(() => {
        const video = document.querySelector('app-barcode-scanner video') as HTMLVideoElement | null;
        if (video && this.stream) {
          video.srcObject = this.stream;
          video.onloadedmetadata = () => this.scanLoop(video);
        }
      }, 100);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Camera unavailable';
      this.error.set(msg);
      this.cameraActive.set(false);
    }
  }

  private stopCamera(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
    this.cameraActive.set(false);
  }

  private async scanLoop(video: HTMLVideoElement): Promise<void> {
    if (!this.cameraActive() || !this.detector) return;
    try {
      const codes = await this.detector.detect(video);
      if (codes && codes.length > 0) {
        const raw = codes[0].rawValue as string;
        if (raw) {
          this.scanValue.set(raw);
          this.stopCamera();
          this.lookup();
          return;
        }
      }
    } catch {
      // ignore
    }
    this.rafId = requestAnimationFrame(() => this.scanLoop(video));
  }
}
