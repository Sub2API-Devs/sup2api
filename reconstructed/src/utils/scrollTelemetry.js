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

/**
 * 滚动遥测的初始状态（滚动、翻页、跳到底部等）。
 */
//@ chunk-e6aww6q8.js:269650-269774 placement
function createScrollTelemetryState() {
  return {
    scrolls: 0,
    pageJumps: 0,
    jumpToBottomClicks: 0,
    reachedScrollbackCap: !1,
    scrolledUpMs: 0,
    unpinnedSince: null,
  };
}
//@ chunk-e6aww6q8.js:269774-269787 placement
var Z$ = createScrollTelemetryState();
//@ chunk-e6aww6q8.js:269787-269818 placement
function oBr(e = Z$) {
  e.scrolls++;
}
//@ chunk-e6aww6q8.js:269818-269851 placement
function sBr(e = Z$) {
  e.pageJumps++;
}
//@ chunk-e6aww6q8.js:269851-269893 placement
function P$o(e = Z$) {
  e.jumpToBottomClicks++;
}
//@ chunk-e6aww6q8.js:269893-269938 placement
function m3n(e = Z$) {
  e.reachedScrollbackCap = !0;
}
/**
 * 记录滚动是否固定在底部（累积上滚时间）。
 */
//@ chunk-e6aww6q8.js:269938-270120 placement
function notePinnedState(e, n = Date.now(), r = Z$) {
  if (e) {
    if (r.unpinnedSince !== null)
      ((r.scrolledUpMs += Math.max(0, n - r.unpinnedSince)), (r.unpinnedSince = null));
  } else if (r.unpinnedSince === null) r.unpinnedSince = n;
}
/**
 * 取出滚动统计并重置。
 */
//@ chunk-e6aww6q8.js:270120-270439 placement
function takeScrollSummary(e = Date.now(), n = Z$) {
  let scrolledUpMs = n.scrolledUpMs;
  if (n.unpinnedSince !== null) scrolledUpMs += Math.max(0, e - n.unpinnedSince);
  let s = {
    scrolls: n.scrolls,
    scroll_up_seconds: Math.round(scrolledUpMs / 1000),
    jump_to_bottom_clicks: n.jumpToBottomClicks,
    page_jumps: n.pageJumps,
    reached_scrollback_cap: n.reachedScrollbackCap,
  };
  return (Object.assign(n, createScrollTelemetryState()), s);
}
//@ chunk-e6aww6q8.js:270439-270582 placement
function hasScrollActivity(e = Z$) {
  return (
    e.scrolls > 0 ||
    e.pageJumps > 0 ||
    e.jumpToBottomClicks > 0 ||
    e.reachedScrollbackCap ||
    e.scrolledUpMs > 0 ||
    e.unpinnedSince !== null
  );
}

export { sBr, oBr, m3n, P$o, notePinnedState, hasScrollActivity, takeScrollSummary };
