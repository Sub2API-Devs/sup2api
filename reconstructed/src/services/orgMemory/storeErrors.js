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
import { o } from "../../../vendor/zod/v4/classic/schemas.js";
import { MEMORY_ID_PATTERN } from "../../utils/taggedId.js";

//@ chunk-82kqcve8.js:37477-37518 placement
var WEn = DoctorLazy(() => o().regex(MEMORY_ID_PATTERN)),
  EAt = 102400;
//@ chunk-82kqcve8.js:37518-37799 placement
class MemoryConflictError extends Error {
  path;
  expected;
  actual;
  existingId;
  conflictingPath;
  constructor(e, n, r, s, h) {
    super(`conflict on ${e}: expected ${n ?? "<none>"}, actual ${r ?? "<unknown>"}`);
    this.path = e;
    this.expected = n;
    this.actual = r;
    this.existingId = s;
    this.conflictingPath = h;
    this.name = "ConflictError";
  }
}
//@ chunk-82kqcve8.js:37799-37936 placement
class MemoryNotFoundError extends Error {
  path;
  kind;
  constructor(e, n = "document") {
    super(`not found: ${e}`);
    this.path = e;
    this.kind = n;
    this.name = "NotFoundError";
  }
}
//@ chunk-82kqcve8.js:37936-38069 placement
class MemoryUnavailableError extends Error {
  cause;
  retryAfterMs;
  constructor(e, n, r) {
    super(e);
    this.cause = n;
    this.retryAfterMs = r;
    this.name = "UnavailableError";
  }
}
//@ chunk-82kqcve8.js:38069-38092 placement
var zir = ".memory-sync";
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
  WEn,
  MemoryNotFoundError,
  MemoryConflictError,
  EAt,
  zir,
};
