export interface ToolResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: ToolError;
  meta: {
    toolVersion: '1';
    latencyMs?: number;
  };
}

export interface ToolError {
  code: ErrorCode;
  message: string;
  detail?: Record<string, unknown>;
}

export type ErrorCode =
  | 'PERSON_NOT_FOUND'
  | 'RELATIONSHIP_NOT_FOUND'
  | 'DUPLICATE_RELATIONSHIP'
  | 'INVALID_RELATIONSHIP_TYPE'
  | 'UNAUTHORIZED'
  | 'TOKEN_EXPIRED'
  | 'TOKEN_INVALID'
  | 'TOKEN_ALREADY_USED'
  | 'MAX_DEPTH_EXCEEDED'
  | 'NO_PATH_FOUND'
  | 'AMBIGUOUS_REFERENCE'
  | 'VALIDATION_ERROR'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR';

export function okToolResponse<T>(
  data: T,
  latencyMs?: number,
): ToolResponse<T> {
  return {
    ok: true,
    data,
    meta: {
      toolVersion: '1',
      ...(latencyMs === undefined ? {} : { latencyMs }),
    },
  };
}

export function errorToolResponse(
  code: ErrorCode,
  message: string,
  detail?: Record<string, unknown>,
  latencyMs?: number,
): ToolResponse<never> {
  return {
    ok: false,
    error: {
      code,
      message,
      ...(detail ? { detail } : {}),
    },
    meta: {
      toolVersion: '1',
      ...(latencyMs === undefined ? {} : { latencyMs }),
    },
  };
}

export function toolResponseText(response: ToolResponse): string {
  return JSON.stringify(response, null, 2);
}