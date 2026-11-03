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
  oct,
  findTemplateInjection,
} from "../../utils/permissions/autoModeRulesPrompt.js";
import { ghIsDangerousCallback } from "./pregather.js";
import { logForDebugging } from "../../utils/debug.js";
import { jsonStringify } from "../../utils/slowOperations.js";

//@ chunk-2a8yx6fc.js:55219-55301 placement
var DVn = ["allow", "soft_deny", "hard_deny"],
  pHe = 200,
  Zyt = 1e4,
  co = MAX_SETTINGS_JSON_BYTES / 4,
  uo = 200,
  fo = 50000;
//@ chunk-2a8yx6fc.js:55301-55405 placement
class AutoModeSetupWriteError extends Error {
  code;
  constructor(e, n) {
    super(n);
    ((this.name = "AutoModeSetupWriteError"), (this.code = e));
  }
}
/**
 * 写入自动模式设置并记录特性状态：失败按错误码记录，跳过 permissions.allow 时记为 sad。
 */
//@ chunk-2a8yx6fc.js:55405-55658 placement
async function applyAutoModeSettings(e, n) {
  let r;
  try {
    r = await writeAutoModeSettings(e, n);
  } catch (error) {
    throw (
      logFeatureBad(
        "auto_mode_setup_write",
        error instanceof AutoModeSetupWriteError ? error.code : "unknown",
      ),
      error
    );
  }
  if (r.permissionsAllowSkipped) logFeatureSad("auto_mode_setup_write", "permissions_allow_skipped");
  else logFeatureOk("auto_mode_setup_write");
  return r;
}
//@ chunk-2a8yx6fc.js:55658-56972 placement
function validateAutoModeBlock(e) {
  let { autoMode: autoMode } = e;
  if (autoMode === void 0 && (e.removeFromPermissionsAllow ?? []).length === 0) return "Nothing to save.";
  if (autoMode !== void 0) {
    let safeParse = autoModeConfigSchema().safeParse(autoMode);
    if (!safeParse.success) return `autoMode block failed validation: ${formatZodIssues(safeParse.error)}`;
    if (!autoMode.environment || autoMode.environment.length === 0)
      return "autoMode.environment is empty \u2014 nothing to save.";
    let s = checkAutoModeEntries("environment", autoMode.environment);
    if (s) return s;
    if (autoMode.environment.some((l) => I5(l) === DEFAULTS_PLACEHOLDER))
      return `autoMode.environment must not contain "${DEFAULTS_PLACEHOLDER}" \u2014 skipped slots get their shipped default text written verbatim instead.`;
    for (let l of DVn) {
      let a = autoMode[l];
      if (a === void 0) continue;
      if (a.length === 0)
        return `autoMode.${l} is empty \u2014 omit the key when nothing was accepted for it.`;
      let d = checkAutoModeEntries(l, a);
      if (d) return d;
      if (!a.includes(DEFAULTS_PLACEHOLDER))
        return `autoMode.${l} is missing the literal entry "${DEFAULTS_PLACEHOLDER}" \u2014 without it the array replaces the shipped rules instead of extending them.`;
    }
  }
  let removeFromPermissionsAllow = e.removeFromPermissionsAllow;
  if (removeFromPermissionsAllow !== void 0) {
    if (!Array.isArray(removeFromPermissionsAllow))
      return "removeFromPermissionsAllow must be an array of rule strings.";
    if (removeFromPermissionsAllow.length > pHe)
      return `removeFromPermissionsAllow has ${removeFromPermissionsAllow.length} entries; the maximum is ${pHe}.`;
    for (let [o, s] of removeFromPermissionsAllow.entries())
      if (typeof s !== "string" || !ghIsDangerousCallback(s))
        return `removeFromPermissionsAllow[${o}] is not a rule string the removal offer could have produced.`;
  }
  return null;
}
/**
 * 把自动模式设置写入用户设置文件（校验、解析失败时报错）
 */
