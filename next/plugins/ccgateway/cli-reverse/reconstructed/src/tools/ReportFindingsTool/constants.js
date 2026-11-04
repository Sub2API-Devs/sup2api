/**
 * tools/ReportFindingsTool/constants.ts
 *
 * 2.1.316 新增：ReportFindings 工具常量
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-3h9nvmn3.js (1)
 * attribution: placement 1
 */
//@ chunk-3h9nvmn3.js:610-1215 placement
/**
 * ReportFindings 工具的完整描述。
 */
var REPORTFINDINGS = "ReportFindings";
var REPORTFINDINGS_DESCRIPTION =
  "Report code-review findings as a typed list so the host UI can render them. Use this only when the active code-review instructions tell you to report findings with this tool; otherwise follow whatever output format those instructions specify. When reporting a review's results, call it once with the verified findings ranked most-severe first (empty array if nothing survived verification) and do not also print the findings as text. When re-reporting after applying fixes (only if the apply instructions ask for it), set `outcome` on each finding to what actually happened.";
export { REPORTFINDINGS, REPORTFINDINGS_DESCRIPTION };
