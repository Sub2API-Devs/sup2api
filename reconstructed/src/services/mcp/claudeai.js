/**
 * services/mcp/claudeai.ts
 *
 * claude.ai 连接器（托管 MCP 服务器）的获取与代理
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/mcp/claudeai.ts
 * pieces: chunk-0qx6sn4e.js (25)
 * attribution: placement 13, fingerprint 2, layout 9, file-local 1
 */
import { ht } from "./cliOwnedClients.js";
import { sequential } from "../../utils/sequential.js";
import { ToolPermissionValueSchema, isPluginServerConfig } from "./types.js";
import { isEnvDefinedFalsy } from "../../utils/envUtils.js";
import { hasDisableClaudeAiConnectors } from "../../utils/settings/settings.js";
import { logForDebugging } from "../../utils/debug.js";
import { logEvent } from "../analytics/index.js";
import { lit, fromNumberOpt } from "../analytics/safeMetadata.js";
import { isCustomizationDisabled } from "../../utils/settings/customizationDisabled.js";
import { isFirstPartyProvider } from "../../utils/model/providers.js";
import {
  isClaudeAISubscriber,
  getClaudeAIOAuthTokens,
  checkAndRefreshOAuthTokenIfNeeded,
  getOauthAccountInfo,
} from "../../utils/auth.js";
import { env } from "../../utils/env.js";
import { getOauthConfig } from "../../constants/oauth.js";
import { withOAuth401Retry, claudeCodeUserAgent } from "../../utils/http.js";
import { Dt } from "../../../vendor/axios/dist/esm/axios.js";
import { Axn } from "../../utils/betas.js";
import {
  buildClientCapabilitiesHeader,
  CLAUDEAI_FETCH_TIMEOUT_MS,
  CLAUDEAI_FETCH_MAX_ATTEMPTS,
  CLAUDEAI_RETRY_BASE_MS,
  CLAUDEAI_RETRY_FACTOR,
  CLAUDEAI_RETRY_BUDGET_MS,
  RETRYABLE_NETWORK_CODES,
  EN,
} from "./mcpClientCapabilities.js";
import { isTransientNetworkError_2 } from "../../utils/teleport/api.js";
import { backoffDelayMs, sleep } from "../../utils/sleep.js";
import { CLAUDE_AI } from "./firstPartyServerIds.js";
import { normalizeNameForMCP, CLAUDE_AI as CLAUDE_AI_2 } from "./normalization.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../analytics/featureTelemetry.js";
import { sanitizedConnectionCodeForTelemetry } from "../../utils/errors.js";
import { saveGlobalConfig, getGlobalConfig } from "../../utils/config.js";
import { stringArray } from "../../utils/collections.js";

//@ chunk-0qx6sn4e.js:3725-3798 placement
function F6o(e) {
  return ht().claudeAiConfigsFetchTransientFailures.has(e);
}
//@ chunk-0qx6sn4e.js:3798-3890 placement
function U6o() {
  let e = ht(),
    pendingCrossOrgNotice = e.pendingCrossOrgNotice;
  return ((e.pendingCrossOrgNotice = void 0), pendingCrossOrgNotice);
}
/**
 * 把 claude.ai 连接器的通知（错误或警告）写到标准错误。
 */
//@ chunk-0qx6sn4e.js:3890-4035 placement
function printClaudeAiConnectorNotice() {
  let e = U6o();
  if (!e) return;
  let n = e.level === "error" ? sequential.red(e.message) : sequential.yellow(`\u26A0 ${e.message}`);
  process.stderr.write(`${n}
`);
}
//@ chunk-0qx6sn4e.js:4035-4271 placement
function connectorMaxPermissions(e) {
  let create = Object.create(null);
  for (let o of e ?? []) {
    if (o.effective_max_permission === void 0) continue;
    let safeParse = ToolPermissionValueSchema().safeParse(o.effective_max_permission);
    create[o.name] = safeParse.success ? safeParse.data : "blocked";
  }
  return Object.keys(create).length > 0 ? create : void 0;
}
//@ chunk-0qx6sn4e.js:4271-4347 placement
function G(e) {
  try {
    return new URL(e).href.replace(/\/+$/, "");
  } catch {
    return e;
  }
}
/**
 * 获取 claude.ai 连接器配置，同一会话内只发起一次请求。
 */
