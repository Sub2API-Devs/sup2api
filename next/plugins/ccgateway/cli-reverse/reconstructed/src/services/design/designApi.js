/**
 * services/design/designApi.ts
 *
 * Claude Design 同意与授权 API（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-xja31b7a.js (21), chunk-zevfa8jm.js (17)
 * attribution: placement 37, layout 1
 */
import {
  checkAndRefreshOAuthTokenIfNeeded,
  getClaudeAIOAuthTokensAsync,
  getClaudeAIOAuthTokens,
} from "../../utils/auth.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { getDesignAccessToken, readDesignOAuth } from "../oauth/designOAuth.js";
import { apiClient } from "../routines/routinesApi.js";
import { logForDebugging } from "../../utils/debug.js";
import {
  errorMessage,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from "../../utils/errors.js";
import {
  clearApprovedPlansAll,
  resetGrants,
  clearPlanStore,
  markGrantIneligibleProject,
  markProjectGrantVerified,
  isRecardProject,
} from "../mcp/designPlanGate.js";
import { isFirstPartyProvider } from "../../utils/model/providers.js";
import { isEssentialTrafficOnly } from "../../utils/privacyLevel.js";
import { logFeatureBad, logFeatureOk, logFeatureSad } from "../analytics/featureTelemetry.js";
import { isAxiosError } from "../../../vendor/axios/dist/esm/axios.js";
import {
  swapScaffoldResolver,
  swapConsentChecker,
  swapNoticeHolder,
} from "../mcp/firstPartyDesignConsent.js";
import { getOAuthHeaders } from "../../utils/teleport/api.js";
import { getOauthConfig } from "../../constants/oauth.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-xja31b7a.js:633-665 placement
/**
 * 与 Claude Design 同意状态相关的正文字段名（agent_design_projects）。
 */
var DESIGN_CONSENT_NAMES = ["agent_design_projects"];
//@ chunk-xja31b7a.js:665-723 placement
/**
 * 判断字符串是否属于 design 同意字段名。
 */
function isDesignConsentName(consent) {
  return typeof consent === "string" && DESIGN_CONSENT_NAMES.includes(consent);
}
//@ chunk-xja31b7a.js:723-942 placement
function DESIGN_CONSENT_PROMPT(key) {
  switch (key) {
    case "agent_design_projects":
      return "Connect to Claude Design? Claude can read and edit your Design projects from this tool. Change anytime at claude.ai/design/settings or with /design revoke.";
  }
}
//@ chunk-xja31b7a.js:942-1025 placement
/**
 * 清空 Design 同意状态的缓存与在途请求。
 */
function invalidateDesignConsentCache(state) {
  state.consentCache = null;
  state.consentFetch = null;
  state.consentCacheGeneration++;
}
//@ chunk-xja31b7a.js:1025-1337 placement
/**
 * 生成 Claude Design API 请求的认证选项：优先用带 design 读取 scope 的 claude.ai 令牌，否则取 Design 专用令牌。
 */
async function designAuthOptions(credentials) {
  await checkAndRefreshOAuthTokenIfNeeded({
    credentials,
  });
  let tokens;
  if (isStorageV5Enabled() && credentials !== undefined)
    tokens = await getClaudeAIOAuthTokensAsync(credentials);
  else tokens = getClaudeAIOAuthTokens();
  let accessToken =
    tokens?.refreshToken && tokens.scopes?.includes("user:design:read") ? tokens.accessToken : null;
  if (!accessToken) {
    let designAccessToken = await getDesignAccessToken(credentials);
    accessToken = designAccessToken.ok ? designAccessToken.accessToken : (tokens?.accessToken ?? null);
  }
  return {
    auth: "none",
    ...(accessToken && {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }),
  };
}
//@ chunk-xja31b7a.js:1337-1668 placement
/**
 * 预检读取 Claude Design 的同意状态（失败时返回空，后续靠 403 填充缓存）。
 */
async function fetchDesignConsent(credentials) {
  try {
    let response = await apiClient.get("/v1/design/consent", {
      ...(await designAuthOptions(credentials)),
      validateStatus: (status) => status < 500,
    });
    if (!response.ok || response.status !== 200) return {};
    let consent = {};
    for (let name of DESIGN_CONSENT_NAMES) {
      let value = response.data?.[name];
      if (typeof value === "boolean") consent[name] = value;
    }
    return consent;
  } catch (error) {
    logForDebugging(
      `Design consent pre-flight GET failed (${errorMessage(error)}); falling back to 403-seeded cache.`,
    );
    return {};
  }
}
//@ chunk-xja31b7a.js:1668-1793 placement
/**
 * 更新 Design 同意缓存；撤销项目同意时同时清除相关授权缓存。
 */
function setDesignConsent(state, key, value) {
  if (key === "agent_design_projects" && value === false) {
    clearApprovedPlansAll(state);
    resetGrants(state);
    clearPlanStore(state);
  }
  state.consentCache = {
    ...(state.consentCache ?? {}),
    [key]: value,
  };
}
//@ chunk-xja31b7a.js:1793-1851 placement
/**
 * 是否已存有 Design 的 OAuth 访问令牌。
 */
async function hasDesignOAuthToken(credentials) {
  return !!(await readDesignOAuth(credentials))?.accessToken;
}
//@ chunk-xja31b7a.js:1851-2466 placement
async function designUnavailableReason(credentials) {
  if (!isFirstPartyProvider())
    return {
      ok: false,
      reason: "wrong_provider",
    };
  if (isEssentialTrafficOnly())
    return {
      ok: false,
      reason: "essential_traffic_only",
    };
  await checkAndRefreshOAuthTokenIfNeeded({
    credentials,
  });
  let tokens;
  if (isStorageV5Enabled() && credentials !== undefined)
    tokens = await getClaudeAIOAuthTokensAsync(credentials);
  else tokens = getClaudeAIOAuthTokens();
  if (tokens?.accessToken && tokens.refreshToken && tokens.scopes?.includes("user:design:read"))
    return {
      ok: true,
      accessToken: tokens.accessToken,
      bearer: "design_scoped_login",
    };
  let designAccessToken = await getDesignAccessToken(credentials);
  if (designAccessToken.ok)
    return {
      ok: true,
      accessToken: designAccessToken.accessToken,
      bearer: "design_credential",
    };
  if (tokens?.accessToken)
    return {
      ok: true,
      accessToken: tokens.accessToken,
      bearer: tokens.scopes?.includes("user:design:read") ? "design_scoped_login" : "login",
    };
  return {
    ok: false,
    reason: designAccessToken.reason,
    detail: designAccessToken.detail,
  };
}
//@ chunk-xja31b7a.js:2466-2500 placement
/**
 * 取首次使用时被拒的 design 同意键（未拒绝返回 null）。
 */
async function getDesignConsentKey(credentials) {
  return designUnavailableReason(credentials);
}
//@ chunk-xja31b7a.js:2500-2900 placement
/**
 * 首次使用时拉取 Claude Design 同意状态并缓存（并发共享一次请求）；agent_design_projects 被拒时返回该键，否则 null。仅第一方且非仅必要流量。
 */
async function checkDesignConsent(state, credentials) {
  if (!isFirstPartyProvider() || isEssentialTrafficOnly()) return null;
  if (state.consentCache === null) {
    let pending = (state.consentFetch ??= fetchDesignConsent(credentials));
    let consentCacheGeneration = state.consentCacheGeneration;
    let generation = await pending;
    if (state.consentCache === null && state.consentCacheGeneration === consentCacheGeneration) {
      state.consentCache = {};
      for (let name of DESIGN_CONSENT_NAMES) {
        let granted = generation[name];
        if (typeof granted === "boolean") setDesignConsent(state, name, granted);
      }
    }
    if (state.consentFetch === pending) state.consentFetch = null;
  }
  return state.consentCache?.agent_design_projects === false ? "agent_design_projects" : null;
}
//@ chunk-xja31b7a.js:2900-3074 placement
/**
 * 判断是否需要先登录 Claude Design（第一方提供方、无 claude.ai 令牌且无 Design 令牌）。
 */
async function needsDesignLogin(credentials) {
  if (!isFirstPartyProvider() || isEssentialTrafficOnly()) return false;
  let accessToken;
  if (isStorageV5Enabled() && credentials !== undefined)
    accessToken = (await getClaudeAIOAuthTokensAsync(credentials))?.accessToken;
  else accessToken = getClaudeAIOAuthTokens()?.accessToken;
  if (accessToken) return false;
  return !(await readDesignOAuth(credentials))?.accessToken;
}
//@ chunk-xja31b7a.js:3074-3428 placement
async function recordDesignConsent(scope, consent, credentials) {
  try {
    let response = await apiClient.post(
      "/v1/design/consent",
      {
        consent,
      },
      {
        ...(await designAuthOptions(credentials)),
        validateStatus: (status) => status < 300,
      },
    );
    if (!response.ok)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Couldn't record Design consent (${response.reason === "no-auth" ? response.detail : response.reason}).`,
        "design consent POST blocked by policy gate",
      );
  } catch (error) {
    logFeatureBad("design_consent", "post_failed");
    throw error;
  }
  setDesignConsent(scope, consent, true);
  logFeatureOk("design_consent");
}
//@ chunk-xja31b7a.js:3428-3835 placement
async function revokeDesignConsent(scope, consent, credentials) {
  try {
    let response = await apiClient.delete(
      "/v1/design/consent",
      {
        consent,
      },
      {
        ...(await designAuthOptions(credentials)),
        validateStatus: (status) => status < 300,
      },
    );
    if (!response.ok)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Couldn't revoke Design consent (${response.reason === "no-auth" ? response.detail : response.reason}).`,
        "design consent DELETE blocked by policy gate",
      );
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) setDesignConsent(scope, consent, false);
    logFeatureBad("design_consent", "delete_failed");
    throw error;
  }
  setDesignConsent(scope, consent, false);
  logFeatureOk("design_consent");
}
//@ chunk-xja31b7a.js:3835-4440 placement
async function probeDesignGrants(credentials) {
  try {
    let response = await apiClient.get("/v1/design/grants", {
      ...(await designAuthOptions(credentials)),
      validateStatus: (status) => status < 500,
    });
    if (!response.ok || response.status !== 200) {
      let status = response.ok ? response.status : 0;
      logFeatureSad("design_project_grant", status === 404 ? "probe_404_old_server" : "probe_http_error", {
        status,
      });
      return null;
    }
    let grants = response.data?.grants;
    if (!Array.isArray(grants)) {
      logFeatureSad("design_project_grant", "probe_shape");
      return null;
    }
    let ids = new Set();
    for (let grant of grants) {
      let projectId = grant?.project_id;
      if (typeof projectId === "string" && projectId.length > 0) ids.add(projectId);
    }
    return ids;
  } catch (error) {
    logForDebugging(
      `Design project-grant probe failed (${errorMessage(error)}); falling back to the per-batch plan flow.`,
    );
    logFeatureSad("design_project_grant", "probe_network");
    return null;
  }
}
//@ chunk-xja31b7a.js:4440-4631 placement
/**
 * 检查 Design 项目授权：合并并发探测，返回已授权、未授权或不可用。
 */
