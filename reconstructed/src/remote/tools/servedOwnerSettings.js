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
import { readdirSync } from "fs";
import { join } from "path";
import {
  getAtPath,
  setAtPath,
  restrictionValue,
  MANAGED_RESTRICTION_KEYS,
  asArray,
} from "../../utils/settings/managedRestrictionKeys.js";
import { jsonStringify, clone } from "../../utils/slowOperations.js";
import { En } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { safeParseJSON } from "../../utils/json.js";
import { stripBomAndCarriageReturns } from "../../utils/settings/settingsReview.js";
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
import { BETA_FILES_API, BETA_OAUTH_AUTH } from "../../utils/betas.js";

//@ chunk-s61vbvea.js:476551-477028 placement
/**
 * 仓库设置层级和需要冻结的限制性设置路径（deny/ask 规则、沙箱读写限制、禁止域名）。
 */
var REPO_SETTINGS_TIERS = ["project", "local", "legacy"];
var RESTRICTIVE_LIST_PATHS = [
  ["permissions", "deny"],
  ["permissions", "ask"],
  ["sandbox", "filesystem", "denyRead"],
  ["sandbox", "filesystem", "denyWrite"],
  ["sandbox", "network", "deniedDomains"],
];
var PERMISSIVE_LIST_PATHS = [
  ["permissions", "allow"],
  ["permissions", "additionalDirectories"],
  ["sandbox", "filesystem", "allowRead"],
  ["sandbox", "filesystem", "allowWrite"],
  ["sandbox", "network", "allowedDomains"],
  ["sandbox", "network", "allowUnixSockets"],
  ["sandbox", "excludedCommands"],
];
var SANDBOX_ENABLED_PATH = ["sandbox", "enabled"];
//@ chunk-s61vbvea.js:477028-477088 placement
function getArrayAtPath(e, n) {
  let atPath = getAtPath(e, n);
  return Array.isArray(atPath) ? atPath : [];
}
//@ chunk-s61vbvea.js:477088-477550 placement
/**
 * 用新设置收紧旧设置：deny/ask 等限制性列表取并集，allow/allowRead 等放宽性列表只保留双方都有的项，托管限制键取更严格的值；用于提供远程工具时只接受变严、不接受变宽。
 */