//@ chunk-0qx6sn4e.js:4347-4466 placement
function fetchClaudeAiConfigsOnce(e) {
  let n = ht();
  if (n.claudeAiConfigsFetch === null) n.claudeAiConfigsFetch = fetchClaudeAIMcpConfigsIfEligible(e);
  return n.claudeAiConfigsFetch;
}
/**
 * fetchClaudeAIMcpConfigsIfEligible：拉取 claude.ai 组织连接器列表（GET {BASE_API_URL}/v1/mcp_servers?limit=1000&include_additional_installs=true）。依次检查 ENABLE_CLAUDEAI_MCP_SERVERS、disableClaudeAiConnectors、安全模式、一方提供商、API key 优先、user:mcp_servers 作用域；瞬时错误按退避重试，非 401/429 错误时去掉 include_additional_installs 再试一次。结果转成 "claude.ai <显示名>" 的 claudeai-proxy 配置（含 stateless、cached_init/discover、discoverSupport 等），显示名冲突加 (2)。
 */
//@ chunk-0qx6sn4e.js:4466-9777 fingerprint = fetchClaudeAIMcpConfigsIfEligible (0.42)
async function fetchClaudeAIMcpConfigsIfEligible(credentials) {
  let attempts = 0,
    state = ht();
  state.pendingCrossOrgNotice = void 0;
  let settled = !1,
    claudeAiConnectorListGeneration = state.claudeAiConnectorListGeneration,
    fetchSeq = ++state.claudeAiConnectorListFetchSeq;
  try {
    let l = isEnvDefinedFalsy(process.env.ENABLE_CLAUDEAI_MCP_SERVERS),
      E = hasDisableClaudeAiConnectors();
    if (l || E)
      return (
        logForDebugging(`[claudeai-mcp] Disabled via ${l ? "env var" : "disableClaudeAiConnectors setting"}`),
        logEvent("tengu_claudeai_mcp_eligibility", {
          state: l ? lit("disabled_env_var") : lit("disabled_setting"),
        }),
        {}
      );
    if (isCustomizationDisabled("mcpClaudeAi"))
      return (
        logForDebugging("[claudeai-mcp] Disabled in safe mode"),
        logEvent("tengu_claudeai_mcp_eligibility", { state: lit("safe_mode") }),
        {}
      );
    if (!isFirstPartyProvider())
      return (
        logForDebugging("[claudeai-mcp] Disabled on third-party provider"),
        logEvent("tengu_claudeai_mcp_eligibility", { state: lit("third_party_provider") }),
        {}
      );
    if (!isClaudeAISubscriber()) {
      if (
        (logForDebugging("[claudeai-mcp] Disabled: API-key auth precedence active"),
        logEvent("tengu_claudeai_mcp_eligibility", { state: lit("api_key_precedence") }),
        getClaudeAIOAuthTokens()?.scopes?.includes("user:mcp_servers"))
      )
        state.pendingCrossOrgNotice = {
          level: "warn",
          message:
            "claude.ai connectors are disabled because ANTHROPIC_API_KEY or another auth source is set and takes precedence over your claude.ai login \xB7 Unset it to load your organization's connectors",
        };
      return {};
    }
    await checkAndRefreshOAuthTokenIfNeeded({ credentials: credentials });
    let d = getClaudeAIOAuthTokens();
    if (!d?.accessToken)
      return (
        logForDebugging("[claudeai-mcp] No access token"),
        logEvent("tengu_claudeai_mcp_eligibility", { state: lit("no_oauth_token") }),
        {}
      );
    if (!d.scopes?.includes("user:mcp_servers")) {
      let s = env.CLAUDE_CODE_REMOTE_ENVIRONMENT_TYPE
        ? "[claudeai-mcp] inference token lacks user:mcp_servers scope \u2014 claude.ai org connectors disabled (locally-configured MCP servers in managed-mcp.json / .claude.json / .mcp.json are NOT affected by this check)"
        : `[claudeai-mcp] Missing user:mcp_servers scope (scopes=${d.scopes?.join(",") || "none"})`;
      return (
        logForDebugging(s),
        logEvent("tengu_claudeai_mcp_eligibility", { state: lit("missing_scope") }),
        {}
      );
    }
    let baseUrl = `${getOauthConfig().BASE_API_URL}/v1/mcp_servers?limit=1000`,
      url = `${baseUrl}&include_additional_installs=true`;
    logForDebugging(`[claudeai-mcp] Fetching from ${url}`);
    let fetchConnectorList = () =>
        withOAuth401Retry(
          () =>
            Dt.get(url, {
              headers: {
                "User-Agent": claudeCodeUserAgent(),
                Authorization: `Bearer ${getClaudeAIOAuthTokens()?.accessToken ?? d.accessToken}`,
                "Content-Type": "application/json",
                "anthropic-beta": Axn.header,
                "anthropic-version": "2023-06-01",
                ...buildClientCapabilitiesHeader(),
              },
              timeout: CLAUDEAI_FETCH_TIMEOUT_MS,
            }),
          { credentials: credentials },
        ),
      now = Date.now(),
      nonTransientRetries = 0,
      response;
    while (!0) {
      attempts++;
      try {
        response = await fetchConnectorList();
        break;
      } catch (error) {
        let u = Dt.isAxiosError(error) ? error.response?.status : void 0,
          A = () => {
            if (url === baseUrl || u === void 0 || u === 401 || u === 429) return !1;
            if (
              (logForDebugging(
                `[claudeai-mcp] Connector list request got HTTP ${u}, asking once more without include_additional_installs (a connector's additional accounts will not be listed)`,
              ),
              (url = baseUrl),
              !isTransientNetworkError_2(error))
            )
              nonTransientRetries++;
            return !0;
          },
          S = attempts - nonTransientRetries;
        if (S >= CLAUDEAI_FETCH_MAX_ATTEMPTS || !isTransientNetworkError_2(error)) {
          if (A()) continue;
          throw error;
        }
        let h = backoffDelayMs({ attempt: S, baseMs: CLAUDEAI_RETRY_BASE_MS, factor: CLAUDEAI_RETRY_FACTOR });
        if (Date.now() - now + h + CLAUDEAI_FETCH_TIMEOUT_MS >= CLAUDEAI_RETRY_BUDGET_MS) {
          if ((logForDebugging(`[claudeai-mcp] Retry budget exhausted after ${attempts} attempt(s)`), A()))
            continue;
          throw error;
        }
        let z = Dt.isAxiosError(error) ? (error.response?.status ?? error.code ?? "unknown") : "unknown";
        (logForDebugging(
          `[claudeai-mcp] Transient fetch error (${z}), retrying in ${h}ms (attempt ${S}/${CLAUDEAI_FETCH_MAX_ATTEMPTS})`,
        ),
          await sleep(h));
      }
    }
    let usedNormalizedNames = new Map(),
      additionalInstalls = [];
    for (let server of response.data.data) {
      if (server.additional_install === !0) {
        additionalInstalls.push(server);
        continue;
      }
      let u = G(server.url),
        A = usedNormalizedNames.get(u);
      if (A) {
        logForDebugging(
          `[claudeai-mcp] Dropping duplicate upstream ${u}: keeping ${A.id}, dropping ${server.id}`,
        );
        continue;
      }
      usedNormalizedNames.set(u, server);
    }
    let configs = {},
      usedNormalized = new Set([CLAUDE_AI]);
    additionalInstalls.sort(
      (s, u) =>
        (Date.parse(s.created_at) || 0) - (Date.parse(u.created_at) || 0) ||
        (s.id < u.id ? -1 : s.id > u.id ? 1 : 0),
    );
    for (let s of [...usedNormalizedNames.values(), ...additionalInstalls]) {
      let baseName = `claude.ai ${s.display_name}`,
        finalName = baseName,
        finalNormalized = normalizeNameForMCP(finalName),
        count = 1;
      while (usedNormalized.has(finalNormalized))
        (count++, (finalName = `${baseName} (${count})`), (finalNormalized = normalizeNameForMCP(finalName)));
      if (count > 1)
        logForDebugging(`[claudeai-mcp] Display-name collision: "${finalName}" (${s.id}, ${s.url})`);
      (usedNormalized.add(finalNormalized),
        (configs[finalName] = {
          type: "claudeai-proxy",
          url: s.url,
          id: s.id,
          displayName: s.display_name,
          iconUrl: s.icon_url,
          scope: "claudeai",
          toolPermissions: connectorMaxPermissions(s.tools),
          stateless: s.stateless,
          cachedInitResponse: s.cached_init_response,
          discoverSupport: s.discover_support,
          cachedDiscoverResponse: s.cached_discover_response,
          eligible: s.eligible,
          ineligibleReason: s.eligibility_reason,
          enterpriseManaged: s.enterprise_managed,
        }));
    }
    if (
      (logForDebugging(`[claudeai-mcp] Fetched ${Object.keys(configs).length} servers`),
      logEvent("tengu_claudeai_mcp_eligibility", { state: lit("eligible") }),
      url === baseUrl)
    )
      logFeatureSad("mcp_claudeai_fetch_configs", "fetch_additional_installs_param_refused");
    else logFeatureOk("mcp_claudeai_fetch_configs");
    if (
      state.claudeAiConnectorListGeneration === claudeAiConnectorListGeneration &&
      fetchSeq > state.claudeAiConnectorListSettledSeq
    )
      ((state.claudeAiConnectorIdIndex = buildConnectorIdIndex(
        configs,
        response.data.data,
        usedNormalizedNames,
      )),
        (state.claudeAiConnectorListStatus = "settled"),
        (state.claudeAiConnectorListSettledSeq = fetchSeq),
        (settled = !0));
    return configs;
  } catch (error) {
    let E = Dt.isAxiosError(error) ? error : void 0,
      d = E?.response?.status,
      I = E?.code,
      p = String(d ?? I ?? "unknown");
    if (
      (logForDebugging(`[claudeai-mcp] Fetch failed (${p}) after ${attempts} attempt(s)`),
      logEvent("tengu_claudeai_mcp_eligibility", {
        state: lit("fetch_failed"),
        status: fromNumberOpt(d) ?? sanitizedConnectionCodeForTelemetry(I) ?? lit("unknown"),
        attempts: attempts,
      }),
      p === "401" || p === "403")
    )
      logFeatureSad("mcp_claudeai_fetch_configs", "fetch_needs_auth");
    else if (p === "429") logFeatureSad("mcp_claudeai_fetch_configs", "fetch_rate_limited");
    else if (p === "ECONNABORTED" || p === "ETIMEDOUT")
      logFeatureSad("mcp_claudeai_fetch_configs", "fetch_timeout");
    else if (/^\d+$/.test(p)) logFeatureBad("mcp_claudeai_fetch_configs", `fetch_failed_http_${p}`);
    else if (p !== "unknown") logFeatureSad("mcp_claudeai_fetch_configs", "fetch_network_error");
    else logFeatureBad("mcp_claudeai_fetch_configs", "fetch_failed");
    state.claudeAiConfigsFetch = null;
    let y =
        E !== void 0 &&
        (d !== void 0 ? (d >= 500 && d < 600) || d === 429 : I !== void 0 && RETRYABLE_NETWORK_CODES.has(I)),
      R = {};
    if (y) state.claudeAiConfigsFetchTransientFailures.add(R);
    return R;
  } finally {
    if (
      !settled &&
      state.claudeAiConnectorListGeneration === claudeAiConnectorListGeneration &&
      state.claudeAiConnectorListStatus !== "settled"
    )
      state.claudeAiConnectorListStatus = "unavailable";
  }
}
/**
 * buildConnectorIdIndex：建立连接器 id → {name, config, siblingIds} 索引，additional_install 条目按相同上游 URL 挂到主连接器下。
 */