async function checkDesignGrant(state, projectId, credentials) {
  let grants = (state.grantsFetch ??= probeDesignGrants(credentials));
  try {
    let grantSet = await grants;
    if (grantSet === null) return "unavailable";
    return grantSet.has(projectId) ? "granted" : "notGranted";
  } finally {
    if (state.grantsFetch === grants) state.grantsFetch = null;
  }
}
//@ chunk-xja31b7a.js:4631-5409 placement
async function recordDesignProjectGrant(state, projectId, credentials) {
  let response;
  try {
    let request = await apiClient.post(
      "/v1/design/grants",
      {
        project_id: projectId,
      },
      {
        ...(await designAuthOptions(credentials)),
        validateStatus: (status) => status < 300 || status === 404,
      },
    );
    if (!request.ok)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Couldn't record the Design project write grant (${request.reason === "no-auth" ? request.detail : request.reason}).`,
        "design project grant POST blocked by policy gate",
      );
    response = request.status;
  } catch (error) {
    logFeatureBad("design_project_grant", "post_failed");
    throw error;
  }
  if (response === 404) {
    markGrantIneligibleProject(state, projectId);
    logFeatureBad("design_project_grant", "mint_refused_404");
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "This project cannot hold a durable write grant for this account (it may be shared from another organization, or not viewable) \u2014 use finalize_plan with writes/deletes and pass the returned plan_token for writes to this project.",
      "design project grant mint refused for this project",
    );
  }
  markProjectGrantVerified(state, projectId);
  logFeatureOk("design_project_grant");
}
//@ chunk-xja31b7a.js:5409-6185 placement
function pollDesignGrantApproval(credentials, projectId, signal) {
  let baseline = null;
  async function fetchGrant() {
    let grants;
    try {
      let response = await apiClient.get("/v1/design/grants", {
        ...(await designAuthOptions(signal)),
        validateStatus: (status) => status < 500,
      });
      if (!response.ok || response.status !== 200) return null;
      grants = response.data?.grants;
    } catch (error) {
      logForDebugging(`Server-approval watcher poll failed (${errorMessage(error)}); will poll again.`);
      return null;
    }
    if (!Array.isArray(grants)) return null;
    for (let entry of grants) {
      let grant = entry;
      if (grant?.project_id !== projectId) continue;
      let createdAtMs = typeof grant.created_at === "string" ? Date.parse(grant.created_at) : NaN;
      if (Number.isNaN(createdAtMs)) return null;
      return {
        present: true,
        createdAtMs,
      };
    }
    return {
      present: false,
    };
  }
  return {
    async poll() {
      let state = await fetchGrant();
      if (state === null) return false;
      if (baseline === null) {
        baseline = {
          createdAtMs: state.present ? state.createdAtMs : null,
        };
        return false;
      }
      if (!state.present) return false;
      if (!(baseline.createdAtMs === null || state.createdAtMs > baseline.createdAtMs)) return false;
      if (isRecardProject(credentials, projectId)) return false;
      markProjectGrantVerified(credentials, projectId);
      return true;
    },
  };
}
//@ chunk-xja31b7a.js:6185-6192 placement
// deferred: uses swapScaffoldResolver (../mcp/firstPartyDesignConsent.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-xja31b7a.js:6185", () => {
  swapScaffoldResolver(designUnavailableReason);
});
//@ chunk-xja31b7a.js:6192-6222 placement
// deferred: uses swapConsentChecker (../mcp/firstPartyDesignConsent.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-xja31b7a.js:6192", () => {
  swapConsentChecker(async (credentials) => !!(await readDesignOAuth(credentials)));
});
//@ chunk-xja31b7a.js:6222-6341 placement
// deferred: uses swapNoticeHolder (../mcp/firstPartyDesignConsent.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-xja31b7a.js:6222", () => {
  swapNoticeHolder({
    wouldNeedDesignConsent: checkDesignConsent,
    consentPromptFor: DESIGN_CONSENT_PROMPT,
    postDesignConsent: recordDesignConsent,
    seedDesignConsentBit: setDesignConsent,
    isConsentBit: isDesignConsentName,
  });
});
//@ chunk-zevfa8jm.js:6695-6751 placement
/**
 * Claude Design 的 RPC 服务名 anthropic.omelette.api.v1alpha.OmeletteService。
 */
