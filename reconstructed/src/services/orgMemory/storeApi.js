/**
 * services/orgMemory/storeApi.ts
 *
 * 记忆库 HTTP 客户端（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-82kqcve8.js (14)
 * attribution: placement 14
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { looseObject, string, E, array, unknown } from "../../../vendor/zod/v4/classic/schemas.js";
import {
  memoryIdSchema,
  MemoryUnavailableError,
  MemoryPermanentError,
  MemoryNotFoundError,
  MemoryConflictError,
} from "./storeErrors.js";
import { memoryApiTarget } from "../../utils/teleport/api.js";
import { getSessionIngressAuthToken } from "../../utils/sessionIngressAuth.js";
import { AbortError } from "../../utils/errors.js";
import { apiClient } from "../routines/routinesApi.js";
import { logForDebugging } from "../../utils/debug.js";

//@ chunk-82kqcve8.js:64788-64930 placement
function parseContextStopHeader(headers) {
  let n = headers?.["x-memory-context-stop"];
  let r = typeof n === "string" ? n.trim().toLowerCase() : "";
  return r === "org" || r === "credential" ? r : undefined;
}
//@ chunk-82kqcve8.js:64930-65145 placement = getRetryAfter (0.889)
/**
 * 从普通头对象解析 retry-after（秒或 HTTP 日期）为毫秒，非正数忽略，上限 1 小时。旧版名 getRetryAfter 为同名族错配（另一个 getRetryAfter 是 #GQe）。疑似归错文件（chunk-82kqcve8 属其他 HTTP 客户端）。
 */
function parseRetryAfterHeaderMs(error) {
  let n = error["retry-after"];
  if (typeof n !== "string" || n.trim() === "") return;
  let resetUnixSec = Number(n);
  let s = Number.isFinite(resetUnixSec) ? resetUnixSec * 1000 : Date.parse(n) - Date.now();
  if (!Number.isFinite(s) || s <= 0) return;
  return Math.min(s, 3600000);
}
//@ chunk-82kqcve8.js:65145-65180 placement
/**
 * retry-after 毫秒，缺省 60 秒。
 */
function getRetryAfterMsOrDefault(error) {
  return parseRetryAfterHeaderMs(error) ?? 60000;
}
//@ chunk-82kqcve8.js:65180-65733 placement
/**
 * 记忆库 HTTP API 的超时、分页与上限，路径，以及条目、列表页、带内容条目与错误体的 schema。
 */
var STORE_API_TIMEOUT_MS = 30000;
var LIST_PAGE_SIZE = 100;
var MAX_STORE_ENTRIES = 200000;
var MEMORIES_PATH = "/memories";
var MEMORIES_EXPORT_PATH = "/memories/export";
var memoryEntrySchema = DoctorLazy(() =>
  looseObject({
    id: memoryIdSchema(),
    path: string(),
    content_sha256: string(),
    content_size_bytes: E().int().nonnegative().optional(),
    size_bytes: E().int().nonnegative().optional(),
    updated_at: string().optional().catch(undefined),
  }),
);
var memoryListPageSchema = DoctorLazy(() =>
  looseObject({
    data: array(
      looseObject({
        type: string(),
      }),
    ),
    prefixes: array(unknown()).nullish().catch(undefined),
    next_page: string().nullish(),
  }),
);
var memoryWithContentSchema = DoctorLazy(() =>
  memoryEntrySchema().extend({
    content: string(),
    updated_at: string(),
  }),
);
var memoryMetaSchema = memoryEntrySchema;
var memoryErrorSchema = DoctorLazy(() =>
  looseObject({
    error: looseObject({
      type: string().optional(),
      conflicting_path: string().optional(),
      conflicting_memory_id: memoryIdSchema().optional(),
    }).optional(),
  }),
);
//@ chunk-82kqcve8.js:65733-65805 placement
/**
 * 规范路径前缀（补前导斜杠、合并重复斜杠）。
 */
