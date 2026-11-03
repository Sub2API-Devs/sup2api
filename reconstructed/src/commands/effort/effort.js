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
  noEffortHint,
  getEffortEnvOverride_2,
  parseEffortLevel,
  toEffortSettingOrDefault,
  isSameEffortSetting,
} from "../../utils/effort.js";
import { getRemoteCaps, isRemoteControlChannelAvailable } from "../../remote/remoteMode.js";
import { forwardApplyFlagSettings } from "../../entrypoints/sdk/controlSchemas.js";
import { logError } from "../../utils/log.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum, fromEnumOpt, lit } from "../../services/analytics/safeMetadata.js";
import { env } from "../../utils/env.js";
import { releaseCarriedEffortForEffortChange } from "../../utils/permissions/permissionSetup.js";
import { useQueuedMessageText } from "../../context/QueuedMessageContext.js";
import { useAppState } from "../../state/AppState.js";
import { selectUltracode, EffortCommand } from "../../components/EffortSlider.js";
import { useMainLoopModel } from "../../hooks/useMainLoopModel.js";
import { COMMON_HELP_ARGS } from "../../constants/xml.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { parseUserSpecifiedModel } from "../../utils/model/modelDisplay.js";
import { getDefaultMainLoopModelSetting } from "../../utils/model/planModeModel.js";
import { getEffortValue } from "../../utils/permissions/toolPermissionContext.js";

//@ chunk-kcvmr83c.js:518-858 placement
/**
 * ultracode 功能的说明文本集合（开关帮助行与会话内开启提示）。
 */
var EFFORT_LEVEL_DESCRIPTIONS = {
  low: "Quick, straightforward implementation",
  medium: "Balanced approach with standard testing",
  high: "Comprehensive implementation with extensive testing",
  xhigh: "Extended reasoning with thorough analysis (on supported models)",
  max: "Maximum capability with deepest reasoning (on supported models)",
};
var ULTRACODE_DESCRIPTION = "dynamic workflows on every task";
//@ chunk-kcvmr83c.js:858-931 placement
function AUTO_EFFORT_DESCRIPTION() {
  return "- auto: Use the default effort level for your model";
}
//@ chunk-kcvmr83c.js:931-1198 placement
function getEffortUsage() {
  let mainLoopModel = getMainLoopModel();
  let t = isUltracodeAvailable(mainLoopModel);
  let allowedEffortLevels = getAllowedEffortLevels(mainLoopModel);
  return (
    `Usage: /effort [${allowedEffortLevels.join("|")}|auto${t ? "|ultracode [on|off]" : ""}]

Effort levels:
` +
    allowedEffortLevels
      .map(
        (allowedEffortLevel) => `- ${allowedEffortLevel}: ${EFFORT_LEVEL_DESCRIPTIONS[allowedEffortLevel]}
`,
      )
      .join("") +
    AUTO_EFFORT_DESCRIPTION() +
    (t
      ? `

Ultracode (any effort level, this session only):
- ultracode [on|off]: ${ULTRACODE_DESCRIPTION}`
      : "")
  );
}
//@ chunk-kcvmr83c.js:1198-1293 layout
function formatValidEffortOptions(mainLoopModel) {
  let allowedEffortLevels = getAllowedEffortLevels(mainLoopModel);
  let n = isUltracodeAvailable(mainLoopModel) ? ", ultracode [on|off]" : "";
  return `${allowedEffortLevels.join(", ")}, auto${n}`;
}
//@ chunk-kcvmr83c.js:1293-1382 fingerprint = ApplyEffortAndClose (0.364)
function ApplyEffortAndClose({ effortUpdate }) {
  return (
    effortUpdate !== undefined && effortUpdate.ultracode === undefined && effortUpdate.value === undefined
  );
}
//@ chunk-kcvmr83c.js:1781-1821 placement
/**
 * ultracode 开关是否可用（远程控制会话且某条件下）。
 */
function isUltracodeToggleAvailable() {
  return getRemoteCaps() !== null && isRemoteControlChannelAvailable();
}
//@ chunk-kcvmr83c.js:1821-1880 placement
function readUltracodeConfirmed(e) {
  return isUltracodeToggleAvailable() ? (e.ultracodeConfirmed ?? false) : undefined;
}
//@ chunk-kcvmr83c.js:1880-2188 placement
/**
 * 远程会话中把 effort 等级转发给远端：不支持控制请求时走 apply_flag_settings 转发，否则发送控制请求设置 effortLevel，需要时再开启 ultracode。
 */
