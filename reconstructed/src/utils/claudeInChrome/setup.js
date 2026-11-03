/**
 * utils/claudeInChrome/setup.ts
 *
 * Claude in Chrome 启用判定与接入：组织策略/作用域/--chrome/默认设置/自动启用，生成 MCP 配置与系统提示，安装原生宿主清单与包装脚本。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/claudeInChrome/setup.ts
 * pieces: chunk-s61vbvea.js (24)
 * attribution: placement 1, sole-consumer 1, facade-majority 17, fingerprint 4, layout 1
 */
import {
  homedir,
  homedir as homedir_2,
  homedir as homedir_3,
  homedir as homedir_4,
  homedir as homedir_5,
  homedir as homedir_6,
  homedir as homedir_7,
} from "os";
import {
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
  join as join_8,
  join as join_9,
  join as join_10,
  join as join_11,
  join as join_12,
  join as join_13,
  join as join_14,
  join as join_15,
  join as join_16,
  join as join_17,
  join as join_18,
  join as join_19,
  join as join_20,
} from "path";
import {
  readFile,
  readFile as readFile_2,
  readFile as readFile_3,
  readFile as readFile_4,
  mkdir,
  mkdir as mkdir_2,
  mkdir as mkdir_3,
  mkdir as mkdir_4,
  writeFile,
  writeFile as writeFile_2,
  writeFile as writeFile_3,
  chmod,
} from "fs/promises";
import { FCOEOABGFENEJGLBFFODGKKBKCDHCGFN } from "../../commands/chrome/chrome.js";
import { detectExtensionInstallationPortable, getAllBrowserDataPathsPortable } from "./setupPortable.js";
import { isPolicyAllowed } from "../../services/policyLimits/policyEvidence.js";
import { canAuthenticateChromeBridge, isClaudeAISubscriber } from "../auth.js";
import { logForDebugging } from "../debug.js";
import { isBareMode, getClaudeConfigDir } from "../envUtils.js";
import { env } from "../env.js";
import {
  getIsNonInteractiveSession,
  getChromeFlagOverride,
  getIsInteractive,
  getSessionBypassPermissionsMode,
} from "../../bootstrap/state.js";
import { Jqr } from "../nativeInstaller/installer.js";
import { getGlobalConfig, saveGlobalConfig } from "../config.js";
import { g5e } from "../managedEnvSafety.js";
import { Yi } from "../../commands/mobile/mobile.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import {
  CLAUDE_IN_CHROME_MCP_SERVER_NAME,
  getClaudeInChromeStdioServerConfig,
  getAllNativeMessagingHostsDirs,
  openInChrome,
  getAllWindowsRegistryKeys,
} from "./common.js";
import { mn } from "../remoteEnvironment.js";
import {
  isRunningFromVersionsDir,
  resolveClaudePath,
  resolveLaunchTarget,
} from "../deepLink/registerProtocol.js";
import { isAcceptableHostSymlink } from "./_new/isAcceptableHostSymlink.js";
import { maybeAddBrowserBatchToChromeSelect, isToolSearchEnabledOptimistic } from "../toolSearch.js";
import { getChromeSystemPrompt } from "../toolSearchChrome.js";
import { isClaudeAiProxyServer } from "../../services/mcp/builtinServerNames.js";
import { getPlatform as getPlatform_2 } from "../platform.js";
import { withFeatureTelemetry } from "../../services/analytics/featureTelemetry.js";
import { jsonStringify } from "../slowOperations.js";
import { isENOENT } from "../errors.js";
import { logError } from "../log.js";
import { execFileNoThrowWithCwd } from "../execFileNoThrow.js";
import { shellQuoteArgs } from "../bash/bashPipeCommand.js";

//@ chunk-s61vbvea.js:505333-505358 placement
function getExtensionIds() {
  return [FCOEOABGFENEJGLBFFODGKKBKCDHCGFN];
}
/**
 * detectExtensionInstallationPortable 的布尔包装。
 */