var OMELETTE_SERVICE_NAME = "anthropic.omelette.api.v1alpha.OmeletteService";
//@ chunk-zevfa8jm.js:6751-7146 placement
/**
 * 调 Claude Design 同步 RPC（POST /<前缀>/<方法>）：401/403 抛 DesignAuthError，其他非 2xx 抛 DesignRpcError，返回响应数据。
 */
async function designRpc(method, token, body, signal) {
  let response = await apiClient.post(`/${OMELETTE_SERVICE_NAME}/${method}`, body, {
    auth: "none",
    headers: {
      ...getOAuthHeaders(token),
      "X-Anthropic-Client": "claude-cli-design-sync",
    },
    timeout: 60000,
    maxBodyLength: 33554432,
    validateStatus: () => true,
    signal,
  });
  if (!response.ok)
    throw new DesignRpcError(method, 0, {
      error: response.reason,
    });
  if (response.status === 401 || response.status === 403)
    throw new DesignAuthError(method, response.status, response.data);
  if (response.status < 200 || response.status >= 300)
    throw new DesignRpcError(method, response.status, response.data);
  return response.data;
}
//@ chunk-zevfa8jm.js:7146-7181 placement
var PROJECT_TYPE_DESIGN_SYSTEM = "PROJECT_TYPE_DESIGN_SYSTEM";
//@ chunk-zevfa8jm.js:7181-7350 placement
async function listOrgProjects(token, options = {}, signal) {
  let result = await designRpc(
    "ListOrgProjects",
    token,
    {
      ...(options.type && {
        type: options.type,
      }),
      ...(options.cursor && {
        cursor: options.cursor,
      }),
    },
    signal,
  );
  return {
    items: result.items ?? [],
    cursor: result.cursor ?? "",
  };
}
//@ chunk-zevfa8jm.js:7350-7532 placement
async function writeDesignFiles(token, projectId, files, options = {}, signal) {
  return (
    (
      await designRpc(
        "WriteFiles",
        token,
        {
          projectId,
          files,
          deduplicate: options.deduplicate ?? false,
          ...(options.deletePaths?.length && {
            deletePaths: options.deletePaths,
          }),
        },
        signal,
      )
    ).files ?? []
  );
}
//@ chunk-zevfa8jm.js:7532-7598 placement
/**
 * 调 GetProject RPC 取项目信息。
 */
