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
function countScroll(e = scrollTelemetryState) {
  e.scrolls++;
}
//@ chunk-e6aww6q8.js:269818-269851 placement
/**
 * countPageJump：记录一次翻页。
 */
function countPageJump(e = scrollTelemetryState) {
  e.pageJumps++;
}
//@ chunk-e6aww6q8.js:269851-269893 placement
/**
 * countJumpToBottom：记录一次跳到末尾。
 */
function countJumpToBottom(e = scrollTelemetryState) {
  e.jumpToBottomClicks++;
}
//@ chunk-e6aww6q8.js:269893-269938 placement
/**
 * markScrollbackCapReached：记录到达回滚上限。
 */
function markScrollbackCapReached(e = scrollTelemetryState) {
  e.reachedScrollbackCap = true;
}
//@ chunk-e6aww6q8.js:269938-270120 placement
/**
 * 记录滚动是否固定在底部（累积上滚时间）。
 */
function notePinnedState(e, n = Date.now(), r = scrollTelemetryState) {
  if (e) {
    if (r.unpinnedSince !== null) {
      r.scrolledUpMs += Math.max(0, n - r.unpinnedSince);
      r.unpinnedSince = null;
    }
  } else if (r.unpinnedSince === null) r.unpinnedSince = n;
}
//@ chunk-e6aww6q8.js:270120-270439 placement
/**
 * 取出滚动统计并重置。
 */
function takeScrollSummary(e = Date.now(), n = scrollTelemetryState) {
  let scrolledUpMs = n.scrolledUpMs;
  if (n.unpinnedSince !== null) scrolledUpMs += Math.max(0, e - n.unpinnedSince);
  let s = {
    scrolls: n.scrolls,
    scroll_up_seconds: Math.round(scrolledUpMs / 1000),
    jump_to_bottom_clicks: n.jumpToBottomClicks,
    page_jumps: n.pageJumps,
    reached_scrollback_cap: n.reachedScrollbackCap,
  };
  Object.assign(n, createScrollTelemetryState());
  return s;
}
//@ chunk-e6aww6q8.js:270439-270582 placement
function hasScrollActivity(e = scrollTelemetryState) {
  return (
    e.scrolls > 0 ||
    e.pageJumps > 0 ||
    e.jumpToBottomClicks > 0 ||
    e.reachedScrollbackCap ||
    e.scrolledUpMs > 0 ||
    e.unpinnedSince !== null
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
