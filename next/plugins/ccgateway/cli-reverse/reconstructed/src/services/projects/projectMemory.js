/**
 * services/projects/projectMemory.ts
 *
 * 2.1.316 新增：解析项目记忆（melange_memory）；项目 API 错误等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-qsgb82qp.js (29)
 * attribution: placement 29
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { getSessionIngressAuthToken } from "../../utils/sessionIngressAuth.js";
import { apiClient } from "../routines/routinesApi.js";
import { getCcrSessionUrl } from "../../bootstrap/state.js";
import { hasRemoteSdkUrl } from "../ccrAgentProxy/agentProxy.js";
import { OAUTH_BETA_HEADER } from "../../constants/oauth.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  objectSchema,
  stringSchema,
  numberSchema,
  booleanSchema,
  array,
  unknown,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { logFeatureSad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { logForDebugging } from "../../utils/debug.js";
import { jsonParse, jsonStringify } from "../../utils/slowOperations.js";
import { extractErrorCode } from "../../bridge/debugUtils.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-qsgb82qp.js:534-582 placement
var PROJECT_API_TIMEOUT_MS = 30000;
var CHAT_PROJECT_PATH = "/v2/ccr-sessions/-/chat-project";
//@ chunk-qsgb82qp.js:582-615 placement
/**
 * 是否用会话 JWT 访问项目 API。
 */
