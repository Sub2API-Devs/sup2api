/**
 * utils/claudeAiSync/skillsSync.ts
 *
 * 2.1.316 新增：claude.ai 技能同步
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (73)
 * attribution: placement 73
 */
import {
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
  lutimes,
  lutimes as lutimes_2,
  lutimes as lutimes_3,
  lutimes as lutimes_4,
  lutimes as lutimes_5,
  lutimes as lutimes_6,
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
} from "fs/promises";
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
  FJr,
  LAST_COMPLETE_ROUND_FILE,
  SKILLS_SYNC_DIR,
  stripInvisibleChars as stripInvisibleChars_3,
} from "../plugins/syncedItems.js";
import { readFileChecked, readFileHandleChecked } from "../fileRead.js";
import { isENOENT, getErrnoCode, toError } from "../errors.js";
import { logForDiagnosticsNoPII } from "../diagLogs.js";
import { jsonParse } from "../slowOperations.js";
import { env } from "../env.js";
import { $c } from "../platformTargets.js";
import { READ_LIMITS } from "../fsBoundRead.js";
import {
  removeSyncedSkillHooks,
  skillRootsUnder,
  sJ,
} from "../../services/plugins/accountSync/syncedPluginHooks.js";
import { getClaudeConfigDir } from "../envUtils.js";
import {
  getSkillsSyncVetoed,
  setAccountSkillsSyncEnabled,
  setSkillsSyncVetoed,
  getAccountSkillsSyncEnabled,
  getPluginsSyncVetoed,
  getAccountPluginsSyncEnabled,
  getSyncedPluginDirs,
} from "../../bootstrap/state.js";
import {
  isSyncSettingsUnreliable,
  Jrt,
  M5r,
  grr,
  isAccountSyncEligible,
  isAccountSyncDenied,
} from "../../services/plugins/accountSync/pluginsScopeGate.js";
import { or } from "../settings/commandSyncNames.js";
import { isRestrictedToPluginOnly } from "../settings/pluginOnlyPolicy.js";
import { isCustomizationDisabled } from "../settings/customizationDisabled.js";
import { isSettingSourceEnabled } from "../settings/constants.js";
import { isSessionRefsSyncEnabled } from "./sessionRefsGate.js";
import { remoteToolsState } from "../../remote/tools/callResults.js";
import { logError } from "../log.js";
import { stripSyncedSkillPrefix } from "../../skills/syncedSkills.js";
import { sessionHostKind } from "../telemetry/memorySummary.js";
import { K9t } from "../../bootstrap/sessionFeatureValues.js";
import { iXr } from "../permissions/permissionRulePayload.js";
import { isRemoteOrCowork } from "../../skills/skillSources.js";
import { Ji } from "../../../vendor/lodash-es/uniqBy.js";
import { runPluginsSyncRound } from "./pluginsSync.js";
import { zqe } from "../../services/plugins/accountSync/sessionSkillManifest.js";

//@ chunk-e6aww6q8.js:638363-638418 placement
async function K1t(e, n) {
  await rm_8(FJr(e, n), { force: !0 });
}
//@ chunk-e6aww6q8.js:638418-638434 placement
var cet = 4194304;
//@ chunk-e6aww6q8.js:638434-638516 placement
function uet(e) {
  return Array.isArray(e) ? e.filter((n) => typeof n === "string") : void 0;
}
/**
 * 合并清单行：先放额外行，再放旧行中未被移除的，最后用新行覆盖（按键去重）。
 */
//@ chunk-e6aww6q8.js:638516-638694 placement
function mergeManifestRows(e, n, r, s, h = []) {
  let y = new Map();
  for (let S of h) y.set(r(S), S);
  for (let S of n ?? []) if (!s.has(r(S))) y.set(r(S), S);
  for (let S of e) y.set(r(S), S);
  return Array.from(y.values());
}
/**
 * 合并过期目录列表：加上新的、去掉已处理的，结果为空时返回 undefined。
 */
