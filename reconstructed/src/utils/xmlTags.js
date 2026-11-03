/**
 * utils/xmlTags.ts
 *
 * 2.1.316 新增：XML 标签
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-gppkhxdv.js (3)
 * attribution: placement 3
 */
import {
  TASK_NOTIFICATION,
  TASK_ID,
  TOOL_USE_ID,
  TASK_TYPE,
  OUTPUT_FILE,
  STATUS,
  SUMMARY,
} from "../constants/xml.js";

//@ chunk-gppkhxdv.js:246-261 placement
var NEXT = "next";
//@ chunk-gppkhxdv.js:450-579 placement
var regExp = new RegExp(
  `^<${TASK_NOTIFICATION}>\\n<${TASK_ID}>([^<]+)</${TASK_ID}>` +
    [TOOL_USE_ID, TASK_TYPE, OUTPUT_FILE].map((e) => `(?:\\n<${e}>[^<]*</${e}>)?`).join("") +
    `\\n<${STATUS}>`,
);
/**
 * 生成 <task-notification> XML：依次写入任务 id、工具调用 id、任务类型、输出文件、状态与摘要标签，附正文；尾随文本中的闭合标签前缀会被转义。
 */
//@ chunk-gppkhxdv.js:579-894 placement
function formatTaskNotification({
  taskId: taskId,
  toolUseId: toolUseId,
  taskType: taskType,
  outputFile: outputFile,
  status: status,
  summary: summary,
  body: body,
  trailing: trailing,
}) {
  let d = [
      [TASK_ID, taskId],
      [TOOL_USE_ID, toolUseId],
      [TASK_TYPE, taskType],
      [OUTPUT_FILE, outputFile],
      [STATUS, status],
      [SUMMARY, summary],
    ],
    o = `<${TASK_NOTIFICATION}>`;
  for (let [a, T] of d)
    if (T)
      o += `
<${a}>${T}</${a}>`;
  let replaced = (trailing ?? "").replaceAll(
    new RegExp(`<(?=\\s*/\\s*${TASK_NOTIFICATION}\\b)`, "gi"),
    "&lt;",
  );
  return `${o}${body ?? ""}
</${TASK_NOTIFICATION}>${replaced}`;
}

export { formatTaskNotification, regExp, NEXT };