//@ chunk-2a8yx6fc.js:56972-59238 placement
async function writeAutoModeSettings(e, n) {
  let r = validateAutoModeBlock(e);
  if (r) throw new AutoModeSetupWriteError("invalid_input", r);
  let o = getSettingsFilePathForSource("userSettings");
  if (!o)
    throw new AutoModeSetupWriteError(
      "no_user_settings_path",
      "Could not resolve the user settings file path.",
    );
  let s = e.autoMode !== void 0 ? normalizeAutoModeBlock(e.autoMode) : void 0,
    l = e.mode ?? "append",
    a = e.removeFromPermissionsAllow ?? [],
    d = [],
    h = [],
    c = !1,
    y = 0,
    u = null,
    w = [],
    { error: error } = await updateSettingsForSourceWithTransform(
      "userSettings",
      (S) => {
        let A = {};
        if (s !== void 0) {
          let R = S?.autoMode;
          if (Array.isArray(R))
            return (
              (u =
                "the existing autoMode value in the settings file is an array \u2014 remove or fix it, then re-run setup."),
              null
            );
          let x = R !== null && typeof R === "object" ? R : void 0,
            C;
          if (l === "append") {
            let N = vn(x?.environment);
            ((y = N.length), (C = { environment: mergeEnvironmentEntries(N, s.environment) }));
          } else C = { environment: s.environment };
          for (let N of DVn) {
            let Ne = s[N];
            if (Ne === void 0) continue;
            C[N] = mergeRuleEntries(N, vn(x?.[N]), Ne);
          }
          let q = { ...x, ...C },
            safeParse = autoModeConfigSchema().safeParse(q);
          if (!safeParse.success)
            return (
              (u = `merging with the existing autoMode block in the settings file would produce an invalid result: ${formatZodIssues(safeParse.error)}`),
              null
            );
          let byteLength = Buffer.byteLength(JSON.stringify(C.environment), "utf8");
          if (C.environment.length > uo || byteLength > fo) {
            let N = `autoMode.environment now has ${C.environment.length} entries (~${Math.round(byteLength / 1024)} KB). It\u2019s spliced into the classifier prompt on every auto-mode decision \u2014 consider pruning stale entries.`;
            (w.push(N), logForDebugging(`auto-mode setup: ${N}`, { level: "warn" }));
          }
          let byteLength_2 = Buffer.byteLength(jsonStringify(q));
          if (byteLength_2 > co)
            w.push(
              `The autoMode settings section is ${Math.round(byteLength_2 / 1024)}KB serialized \u2014 the whole settings file stops loading past ${Math.round(MAX_SETTINGS_JSON_BYTES / 1048576)}MiB. Consider trimming rules or environment entries.`,
            );
          A.autoMode = C;
        }
        let T = () => (Object.keys(A).length > 0 ? A : null);
        if (a.length === 0) return T();
        let v = S?.permissions?.allow;
        if (!Array.isArray(v)) return ((c = !0), T());
        let j = new Set(a),
          filtered = v.filter((R) => !j.has(R));
        d = v.filter((R) => j.has(R));
        let L = new Set(v);
        if (((h = a.filter((R) => !L.has(R))), d.length === 0)) return T();
        return ((A.permissions = { allow: filtered }), A);
      },
      void 0,
      n,
    );
  if (u) throw new AutoModeSetupWriteError("invalid_merged", u);
  if (error) {
    logForDebugging(`auto-mode setup write failed: ${error.message}`, { level: "error" });
    let S = describeSettingsWriteFailure(error, o, "setup");
    throw new AutoModeSetupWriteError(S.code, S.message);
  }
  return {
    filePath: o,
    autoModeKeysWritten: s !== void 0 ? Object.keys(s) : [],
    environmentEntriesPreserved: y,
    permissionsAllowRemoved: d,
    permissionsAllowNotFound: h,
    permissionsAllowSkipped: c,
    warnings: w,
  };
}
/**
 * 设置文件 JSON 无效时的提示：修复或删除后重新运行命令。
 */
//@ chunk-2a8yx6fc.js:59238-59355 placement
function invalidSettingsJsonMessage(e, n) {
  return `The settings file at ${e} contains invalid JSON \u2014 fix or remove it, then re-run ${n}.`;
}
/**
 * 把设置写入失败转换为错误码与提示：JSON 语法错误或一般写入失败（检查权限与磁盘空间）。
 */
