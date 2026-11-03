/**
 * utils/instructionFileAccess.ts
 *
 * 2.1.316 新增：指令文件（CLAUDE.md 等）访问跟踪
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (73)
 * attribution: placement 73
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
  randomUUID,
  randomUUID as randomUUID_2,
  randomUUID as randomUUID_3,
  randomUUID as randomUUID_4,
  randomUUID as randomUUID_5,
  randomUUID as randomUUID_6,
  randomUUID as randomUUID_7,
  randomUUID as randomUUID_8,
  randomUUID as randomUUID_9,
  randomUUID as randomUUID_10,
  randomUUID as randomUUID_11,
  randomUUID as randomUUID_12,
  randomUUID as randomUUID_13,
  randomUUID as randomUUID_14,
  randomUUID as randomUUID_15,
  randomUUID as randomUUID_16,
  randomUUID as randomUUID_17,
  randomUUID as randomUUID_18,
  randomUUID as randomUUID_19,
  randomUUID as randomUUID_20,
  randomUUID as randomUUID_21,
  randomUUID as randomUUID_22,
  randomUUID as randomUUID_23,
  randomUUID as randomUUID_24,
  randomUUID as randomUUID_25,
  randomUUID as randomUUID_26,
  randomUUID as randomUUID_27,
  randomUUID as randomUUID_28,
  randomUUID as randomUUID_29,
  randomUUID as randomUUID_30,
  randomUUID as randomUUID_31,
  randomUUID as randomUUID_32,
  randomUUID as randomUUID_33,
  randomUUID as randomUUID_34,
  randomUUID as randomUUID_35,
  randomUUID as randomUUID_36,
  randomUUID as randomUUID_37,
  randomUUID as randomUUID_38,
  randomUUID as randomUUID_39,
  randomUUID as randomUUID_40,
  randomUUID as randomUUID_41,
  randomUUID as randomUUID_42,
  randomUUID as randomUUID_43,
  randomUUID as randomUUID_44,
  randomUUID as randomUUID_45,
  randomUUID as randomUUID_46,
  randomUUID as randomUUID_47,
  randomUUID as randomUUID_48,
  randomUUID as randomUUID_49,
  randomUUID as randomUUID_50,
} from "crypto";
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
import { setImmediate as lHo, setImmediate as THo } from "timers/promises";
import { SessionRootSlot } from "../bootstrap/sessionSlices.js";
import { ClaudeMdAccessTracker, q0o } from "./claudemd.js";
import { logForDebugging } from "./debug.js";
import { getIsNonInteractiveSession } from "../bootstrap/state.js";
import { truncatePathForDisplay } from "./invisibleChars.js";
import { plural } from "./stringUtils.js";
import { isSentinelInode } from "./slowOperations.js";
import { Qg, ai, isWslUncPath } from "./networkPaths.js";
import { getPlatform } from "./platform.js";
import { raceWithAbortSignal, withDeadline } from "./sleep.js";
import { getFsImplementation, walkPermissionCheckPathsAsync } from "./fsOperations.js";
import { isPathAbsent, getErrnoCode } from "./errors.js";
import { expandPath, expandStablePath } from "./path.js";
import { READ_LIMITS } from "./fsBoundRead.js";
import { cQt, openReadBoundToApproval, lastExistingIdentity } from "./fsSafety/pathRevalidation.js";
import {
  matchingRuleForInput,
  matchingDenyRuleForDirectoryContents,
  hasReadDenyRuleForPath,
  pathInWorkingPath,
  spellingsToJudge,
  declaredAbsoluteAdditionalDirectories,
  hasPermissionAuthoredBareReadDeny,
  hasReadDenyRuleInForce,
} from "./permissions/filesystem.js";
import { getContentRulesForToolName } from "./permissions/permissions.js";
import { FILE_READ_TOOL_NAME } from "../tools/FileReadTool/constants.js";

//@ chunk-e6aww6q8.js:1318890-1318918 placement
var ICe = new SessionRootSlot(() => new ClaudeMdAccessTracker());
/**
 * 从记忆索引内容中提取链接的相对路径（排除绝对路径、带协议的、含 .. 的），拼到记忆目录下。
 */
