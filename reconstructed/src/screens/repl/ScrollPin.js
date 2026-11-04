/**
 * screens/repl/ScrollPin.ts
 *
 * 2.1.316 新增。REPL 控制器：滚动固定。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (2)
 * attribution: placement 2
 */
import { ReplayHandleSlot } from "../../ink/outputReplay.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { logForDebugging } from "../../utils/debug.js";
import { createSignal } from "../../utils/signal.js";
import { stringSchema, objectSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { Text, Box } from "../../ink/components/Text.js";
import { EMPTY_DIVIDER_STATE } from "./MessageArea.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { env } from "../../utils/env.js";
import { logEvent } from "../../services/analytics/index.js";
import { logError } from "../../utils/log.js";
import { errorMessage } from "../../utils/errors.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { resolveSetting } from "../../utils/settings/userIntentSettings.js";
import { logFeatureBad, logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { isHumanTurn } from "../../utils/turnOrigin.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { computeUnseenDivider } from "../../components/FullscreenLayout.js";
import { currentToolPermissionContext } from "../../utils/permissions/currentPermissionContext.js";

//@ chunk-18hwfzwa.js:1463996-1467637 placement
/**
 * 滚动钉住：管理视口自动滚动、未读分隔线、“输入后钉回底部”的各种触发（typed/suggestion_accepted/ownSubmitLanded）。
 */
class ScrollPin {
  viewport = new ReplayHandleSlot();
  modalViewport = new ReplayHandleSlot();
  revealRef = {
    current: null,
  };
  #e;
  #t = createSignal();
  #o;
  #n = EMPTY_DIVIDER_STATE;
  #s = null;
  #r = -1;
  #c = null;
  #i = false;
  #a = null;
  #l = null;
  #d = undefined;
  constructor(options) {
    this.#e = options;
    this.#o = options.transcript.subscribe(this.#S);
  }
  subscribe = (listener) => this.#t.subscribe(listener);
  getSnapshot = () => this.#n;
  get dividerY() {
    return this.#n.dividerY;
  }
  setRenderedLength(length) {
    this.#c = length;
  }
  dispose() {
    this.#o();
  }
  isAtBottom = () => this.viewport.handle?.isSticky() ?? true;
  repin = (force = false, reason = "?") => {
    if (!force && !resolveSetting("autoScrollEnabled", true).value) return;
    let handle = this.viewport.handle;
    if (handle && !handle.isSticky())
      logForDebugging(
        `repinScroll(${reason}, force=${force}): yanking from scrollTop=${handle.getScrollTop()} (max=${Math.max(0, handle.getScrollHeight() - handle.getViewportHeight())})`,
      );
    this.#m();
    handle?.scrollToBottom();
    this.#f();
    this.#i = false;
  };
  onPromptEdit(prevValue, nextValue) {
    if (nextValue !== "" || prevValue === "" || this.#i) return;
    this.repin(false, "typedIntoEmpty");
  }
  onUserRowLanded(rowKey) {
    let lastRow =
      (rowKey.promptSource === "typed" || rowKey.promptSource === "suggestion_accepted") &&
      isHumanTurn(rowKey);
    if (lastRow || !this.#i) this.repin(false, lastRow ? "ownSubmitLanded" : "rowLanded");
  }
  onBelowTranscriptSlotChange(slotValue) {
    let previousSlot = this.#d;
    this.#d = slotValue;
    if (previousSlot === undefined || previousSlot === slotValue) return;
    if (this.#a === null && (this.viewport.handle?.isSticky() ?? true))
      this.repin(false, `progressOrPanel\u2192${slotValue}`);
  }
  onUserScroll = (delta, cause) => {
    this.#m();
    this.#e.awaySummary.markUserScrolled();
    this.#i = !delta;
    if (delta) this.#f();
    else this.#u(cause);
  };
  onUserScrollWithoutDivider = (position) => {
    this.#m();
    this.#i = !position;
  };
  reveal = async (rowKey, options) => {
    let handle = this.revealRef.current;
    if (!this.viewport.handle || !handle) return "unscrollable";
    let revealed = handle.reveal(rowKey, options);
    if (!revealed) return "unknown";
    this.#i = true;
    this.#p();
    return (await revealed) ? "revealed" : "unknown";
  };
  rowHolding = (row) => this.revealRef.current?.rowHolding(row);
  releaseReveal = () => {
    this.revealRef.current?.release();
  };
  #m() {
    this.releaseReveal();
    this.#p();
  }
  #p() {
    this.#a = null;
    this.#l = null;
  }
  jumpToNew = () => {
    this.#m();
    this.viewport.handle?.scrollToBottom();
    this.#i = false;
  };
  showDialog = (dialog, options) => {
    let handle = this.viewport.handle;
    if (!handle) return false;
    let { top, bottom } = scrollTargetForRow(handle, dialog);
    let scrollTop = handle.getScrollTop() + handle.getPendingDelta();
    let isSticky = handle.isSticky();
    let autoScroll = isSticky || resolveSetting("autoScrollEnabled", true).value;
    if (top < bottom || (!options && !autoScroll)) {
      if (scrollTop === top && !isSticky) return false;
      logForDebugging(`ScrollPin.showDialog: from scrollTop=${scrollTop} to ${top}`);
      this.releaseReveal();
      this.#a ??= options && !isSticky ? scrollTop : autoScroll ? "bottom" : null;
      this.#i = true;
      this.#l = top;
      handle.scrollTo(top);
      return true;
    }
    if (isSticky) return false;
    if (!options) {
      this.repin(true, "dialog");
      return true;
    }
    logForDebugging(`ScrollPin.showDialog: from scrollTop=${scrollTop}`);
    this.releaseReveal();
    this.#a ??= scrollTop;
    handle.scrollToBottom();
    return true;
  };
  followDialog = (rowKey) => {
    let handle = this.viewport.handle;
    if (this.#l === null || !handle || rowKey === undefined) return;
    let scrollTop = handle.getScrollTop() + handle.getPendingDelta();
    let { top } = scrollTargetForRow(handle, rowKey);
    if (scrollTop !== this.#l && scrollTop !== top) {
      this.#p();
      return;
    }
    this.#l = top;
    if (scrollTop !== top) handle.scrollTo(top);
  };
  onDialogLeft = () => {
    let restoreTarget = this.#a;
    this.#a = null;
    this.#l = null;
    if (restoreTarget === "bottom") this.repin(true, "dialogLeft");
    else if (restoreTarget !== null) this.viewport.handle?.scrollTo(restoreTarget);
  };
  #u(handle) {
    let max = Math.max(0, handle.getScrollHeight() - handle.getViewportHeight());
    if (handle.getScrollTop() + handle.getPendingDelta() >= max) return;
    if (this.#n.dividerY !== null) return;
    this.#s = this.#c ?? this.#e.transcript.getSnapshot().length;
    this.#h(handle.getScrollHeight(), this.#e.transcript.getSnapshot());
  }
  #f() {
    let dividerY = this.#n.dividerY;
    if (dividerY === null) return;
    this.#s = null;
    this.#h(dividerY, this.#e.transcript.getSnapshot());
    queueMicrotask(() => {
      if (this.#s === null) this.#h(null, this.#e.transcript.getSnapshot());
    });
  }
  #S = () => {
    if (this.#s === null) return;
    let snapshot = this.#e.transcript.getSnapshot();
    if (snapshot.length < this.#s) {
      this.#s = null;
      this.#h(null, snapshot);
      return;
    }
    if (snapshot.length !== this.#r) this.#h(this.#n.dividerY, snapshot);
  };
  #h(dividerY, messages) {
    this.#r = messages.length;
    let current = this.#n;
    let unseenDivider = computeUnseenDivider(messages, this.#s, currentToolPermissionContext());
    let unseenDivider_2 =
      unseenDivider?.firstUnseenUuid === current.unseenDivider?.firstUnseenUuid &&
      unseenDivider?.count === current.unseenDivider?.count
        ? current.unseenDivider
        : unseenDivider;
    if (dividerY === current.dividerY && unseenDivider_2 === current.unseenDivider) return;
    this.#n =
      dividerY === null && unseenDivider_2 === undefined
        ? EMPTY_DIVIDER_STATE
        : {
            dividerY,
            unseenDivider: unseenDivider_2,
          };
    this.#t.emit();
  }
}
//@ chunk-18hwfzwa.js:1467637-1467792 placement
/**
 * 计算让某行区块可见的滚动位置与底部位置。
 */
function scrollTargetForRow(handle, rowRange) {
  let viewportHeight = handle.getViewportHeight();
  let max = Math.max(0, handle.getScrollHeight() - viewportHeight);
  return {
    top:
      rowRange === undefined
        ? max
        : Math.min(max, Math.max(0, rowRange.row + rowRange.rows - viewportHeight)),
    bottom: max,
  };
}
export { ScrollPin };
