/**
 * utils/hooks/hookCommandResolution.ts
 *
 * 2.1.316 新增：钩子命令程序解析
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (28)
 * attribution: placement 28
 */
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
  access,
  access as access_2,
  access as access_3,
  readlink,
  readlink as readlink_2,
  readlink as readlink_3,
  readlink as readlink_4,
  readlink as readlink_5,
  readlink as readlink_6,
  readlink as readlink_7,
  readlink as readlink_8,
  readlink as readlink_9,
  readlink as readlink_10,
  readlink as readlink_11,
  readlink as readlink_12,
  stat,
  stat as stat_2,
  stat as stat_3,
  stat as stat_4,
  stat as stat_5,
  stat as stat_6,
  stat as stat_7,
  stat as stat_8,
  stat as stat_9,
  stat as stat_10,
  stat as stat_11,
  stat as stat_12,
  stat as stat_13,
  stat as stat_14,
  stat as stat_15,
  stat as stat_16,
  stat as stat_17,
  stat as stat_18,
  stat as stat_19,
  stat as stat_20,
  stat as stat_21,
  stat as stat_22,
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
  delimiter,
  delimiter as delimiter_2,
  delimiter as delimiter_3,
  delimiter as delimiter_4,
  resolve as resolve_2,
  resolve as resolve_3,
  resolve as resolve_4,
  resolve as resolve_5,
  resolve as resolve_6,
  resolve as resolve_7,
  resolve as resolve_8,
  resolve as resolve_9,
  resolve as resolve_10,
  resolve as resolve_11,
  resolve as resolve_12,
  resolve as resolve_13,
  resolve as resolve_14,
  resolve as resolve_15,
  resolve as resolve_16,
  resolve as resolve_17,
  resolve as resolve_18,
  resolve as resolve_19,
  resolve as resolve_20,
  resolve as resolve_21,
  resolve as resolve_22,
  resolve as resolve_23,
  resolve as resolve_24,
  resolve as resolve_25,
  resolve as resolve_26,
  resolve as resolve_27,
  resolve as resolve_28,
  resolve as resolve_29,
  resolve as resolve_30,
  resolve as resolve_31,
  resolve as resolve_32,
  resolve as resolve_33,
  resolve as resolve_34,
  resolve as resolve_35,
  resolve as resolve_36,
  resolve as resolve_37,
  resolve as resolve_38,
  resolve as resolve_39,
  resolve as resolve_40,
  resolve as resolve_41,
  resolve as resolve_42,
  resolve as resolve_43,
  resolve as resolve_44,
  resolve as resolve_45,
  resolve as resolve_46,
  resolve as resolve_47,
  resolve as resolve_48,
  resolve as resolve_49,
  resolve as resolve_50,
  resolve as resolve_51,
  resolve as resolve_52,
  resolve as resolve_53,
  resolve as resolve_54,
  resolve as resolve_55,
  resolve as resolve_56,
  resolve as resolve_57,
  resolve as resolve_58,
  resolve as resolve_59,
  resolve as resolve_60,
} from "path";
import { userInfo, userInfo as userInfo_2 } from "os";
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
import { getErrnoCode } from "../errors.js";
import { uniq } from "../collections.js";
import { subprocessEnv, hipaaCredentialScrubKeys } from "../subprocessEnv.js";
import { m_ } from "../settings/stickyRoots.js";
import { normalizeCommandForPlatform } from "../git.js";
import { BUILD_TOOL_ENV_VARS, cSe } from "../git/builderGit/gitEnv.js";
import { Ile } from "../settings/policyHelper/helperExec.js";
import { parseShebangArgs } from "./hookCommandAnalysis.js";
import { getGlobalClaudeFile } from "../env.js";
import { getSurfacedHookSpawnFailures } from "../../bootstrap/state.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { enqueueTaskNotification as enqueueTaskNotification_2 } from "../task/taskNotifications.js";
import { logError } from "../log.js";
import { B8 } from "../path.js";
import { HostScoped } from "../hostScoped.js";

//@ chunk-e6aww6q8.js:829244-829372 placement
function omitKeys(e, n) {
  let r = new Set(typeof n === "string" ? [n] : n);
  return Object.fromEntries(Object.entries(e).filter(([s]) => !r.has(s)));
}
/**
 * 求路径的真实路径，允许末端不存在（拼回缺失部分）。
 */
