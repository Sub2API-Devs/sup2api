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
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { logForDebugging } from "../../utils/debug.js";
import { createSignal } from "../../utils/signal.js";
import { o, u } from "../../../vendor/zod/v4/classic/schemas.js";
import { Text, Box } from "../../ink/components/Text.js";
import { hkt } from "./MessageArea.js";
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
import { tE } from "../../utils/permissions/currentPermissionContext.js";

/**
 * 滚动钉住：管理视口自动滚动、未读分隔线、“输入后钉回底部”的各种触发（typed/suggestion_accepted/ownSubmitLanded）。
 */
//@ chunk-18hwfzwa.js:1463996-1467637 placement
class ScrollPin {
  viewport = new ReplayHandleSlot();
  modalViewport = new ReplayHandleSlot();
  revealRef = { current: null };
  #e;
  #t = createSignal();
  #o;
  #n = hkt;
  #s = null;
  #r = -1;
  #c = null;
  #i = !1;
  #a = null;
  #l = null;
  #d = void 0;
  constructor(h) {
    ((this.#e = h), (this.#o = h.transcript.subscribe(this.#S)));
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
  isAtBottom = () => this.viewport.handle?.isSticky() ?? !0;
  repin = (h = !1, x = "?") => {
    if (!h && !resolveSetting("autoScrollEnabled", !0).value) return;
    let handle = this.viewport.handle;
    if (handle && !handle.isSticky())
      logForDebugging(
        `repinScroll(${x}, force=${h}): yanking from scrollTop=${handle.getScrollTop()} (max=${Math.max(0, handle.getScrollHeight() - handle.getViewportHeight())})`,
      );
    (this.#m(), handle?.scrollToBottom(), this.#f(), (this.#i = !1));
  };
  onPromptEdit(h, x) {
    if (x !== "" || h === "" || this.#i) return;
    this.repin(!1, "typedIntoEmpty");
  }
  onUserRowLanded(h) {
    let x = (h.promptSource === "typed" || h.promptSource === "suggestion_accepted") && isHumanTurn(h);
    if (x || !this.#i) this.repin(!1, x ? "ownSubmitLanded" : "rowLanded");
  }
  onBelowTranscriptSlotChange(h) {
    let x = this.#d;
    if (((this.#d = h), x === void 0 || x === h)) return;
    if (this.#a === null && (this.viewport.handle?.isSticky() ?? !0))
      this.repin(!1, `progressOrPanel\u2192${h}`);
  }
  onUserScroll = (h, x) => {
    if ((this.#m(), this.#e.awaySummary.markUserScrolled(), (this.#i = !h), h)) this.#f();
    else this.#u(x);
  };
  onUserScrollWithoutDivider = (h) => {
    (this.#m(), (this.#i = !h));
  };
  reveal = async (h, x) => {
    let D = this.revealRef.current;
    if (!this.viewport.handle || !D) return "unscrollable";
    let reveal = D.reveal(h, x);
    if (!reveal) return "unknown";
    return ((this.#i = !0), this.#p(), (await reveal) ? "revealed" : "unknown");
  };
  rowHolding = (h) => this.revealRef.current?.rowHolding(h);
  releaseReveal = () => {
    this.revealRef.current?.release();
  };
  #m() {
    (this.releaseReveal(), this.#p());
  }
  #p() {
    ((this.#a = null), (this.#l = null));
  }
  jumpToNew = () => {
    (this.#m(), this.viewport.handle?.scrollToBottom(), (this.#i = !1));
  };
  showDialog = (h, x) => {
    let handle = this.viewport.handle;
    if (!handle) return !1;
    let { top: top, bottom: bottom } = scrollTargetForRow(handle, h),
      ke = handle.getScrollTop() + handle.getPendingDelta(),
      isSticky = handle.isSticky(),
      Be = isSticky || resolveSetting("autoScrollEnabled", !0).value;
    if (top < bottom || (!x && !Be)) {
      if (ke === top && !isSticky) return !1;
      return (
        logForDebugging(`ScrollPin.showDialog: from scrollTop=${ke} to ${top}`),
        this.releaseReveal(),
        (this.#a ??= x && !isSticky ? ke : Be ? "bottom" : null),
        (this.#i = !0),
        (this.#l = top),
        handle.scrollTo(top),
        !0
      );
    }
    if (isSticky) return !1;
    if (!x) return (this.repin(!0, "dialog"), !0);
    return (
      logForDebugging(`ScrollPin.showDialog: from scrollTop=${ke}`),
      this.releaseReveal(),
      (this.#a ??= ke),
      handle.scrollToBottom(),
      !0
    );
  };
  followDialog = (h) => {
    let handle = this.viewport.handle;
    if (this.#l === null || !handle || h === void 0) return;
    let D = handle.getScrollTop() + handle.getPendingDelta(),
      { top: top } = scrollTargetForRow(handle, h);
    if (D !== this.#l && D !== top) {
      this.#p();
      return;
    }
    if (((this.#l = top), D !== top)) handle.scrollTo(top);
  };
  onDialogLeft = () => {
    let h = this.#a;
    if (((this.#a = null), (this.#l = null), h === "bottom")) this.repin(!0, "dialogLeft");
    else if (h !== null) this.viewport.handle?.scrollTo(h);
  };
  #u(h) {
    let max = Math.max(0, h.getScrollHeight() - h.getViewportHeight());
    if (h.getScrollTop() + h.getPendingDelta() >= max) return;
    if (this.#n.dividerY !== null) return;
    ((this.#s = this.#c ?? this.#e.transcript.getSnapshot().length),
      this.#h(h.getScrollHeight(), this.#e.transcript.getSnapshot()));
  }
  #f() {
    let dividerY = this.#n.dividerY;
    if (dividerY === null) return;
    ((this.#s = null),
      this.#h(dividerY, this.#e.transcript.getSnapshot()),
      queueMicrotask(() => {
        if (this.#s === null) this.#h(null, this.#e.transcript.getSnapshot());
      }));
  }
  #S = () => {
    if (this.#s === null) return;
    let snapshot = this.#e.transcript.getSnapshot();
    if (snapshot.length < this.#s) {
      ((this.#s = null), this.#h(null, snapshot));
      return;
    }
    if (snapshot.length !== this.#r) this.#h(this.#n.dividerY, snapshot);
  };
  #h(h, x) {
    this.#r = x.length;
    let D = this.#n,
      L = computeUnseenDivider(x, this.#s, tE()),
      ee =
        L?.firstUnseenUuid === D.unseenDivider?.firstUnseenUuid && L?.count === D.unseenDivider?.count
          ? D.unseenDivider
          : L;
    if (h === D.dividerY && ee === D.unseenDivider) return;
    ((this.#n = h === null && ee === void 0 ? hkt : { dividerY: h, unseenDivider: ee }), this.#t.emit());
  }
}
/**
 * 计算让某行区块可见的滚动位置与底部位置。
 */
//@ chunk-18hwfzwa.js:1467637-1467792 placement
function scrollTargetForRow(h, x) {
  let viewportHeight = h.getViewportHeight(),
    max = Math.max(0, h.getScrollHeight() - viewportHeight);
  return {
    top: x === void 0 ? max : Math.min(max, Math.max(0, x.row + x.rows - viewportHeight)),
    bottom: max,
  };
}

export { ScrollPin };
