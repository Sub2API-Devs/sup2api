/**
 * services/projects/projectMemory.ts
 *
 * 2.1.316 新增：解析项目记忆（melange_memory）；项目 API 错误等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-j0nnxep0.js (29)
 * attribution: placement 29
 */
import { getSessionIngressAuthToken } from "../../utils/sessionIngressAuth.js";
import { apiClient } from "../routines/routinesApi.js";
import { getCcrSessionUrl } from "../../bootstrap/state.js";
import { hasRemoteSdkUrl } from "../ccrAgentProxy/agentProxy.js";
import { OAUTH_BETA_HEADER } from "../../constants/oauth.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, o, E, M, A, oe } from "../../../vendor/zod/v4/classic/schemas.js";
import { logFeatureSad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { logForDebugging } from "../../utils/debug.js";
import { jsonParse, jsonStringify } from "../../utils/slowOperations.js";
import { extractErrorCode } from "../../bridge/debugUtils.js";

//@ chunk-j0nnxep0.js:534-582 placement
var S = 30000,
  C = "/v2/ccr-sessions/-/chat-project";
/**
 * 是否用会话 JWT 访问项目 API。
 */
//@ chunk-j0nnxep0.js:582-615 placement
function isSessionJwtAuth() {
  return getSessionIngressAuthToken() !== null;
}
//@ chunk-j0nnxep0.js:615-887 placement
async function postSessionProjectOp(e, n, r, i, s) {
  let post = await apiClient.post(
    C,
    { op: e, ...n },
    {
      host: getCcrSessionUrl() !== void 0 && hasRemoteSdkUrl() ? "ccr-gateway" : "api",
      auth: "session-jwt",
      timeout: S,
      validateStatus: () => !0,
      signal: i,
      maxContentLength: s,
    },
  );
  if (post.ok && post.status >= 300)
    throw new ProjectsApiError(r, post.status, errorTextOf(post.data), errorCodeOf(post.data));
  return checkProjectResponse(post, r);
}
//@ chunk-j0nnxep0.js:887-965 placement
function CAo(e) {
  return e instanceof ProjectsApiError && e.status === 400 && e.body === "unknown op";
}
//@ chunk-j0nnxep0.js:965-1105 placement
function errorCodeOf(e) {
  return e !== null &&
    typeof e === "object" &&
    "error_code" in e &&
    typeof e.error_code === "string" &&
    e.error_code !== ""
    ? e.error_code
    : void 0;
}
//@ chunk-j0nnxep0.js:1105-1261 placement
function errorTextOf(e) {
  if (e === null || typeof e !== "object" || !("error" in e) || typeof e.error !== "string") return e;
  let n = errorCodeOf(e);
  return n === void 0 ? e.error : `${e.error} (${n})`;
}
//@ chunk-j0nnxep0.js:1261-1390 placement
function projectRequestOptions(e, n) {
  return {
    auth: "teleport-org",
    timeout: S,
    headers: { "anthropic-beta": OAUTH_BETA_HEADER },
    validateStatus: () => !0,
    signal: e,
    credentials: n,
  };
}
//@ chunk-j0nnxep0.js:1390-1480 placement
function m(e, n) {
  return `/api/organizations/:orgUUID/projects/${encodeURIComponent(e)}${n}`;
}
/**
 * 获取 Claude 项目详情。
 */
//@ chunk-j0nnxep0.js:1480-1634 placement
async function getProjectDetail(e, n, r) {
  if (isSessionJwtAuth()) return postSessionProjectOp("detail", {}, "get project detail", n);
  let i = await apiClient.get(m(e, "/detail"), projectRequestOptions(n, r));
  return checkProjectResponse(i, "get project detail");
}
/**
 * 读取项目文档内容（会话 JWT 走 read-doc 操作，否则 GET /docs/:id）。
 */
//@ chunk-j0nnxep0.js:1634-1833 placement
async function readProjectDoc(e, n, r, i, s) {
  if (isSessionJwtAuth()) return postSessionProjectOp("read-doc", { doc_uuid: n }, "read doc", r, s);
  let c = await apiClient.get(m(e, `/docs/${encodeURIComponent(n)}`), {
    ...projectRequestOptions(r, i),
    maxContentLength: s,
  });
  return checkProjectResponse(c, "read doc");
}
/**
 * 读取项目文件的提取文本（会话 JWT 走 read-file，否则 GET /files/:id/extracted）。
 */
//@ chunk-j0nnxep0.js:1833-2047 placement
async function readProjectFileText(e, n, r, i, s) {
  if (isSessionJwtAuth()) return postSessionProjectOp("read-file", { file_uuid: n }, "read file", r, s);
  let c = await apiClient.get(m(e, `/files/${encodeURIComponent(n)}/extracted`), {
    ...projectRequestOptions(r, i),
    maxContentLength: s,
  });
  return checkProjectResponse(c, "read file");
}
//@ chunk-j0nnxep0.js:2047-2102 placement
var IMr = 20971520,
  OQe = 262144,
  j = Math.ceil((IMr * 4) / 3) + 65536;
/**
 * 下载项目文件原始内容（会话 JWT 走 read-file-raw，否则 GET /files/:id/raw），有大小上限。
 */
//@ chunk-j0nnxep0.js:2102-2320 placement
async function downloadProjectFile(e, n, r, i) {
  if (isSessionJwtAuth())
    return postSessionProjectOp("read-file-raw", { file_uuid: n }, "download file", r, j);
  let s = await apiClient.get(m(e, `/files/${encodeURIComponent(n)}/raw`), {
    ...projectRequestOptions(r, i),
    maxContentLength: j,
  });
  return checkProjectResponse(s, "download file");
}
//@ chunk-j0nnxep0.js:2320-2334 placement
var R = 4194304;
//@ chunk-j0nnxep0.js:2334-2583 placement
async function fetchProjectMemory(e, n, r) {
  if (isSessionJwtAuth())
    throw new ProjectsApiError("read project memory", 0, "no memory route over the CCR bridge");
  let i = await apiClient.get(m(e, "/detail?include=melange_memory"), {
    ...projectRequestOptions(n, r),
    maxContentLength: R,
  });
  return parseProjectMemory(checkProjectResponse(i, "read project memory").melange_memory);
}
//@ chunk-j0nnxep0.js:2583-2878 placement
var MAX_MEMORY_PATH_LENGTH = 255,
  SINGLE_LINE_REGEX = /^[^\r\n\v\f\u0085\u2028\u2029]*$/,
  memoryFileSchema = DoctorLazy(() =>
    u({
      path: o().max(MAX_MEMORY_PATH_LENGTH).regex(SINGLE_LINE_REGEX),
      content: o(),
      size_bytes: E()
        .optional()
        .catch(void 0),
      updated_at: o()
        .nullable()
        .optional()
        .catch(void 0),
      truncated: M()
        .optional()
        .catch(void 0),
    }),
  ),
  memoryResponseSchema = DoctorLazy(() =>
    u({
      files: A(oe()),
      truncated: M()
        .optional()
        .catch(void 0),
    }),
  );
/**
 * 解析项目记忆（melange_memory）。
 */
//@ chunk-j0nnxep0.js:2878-3553 placement
function parseProjectMemory(e) {
  if (e === void 0 || e === null) return null;
  let safeParse = memoryResponseSchema().safeParse(e);
  if (!safeParse.success)
    return (
      logFeatureSad("projects_tool_memory", "parse_failed"),
      logForDebugging("project memory: melange_memory did not parse", { level: "warn" }),
      null
    );
  let r = [],
    i = 0;
  for (let file of safeParse.data.files) {
    let safeParse = memoryFileSchema().safeParse(file);
    if (!safeParse.success) {
      i++;
      continue;
    }
    let d = safeParse.data;
    r.push({
      path: d.path,
      content: d.content,
      size_bytes: d.size_bytes ?? Buffer.byteLength(d.content, "utf8"),
      updated_at: d.updated_at ?? null,
      truncated: d.truncated === !0,
    });
  }
  if (i > 0)
    (logFeatureSad("projects_tool_memory", "entries_dropped", { dropped: i }),
      logForDebugging(`project memory: ${i} entries dropped at parse`, { level: "warn" }));
  else logFeatureOk("projects_tool_memory");
  return { files: r, truncated: safeParse.data.truncated === !0 };
}
/**
 * 在项目里创建文档（文件名与内容）。
 */
//@ chunk-j0nnxep0.js:3553-3742 placement
async function createProjectDoc(e, n, r, i, s) {
  if (isSessionJwtAuth())
    return postSessionProjectOp("write-doc", { file_name: n, content: r }, "create doc", i);
  let post = await apiClient.post(m(e, "/docs"), { file_name: n, content: r }, projectRequestOptions(i, s));
  return checkProjectResponse(post, "create doc");
}
/**
 * 更新项目文档内容，可带基准内容 sha256 与最大替换字节数作为前置条件。
 */
//@ chunk-j0nnxep0.js:3742-4037 placement
async function updateProjectDoc(e, n, r, i, s, c, d) {
  let b = {
    content: r,
    ...(c !== void 0 && { base_content_sha256: c }),
    ...(d !== void 0 && { max_replaced_content_bytes: d }),
  };
  if (isSessionJwtAuth()) return postSessionProjectOp("update-doc", { doc_uuid: n, ...b }, "update doc", i);
  let patch = await apiClient.patch(m(e, `/docs/${encodeURIComponent(n)}`), b, projectRequestOptions(i, s));
  return checkProjectResponse(patch, "update doc");
}
/**
 * 删除项目文档。
 */
//@ chunk-j0nnxep0.js:4037-4224 placement
async function deleteProjectDoc(e, n, r, i) {
  if (isSessionJwtAuth()) {
    await postSessionProjectOp("delete-doc", { doc_uuid: n }, "delete doc", r);
    return;
  }
  let s = await apiClient.delete(m(e, `/docs/${encodeURIComponent(n)}`), void 0, projectRequestOptions(r, i));
  checkProjectResponse(s, "delete doc");
}
/**
 * 在项目知识库中搜索（query 与返回条数），返回解析后的结果。
 */
//@ chunk-j0nnxep0.js:4224-4455 placement
async function searchProjectKnowledge(e, n, r, i, s) {
  if (isSessionJwtAuth())
    return w(await postSessionProjectOp("kb-search", { query: n, n: r }, "search knowledge base", i));
  let c = await apiClient.get(
    m(e, `/kb/search?query=${encodeURIComponent(n)}&n=${r}`),
    projectRequestOptions(i, s),
  );
  return w(checkProjectResponse(c, "search knowledge base"));
}
//@ chunk-j0nnxep0.js:4455-4533 placement
function w(e) {
  if (typeof e === "string")
    try {
      return jsonParse(e);
    } catch {
      return e;
    }
  return e;
}
//@ chunk-j0nnxep0.js:4533-4615 placement
function O$s(e, n) {
  if (!n) return e;
  return e.split(n).join("[redacted-oauth-token]");
}
/**
 * 项目 API 错误。
 */
//@ chunk-j0nnxep0.js:4615-4829 placement
class ProjectsApiError extends Error {
  action;
  status;
  body;
  errorCode;
  constructor(e, n, r, i) {
    super(`Projects API: ${e} failed (HTTP ${n})${errorBodySuffix(r)}`);
    this.action = e;
    this.status = n;
    this.body = r;
    this.errorCode = i;
    this.name = "ProjectsApiError";
  }
}
//@ chunk-j0nnxep0.js:4829-5000 placement
function checkProjectResponse(e, n) {
  if (!e.ok) throw new ProjectsApiError(n, 0, e.reason === "no-auth" ? e.detail : e.reason);
  if (e.status < 200 || e.status >= 300)
    throw new ProjectsApiError(n, e.status, e.data, extractErrorCode(e.data));
  return e.data;
}
//@ chunk-j0nnxep0.js:5000-5169 placement
function errorBodySuffix(e) {
  if (e == null) return "";
  if (typeof e === "string") return e ? `: ${e.slice(0, 200)}` : "";
  try {
    return `: ${jsonStringify(e).slice(0, 200)}`;
  } catch {
    return `: ${String(e).slice(0, 200)}`;
  }
}
//@ chunk-j0nnxep0.js:5169-5183 placement
var P = new Map();
//@ chunk-j0nnxep0.js:5183-5329 placement
function getProjectMemory(e, n) {
  let r = P.get(e);
  if (r !== void 0) return r;
  let i = fetchProjectMemory(e, void 0, n).catch((s) => {
    if (P.get(e) === i) P.delete(e);
    throw s;
  });
  return (P.set(e, i), i);
}
//@ chunk-j0nnxep0.js:5329-5354 placement
function clearProjectMemoryCache() {
  P.clear();
}

export {
  O$s,
  ProjectsApiError,
  isSessionJwtAuth,
  OQe,
  IMr,
  downloadProjectFile,
  updateProjectDoc,
  CAo,
  createProjectDoc,
  deleteProjectDoc,
  getProjectDetail,
  readProjectFileText,
  readProjectDoc,
  searchProjectKnowledge,
  getProjectMemory,
};