//@ chunk-e6aww6q8.js:1318918-1319092 placement
function indexLinkedMemoryPaths(e, n) {
  return [...e.matchAll(q0o)]
    .map((r) => r[1].trim())
    .filter((r) => !isAbsolute_24(r) && !/^[a-z][a-z0-9+.-]*:/i.test(r) && !r.split(/[\\/]/).includes(".."))
    .map((r) => join_54(n, r));
}
//@ chunk-e6aww6q8.js:1319092-1319152 placement = setCwdState (1)
function nfcLowerPath(cwd) {
  return resolve_21(cwd).normalize("NFC").toLowerCase();
}
//@ chunk-e6aww6q8.js:1319152-1319163 placement
var SM = 200;
/**
 * 指令文件未加载的原因说明（Read 拒绝规则、工作目录外、无法判定、无法确定指向）。
 */
//@ chunk-e6aww6q8.js:1319163-1319417 placement
var INSTRUCTION_WITHHELD_REASONS = {
  denied: "a Read deny rule covers it",
  outside: "it's read from outside your working directories, where reads are blocked",
  unjudged: "a Read deny rule couldn't be checked without a working directory",
  unsettled: "where it leads couldn't be worked out",
};
//@ chunk-e6aww6q8.js:1319455-1319531 placement
var Yb = new SessionRootSlot(() => ({
  owed: new Map(),
  logged: new Set(),
  token: randomUUID_17(),
  seen: new Set(),
}));
/**
 * 为未加载的指令文件记录调试日志（每个路径一次，总数有上限）。
 */
//@ chunk-e6aww6q8.js:1319531-1319680 placement
function logWithheldInstructionFiles(e, n) {
  let { logged: logged } = Yb.of(e);
  for (let { path: path, why: why } of n)
    if (!logged.has(path) && logged.size < SM)
      (logged.add(path),
        logForDebugging(`Instruction file not loaded: ${path} (${INSTRUCTION_WITHHELD_REASONS[why]})`));
}
/**
 * 记录因 Read 规则未加载的指令文件：写调试日志，交互会话中再登记到 owed 表（有上限），以便之后作为附件告知。
 */
//@ chunk-e6aww6q8.js:1319680-1319795 placement
function recordWithheldInstructionFiles(e, n) {
  let { owed: owed } = Yb.of(e);
  logWithheldInstructionFiles(e, n);
  for (let s of getIsNonInteractiveSession() ? [] : n)
    if (!owed.has(s.path) && owed.size < SM) owed.set(s.path, s);
}
//@ chunk-e6aww6q8.js:1319795-1319861 placement
function MVe(e, n) {
  let { owed: owed } = Yb.of(e);
  for (let s of n) owed.delete(s);
}
//@ chunk-e6aww6q8.js:1319861-1319957 placement
function OVe(e, n) {
  let { owed: owed } = Yb.of(e);
  for (let s of n) owed.delete(s);
  return Array.from(owed.values());
}
//@ chunk-e6aww6q8.js:1319957-1319973 placement
var PATH = "path:";
//@ chunk-e6aww6q8.js:1319973-1319984 placement
var y_e = 20;
/**
 * 从消息的 withheld_memory 附件中收集指定来源扣留的记忆文件路径。
 */
//@ chunk-e6aww6q8.js:1319984-1320238 placement
var withheldMemoryPaths = (e, n) =>
  new Set(
    e
      .flatMap((r) => (r.type === "attachment" ? [r.attachment] : []))
      .flatMap((r) => (r.type === "withheld_memory" ? [r] : []))
      .flatMap((r) => (r.by === n ? [r.entries] : []))
      .flatMap((r) => (Array.isArray(r) ? r : []))
      .flatMap((r) => (typeof r?.path === "string" ? [r.path] : [])),
  );
/**
 * 合并会话中已记录的与消息中出现的被扣留路径（记录数有上限）。
 */
//@ chunk-e6aww6q8.js:1320238-1320369 placement
function seenWithheldPaths(e, n) {
  let { seen: seen, token: token } = Yb.of(e.session),
    h = withheldMemoryPaths(n, token);
  for (let y of h) if (seen.size < SM) seen.add(y);
  return new Set([...seen, ...h]);
}
/**
 * 构造"指令文件未加载"提示的显示片段（原因说明、路径标记与截断后的路径）。
 */
