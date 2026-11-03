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
import {
  isAbsolute,
  isAbsolute as isAbsolute_2,
  isAbsolute as isAbsolute_3,
  isAbsolute as isAbsolute_4,
  isAbsolute as isAbsolute_5,
  isAbsolute as isAbsolute_6,
  isAbsolute as isAbsolute_7,
  isAbsolute as isAbsolute_8,
  isAbsolute as isAbsolute_9,
  isAbsolute as isAbsolute_10,
  isAbsolute as isAbsolute_11,
  isAbsolute as isAbsolute_12,
  isAbsolute as isAbsolute_13,
  isAbsolute as isAbsolute_14,
  isAbsolute as isAbsolute_15,
  isAbsolute as isAbsolute_16,
  isAbsolute as isAbsolute_17,
  isAbsolute as isAbsolute_18,
  isAbsolute as isAbsolute_19,
  isAbsolute as isAbsolute_20,
  isAbsolute as isAbsolute_21,
  isAbsolute as isAbsolute_22,
  isAbsolute as isAbsolute_23,
  isAbsolute as isAbsolute_24,
  isAbsolute as isAbsolute_25,
  isAbsolute as isAbsolute_26,
  isAbsolute as isAbsolute_27,
  isAbsolute as isAbsolute_28,
  isAbsolute as isAbsolute_29,
  isAbsolute as isAbsolute_30,
  isAbsolute as isAbsolute_31,
  isAbsolute as isAbsolute_32,
  isAbsolute as isAbsolute_33,
  isAbsolute as isAbsolute_34,
  isAbsolute as isAbsolute_35,
  isAbsolute as isAbsolute_36,
  isAbsolute as isAbsolute_37,
  isAbsolute as isAbsolute_38,
  isAbsolute as isAbsolute_39,
  isAbsolute as isAbsolute_40,
  isAbsolute as isAbsolute_42,
  isAbsolute as isAbsolute_43,
  isAbsolute as isAbsolute_44,
  isAbsolute as isAbsolute_45,
  isAbsolute as isAbsolute_46,
  isAbsolute as isAbsolute_47,
  isAbsolute as isAbsolute_48,
  isAbsolute as isAbsolute_49,
  isAbsolute as isAbsolute_50,
  isAbsolute as isAbsolute_51,
  isAbsolute as isAbsolute_52,
  isAbsolute as isAbsolute_53,
  isAbsolute as isAbsolute_54,
  isAbsolute as isAbsolute_55,
  isAbsolute as isAbsolute_56,
  isAbsolute as isAbsolute_57,
  sep,
  sep as sep_2,
  sep as sep_3,
  sep as sep_4,
  sep as sep_5,
  sep as sep_6,
  sep as sep_7,
  sep as sep_8,
  sep as sep_9,
  sep as sep_10,
  sep as sep_11,
  sep as sep_12,
  sep as sep_13,
  sep as sep_14,
  sep as sep_15,
  sep as sep_16,
  sep as sep_17,
  sep as sep_18,
  sep as sep_19,
  sep as sep_20,
  sep as sep_21,
  sep as sep_22,
  sep as sep_23,
  sep as sep_24,
  sep as sep_25,
  sep as sep_26,
  sep as sep_27,
  sep as sep_28,
  sep as sep_29,
  sep as sep_30,
  sep as sep_31,
  sep as sep_32,
  sep as sep_33,
  sep as sep_34,
  sep as sep_35,
  sep as sep_36,
  sep as sep_37,
  sep as sep_38,
  sep as sep_39,
  sep as sep_40,
  sep as sep_41,
  sep as sep_42,
  sep as sep_43,
  sep as sep_44,
  sep as sep_45,
  sep as sep_46,
  sep as sep_47,
  sep as sep_48,
  sep as sep_49,
  sep as sep_50,
  sep as sep_51,
  sep as sep_52,
  sep as sep_53,
  sep as sep_54,
  sep as sep_55,
  sep as sep_56,
  sep as sep_57,
  sep as sep_58,
  sep as sep_59,
  sep as sep_60,
  sep as sep_61,
  sep as sep_62,
  sep as sep_63,
  sep as sep_64,
  sep as sep_65,
  sep as sep_66,
  sep as sep_67,
  sep as sep_68,
  sep as sep_69,
  sep as sep_70,
  sep as sep_71,
  sep as sep_72,
  sep as sep_73,
} from "path";
import {
  realpath,
  realpath as realpath_2,
  realpath as realpath_3,
  realpath as realpath_4,
  realpath as realpath_5,
  realpath as realpath_6,
  realpath as realpath_7,
  realpath as realpath_8,
  realpath as realpath_9,
  realpath as realpath_10,
  realpath as realpath_11,
  realpath as realpath_12,
  realpath as realpath_13,
  realpath as realpath_14,
  realpath as realpath_15,
  realpath as realpath_16,
  realpath as realpath_17,
  realpath as realpath_18,
  realpath as realpath_19,
  realpath as realpath_20,
  realpath as realpath_21,
  realpath as realpath_22,
  realpath as realpath_23,
  realpath as realpath_24,
  realpath as realpath_25,
  realpath as realpath_26,
  realpath as realpath_27,
  realpath as realpath_28,
  realpath as realpath_29,
  realpath as realpath_30,
  realpath as realpath_31,
  realpath as realpath_32,
  realpath as realpath_33,
  realpath as realpath_34,
  realpath as realpath_35,
  realpath as realpath_36,
  realpath as realpath_37,
  realpath as realpath_38,
} from "fs/promises";
import { subprocessEnv } from "../../subprocessEnv.js";
import { findGitRootUncached, findCanonicalGitRootUncached } from "../../git.js";
import { getSettingsFilePathForSource } from "../../settings/settings.js";
import { collectSettingsWriteRoots, dSe, collectBaseReachRoots } from "../../git/builderGit/sandboxReach.js";
import { deviceHooksProcessMemories } from "../deviceHooks/cloudRegistration.js";
import { getRootSession } from "../../../bootstrap/state.js";
import { SETTING_SOURCES } from "../../settings/constants.js";
import { POSIX_SEP } from "../hookCommandAnalysis.js";
import { getPlatform } from "../../platform.js";
import { stickyRootsFor, collectStickyRoots } from "../../settings/stickyRoots.js";
import { M3n } from "../hookCommandResolution.js";
import { getAppliedGlobalConfigEnv } from "../../managedEnvApply.js";
import { createProjectHookPinsState } from "./hookPins.js";
import { isStorageV5Enabled } from "../../hoverRest.js";
import { PathSpace, isHostFileError, unwrapHostFileError } from "../../resultError.js";
import { getFsImplementation } from "../../fsOperations.js";

