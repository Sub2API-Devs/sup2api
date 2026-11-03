/**
 * utils/status.tsx
 *
 * /status 与 doctor 的各分区数据：账号、API 提供方、设置来源、IDE、MCP、记忆诊断、沙箱
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/status.tsx
 * pieces: chunk-06y4szbn.js (1), chunk-2wrddneh.js (1), chunk-j8bb1zkh.js (24)
 * attribution: fingerprint 8, placement 9, layout 8, file-local 1
 */
import { toIDEDisplayName, isJetBrainsIde, VSCODE_EXTENSION_DOCS_URL, getIdeClientName } from "./ide.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../ink/components/Text.js";
import { color } from "../components/design-system/color.js";
import { figures_default } from "../../vendor/@inquirer/figures/dist/esm/index.js";
import { isArtifacts404Failure } from "../services/mcp/redactMcpErrors.js";
import { isClaudeMdLoadingDisabled } from "./settings/customizationDisabled.js";
import {
  getMemoryFilesCached,
  getLargeMemoryFiles,
  getOversizedMemoryWarning,
  getMaxMemoryFileChars,
  getWithheldInstructionFiles,
} from "./claudemd.js";
import { formatNumber } from "./format.js";
import { getDisplayPath } from "./file.js";
import {
  takeShownInstructionFiles,
  withheldInstructionNotice,
  moreInstructionFilesText,
} from "./instructionFileAccess.js";
import {
  getMergedPolicySources,
  getArmedHelperOutput,
  getSettingsForSource,
  getPolicySettingsOrigin,
  getShadowedManagedSources,
  getManagedFileSettingsPresence,
  managedLinkWarningLines,
} from "./settings/settings.js";
import { getEnabledSettingSources, getSettingSourceDisplayNameCapitalized } from "./settings/constants.js";
import { isServingDefault } from "./settings/policyHelper/helperRemote.js";
import { managedSettingsUrl, MANAGED_SETTINGS_NOTICE } from "../components/ManagedSettingsNotice.js";
import {
  shouldAllowManagedPermissionRulesOnly,
  getIgnoredFrontmatterToolGrants,
} from "./permissions/permissionsLoader.js";
import {
  getRemoteSettingsLoadState,
  shouldWarnRemoteSettings_2,
  describeRemoteSettingsStatus,
} from "../services/cloudSessions/eligibility.js";
import {
  getPolicyFetchStatus,
  isPolicyFetchProblem,
  formatPolicyFetchStatus,
} from "../services/policyLimits/policyFetchStatus.js";
import { describeClientDataStatus } from "../services/clientDataUrl.js";
import { canAttachServerClassifierBeta } from "./permissions/serverClassifier/arbiter.js";
import { checkInstall } from "./nativeInstaller/installer.js";
import { processWrapperRecord, processWrapperError, isProcessWrapperUsable } from "./processWrapper.js";
import { getLaunchCommand } from "./deepLink/registerProtocol.js";
import { readLiveServerLock } from "./daemon/daemonLock.js";
import {
  truncateToLength,
  collapseWhitespace,
  cleanForDisplay,
  clippedMessage,
  MAX_CLIP_CHARS,
} from "./stringUtils.js";
import { stripAnsi } from "./stripAnsi.js";
import { getDoctorDiagnostic } from "./doctorDiagnostic.js";
import { splitStatusNotices } from "./settings/settingsErrorsHeadless.js";
import { formatInvalidSettingNotice } from "./settings/settingsNotices.js";
import { uniq } from "./collections.js";
import { retentionCleanupSkipReason } from "./cleanup.js";
import { collectPermissionRuleWarningLines } from "./permissions/securityWarnings.js";
import { managedHelperEnvNotes } from "./auth/managedHelpers.js";
import { isStorageV5Enabled } from "./hoverRest.js";
import {
  isAnthropicAuthEnabled,
  isOAuthRefreshKnownDeadAsync,
  getAccountInformation,
  isOAuthRefreshKnownDead,
  getOauthAccountInfo,
  getRequestCredentials,
  getApiKeyHelperLastFailure,
  isApiKeyHelperTheActiveCredential,
  shouldUseWIFAuth,
} from "./auth.js";
import { env } from "./env.js";
import { getWIFStatusLine, getWIFAccountInfo } from "./wifProfile.js";
import {
  getAPIProvider,
  allowedProviderLabel,
  getSecondaryProvider,
  THIRD_PARTY_PROVIDER_LABELS,
} from "./model/providers.js";
import { getAllowedProviders } from "./model/allowedProviders.js";
import { getDefaultVertexRegion, getDefaultAwsRegion } from "./envUtils.js";
import { getGatewayAuth, getSessionId } from "../bootstrap/state.js";
import { getProxyUrl, parseProxyUrl } from "./proxy.js";
import { getMTLSConfig } from "./mtls.js";
import { describeAwsRegion, resolveAwsRegion } from "./awsRegion.js";
import { modelDisplayString } from "./model/model.js";
import { getActiveModelFallback, describeAutoSwitchedModel } from "../services/api/safeguardMessages.js";
import { getCwd } from "./cwd.js";
import { noopMachineStatusHook } from "./machineStatus.js";
import {
  buildPrimarySection,
  buildSecondarySection,
  DEBUG_DETAILS_SUFFIX,
} from "../components/Settings/Status.js";

