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
import { import_sortedIndex_2 } from "../../../vendor/lodash-es/_inlinedHelpers.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

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
function getArrayAtPath(settings, path) {
  let atPath = getAtPath(settings, path);
  return Array.isArray(atPath) ? atPath : [];
}
//@ chunk-s61vbvea.js:477088-477550 placement
/**
 * 用新设置收紧旧设置：deny/ask 等限制性列表取并集，allow/allowRead 等放宽性列表只保留双方都有的项，托管限制键取更严格的值；用于提供远程工具时只接受变严、不接受变宽。
 */
function tightenSettingsWith(base, tighter, allowSandbox = false) {
  let clone = structuredClone(base ?? {});
  for (let path of RESTRICTIVE_LIST_PATHS) {
    let arrayAtPath = getArrayAtPath(base, path);
    let baseSet = new Set(arrayAtPath.map((item) => jsonStringify(item)));
    let filtered = getArrayAtPath(tighter, path).filter((item) => !baseSet.has(jsonStringify(item)));
    if (filtered.length > 0) setAtPath(clone, path, [...arrayAtPath, ...filtered]);
  }
  for (let path of PERMISSIVE_LIST_PATHS) {
    let arrayAtPath = getArrayAtPath(base, path);
    let tighterSet = new Set(getArrayAtPath(tighter, path).map((item) => jsonStringify(item)));
    let filtered = arrayAtPath.filter((item) => tighterSet.has(jsonStringify(item)));
    if (filtered.length !== arrayAtPath.length) setAtPath(clone, path, filtered);
  }
  for (let key of sandboxRestrictionKeys()) {
    if (!allowSandbox && import_sortedIndex_2(key.path, SANDBOX_ENABLED_PATH)) continue;
    let value = restrictionValue(key, tighter);
    if (restrictionRank(key, value) < restrictionRank(key, restrictionValue(key, base)))
      setAtPath(clone, key.path, value);
  }
  return base === null && Object.keys(clone).length === 0 ? null : clone;
}
//@ chunk-s61vbvea.js:477550-477611 placement
function sandboxRestrictionKeys() {
  return MANAGED_RESTRICTION_KEYS().filter((key) => key.path[0] === "sandbox");
}
//@ chunk-s61vbvea.js:477611-477705 placement
function restrictionRank(key, value) {
  let index = asArray(key.restrictive).indexOf(value);
  return index === -1 ? Number.POSITIVE_INFINITY : index;
}
//@ chunk-s61vbvea.js:477705-477914 placement
function pickRestrictionFields(settings) {
  let picked = {};
  for (let path of [...RESTRICTIVE_LIST_PATHS, ...PERMISSIVE_LIST_PATHS]) {
    let atPath = getAtPath(settings, path);
    if (Array.isArray(atPath)) setAtPath(picked, path, atPath);
  }
  for (let key of sandboxRestrictionKeys().filter(
    (key) => !import_sortedIndex_2(key.path, SANDBOX_ENABLED_PATH),
  )) {
    let value = restrictionValue(key, settings);
    if (Number.isFinite(restrictionRank(key, value))) setAtPath(picked, key.path, value);
  }
  return picked;
}
//@ chunk-s61vbvea.js:477914-477958 placement
function isSameSettingsText(text, other) {
  return text === other || (isEmptySettingsText(text) && isEmptySettingsText(other));
}
//@ chunk-s61vbvea.js:477958-478107 placement
function isEmptySettingsText(text) {
  if (text === null || text.trim() === "") return true;
  let parsed = safeParseJSON(text, false);
  return (
    typeof parsed === "object" &&
    parsed !== null &&
    !Array.isArray(parsed) &&
    Object.keys(parsed).length === 0
  );
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
  store,
  slots,
  readRepoTierFileText,
  mode,
  repoTierFileLeadsAway = () => false,
  sandboxForced = () => false,
) {
  let result = {
    seeds: new Map(),
    heldBack: [],
    firstSeen: [],
    unreadable: false,
    matching: new Set(),
    hookWaiting: false,
    sandboxTurnedOn: false,
  };
  let folder = store.folder(slots.key);
  let accepted = [];
  for (let slot of REPO_SETTINGS_TIERS) {
    let file = slots[slot];
    if (file === null) continue;
    let read = readRepoTierFileText(file);
    let onDisk = read === "absent" || read === "unreadable" ? null : stripBomAndCarriageReturns(read.text);
    let linkedAway = slots.linkedAway.includes(slot) || repoTierFileLeadsAway(file);
    let parsedDisk = onDisk === null || linkedAway ? null : parseSettingsContent(onDisk, file);
    let sandboxOnLocal =
      slot === "local" &&
      getAtPath(parsedDisk?.settings ?? null, SANDBOX_ENABLED_PATH) === true &&
      sandboxForced();
    let acceptedPath = typeof folder === "object" ? folder[slot] : file;
    let current;
    if (folder === "unreadable") current = "unreadable";
    else if (acceptedPath === null)
      current = {
        text: null,
      };
    else {
      let acceptedFile = store.file(acceptedPath);
      if (acceptedFile === "unreadable" || (acceptedFile === "none" && folder !== "none"))
        current = "unreadable";
      else if (acceptedFile === "none") {
        let text = linkedAway ? null : onDisk;
        current = {
          text,
        };
        result.firstSeen.push({
          slot,
          present: read !== "absent",
          widening:
            parsedDisk?.settings != null &&
            !import_sortedIndex_2(tightenSettingsWith(null, parsedDisk.settings) ?? {}, parsedDisk.settings),
        });
        if (mode === "engage") store.recordFile(file, text, "first_attach");
      } else {
        current = {
          text: acceptedFile.text,
        };
        accepted.push(acceptedPath);
      }
    }
    let PreToolUse = parsedDisk?.settings?.hooks?.PreToolUse;
    let hasPreToolUse = PreToolUse !== undefined && PreToolUse.length > 0;
    if (current === "unreadable") {
      result.unreadable = true;
      result.heldBack.push(slot);
      result.hookWaiting ||= hasPreToolUse;
      let tighter = tightenSettingsWith(null, parsedDisk?.settings ?? null, sandboxOnLocal);
      result.sandboxTurnedOn ||= getAtPath(tighter, SANDBOX_ENABLED_PATH) === true;
      result.seeds.set(file, {
        ...unreadableAcceptedSettings(file),
        settings: tighter,
      });
      continue;
    }
    let differs = !isSameSettingsText(current.text, onDisk);
    if (!(read === "unreadable" || differs || acceptedPath !== file)) {
      if (!linkedAway) result.matching.add(file);
      result.seeds.set(
        file,
        parsedDisk ??
          (current.text === null ? missingSettingsFileResult() : parseSettingsContent(current.text, file)),
      );
      continue;
    }
    if (differs || read === "unreadable") result.heldBack.push(slot);
    let acceptedParsed =
      current.text === null ? missingSettingsFileResult() : parseSettingsContent(current.text, file);
    result.hookWaiting ||=
      hasPreToolUse && !import_sortedIndex_2(PreToolUse, acceptedParsed.settings?.hooks?.PreToolUse);
    let tighter = tightenSettingsWith(acceptedParsed.settings, parsedDisk?.settings ?? null, sandboxOnLocal);
    result.sandboxTurnedOn ||=
      getAtPath(tighter, SANDBOX_ENABLED_PATH) === true &&
      getAtPath(acceptedParsed.settings, SANDBOX_ENABLED_PATH) !== true;
    result.seeds.set(
      file,
      tighter === null && acceptedParsed.settings === null
        ? acceptedParsed
        : {
            ...acceptedParsed,
            settings: tighter,
          },
    );
  }
  if (mode === "engage") {
    if (folder === "none")
      store.recordFolder(slots.key, {
        project: slots.project,
        local: slots.local,
        legacy: slots.legacy,
      });
    store.noteServed(slots.key, accepted);
  }
  return result;
}
//@ chunk-s61vbvea.js:480084-480197 placement
function hasServedCallLogs(dir = servedCallsDir()) {
  try {
    return readdirSync(dir).some((name) => name.endsWith(".jsonl") || name.endsWith(".seen"));
  } catch (error) {
    return !isENOENT(error);
  }
}
//@ chunk-s61vbvea.js:480197-480695 placement
/**
 * 属主设置冻结的开关与受管限制字段表：read_block、write_block、auto_mode_off、plan_asks_a_person、unattended_serving_off 各自的设置路径。
 */
