/**
 * services/orgMemory/storeErrors.ts
 *
 * 记忆库错误类（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-a2q0x549.js (6)
 * attribution: placement 6
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { stringSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { MEMORY_ID_PATTERN } from "../../utils/taggedId.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-a2q0x549.js:38643-38684 placement
/**
 * 单个记忆内容的字节上限（102400）。
 */
var memoryIdSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var MAX_CONTENT_BYTES;
deferInit("chunk-a2q0x549.js:38643", () => {
  memoryIdSchema = DoctorLazy(() => stringSchema().regex(MEMORY_ID_PATTERN));
  MAX_CONTENT_BYTES = 102400;
});
//@ chunk-a2q0x549.js:38684-38965 placement
class MemoryConflictError extends Error {
  path;
  expected;
  actual;
  existingId;
  conflictingPath;
  constructor(path, expected, actual, existingId, conflictingPath) {
    super(`conflict on ${path}: expected ${expected ?? "<none>"}, actual ${actual ?? "<unknown>"}`);
    this.path = path;
    this.expected = expected;
    this.actual = actual;
    this.existingId = existingId;
    this.conflictingPath = conflictingPath;
    this.name = "ConflictError";
  }
}
//@ chunk-a2q0x549.js:38965-39102 placement
class MemoryNotFoundError extends Error {
  path;
  kind;
  constructor(path, kind = "document") {
    super(`not found: ${path}`);
    this.path = path;
    this.kind = kind;
    this.name = "NotFoundError";
  }
}
//@ chunk-a2q0x549.js:39102-39235 placement
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
//@ chunk-a2q0x549.js:39235-39258 placement
/**
 * 记忆同步状态目录名 .memory-sync。
 */
var MEMORY_SYNC_DIR = ".memory-sync";
//@ chunk-a2q0x549.js:39258-39375 placement
class MemoryPermanentError extends Error {
  reason;
  constructor(reason, message) {
    super(message ?? `permanent: ${reason}`);
    this.reason = reason;
    this.name = "PermanentError";
  }
}
export {
  memoryIdSchema,
  MAX_CONTENT_BYTES,
  MEMORY_SYNC_DIR,
  MemoryPermanentError,
  MemoryUnavailableError,
  MemoryNotFoundError,
  MemoryConflictError,
};