//@ chunk-e6aww6q8.js:829372-829685 placement
async function realpathAllowMissing(e) {
  let n = "";
  for (let r = e; ;)
    try {
      let s = await realpath_7(r);
      if (!isAbsolute_12(s)) return "unreadable";
      return join_37(s, n);
    } catch (error) {
      let h = getErrnoCode(error);
      if (h !== "ENOENT" && h !== "ENOTDIR") return "unreadable";
      if (
        await lstat_19(r).then(
          (S) => S.isSymbolicLink(),
          () => !1,
        )
      )
        return "unreadable";
      let y = dirname_21(r);
      if (y === r) return "absent";
      ((n = join_37(basename_14(r), n)), (r = y));
    }
}
//@ chunk-e6aww6q8.js:829685-829917 placement
function mergeHookEnv({
  attached: attached,
  beforeSettings: beforeSettings,
  ownEnv: ownEnv,
  childrenSee: childrenSee,
}) {
  if (beforeSettings === void 0) return { ...attached };
  return Object.fromEntries(
    uniq([...Object.keys(attached), ...Object.keys(ownEnv).filter(childrenSee)]).map((h) => [
      h,
      Object.hasOwn(ownEnv, h)
        ? ownEnv[h]
        : attached[h] === beforeSettings[h]
          ? attached[h]
          : beforeSettings[h],
    ]),
  );
}
//@ chunk-e6aww6q8.js:829917-829999 placement = resolveOptions (0.831)
function resolveOptions(options) {
  if (options.HOME) return options.HOME;
  try {
    return userInfo().homedir;
  } catch {
    return "/";
  }
}
//@ chunk-e6aww6q8.js:829999-830020 placement
var $2e = "/var/empty";
//@ chunk-e6aww6q8.js:830020-830076 placement
function pjt(e) {
  return { ...omitKeys(e.base, e.omit), ...e.extra };
}
/**
 * 在 PATH 中解析钩子命令对应的程序。
 */
//@ chunk-e6aww6q8.js:830076-831105 placement
async function resolveHookProgramOnPath(e, n = subprocessEnv(), r = n) {
  let s = async (Se) => {
      if (!isAbsolute_12(Se)) return !1;
      let ke = await realpathAllowMissing(Se);
      return (
        ke !== "unreadable" && !m_([Se, ...(ke === "absent" ? [] : [ke])].map(normalizeCommandForPlatform), e)
      );
    },
    h = async (Se) => {
      if (!isAbsolute_12(Se)) return !1;
      let ke = await realpathAllowMissing(Se);
      return (
        ke === "unreadable" || m_([Se, ...(ke === "absent" ? [] : [ke])].map(normalizeCommandForPlatform), e)
      );
    },
    y = async (Se) => (await Promise.all(Se.split(delimiter_2).map(h))).some(Boolean),
    S = async (Se) =>
      (await Promise.all(Se.split(delimiter_2).map(async (ke) => ((await s(ke)) ? [ke] : [])))).flat(),
    w = new Set(BUILD_TOOL_ENV_VARS),
    L = new Set(hipaaCredentialScrubKeys().map((Se) => Se.toUpperCase())),
    G = L.size > 0 ? subprocessEnv() : {},
    q = {},
    Z = [];
  for (let Se of Object.keys(n)) {
    let ke = n[Se];
    if (ke === void 0) continue;
    if (L.size > 0 && L.has(Ile(Se))) {
      let we = G[Se];
      if (we === void 0) Z.push(Se);
      else if (we !== ke) q[Se] = we;
    } else if (w.has(Se)) {
      let we = await S(ke);
      if (Se === "PATH") q.PATH = we.length > 0 ? we.join(delimiter_2) : $2e;
      else if (we.length > 0) q[Se] = we.join(delimiter_2);
      else Z.push(Se);
    } else if (cSe(Se)) Z.push(Se);
    else if (await y(ke)) Z.push(Se);
    else if (r[Se] !== ke) q[Se] = ke;
  }
  for (let Se of Object.keys(r)) if (r[Se] !== void 0 && n[Se] === void 0) Z.push(Se);
  return { base: n, extra: q, omit: Z };
}
/**
 * 在 PATH 各目录中查找可执行程序并判断是否位于云会话可写范围：PATH 含相对目录即视为在范围内；跟随符号链接（有深度限制）检查目标与所在目录。
 */
