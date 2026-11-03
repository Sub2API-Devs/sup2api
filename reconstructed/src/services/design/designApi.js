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
import { Szs, wzs, bzs, Ezs, Uze, qAe } from "../mcp/designPlanGate.js";
import { isFirstPartyProvider } from "../../utils/model/providers.js";
import { isEssentialTrafficOnly } from "../../utils/privacyLevel.js";
import { logFeatureBad, logFeatureOk, logFeatureSad } from "../analytics/featureTelemetry.js";
import { Czs, Rzs, xzs } from "../mcp/firstPartyDesignConsent.js";
import { getOAuthHeaders } from "../../utils/teleport/api.js";

//@ chunk-ty8q6r2q.js:597-629 placement
var u = ["agent_design_projects"];
//@ chunk-ty8q6r2q.js:629-687 placement
function Dan(e) {
  return typeof e === "string" && u.includes(e);
}
//@ chunk-ty8q6r2q.js:687-906 placement
function DESIGN_CONSENT_PROMPT(e) {
  switch (e) {
    case "agent_design_projects":
      return "Connect to Claude Design? Claude can read and edit your Design projects from this tool. Change anytime at claude.ai/design/settings or with /design revoke.";
  }
}
//@ chunk-ty8q6r2q.js:906-989 placement
function X1s(e) {
  ((e.consentCache = null), (e.consentFetch = null), e.consentCacheGeneration++);
}
/**
 * 生成 Claude Design API 请求的认证选项：优先用带 design 读取 scope 的 claude.ai 令牌，否则取 Design 专用令牌。
 */
//@ chunk-ty8q6r2q.js:989-1301 placement
async function designAuthOptions(credentials) {
  await checkAndRefreshOAuthTokenIfNeeded({ credentials: credentials });
  let n;
  if (isStorageV5Enabled() && credentials !== void 0) n = await getClaudeAIOAuthTokensAsync(credentials);
  else n = getClaudeAIOAuthTokens();
  let s = n?.refreshToken && n.scopes?.includes("user:design:read") ? n.accessToken : null;
  if (!s) {
    let r = await getDesignAccessToken(credentials);
    s = r.ok ? r.accessToken : (n?.accessToken ?? null);
  }
  return { auth: "none", ...(s && { headers: { Authorization: `Bearer ${s}` } }) };
}
/**
 * 预检读取 Claude Design 的同意状态（失败时返回空，后续靠 403 填充缓存）。
 */
//@ chunk-ty8q6r2q.js:1301-1632 placement
async function fetchDesignConsent(e) {
  try {
    let n = await apiClient.get("/v1/design/consent", {
      ...(await designAuthOptions(e)),
      validateStatus: (r) => r < 500,
    });
    if (!n.ok || n.status !== 200) return {};
    let s = {};
    for (let r of u) {
      let o = n.data?.[r];
      if (typeof o === "boolean") s[r] = o;
    }
    return s;
  } catch (error) {
    return (
      logForDebugging(
        `Design consent pre-flight GET failed (${errorMessage(error)}); falling back to 403-seeded cache.`,
      ),
      {}
    );
  }
}
/**
 * 更新 Design 同意缓存；撤销项目同意时同时清除相关授权缓存。
 */
//@ chunk-ty8q6r2q.js:1632-1757 placement
function setDesignConsent(state, key, value) {
  if (key === "agent_design_projects" && value === !1) (Szs(state), wzs(state), bzs(state));
  state.consentCache = { ...(state.consentCache ?? {}), [key]: value };
}
//@ chunk-ty8q6r2q.js:1757-1815 placement
async function J1s(e) {
  return !!(await readDesignOAuth(e))?.accessToken;
}
//@ chunk-ty8q6r2q.js:1815-2430 placement
async function designUnavailableReason(e) {
  if (!isFirstPartyProvider()) return { ok: !1, reason: "wrong_provider" };
  if (isEssentialTrafficOnly()) return { ok: !1, reason: "essential_traffic_only" };
  await checkAndRefreshOAuthTokenIfNeeded({ credentials: e });
  let n;
  if (isStorageV5Enabled() && e !== void 0) n = await getClaudeAIOAuthTokensAsync(e);
  else n = getClaudeAIOAuthTokens();
  if (n?.accessToken && n.refreshToken && n.scopes?.includes("user:design:read"))
    return { ok: !0, accessToken: n.accessToken, bearer: "design_scoped_login" };
  let s = await getDesignAccessToken(e);
  if (s.ok) return { ok: !0, accessToken: s.accessToken, bearer: "design_credential" };
  if (n?.accessToken)
    return {
      ok: !0,
      accessToken: n.accessToken,
      bearer: n.scopes?.includes("user:design:read") ? "design_scoped_login" : "login",
    };
  return { ok: !1, reason: s.reason, detail: s.detail };
}
//@ chunk-ty8q6r2q.js:2430-2464 placement
async function XFt(e) {
  return designUnavailableReason(e);
}
/**
 * 首次使用时拉取 Claude Design 同意状态并缓存（并发共享一次请求）；agent_design_projects 被拒时返回该键，否则 null。仅第一方且非仅必要流量。
 */
