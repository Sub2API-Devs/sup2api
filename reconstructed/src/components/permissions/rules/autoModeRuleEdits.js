/**
 * components/permissions/rules/autoModeRuleEdits.ts
 *
 * 自动模式规则编辑：来源分类、校验、写入用户设置（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-p2qwpk2k.js (43)
 * attribution: placement 43
 */
import {
  autoModeConfigSchema,
  AUTO_MODE_TRUSTED_SOURCES,
  getSettingsForSource,
  getSettingsForSourceForUpkeep,
  flagAllowBesideManagedAllow,
  getSettingsFilePathForSource,
  parseSettingsFile,
  updateSettingsForSourceWithTransform,
  builtinAllowRulesAreOff,
} from "../../../utils/settings/settings.js";
import { DEFAULTS_PLACEHOLDER } from "../../../utils/permissions/autoModeRulesPrompt.js";
import { withFeatureTelemetry } from "../../../services/analytics/featureTelemetry.js";
import {
  checkAutoModeEntries,
  MAX_RULES_PER_DECISION_KIND,
  describeSettingsWriteFailure,
  stripVariationSelectors,
  MAX_RULE_ENTRY_CHARS,
} from "../../../services/autoModeSetup/applySetup.js";
import { alwaysTrueFlag } from "../../../utils/permissions/serverClassifier/arbiter.js";
import { init_react_production } from "../../../../vendor/react/cjs/react.production.js";
import { replaceLineBreaks, displayField } from "../../../utils/permissions/approvalPayloadSerialization.js";
import { getGraphemeSegmenter } from "../../../utils/intl.js";
import { bunStringWidth } from "../../../ink/stringWidth.js";

//@ chunk-p2qwpk2k.js:35210-35277 placement
function editOutcomeKey(h) {
  return (i) => `${h}_${i instanceof AutoModeRuleWriteError ? i.code : "error"}`;
}
//@ chunk-p2qwpk2k.js:35277-35332 placement
var AUTO_MODE_RULE_SECTIONS = ["allow", "soft_deny", "hard_deny", "environment"];
//@ chunk-p2qwpk2k.js:35332-35708 placement
/**
 * 从可信设置来源读取 autoMode 配置，展开为 {text, section, source, index, structure} 条目列表（跳过默认占位，环境中的 ### 行标为结构）。
 */
function collectAutoModeRuleEntries() {
  let h = autoModeConfigSchema();
  let i = [];
  for (let m of AUTO_MODE_TRUSTED_SOURCES) {
    let settingsForSource = getSettingsForSource(m);
    if (!settingsForSource) continue;
    let f = h.safeParse(settingsForSource.autoMode);
    if (!f.success) continue;
    for (let g of AUTO_MODE_RULE_SECTIONS) {
      let v = f.data[g];
      if (!v) continue;
      v.forEach((x, index) => {
        if (x === DEFAULTS_PLACEHOLDER) return;
        if (g === "environment" && x.startsWith("### ")) {
          i.push({
            text: x,
            section: g,
            source: m,
            index,
            structure: true,
          });
          return;
        }
        i.push({
          text: x,
          section: g,
          source: m,
          index,
        });
      });
    }
  }
  return i;
}
//@ chunk-p2qwpk2k.js:35708-36050 placement
/**
 * 把整份环境文档写回用户设置：加载后若条目已变化则拒绝，解析并校验新条目后写入（带 auto_mode_rule_edit 遥测）。
 */
async function saveEnvironmentDocument(h, i, storageV5) {
  return withFeatureTelemetry(
    "auto_mode_rule_edit",
    () =>
      writeAutoModeRuleEdit(
        "environment",
        (a) => {
          if (a.length !== i.length || a.some((v, x) => v !== i[x]))
            return {
              refuse:
                "The environment changed since this screen loaded \u2014 reopen the tab to see the current entries.",
            };
          let { entries, problem } = parseEnvironmentDocument(
            h.join(`
`),
          );
          if (problem !== null)
            return {
              refuse: problem,
            };
          return entries;
        },
        storageV5,
      ),
    editOutcomeKey("add"),
  );
}
//@ chunk-p2qwpk2k.js:36050-36191 placement
/**
 * 读取用户设置中 autoMode 的 environment 条目，格式不对时返回空数组。
 */
