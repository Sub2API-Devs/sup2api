/**
 * utils/claudeAiSync/skillsSync.ts
 *
 * 2.1.316 新增：claude.ai 技能同步
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (74)
 * attribution: placement 73, layout 1
 */
import { rm, open, writeFile, lutimes, lstat } from "fs/promises";
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
import { getClaudeConfigDir } from "../markdownConfigLoader.js";
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
import { remoteToolsState } from "../../remote/tools/callResults.js";
import { isSessionRefsSyncEnabled } from "./sessionRefsGate.js";
import { logError } from "../log.js";
import { stripSyncedSkillPrefix } from "../../skills/syncedSkills.js";
import { sessionHostKind } from "../telemetry/memorySummary.js";
import { SESSION_FEATURE_VALUES_SLOT } from "../../bootstrap/sessionFeatureValues.js";
import { steadyFinchEnabled } from "../permissions/permissionRulePayload.js";
import { isRemoteOrCowork } from "../../skills/skillSources.js";
import { uniqByExport } from "../../../vendor/lodash-es/uniqBy.js";
import { runPluginsSyncRound } from "./pluginsSync.js";
import { sessionSkillManifestSlot } from "../../services/plugins/accountSync/sessionSkillManifest.js";

//@ chunk-5xgkngpb.js:648729-648784 placement
/**
 * 删除某同步技能目录。
 */
async function removeSyncedSkillDir(dirName, root) {
  await rm(bucketDirPath(dirName, root), {
    force: true,
  });
}
//@ chunk-5xgkngpb.js:648784-648800 placement
/**
 * 读取同步技能文件时的大小上限（4 MiB）。
 */
var MAX_SYNCED_SKILL_BYTES = 4194304;
//@ chunk-5xgkngpb.js:648800-648882 placement
/**
 * 只保留数组里的字符串项。
 */
function stringArray(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === "string") : undefined;
}
//@ chunk-5xgkngpb.js:648882-649060 placement
/**
 * 合并清单行：先放额外行，再放旧行中未被移除的，最后用新行覆盖（按键去重）。
 */
function mergeManifestRows(validRows, previousRows, keyOf, removedIds, validRows_2 = []) {
  let byKey = new Map();
  for (let row of validRows_2) byKey.set(keyOf(row), row);
  for (let row of previousRows ?? []) if (!removedIds.has(keyOf(row))) byKey.set(keyOf(row), row);
  for (let row of validRows) byKey.set(keyOf(row), row);
  return Array.from(byKey.values());
}
//@ chunk-5xgkngpb.js:649060-649198 placement
/**
 * 合并过期目录列表：加上新的、去掉已处理的，结果为空时返回 undefined。
 */
function mergeStaleDirs(previousDirs, manifestDirs, removedDirs) {
  let merged = new Set(previousDirs ?? []);
  for (let dirName of stringArray(manifestDirs) ?? []) merged.add(dirName);
  for (let dirName of removedDirs) merged.delete(dirName);
  return merged.size > 0 ? Array.from(merged) : undefined;
}
//@ chunk-5xgkngpb.js:649198-649328 placement
/**
 * 用 schema 逐条解析数组，只保留解析成功的项。
 */
function parseValidRows(schema, rows) {
  if (!Array.isArray(rows)) return [];
  let valid = [];
  for (let row of rows) {
    let parseResult = schema.safeParse(row);
    if (parseResult.success) valid.push(parseResult.data);
  }
  return valid;
}
//@ chunk-5xgkngpb.js:649328-649503 placement
/**
 * 用新行替换同键旧行，并报告是否有行的归属（等价判断不通过）发生变化。
 */
function replaceRowsWithAttribution(rows, carryover, keyOf, sameMarketplace) {
  let carryoverByKey = new Map(carryover.map((row) => [keyOf(row), row]));
  let attributionMoved = false;
  return {
    rows: rows.map((row) => {
      let prevRow = carryoverByKey.get(keyOf(row));
      if (prevRow === undefined) return row;
      if (!sameMarketplace(row, prevRow)) attributionMoved = true;
      return prevRow;
    }),
    attributionMoved,
  };
}
//@ chunk-5xgkngpb.js:649503-649609 placement
/**
 * 返回去掉指定键后的对象副本。
 */
