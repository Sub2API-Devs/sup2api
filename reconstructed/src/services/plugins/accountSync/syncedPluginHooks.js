/**
 * services/plugins/accountSync/syncedPluginHooks.ts
 *
 * 2.1.316 新增：同步插件的钩子
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-f9asxqh1.js (41)
 * attribution: placement 41
 */
import { sep, sep as sep_2, resolve, join, join as join_2 } from "path";
import { liveWeakRefs, logForDiagnosticsNoPII } from "../../../utils/diagLogs.js";
import {
  getSessionHookRegistries,
  SessionHooksRegistry,
  getAllSessionHookEntries,
} from "../../../utils/hooks/sessionHooks.js";
import { HOOK_EVENTS } from "../../../entrypoints/sdk/coreSchemas.js";
import {
  emitHookStoresChanged,
  onProcessRootHost,
  getLastCompleteSyncedPluginList,
  getPluginsSyncVetoed,
  setAccountPluginsSyncEnabled,
  setPluginsSyncVetoed,
  getSyncedPluginDirs,
} from "../../../bootstrap/state.js";
import { logForDebugging } from "../../../utils/debug.js";
import { HostScoped } from "../../../utils/hostScoped.js";
import { getClaudeConfigDirOrNull } from "../../../utils/envUtils.js";
import { cU, getSyncBucket, pgi, stripInvisibleChars, DFe } from "../../../utils/plugins/syncedItems.js";
import { getErrnoCode, errorMessage } from "../../../utils/errors.js";
import { marketplaceSuffix } from "../../../utils/plugins/pluginIdentifier.js";
import { SYNCED } from "../../../utils/telemetry/pluginTelemetry.js";
import { logError } from "../../../utils/log.js";
import {
  isSyncSettingsUnreliable,
  grr,
  N,
  Jrt,
  M5r,
  isAccountSyncEligible,
  isAccountSyncDenied,
} from "./pluginsScopeGate.js";
import { env } from "../../../utils/env.js";
import { isCustomizationDisabled } from "../../../utils/settings/customizationDisabled.js";
import { isSettingSourceEnabled } from "../../../utils/settings/constants.js";
import { DoctorLazy } from "../../../cli/handlers/util.js";
import { create, create_2 } from "../../../../vendor/zod/lib/index.mjs";

/**
 * 从所有会话钩子注册表中移除属于给定技能根目录的钩子，返回移除数量，有移除时广播钩子存储变化。
 */
//@ chunk-f9asxqh1.js:7717-8021 placement
function removeSkillRootHooks(e) {
  if (e.size === 0) return 0;
  let n = 0;
  for (let s of liveWeakRefs(getSessionHookRegistries()))
    for (let [r, f] of s) {
      let y = {},
        S = n;
      for (let h of HOOK_EVENTS) {
        let w = [];
        for (let b of f.hooks[h] ?? [])
          if (b.skillRoot !== void 0 && e.has(b.skillRoot)) n += b.hooks.length;
          else w.push(b);
        if (w.length > 0) y[h] = w;
      }
      if (n > S) s.set(r, { ...f, hooks: y });
    }
  if (n > 0) emitHookStoresChanged();
  return n;
}
//@ chunk-f9asxqh1.js:8021-8050 placement
function Spe() {
  return new SessionHooksRegistry();
}
//@ chunk-f9asxqh1.js:8050-8296 placement
var HOOK_REMOVAL_REASONS = {
  sync_off: (e) => `${e} sync is off (a setting or the organization's policy).`,
  account_change: () => "A sign-out, or a sign-in not verified as the same account.",
  skill_gone: () => "Those skills are gone from this account's list or from the disk.",
};
/**
 * 列出当前会话钩子中位于指定目录之下的技能根目录集合。
 */
//@ chunk-f9asxqh1.js:8296-8400 placement
function skillRootsUnder(e) {
  let n = e + sep_2,
    s = new Set();
  for (let { skillRoot: skillRoot } of getAllSessionHookEntries())
    if (skillRoot?.startsWith(n)) s.add(skillRoot);
  return s;
}
/**
 * 移除指定技能根目录的同步钩子，并按原因（同步关闭、账号变化、技能消失）记录调试日志与诊断事件。
 */
//@ chunk-f9asxqh1.js:8400-8544 placement
function removeSyncedSkillHooks(e, n, s) {
  let r = removeSkillRootHooks(n);
  if (r === 0) return;
  (logForDebugging(`Hooks of ${e.hooksOf} removed: ${r}. ${HOOK_REMOVAL_REASONS[s](e.sync)}`),
    logForDiagnosticsNoPII("info", e.event, { count: r, reason: s }));
}
//@ chunk-f9asxqh1.js:8544-8664 placement
var PLUGINS_SYNC_HOOK_LABELS = {
    sync: "Plugins",
    hooksOf: "synced plugins' skills",
    event: "plugins_sync_skill_hooks_removed",
  },
  refusalsLogged = new HostScoped(() => new Set());
