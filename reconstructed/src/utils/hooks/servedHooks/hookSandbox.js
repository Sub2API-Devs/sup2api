/**
 * utils/hooks/servedHooks/hookSandbox.ts
 *
 * 2.1.316 新增：项目钩子沙箱（bwrap/sandbox-exec）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (52)
 * attribution: placement 52
 */
import { lstat, readFile, realpath, open, mkdtemp, writeFile, unlink, rm as rm_2, rmdir } from "fs/promises";
import { isAbsolute, dirname, basename, join } from "path";
import { constants } from "fs";
import { userInfo, tmpdir as tmpdir_2 } from "os";
import { execFileNoThrow } from "../../execFileNoThrow.js";
import {
  getDefaultWritePaths,
  removeTrailingGlobSuffix,
} from "../../../../vendor/@anthropic-ai/sandbox-runtime/dist/sandbox/sandbox-utils.js";
import { getPlatform } from "../../platform.js";
import { getLatchedPreSettingsEnvSnapshot } from "../../managedEnvApply.js";
import { checkScriptFile, isSameCommandPath } from "../hookCommandAnalysis.js";
import { getErrnoCode, errorMessage } from "../../errors.js";
import { logForDebugging } from "../../debug.js";
import { shellQuoteArgs } from "../../bash/bashPipeCommand.js";
import { tmpdir, claudeTempDir } from "../../tempDir.js";
import {
  getFeatureValueWithSource_CACHED_MAY_BE_STALE,
  getFeatureValue_CACHED_MAY_BE_STALE,
} from "../../../services/analytics/growthbook.js";
import { logError } from "../../log.js";
import { isViolinWoodEnabledCached } from "../../../services/analytics/violinGates.js";
import { createRealpathCache as createRealpathCache_2 } from "../../permissions/claudeStatePaths.js";
import {
  SandboxManager,
  getEffectiveFilesystemPolicy,
  isFilesystemIsolationDisabledBySetting,
} from "../../sandbox/sandbox-adapter.js";
import { secondRootMounts } from "../../wslMounts.js";
import { getFsImplementation, getPathsForPermissionCheck } from "../../fsOperations.js";
import { isPathWithinCaseAware, isSameOrUnderPath, isPathUnder as isPathUnder_2 } from "../../pathPrefix.js";
import { normalizeCaseForComparison } from "../../permissions/filesystem.js";
import { APPLY_SECCOMP_FD, seccompExecPlan } from "../../sandbox/linuxSandboxExec.js";
import {
  capabilityArgs,
  processHasBoundingCapability,
  CAP_SETFCAP,
} from "../../../../vendor/@anthropic-ai/sandbox-runtime/dist/sandbox/linux-sandbox-utils.js";
import { uniq } from "../../collections.js";
import { identity as identity_2 } from "../../identity.js";
import { resolveProgramOnPathInReach } from "../hookCommandResolution.js";
import { B6r } from "../../../../vendor/@anthropic-ai/sandbox-runtime/dist/sandbox/generate-seccomp-filter.js";
import { anyPairMatches } from "../../settings/stickyRoots.js";
import { weakensSandboxIsolation } from "../../../remote/tools/servedCallLog.js";
import { permissionRuleValueFromString } from "../../permissions/permissionRuleParser.js";
import { FILE_READ_TOOL_NAME } from "../../../tools/FileReadTool/constants.js";
import { SETTING_SOURCES } from "../../settings/constants.js";
import { getSettingsForSourceTightenOnly } from "../../settings/settings.js";
import { wrapCommandWithSandboxMacOS } from "../../../../vendor/@anthropic-ai/sandbox-runtime/dist/sandbox/macos-sandbox-utils.js";
import { quote } from "../../../../vendor/@anthropic-ai/sandbox-runtime/dist/utils/shell-quote.js";

//@ chunk-e6aww6q8.js:887497-887526 placement
var GROUP_WRITE_BIT = 18;
var STICKY_BIT = 512;
var NOBODY_UID = 65534;
//@ chunk-e6aww6q8.js:887526-887665 placement
function privateDirFingerprint(e, n) {
  return n.statNoFollow(e).then(
    (r) => (r.isDirectory() && r.uid === n.uid && (r.mode & 511) === 448 ? `${r.dev}:${r.ino}` : null),
    () => null,
  );
}
//@ chunk-e6aww6q8.js:887665-887884 placement
function createTmpBaseCheck(e) {
  return {
    held: async (n) => {
      try {
        let r = await e.statNoFollow(n);
        return (
          ((r.mode & GROUP_WRITE_BIT) === 0 || (r.mode & STICKY_BIT) !== 0) &&
          (r.uid === 0 || r.uid === e.uid || r.uid === (await e.overflowUid()))
        );
      } catch {
        return true;
      }
    },
    fingerprint: (n) => privateDirFingerprint(n, e),
  };
}
//@ chunk-e6aww6q8.js:887884-888062 placement
function defaultTmpBaseCheck() {
  return createTmpBaseCheck({
    uid: process.getuid?.() ?? -1,
    statNoFollow: lstat,
    overflowUid: () =>
      readFile("/proc/sys/kernel/overflowuid", "utf8").then(
        (file) => Number.parseInt(file, 10) || NOBODY_UID,
        () => NOBODY_UID,
      ),
  });
}
//@ chunk-e6aww6q8.js:888062-888326 placement
function fallbackTmpBaseCandidates(platform, n, latchedPreSettingsEnvSnapshot) {
  let replaced = latchedPreSettingsEnvSnapshot?.TMPDIR?.replace(/\/+$/, "");
  let h =
    platform !== "macos"
      ? [
          {
            label: "runtime",
            path: `/run/user/${n}`,
            walkAncestors: false,
          },
        ]
      : replaced !== undefined && isAbsolute(replaced)
        ? [
            {
              label: "start_tmpdir",
              path: replaced,
              walkAncestors: true,
            },
          ]
        : [];
  return [
    {
      label: "var_tmp",
      path: "/var/tmp",
      walkAncestors: false,
    },
    ...h,
  ];
}
//@ chunk-e6aww6q8.js:888326-888944 placement
/**
 * 检查备用临时目录各级父目录的属主与链接情况，确认可安全作为沙箱临时根。
 */
