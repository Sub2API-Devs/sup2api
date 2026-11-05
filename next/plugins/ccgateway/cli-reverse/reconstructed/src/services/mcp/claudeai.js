/**
 * services/mcp/claudeai.ts
 *
 * claude.ai 连接器（托管 MCP 服务器）的获取与代理
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/mcp/claudeai.ts
 * pieces: chunk-06vyq63w.js (29)
 * attribution: placement 13, fingerprint 2, layout 13, file-local 1
 */
import { getCliOwnedState } from "./cliOwnedClients.js";
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
import { axios_default } from "../../../vendor/axios/dist/esm/axios.js";
import { BETA_MCP_SERVERS } from "../../utils/betas.js";
import {
  buildClientCapabilitiesHeader,
  CLAUDEAI_FETCH_TIMEOUT_MS,
  CLAUDEAI_FETCH_MAX_ATTEMPTS,
  CLAUDEAI_RETRY_BASE_MS,
  CLAUDEAI_RETRY_FACTOR,
  CLAUDEAI_RETRY_BUDGET_MS,
  RETRYABLE_NETWORK_CODES,
  moduleStore,
} from "./mcpClientCapabilities.js";
import { isTransientNetworkError_2 } from "../../utils/teleport/api.js";
import { backoffDelayMs, sleep } from "../../utils/sleep.js";
import { ARTIFACTS_SERVER_NAME } from "./firstPartyServerIds.js";
import { CLAUDEAI_SERVER_PREFIX, CLAUDE_AI } from "./normalization.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../analytics/featureTelemetry.js";
import { recordConnectors, dropConnectorIndex } from "../api/connectorFields.js";
import { sanitizedConnectionCodeForTelemetry } from "../../utils/errors.js";
import { saveGlobalConfig, getGlobalConfig } from "../../utils/config.js";
import { stringArray } from "../../utils/collections.js";
import {
  enforcesGrants,
  ownsLegacyKey,
  isLegacyKeyUnclaimed,
  mayRecordServerOwner,
} from "./serverIdentity.js";
import {
  PROMPT_TOOL_ALLOW_IMITATOR_DENY_REASON,
  PROMPT_TOOL_ALLOW_SHARED_NAME_DENY_REASON,
  PROMPT_TOOL_ALLOW_REFUSED_GRANT_DENY_REASON,
} from "../../types/permissions.js";

//@ chunk-06vyq63w.js:3403-3476 placement
/**
 * 该服务器是否记录过 claude.ai 配置拉取的暂时失败。
 */
function hasTransientConfigFailure(flag) {
  return getCliOwnedState().claudeAiConfigsFetchTransientFailures.has(flag);
}
//@ chunk-06vyq63w.js:3476-3568 placement
/**
 * 取出并清空待显示的跨组织提示。
 */
function takePendingCrossOrgNotice() {
  let cliOwnedState = getCliOwnedState();
  let pendingCrossOrgNotice = cliOwnedState.pendingCrossOrgNotice;
  cliOwnedState.pendingCrossOrgNotice = undefined;
  return pendingCrossOrgNotice;
}
//@ chunk-06vyq63w.js:3568-3713 placement
/**
 * 把 claude.ai 连接器的通知（错误或警告）写到标准错误。
 */
function printClaudeAiConnectorNotice() {
  let notice = takePendingCrossOrgNotice();
  if (!notice) return;
  let line =
    notice.level === "error" ? sequential.red(notice.message) : sequential.yellow(`\u26A0 ${notice.message}`);
  process.stderr.write(`${line}
`);
}
//@ chunk-06vyq63w.js:3713-3949 placement
function connectorMaxPermissions(tools) {
  let permissions = Object.create(null);
  for (let tool of tools ?? []) {
    if (tool.effective_max_permission === undefined) continue;
    let parsed = ToolPermissionValueSchema().safeParse(tool.effective_max_permission);
    permissions[tool.name] = parsed.success ? parsed.data : "blocked";
  }
  return Object.keys(permissions).length > 0 ? permissions : undefined;
}
//@ chunk-06vyq63w.js:3949-4025 placement
/**
 * 规范化 URL（去掉结尾斜杠），解析失败原样返回。
 */
