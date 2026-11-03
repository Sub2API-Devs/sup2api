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
import {
  lstat,
  lstat as lstat_2,
  lstat as lstat_3,
  lstat as lstat_4,
  lstat as lstat_5,
  lstat as lstat_6,
  lstat as lstat_7,
  lstat as lstat_8,
  lstat as lstat_9,
  lstat as lstat_10,
  lstat as lstat_11,
  lstat as lstat_12,
  lstat as lstat_13,
  lstat as lstat_14,
  lstat as lstat_15,
  lstat as lstat_16,
  lstat as lstat_17,
  lstat as lstat_18,
  lstat as lstat_19,
  lstat as lstat_20,
  lstat as lstat_21,
  lstat as lstat_22,
  lstat as lstat_23,
  lstat as lstat_24,
  lstat as lstat_25,
  lstat as lstat_26,
  lstat as lstat_27,
  lstat as lstat_28,
  lstat as lstat_29,
  lstat as lstat_30,
  lstat as lstat_31,
  lstat as lstat_32,
  lstat as lstat_33,
  lstat as lstat_34,
  lstat as lstat_35,
  lstat as lstat_36,
  lstat as lstat_37,
  lstat as lstat_38,
  lstat as lstat_39,
  lstat as lstat_40,
  lstat as lstat_41,
  lstat as lstat_42,
  lstat as lstat_43,
  readFile,
  readFile as readFile_2,
  readFile as readFile_3,
  readFile as readFile_4,
  readFile as readFile_5,
  readFile as readFile_6,
  readFile as readFile_7,
  readFile as readFile_8,
  readFile as readFile_9,
  readFile as readFile_10,
  readFile as readFile_11,
  readFile as readFile_12,
  readFile as readFile_13,
  readFile as readFile_14,
  readFile as readFile_15,
  readFile as readFile_16,
  readFile as readFile_17,
  readFile as readFile_18,
  readFile as readFile_19,
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
  open,
  open as open_2,
  open as open_3,
  open as open_4,
  open as open_5,
  open as open_6,
  open as open_7,
  open as open_8,
  open as open_9,
  open as open_10,
  open as open_11,
  open as open_12,
  open as open_13,
  open as open_14,
  open as open_15,
  open as open_16,
  open as open_17,
  open as open_18,
  open as open_19,
  open as open_20,
  open as open_21,
  open as open_22,
  open as open_23,
  open as open_24,
  open as open_25,
  open as open_26,
  open as open_27,
  mkdtemp,
  mkdtemp as mkdtemp_2,
  mkdtemp as mkdtemp_3,
  mkdtemp as mkdtemp_4,
  mkdtemp as mkdtemp_5,
  mkdtemp as mkdtemp_6,
  mkdtemp as mkdtemp_7,
  mkdtemp as mkdtemp_8,
  writeFile,
  writeFile as writeFile_2,
  writeFile as writeFile_3,
  writeFile as writeFile_4,
  writeFile as writeFile_5,
  writeFile as writeFile_6,
  writeFile as writeFile_7,
  writeFile as writeFile_8,
  writeFile as writeFile_9,
  writeFile as writeFile_10,
  writeFile as writeFile_11,
  writeFile as writeFile_12,
  writeFile as writeFile_13,
  writeFile as writeFile_14,
  writeFile as writeFile_15,
  writeFile as writeFile_16,
  writeFile as writeFile_17,
  writeFile as writeFile_18,
  unlink,
  unlink as unlink_2,
  unlink as unlink_3,
  unlink as unlink_4,
  unlink as unlink_5,
  unlink as unlink_6,
  unlink as unlink_7,
  unlink as unlink_8,
  unlink as unlink_9,
  unlink as unlink_10,
  unlink as unlink_11,
  unlink as unlink_12,
  unlink as unlink_13,
  rm as rm_2,
  rm as rm_2_2,
  rm as rm_3,
  rm as rm_4,
  rm as rm_5,
  rm as rm_6,
  rm as rm_7,
  rm as rm_8,
  rm as rm_9,
  rm as rm_10,
  rm as rm_11,
  rm as rm_12,
  rm as rm_13,
  rm as rm_14,
  rm as rm_15,
  rm as rm_16,
  rm as rm_17,
  rm as rm_18,
  rm as rm_19,
  rm as rm_20,
  rm as rm_21,
  rm as rm_22,
  rm as rm_23,
  rm as rm_24,
  rm as rm_25,
  rm as rm_26,
  rm as rm_27,
  rmdir,
  rmdir as rmdir_2,
  rmdir as rmdir_3,
  rmdir as rmdir_4,
  rmdir as rmdir_5,
  rmdir as rmdir_6,
  rmdir as rmdir_7,
} from "fs/promises";
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
  dirname,
  dirname as dirname_2,
  dirname as dirname_3,
  dirname as dirname_4,
  dirname as dirname_5,
  dirname as dirname_6,
  dirname as dirname_7,
  dirname as dirname_8,
  dirname as dirname_9,
  dirname as dirname_10,
  dirname as dirname_11,
  dirname as dirname_12,
  dirname as dirname_13,
  dirname as dirname_14,
  dirname as dirname_15,
  dirname as dirname_16,
  dirname as dirname_17,
  dirname as dirname_18,
  dirname as dirname_19,
  dirname as dirname_20,
  dirname as dirname_21,
  dirname as dirname_22,
  dirname as dirname_23,
  dirname as dirname_24,
  dirname as dirname_25,
  dirname as dirname_26,
  dirname as dirname_27,
  dirname as dirname_28,
  dirname as dirname_29,
  dirname as dirname_30,
  dirname as dirname_31,
  dirname as dirname_32,
  dirname as dirname_33,
  dirname as dirname_34,
  dirname as dirname_35,
  dirname as dirname_36,
  dirname as dirname_37,
  dirname as dirname_38,
  dirname as dirname_39,
  dirname as dirname_40,
  dirname as dirname_41,
  dirname as dirname_42,
  dirname as dirname_43,
  dirname as dirname_44,
  dirname as dirname_45,
  dirname as dirname_46,
  dirname as dirname_47,
  dirname as dirname_48,
  dirname as dirname_49,
  dirname as dirname_50,
  dirname as dirname_51,
  dirname as dirname_52,
  dirname as dirname_53,
  dirname as dirname_54,
  dirname as dirname_55,
  dirname as dirname_56,
  dirname as dirname_57,
  dirname as dirname_58,
  dirname as dirname_59,
  dirname as dirname_60,
  dirname as dirname_61,
  dirname as dirname_62,
  dirname as dirname_63,
  dirname as dirname_64,
  dirname as dirname_65,
  dirname as dirname_66,
  dirname as dirname_67,
  dirname as dirname_68,
  dirname as dirname_69,
  dirname as dirname_70,
  dirname as dirname_71,
  dirname as dirname_72,
  dirname as dirname_73,
  dirname as dirname_74,
  dirname as dirname_75,
  dirname as dirname_76,
  dirname as dirname_77,
  basename,
  basename as basename_2,
  basename as basename_3,
  basename as basename_4,
  basename as basename_5,
  basename as basename_6,
  basename as basename_7,
  basename as basename_8,
  basename as basename_9,
  basename as basename_10,
  basename as basename_11,
  basename as basename_12,
  basename as basename_13,
  basename as basename_14,
  basename as basename_15,
  basename as basename_16,
  basename as basename_17,
  basename as basename_18,
  basename as basename_19,
  basename as basename_20,
  basename as basename_21,
  basename as basename_22,
  basename as basename_23,
  basename as basename_24,
  basename as basename_25,
  basename as basename_26,
  basename as basename_27,
  basename as basename_28,
  basename as basename_29,
  basename as basename_30,
  basename as basename_31,
  basename as basename_32,
  basename as basename_33,
  basename as basename_34,
  basename as basename_35,
  basename as basename_36,
  basename as basename_37,
  basename as basename_38,
  basename as basename_39,
  basename as basename_40,
  basename as basename_41,
  basename as basename_42,
  basename as basename_43,
  basename as basename_45,
  basename as basename_46,
  basename as basename_47,
  basename as basename_48,
  basename as basename_49,
  basename as basename_50,
  basename as basename_51,
  basename as basename_52,
  basename as basename_53,
  basename as basename_54,
  basename as basename_55,
  basename as basename_56,
  basename as basename_57,
  basename as basename_58,
  basename as basename_59,
  basename as basename_60,
  basename as basename_61,
  basename as basename_62,
  basename as basename_63,
  basename as basename_64,
  basename as basename_65,
  basename as basename_66,
  basename as basename_67,
  basename as basename_68,
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
  join as join_8,
  join as join_9,
  join as join_10,
  join as join_11,
  join as join_12,
  join as join_13,
  join as join_14,
  join as join_15,
  join as join_16,
  join as join_17,
  join as join_18,
  join as join_19,
  join as join_20,
  join as join_21,
  join as join_22,
  join as join_23,
  join as join_24,
  join as join_25,
  join as join_26,
  join as join_27,
  join as join_28,
  join as join_29,
  join as join_30,
  join as join_31,
  join as join_32,
  join as join_33,
  join as join_34,
  join as join_35,
  join as join_36,
  join as join_37,
  join as join_38,
  join as join_40,
  join as join_41,
  join as join_42,
  join as join_43,
  join as join_44,
  join as join_45,
  join as join_46,
  join as join_47,
  join as join_48,
  join as join_49,
  join as join_50,
  join as join_51,
  join as join_52,
  join as join_53,
  join as join_54,
  join as join_55,
  join as join_56,
  join as join_57,
  join as join_58,
  join as join_59,
  join as join_60,
  join as join_61,
  join as join_62,
  join as join_63,
  join as join_64,
  join as join_65,
  join as join_66,
  join as join_67,
  join as join_68,
  join as join_69,
  join as join_70,
  join as join_71,
  join as join_72,
  join as join_73,
  join as join_74,
  join as join_75,
  join as join_76,
  join as join_77,
  join as join_78,
  join as join_79,
  join as join_80,
  join as join_81,
  join as join_82,
  join as join_84,
  join as join_85,
  join as join_86,
  join as join_87,
  join as join_88,
  join as join_89,
  join as join_90,
  join as join_91,
  join as join_92,
  join as join_93,
  join as join_94,
  join as join_95,
  join as join_96,
  join as join_97,
  join as join_98,
  join as join_99,
  join as join_100,
  join as join_101,
  join as join_102,
  join as join_103,
  join as join_104,
  join as join_105,
  join as join_106,
  join as join_107,
  join as join_108,
  join as join_109,
  join as join_110,
  join as join_111,
  join as join_112,
  join as join_113,
  join as join_114,
  join as join_115,
  join as join_116,
  join as join_117,
  join as join_118,
  join as join_119,
  join as join_120,
  join as join_121,
  join as join_122,
  join as join_123,
  join as join_124,
  join as join_125,
  join as join_126,
  join as join_127,
  join as join_128,
  join as join_129,
} from "path";
import {
  constants,
  constants as constants_3,
  constants as constants_4,
  constants as constants_5,
  constants as constants_6,
  constants as constants_7,
  constants as constants_9,
  constants as constants_10,
  constants as constants_12,
  constants as constants_13,
  constants as constants_14,
  constants as constants_15,
  constants as constants_16,
  constants as constants_17,
  constants as constants_18,
  constants as constants_19,
  constants as constants_20,
  constants as constants_21,
  constants as constants_22,
  constants as constants_23,
  constants as constants_24,
  constants as constants_25,
  constants as constants_26,
  constants as constants_27,
} from "fs";
import {
  userInfo,
  userInfo as userInfo_2,
  tmpdir as tmpdir_2,
  tmpdir as tmpdir_3,
  tmpdir as tmpdir_4,
  tmpdir as tmpdir_5,
  tmpdir as tmpdir_6,
} from "os";
import { execFileNoThrow } from "../../execFileNoThrow.js";
import { BP, uy } from "../../../../vendor/@anthropic-ai/sandbox-runtime/dist/sandbox/sandbox-utils.js";
import { getPlatform } from "../../platform.js";
import { getLatchedPreSettingsEnvSnapshot } from "../../managedEnvApply.js";
import { checkScriptFile, D4e } from "../hookCommandAnalysis.js";
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
import { Dst } from "../../wslMounts.js";
import { getFsImplementation, getPathsForPermissionCheck } from "../../fsOperations.js";
import { isPathWithinCaseAware, isSameOrUnderPath, isPathUnder } from "../../pathPrefix.js";
import { normalizeCaseForComparison } from "../../permissions/filesystem.js";
import { Tie, xor } from "../../sandbox/linuxSandboxExec.js";
import {
  T3o,
  W6r,
  j6r,
} from "../../../../vendor/@anthropic-ai/sandbox-runtime/dist/sandbox/linux-sandbox-utils.js";
import { uniq } from "../../collections.js";
import { ge } from "../../identity.js";
import { resolveProgramOnPathInReach } from "../hookCommandResolution.js";
import { B6r } from "../../../../vendor/@anthropic-ai/sandbox-runtime/dist/sandbox/generate-seccomp-filter.js";
import { m_ } from "../../settings/stickyRoots.js";
import { weakensSandboxIsolation } from "../../../remote/tools/servedCallLog.js";
import { permissionRuleValueFromString } from "../../permissions/permissionRuleParser.js";
import { FILE_READ_TOOL_NAME } from "../../../tools/FileReadTool/constants.js";
import { SETTING_SOURCES } from "../../settings/constants.js";
import { getSettingsForSourceTightenOnly } from "../../settings/settings.js";
import { G6r } from "../../../../vendor/@anthropic-ai/sandbox-runtime/dist/sandbox/macos-sandbox-utils.js";
import { zee } from "../../../../vendor/@anthropic-ai/sandbox-runtime/dist/utils/shell-quote.js";

