export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code = "request_failed"
  ) {
    super(message);
  }
}

export const unauthorized = () => new HttpError(401, "Authentication required.", "unauthorized");
export const forbidden = () => new HttpError(403, "You do not have permission to perform this action.", "forbidden");
export const notFound = (name = "Resource") => new HttpError(404, `${name} was not found.`, "not_found");