function normalizeUrlNoTrailingSlash(url) {
  try {
    return new URL(url).href.replace(/\/+$/, "");
  } catch {
    return url;
  }
}
//@ chunk-06vyq63w.js:4025-4143 placement
/**
 * 获取 claude.ai 连接器配置，同一会话内只发起一次请求。
 */
function fetchClaudeAiConfigsOnce(credentials) {
  let cliOwnedState = getCliOwnedState();
  if (cliOwnedState.claudeAiConfigsFetch === null)
    cliOwnedState.claudeAiConfigsFetch = fetchClaudeAIMcpConfigsIfEligible(credentials);
  return cliOwnedState.claudeAiConfigsFetch;
}
//@ chunk-06vyq63w.js:4143-9517 fingerprint (2.1.88 match: fetchClaudeAIMcpConfigsIfEligible, 0.416)
/**
 * fetchClaudeAIMcpConfigsIfEligible：拉取 claude.ai 组织连接器列表（GET {BASE_API_URL}/v1/mcp_servers?limit=1000&include_additional_installs=true）。依次检查 ENABLE_CLAUDEAI_MCP_SERVERS、disableClaudeAiConnectors、安全模式、一方提供商、API key 优先、user:mcp_servers 作用域；瞬时错误按退避重试，非 401/429 错误时去掉 include_additional_installs 再试一次。结果转成 "claude.ai <显示名>" 的 claudeai-proxy 配置（含 stateless、cached_init/discover、discoverSupport 等），显示名冲突加 (2)。
 */