//@ chunk-e6aww6q8.js:638694-638832 placement
function mergeStaleDirs(e, n, r) {
  let s = new Set(e ?? []);
  for (let h of uet(n) ?? []) s.add(h);
  for (let h of r) s.delete(h);
  return s.size > 0 ? Array.from(s) : void 0;
}
/**
 * 用 schema 逐条解析数组，只保留解析成功的项。
 */
//@ chunk-e6aww6q8.js:638832-638962 placement
function parseValidRows(e, n) {
  if (!Array.isArray(n)) return [];
  let r = [];
  for (let s of n) {
    let safeParse = e.safeParse(s);
    if (safeParse.success) r.push(safeParse.data);
  }
  return r;
}
/**
 * 用新行替换同键旧行，并报告是否有行的归属（等价判断不通过）发生变化。
 */
//@ chunk-e6aww6q8.js:638962-639137 placement
function replaceRowsWithAttribution(e, n, r, s) {
  let h = new Map(n.map((w) => [r(w), w])),
    y = !1;
  return {
    rows: e.map((w) => {
      let L = h.get(r(w));
      if (L === void 0) return w;
      if (!s(w, L)) y = !0;
      return L;
    }),
    attributionMoved: y,
  };
}
/**
 * 返回去掉指定键后的对象副本。
 */
//@ chunk-e6aww6q8.js:639137-639243 placement
function omitKeys_2(e, n) {
  let r = new Set(n),
    s = {};
  for (let [h, y] of Object.entries(e ?? {})) if (!r.has(h)) s[h] = y;
  return s;
}
/**
 * 读取同步清单文件内容（有大小限制）；非 ENOENT 失败时记诊断（超大归为 parse_or_size）并返回 null。
 */
//@ chunk-e6aww6q8.js:639243-639429 placement
async function readManifestText(e, n) {
  try {
    return (await readFileChecked(e, cet)).content;
  } catch (error) {
    if (n !== null && !isENOENT(error)) {
      let s = getErrnoCode(error);
      logForDiagnosticsNoPII("warn", n, {
        code: s === "ERR_FILE_TOO_LARGE" ? "parse_or_size" : (s ?? "unknown"),
      });
    }
    return null;
  }
}
/**
 * 解析清单 JSON 并按 schema 校验，失败时记诊断（parse_or_size / not_an_object）并返回 null。
 */
//@ chunk-e6aww6q8.js:639429-639641 placement
function parseManifestJson(e, n, r) {
  let s;
  try {
    s = jsonParse(e);
  } catch {
    if (r !== null) logForDiagnosticsNoPII("warn", r, { code: "parse_or_size" });
    return null;
  }
  let safeParse = n.safeParse(s);
  if (!safeParse.success) {
    if (r !== null) logForDiagnosticsNoPII("warn", r, { code: "not_an_object" });
    return null;
  }
  return safeParse.data;
}
//@ chunk-e6aww6q8.js:640031-640046 placement
var qLt = 600000;
//@ chunk-e6aww6q8.js:640046-640134 placement
function fBr() {
  let CLAUDE_CODE_SYNC_REUSE_WITHIN_MS = env.CLAUDE_CODE_SYNC_REUSE_WITHIN_MS;
  return CLAUDE_CODE_SYNC_REUSE_WITHIN_MS !== void 0 && CLAUDE_CODE_SYNC_REUSE_WITHIN_MS > 0
    ? CLAUDE_CODE_SYNC_REUSE_WITHIN_MS
    : void 0;
}
//@ chunk-e6aww6q8.js:640134-640168 placement
function Ybt(e) {
  return join_20(e, LAST_COMPLETE_ROUND_FILE);
}
//@ chunk-e6aww6q8.js:640168-640232 placement
var Xho = /^[0-9a-f-]{36}$/,
  wUe = /^[A-Za-z0-9_.-]{1,64}$/,
  Qho = 1024;
