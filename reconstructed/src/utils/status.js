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
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-06y4szbn.js:65501-65613 fingerprint = buildInstallationHealthDiagnostics (0.329)
async function buildInstallationHealthDiagnostics(backAfterPublish, extraWarnings) {
  let result = await backAfterPublish;
  return result.err === null && extraWarnings.length > 0
    ? {
        ...result,
        warnings: [...(result.warnings ?? []), ...extraWarnings],
      }
    : result;
}
//@ chunk-j8bb1zkh.js:1796-2024 placement
/**
 * 把状态项转为显示行，跳过空值或 none。
 */
function statusValueRows(rows) {
  let out = [];
  for (let row of rows) {
    let text =
      typeof row.value === "string" ? row.value : Array.isArray(row.value) ? row.value.join(", ") : null;
    if (text === null || text === "" || text === "none") continue;
    out.push(
      row.label
        ? {
            label: row.label,
            value: text,
          }
        : {
            value: text,
          },
    );
  }
  return out;
}
//@ chunk-j8bb1zkh.js:2024-2142 placement
/**
 * 把各组中仅内部的状态项移到最后一组。
 */
function moveAntOnlyToEnd(columns) {
  let mapped = columns.map((column) => column.filter((row) => !row.antOnly));
  mapped.push(columns.flatMap((column) => column.filter((row) => row.antOnly)));
  return mapped;
}
//@ chunk-j8bb1zkh.js:2142-2180 placement
var legacyStatusModule; // deferred: loads other modules while loading; runs once its import cycle is complete
deferInit("chunk-j8bb1zkh.js:2142", () => {
  legacyStatusModule = require("../services/artifactPreview/browserDiscovery.js");
});
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
  let ideErrored = Boolean(ideInstallationStatus?.error) && ideClient?.type === "connected";
  if (ideInstallationStatus && !ideErrored) {
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
async function buildMemoryDiagnostics(mcpClients, options, context) {
  if (isClaudeMdLoadingDisabled()) return [];
  let files = await getMemoryFilesCached(mcpClients, false, options, context);
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
  let withheld = takeShownInstructionFiles(getWithheldInstructionFiles(mcpClients));
  for (let { path, why } of withheld.shown) {
    let notice = withheldInstructionNotice(why, getDisplayPath(path));
    diagnostics.push(
      jsxProd_default_2(
        Box,
        {
          flexDirection: "column",
          flexShrink: 1,
          children: [
            jsxProd_default(Text, {
              children: notice.lead,
            }),
            jsxProd_default_2(Box, {
              flexDirection: "row",
              children: [
                jsxProd_default(Box, {
                  flexShrink: 0,
                  marginRight: 1,
                  children: jsxProd_default(Text, {
                    children: notice.mark,
                  }),
                }),
                jsxProd_default(Text, {
                  bold: true,
                  wrap: "truncate-start",
                  children: notice.path,
                }),
              ],
            }),
          ],
        },
        path,
      ),
    );
  }
  if (withheld.more > 0) diagnostics.push(moreInstructionFilesText(withheld));
  return diagnostics;
}
//@ chunk-j8bb1zkh.js:4783-4929 layout
function formatMergedManagedSettingsLabel(remoteLabel = "remote") {
  let mergedPolicySources = getMergedPolicySources();
  if (!mergedPolicySources) return null;
  return `Enterprise managed settings (${mergedPolicySources.map((mergedPolicySource) => (mergedPolicySource === "remote" ? remoteLabel : buildSettingSourcesProperties(mergedPolicySource))).join(" + ")}, merged)`;
}
//@ chunk-j8bb1zkh.js:4929-6036 layout
function buildSettingSourcesStatusProperties() {
  let enabledSettingSources = getEnabledSettingSources();
  let armedHelperOutput = getArmedHelperOutput();
  let properties = [
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
              let isRemoteSlot = armedHelperOutput.composes === "remoteSlot";
              let sourceLabel = isServingDefault()
                ? `${isRemoteSlot ? "remote " : ""}default settings payload`
                : isRemoteSlot
                  ? "remote helper"
                  : "helper";
              let mergedOver = armedHelperOutput.mergedOver
                ? `${sourceLabel} merged over ${buildSettingSourcesProperties(armedHelperOutput.mergedOver)}`
                : sourceLabel;
              return (
                (isRemoteSlot ? formatMergedManagedSettingsLabel(mergedOver) : null) ??
                `Enterprise managed settings (${mergedOver})`
              );
            }
            let policySettingsOrigin = getPolicySettingsOrigin();
            if (policySettingsOrigin === null) return null;
            return formatMergedManagedSettingsLabel() ?? formatManagedSettingsLabel(policySettingsOrigin);
          }
          return getSettingSourceDisplayNameCapitalized(enabledSettingSource);
        })
        .filter((label) => label !== null),
    },
  ];
  if (managedSettingsUrl() !== undefined)
    properties.push({
      value: MANAGED_SETTINGS_NOTICE,
    });
  let shadowedManagedSources = getShadowedManagedSources();
  if (shadowedManagedSources.length > 0)
    properties.push({
      label: "Skipped sources",
      value: shadowedManagedSources.map(formatManagedSettingsLabel),
    });
  if (shouldAllowManagedPermissionRulesOnly()) {
    let ignoredGrants = [...getIgnoredFrontmatterToolGrants()];
    properties.push({
      label: "Permission rules",
      value: [
        "Managed settings only (allowManagedPermissionRulesOnly)",
        ...(ignoredGrants.length > 0
          ? [`allowed-tools ignored this session: ${ignoredGrants.join(", ")}`]
          : []),
      ],
    });
  }
  let remoteSettingsLoadState = getRemoteSettingsLoadState();
  if (remoteSettingsLoadState && shouldWarnRemoteSettings_2(remoteSettingsLoadState))
    properties.push({
      label: "Managed settings (remote)",
      value: describeRemoteSettingsStatus(remoteSettingsLoadState),
    });
  let policyFetchStatus = getPolicyFetchStatus();
  if (isPolicyFetchProblem(policyFetchStatus))
    properties.push({
      label: "Organization policy",
      value: formatPolicyFetchStatus(policyFetchStatus),
    });
  let clientDataStatus = describeClientDataStatus();
  if (clientDataStatus !== undefined)
    properties.push({
      label: "Client data",
      value: clientDataStatus,
    });
  return properties;
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
function buildSettingSourcesProperties(source) {
  switch (source) {
    case "helper":
    case "remote":
    case "plist":
      return source;
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
function formatManagedSettingsLabel(source) {
  return `Enterprise managed settings (${buildSettingSourcesProperties(source)})`;
}
//@ chunk-j8bb1zkh.js:6466-6557 file-local
async function buildInstallationDiagnostics() {
  return (await checkInstall()).filter((check) => check.type !== "error").map((warning) => warning.message);
}
//@ chunk-j8bb1zkh.js:6557-7982 layout
async function getProcessWrapperStatusNotices(storage) {
  let wrapperRecord = processWrapperRecord();
  let wrapperError = processWrapperError();
  if (!wrapperRecord && !wrapperError) return [];
  let notices = [];
  if (wrapperError) {
    notices.push(
      `${wrapperError} \u2014 nothing will run unwrapped: new background sessions are refused unless a background service that validated an earlier value is still serving them (\`claude daemon status\` shows it)`,
    );
    return notices;
  }
  let launchCommand = getLaunchCommand();
  notices.push(
    `Self-exec: \`${[launchCommand.cmd, ...launchCommand.prefixArgs].join(" ")}\` (CLAUDE_CODE_PROCESS_WRAPPER)`,
  );
  if (!(await isProcessWrapperUsable()))
    notices.push(
      `The launcher \`${launchCommand.cmd}\` cannot run right now (deleted or not executable) \u2014 new background sessions are refused until it is restored; a background service that validated it earlier keeps serving its existing sessions (\`claude daemon status\`)`,
    );
  let serverLock = await readLiveServerLock(1, storage).catch(() => null);
  if (!serverLock) return notices;
  let [{ controlRequest }, { BG_PROTO: bgProto }] = await Promise.all([
    import("../services/daemon/controlClient.js"),
    import("../services/daemon/leaseProtocol.js"),
  ]);
  let nudgeResult = await controlRequest({
    proto: bgProto,
    op: "nudge",
  }).catch(() => null);
  let serviceWrapper =
    nudgeResult?.ok && nudgeResult.op === "nudge"
      ? (nudgeResult.processWrapper ?? "")
      : (serverLock.processWrapper ?? "");
  let shownWrapper = truncateToLength(collapseWhitespace(stripAnsi(serviceWrapper)), 200);
  if (serverLock.origin === "service")
    notices.push(
      `The installed background service predates launcher support and runs outside \`${launchCommand.cmd}\`; its sessions are covered, the service process itself is not \u2014 a launcher-aware \`claude daemon install\` will close this`,
    );
  if (serviceWrapper !== wrapperRecord)
    notices.push(
      `The running background service launches sessions via \`${shownWrapper || "(no launcher)"}\`, but this session resolves \`${wrapperRecord}\` \u2014 restart it (and your running claude sessions) to converge`,
    );
  return notices;
}
//@ chunk-j8bb1zkh.js:7982-8678 layout
/**
 * 设置相关状态提示：无效条目所在文件、托管设置读取问题、转录保留期等。
 */
async function getSettingsStatusNotices(storage) {
  let diagnostic = await getDoctorDiagnostic({
    storageV5: storage,
  });
  let lines = [];
  let { statusNotices, invalidEntries } = splitStatusNotices(formatInvalidSettingNotice().errors);
  if (invalidEntries.length > 0) {
    let joined = uniq(
      invalidEntries.map((invalidEntry) => invalidEntry.file && cleanForDisplay(invalidEntry.file)),
    ).join(", ");
    lines.push(`Found invalid entries in: ${joined}.`);
    let retentionSkipReason = await retentionCleanupSkipReason(storage);
    if (retentionSkipReason === "settings_unknowable" || retentionSkipReason === "settings_invalid_key_set")
      lines.push(
        "Transcript retention cleanup is paused until the settings errors above are fixed (cleanupPeriodDays cannot be determined reliably).",
      );
  }
  for (let statusNotice of statusNotices) lines.push(statusNotice.message);
  lines.push(...(await collectPermissionRuleWarningLines()).map(cleanForDisplay));
  for (let [linkPath, warningText] of managedLinkWarningLines())
    lines.push(`${linkPath}
${warningText}`);
  lines.push(...managedHelperEnvNotes());
  diagnostic.warnings.forEach((warning) => {
    lines.push(warning.issue);
  });
  if (diagnostic.hasUpdatePermissions === false) lines.push("No write permissions for auto-updates");
  return lines;
}
//@ chunk-j8bb1zkh.js:8678-8816 layout
function probeRefreshTokenDead(storageV5) {
  if (!(isStorageV5Enabled() && storageV5 !== undefined)) return;
  return (async () => ({
    refreshKnownDead: isAnthropicAuthEnabled() && (await isOAuthRefreshKnownDeadAsync(storageV5)),
  }))().catch(() => ({
    refreshKnownDead: false,
  }));
}
//@ chunk-j8bb1zkh.js:8816-10182 fingerprint = buildAccountProperties (0.552)
/**
 * /status 的账号信息：登录方式、组织、邮箱、令牌是否过期。
 */
function buildAccountProperties(storage) {
  let accountInfo = getAccountInformation();
  if (!accountInfo) return [];
  let properties = [];
  if (
    storage !== undefined && isStorageV5Enabled()
      ? storage.refreshKnownDead
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
  let notInUse = " \xB7 not in use";
  let apiKeySource = accountInfo.apiKeySource ?? "none";
  let requestCredentials = getRequestCredentials(accountInfo.tokenSource ?? "none", apiKeySource);
  if (accountInfo.tokenSource)
    properties.push({
      label: "Auth token",
      value:
        requestCredentials.tokenSource === accountInfo.tokenSource
          ? accountInfo.tokenSource
          : `${accountInfo.tokenSource}${notInUse}`,
    });
  if (accountInfo.apiKeySource)
    properties.push({
      label: "API key",
      value: requestCredentials.apiKey ? accountInfo.apiKeySource : `${accountInfo.apiKeySource}${notInUse}`,
    });
  let apiKeyHelperLastFailure = getApiKeyHelperLastFailure();
  if (apiKeyHelperLastFailure && isApiKeyHelperTheActiveCredential())
    properties.push({
      label: "apiKeyHelper",
      value: env.IS_DEMO
        ? "Failing"
        : `Failing \u2014 last run ${clippedMessage(apiKeyHelperLastFailure, MAX_CLIP_CHARS)}`,
    });
  let usesProfile = shouldUseWIFAuth();
  let profileInUse = usesProfile && getRequestCredentials("profile", apiKeySource).tokenSource === "profile";
  if (usesProfile)
    properties.push({
      label: "Profile",
      value: `${getWIFStatusLine()}${profileInUse ? "" : notInUse}`,
    });
  if (profileInUse) {
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
function redactUrlCredentials(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    parsed = undefined;
  }
  if (parsed?.host) {
    if (!parsed.username && !parsed.password) return url;
    let redacted = new URL(parsed.href);
    redacted.username = "***";
    redacted.password = "";
    return redacted.href;
  }
  let index = url.lastIndexOf("@");
  if (index < 0) return url;
  return `${/^[a-z][a-z0-9+.-]*:\/\//i.exec(url)?.[0] ?? ""}***${url.slice(index)}`;
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
    let project = env.ANTHROPIC_GOOGLE_CLOUD_PROJECT || env.GOOGLE_CLOUD_PROJECT;
    if (project)
      properties.push({
        label: "GCP project",
        value: project,
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
  let label = modelDisplayString(mainLoopModel);
  let activeModelFallback = getActiveModelFallback();
  if (activeModelFallback !== undefined)
    return `${label} (${describeAutoSwitchedModel(modelDisplayString(activeModelFallback.previousModel))})`;
  return label;
}
//@ chunk-2wrddneh.js:14173-14717 placement
async function buildStatusSections({ credentials, mainLoopModel, mcp, permissionMode, remoteSessionName }) {
  let cwd = getCwd();
  let [accountStatus, machineStatus] = await Promise.all([
    probeRefreshTokenDead(credentials),
    noopMachineStatusHook(cwd),
  ]);
  let [primary, environment, internal] = moveAntOnlyToEnd([
    buildPrimarySection({
      sessionId: getSessionId(),
      remoteSessionName,
      cwd,
      accountStatus,
      machineStatus,
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
  let toRows = (rows) =>
    statusValueRows(rows ?? []).map((row) => ({
      ...row,
      value: stripAnsi(row.value).replace(DEBUG_DETAILS_SUFFIX, ""),
    }));
  return [
    {
      title: "Session",
      rows: toRows(primary),
    },
    {
      title: "Environment",
      rows: toRows(environment),
    },
    {
      title: "Internal",
      rows: toRows(internal),
    },
  ].filter((section) => section.rows.length > 0);
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
  buildStatusSections,
};
