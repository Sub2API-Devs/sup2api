/**
 * utils/accessibility/screenReader.ts
 *
 * 2.1.316 新增：屏幕阅读器模式状态（启用来源、方向键导航、播报队列与保持）；项目设置中有 axScreenReader 但未生效时的提示等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-018s34f2.js (33)
 * attribution: placement 33
 */
import { homedir } from "os";
import { join, sep } from "path";
import { shortHash } from "../shortHash.js";
import { sanitizeErrnoForTelemetry, sanitizeClassName, sanitizeTopFrame } from "../errors.js";
import {
  stripStackHeader,
  getSanitizedStackFrames,
  isStackFrameExternal,
  isSourceFrame,
  getBaseName,
  USER_CODE_PLACEHOLDER,
} from "../errorStackSanitize.js";
import { env } from "../env.js";
import { eagerHasCliFlag } from "../cliArgs.js";
import {
  getSecuritySensitiveSettingWithSources,
  getSettingsForSource,
  getSettingsFilePathForSource,
} from "../settings/settings.js";
import { isSettingSourceEnabled } from "../settings/constants.js";
import { HostScoped } from "../hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";
import { isEnvTruthy } from "../envUtils.js";
import { stripControlChars } from "../settings/writeQueues.js";
import { fromEnumOpt } from "../../services/analytics/safeMetadata.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-018s34f2.js:655-1334 placement
/**
 * 遮盖错误文本中的 URL、邮箱、密钥、路径等再做哈希。
 */
