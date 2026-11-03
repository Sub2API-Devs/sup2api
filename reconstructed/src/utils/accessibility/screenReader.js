/**
 * utils/accessibility/screenReader.ts
 *
 * 2.1.316 新增：屏幕阅读器模式状态（启用来源、方向键导航、播报队列与保持）；项目设置中有 axScreenReader 但未生效时的提示等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-vd0bcd16.js (33)
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

//@ chunk-vd0bcd16.js:654-1333 placement
/**
 * 遮盖错误文本中的 URL、邮箱、密钥、路径等再做哈希。
 */
function scrubErrorText(e) {
  return e
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
//@ chunk-vd0bcd16.js:1333-1344 placement
/**
 * 清理后错误栈保留的字符数（4000）。
 */
var MAX_SCRUBBED_STACK_CHARS = 4000;
//@ chunk-vd0bcd16.js:1344-1840 placement
/**
 * 提取错误栈的前几帧（区分内部/外部）。
 */
function topStackFrames(e, n = 5) {
  let t = [];
  let r;
  for (let line of e.slice(0, MAX_SCRUBBED_STACK_CHARS).split(`
`)) {
    let trimmed = line.trim();
    if (!trimmed.startsWith("at ")) continue;
    let sliced = trimmed.slice(3);
    let index = sliced.indexOf(" (");
    if (r === undefined) {
      let R = index !== -1 ? sliced.slice(index + 2, -1) : sliced;
      if (/^(?:node|bun|internal):/.test(R)) r = R;
      else {
        let match = R.match(/([^/\\]+:\d+:\d+)\)?$/);
        if (match) r = match[1];
      }
    }
    let c = index !== -1 ? sliced.slice(0, index) : sliced;
    c = c.replace(/^async\s+/, "").replace(/^new\s+/, "");
    if (c.includes("/") || c.includes("\\") || /:\d/.test(c)) continue;
    if (c) t.push(c);
    if (t.length >= n) break;
  }
  return {
    names: t,
    topFrame: r,
  };
}
//@ chunk-vd0bcd16.js:1840-1908 placement
/**
 * 安全地把值转成字符串，失败返回占位文本。
 */
function safeToString(e) {
  try {
    return String(e);
  } catch {
    return "[unstringifiable]";
  }
}
//@ chunk-vd0bcd16.js:1908-2625 placement
/**
 * 生成错误遥测字段（消息哈希、错误码、构造器名、栈）。
 */
function errorTelemetryFields(e) {
  try {
    let n = safeToString(e instanceof Error ? e.message : e);
    let t = {
      error_message_hash: shortHash(scrubErrorText(n)),
    };
    let r = sanitizeErrnoForTelemetry(e);
    if (r !== undefined) t.error_code = r;
    if (!(e instanceof Error)) return t;
    let l = sanitizeClassName(e.constructor?.name);
    if (l !== undefined) t.error_constructor = l;
    let stack = e.stack;
    if (typeof stack !== "string") return t;
    let a = {
      name: e.name,
      message: e.message,
      stack,
    };
    let u = stripStackHeader(a);
    let c = u.length < stack.length && stack.endsWith(u);
    let { names, topFrame } = topStackFrames(u);
    if (names.length > 0) t.error_stack_hash = shortHash(names.join("|"));
    let A = stack.length - u.length;
    let stack_2 = stack.slice(0, A + MAX_SCRUBBED_STACK_CHARS);
    let [f] = c
      ? getSanitizedStackFrames(
          {
            ...a,
            stack: stack_2,
          },
          1,
        )
      : [];
    if (f !== undefined) {
      let m = isStackFrameExternal(f) ? f.file : isSourceFrame(f) ? getBaseName(f.file) : undefined;
      let S = sanitizeTopFrame(m === undefined ? USER_CODE_PLACEHOLDER : `${m}:${f.line}:${f.column}`);
      let b = m !== undefined && sanitizeTopFrame(topFrame ?? "") !== S;
      if (S !== undefined && !b) t.error_top_frame = S;
    }
    return t;
  } catch {
    return {};
  }
}
//@ chunk-vd0bcd16.js:2691-2722 placement
var TENGU_AX_SCREEN_READER = "tengu_ax_screen_reader";
//@ chunk-vd0bcd16.js:2722-2773 placement
/**
 * 替换屏幕阅读器模式里“远程门”的读取器。
 */
