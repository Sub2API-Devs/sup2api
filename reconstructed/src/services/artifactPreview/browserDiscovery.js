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
import { join, relative, sep, isAbsolute } from "path";
import { homedir } from "os";
import { stat } from "fs/promises";
import { lstatSync } from "fs";
import { isPathAbsent, getErrnoCode, errorMessage } from "../../utils/errors.js";
import { isUntouchableSpelling } from "../../utils/networkPaths.js";
import { isRemoteManagedEnvironment } from "../../utils/remoteEnvironment.js";
import { getSessionFeatureValues } from "../../bootstrap/sessionFeatureValues.js";
import { logEvent } from "../analytics/index.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import { env } from "../../utils/env.js";
import { logForDebugging } from "../../utils/debug.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { uniq } from "../../utils/collections.js";

//@ chunk-r0perv8y.js:641-1367 placement
/**
 * 各平台 Chrome/Chromium/Edge/Brave 的候选路径。
 */
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
    return false;
  }
}
//@ chunk-r0perv8y.js:1485-1598 placement
async function findChromeCandidates(e) {
  let r = [];
  for (let o of chromeCandidatePaths()) {
    if (isUntouchableSpelling(o)) continue;
    if (await isExecutableFile(o, e?.strict === true)) r.push(o);
  }
  return r;
}
//@ chunk-r0perv8y.js:1696-1829 placement
/**
 * 预览模拟器的技能挂载路径与常量。
 */
var SKILLS_MOUNT = "/mnt/skills";
var EXAMPLES_ARTIFACT_EMULATOR = "examples/artifact-emulator";
var SCRIPTS_BOOTSTRAP_PY = "scripts/bootstrap.py";
var TENGU_COBALT_PLINTH_HORNBEAM = "tengu_cobalt_plinth_hornbeam";
var SKILLS_MOUNT_SPEC = {
  base: SKILLS_MOUNT,
  ownerUid: 0,
};
//@ chunk-r0perv8y.js:1829-1863 placement
/**
 * 导出函数 `artifactEmulatorDir`：返回 join_2(SKILLS_MOUNT_SPEC.base, EXAMPLES_ARTIFACT_EMULATOR)。
 */
function artifactEmulatorDir() {
  return join(SKILLS_MOUNT_SPEC.base, EXAMPLES_ARTIFACT_EMULATOR);
}
//@ chunk-r0perv8y.js:1863-2324 placement
/**
 * 检查路径在挂载目录内且没有链接。
 */
function checkInsideMount(e) {
  let r = relative(SKILLS_MOUNT_SPEC.base, e);
  if (r === "" || r === ".." || r.startsWith(`..${sep}`) || isAbsolute(r)) return "outside_mount";
  let parts = r.split(sep);
  let base = SKILLS_MOUNT_SPEC.base;
  for (let j = 0; j <= parts.length; j++) {
    if (j > 0) base = join(base, parts[j - 1]);
    let n;
    try {
      n = lstatSync(base);
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      return errnoCode === "ENOENT" || errnoCode === "ENOTDIR" ? "missing" : "unreadable";
    }
    if (n.isSymbolicLink()) return "link";
    if (j === parts.length ? !n.isFile() : !n.isDirectory()) return "wrong_type";
    if (n.uid !== SKILLS_MOUNT_SPEC.ownerUid) return "wrong_owner";
    if ((n.mode & 18) !== 0) return "writable";
  }
  return;
}
//@ chunk-r0perv8y.js:2324-2390 placement
/**
 * 内嵌 artifact 预览（emulator）：启动脚本挂载位置检查、是否编译进本构（compiledPreviewModule）、emulator 可用性开关与远端启用判断。
 */