//@ chunk-j8bb1zkh.js:1796-2024 placement
/**
 * 把状态项转为显示行，跳过空值或 none。
 */
function statusValueRows(l) {
  let t = [];
  for (let u of l) {
    let a = typeof u.value === "string" ? u.value : Array.isArray(u.value) ? u.value.join(", ") : null;
    if (a === null || a === "" || a === "none") continue;
    t.push(
      u.label
        ? {
            label: u.label,
            value: a,
          }
        : {
            value: a,
          },
    );
  }
  return t;
}
//@ chunk-j8bb1zkh.js:2024-2142 placement
/**
 * 把各组中仅内部的状态项移到最后一组。
 */
function moveAntOnlyToEnd(l) {
  let mapped = l.map((u) => u.filter((a) => !a.antOnly));
  mapped.push(l.flatMap((u) => u.filter((a) => a.antOnly)));
  return mapped;
}
//@ chunk-j8bb1zkh.js:2142-2180 placement
var legacyStatusModule = require("./chunk-pky8b2sx.js");
//@ chunk-j8bb1zkh.js:2180-2204 placement
/**
 * buildSecondarySection 里 MCP 分区（外部构建为空）。
 */
function mcpStatusRows() {
  return [];
}
//@ chunk-j8bb1zkh.js:2204-2228 placement
/**
 * buildSecondarySection 里工具搜索分区（外部构建为空）。
 */
function toolSearchStatusRows() {
  return [];
}
//@ chunk-j8bb1zkh.js:2228-2252 placement
/**
 * buildSecondarySection 里模型分区（外部构建为空）。
 */
function modelStatusRows() {
  return [];
}
//@ chunk-j8bb1zkh.js:2252-3173 fingerprint = buildIDEProperties (0.875)
function buildIDEProperties(mcpClients, ideInstallationStatus = null, theme) {
  let ideClient = mcpClients?.find((client) => client.name === "ide");
  let d = Boolean(ideInstallationStatus?.error) && ideClient?.type === "connected";
  if (ideInstallationStatus && !d) {
    let ideName = toIDEDisplayName(ideInstallationStatus.ideType);
    let pluginOrExtension = isJetBrainsIde(ideInstallationStatus.ideType) ? "plugin" : "extension";
    if (ideInstallationStatus.error)
      return [
        {
          label: "IDE",
          value: jsxProd_default_2(Text, {
            children: [
              color("error", theme)(figures_default.cross),
              " Couldn't install the Claude Code ",
              pluginOrExtension,
              " in ",
              ideName,
              ":",
              " ",
              ideInstallationStatus.error,
              `
`,
              "To install it yourself, see",
              " ",
              VSCODE_EXTENSION_DOCS_URL,
            ],
          }),
        },
      ];
    if (ideInstallationStatus.installed)
      if (ideClient && ideClient.type === "connected") {
        if (ideInstallationStatus.installedVersion !== ideClient.serverInfo?.version)
          return [
            {
              label: "IDE",
              value: `Connected to ${ideName} ${pluginOrExtension} version ${ideInstallationStatus.installedVersion} (server version: ${ideClient.serverInfo?.version})`,
            },
          ];
        else
          return [
            {
              label: "IDE",
              value: `Connected to ${ideName} ${pluginOrExtension} version ${ideInstallationStatus.installedVersion}`,
            },
          ];
      } else
        return [
          {
            label: "IDE",
            value: `Installed ${ideName} ${pluginOrExtension}`,
          },
        ];
  } else if (ideClient) {
    let ideName = getIdeClientName(ideClient) ?? "IDE";
    if (ideClient.type === "connected")
      return [
        {
          label: "IDE",
          value: `Connected to ${ideName} extension`,
        },
      ];
    else
      return [
        {
          label: "IDE",
          value: `${color("error", theme)(figures_default.cross)} Not connected to ${ideName}`,
        },
      ];
  }
  return [];
}
//@ chunk-j8bb1zkh.js:3173-4041 fingerprint = buildMcpProperties (0.892)
function buildMcpProperties(clients = [], theme) {
  let servers = clients.filter((client) => client.name !== "ide" && !isArtifacts404Failure(client));
  if (!servers.length) return [];
  let byState = {
    connected: 0,
    cached: 0,
    pending: 0,
    needsAuth: 0,
    disabled: 0,
    failed: 0,
  };
  for (let server of servers)
    switch (server.type) {
      case "connected":
        byState.connected++;
        break;
      case "cached":
        byState.cached++;
        break;
      case "pending":
        byState.pending++;
        break;
      case "needs-auth":
        byState.needsAuth++;
        break;
      case "disabled":
        byState.disabled++;
        break;
      case "failed":
        byState.failed++;
        break;
      default:
    }
  let parts = [];
  if (byState.connected) parts.push(color("success", theme)(`${byState.connected} connected`));
  if (byState.cached) parts.push(color("inactive", theme)(`${byState.cached} cached`));
  if (byState.needsAuth) parts.push(color("warning", theme)(`${byState.needsAuth} need auth`));
  if (byState.pending) parts.push(color("inactive", theme)(`${byState.pending} pending`));
  if (byState.disabled) parts.push(color("inactive", theme)(`${byState.disabled} disabled`));
  if (byState.failed) parts.push(color("error", theme)(`${byState.failed} failed`));
  return [
    {
      label: "MCP servers",
      value: `${parts.join(", ")} ${color("inactive", theme)("\xB7 /mcp")}`,
    },
  ];
}
//@ chunk-j8bb1zkh.js:4041-4783 fingerprint = buildMemoryDiagnostics (0.402)
/**
 * /status 与 doctor 的记忆诊断：CLAUDE.md 过大等警告。
 */