//@ chunk-s61vbvea.js:507541-507598 sole-consumer = isChromeExtensionInstalledPortable (1)
async function isChromeExtensionInstalledPortable(browserPaths, log) {
  return (await detectExtensionInstallationPortable(browserPaths, log)).isInstalled;
}
/**
 * 原生宿主标识 com.anthropic.claude_code_browser_extension、清单文件名、扩展重连页 https://clau.de/chrome/reconnect。
 */
//@ chunk-s61vbvea.js:507598-507706 facade-majority = CHROME_RECONNECT_URL (0.561)
var CHROME_EXTENSION_RECONNECT_URL = "https://clau.de/chrome/reconnect",
  NATIVE_HOST_IDENTIFIER = "com.anthropic.claude_code_browser_extension",
  NATIVE_HOST_MANIFEST_NAME = `${NATIVE_HOST_IDENTIFIER}.json`;
/**
 * 组织策略 allow_claude_browser_extension 是否允许 Claude in Chrome。
 */
//@ chunk-s61vbvea.js:507706-507764 facade-majority
function isClaudeInChromeAllowed() {
  return isPolicyAllowed("allow_claude_browser_extension");
}
/**
 * 决定本会话是否启用 Claude in Chrome：组织允许 + OAuth 令牌有 user:profile/user:office/user:ccr_inference 作用域；--chrome/--no-chrome 优先，其次 CLAUDE_CODE_ENABLE_CFC，再看全局配置 claudeInChromeDefaultEnabled（远程/Cowork 会话忽略该默认）。
 */
//@ chunk-s61vbvea.js:507764-508548 facade-majority
function shouldEnableClaudeInChrome(chromeFlag) {
  if (!isClaudeInChromeAllowed()) return !1;
  if (!canAuthenticateChromeBridge())
    return (
      logForDebugging(
        "[Claude in Chrome] Disabled: OAuth token has no scope accepted by /api/oauth/validate (needs user:profile, user:office, or user:ccr_inference; env-var and setup-token sessions default to user:inference only)",
      ),
      !1
    );
  if (chromeFlag === !0) return !0;
  if (chromeFlag === !1) return !1;
  if (isBareMode()) return !1;
  if (env.CLAUDE_CODE_ENABLE_CFC === !0) return !0;
  if (env.CLAUDE_CODE_ENABLE_CFC === !1) return !1;
  if (getIsNonInteractiveSession() && !Jqr()) return !1;
  let config = getGlobalConfig();
  if (config.claudeInChromeDefaultEnabled && !savedChromeDefaultCounts())
    return (
      logForDebugging(
        '[Claude in Chrome] Ignoring "Enabled by default": a remote or Cowork session connects Chrome at start-up only with --chrome or with CLAUDE_CODE_ENABLE_CFC=1 in the environment it is started with',
      ),
      !1
    );
  if (config.claudeInChromeDefaultEnabled !== void 0) return config.claudeInChromeDefaultEnabled;
  return !1;
}
/**
 * 非远程/非 Cowork 会话时返回 true，即保存的"默认启用 Chrome"设置是否生效。
 */
//@ chunk-s61vbvea.js:508548-508576 facade-majority
function savedChromeDefaultCounts() {
  return !g5e();
}
/**
 * 提供 Chrome 选项的基本资格：未被 --chrome 覆盖关闭、未设 CLAUDE_CODE_ENABLE_CFC=false、尚未设置默认、本地交互会话、claude.ai 订阅登录且令牌作用域合格。
 */
//@ chunk-s61vbvea.js:508576-508710 facade-majority = shouldEnableClaudeInChrome (1)
function hasBaseChromeOfferEligibility() {
  return (
    getChromeFlagOverride() !== !1 &&
    env.CLAUDE_CODE_ENABLE_CFC !== !1 &&
    getGlobalConfig().claudeInChromeDefaultEnabled === void 0 &&
    savedChromeDefaultCounts() &&
    getIsInteractive() &&
    isClaudeAISubscriber() &&
    canAuthenticateChromeBridge()
  );
}
/**
 * 是否有扩展已安装的证据：缓存的 cachedChromeExtensionInstalled 或已配对设备。
 */