function readUserEnvironmentEntries() {
  let settingsForSourceForUpkeep = getSettingsForSourceForUpkeep("userSettings");
  if (!settingsForSourceForUpkeep) return [];
  let i = autoModeConfigSchema().safeParse(settingsForSourceForUpkeep.autoMode);
  if (!i.success) return [];
  return i.data.environment ?? [];
}
//@ chunk-p2qwpk2k.js:36191-36227 placement
function ruleTextProblem(content) {
  return parseEnvironmentDocument(content).problem;
}
//@ chunk-p2qwpk2k.js:36227-36450 placement
function parseEnvironmentDocument(h) {
  let i = dropEmptySectionHeaders(
    h
      .split(
        `
`,
      )
      .map((line) => normalizeRuleText(line))
      .filter((a) => a.length > 0),
  );
  if (i.length === 0)
    return {
      entries: i,
      problem: null,
    };
  let m = checkAutoModeEntries("environment", i);
  if (m !== null)
    return {
      entries: i,
      problem: m,
    };
  return {
    entries: i,
    problem: null,
  };
}
//@ chunk-p2qwpk2k.js:36450-37643 placement
function classifyAutoModeRuleSource() {
  if (!alwaysTrueFlag()) {
    let f = {
      enabled: true,
      control: "internalTemplate",
    };
    return {
      allow: f,
      soft_deny: f,
      hard_deny: f,
      environment: f,
    };
  }
  let h = autoModeConfigSchema();
  let i = new Set();
  let m = {};
  for (let f of AUTO_MODE_TRUSTED_SOURCES) {
    let settingsForSource = getSettingsForSource(f);
    if (!settingsForSource) continue;
    let v = h.safeParse(settingsForSource.autoMode);
    if (!v.success) continue;
    let x = {};
    for (let C of AUTO_MODE_RULE_SECTIONS) if (v.data[C]?.length) x[C] = v.data[C];
    m[f] = x;
  }
  if (m.flagSettings?.allow)
    m.flagSettings.allow = flagAllowBesideManagedAllow(m.flagSettings.allow, m.policySettings?.allow);
  let a = {};
  for (let f of AUTO_MODE_RULE_SECTIONS) {
    let filtered = AUTO_MODE_TRUSTED_SOURCES.map((c) => ({
      source: c,
      values: m[c]?.[f] ?? [],
    })).filter((c) => c.values.length > 0);
    if (filtered.length === 0) {
      a[f] = {
        enabled: true,
        control: "empty",
      };
      continue;
    }
    if (f === "environment") {
      let found = filtered.find((M) => M.values.includes(DEFAULTS_PLACEHOLDER));
      a[f] = found
        ? {
            enabled: true,
            control: "otherSource",
            source: found.source,
          }
        : {
            enabled: false,
            control: "otherSource",
            source: filtered[0].source,
          };
      continue;
    }
    let v = m.userSettings?.[f] ?? [];
    let found = filtered.find((c) => c.source !== "userSettings" && c.values.includes(DEFAULTS_PLACEHOLDER));
    let C = f === "soft_deny" && i.has("userSettings");
    if (!found && C) {
      a[f] = {
        enabled: true,
        control: "otherSource",
        source: "userSettings",
      };
      continue;
    }
    if (found) {
      a[f] = {
        enabled: true,
        control: "otherSource",
        source: found.source,
      };
      continue;
    }
    if (v.length > 0) {
      a[f] = {
        enabled: v.includes(DEFAULTS_PLACEHOLDER),
        control: "user",
      };
      continue;
    }
    a[f] = {
      enabled: false,
      control: "otherSource",
      source: filtered[0].source,
    };
  }
  return a;
}
//@ chunk-p2qwpk2k.js:37643-38242 placement
async function AUTO_MODE_RULE_EDIT_ERRORS(section, i, storageV5) {
  let a = (() => false)();
  return withFeatureTelemetry(
    "auto_mode_rule_edit",
    () =>
      writeAutoModeRuleEdit(
        section,
        (f) => {
          if (!alwaysTrueFlag())
            return {
              refuse:
                "Built-in rules cannot be disabled on internal-template sessions \u2014 they are always in effect.",
            };
          if (section === "environment")
            return {
              refuse:
                "The environment is a single replaceable document \u2014 write your own version to replace the built-in default, or delete your entries to restore it.",
            };
          let filtered = f.filter((v) => v !== DEFAULTS_PLACEHOLDER);
          if (i) return [DEFAULTS_PLACEHOLDER, ...filtered];
          if (filtered.length === 0 && !a)
            return {
              refuse: "An empty section cannot hold the off state \u2014 add a rule to this section first.",
            };
          return filtered;
        },
        storageV5,
      ),
    editOutcomeKey("toggle"),
  );
}
//@ chunk-p2qwpk2k.js:38242-38371 placement
function dropEmptySectionHeaders(h) {
  return h.filter((i, m) => {
    if (!i.startsWith("### ")) return true;
    let a = h[m + 1];
    return a !== undefined && !a.startsWith("### ");
  });
}
//@ chunk-p2qwpk2k.js:38371-38473 placement
class AutoModeRuleWriteError extends Error {
  code;
  constructor(code, i) {
    super(i);
    this.code = code;
    this.name = "AutoModeRuleWriteError";
  }
}
//@ chunk-p2qwpk2k.js:38473-40052 placement
/**
 * 把自动模式规则修改写入用户设置文件
 */
