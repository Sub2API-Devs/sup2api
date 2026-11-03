/**
 * services/artifactPreview/browserDiscovery.ts
 *
 * 2.1.316 新增：各平台 Chrome/Chromium/Edge/Brave 的候选路径；检查路径在挂载目录内且没有链接等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-r0perv8y.js (23)
 * attribution: placement 23
 */
import { join, join as join_2, relative, sep, isAbsolute } from "path";
import { homedir } from "os";
import { stat } from "fs/promises";
import { lstatSync } from "fs";
import { isPathAbsent, getErrnoCode, errorMessage } from "../../utils/errors.js";
import { hl } from "../../utils/networkPaths.js";
import { mn } from "../../utils/remoteEnvironment.js";
import { Ao } from "../../bootstrap/sessionFeatureValues.js";
import { logEvent } from "../analytics/index.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import { env } from "../../utils/env.js";
import { logForDebugging } from "../../utils/debug.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { uniq } from "../../utils/collections.js";

/**
 * 各平台 Chrome/Chromium/Edge/Brave 的候选路径。
 */
//@ chunk-r0perv8y.js:641-1367 placement
function chromeCandidatePaths() {
  switch ("linux") {
    case "darwin":
      return [
        "Google Chrome.app/Contents/MacOS/Google Chrome",
        "Chromium.app/Contents/MacOS/Chromium",
        "Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
        "Brave Browser.app/Contents/MacOS/Brave Browser",
      ].flatMap((r) => [join("/Applications", r), join(homedir(), "Applications", r)]);
    case "win32":
      return ["C:\\Program Files", "C:\\Program Files (x86)", join(homedir(), "AppData", "Local")].flatMap(
        (r) => [
          join(r, "Google", "Chrome", "Application", "chrome.exe"),
          join(r, "Chromium", "Application", "chrome.exe"),
          join(r, "Microsoft", "Edge", "Application", "msedge.exe"),
        ],
      );
    default:
      return [
        "/usr/bin/google-chrome-stable",
        "/usr/bin/google-chrome",
        "/usr/bin/chromium-browser",
        "/usr/bin/chromium",
        "/usr/local/bin/chromium",
        "/opt/google/chrome/chrome",
      ];
  }
}
//@ chunk-r0perv8y.js:1367-1485 placement
async function isExecutableFile(e, r) {
  try {
    let o = await stat(e);
    return o.isFile() && (o.mode & 73) !== 0;
  } catch (error) {
    if (r && !isPathAbsent(error)) throw error;
    return !1;
  }
}
//@ chunk-r0perv8y.js:1485-1598 placement
async function findChromeCandidates(e) {
  let r = [];
  for (let o of chromeCandidatePaths()) {
    if (hl(o)) continue;
    if (await isExecutableFile(o, e?.strict === !0)) r.push(o);
  }
  return r;
}
/**
 * 预览模拟器的技能挂载路径与常量。
 */
//@ chunk-r0perv8y.js:1696-1829 placement
var SKILLS_MOUNT = "/mnt/skills",
  EXAMPLES_ARTIFACT_EMULATOR = "examples/artifact-emulator",
  SCRIPTS_BOOTSTRAP_PY = "scripts/bootstrap.py",
  TENGU_COBALT_PLINTH_HORNBEAM = "tengu_cobalt_plinth_hornbeam",
  SKILLS_MOUNT_SPEC = { base: SKILLS_MOUNT, ownerUid: 0 };
//@ chunk-r0perv8y.js:1829-1863 placement
function LYn() {
  return join_2(SKILLS_MOUNT_SPEC.base, EXAMPLES_ARTIFACT_EMULATOR);
}
/**
 * 检查路径在挂载目录内且没有链接。
 */