async function getDesignProject(token, projectId, signal) {
  return designRpc(
    "GetProject",
    token,
    {
      projectId,
    },
    signal,
  );
}
//@ chunk-zevfa8jm.js:7598-7862 layout
async function getProjectArtifactExport(credentials, projectId, client) {
  let artifactUrl = (
    await designRpc(
      "GetProjectArtifactExport",
      credentials,
      {
        projectId,
      },
      client,
    )
  ).projectArtifact?.artifactUrl;
  if (typeof artifactUrl !== "string" || !URL.canParse(artifactUrl)) return;
  let exportUrl = new URL(artifactUrl);
  return exportUrl.origin === new URL(getOauthConfig().CLAUDE_AI_ORIGIN).origin
    ? exportUrl.origin + exportUrl.pathname
    : undefined;
}
//@ chunk-zevfa8jm.js:7862-8178 placement
/**
 * 分页列出 Design 项目全部文件路径（最多 50 页）。
 */
async function listDesignFiles(credentials, projectId, signal) {
  let paths = [];
  let offset = 0;
  for (let j = 0; j < 50; j++) {
    let page = await designRpc(
      "ListFiles",
      credentials,
      {
        projectId,
        depth: -1,
        ...(offset > 0 && {
          offset,
        }),
      },
      signal,
    );
    let entries = page.entries ?? [];
    for (let entry of entries) paths.push(entry.path);
    if (!page.truncated || entries.length === 0) return paths;
    offset += entries.length;
  }
  throw new DesignRpcError("ListFiles", 0, {
    error: `pagination exceeded 50 pages (${paths.length} paths)`,
  });
}
//@ chunk-zevfa8jm.js:8178-8523 placement
/**
 * 读取 Design 项目文件内容，按上限截断，返回内容类型与是否截断。
 */