async function writeAutoModeRuleEdit(h, i, m) {
  let settingsFilePathForSource = getSettingsFilePathForSource("userSettings");
  if (!settingsFilePathForSource)
    throw new AutoModeRuleWriteError(
      "no_user_settings_path",
      "Could not resolve the user settings file path.",
    );
  let { settings, errors } = parseSettingsFile(settingsFilePathForSource);
  if (settings === null && errors.length > 0)
    throw new AutoModeRuleWriteError(
      "settings_file_invalid",
      "the settings file has a validation error or cannot be read, so its auto mode rules are not in effect; fix it (Claude Code names the problem at startup), then try again.",
    );
  let v = false;
  let x = 0;
  let C = null;
  let c = null;
  let { error } = await updateSettingsForSourceWithTransform(
    "userSettings",
    (b) => {
      v = false;
      x = 0;
      C = null;
      c = null;
      let autoMode = b?.autoMode;
      if (Array.isArray(autoMode)) {
        C =
          "the existing autoMode value in the settings file is an array \u2014 fix or remove it, then try again.";
        return null;
      }
      if (autoMode !== undefined && !autoModeConfigSchema().safeParse(autoMode).success) {
        C =
          "the existing autoMode value in the settings file does not match the expected shape \u2014 fix or remove it, then try again.";
        return null;
      }
      let E = autoMode !== null && typeof autoMode === "object" ? autoMode : undefined;
      let D = Array.isArray(E?.[h]) ? E[h].filter((B) => typeof B === "string") : [];
      let k = i(D);
      if (k !== null && !Array.isArray(k)) {
        c = k.refuse;
        return null;
      }
      let V = (B) => B.length - (B.includes(DEFAULTS_PLACEHOLDER) ? 1 : 0);
      if (k !== null && V(k) > MAX_RULES_PER_DECISION_KIND && V(k) > V(D)) {
        x = V(D);
        return null;
      }
      if (k === null) {
        v = true;
        return null;
      }
      let L = {};
      L.autoMode = {
        [h]: k,
      };
      return L;
    },
    undefined,
    m,
  );
  if (C) throw new AutoModeRuleWriteError("settings_file_invalid", C);
  if (c !== null) throw new AutoModeRuleWriteError("invalid_input", c);
  if (x)
    throw new AutoModeRuleWriteError(
      "invalid_input",
      `autoMode.${h} already has ${x} entries; the maximum is ${MAX_RULES_PER_DECISION_KIND}.`,
    );
  if (v)
    throw new AutoModeRuleWriteError(
      "entry_not_found",
      "That rule changed on disk while the dialog was open \u2014 close and reopen /permissions, then try again.",
    );
  if (error) {
    let b = describeSettingsWriteFailure(error, settingsFilePathForSource, "/permissions");
    throw new AutoModeRuleWriteError(b.code, b.message);
  }
}
//@ chunk-p2qwpk2k.js:40052-40080 placement
function normalizeRuleText(h) {
  return stripVariationSelectors(h);
}
//@ chunk-p2qwpk2k.js:40080-40178 placement
function validateRuleText(section, i) {
  try {
    validateAutoModeRuleText(section, normalizeRuleText(i));
    return null;
  } catch (error) {
    return error instanceof AutoModeRuleWriteError ? error.message : String(error);
  }
}
//@ chunk-p2qwpk2k.js:40178-40692 placement
function validateAutoModeRuleText(h, i) {
  if (i === DEFAULTS_PLACEHOLDER)
    throw new AutoModeRuleWriteError(
      "invalid_input",
      `"${DEFAULTS_PLACEHOLDER}" is reserved \u2014 it splices the built-in rules in and cannot be added as a rule.`,
    );
  if (i.length > MAX_RULE_ENTRY_CHARS)
    throw new AutoModeRuleWriteError(
      "invalid_input",
      `the rule is ${i.length} characters; the maximum is ${MAX_RULE_ENTRY_CHARS}.`,
    );
  let lines = i.split(`
`);
  if (h === "environment" && lines.some((line) => line.startsWith("### ")))
    throw new AutoModeRuleWriteError(
      "invalid_input",
      "'### ' lines are environment section headers (structure, not entries) and cannot be written here.",
    );
  let a = checkAutoModeEntries(h, lines);
  if (a) throw new AutoModeRuleWriteError("invalid_input", a);
}
//@ chunk-p2qwpk2k.js:40692-40774 placement
async function addAutoModeRule(section, i, storageV5) {
  return withFeatureTelemetry(
    "auto_mode_rule_edit",
    () => addAutoModeRule_2(section, i, storageV5),
    editOutcomeKey("add"),
  );
}
//@ chunk-p2qwpk2k.js:40774-41054 placement
/**
 * 向用户设置的某分类追加一条 auto 模式规则；分类为空时先插入默认占位以保留内置规则；环境按文档编辑时拒绝。
 */
