/**
 * services/projects/projectReadRecords.ts
 *
 * 2.1.316 新增：Projects 文档读取（project_read）的工具输入/结果记录
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-d20js5hq.js (6)
 * attribution: placement 3, layout 3
 */
import { truncateCodePoints } from "../../utils/stringUtils.js";
import { SHA256_HEX_RE } from "../../utils/commitAttribution.js";
import { jsonStringify } from "../../utils/slowOperations.js";

//@ chunk-d20js5hq.js:298-394 placement
/**
 * 构造项目读取的输入记录。
 */
function projectReadInput(path, version, contentFields, extraFields) {
  return {
    method: "project_read",
    path,
    ...(version !== undefined && {
      version,
    }),
    ...contentFields,
    ...extraFields,
  };
}
//@ chunk-d20js5hq.js:394-447 placement
/**
 * 按项目与路径构造读取输入。
 */
function projectReadInputFor(path) {
  return {
    method: "project_read",
    path,
  };
}
//@ chunk-d20js5hq.js:447-512 layout
var TENGU_GLITTERY_CRAYON = "tengu_glittery_crayon";
var MAX_TITLE_CHARS = 500;
var PROJECT_DOC_CONTEXT_TEXT = "A doc of this project.";
//@ chunk-d20js5hq.js:512-730 layout
function projectReadToBlock(read) {
  let titleText = truncateCodePoints(read.path, MAX_TITLE_CHARS);
  return {
    type: "document",
    source: {
      type: "text",
      media_type: "text/plain",
      data: read.content,
    },
    ...(titleText !== "" && {
      title: titleText,
    }),
    context:
      read.version !== undefined && SHA256_HEX_RE.test(read.version)
        ? `${PROJECT_DOC_CONTEXT_TEXT} version: ${read.version}`
        : PROJECT_DOC_CONTEXT_TEXT,
  };
}
//@ chunk-d20js5hq.js:730-915 layout (2.1.88 match: countUserPromptsInMessages, 0.801)
function countUserPromptsInMessages(messages) {
  return (
    messages.type === "document" &&
    typeof messages.source === "object" &&
    messages.source !== null &&
    "type" in messages.source &&
    messages.source.type === "text" &&
    typeof messages.context === "string" &&
    messages.context.startsWith(PROJECT_DOC_CONTEXT_TEXT)
  );
}
//@ chunk-d20js5hq.js:915-982 placement
/**
 * 构造项目读取结果记录。
 */
function projectReadRecord({ docId, read }) {
  return {
    input: jsonStringify(projectReadInputFor(docId)),
    result: jsonStringify(read),
  };
}
export {
  countUserPromptsInMessages,
  TENGU_GLITTERY_CRAYON,
  projectReadToBlock,
  projectReadRecord,
  projectReadInput,
  projectReadInputFor,
};