//@ chunk-e6aww6q8.js:887497-887526 placement
var JWe = 18,
  ZWe = 512,
  eBt = 65534;
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
        let statNoFollow = await e.statNoFollow(n);
        return (
          ((statNoFollow.mode & JWe) === 0 || (statNoFollow.mode & ZWe) !== 0) &&
          (statNoFollow.uid === 0 ||
            statNoFollow.uid === e.uid ||
            statNoFollow.uid === (await e.overflowUid()))
        );
      } catch {
        return !0;
      }
    },
    fingerprint: (n) => privateDirFingerprint(n, e),
  };
}
//@ chunk-e6aww6q8.js:887884-888062 placement
function defaultTmpBaseCheck() {
  return createTmpBaseCheck({
    uid: process.getuid?.() ?? -1,
    statNoFollow: lstat_22,
    overflowUid: () =>
      readFile_8("/proc/sys/kernel/overflowuid", "utf8").then(
        (e) => Number.parseInt(e, 10) || eBt,
        () => eBt,
      ),
  });
}
//@ chunk-e6aww6q8.js:888062-888326 placement
function fallbackTmpBaseCandidates(e, n, r) {
  let s = r?.TMPDIR?.replace(/\/+$/, ""),
    h =
      e !== "macos"
        ? [{ label: "runtime", path: `/run/user/${n}`, walkAncestors: !1 }]
        : s !== void 0 && isAbsolute_14(s)
          ? [{ label: "start_tmpdir", path: s, walkAncestors: !0 }]
          : [];
  return [{ label: "var_tmp", path: "/var/tmp", walkAncestors: !1 }, ...h];
}
/**
 * 检查备用临时目录各级父目录的属主与链接情况，确认可安全作为沙箱临时根。
 */
