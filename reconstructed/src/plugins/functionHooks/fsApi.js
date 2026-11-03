/**
 * plugins/functionHooks/fsApi.ts
 *
 * 2.1.316 新增：插件 $.fs 接口（受限文件访问、祖先目录查找）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (14)
 * attribution: placement 14
 */
import {
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
  parse,
  parse as parse_2,
  parse as parse_3,
  parse as parse_4,
  parse as parse_5,
  parse as parse_6,
  parse as parse_7,
  parse as parse_8,
  parse as parse_9,
  parse as parse_10,
  parse as parse_11,
  parse as parse_12,
  parse as parse_13,
  parse as parse_14,
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
import {
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
  mkdir,
  mkdir as mkdir_2,
  mkdir as mkdir_3,
  mkdir as mkdir_4,
  mkdir as mkdir_5,
  mkdir as mkdir_6,
  mkdir as mkdir_7,
  mkdir as mkdir_8,
  mkdir as mkdir_9,
  mkdir as mkdir_10,
  mkdir as mkdir_11,
  mkdir as mkdir_12,
  mkdir as mkdir_13,
  mkdir as mkdir_14,
  mkdir as mkdir_15,
  mkdir as mkdir_16,
  mkdir as mkdir_17,
  mkdir as mkdir_18,
  mkdir as mkdir_19,
  mkdir as mkdir_20,
  mkdir as mkdir_21,
  mkdir as mkdir_22,
  mkdir as mkdir_23,
  mkdir as mkdir_24,
  mkdir as mkdir_25,
  mkdir as mkdir_26,
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
  readdir,
  readdir as readdir_2,
  readdir as readdir_3,
  readdir as readdir_4,
  readdir as readdir_5,
  readdir as readdir_6,
  readdir as readdir_7,
  readdir as readdir_8,
  readdir as readdir_9,
  readdir as readdir_10,
  readdir as readdir_11,
  readdir as readdir_12,
  readdir as readdir_13,
  readdir as readdir_14,
  readdir as readdir_15,
  readdir as readdir_16,
  readdir as readdir_17,
  readdir as readdir_18,
  readdir as readdir_19,
  readdir as readdir_20,
  readdir as readdir_21,
  readdir as readdir_22,
  readdir as readdir_23,
  readdir as readdir_24,
  readdir as readdir_25,
  readdir as readdir_26,
  readdir as readdir_27,
  readdir as readdir_28,
  readdir as readdir_29,
  readdir as readdir_30,
  readdir as readdir_31,
  readdir as readdir_32,
} from "fs/promises";
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
import { getOriginalCwd, getRootSession } from "../../bootstrap/state.js";
import { isClaudeMdLoadingDisabled } from "../../utils/settings/customizationDisabled.js";
import {
  isInstructionSourceEnabled,
  createHeldPathTracker,
  getWorktreeRoots,
  isInMainRepoOutsideWorktree,
  isInstructionsMemoryType_3,
} from "../../utils/claudemd.js";
import { logForDebugging } from "../../utils/debug.js";
import { wt } from "../../remote/remoteMode.js";
import { getCurrentProjectConfig, getMemoryPath } from "../../utils/config.js";
import { normalizePathForCompare } from "../../utils/file.js";
import { MVe, recordWithheldInstructionFiles, Q_, VVe, kM } from "../../utils/instructionFileAccess.js";
import { getCwd } from "../../utils/cwd.js";
import { HooksError } from "./hooksErrors.js";
import { isNetworkOrDevicePath } from "./ui/imageSource.js";
import { getPlatform } from "../../utils/platform.js";
import { getErrnoCode, errorMessage } from "../../utils/errors.js";
import { Htr, Ltr } from "../../utils/attachmentMedia.js";
import { mergePersistedDenyRules } from "../../utils/permissions/permissions.js";
import { getToolPermissionContext } from "../../utils/permissions/toolPermissionContext.js";
import { requireBoundSession } from "./sessionApi.js";
import { isRestrictedReadBlocked } from "../../utils/claudeInChrome/fileUpload.js";
import { validateNamesArg, zKt, checkFsReadArgs, checkFsStatArgs } from "./panes.js";
import { getErrnoPath } from "./apiDispatch.js";

//@ chunk-e6aww6q8.js:3725242-3725299 placement
var freeze_18 = Object.freeze(["AGENTS.md", ".claude/AGENTS.md"]);
/**
 * 插件 $.fs.ancestors：列出项目、用户、托管设置的祖先目录；项目记忆关闭或工作区在远端时拒绝。
 */
//@ chunk-e6aww6q8.js:3725299-3726779 placement
async function fsAncestors(e, n, { start: r = getOriginalCwd(), below: s, held: h, session: y } = {}) {
  if (isClaudeMdLoadingDisabled() || !isInstructionSourceEnabled("projectSettings"))
    return (logForDebugging(`$.fs.ancestors (${n}): project memory is off`), []);
  if (wt()) return (logForDebugging(`$.fs.ancestors (${n}): the workspace is remote`), []);
  let w = s === void 0 ? void 0 : s.endsWith(sep_55) ? s : `${s}${sep_55}`,
    L = [],
    G = r;
  while (G !== parse_12(G).root) {
    if (w !== void 0 && !G.startsWith(w)) break;
    (L.push(G), (G = dirname_54(G)));
  }
  let q = getOriginalCwd(),
    Z = new Set(s === void 0 ? L.filter((Et) => Et !== q && !q.startsWith(`${Et}${sep_55}`)) : L),
    Se = new Set(e.filter((Et) => !/^(\.claude[\\/])?[^\\/]+$/.test(Et))),
    ke = e.length > 0 && (Z.size > 0 || (Se.size > 0 && L.length > 0)),
    we = y !== void 0 && e.some((Et) => !Se.has(Et)) && L.length > Z.size,
    Ee = we && e.some((Et) => freeze_18.includes(Et)),
    Ae = we && e.some((Et) => !Se.has(Et) && !freeze_18.includes(Et)),
    Ie = ke ? h?.() : void 0,
    Me = Ee ? createHeldPathTracker(y) : void 0,
    We = Me?.held,
    ze = Ae ? createHeldPathTracker(y).held : void 0,
    lt = getWorktreeRoots(q),
    Je = getCurrentProjectConfig().hasClaudeMdExternalIncludesApproved ?? !1,
    nt = new Set([getMemoryPath("Managed"), getMemoryPath("User")].map(normalizePathForCompare)),
    pt = [];
  for (let Et of L.reverse()) {
    if (isInMainRepoOutsideWorktree(Et, lt)) continue;
    let yt = Et === q ? ze?.within : ze?.above(Et),
      gt = Et === q ? We?.within : We?.above(Et);
    for (let At of e) {
      let It = freeze_18.includes(At) ? gt : yt,
        Yt = await isInstructionsMemoryType_3(
          join_95(Et, At),
          "Project",
          nt,
          Je,
          0,
          void 0,
          void 0,
          void 0,
          Z.has(Et) || Se.has(At) ? Ie : It,
        );
      if (Yt.length > 0)
        pt.push({
          dir: Et,
          name: At,
          content: Yt.map((qt) => qt.content).join(`

`),
          parts: Yt.map((qt) => ({ path: qt.path, content: qt.content })),
        });
    }
  }
  if (
    (logForDebugging(`$.fs.ancestors (${n}): ${e.join(", ")} found ${pt.length} of ${L.length} directories`),
    Me !== void 0 && y !== void 0)
  )
    (MVe(y, Me.loaded()), recordWithheldInstructionFiles(y, Me.withheld()));
  return pt;
}
//@ chunk-e6aww6q8.js:3726779-3726840 placement
var _rt = (e) => (e.isFile() ? "file" : e.isDirectory() ? "dir" : "other");
//@ chunk-e6aww6q8.js:3727137-3727301 placement
function candidatePaths(e, n) {
  let replaced = n.replace(/^\\\\\?\\(?=[A-Za-z]:[\\/])/, "");
  if (isAbsolute_48(replaced)) return [replaced];
  let s = dirname_56(e),
    h = s.endsWith(sep_56) ? s : `${s}${sep_56}`;
  return [replaced, `${h}${replaced}`, resolve_41(s, replaced)];
}
//@ chunk-e6aww6q8.js:3727301-3727315 placement
var YIn = 65536;
/**
 * 插件 $.fs.* 的统一拒绝出口：说明为何不可访问（网络位置、Windows 限制、资源繁忙）。
 */
//@ chunk-e6aww6q8.js:3727315-3729142 placement
async function refuseFsAccess(e, n, r) {
  let s = resolve_40(r ?? getCwd(), e.path);
  function h(S) {
    return (
      logForDebugging(`$.fs.${e.event} (${n}): ${s} refused: ${S}`),
      new HooksError(`${n}: $.fs.${e.event}: ${e.path} refused: ` + S)
    );
  }
  if (isNetworkOrDevicePath(e.path) || isNetworkOrDevicePath(s))
    throw h("a network location is not reached from here");
  try {
    switch (e.event) {
      case "read": {
        let S = getPlatform() === "windows",
          w = await open_19(s, S ? "r" : constants_20.O_RDONLY | constants_20.O_NONBLOCK);
        try {
          let L = [],
            G = 0;
          for (;;) {
            let allocUnsafe = Buffer.allocUnsafe(YIn),
              ke;
            try {
              ke = (await w.read(allocUnsafe, 0, allocUnsafe.length, null)).bytesRead;
            } catch (error) {
              let Ee = getErrnoCode(error);
              if (Ee === "EAGAIN" || Ee === "EWOULDBLOCK") break;
              throw error;
            }
            if (ke === 0) break;
            if (((G += ke), G > Htr)) throw h(`the file is over the ${Htr}-byte limit`);
            L.push(allocUnsafe.subarray(0, ke));
          }
          let buffer = Buffer.concat(L);
          return e.as === "bytes" ? { base64: buffer.toString("base64") } : buffer.toString("utf8");
        } finally {
          await w.close();
        }
      }
      case "write": {
        let byteLength = Buffer.byteLength(e.text, "utf8");
        if (byteLength > Ltr) throw h(`${byteLength} bytes is over the ${Ltr}-byte limit`);
        (await mkdir_19(dirname_55(s), { recursive: !0 }),
          await writeFile_12(s, e.text, "utf8"),
          logForDebugging(`$.fs.write (${n}): ${s} (${byteLength} bytes)`));
        return;
      }
      case "exists":
        return await stat_20(s).then(
          () => !0,
          () => !1,
        );
      case "stat": {
        let S = await lstat_33(s),
          isSymbolicLink = S.isSymbolicLink(),
          L = isSymbolicLink && !candidatePaths(s, await readlink_7(s)).some(isNetworkOrDevicePath),
          G = !isSymbolicLink
            ? S
            : L
              ? await stat_20(s).catch((Se) => {
                  let ke = getErrnoCode(Se);
                  if (ke === "ENOENT" || ke === "ENOTDIR" || ke === "ELOOP") return;
                  throw Se;
                })
              : void 0,
          q = G ?? S,
          Z = e.resolve && G !== void 0;
        return {
          kind: _rt(q),
          size: q.size,
          mtimeMs: q.mtimeMs,
          isLink: isSymbolicLink,
          ...(Z && { realPath: await realpath_30(s) }),
        };
      }
      case "list": {
        let S = await readdir_26(s, { withFileTypes: !0 }),
          w = [];
        for (let L of S) {
          let q = L.isFile()
            ? await stat_20(resolve_40(s, L.name)).catch(() => {
                return;
              })
            : void 0;
          w.push({
            name: L.name,
            kind: _rt(L),
            size: q?.size ?? 0,
            mtimeMs: q?.mtimeMs ?? 0,
            isLink: L.isSymbolicLink(),
          });
        }
        return (w.sort((L, G) => L.name.localeCompare(G.name)), w);
      }
    }
  } catch (error) {
    if (error instanceof HooksError) throw error;
    throw (
      logForDebugging(`$.fs.${e.event} (${n}): ${s} failed: ` + errorMessage(error)),
      new HooksError(`${n}: $.fs.${e.event}(${e.path}) failed: ` + (getErrnoCode(error) ?? "no errno"))
    );
  }
}
//@ chunk-e6aww6q8.js:3729142-3729308 placement
function readDenyRulesForAncestors(e) {
  let n = mergePersistedDenyRules(
    getToolPermissionContext(
      requireBoundSession(e, "$.fs.ancestors off the start-up walk").toolContext(new AbortController()),
    ),
  );
  return Q_(n) ? VVe({ context: n, isHeldOutside: isRestrictedReadBlocked }, kM) : void 0;
}
//@ chunk-e6aww6q8.js:3729308-3729362 placement
var Irt = "a network location is not reached from here";
//@ chunk-e6aww6q8.js:3729362-3729388 placement
function eDn() {
  return getRootSession();
}
/**
 * $.fs.ancestors 表项：拒绝网络位置，从 of（默认原始 cwd）向上查找给定文件名，可用 below 限定上界，受拒绝规则约束。
 */
//@ chunk-e6aww6q8.js:3729388-3729847 placement
var FS_ANCESTORS_API = {
  check: validateNamesArg,
  raise: () => ({ field: "of", at: getOriginalCwd() }),
  run: async (e, n) => {
    let r = getOriginalCwd(),
      found = [e.of, e.below].find(
        (S) => S !== void 0 && (isNetworkOrDevicePath(S) || isNetworkOrDevicePath(resolve_39(r, S))),
      );
    if (found !== void 0)
      throw (
        logForDebugging(`$.fs.ancestors (${n.plugin}): ${resolve_39(r, found)} refused: ${Irt}`),
        new HooksError(`${n.plugin}: $.fs.ancestors: ${found} refused: ` + Irt)
      );
    let h = e.of === void 0 ? r : resolve_39(r, e.of),
      y = e.below === void 0 ? void 0 : resolve_39(r, e.below);
    return fsAncestors(e.names, n.plugin, {
      start: h === r ? r : dirname_53(h),
      below: y,
      held: () => readDenyRulesForAncestors(n.plugin),
      session: eDn(),
    });
  },
};
//@ chunk-e6aww6q8.js:3729847-3729933 placement
var nDn = {
  check: zKt,
  raise: getErrnoPath,
  run: (e, n) => refuseFsAccess({ event: "list", path: e.path }, n.plugin, n.cwd),
};
//@ chunk-e6aww6q8.js:3729933-3730027 placement
var rDn = {
  check: checkFsReadArgs,
  raise: getErrnoPath,
  run: (e, n) => refuseFsAccess({ event: "read", path: e.path, as: e.as }, n.plugin, n.cwd),
};
/**
 * $.fs.stat 表项：校验参数后以插件身份执行 stat。
 */
//@ chunk-e6aww6q8.js:3730027-3730131 placement
var FS_STAT_API = {
  check: checkFsStatArgs,
  raise: getErrnoPath,
  run: (e, n) => refuseFsAccess({ event: "stat", path: e.path, resolve: e.resolve }, n.plugin, n.cwd),
};
/**
 * $.fs.write 表项：校验路径与文本后以插件身份写文件。
 */
//@ chunk-e6aww6q8.js:3730131-3730319 placement
var FS_WRITE_API = {
  check: (e) => zKt(e) ?? (typeof e?.text === "string" ? void 0 : "takes the text to write"),
  raise: getErrnoPath,
  run: (e, n) =>
    refuseFsAccess({ event: "write", path: e.path, text: e.text }, n.plugin, n.cwd).then(() => {
      return;
    }),
};

export { rDn, FS_WRITE_API, nDn, refuseFsAccess, FS_STAT_API, FS_ANCESTORS_API, fsAncestors };
