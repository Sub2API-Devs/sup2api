/**
 * utils/toolErrors.ts
 *
 * 工具错误格式化：zod 输入校验错误、Exit code/stderr/stdout 片段
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/toolErrors.ts
 * pieces: chunk-5xgkngpb.js (5), chunk-exfmq47h.js (9)
 * attribution: placement 10, fingerprint 3, file-local 1
 */
import { DoctorLazy } from "../cli/handlers/util.js";
import { objectSchema, stringSchema, record, unknown } from "../../vendor/zod/v4/classic/schemas.js";
import { AbortError as AbortError_2, ShellError } from "./errors.js";
import { INTERRUPT_MESSAGE_FOR_TOOL_USE } from "./messages.js";
import { truncateMiddle as truncateMiddle_2 } from "../memdir/memoryTool.js";
import { MODEL_FACING_MESSAGE_KEY } from "../tools/ArtifactTool/publishEdits.js";
import { truncateWithCount, plural } from "./stringUtils.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-exfmq47h.js:51198-51239 placement
/**
 * 等待中且未结束。
 */
var isPendingNotOver = (state) => !state.isOver && state.isPending === true;
//@ chunk-exfmq47h.js:51239-51321 placement
var createPendingFlagState = () => ({
  isPending: undefined,
  hasHeld: false,
  isOver: false,
  over: Promise.withResolvers(),
});
//@ chunk-exfmq47h.js:51649-51699 placement
var doctorHintSchema; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:51649", () => {
  doctorHintSchema = DoctorLazy(() =>
    objectSchema({
      root: stringSchema(),
      primary: stringSchema().nullish(),
    }),
  );
});
//@ chunk-exfmq47h.js:51699-51732 placement
async function noToolErrorText(context) {
  return null;
}
//@ chunk-exfmq47h.js:51732-51759 placement
var doctorTextSchema; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:51732", () => {
  doctorTextSchema = DoctorLazy(() => record(stringSchema(), unknown()));
});
//@ chunk-exfmq47h.js:51759-51779 placement
var VERSIONED_MODEL_RE = /^[a-z]+-\d/;
//@ chunk-exfmq47h.js:51779-51916 placement
/**
 * 不区分大小写判断文本是否包含任一非空关键字。
 */
function includesAnyIgnoreCase(haystack, needles) {
  let lower = haystack.toLowerCase();
  for (let needle of needles)
    if (typeof needle === "string" && needle.length > 0 && lower.includes(needle.toLowerCase())) return true;
  return false;
}
//@ chunk-exfmq47h.js:51953-52024 placement
var MAX_ERROR_TEXT_CHARS = 1024;
var TRUNCATION_MARKER_RE = /\n\n\.\.\. \[(\d+) characters truncated\] \.\.\.\n\n/g;
//@ chunk-exfmq47h.js:52024-52087 fingerprint (2.1.88 match: formatError, 0.787)
function formatError(error) {
  return `

... [${error} characters truncated] ...

`;
}
//@ chunk-5xgkngpb.js:1011823-1011842 placement
var MAX_ZOD_ERROR_PARTS = 20;
var MAX_ZOD_MESSAGE_CHARS = 500;
//@ chunk-5xgkngpb.js:1011842-1012311 placement
/**
 * 把工具执行错误转成给模型的文本：中断错误用中断提示；普通错误拼接各部分输出（为空时说明无输出），按错误自带的字符上限做中间截断，并附截断说明。
 */
