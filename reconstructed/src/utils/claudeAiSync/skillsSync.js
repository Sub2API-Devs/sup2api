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
import { rm as rm_2, open, writeFile, lutimes, lstat } from "fs/promises";
import { join, sep } from "path";
import { randomUUID } from "crypto";
import {
  bucketDirPath,
  LAST_COMPLETE_ROUND_FILE,
  SKILLS_SYNC_DIR_2,
  stripInvisibleChars as stripInvisibleChars_3,
} from "../plugins/syncedItems.js";
import { readFileChecked, readFileHandleChecked } from "../fileRead.js";
import { isENOENT, getErrnoCode, toError } from "../errors.js";
import { logForDiagnosticsNoPII } from "../diagLogs.js";
import { jsonParse } from "../slowOperations.js";
import { env } from "../env.js";
import { readOnlyNoFollowFlags } from "../platformTargets.js";
import { READ_LIMITS } from "../fsBoundRead.js";
import {
  removeSyncedSkillHooks,
  skillRootsUnder,
  refreshSyncVeto,
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
  isFirstPartyClaudeAiSession,
  isSyncEligibleHere,
  isPolicyUnresolved,
  isAccountSyncEligible,
  isAccountSyncDenied,
} from "../../services/plugins/accountSync/pluginsScopeGate.js";
import { invalidateCommandNames } from "../settings/commandSyncNames.js";
import { isRestrictedToPluginOnly } from "../settings/pluginOnlyPolicy.js";
import { isCustomizationDisabled } from "../settings/customizationDisabled.js";
import { isSettingSourceEnabled } from "../settings/constants.js";
import { isSessionRefsSyncEnabled } from "./sessionRefsGate.js";
import { remoteToolsState } from "../../remote/tools/callResults.js";
import { logError } from "../log.js";
import { stripSyncedSkillPrefix } from "../../skills/syncedSkills.js";
import { sessionHostKind } from "../telemetry/memorySummary.js";
import { SESSION_FEATURE_VALUES_SLOT } from "../../bootstrap/sessionFeatureValues.js";
import { steadyFinchEnabled } from "../permissions/permissionRulePayload.js";
import { isRemoteOrCowork } from "../../skills/skillSources.js";
import { Ji } from "../../../vendor/lodash-es/uniqBy.js";
import { runPluginsSyncRound } from "./pluginsSync.js";
import { sessionSkillManifestSlot } from "../../services/plugins/accountSync/sessionSkillManifest.js";

//@ chunk-e6aww6q8.js:638363-638418 placement
/**
 * 删除某同步技能目录。
 */
async function removeSyncedSkillDir(e, n) {
  await rm_2(bucketDirPath(e, n), {
    force: true,
  });
}
//@ chunk-e6aww6q8.js:638418-638434 placement
/**
 * 读取同步技能文件时的大小上限（4 MiB）。
 */
var MAX_SYNCED_SKILL_BYTES = 4194304;
//@ chunk-e6aww6q8.js:638434-638516 placement
/**
 * 只保留数组里的字符串项。
 */
function stringArray(e) {
  return Array.isArray(e) ? e.filter((n) => typeof n === "string") : undefined;
}
//@ chunk-e6aww6q8.js:638516-638694 placement
/**
 * 合并清单行：先放额外行，再放旧行中未被移除的，最后用新行覆盖（按键去重）。
 */
function mergeManifestRows(validRows, n, r, s, validRows_2 = []) {
  let y = new Map();
  for (let S of validRows_2) y.set(r(S), S);
  for (let S of n ?? []) if (!s.has(r(S))) y.set(r(S), S);
  for (let S of validRows) y.set(r(S), S);
  return Array.from(y.values());
}
//@ chunk-e6aww6q8.js:638694-638832 placement
/**
 * 合并过期目录列表：加上新的、去掉已处理的，结果为空时返回 undefined。
 */
function mergeStaleDirs(e, n, r) {
  let s = new Set(e ?? []);
  for (let h of stringArray(n) ?? []) s.add(h);
  for (let h of r) s.delete(h);
  return s.size > 0 ? Array.from(s) : undefined;
}
//@ chunk-e6aww6q8.js:638832-638962 placement
/**
 * 用 schema 逐条解析数组，只保留解析成功的项。
 */
function parseValidRows(e, n) {
  if (!Array.isArray(n)) return [];
  let r = [];
  for (let s of n) {
    let h = e.safeParse(s);
    if (h.success) r.push(h.data);
  }
  return r;
}
//@ chunk-e6aww6q8.js:638962-639137 placement
/**
 * 用新行替换同键旧行，并报告是否有行的归属（等价判断不通过）发生变化。
 */