//@ chunk-e6aww6q8.js:831105-832040 placement
async function resolveProgramOnPathInReach(
  cwd,
  searchPath,
  r,
  { linkScreen: s = !0, childStartsInReach: h = !0, depth: depth = 0 } = {},
) {
  for (let S of searchPath.split(delimiter_2)) {
    if (!isAbsolute_12(S)) return "in_reach";
    let candidate = join_37(S, cwd);
    if (
      !(await access(candidate, constants_10.X_OK).then(
        () => !0,
        () => !1,
      ))
    ) {
      if (
        await lstat_19(candidate).then(
          (Se) => Se.isSymbolicLink(),
          () => !1,
        )
      ) {
        let Se = await readlink_3(candidate).then(
            (we) => resolve_15(dirname_21(candidate), we),
            () => {
              return;
            },
          ),
          ke = Se === void 0 ? "unreadable" : await realpathAllowMissing(Se);
        if (
          ke === "unreadable" ||
          m_(
            [candidate, ...(Se === void 0 ? [] : [Se]), ...(ke === "absent" ? [] : [ke])].map(
              normalizeCommandForPlatform,
            ),
            r,
          )
        )
          return "in_reach";
      }
      continue;
    }
    let G = await realpathAllowMissing(candidate);
    if (G === "unreadable") return "in_reach";
    let q =
      G === "absent"
        ? void 0
        : await stat_9(G).catch((Z) => (Z.code === "ENOENT" || Z.code === "ENOTDIR" ? void 0 : "unreadable"));
    if (q === "unreadable") return "in_reach";
    if (!q?.isFile()) continue;
    if (m_([candidate, G].map(normalizeCommandForPlatform), r)) return "in_reach";
    if (s && q.nlink > 1 && !(await isNativeBinaryFile(G))) return "in_reach";
    if (depth <= 1) {
      if (
        (await resolveHookCommand(candidate, searchPath, r, {
          linkScreen: s,
          childStartsInReach: h,
          depth: depth,
        })) !== void 0
      )
        return "in_reach";
    } else if (await hHt(G)) return "in_reach";
    return candidate;
  }
  return;
}
//@ chunk-e6aww6q8.js:832040-832228 placement
async function isSuspiciousHardLinkedFile(e) {
  let n = await stat_9(e).catch((r) =>
    r.code === "ENOENT" || r.code === "ENOTDIR" ? "absent" : "unreadable",
  );
  if (n === "absent") return !1;
  return n === "unreadable" || (n.nlink > 1 && !(await isNativeBinaryFile(e)));
}
/**
 * 判断文件是否为原生可执行文件（读取文件头魔数）。
 */
//@ chunk-e6aww6q8.js:832228-832545 placement
async function isNativeBinaryFile(e) {
  let n = await open_8(e, "r").catch(() => {
    return;
  });
  if (n === void 0) return !1;
  try {
    let alloc = Buffer.alloc(4),
      { bytesRead: bytesRead } = await n.read(alloc, 0, 4, 0);
    if (bytesRead < 4) return !1;
    let uInt32BE = alloc.readUInt32BE(0);
    return (
      uInt32BE === 2135247942 ||
      uInt32BE === 4277009102 ||
      uInt32BE === 4277009103 ||
      uInt32BE === 3472551422 ||
      uInt32BE === 3489328638 ||
      uInt32BE === 3405691582
    );
  } finally {
    await n.close();
  }
}
//@ chunk-e6aww6q8.js:832545-832664 placement
function xqs(e) {
  return (
    e === "-" ||
    e === "--" ||
    /^--[a-z][a-z-]*$/.test(e) ||
    (/^-[A-Za-z]{1,3}$/.test(e) && !/^-[IMmr]./.test(e))
  );
}
//@ chunk-e6aww6q8.js:832664-832745 placement
async function hHt(e) {
  let n = await readFileHead(e, 2);
  return n === void 0 || n.startsWith("#!");
}
/**
 * 解析钩子命令：确定程序与 shebang 是否存在、可读，供沙箱与固定使用。
 */
