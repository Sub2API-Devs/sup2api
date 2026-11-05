/**
 * plugins/functionHooks/devModsNotices.ts
 *
 * 2.1.316 新增：开发中 mod 重载/失败/移除时给用户的提示文案
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (25)
 * attribution: placement 24, layout 1
 */
import { PREVIOUS_VERSION_UNLOADED } from "./pluginRegister.js";
import { isInModsFolder } from "./devModsWatch.js";

//@ chunk-5xgkngpb.js:4249794-4249900 placement
var MOD_CHANGE_VETOED_TEXT =
  "A change to this mod was blocked by one of your hooks, so the earlier version is still running.";
//@ chunk-5xgkngpb.js:4249900-4249946 placement
/**
 * 去空白与结尾标点
 */
var trimSentence = (text) => text.trimEnd().replace(/[.!?]$/u, "");
//@ chunk-5xgkngpb.js:4249946-4250043 placement
/**
 * 改动未加载，旧版仍在跑
 */
var MOD_FAILED_EARLIER_RUNNING = (reason) =>
  `This mod's change didn't load, so the earlier version is still running: ${trimSentence(reason)}.`;
//@ chunk-5xgkngpb.js:4250043-4250083 layout
var loadFailedLine = (reason) => `Couldn't load: ${trimSentence(reason)}.`;
//@ chunk-5xgkngpb.js:4250083-4250160 placement
/**
 * 等待 /reload-plugins
 */
var MOD_ON_HOLD_TEXT = "in this session's mods folder, on hold: /reload-plugins applies it";
//@ chunk-5xgkngpb.js:4250160-4250194 placement
/**
 * 已加载
 */
var MOD_LOADED_TEXT = "This mod is now loaded.";
//@ chunk-5xgkngpb.js:4250194-4250258 placement
/**
 * 下次启动加载
 */
var MOD_NEXT_START_TEXT = "This mod will load the next time this session starts.";
//@ chunk-5xgkngpb.js:4250258-4250340 placement
var formatModsReloadFailedText = (reason) =>
  `Couldn't reload: ${trimSentence(reason)}. The earlier versions are still running.`;
//@ chunk-5xgkngpb.js:4250340-4250444 placement
var MOD_NEEDS_RESTART_TEXT =
  "This mod changed in a way that needs a restart. It'll load the next time this session starts.";
//@ chunk-5xgkngpb.js:4250444-4250525 placement
/**
 * 已无可运行代码
 */
var MOD_NO_CODE_TEXT = "This mod no longer names any code to run, so nothing of it is running.";
//@ chunk-5xgkngpb.js:4250525-4250596 placement
/**
 * 未加载
 */
var MOD_NOT_LOADED_TEXT = "in this session's mods folder, not loaded; /plugin shows why";
//@ chunk-5xgkngpb.js:4250596-4250711 placement
var MOD_RELOAD_PAUSED_TEXT =
  "This mod is changing very often, so reloading is paused. The latest version loads once the changes stop.";
//@ chunk-5xgkngpb.js:4250711-4250758 placement
/**
 * 加载失败
 */
var MOD_LOAD_FAILED_TEXT = (refused) => `This mod didn't load: ${trimSentence(refused)}.`;
//@ chunk-5xgkngpb.js:4250758-4250851 placement
/**
 * 加载失败且旧版已停
 */
var MOD_LOAD_FAILED_OLD_GONE = (reason) =>
  `This mod didn't load, and the earlier version is no longer running: ${trimSentence(reason)}.`;
//@ chunk-5xgkngpb.js:4250851-4250908 placement
/**
 * 文件变化后已重载
 */
var MOD_RELOADED_TEXT = "This mod reloaded after a change to its files.";
//@ chunk-5xgkngpb.js:4250908-4250985 placement
/**
 * 已删除但仍加载
 */
var MOD_REMOVED_STILL_LOADED = "This mod was removed. It stays loaded until this session restarts.";
//@ chunk-5xgkngpb.js:4250985-4250997 placement
/**
 * 等待重载的别名
 */
var MOD_ON_HOLD_ALIAS = MOD_ON_HOLD_TEXT;
//@ chunk-5xgkngpb.js:4250997-4251055 placement
/**
 * 已移除
 */
var MOD_REMOVED_TEXT = "This mod was removed, so it's no longer loaded.";
//@ chunk-5xgkngpb.js:4251055-4251184 placement
function describeModReloaded(result) {
  if (result.refused === undefined) return MOD_RELOADED_TEXT;
  return result.refused.endsWith(PREVIOUS_VERSION_UNLOADED)
    ? MOD_LOAD_FAILED_OLD_GONE(result.refused.slice(0, -PREVIOUS_VERSION_UNLOADED.length))
    : MOD_LOAD_FAILED_TEXT(result.refused);
}
//@ chunk-5xgkngpb.js:4251184-4251509 placement
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
//@ chunk-5xgkngpb.js:4251509-4251673 placement
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
//@ chunk-5xgkngpb.js:4251673-4251704 placement
/**
 * 在 mods 目录内才给存在性说明
 */
var presenceForPath = (path) => (isInModsFolder(path) ? describeModPresence : undefined);
//@ chunk-5xgkngpb.js:4251704-4251719 placement
var MODS = "Mods";
//@ chunk-5xgkngpb.js:4251719-4251918 placement
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
//@ chunk-5xgkngpb.js:4251918-4251928 placement
/**
 * 2
 */
var MAX_LISTED_MOD_CHANGES = 2;
export { MAX_LISTED_MOD_CHANGES, modsNoticeFor, presenceForPath, MODS, loadFailedLine, describeModPresence };
