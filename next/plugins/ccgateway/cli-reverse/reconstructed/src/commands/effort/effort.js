/**
 * commands/effort/effort.tsx
 *
 * 并入旧版已有路径：/effort 命令。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/effort/effort.tsx
 * pieces: chunk-1mh58gcg.js (1), chunk-5dqwe9kx.js (17), chunk-n2cdp9nk.js (2)
 * attribution: placement 8, layout 5, fingerprint 6, callgraph-witnessed 1
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
  releaseCarriedEffortForEffortChange,
  toEffortSettingOrDefault,
  isSameEffortSetting,
} from "../../utils/effort.js";
import { getRemoteCaps, isRemoteControlChannelAvailable } from "../../remote/remoteMode.js";
import { forwardApplyFlagSettings } from "../../entrypoints/sdk/controlSchemas.js";
import { logError } from "../../utils/log.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum, fromEnumOpt, lit } from "../../services/analytics/safeMetadata.js";
import { env } from "../../utils/env.js";
import { parseUserSpecifiedModel } from "../../utils/model/modelDisplay.js";
import { getDefaultMainLoopModelSetting } from "../../utils/model/planModeModel.js";
import { COMMON_HELP_ARGS } from "../../constants/xml.js";
import { getEffortValue } from "../../utils/permissions/toolPermissionContext.js";
import { useQueuedMessageText } from "../../context/QueuedMessageContext.js";
import { useAppState } from "../../state/AppState.js";
import { selectUltracode, EffortCommand } from "../../components/EffortSlider.js";
import { useMainLoopModel } from "../../hooks/useMainLoopModel.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";

//@ chunk-5dqwe9kx.js:518-858 placement
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
//@ chunk-5dqwe9kx.js:858-931 placement
function AUTO_EFFORT_DESCRIPTION() {
  return "- auto: Use the default effort level for your model";
}
//@ chunk-5dqwe9kx.js:931-1198 placement
function getEffortUsage() {
  let mainLoopModel = getMainLoopModel();
  let ultracodeAvailable = isUltracodeAvailable(mainLoopModel);
  let allowedEffortLevels = getAllowedEffortLevels(mainLoopModel);
  return (
    `Usage: /effort [${allowedEffortLevels.join("|")}|auto${ultracodeAvailable ? "|ultracode [on|off]" : ""}]

Effort levels:
` +
    allowedEffortLevels
      .map(
        (allowedEffortLevel) => `- ${allowedEffortLevel}: ${EFFORT_LEVEL_DESCRIPTIONS[allowedEffortLevel]}
`,
      )
      .join("") +
    AUTO_EFFORT_DESCRIPTION() +
    (ultracodeAvailable
      ? `

Ultracode (any effort level, this session only):
- ultracode [on|off]: ${ULTRACODE_DESCRIPTION}`
      : "")
  );
}
//@ chunk-5dqwe9kx.js:1198-1293 layout
function formatValidEffortOptions(model) {
  let allowedEffortLevels = getAllowedEffortLevels(model);
  let ultracodeHint = isUltracodeAvailable(model) ? ", ultracode [on|off]" : "";
  return `${allowedEffortLevels.join(", ")}, auto${ultracodeHint}`;
}
//@ chunk-5dqwe9kx.js:1293-1382 fingerprint (2.1.88 match: ApplyEffortAndClose, 0.364)
function ApplyEffortAndClose({ effortUpdate }) {
  return (
    effortUpdate !== undefined && effortUpdate.ultracode === undefined && effortUpdate.value === undefined
  );
}
//@ chunk-5dqwe9kx.js:1781-1821 placement
/**
 * ultracode 开关是否可用（远程控制会话且某条件下）。
 */