async function buildMemoryDiagnostics(l, t, u) {
  if (isClaudeMdLoadingDisabled()) return [];
  let files = await getMemoryFilesCached(l, false, t, u);
  let largeFiles = getLargeMemoryFiles(files);
  let diagnostics = [];
  let oversizedMemoryWarning = getOversizedMemoryWarning(files);
  if (oversizedMemoryWarning)
    diagnostics.push(
      `Instruction files will impact performance: ${oversizedMemoryWarning.summary.fileCount} files, ${formatNumber(oversizedMemoryWarning.summary.totalChars)} chars in total > ${formatNumber(oversizedMemoryWarning.summary.totalLimitChars)}`,
    );
  let maxMemoryFileChars = getMaxMemoryFileChars();
  largeFiles.forEach((file) => {
    let displayPath = getDisplayPath(file.path);
    diagnostics.push(
      `Large ${displayPath} will impact performance (${formatNumber(file.content.length)} chars > ${formatNumber(maxMemoryFileChars)})`,
    );
  });
  let f = takeShownInstructionFiles(getWithheldInstructionFiles(l));
  for (let { path, why } of f.shown) {
    let v = withheldInstructionNotice(why, getDisplayPath(path));
    diagnostics.push(
      jsxProd_default_2(
        Box,
        {
          flexDirection: "column",
          flexShrink: 1,
          children: [
            jsxProd_default(Text, {
              children: v.lead,
            }),
            jsxProd_default_2(Box, {
              flexDirection: "row",
              children: [
                jsxProd_default(Box, {
                  flexShrink: 0,
                  marginRight: 1,
                  children: jsxProd_default(Text, {
                    children: v.mark,
                  }),
                }),
                jsxProd_default(Text, {
                  bold: true,
                  wrap: "truncate-start",
                  children: v.path,
                }),
              ],
            }),
          ],
        },
        path,
      ),
    );
  }
  if (f.more > 0) diagnostics.push(moreInstructionFilesText(f));
  return diagnostics;
}
//@ chunk-j8bb1zkh.js:4783-4929 layout
function formatMergedManagedSettingsLabel(l = "remote") {
  let mergedPolicySources = getMergedPolicySources();
  if (!mergedPolicySources) return null;
  return `Enterprise managed settings (${mergedPolicySources.map((mergedPolicySource) => (mergedPolicySource === "remote" ? l : buildSettingSourcesProperties(mergedPolicySource))).join(" + ")}, merged)`;
}
//@ chunk-j8bb1zkh.js:4929-6036 layout
function buildSettingSourcesStatusProperties() {
  let enabledSettingSources = getEnabledSettingSources();
  let armedHelperOutput = getArmedHelperOutput();
  let d = [
    {
      label: "Setting sources",
      value: enabledSettingSources
        .filter((source) => {
          if (source === "policySettings" && armedHelperOutput.composes !== "none") return true;
          let settings = getSettingsForSource(source);
          return settings !== null && Object.keys(settings).length > 0;
        })
        .map((enabledSettingSource) => {
          if (enabledSettingSource === "policySettings") {
            if (armedHelperOutput.composes !== "none") {
              let v = armedHelperOutput.composes === "remoteSlot";
              let S = isServingDefault()
                ? `${v ? "remote " : ""}default settings payload`
                : v
                  ? "remote helper"
                  : "helper";
              let b = armedHelperOutput.mergedOver
                ? `${S} merged over ${buildSettingSourcesProperties(armedHelperOutput.mergedOver)}`
                : S;
              return (v ? formatMergedManagedSettingsLabel(b) : null) ?? `Enterprise managed settings (${b})`;
            }
            let policySettingsOrigin = getPolicySettingsOrigin();
            if (policySettingsOrigin === null) return null;
            return formatMergedManagedSettingsLabel() ?? formatManagedSettingsLabel(policySettingsOrigin);
          }
          return getSettingSourceDisplayNameCapitalized(enabledSettingSource);
        })
        .filter((p) => p !== null),
    },
  ];
  if (managedSettingsUrl() !== undefined)
    d.push({
      value: MANAGED_SETTINGS_NOTICE,
    });
  let shadowedManagedSources = getShadowedManagedSources();
  if (shadowedManagedSources.length > 0)
    d.push({
      label: "Skipped sources",
      value: shadowedManagedSources.map(formatManagedSettingsLabel),
    });
  if (shouldAllowManagedPermissionRulesOnly()) {
    let p = [...getIgnoredFrontmatterToolGrants()];
    d.push({
      label: "Permission rules",
      value: [
        "Managed settings only (allowManagedPermissionRulesOnly)",
        ...(p.length > 0 ? [`allowed-tools ignored this session: ${p.join(", ")}`] : []),
      ],
    });
  }
  let remoteSettingsLoadState = getRemoteSettingsLoadState();
  if (remoteSettingsLoadState && shouldWarnRemoteSettings_2(remoteSettingsLoadState))
    d.push({
      label: "Managed settings (remote)",
      value: describeRemoteSettingsStatus(remoteSettingsLoadState),
    });
  let policyFetchStatus = getPolicyFetchStatus();
  if (isPolicyFetchProblem(policyFetchStatus))
    d.push({
      label: "Organization policy",
      value: formatPolicyFetchStatus(policyFetchStatus),
    });
  let f = describeClientDataStatus();
  if (f !== undefined)
    d.push({
      label: "Client data",
      value: f,
    });
  return d;
}
//@ chunk-j8bb1zkh.js:6036-6121 fingerprint = buildSandboxProperties (0.534)
function buildSandboxProperties(isSandboxed) {
  return [
    {
      label: "Auto mode server",
      value: canAttachServerClassifierBeta(isSandboxed) ? "Enabled" : "Disabled",
    },
  ];
}
//@ chunk-j8bb1zkh.js:6121-6145 layout
/**
 * buildSecondarySection 的追加分区（外部构建为空）。
 */
