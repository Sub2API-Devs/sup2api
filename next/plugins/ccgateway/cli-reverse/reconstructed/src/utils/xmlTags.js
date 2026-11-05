/**
 * utils/xmlTags.ts
 *
 * 2.1.316 新增：XML 标签
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-ab36sake.js (3)
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
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-ab36sake.js:246-261 placement (2.1.88 match: peek, 0.809)
var peek = "next";
//@ chunk-ab36sake.js:450-579 placement
var regExp; // deferred: uses COMMAND_NAME (../constants/xml.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ab36sake.js:450", () => {
  regExp = new RegExp(
    `^<${TASK_NOTIFICATION}>\\n<${TASK_ID}>([^<]+)</${TASK_ID}>` +
      [TOOL_USE_ID, TASK_TYPE, OUTPUT_FILE].map((tag) => `(?:\\n<${tag}>[^<]*</${tag}>)?`).join("") +
      `\\n<${STATUS}>`,
  );
});
//@ chunk-ab36sake.js:579-894 placement
/**
 * 生成 <task-notification> XML：依次写入任务 id、工具调用 id、任务类型、输出文件、状态与摘要标签，附正文；尾随文本中的闭合标签前缀会被转义。
 */
function formatTaskNotification({
  taskId,
  toolUseId,
  taskType,
  outputFile,
  status,
  summary,
  body,
  trailing,
}) {
  let fields = [
    [TASK_ID, taskId],
    [TOOL_USE_ID, toolUseId],
    [TASK_TYPE, taskType],
    [OUTPUT_FILE, outputFile],
    [STATUS, status],
    [SUMMARY, summary],
  ];
  let xml = `<${TASK_NOTIFICATION}>`;
  for (let [tag, value] of fields)
    if (value)
      xml += `
<${tag}>${value}</${tag}>`;
  let replaced = (trailing ?? "").replaceAll(
    new RegExp(`<(?=\\s*/\\s*${TASK_NOTIFICATION}\\b)`, "gi"),
    "&lt;",
  );
  return `${xml}${body ?? ""}
</${TASK_NOTIFICATION}>${replaced}`;
}
export { formatTaskNotification, peek, regExp };