//@ chunk-2a8yx6fc.js:59355-59623 placement
function describeSettingsWriteFailure(e, n, r) {
  if (e.message.includes("Invalid JSON syntax"))
    return { code: "settings_file_invalid", message: invalidSettingsJsonMessage(n, r) };
  return {
    code: "write_failed",
    message: `Could not write ${n} \u2014 check file permissions and disk space (run with --debug for the underlying error).`,
  };
}
//@ chunk-2a8yx6fc.js:59623-59723 placement
function formatZodIssues(e) {
  return e.issues.map((issue) => `${issue.path.map(String).join(".")}: ${issue.message}`).join("; ");
}
//@ chunk-2a8yx6fc.js:59723-59800 placement
function vn(e) {
  return Array.isArray(e) ? e.filter((n) => typeof n === "string") : [];
}
/**
 * 把新的环境说明条目合并到已有 autoMode.environment：按 "### " 小节分组，相同小节内已存在的条目跳过，新条目插到对应小节末尾，新小节追加到最后，空的新小节会被删除。
 */
//@ chunk-2a8yx6fc.js:59800-60382 placement
function mergeEnvironmentEntries(existing, incoming) {
  let r = (w) => w.startsWith("### "),
    merged = [...existing],
    s = (w, E) => `${w}\x00${I5(E)}`,
    seenInSection = new Set(),
    seenAnywhere = new Set();
  {
    let w = "";
    for (let E of existing)
      if (r(E)) w = I5(E);
      else (seenInSection.add(s(w, E)), seenAnywhere.add(I5(E)));
  }
  let insertAt = merged.length,
    currentSection = "",
    newSectionIndex = -1,
    y = !1,
    u = () => {
      if (newSectionIndex !== -1 && !y) {
        if ((merged.splice(newSectionIndex, 1), insertAt > newSectionIndex)) insertAt--;
      }
      ((newSectionIndex = -1), (y = !1));
    };
  for (let w of incoming) {
    if (r(w)) {
      (u(), (currentSection = I5(w)));
      let index = merged.findIndex((A) => I5(A) === currentSection);
      if (index === -1) (merged.push(w), (newSectionIndex = merged.length - 1), (insertAt = merged.length));
      else {
        let A = index + 1;
        while (A < merged.length && !r(merged[A])) A++;
        insertAt = A;
      }
      continue;
    }
    let E = I5(w);
    if (
      seenInSection.has(s(currentSection, w)) ||
      seenInSection.has(s("", w)) ||
      (currentSection === "" && seenAnywhere.has(E))
    )
      continue;
    if (
      (merged.splice(insertAt++, 0, w),
      seenInSection.add(s(currentSection, w)),
      seenAnywhere.add(E),
      newSectionIndex !== -1)
    )
      y = !0;
  }
  return (u(), merged);
}
//@ chunk-2a8yx6fc.js:60382-60593 placement
function mergeRuleEntries(e, n, r) {
  let o =
      e !== "allow" ||
      (n.length === 0 ? !builtinAllowRulesAreOff() : n.some((a) => I5(a) === DEFAULTS_PLACEHOLDER)),
    s = new Set(),
    l = [];
  for (let a of [DEFAULTS_PLACEHOLDER, ...n, ...r]) {
    let d = I5(a);
    if (d === DEFAULTS_PLACEHOLDER && !o) continue;
    if (s.has(d)) continue;
    (s.add(d), l.push(a));
  }
  return l;
}
//@ chunk-2a8yx6fc.js:60593-60717 placement
function normalizeAutoModeBlock(e) {
  let n = { environment: e.environment.map(I5) };
  for (let r of DVn) {
    let o = e[r];
    if (o !== void 0) n[r] = o.map(I5);
  }
  return n;
}
//@ chunk-2a8yx6fc.js:60717-61555 placement
function checkAutoModeEntries(e, n) {
  if (n.length > pHe) return `${e} has ${n.length} entries; the maximum is ${pHe}.`;
  for (let r of n) {
    let o = I5(r);
    if (o.trim() === "") return `${e} contains an empty entry.`;
    if (o.length > Zyt) return `${e} contains an entry of ${o.length} characters; the maximum is ${Zyt}.`;
    if (hasControlChars(o))
      return `${e} contains an entry with a control character; entries must be single-line text.`;
    if (oct(o))
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
var _o = /[\uFE00-\uFE0F\u{E0100}-\u{E01EF}]/gu;
//@ chunk-2a8yx6fc.js:61601-61640 placement
function I5(e) {
  return e.replace(_o, "");
}

export {
  invalidSettingsJsonMessage,
  describeSettingsWriteFailure,
  applyAutoModeSettings,
  AutoModeSetupWriteError,
  checkAutoModeEntries,
  pHe,
  I5,
  Zyt,
  validateAutoModeBlock,
  DVn,
};