function extraStatusRows() {
  return [];
}
//@ chunk-j8bb1zkh.js:6145-6406 fingerprint = buildSettingSourcesProperties (0.539)
/**
 * /status 的设置来源行：列出启用的来源与托管设置来源（helper/remote/plist/HKLM/file/HKCU）。
 */
function buildSettingSourcesProperties(l) {
  switch (l) {
    case "helper":
    case "remote":
    case "plist":
      return l;
    case "hklm":
      return "HKLM";
    case "file": {
      let { hasBase, hasDropIns } = getManagedFileSettingsPresence();
      if (hasBase && hasDropIns) return "file + drop-ins";
      return hasDropIns ? "drop-ins" : "file";
    }
    case "parent":
      return "parent process";
    case "hkcu":
      return "HKCU";
  }
}
//@ chunk-j8bb1zkh.js:6406-6466 layout
function formatManagedSettingsLabel(policySettingsOrigin) {
  return `Enterprise managed settings (${buildSettingSourcesProperties(policySettingsOrigin)})`;
}
//@ chunk-j8bb1zkh.js:6466-6557 file-local
async function buildInstallationDiagnostics() {
  return (await checkInstall()).filter((t) => t.type !== "error").map((warning) => warning.message);
}
//@ chunk-j8bb1zkh.js:6557-7982 layout
async function getProcessWrapperStatusNotices(l) {
  let t = processWrapperRecord();
  let u = processWrapperError();
  if (!t && !u) return [];
  let a = [];
  if (u) {
    a.push(
      `${u} \u2014 nothing will run unwrapped: new background sessions are refused unless a background service that validated an earlier value is still serving them (\`claude daemon status\` shows it)`,
    );
    return a;
  }
  let launchCommand = getLaunchCommand();
  a.push(
    `Self-exec: \`${[launchCommand.cmd, ...launchCommand.prefixArgs].join(" ")}\` (CLAUDE_CODE_PROCESS_WRAPPER)`,
  );
  if (!(await isProcessWrapperUsable()))
    a.push(
      `The launcher \`${launchCommand.cmd}\` cannot run right now (deleted or not executable) \u2014 new background sessions are refused until it is restored; a background service that validated it earlier keeps serving its existing sessions (\`claude daemon status\`)`,
    );
  let o = await readLiveServerLock(1, l).catch(() => null);
  if (!o) return a;
  let [{ controlRequest: c }, { BG_PROTO: g }] = await Promise.all([
    import("./chunk-58s9qc52.js"),
    import("./chunk-6cpjz11h.js"),
  ]);
  let f = await c({
    proto: g,
    op: "nudge",
  }).catch(() => null);
  let p = f?.ok && f.op === "nudge" ? (f.processWrapper ?? "") : (o.processWrapper ?? "");
  let m = truncateToLength(collapseWhitespace(stripAnsi(p)), 200);
  if (o.origin === "service")
    a.push(
      `The installed background service predates launcher support and runs outside \`${launchCommand.cmd}\`; its sessions are covered, the service process itself is not \u2014 a launcher-aware \`claude daemon install\` will close this`,
    );
  if (p !== t)
    a.push(
      `The running background service launches sessions via \`${m || "(no launcher)"}\`, but this session resolves \`${t}\` \u2014 restart it (and your running claude sessions) to converge`,
    );
  return a;
}
//@ chunk-j8bb1zkh.js:7982-8678 layout
/**
 * 设置相关状态提示：无效条目所在文件、托管设置读取问题、转录保留期等。
 */
