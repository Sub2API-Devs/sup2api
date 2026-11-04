/**
 * utils/claudeInChrome/setup.ts
 *
 * Claude in Chrome 启用判定与接入：组织策略/作用域/--chrome/默认设置/自动启用，生成 MCP 配置与系统提示，安装原生宿主清单与包装脚本。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/claudeInChrome/setup.ts
 * pieces: chunk-s61vbvea.js (25)
 * attribution: placement 2, sole-consumer 1, facade-majority 17, fingerprint 4, layout 1
 */
import { lstat, readFile, mkdir, writeFile, chmod } from "fs/promises";
import { homedir } from "os";
import { join } from "path";
import { getPlatform as getPlatform_2 } from "../platform.js";
import {
  isSymlinkIntoInstallDir,
  isNpmSymlink,
  isBridgeChildMachineSettings,
} from "../nativeInstaller/installer.js";
import { getErrnoCode, isENOENT } from "../errors.js";
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
import { getGlobalConfig, saveGlobalConfig } from "../config.js";
import { isRemoteLikeEnv } from "../managedEnvSafety.js";
import { claudeInChromeSession } from "../../commands/mobile/mobile.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import {
  CLAUDE_IN_CHROME_MCP_SERVER_NAME,
  getClaudeInChromeStdioServerConfig,
  getAllNativeMessagingHostsDirs,
  openInChrome,
  getAllWindowsRegistryKeys,
} from "./common.js";
import { isRemoteManagedEnvironment } from "../remoteEnvironment.js";
import {
  isRunningFromVersionsDir_2,
  resolveClaudePath,
  resolveLaunchTarget,
} from "../deepLink/registerProtocol.js";
import { maybeAddBrowserBatchToChromeSelect, isToolSearchEnabledOptimistic } from "../toolSearch.js";
import { getChromeSystemPrompt } from "../toolSearchChrome.js";
import { isClaudeAiProxyServer } from "../../services/mcp/builtinServerNames.js";
import { withFeatureTelemetry } from "../../services/analytics/featureTelemetry.js";
import { jsonStringify } from "../slowOperations.js";
import { logError } from "../log.js";
import { execFileNoThrowWithCwd } from "../execFileNoThrow.js";
import { shellQuoteArgs } from "../bash/bashPipeCommand.js";

//@ chunk-s61vbvea.js:504981-505163 placement
/**
 * Windows 上直接返回 true；其他平台要求路径是符号链接且目标通过两项检查之一才返回 true；路径不存在类错误返回 false。
 */
async function isAcceptableHostSymlink(linkPath) {
  if (getPlatform_2() === "windows") return true;
  try {
    let stats = await lstat(linkPath);
    if (!stats.isSymbolicLink()) return false;
    return (await isSymlinkIntoInstallDir(linkPath, stats)) || (await isNpmSymlink(linkPath));
  } catch (error) {
    if (getErrnoCode(error) !== undefined) return false;
    throw error;
  }
}
//@ chunk-s61vbvea.js:505333-505358 placement
function getExtensionIds() {
  return [FCOEOABGFENEJGLBFFODGKKBKCDHCGFN];
}
//@ chunk-s61vbvea.js:507541-507598 sole-consumer (2.1.88 match: isChromeExtensionInstalledPortable, 1)
/**
 * detectExtensionInstallationPortable 的布尔包装。
 */
async function isChromeExtensionInstalledPortable(browserPaths, log) {
  return (await detectExtensionInstallationPortable(browserPaths, log)).isInstalled;
}
//@ chunk-s61vbvea.js:507598-507706 facade-majority (2.1.88 match: CHROME_RECONNECT_URL, 0.561)
/**
 * 原生宿主标识 com.anthropic.claude_code_browser_extension、清单文件名、扩展重连页 https://clau.de/chrome/reconnect。
 */
var CHROME_EXTENSION_RECONNECT_URL = "https://clau.de/chrome/reconnect";
var NATIVE_HOST_IDENTIFIER = "com.anthropic.claude_code_browser_extension";
var NATIVE_HOST_MANIFEST_NAME = `${NATIVE_HOST_IDENTIFIER}.json`;
//@ chunk-s61vbvea.js:507706-507764 facade-majority
/**
 * 组织策略 allow_claude_browser_extension 是否允许 Claude in Chrome。
 */
