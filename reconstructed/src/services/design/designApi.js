/**
 * services/design/designApi.ts
 *
 * Claude Design 同意与授权 API（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-98n6ge4d.js (16), chunk-ty8q6r2q.js (21)
 * attribution: placement 37
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
import {
  swapScaffoldResolver,
  swapConsentChecker,
  swapNoticeHolder,
} from "../mcp/firstPartyDesignConsent.js";
import { getOAuthHeaders } from "../../utils/teleport/api.js";

//@ chunk-ty8q6r2q.js:597-629 placement
/**
 * 与 Claude Design 同意状态相关的正文字段名（agent_design_projects）。
 */
var DESIGN_CONSENT_NAMES = ["agent_design_projects"];
//@ chunk-ty8q6r2q.js:629-687 placement
/**
 * 判断字符串是否属于 design 同意字段名。
 */
function isDesignConsentName(consent) {
  return typeof consent === "string" && DESIGN_CONSENT_NAMES.includes(consent);
}
//@ chunk-ty8q6r2q.js:687-906 placement
function DESIGN_CONSENT_PROMPT(e) {
  switch (e) {
    case "agent_design_projects":
      return "Connect to Claude Design? Claude can read and edit your Design projects from this tool. Change anytime at claude.ai/design/settings or with /design revoke.";
  }
}
//@ chunk-ty8q6r2q.js:906-989 placement
/**
 * 清空 Design 同意状态的缓存与在途请求。
 */
function invalidateDesignConsentCache(e) {
  e.consentCache = null;
  e.consentFetch = null;
  e.consentCacheGeneration++;
}
//@ chunk-ty8q6r2q.js:989-1301 placement
/**
 * 生成 Claude Design API 请求的认证选项：优先用带 design 读取 scope 的 claude.ai 令牌，否则取 Design 专用令牌。
 */
async function designAuthOptions(credentials) {
  await checkAndRefreshOAuthTokenIfNeeded({
    credentials,
  });
  let n;
  if (isStorageV5Enabled() && credentials !== undefined) n = await getClaudeAIOAuthTokensAsync(credentials);
  else n = getClaudeAIOAuthTokens();
  let accessToken = n?.refreshToken && n.scopes?.includes("user:design:read") ? n.accessToken : null;
  if (!accessToken) {
    let designAccessToken = await getDesignAccessToken(credentials);
    accessToken = designAccessToken.ok ? designAccessToken.accessToken : (n?.accessToken ?? null);
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
//@ chunk-ty8q6r2q.js:1301-1632 placement
/**
 * 预检读取 Claude Design 的同意状态（失败时返回空，后续靠 403 填充缓存）。
 */
async function fetchDesignConsent(credentials) {
  try {
    let n = await apiClient.get("/v1/design/consent", {
      ...(await designAuthOptions(credentials)),
      validateStatus: (r) => r < 500,
    });
    if (!n.ok || n.status !== 200) return {};
    let s = {};
    for (let r of DESIGN_CONSENT_NAMES) {
      let o = n.data?.[r];
      if (typeof o === "boolean") s[r] = o;
    }
    return s;
  } catch (error) {
    logForDebugging(
      `Design consent pre-flight GET failed (${errorMessage(error)}); falling back to 403-seeded cache.`,
    );
    return {};
  }
}
//@ chunk-ty8q6r2q.js:1632-1757 placement
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
//@ chunk-ty8q6r2q.js:1757-1815 placement
/**
 * 是否已存有 Design 的 OAuth 访问令牌。
 */
async function hasDesignOAuthToken(e) {
  return !!(await readDesignOAuth(e))?.accessToken;
}
//@ chunk-ty8q6r2q.js:1815-2430 placement
async function designUnavailableReason(e) {
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
    credentials: e,
  });
  let n;
  if (isStorageV5Enabled() && e !== undefined) n = await getClaudeAIOAuthTokensAsync(e);
  else n = getClaudeAIOAuthTokens();
  if (n?.accessToken && n.refreshToken && n.scopes?.includes("user:design:read"))
    return {
      ok: true,
      accessToken: n.accessToken,
      bearer: "design_scoped_login",
    };
  let designAccessToken = await getDesignAccessToken(e);
  if (designAccessToken.ok)
    return {
      ok: true,
      accessToken: designAccessToken.accessToken,
      bearer: "design_credential",
    };
  if (n?.accessToken)
    return {
      ok: true,
      accessToken: n.accessToken,
      bearer: n.scopes?.includes("user:design:read") ? "design_scoped_login" : "login",
    };
  return {
    ok: false,
    reason: designAccessToken.reason,
    detail: designAccessToken.detail,
  };
}
//@ chunk-ty8q6r2q.js:2430-2464 placement
/**
 * 取首次使用时被拒的 design 同意键（未拒绝返回 null）。
 */
