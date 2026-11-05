/**
 * screens/repl/ScrollPin.ts
 *
 * 2.1.316 新增。REPL 控制器：滚动固定。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (2)
 * attribution: placement 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
import { logEvent } from "../../services/analytics/index.js";
import { env } from "../../utils/env.js";
import { logError } from "../../utils/log.js";
import { logFeatureSad, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { errorMessage } from "../../utils/errors.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { resolveSetting } from "../../utils/settings/userIntentSettings.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { isHumanTurn } from "../../utils/turnOrigin.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { computeUnseenDivider } from "../../components/FullscreenLayout.js";
import { currentToolPermissionContext } from "../../utils/permissions/currentPermissionContext.js";

//@ chunk-czq1j3j2.js:1505338-1508979 placement
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
  #r = null;
  #s = -1;
  #l = null;
  #i = false;
  #a = null;
  #c = null;
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
    this.#l = length;
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
    this.#u();
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
    this.#u();
    this.#e.awaySummary.markUserScrolled();
    this.#i = !delta;
    if (delta) this.#f();
    else this.#m(cause);
  };
  onUserScrollWithoutDivider = (position) => {
    this.#u();
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
  #u() {
    this.releaseReveal();
    this.#p();
  }
  #p() {
    this.#a = null;
    this.#c = null;
  }
  jumpToNew = () => {
    this.#u();
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
      this.#c = top;
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
    if (this.#c === null || !handle || rowKey === undefined) return;
    let scrollTop = handle.getScrollTop() + handle.getPendingDelta();
    let { top } = scrollTargetForRow(handle, rowKey);
    if (scrollTop !== this.#c && scrollTop !== top) {
      this.#p();
      return;
    }
    this.#c = top;
    if (scrollTop !== top) handle.scrollTo(top);
  };
  onDialogLeft = () => {
    let restoreTarget = this.#a;
    this.#a = null;
    this.#c = null;
    if (restoreTarget === "bottom") this.repin(true, "dialogLeft");
    else if (restoreTarget !== null) this.viewport.handle?.scrollTo(restoreTarget);
  };
  #m(handle) {
    let max = Math.max(0, handle.getScrollHeight() - handle.getViewportHeight());
    if (handle.getScrollTop() + handle.getPendingDelta() >= max) return;
    if (this.#n.dividerY !== null) return;
    this.#r = this.#l ?? this.#e.transcript.getSnapshot().length;
    this.#h(handle.getScrollHeight(), this.#e.transcript.getSnapshot());
  }
  #f() {
    let dividerY = this.#n.dividerY;
    if (dividerY === null) return;
    this.#r = null;
    this.#h(dividerY, this.#e.transcript.getSnapshot());
    queueMicrotask(() => {
      if (this.#r === null) this.#h(null, this.#e.transcript.getSnapshot());
    });
  }
  #S = () => {
    if (this.#r === null) return;
    let snapshot = this.#e.transcript.getSnapshot();
    if (snapshot.length < this.#r) {
      this.#r = null;
      this.#h(null, snapshot);
      return;
    }
    if (snapshot.length !== this.#s) this.#h(this.#n.dividerY, snapshot);
  };
  #h(dividerY, messages) {
    this.#s = messages.length;
    let current = this.#n;
    let unseenDivider = computeUnseenDivider(messages, this.#r, currentToolPermissionContext());
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
//@ chunk-czq1j3j2.js:1508979-1509134 placement
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