async function getSettingsStatusNotices(l) {
  let diagnostic = await getDoctorDiagnostic({
    storageV5: l,
  });
  let u = [];
  let { statusNotices, invalidEntries } = splitStatusNotices(formatInvalidSettingNotice().errors);
  if (invalidEntries.length > 0) {
    let joined = uniq(
      invalidEntries.map((invalidEntry) => invalidEntry.file && cleanForDisplay(invalidEntry.file)),
    ).join(", ");
    u.push(`Found invalid entries in: ${joined}.`);
    let g = await retentionCleanupSkipReason(l);
    if (g === "settings_unknowable" || g === "settings_invalid_key_set")
      u.push(
        "Transcript retention cleanup is paused until the settings errors above are fixed (cleanupPeriodDays cannot be determined reliably).",
      );
  }
  for (let statusNotice of statusNotices) u.push(statusNotice.message);
  u.push(...(await collectPermissionRuleWarningLines()).map(cleanForDisplay));
  for (let [o, c] of managedLinkWarningLines())
    u.push(`${o}
${c}`);
  u.push(...managedHelperEnvNotes());
  diagnostic.warnings.forEach((warning) => {
    u.push(warning.issue);
  });
  if (diagnostic.hasUpdatePermissions === false) u.push("No write permissions for auto-updates");
  return u;
}
//@ chunk-j8bb1zkh.js:8678-8816 layout
function probeRefreshTokenDead(credentials) {
  if (!(isStorageV5Enabled() && credentials !== undefined)) return;
  return (async () => ({
    refreshKnownDead: isAnthropicAuthEnabled() && (await isOAuthRefreshKnownDeadAsync(credentials)),
  }))().catch(() => ({
    refreshKnownDead: false,
  }));
}
//@ chunk-j8bb1zkh.js:8816-10182 fingerprint = buildAccountProperties (0.552)
/**
 * /status 的账号信息：登录方式、组织、邮箱、令牌是否过期。
 */
