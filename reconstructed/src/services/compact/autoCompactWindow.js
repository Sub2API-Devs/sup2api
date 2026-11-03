/**
 * services/compact/autoCompactWindow.ts
 *
 * 2.1.316 新增：自动压缩窗口大小的解析（实验、模型默认、用户设置）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (46)
 * attribution: placement 46
 */
import { parseIntLoose } from "../../utils/envUtils.js";
import { TRANSPORT_LABELS, GLOBAL_CONFIG_FIELD_KINDS } from "../../utils/config.js";
import { logFeatureOk, logFeatureSad, logFeatureBad } from "../analytics/featureTelemetry.js";
import { logForDebugging } from "../../utils/debug.js";
import { truncateToLength, plural } from "../../utils/stringUtils.js";
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import { getEffortSettingsSources, getModelSettingsKey } from "../../utils/effort.js";
import { getRootSession, getIsNonInteractiveSession, getSdkBetas } from "../../bootstrap/state.js";
import { xr } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { pickByHelper } from "../../utils/git/gitSafeEnv.js";
import { isPlainObject as isPlainObject_4 } from "../../utils/objectUtils.js";
import { logError } from "../../utils/log.js";
import { toError } from "../../utils/errors.js";
import { isAutoCompactEnabled, isSideQuerySource, canCompactInRemote } from "./compactSettings.js";
import {
  CLAUDE_OPUS_4_8,
  getAnthropicApiFallbackModel,
  getAutoCompactDisabledByEnvModel,
  getAutoCompactWindow,
} from "./autoCompact.js";
import { env } from "../../utils/env.js";
import { resolveSurfaceWindow } from "../../utils/model/modelContextInfo.js";
import { is1mContextDisabled, DEFAULT_CONTEXT_WINDOW } from "../../utils/model/contextWindow1m.js";
import { isOver1mThreshold } from "../../utils/model/configs.js";
import { SECONDARY_CONTEXT_WINDOW } from "../../utils/model/model.js";
import { isUnresolvedInferenceProfile } from "../../utils/model/bedrock.js";
import { claimOnceStore, claimOnce } from "../api/verificationRequired.js";
import { logEvent } from "../analytics/index.js";
import { telemetrySafeModelName } from "../../utils/model/telemetryModelName.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";

//@ chunk-e6aww6q8.js:1543002-1543413 placement
/**
 * 解析窗口大小（支持 k/m 后缀，可把 100–1000 视为千），返回 in_range/below_minimum/above_maximum/unusable。
 */
function parseWindowSize(e, { bareThousands }) {
  let trimmed = e.trim();
  let lower = trimmed.slice(-1).toLowerCase();
  let h = lower === "m" ? 1e6 : lower === "k" ? 1000 : undefined;
  let y = h === undefined ? parseIntLoose(trimmed) : parseFloat(trimmed) * h;
  let w = bareThousands && h === undefined && y >= 100 && y <= 1000 ? y * 1000 : y;
  if (Number.isNaN(w) || w < 1)
    return {
      kind: "unusable",
    };
  if (w < TRANSPORT_LABELS)
    return {
      kind: "below_minimum",
      tokens: Math.min(TRANSPORT_LABELS - 1, Math.round(w)),
    };
  if (w > GLOBAL_CONFIG_FIELD_KINDS)
    return {
      kind: "above_maximum",
    };
  return {
    kind: "in_range",
    tokens: Math.round(w),
    suffixed: h !== undefined,
  };
}
//@ chunk-e6aww6q8.js:1543413-1543592 placement
/**
 * CLAUDE_CODE_AUTO_COMPACT_WINDOW 的有效值（越界时夹到上下限）。
 */
function envWindowTokens(e) {
  if (e === undefined) return;
  let windowSizeStrict = parseWindowSizeStrict(e);
  switch (windowSizeStrict.kind) {
    case "in_range":
      return windowSizeStrict.tokens;
    case "below_minimum":
      return TRANSPORT_LABELS;
    case "above_maximum":
      return GLOBAL_CONFIG_FIELD_KINDS;
    case "unusable":
      return;
  }
}
//@ chunk-e6aww6q8.js:1543592-1543688 placement
/**
 * 校验自动压缩窗口的环境变量取值，非法时返回说明。
 */
