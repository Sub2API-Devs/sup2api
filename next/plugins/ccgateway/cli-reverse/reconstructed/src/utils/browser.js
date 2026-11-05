/**
 * utils/browser.ts
 *
 * 打开浏览器：URL 校验（只允许 http/https）、按平台调用 open/xdg-open，无显示环境时报告 no_display。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/browser.ts
 * pieces: chunk-mg3ab5yg.js (13)
 * attribution: sole-consumer 1, affinity 1, fingerprint 3, layout 7, placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { pathToFileURL, fileURLToPath } from "url";
import { execFileNoThrow } from "./execFileNoThrow.js";
import { getPlatform } from "./platform.js";
import { isUntouchableSpelling } from "./networkPaths.js";
import { isNetworkPathAfterNormalize } from "./pathSanitize.js";
import { logForDebugging } from "./debug.js";
import { env } from "./env.js";
import { getAttacherCaps } from "../bootstrap/state.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-mg3ab5yg.js:513-907 sole-consumer
/**
 * 按平台给出"在文件管理器中显示文件"的命令：macOS open -R，Windows explorer /select，Linux 通过 dbus 调用 FileManager1.ShowItems。
 */
function revealInFileManagerCommand(platform, path) {
  if (platform === "macos")
    return {
      command: "open",
      args: ["-R", "--", path],
    };
  if (platform === "windows")
    return {
      command: "explorer",
      args: [`/select,${path}`],
    };
  return {
    command: "dbus-send",
    args: [
      "--session",
      "--print-reply",
      "--dest=org.freedesktop.FileManager1",
      "--type=method_call",
      "/org/freedesktop/FileManager1",
      "org.freedesktop.FileManager1.ShowItems",
      `array:string:${pathToFileURL(path).href.replaceAll(",", "%2C")}`,
      "string:",
    ],
  };
}
//@ chunk-mg3ab5yg.js:907-1097 affinity
/**
 * 允许在系统浏览器中打开的 URL 协议集合。
 */
var BROWSER_EXEC_OPTIONS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var ALLOWED_BROWSER_PROTOCOLS;
deferInit("chunk-mg3ab5yg.js:907", () => {
  BROWSER_EXEC_OPTIONS = {
    useCwd: true,
    useToolMemoryCgroup: false,
  };
  ALLOWED_BROWSER_PROTOCOLS = new Set([
    "https:",
    "http:",
    "vscode:",
    "vscode-insiders:",
    "cursor:",
    "windsurf:",
    "zed:",
    "jetbrains:",
    "idea:",
    "slack:",
    "linear:",
    "notion:",
    "figma:",
  ]);
});
//@ chunk-mg3ab5yg.js:1097-1315 fingerprint (2.1.88 match: validateUrl, 1)
/**
 * 校验 URL 格式与协议（http/https）。
 */
function validateUrl(url) {
  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch (_error) {
    throw Error(`Invalid URL format: ${url}`);
  }
  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:")
    throw Error(`Invalid URL protocol: must use http:// or https://, got ${parsedUrl.protocol}`);
}
//@ chunk-mg3ab5yg.js:1315-1366 layout
function isValidBrowserUrl(url) {
  try {
    validateUrl(url);
    return true;
  } catch {
    return false;
  }
}
//@ chunk-mg3ab5yg.js:1366-1468 fingerprint (2.1.88 match: openPath, 0.359)
async function openPath(path) {
  try {
    let opener = "xdg-open";
    let { code } = await execFileNoThrow(opener, [path], BROWSER_EXEC_OPTIONS);
    return code === 0;
  } catch (error) {
    return false;
  }
}
//@ chunk-mg3ab5yg.js:1468-1779 layout
/**
 * 执行在文件管理器中显示文件的命令，返回是否成功。
 */
async function revealInFileManager(path) {
  try {
    let platform = getPlatform();
    if (platform === "macos") {
      let { command, args } = revealInFileManagerCommand("macos", path);
      let { code } = await execFileNoThrow(command, args);
      return code === 0;
    }
    if (platform === "windows") {
      let { command, args } = revealInFileManagerCommand("windows", path);
      let { exitCode } = await execFileNoThrow(command, args);
      return exitCode !== undefined;
    }
    let { command, args } = revealInFileManagerCommand("linux", path);
    let { code } = await execFileNoThrow(command, args);
    return code === 0;
  } catch (error) {
    return false;
  }
}
//@ chunk-mg3ab5yg.js:1779-2117 layout
/**
 * 处理终端里点击的链接：file: 链接在文件管理器中显示（排除远程主机与受限路径），其他只允许白名单协议并用浏览器打开。
 */