async function getDesignFile(credentials, projectId, path, maxBytes = 262144, signal) {
  let result = await designRpc(
    "GetFile",
    credentials,
    {
      projectId,
      path,
      raw: true,
    },
    signal,
  );
  let content = result.content ?? "";
  let isBase64 = result.isBase64 ?? false;
  let text;
  let truncated = false;
  if (isBase64) {
    text = content;
    if (text.length > maxBytes) {
      text = text.slice(0, maxBytes);
      truncated = true;
    }
  } else {
    let buffer = Buffer.from(content, "base64");
    if (buffer.byteLength > maxBytes) {
      buffer = buffer.subarray(0, maxBytes);
      truncated = true;
    }
    text = buffer.toString("utf8");
  }
  return {
    content: text,
    contentType: result.contentType ?? "",
    isBase64,
    truncated,
  };
}
//@ chunk-zevfa8jm.js:8523-8643 placement
async function deleteDesignFiles(token, projectId, paths, signal) {
  if (paths.length === 0) return 0;
  return (
    (
      await designRpc(
        "DeleteFiles",
        token,
        {
          projectId,
          paths,
        },
        signal,
      )
    ).deleted ?? 0
  );
}
//@ chunk-zevfa8jm.js:8643-8807 placement
async function createDesignProject(token, name, signal) {
  let result = await designRpc(
    "CreateProject",
    token,
    {
      name,
      type: PROJECT_TYPE_DESIGN_SYSTEM,
    },
    signal,
  );
  if (!result.projectId) throw new DesignRpcError("CreateProject", 200, result);
  return {
    projectId: result.projectId,
    name,
  };
}
//@ chunk-zevfa8jm.js:8807-9003 placement
async function recordDesignAsset(token, projectId, asset, signal) {
  await designRpc(
    "RecordAsset",
    token,
    {
      projectId,
      name: asset.name,
      path: asset.path,
      ...(asset.subtitle && {
        subtitle: asset.subtitle,
      }),
      ...(asset.viewport && {
        viewport: asset.viewport,
      }),
      ...(asset.group && {
        section: asset.group,
      }),
    },
    signal,
  );
}
//@ chunk-zevfa8jm.js:9003-9078 placement
/**
 * 调 DeleteAsset RPC 删除项目文件。
 */