async function vetFallbackTmpBases(e, fs) {
  let r = async (y, S) => {
    for (let w = y, L = ""; w !== L; L = w, w = dirname(w)) {
      let G = await fs.statNoFollow(w);
      if (
        (G.uid !== 0 && G.uid !== fs.uid) ||
        (G.isSymbolicLink()
          ? !S
          : !G.isDirectory() || ((G.mode & GROUP_WRITE_BIT) !== 0 && !(S && (G.mode & STICKY_BIT) !== 0)))
      )
        return false;
    }
    return true;
  };
  let fingerprint = (y) => privateDirFingerprint(y, fs);
  let h = [];
  for (let { label, path, walkAncestors } of e)
    try {
      if (walkAncestors && !(await r(path, true))) continue;
      let L = await fs.realpath(path);
      let G = await fs.statNoFollow(L);
      if (
        G.isDirectory() &&
        ((G.uid === fs.uid && (G.mode & GROUP_WRITE_BIT) === 0) ||
          (G.uid === 0 && (G.mode & STICKY_BIT) !== 0)) &&
        (!walkAncestors || (await r(dirname(L), true)))
      )
        h.push({
          label,
          real: L,
          canExecute: fs.canExecute,
          fingerprint,
          closedAbove: () => r(L, false).catch(() => false),
        });
    } catch {}
  return h;
}
//@ chunk-e6aww6q8.js:888944-889185 placement
function sandboxProbeDepsForUid(uid) {
  return {
    uid,
    realpath,
    statNoFollow: lstat,
    canExecute: async (n) =>
      (
        await execFileNoThrow(n, [], {
          env: {
            USER_TYPE: "external",
            NODE_ENV: "production",
          },
          extendEnv: false,
          timeout: 5000,
          useCwd: false,
          stdin: "ignore",
          stdout: "ignore",
          stderr: "ignore",
        })
      ).code === 0,
  };
}
//@ chunk-e6aww6q8.js:889185-889235 placement
function canApplyBackend() {
  try {
    getDefaultWritePaths();
    return true;
  } catch {
    return false;
  }
}
//@ chunk-e6aww6q8.js:889235-889350 placement
async function getFallbackTmpBases(e = canApplyBackend) {
  let uid = process.getuid?.();
  if (uid === undefined || !e()) return [];
  return vetFallbackTmpBases(
    fallbackTmpBaseCandidates(getPlatform(), uid, getLatchedPreSettingsEnvSnapshot()),
    sandboxProbeDepsForUid(uid),
  );
}
//@ chunk-e6aww6q8.js:889350-889740 placement
/**
 * 校验固定的脚本：真实路径未变、内容摘要一致，否则返回原因。
 */
async function verifyPinnedScript(e, n) {
  let r;
  try {
    r = await n.realpath(e.path);
  } catch {
    return {
      ok: false,
      reason: "unreadable",
    };
  }
  if (r !== e.realPath)
    return {
      ok: false,
      reason: "relocated",
      realPath: r,
    };
  let s = await checkScriptFile(r, {
    open: n.openNoFollow,
  });
  if (!s.ok)
    return {
      ok: false,
      reason: s.reason,
      realPath: r,
    };
  return s.sha256 === e.sha256
    ? {
        ok: true,
        bytes: s.bytes,
        realPath: r,
      }
    : {
        ok: false,
        reason: "changed",
        realPath: r,
        current: {
          sha256: s.sha256,
          bytes: s.bytes,
        },
      };
}
//@ chunk-e6aww6q8.js:889740-889881 placement
var CLAUDE_DEVICE_HOOKS = "claude-device-hooks-";
var DEVICE_HOOK_STAGING_PREFIX = "run+";
var EXECUTE_PROBE_DIRNAME = "execute+probe";
var buffer_3 = Buffer.from(`#!/bin/sh
exit 0
`);
var RESOURCE_EXHAUSTION_ERRNOS = new Set(["EMFILE", "ENFILE", "ENOMEM"]);
//@ chunk-e6aww6q8.js:889881-889922 placement
function isResourceExhaustionErrno(error) {
  return RESOURCE_EXHAUSTION_ERRNOS.has(getErrnoCode(error) ?? "");
}
//@ chunk-e6aww6q8.js:889922-890025 placement
function safeScriptFileName(e) {
  let replaced = basename(e).replace(/[^A-Za-z0-9._-]/g, "_");
  return replaced === "" || replaced === "." || replaced === ".." ? "hook" : replaced;
}
//@ chunk-e6aww6q8.js:890025-894397 placement
/**
 * 暂存设备钩子：把校验过的钩子副本放到只有本人可写的目录。
 */
