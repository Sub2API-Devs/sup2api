/**
 * services/orgMemory/storeApi.ts
 *
 * 记忆库 HTTP 客户端（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-a2q0x549.js (14)
 * attribution: placement 14
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  looseObject,
  stringSchema,
  numberSchema,
  array,
  unknown,
} from "../../../vendor/zod/v4/classic/schemas.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-a2q0x549.js:65953-66095 placement
function parseContextStopHeader(headers) {
  let headerValue = headers?.["x-memory-context-stop"];
  let normalized = typeof headerValue === "string" ? headerValue.trim().toLowerCase() : "";
  return normalized === "org" || normalized === "credential" ? normalized : undefined;
}
//@ chunk-a2q0x549.js:66095-66310 placement (2.1.88 match: getRetryAfter, 1)
/**
 * 从普通头对象解析 retry-after（秒或 HTTP 日期）为毫秒，非正数忽略，上限 1 小时。旧版名 getRetryAfter 为同名族错配（另一个 getRetryAfter 是 #GQe）。疑似归错文件（chunk-82kqcve8 属其他 HTTP 客户端）。
 */
function parseRetryAfterHeaderMs(error) {
  let headerValue = error["retry-after"];
  if (typeof headerValue !== "string" || headerValue.trim() === "") return;
  let resetUnixSec = Number(headerValue);
  let delayMs = Number.isFinite(resetUnixSec) ? resetUnixSec * 1000 : Date.parse(headerValue) - Date.now();
  if (!Number.isFinite(delayMs) || delayMs <= 0) return;
  return Math.min(delayMs, 3600000);
}
//@ chunk-a2q0x549.js:66310-66345 placement
/**
 * retry-after 毫秒，缺省 60 秒。
 */
function getRetryAfterMsOrDefault(error) {
  return parseRetryAfterHeaderMs(error) ?? 60000;
}
//@ chunk-a2q0x549.js:66345-66898 placement
/**
 * 记忆库 HTTP API 的超时、分页与上限，路径，以及条目、列表页、带内容条目与错误体的 schema。
 */
var STORE_API_TIMEOUT_MS; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var LIST_PAGE_SIZE;
var MAX_STORE_ENTRIES;
var MEMORIES_PATH;
var MEMORIES_EXPORT_PATH;
var memoryEntrySchema;
var memoryListPageSchema;
var memoryWithContentSchema;
var memoryMetaSchema;
var memoryErrorSchema;
deferInit("chunk-a2q0x549.js:66345", () => {
  STORE_API_TIMEOUT_MS = 30000;
  LIST_PAGE_SIZE = 100;
  MAX_STORE_ENTRIES = 200000;
  MEMORIES_PATH = "/memories";
  MEMORIES_EXPORT_PATH = "/memories/export";
  memoryEntrySchema = DoctorLazy(() =>
    looseObject({
      id: memoryIdSchema(),
      path: stringSchema(),
      content_sha256: stringSchema(),
      content_size_bytes: numberSchema().int().nonnegative().optional(),
      size_bytes: numberSchema().int().nonnegative().optional(),
      updated_at: stringSchema().optional().catch(undefined),
    }),
  );
  memoryListPageSchema = DoctorLazy(() =>
    looseObject({
      data: array(
        looseObject({
          type: stringSchema(),
        }),
      ),
      prefixes: array(unknown()).nullish().catch(undefined),
      next_page: stringSchema().nullish(),
    }),
  );
  memoryWithContentSchema = DoctorLazy(() =>
    memoryEntrySchema().extend({
      content: stringSchema(),
      updated_at: stringSchema(),
    }),
  );
  memoryMetaSchema = memoryEntrySchema;
  memoryErrorSchema = DoctorLazy(() =>
    looseObject({
      error: looseObject({
        type: stringSchema().optional(),
        conflicting_path: stringSchema().optional(),
        conflicting_memory_id: memoryIdSchema().optional(),
      }).optional(),
    }),
  );
});
//@ chunk-a2q0x549.js:66898-66970 placement
/**
 * 规范路径前缀（补前导斜杠、合并重复斜杠）。
 */