async function getDesignConsentKey(e) {
  return designUnavailableReason(e);
}
//@ chunk-ty8q6r2q.js:2464-2864 placement
/**
 * 首次使用时拉取 Claude Design 同意状态并缓存（并发共享一次请求）；agent_design_projects 被拒时返回该键，否则 null。仅第一方且非仅必要流量。
 */
async function checkDesignConsent(state, credentials) {
  if (!isFirstPartyProvider() || isEssentialTrafficOnly()) return null;
  if (state.consentCache === null) {
    let s = (state.consentFetch ??= fetchDesignConsent(credentials));
    let consentCacheGeneration = state.consentCacheGeneration;
    let o = await s;
    if (state.consentCache === null && state.consentCacheGeneration === consentCacheGeneration) {
      state.consentCache = {};
      for (let a of DESIGN_CONSENT_NAMES) {
        let i = o[a];
        if (typeof i === "boolean") setDesignConsent(state, a, i);
      }
    }
    if (state.consentFetch === s) state.consentFetch = null;
  }
  return state.consentCache?.agent_design_projects === false ? "agent_design_projects" : null;
}
//@ chunk-ty8q6r2q.js:2864-3038 placement
/**
 * 判断是否需要先登录 Claude Design（第一方提供方、无 claude.ai 令牌且无 Design 令牌）。
 */
async function needsDesignLogin(e) {
  if (!isFirstPartyProvider() || isEssentialTrafficOnly()) return false;
  let n;
  if (isStorageV5Enabled() && e !== undefined) n = (await getClaudeAIOAuthTokensAsync(e))?.accessToken;
  else n = getClaudeAIOAuthTokens()?.accessToken;
  if (n) return false;
  return !(await readDesignOAuth(e))?.accessToken;
}
//@ chunk-ty8q6r2q.js:3038-3392 placement
async function recordDesignConsent(e, n, credentials) {
  try {
    let r = await apiClient.post(
      "/v1/design/consent",
      {
        consent: n,
      },
      {
        ...(await designAuthOptions(credentials)),
        validateStatus: (o) => o < 300,
      },
    );
    if (!r.ok)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Couldn't record Design consent (${r.reason === "no-auth" ? r.detail : r.reason}).`,
        "design consent POST blocked by policy gate",
      );
  } catch (error) {
    logFeatureBad("design_consent", "post_failed");
    throw error;
  }
  setDesignConsent(e, n, true);
  logFeatureOk("design_consent");
}
//@ chunk-ty8q6r2q.js:3392-3761 placement
async function revokeDesignConsent(e, n, credentials) {
  try {
    let r = await apiClient.delete(
      "/v1/design/consent",
      {
        consent: n,
      },
      {
        ...(await designAuthOptions(credentials)),
        validateStatus: (o) => o < 300 || o === 404,
      },
    );
    if (!r.ok)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Couldn't revoke Design consent (${r.reason === "no-auth" ? r.detail : r.reason}).`,
        "design consent DELETE blocked by policy gate",
      );
  } catch (error) {
    logFeatureBad("design_consent", "delete_failed");
    throw error;
  }
  setDesignConsent(e, n, false);
  logFeatureOk("design_consent");
}
//@ chunk-ty8q6r2q.js:3761-4366 placement
async function probeDesignGrants(e) {
  try {
    let n = await apiClient.get("/v1/design/grants", {
      ...(await designAuthOptions(e)),
      validateStatus: (o) => o < 500,
    });
    if (!n.ok || n.status !== 200) {
      let status = n.ok ? n.status : 0;
      logFeatureSad("design_project_grant", status === 404 ? "probe_404_old_server" : "probe_http_error", {
        status,
      });
      return null;
    }
    let grants = n.data?.grants;
    if (!Array.isArray(grants)) {
      logFeatureSad("design_project_grant", "probe_shape");
      return null;
    }
    let r = new Set();
    for (let grant of grants) {
      let projectId = grant?.project_id;
      if (typeof projectId === "string" && projectId.length > 0) r.add(projectId);
    }
    return r;
  } catch (error) {
    logForDebugging(
      `Design project-grant probe failed (${errorMessage(error)}); falling back to the per-batch plan flow.`,
    );
    logFeatureSad("design_project_grant", "probe_network");
    return null;
  }
}
//@ chunk-ty8q6r2q.js:4366-4557 placement
/**
 * 检查 Design 项目授权：合并并发探测，返回已授权、未授权或不可用。
 */