function replaceRowsWithAttribution(e, carryover, r, s) {
  let h = new Map(carryover.map((w) => [r(w), w]));
  let attributionMoved = false;
  return {
    rows: e.map((w) => {
      let L = h.get(r(w));
      if (L === undefined) return w;
      if (!s(w, L)) attributionMoved = true;
      return L;
    }),
    attributionMoved,
  };
}
//@ chunk-e6aww6q8.js:639137-639243 placement
/**
 * 返回去掉指定键后的对象副本。
 */
function omitKeys_2(e, n) {
  let r = new Set(n);
  let s = {};
  for (let [key, value] of Object.entries(e ?? {})) if (!r.has(key)) s[key] = value;
  return s;
}
//@ chunk-e6aww6q8.js:639243-639429 placement
/**
 * 读取同步清单文件内容（有大小限制）；非 ENOENT 失败时记诊断（超大归为 parse_or_size）并返回 null。
 */
async function readManifestText(e, n) {
  try {
    return (await readFileChecked(e, MAX_SYNCED_SKILL_BYTES)).content;
  } catch (error) {
    if (n !== null && !isENOENT(error)) {
      let errnoCode = getErrnoCode(error);
      logForDiagnosticsNoPII("warn", n, {
        code: errnoCode === "ERR_FILE_TOO_LARGE" ? "parse_or_size" : (errnoCode ?? "unknown"),
      });
    }
    return null;
  }
}
//@ chunk-e6aww6q8.js:639429-639641 placement
/**
 * 解析清单 JSON 并按 schema 校验，失败时记诊断（parse_or_size / not_an_object）并返回 null。
 */
function parseManifestJson(manifestText, n, r) {
  let s;
  try {
    s = jsonParse(manifestText);
  } catch {
    if (r !== null)
      logForDiagnosticsNoPII("warn", r, {
        code: "parse_or_size",
      });
    return null;
  }
  let h = n.safeParse(s);
  if (!h.success) {
    if (r !== null)
      logForDiagnosticsNoPII("warn", r, {
        code: "not_an_object",
      });
    return null;
  }
  return h.data;
}
//@ chunk-e6aww6q8.js:640031-640046 placement
/**
 * 同步复用的最长时间（10 分钟）。
 */
var MAX_SYNC_REUSE_AGE_MS = 600000;
//@ chunk-e6aww6q8.js:640046-640134 placement
/**
 * 从环境变量取同步复用窗口（正整数才生效）。
 */
function syncReuseWithinMs() {
  let CLAUDE_CODE_SYNC_REUSE_WITHIN_MS = env.CLAUDE_CODE_SYNC_REUSE_WITHIN_MS;
  return CLAUDE_CODE_SYNC_REUSE_WITHIN_MS !== undefined && CLAUDE_CODE_SYNC_REUSE_WITHIN_MS > 0
    ? CLAUDE_CODE_SYNC_REUSE_WITHIN_MS
    : undefined;
}
//@ chunk-e6aww6q8.js:640134-640168 placement
/**
 * 同步技能“最后一轮完成”标记文件路径。
 */
function lastCompleteRoundPath(e) {
  return join(e, LAST_COMPLETE_ROUND_FILE);
}
//@ chunk-e6aww6q8.js:640168-640232 placement
/**
 * 形如 UUID 的字符形式（复用标记里的令牌）。
 */
var UUID_LIKE_RE = /^[0-9a-f-]{36}$/;
var SAFE_LISTED_NAME_RE = /^[A-Za-z0-9_.-]{1,64}$/;
var MAX_REUSE_STAMP_BYTES = 1024;
//@ chunk-e6aww6q8.js:640232-640292 placement
/**
 * 把复用标记序列化成 “令牌 列表”。
 */
function serializeReuseStamp(e) {
  return `${e.token} ${e.listedFor.join(",")}`;
}
//@ chunk-e6aww6q8.js:640292-640538 placement
/**
 * 读取同步复用标记文件：内容为"令牌 列表"，令牌格式不符返回 null。
 */
async function readReuseStamp(e) {
  let n = lastCompleteRoundPath(e);
  try {
    await using r = await open(n, readOnlyNoFollowFlags() | READ_LIMITS);
    let { content } = await readFileHandleChecked(r, n, MAX_REUSE_STAMP_BYTES);
    let [h = "", y = ""] = content.split(" ", 2);
    if (!UUID_LIKE_RE.test(h)) return null;
    return {
      token: h,
      listedFor: y.split(",").filter((S) => SAFE_LISTED_NAME_RE.test(S)),
    };
  } catch {
    return null;
  }
}
//@ chunk-e6aww6q8.js:640538-641150 placement
/**
 * 写入或续期同步复用标记：已有令牌时把当前项加入列表（文件存在则只更新时间）；否则生成新令牌重建文件。失败时记诊断返回 null。
 */
