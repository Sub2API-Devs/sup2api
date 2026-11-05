/**
 * utils/desktopDeepLink.ts
 *
 * 打开 claude.ai 页面：优先 Claude Desktop 深链，回退浏览器；含 Windows 默认浏览器检测（default-browser 风格代码）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/desktopDeepLink.ts
 * pieces: chunk-vbwrr9hv.js (17)
 * attribution: placement 5, layout 5, fingerprint 4, sole-consumer 1, affinity 1, callgraph-fingerprint 1
 */
import { __toESM } from "../../runtime/bun-runtime.js";
import { require_semver_3 } from "../../vendor/semver/index.js";
import { semverGt } from "./semver.js";
import { execFileNoThrow } from "./execFileNoThrow.js";
import { logForDebugging } from "./debug.js";
import { printableName } from "./printableName.js";
import { getFirstLine } from "./stringUtils.js";
import { getOauthConfig } from "../constants/oauth.js";
import { isRelativePromoPath } from "../services/promo/promoState.js";
import { HTTPS_CLAUDE_AI } from "../constants/product.js";
import { openValidatedUrlSucceeded } from "./browser.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-vbwrr9hv.js:623-640 placement
/**
 * semver 模块的包装导入。
 */
var semverModuleForDesktop; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-vbwrr9hv.js:623", () => {
  semverModuleForDesktop = __toESM(require_semver_3(), 1);
});
//@ chunk-vbwrr9hv.js:640-659 placement
/**
 * 桌面端最低可用版本（1.1.9669），低于它需先更新。
 */
