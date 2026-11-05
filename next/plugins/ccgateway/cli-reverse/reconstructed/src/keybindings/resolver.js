/**
 * keybindings/resolver.ts
 *
 * 并入旧版已有路径：快捷键解析。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/keybindings/resolver.ts
 * pieces: chunk-m2f3rb0f.js (18)
 * attribution: placement 9, fingerprint 2, layout 4, callgraph-fingerprint 2, callgraph-witnessed 1
 */
import { chordsEqual, keyEventToKeystroke } from "./match.js";
import { chordToString } from "./parser.js";
import { KEYBINDING_ACTIONS } from "./schema.js";
import { lit, fromSanitizer_SANITIZER_OUTPUT_ONLY } from "../services/analytics/safeMetadata.js";
import { keybindingsState } from "./loadUserBindings.js";
import { logEvent } from "../services/analytics/index.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-m2f3rb0f.js:18412-18588 placement
/**
 * 找某上下文里某动作当前生效的和弦（没被后面同和弦绑定覆盖的最后一条）；动作存在但全被覆盖返回 null，不存在返回 undefined。
 */
function getActionChord(action, context, bindings) {
  let found = false;
  let chord;
  for (let k = 0; k < bindings.length; k++) {
    let binding = bindings[k];
    if (!binding || binding.context !== context || binding.action !== action) continue;
    found = true;
    if (!isOverriddenLater(bindings, k)) chord = binding.chord;
  }
  if (chord) return chord;
  return found ? null : undefined;
}
//@ chunk-m2f3rb0f.js:18588-18703 placement
function getActionChords(action, context, bindings) {
  let chords = [];
  bindings.forEach((binding, index) => {
    if (binding.context === context && binding.action === action && !isOverriddenLater(bindings, index))
      chords.push(binding.chord);
  });
  return chords;
}
//@ chunk-m2f3rb0f.js:18703-18871 fingerprint (2.1.88 match: getBindingDisplayText, 1)
/**
 * 该上下文里该动作的所有和弦最终都被解绑（最后一条同和弦绑定的 action 为 null）。
 */
function isActionUnbound(action, context, bindings) {
  let filtered = bindings.filter((binding) => binding.context === context && binding.action === action);
  return (
    filtered.length > 0 &&
    filtered.every(
      (binding) =>
        bindings.findLast(
          (binding_2) => binding_2.context === context && chordsEqual(binding_2.chord, binding.chord),
        )?.action === null,
    )
  );
}
//@ chunk-m2f3rb0f.js:18871-19166 layout
/**
 * 在动作的多个有效和弦里挑一个用来显示：用户自定义的优先（+3），无修饰的导航键次之（+2），无修饰单字符再次（+1）。
 */
function pickDisplayChord(action, context, bindings, defaultBindings) {
  let best;
  let bestScore = -1;
  for (let chord of getActionChords(action, context, bindings)) {
    let isDefault = defaultBindings.some(
      (binding) =>
        binding.context === context && binding.action === action && chordsEqual(binding.chord, chord),
    );
    let single = chord.length === 1 ? chord[0] : undefined;
    let isPlain = single !== undefined && !single.ctrl && !single.alt && !single.meta && !single.super;
    let keyScore = 0;
    if (isPlain && NAVIGATION_KEYS.has(single.key)) keyScore = 2;
    else if (isPlain && single.key.length === 1) keyScore = 1;
    let score = (isDefault ? 0 : 3) + keyScore;
    if (score > bestScore) {
      best = chord;
      bestScore = score;
    }
  }
  return best;
}
//@ chunk-m2f3rb0f.js:19166-19292 layout
var NAVIGATION_KEYS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-m2f3rb0f.js:19166", () => {
  NAVIGATION_KEYS = new Set([
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
});
//@ chunk-m2f3rb0f.js:19292-19442 layout
function isOverriddenLater(bindings, index) {
  let binding = bindings[index];
  if (!binding) return false;
  for (let k = index + 1; k < bindings.length; k++) {
    let later = bindings[k];
    if (later && later.context === binding.context && chordsEqual(later.chord, binding.chord)) return true;
  }
  return false;
}
//@ chunk-m2f3rb0f.js:19442-19587 callgraph-fingerprint (2.1.88 match: chordExactlyMatches, 1)
function getSingleKeyAction(keystroke, context, bindings) {
  let action = null;
  for (let binding of bindings) {
    if (binding.context !== context || binding.chord.length !== 1) continue;
    let firstKey = binding.chord[0];
    if (firstKey && keystrokesEqual(firstKey, keystroke)) action = binding.action;
  }
  return action;
}
//@ chunk-m2f3rb0f.js:19587-19736 placement
function getSingleKeyActionInContexts(keyName, contexts, bindings) {
  let action;
  for (let binding of bindings) {
    if (binding.chord.length !== 1 || !contexts.includes(binding.context)) continue;
    let firstKey = binding.chord[0];
    if (firstKey && keystrokesEqual(firstKey, keyName)) action = binding.action;
  }
  return action;
}
//@ chunk-m2f3rb0f.js:20571-20700 callgraph-fingerprint (2.1.88 match: keystrokesEqual, 1)
/**
 * 两个 Keystroke 是否相同（alt 与 meta 视为同一修饰键，终端无法区分）。
 */