async function writeReuseStamp(e, n, r, s) {
  let stampPath = lastCompleteRoundPath(e);
  try {
    if (r !== null) {
      let updated = {
        token: r.token,
        listedFor:
          r.listedFor.includes(s) || !SAFE_LISTED_NAME_RE.test(s) ? r.listedFor : [...r.listedFor, s],
      };
      if (
        await writeFile(stampPath, serializeReuseStamp(updated), {
          flag: "wx",
        }).then(
          () => true,
          (error) => {
            if (getErrnoCode(error) !== "EEXIST") throw error;
            return false;
          },
        )
      )
        return updated;
      let date = new Date();
      await lutimes(stampPath, date, date);
      return await readReuseStamp(e);
    }
    let fresh = {
      token: randomUUID(),
      listedFor: SAFE_LISTED_NAME_RE.test(s) ? [s] : [],
    };
    let content = serializeReuseStamp(fresh);
    await rm_2(stampPath, {
      force: true,
    });
    await writeFile(stampPath, content, {
      flag: "wx",
    }).catch(async (error) => {
      if (getErrnoCode(error) !== "EEXIST") throw error;
      await rm_2(stampPath, {
        force: true,
      });
      await writeFile(stampPath, content, {
        flag: "wx",
      });
    });
    return fresh;
  } catch (error) {
    logForDiagnosticsNoPII("warn", `${n}_sync_reuse_stamp_failed`, {
      code: getErrnoCode(error) ?? "unknown",
    });
    return null;
  }
}
//@ chunk-e6aww6q8.js:641150-641230 placement
/**
 * 需要写入复用标记时写入，否则删除。
 */
async function writeOrClearReuseStamp(root, n, r, s, h) {
  if (r) return writeReuseStamp(root, n, s, h);
  await takeReuseStamp(root);
  return null;
}
//@ chunk-e6aww6q8.js:641230-641323 placement
/**
 * 读取并删除复用标记，返回原内容。
 */
async function takeReuseStamp(root) {
  let reuseStamp = await readReuseStamp(root);
  await rm_2(lastCompleteRoundPath(root), {
    force: true,
  }).catch(() => {});
  return reuseStamp;
}
//@ chunk-e6aww6q8.js:641323-641598 placement
/**
 * 根据复用标记文件的修改时间判断是否在复用窗口内，返回 {reuse, ageMs, withinMs}。
 */
async function checkReuseWindow(root, n, r = Date.now()) {
  if (n === undefined || n <= 0)
    return {
      reuse: false,
    };
  let s;
  try {
    let y = await lstat(lastCompleteRoundPath(root));
    if (!y.isFile())
      return {
        reuse: false,
      };
    s = Math.floor(y.mtimeMs);
  } catch {
    return {
      reuse: false,
    };
  }
  let h = r - s;
  if (h < 0 || h >= n)
    return {
      reuse: false,
    };
  return {
    reuse: true,
    ageMs: Math.round(h),
    withinMs: n,
  };
}
//@ chunk-e6aww6q8.js:641639-641721 placement
/**
 * 清理同步技能 hook 时使用的标签与遥测事件名。
 */
var SKILLS_SYNC_HOOK_LABELS = {
  sync: "Skills",
  hooksOf: "synced skills",
  event: "skills_sync_hooks_removed",
};
//@ chunk-e6aww6q8.js:641721-641754 placement
/**
 * 清理已同步技能的 hook（同步被关闭时）。
 */
function removeSyncedSkillHooksFor(e) {
  removeSyncedSkillHooks(SKILLS_SYNC_HOOK_LABELS, syncedSkillRoots(), e);
}
//@ chunk-e6aww6q8.js:641754-641964 placement
/**
 * 清理不再被列出或技能文件已不存在的已同步技能目录记录。
 */
async function pruneGoneSkillDirs({ bucketRoot, listedDirs, removalTriedDirs, isSkillFileGone }) {
  let h = new Set();
  for (let y of syncedSkillRoots())
    if (
      !y.startsWith(bucketRoot + sep) ||
      (!listedDirs.has(y) && (removalTriedDirs.has(y) || (await isSkillFileGone(y))))
    )
      h.add(y);
  removeSyncedSkillHooks(SKILLS_SYNC_HOOK_LABELS, h, "skill_gone");
}
//@ chunk-e6aww6q8.js:641964-642004 placement
/**
 * 已同步技能根目录列表。
 */