//@ chunk-s61vbvea.js:508710-508825 facade-majority = isChromeExtensionInstalled_CACHED_MAY_BE_STALE (0.504)
function hasChromeExtensionEvidence() {
  let config = getGlobalConfig();
  return config.cachedChromeExtensionInstalled === !0 || Boolean(config.chromeExtension?.pairedDeviceId);
}
/**
 * 是否自动启用 Chrome（会话内缓存）：组织允许 + 基本资格 + 检测到扩展 + GrowthBook tengu_chrome_auto_enable。
 */
//@ chunk-s61vbvea.js:508825-509028 facade-majority = shouldAutoEnableClaudeInChrome (0.516)
function shouldAutoEnableClaudeInChrome(e) {
  if (!isClaudeInChromeAllowed()) return !1;
  let chromeState = Yi();
  if (chromeState.shouldAutoEnable !== void 0) return chromeState.shouldAutoEnable;
  return (
    (chromeState.shouldAutoEnable =
      hasBaseChromeOfferEligibility() &&
      (refreshExtensionInstalledCache(e) || hasChromeExtensionEvidence()) &&
      getFeatureValue_CACHED_MAY_BE_STALE("tengu_chrome_auto_enable", !1)),
    chromeState.shouldAutoEnable
  );
}
/**
 * 本会话是否已接入 Chrome MCP（wiredThisSession）。
 */
//@ chunk-s61vbvea.js:509028-509072 facade-majority
function isClaudeInChromeWiredThisSession() {
  return Yi().wiredThisSession;
}
/**
 * 标记本会话未接入 Chrome（例如策略阻止后）。
 */
//@ chunk-s61vbvea.js:509072-509112 facade-majority
function markClaudeInChromeUnwired() {
  Yi().wiredThisSession = !1;
}
/**
 * 若服务器名是 claude-in-chrome，则标记未接入。
 */
//@ chunk-s61vbvea.js:509112-509144 facade-majority
function markClaudeInChromeUnwiredIfChrome(e) {
  if (e === CLAUDE_IN_CHROME_MCP_SERVER_NAME) markClaudeInChromeUnwired();
}
/**
 * 重新标记本会话已接入 Chrome。
 */
//@ chunk-s61vbvea.js:509144-509184 facade-majority
function markClaudeInChromeRewired() {
  Yi().wiredThisSession = !0;
}
/**
 * 在 SSH 待定、远程模式、teleport、安全模式、bypass 权限、plan+可 bypass、队友代理等情况下不提供 Chrome。
 */
//@ chunk-s61vbvea.js:509184-509397 facade-majority
function shouldSuppressChromeOffer({
  isSSHPending: isSSHPending,
  isRemoteMode: isRemoteMode,
  hasTeleport: hasTeleport,
  isSafeMode: isSafeMode,
  permissionMode: permissionMode,
  isBypassPermissionsModeAvailable: isBypassPermissionsModeAvailable,
  teammateAgentId: teammateAgentId,
}) {
  return (
    isSSHPending ||
    isRemoteMode ||
    hasTeleport ||
    isSafeMode ||
    permissionMode === "bypassPermissions" ||
    (permissionMode === "plan" && isBypassPermissionsModeAvailable) ||
    teammateAgentId !== void 0
  );
}
/**
 * 接入 Claude in Chrome：后台创建原生宿主包装脚本并安装清单（CLAUDE_CODE_CHROME_LATE_MCP_SERVER 且远程时跳过），返回 mcpConfig {"claude-in-chrome": 当前可执行文件 --claude-in-chrome-mcp, scope dynamic}（bypass 会话加 CLAUDE_CHROME_PERMISSION_MODE=skip_all_permission_checks）以及 Chrome 系统提示片段（CLAUDE_CODE_DISABLE_CFC_PROMPT 可关）。
 */