function isUltracodeToggleAvailable() {
  return getRemoteCaps() !== null && isRemoteControlChannelAvailable();
}
//@ chunk-5dqwe9kx.js:1821-1880 placement
function readUltracodeConfirmed(config) {
  return isUltracodeToggleAvailable() ? (config.ultracodeConfirmed ?? false) : undefined;
}
//@ chunk-5dqwe9kx.js:1880-2188 placement
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
//@ chunk-5dqwe9kx.js:2188-3672 fingerprint (2.1.88 match: setEffortValue, 0.66)
async function setEffortValue(effortLevel, state, shouldPersist, ultracodeConfirmed, options) {
  let model = getMainLoopModel();
  let level = typeof effortLevel === "string" ? clampEffortToCap(effortLevel, model) : effortLevel;
  let clamped = level !== effortLevel;
  let persist = shouldPersist && !clamped;
  let persistable = toPersistableEffort(level);
  if (isRemoteControlChannelAvailable() && persistable === undefined)
    return {
      message: `${level} is session-scoped and won't reach the remote process. Use low, medium, high, or xhigh instead.`,
    };
  let saved = persistEffortSetting(level, model, persist, options);
  ultracodeConfirmed?.({
    value: level,
  });
  let ultracodeConfirmed_2 = readUltracodeConfirmed(state);
  let ultracodeTurnedOff = ultracodeConfirmed_2 === false && state.ultracode === true;
  if (ultracodeConfirmed_2 !== undefined && ultracodeConfirmed_2 !== (state.ultracode === true))
    ultracodeConfirmed?.({
      ultracode: ultracodeConfirmed_2,
    });
  let remoteApplied = forwardEffortToRemote(persistable ?? null, ultracodeConfirmed_2);
  let persisted = await saved;
  if (persisted)
    return {
      message: `Failed to set effort level: ${persisted.message}`,
    };
  logEvent("tengu_effort_command", {
    effort: typeof level === "number" ? level : fromEnum(level),
    from_level: fromEnumOpt(getEffortLevelIfSupported(model, state.effort)),
    route: fromEnum(state.route),
    is_remote: getRemoteCaps() !== null,
  });
  let envOverride = getRemoteCaps() ? undefined : getEffortEnvOverride();
  if (envOverride !== undefined && envOverride !== level) {
    let envRaw = env.CLAUDE_CODE_EFFORT_LEVEL;
    if (persistable === undefined)
      return {
        message: `Not applied: CLAUDE_CODE_EFFORT_LEVEL=${envRaw} overrides effort this session, and ${effortValueToString(level)} is session-only (nothing saved)`,
        effortUpdate: {
          value: level,
        },
      };
    return {
      message: `CLAUDE_CODE_EFFORT_LEVEL=${envRaw} overrides this session \u2014 clear it and ${effortValueToString(level)} takes over`,
      effortUpdate: {
        value: level,
      },
    };
  }
  let description = getEffortValueDescription(level);
  let orgOverriddenEffort = getOrgOverriddenEffort(model);
  let result =
    persistable !== undefined && persist && !getRemoteCaps()
      ? orgOverriddenEffort !== null
        ? ` (saved, though your organization starts new sessions on ${model} at ${orgOverriddenEffort} effort)`
        : " (saved as your default for new sessions)"
      : " (this session only)";
  if (clamped)
    return {
      message: `Effort '${effortLevel}' exceeds the cap for ${model} set by your settings or organization; set to '${level}' instead${result}: ${description}${ultracodeTurnedOff ? " \xB7 Ultracode off" : ""}${remoteApplied ?? ""}`,
      effortUpdate: {
        value: level,
      },
    };
  return {
    message: `Set effort level to ${effortValueToString(level)}${result}: ${description}${ultracodeTurnedOff ? " \xB7 Ultracode off" : ""}${remoteApplied ?? ""}`,
    effortUpdate: {
      value: level,
    },
  };
}
//@ chunk-5dqwe9kx.js:3672-3737 layout
function effectiveEffortOverride(model) {
  let envOverride = getRemoteCaps() ? undefined : getEffortEnvOverride();
  return envOverride === null ? undefined : (envOverride ?? model);
}
//@ chunk-5dqwe9kx.js:3737-3843 layout
/**
 * 判断是否把 effort 保存为默认值：要求以默认值方式设置，且等级有变化或模型带有可沿用的 effort。
 */