function reportInvalidWindowEnv(e) {
  if (e === undefined) return null;
  let windowSizeStrict = parseWindowSizeStrict(e);
  return windowSizeStrict.kind === "in_range" ? null : describeAutoCompactWindowEnvError(e, windowSizeStrict);
}
//@ chunk-e6aww6q8.js:1543688-1544178 placement
/**
 * 校验并记录环境变量窗口设置，无效时警告（无头模式输出）。
 */
function reportEnvWindow(e, n) {
  if (e === undefined) return;
  let windowSizeStrict = parseWindowSizeStrict(e);
  switch (windowSizeStrict.kind) {
    case "in_range":
      logFeatureOk("compact_window_env", {
        shorthand: windowSizeStrict.suffixed,
      });
      return;
    case "below_minimum":
      logFeatureSad(
        "compact_window_env",
        parseWindowSize(e, {
          bareThousands: true,
        }).kind === "in_range"
          ? "below_minimum_flag_accepts"
          : "below_minimum",
      );
      break;
    case "above_maximum":
      logFeatureSad("compact_window_env", "above_maximum");
      break;
    case "unusable":
      logFeatureBad("compact_window_env", "unusable");
      break;
  }
  let s = describeAutoCompactWindowEnvError(e, windowSizeStrict);
  if (n.interactive) {
    logForDebugging(`[autocompact] ${s}`, {
      level: "warn",
    });
    return;
  }
  n.headless(s);
}
//@ chunk-e6aww6q8.js:1544178-1544227 placement
/**
 * 严格解析窗口大小（不允许裸千位数写法）。
 */
function parseWindowSizeStrict(e) {
  return parseWindowSize(e, {
    bareThousands: false,
  });
}
//@ chunk-e6aww6q8.js:1544227-1544238 placement
/**
 * 报错时回显环境变量值的最大字符数（32）。
 */
var MAX_ECHOED_ENV_CHARS = 32;
//@ chunk-e6aww6q8.js:1544238-1544828 placement
/**
 * CLAUDE_CODE_AUTO_COMPACT_WINDOW 取值无效时的说明。
 */
function describeAutoCompactWindowEnvError(e, windowSizeStrict) {
  let s = `CLAUDE_CODE_AUTO_COMPACT_WINDOW="${truncateToLength(e, MAX_ECHOED_ENV_CHARS).replace(/[^\w.,+ $%{}=;-]+/g, "?")}${e.length > MAX_ECHOED_ENV_CHARS ? "\u2026" : ""}"`;
  let h = `${TRANSPORT_LABELS / 1000}k`;
  let y = `${GLOBAL_CONFIG_FIELD_KINDS / 1e6}M`;
  let S = `Set it to a size from ${h} to ${y}, such as 200k or 200000, or unset it.`;
  switch (windowSizeStrict.kind) {
    case "below_minimum":
      return `${s} reads as ${windowSizeStrict.tokens.toLocaleString("en-US")} ${plural(windowSizeStrict.tokens, "token")}, so Claude Code treats it as the ${h} minimum. ${S}`;
    case "above_maximum":
      return `${s} is too large, so Claude Code treats it as the ${y} maximum. ${S}`;
    case "unusable":
      return `${s} isn't a usable size, so Claude Code ignores it. ${S}`;
  }
}
//@ chunk-e6aww6q8.js:1544828-1544842 placement
/**
 * 自动压缩窗口的最小 token 数（13000）。
 */
var MIN_WINDOW_TOKENS = 13000;
//@ chunk-e6aww6q8.js:1544842-1544863 placement
/**
 * 预计算压缩触发点默认比例（0.2）。
 */
var MAX_WINDOW_TOKENS = 3000;
var DEFAULT_PRECOMPUTE_FRACTION = 0.2;
//@ chunk-e6aww6q8.js:1544863-1544944 placement
/**
 * 把值转成 0≤x<1 的比例，否则 null。
 */