function stageDeviceHooks(e, n) {
  let r = null;
  let s = new Map();
  let h = [];
  let y = new Set();
  let S = new Set();
  let w = false;
  let L = 0;
  let G = false;
  let q = (Ie) => n().some((Me) => Ie.some((We) => isSameCommandPath(We, Me)));
  let Z = (Ie, Me = Ie) => (q([Ie, Me]) ? e.rmdir(Ie) : e.rm(Ie)).catch(() => {});
  let Se = (real) => {
    if (G) Z(real);
    else y.add(real);
  };
  let ke = (Ie, Me) => {
    if (y.has(Ie)) return;
    logForDebugging(
      `[deviceHooks] a fallback folder closed to other users is given up (${Me}): verified hook copies are kept in the order used before`,
    );
    w = true;
    Se(Ie);
    let We = r;
    r = null;
    s.clear();
    We?.then(
      ({ real }) => Se(real),
      () => {},
    );
  };
  let we = () => {
    if (G) return Promise.reject(Error("device hook staging is disposed"));
    return (r ??= (async () => {
      let Ie = async (Et) => {
        if (q([Et.real])) return null;
        let yt = await e.mkdtemp(join(Et.real, CLAUDE_DEVICE_HOOKS)).catch(() => null);
        if (yt === null) return null;
        let gt = await e.realpath(yt).catch(() => null);
        let At = null;
        if (gt !== null && dirname(gt) === Et.real && !q([gt, yt])) {
          let It = join(gt, EXECUTE_PROBE_DIRNAME);
          let Yt = await e
            .writeFileExclusive(It, buffer_3, 448)
            .then(() => Et.canExecute(It))
            .catch(() => false);
          await e.unlink(It).catch(() => {});
          At = Yt ? await Et.fingerprint(gt) : null;
          if (!Yt)
            logForDebugging(
              `[deviceHooks] a file under the ${Et.label} fallback folder did not run (mounted noexec?): verified hook copies are not kept there`,
            );
        }
        if (gt === null || At === null) {
          await Z(yt, gt ?? yt);
          return null;
        }
        logForDebugging(`[deviceHooks] verified hook copies are kept under the ${Et.label} fallback folder`);
        return {
          real: gt,
          created: yt,
          stillOurs: async () => (await Et.fingerprint(gt)) === At,
        };
      };
      let Me = await e.fallbackBases().catch(() => []);
      let We = [];
      for (let Et of Me) if (await Et.closedAbove()) We.push(Et);
      h = We.map((Et) => Et.real);
      let ze = new Set();
      for (let Et of We) {
        if (w) break;
        ze.add(Et);
        let yt = await Ie(Et);
        if (yt !== null && w) await Z(yt.real, yt.created);
        else if (yt !== null) {
          S.add(yt.real);
          return yt;
        }
      }
      let lt = Error("no private directory for verified hook copies on this machine");
      let Je = await e.mkdtemp(join(e.tmpBase(), CLAUDE_DEVICE_HOOKS)).catch((error) => {
        if (isResourceExhaustionErrno(error)) throw error;
        lt = error;
        return null;
      });
      let nt = null;
      if (Je !== null) {
        let Et = await e.realpath(Je);
        if (q([Et, Je])) await Z(Et, Je);
        else
          nt = {
            real: Et,
            created: Je,
          };
      }
      let pt = async (Et) => ({
        ...Et,
        stillOurs:
          (await e.tmpBaseCheck.fingerprint(Et.real)) === null
            ? null
            : async () => (await e.tmpBaseCheck.fingerprint(Et.real)) !== null,
      });
      if (nt !== null && (await e.tmpBaseCheck.held(dirname(nt.real)))) return pt(nt);
      for (let Et of Me) {
        let yt = ze.has(Et) ? null : await Ie(Et);
        if (yt !== null) {
          if (nt !== null) await Z(nt.real, nt.created);
          return yt;
        }
      }
      if (nt !== null) {
        logForDebugging(
          "[deviceHooks] verified hook copies are kept under a temp folder that other users can write: no fallback folder qualified",
          {
            level: "warn",
          },
        );
        return pt(nt);
      }
      throw lt;
    })().catch((error) => {
      r = null;
      throw error;
    }));
  };
  let Ee = async () => {
    for (let Ie = false, Me = 0; ; Me += 1) {
      let We = we();
      let { real, created, stillOurs } = await We;
      let nt = S.has(real);
      if (q([real, created]))
        throw Error("the directory for verified hook copies is now where the cloud session can write");
      if (stillOurs === null || (await stillOurs())) return real;
      if (r === We) {
        r = null;
        s.clear();
      }
      if (nt && Ie && Me < 8) {
        ke(real, "its directories do not read as the ones just made");
        continue;
      }
      if (nt) Se(real);
      else w = false;
      if (Ie) throw Error("the directory for verified hook copies is no longer the one this process made");
      Ie = true;
    }
  };
  let Ae = async (Ie) => {
    let Me = await Ee();
    try {
      return await Ie(Me);
    } catch (error) {
      if (!S.has(Me) || isResourceExhaustionErrno(error) || q([Me])) throw error;
      ke(Me, "it could not be written");
      return Ie(await Ee());
    }
  };
  return {
    async stage(Ie, Me, We) {
      let ze = await Ae(async (Je) => {
        L += 1;
        let nt = join(Je, `${Ie.slice(0, 16)}-${L}-${safeScriptFileName(We)}`);
        await e.writeFileExclusive(nt, Me, 448);
        return nt;
      });
      let lt = false;
      return {
        path: ze,
        async release() {
          if (lt) return;
          lt = true;
          await e.unlink(ze).catch(() => {});
        },
      };
    },
    async runDirectory() {
      let Ie = (We) => {
        if (isResourceExhaustionErrno(We)) throw We;
        return null;
      };
      let Me = async (We, ze, lt) => {
        let Je = await e.mkdtemp(join(We, ze)).catch(Ie);
        if (Je === null) return null;
        let nt = await e.realpath(Je).catch(Ie);
        if (nt === null || q([nt, Je]) || (lt && dirname(nt) !== We)) {
          await Z(Je, nt ?? Je);
          return null;
        }
        if (lt) y.add(nt);
        return {
          path: nt,
          release: async () => {
            y.delete(nt);
            await Z(nt, Je);
          },
        };
      };
      return Ae(async (We) => {
        for (let lt of h) {
          let Je = q([lt]) ? null : await Me(lt, CLAUDE_DEVICE_HOOKS + DEVICE_HOOK_STAGING_PREFIX, true);
          if (Je !== null) return Je;
        }
        let ze = await Me(We, DEVICE_HOOK_STAGING_PREFIX, false);
        if (ze === null) throw Error("no private directory for a forwarded hook to start in on this machine");
        return ze;
      });
    },
    async placeholder(Ie) {
      return Ae((Me) => {
        let We = join(Me, safeScriptFileName(Ie));
        let ze = s.get(We);
        if (ze === undefined) {
          ze = e
            .writeFileExclusive(We, Buffer.alloc(0), 384)
            .then(() => We)
            .catch((error) => {
              s.delete(We);
              throw error;
            });
          s.set(We, ze);
        }
        return ze;
      });
    },
    async dispose() {
      G = true;
      let Ie = r;
      r = null;
      s.clear();
      let Me = [...y];
      y.clear();
      await Promise.all(Me.map((ze) => Z(ze)));
      if (Ie === null) return;
      let We = await Ie.catch(() => null);
      if (We !== null) await Z(We.real, We.created);
    },
  };
}
//@ chunk-e6aww6q8.js:894397-894619 placement
function replaceCommandProgram(e, site, r) {
  switch (site.form) {
    case "shell":
      return {
        ...e,
        command: e.command.slice(0, site.start) + shellQuoteArgs([r]) + e.command.slice(site.end),
      };
    case "exec":
      return site.slot === "command"
        ? {
            ...e,
            command: r,
          }
        : {
            ...e,
            args: [r, ...(e.args ?? []).slice(1)],
          };
  }
}
//@ chunk-e6aww6q8.js:894619-894733 placement
function scriptFileReaderDeps() {
  return {
    realpath,
    openNoFollow: (e) => open(e, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK),
    lstat,
  };
}
//@ chunk-e6aww6q8.js:894733-894945 placement
function stagingFsDeps() {
  return {
    tmpBase: tmpdir,
    tmpBaseCheck: defaultTmpBaseCheck(),
    fallbackBases: getFallbackTmpBases,
    mkdtemp,
    realpath,
    writeFileExclusive: (e, n, mode) =>
      writeFile(e, n, {
        mode,
        flag: "wx",
      }),
    unlink,
    rm: (e) =>
      rm_2(e, {
        recursive: true,
        force: true,
      }),
    rmdir,
  };
}
//@ chunk-e6aww6q8.js:894945-895131 placement
/**
 * 判断 tengu_violin_overstand 开关是否显式开启（非 override 来源）。
 */
