export interface ApiResponse<T> {
    exito: boolean;
    mensaje: string;
    data: ApiData<T>;
}

export interface ApiData<T> {
    items: T[];
    totalCount: number;
    pageNumber: number;
    pageSize: number;
}
  