function syncedSkillRoots() {
  return skillRootsUnder(join(getClaudeConfigDir(), SKILLS_SYNC_DIR_2));
}
//@ chunk-e6aww6q8.js:642004-642152 placement
var SKILLS_SYNC_SETTING = {
  settingKey: "syncClaudeAiSkills",
  policyKey: "allow_account_skills_sync",
  flagName: "tengu_claudeai_skills_sync_enabled",
  isTierInPlay: () => isSkillsCustomizationAllowed(),
};
//@ chunk-e6aww6q8.js:642152-642207 placement
/**
 * 更新账号级技能同步开关并返回是否启用。
 */
function refreshAccountSkillsSyncFlag() {
  refreshSkillsSyncVeto();
  let e = isAccountSkillsSyncEligible() && !getSkillsSyncVetoed();
  setAccountSkillsSyncEnabled(e);
  return e;
}
//@ chunk-e6aww6q8.js:642207-642270 placement
/**
 * 按设置是否可靠更新“技能同步被否决”状态。
 */
function refreshSkillsSyncVeto() {
  let e = isSyncSettingsUnreliable(SKILLS_SYNC_SETTING);
  setSkillsSyncVetoed(e);
  if (e && isAccountSkillsSyncDenied()) removeSyncedSkillHooksFor("sync_off");
}
//@ chunk-e6aww6q8.js:642270-642307 placement
/**
 * 刷新否决状态后返回。
 */
function refreshVetoAndRead() {
  invalidateCommandNames();
  refreshSkillsSyncVeto();
  return getSkillsSyncVetoed();
}
//@ chunk-e6aww6q8.js:642307-642394 placement
/**
 * 环境变量或会话引用同步是否开启。
 */
function isSkillsSyncEnvOn() {
  return env.CLAUDE_CODE_SYNC_SKILLS || env.CLAUDE_CODE_SYNC_SESSION_REFS || isFirstPartyClaudeAiSession();
}
//@ chunk-e6aww6q8.js:642394-642464 placement
/**
 * 技能定制是否被允许（未被限制为插件、未禁用、用户设置可用）。
 */
function isSkillsCustomizationAllowed() {
  return (
    !isRestrictedToPluginOnly("skills") &&
    !isCustomizationDisabled("skills") &&
    isSettingSourceEnabled("userSettings")
  );
}
//@ chunk-e6aww6q8.js:642464-642494 placement
/**
 * 读取技能同步设置。
 */
function readSkillsSyncSetting() {
  return isSyncEligibleHere(SKILLS_SYNC_SETTING);
}
//@ chunk-e6aww6q8.js:642494-642524 placement
/**
 * 读取技能同步设置（另一入口）。
 */
function readSkillsSyncSettingAlt() {
  return isPolicyUnresolved(SKILLS_SYNC_SETTING);
}
//@ chunk-e6aww6q8.js:642524-642554 placement
/**
 * 账号是否具备技能同步资格。
 */
function isAccountSkillsSyncEligible() {
  return isAccountSyncEligible(SKILLS_SYNC_SETTING);
}
//@ chunk-e6aww6q8.js:642554-642584 placement
/**
 * 账号级技能同步是否被拒绝。
 */
function isAccountSkillsSyncDenied() {
  return isAccountSyncDenied(SKILLS_SYNC_SETTING);
}
//@ chunk-e6aww6q8.js:642584-642638 placement
/**
 * 技能同步是否生效（未被否决且环境或账号开启）。
 */
function isSkillsSyncActive(e) {
  if (getSkillsSyncVetoed()) return false;
  return isSessionRefsSkillsSyncOn(e) || getAccountSkillsSyncEnabled();
}
//@ chunk-e6aww6q8.js:642638-642695 placement
/**
 * 环境变量或会话引用同步是否开启。
 */
function isSessionRefsSkillsSyncOn(e) {
  return !!env.CLAUDE_CODE_SYNC_SKILLS || isSessionRefsSyncEnabled(e);
}
//@ chunk-e6aww6q8.js:642695-642732 placement
/**
 * 同步开启且未被否决。
 */
function isSkillsSyncLive(e) {
  return isSessionRefsSkillsSyncOn(e) && !getSkillsSyncVetoed();
}
//@ chunk-e6aww6q8.js:642732-642850 placement
/**
 * 登记一个待完成的下载（Promise 与开始时间），返回其 resolve 函数。
 */