//@ chunk-e6aww6q8.js:640232-640292 placement
function zLt(e) {
  return `${e.token} ${e.listedFor.join(",")}`;
}
/**
 * 读取同步复用标记文件：内容为"令牌 列表"，令牌格式不符返回 null。
 */
//@ chunk-e6aww6q8.js:640292-640538 placement
async function readReuseStamp(e) {
  let n = Ybt(e);
  try {
    await using r = await open_4(n, $c() | READ_LIMITS);
    let { content: content } = await readFileHandleChecked(r, n, Qho),
      [h = "", y = ""] = content.split(" ", 2);
    if (!Xho.test(h)) return null;
    return { token: h, listedFor: y.split(",").filter((S) => wUe.test(S)) };
  } catch {
    return null;
  }
}
/**
 * 写入或续期同步复用标记：已有令牌时把当前项加入列表（文件存在则只更新时间）；否则生成新令牌重建文件。失败时记诊断返回 null。
 */
//@ chunk-e6aww6q8.js:640538-641150 placement
async function writeReuseStamp(e, n, r, s) {
  let stampPath = Ybt(e);
  try {
    if (r !== null) {
      let updated = {
        token: r.token,
        listedFor: r.listedFor.includes(s) || !wUe.test(s) ? r.listedFor : [...r.listedFor, s],
      };
      if (
        await writeFile_4(stampPath, zLt(updated), { flag: "wx" }).then(
          () => !0,
          (q) => {
            if (getErrnoCode(q) !== "EEXIST") throw q;
            return !1;
          },
        )
      )
        return updated;
      let date = new Date();
      return (await lutimes_3(stampPath, date, date), await readReuseStamp(e));
    }
    let fresh = { token: randomUUID_8(), listedFor: wUe.test(s) ? [s] : [] },
      content = zLt(fresh);
    return (
      await rm_10(stampPath, { force: !0 }),
      await writeFile_4(stampPath, content, { flag: "wx" }).catch(async (w) => {
        if (getErrnoCode(w) !== "EEXIST") throw w;
        (await rm_10(stampPath, { force: !0 }), await writeFile_4(stampPath, content, { flag: "wx" }));
      }),
      fresh
    );
  } catch (error) {
    return (
      logForDiagnosticsNoPII("warn", `${n}_sync_reuse_stamp_failed`, {
        code: getErrnoCode(error) ?? "unknown",
      }),
      null
    );
  }
}
//@ chunk-e6aww6q8.js:641150-641230 placement
async function dfn(e, n, r, s, h) {
  if (r) return writeReuseStamp(e, n, s, h);
  return (await y3n(e), null);
}
//@ chunk-e6aww6q8.js:641230-641323 placement
async function y3n(e) {
  let n = await readReuseStamp(e);
  return (await rm_10(Ybt(e), { force: !0 }).catch(() => {}), n);
}
/**
 * 根据复用标记文件的修改时间判断是否在复用窗口内，返回 {reuse, ageMs, withinMs}。
 */
//@ chunk-e6aww6q8.js:641323-641598 placement
async function checkReuseWindow(e, n, r = Date.now()) {
  if (n === void 0 || n <= 0) return { reuse: !1 };
  let s;
  try {
    let y = await lstat_10(Ybt(e));
    if (!y.isFile()) return { reuse: !1 };
    s = Math.floor(y.mtimeMs);
  } catch {
    return { reuse: !1 };
  }
  let h = r - s;
  if (h < 0 || h >= n) return { reuse: !1 };
  return { reuse: !0, ageMs: Math.round(h), withinMs: n };
}
//@ chunk-e6aww6q8.js:641639-641721 placement
var KLt = { sync: "Skills", hooksOf: "synced skills", event: "skills_sync_hooks_removed" };
//@ chunk-e6aww6q8.js:641721-641754 placement
function CUr(e) {
  removeSyncedSkillHooks(KLt, VLt(), e);
}
/**
 * 清理不再被列出或技能文件已不存在的已同步技能目录记录。
 */