function ratioOrNull(e) {
  return typeof e === "number" && Number.isFinite(e) && e >= 0 && e < 1 ? e : null;
}
//@ chunk-e6aww6q8.js:1544944-1545086 placement
/**
 * 解析 {repl, sdk} 比例对。
 */
function parseFractionPair(e) {
  if (typeof e !== "object" || e === null) return null;
  let n = e;
  let r = ratioOrNull(n.repl);
  let s = ratioOrNull(n.sdk);
  return r === null || s === null
    ? null
    : {
        repl: r,
        sdk: s,
      };
}
//@ chunk-e6aww6q8.js:1545086-1545444 placement
/**
 * 解析预计算比例表（按窗口大小与 default）。
 */
function parsePrecomputeTable(featureValue_CACHED_MAY_BE_STALE) {
  if (
    typeof featureValue_CACHED_MAY_BE_STALE !== "object" ||
    featureValue_CACHED_MAY_BE_STALE === null ||
    Array.isArray(featureValue_CACHED_MAY_BE_STALE)
  )
    return null;
  let n = [];
  let r = null;
  for (let [key, value] of Object.entries(featureValue_CACHED_MAY_BE_STALE)) {
    let fractionPair = parseFractionPair(value);
    if (fractionPair === null) return null;
    if (key === "default") {
      r = fractionPair;
      continue;
    }
    let S = Number(key);
    if (!Number.isSafeInteger(S) || S <= 0) return null;
    n.push({
      windowSize: S,
      ...fractionPair,
    });
  }
  if (n.length === 0 && r === null) return null;
  return {
    entries: n,
    defaultEntry: r,
  };
}
//@ chunk-e6aww6q8.js:1545444-1545621 placement
/**
 * 在比例表中按窗口精确匹配或取默认项。
 */
function lookupPrecomputeEntry(precomputeTable, n) {
  let found = precomputeTable.entries.find((entry) => entry.windowSize === n);
  if (found !== undefined)
    return {
      kind: "exact",
      entry: found,
    };
  return precomputeTable.defaultEntry === null
    ? null
    : {
        kind: "default",
        entry: precomputeTable.defaultEntry,
      };
}
//@ chunk-e6aww6q8.js:1545621-1545760 placement
/**
 * 自动压缩阈值：窗口减 13000（测试百分比覆盖时取更小值）。
 */
function autocompactThreshold(e, n) {
  let r = e - 13000;
  let testPctOverride = n.testPctOverride;
  if (
    testPctOverride !== undefined &&
    !isNaN(testPctOverride) &&
    testPctOverride > 0 &&
    testPctOverride <= 100
  )
    return Math.min(Math.floor(e * (testPctOverride / 100)), r);
  return r;
}
//@ chunk-e6aww6q8.js:1545760-1545846 placement
/**
 * 预计算压缩的触发阈值（窗口减缓冲，且不超过自动压缩阈值）。
 */
function precomputeTriggerThreshold(e, autoCompactThresholdConfig) {
  return Math.min(
    e - Math.round(e * autoCompactThresholdConfig.precomputeBufferFraction),
    autocompactThreshold(e, autoCompactThresholdConfig),
  );
}
//@ chunk-e6aww6q8.js:1545846-1546169 placement
/**
 * 按 token 数计算警告等级：blocked / compact / warn / ok 与剩余百分比。
 */
function computeTokenWarning(e, n, r, effectiveContextWindow = n, threshold) {
  let y = threshold ?? autocompactThreshold(n, r);
  let S = r.enabled ? y : n;
  let w = S - 20000;
  let testBlockingOverride = r.testBlockingOverride;
  let G =
    testBlockingOverride !== undefined && !isNaN(testBlockingOverride) && testBlockingOverride > 0
      ? testBlockingOverride
      : effectiveContextWindow - 3000;
  let pctLeft = Math.max(0, Math.round(((S - e) / S) * 100));
  if (e >= G)
    return {
      level: "blocked",
      pctLeft,
    };
  if (r.enabled && e >= y)
    return {
      level: "compact",
      pctLeft,
    };
  if (e >= w)
    return {
      level: "warn",
      pctLeft,
    };
  return {
    level: "ok",
  };
}
//@ chunk-e6aww6q8.js:1546169-1546227 placement
/**
 * 判断窗口对象是否带 ceiling 字段。
 */
