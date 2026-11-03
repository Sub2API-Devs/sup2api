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
import { isDeepStrictEqual, isDeepStrictEqual as isDeepStrictEqual_2 } from "util";
import { j, y, R, P } from "../../../vendor/react/cjs/react.production.js";
import { getGraphemeSegmenter } from "../../utils/intl.js";
import { isPlaceholderAt } from "../../utils/Cursor.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { logForDebugging } from "../../utils/debug.js";
import { o, u, T, M, A } from "../../../vendor/zod/v4/classic/schemas.js";
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
import { freeze as freeze_8 } from "../../plugins/functionHooks/prompt/decorationSpans.js";
import { setCameBack, setPromptValue, Z2n, UPo, setLaunchWarning } from "../../state/promptInputStore.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import {
  prependModeCharacterToInput as prependModeCharacterToInput_3,
  getModeFromInput as getModeFromInput_2,
} from "../../components/PromptInput/inputModes.js";
import { Rei } from "../../history.js";
import {
  normalizeInputDecorations,
  gYs,
  shiftDecorationsForEdit,
} from "../../components/PromptInput/inputDecorations.js";
import { getPlatform } from "../../utils/platform.js";
import { diffTextEdit } from "../../plugins/functionHooks/sessionEvents.js";

//@ chunk-18hwfzwa.js:521487-521491 placement
j();
//@ chunk-18hwfzwa.js:521534-521554 placement
var weakSet = new WeakSet();
//@ chunk-18hwfzwa.js:521554-521612 placement
function MO() {
  let freeze = Object.freeze({});
  return (weakSet.add(freeze), freeze);
}
/**
 * 新文本是否只比旧文本多插入一个字符或删除了一段（用于判断键入编辑）。
 */
//@ chunk-18hwfzwa.js:521612-521843 placement
function isSingleCharEdit(h, x) {
  let D = 0,
    min = Math.min(h.length, x.length);
  while (D < min && h[D] === x[D]) D++;
  if (x.length === h.length + 1) return x.slice(D + 1) === h.slice(D);
  if (x.length < h.length) {
    let ee = h.length - x.length;
    return h.slice(D + ee) === x.slice(D);
  }
  return !1;
}
/**
 * 把前缀、插入文本和后缀按 NFC 规范化拼接，并把光标落到完整字素边界。
 */
//@ chunk-18hwfzwa.js:521843-522121 placement
function composeNormalized(h, x, D) {
  let normalized = x.normalize("NFC"),
    normalized_2 = (h + x).normalize("NFC"),
    normalized_3 = (normalized_2 + D).normalize("NFC"),
    Re = normalized_2.length;
  if (Re !== h.length + normalized.length)
    for (let { index: index, segment: segment } of getGraphemeSegmenter().segment(normalized_3)) {
      if (index >= Re) break;
      let We = index + segment.length;
      if (We > Re && !QKt(normalized_3, Re, We)) Re = We;
    }
  return { written: normalized_3, end: Re };
}
//@ chunk-18hwfzwa.js:522121-522191 placement
function QKt(h, x, D) {
  for (let L = x; L < D; L++) if (isPlaceholderAt(h, L)) return !0;
  return !1;
}
/**
 * 输入草稿常量与状态选择器（value/cursor/mode/粘贴/区间/装饰/stash/多行）及快照键列表。
 */
//@ chunk-18hwfzwa.js:522191-522640 placement
var TYPEAHEAD_WINDOW_MS = 1500,
  selectDraftValue = (h) => h.value,
  selectCursorOffset = (h) => h.cursorOffset,
  selectInputMode = (h) => h.mode,
  selectPastedContents = (h) => h.pastedContents,
  selectInterimRange = (h) => h.interimRange,
  selectDecorations = (h) => h.decorations,
  selectCameBack = (h) => h.cameBack,
  selectHasStash = (h) => h.stashedPrompt !== void 0,
  selectIsEmpty = (h) => h.value.length === 0,
  selectIsMultiline = (h) =>
    h.value.includes(`
`),
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
  ],
  sVe = new Map();