function omitKeys_2(object, keys) {
  let keySet = new Set(keys);
  let result = {};
  for (let [key, value] of Object.entries(object ?? {})) if (!keySet.has(key)) result[key] = value;
  return result;
}
//@ chunk-5xgkngpb.js:649609-649795 placement
/**
 * 读取同步清单文件内容（有大小限制）；非 ENOENT 失败时记诊断（超大归为 parse_or_size）并返回 null。
 */
async function readManifestText(root, path) {
  try {
    return (await readFileChecked(root, MAX_SYNCED_SKILL_BYTES)).content;
  } catch (error) {
    if (path !== null && !isENOENT(error)) {
      let errnoCode = getErrnoCode(error);
      logForDiagnosticsNoPII("warn", path, {
        code: errnoCode === "ERR_FILE_TOO_LARGE" ? "parse_or_size" : (errnoCode ?? "unknown"),
      });
    }
    return null;
  }
}
//@ chunk-5xgkngpb.js:649795-650007 placement
/**
 * 解析清单 JSON 并按 schema 校验，失败时记诊断（parse_or_size / not_an_object）并返回 null。
 */
function parseManifestJson(manifestText, schema, fallback) {
  let parsed;
  try {
    parsed = jsonParse(manifestText);
  } catch {
    if (fallback !== null)
      logForDiagnosticsNoPII("warn", fallback, {
        code: "parse_or_size",
      });
    return null;
  }
  let parseResult = schema.safeParse(parsed);
  if (!parseResult.success) {
    if (fallback !== null)
      logForDiagnosticsNoPII("warn", fallback, {
        code: "not_an_object",
      });
    return null;
  }
  return parseResult.data;
}
//@ chunk-5xgkngpb.js:650397-650412 placement
/**
 * 同步复用的最长时间（10 分钟）。
 */
var MAX_SYNC_REUSE_AGE_MS = 600000;
//@ chunk-5xgkngpb.js:650412-650500 placement
/**
 * 从环境变量取同步复用窗口（正整数才生效）。
 */
function syncReuseWithinMs() {
  let CLAUDE_CODE_SYNC_REUSE_WITHIN_MS = env.CLAUDE_CODE_SYNC_REUSE_WITHIN_MS;
  return CLAUDE_CODE_SYNC_REUSE_WITHIN_MS !== undefined && CLAUDE_CODE_SYNC_REUSE_WITHIN_MS > 0
    ? CLAUDE_CODE_SYNC_REUSE_WITHIN_MS
    : undefined;
}
//@ chunk-5xgkngpb.js:650500-650534 placement
/**
 * 同步技能“最后一轮完成”标记文件路径。
 */
function lastCompleteRoundPath(root) {
  return join(root, LAST_COMPLETE_ROUND_FILE);
}
//@ chunk-5xgkngpb.js:650534-650598 placement
/**
 * 形如 UUID 的字符形式（复用标记里的令牌）。
 */
var UUID_LIKE_RE = /^[0-9a-f-]{36}$/;
var SAFE_LISTED_NAME_RE = /^[A-Za-z0-9_.-]{1,64}$/;
var MAX_REUSE_STAMP_BYTES = 1024;
//@ chunk-5xgkngpb.js:650598-650658 placement
/**
 * 把复用标记序列化成 “令牌 列表”。
 */
function serializeReuseStamp(stamp) {
  return `${stamp.token} ${stamp.listedFor.join(",")}`;
}
//@ chunk-5xgkngpb.js:650658-650904 placement
/**
 * 读取同步复用标记文件：内容为"令牌 列表"，令牌格式不符返回 null。
 */
async function readReuseStamp(root) {
  let stampPath = lastCompleteRoundPath(root);
  try {
    await using handle = await open(stampPath, readOnlyNoFollowFlags() | READ_LIMITS);
    let { content } = await readFileHandleChecked(handle, stampPath, MAX_REUSE_STAMP_BYTES);
    let [timestamp = "", listedForText = ""] = content.split(" ", 2);
    if (!UUID_LIKE_RE.test(timestamp)) return null;
    return {
      token: timestamp,
      listedFor: listedForText.split(",").filter((name) => SAFE_LISTED_NAME_RE.test(name)),
    };
  } catch {
    return null;
  }
}
//@ chunk-5xgkngpb.js:650904-651516 placement
/**
 * 写入或续期同步复用标记：已有令牌时把当前项加入列表（文件存在则只更新时间）；否则生成新令牌重建文件。失败时记诊断返回 null。
 */