function isViolinOverstandOn() {
  try {
    let { value: e, source } = getFeatureValueWithSource_CACHED_MAY_BE_STALE("tengu_violin_overstand", false);
    return e === true && source !== "override";
  } catch (error) {
    logError(
      Error("tengu_violin_overstand could not be read", {
        cause: error,
      }),
    );
    return false;
  }
}
//@ chunk-e6aww6q8.js:895131-895158 placement
var TENGU_VIOLIN_PEG = "tengu_violin_peg";
//@ chunk-e6aww6q8.js:895158-895215 placement
/**
 * 判断 tengu_violin_peg 开关是否开启（依赖 violin 总开关）。
 */
function isViolinPegOn() {
  try {
    return isViolinWoodEnabledCached() && getFeatureValue_CACHED_MAY_BE_STALE(TENGU_VIOLIN_PEG, false);
  } catch {
    return false;
  }
}
//@ chunk-e6aww6q8.js:895256-895284 placement
var TENGU_VIOLIN_HEEL = "tengu_violin_heel";
//@ chunk-e6aww6q8.js:895284-895388 placement
function isLinuxHookSandboxEnabled() {
  try {
    let { value: e, source } = getFeatureValueWithSource_CACHED_MAY_BE_STALE(TENGU_VIOLIN_HEEL, false);
    return e === true && source !== "override" && isViolinPegOn();
  } catch {
    return false;
  }
}
//@ chunk-e6aww6q8.js:895388-895418 placement
var TENGU_VIOLIN_SADDLE = "tengu_violin_saddle";
//@ chunk-e6aww6q8.js:895418-895522 placement
function isPersonSandboxHookEnabled() {
  try {
    let { value: e, source } = getFeatureValueWithSource_CACHED_MAY_BE_STALE(TENGU_VIOLIN_SADDLE, false);
    return e === true && source !== "override" && isViolinPegOn();
  } catch {
    return false;
  }
}
//@ chunk-e6aww6q8.js:895552-895591 placement
/**
 * 严格模式的 realpath 缓存（出错不记录）。
 */
function strictRealpathCache() {
  return createRealpathCache_2(cautiousPathDeps(() => {}));
}
//@ chunk-e6aww6q8.js:895591-895660 placement
function cautiousPathCache() {
  let vouched = true;
  return {
    paths: createRealpathCache_2(
      cautiousPathDeps(() => {
        vouched = false;
      }),
    ),
    vouched,
  };
}
//@ chunk-e6aww6q8.js:895660-895802 placement
/**
 * 判断严格沙箱是否已完整配置（文件系统策略为 strict 且无放行目录）。
 */
function isStrictSandboxFullyConfigured() {
  let filesystem = SandboxManager.getConfig()?.filesystem;
  if (
    filesystem === undefined ||
    filesystem.disabled === true ||
    getEffectiveFilesystemPolicy() !== "strict" ||
    secondRootMounts().length > 0
  )
    return false;
  return cautiousPathCache().vouched;
}
//@ chunk-e6aww6q8.js:895802-896296 placement
/**
 * 构造只在文件存在时返回真实路径的辅助对象，遇到团队目录内错误时忽略。
 */
function cautiousPathDeps(e) {
  return {
    realpathIfExists(n) {
      try {
        getFsImplementation().statSync(n);
      } catch (error) {
        if (isRealPathWithinTeamDir(error)) return;
        e();
        return n;
      }
      return getPathsForPermissionCheck(n).at(-1) ?? n;
    },
    namesIn(n) {
      let r;
      try {
        r = getFsImplementation().readdirSync(n);
      } catch (error) {
        if (!isRealPathWithinTeamDir(error)) e();
        return;
      }
      return r.flatMap((s) => {
        if (s.isFile() || s.isDirectory()) return [s.name];
        if (s.isSymbolicLink() || s.isFIFO() || s.isSocket() || s.isBlockDevice() || s.isCharacterDevice())
          return [];
        try {
          let h = getFsImplementation().lstatSync(join(n, s.name));
          return h.isFile() || h.isDirectory() ? [s.name] : [];
        } catch (error) {
          if (!isRealPathWithinTeamDir(error)) e();
          return [];
        }
      });
    },
  };
}
//@ chunk-e6aww6q8.js:896296-896358 placement = isRealPathWithinTeamDir (1)
function isRealPathWithinTeamDir(realCandidate) {
  let code = getErrnoCode(realCandidate);
  return code === "ENOENT" || code === "ENOTDIR";
}
//@ chunk-e6aww6q8.js:896517-896933 placement
/**
 * 沙箱使用的 shell 及默认可读的系统目录列表。
 */
var SANDBOX_SHELL = "/bin/sh";
var SYSTEM_READONLY_PATHS = [
  ...["/usr", "/usr/local"].flatMap((e) =>
    ["bin", "sbin", "lib", "lib32", "lib64", "libx32", "libexec", "share"].map((n) => `${e}/${n}`),
  ),
  "/bin",
  "/sbin",
  "/lib",
  "/lib32",
  "/lib64",
  "/libx32",
  "/etc/alternatives",
  "/etc/ld.so.cache",
  "/etc/ld.so.conf",
  "/etc/ld.so.conf.d",
  "/etc/passwd",
  "/etc/group",
  "/etc/nsswitch.conf",
  "/etc/localtime",
];
var SYSTEM_REAL_PREFIXES = ["/usr", "/bin", "/sbin", "/lib", "/lib32", "/lib64", "/libx32"];
var MIN_BWRAP_VERSION = "0.10.0";
//@ chunk-e6aww6q8.js:896933-897052 placement
function parseVersionNumber(e) {
  let match = /(\d+)\.(\d+)\.(\d+)/.exec(e);
  return match === null ? -1 : Number(match[1]) * 1e6 + Number(match[2]) * 1000 + Number(match[3]);
}
//@ chunk-e6aww6q8.js:897052-897131 placement
/**
 * 归一化大小写与 NFKC 后判断两路径是否相同或包含。
 */