//@ chunk-e6aww6q8.js:641754-641964 placement
async function pruneGoneSkillDirs({
  bucketRoot: bucketRoot,
  listedDirs: listedDirs,
  removalTriedDirs: removalTriedDirs,
  isSkillFileGone: isSkillFileGone,
}) {
  let h = new Set();
  for (let y of VLt())
    if (
      !y.startsWith(bucketRoot + sep_13) ||
      (!listedDirs.has(y) && (removalTriedDirs.has(y) || (await isSkillFileGone(y))))
    )
      h.add(y);
  removeSyncedSkillHooks(KLt, h, "skill_gone");
}
//@ chunk-e6aww6q8.js:641964-642004 placement
function VLt() {
  return skillRootsUnder(join_21(getClaudeConfigDir(), SKILLS_SYNC_DIR));
}
//@ chunk-e6aww6q8.js:642004-642152 placement
var SKILLS_SYNC_SETTING = {
  settingKey: "syncClaudeAiSkills",
  policyKey: "allow_account_skills_sync",
  flagName: "tengu_claudeai_skills_sync_enabled",
  isTierInPlay: () => det(),
};
//@ chunk-e6aww6q8.js:642152-642207 placement
function j1t() {
  eN();
  let e = tyo() && !getSkillsSyncVetoed();
  return (setAccountSkillsSyncEnabled(e), e);
}
//@ chunk-e6aww6q8.js:642207-642270 placement
function eN() {
  let e = isSyncSettingsUnreliable(SKILLS_SYNC_SETTING);
  if ((setSkillsSyncVetoed(e), e && i$o())) CUr("sync_off");
}
//@ chunk-e6aww6q8.js:642270-642307 placement
function Gun() {
  return (or(), eN(), getSkillsSyncVetoed());
}
//@ chunk-e6aww6q8.js:642307-642394 placement
function _8() {
  return env.CLAUDE_CODE_SYNC_SKILLS || env.CLAUDE_CODE_SYNC_SESSION_REFS || Jrt();
}
//@ chunk-e6aww6q8.js:642394-642464 placement
function det() {
  return (
    !isRestrictedToPluginOnly("skills") &&
    !isCustomizationDisabled("skills") &&
    isSettingSourceEnabled("userSettings")
  );
}
//@ chunk-e6aww6q8.js:642464-642494 placement
function YKs() {
  return M5r(SKILLS_SYNC_SETTING);
}
//@ chunk-e6aww6q8.js:642494-642524 placement
function XKs() {
  return grr(SKILLS_SYNC_SETTING);
}
//@ chunk-e6aww6q8.js:642524-642554 placement
function tyo() {
  return isAccountSyncEligible(SKILLS_SYNC_SETTING);
}
//@ chunk-e6aww6q8.js:642554-642584 placement
function i$o() {
  return isAccountSyncDenied(SKILLS_SYNC_SETTING);
}
//@ chunk-e6aww6q8.js:642584-642638 placement
function Zoe(e) {
  if (getSkillsSyncVetoed()) return !1;
  return _3n(e) || getAccountSkillsSyncEnabled();
}
//@ chunk-e6aww6q8.js:642638-642695 placement
function _3n(e) {
  return !!env.CLAUDE_CODE_SYNC_SKILLS || isSessionRefsSyncEnabled(e);
}
//@ chunk-e6aww6q8.js:642695-642732 placement
function b3n(e) {
  return _3n(e) && !getSkillsSyncVetoed();
}
/**
 * 登记一个待完成的下载（Promise 与开始时间），返回其 resolve 函数。
 */