function registerPendingDownload(e, start) {
  let r;
  let promise = new Promise((resolve) => {
    r = resolve;
  });
  remoteToolsState().pendingDownloads.set(e, {
    promise,
    resolve: r,
    start,
  });
  return r;
}
//@ chunk-e6aww6q8.js:642850-643065 placement
/**
 * 触发某技能挂起的下载（只触发一次）并返回其完成 Promise；没有挂起下载时直接成功。
 */
function startPendingDownload(e) {
  let n = remoteToolsState().pendingDownloads.get(e);
  if (!n)
    return Promise.resolve({
      ok: true,
    });
  let start = n.start;
  n.start = undefined;
  try {
    start?.();
  } catch (error) {
    logError(toError(error));
    n.resolve({
      ok: false,
      reason: "download could not start",
    });
  }
  return n.promise;
}
//@ chunk-e6aww6q8.js:643065-643134 placement
/**
 * 说明某技能在本会话被关闭。
 */
function skillSwitchedOffText(e) {
  return `Skill ${e} is switched off for this session.`;
}
//@ chunk-e6aww6q8.js:643134-643213 placement
/**
 * 返回已列出的远程技能提示文本。
 */
function listedSkillText(e) {
  let n = remoteToolsState().listedSkills.get(e);
  return n?.command ? n.text : undefined;
}
//@ chunk-e6aww6q8.js:643213-643281 placement
/**
 * 该技能是否正在下载。
 */
function isSkillDownloadPending(e) {
  return remoteToolsState().pendingDownloads.get(e)?.start !== undefined;
}
//@ chunk-e6aww6q8.js:643281-643333 placement
/**
 * 该技能是否有待完成的下载。
 */
function hasPendingSkillDownload(e) {
  return remoteToolsState().pendingDownloads.has(e);
}
//@ chunk-e6aww6q8.js:643333-643385 placement
/**
 * 登记技能的占位命令（按去掉同步前缀的名字）。
 */
function registerSkillPlaceholder(deferredSyncedSkillCommand) {
  remoteToolsState().placeholders.set(
    stripSyncedSkillPrefix(deferredSyncedSkillCommand.name),
    deferredSyncedSkillCommand,
  );
}
//@ chunk-e6aww6q8.js:643385-643429 placement
/**
 * 移除技能的占位命令。
 */
function unregisterSkillPlaceholder(e) {
  remoteToolsState().placeholders.delete(e);
}
//@ chunk-e6aww6q8.js:643429-643597 placement
/**
 * 命令是否为同步技能的占位命令（与登记的占位同一对象或同一提示生成函数）。
 */
function isSyncedSkillPlaceholder(e) {
  let n = remoteToolsState().placeholders.get(stripSyncedSkillPrefix(e.name));
  return (
    n !== undefined &&
    (n === e ||
      (n.type === "prompt" && e.type === "prompt" && n.getPromptForCommand === e.getPromptForCommand))
  );
}
//@ chunk-e6aww6q8.js:643597-643802 placement
/**
 * 从占位、已列出技能与挂起下载中去掉不在给定集合里的项，返回删除数。
 */
function pruneSyncedSkillState(e) {
  let n = 0;
  let { placeholders, listedSkills, pendingDownloads } = remoteToolsState();
  for (let y of [placeholders, listedSkills])
    for (let key of y.keys())
      if (!e.has(key)) {
        y.delete(key);
        n++;
      }
  for (let key of pendingDownloads.keys()) if (!e.has(key)) pendingDownloads.delete(key);
  return n;
}
//@ chunk-e6aww6q8.js:643802-644014 placement
/**
 * 列出同步技能命令：占位命令（排除已被替换的）加上已列出技能的命令。
 */
function getSyncedSkillCommands() {
  let { placeholders, listedSkills } = remoteToolsState();
  if (placeholders.size === 0 && listedSkills.size === 0) return [];
  return [
    ...Array.from(placeholders).flatMap(([r, s]) => (isWithheldSkill(r) ? [] : [s])),
    ...Array.from(listedSkills.values()).flatMap((r) => (r.command ? [r.command] : [])),
  ];
}
//@ chunk-e6aww6q8.js:644014-644108 placement
/**
 * 技能已列出、没有命令且被扣留。
 */
function isWithheldSkill(e) {
  let n = remoteToolsState().listedSkills.get(e);
  return n !== undefined && !n.command && n.withheld === true;
}
//@ chunk-e6aww6q8.js:644108-644192 placement
/**
 * 被扣留技能的占位命令列表。
 */
function withheldSkillPlaceholders() {
  return Array.from(remoteToolsState().placeholders).flatMap(([e, n]) => (isWithheldSkill(e) ? [n] : []));
}
//@ chunk-e6aww6q8.js:644192-644312 placement
/**
 * 技能是否以插件形式同步：满足前置条件、未被否决、开启了插件同步且其他条件成立。
 */