//@ chunk-ty8q6r2q.js:2464-2864 placement
async function checkDesignConsent(state, credentials) {
  if (!isFirstPartyProvider() || isEssentialTrafficOnly()) return null;
  if (state.consentCache === null) {
    let s = (state.consentFetch ??= fetchDesignConsent(credentials)),
      consentCacheGeneration = state.consentCacheGeneration,
      o = await s;
    if (state.consentCache === null && state.consentCacheGeneration === consentCacheGeneration) {
      state.consentCache = {};
      for (let a of u) {
        let i = o[a];
        if (typeof i === "boolean") setDesignConsent(state, a, i);
      }
    }
    if (state.consentFetch === s) state.consentFetch = null;
  }
  return state.consentCache?.agent_design_projects === !1 ? "agent_design_projects" : null;
}
/**
 * 判断是否需要先登录 Claude Design（第一方提供方、无 claude.ai 令牌且无 Design 令牌）。
 */
//@ chunk-ty8q6r2q.js:2864-3038 placement
async function needsDesignLogin(e) {
  if (!isFirstPartyProvider() || isEssentialTrafficOnly()) return !1;
  let n;
  if (isStorageV5Enabled() && e !== void 0) n = (await getClaudeAIOAuthTokensAsync(e))?.accessToken;
  else n = getClaudeAIOAuthTokens()?.accessToken;
  if (n) return !1;
  return !(await readDesignOAuth(e))?.accessToken;
}
//@ chunk-ty8q6r2q.js:3038-3392 placement
async function recordDesignConsent(e, n, s) {
  try {
    let post = await apiClient.post(
      "/v1/design/consent",
      { consent: n },
      { ...(await designAuthOptions(s)), validateStatus: (o) => o < 300 },
    );
    if (!post.ok)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Couldn't record Design consent (${post.reason === "no-auth" ? post.detail : post.reason}).`,
        "design consent POST blocked by policy gate",
      );
  } catch (error) {
    throw (logFeatureBad("design_consent", "post_failed"), error);
  }
  (setDesignConsent(e, n, !0), logFeatureOk("design_consent"));
}
//@ chunk-ty8q6r2q.js:3392-3761 placement
async function revokeDesignConsent(e, n, s) {
  try {
    let r = await apiClient.delete(
      "/v1/design/consent",
      { consent: n },
      { ...(await designAuthOptions(s)), validateStatus: (o) => o < 300 || o === 404 },
    );
    if (!r.ok)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Couldn't revoke Design consent (${r.reason === "no-auth" ? r.detail : r.reason}).`,
        "design consent DELETE blocked by policy gate",
      );
  } catch (error) {
    throw (logFeatureBad("design_consent", "delete_failed"), error);
  }
  (setDesignConsent(e, n, !1), logFeatureOk("design_consent"));
}
//@ chunk-ty8q6r2q.js:3761-4366 placement
async function probeDesignGrants(e) {
  try {
    let n = await apiClient.get("/v1/design/grants", {
      ...(await designAuthOptions(e)),
      validateStatus: (o) => o < 500,
    });
    if (!n.ok || n.status !== 200) {
      let o = n.ok ? n.status : 0;
      return (
        logFeatureSad("design_project_grant", o === 404 ? "probe_404_old_server" : "probe_http_error", {
          status: o,
        }),
        null
      );
    }
    let s = n.data?.grants;
    if (!Array.isArray(s)) return (logFeatureSad("design_project_grant", "probe_shape"), null);
    let r = new Set();
    for (let o of s) {
      let a = o?.project_id;
      if (typeof a === "string" && a.length > 0) r.add(a);
    }
    return r;
  } catch (error) {
    return (
      logForDebugging(
        `Design project-grant probe failed (${errorMessage(error)}); falling back to the per-batch plan flow.`,
      ),
      logFeatureSad("design_project_grant", "probe_network"),
      null
    );
  }
}
/**
 * 检查 Design 项目授权：合并并发探测，返回已授权、未授权或不可用。
 */
