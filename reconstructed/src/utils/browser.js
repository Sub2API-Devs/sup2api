/**
 * utils/browser.ts
 *
 * 打开浏览器：URL 校验（只允许 http/https）、按平台调用 open/xdg-open，无显示环境时报告 no_display。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/browser.ts
 * pieces: chunk-xh6k20xb.js (13)
 * attribution: sole-consumer 1, affinity 1, fingerprint 3, layout 7, placement 1
 */
import { pathToFileURL, fileURLToPath } from "url";
import { execFileNoThrow } from "./execFileNoThrow.js";
import { getPlatform } from "./platform.js";
import { hl } from "./networkPaths.js";
import { sRt } from "./pathSanitize.js";
import { logForDebugging } from "./debug.js";
import { env } from "./env.js";
import { getAttacherCaps } from "../bootstrap/state.js";

/**
 * 按平台给出"在文件管理器中显示文件"的命令：macOS open -R，Windows explorer /select，Linux 通过 dbus 调用 FileManager1.ShowItems。
 */
//@ chunk-xh6k20xb.js:513-907 sole-consumer
function revealInFileManagerCommand(r, e) {
  if (r === "macos") return { command: "open", args: ["-R", "--", e] };
  if (r === "windows") return { command: "explorer", args: [`/select,${e}`] };
  return {
    command: "dbus-send",
    args: [
      "--session",
      "--print-reply",
      "--dest=org.freedesktop.FileManager1",
      "--type=method_call",
      "/org/freedesktop/FileManager1",
      "org.freedesktop.FileManager1.ShowItems",
      `array:string:${pathToFileURL(e).href.replaceAll(",", "%2C")}`,
      "string:",
    ],
  };
}
//@ chunk-xh6k20xb.js:907-1097 affinity
var BROWSER_EXEC_OPTIONS = { useCwd: !0, useToolMemoryCgroup: !1 },
  yes = new Set([
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
/**
 * 校验 URL 格式与协议（http/https）。
 */
//@ chunk-xh6k20xb.js:1097-1315 fingerprint = validateUrl (1)
function validateUrl(url) {
  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch (error) {
    throw Error(`Invalid URL format: ${url}`);
  }
  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:")
    throw Error(`Invalid URL protocol: must use http:// or https://, got ${parsedUrl.protocol}`);
}
//@ chunk-xh6k20xb.js:1315-1366 layout
function isValidBrowserUrl(r) {
  try {
    return (validateUrl(r), !0);
  } catch {
    return !1;
  }
}
//@ chunk-xh6k20xb.js:1366-1468 fingerprint = openPath (0.359)
async function openPath(path) {
  try {
    let o = "xdg-open",
      { code: code } = await execFileNoThrow(o, [path], BROWSER_EXEC_OPTIONS);
    return code === 0;
  } catch (error) {
    return !1;
  }
}
/**
 * 执行在文件管理器中显示文件的命令，返回是否成功。
 */
//@ chunk-xh6k20xb.js:1468-1779 layout
async function revealInFileManager(r) {
  try {
    let e = getPlatform();
    if (e === "macos") {
      let { command: command, args: args } = revealInFileManagerCommand("macos", r),
        { code: code } = await execFileNoThrow(command, args);
      return code === 0;
    }
    if (e === "windows") {
      let { command: command, args: args } = revealInFileManagerCommand("windows", r),
        { exitCode: exitCode } = await execFileNoThrow(command, args);
      return exitCode !== void 0;
    }
    let { command: command, args: args } = revealInFileManagerCommand("linux", r),
      { code: code } = await execFileNoThrow(command, args);
    return code === 0;
  } catch (error) {
    return !1;
  }
}
/**
 * 处理终端里点击的链接：file: 链接在文件管理器中显示（排除远程主机与受限路径），其他只允许白名单协议并用浏览器打开。
 */
//@ chunk-xh6k20xb.js:1779-2117 layout
async function openClickedLink(r) {
  let e;
  try {
    e = new URL(r);
  } catch {
    return !1;
  }
  let protocol = e.protocol;
  if (protocol === "file:") {
    if (e.host !== "") return !1;
    try {
      let n = fileURLToPath(r);
      if (hl(n) || sRt(n)) return !1;
      return await revealInFileManager(n);
    } catch {
      return !1;
    }
  }
  if (!yes.has(protocol))
    return (
      logForDebugging(
        `[hyperlink] refusing to dispatch clicked link with non-allowlisted scheme ${protocol}`,
        { level: "warn" },
      ),
      !1
    );
  return (await openBrowser(r)).ok;
}
/**
 * 判断是否无法自动打开浏览器（非 TTY、SSH 等），BROWSER 显式设置时视为可用。
 */
//@ chunk-xh6k20xb.js:2117-2247 layout
function isBrowserUnavailable() {
  if (!process.stdout.isTTY) return !0;
  if (env.BROWSER && env.BROWSER !== "true") return !1;
  if (env.SSH_CONNECTION) return !0;
  return getInstallationEnv();
}
//@ chunk-xh6k20xb.js:2247-2313 layout = getInstallationEnv (0.809)
function getInstallationEnv() {
  return getPlatform() === "linux" && !env.DISPLAY && !env.WAYLAND_DISPLAY;
}
/**
 * 校验 URL 后用浏览器打开，无效时返回 invalid_url。
 */
//@ chunk-xh6k20xb.js:2313-2446 layout
async function openValidatedUrl(r) {
  try {
    validateUrl(r);
  } catch (error) {
    return { ok: !1, reason: "invalid_url", detail: error instanceof Error ? error.message : String(error) };
  }
  return openBrowser(r);
}
//@ chunk-xh6k20xb.js:2446-2491 layout
async function fi(r) {
  return (await openValidatedUrl(r)).ok;
}
/**
 * 用系统浏览器打开 URL（只允许 http/https），Linux 无显示环境时返回 no_display。
 */
//@ chunk-xh6k20xb.js:2491-2750 fingerprint = openBrowser (0.304)
async function openBrowser(url) {
  try {
    let e = getAttacherCaps()?.browser,
      o = e !== void 0 ? (e ?? void 0) : env.BROWSER,
      n = "linux";
    if (!o && getInstallationEnv()) return { ok: !1, reason: "no_display" };
    return classifyImageError(await execFileNoThrow(o || "xdg-open", [url], BROWSER_EXEC_OPTIONS));
  } catch (error) {
    return { ok: !1, reason: "unknown", detail: error instanceof Error ? error.message : String(error) };
  }
}
/**
 * 把外部打开器的执行结果分类（opener_missing/timeout/spawn_error/nonzero_exit/unknown）；误配名，归属疑似错误。
 */
//@ chunk-xh6k20xb.js:2750-3205 placement = classifyImageError (0.454)
function classifyImageError(error) {
  if (error.code === 0) return { ok: !0 };
  let e = error.error ?? "",
    o = error.stderr || e || `exit ${error.code}`;
  if (error.code === 127 || e.includes("ENOENT")) return { ok: !1, reason: "opener_missing", detail: o };
  if (e.includes("ETIMEDOUT") || e.includes("timed out")) return { ok: !1, reason: "timeout", detail: o };
  if (e.includes("EACCES") || e.includes("EPERM")) return { ok: !1, reason: "spawn_error", detail: o };
  if (error.code > 0) return { ok: !1, reason: "nonzero_exit", detail: o };
  return { ok: !1, reason: "unknown", detail: o };
}

export { fi, yes, openValidatedUrl, isBrowserUnavailable, openPath, openClickedLink, isValidBrowserUrl };