function isSkillsAsPluginsActive(e) {
  if (!isConvertedSkillsAsPlugins(e)) return false;
  refreshSkillsSyncVeto();
  refreshSyncVeto();
  return (
    !getPluginsSyncVetoed() &&
    (Boolean(env.CLAUDE_CODE_SYNC_PLUGINS) || getAccountPluginsSyncEnabled()) &&
    isSkillsSyncActive(e) &&
    isSkillsCustomizationAllowed()
  );
}
//@ chunk-e6aww6q8.js:644312-644416 placement
/**
 * 托管 worker 或已转换技能列表询问时，在技能以插件形式同步的前提下是否转换技能列表询问。
 */
function shouldConvertSkillsListAsks(e) {
  return (
    (sessionHostKind() === "hosted_worker" ||
      SESSION_FEATURE_VALUES_SLOT.peek(e)?.convertedSkillsSkillsListAsks === true) &&
    isSkillsAsPluginsActive(e)
  );
}
//@ chunk-e6aww6q8.js:644416-644791 placement
/**
 * 本地非远程会话中异步判定是否把技能列表请求转为插件形式，结果锁定到会话状态（同时只有一个判定在途）。
 */
function primeSkillsListAskConversion(rootSession, n) {
  let r = SESSION_FEATURE_VALUES_SLOT.of(rootSession);
  if (
    !steadyFinchEnabled() ||
    sessionHostKind() !== "none" ||
    isRemoteOrCowork() ||
    r.convertedSkillsSkillsListAsks !== undefined ||
    r.convertedSkillsSkillsListPin !== undefined
  )
    return;
  let s = n()
    .catch((error) => {
      logError(error);
      return false;
    })
    .then((h) => {
      r.convertedSkillsSkillsListAsks ??= h && isConvertedSkillsAsPlugins(rootSession);
    })
    .catch(logError)
    .then(() => {
      if (r.convertedSkillsSkillsListPin === s) r.convertedSkillsSkillsListPin = undefined;
    });
  r.convertedSkillsSkillsListPin = s;
}
//@ chunk-e6aww6q8.js:644791-644991 placement
function isConvertedSkillsAsPlugins(e) {
  let n = SESSION_FEATURE_VALUES_SLOT.of(e);
  n.convertedSkillsAsPlugins ??=
    steadyFinchEnabled() &&
    isHostedWorkerOrLocal() &&
    (!isSessionRefsSyncEnabled(e) || Boolean(env.CLAUDE_CODE_SYNC_SKILLS)) &&
    (Boolean(env.CLAUDE_CODE_SYNC_PLUGINS) || getAccountPluginsSyncEnabled());
  return n.convertedSkillsAsPlugins;
}
//@ chunk-e6aww6q8.js:644991-645056 placement
/**
 * 技能转成插件时使用的列表固定标记。
 */
function convertedSkillsListPin(e) {
  return SESSION_FEATURE_VALUES_SLOT.peek(e)?.convertedSkillsSkillsListPin;
}
//@ chunk-e6aww6q8.js:645056-645129 placement
/**
 * 宿主类型是否为 hosted worker，或本地且非远程/协作。
 */
function isHostedWorkerOrLocal() {
  let e = sessionHostKind();
  return e === "hosted_worker" || (e === "none" && !isRemoteOrCowork());
}
//@ chunk-e6aww6q8.js:645129-645300 placement
/**
 * 按键合并两组行：已有行若在新行中有同键项则经合并函数合成，再与新行一起按键去重。
 */
function mergeRowsByKey(e, n, r, s) {
  let h = s === undefined ? undefined : new Map(n.map((y) => [r(y), y]));
  return Ji(
    [
      ...e.map((y) => {
        let S = h?.get(r(y));
        return S !== undefined && s !== undefined ? s(y, S) : y;
      }),
      ...n,
    ],
    r,
  );
}
//@ chunk-e6aww6q8.js:645300-646136 placement
/**
 * 对比远端列表与本地清单，计算要下载的项（新增或名称/版本/更新时间变化）、要删除的项、沿用项与在用目录；名字非法或目录名冲突时记诊断并沿用旧行。
 */