function formatToolErrorMessage(error) {
  if (error instanceof AbortError_2) return error.message || INTERRUPT_MESSAGE_FOR_TOOL_USE;
  if (!(error instanceof Error)) return String(error);
  let fullText =
    getErrorParts(error)
      .filter(Boolean)
      .join(
        `
`,
      )
      .trim() || "Command failed with no output";
  let maxChars =
    "maxErrorChars" in error &&
    typeof error.maxErrorChars === "number" &&
    Number.isFinite(error.maxErrorChars) &&
    error.maxErrorChars > 0
      ? error.maxErrorChars
      : undefined;
  let truncated = truncateMiddle_2(fullText, maxChars);
  let truncationNote =
    "truncationNote" in error && typeof error.truncationNote === "string" && error.truncationNote.length > 0
      ? error.truncationNote
      : undefined;
  return truncationNote !== undefined && truncated !== fullText
    ? `${truncated}

${truncationNote}`
    : truncated;
}
//@ chunk-5xgkngpb.js:1012311-1012563 fingerprint (2.1.88 match: getErrorParts, 1)
/**
 * 从工具错误中提取展示片段：Exit code、stderr、stdout。
 */
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
//@ chunk-5xgkngpb.js:1012563-1012736 file-local
function formatValidationPath(path) {
  if (path.length === 0) return "";
  return path.reduce((acc, segment, index) => {
    let segmentStr = String(segment);
    if (typeof segment === "number") return `${String(acc)}[${segmentStr}]`;
    return index === 0 ? segmentStr : `${String(acc)}.${segmentStr}`;
  }, "");
}
//@ chunk-5xgkngpb.js:1012736-1014301 fingerprint (2.1.88 match: formatZodValidationError, 0.792)
/**
 * 把工具输入的 zod 校验错误格式化为给模型看的文字（缺参数、类型不符、多余参数）。
 */
function formatZodValidationError(toolName, error) {
  let missingParams = error.issues
    .filter((err) => err.code === "invalid_type" && (err.message ?? "").includes("received undefined"))
    .map((err) => formatValidationPath(err.path));
  let unexpectedParams = error.issues
    .filter((err) => err.code === "unrecognized_keys")
    .flatMap((err) => err.keys.map((key) => formatValidationPath([...err.path, key])));
  let typeMismatchParams = error.issues
    .filter((err) => err.code === "invalid_type" && !(err.message ?? "").includes("received undefined"))
    .map((err) => {
      let typeErr = err;
      let receivedMatch = (err.message ?? "").match(/received (\w+)/);
      let received = receivedMatch ? receivedMatch[1] : "unknown";
      return {
        param: formatValidationPath(err.path),
        expected: typeErr.expected,
        received,
      };
    });
  let errorContent = error.issues
    .filter((issue) => issue.code === "custom" && issue.params?.[MODEL_FACING_MESSAGE_KEY] === true)
    .map((issue) => issue.message);
  let mapped = error.issues
    .filter(
      (issue) =>
        issue.code !== "invalid_type" &&
        issue.code !== "unrecognized_keys" &&
        !(issue.code === "custom" && issue.params?.[MODEL_FACING_MESSAGE_KEY] === true),
    )
    .map((issue) => {
      let pathText = formatValidationPath(issue.path);
      let subject = pathText === "" ? "The input" : `The parameter \`${pathText}\``;
      let detail = truncateWithCount(
        (issue.message ?? "").replace(/^Invalid input(?:: |$)/, ""),
        MAX_ZOD_MESSAGE_CHARS,
      );
      if (detail !== "") return `${subject} is invalid: ${detail}`;
      return issue.code === "invalid_union"
        ? `${subject} matches none of the accepted forms`
        : `${subject} is invalid`;
    });
  let errorParts = [];
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
      ({ param, expected, received }) =>
        `The parameter \`${param}\` type is expected as \`${expected}\` but provided as \`${received}\``,
    );
    errorParts.push(...typeErrors);
  }
  if (errorParts.length === 0 && errorContent.length === 0) return error.message;
  errorParts.push(...mapped.slice(0, MAX_ZOD_ERROR_PARTS));
  let remainingIssues = mapped.length - MAX_ZOD_ERROR_PARTS;
  if (remainingIssues > 0)
    errorParts.push(`(${remainingIssues} more ${plural(remainingIssues, "issue")} not listed)`);
  errorParts.push(...errorContent);
  return `${toolName} failed due to the following ${errorParts.length > 1 ? "issues" : "issue"}:
${errorParts.join(`
`)}`;
}
export {
  includesAnyIgnoreCase,
  formatToolErrorMessage,
  formatZodValidationError,
  getErrorParts,
  isPendingNotOver,
  MAX_ERROR_TEXT_CHARS,
  TRUNCATION_MARKER_RE,
  formatError,
  createPendingFlagState,
  VERSIONED_MODEL_RE,
};