function isWindowWithCeiling(e) {
  return typeof e === "object" && "ceiling" in e;
}
//@ chunk-e6aww6q8.js:1546227-1546274 placement
/**
 * 按会话根保存的自动压缩窗口状态（各模型窗口 + sink）。
 */
var sessionWindowState = new SessionRootSlot(() => ({
  windows: {},
  sink: undefined,
}));
//@ chunk-e6aww6q8.js:1546274-1546488 placement
/**
 * 设置来源列表，插入会话下发的按模型窗口。
 */
function windowSettingSources() {
  let effortSettingsSources = getEffortSettingsSources();
  let n = sessionWindowState.peek(getRootSession());
  if (n === undefined) return effortSettingsSources;
  return effortSettingsSources.toSpliced(effortSettingsSources[0]?.source === "userSettings" ? 1 : 0, 0, {
    source: "userSettings",
    settings: {
      modelSettings: xr(n.windows, (autoCompactWindow) => ({
        autoCompactWindow,
      })),
    },
  });
}
//@ chunk-e6aww6q8.js:1546488-1546854 placement
/**
 * 合并各来源的 autoCompactWindow（默认值与按模型）。
 */
function readAutoCompactWindowSetting() {
  let e = {
    default: undefined,
    byModel: {},
  };
  for (let { settings } of windowSettingSources()) {
    let r = {};
    for (let [key, value] of Object.entries(settings.modelSettings ?? {})) {
      let autoCompactWindow = value?.autoCompactWindow;
      if (autoCompactWindow === undefined) continue;
      let modelSettingsKey = getModelSettingsKey(key);
      if (key === modelSettingsKey || !Object.hasOwn(r, modelSettingsKey))
        r[modelSettingsKey] = autoCompactWindow;
    }
    e =
      settings.autoCompactWindow === undefined
        ? {
            default: e.default,
            byModel: {
              ...e.byModel,
              ...r,
            },
          }
        : {
            default: settings.autoCompactWindow,
            byModel: r,
          };
  }
  return e;
}
//@ chunk-e6aww6q8.js:1546854-1546924 placement
/**
 * 解析窗口参数：undefined 用设置，auto 用默认。
 */
function resolveWindowArg(autocompact) {
  if (autocompact === undefined) return readAutoCompactWindowSetting();
  return autocompact === "auto" ? undefined : autocompact;
}
//@ chunk-e6aww6q8.js:1546924-1547283 placement
/**
 * 找某模型生效的窗口设置及其来源、是否按模型。
 */
function findWindowSettingForModel(e) {
  for (let { source, settings } of windowSettingSources().toReversed()) {
    let s;
    for (let [key, value] of Object.entries(settings.modelSettings ?? {})) {
      let autoCompactWindow = value?.autoCompactWindow;
      if (autoCompactWindow === undefined || getModelSettingsKey(key) !== e) continue;
      if (key === e) {
        s = autoCompactWindow;
        break;
      }
      s ??= autoCompactWindow;
    }
    if (s !== undefined)
      return {
        source,
        window: s,
        perModel: true,
      };
    if (settings.autoCompactWindow !== undefined)
      return {
        source,
        window: settings.autoCompactWindow,
        perModel: false,
      };
  }
  return;
}
//@ chunk-e6aww6q8.js:1547283-1547689 placement
/**
 * 采用会话内部元数据中的 auto_compact_windows。
 */
