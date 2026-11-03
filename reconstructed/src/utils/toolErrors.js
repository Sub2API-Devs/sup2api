/**
 * utils/toolErrors.ts
 *
 * 工具错误格式化：zod 输入校验错误、Exit code/stderr/stdout 片段
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/toolErrors.ts
 * pieces: chunk-aepeg2w5.js (9), chunk-e6aww6q8.js (5)
 * attribution: placement 10, fingerprint 3, file-local 1
 */
import { DoctorLazy } from "../cli/handlers/util.js";
import { u, o, pe, oe } from "../../vendor/zod/v4/classic/schemas.js";
import { AbortError as AbortError_2, ShellError } from "./errors.js";
import { INTERRUPT_MESSAGE_FOR_TOOL_USE } from "./messages.js";
import { truncateMiddle as truncateMiddle_2 } from "../memdir/memoryTool.js";
import { MODEL_FACING_MESSAGE_KEY } from "../tools/ArtifactTool/publishEdits.js";
import { truncateWithCount, plural } from "./stringUtils.js";

/**
 * 等待中且未结束。
 */
//@ chunk-aepeg2w5.js:50738-50779 placement
var isPendingNotOver = (e) => !e.isOver && e.isPending === !0;
//@ chunk-aepeg2w5.js:50779-50861 placement
var LM = () => ({ isPending: void 0, hasHeld: !1, isOver: !1, over: Promise.withResolvers() });
//@ chunk-aepeg2w5.js:51173-51223 placement
var Yq = DoctorLazy(() => u({ root: o(), primary: o().nullish() }));
//@ chunk-aepeg2w5.js:51223-51256 placement
async function eh(e) {
  return null;
}
//@ chunk-aepeg2w5.js:51256-51283 placement
var qq = DoctorLazy(() => pe(o(), oe()));
//@ chunk-aepeg2w5.js:51283-51303 placement
var Qs = /^[a-z]+-\d/;
/**
 * 不区分大小写判断文本是否包含任一非空关键字。
 */
//@ chunk-aepeg2w5.js:51303-51440 placement
function includesAnyIgnoreCase(e, n) {
  let lower = e.toLowerCase();
  for (let s of n) if (typeof s === "string" && s.length > 0 && lower.includes(s.toLowerCase())) return !0;
  return !1;
}
//@ chunk-aepeg2w5.js:51477-51548 placement
var UM = 1024,
  HM = /\n\n\.\.\. \[(\d+) characters truncated\] \.\.\.\n\n/g;
//@ chunk-aepeg2w5.js:51548-51611 fingerprint = formatError (0.792)
function formatError(error) {
  return `

... [${error} characters truncated] ...

`;
}
//@ chunk-e6aww6q8.js:998058-998077 placement
var qzt = 20,
  APo = 500;
/**
 * 把工具执行错误转成给模型的文本：中断错误用中断提示；普通错误拼接各部分输出（为空时说明无输出），按错误自带的字符上限做中间截断，并附截断说明。
 */
//@ chunk-e6aww6q8.js:998077-998547 placement
function formatToolErrorMessage(e) {
  if (e instanceof AbortError_2) return e.message || INTERRUPT_MESSAGE_FOR_TOOL_USE;
  if (!(e instanceof Error)) return String(e);
  let fullText =
      getErrorParts(e)
        .filter(Boolean)
        .join(
          `
`,
        )
        .trim() || "Command failed with no output",
    maxChars =
      "maxErrorChars" in e &&
      typeof e.maxErrorChars === "number" &&
      Number.isFinite(e.maxErrorChars) &&
      e.maxErrorChars > 0
        ? e.maxErrorChars
        : void 0,
    truncated = truncateMiddle_2(fullText, maxChars),
    truncationNote =
      "truncationNote" in e && typeof e.truncationNote === "string" && e.truncationNote.length > 0
        ? e.truncationNote
        : void 0;
  return truncationNote !== void 0 && truncated !== fullText
    ? `${truncated}

${truncationNote}`
    : truncated;
}
/**
 * 从工具错误中提取展示片段：Exit code、stderr、stdout。
 */