//@ chunk-e6aww6q8.js:642732-642850 placement
function registerPendingDownload(e, n) {
  let r,
    promise = new Promise((h) => {
      r = h;
    });
  return (remoteToolsState().pendingDownloads.set(e, { promise: promise, resolve: r, start: n }), r);
}
/**
 * 触发某技能挂起的下载（只触发一次）并返回其完成 Promise；没有挂起下载时直接成功。
 */
//@ chunk-e6aww6q8.js:642850-643065 placement
function startPendingDownload(e) {
  let n = remoteToolsState().pendingDownloads.get(e);
  if (!n) return Promise.resolve({ ok: !0 });
  let start = n.start;
  n.start = void 0;
  try {
    start?.();
  } catch (error) {
    (logError(toError(error)), n.resolve({ ok: !1, reason: "download could not start" }));
  }
  return n.promise;
}
//@ chunk-e6aww6q8.js:643065-643134 placement
function S3n(e) {
  return `Skill ${e} is switched off for this session.`;
}
//@ chunk-e6aww6q8.js:643134-643213 placement
function tqs(e) {
  let n = remoteToolsState().listedSkills.get(e);
  return n?.command ? n.text : void 0;
}
//@ chunk-e6aww6q8.js:643213-643281 placement
function nqs(e) {
  return remoteToolsState().pendingDownloads.get(e)?.start !== void 0;
}
//@ chunk-e6aww6q8.js:643281-643333 placement
function w3n(e) {
  return remoteToolsState().pendingDownloads.has(e);
}
//@ chunk-e6aww6q8.js:643333-643385 placement
function rqs(e) {
  remoteToolsState().placeholders.set(stripSyncedSkillPrefix(e.name), e);
}
//@ chunk-e6aww6q8.js:643385-643429 placement
function oqs(e) {
  remoteToolsState().placeholders.delete(e);
}
/**
 * 命令是否为同步技能的占位命令（与登记的占位同一对象或同一提示生成函数）。
 */
//@ chunk-e6aww6q8.js:643429-643597 placement
function isSyncedSkillPlaceholder(e) {
  let n = remoteToolsState().placeholders.get(stripSyncedSkillPrefix(e.name));
  return (
    n !== void 0 &&
    (n === e ||
      (n.type === "prompt" && e.type === "prompt" && n.getPromptForCommand === e.getPromptForCommand))
  );
}
/**
 * 从占位、已列出技能与挂起下载中去掉不在给定集合里的项，返回删除数。
 */
//@ chunk-e6aww6q8.js:643597-643802 placement
function pruneSyncedSkillState(e) {
  let n = 0,
    {
      placeholders: placeholders,
      listedSkills: listedSkills,
      pendingDownloads: pendingDownloads,
    } = remoteToolsState();
  for (let y of [placeholders, listedSkills]) for (let S of y.keys()) if (!e.has(S)) (y.delete(S), n++);
  for (let y of pendingDownloads.keys()) if (!e.has(y)) pendingDownloads.delete(y);
  return n;
}
/**
 * 列出同步技能命令：占位命令（排除已被替换的）加上已列出技能的命令。
 */
//@ chunk-e6aww6q8.js:643802-644014 placement
function getSyncedSkillCommands() {
  let { placeholders: placeholders, listedSkills: listedSkills } = remoteToolsState();
  if (placeholders.size === 0 && listedSkills.size === 0) return [];
  return [
    ...Array.from(placeholders).flatMap(([r, s]) => (v3n(r) ? [] : [s])),
    ...Array.from(listedSkills.values()).flatMap((r) => (r.command ? [r.command] : [])),
  ];
}
//@ chunk-e6aww6q8.js:644014-644108 placement
function v3n(e) {
  let n = remoteToolsState().listedSkills.get(e);
  return n !== void 0 && !n.command && n.withheld === !0;
}
//@ chunk-e6aww6q8.js:644108-644192 placement
function iqs() {
  return Array.from(remoteToolsState().placeholders).flatMap(([e, n]) => (v3n(e) ? [n] : []));
}
/**
 * 技能是否以插件形式同步：满足前置条件、未被否决、开启了插件同步且其他条件成立。
 */