//@ chunk-0qx6sn4e.js:9777-10132 layout
function buildConnectorIdIndex(configs, listedServers, primaryByUrl) {
  let r = new Map(),
    c = new Map();
  for (let [C, l] of Object.entries(configs)) {
    if (l.type !== "claudeai-proxy") continue;
    let E = { name: C, config: l, siblingIds: [l.id] };
    (c.set(l.id, E), r.set(O$e(l.id), E));
  }
  for (let C of listedServers) {
    let l = O$e(C.id);
    if (r.has(l)) continue;
    let E = primaryByUrl.get(G(C.url)),
      d = E === void 0 ? void 0 : c.get(E.id);
    if (d !== void 0) (d.siblingIds.push(C.id), r.set(l, d));
  }
  return r;
}
/**
 * 清空 claude.ai 连接器列表的进行中请求缓存与待显示的跨组织提示，使下次重新拉取。
 */
//@ chunk-0qx6sn4e.js:10132-10217 layout
function clearClaudeAiConfigsFetch() {
  let e = ht();
  ((e.claudeAiConfigsFetch = null), (e.pendingCrossOrgNotice = void 0));
}
/**
 * lookupClaudeAiConnectorById：按连接器 id 查索引，列表未就绪返回 pending/unavailable，找不到返回 absent。
 */