function keystrokesEqual(a, b) {
  return (
    a.key === b.key &&
    a.ctrl === b.ctrl &&
    a.shift === b.shift &&
    (a.alt || a.meta) === (b.alt || b.meta) &&
    a.super === b.super
  );
}
//@ chunk-m2f3rb0f.js:20700-20856 callgraph-witnessed (2.1.88 match: chordPrefixMatches, 1)
function chordPrefixMatches(prefix, binding) {
  if (prefix.length >= binding.chord.length) return false;
  for (let i = 0; i < prefix.length; i++) {
    let prefixKey = prefix[i];
    let bindingKey = binding.chord[i];
    if (!prefixKey || !bindingKey) return false;
    if (!keystrokesEqual(prefixKey, bindingKey)) return false;
  }
  return true;
}
//@ chunk-m2f3rb0f.js:20856-21444 fingerprint (2.1.88 match: resolveKeyWithChordState, 0.887)
/**
 * 按键解析核心：Esc 在和弦进行中取消和弦；把当前按键追加到待定和弦，在给定上下文集合里找：有更长绑定以它为前缀且其中有非 null 动作 → chord_started；精确匹配 → match（action 为 null 则 unbound）；和弦进行中却没匹配 → chord_cancelled；否则 none。同和弦多条以列表中最后一条为准。
 */
function resolveKeyWithChordState(input, key, activeContexts, pendingChord) {
  if (input.name === "escape" && pendingChord !== null)
    return {
      type: "chord_cancelled",
    };
  let keystroke = keyEventToKeystroke(input);
  if (!keystroke) {
    if (pendingChord !== null)
      return {
        type: "chord_cancelled",
      };
    return {
      type: "none",
    };
  }
  let testChord = pendingChord ? [...pendingChord, keystroke] : [keystroke];
  let chordPrefixes = null;
  let exactMatch;
  for (let binding of activeContexts) {
    if (!key.includes(binding.context)) continue;
    if (binding.chord.length > testChord.length) {
      if (chordPrefixMatches(testChord, binding)) {
        chordPrefixes ??= new Map();
        chordPrefixes.set(chordToString(binding.chord), binding.action);
      }
    } else if (chordsEqual(testChord, binding.chord)) exactMatch = binding;
  }
  if (chordPrefixes !== null) {
    for (let action of chordPrefixes.values())
      if (action !== null)
        return {
          type: "chord_started",
          pending: testChord,
        };
  }
  if (exactMatch) {
    if (exactMatch.action === null)
      return {
        type: "unbound",
      };
    return {
      type: "match",
      action: exactMatch.action,
    };
  }
  if (pendingChord !== null)
    return {
      type: "chord_cancelled",
    };
  return {
    type: "none",
  };
}
//@ chunk-m2f3rb0f.js:21444-22073 layout (2.1.88 match: resolveKeyWithChordState, 0.887)
/**
 * 按作用域链解析：同上，但精确匹配按传入上下文顺序（焦点节点到根的 keybindingScope 链）取第一个上下文的胜者，而不是全局最后一条。
 */
