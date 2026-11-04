/**
 * screens/repl/PromptDraft.ts
 *
 * 2.1.316 新增。REPL 控制器：输入草稿。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (8)
 * attribution: placement 8
 */
import { isDeepStrictEqual } from "util";
import {
  init_react_production,
  useState,
  useRef,
  useEffect,
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
  booleanSchema,
  array,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { Text, Box } from "../../ink/components/Text.js";
import { fromEnum, lit as lit_2 } from "../../services/analytics/safeMetadata.js";
import { env } from "../../utils/env.js";
import { logEvent } from "../../services/analytics/index.js";
import { logError } from "../../utils/log.js";
import { createSignal } from "../../utils/signal.js";
import {
  errorMessage,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  getErrnoCode,
} from "../../utils/errors.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { EMPTY_SPANS } from "../../plugins/functionHooks/prompt/decorationSpans.js";
import {
  setCameBack,
  setPromptValue,
  setPromptActiveFor,
  setPromptActive,
  setLaunchWarning,
} from "../../state/promptInputStore.js";
import { jsonStringify } from "../../utils/slowOperations.js";
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
import { getPlatform } from "../../utils/platform.js";
import { diffTextEdit } from "../../plugins/functionHooks/sessionEvents.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-18hwfzwa.js:521487-521491 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:521487", () => {
  init_react_production();
});
//@ chunk-18hwfzwa.js:521534-521554 placement
var weakSet; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:521534", () => {
  weakSet = new WeakSet();
});
//@ chunk-18hwfzwa.js:521554-521612 placement
function createFrozenEmpty() {
  let frozen = Object.freeze({});
  weakSet.add(frozen);
  return frozen;
}
//@ chunk-18hwfzwa.js:521612-521843 placement
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
//@ chunk-18hwfzwa.js:521843-522121 placement
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
//@ chunk-18hwfzwa.js:522121-522191 placement
function rangeHasPlaceholder(text, from, to) {
  for (let index = from; index < to; index++) if (isPlaceholderAt(text, index)) return true;
  return false;
}
//@ chunk-18hwfzwa.js:522191-522640 placement
/**
 * 输入草稿常量与状态选择器（value/cursor/mode/粘贴/区间/装饰/stash/多行）及快照键列表。
 */
var TYPEAHEAD_WINDOW_MS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
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
deferInit("chunk-18hwfzwa.js:522191", () => {
  TYPEAHEAD_WINDOW_MS = 1500;
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
//@ chunk-18hwfzwa.js:522640-529449 placement
/**
 * 输入框草稿模型类：持有 value/cursor/粘贴内容/stash，负责 prompt.edit/prompt.change 钩子转发、类型提前缓冲、shell 补全中止与外部编辑重写。
 */
class PromptDraft {
  #e;
  #t;
  #o;
  #n;
  #s;
  #r;
  #c;
  #i;
  #a;
  #l = createSignal();
  #d = createSignal();
  #m;
  shellCompletionAbort = {
    current: null,
  };
  #p = 0;
  #u;
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
    this.#s = onEdit ?? (() => {});
    this.#r = screensPrompts ?? (() => false);
    let { value: storedValue, stash, cameBack } = valueStore.getState();
    this.#h = storedValue === "";
    this.#u = {
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
    this.#c = watchText;
    this.#m = valueStore.subscribe(this.#M);
  }
  subscribe = (listener) => {
    this.#x();
    return this.#l.subscribe(listener);
  };
  #x() {
    if (this.#b) return;
    this.#i ??= this.#c?.(() => ({
      text: this.#u.value,
      cursor: this.#u.cursorOffset,
    }));
  }
  getSnapshot = () => this.#u;
  get value() {
    return this.#u.value;
  }
  get cursorOffset() {
    return this.#u.cursorOffset;
  }
  get mode() {
    return this.#u.mode;
  }
  get pastedContents() {
    return this.#u.pastedContents;
  }
  get stashedPrompt() {
    return this.#u.stashedPrompt;
  }
  get changedFromOutside() {
    return this.#S;
  }
  get typedOnly() {
    return this.#h;
  }
  #k(patch) {
    let current = this.#u;
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
    this.#u = next;
    if (next.cameBack !== current.cameBack) setCameBack(this.#e, next.cameBack);
    this.#l.emit();
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
    if (storedText === this.#u.value) {
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
    let { value: currentText, cursorOffset } = this.#u;
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
    let previousText = this.#u.value;
    let rewritten = this.#n(value, previousText);
    let cursorOffset_2 = cursorOffset ?? this.#u.cursorOffset;
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
    if (this.#u.value === rewritten && origin === "input")
      this.#k({
        cursorOffset: cursorOffset_2,
      });
    this.#s(rewritten, previousText);
    this.#P(rewritten);
  }
  #P(text) {
    let hasText = text.trim().length > 0;
    setPromptActiveFor(this.#e, hasText);
    this.#y?.();
    this.#y = hasText
      ? this.#t(() => {
          this.#y = null;
          setPromptActiveFor(this.#e, false);
        }, TYPEAHEAD_WINDOW_MS)
      : null;
  }
  start() {
    if (this.#o && !this.#b) this.#P(this.#u.value);
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
    if (this.#u.value === "" || this.#u.cameBack) return;
    let hooksAllow = true;
    try {
      hooksAllow = this.#r();
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
    if (this.#u.value !== "")
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
      pastedContents: typeof pasted === "function" ? pasted(this.#u.pastedContents) : pasted,
    });
  };
  stash = () => {
    let { value: text, cursorOffset, mode, pastedContents, cameBack } = this.#u;
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
    let { value: text, mode, pastedContents, cameBack } = this.#u;
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
    if (stashed === null || this.#u.value !== "") return false;
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
    let interimRange = this.#u.interimRange;
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
    let { value } = this.#u;
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
      this.#A(normalizeInputDecorations(this.#g?.runs ?? EMPTY_SPANS, this.#u.value), nextLayers);
  };
  #A(runs, layers) {
    this.#v = null;
    if (runs.length === 0 && layers.size === 0 && this.#g === null) return;
    let { value, decorations } = this.#u;
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
    this.#I(from, to, true);
  };
  carryLayers = (from, to) => {
    this.#I(from, to, false);
  };
  #I(from, to, carryRuns) {
    let carried = this.#v;
    this.#v = null;
    if (carried === null || carried.value !== from.text || this.#u.value !== to.text) return;
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
    this.#m();
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
