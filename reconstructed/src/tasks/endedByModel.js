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

//@ chunk-mzc7v3jq.js:191-237 placement
/**
 * 标记任务由模型结束。
 */
function withEndedByModel(task, endedByModel) {
  return {
    ...task,
    endedByModel,
  };
}
//@ chunk-mzc7v3jq.js:237-276 placement
/**
 * 读取任务是否由模型结束。
 */
function getEndedByModel(task) {
  return task?.endedByModel;
}
//@ chunk-mzc7v3jq.js:276-300 placement
/**
 * 外部构建中恒返回 false 的能力占位。
 */
function isModelEndCheckSupported() {
  return false;
}
//@ chunk-mzc7v3jq.js:300-324 placement
/**
 * 任务描述后缀（外部构建为空串）。
 */
function taskDescriptionSuffix() {
  return "";
}
//@ chunk-mzc7v3jq.js:324-379 placement
/**
 * 给任务描述附加后缀（外部构建为空）。
 */
function withTaskSuffix(description) {
  let suffix = taskDescriptionSuffix();
  return suffix === "" ? description : `${description} ${suffix}`;
}
export { withEndedByModel, getEndedByModel, isModelEndCheckSupported, withTaskSuffix, taskDescriptionSuffix };