async function openClickedLink(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  let protocol = parsed.protocol;
  if (protocol === "file:") {
    if (parsed.host !== "") return false;
    try {
      let filePath = fileURLToPath(url);
      if (isUntouchableSpelling(filePath) || isNetworkPathAfterNormalize(filePath)) return false;
      return await revealInFileManager(filePath);
    } catch {
      return false;
    }
  }
  if (!ALLOWED_BROWSER_PROTOCOLS.has(protocol)) {
    logForDebugging(`[hyperlink] refusing to dispatch clicked link with non-allowlisted scheme ${protocol}`, {
      level: "warn",
    });
    return false;
  }
  return (await openBrowser(url)).ok;
}
//@ chunk-mg3ab5yg.js:2117-2247 layout
/**
 * 判断是否无法自动打开浏览器（非 TTY、SSH 等），BROWSER 显式设置时视为可用。
 */
function isBrowserUnavailable() {
  if (!process.stdout.isTTY) return true;
  if (env.BROWSER && env.BROWSER !== "true") return false;
  if (env.SSH_CONNECTION) return true;
  return getInstallationEnv();
}
//@ chunk-mg3ab5yg.js:2247-2313 layout (2.1.88 match: getInstallationEnv, 0.809)
function getInstallationEnv() {
  return getPlatform() === "linux" && !env.DISPLAY && !env.WAYLAND_DISPLAY;
}
//@ chunk-mg3ab5yg.js:2313-2446 layout
/**
 * 校验 URL 后用浏览器打开，无效时返回 invalid_url。
 */
async function openValidatedUrl(url) {
  try {
    validateUrl(url);
  } catch (error) {
    return {
      ok: false,
      reason: "invalid_url",
      detail: error instanceof Error ? error.message : String(error),
    };
  }
  return openBrowser(url);
}
//@ chunk-mg3ab5yg.js:2446-2491 layout
/**
 * 打开 URL 并返回是否成功。
 */
async function openValidatedUrlSucceeded(url) {
  return (await openValidatedUrl(url)).ok;
}
//@ chunk-mg3ab5yg.js:2491-2750 fingerprint (2.1.88 match: openBrowser, 0.304)
/**
 * 用系统浏览器打开 URL（只允许 http/https），Linux 无显示环境时返回 no_display。
 */
async function openBrowser(url) {
  try {
    let browser = getAttacherCaps()?.browser;
    let configuredBrowser = browser !== undefined ? (browser ?? undefined) : env.BROWSER;
    let platform = "linux";
    if (!configuredBrowser && getInstallationEnv())
      return {
        ok: false,
        reason: "no_display",
      };
    return classifyImageError(
      await execFileNoThrow(configuredBrowser || "xdg-open", [url], BROWSER_EXEC_OPTIONS),
    );
  } catch (error) {
    return {
      ok: false,
      reason: "unknown",
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}
//@ chunk-mg3ab5yg.js:2750-3205 placement (2.1.88 match: classifyImageError, 0.453)
/**
 * 把外部打开器的执行结果分类（opener_missing/timeout/spawn_error/nonzero_exit/unknown）；误配名，归属疑似错误。
 */
function classifyImageError(error) {
  if (error.code === 0)
    return {
      ok: true,
    };
  let error_2 = error.error ?? "";
  let detail = error.stderr || error_2 || `exit ${error.code}`;
  if (error.code === 127 || error_2.includes("ENOENT"))
    return {
      ok: false,
      reason: "opener_missing",
      detail,
    };
  if (error_2.includes("ETIMEDOUT") || error_2.includes("timed out"))
    return {
      ok: false,
      reason: "timeout",
      detail,
    };
  if (error_2.includes("EACCES") || error_2.includes("EPERM"))
    return {
      ok: false,
      reason: "spawn_error",
      detail,
    };
  if (error.code > 0)
    return {
      ok: false,
      reason: "nonzero_exit",
      detail,
    };
  return {
    ok: false,
    reason: "unknown",
    detail,
  };
}
export {
  isBrowserUnavailable,
  openValidatedUrlSucceeded,
  isValidBrowserUrl,
  openPath,
  openClickedLink,
  ALLOWED_BROWSER_PROTOCOLS,
  openValidatedUrl,
};