//@ chunk-s61vbvea.js:509397-509984 facade-majority = setupClaudeInChrome (0.436)
function setupClaudeInChrome(e) {
  let n = [],
    env_2 = {};
  if (getSessionBypassPermissionsMode()) env_2.CLAUDE_CHROME_PERMISSION_MODE = "skip_all_permission_checks";
  let hasEnv = Object.keys(env_2).length > 0;
  return (
    (async () => {
      if (env.CLAUDE_CODE_CHROME_LATE_MCP_SERVER === !0 && mn()) return;
      let h = isRunningFromVersionsDir() && !(await isAcceptableHostSymlink(resolveClaudePath())),
        { cmd: cmd, prefixArgs: prefixArgs } = resolveLaunchTarget({ pinToCurrentBinary: h }),
        w = await createWrapperScript([cmd, ...prefixArgs, "--chrome-native-host"]);
      await installChromeNativeHostManifest(w, e);
    })().catch((manifestBinaryPath) =>
      logForDebugging(`[Claude in Chrome] Failed to install native host: ${manifestBinaryPath}`, {
        level: "error",
      }),
    ),
    (Yi().wiredThisSession = !0),
    {
      mcpConfig: {
        [CLAUDE_IN_CHROME_MCP_SERVER_NAME]: {
          ...getClaudeInChromeStdioServerConfig(),
          ...(hasEnv && { env: env_2 }),
        },
      },
      allowedTools: n,
      systemPrompt:
        env.CLAUDE_CODE_DISABLE_CFC_PROMPT === !0
          ? ""
          : maybeAddBrowserBatchToChromeSelect(getChromeSystemPrompt(isToolSearchEnabledOptimistic())),
    }
  );
}
/**
 * --mcp-config 里是否已有远程会话宿主提供的 claude-in-chrome（scope dynamic 且是内置启动方式）。
 */
//@ chunk-s61vbvea.js:509984-510058 facade-majority = toScopedConfig (1)
function hasHostedClaudeInChromeServer(config) {
  let entry = config[CLAUDE_IN_CHROME_MCP_SERVER_NAME];
  return entry !== void 0 && entry.scope === "dynamic" && isClaudeAiProxyServer(entry);
}
/**
 * 采用宿主提供的 Chrome 服务器：标记已接入并只返回系统提示片段。
 */
//@ chunk-s61vbvea.js:510058-510176 facade-majority
function adoptHostedClaudeInChrome() {
  return (
    (Yi().wiredThisSession = !0),
    {
      systemPrompt:
        env.CLAUDE_CODE_DISABLE_CFC_PROMPT === !0
          ? ""
          : maybeAddBrowserBatchToChromeSelect(getChromeSystemPrompt(isToolSearchEnabledOptimistic())),
    }
  );
}
/**
 * 保存本会话的 Chrome 系统提示片段。
 */
//@ chunk-s61vbvea.js:510176-510219 facade-majority
function putChromePromptInSystemPrompt(e) {
  Yi().systemPromptSection = e;
}
/**
 * 原生宿主清单的安装目录：Windows 为 %APPDATA%/Claude Code/ChromeNativeHost，其他平台为各浏览器 NativeMessagingHosts 目录。
 */
//@ chunk-s61vbvea.js:510219-510380 fingerprint = getNativeMessagingHostsDirs (1)
function getNativeMessagingHostsDirs() {
  if (getPlatform_2() === "windows") {
    let platform = homedir_6(),
      appData = env.APPDATA || join_16(platform, "AppData", "Local");
    return [join_16(appData, "Claude Code", "ChromeNativeHost")];
  }
  return getAllNativeMessagingHostsDirs().map(({ path: path }) => path);
}
/**
 * 向各目录写原生宿主清单 com.anthropic.claude_code_browser_extension.json（stdio、path=包装脚本、allowed_origins 只含生产扩展 ID），内容相同则跳过；Windows 另写注册表；首次安装且扩展已装时打开重连页。
 */