//@ chunk-e6aww6q8.js:888326-888944 placement
async function vetFallbackTmpBases(e, fs) {
  let r = async (y, S) => {
      for (let w = y, L = ""; w !== L; L = w, w = dirname_24(w)) {
        let statNoFollow = await fs.statNoFollow(w);
        if (
          (statNoFollow.uid !== 0 && statNoFollow.uid !== fs.uid) ||
          (statNoFollow.isSymbolicLink()
            ? !S
            : !statNoFollow.isDirectory() ||
              ((statNoFollow.mode & JWe) !== 0 && !(S && (statNoFollow.mode & ZWe) !== 0)))
        )
          return !1;
      }
      return !0;
    },
    s = (y) => privateDirFingerprint(y, fs),
    h = [];
  for (let { label: label, path: path, walkAncestors: walkAncestors } of e)
    try {
      if (walkAncestors && !(await r(path, !0))) continue;
      let realpath = await fs.realpath(path),
        statNoFollow = await fs.statNoFollow(realpath);
      if (
        statNoFollow.isDirectory() &&
        ((statNoFollow.uid === fs.uid && (statNoFollow.mode & JWe) === 0) ||
          (statNoFollow.uid === 0 && (statNoFollow.mode & ZWe) !== 0)) &&
        (!walkAncestors || (await r(dirname_24(realpath), !0)))
      )
        h.push({
          label: label,
          real: realpath,
          canExecute: fs.canExecute,
          fingerprint: s,
          closedAbove: () => r(realpath, !1).catch(() => !1),
        });
    } catch {}
  return h;
}
//@ chunk-e6aww6q8.js:888944-889185 placement
function ACo(e) {
  return {
    uid: e,
    realpath: realpath_10,
    statNoFollow: lstat_22,
    canExecute: async (n) =>
      (
        await execFileNoThrow(n, [], {
          env: { USER_TYPE: "external", NODE_ENV: "production" },
          extendEnv: !1,
          timeout: 5000,
          useCwd: !1,
          stdin: "ignore",
          stdout: "ignore",
          stderr: "ignore",
        })
      ).code === 0,
  };
}
//@ chunk-e6aww6q8.js:889185-889235 placement
function xCo() {
  try {
    return (BP(), !0);
  } catch {
    return !1;
  }
}
//@ chunk-e6aww6q8.js:889235-889350 placement
async function getFallbackTmpBases(e = xCo) {
  let n = process.getuid?.();
  if (n === void 0 || !e()) return [];
  return vetFallbackTmpBases(
    fallbackTmpBaseCandidates(getPlatform(), n, getLatchedPreSettingsEnvSnapshot()),
    ACo(n),
  );
}
/**
 * 校验固定的脚本：真实路径未变、内容摘要一致，否则返回原因。
 */
//@ chunk-e6aww6q8.js:889350-889740 placement
async function verifyPinnedScript(e, n) {
  let r;
  try {
    r = await n.realpath(e.path);
  } catch {
    return { ok: !1, reason: "unreadable" };
  }
  if (r !== e.realPath) return { ok: !1, reason: "relocated", realPath: r };
  let s = await checkScriptFile(r, { open: n.openNoFollow });
  if (!s.ok) return { ok: !1, reason: s.reason, realPath: r };
  return s.sha256 === e.sha256
    ? { ok: !0, bytes: s.bytes, realPath: r }
    : { ok: !1, reason: "changed", realPath: r, current: { sha256: s.sha256, bytes: s.bytes } };
}
//@ chunk-e6aww6q8.js:889740-889881 placement
var CLAUDE_DEVICE_HOOKS = "claude-device-hooks-",
  sBt = "run+",
  $Co = "execute+probe",
  buffer_3 = Buffer.from(`#!/bin/sh
exit 0
`),
  BCo = new Set(["EMFILE", "ENFILE", "ENOMEM"]);
//@ chunk-e6aww6q8.js:889881-889922 placement
function o1e(e) {
  return BCo.has(getErrnoCode(e) ?? "");
}
//@ chunk-e6aww6q8.js:889922-890025 placement
function safeScriptFileName(e) {
  let replaced = basename_16(e).replace(/[^A-Za-z0-9._-]/g, "_");
  return replaced === "" || replaced === "." || replaced === ".." ? "hook" : replaced;
}
/**
 * 暂存设备钩子：把校验过的钩子副本放到只有本人可写的目录。
 */