//@ chunk-e6aww6q8.js:832745-834284 placement
async function resolveHookCommand(
  e,
  n,
  r,
  { linkScreen: s = !0, childStartsInReach: h = !0, depth: y = 0 } = {},
) {
  let S = await realpathAllowMissing(e);
  if (S === "unreadable") return "unreadable";
  let w =
    S === "absent"
      ? "absent"
      : await stat_9(S).catch((ke) => (ke.code === "ENOENT" || ke.code === "ENOTDIR" ? "absent" : void 0));
  if (w === void 0) return "unreadable";
  if (w === "absent" || !w.isFile()) return;
  if (s && w.nlink > 1 && !(await isNativeBinaryFile(S))) return "program_unresolved";
  let L = await readFileHead(S, 512);
  if (L === void 0) return y === 0 ? "unreadable" : void 0;
  if (!L.startsWith("#!")) return;
  let parts = L.slice(
      2,
      L.includes(`
`)
        ? L.indexOf(`
`)
        : void 0,
    )
      .replace(/^[ \t]+|[ \t]+$/g, "")
      .split(/[ \t]+/),
    q = parts[0];
  if (q === void 0 || !isAbsolute_12(q)) return "shebang_in_reach";
  if (parts.some((ke) => /[^\x21-\x7e]/.test(ke))) return "program_unresolved";
  let Z = normalizeCommandForPlatform(q) === "/usr/bin/env" || normalizeCommandForPlatform(q) === "/bin/env";
  if (normalizeCommandForPlatform(basename_14(q)) === "env" && !Z) return "program_unresolved";
  if (Z) {
    let flattened = parts.slice(1).flatMap((Ie) => Ie.split(/[ \t]+/)),
      we = flattened[0] === "-S" ? flattened.slice(1) : flattened,
      Ee = we[0];
    if (
      Ee === void 0 ||
      Ee.startsWith("-") ||
      Ee.includes("=") ||
      Ee.includes("/") ||
      !parseShebangArgs(we.slice(1), Ee, { childStartsInReach: h })
    )
      return "program_unresolved";
    let Ae = await resolveProgramOnPathInReach(Ee, n, r, {
      linkScreen: s,
      childStartsInReach: h,
      depth: y + 1,
    });
    return Ae === void 0 ? "program_unresolved" : Ae === "in_reach" ? "shebang_in_reach" : void 0;
  }
  if (!parseShebangArgs(parts.slice(1), basename_14(q), { childStartsInReach: h }))
    return "program_unresolved";
  let Se = await realpathAllowMissing(q);
  if (Se === "unreadable") return "unreadable";
  if (Se !== "absent" && m_([q, Se].map(normalizeCommandForPlatform), r)) return "shebang_in_reach";
  if (Se === "absent") return;
  if (y < 2) return resolveHookCommand(q, n, r, { linkScreen: s, childStartsInReach: h, depth: y + 1 });
  return (await hHt(Se)) ? "program_unresolved" : void 0;
}
//@ chunk-e6aww6q8.js:834284-834499 placement
async function readFileHead(e, n) {
  let r = await open_8(e, "r").catch(() => {
    return;
  });
  if (r === void 0) return;
  try {
    let alloc = Buffer.alloc(n),
      { bytesRead: bytesRead } = await r.read(alloc, 0, n, 0);
    return alloc.subarray(0, bytesRead).toString("utf8");
  } finally {
    await r.close();
  }
}
//@ chunk-e6aww6q8.js:834499-834573 placement
function Pqs(e, n) {
  return e.legacyEnvPin === void 0 ? n : (e.legacyEnvPin ?? void 0);
}
//@ chunk-e6aww6q8.js:834573-834671 placement
function M3n(e, n) {
  if (e.legacyEnvPin === void 0) e.legacyEnvPin = n ?? null;
  return e.legacyEnvPin ?? void 0;
}
//@ chunk-e6aww6q8.js:834671-834840 placement
async function _Ht(e, n) {
  let r = getGlobalClaudeFile();
  if (e === void 0 || !isAbsolute_11(r)) return;
  let s = await realpath_6(r).catch(() => {
    return;
  });
  if (s === void 0 || (await isSuspiciousHardLinkedFile(s)) || m_([r, s].map(normalizeCommandForPlatform), n))
    return;
  return e;
}
//@ chunk-e6aww6q8.js:834840-835067 placement
var GIT_FOR_WINDOWS_LINK = "Git for Windows (https://git-scm.com/downloads/win)",
  INSTALL_GIT_FOR_WINDOWS = `Install ${GIT_FOR_WINDOWS_LINK}`,
  NO_BASH_FIX_HINT =
    'put the program in "command" and its arguments in "args", or set "shell" to "powershell" on a command written for PowerShell',
  NO_BASH = "no-bash";