//@ chunk-f9asxqh1.js:8664-8837 placement
function syncedPluginsFolder() {
  try {
    let e = getClaudeConfigDirOrNull();
    return e === null ? void 0 : resolve(join(e, cU));
  } catch (error) {
    logForDebugging(
      `The synced plugins' folder could not be made absolute (${getErrnoCode(error) ?? errorMessage(error)})`,
      { level: "error" },
    );
    return;
  }
}
//@ chunk-f9asxqh1.js:8837-8891 placement
function dii() {
  let e = syncedPluginsFolder();
  if (e !== void 0) onProcessRootHost(refusalsLogged).add(e);
}
//@ chunk-f9asxqh1.js:8891-8965 placement
function q() {
  let e = new Set(onProcessRootHost(refusalsLogged)),
    n = syncedPluginsFolder();
  if (n !== void 0) e.add(n);
  return e;
}
//@ chunk-f9asxqh1.js:8965-9011 placement
function Xbn(e) {
  return e !== void 0 && marketplaceSuffix(e) === SYNCED;
}
//@ chunk-f9asxqh1.js:9011-9107 placement
function q5o(e, n) {
  if (!Xbn(e) || n === void 0) return [];
  return [...q()].filter((s) => n.startsWith(s + sep));
}
//@ chunk-f9asxqh1.js:9107-9184 placement
async function Y5o() {
  try {
    return (await getSyncBucket()) ?? pgi();
  } catch (error) {
    return (logError(error), null);
  }
}
//@ chunk-f9asxqh1.js:9184-9259 placement
function Jbn(e, n) {
  let [s = ""] = n.slice(e.length + 1).split(sep);
  return stripInvisibleChars(DFe(s));
}
/**
 * 检查同步插件技能是否仍在账号最近一次完整插件列表里：不在时返回 not_listed，列表读取失败返回 list_unreadable。
 */
//@ chunk-f9asxqh1.js:9259-9569 placement
function notListedReason(e, n, s) {
  try {
    let r = getLastCompleteSyncedPluginList(),
      found = n.map((S) => S + sep + e).find((S) => s.startsWith(S + sep));
    if (r === null || r.bucket !== e || found === void 0) return;
    let y = Jbn(found, s);
    return Array.from(r.dirsById.values()).some((S) => S.has(y)) ? void 0 : "not_listed";
  } catch (error) {
    return (
      logForDiagnosticsNoPII("warn", "plugins_sync_last_list_unreadable"),
      logError(error),
      "list_unreadable"
    );
  }
}
/**
 * 检查同步插件技能目录是否属于当前账号：无账号返回 no_account，属于其他账号返回 other_account。
 */
//@ chunk-f9asxqh1.js:9569-9685 placement
function otherAccountReason(e, n, s) {
  if (e === null) return "no_account";
  return n.some((r) => s.startsWith(r + sep + e + sep)) ? void 0 : "other_account";
}
/**
 * 同步插件技能/命令被限制时给出的原因文案表（同步关闭、其他账号、无账号、不在列表、列表不可读、找不到目录）。
 */
//@ chunk-f9asxqh1.js:9685-10190 placement
var SYNCED_SKILL_REFUSAL_TEXT = {
  sync_off:
    "plugins sync is turned off in the person's own settings, in an admin's, or by the organization's policy",
  other_account: "its plugin was synced for another account",
  no_account: "no account could be resolved for its synced plugin",
  not_listed: "the account's latest complete list of plugins does not hold its plugin's folder",
  list_unreadable: "this session's record of the account's plugins could not be read",
  no_folder: "its plugin's folder could not be found under the synced plugins' folder",
};
//@ chunk-f9asxqh1.js:10190-10218 placement
function Lkt(e) {
  return SYNCED_SKILL_REFUSAL_TEXT[e];
}
/**
 * 记录同步插件技能在缺少钩子或 allowed-tools 授权下运行的警告与诊断事件。
 */
//@ chunk-f9asxqh1.js:10218-10473 placement
function logSyncedSkillRestricted(e, n, s) {
  let joined = [
    ...(s.hooks ? ["its hooks"] : []),
    ...(s.grant ? ["the tools its allowed-tools grants"] : []),
  ].join(" and without ");
  (logForDebugging(`Plugin skill '${e}' runs without ${joined}: ${SYNCED_SKILL_REFUSAL_TEXT[n]}.`, {
    level: "warn",
  }),
    logForDiagnosticsNoPII("info", "plugins_sync_skill_hooks_refused", { reason: n }));
}
/**
 * 记录同步插件命令被拒绝执行的警告与诊断事件。
 */
//@ chunk-f9asxqh1.js:10473-10607 placement
function logSyncedCommandRefused(e, n) {
  (logForDebugging(`Plugin command '${e}' was not run: ${SYNCED_SKILL_REFUSAL_TEXT[n]}.`, { level: "warn" }),
    logForDiagnosticsNoPII("info", "plugins_sync_command_refused", { reason: n }));
}
//@ chunk-f9asxqh1.js:10607-10695 placement
function H5r(e) {
  let n = new Set();
  for (let s of q()) for (let r of skillRootsUnder(s)) n.add(r);
  removeSyncedSkillHooks(PLUGINS_SYNC_HOOK_LABELS, n, e);
}
/**
 * 插件同步一轮结束后，移除已从账号列表下架且不再列出的插件技能的钩子；失败时记录诊断并返回 false。
 */
