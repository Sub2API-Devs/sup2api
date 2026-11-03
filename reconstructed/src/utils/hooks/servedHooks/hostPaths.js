/**
 * utils/hooks/servedHooks/hostPaths.ts
 *
 * 2.1.316 新增：宿主路径
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (7)
 * attribution: placement 7
 */
import { isAbsolute, sep } from "path";
import { realpath } from "fs/promises";
import { subprocessEnv } from "../../subprocessEnv.js";
import { findGitRootUncached, findCanonicalGitRootUncached } from "../../git.js";
import { getSettingsFilePathForSource } from "../../settings/settings.js";
import {
  collectSettingsWriteRoots,
  settingsReachRootsForSource,
  collectBaseReachRoots,
} from "../../git/builderGit/sandboxReach.js";
import { deviceHooksProcessMemories } from "../deviceHooks/cloudRegistration.js";
import { getRootSession } from "../../../bootstrap/state.js";
import { SETTING_SOURCES } from "../../settings/constants.js";
import { POSIX_SEP_2 } from "../hookCommandAnalysis.js";
import { getPlatform } from "../../platform.js";
import { stickyRootsFor, collectStickyRoots } from "../../settings/stickyRoots.js";
import { latchLegacyPin } from "../hookCommandResolution.js";
import { getAppliedGlobalConfigEnv } from "../../managedEnvApply.js";
import { createProjectHookPinsState } from "./hookPins.js";
import { isStorageV5Enabled } from "../../hoverRest.js";
import { PathSpace, isHostFileError, unwrapHostFileError } from "../../resultError.js";
import { getFsImplementation } from "../../fsOperations.js";

//@ chunk-e6aww6q8.js:918322-918365 placement
/**
 * 不可用时的空回调（把原因交给 onUnavailable）。
 */
function onUnavailableNoop(e, n) {
  e.onUnavailable(n);
  return;
}
//@ chunk-e6aww6q8.js:918453-918735 placement
function hostPathDeps(launchDir, n) {
  return {
    childEnv: subprocessEnv,
    realpath: async (r) => {
      let s = await realpathViaHostFiles(r, n);
      return isAbsolute(s) ? s : r;
    },
    gitRoot: findGitRootUncached,
    canonicalGitRoot: findCanonicalGitRootUncached,
    scopeSettingsFile: (r) => getSettingsFilePathForSource(r) ?? null,
    scopeWriteEntries: (r) => collectSettingsWriteRoots(r, launchDir),
    scopeRoots: (r, s) => settingsReachRootsForSource(launchDir, r, s),
    commonRoots: () => collectBaseReachRoots(launchDir),
    deviceHooksMemory: deviceHooksProcessMemories.of(getRootSession().host),
  };
}
//@ chunk-e6aww6q8.js:918735-919824 placement
/**
 * 计算设备钩子的可达范围：收集启动目录、项目目录、git 根、各设置源的可写条目与公共根，解析真实路径，返回供判定"命令/路径是否在云会话可写范围内"的状态。
 */
function createHostPathReach({ launchDir, projectDir, originalCwd }, s = hostPathDeps(launchDir)) {
  let stickyRoots = new Set();
  let pinnedScopes = new Set();
  let pinnedRoots = new Map();
  let reachBaseline = new Map(SETTING_SOURCES.map((Ae) => [Ae, s.scopeWriteEntries(Ae)]));
  let L = s.commonRoots();
  let G = new Set();
  let filtered = [launchDir, projectDir, originalCwd === launchDir ? undefined : originalCwd].filter(
    (Ae) => Ae !== undefined,
  );
  let Z = (Ae) =>
    s.realpath(Ae).catch((error) => {
      if (error instanceof HostPathRefused) G.add(POSIX_SEP_2);
      throw error;
    });
  let Se = async () => {
    let mapped = [s.gitRoot(launchDir), s.canonicalGitRoot(launchDir)]
      .filter((Ie) => Ie !== null)
      .map((Ie) => (getPlatform() === "windows" ? Ie.replace(/\//g, "\\") : Ie));
    for (let Ie of [...filtered, ...mapped]) {
      G.add(Ie);
      await Z(Ie).then(
        (Me) => {
          if (isAbsolute(Me)) G.add(Me);
        },
        () => {},
      );
    }
    return stickyRootsFor({
      launchDir,
      launchDirReal: launchDir,
      extra: [...G],
    });
  };
  let envAtAttach = {
    ...s.childEnv(),
  };
  let legacyEnvAtAttach = latchLegacyPin(s.deviceHooksMemory, getAppliedGlobalConfigEnv());
  let projectHookPinsState = createProjectHookPinsState({
    projectDir,
    launchDir,
    envAtAttach,
  });
  return {
    launchDir,
    projectDir,
    envAtAttach,
    legacyEnvAtAttach,
    distrustedSources: new Set(),
    ...(projectHookPinsState !== undefined && {
      projectHooks: projectHookPinsState,
    }),
    async current() {
      let Ae = async () =>
        collectStickyRoots({
          stickyRoots,
          pinnedScopes,
          pinnedRoots,
          baseRoots: await Se(),
          reachBaseline,
          scopeSettingsFile: s.scopeSettingsFile,
          realpath: Z,
          commonRoots: () => L,
          scopeRoots: s.scopeRoots,
        });
      let Ie = await Ae();
      return G.has(POSIX_SEP_2) && !Ie.includes(POSIX_SEP_2) ? Ae() : Ie;
    },
  };
}
//@ chunk-e6aww6q8.js:919824-920173 placement
/**
 * 经宿主文件接口求真实路径（存储 V5 时），否则走本地实现。
 */
async function realpathViaHostFiles(e, n) {
  if (isStorageV5Enabled() && n !== undefined) {
    let r = hostPathSpace(e);
    if (r !== "store") {
      let s = await n.hostFiles.realPath(
        PathSpace[r](isAbsolute(e) ? e : joinKeepingTrailingSep(getFsImplementation().cwd(), e)),
        {
          native: true,
        },
      );
      if (s.ok && s.value.found) return s.value.path;
      if (s.ok)
        throw Object.assign(Error("ENOENT: no such file or directory"), {
          code: "ENOENT",
        });
      if (!isHostFileError(s.error)) throw new HostPathRefused();
      throw unwrapHostFileError(s.error);
    }
  }
  return realpath(e);
}
//@ chunk-e6aww6q8.js:920173-920226 placement
/**
 * 拼接路径时保留已存在的尾部分隔符。
 */
function joinKeepingTrailingSep(e, n) {
  return e.endsWith(sep) ? e + n : e + sep + n;
}
//@ chunk-e6aww6q8.js:920226-920326 placement
function hostPathSpace(e) {
  return e === getSettingsFilePathForSource("userSettings")
    ? "store"
    : e === getSettingsFilePathForSource("policySettings")
      ? "system"
      : "workspace";
}
//@ chunk-e6aww6q8.js:920326-920454 placement
class HostPathRefused extends Error {
  constructor() {
    super("host path resolution refused by the storage backend");
    this.name = "HostPathRefused";
  }
}
export { joinKeepingTrailingSep, createHostPathReach, onUnavailableNoop };
