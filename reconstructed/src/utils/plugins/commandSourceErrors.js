/**
 * utils/plugins/commandSourceErrors.ts
 *
 * 插件命令源错误（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-csq9ftr9.js (9)
 * attribution: placement 9
 */
import { HostScoped } from "../hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";
import { OFFICIAL_MARKETPLACE_NAME } from "./officialMarketplaceNames.js";

//@ chunk-csq9ftr9.js:966-2468 placement
var COMMAND_SOURCE_ERRORS = new Set([
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
  ]),
  Z_n = "plugin update refused during cli update: ";
//@ chunk-csq9ftr9.js:2468-2685 placement
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
//@ chunk-csq9ftr9.js:2685-2709 placement
var ke = new HostScoped(() => new CommandSourceSession());
//@ chunk-csq9ftr9.js:2709-2746 placement
function kk() {
  return ke.of(getRootSession().host);
}
//@ chunk-csq9ftr9.js:2746-2843 placement
function nri(e) {
  kk().nameRegistration = e === void 0 ? "none" : e === "pluginDirectory" ? "built-in" : "other";
}
//@ chunk-csq9ftr9.js:2843-2941 placement
function Jtr(e) {
  if (e !== OFFICIAL_MARKETPLACE_NAME) return !1;
  let { nameRegistration: nameRegistration } = kk();
  return nameRegistration === "built-in" || nameRegistration === "none";
}
//@ chunk-csq9ftr9.js:2941-3032 placement
function A() {
  let e = kk();
  return e.nameRegistration === "built-in" && e.isAccessAllowed?.() === !0;
}
//@ chunk-csq9ftr9.js:3032-3098 placement
function Prt(e) {
  return kk().reviewerMarkedEntryNames?.has(e) === !0;
}
//@ chunk-csq9ftr9.js:3098-3160 placement
function j(e) {
  return A() && kk().catalogEntryNames?.has(e) === !0;
}

export { Z_n, Prt, Jtr, kk, j, A, COMMAND_SOURCE_ERRORS, nri };
