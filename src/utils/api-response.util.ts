export class ApiResponse<T> {
  constructor(
    public status: number,
    public message: string,
    public data?: T,
  ) {}
}

export function success<T>(data: T, message = 'Success'): ApiResponse<T> {
  return new ApiResponse<T>(200, message, data);
}

export function error<T>(message = 'Error', status = 400): ApiResponse<T> {
  return new ApiResponse<T>(status, message);
}