//@ chunk-e6aww6q8.js:835067-835636 placement
function describeNoBashFallback(e) {
  try {
    let n = getSurfacedHookSpawnFailures();
    if (n.has(NO_BASH)) return;
    (n.add(NO_BASH),
      logEvent("tengu_shell_no_bash_fallback", { source: fromEnum(e) }),
      enqueueTaskNotification_2({
        type: "system",
        subtype: "informational",
        content: `Git Bash wasn't found, so ${e === "skill" ? "a skill's shell command" : `a ${e} hook`} ran in PowerShell. Commands written for bash can fail there. ${INSTALL_GIT_FOR_WINDOWS} and start a new session, or ${e === "skill" || e === "StatusLine" || e === "FileSuggestion" ? 'set "shell" to "powershell" on commands written for PowerShell' : NO_BASH_FIX_HINT}.`,
        level: "warning",
        tag: "no_bash_shell",
      }));
  } catch (error) {
    logError(Error("Failed to send the no-bash notice", { cause: error }));
  }
}
//@ chunk-e6aww6q8.js:945437-945735 placement
var FILE_EXTENSION_RE = /\.[A-Za-z][A-Za-z0-9]*$/,
  REDIRECT_TOKEN_RE = /^(?:\d*|&)[<>]/,
  REDIRECT_OPERATOR_RE = /^(?:\d*|&)[<>]{1,2}$/,
  INTERPRETER_SCRIPT_VAR_RE =
    /^\s*(?:\/(?:[\w.-]+\/)*)?(?:python[\d.]*|perl|sh|bash|dash)[ \t]+(\$(?:\{(?:CLAUDE_PLUGIN_ROOT|CLAUDE_PROJECT_DIR|HOME)\}|(?:CLAUDE_PLUGIN_ROOT|CLAUDE_PROJECT_DIR|HOME)\b)[\w./-]*)(?:[ \t]+[\w./=:@%+,-]+)*\s*$/;
/**
 * 展开钩子命令中的 ${CLAUDE_PROJECT_DIR}、${CLAUDE_PLUGIN_ROOT}。
 */
