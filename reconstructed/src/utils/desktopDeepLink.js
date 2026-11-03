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
import { Vy } from "../../vendor/semver/index.js";
import { execFileNoThrow } from "./execFileNoThrow.js";
import { COPY_DIR } from "../commands/copy/copy.js";
import { EnvironmentVariablesSchema } from "./settings/types.js";
import { logForDebugging } from "./debug.js";
import { printableName } from "./printableName.js";
import { getFirstLine } from "./stringUtils.js";
import { getOauthConfig } from "../constants/oauth.js";
import { E_n } from "../services/promo/promoState.js";
import { HTTPS_CLAUDE_AI } from "../constants/product.js";
import { fi } from "./browser.js";

//@ chunk-5nte8cwj.js:623-640 placement
var m = Re(Vy(), 1);
//@ chunk-5nte8cwj.js:640-659 placement
var dDr = "1.1.9669";
//@ chunk-5nte8cwj.js:659-885 placement = isRunningFromBuildDirectory (0.964)
function isRunningFromBuildDirectory() {
  let mapped = [process.argv[1] || "", process.execPath || ""].map((o) => o.replaceAll("\\", "/")),
    buildDirs = ["/build-ant/", "/build-ant-native/", "/build-external/", "/build-external-native/"];
  return mapped.some((path) => buildDirs.some((dir) => path.includes(dir)));
}
//@ chunk-5nte8cwj.js:885-1012 placement = ghIsDangerousCallback (0.784)
function buildUrlWithParams(e, n, o = {}) {
  let r = new URL(`${e}://${n}`);
  for (let [a, s] of Object.entries(o)) r.searchParams.set(a, s);
  return r.toString();
}
//@ chunk-5nte8cwj.js:1012-1184 placement
function buildDesktopUrl(e, n) {
  switch (e.kind) {
    case "resume":
      return buildUrlWithParams(n, "resume", { session: e.sessionId });
    case "new-session":
      return `${buildUrlWithParams(n, "code/new")}?folder=${encodeURIComponent(e.folder)}`;
  }
}
//@ chunk-5nte8cwj.js:1251-1399 fingerprint = isDesktopInstalled (0.4)
async function isDesktopInstalled(e) {
  {
    let { code: code, stdout: stdout } = await execFileNoThrow("xdg-mime", [
      "query",
      "default",
      `x-scheme-handler/${e}`,
    ]);
    return code === 0 && stdout.trim().length > 0;
  }
  return !1;
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
  if (installed === null) return { status: "not-installed" };
  if (installed === "claude-dev") return { status: "ready", version: "unknown", scheme: installed };
  let n, o;
  try {
    n = await getDesktopAppVersion();
  } catch {
    return { status: "ready", version: "unknown", scheme: installed };
  }
  if (!n) return { status: "ready", version: "unknown", scheme: installed, macApp: o };
  if (!EnvironmentVariablesSchema(n)) return { status: "version-too-old", version: n };
  return { status: "ready", version: n, scheme: installed, macApp: o };
}
//@ chunk-5nte8cwj.js:2013-2023 layout
var P = 200;
//@ chunk-5nte8cwj.js:2023-2529 layout
function describeOpenFailure(e, n) {
  let {
    code: code,
    exitCode: exitCode,
    stderr: stderr,
    error: error,
    timedOut: timedOut,
    maxBufferExceeded: maxBufferExceeded,
  } = n;
  if (code === 0) return { opened: !0 };
  let i = stderr || error;
  if (
    (logForDebugging(
      `Deep link opener ${e} failed: code ${code}, exitCode ${exitCode ?? "undefined"}${i ? `: ${i}` : ""}`,
    ),
    timedOut)
  )
    return { opened: !1, detail: `\`${e}\` timed out` };
  if (maxBufferExceeded) return { opened: !1, detail: `\`${e}\` printed too much output` };
  let d = exitCode === void 0 ? `\`${e}\` failed` : `\`${e}\` exited ${exitCode}`,
    replaced = printableName(
      getFirstLine(stderr.trim()) || (exitCode === void 0 ? error : "") || "",
      P,
    ).replace(/\.+$/, "");
  return { opened: !1, detail: replaced.length === 0 ? d : `${d}: ${replaced}` };
}
//@ chunk-5nte8cwj.js:2529-2718 fingerprint = openDeepLink (0.355)
async function openDeepLink(e, n) {
  return (
    logForDebugging(`Opening deep link: ${e}`),
    describeOpenFailure(
      "xdg-open",
      await execFileNoThrow("xdg-open", [e], { useCwd: !0, useToolMemoryCgroup: !1 }),
    )
  );
  return { opened: !1, detail: "no deep link opener for linux" };
}
/**
 * 拼 claude.ai 完整 URL（CLAUDE_AI_ORIGIN + 校验过的路径）。
 */
//@ chunk-5nte8cwj.js:2718-2875 layout
function getClaudeAiWebUrl(e) {
  let CLAUDE_AI_ORIGIN = getOauthConfig().CLAUDE_AI_ORIGIN;
  if (!E_n(e))
    return (
      logForDebugging("[desktop-deep-link] invalid claude.ai path; origin only", { level: "warn" }),
      CLAUDE_AI_ORIGIN
    );
  return `${CLAUDE_AI_ORIGIN}${e}`;
}
/**
 * 打开 claude.ai 页面：生产环境优先尝试 Claude Desktop 深链，失败再用浏览器打开 web 路径，返回 desktop/browser/none。
 */
//@ chunk-5nte8cwj.js:2875-3111 layout
async function openInDesktopOrBrowser({ webPath: webPath, desktopPath: desktopPath }) {
  if (!E_n(webPath) || !E_n(desktopPath)) return "none";
  if (getOauthConfig().CLAUDE_AI_ORIGIN === HTTPS_CLAUDE_AI) {
    let o = await buildDesktopDeepLink();
    if (o !== null && (await openDeepLink(buildUrlWithParams(o, `claude.ai${desktopPath}`))).opened)
      return "desktop";
  }
  return (await fi(getClaudeAiWebUrl(webPath))) ? "browser" : "none";
}
//@ chunk-5nte8cwj.js:3111-3680 callgraph-fingerprint = openCurrentSessionInDesktop (0.233)
async function openCurrentSessionInDesktop(e) {
  let installed = await getDesktopInstallStatus();
  if (installed.status === "not-installed")
    return {
      success: !1,
      reason: "not_installed",
      error: "Claude Desktop is not installed. Install it from https://claude.ai/download",
    };
  if (installed.status === "version-too-old")
    return {
      success: !1,
      reason: "outdated",
      error: `Claude Desktop ${installed.version} is too old. Update to ${dDr} or later.`,
    };
  let o = buildDesktopUrl(e, installed.scheme),
    r = await openDeepLink(o, installed.macApp);
  if (!r.opened)
    return {
      success: !1,
      reason: "open_failed",
      error: `Couldn't open Claude Desktop (${r.detail}). Open Claude Desktop and try again.`,
      deepLinkUrl: o,
    };
  return { success: !0, deepLinkUrl: o };
}

export {
  isDesktopInstalled,
  m,
  dDr,
  buildDesktopDeepLink,
  openCurrentSessionInDesktop,
  getDesktopInstallStatus,
  openInDesktopOrBrowser,
  getClaudeAiWebUrl,
};