function planSyncDownloads(e, n, { idOf, dirFor, invalidNameTag, collisionTag, carry, markCollisionLoser }) {
  let isObject = (Ie) => typeof Ie === "object" && Ie !== null;
  e = Array.isArray(e) ? e.filter(isObject) : [];
  n = Array.isArray(n) ? n.filter(isObject) : [];
  let prevById = new Map(n.map((Ie) => [idOf(Ie), Ie]));
  let listedIds = new Set(e.map((Ie) => idOf(Ie)));
  let liveDirs = new Set();
  let liveDirsFolded = new Set();
  let toDownload = [];
  let carryover = [];
  let carryoverOwningLiveDir = new Set();
  for (let Ie of e) {
    let prev = prevById.get(idOf(Ie));
    if (prev !== undefined && carry !== undefined) prev = carry(prev, Ie);
    let dir;
    try {
      dir = dirFor(Ie.name);
    } catch {
      logForDiagnosticsNoPII("warn", invalidNameTag);
      if (prev) carryover.push(prev);
      continue;
    }
    if (liveDirsFolded.has(stripInvisibleChars_3(dir))) {
      logForDiagnosticsNoPII("warn", collisionTag);
      if (prev) carryover.push(markCollisionLoser ? markCollisionLoser(prev) : prev);
      continue;
    }
    liveDirs.add(dir);
    liveDirsFolded.add(stripInvisibleChars_3(dir));
    if (
      !prev ||
      prev.updatedAt !== Ie.updatedAt ||
      prev.name !== Ie.name ||
      prev.requestedVersion !== Ie.requestedVersion
    )
      toDownload.push({
        item: Ie,
        prev,
      });
    else {
      carryover.push(prev);
      carryoverOwningLiveDir.add(idOf(prev));
    }
  }
  let toRemove = n.filter((Ie) => !listedIds.has(idOf(Ie)));
  return {
    toDownload,
    toRemove,
    carryover,
    liveDirs,
    carryoverOwningLiveDir,
  };
}
//@ chunk-e6aww6q8.js:646136-646146 placement
/**
 * 延迟重列的最大轮数（6）。
 */
var MAX_DEFERRED_RELIST_ROUNDS = 6;
//@ chunk-e6aww6q8.js:646146-646200 placement
/**
 * 插件同步是否生效（未被否决且环境或账号开启）。
 */
function isPluginsSyncActive(e) {
  if (getPluginsSyncVetoed()) return false;
  return isPluginsSyncEnvOn(e) || getAccountPluginsSyncEnabled();
}
//@ chunk-e6aww6q8.js:646200-646257 placement
/**
 * 环境变量或会话引用同步是否开启。
 */
function isPluginsSyncEnvOn(e) {
  return env.CLAUDE_CODE_SYNC_PLUGINS || isSessionRefsSyncEnabled(e);
}
//@ chunk-e6aww6q8.js:646257-646294 placement
/**
 * 插件同步是否活着（开启且未被否决）。
 */
function isPluginsSyncLive(e) {
  return isPluginsSyncEnvOn(e) && !getPluginsSyncVetoed();
}
//@ chunk-e6aww6q8.js:646294-646369 placement
/**
 * 插件安装超时（环境变量，默认 30 秒）。
 */
function pluginInstallTimeoutMs() {
  return env.CLAUDE_CODE_SYNC_PLUGINS_INSTALL_TIMEOUT_MS ?? 30000;
}
//@ chunk-e6aww6q8.js:646369-646438 placement
/**
 * 插件 MCP 启动超时（环境变量，默认 10 秒）。
 */
function pluginMcpTimeoutMs() {
  return env.CLAUDE_CODE_SYNC_PLUGINS_MCP_TIMEOUT_MS ?? 1e4;
}
//@ chunk-e6aww6q8.js:646438-646511 placement
/**
 * 启动首轮插件同步（只触发一次）并返回其 Promise。
 */
function startFirstPluginsSync(rootSession, n) {
  rootSession.pluginsSync.firstSyncPromise ??= runPluginsSyncRound(rootSession, n, {
    startup: true,
  });
}
//@ chunk-e6aww6q8.js:646511-646622 placement
/**
 * 启动时触发首轮插件同步（只触发一次），返回其 Promise。
 */
function runFirstPluginsSync(session, credentials) {
  session.pluginsSync.firstSyncPromise ??= runPluginsSyncRound(session, credentials, {
    startup: true,
  });
  return session.pluginsSync.firstSyncPromise;
}
//@ chunk-e6aww6q8.js:646622-646788 placement
/**
 * CCR 非交互会话在开启 CLAUDE_CODE_CCR_EARLY_PLUGINS_SYNC 时提前开始插件同步。
 */