//@ chunk-e6aww6q8.js:644192-644312 placement
function isSkillsAsPluginsActive(e) {
  if (!isConvertedSkillsAsPlugins(e)) return !1;
  return (
    eN(),
    sJ(),
    !getPluginsSyncVetoed() &&
      (Boolean(env.CLAUDE_CODE_SYNC_PLUGINS) || getAccountPluginsSyncEnabled()) &&
      Zoe(e) &&
      det()
  );
}
/**
 * 托管 worker 或已转换技能列表询问时，在技能以插件形式同步的前提下是否转换技能列表询问。
 */
//@ chunk-e6aww6q8.js:644312-644416 placement
function shouldConvertSkillsListAsks(e) {
  return (
    (sessionHostKind() === "hosted_worker" || K9t.peek(e)?.convertedSkillsSkillsListAsks === !0) &&
    isSkillsAsPluginsActive(e)
  );
}
/**
 * 本地非远程会话中异步判定是否把技能列表请求转为插件形式，结果锁定到会话状态（同时只有一个判定在途）。
 */
//@ chunk-e6aww6q8.js:644416-644791 placement
function primeSkillsListAskConversion(e, n) {
  let of = K9t.of(e);
  if (
    !iXr() ||
    sessionHostKind() !== "none" ||
    isRemoteOrCowork() ||
    of.convertedSkillsSkillsListAsks !== void 0 ||
    of.convertedSkillsSkillsListPin !== void 0
  )
    return;
  let s = n()
    .catch((h) => (logError(h), !1))
    .then((h) => {
      of.convertedSkillsSkillsListAsks ??= h && isConvertedSkillsAsPlugins(e);
    })
    .catch(logError)
    .then(() => {
      if (of.convertedSkillsSkillsListPin === s) of.convertedSkillsSkillsListPin = void 0;
    });
  of.convertedSkillsSkillsListPin = s;
}
//@ chunk-e6aww6q8.js:644791-644991 placement
function isConvertedSkillsAsPlugins(e) {
  let of = K9t.of(e);
  return (
    (of.convertedSkillsAsPlugins ??=
      iXr() &&
      nyo() &&
      (!isSessionRefsSyncEnabled(e) || Boolean(env.CLAUDE_CODE_SYNC_SKILLS)) &&
      (Boolean(env.CLAUDE_CODE_SYNC_PLUGINS) || getAccountPluginsSyncEnabled())),
    of.convertedSkillsAsPlugins
  );
}
//@ chunk-e6aww6q8.js:644991-645056 placement
function dqs(e) {
  return K9t.peek(e)?.convertedSkillsSkillsListPin;
}
//@ chunk-e6aww6q8.js:645056-645129 placement
function nyo() {
  let e = sessionHostKind();
  return e === "hosted_worker" || (e === "none" && !isRemoteOrCowork());
}
/**
 * 按键合并两组行：已有行若在新行中有同键项则经合并函数合成，再与新行一起按键去重。
 */
//@ chunk-e6aww6q8.js:645129-645300 placement
function mergeRowsByKey(e, n, r, s) {
  let h = s === void 0 ? void 0 : new Map(n.map((y) => [r(y), y]));
  return Ji(
    [
      ...e.map((y) => {
        let S = h?.get(r(y));
        return S !== void 0 && s !== void 0 ? s(y, S) : y;
      }),
      ...n,
    ],
    r,
  );
}
/**
 * 对比远端列表与本地清单，计算要下载的项（新增或名称/版本/更新时间变化）、要删除的项、沿用项与在用目录；名字非法或目录名冲突时记诊断并沿用旧行。
 */