//@ chunk-e6aww6q8.js:1320369-1320496 placement
var withheldInstructionNotice = (e, n) => ({
  lead: `Instruction file not loaded (${INSTRUCTION_WITHHELD_REASONS[e]}):`,
  mark: PATH,
  path: truncatePathForDisplay(n.replace(/\s+/g, " ")).replace(/\s+/g, " "),
});
//@ chunk-e6aww6q8.js:1320496-1320573 placement
var yfn = (e) => `and ${e.more} more instruction ${plural(e.more, "file")} not loaded`;
//@ chunk-e6aww6q8.js:1320573-1320641 placement
var fjt = (e) => ({ shown: e.slice(0, y_e), more: Math.max(e.length - y_e, 0) });
//@ chunk-e6aww6q8.js:1320687-1320698 placement
var NKe = [];
//@ chunk-e6aww6q8.js:1320698-1320744 placement
function P5t(e) {
  return NKe.map((n) => join_55(e, n));
}
//@ chunk-e6aww6q8.js:1320744-1320841 placement
function WGr(e, n) {
  if (n.managedInstructionsOnly) return e.filter((r) => r.type === "Managed");
  return e;
}
//@ chunk-e6aww6q8.js:1320841-1320897 placement = getFileIdentity (0.794)
var getFileIdentity_5 = (e, n) => !isSentinelInode(e.ino) && e.dev === n.dev && e.ino === n.ino;
//@ chunk-e6aww6q8.js:1320930-1320995 placement
var tB = (e) => Qg(e.replace(/^\/{2,}/, "/")) || (getPlatform() === "windows" && ai(e));
//@ chunk-e6aww6q8.js:1321031-1321043 placement
var iB = 1000;
//@ chunk-e6aww6q8.js:1321043-1321054 placement
var O5t = 50;
//@ chunk-e6aww6q8.js:1321054-1321065 placement
var I5t = 40;
//@ chunk-e6aww6q8.js:1321065-1321076 placement
var Q0o = 32;
//@ chunk-e6aww6q8.js:1321122-1321365 placement
async function isWalkUnresolved(e, n) {
  return e.unresolved &&
    e.reason === "unexamined" &&
    isWslUncPath(e.requested) &&
    dirname_32(e.stoppedAt) === parse_6(e.stoppedAt).root
    ? raceWithAbortSignal(
        getFsImplementation()
          .lstat(parse_6(e.stoppedAt).root)
          .then(
            () => !0,
            (s) => !isPathAbsent(s),
          ),
        n,
        () => Error("cut short"),
      ).catch(() => !0)
    : e.unresolved;
}
//@ chunk-e6aww6q8.js:1321410-1321508 placement
async function L5t(e, n) {
  let r = await walkPermissionCheckPathsAsync(e, n);
  return (await isWalkUnresolved(r, n)) ? void 0 : r.unresolved ? e : r.landing;
}
//@ chunk-e6aww6q8.js:1321508-1321553 placement
var UQ = (e, n) => raceWithAbortSignal(e, n, () => Error("cut short"));
//@ chunk-e6aww6q8.js:1321553-1321714 placement
async function isSymlinkPath(e) {
  try {
    return (await getFsImplementation().lstat(e)).isSymbolicLink();
  } catch (error) {
    if (!(
      !isPathAbsent(error) &&
      (await getFsImplementation()
        .openDirNoFollow(e)
        .then(
          () => !0,
          () => !1,
        ))
    ))
      throw error;
    return !1;
  }
}
//@ chunk-e6aww6q8.js:1321714-1321769 placement
var HVe = (e) => e.split("/").filter((n) => n !== "" && n !== ".");
/**
 * 不经 realpath 逐段解析路径中的符号链接（处理 ..、链接跳数上限、中断信号），返回解析后的路径；Windows 走另一实现，失败或越界返回 undefined。
 */