//@ chunk-r0perv8y.js:1863-2324 placement
function checkInsideMount(e) {
  let r = relative(SKILLS_MOUNT_SPEC.base, e);
  if (r === "" || r === ".." || r.startsWith(`..${sep}`) || isAbsolute(r)) return "outside_mount";
  let parts = r.split(sep),
    base = SKILLS_MOUNT_SPEC.base;
  for (let l = 0; l <= parts.length; l++) {
    if (l > 0) base = join_2(base, parts[l - 1]);
    let n;
    try {
      n = lstatSync(base);
    } catch (error) {
      let w = getErrnoCode(error);
      return w === "ENOENT" || w === "ENOTDIR" ? "missing" : "unreadable";
    }
    if (n.isSymbolicLink()) return "link";
    if (l === parts.length ? !n.isFile() : !n.isDirectory()) return "wrong_type";
    if (n.uid !== SKILLS_MOUNT_SPEC.ownerUid) return "wrong_owner";
    if ((n.mode & 18) !== 0) return "writable";
  }
  return;
}
//@ chunk-r0perv8y.js:2324-2390 placement
function L() {
  if (!mn()) return "not_hosted";
  return checkInsideMount(join_2(LYn(), SCRIPTS_BOOTSTRAP_PY));
}
//@ chunk-r0perv8y.js:2390-2417 placement
function P() {
  return getEmulatorAvailability().on;
}
//@ chunk-r0perv8y.js:2417-2661 placement
function getEmulatorAvailability() {
  let e = Ao();
  if (e.artifactPreviewEmulator === void 0)
    ((e.artifactPreviewEmulator = emulatorAvailability()),
      logEvent("tengu_artifact_preview_emulator_gate", {
        on: e.artifactPreviewEmulator.on,
        reason: fromEnum(e.artifactPreviewEmulator.reason),
      }));
  return e.artifactPreviewEmulator;
}
/**
 * Artifact 预览模拟器是否可用（CLAUDE_CODE_ARTIFACT_PREVIEW_EMULATOR）。
 */