function shouldSaveEffortDefault({ asDefault, levelChanged, chosen, model }) {
  return (
    asDefault &&
    (levelChanged || effectiveEffortOverride(chosen) !== undefined || carriedEffortOnly(model) === undefined)
  );
}
//@ chunk-5dqwe9kx.js:3843-4201 fingerprint (2.1.88 match: showCurrentEffort, 0.571)
function showCurrentEffort(currentLevel, model, ultracode) {
  let ultracodeSuffix = isUltracodeActive(ultracode, model) ? " \xB7 Ultracode on" : "";
  let effectiveValue = effectiveEffortOverride(currentLevel);
  if (effectiveValue === undefined) {
    let level = getAppliedEffortLevel(model, currentLevel);
    if (level === undefined)
      return {
        message: `Effort level: auto${ultracodeSuffix}`,
      };
    let lines =
      getOrgDefaultEffort(model) !== null && carriedEffortOnly(model) === undefined
        ? ", set by your organization"
        : "";
    return {
      message: `Effort level: auto (currently ${effortValueToString(level)}${lines})${ultracodeSuffix}`,
    };
  }
  let description = getEffortValueDescription(effectiveValue);
  return {
    message: `Current effort level: ${effortValueToString(effectiveValue)} (${description})${ultracodeSuffix}`,
  };
}
//@ chunk-5dqwe9kx.js:4201-4979 fingerprint (2.1.88 match: unsetEffortLevel, 0.605)
async function unsetEffortLevel(state, shouldPersist, ultracodeConfirmed, options) {
  ultracodeConfirmed?.({
    value: undefined,
  });
  let ultracodeConfirmed_2 = readUltracodeConfirmed(state);
  let ultracodeTurnedOff = ultracodeConfirmed_2 === false && state.ultracode === true;
  if (ultracodeConfirmed_2 !== undefined && ultracodeConfirmed_2 !== (state.ultracode === true))
    ultracodeConfirmed?.({
      ultracode: ultracodeConfirmed_2,
    });
  let remoteApplied = forwardEffortToRemote(null, ultracodeConfirmed_2);
  let persisted = await persistEffortSetting(undefined, getMainLoopModel(), shouldPersist, options);
  if (persisted)
    return {
      message: `Failed to set effort level: ${persisted.message}`,
    };
  logEvent("tengu_effort_command", {
    effort: lit("auto"),
    from_level: fromEnumOpt(getEffortLevelIfSupported(getMainLoopModel(), state.effort)),
    route: fromEnum(state.route),
    is_remote: getRemoteCaps() !== null,
  });
  let sessionSuffix = shouldPersist ? "" : " (this session only)";
  let envOverride = getRemoteCaps() ? undefined : getEffortEnvOverride();
  if (envOverride !== undefined && envOverride !== null) {
    let envRaw = env.CLAUDE_CODE_EFFORT_LEVEL;
    return {
      message: `${shouldPersist ? "Cleared effort from settings, but" : "Effort set to auto for this session, but"} CLAUDE_CODE_EFFORT_LEVEL=${envRaw} still controls this session`,
      effortUpdate: {
        value: undefined,
      },
    };
  }
  return {
    message: `Effort level set to auto${sessionSuffix}${ultracodeTurnedOff ? " \xB7 Ultracode off" : ""}${remoteApplied ?? ""}`,
    effortUpdate: {
      value: undefined,
    },
  };
}
//@ chunk-5dqwe9kx.js:4979-5617 layout
function setUltracode(ultracodeArg, state, options) {
  let mainLoopModel = getMainLoopModel();
  if (ultracodeArg && !isUltracodeAvailable())
    return {
      message: `Ultracode needs dynamic workflows enabled (see /config). Valid options are: ${formatValidEffortOptions(mainLoopModel)}`,
    };
  if (ultracodeArg && !isUltracodeAvailable(mainLoopModel))
    return {
      message: `Ultracode isn't available on ${mainLoopModel}. Valid options are: ${formatValidEffortOptions(mainLoopModel)}`,
    };
  options?.({
    ultracode: ultracodeArg,
  });
  let applied = forwardApplyFlagSettings({
    ultracode: ultracodeArg,
  });
  logEvent("tengu_effort_command", {
    effort: ultracodeArg ? lit("ultracode") : lit("ultracode_off"),
    from_level: fromEnumOpt(getEffortLevelIfSupported(mainLoopModel, state.effort)),
    route: fromEnum(state.route),
    is_remote: getRemoteCaps() !== null,
  });
  let result =
    noEffortHint(state.effort, mainLoopModel) ??
    effectiveEffortOverride(state.effort) ??
    getAppliedEffortLevel(mainLoopModel, state.effort) ??
    "auto";
  return {
    message: ultracodeArg
      ? `Ultracode on (this session only): ${ULTRACODE_DESCRIPTION}. Effort stays ${result}.${applied ?? ""}`
      : `Ultracode off. Effort stays ${result}.${applied ?? ""}`,
    effortUpdate: {
      ultracode: ultracodeArg,
    },
  };
}
//@ chunk-5dqwe9kx.js:5617-5758 layout
function parseUltracodeArg(normalized) {
  let [first, second, ...rest] = normalized.split(/\s+/);
  if (first !== "ultracode" || rest.length > 0) return;
  if (second === undefined || second === "on") return true;
  return second === "off" ? false : undefined;
}
//@ chunk-5dqwe9kx.js:5758-5988 fingerprint (2.1.88 match: executeEffort, 0.503)
async function executeEffort(state, shouldPersist, ultracodeConfirmed = true, options, appState) {
  let normalized = state.toLowerCase();
  if (getEffortEnvOverride_2(state))
    return unsetEffortLevel(shouldPersist, ultracodeConfirmed, options, appState);
  let ultracodeArg = parseUltracodeArg(normalized);
  if (ultracodeArg !== undefined) return setUltracode(ultracodeArg, shouldPersist, options);
  let effortLevel = parseEffortLevel(state);
  if (!effortLevel)
    return {
      message: `Invalid argument: ${state}. Valid options are: ${formatValidEffortOptions(getMainLoopModel())}`,
    };
  return setEffortValue(effortLevel, shouldPersist, ultracodeConfirmed, options, appState);
}
//@ chunk-5dqwe9kx.js:5988-6565 placement
async function applyEffortCommand(state, shouldPersist, setAppState, ultracodeConfirmed = true, appState) {
  let succeeded = false;
  let result = null;
  let outcome = await executeEffort(
    state,
    shouldPersist,
    ultracodeConfirmed,
    (outcome) => {
      succeeded = true;
      if (outcome.ultracode === undefined) releaseCarriedEffortForEffortChange();
      setAppState((prev) => {
        result ??= {
          sessionEffort: prev.sessionEffort,
          ultracode: prev.ultracode ?? false,
        };
        let nextEffort =
          outcome.ultracode === undefined ? toEffortSettingOrDefault(outcome.value) : prev.sessionEffort;
        let ultracode = outcome.ultracode ?? prev.ultracode ?? false;
        if (isSameEffortSetting(prev.sessionEffort, nextEffort) && (prev.ultracode ?? false) === ultracode)
          return prev;
        return {
          ...prev,
          sessionEffort: nextEffort,
          ultracode,
        };
      });
    },
    appState,
  );
  if (succeeded && !outcome.effortUpdate)
    setAppState((prev) => {
      if (result === null) return prev;
      if (
        isSameEffortSetting(prev.sessionEffort, result.sessionEffort) &&
        (prev.ultracode ?? false) === result.ultracode
      )
        return prev;
      return {
        ...prev,
        sessionEffort: result.sessionEffort,
        ultracode: result.ultracode,
      };
    });
  return outcome;
}
//@ chunk-1mh58gcg.js:3971-4510 placement
/**
 * /effort 命令：help 显示用法，current/status 显示当前等级，无参数显示可选等级，否则解析等级（含 auto、ultracode on/off）并应用。
 */
