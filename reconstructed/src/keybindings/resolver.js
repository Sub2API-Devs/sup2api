/**
 * keybindings/resolver.ts
 *
 * 并入旧版已有路径：快捷键解析。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/keybindings/resolver.ts
 * pieces: chunk-x1mwqya5.js (18)
 * attribution: placement 9, fingerprint 2, layout 4, callgraph-fingerprint 2, callgraph-witnessed 1
 */
import { chordsEqual, keyEventToKeystroke } from "./match.js";
import { chordToString } from "./parser.js";
import { KEYBINDING_ACTIONS } from "./schema.js";
import { lit, fromSanitizer_SANITIZER_OUTPUT_ONLY } from "../services/analytics/safeMetadata.js";
import { keybindingsState } from "./loadUserBindings.js";
import { logEvent } from "../services/analytics/index.js";

/**
 * 找某上下文里某动作当前生效的和弦（没被后面同和弦绑定覆盖的最后一条）；动作存在但全被覆盖返回 null，不存在返回 undefined。
 */
//@ chunk-x1mwqya5.js:18414-18590 placement
function getActionChord(n, r, e) {
  let found = !1,
    chord;
  for (let y = 0; y < e.length; y++) {
    let binding = e[y];
    if (!binding || binding.context !== r || binding.action !== n) continue;
    if (((found = !0), !isOverriddenLater(e, y))) chord = binding.chord;
  }
  if (chord) return chord;
  return found ? null : void 0;
}
//@ chunk-x1mwqya5.js:18590-18705 placement
function getActionChords(n, r, e) {
  let s = [];
  return (
    e.forEach((l, y) => {
      if (l.context === r && l.action === n && !isOverriddenLater(e, y)) s.push(l.chord);
    }),
    s
  );
}
/**
 * 该上下文里该动作的所有和弦最终都被解绑（最后一条同和弦绑定的 action 为 null）。
 */
//@ chunk-x1mwqya5.js:18705-18873 fingerprint = getBindingDisplayText (1)
function isActionUnbound(action, context, bindings) {
  let filtered = bindings.filter((l) => l.context === context && l.action === action);
  return (
    filtered.length > 0 &&
    filtered.every(
      (l) =>
        bindings.findLast((y) => y.context === context && chordsEqual(y.chord, l.chord))?.action === null,
    )
  );
}
/**
 * 在动作的多个有效和弦里挑一个用来显示：用户自定义的优先（+3），无修饰的导航键次之（+2），无修饰单字符再次（+1）。
 */
//@ chunk-x1mwqya5.js:18873-19168 layout
function pickDisplayChord(n, r, e, s) {
  let best,
    bestScore = -1;
  for (let chord of getActionChords(n, r, e)) {
    let isDefault = s.some((C) => C.context === r && C.action === n && chordsEqual(C.chord, chord)),
      single = chord.length === 1 ? chord[0] : void 0,
      isPlain = single !== void 0 && !single.ctrl && !single.alt && !single.meta && !single.super,
      keyScore = 0;
    if (isPlain && NAVIGATION_KEYS.has(single.key)) keyScore = 2;
    else if (isPlain && single.key.length === 1) keyScore = 1;
    let score = (isDefault ? 0 : 3) + keyScore;
    if (score > bestScore) ((best = chord), (bestScore = score));
  }
  return best;
}
//@ chunk-x1mwqya5.js:19168-19294 layout
var NAVIGATION_KEYS = new Set([
  "up",
  "down",
  "left",
  "right",
  "enter",
  "escape",
  "tab",
  " ",
  "pageup",
  "pagedown",
  "home",
  "end",
  "backspace",
  "delete",
]);
//@ chunk-x1mwqya5.js:19294-19444 layout
function isOverriddenLater(n, r) {
  let e = n[r];
  if (!e) return !1;
  for (let s = r + 1; s < n.length; s++) {
    let l = n[s];
    if (l && l.context === e.context && chordsEqual(l.chord, e.chord)) return !0;
  }
  return !1;
}
//@ chunk-x1mwqya5.js:19444-19589 callgraph-fingerprint = chordExactlyMatches (1)
function getSingleKeyAction(n, r, e) {
  let s = null;
  for (let l of e) {
    if (l.context !== r || l.chord.length !== 1) continue;
    let y = l.chord[0];
    if (y && keystrokesEqual(y, n)) s = l.action;
  }
  return s;
}
//@ chunk-x1mwqya5.js:19589-19738 placement
function getSingleKeyActionInContexts(n, r, e) {
  let s;
  for (let l of e) {
    if (l.chord.length !== 1 || !r.includes(l.context)) continue;
    let y = l.chord[0];
    if (y && keystrokesEqual(y, n)) s = l.action;
  }
  return s;
}
/**
 * 两个 Keystroke 是否相同（alt 与 meta 视为同一修饰键，终端无法区分）。
 */
//@ chunk-x1mwqya5.js:20573-20702 callgraph-fingerprint = keystrokesEqual (1)
function keystrokesEqual(a, b) {
  return (
    a.key === b.key &&
    a.ctrl === b.ctrl &&
    a.shift === b.shift &&
    (a.alt || a.meta) === (b.alt || b.meta) &&
    a.super === b.super
  );
}
//@ chunk-x1mwqya5.js:20702-20858 callgraph-witnessed = chordPrefixMatches (1)
function chordPrefixMatches(prefix, binding) {
  if (prefix.length >= binding.chord.length) return !1;
  for (let e = 0; e < prefix.length; e++) {
    let s = prefix[e],
      l = binding.chord[e];
    if (!s || !l) return !1;
    if (!keystrokesEqual(s, l)) return !1;
  }
  return !0;
}
/**
 * 按键解析核心：Esc 在和弦进行中取消和弦；把当前按键追加到待定和弦，在给定上下文集合里找：有更长绑定以它为前缀且其中有非 null 动作 → chord_started；精确匹配 → match（action 为 null 则 unbound）；和弦进行中却没匹配 → chord_cancelled；否则 none。同和弦多条以列表中最后一条为准。
 */