async function writeReuseStamp(root, kind, reusable, listedName) {
  let stampPath = lastCompleteRoundPath(root);
  try {
    if (reusable !== null) {
      let updated = {
        token: reusable.token,
        listedFor:
          reusable.listedFor.includes(listedName) || !SAFE_LISTED_NAME_RE.test(listedName)
            ? reusable.listedFor
            : [...reusable.listedFor, listedName],
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
      return await readReuseStamp(root);
    }
    let fresh = {
      token: randomUUID(),
      listedFor: SAFE_LISTED_NAME_RE.test(listedName) ? [listedName] : [],
    };
    let content = serializeReuseStamp(fresh);
    await rm(stampPath, {
      force: true,
    });
    await writeFile(stampPath, content, {
      flag: "wx",
    }).catch(async (error) => {
      if (getErrnoCode(error) !== "EEXIST") throw error;
      await rm(stampPath, {
        force: true,
      });
      await writeFile(stampPath, content, {
        flag: "wx",
      });
    });
    return fresh;
  } catch (error) {
    logForDiagnosticsNoPII("warn", `${kind}_sync_reuse_stamp_failed`, {
      code: getErrnoCode(error) ?? "unknown",
    });
    return null;
  }
}
//@ chunk-5xgkngpb.js:651516-651596 placement
/**
 * 需要写入复用标记时写入，否则删除。
 */
async function writeOrClearReuseStamp(root, kind, reusable, unused, listedName) {
  if (reusable) return writeReuseStamp(root, kind, unused, listedName);
  await takeReuseStamp(root);
  return null;
}
//@ chunk-5xgkngpb.js:651596-651689 placement
/**
 * 读取并删除复用标记，返回原内容。
 */
async function takeReuseStamp(root) {
  let reuseStamp = await readReuseStamp(root);
  await rm(lastCompleteRoundPath(root), {
    force: true,
  }).catch(() => {});
  return reuseStamp;
}
//@ chunk-5xgkngpb.js:651689-651964 placement
/**
 * 根据复用标记文件的修改时间判断是否在复用窗口内，返回 {reuse, ageMs, withinMs}。
 */
async function checkReuseWindow(root, withinMs, now = Date.now()) {
  if (withinMs === undefined || withinMs <= 0)
    return {
      reuse: false,
    };
  let writtenAt;
  try {
    let stampStats = await lstat(lastCompleteRoundPath(root));
    if (!stampStats.isFile())
      return {
        reuse: false,
      };
    writtenAt = Math.floor(stampStats.mtimeMs);
  } catch {
    return {
      reuse: false,
    };
  }
  let ageMs = now - writtenAt;
  if (ageMs < 0 || ageMs >= withinMs)
    return {
      reuse: false,
    };
  return {
    reuse: true,
    ageMs: Math.round(ageMs),
    withinMs,
  };
}
//@ chunk-5xgkngpb.js:652005-652087 placement
/**
 * 清理同步技能 hook 时使用的标签与遥测事件名。
 */
var SKILLS_SYNC_HOOK_LABELS = {
  sync: "Skills",
  hooksOf: "synced skills",
  event: "skills_sync_hooks_removed",
};
//@ chunk-5xgkngpb.js:652087-652120 placement
/**
 * 清理已同步技能的 hook（同步被关闭时）。
 */
function removeSyncedSkillHooksFor(removal) {
  removeSyncedSkillHooks(SKILLS_SYNC_HOOK_LABELS, syncedSkillRoots(), removal);
}
//@ chunk-5xgkngpb.js:652120-652330 placement
/**
 * 清理不再被列出或技能文件已不存在的已同步技能目录记录。
 */
async function pruneGoneSkillDirs({ bucketRoot, listedDirs, removalTriedDirs, isSkillFileGone }) {
  let goneDirs = new Set();
  for (let root of syncedSkillRoots())
    if (
      !root.startsWith(bucketRoot + sep) ||
      (!listedDirs.has(root) && (removalTriedDirs.has(root) || (await isSkillFileGone(root))))
    )
      goneDirs.add(root);
  removeSyncedSkillHooks(SKILLS_SYNC_HOOK_LABELS, goneDirs, "skill_gone");
}
//@ chunk-5xgkngpb.js:652330-652370 placement
/**
 * 已同步技能根目录列表。
 */
function syncedSkillRoots() {
  return skillRootsUnder(join(getClaudeConfigDir(), SKILLS_SYNC_DIR_2));
}
//@ chunk-5xgkngpb.js:652370-652518 placement
var SKILLS_SYNC_SETTING = {
  settingKey: "syncClaudeAiSkills",
  policyKey: "allow_account_skills_sync",
  flagName: "tengu_claudeai_skills_sync_enabled",
  isTierInPlay: () => isSkillsCustomizationAllowed(),
};
//@ chunk-5xgkngpb.js:652518-652573 placement
/**
 * 更新账号级技能同步开关并返回是否启用。
 */
function refreshAccountSkillsSyncFlag() {
  refreshSkillsSyncVeto();
  let enabled = isAccountSkillsSyncEligible() && !getSkillsSyncVetoed();
  setAccountSkillsSyncEnabled(enabled);
  return enabled;
}
//@ chunk-5xgkngpb.js:652573-652636 placement
/**
 * 按设置是否可靠更新“技能同步被否决”状态。
 */
function refreshSkillsSyncVeto() {
  let vetoed = isSyncSettingsUnreliable(SKILLS_SYNC_SETTING);
  setSkillsSyncVetoed(vetoed);
  if (vetoed && isAccountSkillsSyncDenied()) removeSyncedSkillHooksFor("sync_off");
}
//@ chunk-5xgkngpb.js:652636-652673 placement
/**
 * 刷新否决状态后返回。
 */
function refreshVetoAndRead() {
  invalidateCommandNames();
  refreshSkillsSyncVeto();
  return getSkillsSyncVetoed();
}
//@ chunk-5xgkngpb.js:652673-652760 placement
/**
 * 环境变量或会话引用同步是否开启。
 */
function isSkillsSyncEnvOn() {
  return env.CLAUDE_CODE_SYNC_SKILLS || env.CLAUDE_CODE_SYNC_SESSION_REFS || isFirstPartyClaudeAiSession();
}
//@ chunk-5xgkngpb.js:652760-652830 placement
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
//@ chunk-5xgkngpb.js:652830-652860 placement
/**
 * 读取技能同步设置。
 */
function readSkillsSyncSetting() {
  return isSyncEligibleHere(SKILLS_SYNC_SETTING);
}
//@ chunk-5xgkngpb.js:652860-652890 placement
/**
 * 读取技能同步设置（另一入口）。
 */
function readSkillsSyncSettingAlt() {
  return isPolicyUnresolved(SKILLS_SYNC_SETTING);
}
//@ chunk-5xgkngpb.js:652890-652920 placement
/**
 * 账号是否具备技能同步资格。
 */
function isAccountSkillsSyncEligible() {
  return isAccountSyncEligible(SKILLS_SYNC_SETTING);
}
//@ chunk-5xgkngpb.js:652920-652950 placement
/**
 * 账号级技能同步是否被拒绝。
 */
function isAccountSkillsSyncDenied() {
  return isAccountSyncDenied(SKILLS_SYNC_SETTING);
}
//@ chunk-5xgkngpb.js:652950-653004 placement
/**
 * 技能同步是否生效（未被否决且环境或账号开启）。
 */
function isSkillsSyncActive(session) {
  if (getSkillsSyncVetoed()) return false;
  return isSessionRefsSkillsSyncOn(session) || getAccountSkillsSyncEnabled();
}
//@ chunk-5xgkngpb.js:653004-653060 layout
function isSkillsSyncForced(session) {
  return isSkillsSyncActive(session) || (remoteToolsState().catalogAlone && !getSkillsSyncVetoed());
}
//@ chunk-5xgkngpb.js:653060-653117 placement
/**
 * 环境变量或会话引用同步是否开启。
 */
function isSessionRefsSkillsSyncOn(session) {
  return !!env.CLAUDE_CODE_SYNC_SKILLS || isSessionRefsSyncEnabled(session);
}
//@ chunk-5xgkngpb.js:653117-653154 placement
/**
 * 同步开启且未被否决。
 */
function isSkillsSyncLive(session) {
  return isSessionRefsSkillsSyncOn(session) && !getSkillsSyncVetoed();
}
//@ chunk-5xgkngpb.js:653154-653272 placement
/**
 * 登记一个待完成的下载（Promise 与开始时间），返回其 resolve 函数。
 */
function registerPendingDownload(skillName, start) {
  let resolve;
  let promise = new Promise((resolve_2) => {
    resolve = resolve_2;
  });
  remoteToolsState().pendingDownloads.set(skillName, {
    promise,
    resolve,
    start,
  });
  return resolve;
}
//@ chunk-5xgkngpb.js:653272-653487 placement
/**
 * 触发某技能挂起的下载（只触发一次）并返回其完成 Promise；没有挂起下载时直接成功。
 */
function startPendingDownload(skillName) {
  let entry = remoteToolsState().pendingDownloads.get(skillName);
  if (!entry)
    return Promise.resolve({
      ok: true,
    });
  let start = entry.start;
  entry.start = undefined;
  try {
    start?.();
  } catch (error) {
    logError(toError(error));
    entry.resolve({
      ok: false,
      reason: "download could not start",
    });
  }
  return entry.promise;
}
//@ chunk-5xgkngpb.js:653487-653556 placement
/**
 * 说明某技能在本会话被关闭。
 */
function skillSwitchedOffText(skillName) {
  return `Skill ${skillName} is switched off for this session.`;
}
//@ chunk-5xgkngpb.js:653556-653635 placement
/**
 * 返回已列出的远程技能提示文本。
 */
function listedSkillText(skillName) {
  let entry = remoteToolsState().listedSkills.get(skillName);
  return entry?.command ? entry.text : undefined;
}
//@ chunk-5xgkngpb.js:653635-653703 placement
/**
 * 该技能是否正在下载。
 */
function isSkillDownloadPending(skillName) {
  return remoteToolsState().pendingDownloads.get(skillName)?.start !== undefined;
}
//@ chunk-5xgkngpb.js:653703-653755 placement
/**
 * 该技能是否有待完成的下载。
 */
function hasPendingSkillDownload(skillName) {
  return remoteToolsState().pendingDownloads.has(skillName);
}
//@ chunk-5xgkngpb.js:653755-653807 placement
/**
 * 登记技能的占位命令（按去掉同步前缀的名字）。
 */
function registerSkillPlaceholder(deferredSyncedSkillCommand) {
  remoteToolsState().placeholders.set(
    stripSyncedSkillPrefix(deferredSyncedSkillCommand.name),
    deferredSyncedSkillCommand,
  );
}
//@ chunk-5xgkngpb.js:653807-653851 placement
/**
 * 移除技能的占位命令。
 */
function unregisterSkillPlaceholder(skillName) {
  remoteToolsState().placeholders.delete(skillName);
}
//@ chunk-5xgkngpb.js:653851-654019 placement
/**
 * 命令是否为同步技能的占位命令（与登记的占位同一对象或同一提示生成函数）。
 */
function isSyncedSkillPlaceholder(placeholder) {
  let tracked = remoteToolsState().placeholders.get(stripSyncedSkillPrefix(placeholder.name));
  return (
    tracked !== undefined &&
    (tracked === placeholder ||
      (tracked.type === "prompt" &&
        placeholder.type === "prompt" &&
        tracked.getPromptForCommand === placeholder.getPromptForCommand))
  );
}
//@ chunk-5xgkngpb.js:654019-654224 placement
/**
 * 从占位、已列出技能与挂起下载中去掉不在给定集合里的项，返回删除数。
 */
function pruneSyncedSkillState(liveNames) {
  let removed = 0;
  let { placeholders, listedSkills, pendingDownloads } = remoteToolsState();
  for (let map of [placeholders, listedSkills])
    for (let key of map.keys())
      if (!liveNames.has(key)) {
        map.delete(key);
        removed++;
      }
  for (let key of pendingDownloads.keys()) if (!liveNames.has(key)) pendingDownloads.delete(key);
  return removed;
}
//@ chunk-5xgkngpb.js:654224-654436 placement
/**
 * 列出同步技能命令：占位命令（排除已被替换的）加上已列出技能的命令。
 */
function getSyncedSkillCommands() {
  let { placeholders, listedSkills } = remoteToolsState();
  if (placeholders.size === 0 && listedSkills.size === 0) return [];
  return [
    ...Array.from(placeholders).flatMap(([name, command]) => (isWithheldSkill(name) ? [] : [command])),
    ...Array.from(listedSkills.values()).flatMap((entry) => (entry.command ? [entry.command] : [])),
  ];
}
//@ chunk-5xgkngpb.js:654436-654530 placement
/**
 * 技能已列出、没有命令且被扣留。
 */
function isWithheldSkill(skillName) {
  let entry = remoteToolsState().listedSkills.get(skillName);
  return entry !== undefined && !entry.command && entry.withheld === true;
}
//@ chunk-5xgkngpb.js:654530-654614 placement
/**
 * 被扣留技能的占位命令列表。
 */
function withheldSkillPlaceholders() {
  return Array.from(remoteToolsState().placeholders).flatMap(([name, placeholder]) =>
    isWithheldSkill(name) ? [placeholder] : [],
  );
}
//@ chunk-5xgkngpb.js:654614-654734 placement
/**
 * 技能是否以插件形式同步：满足前置条件、未被否决、开启了插件同步且其他条件成立。
 */
function isSkillsAsPluginsActive(session) {
  if (!isConvertedSkillsAsPlugins(session)) return false;
  refreshSkillsSyncVeto();
  refreshSyncVeto();
  return (
    !getPluginsSyncVetoed() &&
    (Boolean(env.CLAUDE_CODE_SYNC_PLUGINS) || getAccountPluginsSyncEnabled()) &&
    isSkillsSyncActive(session) &&
    isSkillsCustomizationAllowed()
  );
}
//@ chunk-5xgkngpb.js:654734-654838 placement
/**
 * 托管 worker 或已转换技能列表询问时，在技能以插件形式同步的前提下是否转换技能列表询问。
 */
function shouldConvertSkillsListAsks(session) {
  return (
    (sessionHostKind() === "hosted_worker" ||
      SESSION_FEATURE_VALUES_SLOT.peek(session)?.convertedSkillsSkillsListAsks === true) &&
    isSkillsAsPluginsActive(session)
  );
}
//@ chunk-5xgkngpb.js:654838-655213 placement
/**
 * 本地非远程会话中异步判定是否把技能列表请求转为插件形式，结果锁定到会话状态（同时只有一个判定在途）。
 */
function primeSkillsListAskConversion(session, listAsks) {
  let featureValues = SESSION_FEATURE_VALUES_SLOT.of(session);
  if (
    !steadyFinchEnabled() ||
    sessionHostKind() !== "none" ||
    isRemoteOrCowork() ||
    featureValues.convertedSkillsSkillsListAsks !== undefined ||
    featureValues.convertedSkillsSkillsListPin !== undefined
  )
    return;
  let pinPromise = listAsks()
    .catch((error) => {
      logError(error);
      return false;
    })
    .then((converted) => {
      featureValues.convertedSkillsSkillsListAsks ??= converted && isConvertedSkillsAsPlugins(session);
    })
    .catch(logError)
    .then(() => {
      if (featureValues.convertedSkillsSkillsListPin === pinPromise)
        featureValues.convertedSkillsSkillsListPin = undefined;
    });
  featureValues.convertedSkillsSkillsListPin = pinPromise;
}
//@ chunk-5xgkngpb.js:655213-655413 placement
function isConvertedSkillsAsPlugins(session) {
  let featureValues = SESSION_FEATURE_VALUES_SLOT.of(session);
  featureValues.convertedSkillsAsPlugins ??=
    steadyFinchEnabled() &&
    isHostedWorkerOrLocal() &&
    (!isSessionRefsSyncEnabled(session) || Boolean(env.CLAUDE_CODE_SYNC_SKILLS)) &&
    (Boolean(env.CLAUDE_CODE_SYNC_PLUGINS) || getAccountPluginsSyncEnabled());
  return featureValues.convertedSkillsAsPlugins;
}
//@ chunk-5xgkngpb.js:655413-655478 placement
/**
 * 技能转成插件时使用的列表固定标记。
 */
function convertedSkillsListPin(session) {
  return SESSION_FEATURE_VALUES_SLOT.peek(session)?.convertedSkillsSkillsListPin;
}
//@ chunk-5xgkngpb.js:655478-655551 placement
/**
 * 宿主类型是否为 hosted worker，或本地且非远程/协作。
 */
function isHostedWorkerOrLocal() {
  let hostKind = sessionHostKind();
  return hostKind === "hosted_worker" || (hostKind === "none" && !isRemoteOrCowork());
}
//@ chunk-5xgkngpb.js:655551-655722 placement
/**
 * 按键合并两组行：已有行若在新行中有同键项则经合并函数合成，再与新行一起按键去重。
 */
function mergeRowsByKey(sessionRows, accountRows, keyOf, carryMarketplaceInfo) {
  let accountByKey =
    carryMarketplaceInfo === undefined ? undefined : new Map(accountRows.map((row) => [keyOf(row), row]));
  return uniqByExport(
    [
      ...sessionRows.map((row) => {
        let accountRow = accountByKey?.get(keyOf(row));
        return accountRow !== undefined && carryMarketplaceInfo !== undefined
          ? carryMarketplaceInfo(row, accountRow)
          : row;
      }),
      ...accountRows,
    ],
    keyOf,
  );
}
//@ chunk-5xgkngpb.js:655722-656561 placement
/**
 * 对比远端列表与本地清单，计算要下载的项（新增或名称/版本/更新时间变化）、要删除的项、沿用项与在用目录；名字非法或目录名冲突时记诊断并沿用旧行。
 */
function planSyncDownloads(
  listedRows,
  previousRows,
  { idOf, dirFor, invalidNameTag, collisionTag, carry, markCollisionLoser },
) {
  let isObject = (value) => typeof value === "object" && value !== null;
  listedRows = Array.isArray(listedRows) ? listedRows.filter(isObject) : [];
  previousRows = Array.isArray(previousRows) ? previousRows.filter(isObject) : [];
  let prevById = new Map(previousRows.map((row) => [idOf(row), row]));
  let listedIds = new Set(listedRows.map((row) => idOf(row)));
  let liveDirs = new Set();
  let liveDirsFolded = new Set();
  let toDownload = [];
  let carryover = [];
  let carryoverOwningLiveDir = new Set();
  for (let row of listedRows) {
    let prev = prevById.get(idOf(row));
    if (prev !== undefined && carry !== undefined) prev = carry(prev, row);
    let dir;
    try {
      dir = dirFor(row.name);
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
      prev.updatedAt !== row.updatedAt ||
      prev.name !== row.name ||
      prev.requestedVersion !== row.requestedVersion
    )
      toDownload.push({
        item: row,
        prev,
      });
    else {
      carryover.push(prev);
      carryoverOwningLiveDir.add(idOf(prev));
    }
  }
  let toRemove = previousRows.filter((row) => !listedIds.has(idOf(row)));
  return {
    toDownload,
    toRemove,
    carryover,
    liveDirs,
    carryoverOwningLiveDir,
  };
}
//@ chunk-5xgkngpb.js:656561-656571 placement
/**
 * 延迟重列的最大轮数（6）。
 */
var MAX_DEFERRED_RELIST_ROUNDS = 6;
//@ chunk-5xgkngpb.js:656571-656625 placement
/**
 * 插件同步是否生效（未被否决且环境或账号开启）。
 */
function isPluginsSyncActive(session) {
  if (getPluginsSyncVetoed()) return false;
  return isPluginsSyncEnvOn(session) || getAccountPluginsSyncEnabled();
}
//@ chunk-5xgkngpb.js:656625-656682 placement
/**
 * 环境变量或会话引用同步是否开启。
 */
function isPluginsSyncEnvOn(session) {
  return env.CLAUDE_CODE_SYNC_PLUGINS || isSessionRefsSyncEnabled(session);
}
//@ chunk-5xgkngpb.js:656682-656719 placement
/**
 * 插件同步是否活着（开启且未被否决）。
 */
function isPluginsSyncLive(session) {
  return isPluginsSyncEnvOn(session) && !getPluginsSyncVetoed();
}
//@ chunk-5xgkngpb.js:656719-656794 placement
/**
 * 插件安装超时（环境变量，默认 30 秒）。
 */
function pluginInstallTimeoutMs() {
  return env.CLAUDE_CODE_SYNC_PLUGINS_INSTALL_TIMEOUT_MS ?? 30000;
}
//@ chunk-5xgkngpb.js:656794-656863 placement
/**
 * 插件 MCP 启动超时（环境变量，默认 10 秒）。
 */
function pluginMcpTimeoutMs() {
  return env.CLAUDE_CODE_SYNC_PLUGINS_MCP_TIMEOUT_MS ?? 1e4;
}
//@ chunk-5xgkngpb.js:656863-656936 placement
/**
 * 启动首轮插件同步（只触发一次）并返回其 Promise。
 */
function startFirstPluginsSync(session, credentials) {
  session.pluginsSync.firstSyncPromise ??= runPluginsSyncRound(session, credentials, {
    startup: true,
  });
}
//@ chunk-5xgkngpb.js:656936-657047 placement
/**
 * 启动时触发首轮插件同步（只触发一次），返回其 Promise。
 */
function runFirstPluginsSync(session, credentials) {
  session.pluginsSync.firstSyncPromise ??= runPluginsSyncRound(session, credentials, {
    startup: true,
  });
  return session.pluginsSync.firstSyncPromise;
}
//@ chunk-5xgkngpb.js:657047-657213 placement
/**
 * CCR 非交互会话在开启 CLAUDE_CODE_CCR_EARLY_PLUGINS_SYNC 时提前开始插件同步。
 */
function startEarlyPluginsSync(session, credentials, vetoCondition) {
  if (
    !env.CLAUDE_CODE_CCR_EARLY_PLUGINS_SYNC ||
    session.host.launchOptions.isInteractive() ||
    !isPluginsSyncEnvOn(session) ||
    vetoCondition()
  )
    return false;
  refreshSyncVeto();
  if (!isPluginsSyncLive(session)) return false;
  startFirstPluginsSync(session, credentials);
  return true;
}
//@ chunk-5xgkngpb.js:657213-657442 placement
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
//@ chunk-5xgkngpb.js:657442-657612 placement
function scheduleDeferredRelist(session, credentials) {
  let pluginsSync = session.pluginsSync;
  cancelDeferredRelist(session);
  pluginsSync.deferredRelist = setTimeout(
    (session, credentials) => {
      session.pluginsSync.deferredRelist = null;
      rerunPluginsSync(session, credentials).catch(logError);
    },
    MAX_SYNC_REUSE_AGE_MS,
    session,
    credentials,
  );
  pluginsSync.deferredRelist.unref?.();
}
//@ chunk-5xgkngpb.js:657612-657660 placement
/**
 * 已同步插件目录排序后拼成一行的键。
 */
function syncedPluginDirsKey() {
  return getSyncedPluginDirs().toSorted().join(`
`);
}
//@ chunk-5xgkngpb.js:657660-657726 placement
/**
 * 上轮完整列表里是否还有待删除项。
 */
function hasRemovalOwed(pluginsSync) {
  return (pluginsSync.lastCompleteList?.removalOwed.size ?? 0) > 0;
}
//@ chunk-5xgkngpb.js:657726-657842 placement
function cancelDeferredRelist(session) {
  let pluginsSync = session.pluginsSync;
  if (pluginsSync.deferredRelist !== null) {
    clearTimeout(pluginsSync.deferredRelist);
    pluginsSync.deferredRelist = null;
  }
}
//@ chunk-5xgkngpb.js:657842-657890 placement
/**
 * 插件同步记录的错误列表。
 */
function pluginsSyncErrors(session) {
  return session.pluginsSync.syncErrors;
}
export {
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
  isSkillsAsPluginsActive,
  isSkillsSyncEnvOn,
  getSyncedSkillCommands,
  removeSyncedSkillDir,
  readManifestText,
  parseManifestJson,
  parseValidRows,
  stringArray,
  omitKeys_2,
  mergeManifestRows,
  mergeStaleDirs,
  MAX_DEFERRED_RELIST_ROUNDS,
  planSyncDownloads,
  readReuseStamp,
  syncedPluginDirsKey,
  checkReuseWindow,
  syncReuseWithinMs,
  scheduleDeferredRelist,
  mergeRowsByKey,
  takeReuseStamp,
  replaceRowsWithAttribution,
  writeOrClearReuseStamp,
  hasRemovalOwed,
  lastCompleteRoundPath,
  refreshVetoAndRead,
  isSkillsSyncForced,
  isSyncedSkillPlaceholder,
  hasPendingSkillDownload,
  startPendingDownload,
  skillSwitchedOffText,
  MAX_SYNCED_SKILL_BYTES,
  removeSyncedSkillHooksFor,
  startEarlyPluginsSync,
  refreshAccountSkillsSyncFlag,
  primeSkillsListAskConversion,
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
  withheldSkillPlaceholders,
  isWithheldSkill,
  listedSkillText,
  isSkillDownloadPending,
};
