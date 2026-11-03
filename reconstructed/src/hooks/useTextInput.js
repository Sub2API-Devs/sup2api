/**
 * hooks/useTextInput.ts
 *
 * 文本输入核心 hook：按键映射到 Cursor 编辑操作（移动/删除/kill/yank/换行）、历史上下、双击 Esc 清空、Ctrl-C 处理、提交。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/useTextInput.ts
 * pieces: chunk-7p2hc4jn.js (20)
 * attribution: placement 18, file-local 1, fingerprint 1
 */
import { claimOnce } from "../services/api/verificationRequired.js";
import { logError } from "../utils/log.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../utils/errors.js";
import { HostScoped } from "../utils/hostScoped.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { lon, oQe } from "../utils/attachStamp.js";
import { logEvent } from "../services/analytics/index.js";
import { lit } from "../services/analytics/safeMetadata.js";
import { logForDebugging } from "../utils/debug.js";
import {
  cqo,
  buildVirtualTextLayout,
  draftToDisplayOffset,
  offsetDecorations,
} from "../plugins/functionHooks/prompt/decorationSpans.js";
import { Cursor } from "../utils/Cursor.js";
import { announce } from "../utils/accessibility/screenReader.js";
import { env } from "../utils/env.js";
import { useIsFullscreen } from "../ink/renderModeContext.js";
import { useKillRing, egt, nextYankPop } from "../utils/killRing.js";
import { Q, y, R } from "../../vendor/react/cjs/react.production.js";
import { useNotifications } from "../context/notifications.js";
import { Me } from "../components/design-system/ThemeProvider.js";
import { useDoublePress } from "../keybindings/useActionHandlers.js";
import { Do } from "../utils/git/gitSafeEnv.js";
import {
  prependModeCharacterToInput,
  isBashModeChar,
  getModeFromInput,
} from "../components/PromptInput/inputModes.js";
import { ySe } from "../history.js";
import { markBackslashReturnUsed } from "../commands/terminalSetup/terminalSetup.js";

/**
 * 文本换行行与原文不能完全拼合、回退到硬换行时，每进程只记录一次错误。
 */