async function addAutoModeRule_2(h, i, m) {
  let a = normalizeRuleText(i);
  validateAutoModeRuleText(h, a);
  return writeAutoModeRuleEdit(
    h,
    (f) => {
      if (h === "environment" && alwaysTrueFlag())
        return {
          refuse: "The environment is edited as a document \u2014 use Edit environment on the Auto mode tab.",
        };
      return h !== "environment" && f.length === 0 && !(h === "allow" && builtinAllowRulesAreOff())
        ? [DEFAULTS_PLACEHOLDER, a]
        : [...f, a];
    },
    m,
  );
}
//@ chunk-p2qwpk2k.js:41054-41147 placement
async function updateAutoModeRule(section, index, text, a, storageV5) {
  return withFeatureTelemetry(
    "auto_mode_rule_edit",
    () => replaceAutoModeRule(section, index, text, a, storageV5),
    editOutcomeKey("update"),
  );
}
//@ chunk-p2qwpk2k.js:41147-41505 placement
/**
 * 替换指定下标的 auto 模式规则（下标处文本须与预期一致）；默认占位与环境分节标题不可编辑。
 */
async function replaceAutoModeRule(h, i, m, a, f) {
  let g = normalizeRuleText(a);
  validateAutoModeRuleText(h, g);
  return writeAutoModeRuleEdit(
    h,
    (v) => {
      if (m === DEFAULTS_PLACEHOLDER)
        return {
          refuse: `"${DEFAULTS_PLACEHOLDER}" is splice plumbing, not an editable rule.`,
        };
      if (h === "environment" && m.startsWith("### "))
        return {
          refuse:
            "'### ' lines are environment section headers (structure, not entries) and cannot be edited here.",
        };
      if (v[i] !== m) return null;
      let x = [...v];
      x[i] = g;
      return x;
    },
    f,
  );
}
//@ chunk-p2qwpk2k.js:41505-41594 placement
async function deleteAutoModeRule(section, index, text, storageV5) {
  return withFeatureTelemetry(
    "auto_mode_rule_edit",
    () => deleteAutoModeRule_2(section, index, text, storageV5),
    editOutcomeKey("delete"),
  );
}
//@ chunk-p2qwpk2k.js:41594-41975 placement
/**
 * 删除指定下标的 auto 模式规则（下标处文本须一致）；环境删除后清理空分节标题。
 */