//@ chunk-f9asxqh1.js:10695-10975 placement
function removeDelistedSkillHooks({ bucket: bucket, delistedDirs: delistedDirs, listedDirs: listedDirs }) {
  try {
    let r = new Set();
    for (let f of q()) {
      let y = f + sep + bucket;
      for (let S of skillRootsUnder(y)) {
        let h = Jbn(y, S);
        if (delistedDirs.has(h) && !listedDirs.has(h)) r.add(S);
      }
    }
    return (removeSyncedSkillHooks(PLUGINS_SYNC_HOOK_LABELS, r, "skill_gone"), !0);
  } catch (error) {
    return (logForDiagnosticsNoPII("warn", "plugins_sync_skill_hooks_removal_failed"), logError(error), !1);
  }
}
//@ chunk-f9asxqh1.js:10975-11125 placement
var PLUGINS_SYNC_SETTING = {
  settingKey: "syncClaudeAiPlugins",
  policyKey: "allow_account_plugins_sync",
  flagName: "tengu_claudeai_plugins_sync_enabled",
  isTierInPlay: () => wie(),
};
//@ chunk-f9asxqh1.js:11125-11179 placement
function _rr() {
  sJ();
  let e = Ze() && !getPluginsSyncVetoed();
  return (setAccountPluginsSyncEnabled(e), e);
}
//@ chunk-f9asxqh1.js:11179-11241 placement
function sJ() {
  let e = isSyncSettingsUnreliable(PLUGINS_SYNC_SETTING);
  if ((setPluginsSyncVetoed(e), e && $5r())) H5r("sync_off");
}
//@ chunk-f9asxqh1.js:11241-11273 placement
function Sie() {
  return (sJ(), getPluginsSyncVetoed());
}
//@ chunk-f9asxqh1.js:11273-11301 placement
function OVt() {
  return $5r();
}
//@ chunk-f9asxqh1.js:11301-11346 placement
function gii() {
  return !OVt() && (Sie() || grr(PLUGINS_SYNC_SETTING));
}
//@ chunk-f9asxqh1.js:11346-11389 placement
function brr() {
  return getSyncedPluginDirs().length > 0 || Qbn();
}
//@ chunk-f9asxqh1.js:11389-11424 placement
function Qbn() {
  return Srr() || N5r();
}
//@ chunk-f9asxqh1.js:11424-11465 placement
function N5r() {
  return !Srr() && N(PLUGINS_SYNC_SETTING) && Jrt();
}
//@ chunk-f9asxqh1.js:11465-11500 placement
function X5o() {
  return Srr() || Jrt();
}
//@ chunk-f9asxqh1.js:11500-11549 placement
function MVt() {
  return N(PLUGINS_SYNC_SETTING) && Jrt() && wie() && !Sie();
}
//@ chunk-f9asxqh1.js:11549-11576 placement
function hii() {
  return N(PLUGINS_SYNC_SETTING);
}
//@ chunk-f9asxqh1.js:11576-11658 placement
function Srr() {
  return env.CLAUDE_CODE_SYNC_PLUGINS || env.CLAUDE_CODE_SYNC_SESSION_REFS;
}
//@ chunk-f9asxqh1.js:11658-11687 placement
function Hkt() {
  return M5r(PLUGINS_SYNC_SETTING);
}
//@ chunk-f9asxqh1.js:11687-11743 placement
function wie() {
  return !isCustomizationDisabled("plugins") && isSettingSourceEnabled("userSettings");
}
//@ chunk-f9asxqh1.js:11743-11771 placement
function Ze() {
  return isAccountSyncEligible(PLUGINS_SYNC_SETTING);
}
//@ chunk-f9asxqh1.js:11771-11800 placement
function $5r() {
  return isAccountSyncDenied(PLUGINS_SYNC_SETTING);
}
//@ chunk-f9asxqh1.js:12474-12566 placement
function Hee(e) {
  return e.kind === "server_error" && e.status === 404 && e.error === "not_found_error";
}
//@ chunk-f9asxqh1.js:12566-12633 placement
function eot(e) {
  return e.status === 403 || e.kind === "no_scope" || Hee(e);
}
//@ chunk-f9asxqh1.js:12749-12840 placement
var wrr = DoctorLazy(() =>
  create({
    error: create({
      type: create_2().optional(),
      message: create_2()
        .nullish()
        .catch(void 0),
    }),
  }),
);

export {
  Spe,
  Sie,
  OVt,
  Lkt,
  MVt,
  _rr,
  hii,
  Qbn,
  X5o,
  logSyncedSkillRestricted,
  dii,
  brr,
  wie,
  Jbn,
  Hkt,
  H5r,
  sJ,
  N5r,
  removeSyncedSkillHooks,
  skillRootsUnder,
  gii,
  Hee,
  eot,
  removeDelistedSkillHooks,
  $5r,
  Srr,
  q5o,
  Xbn,
  Y5o,
  otherAccountReason,
  notListedReason,
  logSyncedCommandRefused,
  wrr,
};
