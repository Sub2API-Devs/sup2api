/**
 * utils/hooks/servedHooks/hookPins.ts
 *
 * 2.1.316 新增：钩子命令固定（pin）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (15)
 * attribution: placement 15
 */
import {
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
  relative,
  relative as relative_2,
  relative as relative_3,
  relative as relative_4,
  relative as relative_5,
  relative as relative_6,
  relative as relative_7,
  relative as relative_8,
  relative as relative_9,
  relative as relative_10,
  relative as relative_11,
  relative as relative_12,
  relative as relative_13,
  relative as relative_14,
  relative as relative_15,
  relative as relative_16,
  relative as relative_17,
  relative as relative_18,
  relative as relative_19,
  relative as relative_20,
  relative as relative_21,
  relative as relative_22,
  relative as relative_23,
  relative as relative_24,
  relative as relative_25,
  relative as relative_26,
  relative as relative_27,
  relative as relative_28,
  relative as relative_29,
  relative as relative_30,
  relative as relative_31,
  relative as relative_32,
  relative as relative_33,
  relative as relative_34,
  relative as relative_35,
  relative as relative_36,
  relative as relative_37,
  relative as relative_38,
  relative as relative_39,
  relative as relative_40,
  relative as relative_41,
  relative as relative_42,
  relative as relative_43,
  relative as relative_44,
  relative as relative_45,
  relative as relative_46,
  relative as relative_47,
  relative as relative_48,
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
import {
  tmpdir as tmpdir_2,
  tmpdir as tmpdir_3,
  tmpdir as tmpdir_4,
  tmpdir as tmpdir_5,
  tmpdir as tmpdir_6,
} from "os";
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
import { DoctorLazy } from "../../../cli/handlers/util.js";
import { u, T, o, pe, Ir } from "../../../../vendor/zod/v4/classic/schemas.js";
import { servedCallsDir } from "../../../remote/tools/servedCallLog.js";
import { computeContentHash } from "../../commitAttribution.js";
import { getFileReader } from "../../fileStore.js";
import { isENOENT, errorMessage } from "../../errors.js";
import { jsonParseRaw, toJsonLine, jsonStringify } from "../../slowOperations.js";
import {
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
} from "./hookSandbox.js";
import { resolveOptions, $2e, pjt } from "../hookCommandResolution.js";
import { logForDebugging } from "../../debug.js";
import { SETTING_SOURCES } from "../../settings/constants.js";
import { getSettingsForSource } from "../../settings/settings.js";
import { sortKeysDeep } from "../../settings/settingsSourceTrust.js";
import { foldPathSegments } from "../../plugins/pluginCachePaths.js";
import { truncateToLength, wh } from "../../stringUtils.js";
import { READ_LIMITS, mMe } from "../../fsBoundRead.js";
import { getProjectConfigRoot } from "../../../bootstrap/state.js";
import { analyzeHookCommand, checkScriptFile } from "../hookCommandAnalysis.js";
import { pathsOverlapForPlatform, m_ } from "../../settings/stickyRoots.js";
import { verifyOpenedPath } from "../../fsSafety/hardenedRead.js";
import { z0 } from "./hostPaths.js";
import {
  logServedHookHeld_2,
  projectHookUnavailable,
  runServedHook,
  sandboxFallbackAsk,
  runServedHookProcess,
} from "./runServedHook.js";
import { uniq } from "../../collections.js";
import {
  BHt,
  hookScriptChangedQuestion,
  XWe,
  HOOK_UPDATED_NOT_ACCEPTED_QUESTION,
  HOOK_CHANGED_ASKING_PERSON,
  HOOK_CHANGED_ASKS_INSTEAD,
} from "./notices.js";
import { claudeTempDir, tmpdir } from "../../tempDir.js";
import { getPlatform } from "../../platform.js";
import { createCombinedAbortSignal } from "../../combinedAbortSignal.js";
import { shellQuoteArgs } from "../../bash/bashPipeCommand.js";

//@ chunk-e6aww6q8.js:906646-906863 placement
var HOOK_PINS_VERSION = 1,
  hookPinsFileSchema = DoctorLazy(() =>
    u({
      version: T(HOOK_PINS_VERSION),
      project: o(),
      pins: pe(
        o().regex(/^[0-9a-f]{64}$/),
        Ir("kind", [
          u({ kind: T("script"), path: o(), sha256: o().regex(/^[0-9a-f]{64}$/) }),
          u({ kind: T("inline") }),
          u({ kind: T("unpinnable") }),
        ]),
      ),
    }),
  );
//@ chunk-e6aww6q8.js:906863-906935 placement
function ABt(e) {
  return join_44(servedCallsDir(), `hook-pins-${computeContentHash(e).slice(0, 32)}.jsonl`);
}
//@ chunk-e6aww6q8.js:906935-907173 placement
async function readAcceptedHookPins(e) {
  let n;
  try {
    n = await getFileReader().read(ABt(e));
  } catch (error) {
    return isENOENT(error) ? void 0 : new Map();
  }
  try {
    let safeParse = hookPinsFileSchema().safeParse(jsonParseRaw(n.trim()));
    return safeParse.success && safeParse.data.project === e
      ? new Map(Object.entries(safeParse.data.pins))
      : new Map();
  } catch {
    return new Map();
  }
}
//@ chunk-e6aww6q8.js:907173-907314 placement
async function writeAcceptedHookPins(e, n) {
  (await getFileReader().mkdir(servedCallsDir(), 448),
    await getFileReader().atomicWrite(
      ABt(e),
      toJsonLine({ version: HOOK_PINS_VERSION, project: e, pins: Object.fromEntries(n) }),
      384,
    ));
}
//@ chunk-e6aww6q8.js:907314-907377 placement
var RAo = "/var/tmp",
  DBt = 10,
  CAo = 2048,
  AAo = 256,
  xAo = 120,
  PAo = 3,
  MAo = 3;
/**
 * 接入时创建项目 hook 固定状态：记录项目命令 hook，失败时记录日志。
 */
//@ chunk-e6aww6q8.js:907377-907868 placement
function createProjectHookPinsState(e) {
  if (!G0()) return;
  return {
    pinned: pinProjectCommandHooks(e.projectDir, e.launchDir, resolveOptions(e.envAtAttach)).catch(
      (n) => (
        logForDebugging(
          `[remote-tools] could not record this project's command hooks at attach (${errorMessage(n)}); none is run`,
        ),
        { current: new Map(), accepted: new Map() }
      ),
    ),
    strikes: new Map(),
    stopped: new Set(),
    changedSinceAttach: new Set(),
    setAside: new Set(),
    setAsideAsked: new Map(),
    declinedSetAside: new Set(),
    seen: new Set(),
    shownChanged: new Set(),
    acceptedUpdated: new Set(),
    updatedAsks: new Map(),
    declinedChangedSinceLast: new Set(),
    said: new Set(),
  };
}
/**
 * 汇总各设置源的 PreToolUse 命令 hook 并固定其脚本摘要。
 */
//@ chunk-e6aww6q8.js:907868-908202 placement
async function pinProjectCommandHooks(e, n, r) {
  let flattened = SETTING_SOURCES.flatMap((S) =>
      (getSettingsForSource(S)?.hooks?.PreToolUse ?? []).flatMap((w) =>
        w.hooks.flatMap((hook) =>
          hook.type === "command" ? [{ key: UBt(w.matcher ?? "", hook), hook: hook }] : [],
        ),
      ),
    ),
    results = await Promise.all([e, n].map((S) => realpath_8(S).catch(() => S))),
    y = new Map();
  for (let { key: key, hook: hook } of flattened) y.set(key, await pinCommandHook(hook, e, r, results));
  return { current: y, accepted: await readAcceptedHookPins(e) };
}
/**
 * 保存本次会话已见过的 hook 固定项。
 */
//@ chunk-e6aww6q8.js:908202-908576 placement
async function saveSeenHookPins(e) {
  let projectHooks = e.projectHooks;
  if (projectHooks === void 0) return;
  try {
    let { current: r, accepted: accepted } = await projectHooks.pinned;
    if (projectHooks.seen.size === 0) return;
    let h = accepted === void 0 ? projectHooks.seen : projectHooks.shownChanged,
      y = new Map(accepted);
    for (let S of h) {
      let w = r.get(S)?.pin;
      if (w !== void 0) y.set(S, w);
    }
    await writeAcceptedHookPins(e.projectDir, y);
  } catch (error) {
    logForDebugging(
      `[remote-tools] could not record this project's command hooks for next time (${errorMessage(error)})`,
    );
  }
}
//@ chunk-e6aww6q8.js:908576-908631 placement
function UBt(e, n) {
  return computeContentHash(jsonStringify(sortKeysDeep({ matcher: e, hook: n })));
}
//@ chunk-e6aww6q8.js:908631-908777 placement
function isSameHookPin(e, n) {
  return (
    (e.kind === "inline" && n.kind === "inline") ||
    (e.kind === "script" &&
      n.kind === "script" &&
      e.sha256 === n.sha256 &&
      foldPathSegments(e.path) === foldPathSegments(n.path))
  );
}
//@ chunk-e6aww6q8.js:908777-908933 placement
function describeHookPin(e) {
  if (e === void 0) return "none";
  switch (e.kind) {
    case "script":
      return truncateToLength(e.sha256, 12);
    case "inline":
      return "inline";
    case "unpinnable":
      return "unknown";
  }
}
//@ chunk-e6aww6q8.js:908933-909023 placement
function IAo(e) {
  return open_9(
    e,
    constants_12.O_RDONLY |
      constants_12.O_NONBLOCK |
      READ_LIMITS |
      (mMe === 0 ? constants_12.O_NOFOLLOW : mMe),
  );
}
/**
 * 为一个项目 PreToolUse 命令钩子计算"固定标识"：无法分析的命令记为 inline；能解析到脚本且脚本在允许目录内、是唯一硬链接的稳定文件时记录路径与 sha256，否则 unpinnable。
 */
//@ chunk-e6aww6q8.js:909023-909459 placement
async function pinCommandHook(e, n, r, s) {
  let h = getProjectConfigRoot() ?? n,
    y = analyzeHookCommand(e, {
      home: r,
      projectDir: h,
      hookCwd: h,
      defaultShell: "bash",
      shellPrefix: void 0,
    });
  if (y.kind === "opaque") return { pin: { kind: "inline" } };
  let S;
  try {
    S = await realpath_8(y.resolvedPath);
  } catch {
    return { pin: { kind: "unpinnable" } };
  }
  if (!pathsOverlapForPlatform([S], s)) return { pin: { kind: "unpinnable" } };
  let w = await hashStableScriptFile(S);
  return w === void 0
    ? { pin: { kind: "unpinnable" } }
    : { pin: { kind: "script", path: S, sha256: w.sha256 }, script: { bytes: w.bytes, site: y.site } };
}
/**
 * 对稳定的脚本文件计算哈希：只接受无硬链接的普通文件且目录无符号链接。
 */
//@ chunk-e6aww6q8.js:909459-909916 placement
async function hashStableScriptFile(e, n = { lstat: (r) => lstat_20(r, { bigint: !0 }), open: IAo }) {
  try {
    let stats = await n.lstat(e);
    if (!stats.isFile() || stats.nlink !== 1n || (await realpath_8(dirname_22(e))) !== dirname_22(e)) return;
    let open = await n.open(e),
      h = !1;
    try {
      let stats_2 = await open.stat({ bigint: !0 }),
        w = stats_2.ino === stats.ino && stats_2.dev === stats.dev ? await verifyOpenedPath(open, e) : void 0;
      h = w?.ok === !0 && w.value === !0;
    } finally {
      if (!h) await open.close().catch(() => {});
    }
    if (!h) return;
    let y = await checkScriptFile(e, { open: async () => open });
    return y.ok ? { sha256: y.sha256, bytes: y.bytes } : void 0;
  } catch {
    return;
  }
}
/**
 * 固定（pin）钩子命令：确定程序与脚本内容，Windows 下无法解析时标记。
 */
//@ chunk-e6aww6q8.js:909916-914278 placement
async function pinHookCommand(e) {
  let projectHooks = e.reach.projectHooks;
  if (!G0() || projectHooks === void 0 || !e.fromSettingsFile || e.held === "windows_unparsed") return;
  if (e.held === "unreadable") return z0(e, "unpinnable");
  if ((e.hook.shell ?? "bash") !== "bash") return z0(e, "shell");
  if (e.shellPrefix !== void 0 && e.shellPrefix !== "") return z0(e, "shell_prefix");
  let mapped = e.matcherTexts.map((matcherText) => UBt(matcherText, e.hook));
  if (mapped.some((qt) => projectHooks.stopped.has(qt))) return z0(e, "stopped");
  let s = lBt();
  if (s && mapped.some((qt) => projectHooks.setAside.has(qt)))
    return (logServedHookHeld_2(e, "set_aside_after_change", {}), { hook: e.hook, outcome: "success" });
  let { hook: hook } = e,
    y = await e.reach.current(),
    S = y.includes("/") ? { unavailable: "unknown_reach" } : resolveHookSandboxMode(e.readRules);
  if ("unavailable" in S) return projectHookUnavailable(e, projectHooks, S.unavailable);
  let { mode: mode } = S,
    L = uniq([
      ...e.readableDirs,
      ...(await Promise.all(
        e.readableDirs.map((readableDir) => realpath_8(readableDir).catch(() => readableDir)),
      )),
    ]),
    { current: G, accepted: accepted } = await projectHooks.pinned,
    found = mapped.find((qt) => G.has(qt)),
    Se = found === void 0 ? void 0 : G.get(found),
    ke =
      Se === void 0 || (found !== void 0 && projectHooks.changedSinceAttach.has(found))
        ? void 0
        : await pinCommandHook(hook, e.reach.projectDir, e.home, L);
  if (found === void 0 || Se === void 0) return;
  if (Se.pin.kind === "unpinnable") return z0(e, "unpinnable");
  projectHooks.seen.add(found);
  let we = ke === void 0 || !isSameHookPin(Se.pin, ke.pin);
  if (we && !s)
    return (
      projectHooks.changedSinceAttach.add(found),
      logServedHookHeld_2(e, "held_changed_since_attach", {}),
      {
        hook: hook,
        outcome: "success",
        permissionBehavior: "ask",
        hookPermissionDecisionReason: BHt,
        heldForServedCall: !0,
      }
    );
  let Ee = we ? Se : ke,
    Ae = accepted?.get(found);
  if (
    accepted !== void 0 &&
    (Ae === void 0 || !isSameHookPin(Ae, Se.pin)) &&
    !(s && projectHooks.acceptedUpdated.has(found))
  ) {
    let qt =
      !s || projectHooks.declinedChangedSinceLast.has(found)
        ? void 0
        : (projectHooks.updatedAsks.get(found) ?? {
            question: hookScriptChangedQuestion(describeHookPin(Ae), describeHookPin(Se.pin)),
            puts: 0,
          });
    if (qt !== void 0) projectHooks.updatedAsks.set(found, qt);
    logServedHookHeld_2(e, "held_changed_since_last_serve", s && qt === void 0 ? {} : { key: found });
    let Zt = !projectHooks.said.has("changed_note");
    return (
      projectHooks.said.add("changed_note"),
      {
        hook: hook,
        outcome: "success",
        permissionBehavior: "ask",
        hookPermissionDecisionReason: !s ? XWe : (qt?.question ?? HOOK_UPDATED_NOT_ACCEPTED_QUESTION),
        heldForServedCall: !0,
        ...(Zt && { additionalContext: s ? HOOK_CHANGED_ASKING_PERSON : HOOK_CHANGED_ASKS_INSTEAD }),
      }
    );
  }
  let Ie = await realpath_8(e.reach.projectDir);
  if (
    (Ee.pin.kind === "script" && !pathsOverlapForPlatform([Ee.pin.path], L)) ||
    !pathsOverlapForPlatform([Ie], L)
  )
    return z0(e, "outside_readable");
  let Me =
    mode === "linux"
      ? await checkHookSandboxAvailable({
          pathValue: e.environment.extra.PATH ?? $2e,
          reach: y,
          home: e.home,
          readableDirs: e.readableDirs,
        })
      : void 0;
  if (Me !== void 0 && "unavailable" in Me) return projectHookUnavailable(e, projectHooks, Me.unavailable);
  let We = Ee.pin.kind === "script" ? relative_15(Ie, Ee.pin.path) : "",
    ze = We === "" || We.startsWith("..") ? "an inline check" : truncateToLength(wh(We), xAo),
    lt = pjt(e.environment),
    Je = [...y, e.home, await realpath_8(e.home).catch(() => e.home), claudeTempDir(), ...(Me?.homes ?? [])],
    nt = (...qt) => m_(qt, Je) || (Me !== void 0 && qt.some((Zt) => Je.some((rn) => nM(Zt, rn)))),
    pt = getPlatform() === "linux",
    Et;
  for (let qt of [lt.TMPDIR, tmpdir_3(), ...(pt ? [RAo] : [])]) {
    if (qt === void 0 || !isAbsolute_13(qt)) continue;
    let Zt = await realpath_8(qt).catch(() => {
      return;
    });
    if (Zt !== void 0 && !nt(qt, Zt)) {
      Et = { spelled: qt, real: Zt };
      break;
    }
  }
  let yt, gt;
  try {
    if (Et === void 0) throw Error("no temp directory here lies outside what the session can write");
    yt = await realpath_8(await mkdtemp_3(join_40(Et.real, "hook-")));
  } catch (error) {
    return (
      logForDebugging(
        `[remote-tools] no private temp directory for a project hook (${errorMessage(error)})`,
        { level: "error" },
      ),
      runServedHook(e, projectHooks, found, ze, mode, we, sandboxFallbackAsk(ze, "no_private_tmp", ""))
    );
  }
  let min = Math.min(hook.timeout ?? DBt, DBt),
    It = createCombinedAbortSignal(e.signal, { timeoutMs: min * 1000 }),
    Yt = !1;
  try {
    if (nt(yt))
      return runServedHook(
        e,
        projectHooks,
        found,
        ze,
        mode,
        we,
        sandboxFallbackAsk(ze, "private_tmp_in_reach", ""),
      );
    if (Ee.script === void 0) gt = hook;
    else {
      let rn = join_40(yt, basename_15(We).replace(/[^A-Za-z0-9._-]/g, "_") || "check");
      (await writeFile_8(rn, Ee.script.bytes, { mode: 320, flag: "wx" }),
        (gt = replaceCommandProgram(hook, Ee.script.site, rn)));
    }
    let qt =
        mode === "linux"
          ? void 0
          : {
              mode: mode,
              config: await buildHookSandboxDevices({
                mode: mode,
                projectRoots: L,
                home: e.home,
                privateTmp: yt,
                tempRoots: [Et.spelled, tmpdir_3(), tmpdir()].flatMap((rn) =>
                  basename_15(rn) === "T" ? [rn, dirname_22(rn)] : [rn],
                ),
              }),
            },
      match = await e.exec({
        hook: { ...gt, timeout: min },
        cwd: e.reach.projectDir,
        base: buildSandboxedHookEnv({
          judged: lt,
          pathValue: e.environment.extra.PATH ?? $2e,
          home: Me === void 0 ? e.home : yt,
          privateTmp: yt,
        }),
        signal: It.signal,
        wrap: async (rn) => {
          let pn;
          if (Me !== void 0) pn = wrapLinuxHookCommand(rn, { ...Me, privateTmp: yt, cwd: Ie }, e.readRules);
          else if (qt !== void 0)
            pn = await wrapProjectHookInSandbox(
              `export TMPDIR=${shellQuoteArgs([yt])}; ${rn}`,
              qt.config,
              It.signal,
              e.readRules,
              { mode: qt.mode, commandId: `served-hook:${randomUUID_12()}` },
            );
          return ((Yt = pn === void 0), pn);
        },
      });
    if (e.signal?.aborted === !0) return { hook: hook, outcome: "cancelled" };
    return runServedHook(
      e,
      projectHooks,
      found,
      ze,
      mode,
      we,
      Yt
        ? sandboxFallbackAsk(ze, It.signal.aborted ? "timeout" : "not_wrapped", "")
        : runServedHookProcess(match, ze, we),
    );
  } catch (error) {
    return (
      logForDebugging(
        `[remote-tools] a project hook could not be run in the sandbox (${errorMessage(error)})`,
        { level: "error" },
      ),
      runServedHook(e, projectHooks, found, ze, mode, we, sandboxFallbackAsk(ze, "wrap_failed", ""))
    );
  } finally {
    (It.cleanup(), await rm_15(yt, { recursive: !0, force: !0 }).catch(() => {}));
  }
}

export { pinHookCommand, saveSeenHookPins, AAo, CAo, MAo, PAo, createProjectHookPinsState };