function adoptInternalWindows(e, restoredWorkerState, sink, s) {
  if (restoredWorkerState === null || restoredWorkerState.readFailed === true) return;
  try {
    let h = sessionWindowState.of(e);
    h.sink = sink;
    let autoCompactWindows = restoredWorkerState.internal?.auto_compact_windows;
    h.windows = pickByHelper(
      isPlainObject_4(autoCompactWindows) ? autoCompactWindows : {},
      (S, w) =>
        !Object.hasOwn(Object.prototype, w) &&
        (S === "auto" ||
          (typeof S === "number" &&
            Number.isInteger(S) &&
            S >= TRANSPORT_LABELS &&
            S <= GLOBAL_CONFIG_FIELD_KINDS)),
    );
    if (Object.keys(h.windows).length === 0) return;
    s((S) =>
      typeof S.autoCompactWindow === "object"
        ? {
            ...S,
            autoCompactWindow: readAutoCompactWindowSetting(),
          }
        : S,
    );
  } catch (error) {
    logError(toError(error));
  }
}
//@ chunk-e6aww6q8.js:1547689-1547913 placement
/**
 * 把某模型的窗口设置写回会话内部元数据。
 */
function persistSessionWindow(settingsKey, n) {
  let r = sessionWindowState.peek(getRootSession());
  if (r?.sink === undefined || Object.hasOwn(Object.prototype, settingsKey)) return;
  try {
    r.windows = {
      ...r.windows,
      [settingsKey]: n,
    };
    r.sink.notifyInternalMetadataChanged({
      auto_compact_windows: r.windows,
    });
  } catch (error) {
    logError(toError(error));
  }
}
//@ chunk-e6aww6q8.js:1547913-1547927 placement
/**
 * 输出 token 预算的上限（20000）。
 */
var MAX_OUTPUT_TOKENS_CAP = 20000;
//@ chunk-e6aww6q8.js:1547927-1548066 placement
/**
 * 解析窗口参数（auto 或 token 数）。
 */
function parseWindowArgument(e) {
  if (e.trim().toLowerCase() === "auto") return "auto";
  let windowSize = parseWindowSize(e, {
    bareThousands: true,
  });
  return windowSize.kind === "in_range" ? windowSize.tokens : undefined;
}
//@ chunk-e6aww6q8.js:1548066-1548205 placement
/**
 * 特定模型在交互会话中的窗口覆盖值。
 */
function desktopOpusWindowOverride(canonical) {
  if (!isAutoCompactEnabled()) return;
  if (getIsNonInteractiveSession()) return;
  if (canonical !== CLAUDE_OPUS_4_8) return;
  let anthropicApiFallbackModel = getAnthropicApiFallbackModel();
  if (!anthropicApiFallbackModel) return;
  let windowArgument = parseWindowArgument(anthropicApiFallbackModel);
  return typeof windowArgument === "number" ? windowArgument : undefined;
}
//@ chunk-e6aww6q8.js:1548205-1548256 placement
/**
 * Claude Desktop 入口参数到窗口大小的映射（600k/500k）。
 */
var DESKTOP_WINDOW_BY_ARG = new Map([
  ["600k", 600000],
  ["500k", 500000],
]);
//@ chunk-e6aww6q8.js:1548256-1548431 placement
/**
 * Claude Desktop 入口按界面取默认窗口。
 */
function desktopSurfaceWindow(e) {
  if (env.CLAUDE_CODE_ENTRYPOINT !== "claude-desktop") return;
  if (!isAutoCompactEnabled()) return;
  if (e.longContextWindowWithoutOptIn < ONE_MILLION_TOKENS || e.contextWindow < ONE_MILLION_TOKENS) return;
  return DESKTOP_WINDOW_BY_ARG.get(getAutoCompactDisabledByEnvModel());
}
//@ chunk-e6aww6q8.js:1548431-1548479 placement
/**
 * 按模型与界面解析默认窗口（先看桌面版 Opus 覆盖）。
 */
function resolveDesktopWindow(e) {
  return desktopOpusWindowOverride(e.canonical) ?? desktopSurfaceWindow(e);
}
//@ chunk-e6aww6q8.js:1548479-1548602 placement
/**
 * 1M token 常量与按模型/界面的默认窗口表。
 */