//@ chunk-ty8q6r2q.js:4366-4557 placement
async function checkDesignGrant(e, n, s) {
  let r = (e.grantsFetch ??= probeDesignGrants(s));
  try {
    let o = await r;
    if (o === null) return "unavailable";
    return o.has(n) ? "granted" : "notGranted";
  } finally {
    if (e.grantsFetch === r) e.grantsFetch = null;
  }
}
//@ chunk-ty8q6r2q.js:4557-5335 placement
async function recordDesignProjectGrant(e, n, s) {
  let r;
  try {
    let post = await apiClient.post(
      "/v1/design/grants",
      { project_id: n },
      { ...(await designAuthOptions(s)), validateStatus: (a) => a < 300 || a === 404 },
    );
    if (!post.ok)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Couldn't record the Design project write grant (${post.reason === "no-auth" ? post.detail : post.reason}).`,
        "design project grant POST blocked by policy gate",
      );
    r = post.status;
  } catch (error) {
    throw (logFeatureBad("design_project_grant", "post_failed"), error);
  }
  if (r === 404)
    throw (
      Ezs(e, n),
      logFeatureBad("design_project_grant", "mint_refused_404"),
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        "This project cannot hold a durable write grant for this account (it may be shared from another organization, or not viewable) \u2014 use finalize_plan with writes/deletes and pass the returned plan_token for writes to this project.",
        "design project grant mint refused for this project",
      )
    );
  (Uze(e, n), logFeatureOk("design_project_grant"));
}
//@ chunk-ty8q6r2q.js:5335-6111 placement
function pollDesignGrantApproval(e, n, s) {
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
      return (
        logForDebugging(`Server-approval watcher poll failed (${errorMessage(error)}); will poll again.`),
        null
      );
    }
    if (!Array.isArray(a)) return null;
    for (let i of a) {
      let c = i;
      if (c?.project_id !== n) continue;
      let p = typeof c.created_at === "string" ? Date.parse(c.created_at) : NaN;
      if (Number.isNaN(p)) return null;
      return { present: !0, createdAtMs: p };
    }
    return { present: !1 };
  }
  return {
    async poll() {
      let a = await o();
      if (a === null) return !1;
      if (r === null) return ((r = { createdAtMs: a.present ? a.createdAtMs : null }), !1);
      if (!a.present) return !1;
      if (!(r.createdAtMs === null || a.createdAtMs > r.createdAtMs)) return !1;
      if (qAe(e, n)) return !1;
      return (Uze(e, n), !0);
    },
  };
}
//@ chunk-ty8q6r2q.js:6111-6118 placement
Czs(designUnavailableReason);
//@ chunk-ty8q6r2q.js:6118-6148 placement
Rzs(async (e) => !!(await readDesignOAuth(e)));
//@ chunk-ty8q6r2q.js:6148-6267 placement
xzs({
  wouldNeedDesignConsent: checkDesignConsent,
  consentPromptFor: DESIGN_CONSENT_PROMPT,
  postDesignConsent: recordDesignConsent,
  seedDesignConsentBit: setDesignConsent,
  isConsentBit: Dan,
});
//@ chunk-98n6ge4d.js:6335-6391 placement
var Fe = "anthropic.omelette.api.v1alpha.OmeletteService";
/**
 * 调 Claude Design 同步 RPC（POST /<前缀>/<方法>）：401/403 抛 DesignAuthError，其他非 2xx 抛 DesignRpcError，返回响应数据。
 */
//@ chunk-98n6ge4d.js:6391-6786 placement
async function designRpc(method, token, body, signal) {
  let post = await apiClient.post(`/${Fe}/${method}`, body, {
    auth: "none",
    headers: { ...getOAuthHeaders(token), "X-Anthropic-Client": "claude-cli-design-sync" },
    timeout: 60000,
    maxBodyLength: 33554432,
    validateStatus: () => !0,
    signal: signal,
  });
  if (!post.ok) throw new DesignRpcError(method, 0, { error: post.reason });
  if (post.status === 401 || post.status === 403) throw new DesignAuthError(method, post.status, post.data);
  if (post.status < 200 || post.status >= 300) throw new DesignRpcError(method, post.status, post.data);
  return post.data;
}
//@ chunk-98n6ge4d.js:6786-6821 placement
var PROJECT_TYPE_DESIGN_SYSTEM = "PROJECT_TYPE_DESIGN_SYSTEM";
//@ chunk-98n6ge4d.js:6821-6990 placement
async function listOrgProjects(e, n = {}, s) {
  let r = await designRpc(
    "ListOrgProjects",
    e,
    { ...(n.type && { type: n.type }), ...(n.cursor && { cursor: n.cursor }) },
    s,
  );
  return { items: r.items ?? [], cursor: r.cursor ?? "" };
}
//@ chunk-98n6ge4d.js:6990-7172 placement
async function writeDesignFiles(e, n, s, r = {}, i) {
  return (
    (
      await designRpc(
        "WriteFiles",
        e,
        {
          projectId: n,
          files: s,
          deduplicate: r.deduplicate ?? !1,
          ...(r.deletePaths?.length && { deletePaths: r.deletePaths }),
        },
        i,
      )
    ).files ?? []
  );
}
//@ chunk-98n6ge4d.js:7172-7238 placement
async function ae(e, n, s) {
  return designRpc("GetProject", e, { projectId: n }, s);
}
/**
 * 分页列出 Design 项目全部文件路径（最多 50 页）。
 */