//@ chunk-r0perv8y.js:2661-3057 placement
function emulatorAvailability() {
  let CLAUDE_CODE_ARTIFACT_PREVIEW_EMULATOR = env.CLAUDE_CODE_ARTIFACT_PREVIEW_EMULATOR;
  if (CLAUDE_CODE_ARTIFACT_PREVIEW_EMULATOR === !1) return { on: !1, reason: "pinned_off" };
  let r;
  try {
    r = L();
  } catch (error) {
    (logForDebugging(
      `Artifact preview: could not check the emulator skill's files, so the emulator stays off: ${errorMessage(error)}`,
    ),
      (r = "unreadable"));
  }
  if (r !== void 0) return { on: !1, reason: r };
  if (CLAUDE_CODE_ARTIFACT_PREVIEW_EMULATOR === !0) return { on: !0, reason: "pinned_on" };
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_COBALT_PLINTH_HORNBEAM, !1) === !0
    ? { on: !0, reason: "flag_on" }
    : { on: !1, reason: "flag_off" };
}
//@ chunk-r0perv8y.js:3057-3068 placement
var u = null;
//@ chunk-r0perv8y.js:3068-3101 placement
function g() {
  return u !== null && !0;
}
//@ chunk-r0perv8y.js:3101-3279 placement
function isArtifactPreviewEnabled() {
  if (env.CLAUDE_CODE_ARTIFACT_PREVIEW === !1) return !1;
  if (previewEngineKind() === "emulator") return !0;
  if (!isArtifactPreviewEnabled_2()) return !1;
  if (env.CLAUDE_CODE_ARTIFACT_PREVIEW === !0) return !0;
  return getPreviewBrowserVerdict() !== "none";
}
//@ chunk-r0perv8y.js:3279-3293 placement
var I = { on: !1 };
//@ chunk-r0perv8y.js:3293-3448 placement
function previewEngineKind() {
  let e = Ao();
  return (
    (e.artifactPreviewEngine ??=
      env.CLAUDE_CODE_ARTIFACT_PREVIEW !== !1 && I.on && F() ? "emulator" : "local_chrome"),
    e.artifactPreviewEngine
  );
}
//@ chunk-r0perv8y.js:3448-3499 placement
function F() {
  return env.CLAUDE_CODE_REMOTE === !0 && P();
}
//@ chunk-r0perv8y.js:3499-3624 placement
function isArtifactPreviewEnabled_2() {
  if (env.CLAUDE_CODE_REMOTE || !g()) return !1;
  return (
    env.CLAUDE_CODE_ARTIFACT_PREVIEW ?? getFeatureValue_CACHED_MAY_BE_STALE("tengu_cobalt_plinth_aspen", !1)
  );
}
//@ chunk-r0perv8y.js:3624-3983 placement
function requirePreviewChrome() {
  if (u === null) throw Error("artifact preview is not compiled into this build");
  let { findPlaywrightChromes: findPlaywrightChromes } = u,
    r = async (o) =>
      env.BUN_CHROME_PATH
        ? [env.BUN_CHROME_PATH]
        : uniq([...(await findPlaywrightChromes(o)), ...(await findChromeCandidates(o))]);
  return {
    chromeCandidates: r,
    resolveChrome: async () => (await r())[0],
    noSandbox: u.needsNoSandbox,
    installHint: u.chromeInstallHint,
    installDir: u.chromeInstallDir,
  };
}
//@ chunk-r0perv8y.js:3983-4063 placement
function b() {
  return `${env.BUN_CHROME_PATH ?? ""}
${env.PLAYWRIGHT_BROWSERS_PATH ?? ""}`;
}
//@ chunk-r0perv8y.js:4063-4555 placement
async function startPreviewBrowserDiscovery() {
  let e;
  try {
    if (env.CLAUDE_CODE_ARTIFACT_PREVIEW !== void 0 || env.CLAUDE_CODE_REMOTE || !g()) return;
    let r = Ao();
    if (r.artifactPreviewBrowserSearch !== void 0) return;
    ((e = { env: b(), state: "pending" }), (r.artifactPreviewBrowserSearch = e));
  } catch (error) {
    logForDebugging(`Artifact preview: could not start the browser search: ${errorMessage(error)}`);
    return;
  }
  try {
    let chromeCandidates = await requirePreviewChrome().chromeCandidates({ strict: !0 });
    e.state = chromeCandidates.length > 0 ? "found" : "none";
  } catch (error) {
    ((e.state = "error"),
      logForDebugging(`Artifact preview: the startup browser search failed: ${errorMessage(error)}`));
  }
}
//@ chunk-r0perv8y.js:4555-4839 placement
function getPreviewBrowserVerdict() {
  let e = Ao();
  if (e.artifactPreviewBrowser === void 0)
    ((e.artifactPreviewBrowser = browserSearchVerdict(e.artifactPreviewBrowserSearch)),
      logEvent("tengu_artifact_preview_browser", {
        verdict: fromEnum(e.artifactPreviewBrowser.verdict),
        source: fromEnum(e.artifactPreviewBrowser.source),
      }));
  return e.artifactPreviewBrowser.verdict;
}
//@ chunk-r0perv8y.js:4839-4889 placement
function latchedPreviewBrowserVerdict() {
  return Ao().artifactPreviewBrowser;
}
//@ chunk-r0perv8y.js:4889-5148 placement
function browserSearchVerdict(e) {
  if (e === void 0) return { verdict: "unknown", source: "not_started" };
  if (e.env !== b()) return { verdict: "unknown", source: "stale_env" };
  if (e.state === "pending" || e.state === "error") return { verdict: "unknown", source: e.state };
  return { verdict: e.state, source: "session" };
}

export {
  LYn,
  SCRIPTS_BOOTSTRAP_PY,
  checkInsideMount,
  requirePreviewChrome,
  previewEngineKind,
  isArtifactPreviewEnabled,
  latchedPreviewBrowserVerdict,
};
