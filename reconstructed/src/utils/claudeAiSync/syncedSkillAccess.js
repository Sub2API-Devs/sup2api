/**
 * utils/claudeAiSync/syncedSkillAccess.ts
 *
 * 2.1.316 新增：已同步技能的访问控制
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (14)
 * attribution: placement 14
 */
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
} from "fs/promises";
import { isSyncedSkill, isKilledHostCatalogSkill } from "../commandPredicates.js";
import { Gun } from "./skillsSync.js";
import { readFlagWithOverride } from "../../services/analytics/flagOverrides.js";
import {
  OVt,
  q5o,
  Xbn,
  Y5o,
  otherAccountReason,
  notListedReason,
  Sie,
  logSyncedCommandRefused,
  Lkt,
} from "../../services/plugins/accountSync/syncedPluginHooks.js";
import { sanitizeTelemetryString } from "../sanitization.js";
import { logForDebugging } from "../debug.js";
import { logForDiagnosticsNoPII } from "../diagLogs.js";
import { findGitRoot, findGitRootRecheckingNegative } from "../git.js";
import { wZs } from "../attributionFileClasses.js";

//@ chunk-e6aww6q8.js:1657467-1657508 placement
function qCe(e) {
  return isSyncedSkill(e) ? Gun() : isKilledHostCatalogSkill(e);
}
//@ chunk-e6aww6q8.js:1657508-1657542 placement
var TENGU_IMMUTABLE_LADYBUG = "tengu_immutable_ladybug";
//@ chunk-e6aww6q8.js:1657542-1657582 placement
function Vbe() {
  return readFlagWithOverride(TENGU_IMMUTABLE_LADYBUG, { safe: !0 });
}
//@ chunk-e6aww6q8.js:1657582-1657617 placement
function kZt() {
  return Vbe() && OVt();
}
//@ chunk-e6aww6q8.js:1657617-1657792 placement
function getSyncedPluginRoots(e) {
  let n = e.type === "prompt" ? e.pluginSource : void 0;
  if (n === void 0) return;
  let r = q5o(n.sourceName, n.pluginPath);
  return r.length > 0 ? { folder: n.pluginPath, roots: r } : void 0;
}
/**
 * 判断已同步插件的技能能否使用：无目录时（被拒且适用时）返回 no_folder；同步关闭返回 sync_off；否则按同步状态判断。
 */
//@ chunk-e6aww6q8.js:1657792-1658000 placement
async function checkSyncedSkillAccess(e, n, r = "not judged") {
  let s = q5o(e, n);
  if (n === void 0 || s.length === 0) return r === "refused" && Xbn(e) && Vbe() ? "no_folder" : void 0;
  if (!Vbe()) return;
  if (wZt()) return "sync_off";
  return bZt(await Y5o(), s, n);
}
//@ chunk-e6aww6q8.js:1658000-1658088 placement
function bZt(e, n, r) {
  let s = otherAccountReason(e, n, r);
  if (s !== void 0 || e === null) return s;
  return notListedReason(e, n, r);
}
//@ chunk-e6aww6q8.js:1658088-1658123 placement
function wZt() {
  return Sie() && OVt();
}
/**
 * 检查命令所属同步插件的访问权限（按插件来源名与路径）。
 */
//@ chunk-e6aww6q8.js:1658123-1658225 placement
function checkCommandSyncedAccess(e) {
  let n = e.type === "prompt" ? e.pluginSource : void 0;
  return checkSyncedSkillAccess(n?.sourceName, n?.pluginPath);
}
//@ chunk-e6aww6q8.js:1658225-1658261 placement
function gse(e, n) {
  logSyncedCommandRefused(sanitizeTelemetryString(e.name), n);
}
/**
 * 记录同步插件某部分被拒（调试日志与无 PII 诊断）。
 */
//@ chunk-e6aww6q8.js:1658261-1658413 placement
function logSyncedPartRefused(e, n, r) {
  (logForDebugging(`Synced plugin's ${e} refused for '${sanitizeTelemetryString(n)}': ${Lkt(r)}.`, {
    level: "warn",
  }),
    logForDiagnosticsNoPII("info", "plugins_sync_part_refused", { part: e, reason: r }));
}
//@ chunk-e6aww6q8.js:1658413-1658446 placement
function LZ(e) {
  return e !== void 0;
}
/**
 * 找出因同步状态不能使用的已同步插件命令，返回命令到原因的映射。
 */
//@ chunk-e6aww6q8.js:1658446-1658727 placement
async function findRefusedSyncedCommands(e) {
  let flattened = e.flatMap((y) => {
    let S = getSyncedPluginRoots(y);
    return S === void 0 ? [] : [{ command: y, ...S }];
  });
  if (flattened.length === 0 || !Vbe()) return new Map();
  let r = new Map(),
    s = wZt(),
    h = s ? null : await Y5o();
  for (let { command: command, roots: roots, folder: folder } of flattened) {
    let L = s ? "sync_off" : bZt(h, roots, folder);
    if (LZ(L)) r.set(command, L);
  }
  return r;
}
/**
 * 解析技能的 git 根：项目技能取其所在仓库根，否则回退到给定目录的仓库根，再取真实路径。
 */
//@ chunk-e6aww6q8.js:1658806-1659046 placement
async function resolveSkillGitRoot(e, n) {
  let r = e.type === "prompt" && e.source === "projectSettings" ? (e.skillRoot ?? e.skillFile?.path) : void 0,
    s = r === void 0 ? null : findGitRoot(r);
  if (s === null && n === null) return;
  let h = s ?? (n === null ? null : findGitRootRecheckingNegative(n));
  return h === null ? wZs : realpath_21(h).catch(() => h);
}

export {
  checkSyncedSkillAccess,
  logSyncedPartRefused,
  findRefusedSyncedCommands,
  gse,
  checkCommandSyncedAccess,
  qCe,
  LZ,
  resolveSkillGitRoot,
  kZt,
};