var TENGU_QUIET_LOCKET; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var UNBOUND_MANAGED_HOLD;
var MANAGED_RESTRICTION_FIELDS;
deferInit("chunk-s61vbvea.js:480197", () => {
  TENGU_QUIET_LOCKET = "tengu_quiet_locket";
  UNBOUND_MANAGED_HOLD = Object.freeze({
    held: true,
    settings: Object.freeze({}),
    took: "unbound",
  });
  MANAGED_RESTRICTION_FIELDS = [
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
});
//@ chunk-s61vbvea.js:480695-480982 placement
class HeldOwnerSettings {
  #e;
  #t = new Set();
  noteRefusalsOf(settings) {
    for (let { name: fieldName, paths } of MANAGED_RESTRICTION_FIELDS)
      if (
        paths.some((path) => {
          let found = MANAGED_RESTRICTION_KEYS().find((key) => import_sortedIndex_2(key.path, path));
          return found === undefined || restrictionValue(found, settings) === found.restrictive;
        })
      )
        this.#t.add(fieldName);
  }
  refuses(fieldName) {
    return this.#t.has(fieldName);
  }
  get() {
    return this.#e === undefined ? undefined : clone(this.#e);
  }
  keep(settings) {
    this.#e = clone(settings);
  }
}
//@ chunk-s61vbvea.js:480982-481007 placement
/**
 * 按宿主保存的“持有中”属主设置槽：会话启动时冻结的设置快照与当前用户设置的合并。
 */
var heldOwnerSettingsSlot; // deferred: uses HeldOwnerSettings of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-s61vbvea.js:480982", () => {
  heldOwnerSettingsSlot = new HostScoped(() => new HeldOwnerSettings());
});
//@ chunk-s61vbvea.js:481007-481343 placement
/**
 * 取得冻结中的属主设置：合并会话启动时冻结的设置与当前用户设置。
 */
