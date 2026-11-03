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
  pHe,
  describeSettingsWriteFailure,
  I5,
  Zyt,
} from "../../../services/autoModeSetup/applySetup.js";
import { yse } from "../../../utils/permissions/serverClassifier/arbiter.js";
import { j } from "../../../../vendor/react/cjs/react.production.js";
import { replaceLineBreaks, displayField } from "../../../utils/permissions/approvalPayloadSerialization.js";
import { getGraphemeSegmenter } from "../../../utils/intl.js";
import { bunStringWidth } from "../../../ink/stringWidth.js";

//@ chunk-p2qwpk2k.js:35210-35277 placement
function Ko(h) {
  return (i) => `${h}_${i instanceof AutoModeRuleWriteError ? i.code : "error"}`;
}
//@ chunk-p2qwpk2k.js:35277-35332 placement
var Ye = ["allow", "soft_deny", "hard_deny", "environment"];
/**
 * 从可信设置来源读取 autoMode 配置，展开为 {text, section, source, index, structure} 条目列表（跳过默认占位，环境中的 ### 行标为结构）。
 */
//@ chunk-p2qwpk2k.js:35332-35708 placement
function collectAutoModeRuleEntries() {
  let h = autoModeConfigSchema(),
    i = [];
  for (let m of AUTO_MODE_TRUSTED_SOURCES) {
    let a = getSettingsForSource(m);
    if (!a) continue;
    let safeParse = h.safeParse(a.autoMode);
    if (!safeParse.success) continue;
    for (let g of Ye) {
      let v = safeParse.data[g];
      if (!v) continue;
      v.forEach((x, C) => {
        if (x === DEFAULTS_PLACEHOLDER) return;
        if (g === "environment" && x.startsWith("### ")) {
          i.push({ text: x, section: g, source: m, index: C, structure: !0 });
          return;
        }
        i.push({ text: x, section: g, source: m, index: C });
      });
    }
  }
  return i;
}
/**
 * 把整份环境文档写回用户设置：加载后若条目已变化则拒绝，解析并校验新条目后写入（带 auto_mode_rule_edit 遥测）。
 */
//@ chunk-p2qwpk2k.js:35708-36050 placement
async function saveEnvironmentDocument(h, i, m) {
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
          let { entries: entries, problem: problem } = parseEnvironmentDocument(
            h.join(`
`),
          );
          if (problem !== null) return { refuse: problem };
          return entries;
        },
        m,
      ),
    Ko("add"),
  );
}
/**
 * 读取用户设置中 autoMode 的 environment 条目，格式不对时返回空数组。
 */