function isSessionJwtAuth() {
  return getSessionIngressAuthToken() !== null;
}
//@ chunk-qsgb82qp.js:615-887 placement
async function postSessionProjectOp(op, payload, action, signal, maxContentLength) {
  let response = await apiClient.post(
    CHAT_PROJECT_PATH,
    {
      op,
      ...payload,
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
  if (response.ok && response.status >= 300)
    throw new ProjectsApiError(
      action,
      response.status,
      errorTextOf(response.data),
      errorCodeOf(response.data),
    );
  return checkProjectResponse(response, action);
}
//@ chunk-qsgb82qp.js:887-965 placement
/**
 * 判断错误是否是「未知操作」类错误。
 */
function isUnknownOpError(error) {
  return error instanceof ProjectsApiError && error.status === 400 && error.body === "unknown op";
}
//@ chunk-qsgb82qp.js:965-1105 placement
function errorCodeOf(payload) {
  return payload !== null &&
    typeof payload === "object" &&
    "error_code" in payload &&
    typeof payload.error_code === "string" &&
    payload.error_code !== ""
    ? payload.error_code
    : undefined;
}
//@ chunk-qsgb82qp.js:1105-1261 placement
function errorTextOf(payload) {
  if (
    payload === null ||
    typeof payload !== "object" ||
    !("error" in payload) ||
    typeof payload.error !== "string"
  )
    return payload;
  let code = errorCodeOf(payload);
  return code === undefined ? payload.error : `${payload.error} (${code})`;
}
//@ chunk-qsgb82qp.js:1261-1390 placement
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
//@ chunk-qsgb82qp.js:1390-1480 placement
function projectApiPath(projectUuid, suffix) {
  return `/api/organizations/:orgUUID/projects/${encodeURIComponent(projectUuid)}${suffix}`;
}
//@ chunk-qsgb82qp.js:1480-1634 placement
/**
 * 获取 Claude 项目详情。
 */
async function getProjectDetail(projectUuid, signal, credentials) {
  if (isSessionJwtAuth()) return postSessionProjectOp("detail", {}, "get project detail", signal);
  let response = await apiClient.get(
    projectApiPath(projectUuid, "/detail"),
    projectRequestOptions(signal, credentials),
  );
  return checkProjectResponse(response, "get project detail");
}
//@ chunk-qsgb82qp.js:1634-1833 placement
/**
 * 读取项目文档内容（会话 JWT 走 read-doc 操作，否则 GET /docs/:id）。
 */
async function readProjectDoc(projectUuid, uuid, signal, credentials, maxContentLength) {
  if (isSessionJwtAuth())
    return postSessionProjectOp(
      "read-doc",
      {
        doc_uuid: uuid,
      },
      "read doc",
      signal,
      maxContentLength,
    );
  let response = await apiClient.get(projectApiPath(projectUuid, `/docs/${encodeURIComponent(uuid)}`), {
    ...projectRequestOptions(signal, credentials),
    maxContentLength,
  });
  return checkProjectResponse(response, "read doc");
}
//@ chunk-qsgb82qp.js:1833-2047 placement
/**
 * 读取项目文件的提取文本（会话 JWT 走 read-file，否则 GET /files/:id/extracted）。
 */
async function readProjectFileText(projectUuid, fileUuid, signal, credentials, maxContentLength) {
  if (isSessionJwtAuth())
    return postSessionProjectOp(
      "read-file",
      {
        file_uuid: fileUuid,
      },
      "read file",
      signal,
      maxContentLength,
    );
  let response = await apiClient.get(
    projectApiPath(projectUuid, `/files/${encodeURIComponent(fileUuid)}/extracted`),
    {
      ...projectRequestOptions(signal, credentials),
      maxContentLength,
    },
  );
  return checkProjectResponse(response, "read file");
}
//@ chunk-qsgb82qp.js:2047-2102 placement
/**
 * 项目记忆文件读写的大小上限（原文、分块与 base64）。
 */
var MAX_PROJECT_FILE_BYTES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var MAX_PROJECT_FILE_CHUNK_BYTES;
var MAX_PROJECT_FILE_BASE64_BYTES;
deferInit("chunk-qsgb82qp.js:2047", () => {
  MAX_PROJECT_FILE_BYTES = 20971520;
  MAX_PROJECT_FILE_CHUNK_BYTES = 262144;
  MAX_PROJECT_FILE_BASE64_BYTES = Math.ceil((MAX_PROJECT_FILE_BYTES * 4) / 3) + 65536;
});
//@ chunk-qsgb82qp.js:2102-2320 placement
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
  let response = await apiClient.get(
    projectApiPath(projectUuid, `/files/${encodeURIComponent(fileUuid)}/raw`),
    {
      ...projectRequestOptions(signal, credentials),
      maxContentLength: MAX_PROJECT_FILE_BASE64_BYTES,
    },
  );
  return checkProjectResponse(response, "download file");
}
//@ chunk-qsgb82qp.js:2320-2334 placement
var MAX_PROJECT_UPLOAD_BYTES = 4194304;
//@ chunk-qsgb82qp.js:2334-2583 placement
async function fetchProjectMemory(projectUuid, signal, credentials) {
  if (isSessionJwtAuth())
    throw new ProjectsApiError("read project memory", 0, "no memory route over the CCR bridge");
  let response = await apiClient.get(projectApiPath(projectUuid, "/detail?include=melange_memory"), {
    ...projectRequestOptions(signal, credentials),
    maxContentLength: MAX_PROJECT_UPLOAD_BYTES,
  });
  return parseProjectMemory(checkProjectResponse(response, "read project memory").melange_memory);
}
//@ chunk-qsgb82qp.js:2583-2878 placement
var MAX_MEMORY_PATH_LENGTH; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var SINGLE_LINE_REGEX;
var memoryFileSchema;
var memoryResponseSchema;
deferInit("chunk-qsgb82qp.js:2583", () => {
  MAX_MEMORY_PATH_LENGTH = 255;
  SINGLE_LINE_REGEX = /^[^\r\n\v\f\u0085\u2028\u2029]*$/;
  memoryFileSchema = DoctorLazy(() =>
    objectSchema({
      path: stringSchema().max(MAX_MEMORY_PATH_LENGTH).regex(SINGLE_LINE_REGEX),
      content: stringSchema(),
      size_bytes: numberSchema().optional().catch(undefined),
      updated_at: stringSchema().nullable().optional().catch(undefined),
      truncated: booleanSchema().optional().catch(undefined),
    }),
  );
  memoryResponseSchema = DoctorLazy(() =>
    objectSchema({
      files: array(unknown()),
      truncated: booleanSchema().optional().catch(undefined),
    }),
  );
});
//@ chunk-qsgb82qp.js:2878-3553 placement
/**
 * 解析项目记忆（melange_memory）。
 */
function parseProjectMemory(melangeMemory) {
  if (melangeMemory === undefined || melangeMemory === null) return null;
  let parsed = memoryResponseSchema().safeParse(melangeMemory);
  if (!parsed.success) {
    logFeatureSad("projects_tool_memory", "parse_failed");
    logForDebugging("project memory: melange_memory did not parse", {
      level: "warn",
    });
    return null;
  }
  let files = [];
  let droppedCount = 0;
  for (let file of parsed.data.files) {
    let parsedFile = memoryFileSchema().safeParse(file);
    if (!parsedFile.success) {
      droppedCount++;
      continue;
    }
    let file_2 = parsedFile.data;
    files.push({
      path: file_2.path,
      content: file_2.content,
      size_bytes: file_2.size_bytes ?? Buffer.byteLength(file_2.content, "utf8"),
      updated_at: file_2.updated_at ?? null,
      truncated: file_2.truncated === true,
    });
  }
  if (droppedCount > 0) {
    logFeatureSad("projects_tool_memory", "entries_dropped", {
      dropped: droppedCount,
    });
    logForDebugging(`project memory: ${droppedCount} entries dropped at parse`, {
      level: "warn",
    });
  } else logFeatureOk("projects_tool_memory");
  return {
    files,
    truncated: parsed.data.truncated === true,
  };
}
//@ chunk-qsgb82qp.js:3553-3742 placement
/**
 * 在项目里创建文档（文件名与内容）。
 */
async function createProjectDoc(projectUuid, fileName, content, signal, credentials) {
  if (isSessionJwtAuth())
    return postSessionProjectOp(
      "write-doc",
      {
        file_name: fileName,
        content,
      },
      "create doc",
      signal,
    );
  let response = await apiClient.post(
    projectApiPath(projectUuid, "/docs"),
    {
      file_name: fileName,
      content,
    },
    projectRequestOptions(signal, credentials),
  );
  return checkProjectResponse(response, "create doc");
}
//@ chunk-qsgb82qp.js:3742-4037 placement
/**
 * 更新项目文档内容，可带基准内容 sha256 与最大替换字节数作为前置条件。
 */
async function updateProjectDoc(
  projectUuid,
  docUuid,
  content,
  signal,
  credentials,
  baseContentSha256,
  maxReplacedBytes,
) {
  let body = {
    content,
    ...(baseContentSha256 !== undefined && {
      base_content_sha256: baseContentSha256,
    }),
    ...(maxReplacedBytes !== undefined && {
      max_replaced_content_bytes: maxReplacedBytes,
    }),
  };
  if (isSessionJwtAuth())
    return postSessionProjectOp(
      "update-doc",
      {
        doc_uuid: docUuid,
        ...body,
      },
      "update doc",
      signal,
    );
  let response = await apiClient.patch(
    projectApiPath(projectUuid, `/docs/${encodeURIComponent(docUuid)}`),
    body,
    projectRequestOptions(signal, credentials),
  );
  return checkProjectResponse(response, "update doc");
}
//@ chunk-qsgb82qp.js:4037-4224 placement
/**
 * 删除项目文档。
 */
async function deleteProjectDoc(projectUuid, docUuid, signal, credentials) {
  if (isSessionJwtAuth()) {
    await postSessionProjectOp(
      "delete-doc",
      {
        doc_uuid: docUuid,
      },
      "delete doc",
      signal,
    );
    return;
  }
  let response = await apiClient.delete(
    projectApiPath(projectUuid, `/docs/${encodeURIComponent(docUuid)}`),
    undefined,
    projectRequestOptions(signal, credentials),
  );
  checkProjectResponse(response, "delete doc");
}
//@ chunk-qsgb82qp.js:4224-4455 placement
/**
 * 在项目知识库中搜索（query 与返回条数），返回解析后的结果。
 */
async function searchProjectKnowledge(projectUuid, query, maxResults, signal, credentials) {
  if (isSessionJwtAuth())
    return parseMaybeJson(
      await postSessionProjectOp(
        "kb-search",
        {
          query,
          n: maxResults,
        },
        "search knowledge base",
        signal,
      ),
    );
  let response = await apiClient.get(
    projectApiPath(projectUuid, `/kb/search?query=${encodeURIComponent(query)}&n=${maxResults}`),
    projectRequestOptions(signal, credentials),
  );
  return parseMaybeJson(checkProjectResponse(response, "search knowledge base"));
}
//@ chunk-qsgb82qp.js:4455-4533 placement
function parseMaybeJson(value) {
  if (typeof value === "string")
    try {
      return jsonParse(value);
    } catch {
      return value;
    }
  return value;
}
//@ chunk-qsgb82qp.js:4533-4615 placement
/**
 * 从文本里抹掉疑似令牌。
 */
function redactTokenFromText(text, token) {
  if (!token) return text;
  return text.split(token).join("[redacted-oauth-token]");
}
//@ chunk-qsgb82qp.js:4615-4829 placement
/**
 * 项目 API 错误。
 */
class ProjectsApiError extends Error {
  action;
  status;
  body;
  errorCode;
  constructor(action, status, body, errorCode) {
    super(`Projects API: ${action} failed (HTTP ${status})${errorBodySuffix(body)}`);
    this.action = action;
    this.status = status;
    this.body = body;
    this.errorCode = errorCode;
    this.name = "ProjectsApiError";
  }
}
//@ chunk-qsgb82qp.js:4829-5000 placement
function checkProjectResponse(result, action) {
  if (!result.ok)
    throw new ProjectsApiError(action, 0, result.reason === "no-auth" ? result.detail : result.reason);
  if (result.status < 200 || result.status >= 300)
    throw new ProjectsApiError(action, result.status, result.data, extractErrorCode(result.data));
  return result.data;
}
//@ chunk-qsgb82qp.js:5000-5169 placement
function errorBodySuffix(body) {
  if (body == null) return "";
  if (typeof body === "string") return body ? `: ${body.slice(0, 200)}` : "";
  try {
    return `: ${jsonStringify(body).slice(0, 200)}`;
  } catch {
    return `: ${String(body).slice(0, 200)}`;
  }
}
//@ chunk-qsgb82qp.js:5169-5183 placement
var projectErrorCache; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-qsgb82qp.js:5169", () => {
  projectErrorCache = new Map();
});
//@ chunk-qsgb82qp.js:5183-5329 placement
function getProjectMemory(projectUuid, credentials) {
  let cached = projectErrorCache.get(projectUuid);
  if (cached !== undefined) return cached;
  let promise = fetchProjectMemory(projectUuid, undefined, credentials).catch((error) => {
    if (projectErrorCache.get(projectUuid) === promise) projectErrorCache.delete(projectUuid);
    throw error;
  });
  projectErrorCache.set(projectUuid, promise);
  return promise;
}
//@ chunk-qsgb82qp.js:5329-5354 placement
function clearProjectMemoryCache() {
  projectErrorCache.clear();
}
export {
  ProjectsApiError,
  MAX_PROJECT_FILE_CHUNK_BYTES,
  readProjectFileText,
  readProjectDoc,
  isSessionJwtAuth,
  getProjectDetail,
  getProjectMemory,
  redactTokenFromText,
  MAX_PROJECT_FILE_BYTES,
  downloadProjectFile,
  updateProjectDoc,
  isUnknownOpError,
  createProjectDoc,
  deleteProjectDoc,
  searchProjectKnowledge,
  clearProjectMemoryCache,
};