//@ chunk-s61vbvea.js:510380-511493 fingerprint = installChromeNativeHostManifest (0.826)
async function installChromeNativeHostManifest(e, n) {
  return withFeatureTelemetry("chrome_native_host_install", async () => {
    let manifestDirs = getNativeMessagingHostsDirs();
    if (manifestDirs.length === 0) throw Error("Claude in Chrome Native Host not supported on this platform");
    let manifest = {
        name: NATIVE_HOST_IDENTIFIER,
        description: "Claude Code Browser Extension Native Host",
        path: e,
        type: "stdio",
        allowed_origins: ["chrome-extension://fcoeoabgfenejglbffodgkkbkcdhcgfn/", ...[]],
      },
      manifestContent = jsonStringify(manifest, null, 2),
      anyManifestExisted = !1,
      wroteNewManifest = !1;
    for (let manifestDir of manifestDirs) {
      let manifestPath = join_16(manifestDir, NATIVE_HOST_MANIFEST_NAME),
        readErrorCode = !1,
        existingContent = await readFile_3(manifestPath, "utf-8").catch(
          (j) => ((readErrorCode = isENOENT(j)), null),
        );
      if (!readErrorCode) anyManifestExisted = !0;
      if (existingContent === manifestContent) continue;
      try {
        if (
          (await mkdir_4(manifestDir, { recursive: !0 }),
          await writeFile_3(manifestPath, manifestContent),
          logForDebugging(`[Claude in Chrome] Installed native host manifest at: ${manifestPath}`),
          readErrorCode)
        )
          wroteNewManifest = !0;
      } catch (error) {
        logForDebugging(`[Claude in Chrome] Failed to install manifest at ${manifestPath}: ${error}`);
      }
    }
    if (getPlatform_2() === "windows") {
      let manifestPath = join_16(manifestDirs[0], NATIVE_HOST_MANIFEST_NAME);
      registerWindowsNativeHosts(manifestPath);
    }
    if (wroteNewManifest && !anyManifestExisted && !n?.skipReconnectAutoOpen)
      isChromeExtensionInstalled()
        .then((isInstalled) => {
          if (isInstalled)
            (logForDebugging(
              "[Claude in Chrome] First-time install detected, opening reconnect page in browser",
            ),
              openInChrome(CHROME_EXTENSION_RECONNECT_URL).catch(logError));
          else
            logForDebugging(
              "[Claude in Chrome] First-time install detected, but extension not installed, skipping reconnect",
            );
        })
        .catch((w) =>
          logForDebugging(
            `[Claude in Chrome] Failed to check extension installation during manifest install: ${w}`,
            { level: "error" },
          ),
        );
  });
}
/**
 * 用 reg add 为每个浏览器注册原生宿主清单路径（HKCU）。
 */
//@ chunk-s61vbvea.js:511493-511834 fingerprint = registerWindowsNativeHosts (1)
function registerWindowsNativeHosts(manifestPath) {
  let registryKeys = getAllWindowsRegistryKeys();
  for (let { browser: browser, key: key } of registryKeys) {
    let fullKey = `${key}\\${NATIVE_HOST_IDENTIFIER}`;
    execFileNoThrowWithCwd("reg", ["add", fullKey, "/ve", "/t", "REG_SZ", "/d", manifestPath, "/f"]).then(
      (result) => {
        if (result.code === 0)
          logForDebugging(
            `[Claude in Chrome] Registered native host for ${browser} in Windows registry: ${fullKey}`,
          );
        else
          logForDebugging(
            `[Claude in Chrome] Failed to register native host for ${browser} in Windows registry: ${result.stderr}`,
          );
      },
    );
  }
}
/**
 * 在 <配置目录>/chrome/ 下生成原生宿主包装脚本（sh: exec … --chrome-native-host；Windows .bat），内容不变时只修复可执行位。
 */