function isClaudeInChromeAllowed() {
  return isPolicyAllowed("allow_claude_browser_extension");
}
//@ chunk-s61vbvea.js:507764-508548 facade-majority
/**
 * 决定本会话是否启用 Claude in Chrome：组织允许 + OAuth 令牌有 user:profile/user:office/user:ccr_inference 作用域；--chrome/--no-chrome 优先，其次 CLAUDE_CODE_ENABLE_CFC，再看全局配置 claudeInChromeDefaultEnabled（远程/Cowork 会话忽略该默认）。
 */
function shouldEnableClaudeInChrome(chromeFlag) {
  if (!isClaudeInChromeAllowed()) return false;
  if (!canAuthenticateChromeBridge()) {
    logForDebugging(
      "[Claude in Chrome] Disabled: OAuth token has no scope accepted by /api/oauth/validate (needs user:profile, user:office, or user:ccr_inference; env-var and setup-token sessions default to user:inference only)",
    );
    return false;
  }
  if (chromeFlag === true) return true;
  if (chromeFlag === false) return false;
  if (isBareMode()) return false;
  if (env.CLAUDE_CODE_ENABLE_CFC === true) return true;
  if (env.CLAUDE_CODE_ENABLE_CFC === false) return false;
  if (getIsNonInteractiveSession() && !isBridgeChildMachineSettings()) return false;
  let config = getGlobalConfig();
  if (config.claudeInChromeDefaultEnabled && !savedChromeDefaultCounts()) {
    logForDebugging(
      '[Claude in Chrome] Ignoring "Enabled by default": a remote or Cowork session connects Chrome at start-up only with --chrome or with CLAUDE_CODE_ENABLE_CFC=1 in the environment it is started with',
    );
    return false;
  }
  if (config.claudeInChromeDefaultEnabled !== undefined) return config.claudeInChromeDefaultEnabled;
  return false;
}
//@ chunk-s61vbvea.js:508548-508576 facade-majority
/**
 * 非远程/非 Cowork 会话时返回 true，即保存的"默认启用 Chrome"设置是否生效。
 */
function savedChromeDefaultCounts() {
  return !isRemoteLikeEnv();
}
//@ chunk-s61vbvea.js:508576-508710 facade-majority (2.1.88 match: shouldEnableClaudeInChrome, 1)
/**
 * 提供 Chrome 选项的基本资格：未被 --chrome 覆盖关闭、未设 CLAUDE_CODE_ENABLE_CFC=false、尚未设置默认、本地交互会话、claude.ai 订阅登录且令牌作用域合格。
 */
function hasBaseChromeOfferEligibility() {
  return (
    getChromeFlagOverride() !== false &&
    env.CLAUDE_CODE_ENABLE_CFC !== false &&
    getGlobalConfig().claudeInChromeDefaultEnabled === undefined &&
    savedChromeDefaultCounts() &&
    getIsInteractive() &&
    isClaudeAISubscriber() &&
    canAuthenticateChromeBridge()
  );
}
//@ chunk-s61vbvea.js:508710-508825 facade-majority (2.1.88 match: isChromeExtensionInstalled_CACHED_MAY_BE_STALE, 0.504)
/**
 * 是否有扩展已安装的证据：缓存的 cachedChromeExtensionInstalled 或已配对设备。
 */
function hasChromeExtensionEvidence() {
  let config = getGlobalConfig();
  return config.cachedChromeExtensionInstalled === true || Boolean(config.chromeExtension?.pairedDeviceId);
}
//@ chunk-s61vbvea.js:508825-509028 facade-majority (2.1.88 match: shouldAutoEnableClaudeInChrome, 0.516)
/**
 * 是否自动启用 Chrome（会话内缓存）：组织允许 + 基本资格 + 检测到扩展 + GrowthBook tengu_chrome_auto_enable。
 */
function shouldAutoEnableClaudeInChrome(storageV5) {
  if (!isClaudeInChromeAllowed()) return false;
  let chromeState = claudeInChromeSession();
  if (chromeState.shouldAutoEnable !== undefined) return chromeState.shouldAutoEnable;
  chromeState.shouldAutoEnable =
    hasBaseChromeOfferEligibility() &&
    (refreshExtensionInstalledCache(storageV5) || hasChromeExtensionEvidence()) &&
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_chrome_auto_enable", false);
  return chromeState.shouldAutoEnable;
}
//@ chunk-s61vbvea.js:509028-509072 facade-majority
/**
 * 本会话是否已接入 Chrome MCP（wiredThisSession）。
 */