//@ chunk-e6aww6q8.js:998547-998799 fingerprint = getErrorParts (1)
function getErrorParts(error) {
  if (error instanceof ShellError)
    return [
      `Exit code ${error.code}`,
      error.interrupted ? INTERRUPT_MESSAGE_FOR_TOOL_USE : "",
      error.stderr,
      error.stdout,
    ];
  let parts = [error.message];
  if ("stderr" in error && typeof error.stderr === "string") parts.push(error.stderr);
  if ("stdout" in error && typeof error.stdout === "string") parts.push(error.stdout);
  return parts;
}
//@ chunk-e6aww6q8.js:998799-998972 file-local
function formatValidationPath(path) {
  if (path.length === 0) return "";
  return path.reduce((acc, segment, index) => {
    let segmentStr = String(segment);
    if (typeof segment === "number") return `${String(acc)}[${segmentStr}]`;
    return index === 0 ? segmentStr : `${String(acc)}.${segmentStr}`;
  }, "");
}
/**
 * 把工具输入的 zod 校验错误格式化为给模型看的文字（缺参数、类型不符、多余参数）。
 */
//@ chunk-e6aww6q8.js:998972-1000528 fingerprint = formatZodValidationError (0.792)
function formatZodValidationError(toolName, error) {
  let missingParams = error.issues
      .filter((err) => err.code === "invalid_type" && (err.message ?? "").includes("received undefined"))
      .map((err) => formatValidationPath(err.path)),
    unexpectedParams = error.issues
      .filter((err) => err.code === "unrecognized_keys")
      .flatMap((err) => err.keys.map((key) => formatValidationPath([...err.path, key]))),
    typeMismatchParams = error.issues
      .filter((err) => err.code === "invalid_type" && !(err.message ?? "").includes("received undefined"))
      .map((err) => {
        let typeErr = err,
          receivedMatch = (err.message ?? "").match(/received (\w+)/),
          Se = receivedMatch ? receivedMatch[1] : "unknown";
        return { param: formatValidationPath(err.path), expected: typeErr.expected, received: Se };
      }),
    mapped = error.issues
      .filter((issue) => issue.code === "custom" && issue.params?.[MODEL_FACING_MESSAGE_KEY] === !0)
      .map((G) => G.message),
    mapped_2 = error.issues
      .filter(
        (issue) =>
          issue.code !== "invalid_type" &&
          issue.code !== "unrecognized_keys" &&
          !(issue.code === "custom" && issue.params?.[MODEL_FACING_MESSAGE_KEY] === !0),
      )
      .map((G) => {
        let q = formatValidationPath(G.path),
          Z = q === "" ? "The input" : `The parameter \`${q}\``,
          Se = truncateWithCount((G.message ?? "").replace(/^Invalid input(?:: |$)/, ""), APo);
        if (Se !== "") return `${Z} is invalid: ${Se}`;
        return G.code === "invalid_union" ? `${Z} matches none of the accepted forms` : `${Z} is invalid`;
      }),
    errorParts = [];
  if (missingParams.length > 0) {
    let missingParamErrors = missingParams.map((param) => `The required parameter \`${param}\` is missing`);
    errorParts.push(...missingParamErrors);
  }
  if (unexpectedParams.length > 0) {
    let unexpectedParamErrors = unexpectedParams.map(
      (param) => `An unexpected parameter \`${param}\` was provided`,
    );
    errorParts.push(...unexpectedParamErrors);
  }
  if (typeMismatchParams.length > 0) {
    let typeErrors = typeMismatchParams.map(
      ({ param: param, expected: expected, received: received }) =>
        `The parameter \`${param}\` type is expected as \`${expected}\` but provided as \`${received}\``,
    );
    errorParts.push(...typeErrors);
  }
  if (errorParts.length === 0 && mapped.length === 0) return error.message;
  errorParts.push(...mapped_2.slice(0, qzt));
  let L = mapped_2.length - qzt;
  if (L > 0) errorParts.push(`(${L} more ${plural(L, "issue")} not listed)`);
  return (
    errorParts.push(...mapped),
    `${toolName} failed due to the following ${errorParts.length > 1 ? "issues" : "issue"}:
${errorParts.join(`
`)}`
  );
}

export {
  includesAnyIgnoreCase,
  isPendingNotOver,
  getErrorParts,
  UM,
  HM,
  formatError,
  Qs,
  LM,
  formatToolErrorMessage,
  formatZodValidationError,
};