//@ chunk-x1mwqya5.js:20858-21446 fingerprint = resolveKeyWithChordState (0.887)
function resolveKeyWithChordState(n, r, e, s) {
  if (n.name === "escape" && s !== null) return { type: "chord_cancelled" };
  let keystroke = keyEventToKeystroke(n);
  if (!keystroke) {
    if (s !== null) return { type: "chord_cancelled" };
    return { type: "none" };
  }
  let testChord = s ? [...s, keystroke] : [keystroke],
    chordPrefixes = null,
    exactMatch;
  for (let binding of e) {
    if (!r.includes(binding.context)) continue;
    if (binding.chord.length > testChord.length) {
      if (chordPrefixMatches(testChord, binding))
        ((chordPrefixes ??= new Map()), chordPrefixes.set(chordToString(binding.chord), binding.action));
    } else if (chordsEqual(testChord, binding.chord)) exactMatch = binding;
  }
  if (chordPrefixes !== null) {
    for (let action of chordPrefixes.values())
      if (action !== null) return { type: "chord_started", pending: testChord };
  }
  if (exactMatch) {
    if (exactMatch.action === null) return { type: "unbound" };
    return { type: "match", action: exactMatch.action };
  }
  if (s !== null) return { type: "chord_cancelled" };
  return { type: "none" };
}
/**
 * 按作用域链解析：同上，但精确匹配按传入上下文顺序（焦点节点到根的 keybindingScope 链）取第一个上下文的胜者，而不是全局最后一条。
 */
//@ chunk-x1mwqya5.js:21446-22075 layout = resolveKeyWithChordState (0.887)
function resolveKeyInScopeChain(n, r, e, s) {
  if (n.name === "escape" && s !== null) return { type: "chord_cancelled" };
  let keystroke = keyEventToKeystroke(n);
  if (!keystroke) {
    if (s !== null) return { type: "chord_cancelled" };
    return { type: "none" };
  }
  let testChord = s ? [...s, keystroke] : [keystroke],
    ctxSet = new Set(r),
    chordPrefixes = new Map(),
    chordWinners = new Map();
  for (let binding of e) {
    if (!ctxSet.has(binding.context)) continue;
    if (binding.chord.length > testChord.length) {
      if (chordPrefixMatches(testChord, binding))
        chordPrefixes.set(chordToString(binding.chord), binding.action);
    } else if (chordsEqual(testChord, binding.chord)) chordWinners.set(binding.context, binding);
  }
  for (let action of chordPrefixes.values())
    if (action !== null) return { type: "chord_started", pending: testChord };
  for (let binding of r) {
    let K = chordWinners.get(binding);
    if (K) {
      if (K.action === null) return { type: "unbound" };
      return { type: "match", action: K.action };
    }
  }
  if (s !== null) return { type: "chord_cancelled" };
  return { type: "none" };
}
//@ chunk-x1mwqya5.js:22075-22095 placement
var KNOWN_ACTIONS = new Set(KEYBINDING_ACTIONS);
//@ chunk-x1mwqya5.js:22095-22211 placement
function toActionTelemetryId(n) {
  if (n.startsWith("command:")) return lit("command:custom");
  if (KNOWN_ACTIONS.has(n)) return fromSanitizer_SANITIZER_OUTPUT_ONLY(n);
  return lit("unknown");
}
//@ chunk-x1mwqya5.js:22211-22274 placement
var SAFE_FALLBACK_TEXT = /^[A-Za-z0-9 +\-_/[\]\u2191\u2193\u2190\u2192]{1,32}$/u;
//@ chunk-x1mwqya5.js:22274-22326 placement
function toFallbackTelemetryValue(n) {
  return SAFE_FALLBACK_TEXT.test(n) ? fromSanitizer_SANITIZER_OUTPUT_ONLY(n) : lit("invalid");
}
//@ chunk-x1mwqya5.js:22326-22338 placement
var ACTION_FIRED_LOG_THROTTLE_MS = 1000;
/**
 * 动作触发时发 tengu_keybinding_fired（同一动作 1 秒内只记一次）。
 */
//@ chunk-x1mwqya5.js:22338-22493 placement
function logKeybindingFired(n) {
  let now = Date.now(),
    actionFiredLoggedAt = keybindingsState.actionFiredLoggedAt,
    s = actionFiredLoggedAt.get(n);
  if (s !== void 0 && now - s < ACTION_FIRED_LOG_THROTTLE_MS) return;
  (actionFiredLoggedAt.set(n, now),
    logEvent("tengu_keybinding_fired", { action_id: toActionTelemetryId(n) }));
}

export {
  isActionUnbound,
  getActionChords,
  pickDisplayChord,
  getActionChord,
  getSingleKeyAction,
  resolveKeyWithChordState,
  getSingleKeyActionInContexts,
  toActionTelemetryId,
  toFallbackTelemetryValue,
  keystrokesEqual,
  logKeybindingFired,
  resolveKeyInScopeChain,
};