//@ chunk-e6aww6q8.js:1321769-1322269 placement
async function resolveSymlinksLexically(path, signal) {
  if (getPlatform() === "windows") return L5t(path, signal);
  let pending = HVe(path),
    resolved = "/",
    hops = 0;
  try {
    while (pending.length > 0 && hops <= I5t) {
      signal.throwIfAborted();
      let [y = "", ...S] = pending,
        w = y === "..",
        L = w ? dirname_33(resolved) : join_56(resolved, y);
      if (tB(L)) return S.includes("..") ? void 0 : join_56(L, ...S);
      let G = !w && (await UQ(isSymlinkPath(L), signal)),
        q = G
          ? await UQ(getFsImplementation().readlink(L), signal).catch(() => {
              return;
            })
          : "";
      if (q === void 0) return;
      let startsWith = q.startsWith("/");
      ((pending = [...HVe(q), ...S]), (hops += G ? 1 : 0), (resolved = startsWith ? "/" : G ? resolved : L));
    }
    return hops > I5t ? void 0 : resolved;
  } catch (error) {
    let [, ...S] = pending;
    return isPathAbsent(error) && !S.includes("..") ? join_56(resolved, ...pending) : void 0;
  }
}
/**
 * 收集一个路径为做读权限判断所需的全部拼写（各级符号链接展开后的路径与着陆点），超出上限或无法解析时返回 undefined。
 */
//@ chunk-e6aww6q8.js:1322269-1322586 placement
async function pathSpellingsForRead(e, n) {
  let r = isAbsolute_25(e) ? e : expandPath(e),
    s = new Set([r]);
  for (let h of s) {
    let y = await walkPermissionCheckPathsAsync(h, n);
    if (n.aborted || (await isWalkUnresolved(y, n))) return;
    (y.spellings.forEach((spelling) => s.add(spelling)), s.add(y.unresolved ? h : y.landing));
    let w = h === r && s.size > 1 && getPlatform() !== "windows" ? await resolveSymlinksLexically(r, n) : h;
    if (w === void 0 || s.size > Q0o) return;
    s.add(w);
  }
  return Array.from(s);
}
//@ chunk-e6aww6q8.js:1322586-1322686 placement
async function spellingsUnchanged(e, n, r) {
  let s = await pathSpellingsForRead(e, r);
  return s?.length === n.length && s.every((h, y) => h === n[y]);
}
//@ chunk-e6aww6q8.js:1322686-1322744 placement
var F5t = async (e, n, r) =>
  (await resolveSymlinksLexically(e, r)) === resolve_22(e) && spellingsUnchanged(e, n, r);
//@ chunk-e6aww6q8.js:1322814-1322952 placement
async function withNoSymlinkLeaf(e, n) {
  let r = !tB(e);
  if (r && (await isSymlinkPath(e).catch(() => !0))) return;
  let h = await n(e);
  return r && (await isSymlinkPath(e).catch(() => !0)) ? void 0 : h;
}
//@ chunk-e6aww6q8.js:1322952-1323026 placement
function $5t(e) {
  if (!["ELOOP", "ENOTDIR"].includes(getErrnoCode(e) ?? "")) throw e;
  return;
}
/**
 * 在 Linux/WSL 上先以 O_DIRECTORY|O_NOFOLLOW 打开目录并钉住，通过 /proc/self/fd 路径执行回调（目录真实路径须在允许列表内）；其他平台或无法取得真实路径时直接按原路径执行。
 */
//@ chunk-e6aww6q8.js:1323026-1323360 placement
async function withPinnedDir(e, n, r) {
  if (!["linux", "wsl"].includes(getPlatform())) return withNoSymlinkLeaf(e, r);
  await using h = await open_13(
    e,
    constants_16.O_RDONLY | constants_16.O_DIRECTORY | constants_16.O_NOFOLLOW | READ_LIMITS,
  ).catch($5t);
  if (h === void 0) return;
  let S = `/proc/self/fd/${h.fd}`,
    w = await cQt(h.fd).catch(() => null),
    L = w === void 0,
    G = typeof w === "string" && n.includes(w);
  return L ? withNoSymlinkLeaf(e, r) : G ? await r(S) : void 0;
}
//@ chunk-e6aww6q8.js:1323360-1323415 placement
var B5t = (e) =>
  function (r) {
    if (!e.aborted) throw r;
    return;
  };
/**
 * 在路径拼写集不变的前提下读取目录：Linux 上以 O_NOFOLLOW 打开目录并经 /proc/self/fd 读取，读完再确认拼写未变，否则放弃。
 */