function swapRemoteGateReader(getFeatureValue_CACHED_MAY_BE_STALE) {
  return getScreenReaderMode().swapRemoteGateReader(getFeatureValue_CACHED_MAY_BE_STALE);
}
//@ chunk-vd0bcd16.js:2773-4061 placement
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
  swapRemoteGateReader(e) {
    let n = this.#t;
    this.#t = e;
    return n;
  }
  isEnabled() {
    if (this.#n !== undefined) return this.#n;
    let e;
    let n;
    if (eagerHasCliFlag("--ax-screen-reader")) {
      e = true;
      n = "flag";
    } else {
      let CLAUDE_AX_SCREEN_READER = env.CLAUDE_AX_SCREEN_READER;
      if (CLAUDE_AX_SCREEN_READER !== undefined) {
        e = CLAUDE_AX_SCREEN_READER;
        n = "env";
      } else {
        e =
          getSecuritySensitiveSettingWithSources("axScreenReader").find((l) =>
            isSettingSourceEnabled(l.source),
          )?.value === true;
        n = "settings";
      }
    }
    if (!e) return (this.#n = false);
    let t = this.#t?.(TENGU_AX_SCREEN_READER, true) ?? true;
    this.#a = t ? n : undefined;
    return (this.#n = t);
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
      let e = false;
      this.#u ??= this.#t?.("tengu_ax_sr_suggestion_nav", e) ?? e;
      return this.#u;
    }
    return false;
  }
  markAnnouncementWritten(e) {
    if (this.#i === null) this.#i = e;
  }
  endStartupQuiet() {
    this.#c = true;
  }
  startupQuietOpenedAtMs() {
    return this.#c ? null : this.#i;
  }
  queueAnnouncement(e, n = false) {
    this.#e.push(e);
    if (n) this.#r = true;
    if (this.#e.length > MAX_ANNOUNCEMENT_QUEUE) this.#e.splice(0, this.#e.length - MAX_ANNOUNCEMENT_QUEUE);
  }
  drainAnnouncements() {
    return this.#e.splice(0);
  }
  takeHoldRequest() {
    let e = this.#r;
    this.#r = false;
    return e;
  }
  startHold(e) {
    this.#s = e;
  }
  endHold() {
    this.#s = 0;
    this.#r = false;
  }
  holdActive(e) {
    return e < this.#s;
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
//@ chunk-vd0bcd16.js:4061-4084 placement
/**
 * 按宿主隔离的屏幕阅读器模式状态。
 */
var screenReaderModeByHost = new HostScoped(() => new ScreenReaderMode());
//@ chunk-vd0bcd16.js:4084-4119 placement
/**
 * 取出当前宿主的屏幕阅读器模式状态。
 */
function getScreenReaderMode() {
  return screenReaderModeByHost.of(getRootSession().host);
}
//@ chunk-vd0bcd16.js:4119-4149 placement
var TENGU_AX_SR_ARROW_NAV = "tengu_ax_sr_arrow_nav";
//@ chunk-vd0bcd16.js:4149-4195 placement
/**
 * 屏幕阅读器方向键导航是否启用。
 */
function isArrowNavEnabled() {
  return getScreenReaderMode().isArrowNavEnabled();
}
//@ chunk-vd0bcd16.js:4195-4246 placement
/**
 * 屏幕阅读器模式下是否启用建议导航。
 */
function isSuggestionNavEnabled() {
  return getScreenReaderMode().isSuggestionNavEnabled();
}
//@ chunk-vd0bcd16.js:4246-4283 placement
/**
 * 是否处于屏幕阅读器模式。
 */
function isScreenReaderMode() {
  return getScreenReaderMode().isEnabled();
}
//@ chunk-vd0bcd16.js:4283-4437 placement
/**
 * 读屏模式开启时的状态文本（含启用来源）。
 */
function screenReaderStatusLine() {
  {
    let screenReaderMode = getScreenReaderMode();
    if (screenReaderMode.isEnabled()) {
      let n = screenReaderMode.activationSource();
      return n ? `[Screen Reader Mode: on via ${n}]` : "[Screen Reader Mode: on]";
    }
  }
  return null;
}
//@ chunk-vd0bcd16.js:4437-5282 placement
/**
 * 项目设置中有 axScreenReader 但未生效时的提示。
 */
function screenReaderSettingHint() {
  {
    if (
      getScreenReaderMode().isEnabled() ||
      eagerHasCliFlag("--ax-screen-reader") ||
      env.CLAUDE_AX_SCREEN_READER !== undefined ||
      getSecuritySensitiveSettingWithSources("axScreenReader").some((s) => isSettingSourceEnabled(s.source))
    )
      return null;
    if (
      !["projectSettings", "localSettings"].some((s) => {
        let a = isSettingSourceEnabled(s) ? getSettingsForSource(s) : null;
        return (
          a?.axScreenReader === true ||
          Object.entries(a?.env ?? {}).some(
            ([key, value]) => key.toUpperCase() === "CLAUDE_AX_SCREEN_READER" && isEnvTruthy(value),
          )
        );
      })
    )
      return null;
    let n = "start Claude Code with --ax-screen-reader";
    if (!isSettingSourceEnabled("userSettings"))
      return `Screen reader mode is off: project settings can't turn it on. To turn it on, ${n}.`;
    let t = homedir();
    let replaced = stripControlChars(
      getSettingsFilePathForSource("userSettings") ?? join(t, ".claude", "settings.json"),
    ).replace(/[\t\n]/g, " ");
    let l = replaced.startsWith(t + sep) ? `~${replaced.slice(t.length)}` : replaced;
    return `Screen reader mode is off: project settings can't turn it on. To turn it on, ${n}, or add "axScreenReader": true to your own settings file at ${l} and restart.`;
  }
  return null;
}
//@ chunk-vd0bcd16.js:5282-5407 placement
/**
 * 启动时输出读屏模式状态或设置提示。
 */
function announceScreenReaderMode(e, n) {
  {
    if (!e) return null;
    let t = screenReaderStatusLine();
    if (t !== null) {
      n(t);
      markAnnouncementWritten();
      return t;
    }
    let r = screenReaderSettingHint();
    if (r !== null) n(r);
    return r;
  }
  return null;
}
//@ chunk-vd0bcd16.js:5407-5427 placement
/**
 * 读屏启动静默期的默认值（3 秒）。
 */
var DEFAULT_AX_STARTUP_QUIET_MS = 3000;
var MAX_AX_STARTUP_QUIET_MS = 600000;
//@ chunk-vd0bcd16.js:5427-5480 placement
/**
 * 记录一次播报已写入的时间。
 */
function markAnnouncementWritten() {
  getScreenReaderMode().markAnnouncementWritten(Date.now());
}
//@ chunk-vd0bcd16.js:5480-5517 placement
/**
 * 结束读屏启动静默期。
 */
function endStartupQuiet() {
  getScreenReaderMode().endStartupQuiet();
}
//@ chunk-vd0bcd16.js:5517-5680 placement
/**
 * 读屏启动静默期剩余毫秒数。
 */
function startupQuietRemainingMs() {
  {
    let e = getScreenReaderMode().startupQuietOpenedAtMs();
    if (e === null) return 0;
    let min = Math.min(
      env.CLAUDE_AX_STARTUP_QUIET_MS ?? DEFAULT_AX_STARTUP_QUIET_MS,
      MAX_AX_STARTUP_QUIET_MS,
    );
    let t = e + min - Date.now();
    return t > 0 ? t : 0;
  }
  return 0;
}
//@ chunk-vd0bcd16.js:5680-5695 placement
/**
 * 读屏预停放的默认时长（0）。
 */
var DEFAULT_AX_PREPARK_MS = 0;
var MAX_AX_PREPARK_MS = 5000;
//@ chunk-vd0bcd16.js:5695-5755 placement
/**
 * 读屏预停放时长（受环境变量与上限约束）。
 */
function getAxPreparkMs() {
  return Math.min(env.CLAUDE_AX_PREPARK_MS ?? DEFAULT_AX_PREPARK_MS, MAX_AX_PREPARK_MS);
}
//@ chunk-vd0bcd16.js:5755-5819 placement
/**
 * 是否重写被保持的播报（环境变量控制）。
 */
function rewriteHeldAnnouncement() {
  return env.CLAUDE_AX_REWRITE_HELD_ANNOUNCEMENT ?? false;
}
//@ chunk-vd0bcd16.js:5819-5898 placement = getToolsForDefaultPreset (0.54)
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
//@ chunk-vd0bcd16.js:5898-6032 placement
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
//@ chunk-vd0bcd16.js:6032-6041 placement
/**
 * 播报队列最多保留的条数（16）。
 */
var MAX_ANNOUNCEMENT_QUEUE = 16;
//@ chunk-vd0bcd16.js:6041-6096 placement
/**
 * 加入一条屏幕阅读器播报。
 */
function announce(e, n) {
  getScreenReaderMode().queueAnnouncement(e, n?.hold === true);
}
//@ chunk-vd0bcd16.js:6096-6205 placement
/**
 * 有播报保持请求时返回保持时长。
 */
function takeAnnouncementHoldMs() {
  if (getScreenReaderMode().takeHoldRequest())
    return Math.min(env.CLAUDE_AX_ANNOUNCEMENT_HOLD_MS ?? 1000, 1e4);
  return 0;
}
//@ chunk-vd0bcd16.js:6205-6249 placement
/**
 * 开始一段播报保持（给定毫秒）。
 */
function startAnnouncementHold(e) {
  getScreenReaderMode().startHold(Date.now() + e);
}
//@ chunk-vd0bcd16.js:6249-6278 placement
/**
 * 结束播报保持。
 */
function endAnnouncementHold() {
  getScreenReaderMode().endHold();
}
//@ chunk-vd0bcd16.js:6278-6327 placement
/**
 * 当前是否处于播报保持。
 */
function isAnnouncementHoldActive() {
  return getScreenReaderMode().holdActive(Date.now());
}
//@ chunk-vd0bcd16.js:6327-6374 placement
/**
 * 取出播报队列里的全部播报。
 */
function drainAnnouncements() {
  return getScreenReaderMode().drainAnnouncements();
}
export {
  isScreenReaderMode,
  screenReaderTelemetryFields,
  scrubErrorText,
  errorTelemetryFields,
  getScreenReaderEnv,
  announce,
  isSuggestionNavEnabled,
  endAnnouncementHold,
  announceScreenReaderMode,
  swapRemoteGateReader,
  endStartupQuiet,
  rewriteHeldAnnouncement,
  startupQuietRemainingMs,
  isAnnouncementHoldActive,
  drainAnnouncements,
  takeAnnouncementHoldMs,
  getAxPreparkMs,
  startAnnouncementHold,
  isArrowNavEnabled,
};