//@ chunk-s61vbvea.js:511834-512579 fingerprint = createWrapperScript (0.929)
async function createWrapperScript(command) {
  let platform = getPlatform_2(),
    chromeDir = join_16(getClaudeConfigDir(), "chrome"),
    wrapperPath =
      platform === "windows"
        ? join_16(chromeDir, "chrome-native-host.bat")
        : join_16(chromeDir, "chrome-native-host"),
    wrapperContent =
      platform === "windows"
        ? `@echo off
REM Chrome native host wrapper script
REM Generated by Claude Code - do not edit manually
${command.map((S) => `"${S.replaceAll("%", "%%")}"`).join(" ")}
`
        : `#!/bin/sh
# Chrome native host wrapper script
# Generated by Claude Code - do not edit manually
exec ${shellQuoteArgs(command)}
`;
  if ((await readFile_3(wrapperPath, "utf-8").catch(() => null)) === wrapperContent) {
    if (platform !== "windows")
      await chmod(wrapperPath, 493).catch((S) =>
        logForDebugging(`[Claude in Chrome] Could not repair wrapper exec bit: ${S}`, { level: "error" }),
      );
    return wrapperPath;
  }
  if (
    (await mkdir_4(chromeDir, { recursive: !0 }),
    await writeFile_3(wrapperPath, wrapperContent),
    platform !== "windows")
  )
    await chmod(wrapperPath, 493);
  return (
    logForDebugging(`[Claude in Chrome] Created Chrome native host wrapper script: ${wrapperPath}`),
    wrapperPath
  );
}
/**
 * 后台检测扩展是否安装并更新 cachedChromeExtensionInstalled，立即返回旧缓存值。
 */
//@ chunk-s61vbvea.js:512579-512886 layout
function refreshExtensionInstalledCache(e) {
  return (
    isChromeExtensionInstalled()
      .then((isInstalled) => {
        if (!isInstalled) return;
        if (getGlobalConfig().cachedChromeExtensionInstalled !== isInstalled)
          saveGlobalConfig((h) => ({ ...h, cachedChromeExtensionInstalled: isInstalled }), e);
      })
      .catch((r) =>
        logForDebugging(
          `[Claude in Chrome] Failed to check extension installation during cache refresh: ${r}`,
          { level: "error" },
        ),
      ),
    getGlobalConfig().cachedChromeExtensionInstalled ?? !1
  );
}
/**
 * 检测 Chrome 扩展是否装在任一浏览器配置文件中（扫描 Default/Profile N 的 Extensions/<扩展ID>）。
 */
//@ chunk-s61vbvea.js:512886-513035 facade-majority = isChromeExtensionInstalled (1)
async function isChromeExtensionInstalled() {
  let browserPaths = getAllBrowserDataPathsPortable();
  if (browserPaths.length === 0)
    return (
      logForDebugging(`[Claude in Chrome] Unsupported platform for extension detection: ${getPlatform_2()}`),
      !1
    );
  return isChromeExtensionInstalledPortable(browserPaths, logForDebugging);
}

export {
  shouldSuppressChromeOffer,
  isClaudeInChromeAllowed,
  setupClaudeInChrome,
  putChromePromptInSystemPrompt,
  CHROME_EXTENSION_RECONNECT_URL,
  isChromeExtensionInstalled,
  markClaudeInChromeUnwiredIfChrome,
  markClaudeInChromeRewired,
  shouldEnableClaudeInChrome,
  isClaudeInChromeWiredThisSession,
  hasHostedClaudeInChromeServer,
  shouldAutoEnableClaudeInChrome,
  adoptHostedClaudeInChrome,
  markClaudeInChromeUnwired,
  savedChromeDefaultCounts,
  hasBaseChromeOfferEligibility,
  hasChromeExtensionEvidence,
  getExtensionIds,
};