function getHeldServedOwnerSettings() {
  let reason = servedSettingsUnavailableReason();
  if (!reason.held) return reason;
  try {
    let slot = heldOwnerSettingsSlot.of(getRootSession().host);
    let held = slot.get();
    let tookOk = reason.took === "ok";
    let merged =
      held === undefined
        ? reason.settings
        : mergeCredentialDenyFiles(
            stripCredentialHelperSettings(tightenSettingsWith(held, tookOk ? reason.settings : null) ?? {}),
            reason.settings,
          );
    if (tookOk || held === undefined) slot.keep(merged);
    if (tookOk) slot.noteRefusalsOf(reason.settings);
    return {
      held: true,
      settings: merged,
      took: reason.took,
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
function recordServedUserRulesAtAttach(store) {
  let outcome = holdServedUserSettings(store);
  try {
    switch (outcome) {
      case "recorded":
      case "first_attach":
        logFeatureOk("remote_served_user_rules_at_attach", {
          op: lit("record_held"),
          first_attach: outcome === "first_attach",
        });
        break;
      case "first_attach_unread":
      case "path_not_accepted":
      case "record_unreadable":
      case "failed":
        logFeatureSad("remote_served_user_rules_at_attach", outcome);
        break;
      case "already_held":
      case "not_held":
        break;
    }
  } catch (error) {
    logError(toError(error));
  }
  return outcome;
}
//@ chunk-s61vbvea.js:481721-482642 placement
function holdServedUserSettings(store) {
  try {
    if (
      !readFlagWithOverride(TENGU_QUIET_LOCKET, {
        safe: true,
      }) ||
      !isSettingSourceEnabled("userSettings")
    )
      return "not_held";
    let filePath = getSettingsFilePathForSource("userSettings");
    if (filePath === undefined) return "not_held";
    let slot = heldOwnerSettingsSlot.of(getRootSession().host);
    if (slot.get() !== undefined) return "already_held";
    let accepted = store.file(filePath);
    if (accepted === "unreadable") {
      slot.keep({});
      return "record_unreadable";
    }
    let absent = accepted === "none";
    if (absent && store.file(ownerSettingsMetPath()) !== "none") {
      store.recordFile(filePath, null, "first_attach");
      slot.keep({});
      return "path_not_accepted";
    }
    if (absent) store.recordFile(ownerSettingsMetPath(), null, "first_attach");
    let read = absent ? readRepoTierFileText(filePath) : undefined;
    let text =
      accepted !== "none"
        ? accepted.text
        : read === undefined || read === "absent" || read === "unreadable"
          ? null
          : stripBomAndCarriageReturns(read.text);
    let settings = text === null ? {} : parseSettingsContent(text, filePath).settings;
    if (read === "unreadable" || settings === null) {
      if (absent) store.recordFile(filePath, null, "first_attach");
      slot.keep({});
      return absent ? "first_attach_unread" : "record_unreadable";
    }
    let snapshot = servedRestrictionSnapshot(settings);
    if (absent)
      store.recordFile(filePath, text === null ? null : settingsToJsonText(snapshot), "first_attach");
    slot.noteRefusalsOf(snapshot);
    slot.keep(snapshot);
    try {
      store.noteServed(filePath, [filePath, ownerSettingsMetPath()]);
    } catch (error) {
      logError(toError(error));
    }
    return absent ? "first_attach" : "recorded";
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
    let accepted =
      settingsFilePathForSource === undefined
        ? "none"
        : acceptedSettingsStore.file(settingsFilePathForSource);
    if (settingsFilePathForSource === undefined || accepted === "none") return false;
    let repoTierFileText = readRepoTierFileText(settingsFilePathForSource);
    if (accepted === "unreadable" || repoTierFileText === "unreadable") return true;
    let before = snapshotSettingsText(accepted.text, settingsFilePathForSource);
    let after = snapshotSettingsText(
      repoTierFileText === "absent" ? null : stripBomAndCarriageReturns(repoTierFileText.text),
      settingsFilePathForSource,
    );
    return before === undefined || before !== after;
  } catch (error) {
    logError(toError(error));
    return false;
  }
}
//@ chunk-s61vbvea.js:483010-483097 placement
function snapshotSettingsText(text, parseOptions) {
  let settings = text === null ? {} : parseSettingsContent(text, parseOptions).settings;
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
  let picked = pickRestrictionFields(settings);
  for (let field of MANAGED_RESTRICTION_FIELDS)
    for (let path of field.paths) {
      let found = MANAGED_RESTRICTION_KEYS().find((key) => import_sortedIndex_2(key.path, path));
      if (found !== undefined && restrictionValue(found, settings) === found.restrictive)
        setAtPath(picked, path, getAtPath(settings, path));
    }
  let files = settings.sandbox?.credentials?.files ?? [];
  if (files.length > 0)
    setAtPath(
      picked,
      ["sandbox", "credentials", "files"],
      files.map((file) => ({
        path: file.path,
        mode: "deny",
      })),
    );
  return picked;
}
//@ chunk-s61vbvea.js:483448-483488 placement
/**
 * 导出函数 `settingsToJsonText`：参数 e，返回 `${jsonStringify(e, null, 2)} `。
 */
function settingsToJsonText(settings) {
  return `${jsonStringify(settings, null, 2)}
`;
}
//@ chunk-s61vbvea.js:483488-483578 placement
/**
 * 导出函数 `keepEmptyOwnerSettings`。
 */
function keepEmptyOwnerSettings() {
  try {
    let slot = heldOwnerSettingsSlot.of(getRootSession().host);
    if (slot.get() === undefined) slot.keep({});
  } catch (error) {
    logError(toError(error));
  }
}
//@ chunk-s61vbvea.js:483578-483678 placement
function isServedSettingRefused(fieldName) {
  try {
    return (
      readFlagWithOverride(TENGU_QUIET_LOCKET, {
        safe: true,
      }) && heldOwnerSettingsSlot.of(getRootSession().host).refuses(fieldName)
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
function mergeCredentialDenyFiles(settings, settings_2) {
  let files = settings.sandbox?.credentials?.files ?? [];
  let seenPaths = new Set(files.map((file) => file.path));
  let added = [];
  for (let file of settings_2.sandbox?.credentials?.files ?? [])
    if (!seenPaths.has(file.path)) {
      seenPaths.add(file.path);
      added.push({
        path: file.path,
        mode: "deny",
      });
    }
  return added.length === 0
    ? settings
    : {
        ...settings,
        sandbox: {
          ...settings.sandbox,
          credentials: {
            ...settings.sandbox?.credentials,
            files: [...files, ...added],
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
  let settings = {};
  let took;
  try {
    if (!isSettingSourceEnabled("userSettings"))
      return {
        held: true,
        settings: {},
        took: "source_disabled",
      };
    let settingsFilePathForSource = getSettingsFilePathForSource("userSettings");
    let parsed =
      settingsFilePathForSource === undefined
        ? undefined
        : parseSettingsFileUncached(settingsFilePathForSource);
    if (parsed?.settings === null && parsed.errors.length > 0) took = "unreadable";
    else {
      settings = stripCredentialHelperSettings(parsed?.settings ?? {});
      took = "ok";
    }
  } catch (error) {
    logError(toError(error));
    settings = {};
    took = "failed";
  }
  try {
    switch (took) {
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
    settings,
    took,
  };
}
//@ chunk-s61vbvea.js:484747-484823 placement
function tightenOrStripCredentialHelpers(settings, heldInfo) {
  let tightened = heldInfo.held ? tightenSettingsWith(heldInfo.settings, settings) : settings;
  return tightened === null ? null : stripCredentialHelperSettings(tightened);
}
//@ chunk-s61vbvea.js:484823-485330 placement
/**
 * 远程提供工具时重算 userSettings 的权限规则：保留持有快照中仍存在的 allow，当前 deny/ask 全部保留，再补上快照中有但当前缺失的 deny/ask；返回规则与被搁置的 allow 数、保留的拒绝数。
 */
function reconcileUserSettingsRules(rules, heldInfo, diskSettings) {
  if (!heldInfo.held)
    return {
      rules: rules.slice(),
      allowsSetAside: 0,
      refusalsKept: 0,
    };
  let heldRules = settingsJsonToRules(
    tightenOrStripCredentialHelpers(diskSettings, heldInfo),
    "userSettings",
  );
  let heldAllowKeys = new Set(heldRules.map(hasBashPermission));
  let refusalKeys = new Set();
  let kept = [];
  let allowsSetAside = 0;
  for (let rule of rules) {
    if (rule.source !== "userSettings") {
      kept.push(rule);
      continue;
    }
    switch (rule.ruleBehavior) {
      case "allow":
        if (heldAllowKeys.has(hasBashPermission(rule))) kept.push(rule);
        else allowsSetAside += 1;
        break;
      case "deny":
      case "ask":
        refusalKeys.add(hasBashPermission(rule));
        kept.push(rule);
        break;
    }
  }
  let refusalsKept = 0;
  for (let rule of heldRules) {
    let key = hasBashPermission(rule);
    if (rule.ruleBehavior === "allow" || refusalKeys.has(key)) continue;
    refusalKeys.add(key);
    kept.push(rule);
    refusalsKept += 1;
  }
  return {
    rules: kept,
    allowsSetAside,
    refusalsKept,
  };
}
//@ chunk-s61vbvea.js:485330-485715 placement
/**
 * 在冻结设置时合并用户规则：冻结中返回附加 deny 规则，失败时记录错误并返回原规则。
 */
function applyHeldUserRules(rules, heldInfo, refusalsOnly) {
  if (heldInfo === undefined || !heldInfo.held) return rules;
  try {
    if (refusalsOnly) return [...rules, ...userRefusalRules(heldInfo.settings, ["deny"])];
    return reconcileUserSettingsRules(
      rules,
      heldInfo,
      isSettingSourceEnabled("userSettings") ? getSettingsForSource("userSettings") : null,
    ).rules;
  } catch (error) {
    logError(toError(error));
    let filtered = rules.filter((rule) => rule.source !== "userSettings" || rule.ruleBehavior !== "allow");
    try {
      let denyKeys = new Set(filtered.map(hasBashPermission));
      return [
        ...filtered,
        ...userRefusalRules(heldInfo.settings, ["deny", "ask"]).filter(
          (rule) => !denyKeys.has(hasBashPermission(rule)),
        ),
      ];
    } catch (error) {
      logError(toError(error));
      return filtered;
    }
  }
}
//@ chunk-s61vbvea.js:485715-485826 placement
function userRefusalRules(settings, behaviors) {
  return settingsJsonToRules(settings, "userSettings").filter(
    (rule) => rule.ruleBehavior !== "allow" && behaviors.includes(rule.ruleBehavior),
  );
}
//@ chunk-s61vbvea.js:485826-485889 placement = hasBashPermission (1)
function hasBashPermission(rules) {
  return `${rules.ruleBehavior}\x00${formatPermissionRule(rules.ruleValue)}`;
}
//@ chunk-s61vbvea.js:485889-485992 placement
function stripCredentialHelperSettings(settings) {
  if (!CREDENTIAL_HELPER_SETTINGS_KEYS.some((key) => key in settings)) return settings;
  let copy = {
    ...settings,
  };
  for (let key of CREDENTIAL_HELPER_SETTINGS_KEYS) delete copy[key];
  return copy;
}
//@ chunk-s61vbvea.js:485992-486144 placement
function parseGitVersion(versionText) {
  let match = /^git version (\d+)\.(\d+)\.(\d+)/.exec(versionText.trim());
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
function isVersionAtLeast2_32(version) {
  return version !== null && (version.major > 2 || (version.major === 2 && version.minor >= 32));
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
function hasNonZeroHash(hash) {
  return !ALL_ZERO_RE.test(hash);
}
//@ chunk-s61vbvea.js:486464-486519 placement = ANTHROPIC_VERSION (0.816)
/**
 * 组合的 beta 头值与 anthropic-version "2023-06-01"。
 */
var COMBINED_BETA_HEADER; // deferred: uses BETA_CLAUDE_CODE (../../utils/betas.js) of its import cycle while loading; runs once the cycle is complete
var ANTHROPIC_VERSION_2;
deferInit("chunk-s61vbvea.js:486464", () => {
  COMBINED_BETA_HEADER = `${BETA_FILES_API.header},${BETA_OAUTH_AUTH.header}`;
  ANTHROPIC_VERSION_2 = "2023-06-01";
});
export {
  settingsToJsonText,
  servedRestrictionSnapshot,
  UNBOUND_MANAGED_HOLD,
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