function normalizePathPrefix(path) {
  return (path.startsWith("/") ? path : "/" + path).replace(/\/{2,}/g, "/");
}
//@ chunk-82kqcve8.js:65805-65953 placement
function buildQueryString(e) {
  let mapped = Object.entries(e).map(
    ([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`,
  );
  return mapped.length ? "?" + mapped.join("&") : "";
}
//@ chunk-82kqcve8.js:65953-66032 placement
/**
 * 判断值是否为异步可迭代（流）。
 */
function isAsyncIterable(e) {
  return typeof e === "object" && e !== null && Symbol.asyncIterator in e;
}
//@ chunk-82kqcve8.js:66032-66138 placement
function destroyStream(e) {
  if (typeof e === "object" && e !== null && "destroy" in e && typeof e.destroy === "function") e.destroy();
}
//@ chunk-82kqcve8.js:66138-67027 placement
/**
 * 表示存储已归档的错误文本前缀。
 */
var MEMORY_STORE_LIMIT_ERRORS = DoctorLazy(() =>
  looseObject({
    message: string().optional(),
    error: looseObject({
      type: string().optional(),
      message: string().optional(),
    }).optional(),
  }),
);
var SERVER_ERROR_TO_REASON = new Map([
  ["memory store has reached its memory limit", "store_full"],
  ["memory store has reached its size limit", "store_full"],
  ["content must be at most 102400 bytes", "content_too_large"],
  ["MEMORY.md content exceeds the prompt-index cap", "index_too_large"],
  ["content rejected by safety check", "content_screened"],
  [
    "memory content appears to contain a credential or API key; remove it before writing. If the credential is real, rotate it.",
    "content_secret",
  ],
  ["path must be at most 1024 bytes", "invalid_path"],
  ["path must be at most 20 segments deep", "invalid_path"],
  ["path must not contain . or .. segments", "invalid_path"],
  ["path must not contain control or format characters", "invalid_path"],
  ["path must be NFC-normalized", "invalid_path"],
]);
var ARCHIVED_PREFIX = "cannot modify archived resource";
//@ chunk-82kqcve8.js:67027-67518 placement
function parseStoreHttpError(status, n, r, headers) {
  if (status === 429 || status >= 500) {
    let O = status === 429 || status === 503 || typeof headers["retry-after"] === "string";
    throw new MemoryUnavailableError(
      `${n}: HTTP ${status}`,
      undefined,
      O ? getRetryAfterMsOrDefault(headers) : undefined,
    );
  }
  let h = MEMORY_STORE_LIMIT_ERRORS().safeParse(r);
  let y = h.success ? h.data : undefined;
  let error = y?.error;
  let message = error?.message ?? y?.message;
  if (status === 400 && error?.type === "invalid_request_error" && message !== undefined) {
    let O =
      SERVER_ERROR_TO_REASON.get(message) ??
      (message.startsWith(ARCHIVED_PREFIX) ? "store_archived" : undefined);
    if (O !== undefined) throw new MemoryPermanentError(O, `${n}: HTTP 400 (${message})`);
  }
  let R = message !== undefined ? ` (${message})` : "";
  throw new MemoryPermanentError(`http_${status}`, `${n}: HTTP ${status}${R}`);
}
//@ chunk-82kqcve8.js:67518-67707 placement
function getStopError(e, n) {
  if (e.status !== 204 && e.status !== 401 && e.status !== 403) return;
  let contextStopHeader = parseContextStopHeader(e.response.headers);
  return contextStopHeader === undefined
    ? undefined
    : new MemoryPermanentError(
        `stopped_${contextStopHeader}`,
        `${n}: HTTP ${e.status} (stop: ${contextStopHeader})`,
      );
}
//@ chunk-82kqcve8.js:67707-67827 placement = isPermanentFailure (0.566)
function throwForSkippedRequest(e, n) {
  if (e.reason === "no-auth") throw new MemoryPermanentError("no_oauth", `${n}: ${e.detail}`);
  throw new MemoryUnavailableError(`${n}: ${e.reason}`);
}
//@ chunk-82kqcve8.js:67827-74424 placement
/**
 * 记忆库 HTTP 客户端（/memories、/memories/export，session-jwt 认证）
 */
class MemoryStoreClient {
  mode;
  label;
  partitionId;
  listBase;
  exportBase;
  reqOpts;
  credentialProvider;
  knownIds;
  constructor(e, credentialProvider, knownIds) {
    this.mode = e.mode;
    this.label = e.mount;
    this.credentialProvider = credentialProvider;
    this.knownIds = knownIds;
    let replaced = e.path.replace(/\/+$/, "");
    this.partitionId = replaced;
    this.listBase = replaced + MEMORIES_PATH;
    this.exportBase = replaced + MEMORIES_EXPORT_PATH;
    let h = memoryApiTarget();
    this.reqOpts = {
      host: "memory",
      timeout: STORE_API_TIMEOUT_MS,
      validateStatus: () => true,
      auth: h.auth === "none" ? "none" : getSessionIngressAuthToken() ? "session-jwt" : undefined,
      refreshOAuth: h.refreshOAuth,
    };
  }
  async send(e, n) {
    let r = n
      ? {
          ...this.reqOpts,
          signal: n,
        }
      : this.reqOpts;
    if (!this.credentialProvider) return e(r);
    let s = {
      ...r,
      auth: "none",
      headers: {
        Authorization: await this.credentialProvider.getAuthorization(),
      },
    };
    let h = await e(s);
    if (!h.ok || h.status !== 401) return h;
    if (isAsyncIterable(h.data)) destroyStream(h.data);
    return e({
      ...s,
      headers: {
        Authorization: await this.credentialProvider.getAuthorization({
          forceRefresh: true,
          failedAuthorization: s.headers.Authorization,
        }),
      },
    });
  }
  entryPath(e) {
    return `${this.listBase}/${encodeURIComponent(e)}`;
  }
  assertWritable(e) {
    if (this.mode === "ro")
      throw new MemoryPermanentError(
        "not_writable",
        `MemoryServiceBackend[${this.label}]: ${e} refused on read-only mount`,
      );
  }
  async list(e, n) {
    let r = [];
    let s = 0;
    let h;
    for (let idx = 0; ; idx++) {
      if (n?.signal?.aborted) throw new AbortError();
      let w = {
        limit: LIST_PAGE_SIZE,
      };
      if (e !== undefined) w.path_prefix = normalizePathPrefix(e);
      if (n?.depthOne) {
        w.depth = 1;
        w.order_by = "path";
        w.order = "asc";
      }
      if (h) w.page = h;
      let S = await this.send((j) => apiClient.get(`${this.listBase}${buildQueryString(w)}`, j), n?.signal);
      if (!S.ok) throwForSkippedRequest(S, `list ${this.label}`);
      let stopError = getStopError(S, `list ${this.label}`);
      if (stopError !== undefined) throw stopError;
      if (S.status === 404) {
        if (h === undefined) {
          logForDebugging(`memory-backend[${this.label}]: list 404 (store not provisioned)`, {
            level: "debug",
          });
          throw new MemoryNotFoundError(this.label, "store");
        }
        throw new MemoryUnavailableError(
          `list ${this.label}: 404 on page ${idx} (cursor expired or store deleted mid-walk)`,
        );
      }
      if (S.status >= 400) parseStoreHttpError(S.status, `list ${this.label}`, S.data, S.response.headers);
      let O = memoryListPageSchema().safeParse(S.data);
      if (!O.success)
        throw new MemoryPermanentError(
          "malformed_response",
          `list ${this.label}: malformed response: ${O.error.message}`,
        );
      for (let j of O.data.data) {
        if (j.type !== "memory" && j.type !== "memory_metadata") continue;
        let G = memoryEntrySchema().safeParse(j);
        if (!G.success)
          throw new MemoryPermanentError(
            "malformed_response",
            `list ${this.label}: malformed memory item: ${G.error.message}`,
          );
        let Z = normalizePathPrefix(G.data.path);
        r.push({
          id: G.data.id,
          path: Z,
          sha256: G.data.content_sha256,
          sizeBytes: G.data.content_size_bytes ?? G.data.size_bytes,
          updatedAt: G.data.updated_at,
        });
        if (Z === n?.stopAtPath) return r;
      }
      let P = O.data.data.length + (O.data.prefixes?.length ?? 0);
      s += P;
      let nextPage = O.data.next_page ?? undefined;
      if (!nextPage) break;
      if (nextPage === h)
        throw new MemoryPermanentError(
          "list_page_limit",
          `list ${this.label}: next_page cursor did not advance after ${s} entries`,
        );
      if (P === 0)
        throw new MemoryPermanentError(
          "list_page_limit",
          `list ${this.label}: page carried a next_page cursor but no countable rows after ${s} entries`,
        );
      if (s > MAX_STORE_ENTRIES)
        throw new MemoryPermanentError(
          "list_page_limit",
          `list ${this.label}: exceeded ${MAX_STORE_ENTRIES} entries (runaway cursor?)`,
        );
      h = nextPage;
    }
    return r;
  }
  async readByPath(e, n) {
    let r = normalizePathPrefix(e);
    let s = `${this.partitionId} ${r}`;
    let h = this.knownIds?.get(s);
    if (h !== undefined) {
      let O = false;
      try {
        let P = await this.readWithPath(h, n);
        O = P.path === r;
        if (O) return P.content;
      } catch (error) {
        if (!(error instanceof MemoryNotFoundError)) throw error;
      } finally {
        if (!O && this.knownIds?.get(s) === h) this.knownIds?.delete(s);
      }
      logForDebugging(
        `memory-backend[${this.label}]: id ${h} no longer returns ${r}; looking the file up by path`,
        {
          level: "debug",
        },
      );
    }
    let sliced = r.slice(0, r.lastIndexOf("/") + 1);
    let w;
    try {
      w = await this.list(sliced, {
        depthOne: true,
        signal: n?.signal,
        stopAtPath: r,
      });
    } catch (error) {
      if (error instanceof MemoryNotFoundError) return null;
      throw error;
    }
    let found = w.find((O) => O.path === r);
    if (!found) return null;
    let R = await this.readWithPath(found.id, n);
    if (R.path === r) this.knownIds?.set(s, found.id);
    return R.content;
  }
  async exportAll(e) {
    return this.openExport(`export ${this.label}`, this.exportBase, e?.signal);
  }
  async exportMetadata(e) {
    return this.openExport(`export-metadata ${this.label}`, `${this.exportBase}?view=basic`, e?.signal);
  }
  async openExport(e, n, r) {
    if (r?.aborted) throw new AbortError();
    let s = await this.send(
      (S) =>
        apiClient.get(n, {
          ...S,
          responseType: "stream",
        }),
      r,
    );
    if (!s.ok) throwForSkippedRequest(s, e);
    let stopError = getStopError(s, e);
    if (stopError !== undefined || s.status >= 400) {
      destroyStream(s.data);
      if (stopError !== undefined) throw stopError;
      if (s.status === 404) throw new MemoryNotFoundError(this.label, "store");
      parseStoreHttpError(s.status, e, undefined, s.response.headers);
    }
    if (!isAsyncIterable(s.data))
      throw new MemoryPermanentError("malformed_response", `${e}: response is not a stream`);
    let y = s.data;
    if (r?.aborted) {
      destroyStream(y);
      throw new AbortError();
    }
    let w = () => destroyStream(y);
    r?.addEventListener("abort", w, {
      once: true,
    });
    return {
      stream: y,
      destroy: () => {
        r?.removeEventListener("abort", w);
        destroyStream(y);
      },
    };
  }
  async read(e, n) {
    return (await this.readWithPath(e, n)).content;
  }
  async readWithPath(e, n) {
    if (n?.signal?.aborted) throw new AbortError();
    let r = `read ${this.label}:${e}`;
    let s = await this.send((w) => apiClient.get(this.entryPath(e), w), n?.signal);
    if (!s.ok) throwForSkippedRequest(s, r);
    let stopError = getStopError(s, r);
    if (stopError !== undefined) throw stopError;
    if (s.status === 404) throw new MemoryNotFoundError(e);
    if (s.status >= 400) parseStoreHttpError(s.status, r, s.data, s.response.headers);
    let y = memoryWithContentSchema().safeParse(s.data);
    if (!y.success)
      throw new MemoryPermanentError("malformed_response", `${r}: malformed response: ${y.error.message}`);
    return {
      path: normalizePathPrefix(y.data.path),
      content: {
        content: y.data.content,
        sha256: y.data.content_sha256,
        updatedAt: y.data.updated_at,
      },
    };
  }
  async create(e, content, r) {
    this.assertWritable("create");
    let s = normalizePathPrefix(e);
    let h = `create ${this.label}:${s}`;
    let y =
      r?.precondition === "not_exists"
        ? {
            path: s,
            content,
            precondition: {
              type: "not_exists",
            },
          }
        : {
            path: s,
            content,
          };
    let w = await this.send((R) => apiClient.post(this.listBase, y, R), r?.signal);
    if (!w.ok) throwForSkippedRequest(w, h);
    if (w.status === 409) {
      let R = memoryErrorSchema().safeParse(w.data);
      let error = R.success ? R.data.error : undefined;
      let conflictingMemoryId =
        error?.conflicting_memory_id &&
        error.conflicting_path !== undefined &&
        normalizePathPrefix(error.conflicting_path) === s
          ? error.conflicting_memory_id
          : undefined;
      throw new MemoryConflictError(
        s,
        null,
        undefined,
        conflictingMemoryId,
        error?.conflicting_path === undefined ? undefined : normalizePathPrefix(error.conflicting_path),
      );
    }
    if (w.status >= 400) parseStoreHttpError(w.status, h, w.data, w.response.headers);
    let S = memoryMetaSchema().safeParse(w.data);
    if (!S.success)
      throw new MemoryPermanentError("malformed_response", `${h}: malformed response: ${S.error.message}`);
    return {
      id: S.data.id,
      sha256: S.data.content_sha256,
    };
  }
  async update(e, content, r, s) {
    this.assertWritable("update");
    let h = `update ${this.label}:${e}`;
    let y = {
      content,
    };
    if (r !== null)
      y.precondition = {
        type: "content_sha256",
        content_sha256: r,
      };
    let w = await this.send((R) => apiClient.post(this.entryPath(e), y, R), s?.signal);
    if (!w.ok) throwForSkippedRequest(w, h);
    if (w.status === 404) throw new MemoryNotFoundError(e);
    if (w.status === 409) throw new MemoryConflictError(e, r, undefined);
    if (w.status >= 400) parseStoreHttpError(w.status, h, w.data, w.response.headers);
    let S = memoryMetaSchema().safeParse(w.data);
    if (!S.success)
      throw new MemoryPermanentError("malformed_response", `${h}: malformed response: ${S.error.message}`);
    return {
      id: S.data.id,
      sha256: S.data.content_sha256,
    };
  }
  async delete(e, n) {
    this.assertWritable("delete");
    let r = `delete ${this.label}:${e}`;
    let s = {};
    if (n !== null) s.expected_content_sha256 = n;
    let h = await this.send((y) =>
      apiClient.delete(`${this.entryPath(e)}${buildQueryString(s)}`, undefined, y),
    );
    if (!h.ok) throwForSkippedRequest(h, r);
    if (h.status === 404) {
      if (n !== null) throw new MemoryNotFoundError(e);
      return;
    }
    if (h.status === 409) throw new MemoryConflictError(e, n, undefined);
    if (h.status >= 400) parseStoreHttpError(h.status, r, h.data, h.response.headers);
  }
}
//@ chunk-82kqcve8.js:74424-74473 placement
/**
 * 批量创建记忆库客户端。
 */
function createStoreClients(e, credentialProvider) {
  return e.map((r) => new MemoryStoreClient(r, credentialProvider));
}
export { MemoryStoreClient, normalizePathPrefix, MAX_STORE_ENTRIES, createStoreClients };