async function deleteDesignAsset(token, projectId, path, signal) {
  await designRpc(
    "DeleteAsset",
    token,
    {
      projectId,
      path,
    },
    signal,
  );
}
//@ chunk-zevfa8jm.js:9078-9158 placement
/**
 * 把字符串里的 OAuth 令牌替换成 [redacted-oauth-token]。
 */
function redactOAuthToken(text, token) {
  if (!token) return text;
  return text.split(token).join("[redacted-oauth-token]");
}
//@ chunk-zevfa8jm.js:9158-9413 placement
class DesignRpcError extends Error {
  method;
  status;
  body;
  telemetryMessage;
  constructor(method, status, body) {
    super(`Design API ${method} failed: HTTP ${status} ${truncateErrorBody(body)}`);
    this.method = method;
    this.status = status;
    this.body = body;
    this.name = "DesignRpcError";
    this.telemetryMessage = `Design API ${method} failed: HTTP ${status}`;
  }
}
//@ chunk-zevfa8jm.js:9413-9492 placement
let DesignAuthError; // deferred: uses DesignRpcError of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-zevfa8jm.js:9413", () => {
  DesignAuthError = class DesignAuthError extends DesignRpcError {
    constructor(message, status, body) {
      super(message, status, body);
      this.name = "DesignAuthError";
    }
  };
});
//@ chunk-zevfa8jm.js:9492-9651 placement
function truncateErrorBody(body) {
  if (body == null) return "";
  if (typeof body === "string") return body.slice(0, 200);
  try {
    return JSON.stringify(body).slice(0, 200);
  } catch {
    return String(body).slice(0, 200);
  }
}
export {
  recordDesignConsent,
  revokeDesignConsent,
  getDesignConsentKey,
  checkDesignConsent,
  DESIGN_CONSENT_PROMPT,
  checkDesignGrant,
  setDesignConsent,
  invalidateDesignConsentCache,
  recordDesignProjectGrant,
  isDesignConsentName,
  hasDesignOAuthToken,
  pollDesignGrantApproval,
  needsDesignLogin,
  DesignAuthError,
  redactOAuthToken,
  listOrgProjects,
  PROJECT_TYPE_DESIGN_SYSTEM,
  getDesignProject,
  getProjectArtifactExport,
  listDesignFiles,
  getDesignFile,
  writeDesignFiles,
  deleteDesignFiles,
  recordDesignAsset,
  deleteDesignAsset,
  createDesignProject,
};
