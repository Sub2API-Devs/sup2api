/**
 * utils/plugins/commandSourceErrors.ts
 *
 * 插件命令源错误（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-n0gp41wj.js (9)
 * attribution: placement 9
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { HostScoped } from "../hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";
import { OFFICIAL_MARKETPLACE_NAME } from "./officialMarketplaceNames.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-n0gp41wj.js:966-2468 placement
/**
 * COMMAND_SOURCE_NETWORK_ERRORS：命令源网络/可疑链接类错误文案集合。
 */
var COMMAND_SOURCE_ERRORS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var COMMAND_SOURCE_NETWORK_ERRORS;
deferInit("chunk-n0gp41wj.js:966", () => {
  COMMAND_SOURCE_ERRORS = new Set([
    "plugin command source printed a network path",
    "plugin command source path resolves to a network path",
    "plugin command source printed a path through a suspect link",
    "plugin command source entry traverses a suspect link",
    "plugin command source link escapes producer directory",
    "plugin command source relink entry not canonical",
    "plugin command source relink entry unreadable",
    "plugin command source relink target resolves to a network path",
    "plugin command source relink target traverses a suspect link",
    "plugin command source link marker not a small regular file",
    "plugin command source printed cwd or an ancestor",
    "plugin command source printed a relative path",
    "plugin command source printed nothing",
    "plugin command source printed multiple lines",
    "plugin command source exceeded the stdout cap",
    "plugin command source directory has no plugin content",
    "plugin command source directory has too many files",
    "plugin command source directory too large",
    "plugin command source link mode unsupported on windows",
    "plugin command source disabled by managed policy",
    "plugin command source held for the organization answer",
    "plugin command source not started by a tool server daemon",
    "plugin command source command changed since consent",
    "plugin command source never consented for an installed plugin",
    "plugin command source changed between display and run",
    "plugin command source without consent",
    "plugin command source declined at the prompt",
  ]);
  COMMAND_SOURCE_NETWORK_ERRORS = "plugin update refused during cli update: ";
});
//@ chunk-n0gp41wj.js:2468-2685 placement
class CommandSourceSession {
  nameRegistration;
  catalogEntryNames;
  reviewerMarkedEntryNames;
  isAccessAllowed;
  lastFailedWalk;
  staleCatalogFetchedAt;
  catalogLoadInFlight;
  bindingsWriteTail = Promise.resolve();
  marketplaceChoice;
  blockedLogged = new Set();
}
//@ chunk-n0gp41wj.js:2685-2709 placement
var commandSourceSessionSlot; // deferred: uses CommandSourceSession of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-n0gp41wj.js:2685", () => {
  commandSourceSessionSlot = new HostScoped(() => new CommandSourceSession());
});
//@ chunk-n0gp41wj.js:2709-2746 placement
/**
 * commandSourceSession：当前宿主的命令源会话状态。
 */
function commandSourceSession() {
  return commandSourceSessionSlot.of(getRootSession().host);
}
//@ chunk-n0gp41wj.js:2746-2843 placement
/**
 * setCommandSourceNameRegistration：记录命令源的名字登记方式。
 */
function setCommandSourceNameRegistration(source) {
  commandSourceSession().nameRegistration =
    source === undefined ? "none" : source === "pluginDirectory" ? "built-in" : "other";
}
//@ chunk-n0gp41wj.js:2843-2941 placement
/**
 * isOfficialNameUsableHere：官方名在当前登记方式下可用。
 */
function isOfficialNameUsableHere(marketplace) {
  if (marketplace !== OFFICIAL_MARKETPLACE_NAME) return false;
  let { nameRegistration } = commandSourceSession();
  return nameRegistration === "built-in" || nameRegistration === "none";
}
//@ chunk-n0gp41wj.js:2941-3032 placement
/**
 * isBuiltinCatalogAccessAllowed：内建目录且访问允许。
 */
function isBuiltinCatalogAccessAllowed() {
  let session = commandSourceSession();
  return session.nameRegistration === "built-in" && session.isAccessAllowed?.() === true;
}
//@ chunk-n0gp41wj.js:3032-3098 placement
/**
 * isReviewerMarkedEntry：评审标记过的条目。
 */
function isReviewerMarkedEntry(name) {
  return commandSourceSession().reviewerMarkedEntryNames?.has(name) === true;
}
//@ chunk-n0gp41wj.js:3098-3160 placement
/**
 * isCatalogEntryName：目录条目名且访问允许。
 */
function isCatalogEntryName(entryName) {
  return isBuiltinCatalogAccessAllowed() && commandSourceSession().catalogEntryNames?.has(entryName) === true;
}
export {
  commandSourceSession,
  setCommandSourceNameRegistration,
  isReviewerMarkedEntry,
  isOfficialNameUsableHere,
  isCatalogEntryName,
  isBuiltinCatalogAccessAllowed,
  COMMAND_SOURCE_ERRORS,
  COMMAND_SOURCE_NETWORK_ERRORS,
};
