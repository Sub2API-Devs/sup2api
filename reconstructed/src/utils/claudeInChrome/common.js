/**
 * utils/claudeInChrome/common.ts
 *
 * Claude in Chrome 共用：工具名列表与不可用说明
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/claudeInChrome/common.ts
 * pieces: chunk-axj4swpp.js (14), chunk-srrcw01s.js (6)
 * attribution: facade-exports 13, layout 3, fingerprint 2, placement 2
 */
import { homedir, platform, userInfo } from "os";
import { join } from "path";
import { stat, readdir } from "fs/promises";
import { getPlatform } from "../platform.js";
import { logForDebugging } from "../debug.js";
import { isFsInaccessible } from "../errors.js";
import { whichAsync } from "../which.js";
import { Yi } from "../../commands/mobile/mobile.js";
import { lit, fromEnum } from "../../services/analytics/safeMetadata.js";
import { logFeatureBad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { execFileNoThrow, execFileNoThrowWithCwd } from "../execFileNoThrow.js";
import { resolveAppPathFromRegistry, launchDetached, x2 } from "./windowsAppPaths.js";
import { env } from "../env.js";
import { normalizeNameForMCP } from "../../services/mcp/normalization.js";

/**
 * Claude in Chrome 公共常量：工具名前缀 mcp__claude-in-chrome__、域规则工具名、各 Chromium 系浏览器（Chrome/Brave/Arc/Chromium/Edge/Vivaldi/Opera）在 macOS/Linux/Windows 的 NativeMessagingHosts 路径、注册表键、可执行名，以及检测顺序。
 */
//@ chunk-axj4swpp.js:697-3570 facade-exports = CHROMIUM_BROWSERS (0.905)
var CFC_TOOL_PREFIX = `mcp__${CLAUDE_IN_CHROME_MCP_SERVER_NAME}__`,
  CLAUDE_IN_CHROME_DOMAIN_RULE_TOOL = "ClaudeInChromeDomain",
  CHROMIUM_BROWSERS = {
    chrome: {
      name: "Google Chrome",
      macos: {
        appName: "Google Chrome",
        nativeMessagingPath: ["Library", "Application Support", "Google", "Chrome", "NativeMessagingHosts"],
      },
      linux: {
        binaries: ["google-chrome", "google-chrome-stable"],
        nativeMessagingPath: [".config", "google-chrome", "NativeMessagingHosts"],
      },
      windows: {
        dataPath: ["Google", "Chrome", "User Data"],
        registryKey: "HKCU\\Software\\Google\\Chrome\\NativeMessagingHosts",
        appPathsExe: "chrome.exe",
      },
    },
    brave: {
      name: "Brave",
      macos: {
        appName: "Brave Browser",
        nativeMessagingPath: [
          "Library",
          "Application Support",
          "BraveSoftware",
          "Brave-Browser",
          "NativeMessagingHosts",
        ],
      },
      linux: {
        binaries: ["brave-browser", "brave"],
        nativeMessagingPath: [".config", "BraveSoftware", "Brave-Browser", "NativeMessagingHosts"],
      },
      windows: {
        dataPath: ["BraveSoftware", "Brave-Browser", "User Data"],
        registryKey: "HKCU\\Software\\BraveSoftware\\Brave-Browser\\NativeMessagingHosts",
        appPathsExe: "brave.exe",
      },
    },
    arc: {
      name: "Arc",
      macos: {
        appName: "Arc",
        nativeMessagingPath: ["Library", "Application Support", "Arc", "User Data", "NativeMessagingHosts"],
      },
      linux: { binaries: [], nativeMessagingPath: [] },
      windows: {
        dataPath: ["Arc", "User Data"],
        registryKey: "HKCU\\Software\\ArcBrowser\\Arc\\NativeMessagingHosts",
      },
    },
    chromium: {
      name: "Chromium",
      macos: {
        appName: "Chromium",
        nativeMessagingPath: ["Library", "Application Support", "Chromium", "NativeMessagingHosts"],
      },
      linux: {
        binaries: ["chromium", "chromium-browser"],
        nativeMessagingPath: [".config", "chromium", "NativeMessagingHosts"],
      },
      windows: {
        dataPath: ["Chromium", "User Data"],
        registryKey: "HKCU\\Software\\Chromium\\NativeMessagingHosts",
      },
    },
    edge: {
      name: "Microsoft Edge",
      macos: {
        appName: "Microsoft Edge",
        nativeMessagingPath: ["Library", "Application Support", "Microsoft Edge", "NativeMessagingHosts"],
      },
      linux: {
        binaries: ["microsoft-edge", "microsoft-edge-stable"],
        nativeMessagingPath: [".config", "microsoft-edge", "NativeMessagingHosts"],
      },
      windows: {
        dataPath: ["Microsoft", "Edge", "User Data"],
        registryKey: "HKCU\\Software\\Microsoft\\Edge\\NativeMessagingHosts",
        appPathsExe: "msedge.exe",
      },
    },
    vivaldi: {
      name: "Vivaldi",
      macos: {
        appName: "Vivaldi",
        nativeMessagingPath: ["Library", "Application Support", "Vivaldi", "NativeMessagingHosts"],
      },
      linux: {
        binaries: ["vivaldi", "vivaldi-stable"],
        nativeMessagingPath: [".config", "vivaldi", "NativeMessagingHosts"],
      },
      windows: {
        dataPath: ["Vivaldi", "User Data"],
        registryKey: "HKCU\\Software\\Vivaldi\\NativeMessagingHosts",
        appPathsExe: "vivaldi.exe",
      },
    },
    opera: {
      name: "Opera",
      macos: {
        appName: "Opera",
        nativeMessagingPath: [
          "Library",
          "Application Support",
          "com.operasoftware.Opera",
          "NativeMessagingHosts",
        ],
      },
      linux: { binaries: ["opera"], nativeMessagingPath: [".config", "opera", "NativeMessagingHosts"] },
      windows: {
        dataPath: ["Opera Software", "Opera Stable"],
        registryKey: "HKCU\\Software\\Opera Software\\Opera Stable\\NativeMessagingHosts",
        useRoaming: !0,
        appPathsExe: "opera.exe",
      },
    },
  },
  BROWSER_DETECTION_ORDER = ["chrome", "brave", "arc", "edge", "chromium", "vivaldi", "opera"];
/**
 * 列出当前平台（macOS/Linux/WSL）各浏览器的 NativeMessagingHosts 目录；Windows 返回空（走注册表）。
 */
//@ chunk-axj4swpp.js:3570-3921 facade-exports = getAllNativeMessagingHostsDirs (1)
function getAllNativeMessagingHostsDirs() {
  let platform = getPlatform(),
    home = homedir(),
    paths = [];
  for (let browserId of BROWSER_DETECTION_ORDER) {
    let config = CHROMIUM_BROWSERS[browserId];
    switch (platform) {
      case "macos":
        if (config.macos.nativeMessagingPath.length > 0)
          paths.push({ browser: browserId, path: join(home, ...config.macos.nativeMessagingPath) });
        break;
      case "linux":
      case "wsl":
        if (config.linux.nativeMessagingPath.length > 0)
          paths.push({ browser: browserId, path: join(home, ...config.linux.nativeMessagingPath) });
        break;
      case "windows":
        break;
    }
  }
  return paths;
}
/**
 * 列出各浏览器的 Windows 注册表 NativeMessagingHosts 键。
 */
//@ chunk-axj4swpp.js:3921-4052 facade-exports = getAllWindowsRegistryKeys (1)
function getAllWindowsRegistryKeys() {
  let keys = [];
  for (let browserId of BROWSER_DETECTION_ORDER) {
    let config = CHROMIUM_BROWSERS[browserId];
    if (config.windows.registryKey) keys.push({ browser: browserId, key: config.windows.registryKey });
  }
  return keys;
}
/**
 * 按检测顺序找第一个已安装的浏览器：macOS 看 /Applications/*.app，Linux/WSL 找可执行文件，Windows 看 AppData 用户数据目录。
 */
//@ chunk-axj4swpp.js:4052-4761 facade-exports = detectAvailableBrowser (1)
async function detectAvailableBrowser() {
  let platform = getPlatform();
  for (let browserId of BROWSER_DETECTION_ORDER) {
    let config = CHROMIUM_BROWSERS[browserId];
    switch (platform) {
      case "macos": {
        let appPath = `/Applications/${config.macos.appName}.app`;
        try {
          if ((await stat(appPath)).isDirectory())
            return (logForDebugging(`[Claude in Chrome] Detected browser: ${config.name}`), browserId);
        } catch (error) {
          if (!isFsInaccessible(error)) throw error;
        }
        break;
      }
      case "wsl":
      case "linux": {
        for (let binary of config.linux.binaries)
          if (await whichAsync(binary).catch(() => null))
            return (logForDebugging(`[Claude in Chrome] Detected browser: ${config.name}`), browserId);
        break;
      }
      case "windows": {
        let home = homedir();
        if (config.windows.dataPath.length > 0) {
          let appDataBase = config.windows.useRoaming
              ? join(home, "AppData", "Roaming")
              : join(home, "AppData", "Local"),
            dataPath = join(appDataBase, ...config.windows.dataPath);
          try {
            if ((await stat(dataPath)).isDirectory())
              return (logForDebugging(`[Claude in Chrome] Detected browser: ${config.name}`), browserId);
          } catch (error) {
            if (!isFsInaccessible(error)) throw error;
          }
        }
        break;
      }
    }
  }
  return null;
}
/**
 * 记录的 Chrome tabId 上限 200。
 */
//@ chunk-axj4swpp.js:4761-4771 layout
var MAX_TRACKED_TABS = 200;
/**
 * 记录 Claude in Chrome 工具用过的 tabId（超过 200 个清空）。
 */
//@ chunk-axj4swpp.js:4771-4855 facade-exports
function trackClaudeInChromeTabId(tabId) {
  let trackedTabIds = Yi().trackedTabIds;
  if (trackedTabIds.size >= MAX_TRACKED_TABS && !trackedTabIds.has(tabId)) trackedTabIds.clear();
  trackedTabIds.add(tabId);
}
/**
 * 判断 tabId 是否由 Claude in Chrome 打开过。
 */
//@ chunk-axj4swpp.js:4855-4904 facade-exports
function isTrackedClaudeInChromeTabId(e) {
  return Yi().trackedTabIds.has(e);
}
/**
 * 把执行结果转成遥测字段 exec_exit_code / exec_failure_kind（nonzero_exit/not_found/spawn_failed_or_killed）。
 */
//@ chunk-axj4swpp.js:4904-5060 layout
function execFailureFields(result) {
  return {
    exec_exit_code: result.code,
    exec_failure_kind:
      result.exitCode !== void 0
        ? lit("nonzero_exit")
        : result.code === 127
          ? lit("not_found")
          : lit("spawn_failed_or_killed"),
  };
}
/**
 * 用检测到的浏览器打开 http(s) URL：macOS `open -a`，Windows 先试 App Paths 注册的 exe 再退回 rundll32 url,OpenURL，Linux 依次试可执行名；结果上报 chrome_open_url。
 */
//@ chunk-axj4swpp.js:5060-6274 facade-exports = openInChrome (0.581)
async function openInChrome(url) {
  if (!/^https?:\/\//i.test(url)) return (logFeatureBad("chrome_open_url", "invalid_url"), !1);
  let currentPlatform = getPlatform(),
    browser = await detectAvailableBrowser();
  if (!browser)
    return (
      logForDebugging("[Claude in Chrome] No compatible browser found"),
      logFeatureBad("chrome_open_url", "no_browser"),
      !1
    );
  let config = CHROMIUM_BROWSERS[browser];
  switch (currentPlatform) {
    case "macos": {
      let result = await execFileNoThrow("open", ["-a", config.macos.appName, url]);
      if (result.code === 0) return (logFeatureOk("chrome_open_url"), !0);
      return (logFeatureBad("chrome_open_url", "exec_failed", execFailureFields(result)), !1);
    }
    case "windows": {
      let appPathsExe = config.windows.appPathsExe,
        appPathsSpawnFailed = !1;
      if (appPathsExe) {
        let exePath = await resolveAppPathFromRegistry(appPathsExe);
        if (exePath) {
          if (await launchDetached(exePath, [url]))
            return (
              logFeatureOk("chrome_open_url", { open_method: lit("app_paths"), browser: fromEnum(browser) }),
              !0
            );
          appPathsSpawnFailed = !0;
        }
      }
      let result = await execFileNoThrowWithCwd("rundll32", ["url,OpenURL", url], { cwd: x2() });
      if (result.code === 0)
        return (
          logFeatureOk("chrome_open_url", {
            open_method: appPathsSpawnFailed
              ? lit("rundll32_after_spawn_fail")
              : appPathsExe
                ? lit("rundll32")
                : lit("rundll32_no_app_paths_support"),
            browser: fromEnum(browser),
          }),
          !0
        );
      return (
        logFeatureBad("chrome_open_url", "exec_failed", {
          ...execFailureFields(result),
          ...(appPathsSpawnFailed && { app_paths_spawn_failed: !0 }),
          browser: fromEnum(browser),
        }),
        !1
      );
    }
    case "wsl":
    case "linux": {
      let lastResult;
      for (let binary of config.linux.binaries) {
        let result = await execFileNoThrow(binary, [url], { useCwd: !0, useToolMemoryCgroup: !1 });
        if (result.code === 0) return (logFeatureOk("chrome_open_url"), !0);
        if (lastResult?.exitCode === void 0 || result.exitCode !== void 0) lastResult = result;
      }
      return (
        logFeatureBad("chrome_open_url", "exec_failed", lastResult ? execFailureFields(lastResult) : void 0),
        !1
      );
    }
    default:
      return (logFeatureBad("chrome_open_url", "exec_failed"), !1);
  }
}
/**
 * 浏览器桥 socket 目录 /tmp/claude-mcp-browser-bridge-<用户名>。
 */
//@ chunk-axj4swpp.js:6274-6335 facade-exports = getSocketDir (1)
function getSocketDir() {
  return `/tmp/claude-mcp-browser-bridge-${getUsername()}`;
}
/**
 * 本进程的 socket 路径：Windows 为 \\.\pipe\claude-mcp-browser-bridge-<用户名>，其他为 <socketDir>/<pid>.sock。
 */
//@ chunk-axj4swpp.js:6335-6433 facade-exports = getSecureSocketPath (1)
function getSecureSocketPath() {
  if (platform() === "win32") return `\\\\.\\pipe\\${getSocketName()}`;
  return join(getSocketDir(), `${process.pid}.sock`);
}
/**
 * 列出所有候选 socket 路径（目录下全部 .sock；Windows 只有命名管道），供 MCP 客户端寻找原生宿主。
 */
//@ chunk-axj4swpp.js:6433-6608 facade-exports = getSecureSocketPath (0.944)
async function getAllSocketPaths() {
  if (platform() === "win32") return [`\\\\.\\pipe\\${getSocketName()}`];
  let paths = [],
    socketDir = getSocketDir();
  try {
    let r = await readdir(socketDir);
    for (let s of r) if (s.endsWith(".sock")) paths.push(join(socketDir, s));
  } catch {}
  return paths;
}
/**
 * socket/管道名 claude-mcp-browser-bridge-<用户名>。
 */
//@ chunk-axj4swpp.js:6608-6662 fingerprint = getSocketName (1)
function getSocketName() {
  return `claude-mcp-browser-bridge-${getUsername()}`;
}
/**
 * 取当前用户名，失败回退 USER/USERNAME 环境变量或 "default"。
 */
//@ chunk-axj4swpp.js:6662-6754 fingerprint = getUsername (1)
function getUsername() {
  try {
    return userInfo().username || "default";
  } catch {
    return env.USER || env.USERNAME || "default";
  }
}
/**
 * 内置 Chrome MCP 服务器名 "claude-in-chrome" 与 javascript_tool 工具名。
 */
//@ chunk-srrcw01s.js:227-275 facade-exports = CLAUDE_IN_CHROME_MCP_SERVER_NAME (0.656)
var CLAUDE_IN_CHROME_MCP_SERVER_NAME = "claude-in-chrome",
  CHROME_JAVASCRIPT_TOOL = "javascript_tool";
/**
 * 按规范化后的 MCP 服务器名判断是否是 claude-in-chrome。
 */
//@ chunk-srrcw01s.js:275-308 facade-exports
function isClaudeInChromeMCPServer(e) {
  return normalizeNameForMCP(e) === CLAUDE_IN_CHROME_MCP_SERVER_NAME;
}
/**
 * 内置 Chrome MCP 服务器的启动参数 --claude-in-chrome-mcp（以当前可执行文件 + 此参数作 stdio 服务器）。
 */
//@ chunk-srrcw01s.js:308-339 layout
var CLAUDE_IN_CHROME_MCP_FLAG = "--claude-in-chrome-mcp";
/**
 * 判断一个 stdio MCP 配置的 command/args 是否带 --claude-in-chrome-mcp（即在启动内置 Chrome 服务器）。
 */
//@ chunk-srrcw01s.js:339-476 facade-exports = getServerCommandArray (1)
function isClaudeInChromeMcpLaunch(config) {
  if (config.type !== void 0 && config.type !== "stdio") return !1;
  return (
    (config.command?.includes(CLAUDE_IN_CHROME_MCP_FLAG) ?? !1) ||
    (config.args?.some((o) => o.includes(CLAUDE_IN_CHROME_MCP_FLAG)) ?? !1)
  );
}
/**
 * Claude in Chrome 工具名清单与不可用说明：file_upload 不可用、上传无人批准、batch 内不能上传、browser_batch 不可用。
 */
//@ chunk-srrcw01s.js:476-1586 placement
var BATCH_RESTRICTED_TOOLS = ["file_upload", "browser_batch"],
  CHROME_TOOL_NAMES = [
    CHROME_JAVASCRIPT_TOOL,
    "read_page",
    "find",
    "form_input",
    "computer",
    "browser_batch",
    "navigate",
    "resize_window",
    "gif_creator",
    "upload_image",
    "get_page_text",
    "tabs_context_mcp",
    "tabs_create_mcp",
    "tabs_close_mcp",
    "read_console_messages",
    "read_network_requests",
    "shortcuts_list",
    "shortcuts_execute",
    "file_upload",
    "switch_browser",
    "list_connected_browsers",
    "select_browser",
  ],
  FILE_UPLOAD_UNAVAILABLE =
    "file_upload is not available in this session, alone or inside browser_batch, and nothing in this call ran. Ask the user to choose the file in their browser themselves.",
  UPLOAD_NEEDS_APPROVAL =
    "Nothing was uploaded, and nothing else in this call ran. An upload may not run without a person's approval, and uploads can't be approved here yet. Repeating the call won't help. Ask the user to choose the file in their browser themselves.",
  UPLOAD_IN_BATCH_UNAVAILABLE =
    "file_upload cannot run inside browser_batch in this session, and nothing in this call ran. If file_upload is among your tools, call it on its own.",
  BROWSER_BATCH_UNAVAILABLE =
    "browser_batch isn't available right now, and nothing in this call ran. Make each action its own call instead. Don't retry it as a batch.";
/**
 * 内置 Chrome MCP 服务器的 stdio 配置：以当前可执行文件 + --claude-in-chrome-mcp 启动，scope dynamic。旧版同位置是 setupComputerUseMCP，316 中只用于 Claude in Chrome（setupClaudeInChrome、MCP 配置合并、Chrome 策略拒绝判断）。
 */
//@ chunk-srrcw01s.js:1586-1672 placement = setupComputerUseMCP (0.631)
function getClaudeInChromeStdioServerConfig() {
  return { type: "stdio", command: process.execPath, args: [CLAUDE_IN_CHROME_MCP_FLAG], scope: "dynamic" };
}

export {
  CLAUDE_IN_CHROME_DOMAIN_RULE_TOOL,
  isClaudeInChromeMCPServer,
  getClaudeInChromeStdioServerConfig,
  isClaudeInChromeMcpLaunch,
  FILE_UPLOAD_UNAVAILABLE,
  CFC_TOOL_PREFIX,
  CLAUDE_IN_CHROME_MCP_SERVER_NAME,
  openInChrome,
  UPLOAD_NEEDS_APPROVAL,
  UPLOAD_IN_BATCH_UNAVAILABLE,
  BROWSER_BATCH_UNAVAILABLE,
  trackClaudeInChromeTabId,
  CHROME_JAVASCRIPT_TOOL,
  CHROME_TOOL_NAMES,
  BATCH_RESTRICTED_TOOLS,
  detectAvailableBrowser,
  getSecureSocketPath,
  getSocketDir,
  getAllNativeMessagingHostsDirs,
  getAllWindowsRegistryKeys,
  getAllSocketPaths,
};