//@ chunk-0qx6sn4e.js:10217-10495 layout
function lookupClaudeAiConnectorById(e) {
  let n = ht(),
    claudeAiConnectorIdIndex = n.claudeAiConnectorIdIndex;
  if (n.claudeAiConnectorListStatus !== "settled" || claudeAiConnectorIdIndex === void 0)
    return n.claudeAiConnectorListStatus === "unavailable" ? { kind: "unavailable" } : { kind: "pending" };
  let r = claudeAiConnectorIdIndex.get(O$e(e));
  return r === void 0 ? { kind: "absent" } : { kind: "found", ...r };
}
/**
 * 把 claude.ai 连接器列表状态标为 unavailable（已 settled 的不覆盖），用于拉取失败时让界面显示不可用。
 */
//@ chunk-0qx6sn4e.js:10495-10610 layout
function markConnectorListUnavailable() {
  let e = ht();
  if (e.claudeAiConnectorListStatus !== "settled") e.claudeAiConnectorListStatus = "unavailable";
}
/**
 * resetConnectorIdIndex：清空连接器索引并把状态置回 pending，代际 +1。
 */
//@ chunk-0qx6sn4e.js:10610-10782 layout
function resetConnectorIdIndex() {
  let e = ht();
  ((e.claudeAiConnectorIdIndex = void 0),
    (e.claudeAiConnectorListStatus = "pending"),
    (e.claudeAiConnectorListSettledSeq = 0),
    (e.claudeAiConnectorListGeneration += 1));
}
/**
 * recordClaudeAiMcpConnected：记入本会话已连接集合，并持久化到全局配置 claudeAiMcpEverConnected。
 */
