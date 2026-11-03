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
import { gn } from "../shortHash.js";
import { sanitizeErrnoForTelemetry, sanitizeClassName, sanitizeTopFrame } from "../errors.js";
import {
  stripStackHeader,
  getSanitizedStackFrames,
  Iys,
  DSr,
  getBaseName,
  tDn,
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

/**
 * 遮盖错误文本中的 URL、邮箱、密钥、路径等再做哈希。
 */
//@ chunk-vd0bcd16.js:654-1333 placement
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
var g = 4000;
/**
 * 提取错误栈的前几帧（区分内部/外部）。
 */
//@ chunk-vd0bcd16.js:1344-1840 placement
function topStackFrames(e, n = 5) {
  let t = [],
    r;
  for (let l of e.slice(0, g).split(`
`)) {
    let trimmed = l.trim();
    if (!trimmed.startsWith("at ")) continue;
    let sliced = trimmed.slice(3),
      index = sliced.indexOf(" (");
    if (r === void 0) {
      let R = index !== -1 ? sliced.slice(index + 2, -1) : sliced;
      if (/^(?:node|bun|internal):/.test(R)) r = R;
      else {
        let match = R.match(/([^/\\]+:\d+:\d+)\)?$/);
        if (match) r = match[1];
      }
    }
    let c = index !== -1 ? sliced.slice(0, index) : sliced;
    if (
      ((c = c.replace(/^async\s+/, "").replace(/^new\s+/, "")),
      c.includes("/") || c.includes("\\") || /:\d/.test(c))
    )
      continue;
    if (c) t.push(c);
    if (t.length >= n) break;
  }
  return { names: t, topFrame: r };
}
//@ chunk-vd0bcd16.js:1840-1908 placement
function N(e) {
  try {
    return String(e);
  } catch {
    return "[unstringifiable]";
  }
}
/**
 * 生成错误遥测字段（消息哈希、错误码、构造器名、栈）。
 */
//@ chunk-vd0bcd16.js:1908-2625 placement
function errorTelemetryFields(e) {
  try {
    let n = N(e instanceof Error ? e.message : e),
      t = { error_message_hash: gn(scrubErrorText(n)) },
      r = sanitizeErrnoForTelemetry(e);
    if (r !== void 0) t.error_code = r;
    if (!(e instanceof Error)) return t;
    let l = sanitizeClassName(e.constructor?.name);
    if (l !== void 0) t.error_constructor = l;
    let stack = e.stack;
    if (typeof stack !== "string") return t;
    let a = { name: e.name, message: e.message, stack: stack },
      u = stripStackHeader(a),
      c = u.length < stack.length && stack.endsWith(u),
      { names: names, topFrame: topFrame } = topStackFrames(u);
    if (names.length > 0) t.error_stack_hash = gn(names.join("|"));
    let A = stack.length - u.length,
      sliced = stack.slice(0, A + g),
      [f] = c ? getSanitizedStackFrames({ ...a, stack: sliced }, 1) : [];
    if (f !== void 0) {
      let m = Iys(f) ? f.file : DSr(f) ? getBaseName(f.file) : void 0,
        S = sanitizeTopFrame(m === void 0 ? tDn : `${m}:${f.line}:${f.column}`),
        b = m !== void 0 && sanitizeTopFrame(topFrame ?? "") !== S;
      if (S !== void 0 && !b) t.error_top_frame = S;
    }
    return t;
  } catch {
    return {};
  }
}
//@ chunk-vd0bcd16.js:2691-2722 placement
var TENGU_AX_SCREEN_READER = "tengu_ax_screen_reader";
//@ chunk-vd0bcd16.js:2722-2773 placement
function eAi(e) {
  return o().swapRemoteGateReader(e);
}
/**
 * 屏幕阅读器模式状态（启用来源、方向键导航、播报队列与保持）。
 */