async function fetchClaudeAIMcpConfigsIfEligible(credentials) {
  let attempts = 0;
  let state = getCliOwnedState();
  state.pendingCrossOrgNotice = undefined;
  let settled = false;
  let claudeAiConnectorListGeneration = state.claudeAiConnectorListGeneration;
  let fetchSeq = ++state.claudeAiConnectorListFetchSeq;
  try {
    let envDisabled = isEnvDefinedFalsy(process.env.ENABLE_CLAUDEAI_MCP_SERVERS);
    let settingDisabled = hasDisableClaudeAiConnectors();
    if (envDisabled || settingDisabled) {
      logForDebugging(
        `[claudeai-mcp] Disabled via ${envDisabled ? "env var" : "disableClaudeAiConnectors setting"}`,
      );
      logEvent("tengu_claudeai_mcp_eligibility", {
        state: envDisabled ? lit("disabled_env_var") : lit("disabled_setting"),
      });
      return {};
    }
    if (isCustomizationDisabled("mcpClaudeAi")) {
      logForDebugging("[claudeai-mcp] Disabled in safe mode");
      logEvent("tengu_claudeai_mcp_eligibility", {
        state: lit("safe_mode"),
      });
      return {};
    }
    if (!isFirstPartyProvider()) {
      logForDebugging("[claudeai-mcp] Disabled on third-party provider");
      logEvent("tengu_claudeai_mcp_eligibility", {
        state: lit("third_party_provider"),
      });
      return {};
    }
    if (!isClaudeAISubscriber()) {
      logForDebugging("[claudeai-mcp] Disabled: API-key auth precedence active");
      logEvent("tengu_claudeai_mcp_eligibility", {
        state: lit("api_key_precedence"),
      });
      if (getClaudeAIOAuthTokens()?.scopes?.includes("user:mcp_servers"))
        state.pendingCrossOrgNotice = {
          level: "warn",
          message:
            "claude.ai connectors are disabled because ANTHROPIC_API_KEY or another auth source is set and takes precedence over your claude.ai login \xB7 Unset it to load your organization's connectors",
        };
      return {};
    }
    await checkAndRefreshOAuthTokenIfNeeded({
      credentials,
    });
    let claudeAIOAuthTokens = getClaudeAIOAuthTokens();
    if (!claudeAIOAuthTokens?.accessToken) {
      logForDebugging("[claudeai-mcp] No access token");
      logEvent("tengu_claudeai_mcp_eligibility", {
        state: lit("no_oauth_token"),
      });
      return {};
    }
    if (!claudeAIOAuthTokens.scopes?.includes("user:mcp_servers")) {
      let reason = env.CLAUDE_CODE_REMOTE_ENVIRONMENT_TYPE
        ? "[claudeai-mcp] inference token lacks user:mcp_servers scope \u2014 claude.ai org connectors disabled (locally-configured MCP servers in managed-mcp.json / .claude.json / .mcp.json are NOT affected by this check)"
        : `[claudeai-mcp] Missing user:mcp_servers scope (scopes=${claudeAIOAuthTokens.scopes?.join(",") || "none"})`;
      logForDebugging(reason);
      logEvent("tengu_claudeai_mcp_eligibility", {
        state: lit("missing_scope"),
      });
      return {};
    }
    let baseUrl = `${getOauthConfig().BASE_API_URL}/v1/mcp_servers?limit=1000`;
    let url = `${baseUrl}&include_additional_installs=true`;
    logForDebugging(`[claudeai-mcp] Fetching from ${url}`);
    let fetchConnectorList = () =>
      withOAuth401Retry(
        () =>
          axios_default.get(url, {
            headers: {
              "User-Agent": claudeCodeUserAgent(),
              Authorization: `Bearer ${getClaudeAIOAuthTokens()?.accessToken ?? claudeAIOAuthTokens.accessToken}`,
              "Content-Type": "application/json",
              "anthropic-beta": BETA_MCP_SERVERS.header,
              "anthropic-version": "2023-06-01",
              ...buildClientCapabilitiesHeader(),
            },
            timeout: CLAUDEAI_FETCH_TIMEOUT_MS,
          }),
        {
          credentials,
        },
      );
    let now = Date.now();
    let nonTransientRetries = 0;
    let response;
    while (true) {
      attempts++;
      try {
        response = await fetchConnectorList();
        break;
      } catch (error) {
        let status = axios_default.isAxiosError(error) ? error.response?.status : undefined;
        let retryWithoutParam = () => {
          if (url === baseUrl || status === undefined || status === 401 || status === 429) return false;
          logForDebugging(
            `[claudeai-mcp] Connector list request got HTTP ${status}, asking once more without include_additional_installs (a connector's additional accounts will not be listed)`,
          );
          url = baseUrl;
          if (!isTransientNetworkError_2(error)) nonTransientRetries++;
          return true;
        };
        let transientAttempts = attempts - nonTransientRetries;
        if (transientAttempts >= CLAUDEAI_FETCH_MAX_ATTEMPTS || !isTransientNetworkError_2(error)) {
          if (retryWithoutParam()) continue;
          throw error;
        }
        let delayMs = backoffDelayMs({
          attempt: transientAttempts,
          baseMs: CLAUDEAI_RETRY_BASE_MS,
          factor: CLAUDEAI_RETRY_FACTOR,
        });
        if (Date.now() - now + delayMs + CLAUDEAI_FETCH_TIMEOUT_MS >= CLAUDEAI_RETRY_BUDGET_MS) {
          logForDebugging(`[claudeai-mcp] Retry budget exhausted after ${attempts} attempt(s)`);
          if (retryWithoutParam()) continue;
          throw error;
        }
        let errorCode = axios_default.isAxiosError(error)
          ? (error.response?.status ?? error.code ?? "unknown")
          : "unknown";
        logForDebugging(
          `[claudeai-mcp] Transient fetch error (${errorCode}), retrying in ${delayMs}ms (attempt ${transientAttempts}/${CLAUDEAI_FETCH_MAX_ATTEMPTS})`,
        );
        await sleep(delayMs);
      }
    }
    let usedNormalizedNames = new Map();
    let additionalInstalls = [];
    for (let server of response.data.data) {
      if (server.additional_install === true) {
        additionalInstalls.push(server);
        continue;
      }
      let normalizedUrl = normalizeUrlNoTrailingSlash(server.url);
      let kept = usedNormalizedNames.get(normalizedUrl);
      if (kept) {
        logForDebugging(
          `[claudeai-mcp] Dropping duplicate upstream ${normalizedUrl}: keeping ${kept.id}, dropping ${server.id}`,
        );
        continue;
      }
      usedNormalizedNames.set(normalizedUrl, server);
    }
    let configs = {};
    let usedNormalized = new Set([ARTIFACTS_SERVER_NAME]);
    additionalInstalls.sort(
      (left, right) =>
        (Date.parse(left.created_at) || 0) - (Date.parse(right.created_at) || 0) ||
        (left.id < right.id ? -1 : left.id > right.id ? 1 : 0),
    );
    for (let server of [...usedNormalizedNames.values(), ...additionalInstalls]) {
      let baseName = `claude.ai ${server.display_name}`;
      let finalName = baseName;
      let finalNormalized = CLAUDEAI_SERVER_PREFIX(finalName);
      let count = 1;
      while (usedNormalized.has(finalNormalized)) {
        count++;
        finalName = `${baseName} (${count})`;
        finalNormalized = CLAUDEAI_SERVER_PREFIX(finalName);
      }
      if (count > 1)
        logForDebugging(
          `[claudeai-mcp] Display-name collision: "${finalName}" (${server.id}, ${server.url})`,
        );
      usedNormalized.add(finalNormalized);
      configs[finalName] = {
        type: "claudeai-proxy",
        url: server.url,
        ...(server.url_reportable === true && {
          urlReportable: true,
        }),
        id: server.id,
        displayName: server.display_name,
        iconUrl: server.icon_url,
        scope: "claudeai",
        toolPermissions: connectorMaxPermissions(server.tools),
        stateless: server.stateless,
        cachedInitResponse: server.cached_init_response,
        discoverSupport: server.discover_support,
        cachedDiscoverResponse: server.cached_discover_response,
        eligible: server.eligible,
        ineligibleReason: server.eligibility_reason,
        enterpriseManaged: server.enterprise_managed,
      };
    }
    logForDebugging(`[claudeai-mcp] Fetched ${Object.keys(configs).length} servers`);
    logEvent("tengu_claudeai_mcp_eligibility", {
      state: lit("eligible"),
    });
    if (url === baseUrl)
      logFeatureSad("mcp_claudeai_fetch_configs", "fetch_additional_installs_param_refused");
    else logFeatureOk("mcp_claudeai_fetch_configs");
    if (
      state.claudeAiConnectorListGeneration === claudeAiConnectorListGeneration &&
      fetchSeq > state.claudeAiConnectorListSettledSeq
    ) {
      state.claudeAiConnectorIdIndex = buildConnectorIdIndex(
        configs,
        response.data.data,
        usedNormalizedNames,
      );
      recordConnectors(connectorServers(response.data.data));
      state.claudeAiConnectorListStatus = "settled";
      state.claudeAiConnectorListSettledSeq = fetchSeq;
      settled = true;
    }
    return configs;
  } catch (error) {
    let axiosError = axios_default.isAxiosError(error) ? error : undefined;
    let status = axiosError?.response?.status;
    let code = axiosError?.code;
    let errorCode = String(status ?? code ?? "unknown");
    logForDebugging(`[claudeai-mcp] Fetch failed (${errorCode}) after ${attempts} attempt(s)`);
    logEvent("tengu_claudeai_mcp_eligibility", {
      state: lit("fetch_failed"),
      status: fromNumberOpt(status) ?? sanitizedConnectionCodeForTelemetry(code) ?? lit("unknown"),
      attempts,
    });
    if (errorCode === "401" || errorCode === "403")
      logFeatureSad("mcp_claudeai_fetch_configs", "fetch_needs_auth");
    else if (errorCode === "429") logFeatureSad("mcp_claudeai_fetch_configs", "fetch_rate_limited");
    else if (errorCode === "ECONNABORTED" || errorCode === "ETIMEDOUT")
      logFeatureSad("mcp_claudeai_fetch_configs", "fetch_timeout");
    else if (/^\d+$/.test(errorCode))
      logFeatureBad("mcp_claudeai_fetch_configs", `fetch_failed_http_${errorCode}`);
    else if (errorCode !== "unknown") logFeatureSad("mcp_claudeai_fetch_configs", "fetch_network_error");
    else logFeatureBad("mcp_claudeai_fetch_configs", "fetch_failed");
    state.claudeAiConfigsFetch = null;
    let transient =
      axiosError !== undefined &&
      (status !== undefined
        ? (status >= 500 && status < 600) || status === 429
        : code !== undefined && RETRYABLE_NETWORK_CODES.has(code));
    let emptyConfigs = {};
    if (transient) state.claudeAiConfigsFetchTransientFailures.add(emptyConfigs);
    return emptyConfigs;
  } finally {
    if (
      !settled &&
      state.claudeAiConnectorListGeneration === claudeAiConnectorListGeneration &&
      state.claudeAiConnectorListStatus !== "settled"
    )
      state.claudeAiConnectorListStatus = "unavailable";
  }
}
//@ chunk-06vyq63w.js:9517-9872 layout
/**
 * buildConnectorIdIndex：建立连接器 id → {name, config, siblingIds} 索引，additional_install 条目按相同上游 URL 挂到主连接器下。
 */
