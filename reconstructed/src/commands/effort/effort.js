/**
 * commands/effort/effort.tsx
 *
 * 并入旧版已有路径：/effort 命令。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/effort/effort.tsx
 * pieces: chunk-3rwvzn82.js (2), chunk-kcvmr83c.js (17), chunk-mtkg11k6.js (1)
 * attribution: callgraph-witnessed 1, fingerprint 6, placement 8, layout 5
 */
import { getMainLoopModel } from "../../utils/model/model.js";
import {
  isUltracodeAvailable,
  getAllowedEffortLevels,
  clampEffortToCap,
  toPersistableEffort,
  persistEffortSetting,
  getEffortLevelIfSupported,
  getEffortEnvOverride,
  effortValueToString,
  getEffortValueDescription,
  getOrgOverriddenEffort,
  carriedEffortOnly,
  isUltracodeActive,
  getAppliedEffortLevel,
  getOrgDefaultEffort,
  eTn,
  getEffortEnvOverride_2,
  parseEffortLevel,
  toEffortSettingOrDefault,
  isSameEffortSetting,
} from "../../utils/effort.js";
import { Jn, ml } from "../../remote/remoteMode.js";
import { forwardApplyFlagSettings } from "../../entrypoints/sdk/controlSchemas.js";
import { logError } from "../../utils/log.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum, fromEnumOpt, lit } from "../../services/analytics/safeMetadata.js";
import { env } from "../../utils/env.js";
import { scr } from "../../utils/permissions/permissionSetup.js";
import { dg } from "../../context/QueuedMessageContext.js";
import { useAppState } from "../../state/AppState.js";
import { Wr, EffortCommand } from "../../components/EffortSlider.js";
import { useMainLoopModel } from "../../hooks/useMainLoopModel.js";
import { COMMON_HELP_ARGS } from "../../constants/xml.js";
import { e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { parseUserSpecifiedModel } from "../../utils/model/modelDisplay.js";
import { getDefaultMainLoopModelSetting } from "../../utils/model/planModeModel.js";
import { getEffortValue } from "../../utils/permissions/toolPermissionContext.js";

//@ chunk-kcvmr83c.js:518-858 placement
var EFFORT_LEVEL_DESCRIPTIONS = {
    low: "Quick, straightforward implementation",
    medium: "Balanced approach with standard testing",
    high: "Comprehensive implementation with extensive testing",
    xhigh: "Extended reasoning with thorough analysis (on supported models)",
    max: "Maximum capability with deepest reasoning (on supported models)",
  },
  lFt = "dynamic workflows on every task";
//@ chunk-kcvmr83c.js:858-931 placement
function T() {
  return "- auto: Use the default effort level for your model";
}
//@ chunk-kcvmr83c.js:931-1198 placement
function getEffortUsage() {
  let e = getMainLoopModel(),
    t = isUltracodeAvailable(e),
    n = getAllowedEffortLevels(e);
  return (
    `Usage: /effort [${n.join("|")}|auto${t ? "|ultracode [on|off]" : ""}]

Effort levels:
` +
    n
      .map(
        (r) => `- ${r}: ${EFFORT_LEVEL_DESCRIPTIONS[r]}
`,
      )
      .join("") +
    T() +
    (t
      ? `

Ultracode (any effort level, this session only):
- ultracode [on|off]: ${lFt}`
      : "")
  );
}
//@ chunk-kcvmr83c.js:1198-1293 layout
function formatValidEffortOptions(e) {
  let t = getAllowedEffortLevels(e),
    n = isUltracodeAvailable(e) ? ", ultracode [on|off]" : "";
  return `${t.join(", ")}, auto${n}`;
}
//@ chunk-kcvmr83c.js:1293-1382 fingerprint = ApplyEffortAndClose (0.364)
function ApplyEffortAndClose({ effortUpdate: effortUpdate }) {
  return effortUpdate !== void 0 && effortUpdate.ultracode === void 0 && effortUpdate.value === void 0;
}
//@ chunk-kcvmr83c.js:1781-1821 placement
function $Co() {
  return Jn() !== null && ml();
}
//@ chunk-kcvmr83c.js:1821-1880 placement
function R(e) {
  return $Co() ? (e.ultracodeConfirmed ?? !1) : void 0;
}
/**
 * 远程会话中把 effort 等级转发给远端：不支持控制请求时走 apply_flag_settings 转发，否则发送控制请求设置 effortLevel，需要时再开启 ultracode。
 */
//@ chunk-kcvmr83c.js:1880-2188 placement
function forwardEffortToRemote(e, t) {
  let n = Jn();
  if (!n) return null;
  if (!ml()) return forwardApplyFlagSettings({ effortLevel: e, ultracode: !1 });
  return (
    n
      .sendControlRequest({ subtype: "apply_flag_settings", settings: { effortLevel: e, ultracode: !1 } })
      .then(() =>
        t === !0
          ? n.sendControlRequest({ subtype: "apply_flag_settings", settings: { ultracode: !0 } })
          : void 0,
      )
      .catch(logError),
    null
  );
}
//@ chunk-kcvmr83c.js:2188-3672 fingerprint = setEffortValue (0.66)
async function setEffortValue(e, t, n, r, f) {
  let s = getMainLoopModel(),
    o = typeof e === "string" ? clampEffortToCap(e, s) : e,
    E = o !== e,
    d = n && !E,
    persistable = toPersistableEffort(o);
  if (ml() && persistable === void 0)
    return {
      message: `${o} is session-scoped and won't reach the remote process. Use low, medium, high, or xhigh instead.`,
    };
  let p = persistEffortSetting(o, s, d, f);
  r?.({ value: o });
  let m = R(t),
    v = m === !1 && t.ultracode === !0;
  if (m !== void 0 && m !== (t.ultracode === !0)) r?.({ ultracode: m });
  let y = forwardEffortToRemote(persistable ?? null, m),
    C = await p;
  if (C) return { message: `Failed to set effort level: ${C.message}` };
  logEvent("tengu_effort_command", {
    effort: typeof o === "number" ? o : fromEnum(o),
    from_level: fromEnumOpt(getEffortLevelIfSupported(s, t.effort)),
    route: fromEnum(t.route),
    is_remote: Jn() !== null,
  });
  let S = Jn() ? void 0 : getEffortEnvOverride();
  if (S !== void 0 && S !== o) {
    let envRaw = env.CLAUDE_CODE_EFFORT_LEVEL;
    if (persistable === void 0)
      return {
        message: `Not applied: CLAUDE_CODE_EFFORT_LEVEL=${envRaw} overrides effort this session, and ${effortValueToString(o)} is session-only (nothing saved)`,
        effortUpdate: { value: o },
      };
    return {
      message: `CLAUDE_CODE_EFFORT_LEVEL=${envRaw} overrides this session \u2014 clear it and ${effortValueToString(o)} takes over`,
      effortUpdate: { value: o },
    };
  }
  let description = getEffortValueDescription(o),
    L = getOrgOverriddenEffort(s),
    U =
      persistable !== void 0 && d && !Jn()
        ? L !== null
          ? ` (saved, though your organization starts new sessions on ${s} at ${L} effort)`
          : " (saved as your default for new sessions)"
        : " (this session only)";
  if (E)
    return {
      message: `Effort '${e}' exceeds the cap for ${s} set by your settings or organization; set to '${o}' instead${U}: ${description}${v ? " \xB7 Ultracode off" : ""}${y ?? ""}`,
      effortUpdate: { value: o },
    };
  return {
    message: `Set effort level to ${effortValueToString(o)}${U}: ${description}${v ? " \xB7 Ultracode off" : ""}${y ?? ""}`,
    effortUpdate: { value: o },
  };
}
//@ chunk-kcvmr83c.js:3672-3737 layout
function h(e) {
  let t = Jn() ? void 0 : getEffortEnvOverride();
  return t === null ? void 0 : (t ?? e);
}
/**
 * 判断是否把 effort 保存为默认值：要求以默认值方式设置，且等级有变化或模型带有可沿用的 effort。
 */
//@ chunk-kcvmr83c.js:3737-3843 layout
function shouldSaveEffortDefault({
  asDefault: asDefault,
  levelChanged: levelChanged,
  chosen: chosen,
  model: model,
}) {
  return asDefault && (levelChanged || h(chosen) !== void 0 || carriedEffortOnly(model) === void 0);
}
//@ chunk-kcvmr83c.js:3843-4201 fingerprint = showCurrentEffort (0.571)
function showCurrentEffort(e, t, n) {
  let r = isUltracodeActive(n, t) ? " \xB7 Ultracode on" : "",
    f = h(e);
  if (f === void 0) {
    let level = getAppliedEffortLevel(t, e);
    if (level === void 0) return { message: `Effort level: auto${r}` };
    let E =
      getOrgDefaultEffort(t) !== null && carriedEffortOnly(t) === void 0 ? ", set by your organization" : "";
    return { message: `Effort level: auto (currently ${effortValueToString(level)}${E})${r}` };
  }
  let description = getEffortValueDescription(f);
  return { message: `Current effort level: ${effortValueToString(f)} (${description})${r}` };
}
//@ chunk-kcvmr83c.js:4201-4979 fingerprint = unsetEffortLevel (0.605)
async function unsetEffortLevel(e, t, n, r) {
  n?.({ value: void 0 });
  let f = R(e),
    s = f === !1 && e.ultracode === !0;
  if (f !== void 0 && f !== (e.ultracode === !0)) n?.({ ultracode: f });
  let o = forwardEffortToRemote(null, f),
    E = await persistEffortSetting(void 0, getMainLoopModel(), t, r);
  if (E) return { message: `Failed to set effort level: ${E.message}` };
  logEvent("tengu_effort_command", {
    effort: lit("auto"),
    from_level: fromEnumOpt(getEffortLevelIfSupported(getMainLoopModel(), e.effort)),
    route: fromEnum(e.route),
    is_remote: Jn() !== null,
  });
  let d = t ? "" : " (this session only)",
    u = Jn() ? void 0 : getEffortEnvOverride();
  if (u !== void 0 && u !== null) {
    let envRaw = env.CLAUDE_CODE_EFFORT_LEVEL;
    return {
      message: `${t ? "Cleared effort from settings, but" : "Effort set to auto for this session, but"} CLAUDE_CODE_EFFORT_LEVEL=${envRaw} still controls this session`,
      effortUpdate: { value: void 0 },
    };
  }
  return {
    message: `Effort level set to auto${d}${s ? " \xB7 Ultracode off" : ""}${o ?? ""}`,
    effortUpdate: { value: void 0 },
  };
}
//@ chunk-kcvmr83c.js:4979-5617 layout
function setUltracode(e, t, n) {
  let r = getMainLoopModel();
  if (e && !isUltracodeAvailable())
    return {
      message: `Ultracode needs dynamic workflows enabled (see /config). Valid options are: ${formatValidEffortOptions(r)}`,
    };
  if (e && !isUltracodeAvailable(r))
    return {
      message: `Ultracode isn't available on ${r}. Valid options are: ${formatValidEffortOptions(r)}`,
    };
  n?.({ ultracode: e });
  let f = forwardApplyFlagSettings({ ultracode: e });
  logEvent("tengu_effort_command", {
    effort: e ? lit("ultracode") : lit("ultracode_off"),
    from_level: fromEnumOpt(getEffortLevelIfSupported(r, t.effort)),
    route: fromEnum(t.route),
    is_remote: Jn() !== null,
  });
  let s = eTn(t.effort, r) ?? h(t.effort) ?? getAppliedEffortLevel(r, t.effort) ?? "auto";
  return {
    message: e
      ? `Ultracode on (this session only): ${lFt}. Effort stays ${s}.${f ?? ""}`
      : `Ultracode off. Effort stays ${s}.${f ?? ""}`,
    effortUpdate: { ultracode: e },
  };
}
//@ chunk-kcvmr83c.js:5617-5758 layout
function parseUltracodeArg(e) {
  let [t, n, ...r] = e.split(/\s+/);
  if (t !== "ultracode" || r.length > 0) return;
  if (n === void 0 || n === "on") return !0;
  return n === "off" ? !1 : void 0;
}
//@ chunk-kcvmr83c.js:5758-5988 fingerprint = executeEffort (0.503)
async function executeEffort(e, t, n = !0, r, f) {
  let normalized = e.toLowerCase();
  if (getEffortEnvOverride_2(e)) return unsetEffortLevel(t, n, r, f);
  let o = parseUltracodeArg(normalized);
  if (o !== void 0) return setUltracode(o, t, r);
  let E = parseEffortLevel(e);
  if (!E)
    return {
      message: `Invalid argument: ${e}. Valid options are: ${formatValidEffortOptions(getMainLoopModel())}`,
    };
  return setEffortValue(E, t, n, r, f);
}
//@ chunk-kcvmr83c.js:5988-6565 placement
async function applyEffortCommand(e, t, n, r = !0, f) {
  let s = !1,
    o = null,
    E = await executeEffort(
      e,
      t,
      r,
      (d) => {
        if (((s = !0), d.ultracode === void 0)) scr();
        n((u) => {
          o ??= { sessionEffort: u.sessionEffort, ultracode: u.ultracode ?? !1 };
          let p = d.ultracode === void 0 ? toEffortSettingOrDefault(d.value) : u.sessionEffort,
            m = d.ultracode ?? u.ultracode ?? !1;
          if (isSameEffortSetting(u.sessionEffort, p) && (u.ultracode ?? !1) === m) return u;
          return { ...u, sessionEffort: p, ultracode: m };
        });
      },
      f,
    );
  if (s && !E.effortUpdate)
    n((d) => {
      if (o === null) return d;
      if (isSameEffortSetting(d.sessionEffort, o.sessionEffort) && (d.ultracode ?? !1) === o.ultracode)
        return d;
      return { ...d, sessionEffort: o.sessionEffort, ultracode: o.ultracode };
    });
  return E;
}
//@ chunk-3rwvzn82.js:14905-14998 callgraph-witnessed = ShowCurrentEffort (1)
function ShowCurrentEffort(t0) {
  let { onDone: onDone } = t0,
    o = dg(),
    effortValue = useAppState(Wr),
    model = useMainLoopModel(),
    { message: message } = showCurrentEffort(o, model, effortValue);
  return (onDone(message), null);
}
/**
 * /effort 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
//@ chunk-3rwvzn82.js:32635-32873 fingerprint = call (0.89)
async function call(onDone, context, args) {
  if (((args = args?.trim() || ""), COMMON_HELP_ARGS.includes(args))) {
    onDone(getEffortUsage());
    return;
  }
  if (args === "current" || args === "status") return e(ShowCurrentEffort, { onDone: onDone });
  return e(EffortCommand, {
    args: args,
    onDone: (a) => onDone(a),
    getMessages: () => context.getMessages?.() ?? context.messages,
    storageV5: context.storageV5,
  });
}
/**
 * /effort 命令：help 显示用法，current/status 显示当前等级，无参数显示可选等级，否则解析等级（含 auto、ultracode on/off）并应用。
 */
//@ chunk-mtkg11k6.js:3663-4202 placement
async function effortCommandCall(args, context) {
  let trimmed = args.trim(),
    appState = context.getAppState(),
    r = parseUserSpecifiedModel(
      appState.mainLoopModelForSession ?? appState.mainLoopModel ?? getDefaultMainLoopModelSetting(),
    );
  if (COMMON_HELP_ARGS.includes(trimmed)) return { type: "text", value: getEffortUsage() };
  if (trimmed === "current" || trimmed === "status") {
    let { message: message } = showCurrentEffort(getEffortValue(context), r, appState.ultracode);
    return { type: "text", value: message };
  }
  if (!trimmed)
    return {
      type: "text",
      value: `Usage: /effort <${getAllowedEffortLevels(r).join("|")}|auto${isUltracodeAvailable(r) ? "|ultracode [on|off]" : ""}>`,
    };
  return {
    type: "text",
    value: (
      await applyEffortCommand(
        trimmed,
        { effort: getEffortValue(context), ultracode: appState.ultracode, route: "noninteractive" },
        context.setAppState,
        !context.options.isNonInteractiveSession,
        context.storageV5,
      )
    ).message,
  };
}

export { applyEffortCommand, ApplyEffortAndClose, $Co, shouldSaveEffortDefault, lFt };