async function deleteAutoModeRule_2(h, i, m, a) {
  return writeAutoModeRuleEdit(
    h,
    (f) => {
      if (m === DEFAULTS_PLACEHOLDER)
        return {
          refuse: `"${DEFAULTS_PLACEHOLDER}" is splice plumbing, not a deletable rule.`,
        };
      if (h === "environment" && m.startsWith("### "))
        return {
          refuse:
            "'### ' lines are environment section headers (structure, not entries) and cannot be deleted here.",
        };
      if (f[i] !== m) return null;
      let g = [...f.slice(0, i), ...f.slice(i + 1)];
      return h === "environment" ? dropEmptySectionHeaders(g) : g;
    },
    a,
  );
}
//@ chunk-p2qwpk2k.js:41975-41979 placement
init_react_production();
//@ chunk-p2qwpk2k.js:41979-42029 placement
function isNotEnvironmentSection($i) {
  return $i.section !== "environment";
}
//@ chunk-p2qwpk2k.js:42029-42063 placement
function toRuleKeyPair(Er) {
  return [ruleKey(Er), Er];
}
//@ chunk-p2qwpk2k.js:42063-42094 placement
function ruleText(uo) {
  return uo.text;
}
//@ chunk-p2qwpk2k.js:42094-42133 placement
function normalizedRuleText(an) {
  return replaceLineBreaks(displayField(an).text);
}
//@ chunk-p2qwpk2k.js:42133-42183 placement
function isEnvironmentSection(co) {
  return co.section === "environment";
}
//@ chunk-p2qwpk2k.js:42183-42270 placement
function toDisplayRule(Bo) {
  return {
    tag: Bo.legacy ? "legacy" : getRuleSourceBadge(Bo.source),
    text: replaceLineBreaks(displayField(Bo.text).text),
  };
}
//@ chunk-p2qwpk2k.js:42270-42324 placement
function toDisplayRuleNoTag(Tr) {
  return {
    tag: null,
    text: replaceLineBreaks(displayField(Tr).text),
  };
}
//@ chunk-p2qwpk2k.js:42324-42357 placement
function ruleSource(Bi) {
  return Bi.source;
}
//@ chunk-p2qwpk2k.js:42357-42407 placement = _temp5 (1)
function isUserSettingsRule(a_0) {
  return a_0.source === "userSettings";
}
//@ chunk-p2qwpk2k.js:42407-42457 placement = _temp5 (1)
function isNonUserSettingsRule(a_0) {
  return a_0.source !== "userSettings";
}
//@ chunk-p2qwpk2k.js:42729-42795 placement
function padSectionLabel(_i) {
  return _i ? ` \xB7 ${_i}`.padEnd(RULE_LABEL_WIDTH) : " ".repeat(RULE_LABEL_WIDTH);
}
//@ chunk-p2qwpk2k.js:42795-42828 placement
function ruleKeyValuePair(Pr, Vi) {
  return [Pr, Vi];
}
//@ chunk-p2qwpk2k.js:42962-43125 placement
function getAutoModeRuleCategoryLabel(section) {
  switch (section) {
    case "allow":
      return "Soft allow";
    case "soft_deny":
      return "Soft deny";
    case "hard_deny":
      return "Hard deny";
    case "environment":
      return "Environment";
  }
}
//@ chunk-p2qwpk2k.js:43125-43266 placement
/**
 * 返回自动模式规则分区的颜色：allow 绿、soft_deny 黄、hard_deny 红等。
 */