function scrubErrorText(text) {
  return text
    .slice(0, 500)
    .replace(/https?:\/\/\S+/gi, "<url>")
    .replace(/\b[\w.+-]+@[\w.-]+\.\w{2,}\b/g, "<email>")
    .replace(/\b(?:sk-ant|sk|pk|ghp|gho|ghs|ghu|github_pat|xox[bpoars])[-_][\w-]{8,}\b/gi, "<key>")
    .replace(/[A-Za-z]:\\[^\s"']*/g, "<path>")
    .replace(/\\\\[^\s"']+/g, "<path>")
    .replace(/(?:[^\s"'\\]+\\){2,}[^\s"']+/g, "<path>")
    .replace(/(?:\/[^\s"':]+){2,}/g, "<path>")
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, "<id>")
    .replace(/\breq_[A-Za-z0-9_-]{12,}/g, "<id>")
    .replace(/\b[0-9a-fA-F]{16,}\b/g, "<id>")
    .replace(/\b[A-Za-z0-9+/]{32,}={0,2}/g, "<b64>")
    .replace(/\b\d{1,3}(?:\.\d{1,3}){3}\b/g, "<ip>")
    .replace(/\b\d{4,}\b/g, "<num>");
}
//@ chunk-018s34f2.js:1334-1345 placement
/**
 * 清理后错误栈保留的字符数（4000）。
 */
var MAX_SCRUBBED_STACK_CHARS = 4000;
//@ chunk-018s34f2.js:1345-1841 placement
/**
 * 提取错误栈的前几帧（区分内部/外部）。
 */
function topStackFrames(stackText, maxNames = 5) {
  let names = [];
  let topFrame;
  for (let line of stackText.slice(0, MAX_SCRUBBED_STACK_CHARS).split(`
`)) {
    let trimmed = line.trim();
    if (!trimmed.startsWith("at ")) continue;
    let sliced = trimmed.slice(3);
    let index = sliced.indexOf(" (");
    if (topFrame === undefined) {
      let frameLocation = index !== -1 ? sliced.slice(index + 2, -1) : sliced;
      if (/^(?:node|bun|internal):/.test(frameLocation)) topFrame = frameLocation;
      else {
        let match = frameLocation.match(/([^/\\]+:\d+:\d+)\)?$/);
        if (match) topFrame = match[1];
      }
    }
    let functionName = index !== -1 ? sliced.slice(0, index) : sliced;
    functionName = functionName.replace(/^async\s+/, "").replace(/^new\s+/, "");
    if (functionName.includes("/") || functionName.includes("\\") || /:\d/.test(functionName)) continue;
    if (functionName) names.push(functionName);
    if (names.length >= maxNames) break;
  }
  return {
    names,
    topFrame,
  };
}
//@ chunk-018s34f2.js:1841-1909 placement
/**
 * 安全地把值转成字符串，失败返回占位文本。
 */
function safeToString(value) {
  try {
    return String(value);
  } catch {
    return "[unstringifiable]";
  }
}
//@ chunk-018s34f2.js:1909-2626 placement
/**
 * 生成错误遥测字段（消息哈希、错误码、构造器名、栈）。
 */
function errorTelemetryFields(error) {
  try {
    let messageText = safeToString(error instanceof Error ? error.message : error);
    let fields = {
      error_message_hash: shortHash(scrubErrorText(messageText)),
    };
    let errnoCode = sanitizeErrnoForTelemetry(error);
    if (errnoCode !== undefined) fields.error_code = errnoCode;
    if (!(error instanceof Error)) return fields;
    let constructorName = sanitizeClassName(error.constructor?.name);
    if (constructorName !== undefined) fields.error_constructor = constructorName;
    let stack = error.stack;
    if (typeof stack !== "string") return fields;
    let errorLike = {
      name: error.name,
      message: error.message,
      stack,
    };
    let strippedStack = stripStackHeader(errorLike);
    let hadHeaderStripped = strippedStack.length < stack.length && stack.endsWith(strippedStack);
    let { names, topFrame } = topStackFrames(strippedStack);
    if (names.length > 0) fields.error_stack_hash = shortHash(names.join("|"));
    let headerLength = stack.length - strippedStack.length;
    let stack_2 = stack.slice(0, headerLength + MAX_SCRUBBED_STACK_CHARS);
    let [firstFrame] = hadHeaderStripped
      ? getSanitizedStackFrames(
          {
            ...errorLike,
            stack: stack_2,
          },
          1,
        )
      : [];
    if (firstFrame !== undefined) {
      let frameFile = isStackFrameExternal(firstFrame)
        ? firstFrame.file
        : isSourceFrame(firstFrame)
          ? getBaseName(firstFrame.file)
          : undefined;
      let topFrameKey = sanitizeTopFrame(
        frameFile === undefined
          ? USER_CODE_PLACEHOLDER
          : `${frameFile}:${firstFrame.line}:${firstFrame.column}`,
      );
      let topFrameMismatch = frameFile !== undefined && sanitizeTopFrame(topFrame ?? "") !== topFrameKey;
      if (topFrameKey !== undefined && !topFrameMismatch) fields.error_top_frame = topFrameKey;
    }
    return fields;
  } catch {
    return {};
  }
}
//@ chunk-018s34f2.js:2692-2723 placement
var TENGU_AX_SCREEN_READER = "tengu_ax_screen_reader";
//@ chunk-018s34f2.js:2723-2774 placement
/**
 * 替换屏幕阅读器模式里“远程门”的读取器。
 */
function swapRemoteGateReader(getFeatureValue_CACHED_MAY_BE_STALE) {
  return getScreenReaderMode().swapRemoteGateReader(getFeatureValue_CACHED_MAY_BE_STALE);
}
//@ chunk-018s34f2.js:2774-4063 placement
/**
 * 屏幕阅读器模式状态（启用来源、方向键导航、播报队列与保持）。
 */
class ScreenReaderMode {
  #n;
  #a;
  #o;
  #u;
  #t = null;
  #i = null;
  #c = false;
  #e = [];
  #r = false;
  #s = 0;
  swapRemoteGateReader(reader) {
    let previousReader = this.#t;
    this.#t = reader;
    return previousReader;
  }
  isEnabled() {
    if (this.#n !== undefined) return this.#n;
    let enabled;
    let source;
    if (eagerHasCliFlag("--ax-screen-reader")) {
      enabled = true;
      source = "flag";
    } else {
      let CLAUDE_AX_SCREEN_READER = env.CLAUDE_AX_SCREEN_READER;
      if (CLAUDE_AX_SCREEN_READER !== undefined) {
        enabled = CLAUDE_AX_SCREEN_READER;
        source = "env";
      } else {
        enabled =
          getSecuritySensitiveSettingWithSources("axScreenReader").find((sourceEntry) =>
            isSettingSourceEnabled(sourceEntry.source),
          )?.value === true;
        source = "settings";
      }
    }
    if (!enabled) return (this.#n = false);
    let isRemoteEnabled = this.#t?.(TENGU_AX_SCREEN_READER, true) ?? true;
    this.#a = isRemoteEnabled ? source : undefined;
    return (this.#n = isRemoteEnabled);
  }
  activationSource() {
    return this.isEnabled() ? this.#a : undefined;
  }
  isArrowNavEnabled() {
    if (this.#o === undefined) this.#o = this.#t?.(TENGU_AX_SR_ARROW_NAV, false) ?? false;
    return this.#o;
  }
  isSuggestionNavEnabled() {
    {
      if (!this.isEnabled()) return false;
      let defaultEnabled = false;
      this.#u ??= this.#t?.("tengu_ax_sr_suggestion_nav", defaultEnabled) ?? defaultEnabled;
      return this.#u;
    }
    return false;
  }
  markAnnouncementWritten(writtenAtMs) {
    if (this.#i === null) this.#i = writtenAtMs;
  }
  endStartupQuiet() {
    this.#c = true;
  }
  startupQuietOpenedAtMs() {
    return this.#c ? null : this.#i;
  }
  queueAnnouncement(text, shouldHold = false) {
    this.#e.push(text);
    if (shouldHold) this.#r = true;
    if (this.#e.length > MAX_ANNOUNCEMENT_QUEUE) this.#e.splice(0, this.#e.length - MAX_ANNOUNCEMENT_QUEUE);
  }
  drainAnnouncements() {
    return this.#e.splice(0);
  }
  takeHoldRequest() {
    let holdRequested = this.#r;
    this.#r = false;
    return holdRequested;
  }
  startHold(holdUntilMs) {
    this.#s = holdUntilMs;
  }
  endHold() {
    this.#s = 0;
    this.#r = false;
  }
  holdActive(nowMs) {
    return nowMs < this.#s;
  }
  reset() {
    this.#n = undefined;
    this.#a = undefined;
    this.#o = undefined;
    this.#u = undefined;
    this.#i = null;
    this.#c = false;
    this.#e.length = 0;
    this.#r = false;
    this.#s = 0;
  }
}
//@ chunk-018s34f2.js:4063-4086 placement
/**
 * 按宿主隔离的屏幕阅读器模式状态。
 */
var screenReaderModeByHost; // deferred: uses ScreenReaderMode of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-018s34f2.js:4063", () => {
  screenReaderModeByHost = new HostScoped(() => new ScreenReaderMode());
});
//@ chunk-018s34f2.js:4086-4121 placement
/**
 * 取出当前宿主的屏幕阅读器模式状态。
 */
function getScreenReaderMode() {
  return screenReaderModeByHost.of(getRootSession().host);
}
//@ chunk-018s34f2.js:4121-4151 placement
var TENGU_AX_SR_ARROW_NAV = "tengu_ax_sr_arrow_nav";
//@ chunk-018s34f2.js:4151-4197 placement
/**
 * 屏幕阅读器方向键导航是否启用。
 */
function isArrowNavEnabled() {
  return getScreenReaderMode().isArrowNavEnabled();
}
//@ chunk-018s34f2.js:4197-4248 placement
/**
 * 屏幕阅读器模式下是否启用建议导航。
 */
function isSuggestionNavEnabled() {
  return getScreenReaderMode().isSuggestionNavEnabled();
}
//@ chunk-018s34f2.js:4248-4285 placement
/**
 * 是否处于屏幕阅读器模式。
 */
function isScreenReaderMode() {
  return getScreenReaderMode().isEnabled();
}
//@ chunk-018s34f2.js:4285-4439 placement
/**
 * 读屏模式开启时的状态文本（含启用来源）。
 */
function screenReaderStatusLine() {
  {
    let screenReaderMode = getScreenReaderMode();
    if (screenReaderMode.isEnabled()) {
      let source = screenReaderMode.activationSource();
      return source ? `[Screen Reader Mode: on via ${source}]` : "[Screen Reader Mode: on]";
    }
  }
  return null;
}
//@ chunk-018s34f2.js:4439-5285 placement
/**
 * 项目设置中有 axScreenReader 但未生效时的提示。
 */
function screenReaderSettingHint() {
  {
    if (
      getScreenReaderMode().isEnabled() ||
      eagerHasCliFlag("--ax-screen-reader") ||
      env.CLAUDE_AX_SCREEN_READER !== undefined ||
      getSecuritySensitiveSettingWithSources("axScreenReader").some((sourceEntry) =>
        isSettingSourceEnabled(sourceEntry.source),
      )
    )
      return null;
    if (
      !["projectSettings", "localSettings"].some((sourceName) => {
        let sourceSettings = isSettingSourceEnabled(sourceName) ? getSettingsForSource(sourceName) : null;
        return (
          sourceSettings?.axScreenReader === true ||
          Object.entries(sourceSettings?.env ?? {}).some(
            ([key, value]) => key.toUpperCase() === "CLAUDE_AX_SCREEN_READER" && isEnvTruthy(value),
          )
        );
      })
    )
      return null;
    let flagHint = "start Claude Code with --ax-screen-reader";
    if (!isSettingSourceEnabled("userSettings"))
      return `Screen reader mode is off: project settings can't turn it on. To turn it on, ${flagHint}.`;
    let homeDir = homedir();
    let replaced = stripControlChars(
      getSettingsFilePathForSource("userSettings") ?? join(homeDir, ".claude", "settings.json"),
    ).replace(/[\t\n]/g, " ");
    let displayPath = replaced.startsWith(homeDir + sep) ? `~${replaced.slice(homeDir.length)}` : replaced;
    return `Screen reader mode is off: project settings can't turn it on. To turn it on, ${flagHint}, or add "axScreenReader": true to your own settings file at ${displayPath} and restart.`;
  }
  return null;
}
//@ chunk-018s34f2.js:5285-5410 placement
/**
 * 启动时输出读屏模式状态或设置提示。
 */
function announceScreenReaderMode(isStartup, announce) {
  {
    if (!isStartup) return null;
    let statusLine = screenReaderStatusLine();
    if (statusLine !== null) {
      announce(statusLine);
      markAnnouncementWritten();
      return statusLine;
    }
    let hintText = screenReaderSettingHint();
    if (hintText !== null) announce(hintText);
    return hintText;
  }
  return null;
}
//@ chunk-018s34f2.js:5410-5430 placement
/**
 * 读屏启动静默期的默认值（3 秒）。
 */
var DEFAULT_AX_STARTUP_QUIET_MS = 3000;
var MAX_AX_STARTUP_QUIET_MS = 600000;
//@ chunk-018s34f2.js:5430-5483 placement
/**
 * 记录一次播报已写入的时间。
 */
function markAnnouncementWritten() {
  getScreenReaderMode().markAnnouncementWritten(Date.now());
}
//@ chunk-018s34f2.js:5483-5520 placement
/**
 * 结束读屏启动静默期。
 */
function endStartupQuiet() {
  getScreenReaderMode().endStartupQuiet();
}
//@ chunk-018s34f2.js:5520-5683 placement
/**
 * 读屏启动静默期剩余毫秒数。
 */
function startupQuietRemainingMs() {
  {
    let openedAtMs = getScreenReaderMode().startupQuietOpenedAtMs();
    if (openedAtMs === null) return 0;
    let min = Math.min(
      env.CLAUDE_AX_STARTUP_QUIET_MS ?? DEFAULT_AX_STARTUP_QUIET_MS,
      MAX_AX_STARTUP_QUIET_MS,
    );
    let remainingMs = openedAtMs + min - Date.now();
    return remainingMs > 0 ? remainingMs : 0;
  }
  return 0;
}
//@ chunk-018s34f2.js:5683-5698 placement
/**
 * 读屏预停放的默认时长（0）。
 */
var DEFAULT_AX_PREPARK_MS = 0;
var MAX_AX_PREPARK_MS = 5000;
//@ chunk-018s34f2.js:5698-5758 placement
/**
 * 读屏预停放时长（受环境变量与上限约束）。
 */
function getAxPreparkMs() {
  return Math.min(env.CLAUDE_AX_PREPARK_MS ?? DEFAULT_AX_PREPARK_MS, MAX_AX_PREPARK_MS);
}
//@ chunk-018s34f2.js:5758-5822 placement
/**
 * 是否重写被保持的播报（环境变量控制）。
 */
function rewriteHeldAnnouncement() {
  return env.CLAUDE_AX_REWRITE_HELD_ANNOUNCEMENT ?? false;
}
//@ chunk-018s34f2.js:5822-5900 placement (2.1.88 match: getToolsForDefaultPreset, 0.54)
/**
 * （旧版名 getToolsForDefaultPreset 是错配）屏幕阅读器模式开启时返回子进程环境 {CLAUDE_AX_SCREEN_READER:"1"}，否则空对象。
 */
function getScreenReaderEnv() {
  if (getScreenReaderMode().isEnabled())
    return {
      CLAUDE_AX_SCREEN_READER: "1",
    };
  return {};
}
//@ chunk-018s34f2.js:5900-6034 placement
/**
 * 读屏模式的遥测字段。
 */
function screenReaderTelemetryFields() {
  {
    let screenReaderMode = getScreenReaderMode();
    if (screenReaderMode.isEnabled())
      return {
        screenReaderMode: true,
        screenReaderActivationSource: fromEnumOpt(screenReaderMode.activationSource()),
      };
  }
  return {};
}
//@ chunk-018s34f2.js:6034-6043 placement
/**
 * 播报队列最多保留的条数（16）。
 */
var MAX_ANNOUNCEMENT_QUEUE = 16;
//@ chunk-018s34f2.js:6043-6098 placement
/**
 * 加入一条屏幕阅读器播报。
 */
function announce(text, options) {
  getScreenReaderMode().queueAnnouncement(text, options?.hold === true);
}
//@ chunk-018s34f2.js:6098-6207 placement
/**
 * 有播报保持请求时返回保持时长。
 */
function takeAnnouncementHoldMs() {
  if (getScreenReaderMode().takeHoldRequest())
    return Math.min(env.CLAUDE_AX_ANNOUNCEMENT_HOLD_MS ?? 1000, 1e4);
  return 0;
}
//@ chunk-018s34f2.js:6207-6251 placement
/**
 * 开始一段播报保持（给定毫秒）。
 */
function startAnnouncementHold(holdMs) {
  getScreenReaderMode().startHold(Date.now() + holdMs);
}
//@ chunk-018s34f2.js:6251-6280 placement
/**
 * 结束播报保持。
 */
function endAnnouncementHold() {
  getScreenReaderMode().endHold();
}
//@ chunk-018s34f2.js:6280-6329 placement
/**
 * 当前是否处于播报保持。
 */
function isAnnouncementHoldActive() {
  return getScreenReaderMode().holdActive(Date.now());
}
//@ chunk-018s34f2.js:6329-6376 placement
/**
 * 取出播报队列里的全部播报。
 */
function drainAnnouncements() {
  return getScreenReaderMode().drainAnnouncements();
}
export {
  errorTelemetryFields,
  scrubErrorText,
  screenReaderTelemetryFields,
  isScreenReaderMode,
  endStartupQuiet,
  rewriteHeldAnnouncement,
  endAnnouncementHold,
  startupQuietRemainingMs,
  isAnnouncementHoldActive,
  drainAnnouncements,
  takeAnnouncementHoldMs,
  getAxPreparkMs,
  startAnnouncementHold,
  announce,
  getScreenReaderEnv,
  announceScreenReaderMode,
  isSuggestionNavEnabled,
  swapRemoteGateReader,
  isArrowNavEnabled,
};
