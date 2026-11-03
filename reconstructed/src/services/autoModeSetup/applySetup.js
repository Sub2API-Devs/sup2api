/**
 * services/autoModeSetup/applySetup.ts
 *
 * /auto-mode-setup 写入设置（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-2a8yx6fc.js (15)
 * attribution: placement 15
 */
import {
  MAX_SETTINGS_JSON_BYTES,
  autoModeConfigSchema,
  getSettingsFilePathForSource,
  updateSettingsForSourceWithTransform,
  builtinAllowRulesAreOff,
} from "../../utils/settings/settings.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../analytics/featureTelemetry.js";
import {
  DEFAULTS_PLACEHOLDER,
  hasControlChars,
  hasInvisibleRuleChars,
  findTemplateInjection,
} from "../../utils/permissions/autoModeRulesPrompt.js";
import { ghIsDangerousCallback } from "./pregather.js";
import { logForDebugging } from "../../utils/debug.js";
import { jsonStringify } from "../../utils/slowOperations.js";

//@ chunk-2a8yx6fc.js:55219-55301 placement
/**
 * autoMode.environment 的最大字节数（50000）。
 */
var AUTO_MODE_DECISION_KINDS = ["allow", "soft_deny", "hard_deny"];
var MAX_RULES_PER_DECISION_KIND = 200;
var MAX_RULE_ENTRY_CHARS = 1e4;
var MAX_PERMISSIONS_JSON_BYTES = MAX_SETTINGS_JSON_BYTES / 4;
var MAX_ENVIRONMENT_ENTRIES = 200;
var MAX_ENVIRONMENT_BYTES = 50000;
//@ chunk-2a8yx6fc.js:55301-55405 placement
class AutoModeSetupWriteError extends Error {
  code;
  constructor(code, n) {
    super(n);
    this.name = "AutoModeSetupWriteError";
    this.code = code;
  }
}
//@ chunk-2a8yx6fc.js:55405-55658 placement
/**
 * 写入自动模式设置并记录特性状态：失败按错误码记录，跳过 permissions.allow 时记为 sad。
 */
async function applyAutoModeSettings(e, storageV5) {
  let r;
  try {
    r = await writeAutoModeSettings(e, storageV5);
  } catch (error) {
    logFeatureBad("auto_mode_setup_write", error instanceof AutoModeSetupWriteError ? error.code : "unknown");
    throw error;
  }
  if (r.permissionsAllowSkipped) logFeatureSad("auto_mode_setup_write", "permissions_allow_skipped");
  else logFeatureOk("auto_mode_setup_write");
  return r;
}
//@ chunk-2a8yx6fc.js:55658-56972 placement
function validateAutoModeBlock(e) {
  let { autoMode } = e;
  if (autoMode === undefined && (e.removeFromPermissionsAllow ?? []).length === 0) return "Nothing to save.";
  if (autoMode !== undefined) {
    let o = autoModeConfigSchema().safeParse(autoMode);
    if (!o.success) return `autoMode block failed validation: ${formatZodIssues(o.error)}`;
    if (!autoMode.environment || autoMode.environment.length === 0)
      return "autoMode.environment is empty \u2014 nothing to save.";
    let s = checkAutoModeEntries("environment", autoMode.environment);
    if (s) return s;
    if (autoMode.environment.some((l) => stripVariationSelectors(l) === DEFAULTS_PLACEHOLDER))
      return `autoMode.environment must not contain "${DEFAULTS_PLACEHOLDER}" \u2014 skipped slots get their shipped default text written verbatim instead.`;
    for (let l of AUTO_MODE_DECISION_KINDS) {
      let a = autoMode[l];
      if (a === undefined) continue;
      if (a.length === 0)
        return `autoMode.${l} is empty \u2014 omit the key when nothing was accepted for it.`;
      let d = checkAutoModeEntries(l, a);
      if (d) return d;
      if (!a.includes(DEFAULTS_PLACEHOLDER))
        return `autoMode.${l} is missing the literal entry "${DEFAULTS_PLACEHOLDER}" \u2014 without it the array replaces the shipped rules instead of extending them.`;
    }
  }
  let removeFromPermissionsAllow = e.removeFromPermissionsAllow;
  if (removeFromPermissionsAllow !== undefined) {
    if (!Array.isArray(removeFromPermissionsAllow))
      return "removeFromPermissionsAllow must be an array of rule strings.";
    if (removeFromPermissionsAllow.length > MAX_RULES_PER_DECISION_KIND)
      return `removeFromPermissionsAllow has ${removeFromPermissionsAllow.length} entries; the maximum is ${MAX_RULES_PER_DECISION_KIND}.`;
    for (let [o, s] of removeFromPermissionsAllow.entries())
      if (typeof s !== "string" || !ghIsDangerousCallback(s))
        return `removeFromPermissionsAllow[${o}] is not a rule string the removal offer could have produced.`;
  }
  return null;
}
//@ chunk-2a8yx6fc.js:56972-59238 placement
/**
 * 把自动模式设置写入用户设置文件（校验、解析失败时报错）
 */