function buildAccountProperties(l) {
  let accountInfo = getAccountInformation();
  if (!accountInfo) return [];
  let properties = [];
  if (
    l !== undefined && isStorageV5Enabled()
      ? l.refreshKnownDead
      : isAnthropicAuthEnabled() && isOAuthRefreshKnownDead()
  ) {
    properties.push({
      label: "Login",
      value: "Expired \u2014 log in again",
    });
    let oauthAccountInfo = getOauthAccountInfo();
    if (oauthAccountInfo?.organizationName && !env.IS_DEMO)
      properties.push({
        label: "Organization",
        value: oauthAccountInfo.organizationName,
      });
    if (oauthAccountInfo?.emailAddress && !env.IS_DEMO)
      properties.push({
        label: "Email",
        value: oauthAccountInfo.emailAddress,
      });
    return properties;
  }
  if (accountInfo.subscription)
    properties.push({
      label: "Login method",
      value: `${accountInfo.subscription} account`,
    });
  let a = " \xB7 not in use";
  let apiKeySource = accountInfo.apiKeySource ?? "none";
  let requestCredentials = getRequestCredentials(accountInfo.tokenSource ?? "none", apiKeySource);
  if (accountInfo.tokenSource)
    properties.push({
      label: "Auth token",
      value:
        requestCredentials.tokenSource === accountInfo.tokenSource
          ? accountInfo.tokenSource
          : `${accountInfo.tokenSource}${a}`,
    });
  if (accountInfo.apiKeySource)
    properties.push({
      label: "API key",
      value: requestCredentials.apiKey ? accountInfo.apiKeySource : `${accountInfo.apiKeySource}${a}`,
    });
  let apiKeyHelperLastFailure = getApiKeyHelperLastFailure();
  if (apiKeyHelperLastFailure && isApiKeyHelperTheActiveCredential())
    properties.push({
      label: "apiKeyHelper",
      value: env.IS_DEMO
        ? "Failing"
        : `Failing \u2014 last run ${clippedMessage(apiKeyHelperLastFailure, MAX_CLIP_CHARS)}`,
    });
  let g = shouldUseWIFAuth();
  let f = g && getRequestCredentials("profile", apiKeySource).tokenSource === "profile";
  if (g)
    properties.push({
      label: "Profile",
      value: `${getWIFStatusLine()}${f ? "" : a}`,
    });
  if (f) {
    let wifAccountInfo = getWIFAccountInfo();
    if (!env.IS_DEMO) {
      if (wifAccountInfo?.organizationName || wifAccountInfo?.organizationUuid)
        properties.push({
          label: "Organization",
          value: [wifAccountInfo.organizationName, wifAccountInfo.organizationUuid]
            .filter(Boolean)
            .join(" \xB7 "),
        });
      if (wifAccountInfo?.accountEmail)
        properties.push({
          label: "Email",
          value: wifAccountInfo.accountEmail,
        });
    }
  }
  if (accountInfo.organization && !env.IS_DEMO)
    properties.push({
      label: "Organization",
      value: accountInfo.organization,
    });
  if (accountInfo.email && !env.IS_DEMO)
    properties.push({
      label: "Email",
      value: accountInfo.email,
    });
  return properties;
}
//@ chunk-j8bb1zkh.js:10182-10462 layout
/**
 * URL 含用户名或密码时脱敏后再显示。
 */
function redactUrlCredentials(l) {
  let t;
  try {
    t = new URL(l);
  } catch {
    t = undefined;
  }
  if (t?.host) {
    if (!t.username && !t.password) return l;
    let d = new URL(t.href);
    d.username = "***";
    d.password = "";
    return d.href;
  }
  let index = l.lastIndexOf("@");
  if (index < 0) return l;
  return `${/^[a-z][a-z0-9+.-]*:\/\//i.exec(l)?.[0] ?? ""}***${l.slice(index)}`;
}
//@ chunk-j8bb1zkh.js:10462-13570 fingerprint = buildAPIProviderProperties (0.615)
/**
 * /status 的 API 提供方信息：提供方、base URL、区域、代理、允许的提供方等。
 */