//@ chunk-98n6ge4d.js:7238-7554 placement
async function listDesignFiles(e, n, s) {
  let r = [],
    i = 0;
  for (let a = 0; a < 50; a++) {
    let c = await designRpc("ListFiles", e, { projectId: n, depth: -1, ...(i > 0 && { offset: i }) }, s),
      l = c.entries ?? [];
    for (let h of l) r.push(h.path);
    if (!c.truncated || l.length === 0) return r;
    i += l.length;
  }
  throw new DesignRpcError("ListFiles", 0, { error: `pagination exceeded 50 pages (${r.length} paths)` });
}
/**
 * 读取 Design 项目文件内容，按上限截断，返回内容类型与是否截断。
 */
//@ chunk-98n6ge4d.js:7554-7899 placement
async function getDesignFile(e, n, s, r = 262144, i) {
  let a = await designRpc("GetFile", e, { projectId: n, path: s, raw: !0 }, i),
    c = a.content ?? "",
    l = a.isBase64 ?? !1,
    h,
    g = !1;
  if (l) {
    if (((h = c), h.length > r)) ((h = h.slice(0, r)), (g = !0));
  } else {
    let buffer = Buffer.from(c, "base64");
    if (buffer.byteLength > r) ((buffer = buffer.subarray(0, r)), (g = !0));
    h = buffer.toString("utf8");
  }
  return { content: h, contentType: a.contentType ?? "", isBase64: l, truncated: g };
}
//@ chunk-98n6ge4d.js:7899-8019 placement
async function deleteDesignFiles(e, n, s, r) {
  if (s.length === 0) return 0;
  return (await designRpc("DeleteFiles", e, { projectId: n, paths: s }, r)).deleted ?? 0;
}
//@ chunk-98n6ge4d.js:8019-8183 placement
async function createDesignProject(e, n, s) {
  let r = await designRpc("CreateProject", e, { name: n, type: PROJECT_TYPE_DESIGN_SYSTEM }, s);
  if (!r.projectId) throw new DesignRpcError("CreateProject", 200, r);
  return { projectId: r.projectId, name: n };
}
//@ chunk-98n6ge4d.js:8183-8379 placement
async function recordDesignAsset(e, n, s, r) {
  await designRpc(
    "RecordAsset",
    e,
    {
      projectId: n,
      name: s.name,
      path: s.path,
      ...(s.subtitle && { subtitle: s.subtitle }),
      ...(s.viewport && { viewport: s.viewport }),
      ...(s.group && { section: s.group }),
    },
    r,
  );
}
//@ chunk-98n6ge4d.js:8379-8454 placement
async function ue(e, n, s, r) {
  await designRpc("DeleteAsset", e, { projectId: n, path: s }, r);
}
//@ chunk-98n6ge4d.js:8454-8535 placement
function me(e, n) {
  if (!n) return e;
  return e.split(n).join("[redacted-oauth-token]");
}
//@ chunk-98n6ge4d.js:8535-8790 placement
class DesignRpcError extends Error {
  method;
  status;
  body;
  telemetryMessage;
  constructor(e, n, s) {
    super(`Design API ${e} failed: HTTP ${n} ${truncateErrorBody(s)}`);
    this.method = e;
    this.status = n;
    this.body = s;
    ((this.name = "DesignRpcError"), (this.telemetryMessage = `Design API ${e} failed: HTTP ${n}`));
  }
}
//@ chunk-98n6ge4d.js:8790-8869 placement
class DesignAuthError extends DesignRpcError {
  constructor(e, n, s) {
    super(e, n, s);
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
  XFt,
  checkDesignConsent,
  DESIGN_CONSENT_PROMPT,
  checkDesignGrant,
  setDesignConsent,
  X1s,
  recordDesignProjectGrant,
  recordDesignConsent,
  Dan,
  J1s,
  pollDesignGrantApproval,
  revokeDesignConsent,
  needsDesignLogin,
  DesignAuthError,
  me,
  listOrgProjects,
  PROJECT_TYPE_DESIGN_SYSTEM,
  ae,
  listDesignFiles,
  getDesignFile,
  writeDesignFiles,
  deleteDesignFiles,
  recordDesignAsset,
  ue,
  createDesignProject,
};