async function writeAutoModeSettings(e, n) {
  let r = validateAutoModeBlock(e);
  if (r) throw new AutoModeSetupWriteError("invalid_input", r);
  let settingsFilePathForSource = getSettingsFilePathForSource("userSettings");
  if (!settingsFilePathForSource)
    throw new AutoModeSetupWriteError(
      "no_user_settings_path",
      "Could not resolve the user settings file path.",
    );
  let s = e.autoMode !== undefined ? normalizeAutoModeBlock(e.autoMode) : undefined;
  let mode = e.mode ?? "append";
  let removeFromPermissionsAllow = e.removeFromPermissionsAllow ?? [];
  let d = [];
  let permissionsAllowNotFound = [];
  let permissionsAllowSkipped = false;
  let environmentEntriesPreserved = 0;
  let u = null;
  let w = [];
  let { error } = await updateSettingsForSourceWithTransform(
    "userSettings",
    (S) => {
      let A = {};
      if (s !== undefined) {
        let autoMode = S?.autoMode;
        if (Array.isArray(autoMode)) {
          u =
            "the existing autoMode value in the settings file is an array \u2014 remove or fix it, then re-run setup.";
          return null;
        }
        let x = autoMode !== null && typeof autoMode === "object" ? autoMode : undefined;
        let C;
        if (mode === "append") {
          let existing = toStringList(x?.environment);
          environmentEntriesPreserved = existing.length;
          C = {
            environment: mergeEnvironmentEntries(existing, s.environment),
          };
        } else
          C = {
            environment: s.environment,
          };
        for (let N of AUTO_MODE_DECISION_KINDS) {
          let Ne = s[N];
          if (Ne === undefined) continue;
          C[N] = mergeRuleEntries(N, toStringList(x?.[N]), Ne);
        }
        let q = {
          ...x,
          ...C,
        };
        let Y = autoModeConfigSchema().safeParse(q);
        if (!Y.success) {
          u = `merging with the existing autoMode block in the settings file would produce an invalid result: ${formatZodIssues(Y.error)}`;
          return null;
        }
        let oe = Buffer.byteLength(JSON.stringify(C.environment), "utf8");
        if (C.environment.length > MAX_ENVIRONMENT_ENTRIES || oe > MAX_ENVIRONMENT_BYTES) {
          let N = `autoMode.environment now has ${C.environment.length} entries (~${Math.round(oe / 1024)} KB). It\u2019s spliced into the classifier prompt on every auto-mode decision \u2014 consider pruning stale entries.`;
          w.push(N);
          logForDebugging(`auto-mode setup: ${N}`, {
            level: "warn",
          });
        }
        let Z = Buffer.byteLength(jsonStringify(q));
        if (Z > MAX_PERMISSIONS_JSON_BYTES)
          w.push(
            `The autoMode settings section is ${Math.round(Z / 1024)}KB serialized \u2014 the whole settings file stops loading past ${Math.round(MAX_SETTINGS_JSON_BYTES / 1048576)}MiB. Consider trimming rules or environment entries.`,
          );
        A.autoMode = C;
      }
      let T = () => (Object.keys(A).length > 0 ? A : null);
      if (removeFromPermissionsAllow.length === 0) return T();
      let allow = S?.permissions?.allow;
      if (!Array.isArray(allow)) {
        permissionsAllowSkipped = true;
        return T();
      }
      let j = new Set(removeFromPermissionsAllow);
      let allow_2 = allow.filter((R) => !j.has(R));
      d = allow.filter((R) => j.has(R));
      let L = new Set(allow);
      permissionsAllowNotFound = removeFromPermissionsAllow.filter((R) => !L.has(R));
      if (d.length === 0) return T();
      A.permissions = {
        allow: allow_2,
      };
      return A;
    },
    undefined,
    n,
  );
  if (u) throw new AutoModeSetupWriteError("invalid_merged", u);
  if (error) {
    logForDebugging(`auto-mode setup write failed: ${error.message}`, {
      level: "error",
    });
    let S = describeSettingsWriteFailure(error, settingsFilePathForSource, "setup");
    throw new AutoModeSetupWriteError(S.code, S.message);
  }
  return {
    filePath: settingsFilePathForSource,
    autoModeKeysWritten: s !== undefined ? Object.keys(s) : [],
    environmentEntriesPreserved,
    permissionsAllowRemoved: d,
    permissionsAllowNotFound,
    permissionsAllowSkipped,
    warnings: w,
  };
}
//@ chunk-2a8yx6fc.js:59238-59355 placement
/**
 * 设置文件 JSON 无效时的提示：修复或删除后重新运行命令。
 */