//@ chunk-p2qwpk2k.js:36050-36191 placement
function readUserEnvironmentEntries() {
  let h = getSettingsForSourceForUpkeep("userSettings");
  if (!h) return [];
  let safeParse = autoModeConfigSchema().safeParse(h.autoMode);
  if (!safeParse.success) return [];
  return safeParse.data.environment ?? [];
}
//@ chunk-p2qwpk2k.js:36191-36227 placement
function us(h) {
  return parseEnvironmentDocument(h).problem;
}
//@ chunk-p2qwpk2k.js:36227-36450 placement
function parseEnvironmentDocument(h) {
  let i = dropEmptySectionHeaders(
    h
      .split(
        `
`,
      )
      .map((a) => Xt(a))
      .filter((a) => a.length > 0),
  );
  if (i.length === 0) return { entries: i, problem: null };
  let m = checkAutoModeEntries("environment", i);
  if (m !== null) return { entries: i, problem: m };
  return { entries: i, problem: null };
}
//@ chunk-p2qwpk2k.js:36450-37643 placement
function classifyAutoModeRuleSource() {
  if (!yse()) {
    let f = { enabled: !0, control: "internalTemplate" };
    return { allow: f, soft_deny: f, hard_deny: f, environment: f };
  }
  let h = autoModeConfigSchema(),
    i = new Set(),
    m = {};
  for (let f of AUTO_MODE_TRUSTED_SOURCES) {
    let g = getSettingsForSource(f);
    if (!g) continue;
    let safeParse = h.safeParse(g.autoMode);
    if (!safeParse.success) continue;
    let x = {};
    for (let C of Ye) if (safeParse.data[C]?.length) x[C] = safeParse.data[C];
    m[f] = x;
  }
  if (m.flagSettings?.allow)
    m.flagSettings.allow = flagAllowBesideManagedAllow(m.flagSettings.allow, m.policySettings?.allow);
  let a = {};
  for (let f of Ye) {
    let filtered = AUTO_MODE_TRUSTED_SOURCES.map((c) => ({ source: c, values: m[c]?.[f] ?? [] })).filter(
      (c) => c.values.length > 0,
    );
    if (filtered.length === 0) {
      a[f] = { enabled: !0, control: "empty" };
      continue;
    }
    if (f === "environment") {
      let found = filtered.find((M) => M.values.includes(DEFAULTS_PLACEHOLDER));
      a[f] = found
        ? { enabled: !0, control: "otherSource", source: found.source }
        : { enabled: !1, control: "otherSource", source: filtered[0].source };
      continue;
    }
    let v = m.userSettings?.[f] ?? [],
      found = filtered.find((c) => c.source !== "userSettings" && c.values.includes(DEFAULTS_PLACEHOLDER)),
      C = f === "soft_deny" && i.has("userSettings");
    if (!found && C) {
      a[f] = { enabled: !0, control: "otherSource", source: "userSettings" };
      continue;
    }
    if (found) {
      a[f] = { enabled: !0, control: "otherSource", source: found.source };
      continue;
    }
    if (v.length > 0) {
      a[f] = { enabled: v.includes(DEFAULTS_PLACEHOLDER), control: "user" };
      continue;
    }
    a[f] = { enabled: !1, control: "otherSource", source: filtered[0].source };
  }
  return a;
}
//@ chunk-p2qwpk2k.js:37643-38242 placement
async function AUTO_MODE_RULE_EDIT_ERRORS(h, i, m) {
  let a = (() => !1)();
  return withFeatureTelemetry(
    "auto_mode_rule_edit",
    () =>
      writeAutoModeRuleEdit(
        h,
        (f) => {
          if (!yse())
            return {
              refuse:
                "Built-in rules cannot be disabled on internal-template sessions \u2014 they are always in effect.",
            };
          if (h === "environment")
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
        m,
      ),
    Ko("toggle"),
  );
}
//@ chunk-p2qwpk2k.js:38242-38371 placement
function dropEmptySectionHeaders(h) {
  return h.filter((i, m) => {
    if (!i.startsWith("### ")) return !0;
    let a = h[m + 1];
    return a !== void 0 && !a.startsWith("### ");
  });
}
//@ chunk-p2qwpk2k.js:38371-38473 placement
class AutoModeRuleWriteError extends Error {
  code;
  constructor(h, i) {
    super(i);
    this.code = h;
    this.name = "AutoModeRuleWriteError";
  }
}
/**
 * 把自动模式规则修改写入用户设置文件
 */
//@ chunk-p2qwpk2k.js:38473-40052 placement
async function writeAutoModeRuleEdit(h, i, m) {
  let a = getSettingsFilePathForSource("userSettings");
  if (!a)
    throw new AutoModeRuleWriteError(
      "no_user_settings_path",
      "Could not resolve the user settings file path.",
    );
  let { settings: settings, errors: errors } = parseSettingsFile(a);
  if (settings === null && errors.length > 0)
    throw new AutoModeRuleWriteError(
      "settings_file_invalid",
      "the settings file has a validation error or cannot be read, so its auto mode rules are not in effect; fix it (Claude Code names the problem at startup), then try again.",
    );
  let v = !1,
    x = 0,
    C = null,
    c = null,
    { error: error } = await updateSettingsForSourceWithTransform(
      "userSettings",
      (b) => {
        ((v = !1), (x = 0), (C = null), (c = null));
        let T = b?.autoMode;
        if (Array.isArray(T))
          return (
            (C =
              "the existing autoMode value in the settings file is an array \u2014 fix or remove it, then try again."),
            null
          );
        if (T !== void 0 && !autoModeConfigSchema().safeParse(T).success)
          return (
            (C =
              "the existing autoMode value in the settings file does not match the expected shape \u2014 fix or remove it, then try again."),
            null
          );
        let E = T !== null && typeof T === "object" ? T : void 0,
          D = Array.isArray(E?.[h]) ? E[h].filter((B) => typeof B === "string") : [],
          k = i(D);
        if (k !== null && !Array.isArray(k)) return ((c = k.refuse), null);
        let V = (B) => B.length - (B.includes(DEFAULTS_PLACEHOLDER) ? 1 : 0);
        if (k !== null && V(k) > pHe && V(k) > V(D)) return ((x = V(D)), null);
        if (k === null) return ((v = !0), null);
        let L = {};
        return ((L.autoMode = { [h]: k }), L);
      },
      void 0,
      m,
    );
  if (C) throw new AutoModeRuleWriteError("settings_file_invalid", C);
  if (c !== null) throw new AutoModeRuleWriteError("invalid_input", c);
  if (x)
    throw new AutoModeRuleWriteError(
      "invalid_input",
      `autoMode.${h} already has ${x} entries; the maximum is ${pHe}.`,
    );
  if (v)
    throw new AutoModeRuleWriteError(
      "entry_not_found",
      "That rule changed on disk while the dialog was open \u2014 close and reopen /permissions, then try again.",
    );
  if (error) {
    let b = describeSettingsWriteFailure(error, a, "/permissions");
    throw new AutoModeRuleWriteError(b.code, b.message);
  }
}
//@ chunk-p2qwpk2k.js:40052-40080 placement
function Xt(h) {
  return I5(h);
}
//@ chunk-p2qwpk2k.js:40080-40178 placement
function bo(h, i) {
  try {
    return (validateAutoModeRuleText(h, Xt(i)), null);
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
  if (i.length > Zyt)
    throw new AutoModeRuleWriteError(
      "invalid_input",
      `the rule is ${i.length} characters; the maximum is ${Zyt}.`,
    );
  let parts = i.split(`
`);
  if (h === "environment" && parts.some((f) => f.startsWith("### ")))
    throw new AutoModeRuleWriteError(
      "invalid_input",
      "'### ' lines are environment section headers (structure, not entries) and cannot be written here.",
    );
  let a = checkAutoModeEntries(h, parts);
  if (a) throw new AutoModeRuleWriteError("invalid_input", a);
}
//@ chunk-p2qwpk2k.js:40692-40774 placement
async function ps(h, i, m) {
  return withFeatureTelemetry("auto_mode_rule_edit", () => addAutoModeRule(h, i, m), Ko("add"));
}
/**
 * 向用户设置的某分类追加一条 auto 模式规则；分类为空时先插入默认占位以保留内置规则；环境按文档编辑时拒绝。
 */
//@ chunk-p2qwpk2k.js:40774-41054 placement
async function addAutoModeRule(h, i, m) {
  let a = Xt(i);
  return (
    validateAutoModeRuleText(h, a),
    writeAutoModeRuleEdit(
      h,
      (f) => {
        if (h === "environment" && yse())
          return {
            refuse:
              "The environment is edited as a document \u2014 use Edit environment on the Auto mode tab.",
          };
        return h !== "environment" && f.length === 0 && !(h === "allow" && builtinAllowRulesAreOff())
          ? [DEFAULTS_PLACEHOLDER, a]
          : [...f, a];
      },
      m,
    )
  );
}
//@ chunk-p2qwpk2k.js:41054-41147 placement
async function fs(h, i, m, a, f) {
  return withFeatureTelemetry("auto_mode_rule_edit", () => replaceAutoModeRule(h, i, m, a, f), Ko("update"));
}
/**
 * 替换指定下标的 auto 模式规则（下标处文本须与预期一致）；默认占位与环境分节标题不可编辑。
 */
//@ chunk-p2qwpk2k.js:41147-41505 placement
async function replaceAutoModeRule(h, i, m, a, f) {
  let g = Xt(a);
  return (
    validateAutoModeRuleText(h, g),
    writeAutoModeRuleEdit(
      h,
      (v) => {
        if (m === DEFAULTS_PLACEHOLDER)
          return { refuse: `"${DEFAULTS_PLACEHOLDER}" is splice plumbing, not an editable rule.` };
        if (h === "environment" && m.startsWith("### "))
          return {
            refuse:
              "'### ' lines are environment section headers (structure, not entries) and cannot be edited here.",
          };
        if (v[i] !== m) return null;
        let x = [...v];
        return ((x[i] = g), x);
      },
      f,
    )
  );
}
//@ chunk-p2qwpk2k.js:41505-41594 placement
async function hs(h, i, m, a) {
  return withFeatureTelemetry("auto_mode_rule_edit", () => deleteAutoModeRule(h, i, m, a), Ko("delete"));
}
/**
 * 删除指定下标的 auto 模式规则（下标处文本须一致）；环境删除后清理空分节标题。
 */
//@ chunk-p2qwpk2k.js:41594-41975 placement
async function deleteAutoModeRule(h, i, m, a) {
  return writeAutoModeRuleEdit(
    h,
    (f) => {
      if (m === DEFAULTS_PLACEHOLDER)
        return { refuse: `"${DEFAULTS_PLACEHOLDER}" is splice plumbing, not a deletable rule.` };
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
j();
//@ chunk-p2qwpk2k.js:41979-42029 placement
function vm($i) {
  return $i.section !== "environment";
}
//@ chunk-p2qwpk2k.js:42029-42063 placement
function bm(Er) {
  return [Mt(Er), Er];
}
//@ chunk-p2qwpk2k.js:42063-42094 placement
function Cm(uo) {
  return uo.text;
}
//@ chunk-p2qwpk2k.js:42094-42133 placement
function wm(an) {
  return replaceLineBreaks(displayField(an).text);
}
//@ chunk-p2qwpk2k.js:42133-42183 placement
function Rm(co) {
  return co.section === "environment";
}
//@ chunk-p2qwpk2k.js:42183-42270 placement
function Sm(Bo) {
  return {
    tag: Bo.legacy ? "legacy" : getRuleSourceBadge(Bo.source),
    text: replaceLineBreaks(displayField(Bo.text).text),
  };
}
//@ chunk-p2qwpk2k.js:42270-42324 placement
function xm(Tr) {
  return { tag: null, text: replaceLineBreaks(displayField(Tr).text) };
}
//@ chunk-p2qwpk2k.js:42324-42357 placement
function Am(Bi) {
  return Bi.source;
}
//@ chunk-p2qwpk2k.js:42357-42407 placement = _temp5 (1)
function Mm(a_0) {
  return a_0.source === "userSettings";
}
//@ chunk-p2qwpk2k.js:42407-42457 placement = _temp5 (1)
function Em(a_0) {
  return a_0.source !== "userSettings";
}
//@ chunk-p2qwpk2k.js:42729-42795 placement
function km(_i) {
  return _i ? ` \xB7 ${_i}`.padEnd(De) : " ".repeat(De);
}
//@ chunk-p2qwpk2k.js:42795-42828 placement
function Dm(Pr, Vi) {
  return [Pr, Vi];
}
//@ chunk-p2qwpk2k.js:42962-43125 placement
function getAutoModeRuleCategoryLabel(h) {
  switch (h) {
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
/**
 * 返回自动模式规则分区的颜色：allow 绿、soft_deny 黄、hard_deny 红等。
 */
//@ chunk-p2qwpk2k.js:43125-43266 placement
function getAutoModeSectionColor(h) {
  switch (h) {
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
/**
 * 把规则来源（用户设置、--settings、托管设置）转换为显示文本。
 */
//@ chunk-p2qwpk2k.js:43266-43426 placement
function describeRuleSource(h) {
  switch (h) {
    case "userSettings":
      return "user settings";
    case "flagSettings":
      return "the --settings flag";
    case "policySettings":
      return "managed settings";
  }
}
/**
 * 按分区顺序、再按来源（用户、flag、托管）顺序排列规则条目。
 */
//@ chunk-p2qwpk2k.js:43426-43608 placement
function sortRuleEntries(h) {
  let i = ["userSettings", "flagSettings", "policySettings"];
  return Ye.flatMap((m) => {
    let filtered = h.filter((f) => f.section === m);
    return i.flatMap((f) => filtered.filter((g) => g.source === f));
  });
}
//@ chunk-p2qwpk2k.js:43608-43691 placement
function Mt(h) {
  return `${h.section}:${h.source}:${h.legacy ? "legacy-" : ""}${h.index}`;
}
//@ chunk-p2qwpk2k.js:43691-43813 placement
function getRuleSourceBadge(h) {
  switch (h) {
    case "userSettings":
      return null;
    case "flagSettings":
      return "flag";
    case "policySettings":
      return "org";
  }
}
//@ chunk-p2qwpk2k.js:43813-43823 placement
var De = 20;
//@ chunk-p2qwpk2k.js:43823-43991 placement
function splitByWidth(h, i) {
  let m = [],
    a = "",
    f = 0;
  for (let { segment: segment } of getGraphemeSegmenter().segment(h)) {
    let v = bunStringWidth(segment);
    if (f + v > i && a.length > 0) (m.push(a), (a = ""), (f = 0));
    ((a += segment), (f += v));
  }
  if (a.length > 0) m.push(a);
  return m;
}
//@ chunk-p2qwpk2k.js:43991-44000 placement
var Il = 5;

export {
  getAutoModeRuleCategoryLabel,
  getRuleSourceBadge,
  getAutoModeSectionColor,
  De,
  Ye,
  splitByWidth,
  vm,
  bm,
  sortRuleEntries,
  Cm,
  wm,
  Rm,
  Sm,
  xm,
  Am,
  describeRuleSource,
  Mm,
  Em,
  Mt,
  km,
  Il,
  Dm,
  bo,
  classifyAutoModeRuleSource,
  collectAutoModeRuleEntries,
  us,
  saveEnvironmentDocument,
  readUserEnvironmentEntries,
  Xt,
  fs,
  ps,
  AUTO_MODE_RULE_EDIT_ERRORS,
  hs,
};
