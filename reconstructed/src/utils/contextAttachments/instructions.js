/**
 * utils/contextAttachments/instructions.ts
 *
 * 2.1.316 新增：指令上下文附件
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (7)
 * attribution: placement 7
 */
import { truncateToLength, countCharInString } from "../stringUtils.js";
import { FILE_READ_TOOL_NAME } from "../../tools/FileReadTool/constants.js";
import { L5e, formatInstructionFiles } from "../../plugins/functionHooks/sites/promptContextSites.js";
import { describeSessionContextReason } from "./sessionContext.js";
import { memoryAttachmentSchema } from "./memory.js";

//@ chunk-e6aww6q8.js:112007-112059 placement
var rbt = `

> Only the start of this file is shown.`;
/**
 * 截断过长的指令文件内容（尽量在行尾截断），并附上用 Read 从哪一行继续读的提示。
 */
//@ chunk-e6aww6q8.js:112059-112248 placement
function truncateInstructionsAtLine(e, n, r) {
  if (e.length <= r) return e;
  let index = e.lastIndexOf(
      `
`,
      r,
    ),
    h = truncateToLength(e, index > 0 ? index : r),
    y =
      index > 0
        ? countCharInString(
            h,
            `
`,
          ) + 2
        : 1;
  return `${h}${rbt} For the rest, call ${FILE_READ_TOOL_NAME} on ${n} with offset=${y} and a limit.`;
}
/**
 * 判断只含开头部分的指令文件条目是否是给定内容的截断副本。
 */
//@ chunk-e6aww6q8.js:112248-112351 placement
function isTruncatedCopyOf(e, n) {
  return e.startOnly === !0 && n.startsWith(e.content.slice(0, e.content.lastIndexOf(rbt)));
}
/**
 * 渲染指令文件附件：首次完整列出；变化时说明重读原因、列出改动后的文件并标注已不存在的指令文件。
 */
//@ chunk-e6aww6q8.js:112351-112850 placement
function renderInstructionsAttachment(e) {
  if (!e.changed) return L5e(e.files);
  let n = formatInstructionFiles(e.files),
    mapped = (e.removed ?? []).map((h) => `Instructions no longer present: ${h}`),
    s = e.reason
      ? `Instruction files were re-read ${describeSessionContextReason(e.reason)}; these differ from their earlier copies`
      : "These instruction files changed";
  return [
    ...(n === ""
      ? []
      : [
          `${s} \u2014 each replaces its earlier copy, and the instructions preamble above still applies:

${n}`,
        ]),
    ...(mapped.length > 0 && n === "" && e.reason
      ? [`Instruction files were re-read ${describeSessionContextReason(e.reason)}.`]
      : []),
    ...mapped,
  ].join(`

`);
}
//@ chunk-e6aww6q8.js:112850-112931 placement
function obt(e) {
  return e.type === "attachment" && e.attachment.type === "instructions";
}
/**
 * 从最后一个完整（非增量）的指令文件附件开始重放之后的增量，得到当前已公告的指令文件（路径 → 文件）。
 */
//@ chunk-e6aww6q8.js:112931-113286 placement
function latestInstructionFiles(e) {
  let lastIndex = e.findLastIndex(
    (s) => obt(s) && !s.attachment.changed && memoryAttachmentSchema().safeParse(s.attachment).success,
  );
  if (lastIndex === -1) return;
  let r = new Map();
  for (let s = lastIndex; s < e.length; s++) {
    let h = e[s];
    if (!obt(h)) continue;
    let safeParse = memoryAttachmentSchema().safeParse(h.attachment);
    if (!safeParse.success) continue;
    for (let file of safeParse.data.files) r.set(file.path, file);
    for (let S of safeParse.data.removed ?? []) r.delete(S);
  }
  return r;
}
/**
 * 对比当前指令文件与已公告的：给出内容/类型/未验证标记变化的文件和被移除的路径；之前未公告时返回全部文件；无变化返回 undefined。
 */
//@ chunk-e6aww6q8.js:113286-113636 placement
function diffInstructionFiles(e, n) {
  if (!n) return e.length === 0 ? void 0 : { files: e.slice() };
  let filtered = e.filter((y) => {
      let S = n.get(y.path);
      return !S || S.content !== y.content || S.type !== y.type || S.unverified !== y.unverified;
    }),
    s = new Set(e.map((y) => y.path)),
    filtered_2 = [...n.keys()].filter((y) => !s.has(y));
  if (filtered.length === 0 && filtered_2.length === 0) return;
  return { files: filtered, ...(filtered_2.length > 0 && { removed: filtered_2 }), changed: !0 };
}

export {
  renderInstructionsAttachment,
  isTruncatedCopyOf,
  truncateInstructionsAtLine,
  latestInstructionFiles,
  diffInstructionFiles,
};
