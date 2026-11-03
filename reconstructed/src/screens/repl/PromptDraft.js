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
import { init_react_production, y, R, P } from "../../../vendor/react/cjs/react.production.js";
import { getGraphemeSegmenter } from "../../utils/intl.js";
import { isPlaceholderAt } from "../../utils/Cursor.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { logForDebugging } from "../../utils/debug.js";
import { string, u, literal, M, array } from "../../../vendor/zod/v4/classic/schemas.js";
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
import { w } from "../../../vendor/react/compiler-runtime.js";
import { PP } from "../../plugins/functionHooks/prompt/decorationSpans.js";
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

//@ chunk-18hwfzwa.js:521487-521491 placement
init_react_production();
//@ chunk-18hwfzwa.js:521534-521554 placement
var weakSet = new WeakSet();
//@ chunk-18hwfzwa.js:521554-521612 placement
function createFrozenEmpty() {
  let h = Object.freeze({});
  weakSet.add(h);
  return h;
}
//@ chunk-18hwfzwa.js:521612-521843 placement
/**
 * 新文本是否只比旧文本多插入一个字符或删除了一段（用于判断键入编辑）。
 */
function isSingleCharEdit(h, x) {
  let D = 0;
  let min = Math.min(h.length, x.length);
  while (D < min && h[D] === x[D]) D++;
  if (x.length === h.length + 1) return x.slice(D + 1) === h.slice(D);
  if (x.length < h.length) {
    let ee = h.length - x.length;
    return h.slice(D + ee) === x.slice(D);
  }
  return false;
}
//@ chunk-18hwfzwa.js:521843-522121 placement
/**
 * 把前缀、插入文本和后缀按 NFC 规范化拼接，并把光标落到完整字素边界。
 */
function composeNormalized(h, x, D) {
  let normalized = x.normalize("NFC");
  let normalized_2 = (h + x).normalize("NFC");
  let normalized_3 = (normalized_2 + D).normalize("NFC");
  let Re = normalized_2.length;
  if (Re !== h.length + normalized.length)
    for (let { index, segment } of getGraphemeSegmenter().segment(normalized_3)) {
      if (index >= Re) break;
      let We = index + segment.length;
      if (We > Re && !rangeHasPlaceholder(normalized_3, Re, We)) Re = We;
    }
  return {
    written: normalized_3,
    end: Re,
  };
}
//@ chunk-18hwfzwa.js:522121-522191 placement
function rangeHasPlaceholder(h, x, D) {
  for (let L = x; L < D; L++) if (isPlaceholderAt(h, L)) return true;
  return false;
}
//@ chunk-18hwfzwa.js:522191-522640 placement
/**
 * 输入草稿常量与状态选择器（value/cursor/mode/粘贴/区间/装饰/stash/多行）及快照键列表。
 */