var ONE_MILLION_TOKENS = 1e6;
var SURFACE_WINDOW_DEFAULTS = {
  "claude-sonnet-5": {
    surfaces: {
      remote_cowork: {
        default: 500000,
      },
      "local-agent": {
        default: 500000,
      },
    },
    default: ONE_MILLION_TOKENS,
  },
};
//@ chunk-e6aww6q8.js:1548602-1548685 placement
/**
 * 按界面取默认窗口（仅当自动压缩开启）。
 */
function defaultSurfaceWindow(canonical) {
  if (!isAutoCompactEnabled()) return;
  if (!Object.hasOwn(SURFACE_WINDOW_DEFAULTS, canonical)) return;
  return resolveSurfaceWindow(SURFACE_WINDOW_DEFAULTS[canonical]);
}
//@ chunk-e6aww6q8.js:1549181-1550223 placement
/**
 * 解析自动压缩窗口大小，来源依次为客户端数据、实验、模型默认与用户设置。
 */
function resolveAutoCompactWindow(e, n = getSdkBetas()) {
  let { model, contextWindow, canonical } = e;
  let y = isAutoCompactEnabled()
    ? e.clientDataAutoCompactWindow
    : {
        window: null,
        replacesDefault: false,
      };
  if (y.window !== null)
    return {
      window: Math.min(contextWindow, y.window),
      configured: y.window,
      source: "clientdata",
    };
  let desktopWindow = resolveDesktopWindow(e);
  if (desktopWindow !== undefined)
    return {
      window: Math.min(contextWindow, desktopWindow),
      configured: desktopWindow,
      source: "experiment",
    };
  let w =
    is1mContextDisabled() &&
    Math.max(e.apiContextWindowWithoutOptIn, e.servedWindow?.declared ?? 0) > DEFAULT_CONTEXT_WINDOW
      ? DEFAULT_CONTEXT_WINDOW
      : isOver1mThreshold(model, n)
        ? SECONDARY_CONTEXT_WINDOW
        : undefined;
  if (w !== undefined && contextWindow < 1e6)
    return {
      window: Math.min(contextWindow, w),
      configured: w,
      source: "model-default",
    };
  let L = y.replacesDefault ? undefined : defaultSurfaceWindow(canonical);
  if (L !== undefined)
    return {
      window: Math.min(contextWindow, L),
      configured: L,
      source: "model-default",
    };
  if (contextWindow < e.apiContextWindowWithoutOptIn)
    return {
      window: contextWindow,
      configured: contextWindow,
      source: "model-default",
    };
  if (
    e.longContextWindowWithoutOptIn > 0 &&
    contextWindow >= e.longContextWindowWithoutOptIn &&
    !y.replacesDefault &&
    isAutoCompactEnabled()
  )
    return {
      window: contextWindow,
      configured: contextWindow,
      source: "model-default",
    };
  if (
    isAutoCompactEnabled() &&
    !env.CLAUDE_CODE_DISABLE_UNKNOWN_MODEL_WINDOW_ENFORCEMENT &&
    isUnrecognizedModelWindow(e)
  )
    return {
      window: contextWindow,
      configured: contextWindow,
      source: "unknown-model",
    };
  return {
    window: contextWindow,
    configured: contextWindow,
    source: "auto",
  };
}
//@ chunk-e6aww6q8.js:1550223-1550371 placement
/**
 * 模型未被识别（无 1M 授权、服务器声明窗口与本地不一致）时为真。
 */
function isUnrecognizedModelWindow(e) {
  return (
    !e.optIn1mHonored &&
    !isUnresolvedInferenceProfile(e.model) &&
    (e.servedWindow === undefined || e.servedWindow.believed !== e.servedWindow.declared) &&
    !e.recognized
  );
}
//@ chunk-e6aww6q8.js:1550615-1550664 placement
/**
 * 窗口来源是否为 env 或 settings（即用户显式设置）。
 */