function buildConnectorIdIndex(configs, listedServers, primaryByUrl) {
  let index = new Map();
  let byId = new Map();
  for (let [key, value] of Object.entries(configs)) {
    if (value.type !== "claudeai-proxy") continue;
    let entry = {
      name: key,
      config: value,
      siblingIds: [value.id],
    };
    byId.set(value.id, entry);
    index.set(normalizeConnectorId(value.id), entry);
  }
  for (let listedServer of listedServers) {
    let normalizedId = normalizeConnectorId(listedServer.id);
    if (index.has(normalizedId)) continue;
    let primary = primaryByUrl.get(normalizeUrlNoTrailingSlash(listedServer.url));
    let sibling = primary === undefined ? undefined : byId.get(primary.id);
    if (sibling !== undefined) {
      sibling.siblingIds.push(listedServer.id);
      index.set(normalizedId, sibling);
    }
  }
  return index;
}
//@ chunk-06vyq63w.js:9872-9957 layout
/**
 * 清空 claude.ai 连接器列表的进行中请求缓存与待显示的跨组织提示，使下次重新拉取。
 */
function clearClaudeAiConfigsFetch() {
  let cliOwnedState = getCliOwnedState();
  cliOwnedState.claudeAiConfigsFetch = null;
  cliOwnedState.pendingCrossOrgNotice = undefined;
}
//@ chunk-06vyq63w.js:9957-10235 layout
/**
 * lookupClaudeAiConnectorById：按连接器 id 查索引，列表未就绪返回 pending/unavailable，找不到返回 absent。
 */
