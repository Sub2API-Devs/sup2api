/**
 * utils/desktopDeepLink.ts
 *
 * 打开 claude.ai 页面：优先 Claude Desktop 深链，回退浏览器；含 Windows 默认浏览器检测（default-browser 风格代码）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/desktopDeepLink.ts
 * pieces: chunk-5nte8cwj.js (15)
 * attribution: placement 5, fingerprint 4, affinity 1, layout 4, callgraph-fingerprint 1
 */
import { Re } from "../../runtime/bun-runtime.js";
import { require_semver_3 } from "../../vendor/semver/index.js";
import { execFileNoThrow } from "./execFileNoThrow.js";
import { COPY_DIR } from "../commands/copy/copy.js";
import { EnvironmentVariablesSchema } from "./settings/types.js";
import { logForDebugging } from "./debug.js";
import { printableName } from "./printableName.js";
import { getFirstLine } from "./stringUtils.js";
import { getOauthConfig } from "../constants/oauth.js";
import { isRelativePromoPath } from "../services/promo/promoState.js";
import { HTTPS_CLAUDE_AI } from "../constants/product.js";
import { openValidatedUrlSucceeded } from "./browser.js";

//@ chunk-5nte8cwj.js:623-640 placement
/**
 * semver 模块的包装导入。
 */
var semverModuleForDesktop = Re(require_semver_3(), 1);
//@ chunk-5nte8cwj.js:640-659 placement
/**
 * 桌面端最低可用版本（1.1.9669），低于它需先更新。
 */
var MIN_DESKTOP_VERSION = "1.1.9669";
//@ chunk-5nte8cwj.js:659-885 placement = isRunningFromBuildDirectory (0.964)
function isRunningFromBuildDirectory() {
  let mapped = [process.argv[1] || "", process.execPath || ""].map((o) => o.replaceAll("\\", "/"));
  let buildDirs = ["/build-ant/", "/build-ant-native/", "/build-external/", "/build-external-native/"];
  return mapped.some((path) => buildDirs.some((dir) => path.includes(dir)));
}
//@ chunk-5nte8cwj.js:885-1012 placement = ghIsDangerousCallback (0.784)
function buildUrlWithParams(e, n, o = {}) {
  let r = new URL(`${e}://${n}`);
  for (let [key, value] of Object.entries(o)) r.searchParams.set(key, value);
  return r.toString();
}
//@ chunk-5nte8cwj.js:1012-1184 placement
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
//@ chunk-5nte8cwj.js:1251-1399 fingerprint = isDesktopInstalled (0.4)
async function isDesktopInstalled(e) {
  {
    let { code, stdout } = await execFileNoThrow("xdg-mime", ["query", "default", `x-scheme-handler/${e}`]);
    return code === 0 && stdout.trim().length > 0;
  }
  return false;
}
//@ chunk-5nte8cwj.js:1399-1501 fingerprint = buildDesktopDeepLink (0.662)
async function buildDesktopDeepLink() {
  if (isRunningFromBuildDirectory()) {
    if (await isDesktopInstalled("claude-dev")) return "claude-dev";
  }
  return (await COPY_DIR()) ? "claude" : null;
}
//@ chunk-5nte8cwj.js:1584-1615 affinity
async function getDesktopAppVersion() {
  return null;
}
//@ chunk-5nte8cwj.js:1615-2013 fingerprint = getDesktopInstallStatus (0.724)
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
  if (!EnvironmentVariablesSchema(version))
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
//@ chunk-5nte8cwj.js:2013-2023 layout
/**
 * 桌面路径的最大长度（200）。
 */
var MAX_DESKTOP_PATH_CHARS = 200;
//@ chunk-5nte8cwj.js:2023-2529 layout
function describeOpenFailure(e, n) {
  let { code, exitCode, stderr, error, timedOut, maxBufferExceeded } = n;
  if (code === 0)
    return {
      opened: true,
    };
  let i = stderr || error;
  logForDebugging(
    `Deep link opener ${e} failed: code ${code}, exitCode ${exitCode ?? "undefined"}${i ? `: ${i}` : ""}`,
  );
  if (timedOut)
    return {
      opened: false,
      detail: `\`${e}\` timed out`,
    };
  if (maxBufferExceeded)
    return {
      opened: false,
      detail: `\`${e}\` printed too much output`,
    };
  let d = exitCode === undefined ? `\`${e}\` failed` : `\`${e}\` exited ${exitCode}`;
  let replaced = printableName(
    getFirstLine(stderr.trim()) || (exitCode === undefined ? error : "") || "",
    MAX_DESKTOP_PATH_CHARS,
  ).replace(/\.+$/, "");
  return {
    opened: false,
    detail: replaced.length === 0 ? d : `${d}: ${replaced}`,
  };
}
//@ chunk-5nte8cwj.js:2529-2718 fingerprint = openDeepLink (0.355)
async function openDeepLink(e, macApp) {
  logForDebugging(`Opening deep link: ${e}`);
  return describeOpenFailure(
    "xdg-open",
    await execFileNoThrow("xdg-open", [e], {
      useCwd: true,
      useToolMemoryCgroup: false,
    }),
  );
  return {
    opened: false,
    detail: "no deep link opener for linux",
  };
}
//@ chunk-5nte8cwj.js:2718-2875 layout
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
//@ chunk-5nte8cwj.js:2875-3111 layout
/**
 * 打开 claude.ai 页面：生产环境优先尝试 Claude Desktop 深链，失败再用浏览器打开 web 路径，返回 desktop/browser/none。
 */
async function openInDesktopOrBrowser({ webPath, desktopPath }) {
  if (!isRelativePromoPath(webPath) || !isRelativePromoPath(desktopPath)) return "none";
  if (getOauthConfig().CLAUDE_AI_ORIGIN === HTTPS_CLAUDE_AI) {
    let desktopDeepLink = await buildDesktopDeepLink();
    if (
      desktopDeepLink !== null &&
      (await openDeepLink(buildUrlWithParams(desktopDeepLink, `claude.ai${desktopPath}`))).opened
    )
      return "desktop";
  }
  return (await openValidatedUrlSucceeded(getClaudeAiWebUrl(webPath))) ? "browser" : "none";
}
//@ chunk-5nte8cwj.js:3111-3680 callgraph-fingerprint = openCurrentSessionInDesktop (0.233)
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
  isDesktopInstalled,
  buildDesktopDeepLink,
  semverModuleForDesktop,
  MIN_DESKTOP_VERSION,
  getDesktopInstallStatus,
  openCurrentSessionInDesktop,
  openInDesktopOrBrowser,
  getClaudeAiWebUrl,
};