//@ chunk-vd0bcd16.js:2773-4061 placement
class ScreenReaderMode {
  #n;
  #a;
  #o;
  #u;
  #t = null;
  #i = null;
  #c = !1;
  #e = [];
  #r = !1;
  #s = 0;
  swapRemoteGateReader(e) {
    let n = this.#t;
    return ((this.#t = e), n);
  }
  isEnabled() {
    if (this.#n !== void 0) return this.#n;
    let e, n;
    if (eagerHasCliFlag("--ax-screen-reader")) ((e = !0), (n = "flag"));
    else {
      let CLAUDE_AX_SCREEN_READER = env.CLAUDE_AX_SCREEN_READER;
      if (CLAUDE_AX_SCREEN_READER !== void 0) ((e = CLAUDE_AX_SCREEN_READER), (n = "env"));
      else
        ((e =
          getSecuritySensitiveSettingWithSources("axScreenReader").find((l) =>
            isSettingSourceEnabled(l.source),
          )?.value === !0),
          (n = "settings"));
    }
    if (!e) return (this.#n = !1);
    let t = this.#t?.(TENGU_AX_SCREEN_READER, !0) ?? !0;
    return ((this.#a = t ? n : void 0), (this.#n = t));
  }
  activationSource() {
    return this.isEnabled() ? this.#a : void 0;
  }
  isArrowNavEnabled() {
    if (this.#o === void 0) this.#o = this.#t?.(TENGU_AX_SR_ARROW_NAV, !1) ?? !1;
    return this.#o;
  }
  isSuggestionNavEnabled() {
    {
      if (!this.isEnabled()) return !1;
      let e = !1;
      return ((this.#u ??= this.#t?.("tengu_ax_sr_suggestion_nav", e) ?? e), this.#u);
    }
    return !1;
  }
  markAnnouncementWritten(e) {
    if (this.#i === null) this.#i = e;
  }
  endStartupQuiet() {
    this.#c = !0;
  }
  startupQuietOpenedAtMs() {
    return this.#c ? null : this.#i;
  }
  queueAnnouncement(e, n = !1) {
    if ((this.#e.push(e), n)) this.#r = !0;
    if (this.#e.length > p) this.#e.splice(0, this.#e.length - p);
  }
  drainAnnouncements() {
    return this.#e.splice(0);
  }
  takeHoldRequest() {
    let e = this.#r;
    return ((this.#r = !1), e);
  }
  startHold(e) {
    this.#s = e;
  }
  endHold() {
    ((this.#s = 0), (this.#r = !1));
  }
  holdActive(e) {
    return e < this.#s;
  }
  reset() {
    ((this.#n = void 0),
      (this.#a = void 0),
      (this.#o = void 0),
      (this.#u = void 0),
      (this.#i = null),
      (this.#c = !1),
      (this.#e.length = 0),
      (this.#r = !1),
      (this.#s = 0));
  }
}
//@ chunk-vd0bcd16.js:4061-4084 placement
var T = new HostScoped(() => new ScreenReaderMode());
//@ chunk-vd0bcd16.js:4084-4119 placement
function o() {
  return T.of(getRootSession().host);
}
//@ chunk-vd0bcd16.js:4119-4149 placement
var TENGU_AX_SR_ARROW_NAV = "tengu_ax_sr_arrow_nav";
/**
 * 屏幕阅读器方向键导航是否启用。
 */
//@ chunk-vd0bcd16.js:4149-4195 placement
function isArrowNavEnabled() {
  return o().isArrowNavEnabled();
}
//@ chunk-vd0bcd16.js:4195-4246 placement
function whr() {
  return o().isSuggestionNavEnabled();
}
/**
 * 是否处于屏幕阅读器模式。
 */
//@ chunk-vd0bcd16.js:4246-4283 placement
function isScreenReaderMode() {
  return o().isEnabled();
}
/**
 * 读屏模式开启时的状态文本（含启用来源）。
 */
//@ chunk-vd0bcd16.js:4283-4437 placement
function screenReaderStatusLine() {
  {
    let e = o();
    if (e.isEnabled()) {
      let activationSource = e.activationSource();
      return activationSource
        ? `[Screen Reader Mode: on via ${activationSource}]`
        : "[Screen Reader Mode: on]";
    }
  }
  return null;
}
/**
 * 项目设置中有 axScreenReader 但未生效时的提示。
 */
//@ chunk-vd0bcd16.js:4437-5282 placement
function screenReaderSettingHint() {
  {
    if (
      o().isEnabled() ||
      eagerHasCliFlag("--ax-screen-reader") ||
      env.CLAUDE_AX_SCREEN_READER !== void 0 ||
      getSecuritySensitiveSettingWithSources("axScreenReader").some((s) => isSettingSourceEnabled(s.source))
    )
      return null;
    if (
      !["projectSettings", "localSettings"].some((s) => {
        let a = isSettingSourceEnabled(s) ? getSettingsForSource(s) : null;
        return (
          a?.axScreenReader === !0 ||
          Object.entries(a?.env ?? {}).some(
            ([u, c]) => u.toUpperCase() === "CLAUDE_AX_SCREEN_READER" && isEnvTruthy(c),
          )
        );
      })
    )
      return null;
    let n = "start Claude Code with --ax-screen-reader";
    if (!isSettingSourceEnabled("userSettings"))
      return `Screen reader mode is off: project settings can't turn it on. To turn it on, ${n}.`;
    let t = homedir(),
      replaced = stripControlChars(
        getSettingsFilePathForSource("userSettings") ?? join(t, ".claude", "settings.json"),
      ).replace(/[\t\n]/g, " "),
      l = replaced.startsWith(t + sep) ? `~${replaced.slice(t.length)}` : replaced;
    return `Screen reader mode is off: project settings can't turn it on. To turn it on, ${n}, or add "axScreenReader": true to your own settings file at ${l} and restart.`;
  }
  return null;
}
/**
 * 启动时输出读屏模式状态或设置提示。
 */
//@ chunk-vd0bcd16.js:5282-5407 placement
function announceScreenReaderMode(e, n) {
  {
    if (!e) return null;
    let t = screenReaderStatusLine();
    if (t !== null) return (n(t), k(), t);
    let r = screenReaderSettingHint();
    if (r !== null) n(r);
    return r;
  }
  return null;
}
//@ chunk-vd0bcd16.js:5407-5427 placement
var F = 3000,
  y = 600000;
//@ chunk-vd0bcd16.js:5427-5480 placement
function k() {
  o().markAnnouncementWritten(Date.now());
}
//@ chunk-vd0bcd16.js:5480-5517 placement
function Roo() {
  o().endStartupQuiet();
}
/**
 * 读屏启动静默期剩余毫秒数。
 */
//@ chunk-vd0bcd16.js:5517-5680 placement
function startupQuietRemainingMs() {
  {
    let startupQuietOpenedAtMs = o().startupQuietOpenedAtMs();
    if (startupQuietOpenedAtMs === null) return 0;
    let min = Math.min(env.CLAUDE_AX_STARTUP_QUIET_MS ?? F, y),
      t = startupQuietOpenedAtMs + min - Date.now();
    return t > 0 ? t : 0;
  }
  return 0;
}
//@ chunk-vd0bcd16.js:5680-5695 placement
var H = 0,
  O = 5000;
//@ chunk-vd0bcd16.js:5695-5755 placement
function rAi() {
  return Math.min(env.CLAUDE_AX_PREPARK_MS ?? H, O);
}
//@ chunk-vd0bcd16.js:5755-5819 placement
function oAi() {
  return env.CLAUDE_AX_REWRITE_HELD_ANNOUNCEMENT ?? !1;
}
/**
 * （旧版名 getToolsForDefaultPreset 是错配）屏幕阅读器模式开启时返回子进程环境 {CLAUDE_AX_SCREEN_READER:"1"}，否则空对象。
 */
//@ chunk-vd0bcd16.js:5819-5898 placement = getToolsForDefaultPreset (0.54)
function getScreenReaderEnv() {
  if (o().isEnabled()) return { CLAUDE_AX_SCREEN_READER: "1" };
  return {};
}
/**
 * 读屏模式的遥测字段。
 */
//@ chunk-vd0bcd16.js:5898-6032 placement
function screenReaderTelemetryFields() {
  {
    let e = o();
    if (e.isEnabled())
      return { screenReaderMode: !0, screenReaderActivationSource: fromEnumOpt(e.activationSource()) };
  }
  return {};
}
//@ chunk-vd0bcd16.js:6032-6041 placement
var p = 16;
/**
 * 加入一条屏幕阅读器播报。
 */
//@ chunk-vd0bcd16.js:6041-6096 placement
function announce(e, n) {
  o().queueAnnouncement(e, n?.hold === !0);
}
/**
 * 有播报保持请求时返回保持时长。
 */
//@ chunk-vd0bcd16.js:6096-6205 placement
function takeAnnouncementHoldMs() {
  if (o().takeHoldRequest()) return Math.min(env.CLAUDE_AX_ANNOUNCEMENT_HOLD_MS ?? 1000, 1e4);
  return 0;
}
//@ chunk-vd0bcd16.js:6205-6249 placement
function aAi(e) {
  o().startHold(Date.now() + e);
}
/**
 * 结束播报保持。
 */
//@ chunk-vd0bcd16.js:6249-6278 placement
function endAnnouncementHold() {
  o().endHold();
}
//@ chunk-vd0bcd16.js:6278-6327 placement
function lAi() {
  return o().holdActive(Date.now());
}
//@ chunk-vd0bcd16.js:6327-6374 placement
function dAi() {
  return o().drainAnnouncements();
}

export {
  isScreenReaderMode,
  screenReaderTelemetryFields,
  scrubErrorText,
  errorTelemetryFields,
  getScreenReaderEnv,
  announce,
  whr,
  endAnnouncementHold,
  announceScreenReaderMode,
  eAi,
  Roo,
  oAi,
  startupQuietRemainingMs,
  lAi,
  dAi,
  takeAnnouncementHoldMs,
  rAi,
  aAi,
  isArrowNavEnabled,
};