function lookupClaudeAiConnectorById(id) {
  let cliOwnedState = getCliOwnedState();
  let claudeAiConnectorIdIndex = cliOwnedState.claudeAiConnectorIdIndex;
  if (cliOwnedState.claudeAiConnectorListStatus !== "settled" || claudeAiConnectorIdIndex === undefined)
    return cliOwnedState.claudeAiConnectorListStatus === "unavailable"
      ? {
          kind: "unavailable",
        }
      : {
          kind: "pending",
        };
  let entry = claudeAiConnectorIdIndex.get(normalizeConnectorId(id));
  return entry === undefined
    ? {
        kind: "absent",
      }
    : {
        kind: "found",
        ...entry,
      };
}
//@ chunk-06vyq63w.js:10235-10350 layout
/**
 * 把 claude.ai 连接器列表状态标为 unavailable（已 settled 的不覆盖），用于拉取失败时让界面显示不可用。
 */
function markConnectorListUnavailable() {
  let cliOwnedState = getCliOwnedState();
  if (cliOwnedState.claudeAiConnectorListStatus !== "settled")
    cliOwnedState.claudeAiConnectorListStatus = "unavailable";
}
//@ chunk-06vyq63w.js:10350-10528 layout
/**
 * resetConnectorIdIndex：清空连接器索引并把状态置回 pending，代际 +1。
 */
function resetConnectorIdIndex() {
  let cliOwnedState = getCliOwnedState();
  dropConnectorIndex();
  cliOwnedState.claudeAiConnectorIdIndex = undefined;
  cliOwnedState.claudeAiConnectorListStatus = "pending";
  cliOwnedState.claudeAiConnectorListSettledSeq = 0;
  cliOwnedState.claudeAiConnectorListGeneration += 1;
}
//@ chunk-06vyq63w.js:10528-10684 file-local
/**
 * recordClaudeAiMcpConnected：记入本会话已连接集合，并持久化到全局配置 claudeAiMcpEverConnected。
 */