//@ chunk-0qx6sn4e.js:10782-10938 file-local
function recordClaudeAiMcpConnected(e, n) {
  (ht().claudeAiConnectedThisSession.add(e),
    saveGlobalConfig((o) => {
      let r = getEverConnectedClaudeAiMcps(o);
      if (r.includes(e)) return o;
      return { ...o, claudeAiMcpEverConnected: [...r, e] };
    }, n));
}
/**
 * isClaudeAiMcpConnectedThisSession：本会话是否连上过该 claude.ai 连接器。
 */
//@ chunk-0qx6sn4e.js:10938-11002 layout
function isClaudeAiMcpConnectedThisSession(e) {
  return ht().claudeAiConnectedThisSession.has(e);
}
/**
 * 清空"本会话已连接过的 claude.ai 连接器"集合并重置连接器 id 索引（登录账号切换等场景）。
 */
//@ chunk-0qx6sn4e.js:11002-11064 layout
function resetClaudeAiSessionConnections() {
  (ht().claudeAiConnectedThisSession.clear(), resetConnectorIdIndex());
}
/**
 * hasClaudeAiMcpEverConnected：全局配置里是否记录该连接器曾连接过。
 */
//@ chunk-0qx6sn4e.js:11064-11107 layout
function hasClaudeAiMcpEverConnected(e) {
  return getEverConnectedClaudeAiMcps(getGlobalConfig()).includes(e);
}
/**
 * 返回全局配置中记录的"曾经连上过的 claude.ai 连接器"名字集合（Set）。
 */