function isPathWithinNormalizedCase(e, n) {
  return isPathWithinCaseAware(
    normalizeCaseForComparison(e.normalize("NFKC")),
    normalizeCaseForComparison(n.normalize("NFKC")),
    false,
  );
}
//@ chunk-e6aww6q8.js:897131-897355 placement
var SECCOMP_HELPER_PATH = "/run/claude-hook/apply-seccomp";
var FIRST_ROOT_FD = APPLY_SECCOMP_FD + 1;
var CLOSE_INHERITED_FDS_PREFIX = 9;
var MAX_SANDBOX_ROOTS = CLOSE_INHERITED_FDS_PREFIX - FIRST_ROOT_FD;
var OOM_SCORE_ADJ_PREFIX = "echo 1000 > /proc/self/oom_score_adj || exit 126; ";
var CLOSE_INHERITED_FDS_PREFIX_2 = `command exec ${Array.from(
  {
    length: CLOSE_INHERITED_FDS_PREFIX - APPLY_SECCOMP_FD + 1,
  },
  (e, n) => `${APPLY_SECCOMP_FD + n}<&-`,
).join(" ")} || exit 126; `;
//@ chunk-e6aww6q8.js:897355-897503 placement
function sandboxRootFdBindings(e) {
  return [
    ...e.roots.map((root) => ({
      real: root.real,
      flag: "--ro-bind-fd",
    })),
    {
      real: e.privateTmp,
      flag: "--bind-fd",
    },
  ].map((n, r) => ({
    ...n,
    fd: FIRST_ROOT_FD + r,
  }));
}
//@ chunk-e6aww6q8.js:897503-898148 placement
/**
 * 为沙箱化的钩子构造 bwrap 参数（新会话、独立命名空间等）。
 */
function buildBwrapArgs(options, n) {
  return [
    "--new-session",
    "--die-with-parent",
    "--unshare-user",
    "--unshare-pid",
    "--unshare-net",
    "--unshare-ipc",
    "--unshare-uts",
    "--unshare-cgroup-try",
    "--hostname",
    "localhost",
    ...n,
    ...options.system.flatMap((r) => ["--ro-bind-try", r.real, r.at]),
    ...options.homes.flatMap((home) => ["--tmpfs", home]),
    ...sandboxRootFdBindings(options).flatMap((r) => [r.flag, String(r.fd), r.real]),
    ...options.roots.flatMap((root) => root.alsoAt.flatMap((s) => ["--symlink", root.real, s])),
    ...(options.seccomp.kind === "file"
      ? ["--ro-bind", options.seccomp.path, SECCOMP_HELPER_PATH]
      : ["--setenv", "ARGV0", options.seccomp.argv0]),
    "--proc",
    "/proc",
    "--dev",
    "/dev",
    "--remount-ro",
    "/dev",
    ...options.homes.flatMap((home) => ["--remount-ro", home]),
    "--remount-ro",
    "/",
    "--chdir",
    options.cwd,
  ];
}
//@ chunk-e6aww6q8.js:898148-898657 placement
/**
 * 生成在 bubblewrap 中运行项目钩子的 shell 命令：调整 oom_score_adj，用文件描述符只读绑定各根目录（校验 fd 指向的真实路径）并可写绑定私有 tmp，关闭继承的 fd，经 seccomp 辅助程序执行 /bin/sh -c。
 */
function buildBwrapHookCommand(e, options) {
  let r = process.geteuid?.();
  let bwrapArgs = buildBwrapArgs(
    options,
    capabilityArgs({
      euid: r,
      hasSetfcap: r === 0 && processHasBoundingCapability(CAP_SETFCAP),
      usesSeccompHelper: true,
    }),
  );
  let h = (w, L) => `command exec ${w}<${shellQuoteArgs([L])} || exit 126; `;
  let joined = sandboxRootFdBindings(options)
    .map(
      (w) =>
        `${h(w.fd, w.real)}[ "$(cd /proc/self/fd/${w.fd} && pwd -P)" = ${shellQuoteArgs([w.real])} ] || exit 126; `,
    )
    .join("");
  let S = [SANDBOX_SHELL, "-c", `${CLOSE_INHERITED_FDS_PREFIX_2}${e}`];
  return options.seccomp.kind === "file"
    ? `${OOM_SCORE_ADJ_PREFIX}${joined}exec ${shellQuoteArgs([options.bwrap, ...bwrapArgs, "--", SECCOMP_HELPER_PATH, ...S])}`
    : `${OOM_SCORE_ADJ_PREFIX}${h(APPLY_SECCOMP_FD, `/proc/${process.pid}/exe`)}${joined}exec ${shellQuoteArgs([options.bwrap, ...bwrapArgs, "--", `/proc/self/fd/${APPLY_SECCOMP_FD}`, ...S])}`;
}
//@ chunk-e6aww6q8.js:898657-899158 placement
/**
 * 解析沙箱可达目录与可读目录的真实路径，检查可读目录是否在可达范围内。
 */
async function resolveSandboxRoots(plan) {
  let n = (readableDir) =>
    realpath(readableDir).catch(() => {
      return;
    });
  let r = uniq([
    ...plan.reach,
    ...(await Promise.all(plan.reach.map(n))).flatMap((S) => (S === undefined ? [] : [S])),
  ]);
  let s = new Map();
  for (let readableDir of plan.readableDirs) {
    let w = await n(readableDir);
    if (w === undefined) continue;
    if (!r.some((L) => isSameOrUnderPath(w, L)))
      return {
        unavailable: "root_outside_reach",
      };
    s.set(w, uniq([...(s.get(w) ?? []), readableDir]));
  }
  let h = [...s.keys()];
  let mapped = h
    .filter((S) => !h.some((w) => isPathUnder_2(S, w)))
    .map((S) => ({
      real: S,
      alsoAt: (s.get(S) ?? []).filter((w) => w !== S),
    }));
  return mapped.length > MAX_SANDBOX_ROOTS
    ? {
        unavailable: "too_many_roots",
      }
    : mapped;
}
//@ chunk-e6aww6q8.js:899158-899492 placement
/**
 * 检查沙箱视图是否会泄露：家目录在只读视图内（或视图包含家目录）返回 home_in_view，凭据路径在视图内返回 credentials_in_view。
 */