function recordClaudeAiMcpConnected(name, storageV5) {
  getCliOwnedState().claudeAiConnectedThisSession.add(name);
  saveGlobalConfig((current) => {
    let seen = getEverConnectedClaudeAiMcps(current);
    if (seen.includes(name)) return current;
    return {
      ...current,
      claudeAiMcpEverConnected: [...seen, name],
    };
  }, storageV5);
}
//@ chunk-06vyq63w.js:10684-10748 layout
/**
 * isClaudeAiMcpConnectedThisSession：本会话是否连上过该 claude.ai 连接器。
 */
function isClaudeAiMcpConnectedThisSession(serverName) {
  return getCliOwnedState().claudeAiConnectedThisSession.has(serverName);
}
//@ chunk-06vyq63w.js:10748-10810 layout
/**
 * 清空"本会话已连接过的 claude.ai 连接器"集合并重置连接器 id 索引（登录账号切换等场景）。
 */
function resetClaudeAiSessionConnections() {
  getCliOwnedState().claudeAiConnectedThisSession.clear();
  resetConnectorIdIndex();
}
//@ chunk-06vyq63w.js:10810-10853 layout
/**
 * hasClaudeAiMcpEverConnected：全局配置里是否记录该连接器曾连接过。
 */
function hasClaudeAiMcpEverConnected(name) {
  return getEverConnectedClaudeAiMcps(getGlobalConfig()).includes(name);
}
//@ chunk-06vyq63w.js:10853-10892 layout
/**
 * 返回全局配置中记录的"曾经连上过的 claude.ai 连接器"名字集合（Set）。
 */
function getEverConnectedClaudeAiMcpSet() {
  return new Set(getEverConnectedClaudeAiMcps(getGlobalConfig()));
}
//@ chunk-06vyq63w.js:10892-10944 fingerprint (2.1.88 match: markClaudeAiMcpConnected, 1)
function getEverConnectedClaudeAiMcps(name) {
  return stringArray(name.claudeAiMcpEverConnected);
}
//@ chunk-06vyq63w.js:10944-11012 placement
function getConnectorsSettingsUrl() {
  return `${getOauthConfig().CLAUDE_AI_ORIGIN}/customize/connectors`;
}
//@ chunk-06vyq63w.js:11012-11105 layout
function connectorsSettingsUrlFor(needed) {
  let uRLSearchParams = new URLSearchParams({
    needed,
    return: "terminal",
  });
  return `${getConnectorsSettingsUrl()}?${uRLSearchParams}`;
}
//@ chunk-06vyq63w.js:11105-11233 layout
function addConnectorUrl(connectorName, connectorUrl) {
  let uRLSearchParams = new URLSearchParams({
    modal: "add-custom-connector",
    connectorName,
    connectorUrl,
  });
  return `${getConnectorsSettingsUrl()}?${uRLSearchParams}`;
}
//@ chunk-06vyq63w.js:11233-11323 placement
/**
 * 把 mcprs 前缀的连接器 id 改成 mcpsrv。
 */
function normalizeConnectorId(id) {
  return typeof id === "string" && id.startsWith("mcprs") ? `mcpsrv${id.slice(5)}` : id;
}
//@ chunk-06vyq63w.js:11323-11416 placement
/**
 * 取 claude.ai 代理配置的连接器 id（非 claude.ai 作用域返回 undefined）。
 */
function connectorServerId(config) {
  return config.type === "claudeai-proxy" && config.scope === "claudeai" && config.id
    ? normalizeConnectorId(config.id)
    : undefined;
}
//@ chunk-06vyq63w.js:11416-11734 layout
function connectorServers(server) {
  return server.flatMap((server) => {
    if (typeof server.id !== "string" || server.id === "") return [];
    let ids =
      typeof server.directory_entry_id === "string" && server.directory_entry_id !== ""
        ? server.directory_entry_id
        : undefined;
    return [
      {
        id: normalizeConnectorId(server.id),
        ...(ids !== undefined && {
          directoryEntry: ids,
        }),
        ...(ids !== undefined &&
          server.url_reportable === true &&
          typeof server.url === "string" && {
            url: server.url,
          }),
      },
    ];
  });
}
//@ chunk-06vyq63w.js:11734-11974 placement
/**
 * 生成 claude.ai 连接器的授权地址（组织 id、连接器 id 与产品入口）。
 */