//@ chunk-e6aww6q8.js:645300-646136 placement
function planSyncDownloads(
  e,
  n,
  {
    idOf: idOf,
    dirFor: dirFor,
    invalidNameTag: invalidNameTag,
    collisionTag: collisionTag,
    carry: carry,
    markCollisionLoser: markCollisionLoser,
  },
) {
  let isObject = (Ie) => typeof Ie === "object" && Ie !== null;
  ((e = Array.isArray(e) ? e.filter(isObject) : []), (n = Array.isArray(n) ? n.filter(isObject) : []));
  let prevById = new Map(n.map((Ie) => [idOf(Ie), Ie])),
    listedIds = new Set(e.map((Ie) => idOf(Ie))),
    liveDirs = new Set(),
    liveDirsFolded = new Set(),
    toDownload = [],
    carryover = [],
    carryoverOwningLiveDir = new Set();
  for (let Ie of e) {
    let prev = prevById.get(idOf(Ie));
    if (prev !== void 0 && carry !== void 0) prev = carry(prev, Ie);
    let dir;
    try {
      dir = dirFor(Ie.name);
    } catch {
      if ((logForDiagnosticsNoPII("warn", invalidNameTag), prev)) carryover.push(prev);
      continue;
    }
    if (liveDirsFolded.has(stripInvisibleChars_3(dir))) {
      if ((logForDiagnosticsNoPII("warn", collisionTag), prev))
        carryover.push(markCollisionLoser ? markCollisionLoser(prev) : prev);
      continue;
    }
    if (
      (liveDirs.add(dir),
      liveDirsFolded.add(stripInvisibleChars_3(dir)),
      !prev ||
        prev.updatedAt !== Ie.updatedAt ||
        prev.name !== Ie.name ||
        prev.requestedVersion !== Ie.requestedVersion)
    )
      toDownload.push({ item: Ie, prev: prev });
    else (carryover.push(prev), carryoverOwningLiveDir.add(idOf(prev)));
  }
  let filtered = n.filter((Ie) => !listedIds.has(idOf(Ie)));
  return {
    toDownload: toDownload,
    toRemove: filtered,
    carryover: carryover,
    liveDirs: liveDirs,
    carryoverOwningLiveDir: carryoverOwningLiveDir,
  };
}
//@ chunk-e6aww6q8.js:646136-646146 placement
var Xfe = 6;
//@ chunk-e6aww6q8.js:646146-646200 placement
function Jbt(e) {
  if (getPluginsSyncVetoed()) return !1;
  return HUe(e) || getAccountPluginsSyncEnabled();
}
//@ chunk-e6aww6q8.js:646200-646257 placement
function HUe(e) {
  return env.CLAUDE_CODE_SYNC_PLUGINS || isSessionRefsSyncEnabled(e);
}
//@ chunk-e6aww6q8.js:646257-646294 placement
function T3n(e) {
  return HUe(e) && !getPluginsSyncVetoed();
}
//@ chunk-e6aww6q8.js:646294-646369 placement
function ese() {
  return env.CLAUDE_CODE_SYNC_PLUGINS_INSTALL_TIMEOUT_MS ?? 30000;
}
//@ chunk-e6aww6q8.js:646369-646438 placement
function cqs() {
  return env.CLAUDE_CODE_SYNC_PLUGINS_MCP_TIMEOUT_MS ?? 1e4;
}
//@ chunk-e6aww6q8.js:646438-646511 placement
function bet(e, n) {
  e.pluginsSync.firstSyncPromise ??= runPluginsSyncRound(e, n, { startup: !0 });
}
/**
 * 启动时触发首轮插件同步（只触发一次），返回其 Promise。
 */