async function checkDesignGrant(e, projectId, credentials) {
  let r = (e.grantsFetch ??= probeDesignGrants(credentials));
  try {
    let o = await r;
    if (o === null) return "unavailable";
    return o.has(projectId) ? "granted" : "notGranted";
  } finally {
    if (e.grantsFetch === r) e.grantsFetch = null;
  }
}
//@ chunk-ty8q6r2q.js:4557-5335 placement
async function recordDesignProjectGrant(e, projectId, credentials) {
  let r;
  try {
    let o = await apiClient.post(
      "/v1/design/grants",
      {
        project_id: projectId,
      },
      {
        ...(await designAuthOptions(credentials)),
        validateStatus: (a) => a < 300 || a === 404,
      },
    );
    if (!o.ok)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Couldn't record the Design project write grant (${o.reason === "no-auth" ? o.detail : o.reason}).`,
        "design project grant POST blocked by policy gate",
      );
    r = o.status;
  } catch (error) {
    logFeatureBad("design_project_grant", "post_failed");
    throw error;
  }
  if (r === 404) {
    markGrantIneligibleProject(e, projectId);
    logFeatureBad("design_project_grant", "mint_refused_404");
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "This project cannot hold a durable write grant for this account (it may be shared from another organization, or not viewable) \u2014 use finalize_plan with writes/deletes and pass the returned plan_token for writes to this project.",
      "design project grant mint refused for this project",
    );
  }
  markProjectGrantVerified(e, projectId);
  logFeatureOk("design_project_grant");
}
//@ chunk-ty8q6r2q.js:5335-6111 placement
function pollDesignGrantApproval(e, projectId, s) {
  let r = null;
  async function o() {
    let a;
    try {
      let i = await apiClient.get("/v1/design/grants", {
        ...(await designAuthOptions(s)),
        validateStatus: (c) => c < 500,
      });
      if (!i.ok || i.status !== 200) return null;
      a = i.data?.grants;
    } catch (error) {
      logForDebugging(`Server-approval watcher poll failed (${errorMessage(error)}); will poll again.`);
      return null;
    }
    if (!Array.isArray(a)) return null;
    for (let i of a) {
      let c = i;
      if (c?.project_id !== projectId) continue;
      let p = typeof c.created_at === "string" ? Date.parse(c.created_at) : NaN;
      if (Number.isNaN(p)) return null;
      return {
        present: true,
        createdAtMs: p,
      };
    }
    return {
      present: false,
    };
  }
  return {
    async poll() {
      let a = await o();
      if (a === null) return false;
      if (r === null) {
        r = {
          createdAtMs: a.present ? a.createdAtMs : null,
        };
        return false;
      }
      if (!a.present) return false;
      if (!(r.createdAtMs === null || a.createdAtMs > r.createdAtMs)) return false;
      if (isRecardProject(e, projectId)) return false;
      markProjectGrantVerified(e, projectId);
      return true;
    },
  };
}
//@ chunk-ty8q6r2q.js:6111-6118 placement
swapScaffoldResolver(designUnavailableReason);
//@ chunk-ty8q6r2q.js:6118-6148 placement
swapConsentChecker(async (e) => !!(await readDesignOAuth(e)));
//@ chunk-ty8q6r2q.js:6148-6267 placement
swapNoticeHolder({
  wouldNeedDesignConsent: checkDesignConsent,
  consentPromptFor: DESIGN_CONSENT_PROMPT,
  postDesignConsent: recordDesignConsent,
  seedDesignConsentBit: setDesignConsent,
  isConsentBit: isDesignConsentName,
});
//@ chunk-98n6ge4d.js:6335-6391 placement
/**
 * Claude Design 的 RPC 服务名 anthropic.omelette.api.v1alpha.OmeletteService。
 */