function isClaudeInChromeWiredThisSession() {
  return claudeInChromeSession().wiredThisSession;
}
//@ chunk-s61vbvea.js:509072-509112 facade-majority
/**
 * 标记本会话未接入 Chrome（例如策略阻止后）。
 */
function markClaudeInChromeUnwired() {
  claudeInChromeSession().wiredThisSession = false;
}
//@ chunk-s61vbvea.js:509112-509144 facade-majority
/**
 * 若服务器名是 claude-in-chrome，则标记未接入。
 */
function markClaudeInChromeUnwiredIfChrome(serverName) {
  if (serverName === CLAUDE_IN_CHROME_MCP_SERVER_NAME) markClaudeInChromeUnwired();
}
//@ chunk-s61vbvea.js:509144-509184 facade-majority
/**
 * 重新标记本会话已接入 Chrome。
 */
function markClaudeInChromeRewired() {
  claudeInChromeSession().wiredThisSession = true;
}
//@ chunk-s61vbvea.js:509184-509397 facade-majority
/**
 * 在 SSH 待定、远程模式、teleport、安全模式、bypass 权限、plan+可 bypass、队友代理等情况下不提供 Chrome。
 */
function shouldSuppressChromeOffer({
  isSSHPending,
  isRemoteMode,
  hasTeleport,
  isSafeMode,
  permissionMode,
  isBypassPermissionsModeAvailable,
  teammateAgentId,
}) {
  return (
    isSSHPending ||
    isRemoteMode ||
    hasTeleport ||
    isSafeMode ||
    permissionMode === "bypassPermissions" ||
    (permissionMode === "plan" && isBypassPermissionsModeAvailable) ||
    teammateAgentId !== undefined
  );
}
//@ chunk-s61vbvea.js:509397-509984 facade-majority (2.1.88 match: setupClaudeInChrome, 0.436)
/**
 * 接入 Claude in Chrome：后台创建原生宿主包装脚本并安装清单（CLAUDE_CODE_CHROME_LATE_MCP_SERVER 且远程时跳过），返回 mcpConfig {"claude-in-chrome": 当前可执行文件 --claude-in-chrome-mcp, scope dynamic}（bypass 会话加 CLAUDE_CHROME_PERMISSION_MODE=skip_all_permission_checks）以及 Chrome 系统提示片段（CLAUDE_CODE_DISABLE_CFC_PROMPT 可关）。
 */
function setupClaudeInChrome(options) {
  let allowedTools = [];
  let env_2 = {};
  if (getSessionBypassPermissionsMode()) env_2.CLAUDE_CHROME_PERMISSION_MODE = "skip_all_permission_checks";
  let hasEnv = Object.keys(env_2).length > 0;
  (async () => {
    if (env.CLAUDE_CODE_CHROME_LATE_MCP_SERVER === true && isRemoteManagedEnvironment()) return;
    let pinToCurrentBinary =
      isRunningFromVersionsDir_2() && !(await isAcceptableHostSymlink(resolveClaudePath()));
    let { cmd, prefixArgs } = resolveLaunchTarget({
      pinToCurrentBinary,
    });
    let manifestBinaryPath = await createWrapperScript([cmd, ...prefixArgs, "--chrome-native-host"]);
    await installChromeNativeHostManifest(manifestBinaryPath, options);
  })().catch((manifestBinaryPath) =>
    logForDebugging(`[Claude in Chrome] Failed to install native host: ${manifestBinaryPath}`, {
      level: "error",
    }),
  );
  claudeInChromeSession().wiredThisSession = true;
  return {
    mcpConfig: {
      [CLAUDE_IN_CHROME_MCP_SERVER_NAME]: {
        ...getClaudeInChromeStdioServerConfig(),
        ...(hasEnv && {
          env: env_2,
        }),
      },
    },
    allowedTools,
    systemPrompt:
      env.CLAUDE_CODE_DISABLE_CFC_PROMPT === true
        ? ""
        : maybeAddBrowserBatchToChromeSelect(getChromeSystemPrompt(isToolSearchEnabledOptimistic())),
  };
}
//@ chunk-s61vbvea.js:509984-510058 facade-majority (2.1.88 match: toScopedConfig, 1)
/**
 * --mcp-config 里是否已有远程会话宿主提供的 claude-in-chrome（scope dynamic 且是内置启动方式）。
 */