function bootstrapScriptMount() {
  if (!isRemoteManagedEnvironment()) return "not_hosted";
  return checkInsideMount(join(artifactEmulatorDir(), SCRIPTS_BOOTSTRAP_PY));
}
//@ chunk-r0perv8y.js:2390-2417 placement
function isEmulatorAvailable() {
  return getEmulatorAvailability().on;
}
//@ chunk-r0perv8y.js:2417-2661 placement
function getEmulatorAvailability() {
  let sessionFeatureValues = getSessionFeatureValues();
  if (sessionFeatureValues.artifactPreviewEmulator === undefined) {
    sessionFeatureValues.artifactPreviewEmulator = emulatorAvailability();
    logEvent("tengu_artifact_preview_emulator_gate", {
      on: sessionFeatureValues.artifactPreviewEmulator.on,
      reason: fromEnum(sessionFeatureValues.artifactPreviewEmulator.reason),
    });
  }
  return sessionFeatureValues.artifactPreviewEmulator;
}
//@ chunk-r0perv8y.js:2661-3057 placement
/**
 * Artifact 预览模拟器是否可用（CLAUDE_CODE_ARTIFACT_PREVIEW_EMULATOR）。
 */
function emulatorAvailability() {
  let CLAUDE_CODE_ARTIFACT_PREVIEW_EMULATOR = env.CLAUDE_CODE_ARTIFACT_PREVIEW_EMULATOR;
  if (CLAUDE_CODE_ARTIFACT_PREVIEW_EMULATOR === false)
    return {
      on: false,
      reason: "pinned_off",
    };
  let r;
  try {
    r = bootstrapScriptMount();
  } catch (error) {
    logForDebugging(
      `Artifact preview: could not check the emulator skill's files, so the emulator stays off: ${errorMessage(error)}`,
    );
    r = "unreadable";
  }
  if (r !== undefined)
    return {
      on: false,
      reason: r,
    };
  if (CLAUDE_CODE_ARTIFACT_PREVIEW_EMULATOR === true)
    return {
      on: true,
      reason: "pinned_on",
    };
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_COBALT_PLINTH_HORNBEAM, false) === true
    ? {
        on: true,
        reason: "flag_on",
      }
    : {
        on: false,
        reason: "flag_off",
      };
}
//@ chunk-r0perv8y.js:3057-3068 placement
var compiledPreviewModule = null;
//@ chunk-r0perv8y.js:3068-3101 placement
function hasCompiledPreview() {
  return compiledPreviewModule !== null && true;
}
//@ chunk-r0perv8y.js:3101-3279 placement
function isArtifactPreviewEnabled() {
  if (env.CLAUDE_CODE_ARTIFACT_PREVIEW === false) return false;
  if (previewEngineKind() === "emulator") return true;
  if (!isArtifactPreviewEnabled_2()) return false;
  if (env.CLAUDE_CODE_ARTIFACT_PREVIEW === true) return true;
  return getPreviewBrowserVerdict() !== "none";
}
//@ chunk-r0perv8y.js:3279-3293 placement
var emulatorAvailabilityState = {
  on: false,
};
//@ chunk-r0perv8y.js:3293-3448 placement
function previewEngineKind() {
  let sessionFeatureValues = getSessionFeatureValues();
  sessionFeatureValues.artifactPreviewEngine ??=
    env.CLAUDE_CODE_ARTIFACT_PREVIEW !== false && emulatorAvailabilityState.on && isRemoteEmulatorEnabled()
      ? "emulator"
      : "local_chrome";
  return sessionFeatureValues.artifactPreviewEngine;
}
//@ chunk-r0perv8y.js:3448-3499 placement
function isRemoteEmulatorEnabled() {
  return env.CLAUDE_CODE_REMOTE === true && isEmulatorAvailable();
}
//@ chunk-r0perv8y.js:3499-3624 placement
function isArtifactPreviewEnabled_2() {
  if (env.CLAUDE_CODE_REMOTE || !hasCompiledPreview()) return false;
  return (
    env.CLAUDE_CODE_ARTIFACT_PREVIEW ??
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_cobalt_plinth_aspen", false)
  );
}
//@ chunk-r0perv8y.js:3624-3983 placement
function requirePreviewChrome() {
  if (compiledPreviewModule === null) throw Error("artifact preview is not compiled into this build");
  let { findPlaywrightChromes } = compiledPreviewModule;
  let r = async (o) =>
    env.BUN_CHROME_PATH
      ? [env.BUN_CHROME_PATH]
      : uniq([...(await findPlaywrightChromes(o)), ...(await findChromeCandidates(o))]);
  return {
    chromeCandidates: r,
    resolveChrome: async () => (await r())[0],
    noSandbox: compiledPreviewModule.needsNoSandbox,
    installHint: compiledPreviewModule.chromeInstallHint,
    installDir: compiledPreviewModule.chromeInstallDir,
  };
}
//@ chunk-r0perv8y.js:3983-4063 placement
function browserEnvKey() {
  return `${env.BUN_CHROME_PATH ?? ""}
${env.PLAYWRIGHT_BROWSERS_PATH ?? ""}`;
}
//@ chunk-r0perv8y.js:4063-4555 placement
async function startPreviewBrowserDiscovery() {
  let e;
  try {
    if (env.CLAUDE_CODE_ARTIFACT_PREVIEW !== undefined || env.CLAUDE_CODE_REMOTE || !hasCompiledPreview())
      return;
    let sessionFeatureValues = getSessionFeatureValues();
    if (sessionFeatureValues.artifactPreviewBrowserSearch !== undefined) return;
    e = {
      env: browserEnvKey(),
      state: "pending",
    };
    sessionFeatureValues.artifactPreviewBrowserSearch = e;
  } catch (error) {
    logForDebugging(`Artifact preview: could not start the browser search: ${errorMessage(error)}`);
    return;
  }
  try {
    let r = await requirePreviewChrome().chromeCandidates({
      strict: true,
    });
    e.state = r.length > 0 ? "found" : "none";
  } catch (error) {
    e.state = "error";
    logForDebugging(`Artifact preview: the startup browser search failed: ${errorMessage(error)}`);
  }
}
//@ chunk-r0perv8y.js:4555-4839 placement
function getPreviewBrowserVerdict() {
  let sessionFeatureValues = getSessionFeatureValues();
  if (sessionFeatureValues.artifactPreviewBrowser === undefined) {
    sessionFeatureValues.artifactPreviewBrowser = browserSearchVerdict(
      sessionFeatureValues.artifactPreviewBrowserSearch,
    );
    logEvent("tengu_artifact_preview_browser", {
      verdict: fromEnum(sessionFeatureValues.artifactPreviewBrowser.verdict),
      source: fromEnum(sessionFeatureValues.artifactPreviewBrowser.source),
    });
  }
  return sessionFeatureValues.artifactPreviewBrowser.verdict;
}
//@ chunk-r0perv8y.js:4839-4889 placement
function latchedPreviewBrowserVerdict() {
  return getSessionFeatureValues().artifactPreviewBrowser;
}
//@ chunk-r0perv8y.js:4889-5148 placement
function browserSearchVerdict(artifactPreviewBrowserSearch) {
  if (artifactPreviewBrowserSearch === undefined)
    return {
      verdict: "unknown",
      source: "not_started",
    };
  if (artifactPreviewBrowserSearch.env !== browserEnvKey())
    return {
      verdict: "unknown",
      source: "stale_env",
    };
  if (artifactPreviewBrowserSearch.state === "pending" || artifactPreviewBrowserSearch.state === "error")
    return {
      verdict: "unknown",
      source: artifactPreviewBrowserSearch.state,
    };
  return {
    verdict: artifactPreviewBrowserSearch.state,
    source: "session",
  };
}
export {
  artifactEmulatorDir,
  SCRIPTS_BOOTSTRAP_PY,
  checkInsideMount,
  requirePreviewChrome,
  previewEngineKind,
  isArtifactPreviewEnabled,
  latchedPreviewBrowserVerdict,
};