//@ chunk-0qx6sn4e.js:11107-11146 layout
function getEverConnectedClaudeAiMcpSet() {
  return new Set(getEverConnectedClaudeAiMcps(getGlobalConfig()));
}
//@ chunk-0qx6sn4e.js:11146-11198 fingerprint = markClaudeAiMcpConnected (1)
function getEverConnectedClaudeAiMcps(name) {
  return stringArray(name.claudeAiMcpEverConnected);
}
//@ chunk-0qx6sn4e.js:11198-11267 placement
function getConnectorsSettingsUrl() {
  return `${getOauthConfig().CLAUDE_AI_ORIGIN}/customize/connectors`;
}
//@ chunk-0qx6sn4e.js:11267-11357 placement
function O$e(e) {
  return typeof e === "string" && e.startsWith("mcprs") ? `mcpsrv${e.slice(5)}` : e;
}
//@ chunk-0qx6sn4e.js:11357-11450 placement
function gH(e) {
  return e.type === "claudeai-proxy" && e.scope === "claudeai" && e.id ? O$e(e.id) : void 0;
}
/**
 * 生成 claude.ai 连接器的授权地址（组织 id、连接器 id 与产品入口）。
 */
//@ chunk-0qx6sn4e.js:11450-11691 placement
function claudeAiConnectorAuthUrl(e) {
  let n = getOauthAccountInfo()?.organizationUuid;
  if (!n || !e.id) return null;
  let CLAUDE_AI_ORIGIN = getOauthConfig().CLAUDE_AI_ORIGIN,
    r = O$e(e.id),
    c = encodeURIComponent(env.CLAUDE_CODE_ENTRYPOINT || "cli");
  return `${CLAUDE_AI_ORIGIN}/api/organizations/${n}/mcp/start-auth/${r}?product_surface=${c}`;
}
//@ chunk-0qx6sn4e.js:11691-11769 placement
function qq(e, n) {
  return normalizeNameForMCP(e).startsWith(CLAUDE_AI_2) && n.scope !== "claudeai" && !_6r(e, n);
}
/**
 * 判断 MCP 工具调用是否需要连接器授权：旧授权被拒（插件来源或未豁免），或服务器需要逐次授权。
 */
//@ chunk-0qx6sn4e.js:11769-11979 placement
function requiresConnectorGrant(e) {
  return (
    e.mcpInfo !== void 0 &&
    e.mcpInfo.isAuthStub !== !0 &&
    ((e.mcpInfo.legacyGrantRefused === !0 &&
      (e.mcpInfo.source === "plugin" || !_6r(e.mcpInfo.serverName, e.mcpInfo))) ||
      qq(e.mcpInfo.serverName, e.mcpInfo))
  );
}
//@ chunk-0qx6sn4e.js:11979-12047 placement
function _6r(e, n) {
  return n.scope === "dynamic" && !isPluginServerConfig(n) && !EN.minted(e);
}

export {
  requiresConnectorGrant,
  O$e,
  lookupClaudeAiConnectorById,
  fetchClaudeAiConfigsOnce,
  printClaudeAiConnectorNotice,
  qq,
  gH,
  recordClaudeAiMcpConnected,
  claudeAiConnectorAuthUrl,
  hasClaudeAiMcpEverConnected,
  isClaudeAiMcpConnectedThisSession,
  markConnectorListUnavailable,
  clearClaudeAiConfigsFetch,
  resetClaudeAiSessionConnections,
  F6o,
  U6o,
  getEverConnectedClaudeAiMcpSet,
  getConnectorsSettingsUrl,
  _6r,
};
