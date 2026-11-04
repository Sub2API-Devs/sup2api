/**
 * utils/scrollTelemetry.ts
 *
 * 2.1.316 新增：滚动遥测
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (9)
 * attribution: placement 9
 */

//@ chunk-e6aww6q8.js:269650-269774 placement
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
//@ chunk-e6aww6q8.js:269774-269787 placement
var scrollTelemetryState = createScrollTelemetryState();
//@ chunk-e6aww6q8.js:269787-269818 placement
/**
 * countScroll：记录一次滚动。
 */
function countScroll(state = scrollTelemetryState) {
  state.scrolls++;
}
//@ chunk-e6aww6q8.js:269818-269851 placement
/**
 * countPageJump：记录一次翻页。
 */
function countPageJump(state = scrollTelemetryState) {
  state.pageJumps++;
}
//@ chunk-e6aww6q8.js:269851-269893 placement
/**
 * countJumpToBottom：记录一次跳到末尾。
 */
function countJumpToBottom(state = scrollTelemetryState) {
  state.jumpToBottomClicks++;
}
//@ chunk-e6aww6q8.js:269893-269938 placement
/**
 * markScrollbackCapReached：记录到达回滚上限。
 */
function markScrollbackCapReached(state = scrollTelemetryState) {
  state.reachedScrollbackCap = true;
}
//@ chunk-e6aww6q8.js:269938-270120 placement
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
//@ chunk-e6aww6q8.js:270120-270439 placement
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
//@ chunk-e6aww6q8.js:270439-270582 placement
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
  countJumpToBottom,
  notePinnedState,
  hasScrollActivity,
  takeScrollSummary,
};