var TYPEAHEAD_WINDOW_MS = 1500;
var selectDraftValue = (h) => h.value;
var selectCursorOffset = (h) => h.cursorOffset;
var selectInputMode = (h) => h.mode;
var selectPastedContents = (h) => h.pastedContents;
var selectInterimRange = (h) => h.interimRange;
var selectDecorations = (h) => h.decorations;
var selectCameBack = (h) => h.cameBack;
var selectHasStash = (h) => h.stashedPrompt !== undefined;
var selectIsEmpty = (h) => h.value.length === 0;
var selectIsMultiline = (h) =>
  h.value.includes(`
`);
var DRAFT_SNAPSHOT_KEYS = [
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
var EMPTY_LAYER_MAP = new Map();
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
    this.#n = rewriteEdit ?? ((ze) => ze);
    this.#s = onEdit ?? (() => {});
    this.#r = screensPrompts ?? (() => false);
    let { value: Be, stash, cameBack } = valueStore.getState();
    this.#h = Be === "";
    this.#u = {
      value: Be,
      cursorOffset: Be.length,
      mode: "prompt",
      pastedContents: {},
      stashedPrompt: stash ?? undefined,
      isInputOverlayActive: false,
      isInputRowReplaced: false,
      isVimEditing: false,
      inputOwnsEscape: false,
      interimRange: null,
      decorations: PP,
      cameBack: cameBack && Be !== "",
    };
    this.#c = watchText;
    this.#m = valueStore.subscribe(this.#M);
  }
  subscribe = (h) => {
    this.#x();
    return this.#l.subscribe(h);
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
  #k(h) {
    let x = this.#u;
    let D = {
      ...x,
      ...h,
    };
    D.cursorOffset = Math.max(0, Math.min(D.value.length, D.cursorOffset));
    if (D.value !== x.value) {
      this.#v = this.#g?.value === x.value ? this.#g : null;
      if (this.#g !== null) {
        let L = new Map();
        for (let key of this.#g.layers.keys()) L.set(key, PP);
        this.#C = L;
      }
      this.#g = null;
    }
    D.decorations = this.#g?.value === D.value ? this.#g.shown : PP;
    if (D.value === "") D.cameBack = false;
    if (DRAFT_SNAPSHOT_KEYS.every((L) => Object.is(D[L], x[L]))) return;
    this.#u = D;
    if (D.cameBack !== x.cameBack) setCameBack(this.#e, D.cameBack);
    this.#l.emit();
    if (D.value !== x.value && this.#i !== undefined)
      try {
        this.#i.changed({
          before: x.value,
          after: D.value,
          ...(this.#a && {
            origin: this.#a,
          }),
        });
      } catch (error) {
        logError(error);
      }
  }
  #M = () => {
    let { value: h, stash } = this.#e.getState();
    let stashedPrompt = stash ?? undefined;
    if (h === this.#u.value) {
      this.#k({
        stashedPrompt,
      });
      return;
    }
    let L = this.#f;
    let ee = L !== null && L.value === h;
    if (!ee) {
      this.#S = true;
      this.#h = h === "";
    }
    this.#k({
      value: h,
      cursorOffset: ee ? L.cursorOffset : h.length,
      stashedPrompt,
    });
  };
  setValue = (h) => {
    this.#R(h, undefined, "input");
  };
  setValueTyped = (h) => {
    this.#R(h, undefined, "input", true);
  };
  setValueWithCursor = (h, x) => {
    this.#R(h, x, "input");
  };
  replaceValue = (h) => {
    this.#R(h, h.length, "outside");
  };
  setValueRaw = (h) => {
    setPromptValue(this.#e, h);
  };
  setCursorOffset = (cursorOffset) => {
    this.#k({
      cursorOffset,
    });
  };
  insertText = (h, x = "input") => {
    let { value: D, cursorOffset } = this.#u;
    if (h === "") {
      this.#R(D, cursorOffset, x);
      return cursorOffset;
    }
    let normalized = D.normalize("NFC");
    let ke = cursorOffset < D.length ? cursorOffset : normalized.length;
    let { written, end } = composeNormalized(normalized.slice(0, ke), h, normalized.slice(ke));
    this.#R(written, end, x);
    return ke;
  };
  clear = () => {
    this.#R("", 0, "outside");
    this.#k({
      pastedContents: {},
    });
  };
  #R(h, x, D, L = false) {
    this.#x();
    let ee = this.#u.value;
    let ke = this.#n(h, ee);
    let cursorOffset = x ?? this.#u.cursorOffset;
    if (D === "input") this.#S = false;
    else if (ke !== ee) this.#S = true;
    if (this.#T) {
      this.#T = false;
      if (ke !== "") this.#w = null;
    }
    if (D === "outside" && ke === "") this.#_();
    if (ke === "") this.#h = true;
    else if (this.#h && ke !== ee && !(L && isSingleCharEdit(ee, ke))) this.#h = false;
    this.#f = {
      value: ke,
      cursorOffset,
    };
    setPromptValue(this.#e, ke);
    this.#f = null;
    if (this.#u.value === ke && D === "input")
      this.#k({
        cursorOffset,
      });
    this.#s(ke, ee);
    this.#P(ke);
  }
  #P(h) {
    let x = h.trim().length > 0;
    setPromptActiveFor(this.#e, x);
    this.#y?.();
    this.#y = x
      ? this.#t(() => {
          this.#y = null;
          setPromptActiveFor(this.#e, false);
        }, TYPEAHEAD_WINDOW_MS)
      : null;
  }
  start() {
    if (this.#o && !this.#b) this.#P(this.#u.value);
  }
  attribute = (h, x) => {
    this.#x();
    let D = this.#a;
    this.#a = h;
    try {
      return x();
    } finally {
      this.#a = D;
    }
  };
  markCameBack = () => {
    if (this.#u.value === "" || this.#u.cameBack) return;
    let h = true;
    try {
      h = this.#r();
    } catch (error) {
      logForDebugging(`the draft could not read the prompt hooks: ${errorMessage(error)}`, {
        level: "error",
      });
    }
    if (h)
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
  setPastedContents = (h) => {
    this.#k({
      pastedContents: typeof h === "function" ? h(this.#u.pastedContents) : h,
    });
  };
  stash = () => {
    let { value: h, cursorOffset, mode, pastedContents, cameBack } = this.#u;
    let launchWarning = this.#e.getState().launchWarning;
    setPromptActive(this.#e, {
      text: h,
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
  popStash = (h) => {
    let stash = this.#e.getState().stash;
    if (stash === null) return false;
    setPromptActive(this.#e, null);
    this.#R(stash.text, stash.cursorOffset, h);
    this.#k({
      pastedContents: stash.pastedContents,
      mode: stash.mode,
      cameBack: stash.cameBack === true && stash.text !== "",
    });
    if (stash.launchWarning) setLaunchWarning(this.#e, stash.launchWarning);
    return true;
  };
  holdCleared = ({ intoHistory }) => {
    let { value: x, mode, pastedContents, cameBack } = this.#u;
    if (x.trim() !== "") {
      let launchWarning = this.#e.getState().launchWarning;
      this.#_();
      this.#w = {
        text: x,
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
    let h = this.#w;
    if (h === null || this.#u.value !== "") return false;
    this.#w = null;
    this.#R(h.text, h.text.length, "input");
    this.#k({
      pastedContents: h.pastedContents,
      mode: h.mode,
      cameBack: h.cameBack,
    });
    if (h.launchWarning) setLaunchWarning(this.#e, h.launchWarning);
    return true;
  };
  #_() {
    let h = this.#w;
    this.#w = null;
    if (h === null || this.#T || !h.intoHistory || h.launchWarning || h.cameBack) return;
    let x = prependModeCharacterToInput_3(h.text, h.mode);
    if (getModeFromInput_2(x) === h.mode)
      keepClearedDraft(
        {
          display: x,
          pastedContents: h.pastedContents,
        },
        h.clearedAt,
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
  setInterimRange = (h) => {
    let interimRange = this.#u.interimRange;
    if (h !== null && interimRange !== null && h.start === interimRange.start && h.end === interimRange.end)
      return;
    this.#k({
      interimRange: h,
    });
  };
  paint = (h) => {
    this.#A(h, this.#g?.layers ?? this.#C);
  };
  paintLayer = (h, x, D) => {
    let { value: L } = this.#u;
    let ee = x.length === 0;
    if (!ee && L !== D)
      return {
        isPainted: false,
      };
    let ke = this.#g?.layers ?? this.#C;
    if (!ee || ke.has(h)) this.#A(this.#g?.runs ?? PP, new Map(ke).set(h, normalizeInputDecorations(x, L)));
    return {
      isPainted: true,
    };
  };
  dropLayer = (h) => {
    if (this.#v?.layers.has(h) === true) {
      let L = new Map(this.#v.layers);
      L.delete(h);
      this.#v = {
        ...this.#v,
        layers: L,
      };
    }
    let x = new Map(this.#C);
    x.delete(h);
    this.#C = x;
    let D = new Map(this.#g?.layers ?? EMPTY_LAYER_MAP);
    if (D.delete(h)) this.#A(normalizeInputDecorations(this.#g?.runs ?? PP, this.#u.value), D);
  };
  #A(h, x) {
    this.#v = null;
    if (h.length === 0 && x.size === 0 && this.#g === null) return;
    let { value: D, decorations } = this.#u;
    let ee = mergeDecorationMaps(h, x, D);
    this.#g =
      h.length === 0 && x.size === 0
        ? null
        : {
            value: D,
            runs: h,
            layers: x,
            shown: isDeepStrictEqual(ee, decorations) ? decorations : ee,
          };
    this.#k({});
  }
  carryPaint = (h, x) => {
    this.#I(h, x, true);
  };
  carryLayers = (h, x) => {
    this.#I(h, x, false);
  };
  #I(h, x, D) {
    let L = this.#v;
    this.#v = null;
    if (L === null || L.value !== h.text || this.#u.value !== x.text) return;
    let ee = diffTextEdit(h, x);
    let ke = D ? shiftDecorationsForEdit(L.runs, ee) : PP;
    let Re = L.layers.size === 0 ? normalizeInputDecorations(ke, x.text) : ke;
    let Be = new Map();
    for (let [He, We] of L.layers) Be.set(He, shiftDecorationsForEdit(We, ee));
    this.#A(Re, Be);
  }
  submit = (h, x = false) => {
    if (this.#p === 0) return false;
    this.#d.emit(h, x);
    return true;
  };
  onSubmitRequest = (h) => {
    let x = this.#d.subscribe(h);
    this.#p++;
    let D = true;
    return () => {
      if (!D) return;
      D = false;
      this.#p--;
      x();
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
