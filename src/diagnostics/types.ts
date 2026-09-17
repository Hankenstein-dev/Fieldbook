export interface DiagnosticEvent {
  id: string;
  session: string;
  at: string;
  level: 'info' | 'warn' | 'error';
  event: string;
  details: Record<string, unknown>;
  sent?: number;
}
export interface DiagnosticPhoto {
  id: string;
  session: string;
  at: string;
  filename: string;
  photo: Blob;
  sent: number;
}
export function errorDetails(error: unknown) {
  return error instanceof Error
    ? {
        name: error.name,
        message: error.message,
        stack: error.stack?.slice(0, 4000),
        cause: error.cause,
      }
    : { message: String(error).slice(0, 4000) };
}
