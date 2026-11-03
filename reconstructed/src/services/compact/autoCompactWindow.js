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
import { Kx, d0 } from "../../utils/config.js";
import { logFeatureOk, logFeatureSad, logFeatureBad } from "../analytics/featureTelemetry.js";
import { logForDebugging } from "../../utils/debug.js";
import { truncateToLength, plural } from "../../utils/stringUtils.js";
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import { getEffortSettingsSources, getModelSettingsKey } from "../../utils/effort.js";
import { getRootSession, getIsNonInteractiveSession, getSdkBetas } from "../../bootstrap/state.js";
import { xr } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { Do } from "../../utils/git/gitSafeEnv.js";
import { isPlainObject as isPlainObject_3 } from "../../utils/objectUtils.js";
import { logError } from "../../utils/log.js";
import { toError } from "../../utils/errors.js";
import { isAutoCompactEnabled, MYr, canCompactInRemote } from "./compactSettings.js";
import { CLAUDE_OPUS_4_8, mri, gri, getAutoCompactWindow } from "./autoCompact.js";
import { env } from "../../utils/env.js";
import { resolveSurfaceWindow } from "../../utils/model/modelContextInfo.js";
import { is1mContextDisabled, Qxt } from "../../utils/model/contextWindow1m.js";
import { isOver1mThreshold } from "../../utils/model/configs.js";
import { CK } from "../../utils/model/model.js";
import { isUnresolvedInferenceProfile } from "../../utils/model/bedrock.js";
import { claimOnceStore, claimOnce } from "../api/verificationRequired.js";
import { logEvent } from "../analytics/index.js";
import { telemetrySafeModelName } from "../../utils/model/telemetryModelName.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";

/**
 * 解析窗口大小（支持 k/m 后缀，可把 100–1000 视为千），返回 in_range/below_minimum/above_maximum/unusable。
 */
//@ chunk-e6aww6q8.js:1543002-1543413 placement
function parseWindowSize(e, { bareThousands: bareThousands }) {
  let trimmed = e.trim(),
    lower = trimmed.slice(-1).toLowerCase(),
    h = lower === "m" ? 1e6 : lower === "k" ? 1000 : void 0,
    y = h === void 0 ? parseIntLoose(trimmed) : parseFloat(trimmed) * h,
    w = bareThousands && h === void 0 && y >= 100 && y <= 1000 ? y * 1000 : y;
  if (Number.isNaN(w) || w < 1) return { kind: "unusable" };
  if (w < Kx) return { kind: "below_minimum", tokens: Math.min(Kx - 1, Math.round(w)) };
  if (w > d0) return { kind: "above_maximum" };
  return { kind: "in_range", tokens: Math.round(w), suffixed: h !== void 0 };
}
/**
 * CLAUDE_CODE_AUTO_COMPACT_WINDOW 的有效值（越界时夹到上下限）。
 */
//@ chunk-e6aww6q8.js:1543413-1543592 placement
function envWindowTokens(e) {
  if (e === void 0) return;
  let n = Q4e(e);
  switch (n.kind) {
    case "in_range":
      return n.tokens;
    case "below_minimum":
      return Kx;
    case "above_maximum":
      return d0;
    case "unusable":
      return;
  }
}
//@ chunk-e6aww6q8.js:1543592-1543688 placement
function oKe(e) {
  if (e === void 0) return null;
  let n = Q4e(e);
  return n.kind === "in_range" ? null : describeAutoCompactWindowEnvError(e, n);
}
/**
 * 校验并记录环境变量窗口设置，无效时警告（无头模式输出）。
 */