function startEarlyPluginsSync(rootSession, n, r) {
  if (
    !env.CLAUDE_CODE_CCR_EARLY_PLUGINS_SYNC ||
    rootSession.host.launchOptions.isInteractive() ||
    !isPluginsSyncEnvOn(rootSession) ||
    r()
  )
    return false;
  refreshSyncVeto();
  if (!isPluginsSyncLive(rootSession)) return false;
  startFirstPluginsSync(rootSession, n);
  return true;
}
//@ chunk-e6aww6q8.js:646788-647017 placement
/**
 * 取消延迟重列表与在途请求，排在上一轮之后重新跑一轮插件同步。
 */
function rerunPluginsSync(session, credentials) {
  cancelDeferredRelist(session);
  sessionSkillManifestSlot.of(session).discardInflight();
  session.pluginsSync.firstSyncPromise = (session.pluginsSync.firstSyncPromise ?? Promise.resolve(false))
    .catch(() => {})
    .then(() => runPluginsSyncRound(session, credentials))
    .finally(() => cancelDeferredRelist(session));
  return session.pluginsSync.firstSyncPromise;
}
//@ chunk-e6aww6q8.js:647017-647187 placement
function scheduleDeferredRelist(e, n) {
  let pluginsSync = e.pluginsSync;
  cancelDeferredRelist(e);
  pluginsSync.deferredRelist = setTimeout(
    (s, h) => {
      s.pluginsSync.deferredRelist = null;
      rerunPluginsSync(s, h).catch(logError);
    },
    MAX_SYNC_REUSE_AGE_MS,
    e,
    n,
  );
  pluginsSync.deferredRelist.unref?.();
}
//@ chunk-e6aww6q8.js:647187-647235 placement
/**
 * 已同步插件目录排序后拼成一行的键。
 */
function syncedPluginDirsKey() {
  return getSyncedPluginDirs().toSorted().join(`
`);
}
//@ chunk-e6aww6q8.js:647235-647301 placement
/**
 * 上轮完整列表里是否还有待删除项。
 */
function hasRemovalOwed(pluginsSync) {
  return (pluginsSync.lastCompleteList?.removalOwed.size ?? 0) > 0;
}
//@ chunk-e6aww6q8.js:647301-647417 placement
function cancelDeferredRelist(e) {
  let pluginsSync = e.pluginsSync;
  if (pluginsSync.deferredRelist !== null) {
    clearTimeout(pluginsSync.deferredRelist);
    pluginsSync.deferredRelist = null;
  }
}
//@ chunk-e6aww6q8.js:647417-647465 placement
/**
 * 插件同步记录的错误列表。
 */
function pluginsSyncErrors(session) {
  return session.pluginsSync.syncErrors;
}
export {
  getSyncedSkillCommands,
  refreshVetoAndRead,
  isSkillsSyncActive,
  isPluginsSyncActive,
  startFirstPluginsSync,
  isSkillsSyncLive,
  isSkillsCustomizationAllowed,
  isPluginsSyncLive,
  runFirstPluginsSync,
  pluginInstallTimeoutMs,
  pluginMcpTimeoutMs,
  rerunPluginsSync,
  refreshSkillsSyncVeto,
  pluginsSyncErrors,
  startEarlyPluginsSync,
  refreshAccountSkillsSyncFlag,
  primeSkillsListAskConversion,
  removeSyncedSkillDir,
  withheldSkillPlaceholders,
  isWithheldSkill,
  startPendingDownload,
  listedSkillText,
  isSyncedSkillPlaceholder,
  isSkillDownloadPending,
  removeSyncedSkillHooksFor,
  hasPendingSkillDownload,
  readManifestText,
  parseManifestJson,
  parseValidRows,
  skillSwitchedOffText,
  stringArray,
  omitKeys_2,
  mergeManifestRows,
  mergeStaleDirs,
  MAX_DEFERRED_RELIST_ROUNDS,
  planSyncDownloads,
  readReuseStamp,
  syncedPluginDirsKey,
  isSkillsAsPluginsActive,
  checkReuseWindow,
  syncReuseWithinMs,
  scheduleDeferredRelist,
  mergeRowsByKey,
  takeReuseStamp,
  replaceRowsWithAttribution,
  writeOrClearReuseStamp,
  hasRemovalOwed,
  lastCompleteRoundPath,
  isSkillsSyncEnvOn,
  MAX_SYNCED_SKILL_BYTES,
  isSessionRefsSkillsSyncOn,
  readSkillsSyncSettingAlt,
  isAccountSkillsSyncDenied,
  readSkillsSyncSetting,
  convertedSkillsListPin,
  shouldConvertSkillsListAsks,
  pruneSyncedSkillState,
  registerSkillPlaceholder,
  registerPendingDownload,
  unregisterSkillPlaceholder,
  pruneGoneSkillDirs,
};