//@ chunk-e6aww6q8.js:890025-894397 placement
function stageDeviceHooks(e, n) {
  let r = null,
    s = new Map(),
    h = [],
    y = new Set(),
    S = new Set(),
    w = !1,
    L = 0,
    G = !1,
    q = (Ie) => n().some((Me) => Ie.some((We) => D4e(We, Me))),
    Z = (Ie, Me = Ie) => (q([Ie, Me]) ? e.rmdir(Ie) : e.rm(Ie)).catch(() => {}),
    Se = (Ie) => {
      if (G) Z(Ie);
      else y.add(Ie);
    },
    ke = (Ie, Me) => {
      if (y.has(Ie)) return;
      (logForDebugging(
        `[deviceHooks] a fallback folder closed to other users is given up (${Me}): verified hook copies are kept in the order used before`,
      ),
        (w = !0),
        Se(Ie));
      let We = r;
      ((r = null),
        s.clear(),
        We?.then(
          ({ real: real }) => Se(real),
          () => {},
        ));
    },
    we = () => {
      if (G) return Promise.reject(Error("device hook staging is disposed"));
      return (r ??= (async () => {
        let Ie = async (Et) => {
            if (q([Et.real])) return null;
            let yt = await e.mkdtemp(join_41(Et.real, CLAUDE_DEVICE_HOOKS)).catch(() => null);
            if (yt === null) return null;
            let gt = await e.realpath(yt).catch(() => null),
              At = null;
            if (gt !== null && dirname_23(gt) === Et.real && !q([gt, yt])) {
              let It = join_41(gt, $Co),
                Yt = await e
                  .writeFileExclusive(It, buffer_3, 448)
                  .then(() => Et.canExecute(It))
                  .catch(() => !1);
              if ((await e.unlink(It).catch(() => {}), (At = Yt ? await Et.fingerprint(gt) : null), !Yt))
                logForDebugging(
                  `[deviceHooks] a file under the ${Et.label} fallback folder did not run (mounted noexec?): verified hook copies are not kept there`,
                );
            }
            if (gt === null || At === null) return (await Z(yt, gt ?? yt), null);
            return (
              logForDebugging(
                `[deviceHooks] verified hook copies are kept under the ${Et.label} fallback folder`,
              ),
              { real: gt, created: yt, stillOurs: async () => (await Et.fingerprint(gt)) === At }
            );
          },
          Me = await e.fallbackBases().catch(() => []),
          We = [];
        for (let Et of Me) if (await Et.closedAbove()) We.push(Et);
        h = We.map((Et) => Et.real);
        let ze = new Set();
        for (let Et of We) {
          if (w) break;
          ze.add(Et);
          let yt = await Ie(Et);
          if (yt !== null && w) await Z(yt.real, yt.created);
          else if (yt !== null) return (S.add(yt.real), yt);
        }
        let lt = Error("no private directory for verified hook copies on this machine"),
          Je = await e.mkdtemp(join_41(e.tmpBase(), CLAUDE_DEVICE_HOOKS)).catch((Et) => {
            if (o1e(Et)) throw Et;
            return ((lt = Et), null);
          }),
          nt = null;
        if (Je !== null) {
          let realpath = await e.realpath(Je);
          if (q([realpath, Je])) await Z(realpath, Je);
          else nt = { real: realpath, created: Je };
        }
        let pt = async (Et) => ({
          ...Et,
          stillOurs:
            (await e.tmpBaseCheck.fingerprint(Et.real)) === null
              ? null
              : async () => (await e.tmpBaseCheck.fingerprint(Et.real)) !== null,
        });
        if (nt !== null && (await e.tmpBaseCheck.held(dirname_23(nt.real)))) return pt(nt);
        for (let Et of Me) {
          let yt = ze.has(Et) ? null : await Ie(Et);
          if (yt !== null) {
            if (nt !== null) await Z(nt.real, nt.created);
            return yt;
          }
        }
        if (nt !== null)
          return (
            logForDebugging(
              "[deviceHooks] verified hook copies are kept under a temp folder that other users can write: no fallback folder qualified",
              { level: "warn" },
            ),
            pt(nt)
          );
        throw lt;
      })().catch((Ie) => {
        throw ((r = null), Ie);
      }));
    },
    Ee = async () => {
      for (let Ie = !1, Me = 0; ; Me += 1) {
        let We = we(),
          { real: real, created: created, stillOurs: stillOurs } = await We,
          nt = S.has(real);
        if (q([real, created]))
          throw Error("the directory for verified hook copies is now where the cloud session can write");
        if (stillOurs === null || (await stillOurs())) return real;
        if (r === We) ((r = null), s.clear());
        if (nt && Ie && Me < 8) {
          ke(real, "its directories do not read as the ones just made");
          continue;
        }
        if (nt) Se(real);
        else w = !1;
        if (Ie) throw Error("the directory for verified hook copies is no longer the one this process made");
        Ie = !0;
      }
    },
    Ae = async (Ie) => {
      let Me = await Ee();
      try {
        return await Ie(Me);
      } catch (error) {
        if (!S.has(Me) || o1e(error) || q([Me])) throw error;
        return (ke(Me, "it could not be written"), Ie(await Ee()));
      }
    };
  return {
    async stage(Ie, Me, We) {
      let ze = await Ae(async (Je) => {
          L += 1;
          let nt = join_41(Je, `${Ie.slice(0, 16)}-${L}-${safeScriptFileName(We)}`);
          return (await e.writeFileExclusive(nt, Me, 448), nt);
        }),
        lt = !1;
      return {
        path: ze,
        async release() {
          if (lt) return;
          ((lt = !0), await e.unlink(ze).catch(() => {}));
        },
      };
    },
    async runDirectory() {
      let Ie = (We) => {
          if (o1e(We)) throw We;
          return null;
        },
        Me = async (We, ze, lt) => {
          let Je = await e.mkdtemp(join_41(We, ze)).catch(Ie);
          if (Je === null) return null;
          let nt = await e.realpath(Je).catch(Ie);
          if (nt === null || q([nt, Je]) || (lt && dirname_23(nt) !== We))
            return (await Z(Je, nt ?? Je), null);
          if (lt) y.add(nt);
          return {
            path: nt,
            release: async () => {
              (y.delete(nt), await Z(nt, Je));
            },
          };
        };
      return Ae(async (We) => {
        for (let lt of h) {
          let Je = q([lt]) ? null : await Me(lt, CLAUDE_DEVICE_HOOKS + sBt, !0);
          if (Je !== null) return Je;
        }
        let ze = await Me(We, sBt, !1);
        if (ze === null) throw Error("no private directory for a forwarded hook to start in on this machine");
        return ze;
      });
    },
    async placeholder(Ie) {
      return Ae((Me) => {
        let We = join_41(Me, safeScriptFileName(Ie)),
          ze = s.get(We);
        if (ze === void 0)
          ((ze = e
            .writeFileExclusive(We, Buffer.alloc(0), 384)
            .then(() => We)
            .catch((lt) => {
              throw (s.delete(We), lt);
            })),
            s.set(We, ze));
        return ze;
      });
    },
    async dispose() {
      G = !0;
      let Ie = r;
      ((r = null), s.clear());
      let Me = [...y];
      if ((y.clear(), await Promise.all(Me.map((ze) => Z(ze))), Ie === null)) return;
      let We = await Ie.catch(() => null);
      if (We !== null) await Z(We.real, We.created);
    },
  };
}
//@ chunk-e6aww6q8.js:894397-894619 placement
function replaceCommandProgram(e, n, r) {
  switch (n.form) {
    case "shell":
      return { ...e, command: e.command.slice(0, n.start) + shellQuoteArgs([r]) + e.command.slice(n.end) };
    case "exec":
      return n.slot === "command" ? { ...e, command: r } : { ...e, args: [r, ...(e.args ?? []).slice(1)] };
  }
}
//@ chunk-e6aww6q8.js:894619-894733 placement
function scriptFileReaderDeps() {
  return {
    realpath: realpath_9,
    openNoFollow: (e) =>
      open_10(e, constants_13.O_RDONLY | constants_13.O_NOFOLLOW | constants_13.O_NONBLOCK),
    lstat: lstat_21,
  };
}
//@ chunk-e6aww6q8.js:894733-894945 placement
function stagingFsDeps() {
  return {
    tmpBase: tmpdir,
    tmpBaseCheck: defaultTmpBaseCheck(),
    fallbackBases: getFallbackTmpBases,
    mkdtemp: mkdtemp_4,
    realpath: realpath_9,
    writeFileExclusive: (e, n, r) => writeFile_9(e, n, { mode: r, flag: "wx" }),
    unlink: unlink_6,
    rm: (e) => rm_16(e, { recursive: !0, force: !0 }),
    rmdir: rmdir_6,
  };
}
//@ chunk-e6aww6q8.js:894945-895131 placement
function lBt() {
  try {
    let { value: e, source: source } = getFeatureValueWithSource_CACHED_MAY_BE_STALE(
      "tengu_violin_overstand",
      !1,
    );
    return e === !0 && source !== "override";
  } catch (error) {
    return (logError(Error("tengu_violin_overstand could not be read", { cause: error })), !1);
  }
}
//@ chunk-e6aww6q8.js:895131-895158 placement
var TENGU_VIOLIN_PEG = "tengu_violin_peg";
//@ chunk-e6aww6q8.js:895158-895215 placement
function G0() {
  try {
    return isViolinWoodEnabledCached() && getFeatureValue_CACHED_MAY_BE_STALE(TENGU_VIOLIN_PEG, !1);
  } catch {
    return !1;
  }
}
//@ chunk-e6aww6q8.js:895256-895284 placement
var TENGU_VIOLIN_HEEL = "tengu_violin_heel";
//@ chunk-e6aww6q8.js:895284-895388 placement
function isLinuxHookSandboxEnabled() {
  try {
    let { value: e, source: source } = getFeatureValueWithSource_CACHED_MAY_BE_STALE(TENGU_VIOLIN_HEEL, !1);
    return e === !0 && source !== "override" && G0();
  } catch {
    return !1;
  }
}
//@ chunk-e6aww6q8.js:895388-895418 placement
var TENGU_VIOLIN_SADDLE = "tengu_violin_saddle";
//@ chunk-e6aww6q8.js:895418-895522 placement
function isPersonSandboxHookEnabled() {
  try {
    let { value: e, source: source } = getFeatureValueWithSource_CACHED_MAY_BE_STALE(TENGU_VIOLIN_SADDLE, !1);
    return e === !0 && source !== "override" && G0();
  } catch {
    return !1;
  }
}
//@ chunk-e6aww6q8.js:895552-895591 placement
function c0e() {
  return createRealpathCache_2(cBt(() => {}));
}
//@ chunk-e6aww6q8.js:895591-895660 placement
function zCo() {
  let e = !0;
  return {
    paths: createRealpathCache_2(
      cBt(() => {
        e = !1;
      }),
    ),
    vouched: e,
  };
}
//@ chunk-e6aww6q8.js:895660-895802 placement
function n4s() {
  let e = SandboxManager.getConfig()?.filesystem;
  if (e === void 0 || e.disabled === !0 || getEffectiveFilesystemPolicy() !== "strict" || Dst().length > 0)
    return !1;
  return zCo().vouched;
}
/**
 * 构造只在文件存在时返回真实路径的辅助对象，遇到团队目录内错误时忽略。
 */
