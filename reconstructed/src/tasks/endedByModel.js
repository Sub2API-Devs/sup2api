/**
 * tasks/endedByModel.ts
 *
 * 2.1.316 新增：给任务描述附加后缀（外部构建为空）；标记任务由模型结束等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-mzc7v3jq.js (5)
 * attribution: placement 5
 */

/**
 * 标记任务由模型结束。
 */
//@ chunk-mzc7v3jq.js:191-237 placement
function withEndedByModel(e, n) {
  return { ...e, endedByModel: n };
}
/**
 * 读取任务是否由模型结束。
 */
//@ chunk-mzc7v3jq.js:237-276 placement
function getEndedByModel(e) {
  return e?.endedByModel;
}
//@ chunk-mzc7v3jq.js:276-300 placement
function $nr() {
  return !1;
}
//@ chunk-mzc7v3jq.js:300-324 placement
function c5o() {
  return "";
}
/**
 * 给任务描述附加后缀（外部构建为空）。
 */
//@ chunk-mzc7v3jq.js:324-379 placement
function withTaskSuffix(e) {
  let n = c5o();
  return n === "" ? e : `${e} ${n}`;
}

export { withEndedByModel, getEndedByModel, $nr, withTaskSuffix, c5o };
