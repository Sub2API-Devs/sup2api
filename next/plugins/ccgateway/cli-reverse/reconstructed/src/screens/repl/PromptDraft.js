/**
 * screens/repl/PromptDraft.ts
 *
 * 2.1.316 新增。REPL 控制器：输入草稿。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (8)
 * attribution: placement 8
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isDeepStrictEqual } from "util";
import {
  init_react_production,
  useState,
  useEffect,
  useRef,
} from "../../../vendor/react/cjs/react.production.js";
import { getGraphemeSegmenter } from "../../utils/intl.js";
import { isPlaceholderAt } from "../../utils/Cursor.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { logForDebugging } from "../../utils/debug.js";
import {
  stringSchema,
  objectSchema,
  literal,
  array,
  numberSchema,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { Text, Box } from "../../ink/components/Text.js";
import { logEvent } from "../../services/analytics/index.js";
import { env } from "../../utils/env.js";
import { logError } from "../../utils/log.js";
import { logFeatureSad, logFeatureBad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { createSignal } from "../../utils/signal.js";
import {
  errorMessage,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  getErrnoCode,
} from "../../utils/errors.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { fromEnum, lit as lit_2 } from "../../services/analytics/safeMetadata.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { EMPTY_SPANS } from "../../plugins/functionHooks/prompt/decorationSpans.js";
import { plural } from "../../utils/stringUtils.js";
import {
  setCameBack,
  setPromptValue,
  setPromptActiveFor,
  setPromptActive,
  setLaunchWarning,
} from "../../state/promptInputStore.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { getPlatform } from "../../utils/platform.js";
import {
  prependModeCharacterToInput as prependModeCharacterToInput_3,
  getModeFromInput as getModeFromInput_2,
} from "../../components/PromptInput/inputModes.js";
import { keepClearedDraft } from "../../history.js";
import {
  normalizeInputDecorations,
  mergeDecorationMaps,
  shiftDecorationsForEdit,
} from "../../components/PromptInput/inputDecorations.js";
import { diffTextEdit } from "../../plugins/functionHooks/sessionEvents.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-czq1j3j2.js:540923-540927 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:540923", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:548013-548033 placement
var weakSet; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:548013", () => {
  weakSet = new WeakSet();
});
//@ chunk-czq1j3j2.js:548033-548091 placement
function createFrozenEmpty() {
  let frozen = Object.freeze({});
  weakSet.add(frozen);
  return frozen;
}
//@ chunk-czq1j3j2.js:548091-548322 placement
/**
 * 新文本是否只比旧文本多插入一个字符或删除了一段（用于判断键入编辑）。
 */
function isSingleCharEdit(before, after) {
  let index = 0;
  let min = Math.min(before.length, after.length);
  while (index < min && before[index] === after[index]) index++;
  if (after.length === before.length + 1) return after.slice(index + 1) === before.slice(index);
  if (after.length < before.length) {
    let extra = before.length - after.length;
    return before.slice(index + extra) === after.slice(index);
  }
  return false;
}
//@ chunk-czq1j3j2.js:548322-548600 placement
/**
 * 把前缀、插入文本和后缀按 NFC 规范化拼接，并把光标落到完整字素边界。
 */
function composeNormalized(before, inserted, after) {
  let normalized = inserted.normalize("NFC");
  let normalized_2 = (before + inserted).normalize("NFC");
  let text = (normalized_2 + after).normalize("NFC");
  let cutIndex = normalized_2.length;
  if (cutIndex !== before.length + normalized.length)
    for (let { index, segment } of getGraphemeSegmenter().segment(text)) {
      if (index >= cutIndex) break;
      let segmentEnd = index + segment.length;
      if (segmentEnd > cutIndex && !rangeHasPlaceholder(text, cutIndex, segmentEnd)) cutIndex = segmentEnd;
    }
  return {
    written: text,
    end: cutIndex,
  };
}
//@ chunk-czq1j3j2.js:548600-548670 placement
function rangeHasPlaceholder(text, from, to) {
  for (let index = from; index < to; index++) if (isPlaceholderAt(text, index)) return true;
  return false;
}
//@ chunk-czq1j3j2.js:548670-549127 placement
/**
 * 输入草稿常量与状态选择器（value/cursor/mode/粘贴/区间/装饰/stash/多行）及快照键列表。
 */