function hasHostedClaudeInChromeServer(config) {
  let entry = config[CLAUDE_IN_CHROME_MCP_SERVER_NAME];
  return entry !== undefined && entry.scope === "dynamic" && isClaudeAiProxyServer(entry);
}
//@ chunk-s61vbvea.js:510058-510176 facade-majority
/**
 * 采用宿主提供的 Chrome 服务器：标记已接入并只返回系统提示片段。
 */
function adoptHostedClaudeInChrome() {
  claudeInChromeSession().wiredThisSession = true;
  return {
    systemPrompt:
      env.CLAUDE_CODE_DISABLE_CFC_PROMPT === true
        ? ""
        : maybeAddBrowserBatchToChromeSelect(getChromeSystemPrompt(isToolSearchEnabledOptimistic())),
  };
}
//@ chunk-s61vbvea.js:510176-510219 facade-majority
/**
 * 保存本会话的 Chrome 系统提示片段。
 */
function putChromePromptInSystemPrompt(systemPromptSection) {
  claudeInChromeSession().systemPromptSection = systemPromptSection;
}
//@ chunk-s61vbvea.js:510219-510380 fingerprint (2.1.88 match: getNativeMessagingHostsDirs, 1)
/**
 * 原生宿主清单的安装目录：Windows 为 %APPDATA%/Claude Code/ChromeNativeHost，其他平台为各浏览器 NativeMessagingHosts 目录。
 */
function getNativeMessagingHostsDirs() {
  if (getPlatform_2() === "windows") {
    let home = homedir();
    let appData = env.APPDATA || join(home, "AppData", "Local");
    return [join(appData, "Claude Code", "ChromeNativeHost")];
  }
  return getAllNativeMessagingHostsDirs().map(({ path }) => path);
}
//@ chunk-s61vbvea.js:510380-511493 fingerprint (2.1.88 match: installChromeNativeHostManifest, 0.826)
/**
 * 向各目录写原生宿主清单 com.anthropic.claude_code_browser_extension.json（stdio、path=包装脚本、allowed_origins 只含生产扩展 ID），内容相同则跳过；Windows 另写注册表；首次安装且扩展已装时打开重连页。
 */
async function installChromeNativeHostManifest(manifestBinaryPath, options) {
  return withFeatureTelemetry("chrome_native_host_install", async () => {
    let manifestDirs = getNativeMessagingHostsDirs();
    if (manifestDirs.length === 0) throw Error("Claude in Chrome Native Host not supported on this platform");
    let manifest = {
      name: NATIVE_HOST_IDENTIFIER,
      description: "Claude Code Browser Extension Native Host",
      path: manifestBinaryPath,
      type: "stdio",
      allowed_origins: ["chrome-extension://fcoeoabgfenejglbffodgkkbkcdhcgfn/", ...[]],
    };
    let manifestContent = jsonStringify(manifest, null, 2);
    let anyManifestExisted = false;
    let wroteNewManifest = false;
    for (let manifestDir of manifestDirs) {
      let manifestPath = join(manifestDir, NATIVE_HOST_MANIFEST_NAME);
      let readErrorCode = false;
      let existingContent = await readFile(manifestPath, "utf-8").catch((error) => {
        readErrorCode = isENOENT(error);
        return null;
      });
      if (!readErrorCode) anyManifestExisted = true;
      if (existingContent === manifestContent) continue;
      try {
        await mkdir(manifestDir, {
          recursive: true,
        });
        await writeFile(manifestPath, manifestContent);
        logForDebugging(`[Claude in Chrome] Installed native host manifest at: ${manifestPath}`);
        if (readErrorCode) wroteNewManifest = true;
      } catch (error) {
        logForDebugging(`[Claude in Chrome] Failed to install manifest at ${manifestPath}: ${error}`);
      }
    }
    if (getPlatform_2() === "windows") {
      let manifestPath = join(manifestDirs[0], NATIVE_HOST_MANIFEST_NAME);
      registerWindowsNativeHosts(manifestPath);
    }
    if (wroteNewManifest && !anyManifestExisted && !options?.skipReconnectAutoOpen)
      isChromeExtensionInstalled()
        .then((isInstalled) => {
          if (isInstalled) {
            logForDebugging(
              "[Claude in Chrome] First-time install detected, opening reconnect page in browser",
            );
            openInChrome(CHROME_EXTENSION_RECONNECT_URL).catch(logError);
          } else
            logForDebugging(
              "[Claude in Chrome] First-time install detected, but extension not installed, skipping reconnect",
            );
        })
        .catch((error) =>
          logForDebugging(
            `[Claude in Chrome] Failed to check extension installation during manifest install: ${error}`,
            {
              level: "error",
            },
          ),
        );
  });
}
//@ chunk-s61vbvea.js:511493-511834 fingerprint (2.1.88 match: registerWindowsNativeHosts, 1)
/**
 * 用 reg add 为每个浏览器注册原生宿主清单路径（HKCU）。
 */