//@ chunk-e6aww6q8.js:945735-946439 placement
function expandHookPathVariables({
  command: command,
  args: args,
  pluginRoot: pluginRoot,
  projectDir: projectDir,
  homeDir: homeDir,
  windowsBash: windowsBash,
  posixShell: posixShell,
}) {
  let w = args === void 0,
    L = w ? splitHookCommandWords(command) : [command, ...args],
    G = w && posixShell ? INTERPRETER_SCRIPT_VAR_RE.exec(command)?.[1] : void 0,
    q = [];
  for (let Z of L) {
    if (!FILE_EXTENSION_RE.test(Z)) continue;
    let replaced = Z.replaceAll("${CLAUDE_PROJECT_DIR}", () => projectDir);
    if (pluginRoot !== void 0) replaced = replaced.replaceAll("${CLAUDE_PLUGIN_ROOT}", () => pluginRoot);
    if (w) {
      if (
        ((replaced = replaced
          .replace(/^(?:~(?=[\\/])|\$HOME\b|\$\{HOME\})/, () => homeDir)
          .replace(/\$CLAUDE_PROJECT_DIR\b/g, () => projectDir)),
        pluginRoot !== void 0)
      )
        replaced = replaced.replace(/\$CLAUDE_PLUGIN_ROOT\b/g, () => pluginRoot);
      if (windowsBash && replaced.startsWith("/")) replaced = B8(replaced);
    }
    if (/[$`*?[]/.test(replaced) || !isAbsolute_17(replaced)) continue;
    q.push({ path: replaced, cutFrom: void 0 });
    let ke = Z === G ? /^[^ \t\n]+(?= )/.exec(replaced)?.[0] : void 0;
    if (ke !== void 0) q.push({ path: ke, cutFrom: replaced });
  }
  return q;
}
/**
 * 把 hook 命令行按 shell 规则拆成单词（处理引号与转义）。
 */
//@ chunk-e6aww6q8.js:946439-946779 placement
function splitHookCommandWords(e) {
  let n = [],
    r = "",
    s = !1,
    h;
  for (let y = 0; y < e.length; y++) {
    let S = e[y];
    if (h !== void 0) {
      if (S === h) h = void 0;
      else r += S;
      continue;
    }
    if (S === '"' || S === "'") ((h = S), (s = !0));
    else if (S === "\\" && y + 1 < e.length) ((r += e[++y]), (s = !0));
    else if (/\s/.test(S)) {
      if (s) (n.push(r), (r = ""), (s = !1));
    } else ((r += S), (s = !0));
  }
  if (s) n.push(r);
  return n.filter((y, S) => !REDIRECT_TOKEN_RE.test(y) && !REDIRECT_OPERATOR_RE.test(n[S - 1] ?? ""));
}
//@ chunk-e6aww6q8.js:946779-946918 placement
var CANNOT_OPEN_SCRIPT_RE =
  /^(?:(?:[A-Za-z]:\\[^:]*|[^\s:]+): )?(?:\d+: )?(?:[Cc]an't|cannot) open (?:file |perl script )?(?:(['"])(.+?)\1[:( ]|([^'"]+?): )/;
/**
 * 钩子失败时判断输出是否只是"无法打开脚本"错误（如 can't open file 'x'），若每行都指向钩子命令中的脚本路径，返回缺失的脚本集合，用于给出更明确的提示。
 */
//@ chunk-e6aww6q8.js:946918-947406 placement
async function detectMissingHookScript({ stdout: stdout, stderr: stderr, scriptPaths: scriptPaths }) {
  if (scriptPaths.length === 0 || (stdout.trim() && stderr.trim())) return;
  let s = stderr.trim() ? stderr : stdout,
    filtered = s
      .split(
        `
`,
      )
      .map((L) => L.trim())
      .filter(Boolean);
  if (filtered.length === 0) return;
  let y = new Map();
  for (let L of scriptPaths) y.set(xUt(L), L);
  let S = new Set();
  for (let L of filtered) {
    let match = CANNOT_OPEN_SCRIPT_RE.exec(L),
      q = match?.[2] ?? match?.[3],
      Z = q === void 0 ? void 0 : y.get(xUt(q));
    if (Z === void 0) return;
    S.add(Z);
  }
  for (let L of S)
    if (
      await access_2(L, constants_14.R_OK).then(
        () => !0,
        () => !1,
      )
    )
      return;
  let [w] = S;
  return w === void 0 ? void 0 : { scriptPath: w, output: s };
}
//@ chunk-e6aww6q8.js:947406-947500 placement
function xUt(e) {
  let replaced = e.replace(/[\\/]+/g, "/");
  return /^[A-Za-z]:\//.test(replaced) ? replaced.toLowerCase() : replaced;
}
//@ chunk-e6aww6q8.js:947500-947534 placement
var mxo = 64,
  YBr = new HostScoped(() => new Map());
//@ chunk-e6aww6q8.js:947534-947704 placement
function rememberBounded(e, n, r) {
  if (r === void 0) return (e.delete(n), !1);
  if (e.get(n) === r) return !0;
  if ((e.delete(n), e.set(n, r), e.size > mxo)) {
    let [s] = e.keys();
    if (s !== void 0) e.delete(s);
  }
  return !1;
}
//@ chunk-e6aww6q8.js:947704-947712 placement
var PUt;

export {
  omitKeys,
  detectMissingHookScript,
  rememberBounded,
  YBr,
  describeNoBashFallback,
  pjt,
  INSTALL_GIT_FOR_WINDOWS,
  NO_BASH_FIX_HINT,
  expandHookPathVariables,
  _Ht,
  mergeHookEnv,
  resolveHookProgramOnPath,
  resolveOptions,
  realpathAllowMissing,
  resolveProgramOnPathInReach,
  resolveHookCommand,
  $2e,
  M3n,
  GIT_FOR_WINDOWS_LINK,
  PUt,
  xqs,
  isSuspiciousHardLinkedFile,
  Pqs,
};