function invalidSettingsJsonMessage(e, n) {
  return `The settings file at ${e} contains invalid JSON \u2014 fix or remove it, then re-run ${n}.`;
}
//@ chunk-2a8yx6fc.js:59355-59623 placement
/**
 * 把设置写入失败转换为错误码与提示：JSON 语法错误或一般写入失败（检查权限与磁盘空间）。
 */
function describeSettingsWriteFailure(error, settingsFilePathForSource, r) {
  if (error.message.includes("Invalid JSON syntax"))
    return {
      code: "settings_file_invalid",
      message: invalidSettingsJsonMessage(settingsFilePathForSource, r),
    };
  return {
    code: "write_failed",
    message: `Could not write ${settingsFilePathForSource} \u2014 check file permissions and disk space (run with --debug for the underlying error).`,
  };
}
//@ chunk-2a8yx6fc.js:59623-59723 placement
function formatZodIssues(error) {
  return error.issues.map((issue) => `${issue.path.map(String).join(".")}: ${issue.message}`).join("; ");
}
//@ chunk-2a8yx6fc.js:59723-59800 placement
/**
 * 把值规范成字符串数组：非数组给空数组，并过滤掉非字符串项。
 */
function toStringList(environment) {
  return Array.isArray(environment) ? environment.filter((n) => typeof n === "string") : [];
}
//@ chunk-2a8yx6fc.js:59800-60382 placement
/**
 * 把新的环境说明条目合并到已有 autoMode.environment：按 "### " 小节分组，相同小节内已存在的条目跳过，新条目插到对应小节末尾，新小节追加到最后，空的新小节会被删除。
 */
