/**
 * plugins/functionHooks/devModsNotices.ts
 *
 * 2.1.316 新增：开发中 mod 重载/失败/移除时给用户的提示文案
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (24)
 * attribution: placement 24
 */
import { PREVIOUS_VERSION_UNLOADED } from "./pluginRegister.js";
import { isInModsFolder } from "./devModsWatch.js";

//@ chunk-e6aww6q8.js:4143756-4143862 placement
var MOD_CHANGE_VETOED_TEXT =
  "A change to this mod was blocked by one of your hooks, so the earlier version is still running.";
//@ chunk-e6aww6q8.js:4143862-4143908 placement
/**
 * 去空白与结尾标点
 */
var trimSentence = (text) => text.trimEnd().replace(/[.!?]$/u, "");
//@ chunk-e6aww6q8.js:4143908-4144005 placement
/**
 * 改动未加载，旧版仍在跑
 */
var MOD_FAILED_EARLIER_RUNNING = (reason) =>
  `This mod's change didn't load, so the earlier version is still running: ${trimSentence(reason)}.`;
//@ chunk-e6aww6q8.js:4144005-4144082 placement
/**
 * 等待 /reload-plugins
 */
var MOD_ON_HOLD_TEXT = "in this session's mods folder, on hold: /reload-plugins applies it";
//@ chunk-e6aww6q8.js:4144082-4144116 placement
/**
 * 已加载
 */
var MOD_LOADED_TEXT = "This mod is now loaded.";
//@ chunk-e6aww6q8.js:4144116-4144180 placement
/**
 * 下次启动加载
 */
var MOD_NEXT_START_TEXT = "This mod will load the next time this session starts.";
//@ chunk-e6aww6q8.js:4144180-4144280 placement
var formatModsReloadFailedText = (reason) =>
  `Your mods couldn't be reloaded, so the earlier versions are still running: ${trimSentence(reason)}.`;
//@ chunk-e6aww6q8.js:4144280-4144384 placement
var MOD_NEEDS_RESTART_TEXT =
  "This mod changed in a way that needs a restart. It'll load the next time this session starts.";
//@ chunk-e6aww6q8.js:4144384-4144465 placement
/**
 * 已无可运行代码
 */
var MOD_NO_CODE_TEXT = "This mod no longer names any code to run, so nothing of it is running.";
//@ chunk-e6aww6q8.js:4144465-4144536 placement
/**
 * 未加载
 */
var MOD_NOT_LOADED_TEXT = "in this session's mods folder, not loaded; /plugin shows why";
//@ chunk-e6aww6q8.js:4144536-4144651 placement
var MOD_RELOAD_PAUSED_TEXT =
  "This mod is changing very often, so reloading is paused. The latest version loads once the changes stop.";
//@ chunk-e6aww6q8.js:4144651-4144698 placement
/**
 * 加载失败
 */
var MOD_LOAD_FAILED_TEXT = (refused) => `This mod didn't load: ${trimSentence(refused)}.`;
//@ chunk-e6aww6q8.js:4144698-4144791 placement
/**
 * 加载失败且旧版已停
 */
var MOD_LOAD_FAILED_OLD_GONE = (reason) =>
  `This mod didn't load, and the earlier version is no longer running: ${trimSentence(reason)}.`;
//@ chunk-e6aww6q8.js:4144791-4144848 placement
/**
 * 文件变化后已重载
 */
var MOD_RELOADED_TEXT = "This mod reloaded after a change to its files.";
//@ chunk-e6aww6q8.js:4144848-4144925 placement
/**
 * 已删除但仍加载
 */
var MOD_REMOVED_STILL_LOADED = "This mod was removed. It stays loaded until this session restarts.";
//@ chunk-e6aww6q8.js:4144925-4144937 placement
/**
 * 等待重载的别名
 */
var MOD_ON_HOLD_ALIAS = MOD_ON_HOLD_TEXT;
//@ chunk-e6aww6q8.js:4144937-4144995 placement
/**
 * 已移除
 */
var MOD_REMOVED_TEXT = "This mod was removed, so it's no longer loaded.";
//@ chunk-e6aww6q8.js:4144995-4145124 placement
function describeModReloaded(result) {
  if (result.refused === undefined) return MOD_RELOADED_TEXT;
  return result.refused.endsWith(PREVIOUS_VERSION_UNLOADED)
    ? MOD_LOAD_FAILED_OLD_GONE(result.refused.slice(0, -PREVIOUS_VERSION_UNLOADED.length))
    : MOD_LOAD_FAILED_TEXT(result.refused);
}
//@ chunk-e6aww6q8.js:4145124-4145449 placement
/**
 * 把 mod 监视事件（重载、无入口、需重启、被否决、失败、目录失败、暂停）转成给用户的提示文字。
 */
function describeModEvent(event) {
  switch (event.kind) {
    case "reloaded":
      return describeModReloaded(event.result);
    case "unnamed":
      return MOD_NO_CODE_TEXT;
    case "restart":
      return MOD_NEEDS_RESTART_TEXT;
    case "vetoed":
      return event.isServing ? MOD_CHANGE_VETOED_TEXT : undefined;
    case "failed":
      return event.isServing ? MOD_FAILED_EARLIER_RUNNING(event.reason) : undefined;
    case "folder-failed":
      return event.hadLoaded ? formatModsReloadFailedText(event.reason) : undefined;
    case "paused":
      return MOD_RELOAD_PAUSED_TEXT;
    case "folder-paused":
      return;
  }
}
//@ chunk-e6aww6q8.js:4145449-4145613 placement
/**
 * mod 出现/移除时的提示文字（已加载、未加载、暂缓、下次启动生效）。
 */
function describeModPresence(path, event) {
  let isNew = path === "new";
  switch (event) {
    case "reloaded":
      return isNew ? MOD_LOADED_TEXT : MOD_REMOVED_TEXT;
    case "not-loaded":
      return MOD_NOT_LOADED_TEXT;
    case "held":
      return isNew ? MOD_ON_HOLD_TEXT : MOD_ON_HOLD_ALIAS;
    case "unbound":
      return isNew ? MOD_NEXT_START_TEXT : MOD_REMOVED_STILL_LOADED;
  }
}
//@ chunk-e6aww6q8.js:4145613-4145644 placement
/**
 * 在 mods 目录内才给存在性说明
 */
var presenceForPath = (path) => (isInModsFolder(path) ? describeModPresence : undefined);
//@ chunk-e6aww6q8.js:4145644-4145659 placement
var MODS = "Mods";
//@ chunk-e6aww6q8.js:4145659-4145858 placement
/**
 * 若插件在 mods 目录里，把监视通知改写为面向用户的说明（目录级事件归到 Mods）。
 */
function modsNoticeFor(request, event) {
  let inModsFolder = isInModsFolder(request.folder);
  let description = inModsFolder ? describeModEvent(event.event) : undefined;
  let notice = inModsFolder && (event.event.kind === "folder-failed" || event.event.kind === "folder-paused");
  return notice || description !== undefined
    ? {
        plugin: notice ? MODS : request.plugin,
        text: description ?? event.text,
      }
    : undefined;
}
//@ chunk-e6aww6q8.js:4145858-4145868 placement
/**
 * 2
 */
var MAX_LISTED_MOD_CHANGES = 2;
export { MAX_LISTED_MOD_CHANGES, modsNoticeFor, presenceForPath, MODS, describeModPresence };
