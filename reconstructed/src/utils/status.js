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
import { r, e } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../ink/components/Text.js";
import { color } from "../components/design-system/color.js";
import { re } from "../../vendor/@inquirer/figures/dist/esm/index.js";
import { r1 } from "../services/mcp/redactMcpErrors.js";
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
import { fjt, withheldInstructionNotice, yfn } from "./instructionFileAccess.js";
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
import { exi } from "./settings/policyHelper/helperRemote.js";
import { eZ, MANAGED_SETTINGS_NOTICE } from "../components/ManagedSettingsNotice.js";
import {
  shouldAllowManagedPermissionRulesOnly,
  getIgnoredFrontmatterToolGrants,
} from "./permissions/permissionsLoader.js";
import {
  getRemoteSettingsLoadState,
  shouldWarnRemoteSettings,
  describeRemoteSettingsStatus,
} from "../services/cloudSessions/eligibility.js";
import {
  getPolicyFetchStatus,
  isPolicyFetchProblem,
  formatPolicyFetchStatus,
} from "../services/policyLimits/policyFetchStatus.js";
import { describeClientDataStatus } from "../services/clientDataUrl.js";
import { j3n } from "./permissions/serverClassifier/arbiter.js";
import { checkInstall } from "./nativeInstaller/installer.js";
import { processWrapperRecord, processWrapperError, isProcessWrapperUsable } from "./processWrapper.js";
import { getLaunchCommand } from "./deepLink/registerProtocol.js";
import { readLiveServerLock } from "./daemon/daemonLock.js";
import { truncateToLength, Dr, ql, bV, oEr } from "./stringUtils.js";
import { Yn } from "./stripAnsi.js";
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
import { Gmn } from "./machineStatus.js";
import { buildPrimarySection, buildSecondarySection, Syo } from "../components/Settings/Status.js";

/**
 * 把状态项转为显示行，跳过空值或 none。
 */
//@ chunk-j8bb1zkh.js:1796-2024 placement
function statusValueRows(l) {
  let t = [];
  for (let u of l) {
    let a = typeof u.value === "string" ? u.value : Array.isArray(u.value) ? u.value.join(", ") : null;
    if (a === null || a === "" || a === "none") continue;
    t.push(u.label ? { label: u.label, value: a } : { value: a });
  }
  return t;
}
/**
 * 把各组中仅内部的状态项移到最后一组。
 */