var TYPEAHEAD_WINDOW_MS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var DRAFT_SETTLE_MS;
var selectDraftValue;
var selectCursorOffset;
var selectInputMode;
var selectPastedContents;
var selectInterimRange;
var selectDecorations;
var selectCameBack;
var selectHasStash;
var selectIsEmpty;
var selectIsMultiline;
var DRAFT_SNAPSHOT_KEYS;
var EMPTY_LAYER_MAP;
deferInit("chunk-czq1j3j2.js:548670", () => {
  TYPEAHEAD_WINDOW_MS = 1500;
  DRAFT_SETTLE_MS = 600;
  selectDraftValue = (draft) => draft.value;
  selectCursorOffset = (draft) => draft.cursorOffset;
  selectInputMode = (draft) => draft.mode;
  selectPastedContents = (draft) => draft.pastedContents;
  selectInterimRange = (draft) => draft.interimRange;
  selectDecorations = (draft) => draft.decorations;
  selectCameBack = (draft) => draft.cameBack;
  selectHasStash = (draft) => draft.stashedPrompt !== undefined;
  selectIsEmpty = (draft) => draft.value.length === 0;
  selectIsMultiline = (draft) =>
    draft.value.includes(`
`);
  DRAFT_SNAPSHOT_KEYS = [
    "value",
    "cursorOffset",
    "mode",
    "pastedContents",
    "stashedPrompt",
    "isInputOverlayActive",
    "isInputRowReplaced",
    "isVimEditing",
    "inputOwnsEscape",
    "interimRange",
    "decorations",
    "cameBack",
  ];
  EMPTY_LAYER_MAP = new Map();
});
//@ chunk-czq1j3j2.js:549127-555966 placement
/**
 * 输入框草稿模型类：持有 value/cursor/粘贴内容/stash，负责 prompt.edit/prompt.change 钩子转发、类型提前缓冲、shell 补全中止与外部编辑重写。
 */