function sandboxViewLeak(e) {
  let flattened = e.roots.flatMap((root) => [root.real, ...root.alsoAt]);
  let r = uniq([...SYSTEM_READONLY_PATHS, ...e.system.flatMap((s) => [s.real, s.at])]);
  if (
    e.homes.some(
      (home) =>
        !isAbsolute(home) ||
        flattened.some((h) => isPathWithinNormalizedCase(home, h)) ||
        r.some((h) => isPathWithinNormalizedCase(h, home)),
    )
  )
    return "home_in_view";
  if (
    e.credentialPaths.some(
      (credentialPath) =>
        [...r, ...flattened].some((h) => isPathWithinNormalizedCase(credentialPath, h)) ||
        flattened.some((h) => isPathWithinNormalizedCase(h, credentialPath)),
    )
  )
    return "credentials_in_view";
  return;
}
//@ chunk-e6aww6q8.js:899492-900045 placement
/**
 * 解析系统视图候选路径的真实路径。
 */
async function resolveSystemViewPaths(e) {
  let n = (candidate) =>
    realpath(candidate).catch(() => {
      return;
    });
  let results = await Promise.all(
    e.candidates.map(async (candidate) => ({
      at: candidate,
      real: await n(candidate),
    })),
  );
  let s = uniq([
    ...e.reach,
    ...(await Promise.all(e.reach.map(n))).flatMap((y) => (y === undefined ? [] : [y])),
  ]);
  let h = uniq([
    ...e.realPrefixes,
    ...results.flatMap(({ at, real }) => (real === undefined ? [at] : [at, real])),
  ]);
  if (s.some((y) => h.some((S) => isPathWithinNormalizedCase(y, S) || isPathWithinNormalizedCase(S, y))))
    return {
      unavailable: "reach_in_system_view",
    };
  return results.flatMap(({ at, real }) =>
    real !== undefined &&
    (real === at || e.realPrefixes.some((realPrefix) => isSameOrUnderPath(real, realPrefix))) &&
    ![...e.homes, ...e.credentialPaths].some((w) => isPathWithinNormalizedCase(real, w))
      ? [
          {
            real,
            at,
          },
        ]
      : [],
  );
}
//@ chunk-e6aww6q8.js:900045-900110 placement
var PROBE_TIMEOUT_MS = 5000;
var FAILED_PROBE_TTL_MS = 60000;
var PASSED_PROBE_TTL_MS = 600000;
var sandboxProbeCache = identity_2(new Map(), (e) => e.clear());
//@ chunk-e6aww6q8.js:900110-901245 placement
/**
 * 检查当前环境能否为钩子提供沙箱（bwrap、seccomp 等）。
 */
async function checkHookSandboxAvailable(plan) {
  let n = "";
  try {
    n = userInfo().homedir;
  } catch {}
  let r = uniq([plan.home, n].filter((Ee) => Ee !== ""));
  let homes = uniq([...r, ...(await Promise.all(r.map((Ee) => realpath(Ee).catch(() => Ee))))]);
  let sandboxRoots = await resolveSandboxRoots(plan);
  if ("unavailable" in sandboxRoots) return sandboxRoots;
  let credentialPaths = strictRealpathCache();
  let systemViewPaths = await resolveSystemViewPaths({
    candidates: SYSTEM_READONLY_PATHS,
    realPrefixes: SYSTEM_REAL_PREFIXES,
    homes,
    credentialPaths,
    reach: plan.reach,
  });
  if ("unavailable" in systemViewPaths) return systemViewPaths;
  let w = sandboxViewLeak({
    roots: sandboxRoots,
    system: systemViewPaths,
    homes,
    credentialPaths,
  });
  if (w !== undefined)
    return {
      unavailable: w,
    };
  let programOnPathInReach = await resolveProgramOnPathInReach("bwrap", plan.pathValue, plan.reach);
  if (programOnPathInReach === undefined || programOnPathInReach === "in_reach")
    return {
      unavailable: "no_bubblewrap",
    };
  let G = seccompExecPlan();
  let q;
  if (G !== undefined)
    q = {
      kind: "embedded",
      argv0: G.argv0,
    };
  else {
    let Ee = await B6r();
    if (Ee === null || anyPairMatches([Ee, await realpath(Ee).catch(() => Ee)], plan.reach))
      return {
        unavailable: "no_seccomp_stage",
      };
    q = {
      kind: "file",
      path: Ee,
    };
  }
  let Z = `${programOnPathInReach}\x00${q.kind === "file" ? q.path : q.argv0}`;
  let Se = sandboxProbeCache.get(Z);
  let ke = Se;
  if (
    Se === undefined ||
    (Se.passed !== undefined && Date.now() - Se.at >= (Se.passed ? PASSED_PROBE_TTL_MS : FAILED_PROBE_TTL_MS))
  ) {
    let Ee = {
      at: Date.now(),
      outcome: probeBubblewrapVersion({
        bwrap: programOnPathInReach,
        seccomp: q,
        system: systemViewPaths,
        homes,
      }).then((Ae) => {
        Ee.passed = Ae === undefined;
        return Ae;
      }),
    };
    sandboxProbeCache.set(Z, Ee);
    ke = Ee;
  }
  let outcome = await ke?.outcome;
  return outcome === undefined
    ? {
        bwrap: programOnPathInReach,
        seccomp: q,
        roots: sandboxRoots,
        system: systemViewPaths,
        homes,
      }
    : {
        unavailable: outcome,
      };
}
//@ chunk-e6aww6q8.js:901245-902278 placement
/**
 * 探测 bubblewrap 版本，过旧时不在沙箱中运行项目钩子。
 */
