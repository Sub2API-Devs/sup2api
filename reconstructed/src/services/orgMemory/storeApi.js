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
import { kt, o, E, A, oe } from "../../../vendor/zod/v4/classic/schemas.js";
import {
  WEn,
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
function parseContextStopHeader(e) {
  let n = e?.["x-memory-context-stop"],
    r = typeof n === "string" ? n.trim().toLowerCase() : "";
  return r === "org" || r === "credential" ? r : void 0;
}
/**
 * 从普通头对象解析 retry-after（秒或 HTTP 日期）为毫秒，非正数忽略，上限 1 小时。旧版名 getRetryAfter 为同名族错配（另一个 getRetryAfter 是 #GQe）。疑似归错文件（chunk-82kqcve8 属其他 HTTP 客户端）。
 */
//@ chunk-82kqcve8.js:64930-65145 placement = getRetryAfter (0.889)
function parseRetryAfterHeaderMs(error) {
  let n = error["retry-after"];
  if (typeof n !== "string" || n.trim() === "") return;
  let r = Number(n),
    s = Number.isFinite(r) ? r * 1000 : Date.parse(n) - Date.now();
  if (!Number.isFinite(s) || s <= 0) return;
  return Math.min(s, 3600000);
}
/**
 * retry-after 毫秒，缺省 60 秒。
 */
//@ chunk-82kqcve8.js:65145-65180 placement
function getRetryAfterMsOrDefault(e) {
  return parseRetryAfterHeaderMs(e) ?? 60000;
}
/**
 * 记忆库 HTTP API 的超时、分页与上限，路径，以及条目、列表页、带内容条目与错误体的 schema。
 */
//@ chunk-82kqcve8.js:65180-65733 placement
var STORE_API_TIMEOUT_MS = 30000,
  LIST_PAGE_SIZE = 100,
  MAX_STORE_ENTRIES = 200000,
  MEMORIES_PATH = "/memories",
  MEMORIES_EXPORT_PATH = "/memories/export",
  memoryEntrySchema = DoctorLazy(() =>
    kt({
      id: WEn(),
      path: o(),
      content_sha256: o(),
      content_size_bytes: E().int().nonnegative().optional(),
      size_bytes: E().int().nonnegative().optional(),
      updated_at: o()
        .optional()
        .catch(void 0),
    }),
  ),
  memoryListPageSchema = DoctorLazy(() =>
    kt({
      data: A(kt({ type: o() })),
      prefixes: A(oe())
        .nullish()
        .catch(void 0),
      next_page: o().nullish(),
    }),
  ),
  memoryWithContentSchema = DoctorLazy(() => memoryEntrySchema().extend({ content: o(), updated_at: o() })),
  memoryMetaSchema = memoryEntrySchema,
  memoryErrorSchema = DoctorLazy(() =>
    kt({
      error: kt({
        type: o().optional(),
        conflicting_path: o().optional(),
        conflicting_memory_id: WEn().optional(),
      }).optional(),
    }),
  );
//@ chunk-82kqcve8.js:65733-65805 placement
function Pk(e) {
  return (e.startsWith("/") ? e : "/" + e).replace(/\/{2,}/g, "/");
}
//@ chunk-82kqcve8.js:65805-65953 placement
function buildQueryString(e) {
  let mapped = Object.entries(e).map(([r, s]) => `${encodeURIComponent(r)}=${encodeURIComponent(String(s))}`);
  return mapped.length ? "?" + mapped.join("&") : "";
}
//@ chunk-82kqcve8.js:65953-66032 placement
function _a(e) {
  return typeof e === "object" && e !== null && Symbol.asyncIterator in e;
}
//@ chunk-82kqcve8.js:66032-66138 placement
function destroyStream(e) {
  if (typeof e === "object" && e !== null && "destroy" in e && typeof e.destroy === "function") e.destroy();
}
//@ chunk-82kqcve8.js:66138-67027 placement
var MEMORY_STORE_LIMIT_ERRORS = DoctorLazy(() =>
    kt({ message: o().optional(), error: kt({ type: o().optional(), message: o().optional() }).optional() }),
  ),
  Rm = new Map([
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
  ]),
  Em = "cannot modify archived resource";
//@ chunk-82kqcve8.js:67027-67518 placement
function parseStoreHttpError(e, n, r, s) {
  if (e === 429 || e >= 500) {
    let O = e === 429 || e === 503 || typeof s["retry-after"] === "string";
    throw new MemoryUnavailableError(`${n}: HTTP ${e}`, void 0, O ? getRetryAfterMsOrDefault(s) : void 0);
  }
  let safeParse = MEMORY_STORE_LIMIT_ERRORS().safeParse(r),
    y = safeParse.success ? safeParse.data : void 0,
    w = y?.error,
    S = w?.message ?? y?.message;
  if (e === 400 && w?.type === "invalid_request_error" && S !== void 0) {
    let O = Rm.get(S) ?? (S.startsWith(Em) ? "store_archived" : void 0);
    if (O !== void 0) throw new MemoryPermanentError(O, `${n}: HTTP 400 (${S})`);
  }
  let R = S !== void 0 ? ` (${S})` : "";
  throw new MemoryPermanentError(`http_${e}`, `${n}: HTTP ${e}${R}`);
}
//@ chunk-82kqcve8.js:67518-67707 placement
function getStopError(e, n) {
  if (e.status !== 204 && e.status !== 401 && e.status !== 403) return;
  let r = parseContextStopHeader(e.response.headers);
  return r === void 0
    ? void 0
    : new MemoryPermanentError(`stopped_${r}`, `${n}: HTTP ${e.status} (stop: ${r})`);
}
//@ chunk-82kqcve8.js:67707-67827 placement = isPermanentFailure (0.566)
function throwForSkippedRequest(e, n) {
  if (e.reason === "no-auth") throw new MemoryPermanentError("no_oauth", `${n}: ${e.detail}`);
  throw new MemoryUnavailableError(`${n}: ${e.reason}`);
}
/**
 * 记忆库 HTTP 客户端（/memories、/memories/export，session-jwt 认证）
 */
//@ chunk-82kqcve8.js:67827-74424 placement
class MemoryStoreClient {
  mode;
  label;
  partitionId;
  listBase;
  exportBase;
  reqOpts;
  credentialProvider;
  knownIds;
  constructor(e, n, r) {
    ((this.mode = e.mode), (this.label = e.mount), (this.credentialProvider = n), (this.knownIds = r));
    let replaced = e.path.replace(/\/+$/, "");
    ((this.partitionId = replaced),
      (this.listBase = replaced + MEMORIES_PATH),
      (this.exportBase = replaced + MEMORIES_EXPORT_PATH));
    let h = memoryApiTarget();
    this.reqOpts = {
      host: "memory",
      timeout: STORE_API_TIMEOUT_MS,
      validateStatus: () => !0,
      auth: h.auth === "none" ? "none" : getSessionIngressAuthToken() ? "session-jwt" : void 0,
      refreshOAuth: h.refreshOAuth,
    };
  }
  async send(e, n) {
    let r = n ? { ...this.reqOpts, signal: n } : this.reqOpts;
    if (!this.credentialProvider) return e(r);
    let s = {
        ...r,
        auth: "none",
        headers: { Authorization: await this.credentialProvider.getAuthorization() },
      },
      h = await e(s);
    if (!h.ok || h.status !== 401) return h;
    if (_a(h.data)) destroyStream(h.data);
    return e({
      ...s,
      headers: {
        Authorization: await this.credentialProvider.getAuthorization({
          forceRefresh: !0,
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
    let r = [],
      s = 0,
      h;
    for (let y = 0; ; y++) {
      if (n?.signal?.aborted) throw new AbortError();
      let w = { limit: LIST_PAGE_SIZE };
      if (e !== void 0) w.path_prefix = Pk(e);
      if (n?.depthOne) ((w.depth = 1), (w.order_by = "path"), (w.order = "asc"));
      if (h) w.page = h;
      let send = await this.send(
        (j) => apiClient.get(`${this.listBase}${buildQueryString(w)}`, j),
        n?.signal,
      );
      if (!send.ok) throwForSkippedRequest(send, `list ${this.label}`);
      let R = getStopError(send, `list ${this.label}`);
      if (R !== void 0) throw R;
      if (send.status === 404) {
        if (h === void 0)
          throw (
            logForDebugging(`memory-backend[${this.label}]: list 404 (store not provisioned)`, {
              level: "debug",
            }),
            new MemoryNotFoundError(this.label, "store")
          );
        throw new MemoryUnavailableError(
          `list ${this.label}: 404 on page ${y} (cursor expired or store deleted mid-walk)`,
        );
      }
      if (send.status >= 400)
        parseStoreHttpError(send.status, `list ${this.label}`, send.data, send.response.headers);
      let safeParse = memoryListPageSchema().safeParse(send.data);
      if (!safeParse.success)
        throw new MemoryPermanentError(
          "malformed_response",
          `list ${this.label}: malformed response: ${safeParse.error.message}`,
        );
      for (let j of safeParse.data.data) {
        if (j.type !== "memory" && j.type !== "memory_metadata") continue;
        let safeParse = memoryEntrySchema().safeParse(j);
        if (!safeParse.success)
          throw new MemoryPermanentError(
            "malformed_response",
            `list ${this.label}: malformed memory item: ${safeParse.error.message}`,
          );
        let Z = Pk(safeParse.data.path);
        if (
          (r.push({
            id: safeParse.data.id,
            path: Z,
            sha256: safeParse.data.content_sha256,
            sizeBytes: safeParse.data.content_size_bytes ?? safeParse.data.size_bytes,
            updatedAt: safeParse.data.updated_at,
          }),
          Z === n?.stopAtPath)
        )
          return r;
      }
      let P = safeParse.data.data.length + (safeParse.data.prefixes?.length ?? 0);
      s += P;
      let L = safeParse.data.next_page ?? void 0;
      if (!L) break;
      if (L === h)
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
      h = L;
    }
    return r;
  }
  async readByPath(e, n) {
    let r = Pk(e),
      s = `${this.partitionId} ${r}`,
      h = this.knownIds?.get(s);
    if (h !== void 0) {
      let O = !1;
      try {
        let withPath = await this.readWithPath(h, n);
        if (((O = withPath.path === r), O)) return withPath.content;
      } catch (error) {
        if (!(error instanceof MemoryNotFoundError)) throw error;
      } finally {
        if (!O && this.knownIds?.get(s) === h) this.knownIds?.delete(s);
      }
      logForDebugging(
        `memory-backend[${this.label}]: id ${h} no longer returns ${r}; looking the file up by path`,
        { level: "debug" },
      );
    }
    let sliced = r.slice(0, r.lastIndexOf("/") + 1),
      w;
    try {
      w = await this.list(sliced, { depthOne: !0, signal: n?.signal, stopAtPath: r });
    } catch (error) {
      if (error instanceof MemoryNotFoundError) return null;
      throw error;
    }
    let found = w.find((O) => O.path === r);
    if (!found) return null;
    let withPath = await this.readWithPath(found.id, n);
    if (withPath.path === r) this.knownIds?.set(s, found.id);
    return withPath.content;
  }
  async exportAll(e) {
    return this.openExport(`export ${this.label}`, this.exportBase, e?.signal);
  }
  async exportMetadata(e) {
    return this.openExport(`export-metadata ${this.label}`, `${this.exportBase}?view=basic`, e?.signal);
  }
  async openExport(e, n, r) {
    if (r?.aborted) throw new AbortError();
    let send = await this.send((S) => apiClient.get(n, { ...S, responseType: "stream" }), r);
    if (!send.ok) throwForSkippedRequest(send, e);
    let h = getStopError(send, e);
    if (h !== void 0 || send.status >= 400) {
      if ((destroyStream(send.data), h !== void 0)) throw h;
      if (send.status === 404) throw new MemoryNotFoundError(this.label, "store");
      parseStoreHttpError(send.status, e, void 0, send.response.headers);
    }
    if (!_a(send.data))
      throw new MemoryPermanentError("malformed_response", `${e}: response is not a stream`);
    let y = send.data;
    if (r?.aborted) throw (destroyStream(y), new AbortError());
    let w = () => destroyStream(y);
    return (
      r?.addEventListener("abort", w, { once: !0 }),
      {
        stream: y,
        destroy: () => {
          (r?.removeEventListener("abort", w), destroyStream(y));
        },
      }
    );
  }
  async read(e, n) {
    return (await this.readWithPath(e, n)).content;
  }
  async readWithPath(e, n) {
    if (n?.signal?.aborted) throw new AbortError();
    let r = `read ${this.label}:${e}`,
      send = await this.send((w) => apiClient.get(this.entryPath(e), w), n?.signal);
    if (!send.ok) throwForSkippedRequest(send, r);
    let h = getStopError(send, r);
    if (h !== void 0) throw h;
    if (send.status === 404) throw new MemoryNotFoundError(e);
    if (send.status >= 400) parseStoreHttpError(send.status, r, send.data, send.response.headers);
    let safeParse = memoryWithContentSchema().safeParse(send.data);
    if (!safeParse.success)
      throw new MemoryPermanentError(
        "malformed_response",
        `${r}: malformed response: ${safeParse.error.message}`,
      );
    return {
      path: Pk(safeParse.data.path),
      content: {
        content: safeParse.data.content,
        sha256: safeParse.data.content_sha256,
        updatedAt: safeParse.data.updated_at,
      },
    };
  }
  async create(e, n, r) {
    this.assertWritable("create");
    let s = Pk(e),
      h = `create ${this.label}:${s}`,
      y =
        r?.precondition === "not_exists"
          ? { path: s, content: n, precondition: { type: "not_exists" } }
          : { path: s, content: n },
      send = await this.send((R) => apiClient.post(this.listBase, y, R), r?.signal);
    if (!send.ok) throwForSkippedRequest(send, h);
    if (send.status === 409) {
      let safeParse = memoryErrorSchema().safeParse(send.data),
        O = safeParse.success ? safeParse.data.error : void 0,
        P =
          O?.conflicting_memory_id && O.conflicting_path !== void 0 && Pk(O.conflicting_path) === s
            ? O.conflicting_memory_id
            : void 0;
      throw new MemoryConflictError(
        s,
        null,
        void 0,
        P,
        O?.conflicting_path === void 0 ? void 0 : Pk(O.conflicting_path),
      );
    }
    if (send.status >= 400) parseStoreHttpError(send.status, h, send.data, send.response.headers);
    let safeParse = memoryMetaSchema().safeParse(send.data);
    if (!safeParse.success)
      throw new MemoryPermanentError(
        "malformed_response",
        `${h}: malformed response: ${safeParse.error.message}`,
      );
    return { id: safeParse.data.id, sha256: safeParse.data.content_sha256 };
  }
  async update(e, n, r, s) {
    this.assertWritable("update");
    let h = `update ${this.label}:${e}`,
      y = { content: n };
    if (r !== null) y.precondition = { type: "content_sha256", content_sha256: r };
    let send = await this.send((R) => apiClient.post(this.entryPath(e), y, R), s?.signal);
    if (!send.ok) throwForSkippedRequest(send, h);
    if (send.status === 404) throw new MemoryNotFoundError(e);
    if (send.status === 409) throw new MemoryConflictError(e, r, void 0);
    if (send.status >= 400) parseStoreHttpError(send.status, h, send.data, send.response.headers);
    let safeParse = memoryMetaSchema().safeParse(send.data);
    if (!safeParse.success)
      throw new MemoryPermanentError(
        "malformed_response",
        `${h}: malformed response: ${safeParse.error.message}`,
      );
    return { id: safeParse.data.id, sha256: safeParse.data.content_sha256 };
  }
  async delete(e, n) {
    this.assertWritable("delete");
    let r = `delete ${this.label}:${e}`,
      s = {};
    if (n !== null) s.expected_content_sha256 = n;
    let send = await this.send((y) =>
      apiClient.delete(`${this.entryPath(e)}${buildQueryString(s)}`, void 0, y),
    );
    if (!send.ok) throwForSkippedRequest(send, r);
    if (send.status === 404) {
      if (n !== null) throw new MemoryNotFoundError(e);
      return;
    }
    if (send.status === 409) throw new MemoryConflictError(e, n, void 0);
    if (send.status >= 400) parseStoreHttpError(send.status, r, send.data, send.response.headers);
  }
}
//@ chunk-82kqcve8.js:74424-74473 placement
function w9r(e, n) {
  return e.map((r) => new MemoryStoreClient(r, n));
}

export { MemoryStoreClient, Pk, MAX_STORE_ENTRIES, w9r };
