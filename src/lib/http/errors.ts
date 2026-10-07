export type FieldErrors = Record<string, string[]>;

interface ApiErrorOptions {
  fields?: FieldErrors;
  headers?: Record<string, string>;
}

export class ApiError extends Error {
  readonly status: number;
  readonly fields?: FieldErrors;
  readonly headers?: Record<string, string>;

  constructor(status: number, message: string, options: ApiErrorOptions = {}) {
    super(message);
    this.status = status;
    this.fields = options.fields;
    this.headers = options.headers;
  }
}

export const badRequest = (message = "Invalid request.", fields?: FieldErrors) =>
  new ApiError(400, message, { fields });

export const unauthorized = (message = "Sign in to continue.") => new ApiError(401, message);

export const forbidden = (message = "You don't have permission to do that.") => new ApiError(403, message);

export const notFound = (message = "Not found.") => new ApiError(404, message);

export const conflict = (message: string, fields?: FieldErrors) => new ApiError(409, message, { fields });

export const payloadTooLarge = () => new ApiError(413, "The request body is too large.");

export const tooManyRequests = (retryAfterSeconds: number) =>
  new ApiError(429, "Too many attempts. Try again later.", {
    headers: { "Retry-After": String(retryAfterSeconds) },
  });