//@ chunk-e6aww6q8.js:646511-646622 placement
function runFirstPluginsSync(e, n) {
  return (
    (e.pluginsSync.firstSyncPromise ??= runPluginsSyncRound(e, n, { startup: !0 })),
    e.pluginsSync.firstSyncPromise
  );
}
/**
 * CCR 非交互会话在开启 CLAUDE_CODE_CCR_EARLY_PLUGINS_SYNC 时提前开始插件同步。
 */
//@ chunk-e6aww6q8.js:646622-646788 placement
function startEarlyPluginsSync(e, n, r) {
  if (!env.CLAUDE_CODE_CCR_EARLY_PLUGINS_SYNC || e.host.launchOptions.isInteractive() || !HUe(e) || r())
    return !1;
  if ((sJ(), !T3n(e))) return !1;
  return (bet(e, n), !0);
}
/**
 * 取消延迟重列表与在途请求，排在上一轮之后重新跑一轮插件同步。
 */
//@ chunk-e6aww6q8.js:646788-647017 placement
function rerunPluginsSync(e, n) {
  return (
    cancelDeferredRelist(e),
    zqe.of(e).discardInflight(),
    (e.pluginsSync.firstSyncPromise = (e.pluginsSync.firstSyncPromise ?? Promise.resolve(!1))
      .catch(() => {})
      .then(() => runPluginsSyncRound(e, n))
      .finally(() => cancelDeferredRelist(e))),
    e.pluginsSync.firstSyncPromise
  );
}
//@ chunk-e6aww6q8.js:647017-647187 placement
function scheduleDeferredRelist(e, n) {
  let pluginsSync = e.pluginsSync;
  (cancelDeferredRelist(e),
    (pluginsSync.deferredRelist = setTimeout(
      (s, h) => {
        ((s.pluginsSync.deferredRelist = null), rerunPluginsSync(s, h).catch(logError));
      },
      qLt,
      e,
      n,
    )),
    pluginsSync.deferredRelist.unref?.());
}
//@ chunk-e6aww6q8.js:647187-647235 placement
function QLt() {
  return getSyncedPluginDirs().toSorted().join(`
`);
}
//@ chunk-e6aww6q8.js:647235-647301 placement
function JLt(e) {
  return (e.lastCompleteList?.removalOwed.size ?? 0) > 0;
}
//@ chunk-e6aww6q8.js:647301-647417 placement
function cancelDeferredRelist(e) {
  let pluginsSync = e.pluginsSync;
  if (pluginsSync.deferredRelist !== null)
    (clearTimeout(pluginsSync.deferredRelist), (pluginsSync.deferredRelist = null));
}
//@ chunk-e6aww6q8.js:647417-647465 placement
function fqs(e) {
  return e.pluginsSync.syncErrors;
}

export {
  getSyncedSkillCommands,
  Gun,
  Zoe,
  Jbt,
  bet,
  b3n,
  det,
  T3n,
  runFirstPluginsSync,
  ese,
  cqs,
  rerunPluginsSync,
  eN,
  fqs,
  startEarlyPluginsSync,
  j1t,
  primeSkillsListAskConversion,
  K1t,
  iqs,
  v3n,
  startPendingDownload,
  tqs,
  isSyncedSkillPlaceholder,
  nqs,
  CUr,
  w3n,
  readManifestText,
  parseManifestJson,
  parseValidRows,
  S3n,
  uet,
  omitKeys_2,
  mergeManifestRows,
  mergeStaleDirs,
  Xfe,
  planSyncDownloads,
  readReuseStamp,
  QLt,
  isSkillsAsPluginsActive,
  checkReuseWindow,
  fBr,
  scheduleDeferredRelist,
  mergeRowsByKey,
  y3n,
  replaceRowsWithAttribution,
  dfn,
  JLt,
  Ybt,
  _8,
  cet,
  _3n,
  XKs,
  i$o,
  YKs,
  dqs,
  shouldConvertSkillsListAsks,
  pruneSyncedSkillState,
  rqs,
  registerPendingDownload,
  oqs,
  pruneGoneSkillDirs,
};