//@ chunk-e6aww6q8.js:895802-896296 placement
function cBt(e) {
  return {
    realpathIfExists(n) {
      try {
        getFsImplementation().statSync(n);
      } catch (error) {
        if (isRealPathWithinTeamDir(error)) return;
        return (e(), n);
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
          let lstatSync = getFsImplementation().lstatSync(join_42(n, s.name));
          return lstatSync.isFile() || lstatSync.isDirectory() ? [s.name] : [];
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
/**
 * 沙箱使用的 shell 及默认可读的系统目录列表。
 */
//@ chunk-e6aww6q8.js:896517-896933 placement
var SANDBOX_SHELL = "/bin/sh",
  SYSTEM_READONLY_PATHS = [
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
  ],
  SYSTEM_REAL_PREFIXES = ["/usr", "/bin", "/sbin", "/lib", "/lib32", "/lib64", "/libx32"],
  MIN_BWRAP_VERSION = "0.10.0";
//@ chunk-e6aww6q8.js:896933-897052 placement
function parseVersionNumber(e) {
  let match = /(\d+)\.(\d+)\.(\d+)/.exec(e);
  return match === null ? -1 : Number(match[1]) * 1e6 + Number(match[2]) * 1000 + Number(match[3]);
}
//@ chunk-e6aww6q8.js:897052-897131 placement
function nM(e, n) {
  return isPathWithinCaseAware(
    normalizeCaseForComparison(e.normalize("NFKC")),
    normalizeCaseForComparison(n.normalize("NFKC")),
    !1,
  );
}
//@ chunk-e6aww6q8.js:897131-897355 placement
var SECCOMP_HELPER_PATH = "/run/claude-hook/apply-seccomp",
  FIRST_ROOT_FD = Tie + 1,
  SBt = 9,
  MAX_SANDBOX_ROOTS = SBt - FIRST_ROOT_FD,
  OOM_SCORE_ADJ_PREFIX = "echo 1000 > /proc/self/oom_score_adj || exit 126; ",
  CLOSE_INHERITED_FDS_PREFIX = `command exec ${Array.from({ length: SBt - Tie + 1 }, (e, n) => `${Tie + n}<&-`).join(" ")} || exit 126; `;
//@ chunk-e6aww6q8.js:897355-897503 placement
function sandboxRootFdBindings(e) {
  return [
    ...e.roots.map((root) => ({ real: root.real, flag: "--ro-bind-fd" })),
    { real: e.privateTmp, flag: "--bind-fd" },
  ].map((n, r) => ({ ...n, fd: FIRST_ROOT_FD + r }));
}
/**
 * 为沙箱化的钩子构造 bwrap 参数（新会话、独立命名空间等）。
 */
//@ chunk-e6aww6q8.js:897503-898148 placement
function buildBwrapArgs(e, n) {
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
    ...e.system.flatMap((r) => ["--ro-bind-try", r.real, r.at]),
    ...e.homes.flatMap((home) => ["--tmpfs", home]),
    ...sandboxRootFdBindings(e).flatMap((r) => [r.flag, String(r.fd), r.real]),
    ...e.roots.flatMap((root) => root.alsoAt.flatMap((s) => ["--symlink", root.real, s])),
    ...(e.seccomp.kind === "file"
      ? ["--ro-bind", e.seccomp.path, SECCOMP_HELPER_PATH]
      : ["--setenv", "ARGV0", e.seccomp.argv0]),
    "--proc",
    "/proc",
    "--dev",
    "/dev",
    "--remount-ro",
    "/dev",
    ...e.homes.flatMap((home) => ["--remount-ro", home]),
    "--remount-ro",
    "/",
    "--chdir",
    e.cwd,
  ];
}
/**
 * 生成在 bubblewrap 中运行项目钩子的 shell 命令：调整 oom_score_adj，用文件描述符只读绑定各根目录（校验 fd 指向的真实路径）并可写绑定私有 tmp，关闭继承的 fd，经 seccomp 辅助程序执行 /bin/sh -c。
 */
//@ chunk-e6aww6q8.js:898148-898657 placement
function buildBwrapHookCommand(e, options) {
  let r = process.geteuid?.(),
    s = buildBwrapArgs(options, T3o({ euid: r, hasSetfcap: r === 0 && W6r(j6r), usesSeccompHelper: !0 })),
    h = (w, L) => `command exec ${w}<${shellQuoteArgs([L])} || exit 126; `,
    joined = sandboxRootFdBindings(options)
      .map(
        (w) =>
          `${h(w.fd, w.real)}[ "$(cd /proc/self/fd/${w.fd} && pwd -P)" = ${shellQuoteArgs([w.real])} ] || exit 126; `,
      )
      .join(""),
    S = [SANDBOX_SHELL, "-c", `${CLOSE_INHERITED_FDS_PREFIX}${e}`];
  return options.seccomp.kind === "file"
    ? `${OOM_SCORE_ADJ_PREFIX}${joined}exec ${shellQuoteArgs([options.bwrap, ...s, "--", SECCOMP_HELPER_PATH, ...S])}`
    : `${OOM_SCORE_ADJ_PREFIX}${h(Tie, `/proc/${process.pid}/exe`)}${joined}exec ${shellQuoteArgs([options.bwrap, ...s, "--", `/proc/self/fd/${Tie}`, ...S])}`;
}
/**
 * 解析沙箱可达目录与可读目录的真实路径，检查可读目录是否在可达范围内。
 */
//@ chunk-e6aww6q8.js:898657-899158 placement
async function resolveSandboxRoots(plan) {
  let n = (S) =>
      realpath_12(S).catch(() => {
        return;
      }),
    r = uniq([
      ...plan.reach,
      ...(await Promise.all(plan.reach.map(n))).flatMap((S) => (S === void 0 ? [] : [S])),
    ]),
    s = new Map();
  for (let readableDir of plan.readableDirs) {
    let w = await n(readableDir);
    if (w === void 0) continue;
    if (!r.some((L) => isSameOrUnderPath(w, L))) return { unavailable: "root_outside_reach" };
    s.set(w, uniq([...(s.get(w) ?? []), readableDir]));
  }
  let h = [...s.keys()],
    mapped = h
      .filter((S) => !h.some((w) => isPathUnder(S, w)))
      .map((S) => ({ real: S, alsoAt: (s.get(S) ?? []).filter((w) => w !== S) }));
  return mapped.length > MAX_SANDBOX_ROOTS ? { unavailable: "too_many_roots" } : mapped;
}
/**
 * 检查沙箱视图是否会泄露：家目录在只读视图内（或视图包含家目录）返回 home_in_view，凭据路径在视图内返回 credentials_in_view。
 */
//@ chunk-e6aww6q8.js:899158-899492 placement
function sandboxViewLeak(e) {
  let flattened = e.roots.flatMap((root) => [root.real, ...root.alsoAt]),
    r = uniq([...SYSTEM_READONLY_PATHS, ...e.system.flatMap((s) => [s.real, s.at])]);
  if (
    e.homes.some(
      (home) => !isAbsolute_15(home) || flattened.some((h) => nM(home, h)) || r.some((h) => nM(h, home)),
    )
  )
    return "home_in_view";
  if (
    e.credentialPaths.some(
      (credentialPath) =>
        [...r, ...flattened].some((h) => nM(credentialPath, h)) ||
        flattened.some((h) => nM(h, credentialPath)),
    )
  )
    return "credentials_in_view";
  return;
}
/**
 * 解析系统视图候选路径的真实路径。
 */
//@ chunk-e6aww6q8.js:899492-900045 placement
async function resolveSystemViewPaths(e) {
  let n = (y) =>
      realpath_12(y).catch(() => {
        return;
      }),
    results = await Promise.all(
      e.candidates.map(async (candidate) => ({ at: candidate, real: await n(candidate) })),
    ),
    s = uniq([...e.reach, ...(await Promise.all(e.reach.map(n))).flatMap((y) => (y === void 0 ? [] : [y]))]),
    h = uniq([
      ...e.realPrefixes,
      ...results.flatMap(({ at: at, real: real }) => (real === void 0 ? [at] : [at, real])),
    ]);
  if (s.some((y) => h.some((S) => nM(y, S) || nM(S, y)))) return { unavailable: "reach_in_system_view" };
  return results.flatMap(({ at: at, real: real }) =>
    real !== void 0 &&
    (real === at || e.realPrefixes.some((realPrefixe) => isSameOrUnderPath(real, realPrefixe))) &&
    ![...e.homes, ...e.credentialPaths].some((w) => nM(real, w))
      ? [{ real: real, at: at }]
      : [],
  );
}
//@ chunk-e6aww6q8.js:900045-900110 placement
var gBt = 5000,
  sAo = 60000,
  iAo = 600000,
  hBt = ge(new Map(), (e) => e.clear());
/**
 * 检查当前环境能否为钩子提供沙箱（bwrap、seccomp 等）。
 */
//@ chunk-e6aww6q8.js:900110-901245 placement
async function checkHookSandboxAvailable(e) {
  let n = "";
  try {
    n = userInfo_2().homedir;
  } catch {}
  let r = uniq([e.home, n].filter((Ee) => Ee !== "")),
    s = uniq([...r, ...(await Promise.all(r.map((Ee) => realpath_12(Ee).catch(() => Ee))))]),
    h = await resolveSandboxRoots(e);
  if ("unavailable" in h) return h;
  let y = c0e(),
    S = await resolveSystemViewPaths({
      candidates: SYSTEM_READONLY_PATHS,
      realPrefixes: SYSTEM_REAL_PREFIXES,
      homes: s,
      credentialPaths: y,
      reach: e.reach,
    });
  if ("unavailable" in S) return S;
  let w = sandboxViewLeak({ roots: h, system: S, homes: s, credentialPaths: y });
  if (w !== void 0) return { unavailable: w };
  let L = await resolveProgramOnPathInReach("bwrap", e.pathValue, e.reach);
  if (L === void 0 || L === "in_reach") return { unavailable: "no_bubblewrap" };
  let G = xor(),
    q;
  if (G !== void 0) q = { kind: "embedded", argv0: G.argv0 };
  else {
    let Ee = await B6r();
    if (Ee === null || m_([Ee, await realpath_12(Ee).catch(() => Ee)], e.reach))
      return { unavailable: "no_seccomp_stage" };
    q = { kind: "file", path: Ee };
  }
  let Z = `${L}\x00${q.kind === "file" ? q.path : q.argv0}`,
    Se = hBt.get(Z),
    ke = Se;
  if (Se === void 0 || (Se.passed !== void 0 && Date.now() - Se.at >= (Se.passed ? iAo : sAo))) {
    let Ee = {
      at: Date.now(),
      outcome: probeBubblewrapVersion({ bwrap: L, seccomp: q, system: S, homes: s }).then(
        (Ae) => ((Ee.passed = Ae === void 0), Ae),
      ),
    };
    (hBt.set(Z, Ee), (ke = Ee));
  }
  let we = await ke?.outcome;
  return we === void 0 ? { bwrap: L, seccomp: q, roots: h, system: S, homes: s } : { unavailable: we };
}
/**
 * 探测 bubblewrap 版本，过旧时不在沙箱中运行项目钩子。
 */
//@ chunk-e6aww6q8.js:901245-902278 placement
async function probeBubblewrapVersion(e) {
  let n = await execFileNoThrow(e.bwrap, ["--version"], { timeout: gBt, cwd: "/", stdin: "ignore" });
  if (n.code !== 0 || parseVersionNumber(n.stdout) < parseVersionNumber(MIN_BWRAP_VERSION))
    return (
      logForDebugging(
        `[remote-tools] a project hook cannot be run in a sandbox on this machine (bubblewrap_too_old): bubblewrap --version does not say ${MIN_BWRAP_VERSION} or later`,
      ),
      "bubblewrap_too_old"
    );
  let r = async (h) =>
      (
        await execFileNoThrow(SANDBOX_SHELL, ["-c", h], {
          timeout: gBt,
          cwd: "/",
          stdin: "ignore",
          stdout: "ignore",
          stderr: "ignore",
        })
      ).code === 0,
    s;
  try {
    s = await realpath_12(await mkdtemp_5(join_43(tmpdir_4(), "hook-probe-")));
    let h = { ...e, roots: [], privateTmp: s, cwd: "/" },
      y = buildBwrapHookCommand(":", h);
    if (await r(y)) return;
    let S = e.seccomp.kind === "file" ? SECCOMP_HELPER_PATH : `/proc/self/fd/${Tie}`,
      w = (await r(y.replace(` -- ${S} ${SANDBOX_SHELL} -c `, ` -- ${SANDBOX_SHELL} -c `)))
        ? "no_seccomp_stage"
        : "bubblewrap_failed";
    return (
      logForDebugging(
        `[remote-tools] a project hook cannot be run in a sandbox on this machine (${w}): the trial run failed`,
      ),
      w
    );
  } catch (error) {
    return (
      logForDebugging(
        `[remote-tools] the trial run of a project hook's sandbox could not be made (${errorMessage(error)})`,
      ),
      "bubblewrap_failed"
    );
  } finally {
    if (s !== void 0) await rm_17(s, { recursive: !0, force: !0 }).catch(() => {});
  }
}
//@ chunk-e6aww6q8.js:902278-902382 placement
var SANDBOX_EXEC_PROFILE_PREFIX = `(version 1)
(deny default (with message "`,
  SHELL_TOKEN_RE = /[A-Za-z0-9_./:=@+,-]+|'[^']*'(?:"'"'[^']*')*/g;
/**
 * 判断项目钩子能否在沙箱中运行及使用哪种模式：平台不支持、个人沙箱开启但开关未开、存在 unix socket 授权或弱化配置、个人读规则等情况返回 unavailable 原因，否则返回 linux/person/locked 模式。
 */
//@ chunk-e6aww6q8.js:902382-903056 placement
function resolveHookSandboxMode(e) {
  let platform = getPlatform();
  if (platform !== "macos" && !(platform === "linux" && isLinuxHookSandboxEnabled()))
    return { unavailable: "platform" };
  let r =
    SandboxManager.isSandboxingEnabled() ||
    SandboxManager.getProxyPort() !== void 0 ||
    SandboxManager.getSocksProxyPort() !== void 0;
  if (r && !isPersonSandboxHookEnabled()) return { unavailable: "person_sandbox" };
  let mode = platform === "linux" ? "linux" : r ? "person" : "locked",
    config = SandboxManager.getConfig();
  if (
    mode === "locked" &&
    ((config?.network?.allowUnixSockets?.length ?? 0) > 0 ||
      config?.network?.allowAllUnixSockets === !0 ||
      (config !== void 0 && weakensSandboxIsolation(config, platform)) ||
      Object.keys(config?.ignoreViolations ?? {}).length > 0)
  )
    return { unavailable: "socket_grants" };
  if (
    (mode === "linux" && isFilesystemIsolationDisabledBySetting()) ||
    (mode === "locked" && config?.filesystem?.disabled === !0)
  )
    return { unavailable: "filesystem_off" };
  if (hasPersonalReadRestrictions(e)) return { unavailable: "person_read_rules" };
  return { mode: mode };
}
//@ chunk-e6aww6q8.js:903056-903081 placement
var HOSTCREDENTIAL = "hostCredential";
/**
 * 判断个人权限设置是否限制了读取（阻止工作目录外读取或有 Read 的拒绝/询问规则）。
 */
//@ chunk-e6aww6q8.js:903081-903463 placement
function hasPersonalReadRestrictions(e) {
  let n = (r) => permissionRuleValueFromString(r).toolName === FILE_READ_TOOL_NAME;
  return (
    e.blockReadsOutsideWorkingDirectories === !0 ||
    [e.alwaysDenyRules, e.alwaysAskRules].some((r) =>
      Object.entries(r).some(([s, h]) => s !== HOSTCREDENTIAL && h.some(n)),
    ) ||
    SETTING_SOURCES.some((r) => {
      let s = getSettingsForSourceTightenOnly(r),
        h = s?.sandbox;
      return (
        s?.permissions?.blockReadsOutsideWorkingDirectories === !0 ||
        (h?.filesystem?.denyRead?.length ?? 0) > 0 ||
        (h?.credentials?.files?.length ?? 0) > 0
      );
    })
  );
}
//@ chunk-e6aww6q8.js:903463-904086 placement
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
  ],
  mAo = [
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
  ],
  wBt = [
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
    uniq((await Promise.all(r.map(async (s) => [s, await realpath_11(s).catch(() => s)]))).flat());
  return {
    filesystem: {
      disabled: !1,
      allowWrite: [e.privateTmp],
      denyWrite: await n([
        ...e.projectRoots,
        e.home,
        ...BP().filter((r) => !r.startsWith("/dev/") || !wBt.includes(r)),
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
        ...c0e(),
      ]),
      allowRead: uniq([...(await n(mAo)), ...wBt, ...e.projectRoots, e.privateTmp]),
    },
    network: { allowedDomains: [], deniedDomains: [] },
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
  for (let [r, s] of Object.entries(e.judged))
    if (s !== void 0 && (r === "LANG" || r.startsWith("LC_"))) n[r] = s;
  return n;
}
/**
 * 把项目钩子包进沙箱运行，并在结束后清理。
 */
//@ chunk-e6aww6q8.js:904939-906087 placement
async function wrapProjectHookInSandbox(e, n, r, s, h) {
  let y;
  try {
    if (h.mode === "locked") y = await SandboxManager.wrapWithSandbox(e, SANDBOX_SHELL, n, r);
    else {
      let filesystem = n.filesystem;
      if (filesystem === void 0) throw Error("the hook has no filesystem lists");
      y = G6r({
        command: e,
        commandId: h.commandId,
        needsNetworkRestriction: !0,
        readConfig: {
          denyOnly: filesystem.denyRead.map(uy),
          allowWithinDeny: (filesystem.allowRead ?? []).map(uy),
        },
        writeConfig: {
          allowOnly: [...BP(), ...filesystem.allowWrite.map(uy)],
          denyWithinAllow: filesystem.denyWrite.map(uy),
        },
        allowPty: !1,
        binShell: SANDBOX_SHELL,
      });
    }
  } catch (error) {
    logForDebugging(
      `[remote-tools] a project hook could not be wrapped for the sandbox: ${errorMessage(error)}`,
      { level: "error" },
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
          { level: "warn" },
        );
      }
    },
  };
  if (!isExpectedSandboxExecCommand(y, e)) {
    (logForDebugging(
      "[remote-tools] what came back for a project hook is not a deny-by-default sandbox launch of it: not run",
      { level: "error" },
    ),
      S[Symbol.dispose]());
    return;
  }
  let w = !1;
  try {
    let L = resolveHookSandboxMode(s);
    w = "mode" in L && L.mode === h.mode;
  } catch (error) {
    logForDebugging(
      `[remote-tools] a wrapped project hook could not be checked against the sandbox plan: ${errorMessage(error)}`,
      { level: "error" },
    );
  }
  if (!w) {
    S[Symbol.dispose]();
    return;
  }
  return S;
}
//@ chunk-e6aww6q8.js:906087-906310 placement
function wrapLinuxHookCommand(e, n, r) {
  try {
    let s = resolveHookSandboxMode(r);
    if (!("mode" in s) || s.mode !== "linux") return;
    return { command: buildBwrapHookCommand(e, n), [Symbol.dispose]() {} };
  } catch (error) {
    logForDebugging(
      `[remote-tools] a project hook could not be wrapped for the sandbox: ${errorMessage(error)}`,
    );
    return;
  }
}
/**
 * 判断命令是否为预期形式的沙箱执行命令（跳过 -u 与环境变量赋值）。
 */