var OMELETTE_SERVICE_NAME = "anthropic.omelette.api.v1alpha.OmeletteService";
//@ chunk-98n6ge4d.js:6391-6786 placement
/**
 * 调 Claude Design 同步 RPC（POST /<前缀>/<方法>）：401/403 抛 DesignAuthError，其他非 2xx 抛 DesignRpcError，返回响应数据。
 */
async function designRpc(method, token, body, signal) {
  let i = await apiClient.post(`/${OMELETTE_SERVICE_NAME}/${method}`, body, {
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
  if (!i.ok)
    throw new DesignRpcError(method, 0, {
      error: i.reason,
    });
  if (i.status === 401 || i.status === 403) throw new DesignAuthError(method, i.status, i.data);
  if (i.status < 200 || i.status >= 300) throw new DesignRpcError(method, i.status, i.data);
  return i.data;
}
//@ chunk-98n6ge4d.js:6786-6821 placement
var PROJECT_TYPE_DESIGN_SYSTEM = "PROJECT_TYPE_DESIGN_SYSTEM";
//@ chunk-98n6ge4d.js:6821-6990 placement
async function listOrgProjects(e, n = {}, s) {
  let r = await designRpc(
    "ListOrgProjects",
    e,
    {
      ...(n.type && {
        type: n.type,
      }),
      ...(n.cursor && {
        cursor: n.cursor,
      }),
    },
    s,
  );
  return {
    items: r.items ?? [],
    cursor: r.cursor ?? "",
  };
}
//@ chunk-98n6ge4d.js:6990-7172 placement
async function writeDesignFiles(e, projectId, files, r = {}, i) {
  return (
    (
      await designRpc(
        "WriteFiles",
        e,
        {
          projectId,
          files,
          deduplicate: r.deduplicate ?? false,
          ...(r.deletePaths?.length && {
            deletePaths: r.deletePaths,
          }),
        },
        i,
      )
    ).files ?? []
  );
}
//@ chunk-98n6ge4d.js:7172-7238 placement
/**
 * 调 GetProject RPC 取项目信息。
 */
async function getDesignProject(e, projectId, s) {
  return designRpc(
    "GetProject",
    e,
    {
      projectId,
    },
    s,
  );
}
//@ chunk-98n6ge4d.js:7238-7554 placement
/**
 * 分页列出 Design 项目全部文件路径（最多 50 页）。
 */
async function listDesignFiles(e, projectId, s) {
  let r = [];
  let i = 0;
  for (let j = 0; j < 50; j++) {
    let c = await designRpc(
      "ListFiles",
      e,
      {
        projectId,
        depth: -1,
        ...(i > 0 && {
          offset: i,
        }),
      },
      s,
    );
    let entries = c.entries ?? [];
    for (let entry of entries) r.push(entry.path);
    if (!c.truncated || entries.length === 0) return r;
    i += entries.length;
  }
  throw new DesignRpcError("ListFiles", 0, {
    error: `pagination exceeded 50 pages (${r.length} paths)`,
  });
}
//@ chunk-98n6ge4d.js:7554-7899 placement
/**
 * 读取 Design 项目文件内容，按上限截断，返回内容类型与是否截断。
 */
async function getDesignFile(e, projectId, path, r = 262144, i) {
  let a = await designRpc(
    "GetFile",
    e,
    {
      projectId,
      path,
      raw: true,
    },
    i,
  );
  let content = a.content ?? "";
  let isBase64 = a.isBase64 ?? false;
  let h;
  let g = false;
  if (isBase64) {
    h = content;
    if (h.length > r) {
      h = h.slice(0, r);
      g = true;
    }
  } else {
    let buffer = Buffer.from(content, "base64");
    if (buffer.byteLength > r) {
      buffer = buffer.subarray(0, r);
      g = true;
    }
    h = buffer.toString("utf8");
  }
  return {
    content: h,
    contentType: a.contentType ?? "",
    isBase64,
    truncated: g,
  };
}
//@ chunk-98n6ge4d.js:7899-8019 placement
async function deleteDesignFiles(e, projectId, s, r) {
  if (s.length === 0) return 0;
  return (
    (
      await designRpc(
        "DeleteFiles",
        e,
        {
          projectId,
          paths: s,
        },
        r,
      )
    ).deleted ?? 0
  );
}
//@ chunk-98n6ge4d.js:8019-8183 placement
async function createDesignProject(e, name, s) {
  let r = await designRpc(
    "CreateProject",
    e,
    {
      name,
      type: PROJECT_TYPE_DESIGN_SYSTEM,
    },
    s,
  );
  if (!r.projectId) throw new DesignRpcError("CreateProject", 200, r);
  return {
    projectId: r.projectId,
    name,
  };
}
//@ chunk-98n6ge4d.js:8183-8379 placement
async function recordDesignAsset(e, projectId, s, r) {
  await designRpc(
    "RecordAsset",
    e,
    {
      projectId,
      name: s.name,
      path: s.path,
      ...(s.subtitle && {
        subtitle: s.subtitle,
      }),
      ...(s.viewport && {
        viewport: s.viewport,
      }),
      ...(s.group && {
        section: s.group,
      }),
    },
    r,
  );
}
//@ chunk-98n6ge4d.js:8379-8454 placement
/**
 * 调 DeleteAsset RPC 删除项目文件。
 */
async function deleteDesignAsset(e, projectId, path, r) {
  await designRpc(
    "DeleteAsset",
    e,
    {
      projectId,
      path,
    },
    r,
  );
}
//@ chunk-98n6ge4d.js:8454-8535 placement
/**
 * 把字符串里的 OAuth 令牌替换成 [redacted-oauth-token]。
 */
function redactOAuthToken(e, n) {
  if (!n) return e;
  return e.split(n).join("[redacted-oauth-token]");
}
//@ chunk-98n6ge4d.js:8535-8790 placement
class DesignRpcError extends Error {
  method;
  status;
  body;
  telemetryMessage;
  constructor(method, n, s) {
    super(`Design API ${method} failed: HTTP ${n} ${truncateErrorBody(s)}`);
    this.method = method;
    this.status = n;
    this.body = s;
    this.name = "DesignRpcError";
    this.telemetryMessage = `Design API ${method} failed: HTTP ${n}`;
  }
}
//@ chunk-98n6ge4d.js:8790-8869 placement
class DesignAuthError extends DesignRpcError {
  constructor(message, status, s) {
    super(message, status, s);
    this.name = "DesignAuthError";
  }
}
//@ chunk-98n6ge4d.js:8869-9028 placement
function truncateErrorBody(e) {
  if (e == null) return "";
  if (typeof e === "string") return e.slice(0, 200);
  try {
    return JSON.stringify(e).slice(0, 200);
  } catch {
    return String(e).slice(0, 200);
  }
}
export {
  getDesignConsentKey,
  checkDesignConsent,
  DESIGN_CONSENT_PROMPT,
  checkDesignGrant,
  setDesignConsent,
  invalidateDesignConsentCache,
  recordDesignProjectGrant,
  recordDesignConsent,
  isDesignConsentName,
  hasDesignOAuthToken,
  pollDesignGrantApproval,
  revokeDesignConsent,
  needsDesignLogin,
  DesignAuthError,
  redactOAuthToken,
  listOrgProjects,
  PROJECT_TYPE_DESIGN_SYSTEM,
  getDesignProject,
  listDesignFiles,
  getDesignFile,
  writeDesignFiles,
  deleteDesignFiles,
  recordDesignAsset,
  deleteDesignAsset,
  createDesignProject,
};
