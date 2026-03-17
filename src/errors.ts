/**
 * Custom errors for clearer handling and exit codes.
 */

export class ModelLoadError extends Error {
  readonly code = 'MODEL_LOAD_FAILED';

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'ModelLoadError';
    if (cause instanceof Error && cause.stack) {
      this.stack = `${this.stack}\nCaused by: ${cause.stack}`;
    }
  }
}