//@ chunk-e6aww6q8.js:1323415-1323603 placement
async function readDirIfSpellingsStable(e, n, r) {
  let timeout = AbortSignal.timeout(iB),
    h = await resolveSymlinksLexically(e, timeout);
  if (!(h !== void 0 && n.includes(h))) return;
  let S = await UQ(withPinnedDir(h, n, r), timeout).catch(B5t(timeout));
  return (await spellingsUnchanged(e, n, timeout)) ? S : void 0;
}
//@ chunk-e6aww6q8.js:1323603-1323703 placement = getReservedShortcuts (1)
async function checkPathRefused(e, n, r) {
  let s = getPlatform() === "macos";
  return openReadBoundToApproval(
    expandStablePath(e),
    n,
    r,
    s ? await lastExistingIdentity(n) : void 0,
    "refused",
  );
}
/**
 * 生成一个读文件函数：用 checkPathRefused 打开并固定目标，确认是普通文件后回调读取，并在读后核对文件身份（inode 不可信时重新检查）。
 */
//@ chunk-e6aww6q8.js:1323703-1324021 placement
var readPinnedFile = (e, n, r) =>
  async function (h) {
    let y = await checkPathRefused(e, n, r).catch(() => {
      return;
    });
    if (y === void 0) return;
    try {
      let stats = await y.handle.stat({ bigint: !0 }),
        L = stats.isFile() ? await h(y, stats) : void 0;
      return (
        isSentinelInode(stats.ino)
          ? await F5t(e, n, r)
          : getFileIdentity_5(stats, await getFsImplementation().statBigint(y.canonicalPath))
      )
        ? L
        : void 0;
    } catch {
      return;
    } finally {
      await y.close().catch(() => {});
    }
  };
/**
 * 为附带读取的文件暂存一次读权限（生成 attached-read 工具调用 id；macOS 上同时记录文件身份），返回带该 id 的上下文。
 */
//@ chunk-e6aww6q8.js:1324059-1324295 placement
async function stashAttachedReadPermission(e, n, r) {
  let s = `attached-read-${randomUUID_18()}`,
    h = expandStablePath(e),
    y = getPlatform() === "macos",
    S = y ? await lastExistingIdentity(n) : null;
  if ((r.session.writePermissionStash.stash(s, h, n, "read"), y))
    r.session.writePermissionStash.stashIdentity(s, h, S);
  return { ...r, toolUseId: s };
}
//@ chunk-e6aww6q8.js:1324295-1324369 placement = isFileReadDenied (1)
var isFileReadDenied = (filePath, toolPermissionContext) =>
  filePath.some(
    (r) => matchingRuleForInput(r, toolPermissionContext, "read", "deny", { isDirectory: !0 }) !== null,
  );
//@ chunk-e6aww6q8.js:1324369-1324441 placement = isFileReadDenied (1)
var isFileReadDenied_2 = (filePath, toolPermissionContext) =>
  filePath.some((r) => matchingDenyRuleForDirectoryContents(r, toolPermissionContext, "read") !== null) ||
  hasReadDenyRuleForPath(filePath.at(0) ?? "", toolPermissionContext, filePath);
/**
 * 创建读取节流器：每到一定数量的读取就等前一批全部完成并让出一次，返回本次读取完成时调用的 resolve。
 */
//@ chunk-e6aww6q8.js:1324490-1324705 placement
function createReadThrottle() {
  let e = 0,
    resolved = Promise.resolve(),
    r = [];
  return async function () {
    if (e > 0 && e % O5t === 0) ((resolved = Promise.all([resolved, ...r]).then(() => lHo())), (r = []));
    e += 1;
    let withResolvers = Promise.withResolvers();
    return ((r = [...r, withResolvers.promise]), await resolved, withResolvers.resolve);
  };
}
//@ chunk-e6aww6q8.js:1324705-1324790 placement
var b_e = async (e, n) =>
  !tB(e) &&
  (await raceWithAbortSignal(isSymlinkPath(e), n, () => Error("cut short")).then(() => !1, isPathAbsent));
//@ chunk-e6aww6q8.js:1324844-1325132 placement
async function spellingsBelowFirstLink(e, n) {
  let filtered = e
      .slice(parse_7(e).root.length)
      .split(sep_33)
      .filter((y) => y !== ""),
    root = parse_7(e).root,
    h = [root];
  for (let [y, S] of filtered.entries()) {
    if (!(h !== void 0 && !h.some(tB))) return;
    if (await b_e(join_57(root, S), n)) {
      let L = join_57(...filtered.slice(y));
      return h?.map((G) => join_57(G, L));
    }
    ((root = join_57(root, S)), (h = await pathSpellingsForRead(root, n)));
  }
  return;
}
//@ chunk-e6aww6q8.js:1325132-1325176 placement
var T_e = async (e, n) => (await pathSpellingsForRead(e, n)) ?? spellingsBelowFirstLink(e, n);
/**
 * 检查路径展开后各段的实际拼写是否与预期完全一致（含 .. 或特殊段时不比较）。
 */