function buildAPIProviderProperties() {
  let apiProvider = getAPIProvider();
  let properties = [];
  let allowedProviders = getAllowedProviders();
  if (allowedProviders !== undefined)
    properties.push({
      label: "Allowed providers",
      value:
        allowedProviders.length === 0
          ? "none (managed allowedProviders is empty)"
          : `${allowedProviders.map(allowedProviderLabel).join(", ")} (managed allowedProviders)`,
    });
  if (apiProvider !== "firstParty") {
    let secondaryProvider = getSecondaryProvider();
    let value = secondaryProvider
      ? `${THIRD_PARTY_PROVIDER_LABELS[apiProvider]} + ${THIRD_PARTY_PROVIDER_LABELS[secondaryProvider]}`
      : THIRD_PARTY_PROVIDER_LABELS[apiProvider];
    properties.push({
      label: "API provider",
      value,
    });
  }
  if (apiProvider === "firstParty") {
    let anthropicBaseUrl = env.ANTHROPIC_BASE_URL;
    if (anthropicBaseUrl)
      properties.push({
        label: "Anthropic base URL",
        value: redactUrlCredentials(anthropicBaseUrl),
      });
  } else if (apiProvider === "bedrock") {
    let bedrockBaseUrl = env.ANTHROPIC_BEDROCK_BASE_URL;
    if (bedrockBaseUrl)
      properties.push({
        label: "Bedrock base URL",
        value: redactUrlCredentials(bedrockBaseUrl),
      });
    properties.push({
      label: "AWS region",
      value: formatAwsRegionForStatus(),
    });
    let ANTHROPIC_BEDROCK_SERVICE_TIER = env.ANTHROPIC_BEDROCK_SERVICE_TIER;
    if (ANTHROPIC_BEDROCK_SERVICE_TIER)
      properties.push({
        label: "Bedrock service tier",
        value: ANTHROPIC_BEDROCK_SERVICE_TIER,
      });
    if (env.CLAUDE_CODE_SKIP_BEDROCK_AUTH)
      properties.push({
        value: "AWS auth skipped",
      });
  } else if (apiProvider === "vertex") {
    let vertexBaseUrl = env.ANTHROPIC_VERTEX_BASE_URL;
    if (vertexBaseUrl)
      properties.push({
        label: "Vertex base URL",
        value: redactUrlCredentials(vertexBaseUrl),
      });
    let gcpProject = env.ANTHROPIC_VERTEX_PROJECT_ID;
    if (gcpProject)
      properties.push({
        label: "GCP project",
        value: gcpProject,
      });
    properties.push({
      label: "Default region",
      value: getDefaultVertexRegion(),
    });
    if (env.CLAUDE_CODE_SKIP_VERTEX_AUTH)
      properties.push({
        value: "GCP auth skipped",
      });
  } else if (apiProvider === "foundry") {
    let foundryBaseUrl = env.ANTHROPIC_FOUNDRY_BASE_URL;
    if (foundryBaseUrl)
      properties.push({
        label: "Microsoft Foundry base URL",
        value: redactUrlCredentials(foundryBaseUrl),
      });
    let foundryResource = env.ANTHROPIC_FOUNDRY_RESOURCE;
    if (foundryResource)
      properties.push({
        label: "Microsoft Foundry resource",
        value: foundryResource,
      });
    if (env.CLAUDE_CODE_SKIP_FOUNDRY_AUTH)
      properties.push({
        value: "Microsoft Foundry auth skipped",
      });
  } else if (apiProvider === "anthropicAws") {
    let ANTHROPIC_AWS_BASE_URL = env.ANTHROPIC_AWS_BASE_URL;
    if (ANTHROPIC_AWS_BASE_URL)
      properties.push({
        label: "Claude Platform on AWS base URL",
        value: redactUrlCredentials(ANTHROPIC_AWS_BASE_URL),
      });
    let ANTHROPIC_AWS_WORKSPACE_ID = env.ANTHROPIC_AWS_WORKSPACE_ID;
    if (ANTHROPIC_AWS_WORKSPACE_ID)
      properties.push({
        label: "Workspace ID",
        value: ANTHROPIC_AWS_WORKSPACE_ID,
      });
    properties.push({
      label: "AWS region",
      value: getDefaultAwsRegion(),
    });
    if (env.CLAUDE_CODE_SKIP_ANTHROPIC_AWS_AUTH)
      properties.push({
        value: "Claude Platform on AWS auth skipped",
      });
  } else if (apiProvider === "anthropicGoogleCloud") {
    let ANTHROPIC_GOOGLE_CLOUD_BASE_URL = env.ANTHROPIC_GOOGLE_CLOUD_BASE_URL;
    if (ANTHROPIC_GOOGLE_CLOUD_BASE_URL)
      properties.push({
        label: "Claude Platform on Google Cloud base URL",
        value: redactUrlCredentials(ANTHROPIC_GOOGLE_CLOUD_BASE_URL),
      });
    let ANTHROPIC_GOOGLE_CLOUD_WORKSPACE_ID = env.ANTHROPIC_GOOGLE_CLOUD_WORKSPACE_ID;
    if (ANTHROPIC_GOOGLE_CLOUD_WORKSPACE_ID)
      properties.push({
        label: "Workspace ID",
        value: ANTHROPIC_GOOGLE_CLOUD_WORKSPACE_ID,
      });
    let g = env.ANTHROPIC_GOOGLE_CLOUD_PROJECT || env.GOOGLE_CLOUD_PROJECT;
    if (g)
      properties.push({
        label: "GCP project",
        value: g,
      });
    properties.push({
      label: "GCP location",
      value: env.ANTHROPIC_GOOGLE_CLOUD_LOCATION || "global",
    });
    if (env.CLAUDE_CODE_SKIP_ANTHROPIC_GOOGLE_CLOUD_AUTH)
      properties.push({
        value: "Claude Platform on Google Cloud auth skipped",
      });
  } else if (apiProvider === "gateway") {
    let proxyUrl = getGatewayAuth();
    if (proxyUrl) {
      properties.push({
        label: "Gateway URL",
        value: redactUrlCredentials(proxyUrl.url),
      });
      if (proxyUrl.email && !env.IS_DEMO)
        properties.push({
          label: "Gateway account",
          value: proxyUrl.email,
        });
    }
  }
  if (apiProvider === "mantle" || getSecondaryProvider() === "mantle") {
    let ANTHROPIC_BEDROCK_MANTLE_BASE_URL = env.ANTHROPIC_BEDROCK_MANTLE_BASE_URL;
    if (ANTHROPIC_BEDROCK_MANTLE_BASE_URL)
      properties.push({
        label: "Amazon Bedrock (Mantle) base URL",
        value: redactUrlCredentials(ANTHROPIC_BEDROCK_MANTLE_BASE_URL),
      });
    if (apiProvider === "mantle")
      properties.push({
        label: "AWS region",
        value: formatAwsRegionForStatus(),
      });
    if (env.CLAUDE_CODE_SKIP_MANTLE_AUTH)
      properties.push({
        value: "Amazon Bedrock (Mantle) auth skipped",
      });
  }
  let mtlsConfig = getProxyUrl();
  if (mtlsConfig)
    properties.push({
      label: "Proxy",
      value: parseProxyUrl(mtlsConfig)
        ? redactUrlCredentials(mtlsConfig)
        : `${redactUrlCredentials(mtlsConfig).replace(/\p{Cc}/gu, "")} (invalid \u2014 ignored; fix or unset the proxy env var)`,
    });
  let mtlsConfig_2 = getMTLSConfig();
  if (env.NODE_EXTRA_CA_CERTS)
    properties.push({
      label: "Additional CA cert(s)",
      value: env.NODE_EXTRA_CA_CERTS,
    });
  if (mtlsConfig_2) {
    if (mtlsConfig_2.cert && env.CLAUDE_CODE_CLIENT_CERT)
      properties.push({
        label: "mTLS client cert",
        value: env.CLAUDE_CODE_CLIENT_CERT,
      });
    if (mtlsConfig_2.key && env.CLAUDE_CODE_CLIENT_KEY)
      properties.push({
        label: "mTLS client key",
        value: env.CLAUDE_CODE_CLIENT_KEY,
      });
  }
  return properties;
}
//@ chunk-j8bb1zkh.js:13570-13931 placement
function formatAwsRegionForStatus() {
  let { region, source } = describeAwsRegion();
  switch (source) {
    case "env":
      return region;
    case "shared-config":
      return `${region} (from AWS config)`;
    case "env-invalid":
    case "default":
      resolveAwsRegion();
      return source === "env-invalid"
        ? `${region} (default \u2014 region env var invalid, ignored; fix or unset AWS_REGION / AWS_DEFAULT_REGION)`
        : `${region} (default \u2014 set AWS_REGION or add a region to your AWS config)`;
  }
}
//@ chunk-j8bb1zkh.js:13931-14033 placement
function modelStatusLabel(mainLoopModel) {
  let t = modelDisplayString(mainLoopModel);
  let activeModelFallback = getActiveModelFallback();
  if (activeModelFallback !== undefined)
    return `${t} (${describeAutoSwitchedModel(modelDisplayString(activeModelFallback.previousModel))})`;
  return t;
}
//@ chunk-06y4szbn.js:65501-65613 fingerprint = buildInstallationHealthDiagnostics (0.329)
async function buildInstallationHealthDiagnostics(backAfterPublish, n) {
  let r = await backAfterPublish;
  return r.err === null && n.length > 0
    ? {
        ...r,
        warnings: [...(r.warnings ?? []), ...n],
      }
    : r;
}
//@ chunk-2wrddneh.js:14173-14717 placement
async function buildStatusSections({ credentials, mainLoopModel, mcp, permissionMode, remoteSessionName }) {
  let cwd = getCwd();
  let [m, l] = await Promise.all([probeRefreshTokenDead(credentials), noopMachineStatusHook(cwd)]);
  let [S, c, d] = moveAntOnlyToEnd([
    buildPrimarySection({
      sessionId: getSessionId(),
      remoteSessionName,
      cwd,
      accountStatus: m,
      machineStatus: l,
      webSetupStatus: undefined,
    }),
    buildSecondarySection({
      mainLoopModel,
      mcp,
      theme: "dark",
      ideInstallationStatus: null,
      permissionMode,
    }),
  ]);
  let t = (e) =>
    statusValueRows(e ?? []).map((r) => ({
      ...r,
      value: stripAnsi(r.value).replace(DEBUG_DETAILS_SUFFIX, ""),
    }));
  return [
    {
      title: "Session",
      rows: t(S),
    },
    {
      title: "Environment",
      rows: t(c),
    },
    {
      title: "Internal",
      rows: t(d),
    },
  ].filter((e) => e.rows.length > 0);
}
export {
  buildInstallationHealthDiagnostics,
  buildAccountProperties,
  buildAPIProviderProperties,
  modelStatusLabel,
  modelStatusRows,
  buildIDEProperties,
  buildMcpProperties,
  toolSearchStatusRows,
  mcpStatusRows,
  buildSettingSourcesStatusProperties,
  buildSandboxProperties,
  extraStatusRows,
  buildInstallationDiagnostics,
  getSettingsStatusNotices,
  getProcessWrapperStatusNotices,
  buildMemoryDiagnostics,
  probeRefreshTokenDead,
  moveAntOnlyToEnd,
  statusValueRows,
};