function isEnvOrSettingsSource(source) {
  return source === "env" || source === "settings";
}
//@ chunk-e6aww6q8.js:1550664-1550919 placement
/**
 * 自动压缩窗口是否使用了长上下文（实验或超过未开通窗口）。
 */
function usesLongContextWindow(querySource, n, autoCompactWindow) {
  if (!isSideQuerySource(querySource) || !canCompactInRemote()) return false;
  let autoCompactWindow_2 = getAutoCompactWindow(n, autoCompactWindow);
  return (
    !isEnvOrSettingsSource(autoCompactWindow_2.source) &&
    ((autoCompactWindow_2.source === "experiment" && desktopOpusWindowOverride(n.canonical) === undefined) ||
      (n.longContextWindowWithoutOptIn > 0 &&
        autoCompactWindow_2.window >=
          Math.max(n.longContextWindowWithoutOptIn, n.apiContextWindowWithoutOptIn)))
  );
}
//@ chunk-e6aww6q8.js:1550919-1550968 placement
/**
 * 该模型是否使用了显式窗口（来源不是 auto）。
 */
function hasExplicitWindow(e, autoCompactWindow) {
  return getAutoCompactWindow(e, autoCompactWindow).source !== "auto";
}
//@ chunk-e6aww6q8.js:1550968-1551008 placement
/**
 * 返回窗口来源（auto/env/settings/experiment 等）。
 */
function windowSource(e, autoCompactWindow) {
  return getAutoCompactWindow(e, autoCompactWindow).source;
}
//@ chunk-e6aww6q8.js:1551008-1551139 placement
/**
 * 窗口来源到遥测 origin 的映射。
 */
var WINDOW_SOURCE_ORIGINS = {
  env: "env",
  clientdata: "server",
  experiment: "experiment",
  "model-default": "default",
  "unknown-model": "default",
  auto: "default",
};
//@ chunk-e6aww6q8.js:1551139-1551499 placement
/**
 * 窗口大小及其来源（设置区分会话覆盖、agent 定义、按模型或顶层）。
 */
function resolveWindowOrigin(e, autoCompactWindow) {
  let { window: r, source } = getAutoCompactWindow(e, autoCompactWindow);
  if (source !== "settings")
    return {
      window: r,
      origin: WINDOW_SOURCE_ORIGINS[source],
    };
  if (isWindowWithCeiling(autoCompactWindow)) {
    let windowOrigin = resolveWindowOrigin(e, autoCompactWindow.inner);
    return windowOrigin.window === r
      ? windowOrigin
      : {
          window: r,
          origin: "agent_definition",
        };
  }
  if (typeof autoCompactWindow !== "object")
    return {
      window: r,
      origin: "session_override",
    };
  return {
    window: r,
    origin: Object.hasOwn(autoCompactWindow.byModel, e.settingsKey)
      ? "settings_per_model"
      : "settings_top_level",
  };
}
//@ chunk-e6aww6q8.js:1551499-1551807 placement
/**
 * 生效窗口变化时记 tengu_auto_compact_window_in_force。
 */
function logWindowInForce(session, n, autoCompactWindow) {
  let s = windowSource(n, autoCompactWindow);
  let { window: h, origin } = resolveWindowOrigin(n, autoCompactWindow);
  if (
    !claimOnceStore
      .of(session.host)
      .claimIfChanged(`auto_compact_window_in_force:${session.id}`, `${n.settingsKey}|${h}|${origin}|${s}`)
  )
    return;
  logEvent("tengu_auto_compact_window_in_force", {
    window_model: telemetrySafeModelName(n.settingsKey),
    window_tokens: h,
    window_origin: fromEnum(origin),
    threshold_source: fromEnum(s),
  });
}
//@ chunk-e6aww6q8.js:1551807-1551908 placement
/**
 * 有效上下文窗口：自动压缩窗口减去输出预留。
 */