//@ chunk-e6aww6q8.js:1325176-1325354 placement
async function matchesExpectedSpellings(e, n, r) {
  let h =
    !e.split(/[\\/]/).includes("..") && !n.some(tB) && (await b_e(expandPath(e), r))
      ? await T_e(expandPath(e), r)
      : void 0;
  return h?.length === n.length && h.every((y, S) => y === n[S]);
}
//@ chunk-e6aww6q8.js:1325384-1325477 placement
var v_e = (e, n, r) =>
  n.some((s) => r.some((h) => pathInWorkingPath(e, join_58(s, ...h), { caseFold: !1, uncShapeParity: !0 })));
//@ chunk-e6aww6q8.js:1325477-1325563 placement
var E_e = (e, n, r) => ({
  ...e,
  isHeldOutside: (s, h) => e.isHeldOutside(s, h) && !v_e(s, spellingsToJudge(n), r),
});
//@ chunk-e6aww6q8.js:1325563-1325576 placement
var kM = 30000;
//@ chunk-e6aww6q8.js:1325612-1325678 placement
var K5t = (e) =>
  e.folders
    .filter((folder) => isAbsolute_26(folder))
    .concat(declaredAbsoluteAdditionalDirectories(e.context));
//@ chunk-e6aww6q8.js:1325678-1325767 placement
function V5t(e, n) {
  let r = e.get(n);
  if (r !== void 0) return r;
  let h = spellingsToJudge(n);
  return (e.set(n, h), h);
}
//@ chunk-e6aww6q8.js:1325767-1325780 placement
var Y5t = [[]];
//@ chunk-e6aww6q8.js:1325780-1325924 placement
function outsideWorkingDirsReason(e, n) {
  if (e === void 0) return "unsettled";
  let s = K5t(n),
    h = new Map();
  return e.some((S) => !s.some((w) => v_e(S, V5t(h, w), Y5t))) ? "outside" : void 0;
}
/**
 * 生成受读规则保护的指令文件读取器：算出路径拼写、用判定函数得出拒绝原因；允许时在超时与大小上限内安全读取文本，否则返回 {why}。
 */
//@ chunk-e6aww6q8.js:1325924-1326303 placement
var makeGuardedInstructionReader = (e, n) =>
  async function (s, h) {
    let timeout = AbortSignal.timeout(n),
      S = await pathSpellingsForRead(s, timeout),
      w = e(S),
      L =
        S !== void 0 &&
        w === void 0 &&
        (await withDeadline(
          getFsImplementation()
            .stat(s)
            .catch(() => null),
          n,
        )),
      G =
        S !== void 0 &&
        L &&
        L.isFile() &&
        L.size <= h &&
        (await readPinnedFile(s, S, timeout)(async (Z, Se) => (Se.size > h ? void 0 : Z.handle.readFile()))),
      q = L === void 0 || (G === void 0 && timeout.aborted);
    return G ? { text: G.toString("utf8"), why: void 0 } : { text: void 0, why: q ? "unsettled" : w };
  };
//@ chunk-e6aww6q8.js:1326303-1326380 placement
var Q5t = (e) =>
  (hasPermissionAuthoredBareReadDeny(e) && "denied") ||
  (getContentRulesForToolName(e, FILE_READ_TOOL_NAME, "deny").length > 0 && "unjudged") ||
  void 0;
//@ chunk-e6aww6q8.js:1326380-1326449 placement
var J5t = (e) =>
  withDeadline(
    getFsImplementation()
      .lstat(e)
      .then(
        (n) => !n.isDirectory(),
        () => !1,
      ),
    iB,
  );
//@ chunk-e6aww6q8.js:1326449-1326573 placement
var withWithheldReporting = (e, n) =>
  async function (s, h) {
    let y = await e(s, h),
      S = y.why !== void 0 && (await J5t(s)) !== !1;
    return (n(s, S ? y.why : void 0), y.text);
  };