function normalizePathPrefix(path) {
  return (path.startsWith("/") ? path : "/" + path).replace(/\/{2,}/g, "/");
}
//@ chunk-a2q0x549.js:66970-67118 placement
function buildQueryString(query) {
  let mapped = Object.entries(query).map(
    ([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`,
  );
  return mapped.length ? "?" + mapped.join("&") : "";
}
//@ chunk-a2q0x549.js:67118-67197 placement
/**
 * 判断值是否为异步可迭代（流）。
 */
function isAsyncIterable(value) {
  return typeof value === "object" && value !== null && Symbol.asyncIterator in value;
}
//@ chunk-a2q0x549.js:67197-67303 placement
function destroyStream(stream) {
  if (
    typeof stream === "object" &&
    stream !== null &&
    "destroy" in stream &&
    typeof stream.destroy === "function"
  )
    stream.destroy();
}
//@ chunk-a2q0x549.js:67303-68192 placement
/**
 * 表示存储已归档的错误文本前缀。
 */
var MEMORY_STORE_LIMIT_ERRORS; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var SERVER_ERROR_TO_REASON;
var ARCHIVED_PREFIX;
deferInit("chunk-a2q0x549.js:67303", () => {
  MEMORY_STORE_LIMIT_ERRORS = DoctorLazy(() =>
    looseObject({
      message: stringSchema().optional(),
      error: looseObject({
        type: stringSchema().optional(),
        message: stringSchema().optional(),
      }).optional(),
    }),
  );
  SERVER_ERROR_TO_REASON = new Map([
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
  ARCHIVED_PREFIX = "cannot modify archived resource";
});
//@ chunk-a2q0x549.js:68192-68683 placement
function parseStoreHttpError(status, message, body, headers) {
  if (status === 429 || status >= 500) {
    let retryable = status === 429 || status === 503 || typeof headers["retry-after"] === "string";
    throw new MemoryUnavailableError(
      `${message}: HTTP ${status}`,
      undefined,
      retryable ? getRetryAfterMsOrDefault(headers) : undefined,
    );
  }
  let parsed = MEMORY_STORE_LIMIT_ERRORS().safeParse(body);
  let payload = parsed.success ? parsed.data : undefined;
  let error = payload?.error;
  let message_2 = error?.message ?? payload?.message;
  if (status === 400 && error?.type === "invalid_request_error" && message_2 !== undefined) {
    let reason =
      SERVER_ERROR_TO_REASON.get(message_2) ??
      (message_2.startsWith(ARCHIVED_PREFIX) ? "store_archived" : undefined);
    if (reason !== undefined) throw new MemoryPermanentError(reason, `${message}: HTTP 400 (${message_2})`);
  }
  let messageSuffix = message_2 !== undefined ? ` (${message_2})` : "";
  throw new MemoryPermanentError(`http_${status}`, `${message}: HTTP ${status}${messageSuffix}`);
}
//@ chunk-a2q0x549.js:68683-68872 placement
function getStopError(error, what) {
  if (error.status !== 204 && error.status !== 401 && error.status !== 403) return;
  let contextStopHeader = parseContextStopHeader(error.response.headers);
  return contextStopHeader === undefined
    ? undefined
    : new MemoryPermanentError(
        `stopped_${contextStopHeader}`,
        `${what}: HTTP ${error.status} (stop: ${contextStopHeader})`,
      );
}
//@ chunk-a2q0x549.js:68872-68992 placement (2.1.88 match: isPermanentFailure, 0.561)
function throwForSkippedRequest(skip, what) {
  if (skip.reason === "no-auth") throw new MemoryPermanentError("no_oauth", `${what}: ${skip.detail}`);
  throw new MemoryUnavailableError(`${what}: ${skip.reason}`);
}
//@ chunk-a2q0x549.js:68992-75592 placement
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
  constructor(store, credentialProvider, knownIds) {
    this.mode = store.mode;
    this.label = store.mount;
    this.credentialProvider = credentialProvider;
    this.knownIds = knownIds;
    let replaced = store.path.replace(/\/+$/, "");
    this.partitionId = replaced;
    this.listBase = replaced + MEMORIES_PATH;
    this.exportBase = replaced + MEMORIES_EXPORT_PATH;
    let target = memoryApiTarget();
    this.reqOpts = {
      host: "memory",
      timeout: STORE_API_TIMEOUT_MS,
      validateStatus: () => true,
      auth: target.auth === "none" ? "none" : getSessionIngressAuthToken() ? "session-jwt" : undefined,
      refreshOAuth: target.refreshOAuth,
    };
  }
  async send(request, signal) {
    let options = signal
      ? {
          ...this.reqOpts,
          signal,
        }
      : this.reqOpts;
    if (!this.credentialProvider) return request(options);
    let authorized = {
      ...options,
      auth: "none",
      headers: {
        Authorization: await this.credentialProvider.getAuthorization(),
      },
    };
    let response = await request(authorized);
    if (!response.ok || response.status !== 401) return response;
    if (isAsyncIterable(response.data)) destroyStream(response.data);
    return request({
      ...authorized,
      headers: {
        Authorization: await this.credentialProvider.getAuthorization({
          forceRefresh: true,
          failedAuthorization: authorized.headers.Authorization,
        }),
      },
    });
  }
  entryPath(path) {
    return `${this.listBase}/${encodeURIComponent(path)}`;
  }
  assertWritable(operation) {
    if (this.mode === "ro")
      throw new MemoryPermanentError(
        "not_writable",
        `MemoryServiceBackend[${this.label}]: ${operation} refused on read-only mount`,
      );
  }
  async list(prefix, options) {
    let entries = [];
    let seenCount = 0;
    let cursor;
    for (let idx = 0; ; idx++) {
      if (options?.signal?.aborted) throw new AbortError();
      let query = {
        limit: LIST_PAGE_SIZE,
      };
      if (prefix !== undefined) query.path_prefix = normalizePathPrefix(prefix);
      if (options?.depthOne) {
        query.depth = 1;
        query.order_by = "path";
        query.order = "asc";
      }
      if (cursor) query.page = cursor;
      let response = await this.send(
        (options) => apiClient.get(`${this.listBase}${buildQueryString(query)}`, options),
        options?.signal,
      );
      if (!response.ok) throwForSkippedRequest(response, `list ${this.label}`);
      let stopError = getStopError(response, `list ${this.label}`);
      if (stopError !== undefined) throw stopError;
      if (response.status === 404) {
        if (cursor === undefined) {
          logForDebugging(`memory-backend[${this.label}]: list 404 (store not provisioned)`, {
            level: "debug",
          });
          throw new MemoryNotFoundError(this.label, "store");
        }
        throw new MemoryUnavailableError(
          `list ${this.label}: 404 on page ${idx} (cursor expired or store deleted mid-walk)`,
        );
      }
      if (response.status >= 400)
        parseStoreHttpError(response.status, `list ${this.label}`, response.data, response.response.headers);
      let page = memoryListPageSchema().safeParse(response.data);
      if (!page.success)
        throw new MemoryPermanentError(
          "malformed_response",
          `list ${this.label}: malformed response: ${page.error.message}`,
        );
      for (let item of page.data.data) {
        if (item.type !== "memory" && item.type !== "memory_metadata") continue;
        let parsed = memoryEntrySchema().safeParse(item);
        if (!parsed.success)
          throw new MemoryPermanentError(
            "malformed_response",
            `list ${this.label}: malformed memory item: ${parsed.error.message}`,
          );
        let path = normalizePathPrefix(parsed.data.path);
        entries.push({
          id: parsed.data.id,
          path,
          sha256: parsed.data.content_sha256,
          sizeBytes: parsed.data.content_size_bytes ?? parsed.data.size_bytes,
          updatedAt: parsed.data.updated_at,
        });
        if (path === options?.stopAtPath) return entries;
      }
      let pageSize = page.data.data.length + (page.data.prefixes?.length ?? 0);
      seenCount += pageSize;
      let nextPage = page.data.next_page ?? undefined;
      if (!nextPage) break;
      if (nextPage === cursor)
        throw new MemoryPermanentError(
          "list_page_limit",
          `list ${this.label}: next_page cursor did not advance after ${seenCount} entries`,
        );
      if (pageSize === 0)
        throw new MemoryPermanentError(
          "list_page_limit",
          `list ${this.label}: page carried a next_page cursor but no countable rows after ${seenCount} entries`,
        );
      if (seenCount > MAX_STORE_ENTRIES)
        throw new MemoryPermanentError(
          "list_page_limit",
          `list ${this.label}: exceeded ${MAX_STORE_ENTRIES} entries (runaway cursor?)`,
        );
      cursor = nextPage;
    }
    return entries;
  }
  async readByPath(path, options) {
    let normalized = normalizePathPrefix(path);
    let cacheKey = `${this.partitionId} ${normalized}`;
    let knownId = this.knownIds?.get(cacheKey);
    if (knownId !== undefined) {
      let matched = false;
      try {
        let found = await this.readWithPath(knownId, options);
        matched = found.path === normalized;
        if (matched) return found.content;
      } catch (error) {
        if (!(error instanceof MemoryNotFoundError)) throw error;
      } finally {
        if (!matched && this.knownIds?.get(cacheKey) === knownId) this.knownIds?.delete(cacheKey);
      }
      logForDebugging(
        `memory-backend[${this.label}]: id ${knownId} no longer returns ${normalized}; looking the file up by path`,
        {
          level: "debug",
        },
      );
    }
    let sliced = normalized.slice(0, normalized.lastIndexOf("/") + 1);
    let entries;
    try {
      entries = await this.list(sliced, {
        depthOne: true,
        signal: options?.signal,
        stopAtPath: normalized,
      });
    } catch (error) {
      if (error instanceof MemoryNotFoundError) return null;
      throw error;
    }
    let found = entries.find((entry) => entry.path === normalized);
    if (!found) return null;
    let byId = await this.readWithPath(found.id, options);
    if (byId.path === normalized) this.knownIds?.set(cacheKey, found.id);
    return byId.content;
  }
  async exportAll(options) {
    return this.openExport(`export ${this.label}`, this.exportBase, options?.signal);
  }
  async exportMetadata(options) {
    return this.openExport(`export-metadata ${this.label}`, `${this.exportBase}?view=basic`, options?.signal);
  }
  async openExport(operation, url, signal) {
    if (signal?.aborted) throw new AbortError();
    let response = await this.send(
      (options) =>
        apiClient.get(url, {
          ...options,
          responseType: "stream",
        }),
      signal,
    );
    if (!response.ok) throwForSkippedRequest(response, operation);
    let stopError = getStopError(response, operation);
    if (stopError !== undefined || response.status >= 400) {
      destroyStream(response.data);
      if (stopError !== undefined) throw stopError;
      if (response.status === 404) throw new MemoryNotFoundError(this.label, "store");
      parseStoreHttpError(response.status, operation, undefined, response.response.headers);
    }
    if (!isAsyncIterable(response.data))
      throw new MemoryPermanentError("malformed_response", `${operation}: response is not a stream`);
    let stream = response.data;
    if (signal?.aborted) {
      destroyStream(stream);
      throw new AbortError();
    }
    let onAbort = () => destroyStream(stream);
    signal?.addEventListener("abort", onAbort, {
      once: true,
    });
    return {
      stream,
      destroy: () => {
        signal?.removeEventListener("abort", onAbort);
        destroyStream(stream);
      },
    };
  }
  async read(id, options) {
    return (await this.readWithPath(id, options)).content;
  }
  async readWithPath(id, options) {
    if (options?.signal?.aborted) throw new AbortError();
    let operation = `read ${this.label}:${id}`;
    let response = await this.send((options) => apiClient.get(this.entryPath(id), options), options?.signal);
    if (!response.ok) throwForSkippedRequest(response, operation);
    let stopError = getStopError(response, operation);
    if (stopError !== undefined) throw stopError;
    if (response.status === 404) throw new MemoryNotFoundError(id);
    if (response.status >= 400)
      parseStoreHttpError(response.status, operation, response.data, response.response.headers);
    let parsed = memoryWithContentSchema().safeParse(response.data);
    if (!parsed.success)
      throw new MemoryPermanentError(
        "malformed_response",
        `${operation}: malformed response: ${parsed.error.message}`,
      );
    return {
      path: normalizePathPrefix(parsed.data.path),
      content: {
        content: parsed.data.content,
        sha256: parsed.data.content_sha256,
        updatedAt: parsed.data.updated_at,
      },
    };
  }
  async create(path, content, options) {
    this.assertWritable("create");
    let normalized = normalizePathPrefix(path);
    let operation = `create ${this.label}:${normalized}`;
    let body =
      options?.precondition === "not_exists"
        ? {
            path: normalized,
            content,
            precondition: {
              type: "not_exists",
            },
          }
        : {
            path: normalized,
            content,
          };
    let response = await this.send(
      (options) => apiClient.post(this.listBase, body, options),
      options?.signal,
    );
    if (!response.ok) throwForSkippedRequest(response, operation);
    if (response.status === 409) {
      let parsedError = memoryErrorSchema().safeParse(response.data);
      let error = parsedError.success ? parsedError.data.error : undefined;
      let conflictingMemoryId =
        error?.conflicting_memory_id &&
        error.conflicting_path !== undefined &&
        normalizePathPrefix(error.conflicting_path) === normalized
          ? error.conflicting_memory_id
          : undefined;
      throw new MemoryConflictError(
        normalized,
        null,
        undefined,
        conflictingMemoryId,
        error?.conflicting_path === undefined ? undefined : normalizePathPrefix(error.conflicting_path),
      );
    }
    if (response.status >= 400)
      parseStoreHttpError(response.status, operation, response.data, response.response.headers);
    let parsed = memoryMetaSchema().safeParse(response.data);
    if (!parsed.success)
      throw new MemoryPermanentError(
        "malformed_response",
        `${operation}: malformed response: ${parsed.error.message}`,
      );
    return {
      id: parsed.data.id,
      sha256: parsed.data.content_sha256,
    };
  }
  async update(id, content, expectedSha256, options) {
    this.assertWritable("update");
    let operation = `update ${this.label}:${id}`;
    let body = {
      content,
    };
    if (expectedSha256 !== null)
      body.precondition = {
        type: "content_sha256",
        content_sha256: expectedSha256,
      };
    let response = await this.send(
      (options) => apiClient.post(this.entryPath(id), body, options),
      options?.signal,
    );
    if (!response.ok) throwForSkippedRequest(response, operation);
    if (response.status === 404) throw new MemoryNotFoundError(id);
    if (response.status === 409) throw new MemoryConflictError(id, expectedSha256, undefined);
    if (response.status >= 400)
      parseStoreHttpError(response.status, operation, response.data, response.response.headers);
    let parsed = memoryMetaSchema().safeParse(response.data);
    if (!parsed.success)
      throw new MemoryPermanentError(
        "malformed_response",
        `${operation}: malformed response: ${parsed.error.message}`,
      );
    return {
      id: parsed.data.id,
      sha256: parsed.data.content_sha256,
    };
  }
  async delete(id, expectedSha256) {
    this.assertWritable("delete");
    let operation = `delete ${this.label}:${id}`;
    let query = {};
    if (expectedSha256 !== null) query.expected_content_sha256 = expectedSha256;
    let response = await this.send((options) =>
      apiClient.delete(`${this.entryPath(id)}${buildQueryString(query)}`, undefined, options),
    );
    if (!response.ok) throwForSkippedRequest(response, operation);
    if (response.status === 404) {
      if (expectedSha256 !== null) throw new MemoryNotFoundError(id);
      return;
    }
    if (response.status === 409) throw new MemoryConflictError(id, expectedSha256, undefined);
    if (response.status >= 400)
      parseStoreHttpError(response.status, operation, response.data, response.response.headers);
  }
}
//@ chunk-a2q0x549.js:75592-75641 placement
/**
 * 批量创建记忆库客户端。
 */
function createStoreClients(stores, credentialProvider) {
  return stores.map((store) => new MemoryStoreClient(store, credentialProvider));
}
export { normalizePathPrefix, MAX_STORE_ENTRIES, createStoreClients, MemoryStoreClient };