/**
 * 输入框草稿模型类：持有 value/cursor/粘贴内容/stash，负责 prompt.edit/prompt.change 钩子转发、类型提前缓冲、shell 补全中止与外部编辑重写。
 */
//@ chunk-18hwfzwa.js:522640-529449 placement
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
  shellCompletionAbort = { current: null };
  #p = 0;
  #u;
  #f = null;
  #S = !1;
  #h = !0;
  #y = null;
  #b = !1;
  #g = null;
  #v = null;
  #C = sVe;
  #w = null;
  #T = !1;
  constructor({
    valueStore: h,
    scheduleTimeout: x,
    isTypedAhead: D,
    rewriteEdit: L,
    onEdit: ee,
    screensPrompts: ke,
    watchText: Re,
  }) {
    ((this.#e = h),
      (this.#t = x),
      (this.#o = D ?? !1),
      (this.#n = L ?? ((ze) => ze)),
      (this.#s = ee ?? (() => {})),
      (this.#r = ke ?? (() => !1)));
    let { value: Be, stash: stash, cameBack: cameBack } = h.getState();
    ((this.#h = Be === ""),
      (this.#u = {
        value: Be,
        cursorOffset: Be.length,
        mode: "prompt",
        pastedContents: {},
        stashedPrompt: stash ?? void 0,
        isInputOverlayActive: !1,
        isInputRowReplaced: !1,
        isVimEditing: !1,
        inputOwnsEscape: !1,
        interimRange: null,
        decorations: freeze_8,
        cameBack: cameBack && Be !== "",
      }),
      (this.#c = Re),
      (this.#m = h.subscribe(this.#M)));
  }
  subscribe = (h) => (this.#x(), this.#l.subscribe(h));
  #x() {
    if (this.#b) return;
    this.#i ??= this.#c?.(() => ({ text: this.#u.value, cursor: this.#u.cursorOffset }));
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
    let x = this.#u,
      D = { ...x, ...h };
    if (((D.cursorOffset = Math.max(0, Math.min(D.value.length, D.cursorOffset))), D.value !== x.value)) {
      if (((this.#v = this.#g?.value === x.value ? this.#g : null), this.#g !== null)) {
        let L = new Map();
        for (let ee of this.#g.layers.keys()) L.set(ee, freeze_8);
        this.#C = L;
      }
      this.#g = null;
    }
    if (((D.decorations = this.#g?.value === D.value ? this.#g.shown : freeze_8), D.value === ""))
      D.cameBack = !1;
    if (DRAFT_SNAPSHOT_KEYS.every((L) => Object.is(D[L], x[L]))) return;
    if (((this.#u = D), D.cameBack !== x.cameBack)) setCameBack(this.#e, D.cameBack);
    if ((this.#l.emit(), D.value !== x.value && this.#i !== void 0))
      try {
        this.#i.changed({ before: x.value, after: D.value, ...(this.#a && { origin: this.#a }) });
      } catch (error) {
        logError(error);
      }
  }
  #M = () => {
    let { value: h, stash: stash } = this.#e.getState(),
      D = stash ?? void 0;
    if (h === this.#u.value) {
      this.#k({ stashedPrompt: D });
      return;
    }
    let L = this.#f,
      ee = L !== null && L.value === h;
    if (!ee) ((this.#S = !0), (this.#h = h === ""));
    this.#k({ value: h, cursorOffset: ee ? L.cursorOffset : h.length, stashedPrompt: D });
  };
  setValue = (h) => {
    this.#R(h, void 0, "input");
  };
  setValueTyped = (h) => {
    this.#R(h, void 0, "input", !0);
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
  setCursorOffset = (h) => {
    this.#k({ cursorOffset: h });
  };
  insertText = (h, x = "input") => {
    let { value: D, cursorOffset: cursorOffset } = this.#u;
    if (h === "") return (this.#R(D, cursorOffset, x), cursorOffset);
    let normalized = D.normalize("NFC"),
      ke = cursorOffset < D.length ? cursorOffset : normalized.length,
      { written: written, end: end } = composeNormalized(normalized.slice(0, ke), h, normalized.slice(ke));
    return (this.#R(written, end, x), ke);
  };
  clear = () => {
    (this.#R("", 0, "outside"), this.#k({ pastedContents: {} }));
  };
  #R(h, x, D, L = !1) {
    this.#x();
    let ee = this.#u.value,
      ke = this.#n(h, ee),
      Re = x ?? this.#u.cursorOffset;
    if (D === "input") this.#S = !1;
    else if (ke !== ee) this.#S = !0;
    if (this.#T) {
      if (((this.#T = !1), ke !== "")) this.#w = null;
    }
    if (D === "outside" && ke === "") this.#_();
    if (ke === "") this.#h = !0;
    else if (this.#h && ke !== ee && !(L && isSingleCharEdit(ee, ke))) this.#h = !1;
    if (
      ((this.#f = { value: ke, cursorOffset: Re }),
      setPromptValue(this.#e, ke),
      (this.#f = null),
      this.#u.value === ke && D === "input")
    )
      this.#k({ cursorOffset: Re });
    (this.#s(ke, ee), this.#P(ke));
  }
  #P(h) {
    let x = h.trim().length > 0;
    (Z2n(this.#e, x),
      this.#y?.(),
      (this.#y = x
        ? this.#t(() => {
            ((this.#y = null), Z2n(this.#e, !1));
          }, TYPEAHEAD_WINDOW_MS)
        : null));
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
    let h = !0;
    try {
      h = this.#r();
    } catch (error) {
      logForDebugging(`the draft could not read the prompt hooks: ${errorMessage(error)}`, {
        level: "error",
      });
    }
    if (h) this.#k({ cameBack: !0 });
  };
  markMaybeSecret = () => {
    if (this.#u.value !== "") this.#k({ cameBack: !0 });
  };
  setMode = (h) => {
    this.#k({ mode: h });
  };
  setPastedContents = (h) => {
    this.#k({ pastedContents: typeof h === "function" ? h(this.#u.pastedContents) : h });
  };
  stash = () => {
    let {
        value: h,
        cursorOffset: cursorOffset,
        mode: mode,
        pastedContents: pastedContents,
        cameBack: cameBack,
      } = this.#u,
      launchWarning = this.#e.getState().launchWarning;
    (UPo(this.#e, {
      text: h,
      cursorOffset: cursorOffset,
      mode: mode,
      pastedContents: pastedContents,
      launchWarning: launchWarning ?? void 0,
      cameBack: cameBack,
    }),
      this.#R("", 0, "input"),
      this.#k({ pastedContents: {}, mode: "prompt" }));
  };
  popStash = (h) => {
    let stash = this.#e.getState().stash;
    if (stash === null) return !1;
    if (
      (UPo(this.#e, null),
      this.#R(stash.text, stash.cursorOffset, h),
      this.#k({
        pastedContents: stash.pastedContents,
        mode: stash.mode,
        cameBack: stash.cameBack === !0 && stash.text !== "",
      }),
      stash.launchWarning)
    )
      setLaunchWarning(this.#e, stash.launchWarning);
    return !0;
  };
  holdCleared = ({ intoHistory: intoHistory }) => {
    let { value: x, mode: mode, pastedContents: pastedContents, cameBack: cameBack } = this.#u;
    if (x.trim() !== "") {
      let launchWarning = this.#e.getState().launchWarning;
      (this.#_(),
        (this.#w = {
          text: x,
          mode: mode,
          pastedContents: pastedContents,
          launchWarning: launchWarning ?? void 0,
          cameBack: cameBack,
          clearedAt: Date.now(),
          intoHistory: intoHistory,
        }),
        (this.#T = !0));
    }
  };
  restoreCleared = () => {
    let h = this.#w;
    if (h === null || this.#u.value !== "") return !1;
    if (
      ((this.#w = null),
      this.#R(h.text, h.text.length, "input"),
      this.#k({ pastedContents: h.pastedContents, mode: h.mode, cameBack: h.cameBack }),
      h.launchWarning)
    )
      setLaunchWarning(this.#e, h.launchWarning);
    return !0;
  };
  #_() {
    let h = this.#w;
    if (((this.#w = null), h === null || this.#T || !h.intoHistory || h.launchWarning || h.cameBack)) return;
    let x = prependModeCharacterToInput_3(h.text, h.mode);
    if (getModeFromInput_2(x) === h.mode) Rei({ display: x, pastedContents: h.pastedContents }, h.clearedAt);
  }
  setInputOverlayActive = (h) => {
    this.#k({ isInputOverlayActive: h });
  };
  setInputRowReplaced = (h) => {
    this.#k({ isInputRowReplaced: h });
  };
  setVimEditing = (h) => {
    this.#k({ isVimEditing: h });
  };
  setInputOwnsEscape = (h) => {
    this.#k({ inputOwnsEscape: h });
  };
  setInterimRange = (h) => {
    let interimRange = this.#u.interimRange;
    if (h !== null && interimRange !== null && h.start === interimRange.start && h.end === interimRange.end)
      return;
    this.#k({ interimRange: h });
  };
  paint = (h) => {
    this.#A(h, this.#g?.layers ?? this.#C);
  };
  paintLayer = (h, x, D) => {
    let { value: L } = this.#u,
      ee = x.length === 0;
    if (!ee && L !== D) return { isPainted: !1 };
    let ke = this.#g?.layers ?? this.#C;
    if (!ee || ke.has(h))
      this.#A(this.#g?.runs ?? freeze_8, new Map(ke).set(h, normalizeInputDecorations(x, L)));
    return { isPainted: !0 };
  };
  dropLayer = (h) => {
    if (this.#v?.layers.has(h) === !0) {
      let L = new Map(this.#v.layers);
      (L.delete(h), (this.#v = { ...this.#v, layers: L }));
    }
    let x = new Map(this.#C);
    (x.delete(h), (this.#C = x));
    let D = new Map(this.#g?.layers ?? sVe);
    if (D.delete(h)) this.#A(normalizeInputDecorations(this.#g?.runs ?? freeze_8, this.#u.value), D);
  };
  #A(h, x) {
    if (((this.#v = null), h.length === 0 && x.size === 0 && this.#g === null)) return;
    let { value: D, decorations: decorations } = this.#u,
      ee = gYs(h, x, D);
    ((this.#g =
      h.length === 0 && x.size === 0
        ? null
        : { value: D, runs: h, layers: x, shown: isDeepStrictEqual_2(ee, decorations) ? decorations : ee }),
      this.#k({}));
  }
  carryPaint = (h, x) => {
    this.#I(h, x, !0);
  };
  carryLayers = (h, x) => {
    this.#I(h, x, !1);
  };
  #I(h, x, D) {
    let L = this.#v;
    if (((this.#v = null), L === null || L.value !== h.text || this.#u.value !== x.text)) return;
    let ee = diffTextEdit(h, x),
      ke = D ? shiftDecorationsForEdit(L.runs, ee) : freeze_8,
      Re = L.layers.size === 0 ? normalizeInputDecorations(ke, x.text) : ke,
      Be = new Map();
    for (let [He, We] of L.layers) Be.set(He, shiftDecorationsForEdit(We, ee));
    this.#A(Re, Be);
  }
  submit = (h, x = !1) => {
    if (this.#p === 0) return !1;
    return (this.#d.emit(h, x), !0);
  };
  onSubmitRequest = (h) => {
    let subscribe = this.#d.subscribe(h);
    this.#p++;
    let D = !0;
    return () => {
      if (!D) return;
      ((D = !1), this.#p--, subscribe());
    };
  };
  dispose() {
    if (this.#b) return;
    if (((this.#b = !0), this.#m(), this.#i?.dispose(), this.#y))
      (this.#y(), (this.#y = null), Z2n(this.#e, !1));
    (this.#d.clear(), (this.#p = 0));
  }
}

export {
  PromptDraft,
  selectDraftValue,
  selectCursorOffset,
  selectInputMode,
  selectPastedContents,
  selectInterimRange,
  selectDecorations,
  selectCameBack,
  MO,
  composeNormalized,
  selectIsEmpty,
  selectIsMultiline,
  selectHasStash,
};
