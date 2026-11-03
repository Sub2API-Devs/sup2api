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
import { Rx } from "./pluginRegister.js";
import { isInModsFolder } from "./devModsWatch.js";

//@ chunk-e6aww6q8.js:4143756-4143862 placement
var MOD_CHANGE_VETOED_TEXT =
  "A change to this mod was blocked by one of your hooks, so the earlier version is still running.";
//@ chunk-e6aww6q8.js:4143862-4143908 placement
var aF = (e) => e.trimEnd().replace(/[.!?]$/u, "");
//@ chunk-e6aww6q8.js:4143908-4144005 placement
var Cus = (e) => `This mod's change didn't load, so the earlier version is still running: ${aF(e)}.`;
//@ chunk-e6aww6q8.js:4144005-4144082 placement
var Cdt = "in this session's mods folder, on hold: /reload-plugins applies it";
//@ chunk-e6aww6q8.js:4144082-4144116 placement
var Pus = "This mod is now loaded.";
//@ chunk-e6aww6q8.js:4144116-4144180 placement
var Ous = "This mod will load the next time this session starts.";
//@ chunk-e6aww6q8.js:4144180-4144280 placement
var formatModsReloadFailedText = (e) =>
  `Your mods couldn't be reloaded, so the earlier versions are still running: ${aF(e)}.`;
//@ chunk-e6aww6q8.js:4144280-4144384 placement
var MOD_NEEDS_RESTART_TEXT =
  "This mod changed in a way that needs a restart. It'll load the next time this session starts.";
//@ chunk-e6aww6q8.js:4144384-4144465 placement
var Hus = "This mod no longer names any code to run, so nothing of it is running.";
//@ chunk-e6aww6q8.js:4144465-4144536 placement
var Uus = "in this session's mods folder, not loaded; /plugin shows why";
//@ chunk-e6aww6q8.js:4144536-4144651 placement
var MOD_RELOAD_PAUSED_TEXT =
  "This mod is changing very often, so reloading is paused. The latest version loads once the changes stop.";
//@ chunk-e6aww6q8.js:4144651-4144698 placement
var zus = (e) => `This mod didn't load: ${aF(e)}.`;
//@ chunk-e6aww6q8.js:4144698-4144791 placement
var Kus = (e) => `This mod didn't load, and the earlier version is no longer running: ${aF(e)}.`;
//@ chunk-e6aww6q8.js:4144791-4144848 placement
var Yus = "This mod reloaded after a change to its files.";
//@ chunk-e6aww6q8.js:4144848-4144925 placement
var Qus = "This mod was removed. It stays loaded until this session restarts.";
//@ chunk-e6aww6q8.js:4144925-4144937 placement
var Zus = Cdt;
//@ chunk-e6aww6q8.js:4144937-4144995 placement
var ocs = "This mod was removed, so it's no longer loaded.";
//@ chunk-e6aww6q8.js:4144995-4145124 placement
function describeModReloaded(e) {
  if (e.refused === void 0) return Yus;
  return e.refused.endsWith(Rx) ? Kus(e.refused.slice(0, -Rx.length)) : zus(e.refused);
}
/**
 * 把 mod 监视事件（重载、无入口、需重启、被否决、失败、目录失败、暂停）转成给用户的提示文字。
 */
//@ chunk-e6aww6q8.js:4145124-4145449 placement
function describeModEvent(e) {
  switch (e.kind) {
    case "reloaded":
      return describeModReloaded(e.result);
    case "unnamed":
      return Hus;
    case "restart":
      return MOD_NEEDS_RESTART_TEXT;
    case "vetoed":
      return e.isServing ? MOD_CHANGE_VETOED_TEXT : void 0;
    case "failed":
      return e.isServing ? Cus(e.reason) : void 0;
    case "folder-failed":
      return e.hadLoaded ? formatModsReloadFailedText(e.reason) : void 0;
    case "paused":
      return MOD_RELOAD_PAUSED_TEXT;
    case "folder-paused":
      return;
  }
}
/**
 * mod 出现/移除时的提示文字（已加载、未加载、暂缓、下次启动生效）。
 */
//@ chunk-e6aww6q8.js:4145449-4145613 placement
function describeModPresence(e, n) {
  let r = e === "new";
  switch (n) {
    case "reloaded":
      return r ? Pus : ocs;
    case "not-loaded":
      return Uus;
    case "held":
      return r ? Cdt : Zus;
    case "unbound":
      return r ? Ous : Qus;
  }
}
//@ chunk-e6aww6q8.js:4145613-4145644 placement
var dcs = (e) => (isInModsFolder(e) ? describeModPresence : void 0);
//@ chunk-e6aww6q8.js:4145644-4145659 placement
var MODS = "Mods";
/**
 * 若插件在 mods 目录里，把监视通知改写为面向用户的说明（目录级事件归到 Mods）。
 */
//@ chunk-e6aww6q8.js:4145659-4145858 placement
function modsNoticeFor(e, n) {
  let r = isInModsFolder(e.folder),
    s = r ? describeModEvent(n.event) : void 0,
    h = r && (n.event.kind === "folder-failed" || n.event.kind === "folder-paused");
  return h || s !== void 0 ? { plugin: h ? MODS : e.plugin, text: s ?? n.text } : void 0;
}
//@ chunk-e6aww6q8.js:4145858-4145868 placement
var Xjn = 2;

export { Xjn, modsNoticeFor, dcs, MODS, describeModPresence };