async function probeBubblewrapVersion(e) {
  let n = await execFileNoThrow(e.bwrap, ["--version"], {
    timeout: PROBE_TIMEOUT_MS,
    cwd: "/",
    stdin: "ignore",
  });
  if (n.code !== 0 || parseVersionNumber(n.stdout) < parseVersionNumber(MIN_BWRAP_VERSION)) {
    logForDebugging(
      `[remote-tools] a project hook cannot be run in a sandbox on this machine (bubblewrap_too_old): bubblewrap --version does not say ${MIN_BWRAP_VERSION} or later`,
    );
    return "bubblewrap_too_old";
  }
  let r = async (h) =>
    (
      await execFileNoThrow(SANDBOX_SHELL, ["-c", h], {
        timeout: PROBE_TIMEOUT_MS,
        cwd: "/",
        stdin: "ignore",
        stdout: "ignore",
        stderr: "ignore",
      })
    ).code === 0;
  let s;
  try {
    s = await realpath(await mkdtemp(join(tmpdir_2(), "hook-probe-")));
    let options = {
      ...e,
      roots: [],
      privateTmp: s,
      cwd: "/",
    };
    let bwrapHookCommand = buildBwrapHookCommand(":", options);
    if (await r(bwrapHookCommand)) return;
    let S = e.seccomp.kind === "file" ? SECCOMP_HELPER_PATH : `/proc/self/fd/${APPLY_SECCOMP_FD}`;
    let w = (await r(bwrapHookCommand.replace(` -- ${S} ${SANDBOX_SHELL} -c `, ` -- ${SANDBOX_SHELL} -c `)))
      ? "no_seccomp_stage"
      : "bubblewrap_failed";
    logForDebugging(
      `[remote-tools] a project hook cannot be run in a sandbox on this machine (${w}): the trial run failed`,
    );
    return w;
  } catch (error) {
    logForDebugging(
      `[remote-tools] the trial run of a project hook's sandbox could not be made (${errorMessage(error)})`,
    );
    return "bubblewrap_failed";
  } finally {
    if (s !== undefined)
      await rm_2(s, {
        recursive: true,
        force: true,
      }).catch(() => {});
  }
}
//@ chunk-e6aww6q8.js:902278-902382 placement
var SANDBOX_EXEC_PROFILE_PREFIX = `(version 1)
(deny default (with message "`;
var SHELL_TOKEN_RE = /[A-Za-z0-9_./:=@+,-]+|'[^']*'(?:"'"'[^']*')*/g;
//@ chunk-e6aww6q8.js:902382-903056 placement
/**
 * 判断项目钩子能否在沙箱中运行及使用哪种模式：平台不支持、个人沙箱开启但开关未开、存在 unix socket 授权或弱化配置、个人读规则等情况返回 unavailable 原因，否则返回 linux/person/locked 模式。
 */
function resolveHookSandboxMode(e) {
  let platform = getPlatform();
  if (platform !== "macos" && !(platform === "linux" && isLinuxHookSandboxEnabled()))
    return {
      unavailable: "platform",
    };
  let r =
    SandboxManager.isSandboxingEnabled() ||
    SandboxManager.getProxyPort() !== undefined ||
    SandboxManager.getSocksProxyPort() !== undefined;
  if (r && !isPersonSandboxHookEnabled())
    return {
      unavailable: "person_sandbox",
    };
  let mode = platform === "linux" ? "linux" : r ? "person" : "locked";
  let config = SandboxManager.getConfig();
  if (
    mode === "locked" &&
    ((config?.network?.allowUnixSockets?.length ?? 0) > 0 ||
      config?.network?.allowAllUnixSockets === true ||
      (config !== undefined && weakensSandboxIsolation(config, platform)) ||
      Object.keys(config?.ignoreViolations ?? {}).length > 0)
  )
    return {
      unavailable: "socket_grants",
    };
  if (
    (mode === "linux" && isFilesystemIsolationDisabledBySetting()) ||
    (mode === "locked" && config?.filesystem?.disabled === true)
  )
    return {
      unavailable: "filesystem_off",
    };
  if (hasPersonalReadRestrictions(e))
    return {
      unavailable: "person_read_rules",
    };
  return {
    mode,
  };
}
//@ chunk-e6aww6q8.js:903056-903081 placement
var HOSTCREDENTIAL = "hostCredential";
//@ chunk-e6aww6q8.js:903081-903463 placement
/**
 * 判断个人权限设置是否限制了读取（阻止工作目录外读取或有 Read 的拒绝/询问规则）。
 */
function hasPersonalReadRestrictions(e) {
  let n = (r) => permissionRuleValueFromString(r).toolName === FILE_READ_TOOL_NAME;
  return (
    e.blockReadsOutsideWorkingDirectories === true ||
    [e.alwaysDenyRules, e.alwaysAskRules].some((r) =>
      Object.entries(r).some(([key, value]) => key !== HOSTCREDENTIAL && value.some(n)),
    ) ||
    SETTING_SOURCES.some((r) => {
      let settingsForSourceTightenOnly = getSettingsForSourceTightenOnly(r);
      let sandbox = settingsForSourceTightenOnly?.sandbox;
      return (
        settingsForSourceTightenOnly?.permissions?.blockReadsOutsideWorkingDirectories === true ||
        (sandbox?.filesystem?.denyRead?.length ?? 0) > 0 ||
        (sandbox?.credentials?.files?.length ?? 0) > 0
      );
    })
  );
}
//@ chunk-e6aww6q8.js:903463-904086 placement
/**
 * 钩子沙箱中只读保护的宿主系统路径（/etc、/Library/*、/usr/local/etc 等）与允许读的设备节点。
 */