function registerWindowsNativeHosts(manifestPath) {
  let registryKeys = getAllWindowsRegistryKeys();
  for (let { browser, key } of registryKeys) {
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
//@ chunk-s61vbvea.js:511834-512579 fingerprint (2.1.88 match: createWrapperScript, 0.929)
/**
 * 在 <配置目录>/chrome/ 下生成原生宿主包装脚本（sh: exec … --chrome-native-host；Windows .bat），内容不变时只修复可执行位。
 */
async function createWrapperScript(command) {
  let platform = getPlatform_2();
  let chromeDir = join(getClaudeConfigDir(), "chrome");
  let wrapperPath =
    platform === "windows"
      ? join(chromeDir, "chrome-native-host.bat")
      : join(chromeDir, "chrome-native-host");
  let wrapperContent =
    platform === "windows"
      ? `@echo off
REM Chrome native host wrapper script
REM Generated by Claude Code - do not edit manually
${command.map((part) => `"${part.replaceAll("%", "%%")}"`).join(" ")}
`
      : `#!/bin/sh
# Chrome native host wrapper script
# Generated by Claude Code - do not edit manually
exec ${shellQuoteArgs(command)}
`;
  if ((await readFile(wrapperPath, "utf-8").catch(() => null)) === wrapperContent) {
    if (platform !== "windows")
      await chmod(wrapperPath, 493).catch((error) =>
        logForDebugging(`[Claude in Chrome] Could not repair wrapper exec bit: ${error}`, {
          level: "error",
        }),
      );
    return wrapperPath;
  }
  await mkdir(chromeDir, {
    recursive: true,
  });
  await writeFile(wrapperPath, wrapperContent);
  if (platform !== "windows") await chmod(wrapperPath, 493);
  logForDebugging(`[Claude in Chrome] Created Chrome native host wrapper script: ${wrapperPath}`);
  return wrapperPath;
}
//@ chunk-s61vbvea.js:512579-512886 layout
/**
 * 后台检测扩展是否安装并更新 cachedChromeExtensionInstalled，立即返回旧缓存值。
 */
function refreshExtensionInstalledCache(storageV5) {
  isChromeExtensionInstalled()
    .then((isInstalled) => {
      if (!isInstalled) return;
      if (getGlobalConfig().cachedChromeExtensionInstalled !== isInstalled)
        saveGlobalConfig(
          (prev) => ({
            ...prev,
            cachedChromeExtensionInstalled: isInstalled,
          }),
          storageV5,
        );
    })
    .catch((error) =>
      logForDebugging(
        `[Claude in Chrome] Failed to check extension installation during cache refresh: ${error}`,
        {
          level: "error",
        },
      ),
    );
  return getGlobalConfig().cachedChromeExtensionInstalled ?? false;
}
//@ chunk-s61vbvea.js:512886-513035 facade-majority (2.1.88 match: isChromeExtensionInstalled, 1)
/**
 * 检测 Chrome 扩展是否装在任一浏览器配置文件中（扫描 Default/Profile N 的 Extensions/<扩展ID>）。
 */
async function isChromeExtensionInstalled() {
  let browserPaths = getAllBrowserDataPathsPortable();
  if (browserPaths.length === 0) {
    logForDebugging(`[Claude in Chrome] Unsupported platform for extension detection: ${getPlatform_2()}`);
    return false;
  }
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
