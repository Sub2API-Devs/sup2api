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
//@ chunk-qh6wfbga.js:202-582 placement
/**
 * 按页读取直到结束或达到最大页数，支持中止。
 */
async function readAllPages(fetchPage, onPage, options) {
  let max = Math.max(1, Math.floor(options?.maxPages ?? 1e4));
  let cursor;
  for (let i = 0; i < max; i++) {
    if (options?.budget !== undefined) {
      if (options.budget.pagesLeft < 1)
        return {
          status: "capped",
        };
      options.budget.pagesLeft--;
    }
    let page = await fetchPage(cursor);
    if (!page.ok)
      return {
        status: "error",
        error: page.error,
      };
    await onPage(page.value.items);
    if (options?.until?.())
      return {
        status: "done",
      };
    cursor = page.value.cursor;
    if (!cursor)
      return {
        status: "done",
      };
  }
  return {
    status: "capped",
  };
}
//@ chunk-qh6wfbga.js:582-631 placement
function createPageBudget(pagesLeft = 1e4) {
  return {
    pagesLeft,
    capped: 0,
  };
}
//@ chunk-qh6wfbga.js:631-772 placement = _temp11 (0.509)
/**
 * 校验错误或首次截断。
 */
function noteValidationIssue(validation, i_1) {
  if (validation.status === "error") return "error";
  if (validation.status === "capped") {
    i_1.capped++;
    return i_1.capped === 1 ? "first-truncation" : undefined;
  }
  return;
}
//@ chunk-qh6wfbga.js:772-818 placement
function cappedPagesBeyondFirst(budget) {
  return Math.max(0, budget.capped - 1);
}
export { readAllPages, DEFAULT_MAX_PAGES, createPageBudget, cappedPagesBeyondFirst, noteValidationIssue };