//@ chunk-e6aww6q8.js:906310-906616 placement
function isExpectedSandboxExecCommand(e, n) {
  let mapped = (e.match(SHELL_TOKEN_RE) ?? []).map((y) =>
      y.startsWith("'") ? y.slice(1, -1).replaceAll(`'"'"'`, "'") : y,
    ),
    s = 1;
  while (mapped[s] === "-u") s += 2;
  while (/^[A-Za-z_]\w*=/.test(mapped[s] ?? "")) s += 1;
  let h = mapped[s + 2] ?? "";
  return (
    mapped[0] === "env" &&
    h.startsWith(SANDBOX_EXEC_PROFILE_PREFIX) &&
    e === zee([...mapped.slice(0, s), "/usr/bin/sandbox-exec", "-p", h, SANDBOX_SHELL, "-c", n])
  );
}

export {
  c0e,
  scriptFileReaderDeps,
  G0,
  lBt,
  resolveHookSandboxMode,
  checkHookSandboxAvailable,
  nM,
  replaceCommandProgram,
  buildHookSandboxDevices,
  buildSandboxedHookEnv,
  wrapLinuxHookCommand,
  wrapProjectHookInSandbox,
  verifyPinnedScript,
  stageDeviceHooks,
  stagingFsDeps,
  n4s,
};