var HOOK_SANDBOX_PROTECTED_PATHS = [
  "/etc",
  "/var/root",
  "/var/db",
  "/var/log",
  "/opt/homebrew/etc",
  "/opt/homebrew/var",
  "/opt/local/etc",
  "/opt/local/var",
  "/usr/local/etc",
  "/usr/local/var",
  "/Library/Preferences",
  "/Library/Application Support",
  "/Library/Keychains",
  "/Library/LaunchDaemons",
  "/Library/LaunchAgents",
  "/Users",
  "/Volumes",
];
var SANDBOX_READONLY_SYSTEM_PATHS = [
  "/etc/passwd",
  "/etc/group",
  "/etc/hosts",
  "/etc/localtime",
  "/etc/paths",
  "/etc/paths.d",
  "/etc/ssl/cert.pem",
  "/etc/ssl/certs",
  "/etc/ssl/openssl.cnf",
  "/var/db/timezone",
];
var SANDBOX_DEVICE_PATHS = [
  "/dev/null",
  "/dev/zero",
  "/dev/random",
  "/dev/urandom",
  "/dev/stdin",
  "/dev/stdout",
  "/dev/stderr",
  "/dev/fd",
  "/dev/dtracehelper",
  "/dev/autofs_nowait",
];
//@ chunk-e6aww6q8.js:904086-904707 placement
async function buildHookSandboxDevices(e) {
  let n = async (r) =>
    uniq((await Promise.all(r.map(async (s) => [s, await realpath(s).catch(() => s)]))).flat());
  return {
    filesystem: {
      disabled: false,
      allowWrite: [e.privateTmp],
      denyWrite: await n([
        ...e.projectRoots,
        e.home,
        ...getDefaultWritePaths().filter((r) => !r.startsWith("/dev/") || !SANDBOX_DEVICE_PATHS.includes(r)),
        "/dev/tty*",
        "/dev/pty*",
        "/dev/console",
        claudeTempDir(),
        ...(e.mode === "person" ? (SandboxManager.getConfig()?.filesystem?.denyWrite ?? []) : []),
      ]),
      denyRead: await n([
        e.home,
        ...e.tempRoots,
        claudeTempDir(),
        "/dev",
        ...HOOK_SANDBOX_PROTECTED_PATHS,
        ...(SandboxManager.getConfig()?.filesystem?.denyRead ?? []),
        ...strictRealpathCache(),
      ]),
      allowRead: uniq([
        ...(await n(SANDBOX_READONLY_SYSTEM_PATHS)),
        ...SANDBOX_DEVICE_PATHS,
        ...e.projectRoots,
        e.privateTmp,
      ]),
    },
    network: {
      allowedDomains: [],
      deniedDomains: [],
    },
  };
}
//@ chunk-e6aww6q8.js:904707-904939 placement
function buildSandboxedHookEnv(e) {
  let n = {
    PATH: e.pathValue,
    HOME: e.home,
    TMPDIR: e.privateTmp,
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_CONFIG_NOSYSTEM: "1",
  };
  for (let [key, value] of Object.entries(e.judged))
    if (value !== undefined && (key === "LANG" || key.startsWith("LC_"))) n[key] = value;
  return n;
}
//@ chunk-e6aww6q8.js:904939-906087 placement
/**
 * 把项目钩子包进沙箱运行，并在结束后清理。
 */
async function wrapProjectHookInSandbox(e, config, signal, readRules, h) {
  let y;
  try {
    if (h.mode === "locked") y = await SandboxManager.wrapWithSandbox(e, SANDBOX_SHELL, config, signal);
    else {
      let filesystem = config.filesystem;
      if (filesystem === undefined) throw Error("the hook has no filesystem lists");
      y = wrapCommandWithSandboxMacOS({
        command: e,
        commandId: h.commandId,
        needsNetworkRestriction: true,
        readConfig: {
          denyOnly: filesystem.denyRead.map(removeTrailingGlobSuffix),
          allowWithinDeny: (filesystem.allowRead ?? []).map(removeTrailingGlobSuffix),
        },
        writeConfig: {
          allowOnly: [...getDefaultWritePaths(), ...filesystem.allowWrite.map(removeTrailingGlobSuffix)],
          denyWithinAllow: filesystem.denyWrite.map(removeTrailingGlobSuffix),
        },
        allowPty: false,
        binShell: SANDBOX_SHELL,
      });
    }
  } catch (error) {
    logForDebugging(
      `[remote-tools] a project hook could not be wrapped for the sandbox: ${errorMessage(error)}`,
      {
        level: "error",
      },
    );
    return;
  }
  let S = {
    command: y,
    [Symbol.dispose]() {
      if (h.mode === "person") return;
      try {
        SandboxManager.cleanupAfterCommand();
      } catch (error) {
        logForDebugging(
          `[remote-tools] sandbox cleanup after a project hook failed: ${errorMessage(error)}`,
          {
            level: "warn",
          },
        );
      }
    },
  };
  if (!isExpectedSandboxExecCommand(y, e)) {
    logForDebugging(
      "[remote-tools] what came back for a project hook is not a deny-by-default sandbox launch of it: not run",
      {
        level: "error",
      },
    );
    S[Symbol.dispose]();
    return;
  }
  let w = false;
  try {
    let hookSandboxMode = resolveHookSandboxMode(readRules);
    w = "mode" in hookSandboxMode && hookSandboxMode.mode === h.mode;
  } catch (error) {
    logForDebugging(
      `[remote-tools] a wrapped project hook could not be checked against the sandbox plan: ${errorMessage(error)}`,
      {
        level: "error",
      },
    );
  }
  if (!w) {
    S[Symbol.dispose]();
    return;
  }
  return S;
}
//@ chunk-e6aww6q8.js:906087-906310 placement
function wrapLinuxHookCommand(e, options, readRules) {
  try {
    let hookSandboxMode = resolveHookSandboxMode(readRules);
    if (!("mode" in hookSandboxMode) || hookSandboxMode.mode !== "linux") return;
    return {
      command: buildBwrapHookCommand(e, options),
      [Symbol.dispose]() {},
    };
  } catch (error) {
    logForDebugging(
      `[remote-tools] a project hook could not be wrapped for the sandbox: ${errorMessage(error)}`,
    );
    return;
  }
}
//@ chunk-e6aww6q8.js:906310-906616 placement
/**
 * 判断命令是否为预期形式的沙箱执行命令（跳过 -u 与环境变量赋值）。
 */
function isExpectedSandboxExecCommand(e, n) {
  let mapped = (e.match(SHELL_TOKEN_RE) ?? []).map((y) =>
    y.startsWith("'") ? y.slice(1, -1).replaceAll(`'"'"'`, "'") : y,
  );
  let s = 1;
  while (mapped[s] === "-u") s += 2;
  while (/^[A-Za-z_]\w*=/.test(mapped[s] ?? "")) s += 1;
  let h = mapped[s + 2] ?? "";
  return (
    mapped[0] === "env" &&
    h.startsWith(SANDBOX_EXEC_PROFILE_PREFIX) &&
    e === quote([...mapped.slice(0, s), "/usr/bin/sandbox-exec", "-p", h, SANDBOX_SHELL, "-c", n])
  );
}
export {
  strictRealpathCache,
  scriptFileReaderDeps,
  isViolinPegOn,
  isViolinOverstandOn,
  resolveHookSandboxMode,
  checkHookSandboxAvailable,
  isPathWithinNormalizedCase,
  replaceCommandProgram,
  buildHookSandboxDevices,
  buildSandboxedHookEnv,
  wrapLinuxHookCommand,
  wrapProjectHookInSandbox,
  verifyPinnedScript,
  stageDeviceHooks,
  stagingFsDeps,
  isStrictSandboxFullyConfigured,
};
