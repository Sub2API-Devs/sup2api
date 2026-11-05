/**
 * utils/scrollTelemetry.ts
 *
 * 2.1.316 新增：滚动遥测
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (9)
 * attribution: placement 9
 */

//@ chunk-5xgkngpb.js:268934-269058 placement
/**
 * 滚动遥测的初始状态（滚动、翻页、跳到底部等）。
 */
function createScrollTelemetryState() {
  return {
    scrolls: 0,
    pageJumps: 0,
    jumpToBottomClicks: 0,
    reachedScrollbackCap: false,
    scrolledUpMs: 0,
    unpinnedSince: null,
  };
}
//@ chunk-5xgkngpb.js:269058-269071 placement
var scrollTelemetryState = createScrollTelemetryState();
//@ chunk-5xgkngpb.js:269071-269102 placement
/**
 * countScroll：记录一次滚动。
 */
function countScroll(state = scrollTelemetryState) {
  state.scrolls++;
}
//@ chunk-5xgkngpb.js:269102-269135 placement
/**
 * countPageJump：记录一次翻页。
 */
function countPageJump(state = scrollTelemetryState) {
  state.pageJumps++;
}
//@ chunk-5xgkngpb.js:269135-269177 placement
/**
 * countJumpToBottom：记录一次跳到末尾。
 */
function countJumpToBottom(state = scrollTelemetryState) {
  state.jumpToBottomClicks++;
}
//@ chunk-5xgkngpb.js:269177-269222 placement
/**
 * markScrollbackCapReached：记录到达回滚上限。
 */
function markScrollbackCapReached(state = scrollTelemetryState) {
  state.reachedScrollbackCap = true;
}
//@ chunk-5xgkngpb.js:269222-269404 placement
/**
 * 记录滚动是否固定在底部（累积上滚时间）。
 */
function notePinnedState(pinned, now = Date.now(), state = scrollTelemetryState) {
  if (pinned) {
    if (state.unpinnedSince !== null) {
      state.scrolledUpMs += Math.max(0, now - state.unpinnedSince);
      state.unpinnedSince = null;
    }
  } else if (state.unpinnedSince === null) state.unpinnedSince = now;
}
//@ chunk-5xgkngpb.js:269404-269723 placement
/**
 * 取出滚动统计并重置。
 */
function takeScrollSummary(now = Date.now(), state = scrollTelemetryState) {
  let scrolledUpMs = state.scrolledUpMs;
  if (state.unpinnedSince !== null) scrolledUpMs += Math.max(0, now - state.unpinnedSince);
  let summary = {
    scrolls: state.scrolls,
    scroll_up_seconds: Math.round(scrolledUpMs / 1000),
    jump_to_bottom_clicks: state.jumpToBottomClicks,
    page_jumps: state.pageJumps,
    reached_scrollback_cap: state.reachedScrollbackCap,
  };
  Object.assign(state, createScrollTelemetryState());
  return summary;
}
//@ chunk-5xgkngpb.js:269723-269866 placement
function hasScrollActivity(state = scrollTelemetryState) {
  return (
    state.scrolls > 0 ||
    state.pageJumps > 0 ||
    state.jumpToBottomClicks > 0 ||
    state.reachedScrollbackCap ||
    state.scrolledUpMs > 0 ||
    state.unpinnedSince !== null
  );
}
export {
  countPageJump,
  countScroll,
  markScrollbackCapReached,
  hasScrollActivity,
  takeScrollSummary,
  countJumpToBottom,
  notePinnedState,
};