function resolveKeyInScopeChain(input, contexts, bindings, pendingChord) {
  if (input.name === "escape" && pendingChord !== null)
    return {
      type: "chord_cancelled",
    };
  let keystroke = keyEventToKeystroke(input);
  if (!keystroke) {
    if (pendingChord !== null)
      return {
        type: "chord_cancelled",
      };
    return {
      type: "none",
    };
  }
  let testChord = pendingChord ? [...pendingChord, keystroke] : [keystroke];
  let ctxSet = new Set(contexts);
  let chordPrefixes = new Map();
  let chordWinners = new Map();
  for (let binding of bindings) {
    if (!ctxSet.has(binding.context)) continue;
    if (binding.chord.length > testChord.length) {
      if (chordPrefixMatches(testChord, binding))
        chordPrefixes.set(chordToString(binding.chord), binding.action);
    } else if (chordsEqual(testChord, binding.chord)) chordWinners.set(binding.context, binding);
  }
  for (let action of chordPrefixes.values())
    if (action !== null)
      return {
        type: "chord_started",
        pending: testChord,
      };
  for (let binding of contexts) {
    let exactMatch = chordWinners.get(binding);
    if (exactMatch) {
      if (exactMatch.action === null)
        return {
          type: "unbound",
        };
      return {
        type: "match",
        action: exactMatch.action,
      };
    }
  }
  if (pendingChord !== null)
    return {
      type: "chord_cancelled",
    };
  return {
    type: "none",
  };
}
//@ chunk-m2f3rb0f.js:22073-22093 placement
var KNOWN_ACTIONS; // deferred: uses KEYBINDING_CONTEXT_DESCRIPTIONS (./schema.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-m2f3rb0f.js:22073", () => {
  KNOWN_ACTIONS = new Set(KEYBINDING_ACTIONS);
});
//@ chunk-m2f3rb0f.js:22093-22209 placement
function toActionTelemetryId(actionId) {
  if (actionId.startsWith("command:")) return lit("command:custom");
  if (KNOWN_ACTIONS.has(actionId)) return fromSanitizer_SANITIZER_OUTPUT_ONLY(actionId);
  return lit("unknown");
}
//@ chunk-m2f3rb0f.js:22209-22272 placement
var SAFE_FALLBACK_TEXT_RE = /^[A-Za-z0-9 +\-_/[\]\u2191\u2193\u2190\u2192]{1,32}$/u;
//@ chunk-m2f3rb0f.js:22272-22324 placement
function toFallbackTelemetryValue(text) {
  return SAFE_FALLBACK_TEXT_RE.test(text) ? fromSanitizer_SANITIZER_OUTPUT_ONLY(text) : lit("invalid");
}
//@ chunk-m2f3rb0f.js:22324-22336 placement
var ACTION_FIRED_LOG_THROTTLE_MS = 1000;
//@ chunk-m2f3rb0f.js:22336-22491 placement
/**
 * 动作触发时发 tengu_keybinding_fired（同一动作 1 秒内只记一次）。
 */
function logKeybindingFired(actionId) {
  let now = Date.now();
  let actionFiredLoggedAt = keybindingsState.actionFiredLoggedAt;
  let lastLoggedAt = actionFiredLoggedAt.get(actionId);
  if (lastLoggedAt !== undefined && now - lastLoggedAt < ACTION_FIRED_LOG_THROTTLE_MS) return;
  actionFiredLoggedAt.set(actionId, now);
  logEvent("tengu_keybinding_fired", {
    action_id: toActionTelemetryId(actionId),
  });
}
export {
  keystrokesEqual,
  resolveKeyWithChordState,
  toActionTelemetryId,
  toFallbackTelemetryValue,
  getSingleKeyActionInContexts,
  getSingleKeyAction,
  isActionUnbound,
  getActionChords,
  pickDisplayChord,
  getActionChord,
  logKeybindingFired,
  resolveKeyInScopeChain,
};
