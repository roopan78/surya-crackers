import { Component, computed, inject, output, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  LucideAngularModule,
  X,
  FileSpreadsheet,
  Upload,
  Download,
  Info,
  TriangleAlert,
  CircleCheck,
  LoaderCircle,
} from 'lucide-angular';
import { AdminCatalogService } from '../../../../core/services/admin-catalog.service';
import { ProductImportPreview, ProductImportResult } from '../../../../core/models';

type ImportStep = 'upload' | 'preview' | 'importing' | 'result';

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB
const EXCEL_EXTENSIONS = /\.(xlsx|xls)$/i;

const PROGRESS_STAGES = [
  'Uploading Excel…',
  'Reading Workbook…',
  'Creating Categories…',
  'Creating Products…',
  'Updating Products…',
  'Finalizing Import…',
];

@Component({
  selector: 'app-product-import-modal',
  standalone: true,
  imports: [LucideAngularModule, DecimalPipe],
  templateUrl: './product-import-modal.html',
})
export class ProductImportModal {
  private readonly adminCatalogService = inject(AdminCatalogService);

  readonly closed = output<void>();
  readonly completed = output<ProductImportResult>();

  readonly XIcon = X;
  readonly FileSpreadsheetIcon = FileSpreadsheet;
  readonly UploadIcon = Upload;
  readonly DownloadIcon = Download;
  readonly InfoIcon = Info;
  readonly TriangleAlertIcon = TriangleAlert;
  readonly CircleCheckIcon = CircleCheck;
  readonly LoaderCircleIcon = LoaderCircle;

  readonly step = signal<ImportStep>('upload');
  readonly file = signal<File | null>(null);
  readonly dragging = signal(false);
  readonly fileError = signal<string | null>(null);
  readonly requestError = signal<string | null>(null);
  readonly previewing = signal(false);
  readonly preview = signal<ProductImportPreview | null>(null);
  readonly result = signal<ProductImportResult | null>(null);
  readonly progressIndex = signal(0);

  private progressTimer: ReturnType<typeof setInterval> | null = null;

  readonly progressStages = PROGRESS_STAGES;

  readonly fileSizeLabel = computed(() => {
    const size = this.file()?.size ?? 0;
    return size >= 1024 * 1024 ? `${(size / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(size / 1024))} KB`;
  });

  /** Import is only offered when the preview found at least one valid product. */
  readonly canConfirmImport = computed(() => (this.preview()?.validRows ?? 0) > 0);

  /** Closing is blocked while the import transaction is running. */
  readonly canClose = computed(() => this.step() !== 'importing');

  // ---------- File selection ----------

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(true);
  }

  onDragLeave(): void {
    this.dragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
    const dropped = event.dataTransfer?.files?.[0];
    if (dropped) {
      this.setFile(dropped);
    }
  }

  onFileInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const selected = input.files?.[0];
    if (selected) {
      this.setFile(selected);
    }
    input.value = ''; // allow re-selecting the same file
  }

  removeFile(): void {
    this.file.set(null);
    this.fileError.set(null);
  }

  private setFile(file: File): void {
    if (!EXCEL_EXTENSIONS.test(file.name)) {
      this.fileError.set('Only Excel files (.xlsx or .xls) are accepted.');
      return;
    }
    if (file.size === 0) {
      this.fileError.set('This file is empty.');
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      this.fileError.set('The file exceeds the 5 MB upload limit.');
      return;
    }
    this.fileError.set(null);
    this.requestError.set(null);
    this.file.set(file);
  }

  // ---------- Template ----------

  downloadTemplate(): void {
    this.adminCatalogService.downloadImportTemplate().subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = 'product-import-template.xlsx';
        anchor.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.requestError.set('Could not download the template — please try again.'),
    });
  }

  // ---------- Step transitions ----------

  runPreview(): void {
    const file = this.file();
    if (!file || this.previewing()) {
      return;
    }
    this.previewing.set(true);
    this.requestError.set(null);

    this.adminCatalogService.previewProductImport(file).subscribe({
      next: (preview) => {
        this.previewing.set(false);
        this.preview.set(preview);
        this.step.set('preview');
      },
      error: (error: unknown) => {
        this.previewing.set(false);
        this.requestError.set(this.messageFrom(error, 'Could not analyze this file — please try again.'));
      },
    });
  }

  backToUpload(): void {
    this.step.set('upload');
    this.preview.set(null);
    this.requestError.set(null);
  }

  confirmImport(): void {
    const file = this.file();
    if (!file || !this.canConfirmImport()) {
      return;
    }
    this.step.set('importing');
    this.requestError.set(null);
    this.startProgressTicker();

    this.adminCatalogService.importProducts(file).subscribe({
      next: (result) => {
        this.stopProgressTicker();
        this.result.set(result);
        this.step.set('result');
        this.completed.emit(result);
      },
      error: (error: unknown) => {
        this.stopProgressTicker();
        this.step.set('preview');
        this.requestError.set(this.messageFrom(error, 'Import failed — nothing was written. Please try again.'));
      },
    });
  }

  importAnotherFile(): void {
    this.stopProgressTicker();
    this.step.set('upload');
    this.file.set(null);
    this.preview.set(null);
    this.result.set(null);
    this.fileError.set(null);
    this.requestError.set(null);
  }

  close(): void {
    if (!this.canClose()) {
      return;
    }
    this.stopProgressTicker();
    this.closed.emit();
  }

  // ---------- Helpers ----------

  private startProgressTicker(): void {
    this.progressIndex.set(0);
    this.progressTimer = setInterval(() => {
      this.progressIndex.update((index) => Math.min(index + 1, PROGRESS_STAGES.length - 1));
    }, 1200);
  }

  private stopProgressTicker(): void {
    if (this.progressTimer !== null) {
      clearInterval(this.progressTimer);
      this.progressTimer = null;
    }
  }

  private messageFrom(error: unknown, fallback: string): string {
    return error instanceof HttpErrorResponse && typeof error.error?.message === 'string'
      ? error.error.message
      : fallback;
  }
}