var MIN_DESKTOP_VERSION = "1.1.9669";
//@ chunk-vbwrr9hv.js:659-885 placement (2.1.88 match: isRunningFromBuildDirectory, 0.964)
function isRunningFromBuildDirectory() {
  let mapped = [process.argv[1] || "", process.execPath || ""].map((path) => path.replaceAll("\\", "/"));
  let buildDirs = ["/build-ant/", "/build-ant-native/", "/build-external/", "/build-external-native/"];
  return mapped.some((path) => buildDirs.some((dir) => path.includes(dir)));
}
//@ chunk-vbwrr9hv.js:885-1012 placement (2.1.88 match: ghIsDangerousCallback, 0.785)
function buildUrlWithParams(scheme, host, params = {}) {
  let url = new URL(`${scheme}://${host}`);
  for (let [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return url.toString();
}
//@ chunk-vbwrr9hv.js:1012-1184 placement
function buildDesktopUrl(sessionId, scheme) {
  switch (sessionId.kind) {
    case "resume":
      return buildUrlWithParams(scheme, "resume", {
        session: sessionId.sessionId,
      });
    case "new-session":
      return `${buildUrlWithParams(scheme, "code/new")}?folder=${encodeURIComponent(sessionId.folder)}`;
  }
}
//@ chunk-vbwrr9hv.js:1184-1251 layout
function isNewerThanMinDesktopVersion(version) {
  let desktopVersion = semverModuleForDesktop.coerce(version);
  return desktopVersion !== null && semverGt(desktopVersion.version, MIN_DESKTOP_VERSION);
}
//@ chunk-vbwrr9hv.js:1251-1399 fingerprint (2.1.88 match: isDesktopInstalled, 0.4)
async function isDesktopInstalled(scheme) {
  {
    let { code, stdout } = await execFileNoThrow("xdg-mime", [
      "query",
      "default",
      `x-scheme-handler/${scheme}`,
    ]);
    return code === 0 && stdout.trim().length > 0;
  }
  return false;
}
//@ chunk-vbwrr9hv.js:1399-1501 fingerprint (2.1.88 match: buildDesktopDeepLink, 0.663)
async function buildDesktopDeepLink() {
  if (isRunningFromBuildDirectory()) {
    if (await isDesktopInstalled("claude-dev")) return "claude-dev";
  }
  return (await isClaudeDesktopInstalled()) ? "claude" : null;
}
//@ chunk-vbwrr9hv.js:1546-1584 sole-consumer
async function isClaudeDesktopInstalled() {
  return isDesktopInstalled("claude");
}
//@ chunk-vbwrr9hv.js:1584-1615 affinity
async function getDesktopAppVersion() {
  return null;
}
//@ chunk-vbwrr9hv.js:1615-2013 fingerprint (2.1.88 match: getDesktopInstallStatus, 0.724)
async function getDesktopInstallStatus() {
  let installed = await buildDesktopDeepLink();
  if (installed === null)
    return {
      status: "not-installed",
    };
  if (installed === "claude-dev")
    return {
      status: "ready",
      version: "unknown",
      scheme: installed,
    };
  let version;
  let macApp;
  try {
    version = await getDesktopAppVersion();
  } catch {
    return {
      status: "ready",
      version: "unknown",
      scheme: installed,
    };
  }
  if (!version)
    return {
      status: "ready",
      version: "unknown",
      scheme: installed,
      macApp,
    };
  if (!isNewerThanMinDesktopVersion(version))
    return {
      status: "version-too-old",
      version,
    };
  return {
    status: "ready",
    version,
    scheme: installed,
    macApp,
  };
}
//@ chunk-vbwrr9hv.js:2013-2023 layout
/**
 * 桌面路径的最大长度（200）。
 */
var MAX_DESKTOP_PATH_CHARS = 200;
//@ chunk-vbwrr9hv.js:2023-2529 layout
function describeOpenFailure(command, outcome) {
  let { code, exitCode, stderr, error, timedOut, maxBufferExceeded } = outcome;
  if (code === 0)
    return {
      opened: true,
    };
  let stderrText = stderr || error;
  logForDebugging(
    `Deep link opener ${command} failed: code ${code}, exitCode ${exitCode ?? "undefined"}${stderrText ? `: ${stderrText}` : ""}`,
  );
  if (timedOut)
    return {
      opened: false,
      detail: `\`${command}\` timed out`,
    };
  if (maxBufferExceeded)
    return {
      opened: false,
      detail: `\`${command}\` printed too much output`,
    };
  let summary = exitCode === undefined ? `\`${command}\` failed` : `\`${command}\` exited ${exitCode}`;
  let replaced = printableName(
    getFirstLine(stderr.trim()) || (exitCode === undefined ? error : "") || "",
    MAX_DESKTOP_PATH_CHARS,
  ).replace(/\.+$/, "");
  return {
    opened: false,
    detail: replaced.length === 0 ? summary : `${summary}: ${replaced}`,
  };
}
//@ chunk-vbwrr9hv.js:2529-2718 fingerprint (2.1.88 match: openDeepLink, 0.355)
async function openDeepLink(url, macApp) {
  logForDebugging(`Opening deep link: ${url}`);
  return describeOpenFailure(
    "xdg-open",
    await execFileNoThrow("xdg-open", [url], {
      useCwd: true,
      useToolMemoryCgroup: false,
    }),
  );
  return {
    opened: false,
    detail: "no deep link opener for linux",
  };
}
//@ chunk-vbwrr9hv.js:2718-2875 layout
/**
 * 拼 claude.ai 完整 URL（CLAUDE_AI_ORIGIN + 校验过的路径）。
 */
function getClaudeAiWebUrl(webPath) {
  let CLAUDE_AI_ORIGIN = getOauthConfig().CLAUDE_AI_ORIGIN;
  if (!isRelativePromoPath(webPath)) {
    logForDebugging("[desktop-deep-link] invalid claude.ai path; origin only", {
      level: "warn",
    });
    return CLAUDE_AI_ORIGIN;
  }
  return `${CLAUDE_AI_ORIGIN}${webPath}`;
}
//@ chunk-vbwrr9hv.js:2875-3111 layout
/**
 * 打开 claude.ai 页面：生产环境优先尝试 Claude Desktop 深链，失败再用浏览器打开 web 路径，返回 desktop/browser/none。
 */
async function openInDesktopOrBrowser({ webPath, desktopPath }) {
  if (!isRelativePromoPath(webPath) || !isRelativePromoPath(desktopPath)) return "none";
  if (getOauthConfig().CLAUDE_AI_ORIGIN === HTTPS_CLAUDE_AI) {
    let scheme = await buildDesktopDeepLink();
    if (scheme !== null && (await openDeepLink(buildUrlWithParams(scheme, `claude.ai${desktopPath}`))).opened)
      return "desktop";
  }
  return (await openValidatedUrlSucceeded(getClaudeAiWebUrl(webPath))) ? "browser" : "none";
}
//@ chunk-vbwrr9hv.js:3111-3680 callgraph-fingerprint (2.1.88 match: openCurrentSessionInDesktop, 0.234)
async function openCurrentSessionInDesktop(sessionId) {
  let installed = await getDesktopInstallStatus();
  if (installed.status === "not-installed")
    return {
      success: false,
      reason: "not_installed",
      error: "Claude Desktop is not installed. Install it from https://claude.ai/download",
    };
  if (installed.status === "version-too-old")
    return {
      success: false,
      reason: "outdated",
      error: `Claude Desktop ${installed.version} is too old. Update to ${MIN_DESKTOP_VERSION} or later.`,
    };
  let deepLinkUrl = buildDesktopUrl(sessionId, installed.scheme);
  let opened = await openDeepLink(deepLinkUrl, installed.macApp);
  if (!opened.opened)
    return {
      success: false,
      reason: "open_failed",
      error: `Couldn't open Claude Desktop (${opened.detail}). Open Claude Desktop and try again.`,
      deepLinkUrl,
    };
  return {
    success: true,
    deepLinkUrl,
  };
}
export {
  buildDesktopDeepLink,
  openCurrentSessionInDesktop,
  getDesktopInstallStatus,
  MIN_DESKTOP_VERSION,
  openInDesktopOrBrowser,
  getClaudeAiWebUrl,
};