function tightenSettingsWith(e, n, r = false) {
  let clone = structuredClone(e ?? {});
  for (let h of RESTRICTIVE_LIST_PATHS) {
    let arrayAtPath = getArrayAtPath(e, h);
    let S = new Set(arrayAtPath.map((R) => jsonStringify(R)));
    let filtered = getArrayAtPath(n, h).filter((R) => !S.has(jsonStringify(R)));
    if (filtered.length > 0) setAtPath(clone, h, [...arrayAtPath, ...filtered]);
  }
  for (let h of PERMISSIVE_LIST_PATHS) {
    let arrayAtPath = getArrayAtPath(e, h);
    let S = new Set(getArrayAtPath(n, h).map((R) => jsonStringify(R)));
    let filtered = arrayAtPath.filter((R) => S.has(jsonStringify(R)));
    if (filtered.length !== arrayAtPath.length) setAtPath(clone, h, filtered);
  }
  for (let h of sandboxRestrictionKeys()) {
    if (!r && En(h.path, SANDBOX_ENABLED_PATH)) continue;
    let y = restrictionValue(h, n);
    if (restrictionRank(h, y) < restrictionRank(h, restrictionValue(h, e))) setAtPath(clone, h.path, y);
  }
  return e === null && Object.keys(clone).length === 0 ? null : clone;
}
//@ chunk-s61vbvea.js:477550-477611 placement
function sandboxRestrictionKeys() {
  return MANAGED_RESTRICTION_KEYS().filter((e) => e.path[0] === "sandbox");
}
//@ chunk-s61vbvea.js:477611-477705 placement
function restrictionRank(e, n) {
  let index = asArray(e.restrictive).indexOf(n);
  return index === -1 ? Number.POSITIVE_INFINITY : index;
}
//@ chunk-s61vbvea.js:477705-477914 placement
function pickRestrictionFields(e) {
  let n = {};
  for (let r of [...RESTRICTIVE_LIST_PATHS, ...PERMISSIVE_LIST_PATHS]) {
    let atPath = getAtPath(e, r);
    if (Array.isArray(atPath)) setAtPath(n, r, atPath);
  }
  for (let r of sandboxRestrictionKeys().filter((s) => !En(s.path, SANDBOX_ENABLED_PATH))) {
    let s = restrictionValue(r, e);
    if (Number.isFinite(restrictionRank(r, s))) setAtPath(n, r.path, s);
  }
  return n;
}
//@ chunk-s61vbvea.js:477914-477958 placement
function isSameSettingsText(text, n) {
  return text === n || (isEmptySettingsText(text) && isEmptySettingsText(n));
}
//@ chunk-s61vbvea.js:477958-478107 placement
function isEmptySettingsText(e) {
  if (e === null || e.trim() === "") return true;
  let n = safeParseJSON(e, false);
  return typeof n === "object" && n !== null && !Array.isArray(n) && Object.keys(n).length === 0;
}
//@ chunk-s61vbvea.js:478107-478403 placement
function unreadableAcceptedSettings(file) {
  return {
    settings: null,
    errors: [
      {
        file,
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
function readServedOwnerSettings(
  e,
  n,
  readRepoTierFileText,
  s,
  repoTierFileLeadsAway = () => false,
  y = () => false,
) {
  let S = {
    seeds: new Map(),
    heldBack: [],
    firstSeen: [],
    unreadable: false,
    matching: new Set(),
    hookWaiting: false,
    sandboxTurnedOn: false,
  };
  let w = e.folder(n.key);
  let R = [];
  for (let x of REPO_SETTINGS_TIERS) {
    let file = n[x];
    if (file === null) continue;
    let j = readRepoTierFileText(file);
    let G = j === "absent" || j === "unreadable" ? null : stripBomAndCarriageReturns(j.text);
    let L = n.linkedAway.includes(x) || repoTierFileLeadsAway(file);
    let q = G === null || L ? null : parseSettingsContent(G, file);
    let Q = x === "local" && getAtPath(q?.settings ?? null, SANDBOX_ENABLED_PATH) === true && y();
    let Z = typeof w === "object" ? w[x] : file;
    let ee;
    if (w === "unreadable") ee = "unreadable";
    else if (Z === null)
      ee = {
        text: null,
      };
    else {
      let we = e.file(Z);
      if (we === "unreadable" || (we === "none" && w !== "none")) ee = "unreadable";
      else if (we === "none") {
        let ie = L ? null : G;
        ee = {
          text: ie,
        };
        S.firstSeen.push({
          slot: x,
          present: j !== "absent",
          widening: q?.settings != null && !En(tightenSettingsWith(null, q.settings) ?? {}, q.settings),
        });
        if (s === "engage") e.recordFile(file, ie, "first_attach");
      } else {
        ee = {
          text: we.text,
        };
        R.push(Z);
      }
    }
    let PreToolUse = q?.settings?.hooks?.PreToolUse;
    let se = PreToolUse !== undefined && PreToolUse.length > 0;
    if (ee === "unreadable") {
      S.unreadable = true;
      S.heldBack.push(x);
      S.hookWaiting ||= se;
      let we = tightenSettingsWith(null, q?.settings ?? null, Q);
      S.sandboxTurnedOn ||= getAtPath(we, SANDBOX_ENABLED_PATH) === true;
      S.seeds.set(file, {
        ...unreadableAcceptedSettings(file),
        settings: we,
      });
      continue;
    }
    let re = !isSameSettingsText(ee.text, G);
    if (!(j === "unreadable" || re || Z !== file)) {
      if (!L) S.matching.add(file);
      S.seeds.set(
        file,
        q ?? (ee.text === null ? missingSettingsFileResult() : parseSettingsContent(ee.text, file)),
      );
      continue;
    }
    if (re || j === "unreadable") S.heldBack.push(x);
    let Se = ee.text === null ? missingSettingsFileResult() : parseSettingsContent(ee.text, file);
    S.hookWaiting ||= se && !En(PreToolUse, Se.settings?.hooks?.PreToolUse);
    let ce = tightenSettingsWith(Se.settings, q?.settings ?? null, Q);
    S.sandboxTurnedOn ||=
      getAtPath(ce, SANDBOX_ENABLED_PATH) === true && getAtPath(Se.settings, SANDBOX_ENABLED_PATH) !== true;
    S.seeds.set(
      file,
      ce === null && Se.settings === null
        ? Se
        : {
            ...Se,
            settings: ce,
          },
    );
  }
  if (s === "engage") {
    if (w === "none")
      e.recordFolder(n.key, {
        project: n.project,
        local: n.local,
        legacy: n.legacy,
      });
    e.noteServed(n.key, R);
  }
  return S;
}
//@ chunk-s61vbvea.js:480084-480197 placement
function hasServedCallLogs(e = servedCallsDir()) {
  try {
    return readdirSync(e).some((n) => n.endsWith(".jsonl") || n.endsWith(".seen"));
  } catch (error) {
    return !isENOENT(error);
  }
}
//@ chunk-s61vbvea.js:480197-480695 placement
/**
 * 属主设置冻结的开关与受管限制字段表：read_block、write_block、auto_mode_off、plan_asks_a_person、unattended_serving_off 各自的设置路径。
 */
var TENGU_QUIET_LOCKET = "tengu_quiet_locket";
var fti = Object.freeze({
  held: true,
  settings: Object.freeze({}),
  took: "unbound",
});
var MANAGED_RESTRICTION_FIELDS = [
  {
    name: "read_block",
    paths: [["permissions", "blockReadsOutsideWorkingDirectories"]],
  },
  {
    name: "write_block",
    paths: [["permissions", "blockWritesOutsideWorkingDirectories"]],
  },
  {
    name: "auto_mode_off",
    paths: [["disableAutoMode"], ["permissions", "disableAutoMode"]],
  },
  {
    name: "plan_asks_a_person",
    paths: [["useAutoModeDuringPlan"]],
  },
  {
    name: "unattended_serving_off",
    paths: [["remoteTools", "allowUnattendedServing"]],
  },
];
//@ chunk-s61vbvea.js:480695-480982 placement
class HeldOwnerSettings {
  #e;
  #t = new Set();
  noteRefusalsOf(e) {
    for (let { name: n, paths } of MANAGED_RESTRICTION_FIELDS)
      if (
        paths.some((path) => {
          let found = MANAGED_RESTRICTION_KEYS().find((S) => En(S.path, path));
          return found === undefined || restrictionValue(found, e) === found.restrictive;
        })
      )
        this.#t.add(n);
  }
  refuses(e) {
    return this.#t.has(e);
  }
  get() {
    return this.#e === undefined ? undefined : clone(this.#e);
  }
  keep(e) {
    this.#e = clone(e);
  }
}
//@ chunk-s61vbvea.js:480982-481007 placement
/**
 * 按宿主保存的“持有中”属主设置槽：会话启动时冻结的设置快照与当前用户设置的合并。
 */
var heldOwnerSettingsSlot = new HostScoped(() => new HeldOwnerSettings());
//@ chunk-s61vbvea.js:481007-481343 placement
/**
 * 取得冻结中的属主设置：合并会话启动时冻结的设置与当前用户设置。
 */
function getHeldServedOwnerSettings() {
  let e = servedSettingsUnavailableReason();
  if (!e.held) return e;
  try {
    let n = heldOwnerSettingsSlot.of(getRootSession().host);
    let r = n.get();
    let s = e.took === "ok";
    let h =
      r === undefined
        ? e.settings
        : mergeCredentialDenyFiles(
            stripCredentialHelperSettings(tightenSettingsWith(r, s ? e.settings : null) ?? {}),
            e.settings,
          );
    if (s || r === undefined) n.keep(h);
    if (s) n.noteRefusalsOf(e.settings);
    return {
      held: true,
      settings: h,
      took: e.took,
    };
  } catch (error) {
    logError(toError(error));
    keepEmptyOwnerSettings();
    return {
      held: true,
      settings: {},
      took: "failed",
    };
  }
}
//@ chunk-s61vbvea.js:481343-481721 placement
function recordServedUserRulesAtAttach(acceptedSettingsStore) {
  let n = holdServedUserSettings(acceptedSettingsStore);
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
    if (
      !readFlagWithOverride(TENGU_QUIET_LOCKET, {
        safe: true,
      }) ||
      !isSettingSourceEnabled("userSettings")
    )
      return "not_held";
    let settingsFilePathForSource = getSettingsFilePathForSource("userSettings");
    if (settingsFilePathForSource === undefined) return "not_held";
    let r = heldOwnerSettingsSlot.of(getRootSession().host);
    if (r.get() !== undefined) return "already_held";
    let s = e.file(settingsFilePathForSource);
    if (s === "unreadable") {
      r.keep({});
      return "record_unreadable";
    }
    let h = s === "none";
    if (h && e.file(ownerSettingsMetPath()) !== "none") {
      e.recordFile(settingsFilePathForSource, null, "first_attach");
      r.keep({});
      return "path_not_accepted";
    }
    if (h) e.recordFile(ownerSettingsMetPath(), null, "first_attach");
    let y = h ? readRepoTierFileText(settingsFilePathForSource) : undefined;
    let S =
      s !== "none"
        ? s.text
        : y === undefined || y === "absent" || y === "unreadable"
          ? null
          : stripBomAndCarriageReturns(y.text);
    let settings = S === null ? {} : parseSettingsContent(S, settingsFilePathForSource).settings;
    if (y === "unreadable" || settings === null) {
      if (h) e.recordFile(settingsFilePathForSource, null, "first_attach");
      r.keep({});
      return h ? "first_attach_unread" : "record_unreadable";
    }
    let R = servedRestrictionSnapshot(settings);
    if (h) e.recordFile(settingsFilePathForSource, S === null ? null : settingsToJsonText(R), "first_attach");
    r.noteRefusalsOf(R);
    r.keep(R);
    try {
      e.noteServed(settingsFilePathForSource, [settingsFilePathForSource, ownerSettingsMetPath()]);
    } catch (error) {
      logError(toError(error));
    }
    return h ? "first_attach" : "recorded";
  } catch (error) {
    logError(toError(error));
    keepEmptyOwnerSettings();
    return "failed";
  }
}
//@ chunk-s61vbvea.js:482642-482680 placement
var SERVED_OWN_SETTINGS_WAITING = "served-own-settings-waiting";
//@ chunk-s61vbvea.js:482680-483010 placement
/**
 * 判断用户设置文件在接入后是否发生变化（受开关控制）。
 */
function hasUserSettingsChangedSinceAttach(acceptedSettingsStore) {
  try {
    if (
      !readFlagWithOverride(TENGU_QUIET_LOCKET, {
        safe: true,
      }) ||
      !isSettingSourceEnabled("userSettings")
    )
      return false;
    let settingsFilePathForSource = getSettingsFilePathForSource("userSettings");
    let r =
      settingsFilePathForSource === undefined
        ? "none"
        : acceptedSettingsStore.file(settingsFilePathForSource);
    if (settingsFilePathForSource === undefined || r === "none") return false;
    let repoTierFileText = readRepoTierFileText(settingsFilePathForSource);
    if (r === "unreadable" || repoTierFileText === "unreadable") return true;
    let h = snapshotSettingsText(r.text, settingsFilePathForSource);
    let y = snapshotSettingsText(
      repoTierFileText === "absent" ? null : stripBomAndCarriageReturns(repoTierFileText.text),
      settingsFilePathForSource,
    );
    return h === undefined || h !== y;
  } catch (error) {
    logError(toError(error));
    return false;
  }
}
//@ chunk-s61vbvea.js:483010-483097 placement
function snapshotSettingsText(e, settingsFilePathForSource) {
  let settings = e === null ? {} : parseSettingsContent(e, settingsFilePathForSource).settings;
  return settings === null ? undefined : settingsToJsonText(servedRestrictionSnapshot(settings));
}
//@ chunk-s61vbvea.js:483097-483148 placement
function ownerSettingsMetPath() {
  return join(servedCallsDir(), "owner-settings-met");
}
//@ chunk-s61vbvea.js:483148-483448 placement
/**
 * 从设置中提取受管理的限制性字段快照，只保留取严格值的项。
 */
function servedRestrictionSnapshot(settings) {
  let n = pickRestrictionFields(settings);
  for (let s of MANAGED_RESTRICTION_FIELDS)
    for (let path of s.paths) {
      let found = MANAGED_RESTRICTION_KEYS().find((S) => En(S.path, path));
      if (found !== undefined && restrictionValue(found, settings) === found.restrictive)
        setAtPath(n, path, getAtPath(settings, path));
    }
  let files = settings.sandbox?.credentials?.files ?? [];
  if (files.length > 0)
    setAtPath(
      n,
      ["sandbox", "credentials", "files"],
      files.map((file) => ({
        path: file.path,
        mode: "deny",
      })),
    );
  return n;
}
//@ chunk-s61vbvea.js:483448-483488 placement
/**
 * 导出函数 `settingsToJsonText`：参数 e，返回 `${jsonStringify(e, null, 2)} `。
 */
function settingsToJsonText(e) {
  return `${jsonStringify(e, null, 2)}
`;
}
//@ chunk-s61vbvea.js:483488-483578 placement
/**
 * 导出函数 `keepEmptyOwnerSettings`。
 */
function keepEmptyOwnerSettings() {
  try {
    let e = heldOwnerSettingsSlot.of(getRootSession().host);
    if (e.get() === undefined) e.keep({});
  } catch (error) {
    logError(toError(error));
  }
}
//@ chunk-s61vbvea.js:483578-483678 placement
function isServedSettingRefused(e) {
  try {
    return (
      readFlagWithOverride(TENGU_QUIET_LOCKET, {
        safe: true,
      }) && heldOwnerSettingsSlot.of(getRootSession().host).refuses(e)
    );
  } catch (error) {
    logError(toError(error));
    return true;
  }
}
//@ chunk-s61vbvea.js:483678-483778 placement
function getKeptServedOwnerSettings() {
  try {
    return readFlagWithOverride(TENGU_QUIET_LOCKET, {
      safe: true,
    })
      ? heldOwnerSettingsSlot.of(getRootSession().host).get()
      : undefined;
  } catch (error) {
    logError(toError(error));
    return {};
  }
}
//@ chunk-s61vbvea.js:483778-484093 placement
/**
 * 把另一份设置中的凭据文件补进当前设置的拒绝列表（去重）。
 */
function mergeCredentialDenyFiles(e, settings) {
  let files = e.sandbox?.credentials?.files ?? [];
  let s = new Set(files.map((file) => file.path));
  let h = [];
  for (let y of settings.sandbox?.credentials?.files ?? [])
    if (!s.has(y.path)) {
      s.add(y.path);
      h.push({
        path: y.path,
        mode: "deny",
      });
    }
  return h.length === 0
    ? e
    : {
        ...e,
        sandbox: {
          ...e.sandbox,
          credentials: {
            ...e.sandbox?.credentials,
            files: [...files, ...h],
          },
        },
      };
}
//@ chunk-s61vbvea.js:484093-484747 placement
function servedSettingsUnavailableReason() {
  if (
    !readFlagWithOverride(TENGU_QUIET_LOCKET, {
      safe: true,
    })
  )
    return {
      held: false,
      why: "switch_off",
    };
  let e = {};
  let n;
  try {
    if (!isSettingSourceEnabled("userSettings"))
      return {
        held: true,
        settings: {},
        took: "source_disabled",
      };
    let settingsFilePathForSource = getSettingsFilePathForSource("userSettings");
    let s =
      settingsFilePathForSource === undefined
        ? undefined
        : parseSettingsFileUncached(settingsFilePathForSource);
    if (s?.settings === null && s.errors.length > 0) n = "unreadable";
    else {
      e = stripCredentialHelperSettings(s?.settings ?? {});
      n = "ok";
    }
  } catch (error) {
    logError(toError(error));
    e = {};
    n = "failed";
  }
  try {
    switch (n) {
      case "ok":
        logFeatureOk("remote_served_user_rules_at_attach", {
          op: lit("taken"),
          flag_source: fromEnum(
            getFeatureValueWithSource_CACHED_MAY_BE_STALE(TENGU_QUIET_LOCKET, true).source,
          ),
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
  return {
    held: true,
    settings: e,
    took: n,
  };
}
//@ chunk-s61vbvea.js:484747-484823 placement
function tightenOrStripCredentialHelpers(e, n) {
  let r = n.held ? tightenSettingsWith(n.settings, e) : e;
  return r === null ? null : stripCredentialHelperSettings(r);
}
//@ chunk-s61vbvea.js:484823-485330 placement
/**
 * 远程提供工具时重算 userSettings 的权限规则：保留持有快照中仍存在的 allow，当前 deny/ask 全部保留，再补上快照中有但当前缺失的 deny/ask；返回规则与被搁置的 allow 数、保留的拒绝数。
 */
function reconcileUserSettingsRules(rules, n, r) {
  if (!n.held)
    return {
      rules: rules.slice(),
      allowsSetAside: 0,
      refusalsKept: 0,
    };
  let s = settingsJsonToRules(tightenOrStripCredentialHelpers(r, n), "userSettings");
  let h = new Set(s.map(hasBashPermission));
  let y = new Set();
  let S = [];
  let allowsSetAside = 0;
  for (let rule of rules) {
    if (rule.source !== "userSettings") {
      S.push(rule);
      continue;
    }
    switch (rule.ruleBehavior) {
      case "allow":
        if (h.has(hasBashPermission(rule))) S.push(rule);
        else allowsSetAside += 1;
        break;
      case "deny":
      case "ask":
        y.add(hasBashPermission(rule));
        S.push(rule);
        break;
    }
  }
  let refusalsKept = 0;
  for (let x of s) {
    let P = hasBashPermission(x);
    if (x.ruleBehavior === "allow" || y.has(P)) continue;
    y.add(P);
    S.push(x);
    refusalsKept += 1;
  }
  return {
    rules: S,
    allowsSetAside,
    refusalsKept,
  };
}
//@ chunk-s61vbvea.js:485330-485715 placement
/**
 * 在冻结设置时合并用户规则：冻结中返回附加 deny 规则，失败时记录错误并返回原规则。
 */
function applyHeldUserRules(rules, n, r) {
  if (n === undefined || !n.held) return rules;
  try {
    if (r) return [...rules, ...userRefusalRules(n.settings, ["deny"])];
    return reconcileUserSettingsRules(
      rules,
      n,
      isSettingSourceEnabled("userSettings") ? getSettingsForSource("userSettings") : null,
    ).rules;
  } catch (error) {
    logError(toError(error));
    let filtered = rules.filter((y) => y.source !== "userSettings" || y.ruleBehavior !== "allow");
    try {
      let y = new Set(filtered.map(hasBashPermission));
      return [
        ...filtered,
        ...userRefusalRules(n.settings, ["deny", "ask"]).filter((S) => !y.has(hasBashPermission(S))),
      ];
    } catch (error) {
      logError(toError(error));
      return filtered;
    }
  }
}
//@ chunk-s61vbvea.js:485715-485826 placement
function userRefusalRules(settings, n) {
  return settingsJsonToRules(settings, "userSettings").filter(
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
  let n = {
    ...e,
  };
  for (let r of CREDENTIAL_HELPER_SETTINGS_KEYS) delete n[r];
  return n;
}
//@ chunk-s61vbvea.js:485992-486144 placement
function parseGitVersion(stdout) {
  let match = /^git version (\d+)\.(\d+)\.(\d+)/.exec(stdout.trim());
  return match === null
    ? null
    : {
        major: Number(match[1]),
        minor: Number(match[2]),
        patch: Number(match[3]),
      };
}
//@ chunk-s61vbvea.js:486144-486215 placement
/**
 * 导出函数 `isVersionAtLeast2_32`：参数 e，返回 e !== null && (e.major > 2 || (e.major === 2 && e.minor >= 32))。
 */
function isVersionAtLeast2_32(e) {
  return e !== null && (e.major > 2 || (e.major === 2 && e.minor >= 32));
}
//@ chunk-s61vbvea.js:486215-486286 placement
/**
 * 导出函数 `isVersionAtLeast2_32b`：参数 e，返回 e !== null && (e.major > 2 || (e.major === 2 && e.minor >= 32))。
 */
function isVersionAtLeast2_32b(gitVersion) {
  return gitVersion !== null && (gitVersion.major > 2 || (gitVersion.major === 2 && gitVersion.minor >= 32));
}
//@ chunk-s61vbvea.js:486286-486338 placement
/**
 * 导出常量或表 `GIT_SHA_RE`：值为 /^[0-9a-f]{40}(?:[0-9a-f]{24})?$/, BF = /^0+$/。
 */
var GIT_SHA_RE = /^[0-9a-f]{40}(?:[0-9a-f]{24})?$/;
var ALL_ZERO_RE = /^0+$/;
//@ chunk-s61vbvea.js:486338-486372 placement
/**
 * 导出函数 `hasNonZeroHash`：参数 e，返回 !BF.test(e)。
 */
function hasNonZeroHash(e) {
  return !ALL_ZERO_RE.test(e);
}
//@ chunk-s61vbvea.js:486464-486519 placement = ANTHROPIC_VERSION (0.816)
/**
 * 组合的 beta 头值与 anthropic-version "2023-06-01"。
 */
var COMBINED_BETA_HEADER = `${BETA_FILES_API.header},${BETA_OAUTH_AUTH.header}`;
var ANTHROPIC_VERSION_2 = "2023-06-01";
export {
  settingsToJsonText,
  servedRestrictionSnapshot,
  fti,
  recordServedUserRulesAtAttach,
  getHeldServedOwnerSettings,
  keepEmptyOwnerSettings,
  hasUserSettingsChangedSinceAttach,
  SERVED_OWN_SETTINGS_WAITING,
  ANTHROPIC_VERSION_2,
  COMBINED_BETA_HEADER,
  GIT_SHA_RE,
  hasNonZeroHash,
  getKeptServedOwnerSettings,
  isVersionAtLeast2_32,
  parseGitVersion,
  readServedOwnerSettings,
  hasServedCallLogs,
  isVersionAtLeast2_32b,
  isServedSettingRefused,
  applyHeldUserRules,
};