//@ chunk-j8bb1zkh.js:2024-2142 placement
function moveAntOnlyToEnd(l) {
  let mapped = l.map((u) => u.filter((a) => !a.antOnly));
  return (mapped.push(l.flatMap((u) => u.filter((a) => a.antOnly))), mapped);
}
//@ chunk-j8bb1zkh.js:2142-2180 placement
var yr = require("./chunk-pky8b2sx.js");
//@ chunk-j8bb1zkh.js:2180-2204 placement
function fPs() {
  return [];
}
//@ chunk-j8bb1zkh.js:2204-2228 placement
function pPs() {
  return [];
}
//@ chunk-j8bb1zkh.js:2228-2252 placement
function mPs() {
  return [];
}
//@ chunk-j8bb1zkh.js:2252-3173 fingerprint = buildIDEProperties (0.875)
function buildIDEProperties(mcpClients, ideInstallationStatus = null, theme) {
  let ideClient = mcpClients?.find((client) => client.name === "ide"),
    d = Boolean(ideInstallationStatus?.error) && ideClient?.type === "connected";
  if (ideInstallationStatus && !d) {
    let ideName = toIDEDisplayName(ideInstallationStatus.ideType),
      pluginOrExtension = isJetBrainsIde(ideInstallationStatus.ideType) ? "plugin" : "extension";
    if (ideInstallationStatus.error)
      return [
        {
          label: "IDE",
          value: r(Text, {
            children: [
              color("error", theme)(re.cross),
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
      if (ideClient && ideClient.type === "connected")
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
      else return [{ label: "IDE", value: `Installed ${ideName} ${pluginOrExtension}` }];
  } else if (ideClient) {
    let o = getIdeClientName(ideClient) ?? "IDE";
    if (ideClient.type === "connected") return [{ label: "IDE", value: `Connected to ${o} extension` }];
    else return [{ label: "IDE", value: `${color("error", theme)(re.cross)} Not connected to ${o}` }];
  }
  return [];
}
//@ chunk-j8bb1zkh.js:3173-4041 fingerprint = buildMcpProperties (0.892)
function buildMcpProperties(clients = [], theme) {
  let servers = clients.filter((client) => client.name !== "ide" && !r1(client));
  if (!servers.length) return [];
  let a = { connected: 0, cached: 0, pending: 0, needsAuth: 0, disabled: 0, failed: 0 };
  for (let o of servers)
    switch (o.type) {
      case "connected":
        a.connected++;
        break;
      case "cached":
        a.cached++;
        break;
      case "pending":
        a.pending++;
        break;
      case "needs-auth":
        a.needsAuth++;
        break;
      case "disabled":
        a.disabled++;
        break;
      case "failed":
        a.failed++;
        break;
      default:
    }
  let parts = [];
  if (a.connected) parts.push(color("success", theme)(`${a.connected} connected`));
  if (a.cached) parts.push(color("inactive", theme)(`${a.cached} cached`));
  if (a.needsAuth) parts.push(color("warning", theme)(`${a.needsAuth} need auth`));
  if (a.pending) parts.push(color("inactive", theme)(`${a.pending} pending`));
  if (a.disabled) parts.push(color("inactive", theme)(`${a.disabled} disabled`));
  if (a.failed) parts.push(color("error", theme)(`${a.failed} failed`));
  return [{ label: "MCP servers", value: `${parts.join(", ")} ${color("inactive", theme)("\xB7 /mcp")}` }];
}
/**
 * /status 与 doctor 的记忆诊断：CLAUDE.md 过大等警告。
 */
//@ chunk-j8bb1zkh.js:4041-4783 fingerprint = buildMemoryDiagnostics (0.402)
async function buildMemoryDiagnostics(l, t, u) {
  if (isClaudeMdLoadingDisabled()) return [];
  let a = await getMemoryFilesCached(l, !1, t, u),
    largeFiles = getLargeMemoryFiles(a),
    diagnostics = [],
    c = getOversizedMemoryWarning(a);
  if (c)
    diagnostics.push(
      `Instruction files will impact performance: ${c.summary.fileCount} files, ${formatNumber(c.summary.totalChars)} chars in total > ${formatNumber(c.summary.totalLimitChars)}`,
    );
  let g = getMaxMemoryFileChars();
  largeFiles.forEach((file) => {
    let displayPath = getDisplayPath(file.path);
    diagnostics.push(
      `Large ${displayPath} will impact performance (${formatNumber(file.content.length)} chars > ${formatNumber(g)})`,
    );
  });
  let f = fjt(getWithheldInstructionFiles(l));
  for (let { path: path, why: why } of f.shown) {
    let v = withheldInstructionNotice(why, getDisplayPath(path));
    diagnostics.push(
      r(
        Box,
        {
          flexDirection: "column",
          flexShrink: 1,
          children: [
            e(Text, { children: v.lead }),
            r(Box, {
              flexDirection: "row",
              children: [
                e(Box, { flexShrink: 0, marginRight: 1, children: e(Text, { children: v.mark }) }),
                e(Text, { bold: !0, wrap: "truncate-start", children: v.path }),
              ],
            }),
          ],
        },
        path,
      ),
    );
  }
  if (f.more > 0) diagnostics.push(yfn(f));
  return diagnostics;
}
//@ chunk-j8bb1zkh.js:4783-4929 layout
function formatMergedManagedSettingsLabel(l = "remote") {
  let t = getMergedPolicySources();
  if (!t) return null;
  return `Enterprise managed settings (${t.map((a) => (a === "remote" ? l : buildSettingSourcesProperties(a))).join(" + ")}, merged)`;
}
//@ chunk-j8bb1zkh.js:4929-6036 layout
function buildSettingSourcesStatusProperties() {
  let l = getEnabledSettingSources(),
    t = getArmedHelperOutput(),
    d = [
      {
        label: "Setting sources",
        value: l
          .filter((p) => {
            if (p === "policySettings" && t.composes !== "none") return !0;
            let m = getSettingsForSource(p);
            return m !== null && Object.keys(m).length > 0;
          })
          .map((p) => {
            if (p === "policySettings") {
              if (t.composes !== "none") {
                let v = t.composes === "remoteSlot",
                  S = exi()
                    ? `${v ? "remote " : ""}default settings payload`
                    : v
                      ? "remote helper"
                      : "helper",
                  b = t.mergedOver ? `${S} merged over ${buildSettingSourcesProperties(t.mergedOver)}` : S;
                return (
                  (v ? formatMergedManagedSettingsLabel(b) : null) ?? `Enterprise managed settings (${b})`
                );
              }
              let m = getPolicySettingsOrigin();
              if (m === null) return null;
              return formatMergedManagedSettingsLabel() ?? formatManagedSettingsLabel(m);
            }
            return getSettingSourceDisplayNameCapitalized(p);
          })
          .filter((p) => p !== null),
      },
    ];
  if (eZ() !== void 0) d.push({ value: MANAGED_SETTINGS_NOTICE });
  let o = getShadowedManagedSources();
  if (o.length > 0) d.push({ label: "Skipped sources", value: o.map(formatManagedSettingsLabel) });
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
  let c = getRemoteSettingsLoadState();
  if (c && shouldWarnRemoteSettings(c))
    d.push({ label: "Managed settings (remote)", value: describeRemoteSettingsStatus(c) });
  let g = getPolicyFetchStatus();
  if (isPolicyFetchProblem(g)) d.push({ label: "Organization policy", value: formatPolicyFetchStatus(g) });
  let f = describeClientDataStatus();
  if (f !== void 0) d.push({ label: "Client data", value: f });
  return d;
}
//@ chunk-j8bb1zkh.js:6036-6121 fingerprint = buildSandboxProperties (0.534)
function buildSandboxProperties(l) {
  return [{ label: "Auto mode server", value: j3n(l) ? "Enabled" : "Disabled" }];
}
//@ chunk-j8bb1zkh.js:6121-6145 layout
function SPs() {
  return [];
}
/**
 * /status 的设置来源行：列出启用的来源与托管设置来源（helper/remote/plist/HKLM/file/HKCU）。
 */
//@ chunk-j8bb1zkh.js:6145-6406 fingerprint = buildSettingSourcesProperties (0.539)
function buildSettingSourcesProperties(l) {
  switch (l) {
    case "helper":
    case "remote":
    case "plist":
      return l;
    case "hklm":
      return "HKLM";
    case "file": {
      let { hasBase: hasBase, hasDropIns: hasDropIns } = getManagedFileSettingsPresence();
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
function formatManagedSettingsLabel(l) {
  return `Enterprise managed settings (${buildSettingSourcesProperties(l)})`;
}
//@ chunk-j8bb1zkh.js:6466-6557 file-local
async function buildInstallationDiagnostics() {
  return (await checkInstall()).filter((t) => t.type !== "error").map((warning) => warning.message);
}
//@ chunk-j8bb1zkh.js:6557-7982 layout
async function getProcessWrapperStatusNotices(l) {
  let t = processWrapperRecord(),
    u = processWrapperError();
  if (!t && !u) return [];
  let a = [];
  if (u)
    return (
      a.push(
        `${u} \u2014 nothing will run unwrapped: new background sessions are refused unless a background service that validated an earlier value is still serving them (\`claude daemon status\` shows it)`,
      ),
      a
    );
  let d = getLaunchCommand();
  if (
    (a.push(`Self-exec: \`${[d.cmd, ...d.prefixArgs].join(" ")}\` (CLAUDE_CODE_PROCESS_WRAPPER)`),
    !(await isProcessWrapperUsable()))
  )
    a.push(
      `The launcher \`${d.cmd}\` cannot run right now (deleted or not executable) \u2014 new background sessions are refused until it is restored; a background service that validated it earlier keeps serving its existing sessions (\`claude daemon status\`)`,
    );
  let o = await readLiveServerLock(1, l).catch(() => null);
  if (!o) return a;
  let [{ controlRequest: c }, { BG_PROTO: g }] = await Promise.all([
      import("./chunk-58s9qc52.js"),
      import("./chunk-6cpjz11h.js"),
    ]),
    f = await c({ proto: g, op: "nudge" }).catch(() => null),
    p = f?.ok && f.op === "nudge" ? (f.processWrapper ?? "") : (o.processWrapper ?? ""),
    m = truncateToLength(Dr(Yn(p)), 200);
  if (o.origin === "service")
    a.push(
      `The installed background service predates launcher support and runs outside \`${d.cmd}\`; its sessions are covered, the service process itself is not \u2014 a launcher-aware \`claude daemon install\` will close this`,
    );
  if (p !== t)
    a.push(
      `The running background service launches sessions via \`${m || "(no launcher)"}\`, but this session resolves \`${t}\` \u2014 restart it (and your running claude sessions) to converge`,
    );
  return a;
}
/**
 * 设置相关状态提示：无效条目所在文件、托管设置读取问题、转录保留期等。
 */
//@ chunk-j8bb1zkh.js:7982-8678 layout
async function getSettingsStatusNotices(l) {
  let t = await getDoctorDiagnostic({ storageV5: l }),
    u = [],
    { statusNotices: statusNotices, invalidEntries: invalidEntries } = splitStatusNotices(
      formatInvalidSettingNotice().errors,
    );
  if (invalidEntries.length > 0) {
    let joined = uniq(invalidEntries.map((f) => f.file && ql(f.file))).join(", ");
    u.push(`Found invalid entries in: ${joined}.`);
    let g = await retentionCleanupSkipReason(l);
    if (g === "settings_unknowable" || g === "settings_invalid_key_set")
      u.push(
        "Transcript retention cleanup is paused until the settings errors above are fixed (cleanupPeriodDays cannot be determined reliably).",
      );
  }
  for (let o of statusNotices) u.push(o.message);
  u.push(...(await collectPermissionRuleWarningLines()).map(ql));
  for (let [o, c] of managedLinkWarningLines())
    u.push(`${o}
${c}`);
  if (
    (u.push(...managedHelperEnvNotes()),
    t.warnings.forEach((warning) => {
      u.push(warning.issue);
    }),
    t.hasUpdatePermissions === !1)
  )
    u.push("No write permissions for auto-updates");
  return u;
}
//@ chunk-j8bb1zkh.js:8678-8816 layout
function probeRefreshTokenDead(l) {
  if (!(isStorageV5Enabled() && l !== void 0)) return;
  return (async () => ({
    refreshKnownDead: isAnthropicAuthEnabled() && (await isOAuthRefreshKnownDeadAsync(l)),
  }))().catch(() => ({ refreshKnownDead: !1 }));
}
/**
 * /status 的账号信息：登录方式、组织、邮箱、令牌是否过期。
 */
//@ chunk-j8bb1zkh.js:8816-10182 fingerprint = buildAccountProperties (0.552)
function buildAccountProperties(l) {
  let accountInfo = getAccountInformation();
  if (!accountInfo) return [];
  let properties = [];
  if (
    l !== void 0 && isStorageV5Enabled()
      ? l.refreshKnownDead
      : isAnthropicAuthEnabled() && isOAuthRefreshKnownDead()
  ) {
    properties.push({ label: "Login", value: "Expired \u2014 log in again" });
    let p = getOauthAccountInfo();
    if (p?.organizationName && !env.IS_DEMO)
      properties.push({ label: "Organization", value: p.organizationName });
    if (p?.emailAddress && !env.IS_DEMO) properties.push({ label: "Email", value: p.emailAddress });
    return properties;
  }
  if (accountInfo.subscription)
    properties.push({ label: "Login method", value: `${accountInfo.subscription} account` });
  let a = " \xB7 not in use",
    d = accountInfo.apiKeySource ?? "none",
    o = getRequestCredentials(accountInfo.tokenSource ?? "none", d);
  if (accountInfo.tokenSource)
    properties.push({
      label: "Auth token",
      value:
        o.tokenSource === accountInfo.tokenSource
          ? accountInfo.tokenSource
          : `${accountInfo.tokenSource}${a}`,
    });
  if (accountInfo.apiKeySource)
    properties.push({
      label: "API key",
      value: o.apiKey ? accountInfo.apiKeySource : `${accountInfo.apiKeySource}${a}`,
    });
  let c = getApiKeyHelperLastFailure();
  if (c && isApiKeyHelperTheActiveCredential())
    properties.push({
      label: "apiKeyHelper",
      value: env.IS_DEMO ? "Failing" : `Failing \u2014 last run ${bV(c, oEr)}`,
    });
  let g = shouldUseWIFAuth(),
    f = g && getRequestCredentials("profile", d).tokenSource === "profile";
  if (g) properties.push({ label: "Profile", value: `${getWIFStatusLine()}${f ? "" : a}` });
  if (f) {
    let p = getWIFAccountInfo();
    if (!env.IS_DEMO) {
      if (p?.organizationName || p?.organizationUuid)
        properties.push({
          label: "Organization",
          value: [p.organizationName, p.organizationUuid].filter(Boolean).join(" \xB7 "),
        });
      if (p?.accountEmail) properties.push({ label: "Email", value: p.accountEmail });
    }
  }
  if (accountInfo.organization && !env.IS_DEMO)
    properties.push({ label: "Organization", value: accountInfo.organization });
  if (accountInfo.email && !env.IS_DEMO) properties.push({ label: "Email", value: accountInfo.email });
  return properties;
}
/**
 * URL 含用户名或密码时脱敏后再显示。
 */
//@ chunk-j8bb1zkh.js:10182-10462 layout
function redactUrlCredentials(l) {
  let t;
  try {
    t = new URL(l);
  } catch {
    t = void 0;
  }
  if (t?.host) {
    if (!t.username && !t.password) return l;
    let d = new URL(t.href);
    return ((d.username = "***"), (d.password = ""), d.href);
  }
  let index = l.lastIndexOf("@");
  if (index < 0) return l;
  return `${/^[a-z][a-z0-9+.-]*:\/\//i.exec(l)?.[0] ?? ""}***${l.slice(index)}`;
}
/**
 * /status 的 API 提供方信息：提供方、base URL、区域、代理、允许的提供方等。
 */
//@ chunk-j8bb1zkh.js:10462-13570 fingerprint = buildAPIProviderProperties (0.615)
function buildAPIProviderProperties() {
  let apiProvider = getAPIProvider(),
    properties = [],
    u = getAllowedProviders();
  if (u !== void 0)
    properties.push({
      label: "Allowed providers",
      value:
        u.length === 0
          ? "none (managed allowedProviders is empty)"
          : `${u.map(allowedProviderLabel).join(", ")} (managed allowedProviders)`,
    });
  if (apiProvider !== "firstParty") {
    let o = getSecondaryProvider(),
      c = o
        ? `${THIRD_PARTY_PROVIDER_LABELS[apiProvider]} + ${THIRD_PARTY_PROVIDER_LABELS[o]}`
        : THIRD_PARTY_PROVIDER_LABELS[apiProvider];
    properties.push({ label: "API provider", value: c });
  }
  if (apiProvider === "firstParty") {
    let anthropicBaseUrl = env.ANTHROPIC_BASE_URL;
    if (anthropicBaseUrl)
      properties.push({ label: "Anthropic base URL", value: redactUrlCredentials(anthropicBaseUrl) });
  } else if (apiProvider === "bedrock") {
    let ANTHROPIC_BEDROCK_BASE_URL = env.ANTHROPIC_BEDROCK_BASE_URL;
    if (ANTHROPIC_BEDROCK_BASE_URL)
      properties.push({ label: "Bedrock base URL", value: redactUrlCredentials(ANTHROPIC_BEDROCK_BASE_URL) });
    properties.push({ label: "AWS region", value: formatAwsRegionForStatus() });
    let ANTHROPIC_BEDROCK_SERVICE_TIER = env.ANTHROPIC_BEDROCK_SERVICE_TIER;
    if (ANTHROPIC_BEDROCK_SERVICE_TIER)
      properties.push({ label: "Bedrock service tier", value: ANTHROPIC_BEDROCK_SERVICE_TIER });
    if (env.CLAUDE_CODE_SKIP_BEDROCK_AUTH) properties.push({ value: "AWS auth skipped" });
  } else if (apiProvider === "vertex") {
    let ANTHROPIC_VERTEX_BASE_URL = env.ANTHROPIC_VERTEX_BASE_URL;
    if (ANTHROPIC_VERTEX_BASE_URL)
      properties.push({ label: "Vertex base URL", value: redactUrlCredentials(ANTHROPIC_VERTEX_BASE_URL) });
    let gcpProject = env.ANTHROPIC_VERTEX_PROJECT_ID;
    if (gcpProject) properties.push({ label: "GCP project", value: gcpProject });
    if (
      (properties.push({ label: "Default region", value: getDefaultVertexRegion() }),
      env.CLAUDE_CODE_SKIP_VERTEX_AUTH)
    )
      properties.push({ value: "GCP auth skipped" });
  } else if (apiProvider === "foundry") {
    let foundryBaseUrl = env.ANTHROPIC_FOUNDRY_BASE_URL;
    if (foundryBaseUrl)
      properties.push({ label: "Microsoft Foundry base URL", value: redactUrlCredentials(foundryBaseUrl) });
    let foundryResource = env.ANTHROPIC_FOUNDRY_RESOURCE;
    if (foundryResource) properties.push({ label: "Microsoft Foundry resource", value: foundryResource });
    if (env.CLAUDE_CODE_SKIP_FOUNDRY_AUTH) properties.push({ value: "Microsoft Foundry auth skipped" });
  } else if (apiProvider === "anthropicAws") {
    let ANTHROPIC_AWS_BASE_URL = env.ANTHROPIC_AWS_BASE_URL;
    if (ANTHROPIC_AWS_BASE_URL)
      properties.push({
        label: "Claude Platform on AWS base URL",
        value: redactUrlCredentials(ANTHROPIC_AWS_BASE_URL),
      });
    let ANTHROPIC_AWS_WORKSPACE_ID = env.ANTHROPIC_AWS_WORKSPACE_ID;
    if (ANTHROPIC_AWS_WORKSPACE_ID)
      properties.push({ label: "Workspace ID", value: ANTHROPIC_AWS_WORKSPACE_ID });
    if (
      (properties.push({ label: "AWS region", value: getDefaultAwsRegion() }),
      env.CLAUDE_CODE_SKIP_ANTHROPIC_AWS_AUTH)
    )
      properties.push({ value: "Claude Platform on AWS auth skipped" });
  } else if (apiProvider === "anthropicGoogleCloud") {
    let ANTHROPIC_GOOGLE_CLOUD_BASE_URL = env.ANTHROPIC_GOOGLE_CLOUD_BASE_URL;
    if (ANTHROPIC_GOOGLE_CLOUD_BASE_URL)
      properties.push({
        label: "Claude Platform on Google Cloud base URL",
        value: redactUrlCredentials(ANTHROPIC_GOOGLE_CLOUD_BASE_URL),
      });
    let ANTHROPIC_GOOGLE_CLOUD_WORKSPACE_ID = env.ANTHROPIC_GOOGLE_CLOUD_WORKSPACE_ID;
    if (ANTHROPIC_GOOGLE_CLOUD_WORKSPACE_ID)
      properties.push({ label: "Workspace ID", value: ANTHROPIC_GOOGLE_CLOUD_WORKSPACE_ID });
    let g = env.ANTHROPIC_GOOGLE_CLOUD_PROJECT || env.GOOGLE_CLOUD_PROJECT;
    if (g) properties.push({ label: "GCP project", value: g });
    if (
      (properties.push({ label: "GCP location", value: env.ANTHROPIC_GOOGLE_CLOUD_LOCATION || "global" }),
      env.CLAUDE_CODE_SKIP_ANTHROPIC_GOOGLE_CLOUD_AUTH)
    )
      properties.push({ value: "Claude Platform on Google Cloud auth skipped" });
  } else if (apiProvider === "gateway") {
    let proxyUrl = getGatewayAuth();
    if (proxyUrl) {
      if (
        (properties.push({ label: "Gateway URL", value: redactUrlCredentials(proxyUrl.url) }),
        proxyUrl.email && !env.IS_DEMO)
      )
        properties.push({ label: "Gateway account", value: proxyUrl.email });
    }
  }
  if (apiProvider === "mantle" || getSecondaryProvider() === "mantle") {
    let ANTHROPIC_BEDROCK_MANTLE_BASE_URL = env.ANTHROPIC_BEDROCK_MANTLE_BASE_URL;
    if (ANTHROPIC_BEDROCK_MANTLE_BASE_URL)
      properties.push({
        label: "Amazon Bedrock (Mantle) base URL",
        value: redactUrlCredentials(ANTHROPIC_BEDROCK_MANTLE_BASE_URL),
      });
    if (apiProvider === "mantle") properties.push({ label: "AWS region", value: formatAwsRegionForStatus() });
    if (env.CLAUDE_CODE_SKIP_MANTLE_AUTH) properties.push({ value: "Amazon Bedrock (Mantle) auth skipped" });
  }
  let mtlsConfig = getProxyUrl();
  if (mtlsConfig)
    properties.push({
      label: "Proxy",
      value: parseProxyUrl(mtlsConfig)
        ? redactUrlCredentials(mtlsConfig)
        : `${redactUrlCredentials(mtlsConfig).replace(/\p{Cc}/gu, "")} (invalid \u2014 ignored; fix or unset the proxy env var)`,
    });
  let d = getMTLSConfig();
  if (env.NODE_EXTRA_CA_CERTS)
    properties.push({ label: "Additional CA cert(s)", value: env.NODE_EXTRA_CA_CERTS });
  if (d) {
    if (d.cert && env.CLAUDE_CODE_CLIENT_CERT)
      properties.push({ label: "mTLS client cert", value: env.CLAUDE_CODE_CLIENT_CERT });
    if (d.key && env.CLAUDE_CODE_CLIENT_KEY)
      properties.push({ label: "mTLS client key", value: env.CLAUDE_CODE_CLIENT_KEY });
  }
  return properties;
}
//@ chunk-j8bb1zkh.js:13570-13931 placement
function formatAwsRegionForStatus() {
  let { region: region, source: source } = describeAwsRegion();
  switch (source) {
    case "env":
      return region;
    case "shared-config":
      return `${region} (from AWS config)`;
    case "env-invalid":
    case "default":
      return (
        resolveAwsRegion(),
        source === "env-invalid"
          ? `${region} (default \u2014 region env var invalid, ignored; fix or unset AWS_REGION / AWS_DEFAULT_REGION)`
          : `${region} (default \u2014 set AWS_REGION or add a region to your AWS config)`
      );
  }
}
//@ chunk-j8bb1zkh.js:13931-14033 placement
function modelStatusLabel(l) {
  let t = modelDisplayString(l),
    u = getActiveModelFallback();
  if (u !== void 0) return `${t} (${describeAutoSwitchedModel(modelDisplayString(u.previousModel))})`;
  return t;
}
//@ chunk-06y4szbn.js:65501-65613 fingerprint = buildInstallationHealthDiagnostics (0.329)
async function buildInstallationHealthDiagnostics(e, n) {
  let r = await e;
  return r.err === null && n.length > 0 ? { ...r, warnings: [...(r.warnings ?? []), ...n] } : r;
}
//@ chunk-2wrddneh.js:14173-14717 placement
async function buildStatusSections({
  credentials: credentials,
  mainLoopModel: mainLoopModel,
  mcp: mcp,
  permissionMode: permissionMode,
  remoteSessionName: remoteSessionName,
}) {
  let o = getCwd(),
    [m, l] = await Promise.all([probeRefreshTokenDead(credentials), Gmn(o)]),
    [S, c, d] = moveAntOnlyToEnd([
      buildPrimarySection({
        sessionId: getSessionId(),
        remoteSessionName: remoteSessionName,
        cwd: o,
        accountStatus: m,
        machineStatus: l,
        webSetupStatus: void 0,
      }),
      buildSecondarySection({
        mainLoopModel: mainLoopModel,
        mcp: mcp,
        theme: "dark",
        ideInstallationStatus: null,
        permissionMode: permissionMode,
      }),
    ]),
    t = (e) => statusValueRows(e ?? []).map((r) => ({ ...r, value: Yn(r.value).replace(Syo, "") }));
  return [
    { title: "Session", rows: t(S) },
    { title: "Environment", rows: t(c) },
    { title: "Internal", rows: t(d) },
  ].filter((e) => e.rows.length > 0);
}

export {
  buildInstallationHealthDiagnostics,
  buildAccountProperties,
  buildAPIProviderProperties,
  modelStatusLabel,
  mPs,
  buildIDEProperties,
  buildMcpProperties,
  pPs,
  fPs,
  buildSettingSourcesStatusProperties,
  buildSandboxProperties,
  SPs,
  buildInstallationDiagnostics,
  getSettingsStatusNotices,
  getProcessWrapperStatusNotices,
  buildMemoryDiagnostics,
  probeRefreshTokenDead,
  moveAntOnlyToEnd,
  statusValueRows,
};