class PromptDraft {
  #e;
  #t;
  #o;
  #n;
  #r;
  #s;
  #l;
  #i;
  #a;
  #c = createSignal();
  #d = createSignal();
  #u;
  shellCompletionAbort = {
    current: null,
  };
  #p = 0;
  #m;
  #f = null;
  #S = false;
  #h = true;
  #y = null;
  #b = false;
  #g = null;
  #v = null;
  #C = EMPTY_LAYER_MAP;
  #w = null;
  #T = false;
  constructor({ valueStore, scheduleTimeout, isTypedAhead, rewriteEdit, onEdit, screensPrompts, watchText }) {
    this.#e = valueStore;
    this.#t = scheduleTimeout;
    this.#o = isTypedAhead ?? false;
    this.#n = rewriteEdit ?? ((value) => value);
    this.#r = onEdit ?? (() => {});
    this.#s = screensPrompts ?? (() => false);
    let { value: storedValue, stash, cameBack } = valueStore.getState();
    this.#h = storedValue === "";
    this.#m = {
      value: storedValue,
      cursorOffset: storedValue.length,
      mode: "prompt",
      pastedContents: {},
      stashedPrompt: stash ?? undefined,
      isInputOverlayActive: false,
      isInputRowReplaced: false,
      isVimEditing: false,
      inputOwnsEscape: false,
      interimRange: null,
      decorations: EMPTY_SPANS,
      cameBack: cameBack && storedValue !== "",
    };
    this.#l = watchText;
    this.#u = valueStore.subscribe(this.#M);
  }
  subscribe = (listener) => {
    this.#x();
    return this.#c.subscribe(listener);
  };
  #x() {
    if (this.#b) return;
    this.#i ??= this.#l?.(() => ({
      text: this.#m.value,
      cursor: this.#m.cursorOffset,
    }));
  }
  getSnapshot = () => this.#m;
  get value() {
    return this.#m.value;
  }
  get cursorOffset() {
    return this.#m.cursorOffset;
  }
  get mode() {
    return this.#m.mode;
  }
  get pastedContents() {
    return this.#m.pastedContents;
  }
  get stashedPrompt() {
    return this.#m.stashedPrompt;
  }
  get changedFromOutside() {
    return this.#S;
  }
  get typedOnly() {
    return this.#h;
  }
  #k(patch) {
    let current = this.#m;
    let next = {
      ...current,
      ...patch,
    };
    next.cursorOffset = Math.max(0, Math.min(next.value.length, next.cursorOffset));
    if (next.value !== current.value) {
      this.#v = this.#g?.value === current.value ? this.#g : null;
      if (this.#g !== null) {
        let emptyLayers = new Map();
        for (let key of this.#g.layers.keys()) emptyLayers.set(key, EMPTY_SPANS);
        this.#C = emptyLayers;
      }
      this.#g = null;
    }
    next.decorations = this.#g?.value === next.value ? this.#g.shown : EMPTY_SPANS;
    if (next.value === "") next.cameBack = false;
    if (DRAFT_SNAPSHOT_KEYS.every((key) => Object.is(next[key], current[key]))) return;
    this.#m = next;
    if (next.cameBack !== current.cameBack) setCameBack(this.#e, next.cameBack);
    this.#c.emit();
    if (next.value !== current.value && this.#i !== undefined)
      try {
        this.#i.changed({
          before: current.value,
          after: next.value,
          ...(this.#a && {
            origin: this.#a,
          }),
        });
      } catch (error) {
        logError(error);
      }
  }
  #M = () => {
    let { value: storedText, stash } = this.#e.getState();
    let stashedPrompt = stash ?? undefined;
    if (storedText === this.#m.value) {
      this.#k({
        stashedPrompt,
      });
      return;
    }
    let lastSynced = this.#f;
    let inSync = lastSynced !== null && lastSynced.value === storedText;
    if (!inSync) {
      this.#S = true;
      this.#h = storedText === "";
    }
    this.#k({
      value: storedText,
      cursorOffset: inSync ? lastSynced.cursorOffset : storedText.length,
      stashedPrompt,
    });
  };
  setValue = (value) => {
    this.#R(value, undefined, "input");
  };
  setValueTyped = (value) => {
    this.#R(value, undefined, "input", true);
  };
  setValueWithCursor = (value, cursorOffset) => {
    this.#R(value, cursorOffset, "input");
  };
  replaceValue = (value) => {
    this.#R(value, value.length, "outside");
  };
  setValueRaw = (value) => {
    setPromptValue(this.#e, value);
  };
  setCursorOffset = (cursorOffset) => {
    this.#k({
      cursorOffset,
    });
  };
  insertText = (text, origin = "input") => {
    let { value: currentText, cursorOffset } = this.#m;
    if (text === "") {
      this.#R(currentText, cursorOffset, origin);
      return cursorOffset;
    }
    let normalized = currentText.normalize("NFC");
    let insertAt = cursorOffset < currentText.length ? cursorOffset : normalized.length;
    let { written, end } = composeNormalized(normalized.slice(0, insertAt), text, normalized.slice(insertAt));
    this.#R(written, end, origin);
    return insertAt;
  };
  clear = () => {
    this.#R("", 0, "outside");
    this.#k({
      pastedContents: {},
    });
  };
  #R(value, cursorOffset, origin, singleCharEdit = false) {
    this.#x();
    let previousText = this.#m.value;
    let rewritten = this.#n(value, previousText);
    let cursorOffset_2 = cursorOffset ?? this.#m.cursorOffset;
    if (origin === "input") this.#S = false;
    else if (rewritten !== previousText) this.#S = true;
    if (this.#T) {
      this.#T = false;
      if (rewritten !== "") this.#w = null;
    }
    if (origin === "outside" && rewritten === "") this.#_();
    if (rewritten === "") this.#h = true;
    else if (
      this.#h &&
      rewritten !== previousText &&
      !(singleCharEdit && isSingleCharEdit(previousText, rewritten))
    )
      this.#h = false;
    this.#f = {
      value: rewritten,
      cursorOffset: cursorOffset_2,
    };
    setPromptValue(this.#e, rewritten);
    this.#f = null;
    if (this.#m.value === rewritten && origin === "input")
      this.#k({
        cursorOffset: cursorOffset_2,
      });
    this.#r(rewritten, previousText);
    this.#P(rewritten);
  }
  #P(text) {
    let hasText = text.trim().length > 0 ? TYPEAHEAD_WINDOW_MS : this.#y !== null ? DRAFT_SETTLE_MS : 0;
    setPromptActiveFor(this.#e, hasText > 0);
    this.#y?.();
    this.#y =
      hasText > 0
        ? this.#t(() => {
            this.#y = null;
            setPromptActiveFor(this.#e, false);
          }, hasText)
        : null;
  }
  start() {
    if (this.#o && !this.#b) this.#P(this.#m.value);
  }
  attribute = (origin, fn) => {
    this.#x();
    let previousOrigin = this.#a;
    this.#a = origin;
    try {
      return fn();
    } finally {
      this.#a = previousOrigin;
    }
  };
  markCameBack = () => {
    if (this.#m.value === "" || this.#m.cameBack) return;
    let hooksAllow = true;
    try {
      hooksAllow = this.#s();
    } catch (error) {
      logForDebugging(`the draft could not read the prompt hooks: ${errorMessage(error)}`, {
        level: "error",
      });
    }
    if (hooksAllow)
      this.#k({
        cameBack: true,
      });
  };
  markMaybeSecret = () => {
    if (this.#m.value !== "")
      this.#k({
        cameBack: true,
      });
  };
  setMode = (mode) => {
    this.#k({
      mode,
    });
  };
  setPastedContents = (pasted) => {
    this.#k({
      pastedContents: typeof pasted === "function" ? pasted(this.#m.pastedContents) : pasted,
    });
  };
  stash = () => {
    let { value: text, cursorOffset, mode, pastedContents, cameBack } = this.#m;
    let launchWarning = this.#e.getState().launchWarning;
    setPromptActive(this.#e, {
      text,
      cursorOffset,
      mode,
      pastedContents,
      launchWarning: launchWarning ?? undefined,
      cameBack,
    });
    this.#R("", 0, "input");
    this.#k({
      pastedContents: {},
      mode: "prompt",
    });
  };
  popStash = (origin) => {
    let stash = this.#e.getState().stash;
    if (stash === null) return false;
    setPromptActive(this.#e, null);
    this.#R(stash.text, stash.cursorOffset, origin);
    this.#k({
      pastedContents: stash.pastedContents,
      mode: stash.mode,
      cameBack: stash.cameBack === true && stash.text !== "",
    });
    if (stash.launchWarning) setLaunchWarning(this.#e, stash.launchWarning);
    return true;
  };
  holdCleared = ({ intoHistory }) => {
    let { value: text, mode, pastedContents, cameBack } = this.#m;
    if (text.trim() !== "") {
      let launchWarning = this.#e.getState().launchWarning;
      this.#_();
      this.#w = {
        text,
        mode,
        pastedContents,
        launchWarning: launchWarning ?? undefined,
        cameBack,
        clearedAt: Date.now(),
        intoHistory,
      };
      this.#T = true;
    }
  };
  restoreCleared = () => {
    let stashed = this.#w;
    if (stashed === null || this.#m.value !== "") return false;
    this.#w = null;
    this.#R(stashed.text, stashed.text.length, "input");
    this.#k({
      pastedContents: stashed.pastedContents,
      mode: stashed.mode,
      cameBack: stashed.cameBack,
    });
    if (stashed.launchWarning) setLaunchWarning(this.#e, stashed.launchWarning);
    return true;
  };
  #_() {
    let cleared = this.#w;
    this.#w = null;
    if (cleared === null || this.#T || !cleared.intoHistory || cleared.launchWarning || cleared.cameBack)
      return;
    let displayText = prependModeCharacterToInput_3(cleared.text, cleared.mode);
    if (getModeFromInput_2(displayText) === cleared.mode)
      keepClearedDraft(
        {
          display: displayText,
          pastedContents: cleared.pastedContents,
        },
        cleared.clearedAt,
      );
  }
  setInputOverlayActive = (isInputOverlayActive) => {
    this.#k({
      isInputOverlayActive,
    });
  };
  setInputRowReplaced = (isInputRowReplaced) => {
    this.#k({
      isInputRowReplaced,
    });
  };
  setVimEditing = (isVimEditing) => {
    this.#k({
      isVimEditing,
    });
  };
  setInputOwnsEscape = (inputOwnsEscape) => {
    this.#k({
      inputOwnsEscape,
    });
  };
  setInterimRange = (range) => {
    let interimRange = this.#m.interimRange;
    if (
      range !== null &&
      interimRange !== null &&
      range.start === interimRange.start &&
      range.end === interimRange.end
    )
      return;
    this.#k({
      interimRange: range,
    });
  };
  paint = (runs) => {
    this.#A(runs, this.#g?.layers ?? this.#C);
  };
  paintLayer = (layerName, decorations, expectedText) => {
    let { value } = this.#m;
    let isEmpty = decorations.length === 0;
    if (!isEmpty && value !== expectedText)
      return {
        isPainted: false,
      };
    let layers = this.#g?.layers ?? this.#C;
    if (!isEmpty || layers.has(layerName))
      this.#A(
        this.#g?.runs ?? EMPTY_SPANS,
        new Map(layers).set(layerName, normalizeInputDecorations(decorations, value)),
      );
    return {
      isPainted: true,
    };
  };
  dropLayer = (layerName) => {
    if (this.#v?.layers.has(layerName) === true) {
      let nextLayers = new Map(this.#v.layers);
      nextLayers.delete(layerName);
      this.#v = {
        ...this.#v,
        layers: nextLayers,
      };
    }
    let nextBase = new Map(this.#C);
    nextBase.delete(layerName);
    this.#C = nextBase;
    let nextLayers = new Map(this.#g?.layers ?? EMPTY_LAYER_MAP);
    if (nextLayers.delete(layerName))
      this.#A(normalizeInputDecorations(this.#g?.runs ?? EMPTY_SPANS, this.#m.value), nextLayers);
  };
  #A(runs, layers) {
    this.#v = null;
    if (runs.length === 0 && layers.size === 0 && this.#g === null) return;
    let { value, decorations } = this.#m;
    let merged = mergeDecorationMaps(runs, layers, value);
    this.#g =
      runs.length === 0 && layers.size === 0
        ? null
        : {
            value,
            runs,
            layers,
            shown: isDeepStrictEqual(merged, decorations) ? decorations : merged,
          };
    this.#k({});
  }
  carryPaint = (from, to) => {
    this.#E(from, to, true);
  };
  carryLayers = (from, to) => {
    this.#E(from, to, false);
  };
  #E(from, to, carryRuns) {
    let carried = this.#v;
    this.#v = null;
    if (carried === null || carried.value !== from.text || this.#m.value !== to.text) return;
    let edit = diffTextEdit(from, to);
    let shiftedRuns = carryRuns ? shiftDecorationsForEdit(carried.runs, edit) : EMPTY_SPANS;
    let nextRuns = carried.layers.size === 0 ? normalizeInputDecorations(shiftedRuns, to.text) : shiftedRuns;
    let nextLayers = new Map();
    for (let [layerName, decorations] of carried.layers)
      nextLayers.set(layerName, shiftDecorationsForEdit(decorations, edit));
    this.#A(nextRuns, nextLayers);
  }
  submit = (submit, force = false) => {
    if (this.#p === 0) return false;
    this.#d.emit(submit, force);
    return true;
  };
  onSubmitRequest = (listener) => {
    let unsubscribe = this.#d.subscribe(listener);
    this.#p++;
    let active = true;
    return () => {
      if (!active) return;
      active = false;
      this.#p--;
      unsubscribe();
    };
  };
  dispose() {
    if (this.#b) return;
    this.#b = true;
    this.#u();
    this.#i?.dispose();
    if (this.#y) {
      this.#y();
      this.#y = null;
      setPromptActiveFor(this.#e, false);
    }
    this.#d.clear();
    this.#p = 0;
  }
}
export {
  selectIsEmpty,
  selectIsMultiline,
  selectInputMode,
  selectHasStash,
  createFrozenEmpty,
  PromptDraft,
  selectDraftValue,
  selectCursorOffset,
  selectPastedContents,
  selectInterimRange,
  selectDecorations,
  selectCameBack,
  composeNormalized,
};