//@ chunk-e6aww6q8.js:1543688-1544178 placement
function reportEnvWindow(e, n) {
  if (e === void 0) return;
  let r = Q4e(e);
  switch (r.kind) {
    case "in_range":
      logFeatureOk("compact_window_env", { shorthand: r.suffixed });
      return;
    case "below_minimum":
      logFeatureSad(
        "compact_window_env",
        parseWindowSize(e, { bareThousands: !0 }).kind === "in_range"
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
  let s = describeAutoCompactWindowEnvError(e, r);
  if (n.interactive) {
    logForDebugging(`[autocompact] ${s}`, { level: "warn" });
    return;
  }
  n.headless(s);
}
//@ chunk-e6aww6q8.js:1544178-1544227 placement
function Q4e(e) {
  return parseWindowSize(e, { bareThousands: !1 });
}
//@ chunk-e6aww6q8.js:1544227-1544238 placement
var Z7t = 32;
/**
 * CLAUDE_CODE_AUTO_COMPACT_WINDOW 取值无效时的说明。
 */
//@ chunk-e6aww6q8.js:1544238-1544828 placement
function describeAutoCompactWindowEnvError(e, n) {
  let s = `CLAUDE_CODE_AUTO_COMPACT_WINDOW="${truncateToLength(e, Z7t).replace(/[^\w.,+ $%{}=;-]+/g, "?")}${e.length > Z7t ? "\u2026" : ""}"`,
    h = `${Kx / 1000}k`,
    y = `${d0 / 1e6}M`,
    S = `Set it to a size from ${h} to ${y}, such as 200k or 200000, or unset it.`;
  switch (n.kind) {
    case "below_minimum":
      return `${s} reads as ${n.tokens.toLocaleString("en-US")} ${plural(n.tokens, "token")}, so Claude Code treats it as the ${h} minimum. ${S}`;
    case "above_maximum":
      return `${s} is too large, so Claude Code treats it as the ${y} maximum. ${S}`;
    case "unusable":
      return `${s} isn't a usable size, so Claude Code ignores it. ${S}`;
  }
}
//@ chunk-e6aww6q8.js:1544828-1544842 placement
var oQt = 13000;
//@ chunk-e6aww6q8.js:1544842-1544863 placement
var rjr = 3000,
  gke = 0.2;
//@ chunk-e6aww6q8.js:1544863-1544944 placement
function nQt(e) {
  return typeof e === "number" && Number.isFinite(e) && e >= 0 && e < 1 ? e : null;
}
/**
 * 解析 {repl, sdk} 比例对。
 */
//@ chunk-e6aww6q8.js:1544944-1545086 placement
function parseFractionPair(e) {
  if (typeof e !== "object" || e === null) return null;
  let n = e,
    r = nQt(n.repl),
    s = nQt(n.sdk);
  return r === null || s === null ? null : { repl: r, sdk: s };
}
/**
 * 解析预计算比例表（按窗口大小与 default）。
 */
//@ chunk-e6aww6q8.js:1545086-1545444 placement
function parsePrecomputeTable(e) {
  if (typeof e !== "object" || e === null || Array.isArray(e)) return null;
  let n = [],
    r = null;
  for (let [s, h] of Object.entries(e)) {
    let y = parseFractionPair(h);
    if (y === null) return null;
    if (s === "default") {
      r = y;
      continue;
    }
    let S = Number(s);
    if (!Number.isSafeInteger(S) || S <= 0) return null;
    n.push({ windowSize: S, ...y });
  }
  if (n.length === 0 && r === null) return null;
  return { entries: n, defaultEntry: r };
}
/**
 * 在比例表中按窗口精确匹配或取默认项。
 */
//@ chunk-e6aww6q8.js:1545444-1545621 placement
function lookupPrecomputeEntry(e, n) {
  let found = e.entries.find((entry) => entry.windowSize === n);
  if (found !== void 0) return { kind: "exact", entry: found };
  return e.defaultEntry === null ? null : { kind: "default", entry: e.defaultEntry };
}
/**
 * 自动压缩阈值：窗口减 13000（测试百分比覆盖时取更小值）。
 */
//@ chunk-e6aww6q8.js:1545621-1545760 placement
function autocompactThreshold(e, n) {
  let r = e - 13000,
    testPctOverride = n.testPctOverride;
  if (testPctOverride !== void 0 && !isNaN(testPctOverride) && testPctOverride > 0 && testPctOverride <= 100)
    return Math.min(Math.floor(e * (testPctOverride / 100)), r);
  return r;
}
//@ chunk-e6aww6q8.js:1545760-1545846 placement
function J4e(e, n) {
  return Math.min(e - Math.round(e * n.precomputeBufferFraction), autocompactThreshold(e, n));
}
/**
 * 按 token 数计算警告等级：blocked / compact / warn / ok 与剩余百分比。
 */
//@ chunk-e6aww6q8.js:1545846-1546169 placement
function computeTokenWarning(e, n, r, s = n, h) {
  let y = h ?? autocompactThreshold(n, r),
    S = r.enabled ? y : n,
    w = S - 20000,
    testBlockingOverride = r.testBlockingOverride,
    G =
      testBlockingOverride !== void 0 && !isNaN(testBlockingOverride) && testBlockingOverride > 0
        ? testBlockingOverride
        : s - 3000,
    max = Math.max(0, Math.round(((S - e) / S) * 100));
  if (e >= G) return { level: "blocked", pctLeft: max };
  if (r.enabled && e >= y) return { level: "compact", pctLeft: max };
  if (e >= w) return { level: "warn", pctLeft: max };
  return { level: "ok" };
}
//@ chunk-e6aww6q8.js:1546169-1546227 placement
function $8n(e) {
  return typeof e === "object" && "ceiling" in e;
}
//@ chunk-e6aww6q8.js:1546227-1546274 placement
var e6e = new SessionRootSlot(() => ({ windows: {}, sink: void 0 }));
/**
 * 设置来源列表，插入会话下发的按模型窗口。
 */
//@ chunk-e6aww6q8.js:1546274-1546488 placement
function windowSettingSources() {
  let e = getEffortSettingsSources(),
    peek = e6e.peek(getRootSession());
  if (peek === void 0) return e;
  return e.toSpliced(e[0]?.source === "userSettings" ? 1 : 0, 0, {
    source: "userSettings",
    settings: { modelSettings: xr(peek.windows, (r) => ({ autoCompactWindow: r })) },
  });
}
/**
 * 合并各来源的 autoCompactWindow（默认值与按模型）。
 */
//@ chunk-e6aww6q8.js:1546488-1546854 placement
function readAutoCompactWindowSetting() {
  let e = { default: void 0, byModel: {} };
  for (let { settings: settings } of windowSettingSources()) {
    let r = {};
    for (let [s, h] of Object.entries(settings.modelSettings ?? {})) {
      let y = h?.autoCompactWindow;
      if (y === void 0) continue;
      let S = getModelSettingsKey(s);
      if (s === S || !Object.hasOwn(r, S)) r[S] = y;
    }
    e =
      settings.autoCompactWindow === void 0
        ? { default: e.default, byModel: { ...e.byModel, ...r } }
        : { default: settings.autoCompactWindow, byModel: r };
  }
  return e;
}
//@ chunk-e6aww6q8.js:1546854-1546924 placement
function MYs(e) {
  if (e === void 0) return readAutoCompactWindowSetting();
  return e === "auto" ? void 0 : e;
}
/**
 * 找某模型生效的窗口设置及其来源、是否按模型。
 */
//@ chunk-e6aww6q8.js:1546924-1547283 placement
function findWindowSettingForModel(e) {
  for (let { source: source, settings: settings } of windowSettingSources().toReversed()) {
    let s;
    for (let [h, y] of Object.entries(settings.modelSettings ?? {})) {
      let S = y?.autoCompactWindow;
      if (S === void 0 || getModelSettingsKey(h) !== e) continue;
      if (h === e) {
        s = S;
        break;
      }
      s ??= S;
    }
    if (s !== void 0) return { source: source, window: s, perModel: !0 };
    if (settings.autoCompactWindow !== void 0)
      return { source: source, window: settings.autoCompactWindow, perModel: !1 };
  }
  return;
}
/**
 * 采用会话内部元数据中的 auto_compact_windows。
 */
//@ chunk-e6aww6q8.js:1547283-1547689 placement
function adoptInternalWindows(e, n, r, s) {
  if (n === null || n.readFailed === !0) return;
  try {
    let of = e6e.of(e);
    of.sink = r;
    let y = n.internal?.auto_compact_windows;
    if (
      ((of.windows = Do(
        isPlainObject_3(y) ? y : {},
        (S, w) =>
          !Object.hasOwn(Object.prototype, w) &&
          (S === "auto" || (typeof S === "number" && Number.isInteger(S) && S >= Kx && S <= d0)),
      )),
      Object.keys(of.windows).length === 0)
    )
      return;
    s((S) =>
      typeof S.autoCompactWindow === "object"
        ? { ...S, autoCompactWindow: readAutoCompactWindowSetting() }
        : S,
    );
  } catch (error) {
    logError(toError(error));
  }
}
/**
 * 把某模型的窗口设置写回会话内部元数据。
 */
//@ chunk-e6aww6q8.js:1547689-1547913 placement
function persistSessionWindow(e, n) {
  let peek = e6e.peek(getRootSession());
  if (peek?.sink === void 0 || Object.hasOwn(Object.prototype, e)) return;
  try {
    ((peek.windows = { ...peek.windows, [e]: n }),
      peek.sink.notifyInternalMetadataChanged({ auto_compact_windows: peek.windows }));
  } catch (error) {
    logError(toError(error));
  }
}
//@ chunk-e6aww6q8.js:1547913-1547927 placement
var sjr = 20000;
/**
 * 解析窗口参数（auto 或 token 数）。
 */
//@ chunk-e6aww6q8.js:1547927-1548066 placement
function parseWindowArgument(e) {
  if (e.trim().toLowerCase() === "auto") return "auto";
  let n = parseWindowSize(e, { bareThousands: !0 });
  return n.kind === "in_range" ? n.tokens : void 0;
}
/**
 * 特定模型在交互会话中的窗口覆盖值。
 */
//@ chunk-e6aww6q8.js:1548066-1548205 placement
function desktopOpusWindowOverride(e) {
  if (!isAutoCompactEnabled()) return;
  if (getIsNonInteractiveSession()) return;
  if (e !== CLAUDE_OPUS_4_8) return;
  let n = mri();
  if (!n) return;
  let r = parseWindowArgument(n);
  return typeof r === "number" ? r : void 0;
}
//@ chunk-e6aww6q8.js:1548205-1548256 placement
var h6o = new Map([
  ["600k", 600000],
  ["500k", 500000],
]);
/**
 * Claude Desktop 入口按界面取默认窗口。
 */
//@ chunk-e6aww6q8.js:1548256-1548431 placement
function desktopSurfaceWindow(e) {
  if (env.CLAUDE_CODE_ENTRYPOINT !== "claude-desktop") return;
  if (!isAutoCompactEnabled()) return;
  if (e.longContextWindowWithoutOptIn < ONE_MILLION_TOKENS || e.contextWindow < ONE_MILLION_TOKENS) return;
  return h6o.get(gri());
}
//@ chunk-e6aww6q8.js:1548431-1548479 placement
function a6e(e) {
  return desktopOpusWindowOverride(e.canonical) ?? desktopSurfaceWindow(e);
}
/**
 * 1M token 常量与按模型/界面的默认窗口表。
 */
//@ chunk-e6aww6q8.js:1548479-1548602 placement
var ONE_MILLION_TOKENS = 1e6,
  SURFACE_WINDOW_DEFAULTS = {
    "claude-sonnet-5": {
      surfaces: { remote_cowork: { default: 500000 }, "local-agent": { default: 500000 } },
      default: ONE_MILLION_TOKENS,
    },
  };
//@ chunk-e6aww6q8.js:1548602-1548685 placement
function _6o(e) {
  if (!isAutoCompactEnabled()) return;
  if (!Object.hasOwn(SURFACE_WINDOW_DEFAULTS, e)) return;
  return resolveSurfaceWindow(SURFACE_WINDOW_DEFAULTS[e]);
}
/**
 * 解析自动压缩窗口大小，来源依次为客户端数据、实验、模型默认与用户设置。
 */
//@ chunk-e6aww6q8.js:1549181-1550223 placement
function resolveAutoCompactWindow(e, n = getSdkBetas()) {
  let { model: model, contextWindow: contextWindow, canonical: canonical } = e,
    y = isAutoCompactEnabled() ? e.clientDataAutoCompactWindow : { window: null, replacesDefault: !1 };
  if (y.window !== null)
    return { window: Math.min(contextWindow, y.window), configured: y.window, source: "clientdata" };
  let S = a6e(e);
  if (S !== void 0) return { window: Math.min(contextWindow, S), configured: S, source: "experiment" };
  let w =
    is1mContextDisabled() && Math.max(e.apiContextWindowWithoutOptIn, e.servedWindow?.declared ?? 0) > Qxt
      ? Qxt
      : isOver1mThreshold(model, n)
        ? CK
        : void 0;
  if (w !== void 0 && contextWindow < 1e6)
    return { window: Math.min(contextWindow, w), configured: w, source: "model-default" };
  let L = y.replacesDefault ? void 0 : _6o(canonical);
  if (L !== void 0) return { window: Math.min(contextWindow, L), configured: L, source: "model-default" };
  if (contextWindow < e.apiContextWindowWithoutOptIn)
    return { window: contextWindow, configured: contextWindow, source: "model-default" };
  if (
    e.longContextWindowWithoutOptIn > 0 &&
    contextWindow >= e.longContextWindowWithoutOptIn &&
    !y.replacesDefault &&
    isAutoCompactEnabled()
  )
    return { window: contextWindow, configured: contextWindow, source: "model-default" };
  if (
    isAutoCompactEnabled() &&
    !env.CLAUDE_CODE_DISABLE_UNKNOWN_MODEL_WINDOW_ENFORCEMENT &&
    isUnrecognizedModelWindow(e)
  )
    return { window: contextWindow, configured: contextWindow, source: "unknown-model" };
  return { window: contextWindow, configured: contextWindow, source: "auto" };
}
/**
 * 模型未被识别（无 1M 授权、服务器声明窗口与本地不一致）时为真。
 */
//@ chunk-e6aww6q8.js:1550223-1550371 placement
function isUnrecognizedModelWindow(e) {
  return (
    !e.optIn1mHonored &&
    !isUnresolvedInferenceProfile(e.model) &&
    (e.servedWindow === void 0 || e.servedWindow.believed !== e.servedWindow.declared) &&
    !e.recognized
  );
}
//@ chunk-e6aww6q8.js:1550615-1550664 placement
function Zjt(e) {
  return e === "env" || e === "settings";
}
/**
 * 自动压缩窗口是否使用了长上下文（实验或超过未开通窗口）。
 */
//@ chunk-e6aww6q8.js:1550664-1550919 placement
function usesLongContextWindow(e, n, r) {
  if (!MYr(e) || !canCompactInRemote()) return !1;
  let s = getAutoCompactWindow(n, r);
  return (
    !Zjt(s.source) &&
    ((s.source === "experiment" && desktopOpusWindowOverride(n.canonical) === void 0) ||
      (n.longContextWindowWithoutOptIn > 0 &&
        s.window >= Math.max(n.longContextWindowWithoutOptIn, n.apiContextWindowWithoutOptIn)))
  );
}
//@ chunk-e6aww6q8.js:1550919-1550968 placement
function abe(e, n) {
  return getAutoCompactWindow(e, n).source !== "auto";
}
//@ chunk-e6aww6q8.js:1550968-1551008 placement
function fse(e, n) {
  return getAutoCompactWindow(e, n).source;
}
/**
 * 窗口来源到遥测 origin 的映射。
 */
//@ chunk-e6aww6q8.js:1551008-1551139 placement
var WINDOW_SOURCE_ORIGINS = {
  env: "env",
  clientdata: "server",
  experiment: "experiment",
  "model-default": "default",
  "unknown-model": "default",
  auto: "default",
};
/**
 * 窗口大小及其来源（设置区分会话覆盖、agent 定义、按模型或顶层）。
 */
//@ chunk-e6aww6q8.js:1551139-1551499 placement
function resolveWindowOrigin(e, n) {
  let { window: r, source: source } = getAutoCompactWindow(e, n);
  if (source !== "settings") return { window: r, origin: WINDOW_SOURCE_ORIGINS[source] };
  if ($8n(n)) {
    let h = resolveWindowOrigin(e, n.inner);
    return h.window === r ? h : { window: r, origin: "agent_definition" };
  }
  if (typeof n !== "object") return { window: r, origin: "session_override" };
  return {
    window: r,
    origin: Object.hasOwn(n.byModel, e.settingsKey) ? "settings_per_model" : "settings_top_level",
  };
}
/**
 * 生效窗口变化时记 tengu_auto_compact_window_in_force。
 */
//@ chunk-e6aww6q8.js:1551499-1551807 placement
function logWindowInForce(e, n, r) {
  let s = fse(n, r),
    { window: h, origin: origin } = resolveWindowOrigin(n, r);
  if (
    !claimOnceStore
      .of(e.host)
      .claimIfChanged(`auto_compact_window_in_force:${e.id}`, `${n.settingsKey}|${h}|${origin}|${s}`)
  )
    return;
  logEvent("tengu_auto_compact_window_in_force", {
    window_model: telemetrySafeModelName(n.settingsKey),
    window_tokens: h,
    window_origin: fromEnum(origin),
    threshold_source: fromEnum(s),
  });
}
/**
 * 有效上下文窗口：自动压缩窗口减去输出预留。
 */
//@ chunk-e6aww6q8.js:1551807-1551908 placement
function effectiveContextWindow(e, n) {
  let min = Math.min(e.maxOutputTokens, sjr),
    s = isAutoCompactEnabled() ? n : void 0,
    { window: h } = getAutoCompactWindow(e, s);
  return h - min;
}
//@ chunk-e6aww6q8.js:1551987-1552018 placement
var TENGU_AMBER_MOLESKIN = "tengu_amber_moleskin";
/**
 * 预计算比例表格式错误时记录一次。
 */
//@ chunk-e6aww6q8.js:1552018-1552148 placement
function reportMalformedPrecomputeTable(e) {
  if (!claimOnce().claim("precompute_arm_table_malformed")) return;
  logEvent("tengu_precompute_arm_table_malformed", { payloadType: e });
}
/**
 * 预计算缓冲比例（tengu_amber_rokovoko，0–1）。
 */
//@ chunk-e6aww6q8.js:1552148-1552263 placement
function defaultPrecomputeFraction() {
  let e = getFeatureValue_CACHED_MAY_BE_STALE("tengu_amber_rokovoko", gke);
  return typeof e === "number" && Number.isFinite(e) && e >= 0 && e < 1 ? e : gke;
}
/**
 * 按窗口与界面从比例表取预计算缓冲比例。
 */
//@ chunk-e6aww6q8.js:1552263-1552755 placement
function resolvePrecomputeFraction(e, n, r) {
  let s = getFeatureValue_CACHED_MAY_BE_STALE(TENGU_AMBER_MOLESKIN, null);
  if (s === null || s === void 0) return { fraction: defaultPrecomputeFraction(), source: "scalar" };
  let h = parsePrecomputeTable(s);
  if (h === null)
    return (
      reportMalformedPrecomputeTable(fromEnum(Array.isArray(s) ? "array" : typeof s)),
      { fraction: defaultPrecomputeFraction(), source: "malformed" }
    );
  let y = isAutoCompactEnabled() ? n : void 0,
    { window: S } = getAutoCompactWindow(e, y),
    w = lookupPrecomputeEntry(h, S);
  if (w === null) return { fraction: defaultPrecomputeFraction(), source: "table_no_match" };
  let L = r === "sdk" ? "sdk" : "repl",
    G = w.entry[L];
  return w.kind === "exact"
    ? { fraction: G, source: "table_exact", matchedWindowKey: w.entry.windowSize }
    : { fraction: G, source: "table_default" };
}

export {
  sjr,
  parseWindowArgument,
  abe,
  effectiveContextWindow,
  adoptInternalWindows,
  $8n,
  findWindowSettingForModel,
  MYs,
  reportEnvWindow,
  usesLongContextWindow,
  fse,
  envWindowTokens,
  resolveAutoCompactWindow,
  resolvePrecomputeFraction,
  autocompactThreshold,
  computeTokenWarning,
  gke,
  J4e,
  logWindowInForce,
  resolveWindowOrigin,
  a6e,
  isUnrecognizedModelWindow,
  oKe,
  readAutoCompactWindowSetting,
  oQt,
  rjr,
  Zjt,
  persistSessionWindow,
};
