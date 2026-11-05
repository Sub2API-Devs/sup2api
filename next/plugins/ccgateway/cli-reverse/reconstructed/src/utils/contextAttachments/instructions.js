/**
 * utils/contextAttachments/instructions.ts
 *
 * 2.1.316 新增：指令上下文附件
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (8)
 * attribution: placement 7, layout 1
 */
import { truncateToLength, countCharInString } from "../stringUtils.js";
import { READ } from "../../tools/FileReadTool/constants.js";
import {
  formatMemoryInstruction,
  formatInstructionFiles,
} from "../../plugins/functionHooks/sites/promptContextSites.js";
import { describeSessionContextReason } from "./sessionContext.js";
import { memoryAttachmentSchema } from "./memory.js";

//@ chunk-5xgkngpb.js:115092-115144 placement
/**
 * 指令文件被截断时的提示（“只显示了开头”）。
 */
var TRUNCATED_INSTRUCTIONS_NOTE = `

> Only the start of this file is shown.`;
//@ chunk-5xgkngpb.js:115144-115439 placement
/**
 * 截断过长的指令文件内容（尽量在行尾截断），并附上用 Read 从哪一行继续读的提示。
 */
function truncateInstructionsAtLine(path, readPath, maxChars) {
  if (path.length <= maxChars) return path;
  let index = path.lastIndexOf(
    `
`,
    maxChars,
  );
  let truncated = truncateToLength(path, index > 0 ? index : maxChars);
  if (readPath === undefined)
    return `${truncated}${TRUNCATED_INSTRUCTIONS_NOTE} This session's instruction files are too long together to send whole.`;
  let note =
    index > 0
      ? countCharInString(
          truncated,
          `
`,
        ) + 2
      : 1;
  return `${truncated}${TRUNCATED_INSTRUCTIONS_NOTE} For the rest, call ${READ} on ${readPath} with offset=${note} and a limit.`;
}
//@ chunk-5xgkngpb.js:115439-115542 placement
/**
 * 判断只含开头部分的指令文件条目是否是给定内容的截断副本。
 */
function isTruncatedCopyOf(truncated, full) {
  return (
    truncated.startOnly === true &&
    full.startsWith(truncated.content.slice(0, truncated.content.lastIndexOf(TRUNCATED_INSTRUCTIONS_NOTE)))
  );
}
//@ chunk-5xgkngpb.js:115542-116041 placement
/**
 * 渲染指令文件附件：首次完整列出；变化时说明重读原因、列出改动后的文件并标注已不存在的指令文件。
 */
function renderInstructionsAttachment(attachment) {
  if (!attachment.changed) return formatMemoryInstruction(attachment.files);
  let formattedFiles = formatInstructionFiles(attachment.files);
  let mapped = (attachment.removed ?? []).map(
    (removedPath) => `Instructions no longer present: ${removedPath}`,
  );
  let reason = attachment.reason
    ? `Instruction files were re-read ${describeSessionContextReason(attachment.reason)}; these differ from their earlier copies`
    : "These instruction files changed";
  return [
    ...(formattedFiles === ""
      ? []
      : [
          `${reason} \u2014 each replaces its earlier copy, and the instructions preamble above still applies:

${formattedFiles}`,
        ]),
    ...(mapped.length > 0 && formattedFiles === "" && attachment.reason
      ? [`Instruction files were re-read ${describeSessionContextReason(attachment.reason)}.`]
      : []),
    ...mapped,
  ].join(`

`);
}
//@ chunk-5xgkngpb.js:116041-116122 placement
/**
 * 判断消息是否为指令文件附件。
 */
function isInstructionsAttachment(attachment) {
  return attachment.type === "attachment" && attachment.attachment.type === "instructions";
}
//@ chunk-5xgkngpb.js:116122-116235 layout
function lastUnchangedInstructionsIndex(messages) {
  return messages.findLastIndex(
    (message) =>
      isInstructionsAttachment(message) &&
      !message.attachment.changed &&
      memoryAttachmentSchema().safeParse(message.attachment).success,
  );
}
//@ chunk-5xgkngpb.js:116235-116507 placement
/**
 * 从最后一个完整（非增量）的指令文件附件开始重放之后的增量，得到当前已公告的指令文件（路径 → 文件）。
 */
function latestInstructionFiles(messages) {
  let startIndex = lastUnchangedInstructionsIndex(messages);
  if (startIndex === -1) return;
  let files = new Map();
  for (let index = startIndex; index < messages.length; index++) {
    let message = messages[index];
    if (!isInstructionsAttachment(message)) continue;
    let parseResult = memoryAttachmentSchema().safeParse(message.attachment);
    if (!parseResult.success) continue;
    for (let file of parseResult.data.files) files.set(file.path, file);
    for (let removedPath of parseResult.data.removed ?? []) files.delete(removedPath);
  }
  return files;
}
//@ chunk-5xgkngpb.js:116507-116857 placement
/**
 * 对比当前指令文件与已公告的：给出内容/类型/未验证标记变化的文件和被移除的路径；之前未公告时返回全部文件；无变化返回 undefined。
 */
function diffInstructionFiles(files, previous) {
  if (!previous)
    return files.length === 0
      ? undefined
      : {
          files: files.slice(),
        };
  let filtered = files.filter((file) => {
    let previousFile = previous.get(file.path);
    return (
      !previousFile ||
      previousFile.content !== file.content ||
      previousFile.type !== file.type ||
      previousFile.unverified !== file.unverified
    );
  });
  let currentPaths = new Set(files.map((file) => file.path));
  let filtered_2 = [...previous.keys()].filter((key) => !currentPaths.has(key));
  if (filtered.length === 0 && filtered_2.length === 0) return;
  return {
    files: filtered,
    ...(filtered_2.length > 0 && {
      removed: filtered_2,
    }),
    changed: true,
  };
}
export {
  renderInstructionsAttachment,
  isTruncatedCopyOf,
  truncateInstructionsAtLine,
  latestInstructionFiles,
  lastUnchangedInstructionsIndex,
  diffInstructionFiles,
};
