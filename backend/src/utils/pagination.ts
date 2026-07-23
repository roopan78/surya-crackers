export interface PaginationParams {
  page: number;
  limit: number;
}

export function toPaginationMeta(params: PaginationParams, totalItems: number) {
  return {
    page: params.page,
    limit: params.limit,
    totalItems,
    totalPages: Math.max(1, Math.ceil(totalItems / params.limit)),
  };
}

export function toSkipTake(params: PaginationParams) {
  return {
    skip: (params.page - 1) * params.limit,
    take: params.limit,
  };
}
