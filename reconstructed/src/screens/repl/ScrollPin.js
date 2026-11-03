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
import { string, u } from "../../../vendor/zod/v4/classic/schemas.js";
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
  constructor(h) {
    this.#e = h;
    this.#o = h.transcript.subscribe(this.#S);
  }
  subscribe = (h) => this.#t.subscribe(h);
  getSnapshot = () => this.#n;
  get dividerY() {
    return this.#n.dividerY;
  }
  setRenderedLength(h) {
    this.#c = h;
  }
  dispose() {
    this.#o();
  }
  isAtBottom = () => this.viewport.handle?.isSticky() ?? true;
  repin = (h = false, x = "?") => {
    if (!h && !resolveSetting("autoScrollEnabled", true).value) return;
    let handle = this.viewport.handle;
    if (handle && !handle.isSticky())
      logForDebugging(
        `repinScroll(${x}, force=${h}): yanking from scrollTop=${handle.getScrollTop()} (max=${Math.max(0, handle.getScrollHeight() - handle.getViewportHeight())})`,
      );
    this.#m();
    handle?.scrollToBottom();
    this.#f();
    this.#i = false;
  };
  onPromptEdit(h, x) {
    if (x !== "" || h === "" || this.#i) return;
    this.repin(false, "typedIntoEmpty");
  }
  onUserRowLanded(h) {
    let x = (h.promptSource === "typed" || h.promptSource === "suggestion_accepted") && isHumanTurn(h);
    if (x || !this.#i) this.repin(false, x ? "ownSubmitLanded" : "rowLanded");
  }
  onBelowTranscriptSlotChange(h) {
    let x = this.#d;
    this.#d = h;
    if (x === undefined || x === h) return;
    if (this.#a === null && (this.viewport.handle?.isSticky() ?? true))
      this.repin(false, `progressOrPanel\u2192${h}`);
  }
  onUserScroll = (h, x) => {
    this.#m();
    this.#e.awaySummary.markUserScrolled();
    this.#i = !h;
    if (h) this.#f();
    else this.#u(x);
  };
  onUserScrollWithoutDivider = (h) => {
    this.#m();
    this.#i = !h;
  };
  reveal = async (h, x) => {
    let D = this.revealRef.current;
    if (!this.viewport.handle || !D) return "unscrollable";
    let L = D.reveal(h, x);
    if (!L) return "unknown";
    this.#i = true;
    this.#p();
    return (await L) ? "revealed" : "unknown";
  };
  rowHolding = (h) => this.revealRef.current?.rowHolding(h);
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
  showDialog = (h, x) => {
    let handle = this.viewport.handle;
    if (!handle) return false;
    let { top, bottom } = scrollTargetForRow(handle, h);
    let ke = handle.getScrollTop() + handle.getPendingDelta();
    let Re = handle.isSticky();
    let Be = Re || resolveSetting("autoScrollEnabled", true).value;
    if (top < bottom || (!x && !Be)) {
      if (ke === top && !Re) return false;
      logForDebugging(`ScrollPin.showDialog: from scrollTop=${ke} to ${top}`);
      this.releaseReveal();
      this.#a ??= x && !Re ? ke : Be ? "bottom" : null;
      this.#i = true;
      this.#l = top;
      handle.scrollTo(top);
      return true;
    }
    if (Re) return false;
    if (!x) {
      this.repin(true, "dialog");
      return true;
    }
    logForDebugging(`ScrollPin.showDialog: from scrollTop=${ke}`);
    this.releaseReveal();
    this.#a ??= ke;
    handle.scrollToBottom();
    return true;
  };
  followDialog = (h) => {
    let handle = this.viewport.handle;
    if (this.#l === null || !handle || h === undefined) return;
    let D = handle.getScrollTop() + handle.getPendingDelta();
    let { top } = scrollTargetForRow(handle, h);
    if (D !== this.#l && D !== top) {
      this.#p();
      return;
    }
    this.#l = top;
    if (D !== top) handle.scrollTo(top);
  };
  onDialogLeft = () => {
    let h = this.#a;
    this.#a = null;
    this.#l = null;
    if (h === "bottom") this.repin(true, "dialogLeft");
    else if (h !== null) this.viewport.handle?.scrollTo(h);
  };
  #u(h) {
    let max = Math.max(0, h.getScrollHeight() - h.getViewportHeight());
    if (h.getScrollTop() + h.getPendingDelta() >= max) return;
    if (this.#n.dividerY !== null) return;
    this.#s = this.#c ?? this.#e.transcript.getSnapshot().length;
    this.#h(h.getScrollHeight(), this.#e.transcript.getSnapshot());
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
  #h(h, messages) {
    this.#r = messages.length;
    let D = this.#n;
    let unseenDivider = computeUnseenDivider(messages, this.#s, currentToolPermissionContext());
    let ee =
      unseenDivider?.firstUnseenUuid === D.unseenDivider?.firstUnseenUuid &&
      unseenDivider?.count === D.unseenDivider?.count
        ? D.unseenDivider
        : unseenDivider;
    if (h === D.dividerY && ee === D.unseenDivider) return;
    this.#n =
      h === null && ee === undefined
        ? EMPTY_DIVIDER_STATE
        : {
            dividerY: h,
            unseenDivider: ee,
          };
    this.#t.emit();
  }
}
//@ chunk-18hwfzwa.js:1467637-1467792 placement
/**
 * 计算让某行区块可见的滚动位置与底部位置。
 */
function scrollTargetForRow(handle, x) {
  let viewportHeight = handle.getViewportHeight();
  let max = Math.max(0, handle.getScrollHeight() - viewportHeight);
  return {
    top: x === undefined ? max : Math.min(max, Math.max(0, x.row + x.rows - viewportHeight)),
    bottom: max,
  };
}
export { ScrollPin };