/**
 * --restricted 或"禁止读工作目录外"时，构造指令文件读取器 {within, above}，读不到时登记原因；两者都未开启时返回 undefined。
 */
//@ chunk-e6aww6q8.js:1326573-1326813 placement
function restrictedInstructionReaders(e, n) {
  let r = Q5t(e.context),
    s = r !== void 0;
  if (!s && e.context.restricted !== !0 && e.context.blockReadsOutsideWorkingDirectories !== !0) return;
  let y = withWithheldReporting(
    s
      ? async () => ({ text: void 0, why: r })
      : makeGuardedInstructionReader((S) => outsideWorkingDirsReason(S, e), kM),
    n,
  );
  return { within: y, above: () => y };
}
//@ chunk-e6aww6q8.js:1326813-1326992 placement
function instructionReadRefusal(e, n) {
  let r = e !== void 0 && isFileReadDenied_2(e, n.context),
    s = e !== void 0 && !r && e.some((h) => n.isHeldOutside(h, n.context));
  return (e === void 0 && "unsettled") || (r && "denied") || (s && "outside") || void 0;
}
//@ chunk-e6aww6q8.js:1326992-1327027 placement
var dB = (e, n) => makeGuardedInstructionReader((r) => instructionReadRefusal(r, e), n);
//@ chunk-e6aww6q8.js:1327027-1327083 placement
var VVe =
  (e, n = iB) =>
  async (r, s) =>
    (await dB(e, n)(r, s)).text;
//@ chunk-e6aww6q8.js:1327083-1327134 placement
var YVe = (e, n) => (n === void 0 ? VVe(e, kM) : withWithheldReporting(dB(e, kM), n));
//@ chunk-e6aww6q8.js:1327134-1327209 placement
var C_e = (e, n) => isFileReadDenied_2(e, n.context) || e.some((r) => n.isHeldOutside(r, n.context));
//@ chunk-e6aww6q8.js:1327209-1327291 placement
async function Mq(e, n, r) {
  let s = await pathSpellingsForRead(e, r);
  return s === void 0 || C_e(s, n) ? void 0 : s;
}
//@ chunk-e6aww6q8.js:1327291-1327438 placement
var INSTRUCTION_FILE_NAMES = [
  ...NKe.map((e) => [e]),
  ["CLAUDE.md"],
  ["CLAUDE.local.md"],
  ["AGENTS.md"],
  [".claude", "CLAUDE.md"],
  [".claude", "AGENTS.md"],
  [".claude", "rules"],
];
//@ chunk-e6aww6q8.js:1327438-1327516 placement
var yHo = (e, n) => ({
  within: withWithheldReporting(dB(e, kM), n),
  above: (r) => withWithheldReporting(dB(E_e(e, r, INSTRUCTION_FILE_NAMES), kM), n),
});
//@ chunk-e6aww6q8.js:1327516-1327546 placement
var t3t = [[".claude", "rules"]];
//@ chunk-e6aww6q8.js:1327546-1327612 placement
var SHo = (e, n) => ({ within: YVe(e, n), above: (r) => YVe(E_e(e, r, t3t), n) });
//@ chunk-e6aww6q8.js:1327642-1327724 placement
var Q_ = (e) =>
  hasReadDenyRuleInForce(e) || e.restricted === !0 || e.blockReadsOutsideWorkingDirectories === !0;

export {
  fjt,
  withheldInstructionNotice,
  yfn,
  NKe,
  ICe,
  nfcLowerPath,
  indexLinkedMemoryPaths,
  SM,
  logWithheldInstructionFiles,
  restrictedInstructionReaders,
  Q_,
  yHo,
  P5t,
  Mq,
  isFileReadDenied_2,
  isFileReadDenied,
  O5t,
  Yb,
  OVe,
  seenWithheldPaths,
  iB,
  WGr,
  SHo,
  MVe,
  recordWithheldInstructionFiles,
  createReadThrottle,
  pathSpellingsForRead,
  C_e,
  readDirIfSpellingsStable,
  stashAttachedReadPermission,
  checkPathRefused,
  readPinnedFile,
  PATH,
  INSTRUCTION_WITHHELD_REASONS,
  y_e,
  withheldMemoryPaths,
  matchesExpectedSpellings,
  tB,
  T_e,
  VVe,
  kM,
};