function forwardEffortToRemote(effortLevel, ultracodeConfirmed) {
  let remoteCaps = getRemoteCaps();
  if (!remoteCaps) return null;
  if (!isRemoteControlChannelAvailable())
    return forwardApplyFlagSettings({
      effortLevel,
      ultracode: false,
    });
  remoteCaps
    .sendControlRequest({
      subtype: "apply_flag_settings",
      settings: {
        effortLevel,
        ultracode: false,
      },
    })
    .then(() =>
      ultracodeConfirmed === true
        ? remoteCaps.sendControlRequest({
            subtype: "apply_flag_settings",
            settings: {
              ultracode: true,
            },
          })
        : undefined,
    )
    .catch(logError);
  return null;
}
//@ chunk-kcvmr83c.js:2188-3672 fingerprint = setEffortValue (0.66)
async function setEffortValue(effortLevel, t, n, r, f) {
  let mainLoopModel = getMainLoopModel();
  let o = typeof effortLevel === "string" ? clampEffortToCap(effortLevel, mainLoopModel) : effortLevel;
  let E = o !== effortLevel;
  let d = n && !E;
  let persistable = toPersistableEffort(o);
  if (isRemoteControlChannelAvailable() && persistable === undefined)
    return {
      message: `${o} is session-scoped and won't reach the remote process. Use low, medium, high, or xhigh instead.`,
    };
  let p = persistEffortSetting(o, mainLoopModel, d, f);
  r?.({
    value: o,
  });
  let ultracodeConfirmed = readUltracodeConfirmed(t);
  let v = ultracodeConfirmed === false && t.ultracode === true;
  if (ultracodeConfirmed !== undefined && ultracodeConfirmed !== (t.ultracode === true))
    r?.({
      ultracode: ultracodeConfirmed,
    });
  let y = forwardEffortToRemote(persistable ?? null, ultracodeConfirmed);
  let C = await p;
  if (C)
    return {
      message: `Failed to set effort level: ${C.message}`,
    };
  logEvent("tengu_effort_command", {
    effort: typeof o === "number" ? o : fromEnum(o),
    from_level: fromEnumOpt(getEffortLevelIfSupported(mainLoopModel, t.effort)),
    route: fromEnum(t.route),
    is_remote: getRemoteCaps() !== null,
  });
  let envOverride = getRemoteCaps() ? undefined : getEffortEnvOverride();
  if (envOverride !== undefined && envOverride !== o) {
    let envRaw = env.CLAUDE_CODE_EFFORT_LEVEL;
    if (persistable === undefined)
      return {
        message: `Not applied: CLAUDE_CODE_EFFORT_LEVEL=${envRaw} overrides effort this session, and ${effortValueToString(o)} is session-only (nothing saved)`,
        effortUpdate: {
          value: o,
        },
      };
    return {
      message: `CLAUDE_CODE_EFFORT_LEVEL=${envRaw} overrides this session \u2014 clear it and ${effortValueToString(o)} takes over`,
      effortUpdate: {
        value: o,
      },
    };
  }
  let description = getEffortValueDescription(o);
  let orgOverriddenEffort = getOrgOverriddenEffort(mainLoopModel);
  let U =
    persistable !== undefined && d && !getRemoteCaps()
      ? orgOverriddenEffort !== null
        ? ` (saved, though your organization starts new sessions on ${mainLoopModel} at ${orgOverriddenEffort} effort)`
        : " (saved as your default for new sessions)"
      : " (this session only)";
  if (E)
    return {
      message: `Effort '${effortLevel}' exceeds the cap for ${mainLoopModel} set by your settings or organization; set to '${o}' instead${U}: ${description}${v ? " \xB7 Ultracode off" : ""}${y ?? ""}`,
      effortUpdate: {
        value: o,
      },
    };
  return {
    message: `Set effort level to ${effortValueToString(o)}${U}: ${description}${v ? " \xB7 Ultracode off" : ""}${y ?? ""}`,
    effortUpdate: {
      value: o,
    },
  };
}
//@ chunk-kcvmr83c.js:3672-3737 layout
function effectiveEffortOverride(e) {
  let t = getRemoteCaps() ? undefined : getEffortEnvOverride();
  return t === null ? undefined : (t ?? e);
}
//@ chunk-kcvmr83c.js:3737-3843 layout
/**
 * 判断是否把 effort 保存为默认值：要求以默认值方式设置，且等级有变化或模型带有可沿用的 effort。
 */