//@ chunk-7p2hc4jn.js:38712-38960 placement
function logWrapFallbackOnce(e, r) {
  if (!claimOnce().claim("measured_text_wrap_fallback")) return;
  logError(
    new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Wrapped rows do not tile the text (columns=${e}, length=${r}); fell back to plain hard wrapping`,
      "Wrapped rows do not tile the text; fell back to plain hard wrapping",
    ),
  );
}
//@ chunk-7p2hc4jn.js:38960-39072 placement
class OnceFlag {
  prewarmed = !1;
  claim() {
    if (this.prewarmed) return !1;
    return ((this.prewarmed = !0), !0);
  }
  reset() {
    this.prewarmed = !1;
  }
}
//@ chunk-7p2hc4jn.js:39072-39097 placement
var Dn = new HostScoped(() => new OnceFlag());
//@ chunk-7p2hc4jn.js:39097-39112 placement
function Kt() {}
//@ chunk-7p2hc4jn.js:39112-39136 placement
function jt(e) {
  return !1;
}
/**
 * 左方向键手势的常量：武装窗口毫秒数、两段提示文字、吸收窗口与人手节奏间隔。
 */
//@ chunk-7p2hc4jn.js:39136-39264 placement
var LEFT_ARROW_ARM_WINDOW_MS = 3000,
  LEFT_ARROW_BACK_HINT = "Press \u2190 again to go back to agents",
  LEFT_ARROW_DETACH_HINT = "Ambiguous \u2190, press again to detach",
  LEFT_ARROW_ABSORB_MS = 1000,
  HUMAN_CADENCE_MS = 150,
  ATTACH_CONFIRM_MIN_MS = 150;
/**
 * 新建左方向键手势状态：编辑清空时间、武装时间、吸收锚点、上次有效按键时间、attach 确认武装时间、是否已记过吸收日志。
 */
//@ chunk-7p2hc4jn.js:39264-39402 placement
function createLeftArrowGestureState() {
  return {
    editedEmptyAtMs: 0,
    armedAtMs: 0,
    absorbAnchorMs: 0,
    lastQualifiedLeftPressMs: 0,
    attachConfirmArmedAtMs: 0,
    absorbLogged: !1,
  };
}
/**
 * 决定一次左方向键（返回代理列表/脱离会话）该怎么处理：reject（不是单独按键）、fire（执行）、arm（刚清空输入，先提示再按一次）、absorb（人手节奏的连按被吞掉）、attach-arm/attach-absorb（attach 模式下的确认）。
 */
//@ chunk-7p2hc4jn.js:39402-40028 placement
function decideLeftArrowGesture(
  state,
  nowMs,
  isSoloKey,
  guardEnabled = getFeatureValue_CACHED_MAY_BE_STALE("tengu_left_arrow_editing_guard", !0),
  isAttached = lon(nowMs),
  sinceMs = oQe(),
) {
  if (isSoloKey !== !0) return "reject";
  let isRecent = (x) => x !== 0 && x >= sinceMs;
  if (isAttached) {
    if (isRecent(state.absorbAnchorMs) && nowMs - state.absorbAnchorMs < LEFT_ARROW_ABSORB_MS)
      return "attach-absorb";
    if (isRecent(state.attachConfirmArmedAtMs) && nowMs - state.attachConfirmArmedAtMs <= 3000)
      return nowMs - state.attachConfirmArmedAtMs >= ATTACH_CONFIRM_MIN_MS ? "fire" : "attach-absorb";
    return "attach-arm";
  }
  if (!guardEnabled) return "fire";
  if (isRecent(state.lastQualifiedLeftPressMs) && nowMs - state.lastQualifiedLeftPressMs < HUMAN_CADENCE_MS)
    return "absorb";
  if (isRecent(state.armedAtMs) && nowMs - state.armedAtMs <= 3000) return "fire";
  if (isRecent(state.absorbAnchorMs) && nowMs - state.absorbAnchorMs < LEFT_ARROW_ABSORB_MS) return "absorb";
  return isRecent(state.editedEmptyAtMs) && nowMs - state.editedEmptyAtMs < 2000 ? "arm" : "fire";
}
/**
 * 按 decideLeftArrowGesture 的结果更新手势状态（武装、吸收锚点、上次按键时间等）。
 */
//@ chunk-7p2hc4jn.js:40028-40522 placement
function applyLeftArrowGesture(e, r, n) {
  switch (r) {
    case "fire":
      if (e.armedAtMs !== 0) e.editedEmptyAtMs = 0;
      ((e.armedAtMs = 0),
        (e.attachConfirmArmedAtMs = 0),
        (e.absorbAnchorMs = n),
        (e.lastQualifiedLeftPressMs = n),
        (e.absorbLogged = !1));
      return;
    case "arm":
      ((e.armedAtMs = n), (e.absorbAnchorMs = n), (e.lastQualifiedLeftPressMs = n), (e.absorbLogged = !1));
      return;
    case "absorb":
      if (n - e.lastQualifiedLeftPressMs < HUMAN_CADENCE_MS) e.absorbAnchorMs = n;
      e.lastQualifiedLeftPressMs = n;
      return;
    case "reject":
      return;
    case "attach-arm":
      e.attachConfirmArmedAtMs = n;
      return;
    case "attach-absorb":
      return;
  }
}
/**
 * 为被拦下的左方向键手势打点 tengu_left_arrow_blocked（原因：editing-quiet、attach-quiet、not-solo、absorb 等）并写调试日志；吸收日志每个锚点只记一次。
 */
//@ chunk-7p2hc4jn.js:40522-41484 placement
function logLeftArrowGesture(decision, nowMs, state) {
  let s = nowMs - oQe();
  switch (decision) {
    case "fire":
      return;
    case "arm":
      logEvent("tengu_left_arrow_blocked", { reason: lit("editing-quiet") });
      return;
    case "attach-arm":
      (logEvent("tengu_left_arrow_blocked", { reason: lit("attach-quiet-hint"), ms_since_stamp: s }),
        logForDebugging(`leftArrowGesture: attach-quiet hint armed (ms_since_stamp=${s})`, {
          level: "debug",
        }));
      return;
    case "attach-absorb":
      (logEvent("tengu_left_arrow_blocked", { reason: lit("attach-quiet"), ms_since_stamp: s }),
        logForDebugging(`leftArrowGesture: attach-quiet silent absorb (ms_since_stamp=${s})`, {
          level: "debug",
        }));
      return;
    case "reject":
      if (claimOnce().claim("left_arrow_not_solo_reject"))
        logEvent("tengu_left_arrow_blocked", { reason: lit("not-solo") });
      return;
    case "absorb":
      if (state.absorbAnchorMs === nowMs || state.absorbLogged) return;
      state.absorbLogged = !0;
      let o = nowMs - state.absorbAnchorMs;
      (logEvent("tengu_left_arrow_blocked", { reason: lit("absorb"), ms_since_press: o }),
        logForDebugging(
          `leftArrowGesture: human-cadence press absorbed, too soon after the last \u2190 that fired or showed the hint (ms_since_press=${o})`,
          { level: "debug" },
        ));
      return;
  }
}
//@ chunk-7p2hc4jn.js:41484-41592 placement = setCwdState (1)
var rangesBefore = (e, r) => e.filter((n) => n.start < r),
  isNfcStable = (e, r) => e.normalize("NFC") === e && r.text.normalize("NFC") === r.text;
/**
 * 按方向移动光标，跳过与当前偏移相同或（上下移动时）不在目标行的位置，直到找到一个实际不同的光标位置；到边界时原地不动。
 */
//@ chunk-7p2hc4jn.js:41592-41920 placement
function moveCursorToDistinctRow(e, r, n) {
  let s = n === "up" || n === "down",
    cursorOver = e.cursorOver(r);
  for (;;) {
    let u = cursorOver[n]();
    if (u.equals(cursorOver)) return r;
    let line = u.getPosition().line,
      h = cqo(e.text, u.offset),
      found = (s ? [h, r.measuredText.nextOffset(h), r.measuredText.prevOffset(h)] : [h]).find(
        (T) => T !== r.offset && (!s || e.rowOf(T) === line),
      );
    if (found !== void 0) return new Cursor(r.measuredText, found);
    cursorOver = u;
  }
}
/**
 * 把带占位文本（如折叠粘贴）的缓冲区展开成显示文本并测量换行，返回显示/缓冲区偏移换算与按行移动光标的辅助函数；NFC 不稳定时返回 undefined。
 */
//@ chunk-7p2hc4jn.js:41920-42358 placement
function buildDisplayTextMapping({ buffer: buffer, texts: texts, columns: columns, side: side }) {
  if (texts.length === 0) return;
  let o = buildVirtualTextLayout(buffer, texts);
  if (!isNfcStable(buffer, o)) return;
  let { measuredText: measuredText } = Cursor.fromText(o.text, columns),
    d = (x) => new Cursor(measuredText, draftToDisplayOffset(o, x.offset, side)),
    h = (x) => measuredText.getPositionFromOffset(draftToDisplayOffset(o, x, side)).line;
  return {
    text: o,
    cursorOver: d,
    rowOf: h,
    lastRow: () => {
      let x = draftToDisplayOffset(o, buffer.length, "before");
      return measuredText.getPositionFromOffset(
        buffer.endsWith(`
`)
          ? x
          : measuredText.prevOffset(x),
      ).line;
    },
    rowMoved: (x, T) => moveCursorToDistinctRow({ text: o, cursorOver: d, rowOf: h }, x, T),
  };
}
/**
 * 为输入缓冲区建立光标：有显示映射时光标落在显示文本上，并给出把显示偏移换回缓冲区偏移的函数；否则直接用缓冲区。
 */
//@ chunk-7p2hc4jn.js:42358-42598 placement
function createDisplayCursor({ buffer: buffer, offset: offset, texts: texts, columns: columns, side: side }) {
  let fromText = Cursor.fromText(buffer, columns, offset),
    d = buildDisplayTextMapping({ buffer: buffer, texts: texts, columns: columns, side: side });
  if (d === void 0) return { cursor: fromText, bufferOffset: (h) => h };
  return { cursor: d.cursorOver(fromText), bufferOffset: (h) => cqo(d.text, h) };
}
//@ chunk-7p2hc4jn.js:42598-42612 placement
var Ar = () => {};
//@ chunk-7p2hc4jn.js:42612-42791 placement
function announceDeletion(e, r) {
  if (e === "") return;
  if (r !== "") {
    announce("deleted");
    return;
  }
  let n =
    e.trim() === ""
      ? e.includes(`
`)
        ? "new line"
        : e.includes("\t")
          ? "tab"
          : "space"
      : e
          .replaceAll(
            `
`,
            " ",
          )
          .trim();
  announce(n);
}
//@ chunk-7p2hc4jn.js:42791-42926 placement
var IGNORED_KEY_NAMES = new Set([
  "insert",
  "clear",
  "enter",
  "center",
  "undefined",
  "mouse",
  "f1",
  "f2",
  "f3",
  "f4",
  "f5",
  "f6",
  "f7",
  "f8",
  "f9",
  "f10",
  "f11",
  "f12",
]);
//@ chunk-7p2hc4jn.js:42926-42991 placement
function Vnn() {
  return env.terminal === "Apple_Terminal" && jt("shift");
}
//@ chunk-7p2hc4jn.js:42991-43067 file-local
function mapInput(input_map) {
  let map = new Map(input_map);
  return function (input) {
    return (map.get(input) ?? Ar)(input);
  };
}
/**
 * 文本输入核心：把按键映射为 Cursor 操作（ctrl+a/e/b/f/h/d/k/u/w/y、alt+b/f/d、方向键、home/end、换行 \⏎/shift+⏎），上下键在多行内移动或触发历史；Esc 双击清空（escape-again-to-clear），Ctrl-C 清空或退出提示；Apple Terminal 特判；返回 onInput、渲染文本与光标位置。
 */
//@ chunk-7p2hc4jn.js:43067-50977 fingerprint = useTextInput (0.462)
function useTextInput({
  value: e,
  onChange: onChange,
  onSubmit: onSubmit,
  onExit: onExit,
  onExitMessage: onExitMessage,
  onEscapeMessage: onEscapeMessage,
  historyOnClear: historyOnClear = !0,
  onLeftArrowOnEmpty: onLeftArrowOnEmpty,
  leftArrowConfirmHint: leftArrowConfirmHint,
  onHistoryUp: onHistoryUp,
  onHistoryDown: onHistoryDown,
  onHistoryReset: onHistoryReset,
  mask: mask = "",
  maskWhole: maskWhole = !1,
  multiline: multiline = !1,
  disableBackslashReturn: disableBackslashReturn = !1,
  clearOnSubmit: clearOnSubmit = !0,
  disableCtrlCClear: disableCtrlCClear = !1,
  cursorChar: cursorChar,
  preserveTrailingWhitespace: preserveTrailingWhitespace = !1,
  invert: invert,
  columns: columns,
  leadingPill: leadingPill,
  onImagePaste: onImagePaste,
  disableCursorMovementForUpDownKeys: disableCursorMovementForUpDownKeys = !1,
  disableEscapeDoublePress: disableEscapeDoublePress = !1,
  maxVisibleLines: maxVisibleLines,
  externalOffset: externalOffset,
  onOffsetChange: onOffsetChange,
  inputFilter: inputFilter,
  getPastedContents: getPastedContents,
  getInputMode: getInputMode,
  inlineGhostText: inlineGhostText,
  dim: dim,
  virtualTexts: virtualTexts,
  isCursorOnCharacter: isCursorOnCharacter = !1,
  editRelay: editRelay,
  commitEdit: commitEdit,
  selectionAnchor: selectionAnchor,
  selectionLinewise: selectionLinewise = !1,
}) {
  let ke = useIsFullscreen(),
    Ee = useKillRing();
  if (env.terminal === "Apple_Terminal") Kt();
  let He = externalOffset,
    Ge = onOffsetChange,
    N = leadingPill?.text ?? "",
    cursor = Cursor.fromText(N + e, columns, N.length + He),
    wt =
      inlineGhostText && dim && inlineGhostText.insertPosition === He
        ? { text: inlineGhostText.text, dim: dim }
        : void 0,
    xt = wt !== void 0 && He >= e.length,
    rt = Q(
      () =>
        virtualTexts === void 0 || virtualTexts.length === 0 || e === "" || mask !== ""
          ? void 0
          : buildDisplayTextMapping({
              buffer: N + e,
              texts: offsetDecorations(xt ? rangesBefore(virtualTexts, e.length) : virtualTexts, N.length),
              columns: columns,
              side: isCursorOnCharacter ? "after" : "before",
            }),
      [virtualTexts, e, mask, N, xt, columns, isCursorOnCharacter],
    ),
    nt = !1,
    st,
    Ke = !1;
  function Oe(c) {
    return inputFilter && st ? inputFilter(c, st) : c;
  }
  let { addNotification: addNotification, removeNotification: removeNotification } = useNotifications(),
    { storageV5: storageV5 } = Me(),
    [be] = y(createLeftArrowGestureState),
    Ue = "left-arrow-again-for-agents",
    Ve = R({ key: "Ctrl-C", pending: !1 }),
    handleCtrlC = useDoublePress(
      (show) => {
        ((Ve.current.pending = show), onExitMessage?.(show, Ve.current.key));
      },
      () => onExit?.(),
      () => {
        if (!disableCtrlCClear && e) (onChange(""), Ge(0), onHistoryReset?.());
      },
    );
  function yt(c) {
    if (!Ve.current.pending) Ve.current.key = c;
    handleCtrlC();
  }
  let handleEscape = useDoublePress(
    (show) => {
      if (!e) return;
      if (onEscapeMessage) {
        onEscapeMessage(show);
        return;
      }
      if (!show) return;
      addNotification({
        key: "escape-again-to-clear",
        kind: "feedback",
        text: "Esc again to clear",
        row1Hint: "Esc again to clear",
        priority: "immediate",
        timeoutMs: 1000,
      });
    },
    () => {
      if ((onEscapeMessage?.(!1), removeNotification("escape-again-to-clear"), e)) {
        if (historyOnClear && mask === "" && e.trim() !== "") {
          let c = getPastedContents
              ? Do(getPastedContents(), (show) => show.type === "text" && show.unavailable === !0)
              : void 0,
            O = getInputMode?.(),
            L = O !== void 0 ? prependModeCharacterToInput(e, O) : e,
            ne = c ? { display: L, pastedContents: c } : L;
          if (O !== void 0) ySe(ne, storageV5, { submitMode: O });
          else ySe(ne, storageV5);
        }
        (onChange(""), Ge(0), onHistoryReset?.());
      }
    },
  );
  function handleCtrlD() {
    if (cursor.text === N && e === "") return (yt("Ctrl-D"), cursor);
    return cursor.del();
  }
  function killToLineEnd() {
    if (N !== "" && cursor.offset === N.length) return Cursor.fromText(cursor.text.slice(N.length), columns);
    return cursor.backspace();
  }
  function _e(c, O) {
    let L = c.startsWith(N) ? c.slice(N.length) : c;
    return (
      Ee.dispatch(mask === "" ? { type: "kill", text: L, direction: O } : { type: "interrupt" }),
      announceDeletion(L, mask),
      L
    );
  }
  function ut() {
    let { cursor: cursor_2, killed: killed } = cursor.deleteToLineEnd(we("endOfLine"));
    return (_e(killed, "append"), cursor_2);
  }
  function St() {
    let { cursor: cursor_2, killed: killed } = cursor.deleteToLineStart(we("startOfLine")),
      L = _e(killed, "prepend");
    if (mask === "" && L.length >= 3)
      addNotification({
        key: "kill-paste-hint",
        kind: "hint",
        text: "Ctrl+Y to paste deleted text",
        row1Hint: "ctrl+y to undo delete",
        priority: "immediate",
        timeoutMs: 5000,
      });
    return cursor_2;
  }
  function Qt() {
    let { cursor: cursor_2, killed: killed } = cursor.killWord();
    return (_e(killed, "append"), cursor_2);
  }
  function killToLineStart() {
    let { cursor: cursor_2, killed: killed } = cursor.backwardKillWord();
    return (_e(killed, "prepend"), cursor_2);
  }
  function killWordBefore() {
    let { cursor: cursor_2, killed: killed } = cursor.deleteWORDBefore();
    return (_e(killed, "prepend"), cursor_2);
  }
  function yank() {
    let c = Oe(egt(Ee.state));
    if (c.length > 0) {
      let O = cursor.offset - N.length,
        newCursor = cursor.insert(c);
      return (Ee.dispatch({ type: "yank", start: O, length: c.length }), newCursor);
    }
    return cursor;
  }
  function handleYankPop() {
    let c = nextYankPop(Ee.state);
    if (!c) return cursor;
    let { text: text, length: length } = c,
      ne = N.length + c.start,
      me = Oe(text);
    Ee.dispatch({ type: "yankPop" });
    let before = cursor.text.slice(0, ne),
      after = cursor.text.slice(ne + length),
      fr = before + me + after,
      dr = ne + me.length;
    return (Ee.dispatch({ type: "updateYankLength", length: me.length }), Cursor.fromText(fr, columns, dr));
  }
  let handleCtrl = mapInput([
      ["a", () => cursor.startOfLogicalLine()],
      ["b", () => cursor.left()],
      ["c", () => (yt("Ctrl-C"), cursor)],
      ["d", handleCtrlD],
      ["e", () => cursor.endOfLogicalLine()],
      ["f", () => cursor.right()],
      ["h", killToLineEnd],
      ["k", ut],
      ["n", () => downOrHistoryDown()],
      ["p", () => upOrHistoryUp()],
      ["u", St],
      ["w", killWordBefore],
      ["y", yank],
    ]),
    handleMeta = mapInput([
      ["b", () => cursor.backwardWord()],
      ["f", () => cursor.forwardWord()],
      ["d", Qt],
      ["y", handleYankPop],
    ]);
  function handleEnter({ meta: meta, shift: O }) {
    if (multiline && !disableBackslashReturn && cursor.offset > 0 && cursor.text[cursor.offset - 1] === "\\")
      return (
        markBackslashReturnUsed(storageV5),
        cursor.backspace().insert(
          Oe(`
`),
        )
      );
    if (meta || O)
      return cursor.insert(
        Oe(`
`),
      );
    if (Vnn())
      return cursor.insert(
        Oe(`
`),
      );
    if (onSubmit) (onSubmit(cursor.text.slice(N.length)), (nt = !0));
    return cursor;
  }
  function Ye() {
    be.editedEmptyAtMs = Date.now();
  }
  function Et() {
    if (be.armedAtMs === 0) return;
    ((be.armedAtMs = 0), removeNotification(Ue));
  }
  function ze() {
    return rt !== void 0 && cursor.text === rt.text.draft ? rt : void 0;
  }
  function we(key) {
    return ze()?.rowMoved(cursor, key) ?? cursor[key]();
  }
  function upOrHistoryUp() {
    if (disableCursorMovementForUpDownKeys) return (Ye(), onHistoryUp?.(), cursor);
    let c = ze();
    if (
      onHistoryUp &&
      (c
        ? c.rowOf(cursor.offset) <= c.rowOf(N.length)
        : cursor.getPosition().line <= cursor.measuredText.getPositionFromOffset(N.length).line)
    )
      return (Ye(), onHistoryUp(), cursor);
    let O = we("up");
    if (!O.equals(cursor)) return O;
    if (multiline) {
      let cursorUpLogical = cursor.upLogicalLine();
      if (!cursorUpLogical.equals(cursor)) return cursorUpLogical;
    }
    return cursor;
  }
  function downOrHistoryDown() {
    if (disableCursorMovementForUpDownKeys) return (Ye(), onHistoryDown?.(), cursor);
    let c = ze();
    if (
      onHistoryDown &&
      (c
        ? c.rowOf(cursor.offset) >= c.lastRow()
        : cursor.getPosition().line >= cursor.measuredText.lineCount - 1)
    )
      return (Ye(), onHistoryDown(), cursor);
    let O = we("down");
    if (!O.equals(cursor)) return O;
    if (multiline) {
      let cursorDownLogical = cursor.downLogicalLine();
      if (!cursorDownLogical.equals(cursor)) return cursorDownLogical;
    }
    return cursor;
  }
  function mapKey(key) {
    if (key.ctrl && (key.key === "k" || key.key === "u" || key.key === "w")) return !0;
    if (key.meta && !key.ctrl && key.key === "d") return !0;
    if (key.key === "backspace" && (key.meta || key.superKey || key.ctrl)) return !0;
    if (key.key === "delete" && (key.meta || key.superKey)) return !0;
    return !1;
  }
  function lr(input) {
    return (input.ctrl || input.meta) && input.key === "y";
  }
  function isKillKey(key, input) {
    switch (key.name) {
      case "escape":
        if (disableEscapeDoublePress) return;
        return (handleEscape(), cursor);
      case "left":
        if (key.superKey) return we("startOfLine");
        if (key.ctrl || key.meta || key.fn) return cursor.backwardWord();
        if (onLeftArrowOnEmpty && !key.shift && cursor.text === N) {
          let now = Date.now(),
            ne = decideLeftArrowGesture(be, now, key.soloKeypress),
            me = be.armedAtMs === 0 ? void 0 : now - be.absorbAnchorMs;
          switch ((applyLeftArrowGesture(be, ne, now), logLeftArrowGesture(ne, now, be), ne)) {
            case "fire":
              return (removeNotification(Ue), onLeftArrowOnEmpty(me), cursor);
            case "arm":
              return (
                addNotification({
                  key: Ue,
                  kind: "feedback",
                  text: leftArrowConfirmHint ?? "Press \u2190 again",
                  priority: "immediate",
                  timeoutMs: LEFT_ARROW_ARM_WINDOW_MS,
                }),
                cursor
              );
            case "absorb":
              return cursor;
            case "attach-arm":
              return (
                addNotification({
                  key: Ue,
                  kind: "feedback",
                  text: LEFT_ARROW_DETACH_HINT,
                  priority: "immediate",
                  timeoutMs: LEFT_ARROW_ARM_WINDOW_MS,
                }),
                cursor
              );
            case "attach-absorb":
              return cursor;
            case "reject":
              return cursor.left();
          }
        }
        return cursor.left();
      case "right":
        if (key.superKey) return we("endOfLine");
        if (key.ctrl || key.meta || key.fn) return cursor.forwardWord();
        return cursor.right();
      case "up":
        if (key.shift || key.ctrl || key.meta) return;
        return upOrHistoryUp();
      case "down":
        if (key.shift || key.ctrl || key.meta) return;
        return downOrHistoryDown();
      case "backspace":
        if (key.superKey) return St();
        if (key.meta || key.ctrl) return killToLineStart();
        return killToLineEnd();
      case "delete":
        if (key.superKey) return ut();
        if (key.meta) return ut();
        return cursor.del();
      case "home":
        if (key.ctrl) return;
        return we("startOfLine");
      case "end":
        if (key.ctrl) return;
        return we("endOfLine");
      case "pagedown":
        if (ke || key.ctrl) return;
        return we("endOfLine");
      case "pageup":
        if (ke || key.ctrl) return;
        return we("startOfLine");
      case "return":
        if (key.ctrl) return;
        return handleEnter(key);
      case "enter":
        return cursor.insert(
          Oe(`
`),
        );
      case "tab":
        return;
    }
    if (multiline && key.ctrl && !key.shift && !key.meta && key.name === "j")
      return cursor.insert(
        Oe(`
`),
      );
    if (key.ctrl) return handleCtrl(key.key);
    if (key.meta) return handleMeta(key.key);
    if (IGNORED_KEY_NAMES.has(key.name)) return;
    if (input.length === 0) return;
    if (
      getInputMode !== void 0 &&
      cursor.offset === N.length &&
      isBashModeChar(input) &&
      getInputMode() !== getModeFromInput(input)
    )
      return ((Ke = !0), cursor.insert(input).left());
    return cursor.insert(input);
  }
  function cr(c) {
    ((st = c), (Ke = !1));
    let O = inputFilter ? inputFilter(c.key, c) : c.key;
    if (O === "" && c.key !== "") {
      c.preventDefault();
      return;
    }
    if (!mapKey(c) && !lr(c)) Ee.dispatch({ type: "interrupt" });
    if (!(c.name === "left" && !c.ctrl && !c.meta && !c.fn && !c.superKey && !c.shift)) Et();
    let L = isKillKey(c, O);
    if (L === void 0) return;
    if ((c.preventDefault(), !cursor.equals(L))) {
      let startsWith = L.text.startsWith(N);
      if (startsWith && L.offset < N.length) L = new Cursor(L.measuredText, N.length);
      let sliced = cursor.text.slice(N.length),
        Ae = startsWith ? L.text.slice(N.length) : L.text,
        qe = L.offset - (startsWith ? N.length : 0);
      if (sliced !== "" && Ae === "") be.editedEmptyAtMs = Date.now();
      if (sliced !== Ae)
        if (commitEdit !== void 0 && !Ke) commitEdit(() => onChange(Ae));
        else onChange(Ae);
      if ((Ge(qe), editRelay?.isRecording() === !0 && !Ke))
        editRelay.record({
          before: { text: sliced, cursor: Math.max(0, cursor.offset - N.length) },
          after: { text: Ae, cursor: qe },
          key: c,
        });
      if (((cursor = L), !startsWith)) ((N = ""), leadingPill?.onDelete());
    }
    if (nt) {
      if (((nt = !1), clearOnSubmit)) cursor = Cursor.fromText(N, columns, N.length);
    }
  }
  let Ce = ze(),
    ve = Ce?.cursorOver(cursor) ?? cursor,
    cursorPos = ve.getPosition();
  return {
    handleKeyDown: cr,
    renderedValue: ve.render(
      cursorChar,
      mask,
      invert,
      wt,
      maxVisibleLines,
      selectionAnchor === void 0 || selectionAnchor === null
        ? void 0
        : Ce
          ? draftToDisplayOffset(Ce.text, N.length + selectionAnchor, "after")
          : N.length + selectionAnchor,
      selectionLinewise,
      preserveTrailingWhitespace,
      Ce?.text.spans,
      maskWhole,
    ),
    offset: He,
    setOffset: Ge,
    cursorLine: cursorPos.line - ve.getViewportStartLine(maxVisibleLines),
    cursorColumn: cursorPos.column,
    renderedRowStartOffsets: ve.getRenderedRowStartOffsets(maxVisibleLines),
    shown: Ce && { text: Ce.text, cursorOffset: ve.offset },
    noteKeystrokeEmptied: () => {
      be.editedEmptyAtMs = Date.now();
    },
    disarmLeftArrowConfirm: Et,
  };
}

export {
  HUMAN_CADENCE_MS,
  LEFT_ARROW_BACK_HINT,
  isNfcStable,
  rangesBefore,
  createDisplayCursor,
  Vnn,
  logWrapFallbackOnce,
  useTextInput,
  createLeftArrowGestureState,
  LEFT_ARROW_ARM_WINDOW_MS,
  decideLeftArrowGesture,
  applyLeftArrowGesture,
  logLeftArrowGesture,
  LEFT_ARROW_DETACH_HINT,
};