async function effortCommandCall(args, context) {
  let trimmed = args.trim();
  let appState = context.getAppState();
  let model = parseUserSpecifiedModel(
    appState.mainLoopModelForSession ?? appState.mainLoopModel ?? getDefaultMainLoopModelSetting(),
  );
  if (COMMON_HELP_ARGS.includes(trimmed))
    return {
      type: "text",
      value: getEffortUsage(),
    };
  if (trimmed === "current" || trimmed === "status") {
    let { message } = showCurrentEffort(getEffortValue(context), model, appState.ultracode);
    return {
      type: "text",
      value: message,
    };
  }
  if (!trimmed)
    return {
      type: "text",
      value: `Usage: /effort <${getAllowedEffortLevels(model).join("|")}|auto${isUltracodeAvailable(model) ? "|ultracode [on|off]" : ""}>`,
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
//@ chunk-n2cdp9nk.js:16055-16148 callgraph-witnessed (2.1.88 match: ShowCurrentEffort, 1)
function ShowCurrentEffort(t0) {
  let { onDone } = t0;
  let currentLevel = useQueuedMessageText();
  let effortValue = useAppState(selectUltracode);
  let model = useMainLoopModel();
  let { message } = showCurrentEffort(currentLevel, model, effortValue);
  onDone(message);
  return null;
}
//@ chunk-n2cdp9nk.js:33778-34016 fingerprint (2.1.88 match: call, 0.889)
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
    onDone: (result) => onDone(result),
    getMessages: () => context.getMessages?.() ?? context.messages,
    storageV5: context.storageV5,
  });
}
export {
  applyEffortCommand,
  ApplyEffortAndClose,
  isUltracodeToggleAvailable,
  shouldSaveEffortDefault,
  ULTRACODE_DESCRIPTION,
  effortCommandCall,
  call,
};
