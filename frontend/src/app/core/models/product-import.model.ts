export type ImportRowStatus = 'CREATE' | 'UPDATE' | 'SKIPPED';

export interface ImportRowReport {
  row: number;
  sku: string;
  productName: string;
  status: ImportRowStatus;
  reason: string;
}

/** POST /admin/products/import/preview — analysis only, nothing written. */
export interface ProductImportPreview {
  totalRows: number;
  validRows: number;
  rowsToCreate: number;
  rowsToUpdate: number;
  categoriesToCreate: number;
  skippedRows: number;
  errors: ImportRowReport[];
}

/** POST /admin/products/import — the committed result. */
export interface ProductImportResult {
  totalRows: number;
  processedRows: number;
  createdCategories: number;
  createdProducts: number;
  updatedProducts: number;
  skippedRows: number;
  errors: ImportRowReport[];
}