function mergeEnvironmentEntries(existing, incoming) {
  let r = (w) => w.startsWith("### ");
  let merged = [...existing];
  let s = (currentSection, E) => `${currentSection}\x00${stripVariationSelectors(E)}`;
  let seenInSection = new Set();
  let seenAnywhere = new Set();
  {
    let w = "";
    for (let E of existing)
      if (r(E)) w = stripVariationSelectors(E);
      else {
        seenInSection.add(s(w, E));
        seenAnywhere.add(stripVariationSelectors(E));
      }
  }
  let insertAt = merged.length;
  let currentSection = "";
  let newSectionIndex = -1;
  let y = false;
  let u = () => {
    if (newSectionIndex !== -1 && !y) {
      merged.splice(newSectionIndex, 1);
      if (insertAt > newSectionIndex) insertAt--;
    }
    newSectionIndex = -1;
    y = false;
  };
  for (let w of incoming) {
    if (r(w)) {
      u();
      currentSection = stripVariationSelectors(w);
      let index = merged.findIndex((A) => stripVariationSelectors(A) === currentSection);
      if (index === -1) {
        merged.push(w);
        newSectionIndex = merged.length - 1;
        insertAt = merged.length;
      } else {
        let A = index + 1;
        while (A < merged.length && !r(merged[A])) A++;
        insertAt = A;
      }
      continue;
    }
    let E = stripVariationSelectors(w);
    if (
      seenInSection.has(s(currentSection, w)) ||
      seenInSection.has(s("", w)) ||
      (currentSection === "" && seenAnywhere.has(E))
    )
      continue;
    merged.splice(insertAt++, 0, w);
    seenInSection.add(s(currentSection, w));
    seenAnywhere.add(E);
    if (newSectionIndex !== -1) y = true;
  }
  u();
  return merged;
}
//@ chunk-2a8yx6fc.js:60382-60593 placement
function mergeRuleEntries(e, stringList, r) {
  let o =
    e !== "allow" ||
    (stringList.length === 0
      ? !builtinAllowRulesAreOff()
      : stringList.some((a) => stripVariationSelectors(a) === DEFAULTS_PLACEHOLDER));
  let s = new Set();
  let l = [];
  for (let a of [DEFAULTS_PLACEHOLDER, ...stringList, ...r]) {
    let d = stripVariationSelectors(a);
    if (d === DEFAULTS_PLACEHOLDER && !o) continue;
    if (s.has(d)) continue;
    s.add(d);
    l.push(a);
  }
  return l;
}
//@ chunk-2a8yx6fc.js:60593-60717 placement
function normalizeAutoModeBlock(autoMode) {
  let n = {
    environment: autoMode.environment.map(stripVariationSelectors),
  };
  for (let r of AUTO_MODE_DECISION_KINDS) {
    let o = autoMode[r];
    if (o !== undefined) n[r] = o.map(stripVariationSelectors);
  }
  return n;
}
//@ chunk-2a8yx6fc.js:60717-61555 placement
function checkAutoModeEntries(e, n) {
  if (n.length > MAX_RULES_PER_DECISION_KIND)
    return `${e} has ${n.length} entries; the maximum is ${MAX_RULES_PER_DECISION_KIND}.`;
  for (let r of n) {
    let o = stripVariationSelectors(r);
    if (o.trim() === "") return `${e} contains an empty entry.`;
    if (o.length > MAX_RULE_ENTRY_CHARS)
      return `${e} contains an entry of ${o.length} characters; the maximum is ${MAX_RULE_ENTRY_CHARS}.`;
    if (hasControlChars(o))
      return `${e} contains an entry with a control character; entries must be single-line text.`;
    if (hasInvisibleRuleChars(o))
      return `${e} contains an entry with an invisible or bidirectional character; entries must be plainly renderable text.`;
    switch (findTemplateInjection(o)) {
      case "template_token":
        return `${e} contains an entry with a literal "<settings_" template token; entries must not contain classifier template tokens.`;
      case "region_tag":
        return `${e} contains an entry with a literal "cc_automode" region tag; entries must not contain classifier region markers.`;
      case null:
        break;
    }
  }
  return null;
}
//@ chunk-2a8yx6fc.js:61555-61601 placement
/**
 * 匹配变体选择符（VS1–VS16 与 VS17–VS256）的正则。
 */
var VARIATION_SELECTOR_RE = /[\uFE00-\uFE0F\u{E0100}-\u{E01EF}]/gu;
//@ chunk-2a8yx6fc.js:61601-61640 placement
/**
 * 去掉字符串中的变体选择符，用于规则条目比较。
 */
function stripVariationSelectors(e) {
  return e.replace(VARIATION_SELECTOR_RE, "");
}
export {
  invalidSettingsJsonMessage,
  describeSettingsWriteFailure,
  applyAutoModeSettings,
  AutoModeSetupWriteError,
  checkAutoModeEntries,
  MAX_RULES_PER_DECISION_KIND,
  stripVariationSelectors,
  MAX_RULE_ENTRY_CHARS,
  validateAutoModeBlock,
  AUTO_MODE_DECISION_KINDS,
};
