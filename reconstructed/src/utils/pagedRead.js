/**
 * utils/pagedRead.ts
 *
 * 2.1.316 新增：分页读取
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-qh6wfbga.js (5)
 * attribution: placement 5
 */

//@ chunk-qh6wfbga.js:191-202 placement
var DEFAULT_MAX_PAGES = 1e4;
/**
 * 按页读取直到结束或达到最大页数，支持中止。
 */
//@ chunk-qh6wfbga.js:202-582 placement
async function readAllPages(e, r, t) {
  let max = Math.max(1, Math.floor(t?.maxPages ?? 1e4)),
    u;
  for (let a = 0; a < max; a++) {
    if (t?.budget !== void 0) {
      if (t.budget.pagesLeft < 1) return { status: "capped" };
      t.budget.pagesLeft--;
    }
    let n = await e(u);
    if (!n.ok) return { status: "error", error: n.error };
    if ((await r(n.value.items), t?.until?.())) return { status: "done" };
    if (((u = n.value.cursor), !u)) return { status: "done" };
  }
  return { status: "capped" };
}
//@ chunk-qh6wfbga.js:582-631 placement
function createPageBudget(e = 1e4) {
  return { pagesLeft: e, capped: 0 };
}
/**
 * 校验错误或首次截断。
 */
//@ chunk-qh6wfbga.js:631-772 placement = _temp11 (0.509)
function noteValidationIssue(validation, i_1) {
  if (validation.status === "error") return "error";
  if (validation.status === "capped") return (i_1.capped++, i_1.capped === 1 ? "first-truncation" : void 0);
  return;
}
//@ chunk-qh6wfbga.js:772-818 placement
function cappedPagesBeyondFirst(e) {
  return Math.max(0, e.capped - 1);
}

export { readAllPages, DEFAULT_MAX_PAGES, createPageBudget, cappedPagesBeyondFirst, noteValidationIssue };