//@ chunk-e6aww6q8.js:918322-918365 placement
function z0(e, n) {
  e.onUnavailable(n);
  return;
}
//@ chunk-e6aww6q8.js:918453-918735 placement
function hostPathDeps(e, n) {
  return {
    childEnv: subprocessEnv,
    realpath: async (r) => {
      let s = await realpathViaHostFiles(r, n);
      return isAbsolute_16(s) ? s : r;
    },
    gitRoot: findGitRootUncached,
    canonicalGitRoot: findCanonicalGitRootUncached,
    scopeSettingsFile: (r) => getSettingsFilePathForSource(r) ?? null,
    scopeWriteEntries: (r) => collectSettingsWriteRoots(r, e),
    scopeRoots: (r, s) => dSe(e, r, s),
    commonRoots: () => collectBaseReachRoots(e),
    deviceHooksMemory: deviceHooksProcessMemories.of(getRootSession().host),
  };
}
/**
 * 计算设备钩子的可达范围：收集启动目录、项目目录、git 根、各设置源的可写条目与公共根，解析真实路径，返回供判定"命令/路径是否在云会话可写范围内"的状态。
 */
//@ chunk-e6aww6q8.js:918735-919824 placement
function r4s(
  { launchDir: launchDir, projectDir: projectDir, originalCwd: originalCwd },
  s = hostPathDeps(launchDir),
) {
  let h = new Set(),
    y = new Set(),
    S = new Map(),
    w = new Map(SETTING_SOURCES.map((Ae) => [Ae, s.scopeWriteEntries(Ae)])),
    commonRoots = s.commonRoots(),
    G = new Set(),
    filtered = [launchDir, projectDir, originalCwd === launchDir ? void 0 : originalCwd].filter(
      (Ae) => Ae !== void 0,
    ),
    Z = (Ae) =>
      s.realpath(Ae).catch((Ie) => {
        if (Ie instanceof HostPathRefused) G.add(POSIX_SEP);
        throw Ie;
      }),
    Se = async () => {
      let mapped = [s.gitRoot(launchDir), s.canonicalGitRoot(launchDir)]
        .filter((Ie) => Ie !== null)
        .map((Ie) => (getPlatform() === "windows" ? Ie.replace(/\//g, "\\") : Ie));
      for (let Ie of [...filtered, ...mapped])
        (G.add(Ie),
          await Z(Ie).then(
            (Me) => {
              if (isAbsolute_16(Me)) G.add(Me);
            },
            () => {},
          ));
      return stickyRootsFor({ launchDir: launchDir, launchDirReal: launchDir, extra: [...G] });
    },
    ke = { ...s.childEnv() },
    we = M3n(s.deviceHooksMemory, getAppliedGlobalConfigEnv()),
    Ee = createProjectHookPinsState({ projectDir: projectDir, launchDir: launchDir, envAtAttach: ke });
  return {
    launchDir: launchDir,
    projectDir: projectDir,
    envAtAttach: ke,
    legacyEnvAtAttach: we,
    distrustedSources: new Set(),
    ...(Ee !== void 0 && { projectHooks: Ee }),
    async current() {
      let Ae = async () =>
          collectStickyRoots({
            stickyRoots: h,
            pinnedScopes: y,
            pinnedRoots: S,
            baseRoots: await Se(),
            reachBaseline: w,
            scopeSettingsFile: s.scopeSettingsFile,
            realpath: Z,
            commonRoots: () => commonRoots,
            scopeRoots: s.scopeRoots,
          }),
        Ie = await Ae();
      return G.has(POSIX_SEP) && !Ie.includes(POSIX_SEP) ? Ae() : Ie;
    },
  };
}
/**
 * 经宿主文件接口求真实路径（存储 V5 时），否则走本地实现。
 */
//@ chunk-e6aww6q8.js:919824-920173 placement
async function realpathViaHostFiles(e, n) {
  if (isStorageV5Enabled() && n !== void 0) {
    let r = hostPathSpace(e);
    if (r !== "store") {
      let realPath = await n.hostFiles.realPath(
        PathSpace[r](isAbsolute_16(e) ? e : p1e(getFsImplementation().cwd(), e)),
        { native: !0 },
      );
      if (realPath.ok && realPath.value.found) return realPath.value.path;
      if (realPath.ok) throw Object.assign(Error("ENOENT: no such file or directory"), { code: "ENOENT" });
      if (!isHostFileError(realPath.error)) throw new HostPathRefused();
      throw unwrapHostFileError(realPath.error);
    }
  }
  return realpath_13(e);
}
//@ chunk-e6aww6q8.js:920173-920226 placement
function p1e(e, n) {
  return e.endsWith(sep_25) ? e + n : e + sep_25 + n;
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

export { p1e, r4s, z0 };