function getAutoModeSectionColor(section) {
  switch (section) {
    case "allow":
      return "success";
    case "soft_deny":
      return "warning";
    case "hard_deny":
      return "error";
    case "environment":
      return;
  }
}
//@ chunk-p2qwpk2k.js:43266-43426 placement
/**
 * 把规则来源（用户设置、--settings、托管设置）转换为显示文本。
 */
function describeRuleSource(source) {
  switch (source) {
    case "userSettings":
      return "user settings";
    case "flagSettings":
      return "the --settings flag";
    case "policySettings":
      return "managed settings";
  }
}
//@ chunk-p2qwpk2k.js:43426-43608 placement
/**
 * 按分区顺序、再按来源（用户、flag、托管）顺序排列规则条目。
 */
function sortRuleEntries(h) {
  let i = ["userSettings", "flagSettings", "policySettings"];
  return AUTO_MODE_RULE_SECTIONS.flatMap((m) => {
    let filtered = h.filter((f) => f.section === m);
    return i.flatMap((f) => filtered.filter((g) => g.source === f));
  });
}
//@ chunk-p2qwpk2k.js:43608-43691 placement
function ruleKey(h) {
  return `${h.section}:${h.source}:${h.legacy ? "legacy-" : ""}${h.index}`;
}
//@ chunk-p2qwpk2k.js:43691-43813 placement
function getRuleSourceBadge(source) {
  switch (source) {
    case "userSettings":
      return null;
    case "flagSettings":
      return "flag";
    case "policySettings":
      return "org";
  }
}
//@ chunk-p2qwpk2k.js:43813-43823 placement
var RULE_LABEL_WIDTH = 20;
//@ chunk-p2qwpk2k.js:43823-43991 placement
function splitByWidth(h, i) {
  let m = [];
  let a = "";
  let f = 0;
  for (let { segment } of getGraphemeSegmenter().segment(h)) {
    let v = bunStringWidth(segment);
    if (f + v > i && a.length > 0) {
      m.push(a);
      a = "";
      f = 0;
    }
    a += segment;
    f += v;
  }
  if (a.length > 0) m.push(a);
  return m;
}
//@ chunk-p2qwpk2k.js:43991-44000 placement
var MAX_RULE_ROWS = 5;
export {
  getAutoModeRuleCategoryLabel,
  getRuleSourceBadge,
  getAutoModeSectionColor,
  RULE_LABEL_WIDTH,
  AUTO_MODE_RULE_SECTIONS,
  splitByWidth,
  isNotEnvironmentSection,
  toRuleKeyPair,
  sortRuleEntries,
  ruleText,
  normalizedRuleText,
  isEnvironmentSection,
  toDisplayRule,
  toDisplayRuleNoTag,
  ruleSource,
  describeRuleSource,
  isUserSettingsRule,
  isNonUserSettingsRule,
  ruleKey,
  padSectionLabel,
  MAX_RULE_ROWS,
  ruleKeyValuePair,
  validateRuleText,
  classifyAutoModeRuleSource,
  collectAutoModeRuleEntries,
  ruleTextProblem,
  saveEnvironmentDocument,
  readUserEnvironmentEntries,
  normalizeRuleText,
  updateAutoModeRule,
  addAutoModeRule,
  AUTO_MODE_RULE_EDIT_ERRORS,
  deleteAutoModeRule,
};
