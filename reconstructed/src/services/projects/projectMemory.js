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
import { u, string, E, M, array, unknown } from "../../../vendor/zod/v4/classic/schemas.js";
import { logFeatureSad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { logForDebugging } from "../../utils/debug.js";
import { jsonParse, jsonStringify } from "../../utils/slowOperations.js";
import { extractErrorCode } from "../../bridge/debugUtils.js";

//@ chunk-j0nnxep0.js:534-582 placement
var PROJECT_API_TIMEOUT_MS = 30000;
var CHAT_PROJECT_PATH = "/v2/ccr-sessions/-/chat-project";
//@ chunk-j0nnxep0.js:582-615 placement
/**
 * 是否用会话 JWT 访问项目 API。
 */
function isSessionJwtAuth() {
  return getSessionIngressAuthToken() !== null;
}
//@ chunk-j0nnxep0.js:615-887 placement
async function postSessionProjectOp(op, n, r, signal, maxContentLength) {
  let c = await apiClient.post(
    CHAT_PROJECT_PATH,
    {
      op,
      ...n,
    },
    {
      host: getCcrSessionUrl() !== undefined && hasRemoteSdkUrl() ? "ccr-gateway" : "api",
      auth: "session-jwt",
      timeout: PROJECT_API_TIMEOUT_MS,
      validateStatus: () => true,
      signal,
      maxContentLength,
    },
  );
  if (c.ok && c.status >= 300)
    throw new ProjectsApiError(r, c.status, errorTextOf(c.data), errorCodeOf(c.data));
  return checkProjectResponse(c, r);
}
//@ chunk-j0nnxep0.js:887-965 placement
/**
 * 判断错误是否是「未知操作」类错误。
 */
function isUnknownOpError(error) {
  return error instanceof ProjectsApiError && error.status === 400 && error.body === "unknown op";
}
//@ chunk-j0nnxep0.js:965-1105 placement
function errorCodeOf(e) {
  return e !== null &&
    typeof e === "object" &&
    "error_code" in e &&
    typeof e.error_code === "string" &&
    e.error_code !== ""
    ? e.error_code
    : undefined;
}
//@ chunk-j0nnxep0.js:1105-1261 placement
function errorTextOf(e) {
  if (e === null || typeof e !== "object" || !("error" in e) || typeof e.error !== "string") return e;
  let n = errorCodeOf(e);
  return n === undefined ? e.error : `${e.error} (${n})`;
}
//@ chunk-j0nnxep0.js:1261-1390 placement
function projectRequestOptions(signal, credentials) {
  return {
    auth: "teleport-org",
    timeout: PROJECT_API_TIMEOUT_MS,
    headers: {
      "anthropic-beta": OAUTH_BETA_HEADER,
    },
    validateStatus: () => true,
    signal,
    credentials,
  };
}
//@ chunk-j0nnxep0.js:1390-1480 placement
function projectApiPath(e, n) {
  return `/api/organizations/:orgUUID/projects/${encodeURIComponent(e)}${n}`;
}
//@ chunk-j0nnxep0.js:1480-1634 placement
/**
 * 获取 Claude 项目详情。
 */
async function getProjectDetail(e, n, r) {
  if (isSessionJwtAuth()) return postSessionProjectOp("detail", {}, "get project detail", n);
  let i = await apiClient.get(projectApiPath(e, "/detail"), projectRequestOptions(n, r));
  return checkProjectResponse(i, "get project detail");
}
//@ chunk-j0nnxep0.js:1634-1833 placement
/**
 * 读取项目文档内容（会话 JWT 走 read-doc 操作，否则 GET /docs/:id）。
 */
async function readProjectDoc(e, uuid, r, i, s) {
  if (isSessionJwtAuth())
    return postSessionProjectOp(
      "read-doc",
      {
        doc_uuid: uuid,
      },
      "read doc",
      r,
      s,
    );
  let c = await apiClient.get(projectApiPath(e, `/docs/${encodeURIComponent(uuid)}`), {
    ...projectRequestOptions(r, i),
    maxContentLength: s,
  });
  return checkProjectResponse(c, "read doc");
}
//@ chunk-j0nnxep0.js:1833-2047 placement
/**
 * 读取项目文件的提取文本（会话 JWT 走 read-file，否则 GET /files/:id/extracted）。
 */
async function readProjectFileText(e, n, r, i, s) {
  if (isSessionJwtAuth())
    return postSessionProjectOp(
      "read-file",
      {
        file_uuid: n,
      },
      "read file",
      r,
      s,
    );
  let c = await apiClient.get(projectApiPath(e, `/files/${encodeURIComponent(n)}/extracted`), {
    ...projectRequestOptions(r, i),
    maxContentLength: s,
  });
  return checkProjectResponse(c, "read file");
}
//@ chunk-j0nnxep0.js:2047-2102 placement
/**
 * 项目记忆文件读写的大小上限（原文、分块与 base64）。
 */
var MAX_PROJECT_FILE_BYTES = 20971520;
var MAX_PROJECT_FILE_CHUNK_BYTES = 262144;
var MAX_PROJECT_FILE_BASE64_BYTES = Math.ceil((MAX_PROJECT_FILE_BYTES * 4) / 3) + 65536;
//@ chunk-j0nnxep0.js:2102-2320 placement
/**
 * 下载项目文件原始内容（会话 JWT 走 read-file-raw，否则 GET /files/:id/raw），有大小上限。
 */
async function downloadProjectFile(projectUuid, fileUuid, signal, credentials) {
  if (isSessionJwtAuth())
    return postSessionProjectOp(
      "read-file-raw",
      {
        file_uuid: fileUuid,
      },
      "download file",
      signal,
      MAX_PROJECT_FILE_BASE64_BYTES,
    );
  let s = await apiClient.get(projectApiPath(projectUuid, `/files/${encodeURIComponent(fileUuid)}/raw`), {
    ...projectRequestOptions(signal, credentials),
    maxContentLength: MAX_PROJECT_FILE_BASE64_BYTES,
  });
  return checkProjectResponse(s, "download file");
}
//@ chunk-j0nnxep0.js:2320-2334 placement
var MAX_PROJECT_UPLOAD_BYTES = 4194304;
//@ chunk-j0nnxep0.js:2334-2583 placement
async function fetchProjectMemory(e, n, r) {
  if (isSessionJwtAuth())
    throw new ProjectsApiError("read project memory", 0, "no memory route over the CCR bridge");
  let i = await apiClient.get(projectApiPath(e, "/detail?include=melange_memory"), {
    ...projectRequestOptions(n, r),
    maxContentLength: MAX_PROJECT_UPLOAD_BYTES,
  });
  return parseProjectMemory(checkProjectResponse(i, "read project memory").melange_memory);
}
//@ chunk-j0nnxep0.js:2583-2878 placement
var MAX_MEMORY_PATH_LENGTH = 255;
var SINGLE_LINE_REGEX = /^[^\r\n\v\f\u0085\u2028\u2029]*$/;
var memoryFileSchema = DoctorLazy(() =>
  u({
    path: string().max(MAX_MEMORY_PATH_LENGTH).regex(SINGLE_LINE_REGEX),
    content: string(),
    size_bytes: E().optional().catch(undefined),
    updated_at: string().nullable().optional().catch(undefined),
    truncated: M().optional().catch(undefined),
  }),
);
var memoryResponseSchema = DoctorLazy(() =>
  u({
    files: array(unknown()),
    truncated: M().optional().catch(undefined),
  }),
);
//@ chunk-j0nnxep0.js:2878-3553 placement
/**
 * 解析项目记忆（melange_memory）。
 */
function parseProjectMemory(melangeMemory) {
  if (melangeMemory === undefined || melangeMemory === null) return null;
  let n = memoryResponseSchema().safeParse(melangeMemory);
  if (!n.success) {
    logFeatureSad("projects_tool_memory", "parse_failed");
    logForDebugging("project memory: melange_memory did not parse", {
      level: "warn",
    });
    return null;
  }
  let r = [];
  let i = 0;
  for (let file of n.data.files) {
    let c = memoryFileSchema().safeParse(file);
    if (!c.success) {
      i++;
      continue;
    }
    let d = c.data;
    r.push({
      path: d.path,
      content: d.content,
      size_bytes: d.size_bytes ?? Buffer.byteLength(d.content, "utf8"),
      updated_at: d.updated_at ?? null,
      truncated: d.truncated === true,
    });
  }
  if (i > 0) {
    logFeatureSad("projects_tool_memory", "entries_dropped", {
      dropped: i,
    });
    logForDebugging(`project memory: ${i} entries dropped at parse`, {
      level: "warn",
    });
  } else logFeatureOk("projects_tool_memory");
  return {
    files: r,
    truncated: n.data.truncated === true,
  };
}
//@ chunk-j0nnxep0.js:3553-3742 placement
/**
 * 在项目里创建文档（文件名与内容）。
 */
async function createProjectDoc(e, fileName, content, i, s) {
  if (isSessionJwtAuth())
    return postSessionProjectOp(
      "write-doc",
      {
        file_name: fileName,
        content,
      },
      "create doc",
      i,
    );
  let c = await apiClient.post(
    projectApiPath(e, "/docs"),
    {
      file_name: fileName,
      content,
    },
    projectRequestOptions(i, s),
  );
  return checkProjectResponse(c, "create doc");
}
//@ chunk-j0nnxep0.js:3742-4037 placement
/**
 * 更新项目文档内容，可带基准内容 sha256 与最大替换字节数作为前置条件。
 */
async function updateProjectDoc(e, n, content, i, s, c, d) {
  let b = {
    content,
    ...(c !== undefined && {
      base_content_sha256: c,
    }),
    ...(d !== undefined && {
      max_replaced_content_bytes: d,
    }),
  };
  if (isSessionJwtAuth())
    return postSessionProjectOp(
      "update-doc",
      {
        doc_uuid: n,
        ...b,
      },
      "update doc",
      i,
    );
  let k = await apiClient.patch(
    projectApiPath(e, `/docs/${encodeURIComponent(n)}`),
    b,
    projectRequestOptions(i, s),
  );
  return checkProjectResponse(k, "update doc");
}
//@ chunk-j0nnxep0.js:4037-4224 placement
/**
 * 删除项目文档。
 */
async function deleteProjectDoc(e, n, r, i) {
  if (isSessionJwtAuth()) {
    await postSessionProjectOp(
      "delete-doc",
      {
        doc_uuid: n,
      },
      "delete doc",
      r,
    );
    return;
  }
  let s = await apiClient.delete(
    projectApiPath(e, `/docs/${encodeURIComponent(n)}`),
    undefined,
    projectRequestOptions(r, i),
  );
  checkProjectResponse(s, "delete doc");
}
//@ chunk-j0nnxep0.js:4224-4455 placement
/**
 * 在项目知识库中搜索（query 与返回条数），返回解析后的结果。
 */
async function searchProjectKnowledge(e, n, r, i, s) {
  if (isSessionJwtAuth())
    return parseMaybeJson(
      await postSessionProjectOp(
        "kb-search",
        {
          query: n,
          n: r,
        },
        "search knowledge base",
        i,
      ),
    );
  let c = await apiClient.get(
    projectApiPath(e, `/kb/search?query=${encodeURIComponent(n)}&n=${r}`),
    projectRequestOptions(i, s),
  );
  return parseMaybeJson(checkProjectResponse(c, "search knowledge base"));
}
//@ chunk-j0nnxep0.js:4455-4533 placement
function parseMaybeJson(e) {
  if (typeof e === "string")
    try {
      return jsonParse(e);
    } catch {
      return e;
    }
  return e;
}
//@ chunk-j0nnxep0.js:4533-4615 placement
/**
 * 从文本里抹掉疑似令牌。
 */
function redactTokenFromText(e, n) {
  if (!n) return e;
  return e.split(n).join("[redacted-oauth-token]");
}
//@ chunk-j0nnxep0.js:4615-4829 placement
/**
 * 项目 API 错误。
 */
class ProjectsApiError extends Error {
  action;
  status;
  body;
  errorCode;
  constructor(e, status, r, errorCode) {
    super(`Projects API: ${e} failed (HTTP ${status})${errorBodySuffix(r)}`);
    this.action = e;
    this.status = status;
    this.body = r;
    this.errorCode = errorCode;
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
var projectErrorCache = new Map();
//@ chunk-j0nnxep0.js:5183-5329 placement
function getProjectMemory(e, n) {
  let r = projectErrorCache.get(e);
  if (r !== undefined) return r;
  let i = fetchProjectMemory(e, undefined, n).catch((error) => {
    if (projectErrorCache.get(e) === i) projectErrorCache.delete(e);
    throw error;
  });
  projectErrorCache.set(e, i);
  return i;
}
//@ chunk-j0nnxep0.js:5329-5354 placement
function clearProjectMemoryCache() {
  projectErrorCache.clear();
}
export {
  redactTokenFromText,
  ProjectsApiError,
  isSessionJwtAuth,
  MAX_PROJECT_FILE_CHUNK_BYTES,
  MAX_PROJECT_FILE_BYTES,
  downloadProjectFile,
  updateProjectDoc,
  isUnknownOpError,
  createProjectDoc,
  deleteProjectDoc,
  getProjectDetail,
  readProjectFileText,
  readProjectDoc,
  searchProjectKnowledge,
  getProjectMemory,
};