function effectiveContextWindow(e, n) {
  let min = Math.min(e.maxOutputTokens, MAX_OUTPUT_TOKENS_CAP);
  let s = isAutoCompactEnabled() ? n : undefined;
  let { window: h } = getAutoCompactWindow(e, s);
  return h - min;
}
//@ chunk-e6aww6q8.js:1551987-1552018 placement
var TENGU_AMBER_MOLESKIN = "tengu_amber_moleskin";
//@ chunk-e6aww6q8.js:1552018-1552148 placement
/**
 * 预计算比例表格式错误时记录一次。
 */
function reportMalformedPrecomputeTable(payloadType) {
  if (!claimOnce().claim("precompute_arm_table_malformed")) return;
  logEvent("tengu_precompute_arm_table_malformed", {
    payloadType,
  });
}
//@ chunk-e6aww6q8.js:1552148-1552263 placement
/**
 * 预计算缓冲比例（tengu_amber_rokovoko，0–1）。
 */
function defaultPrecomputeFraction() {
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(
    "tengu_amber_rokovoko",
    DEFAULT_PRECOMPUTE_FRACTION,
  );
  return typeof featureValue_CACHED_MAY_BE_STALE === "number" &&
    Number.isFinite(featureValue_CACHED_MAY_BE_STALE) &&
    featureValue_CACHED_MAY_BE_STALE >= 0 &&
    featureValue_CACHED_MAY_BE_STALE < 1
    ? featureValue_CACHED_MAY_BE_STALE
    : DEFAULT_PRECOMPUTE_FRACTION;
}
//@ chunk-e6aww6q8.js:1552263-1552755 placement
/**
 * 按窗口与界面从比例表取预计算缓冲比例。
 */
function resolvePrecomputeFraction(e, n, r) {
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(TENGU_AMBER_MOLESKIN, null);
  if (featureValue_CACHED_MAY_BE_STALE === null || featureValue_CACHED_MAY_BE_STALE === undefined)
    return {
      fraction: defaultPrecomputeFraction(),
      source: "scalar",
    };
  let precomputeTable = parsePrecomputeTable(featureValue_CACHED_MAY_BE_STALE);
  if (precomputeTable === null) {
    reportMalformedPrecomputeTable(
      fromEnum(
        Array.isArray(featureValue_CACHED_MAY_BE_STALE) ? "array" : typeof featureValue_CACHED_MAY_BE_STALE,
      ),
    );
    return {
      fraction: defaultPrecomputeFraction(),
      source: "malformed",
    };
  }
  let y = isAutoCompactEnabled() ? n : undefined;
  let { window: S } = getAutoCompactWindow(e, y);
  let precomputeEntry = lookupPrecomputeEntry(precomputeTable, S);
  if (precomputeEntry === null)
    return {
      fraction: defaultPrecomputeFraction(),
      source: "table_no_match",
    };
  let L = r === "sdk" ? "sdk" : "repl";
  let fraction = precomputeEntry.entry[L];
  return precomputeEntry.kind === "exact"
    ? {
        fraction,
        source: "table_exact",
        matchedWindowKey: precomputeEntry.entry.windowSize,
      }
    : {
        fraction,
        source: "table_default",
      };
}
export {
  MAX_OUTPUT_TOKENS_CAP,
  parseWindowArgument,
  hasExplicitWindow,
  effectiveContextWindow,
  adoptInternalWindows,
  isWindowWithCeiling,
  findWindowSettingForModel,
  resolveWindowArg,
  reportEnvWindow,
  usesLongContextWindow,
  windowSource,
  envWindowTokens,
  resolveAutoCompactWindow,
  resolvePrecomputeFraction,
  autocompactThreshold,
  computeTokenWarning,
  DEFAULT_PRECOMPUTE_FRACTION,
  precomputeTriggerThreshold,
  logWindowInForce,
  resolveWindowOrigin,
  resolveDesktopWindow,
  isUnrecognizedModelWindow,
  reportInvalidWindowEnv,
  readAutoCompactWindowSetting,
  MIN_WINDOW_TOKENS,
  MAX_WINDOW_TOKENS,
  isEnvOrSettingsSource,
  persistSessionWindow,
};