function shouldSaveEffortDefault({ asDefault, levelChanged, chosen, model }) {
  return (
    asDefault &&
    (levelChanged || effectiveEffortOverride(chosen) !== undefined || carriedEffortOnly(model) === undefined)
  );
}
//@ chunk-kcvmr83c.js:3843-4201 fingerprint = showCurrentEffort (0.571)
function showCurrentEffort(e, t, n) {
  let r = isUltracodeActive(n, t) ? " \xB7 Ultracode on" : "";
  let effectiveValue = effectiveEffortOverride(e);
  if (effectiveValue === undefined) {
    let level = getAppliedEffortLevel(t, e);
    if (level === undefined)
      return {
        message: `Effort level: auto${r}`,
      };
    let E =
      getOrgDefaultEffort(t) !== null && carriedEffortOnly(t) === undefined
        ? ", set by your organization"
        : "";
    return {
      message: `Effort level: auto (currently ${effortValueToString(level)}${E})${r}`,
    };
  }
  let description = getEffortValueDescription(effectiveValue);
  return {
    message: `Current effort level: ${effortValueToString(effectiveValue)} (${description})${r}`,
  };
}
//@ chunk-kcvmr83c.js:4201-4979 fingerprint = unsetEffortLevel (0.605)
async function unsetEffortLevel(e, t, n, r) {
  n?.({
    value: undefined,
  });
  let ultracodeConfirmed = readUltracodeConfirmed(e);
  let s = ultracodeConfirmed === false && e.ultracode === true;
  if (ultracodeConfirmed !== undefined && ultracodeConfirmed !== (e.ultracode === true))
    n?.({
      ultracode: ultracodeConfirmed,
    });
  let o = forwardEffortToRemote(null, ultracodeConfirmed);
  let E = await persistEffortSetting(undefined, getMainLoopModel(), t, r);
  if (E)
    return {
      message: `Failed to set effort level: ${E.message}`,
    };
  logEvent("tengu_effort_command", {
    effort: lit("auto"),
    from_level: fromEnumOpt(getEffortLevelIfSupported(getMainLoopModel(), e.effort)),
    route: fromEnum(e.route),
    is_remote: getRemoteCaps() !== null,
  });
  let d = t ? "" : " (this session only)";
  let u = getRemoteCaps() ? undefined : getEffortEnvOverride();
  if (u !== undefined && u !== null) {
    let envRaw = env.CLAUDE_CODE_EFFORT_LEVEL;
    return {
      message: `${t ? "Cleared effort from settings, but" : "Effort set to auto for this session, but"} CLAUDE_CODE_EFFORT_LEVEL=${envRaw} still controls this session`,
      effortUpdate: {
        value: undefined,
      },
    };
  }
  return {
    message: `Effort level set to auto${d}${s ? " \xB7 Ultracode off" : ""}${o ?? ""}`,
    effortUpdate: {
      value: undefined,
    },
  };
}
//@ chunk-kcvmr83c.js:4979-5617 layout
function setUltracode(ultracodeArg, t, n) {
  let mainLoopModel = getMainLoopModel();
  if (ultracodeArg && !isUltracodeAvailable())
    return {
      message: `Ultracode needs dynamic workflows enabled (see /config). Valid options are: ${formatValidEffortOptions(mainLoopModel)}`,
    };
  if (ultracodeArg && !isUltracodeAvailable(mainLoopModel))
    return {
      message: `Ultracode isn't available on ${mainLoopModel}. Valid options are: ${formatValidEffortOptions(mainLoopModel)}`,
    };
  n?.({
    ultracode: ultracodeArg,
  });
  let f = forwardApplyFlagSettings({
    ultracode: ultracodeArg,
  });
  logEvent("tengu_effort_command", {
    effort: ultracodeArg ? lit("ultracode") : lit("ultracode_off"),
    from_level: fromEnumOpt(getEffortLevelIfSupported(mainLoopModel, t.effort)),
    route: fromEnum(t.route),
    is_remote: getRemoteCaps() !== null,
  });
  let s =
    noEffortHint(t.effort, mainLoopModel) ??
    effectiveEffortOverride(t.effort) ??
    getAppliedEffortLevel(mainLoopModel, t.effort) ??
    "auto";
  return {
    message: ultracodeArg
      ? `Ultracode on (this session only): ${ULTRACODE_DESCRIPTION}. Effort stays ${s}.${f ?? ""}`
      : `Ultracode off. Effort stays ${s}.${f ?? ""}`,
    effortUpdate: {
      ultracode: ultracodeArg,
    },
  };
}
//@ chunk-kcvmr83c.js:5617-5758 layout
function parseUltracodeArg(normalized) {
  let [t, n, ...r] = normalized.split(/\s+/);
  if (t !== "ultracode" || r.length > 0) return;
  if (n === undefined || n === "on") return true;
  return n === "off" ? false : undefined;
}
//@ chunk-kcvmr83c.js:5758-5988 fingerprint = executeEffort (0.503)
async function executeEffort(e, t, n = true, r, f) {
  let normalized = e.toLowerCase();
  if (getEffortEnvOverride_2(e)) return unsetEffortLevel(t, n, r, f);
  let ultracodeArg = parseUltracodeArg(normalized);
  if (ultracodeArg !== undefined) return setUltracode(ultracodeArg, t, r);
  let effortLevel = parseEffortLevel(e);
  if (!effortLevel)
    return {
      message: `Invalid argument: ${e}. Valid options are: ${formatValidEffortOptions(getMainLoopModel())}`,
    };
  return setEffortValue(effortLevel, t, n, r, f);
}
//@ chunk-kcvmr83c.js:5988-6565 placement
async function applyEffortCommand(e, t, setAppState, r = true, f) {
  let s = false;
  let o = null;
  let E = await executeEffort(
    e,
    t,
    r,
    (d) => {
      s = true;
      if (d.ultracode === undefined) releaseCarriedEffortForEffortChange();
      setAppState((u) => {
        o ??= {
          sessionEffort: u.sessionEffort,
          ultracode: u.ultracode ?? false,
        };
        let p = d.ultracode === undefined ? toEffortSettingOrDefault(d.value) : u.sessionEffort;
        let m = d.ultracode ?? u.ultracode ?? false;
        if (isSameEffortSetting(u.sessionEffort, p) && (u.ultracode ?? false) === m) return u;
        return {
          ...u,
          sessionEffort: p,
          ultracode: m,
        };
      });
    },
    f,
  );
  if (s && !E.effortUpdate)
    setAppState((d) => {
      if (o === null) return d;
      if (isSameEffortSetting(d.sessionEffort, o.sessionEffort) && (d.ultracode ?? false) === o.ultracode)
        return d;
      return {
        ...d,
        sessionEffort: o.sessionEffort,
        ultracode: o.ultracode,
      };
    });
  return E;
}
//@ chunk-3rwvzn82.js:14905-14998 callgraph-witnessed = ShowCurrentEffort (1)
function ShowCurrentEffort(t0) {
  let { onDone } = t0;
  let queuedMessageText = useQueuedMessageText();
  let effortValue = useAppState(selectUltracode);
  let model = useMainLoopModel();
  let { message } = showCurrentEffort(queuedMessageText, model, effortValue);
  onDone(message);
  return null;
}
//@ chunk-3rwvzn82.js:32635-32873 fingerprint = call (0.89)
/**
 * /effort 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
async function call(onDone, context, args) {
  args = args?.trim() || "";
  if (COMMON_HELP_ARGS.includes(args)) {
    onDone(getEffortUsage());
    return;
  }
  if (args === "current" || args === "status")
    return jsxProd_default(ShowCurrentEffort, {
      onDone,
    });
  return jsxProd_default(EffortCommand, {
    args,
    onDone: (a) => onDone(a),
    getMessages: () => context.getMessages?.() ?? context.messages,
    storageV5: context.storageV5,
  });
}
//@ chunk-mtkg11k6.js:3663-4202 placement
/**
 * /effort 命令：help 显示用法，current/status 显示当前等级，无参数显示可选等级，否则解析等级（含 auto、ultracode on/off）并应用。
 */
