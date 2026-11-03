/**
 * services/orgMemory/storeErrors.ts
 *
 * 记忆库错误类（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-82kqcve8.js (6)
 * attribution: placement 6
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { string } from "../../../vendor/zod/v4/classic/schemas.js";
import { MEMORY_ID_PATTERN } from "../../utils/taggedId.js";

//@ chunk-82kqcve8.js:37477-37518 placement
/**
 * 单个记忆内容的字节上限（102400）。
 */
var memoryIdSchema = DoctorLazy(() => string().regex(MEMORY_ID_PATTERN));
var MAX_CONTENT_BYTES = 102400;
//@ chunk-82kqcve8.js:37518-37799 placement
class MemoryConflictError extends Error {
  path;
  expected;
  actual;
  existingId;
  conflictingPath;
  constructor(e, n, r, existingId, conflictingPath) {
    super(`conflict on ${e}: expected ${n ?? "<none>"}, actual ${r ?? "<unknown>"}`);
    this.path = e;
    this.expected = n;
    this.actual = r;
    this.existingId = existingId;
    this.conflictingPath = conflictingPath;
    this.name = "ConflictError";
  }
}
//@ chunk-82kqcve8.js:37799-37936 placement
class MemoryNotFoundError extends Error {
  path;
  kind;
  constructor(e, kind = "document") {
    super(`not found: ${e}`);
    this.path = e;
    this.kind = kind;
    this.name = "NotFoundError";
  }
}
//@ chunk-82kqcve8.js:37936-38069 placement
class MemoryUnavailableError extends Error {
  cause;
  retryAfterMs;
  constructor(message, cause, retryAfterMs) {
    super(message);
    this.cause = cause;
    this.retryAfterMs = retryAfterMs;
    this.name = "UnavailableError";
  }
}
//@ chunk-82kqcve8.js:38069-38092 placement
/**
 * 记忆同步状态目录名 .memory-sync。
 */
var MEMORY_SYNC_DIR = ".memory-sync";
//@ chunk-82kqcve8.js:38092-38209 placement
class MemoryPermanentError extends Error {
  reason;
  constructor(e, n) {
    super(n ?? `permanent: ${e}`);
    this.reason = e;
    this.name = "PermanentError";
  }
}
export {
  MemoryPermanentError,
  MemoryUnavailableError,
  memoryIdSchema,
  MemoryNotFoundError,
  MemoryConflictError,
  MAX_CONTENT_BYTES,
  MEMORY_SYNC_DIR,
};
