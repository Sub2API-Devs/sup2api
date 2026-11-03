/**
 * remote/tools/servedOwnerSettings.ts
 *
 * 提供工具时读取与持有本机用户设置/规则（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s61vbvea.js (40)
 * attribution: placement 40
 */
import { readdirSync, readdirSync as readdirSync_2, readdirSync as readdirSync_3 } from "fs";
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
} from "path";
import {
  getAtPath,
  setAtPath,
  restrictionValue,
  MANAGED_RESTRICTION_KEYS,
  JOe,
} from "../../utils/settings/managedRestrictionKeys.js";
import { jsonStringify, clone } from "../../utils/slowOperations.js";
import { En } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { safeParseJSON } from "../../utils/json.js";
import { Dq } from "../../utils/settings/settingsReview.js";
import { parseSettingsContent, missingSettingsFileResult } from "../../utils/settings/settingsFileParsing.js";
import { servedCallsDir } from "./servedCallLog.js";
import { isENOENT, toError } from "../../utils/errors.js";
import { logForDebugging } from "../../utils/debug.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";
import { logError } from "../../utils/log.js";
import { logFeatureOk, logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { lit, fromEnum } from "../../services/analytics/safeMetadata.js";
import { readFlagWithOverride } from "../../services/analytics/flagOverrides.js";
import { isSettingSourceEnabled } from "../../utils/settings/constants.js";
import {
  getSettingsFilePathForSource,
  readRepoTierFileText,
  parseSettingsFileUncached,
  getSettingsForSource,
} from "../../utils/settings/settings.js";
import { getFeatureValueWithSource_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { settingsJsonToRules } from "../../utils/permissions/permissionsLoader.js";
import { formatPermissionRule } from "../../utils/permissions/disallowedToolsFlag.js";
import { CREDENTIAL_HELPER_SETTINGS_KEYS } from "../../utils/settings/policyTiers.js";
import { rls, UEe } from "../../utils/betas.js";

/**
 * 仓库设置层级和需要冻结的限制性设置路径（deny/ask 规则、沙箱读写限制、禁止域名）。
 */
//@ chunk-s61vbvea.js:476551-477028 placement
var REPO_SETTINGS_TIERS = ["project", "local", "legacy"],
  RESTRICTIVE_LIST_PATHS = [
    ["permissions", "deny"],
    ["permissions", "ask"],
    ["sandbox", "filesystem", "denyRead"],
    ["sandbox", "filesystem", "denyWrite"],
    ["sandbox", "network", "deniedDomains"],
  ],
  PERMISSIVE_LIST_PATHS = [
    ["permissions", "allow"],
    ["permissions", "additionalDirectories"],
    ["sandbox", "filesystem", "allowRead"],
    ["sandbox", "filesystem", "allowWrite"],
    ["sandbox", "network", "allowedDomains"],
    ["sandbox", "network", "allowUnixSockets"],
    ["sandbox", "excludedCommands"],
  ],
  SANDBOX_ENABLED_PATH = ["sandbox", "enabled"];
//@ chunk-s61vbvea.js:477028-477088 placement
function jl(e, n) {
  let r = getAtPath(e, n);
  return Array.isArray(r) ? r : [];
}
/**
 * 用新设置收紧旧设置：deny/ask 等限制性列表取并集，allow/allowRead 等放宽性列表只保留双方都有的项，托管限制键取更严格的值；用于提供远程工具时只接受变严、不接受变宽。
 */
//@ chunk-s61vbvea.js:477088-477550 placement
function tightenSettingsWith(e, n, r = !1) {
  let s = structuredClone(e ?? {});
  for (let h of RESTRICTIVE_LIST_PATHS) {
    let y = jl(e, h),
      S = new Set(y.map((R) => jsonStringify(R))),
      filtered = jl(n, h).filter((R) => !S.has(jsonStringify(R)));
    if (filtered.length > 0) setAtPath(s, h, [...y, ...filtered]);
  }
  for (let h of PERMISSIVE_LIST_PATHS) {
    let y = jl(e, h),
      S = new Set(jl(n, h).map((R) => jsonStringify(R))),
      filtered = y.filter((R) => S.has(jsonStringify(R)));
    if (filtered.length !== y.length) setAtPath(s, h, filtered);
  }
  for (let h of fw()) {
    if (!r && En(h.path, SANDBOX_ENABLED_PATH)) continue;
    let y = restrictionValue(h, n);
    if (Wf(h, y) < Wf(h, restrictionValue(h, e))) setAtPath(s, h.path, y);
  }
  return e === null && Object.keys(s).length === 0 ? null : s;
}
//@ chunk-s61vbvea.js:477550-477611 placement
function fw() {
  return MANAGED_RESTRICTION_KEYS().filter((e) => e.path[0] === "sandbox");
}
//@ chunk-s61vbvea.js:477611-477705 placement
function Wf(e, n) {
  let index = JOe(e.restrictive).indexOf(n);
  return index === -1 ? Number.POSITIVE_INFINITY : index;
}
//@ chunk-s61vbvea.js:477705-477914 placement
function pickRestrictionFields(e) {
  let n = {};
  for (let r of [...RESTRICTIVE_LIST_PATHS, ...PERMISSIVE_LIST_PATHS]) {
    let s = getAtPath(e, r);
    if (Array.isArray(s)) setAtPath(n, r, s);
  }
  for (let r of fw().filter((s) => !En(s.path, SANDBOX_ENABLED_PATH))) {
    let s = restrictionValue(r, e);
    if (Number.isFinite(Wf(r, s))) setAtPath(n, r.path, s);
  }
  return n;
}
//@ chunk-s61vbvea.js:477914-477958 placement
function AF(e, n) {
  return e === n || (isEmptySettingsText(e) && isEmptySettingsText(n));
}
//@ chunk-s61vbvea.js:477958-478107 placement
function isEmptySettingsText(e) {
  if (e === null || e.trim() === "") return !0;
  let n = safeParseJSON(e, !1);
  return typeof n === "object" && n !== null && !Array.isArray(n) && Object.keys(n).length === 0;
}
//@ chunk-s61vbvea.js:478107-478403 placement
function unreadableAcceptedSettings(e) {
  return {
    settings: null,
    errors: [
      {
        file: e,
        path: "",
        message:
          "What was accepted for this settings file could not be read, so it is not applied to cloud sessions. Run claude apply-project-settings in a terminal in this folder to accept it again.",
        severity: "fatal",
      },
    ],
    loadState: "didNotLoad",
  };
}
//@ chunk-s61vbvea.js:478403-480084 placement
function readServedOwnerSettings(e, n, r, s, h = () => !1, y = () => !1) {
  let S = {
      seeds: new Map(),
      heldBack: [],
      firstSeen: [],
      unreadable: !1,
      matching: new Set(),
      hookWaiting: !1,
      sandboxTurnedOn: !1,
    },
    folder = e.folder(n.key),
    R = [];
  for (let x of REPO_SETTINGS_TIERS) {
    let P = n[x];
    if (P === null) continue;
    let j = r(P),
      G = j === "absent" || j === "unreadable" ? null : Dq(j.text),
      L = n.linkedAway.includes(x) || h(P),
      q = G === null || L ? null : parseSettingsContent(G, P),
      Q = x === "local" && getAtPath(q?.settings ?? null, SANDBOX_ENABLED_PATH) === !0 && y(),
      Z = typeof folder === "object" ? folder[x] : P,
      ee;
    if (folder === "unreadable") ee = "unreadable";
    else if (Z === null) ee = { text: null };
    else {
      let file = e.file(Z);
      if (file === "unreadable" || (file === "none" && folder !== "none")) ee = "unreadable";
      else if (file === "none") {
        let ie = L ? null : G;
        if (
          ((ee = { text: ie }),
          S.firstSeen.push({
            slot: x,
            present: j !== "absent",
            widening: q?.settings != null && !En(tightenSettingsWith(null, q.settings) ?? {}, q.settings),
          }),
          s === "engage")
        )
          e.recordFile(P, ie, "first_attach");
      } else ((ee = { text: file.text }), R.push(Z));
    }
    let ae = q?.settings?.hooks?.PreToolUse,
      se = ae !== void 0 && ae.length > 0;
    if (ee === "unreadable") {
      ((S.unreadable = !0), S.heldBack.push(x), (S.hookWaiting ||= se));
      let we = tightenSettingsWith(null, q?.settings ?? null, Q);
      ((S.sandboxTurnedOn ||= getAtPath(we, SANDBOX_ENABLED_PATH) === !0),
        S.seeds.set(P, { ...unreadableAcceptedSettings(P), settings: we }));
      continue;
    }
    let re = !AF(ee.text, G);
    if (!(j === "unreadable" || re || Z !== P)) {
      if (!L) S.matching.add(P);
      S.seeds.set(
        P,
        q ?? (ee.text === null ? missingSettingsFileResult() : parseSettingsContent(ee.text, P)),
      );
      continue;
    }
    if (re || j === "unreadable") S.heldBack.push(x);
    let Se = ee.text === null ? missingSettingsFileResult() : parseSettingsContent(ee.text, P);
    S.hookWaiting ||= se && !En(ae, Se.settings?.hooks?.PreToolUse);
    let ce = tightenSettingsWith(Se.settings, q?.settings ?? null, Q);
    ((S.sandboxTurnedOn ||=
      getAtPath(ce, SANDBOX_ENABLED_PATH) === !0 && getAtPath(Se.settings, SANDBOX_ENABLED_PATH) !== !0),
      S.seeds.set(P, ce === null && Se.settings === null ? Se : { ...Se, settings: ce }));
  }
  if (s === "engage") {
    if (folder === "none") e.recordFolder(n.key, { project: n.project, local: n.local, legacy: n.legacy });
    e.noteServed(n.key, R);
  }
  return S;
}
//@ chunk-s61vbvea.js:480084-480197 placement
function hasServedCallLogs(e = servedCallsDir()) {
  try {
    return readdirSync_3(e).some((n) => n.endsWith(".jsonl") || n.endsWith(".seen"));
  } catch (error) {
    return !isENOENT(error);
  }
}
//@ chunk-s61vbvea.js:480197-480695 placement
var TENGU_QUIET_LOCKET = "tengu_quiet_locket",
  freeze_3 = Object.freeze({ held: !0, settings: Object.freeze({}), took: "unbound" }),
  hw = [
    { name: "read_block", paths: [["permissions", "blockReadsOutsideWorkingDirectories"]] },
    { name: "write_block", paths: [["permissions", "blockWritesOutsideWorkingDirectories"]] },
    { name: "auto_mode_off", paths: [["disableAutoMode"], ["permissions", "disableAutoMode"]] },
    { name: "plan_asks_a_person", paths: [["useAutoModeDuringPlan"]] },
    { name: "unattended_serving_off", paths: [["remoteTools", "allowUnattendedServing"]] },
  ];
//@ chunk-s61vbvea.js:480695-480982 placement
class HeldOwnerSettings {
  #e;
  #t = new Set();
  noteRefusalsOf(e) {
    for (let { name: n, paths: paths } of hw)
      if (
        paths.some((h) => {
          let found = MANAGED_RESTRICTION_KEYS().find((S) => En(S.path, h));
          return found === void 0 || restrictionValue(found, e) === found.restrictive;
        })
      )
        this.#t.add(n);
  }
  refuses(e) {
    return this.#t.has(e);
  }
  get() {
    return this.#e === void 0 ? void 0 : clone(this.#e);
  }
  keep(e) {
    this.#e = clone(e);
  }
}
//@ chunk-s61vbvea.js:480982-481007 placement
var Ti = new HostScoped(() => new HeldOwnerSettings());
/**
 * 取得冻结中的属主设置：合并会话启动时冻结的设置与当前用户设置。
 */
//@ chunk-s61vbvea.js:481007-481343 placement
function getHeldServedOwnerSettings() {
  let e = servedSettingsUnavailableReason();
  if (!e.held) return e;
  try {
    let of = Ti.of(getRootSession().host),
      r = of.get(),
      s = e.took === "ok",
      h =
        r === void 0
          ? e.settings
          : mergeCredentialDenyFiles(
              stripCredentialHelperSettings(tightenSettingsWith(r, s ? e.settings : null) ?? {}),
              e.settings,
            );
    if (s || r === void 0) of.keep(h);
    if (s) of.noteRefusalsOf(e.settings);
    return { held: !0, settings: h, took: e.took };
  } catch (error) {
    return (logError(toError(error)), N4r(), { held: !0, settings: {}, took: "failed" });
  }
}
//@ chunk-s61vbvea.js:481343-481721 placement
function recordServedUserRulesAtAttach(e) {
  let n = holdServedUserSettings(e);
  try {
    switch (n) {
      case "recorded":
      case "first_attach":
        logFeatureOk("remote_served_user_rules_at_attach", {
          op: lit("record_held"),
          first_attach: n === "first_attach",
        });
        break;
      case "first_attach_unread":
      case "path_not_accepted":
      case "record_unreadable":
      case "failed":
        logFeatureSad("remote_served_user_rules_at_attach", n);
        break;
      case "already_held":
      case "not_held":
        break;
    }
  } catch (error) {
    logError(toError(error));
  }
  return n;
}
//@ chunk-s61vbvea.js:481721-482642 placement
function holdServedUserSettings(e) {
  try {
    if (!readFlagWithOverride(TENGU_QUIET_LOCKET, { safe: !0 }) || !isSettingSourceEnabled("userSettings"))
      return "not_held";
    let n = getSettingsFilePathForSource("userSettings");
    if (n === void 0) return "not_held";
    let of = Ti.of(getRootSession().host);
    if (of.get() !== void 0) return "already_held";
    let file = e.file(n);
    if (file === "unreadable") return (of.keep({}), "record_unreadable");
    let h = file === "none";
    if (h && e.file(zf()) !== "none")
      return (e.recordFile(n, null, "first_attach"), of.keep({}), "path_not_accepted");
    if (h) e.recordFile(zf(), null, "first_attach");
    let y = h ? readRepoTierFileText(n) : void 0,
      S =
        file !== "none"
          ? file.text
          : y === void 0 || y === "absent" || y === "unreadable"
            ? null
            : Dq(y.text),
      w = S === null ? {} : parseSettingsContent(S, n).settings;
    if (y === "unreadable" || w === null) {
      if (h) e.recordFile(n, null, "first_attach");
      return (of.keep({}), h ? "first_attach_unread" : "record_unreadable");
    }
    let R = servedRestrictionSnapshot(w);
    if (h) e.recordFile(n, S === null ? null : f_n(R), "first_attach");
    (of.noteRefusalsOf(R), of.keep(R));
    try {
      e.noteServed(n, [n, zf()]);
    } catch (error) {
      logError(toError(error));
    }
    return h ? "first_attach" : "recorded";
  } catch (error) {
    return (logError(toError(error)), N4r(), "failed");
  }
}
//@ chunk-s61vbvea.js:482642-482680 placement
var SERVED_OWN_SETTINGS_WAITING = "served-own-settings-waiting";
/**
 * 判断用户设置文件在接入后是否发生变化（受开关控制）。
 */
//@ chunk-s61vbvea.js:482680-483010 placement
function hasUserSettingsChangedSinceAttach(e) {
  try {
    if (!readFlagWithOverride(TENGU_QUIET_LOCKET, { safe: !0 }) || !isSettingSourceEnabled("userSettings"))
      return !1;
    let n = getSettingsFilePathForSource("userSettings"),
      r = n === void 0 ? "none" : e.file(n);
    if (n === void 0 || r === "none") return !1;
    let s = readRepoTierFileText(n);
    if (r === "unreadable" || s === "unreadable") return !0;
    let h = mw(r.text, n),
      y = mw(s === "absent" ? null : Dq(s.text), n);
    return h === void 0 || h !== y;
  } catch (error) {
    return (logError(toError(error)), !1);
  }
}
//@ chunk-s61vbvea.js:483010-483097 placement
function mw(e, n) {
  let r = e === null ? {} : parseSettingsContent(e, n).settings;
  return r === null ? void 0 : f_n(servedRestrictionSnapshot(r));
}
//@ chunk-s61vbvea.js:483097-483148 placement
function zf() {
  return join_15(servedCallsDir(), "owner-settings-met");
}
/**
 * 从设置中提取受管理的限制性字段快照，只保留取严格值的项。
 */
//@ chunk-s61vbvea.js:483148-483448 placement
function servedRestrictionSnapshot(e) {
  let n = pickRestrictionFields(e);
  for (let s of hw)
    for (let path of s.paths) {
      let found = MANAGED_RESTRICTION_KEYS().find((S) => En(S.path, path));
      if (found !== void 0 && restrictionValue(found, e) === found.restrictive)
        setAtPath(n, path, getAtPath(e, path));
    }
  let r = e.sandbox?.credentials?.files ?? [];
  if (r.length > 0)
    setAtPath(
      n,
      ["sandbox", "credentials", "files"],
      r.map((s) => ({ path: s.path, mode: "deny" })),
    );
  return n;
}
//@ chunk-s61vbvea.js:483448-483488 placement
function f_n(e) {
  return `${jsonStringify(e, null, 2)}
`;
}
//@ chunk-s61vbvea.js:483488-483578 placement
function N4r() {
  try {
    let of = Ti.of(getRootSession().host);
    if (of.get() === void 0) of.keep({});
  } catch (error) {
    logError(toError(error));
  }
}
//@ chunk-s61vbvea.js:483578-483678 placement
function isServedSettingRefused(e) {
  try {
    return readFlagWithOverride(TENGU_QUIET_LOCKET, { safe: !0 }) && Ti.of(getRootSession().host).refuses(e);
  } catch (error) {
    return (logError(toError(error)), !0);
  }
}
//@ chunk-s61vbvea.js:483678-483778 placement
function getKeptServedOwnerSettings() {
  try {
    return readFlagWithOverride(TENGU_QUIET_LOCKET, { safe: !0 })
      ? Ti.of(getRootSession().host).get()
      : void 0;
  } catch (error) {
    return (logError(toError(error)), {});
  }
}
/**
 * 把另一份设置中的凭据文件补进当前设置的拒绝列表（去重）。
 */
//@ chunk-s61vbvea.js:483778-484093 placement
function mergeCredentialDenyFiles(e, n) {
  let r = e.sandbox?.credentials?.files ?? [],
    s = new Set(r.map((y) => y.path)),
    h = [];
  for (let y of n.sandbox?.credentials?.files ?? [])
    if (!s.has(y.path)) (s.add(y.path), h.push({ path: y.path, mode: "deny" }));
  return h.length === 0
    ? e
    : { ...e, sandbox: { ...e.sandbox, credentials: { ...e.sandbox?.credentials, files: [...r, ...h] } } };
}
//@ chunk-s61vbvea.js:484093-484747 placement
function servedSettingsUnavailableReason() {
  if (!readFlagWithOverride(TENGU_QUIET_LOCKET, { safe: !0 })) return { held: !1, why: "switch_off" };
  let e = {},
    n;
  try {
    if (!isSettingSourceEnabled("userSettings")) return { held: !0, settings: {}, took: "source_disabled" };
    let r = getSettingsFilePathForSource("userSettings"),
      s = r === void 0 ? void 0 : parseSettingsFileUncached(r);
    if (s?.settings === null && s.errors.length > 0) n = "unreadable";
    else ((e = stripCredentialHelperSettings(s?.settings ?? {})), (n = "ok"));
  } catch (error) {
    (logError(toError(error)), (e = {}), (n = "failed"));
  }
  try {
    switch (n) {
      case "ok":
        logFeatureOk("remote_served_user_rules_at_attach", {
          op: lit("taken"),
          flag_source: fromEnum(getFeatureValueWithSource_CACHED_MAY_BE_STALE(TENGU_QUIET_LOCKET, !0).source),
        });
        break;
      case "unreadable":
        logFeatureSad("remote_served_user_rules_at_attach", "take_unreadable");
        break;
      case "failed":
        logFeatureSad("remote_served_user_rules_at_attach", "take_failed");
        break;
    }
  } catch (error) {
    logError(toError(error));
  }
  return { held: !0, settings: e, took: n };
}
//@ chunk-s61vbvea.js:484747-484823 placement
function LF(e, n) {
  let r = n.held ? tightenSettingsWith(n.settings, e) : e;
  return r === null ? null : stripCredentialHelperSettings(r);
}
/**
 * 远程提供工具时重算 userSettings 的权限规则：保留持有快照中仍存在的 allow，当前 deny/ask 全部保留，再补上快照中有但当前缺失的 deny/ask；返回规则与被搁置的 allow 数、保留的拒绝数。
 */
//@ chunk-s61vbvea.js:484823-485330 placement
function reconcileUserSettingsRules(rules, n, r) {
  if (!n.held) return { rules: rules.slice(), allowsSetAside: 0, refusalsKept: 0 };
  let s = settingsJsonToRules(LF(r, n), "userSettings"),
    h = new Set(s.map(hasBashPermission)),
    y = new Set(),
    S = [],
    w = 0;
  for (let x of rules) {
    if (x.source !== "userSettings") {
      S.push(x);
      continue;
    }
    switch (x.ruleBehavior) {
      case "allow":
        if (h.has(hasBashPermission(x))) S.push(x);
        else w += 1;
        break;
      case "deny":
      case "ask":
        (y.add(hasBashPermission(x)), S.push(x));
        break;
    }
  }
  let R = 0;
  for (let x of s) {
    let P = hasBashPermission(x);
    if (x.ruleBehavior === "allow" || y.has(P)) continue;
    (y.add(P), S.push(x), (R += 1));
  }
  return { rules: S, allowsSetAside: w, refusalsKept: R };
}
/**
 * 在冻结设置时合并用户规则：冻结中返回附加 deny 规则，失败时记录错误并返回原规则。
 */
//@ chunk-s61vbvea.js:485330-485715 placement
function applyHeldUserRules(e, n, r) {
  if (n === void 0 || !n.held) return e;
  try {
    if (r) return [...e, ...userRefusalRules(n.settings, ["deny"])];
    return reconcileUserSettingsRules(
      e,
      n,
      isSettingSourceEnabled("userSettings") ? getSettingsForSource("userSettings") : null,
    ).rules;
  } catch (error) {
    logError(toError(error));
    let filtered = e.filter((y) => y.source !== "userSettings" || y.ruleBehavior !== "allow");
    try {
      let y = new Set(filtered.map(hasBashPermission));
      return [
        ...filtered,
        ...userRefusalRules(n.settings, ["deny", "ask"]).filter((S) => !y.has(hasBashPermission(S))),
      ];
    } catch (error) {
      return (logError(toError(error)), filtered);
    }
  }
}
//@ chunk-s61vbvea.js:485715-485826 placement
function userRefusalRules(e, n) {
  return settingsJsonToRules(e, "userSettings").filter(
    (r) => r.ruleBehavior !== "allow" && n.includes(r.ruleBehavior),
  );
}
//@ chunk-s61vbvea.js:485826-485889 placement = hasBashPermission (1)
function hasBashPermission(rules) {
  return `${rules.ruleBehavior}\x00${formatPermissionRule(rules.ruleValue)}`;
}
//@ chunk-s61vbvea.js:485889-485992 placement
function stripCredentialHelperSettings(e) {
  if (!CREDENTIAL_HELPER_SETTINGS_KEYS.some((r) => r in e)) return e;
  let n = { ...e };
  for (let r of CREDENTIAL_HELPER_SETTINGS_KEYS) delete n[r];
  return n;
}
//@ chunk-s61vbvea.js:485992-486144 placement
function parseGitVersion(e) {
  let match = /^git version (\d+)\.(\d+)\.(\d+)/.exec(e.trim());
  return match === null
    ? null
    : { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]) };
}
//@ chunk-s61vbvea.js:486144-486215 placement
function hti(e) {
  return e !== null && (e.major > 2 || (e.major === 2 && e.minor >= 32));
}
//@ chunk-s61vbvea.js:486215-486286 placement
function yti(e) {
  return e !== null && (e.major > 2 || (e.major === 2 && e.minor >= 32));
}
//@ chunk-s61vbvea.js:486286-486338 placement
var vSe = /^[0-9a-f]{40}(?:[0-9a-f]{24})?$/,
  BF = /^0+$/;
//@ chunk-s61vbvea.js:486338-486372 placement
function _ti(e) {
  return !BF.test(e);
}
/**
 * 组合的 beta 头值与 anthropic-version "2023-06-01"。
 */
//@ chunk-s61vbvea.js:486464-486519 placement = ANTHROPIC_VERSION (0.816)
var COMBINED_BETA_HEADER = `${rls.header},${UEe.header}`,
  ANTHROPIC_VERSION_2 = "2023-06-01";

export {
  f_n,
  servedRestrictionSnapshot,
  freeze_3,
  recordServedUserRulesAtAttach,
  getHeldServedOwnerSettings,
  N4r,
  hasUserSettingsChangedSinceAttach,
  SERVED_OWN_SETTINGS_WAITING,
  ANTHROPIC_VERSION_2,
  COMBINED_BETA_HEADER,
  vSe,
  _ti,
  getKeptServedOwnerSettings,
  hti,
  parseGitVersion,
  readServedOwnerSettings,
  hasServedCallLogs,
  yti,
  isServedSettingRefused,
  applyHeldUserRules,
};