async function effortCommandCall(args, context) {
  let trimmed = args.trim();
  let appState = context.getAppState();
  let userSpecifiedModel = parseUserSpecifiedModel(
    appState.mainLoopModelForSession ?? appState.mainLoopModel ?? getDefaultMainLoopModelSetting(),
  );
  if (COMMON_HELP_ARGS.includes(trimmed))
    return {
      type: "text",
      value: getEffortUsage(),
    };
  if (trimmed === "current" || trimmed === "status") {
    let { message } = showCurrentEffort(getEffortValue(context), userSpecifiedModel, appState.ultracode);
    return {
      type: "text",
      value: message,
    };
  }
  if (!trimmed)
    return {
      type: "text",
      value: `Usage: /effort <${getAllowedEffortLevels(userSpecifiedModel).join("|")}|auto${isUltracodeAvailable(userSpecifiedModel) ? "|ultracode [on|off]" : ""}>`,
    };
  return {
    type: "text",
    value: (
      await applyEffortCommand(
        trimmed,
        {
          effort: getEffortValue(context),
          ultracode: appState.ultracode,
          route: "noninteractive",
        },
        context.setAppState,
        !context.options.isNonInteractiveSession,
        context.storageV5,
      )
    ).message,
  };
}
export {
  applyEffortCommand,
  ApplyEffortAndClose,
  isUltracodeToggleAvailable,
  shouldSaveEffortDefault,
  ULTRACODE_DESCRIPTION,
};
