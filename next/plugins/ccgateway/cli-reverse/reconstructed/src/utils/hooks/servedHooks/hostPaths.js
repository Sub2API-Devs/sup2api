/**
 * utils/hooks/servedHooks/hostPaths.ts
 *
 * 2.1.316 新增：宿主路径
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (7)
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

//@ chunk-5xgkngpb.js:928821-928864 placement
/**
 * 不可用时的空回调（把原因交给 onUnavailable）。
 */
function onUnavailableNoop(request, reason) {
  request.onUnavailable(reason);
  return;
}
//@ chunk-5xgkngpb.js:928952-929234 placement
function hostPathDeps(launchDir, hostFiles) {
  return {
    childEnv: subprocessEnv,
    realpath: async (filePath) => {
      let realPath = await realpathViaHostFiles(filePath, hostFiles);
      return isAbsolute(realPath) ? realPath : filePath;
    },
    gitRoot: findGitRootUncached,
    canonicalGitRoot: findCanonicalGitRootUncached,
    scopeSettingsFile: (settingSource) => getSettingsFilePathForSource(settingSource) ?? null,
    scopeWriteEntries: (settingSource) => collectSettingsWriteRoots(settingSource, launchDir),
    scopeRoots: (settingSource, readableDirs) =>
      settingsReachRootsForSource(launchDir, settingSource, readableDirs),
    commonRoots: () => collectBaseReachRoots(launchDir),
    deviceHooksMemory: deviceHooksProcessMemories.of(getRootSession().host),
  };
}
//@ chunk-5xgkngpb.js:929234-930325 placement
/**
 * 计算设备钩子的可达范围：收集启动目录、项目目录、git 根、各设置源的可写条目与公共根，解析真实路径，返回供判定"命令/路径是否在云会话可写范围内"的状态。
 */
function createHostPathReach({ launchDir, projectDir, originalCwd }, deps = hostPathDeps(launchDir)) {
  let stickyRoots = new Set();
  let pinnedScopes = new Set();
  let pinnedRoots = new Map();
  let reachBaseline = new Map(
    SETTING_SOURCES.map((settingSource) => [settingSource, deps.scopeWriteEntries(settingSource)]),
  );
  let commonRoots = deps.commonRoots();
  let knownRoots = new Set();
  let filtered = [launchDir, projectDir, originalCwd === launchDir ? undefined : originalCwd].filter(
    (root) => root !== undefined,
  );
  let canonicalizeOrTrack = (rootPath) =>
    deps.realpath(rootPath).catch((error) => {
      if (error instanceof HostPathRefused) knownRoots.add(POSIX_SEP_2);
      throw error;
    });
  let presetRoots = async () => {
    let mapped = [deps.gitRoot(launchDir), deps.canonicalGitRoot(launchDir)]
      .filter((gitRoot) => gitRoot !== null)
      .map((gitRoot) => (getPlatform() === "windows" ? gitRoot.replace(/\//g, "\\") : gitRoot));
    for (let rootPath of [...filtered, ...mapped]) {
      knownRoots.add(rootPath);
      await canonicalizeOrTrack(rootPath).then(
        (realPath) => {
          if (isAbsolute(realPath)) knownRoots.add(realPath);
        },
        () => {},
      );
    }
    return stickyRootsFor({
      launchDir,
      launchDirReal: launchDir,
      extra: [...knownRoots],
    });
  };
  let envAtAttach = {
    ...deps.childEnv(),
  };
  let legacyEnvAtAttach = latchLegacyPin(deps.deviceHooksMemory, getAppliedGlobalConfigEnv());
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
      let collectRoots = async () =>
        collectStickyRoots({
          stickyRoots,
          pinnedScopes,
          pinnedRoots,
          baseRoots: await presetRoots(),
          reachBaseline,
          scopeSettingsFile: deps.scopeSettingsFile,
          realpath: canonicalizeOrTrack,
          commonRoots: () => commonRoots,
          scopeRoots: deps.scopeRoots,
        });
      let roots = await collectRoots();
      return knownRoots.has(POSIX_SEP_2) && !roots.includes(POSIX_SEP_2) ? collectRoots() : roots;
    },
  };
}
//@ chunk-5xgkngpb.js:930325-930674 placement
/**
 * 经宿主文件接口求真实路径（存储 V5 时），否则走本地实现。
 */
async function realpathViaHostFiles(filePath, hostFiles) {
  if (isStorageV5Enabled() && hostFiles !== undefined) {
    let space = hostPathSpace(filePath);
    if (space !== "store") {
      let result = await hostFiles.hostFiles.realPath(
        PathSpace[space](
          isAbsolute(filePath) ? filePath : joinKeepingTrailingSep(getFsImplementation().cwd(), filePath),
        ),
        {
          native: true,
        },
      );
      if (result.ok && result.value.found) return result.value.path;
      if (result.ok)
        throw Object.assign(Error("ENOENT: no such file or directory"), {
          code: "ENOENT",
        });
      if (!isHostFileError(result.error)) throw new HostPathRefused();
      throw unwrapHostFileError(result.error);
    }
  }
  return realpath(filePath);
}
//@ chunk-5xgkngpb.js:930674-930727 placement
/**
 * 拼接路径时保留已存在的尾部分隔符。
 */
function joinKeepingTrailingSep(dirPath, name) {
  return dirPath.endsWith(sep) ? dirPath + name : dirPath + sep + name;
}
//@ chunk-5xgkngpb.js:930727-930827 placement
function hostPathSpace(filePath) {
  return filePath === getSettingsFilePathForSource("userSettings")
    ? "store"
    : filePath === getSettingsFilePathForSource("policySettings")
      ? "system"
      : "workspace";
}
//@ chunk-5xgkngpb.js:930827-930955 placement
class HostPathRefused extends Error {
  constructor() {
    super("host path resolution refused by the storage backend");
    this.name = "HostPathRefused";
  }
}
export { joinKeepingTrailingSep, onUnavailableNoop, createHostPathReach };