function claudeAiConnectorAuthUrl(connectorAuthUrl) {
  let organizationUuid = getOauthAccountInfo()?.organizationUuid;
  if (!organizationUuid || !connectorAuthUrl.id) return null;
  let CLAUDE_AI_ORIGIN = getOauthConfig().CLAUDE_AI_ORIGIN;
  let connectorId = normalizeConnectorId(connectorAuthUrl.id);
  let encoded = encodeURIComponent(env.CLAUDE_CODE_ENTRYPOINT || "cli");
  return `${CLAUDE_AI_ORIGIN}/api/organizations/${organizationUuid}/mcp/start-auth/${connectorId}?product_surface=${encoded}`;
}
//@ chunk-06vyq63w.js:11974-12052 placement
/**
 * 判断该工具是否需要连接器授权。
 */
function requiresConnectorGrant(serverName, config) {
  return (
    CLAUDEAI_SERVER_PREFIX(serverName).startsWith(CLAUDE_AI) &&
    config.scope !== "claudeai" &&
    !isMintedDynamicServer(serverName, config)
  );
}
//@ chunk-06vyq63w.js:12052-12351 placement
/**
 * 判断 MCP 工具调用是否需要连接器授权：旧授权被拒（插件来源或未豁免），或服务器需要逐次授权。
 */
function requiresConnectorGrant_2(tool) {
  return (
    tool.mcpInfo !== undefined &&
    tool.mcpInfo.isAuthStub !== true &&
    (tool.mcpInfo.toolNameShared === true ||
      (enforcesGrants() &&
        ((tool.mcpInfo.legacyGrantRefused === true && !ownsLegacyKey(tool.mcpInfo)) ||
          isLegacyKeyUnclaimed(tool.mcpInfo) ||
          mayRecordServerOwner(tool.mcpInfo)) &&
        (tool.mcpInfo.source === "plugin" ||
          !isMintedDynamicServer(tool.mcpInfo.serverName, tool.mcpInfo))) ||
      requiresConnectorGrant(tool.mcpInfo.serverName, tool.mcpInfo))
  );
}
//@ chunk-06vyq63w.js:12351-12482 layout
function promptToolAllowDenyReason(tool) {
  if (tool.mcpInfo !== undefined && requiresConnectorGrant(tool.mcpInfo.serverName, tool.mcpInfo))
    return PROMPT_TOOL_ALLOW_IMITATOR_DENY_REASON;
  return tool.mcpInfo?.toolNameShared === true
    ? PROMPT_TOOL_ALLOW_SHARED_NAME_DENY_REASON
    : PROMPT_TOOL_ALLOW_REFUSED_GRANT_DENY_REASON;
}
//@ chunk-06vyq63w.js:12482-12550 placement
/**
 * 判断是否为已铸币（minted）的动态服务器。
 */
function isMintedDynamicServer(serverName, config) {
  return config.scope === "dynamic" && !isPluginServerConfig(config) && !moduleStore.minted(serverName);
}
export {
  requiresConnectorGrant_2,
  requiresConnectorGrant,
  connectorServerId,
  isMintedDynamicServer,
  claudeAiConnectorAuthUrl,
  promptToolAllowDenyReason,
  recordClaudeAiMcpConnected,
  normalizeConnectorId,
  getEverConnectedClaudeAiMcpSet,
  lookupClaudeAiConnectorById,
  fetchClaudeAiConfigsOnce,
  printClaudeAiConnectorNotice,
  hasClaudeAiMcpEverConnected,
  isClaudeAiMcpConnectedThisSession,
  markConnectorListUnavailable,
  clearClaudeAiConfigsFetch,
  resetClaudeAiSessionConnections,
  hasTransientConfigFailure,
  takePendingCrossOrgNotice,
  getConnectorsSettingsUrl,
  connectorsSettingsUrlFor,
  addConnectorUrl,
};
