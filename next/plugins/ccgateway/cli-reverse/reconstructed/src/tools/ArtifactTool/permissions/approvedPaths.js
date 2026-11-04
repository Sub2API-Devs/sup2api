/**
 * tools/ArtifactTool/permissions/approvedPaths.ts
 *
 * 2.1.316 新增：Artifact 已批准路径与路径问题说明
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-qxvqcab6.js (14)
 * attribution: placement 14
 */
import { DB_FILE_NO_IDENTITY_MESSAGE, DB_FILE_NOT_A_FILE_MESSAGE } from "../promptText.js";
import { MAX_DOCUMENT_BYTES, MAX_FIELD_VALUE_BYTES } from "../../../services/artifacts/artifactDb.js";
import { batchWrites } from "./dbWriteInputs.js";
import { jsonStringify } from "../../../utils/slowOperations.js";
import { stripSuffix } from "../../../utils/stringUtils.js";
import { isOwnPrincipal } from "../../../services/artifacts/comments/commentAuthorship.js";
import { truncatePathMiddle } from "../../../utils/format.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-qxvqcab6.js:9381-10244 placement
var APPROVED_PATH_MISMATCH_TEXT; // deferred: uses TYPE_URL_UNAVAILABLE (../promptText.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-qxvqcab6.js:9381", () => {
  APPROVED_PATH_MISMATCH_TEXT = {
    changed:
      "file_path no longer names the file that was approved (it moved, was replaced, or was rewritten) \u2014 retry the write so it is checked again",
    via_link:
      "file_path reaches its file through a symbolic link that resolves somewhere this session may not read without asking \u2014 pass the resolved path, or copy the file under the working directory first",
    hard_link:
      "file_path is one of several hard links to its file, and this approval did not examine that \u2014 copy the file to a fresh path under the working directory and pass the copy",
    read_denied:
      "reading where file_path resolves is blocked by a Read permission rule \u2014 the write was not attempted",
    no_identity: DB_FILE_NO_IDENTITY_MESSAGE,
    not_a_file: DB_FILE_NOT_A_FILE_MESSAGE,
    size: `file_path is empty or larger than ${MAX_DOCUMENT_BYTES} bytes \u2014 write_db reads at most that much JSON, and the document must serialize to ${MAX_FIELD_VALUE_BYTES} bytes or fewer`,
  };
});
//@ chunk-qxvqcab6.js:10244-10348 placement
function isReadDbAction(input) {
  return (
    typeof input === "object" &&
    input !== null &&
    input.action === "read_db" &&
    typeof input.out_dir === "string"
  );
}
//@ chunk-qxvqcab6.js:10348-10515 placement
function isWriteDbWithFile(input) {
  if (typeof input !== "object" || input === null || input.action !== "write_db") return false;
  if (typeof input.file_path === "string") return true;
  return batchWrites(input).some((write) => write.filePath !== undefined);
}
//@ chunk-qxvqcab6.js:10515-10528 placement
var APPROVED_PATH_CHECK_MS = 3000;
//@ chunk-qxvqcab6.js:10528-10605 placement
function jsonByteLength(value) {
  try {
    return Buffer.byteLength(jsonStringify(value), "utf8");
  } catch {
    return null;
  }
}
//@ chunk-qxvqcab6.js:10605-10787 placement
/**
 * 文件审批检查里的量值：data URI 阈值、内嵌内容下限与 base64 正则/行宽。
 */
var DATA_URI_LIMITS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var EMBEDDED_CONTENT_MIN_CHARS;
var DATA_URI_BASE64_REGEX;
var BASE64_LINE_REGEX;
var BASE64_PADDED_REGEX;
var BASE64_LINE_WIDTHS;
deferInit("chunk-qxvqcab6.js:10605", () => {
  DATA_URI_LIMITS = 1024;
  EMBEDDED_CONTENT_MIN_CHARS = 49152;
  DATA_URI_BASE64_REGEX =
    /data:[a-z0-9.+-]+\/[a-z0-9.+-]+(?:;[a-z0-9=.+-]+)*;base64,[A-Za-z0-9+/_-]{1000,}/gi;
  BASE64_LINE_REGEX = /^[A-Za-z0-9+/_-]+$/;
  BASE64_PADDED_REGEX = /^[A-Za-z0-9+/_-]+={0,2}$/;
  BASE64_LINE_WIDTHS = new Set([60, 64, 76]);
});
//@ chunk-qxvqcab6.js:10787-11180 placement
function looksLikeSecretLine(text) {
  let trimmed = text.trim();
  let index = trimmed.indexOf(`
`);
  let sliced = trimmed.slice(index + 1, index + 513);
  if (!/[A-Z]/.test(sliced) || !/[a-z]/.test(sliced) || !/[0-9]/.test(sliced)) return false;
  if (index === -1) return BASE64_PADDED_REGEX.test(trimmed);
  let firstLine = stripSuffix(trimmed.slice(0, index), "\r");
  if (!BASE64_LINE_REGEX.test(firstLine)) return false;
  let lines = trimmed.slice(index + 1).replaceAll(
    `\r
`,
    `
`,
  ).split(`
`);
  let lastLine = lines.pop() ?? "";
  let lineWidth = lines[0]?.length ?? firstLine.length;
  return (
    BASE64_LINE_WIDTHS.has(lineWidth) &&
    firstLine.length <= lineWidth &&
    lastLine.length <= lineWidth &&
    BASE64_PADDED_REGEX.test(lastLine) &&
    lines.every((line) => line.length === lineWidth && BASE64_LINE_REGEX.test(line))
  );
}
//@ chunk-qxvqcab6.js:11180-11277 placement
/**
 * 统计文本中大体积 data URI 的字符数（疑似密钥行则按整行计）。
 */
function largeDataUriChars(text) {
  if (looksLikeSecretLine(text)) return text.length;
  let total = 0;
  for (let match of text.matchAll(DATA_URI_BASE64_REGEX)) total += match[0].length;
  return total;
}
//@ chunk-qxvqcab6.js:11277-11515 placement
function countLargeDataUris(values) {
  let count = 0;
  let chars = 0;
  let stack = [...values];
  while (stack.length > 0) {
    let value = stack.pop();
    if (typeof value === "string") {
      let uriChars = value.length >= DATA_URI_LIMITS ? largeDataUriChars(value) : 0;
      if (uriChars > 0) {
        count++;
        chars += uriChars;
      }
    } else if (typeof value === "object" && value !== null)
      for (let child of Object.values(value)) stack.push(child);
  }
  return {
    strings: count,
    chars,
  };
}
//@ chunk-qxvqcab6.js:11515-11861 placement
function describeCommentAuthorAccess(
  account,
  role,
  selfPrincipal,
  postedByArtifact,
  accountSet,
  outsideAccounts,
) {
  let isOwn = isOwnPrincipal(account, selfPrincipal);
  let access = accountSet.get(account);
  let viewerLabel = `${access ?? "viewer"}${!isOwn && outsideAccounts.has(account) ? ", outside your organization" : ""} ${account.slice(0, 8)}`;
  let who =
    role === "assistant"
      ? isOwn
        ? "Claude (via the user)"
        : `Claude (via ${viewerLabel})`
      : role !== undefined && role !== ""
        ? `viewer ${account.slice(0, 8)} (unverified lane)`
        : isOwn
          ? access !== undefined
            ? `the user (${access})`
            : "the user"
          : viewerLabel;
  return postedByArtifact ? `${who}, posted by the artifact` : who;
}
//@ chunk-qxvqcab6.js:11861-11878 placement
/**
 * 失败说明里最多列出的原因条数。
 */
var MAX_LISTED_FAILURES = 5;
var MAX_LISTED_FAILURE_REASONS = 10;
//@ chunk-qxvqcab6.js:11878-11981 placement (2.1.88 match: formatFailureDetails, 0.777)
function formatFailureDetails(failures, includeReasons) {
  let moreText = failures.length > includeReasons ? ` and ${failures.length - includeReasons} more` : "";
  return `${failures.slice(0, includeReasons).join(", ")}${moreText}`;
}
//@ chunk-qxvqcab6.js:11981-12023 placement
/**
 * 判断路径问题是否属于越界类。
 */
var isOutsidePathProblem = (problem) => problem.outsideAsk || problem.flaggedOutside;
//@ chunk-qxvqcab6.js:12023-13435 placement
/**
 * 把文件路径问题（经符号链接到工作区外、不在可访问目录、读规则覆盖等）组成给用户的说明。
 */
function describePathProblems(problems) {
  let [problem] = problems;
  if (problems.length === 1 && problem !== undefined) {
    let reasons = [];
    if (isOutsidePathProblem(problem))
      reasons.push(
        problem.resolvesOutside
          ? "reaches, through a symbolic link, a file outside the folders this session can read"
          : "is outside the folders this session can read",
      );
    if (problem.linkNote !== "" && !isOutsidePathProblem(problem))
      reasons.push("is a hard link to a file that may also live elsewhere on this machine");
    return reasons.length === 0
      ? ""
      : ` The local file "${truncatePathMiddle(problem.askPath, 256)}" ${reasons.join(" and ")}.`;
  }
  let pathsNote = (group) =>
    ` (${formatFailureDetails(
      group.map((problem) => `"${truncatePathMiddle(problem.askPath, 256)}"`),
      MAX_LISTED_FAILURE_REASONS,
    )})`;
  let filtered = [
    {
      group: problems.filter((problem) => isOutsidePathProblem(problem) && !problem.resolvesOutside),
      one: "is outside the folders this session can read",
      many: "are outside the folders this session can read",
    },
    {
      group: problems.filter((problem) => problem.resolvesOutside),
      one: "reaches, through a symbolic link, a file outside the folders this session can read",
      many: "reach, through symbolic links, files outside the folders this session can read",
    },
    {
      group: problems.filter((problem) => problem.linkNote !== "" && !isOutsidePathProblem(problem)),
      one: "is a hard link to a file that may also live elsewhere on this machine",
      many: "are hard links to files that may also live elsewhere on this machine",
    },
  ].filter((group) => group.group.length > 0);
  let [firstGroup] = filtered;
  if (firstGroup === undefined) return "";
  if (filtered.length === 1 && firstGroup.group.length === problems.length)
    return ` ${problems.length === 2 ? "Both" : `All ${problems.length}`} local files being copied ${firstGroup.many}${pathsNote(firstGroup.group)}.`;
  let mapped = filtered.map(
    (group) =>
      `${group.group.length} ${group.group.length === 1 ? group.one : group.many}${pathsNote(group.group)}`,
  );
  return ` Of the ${problems.length} local files being copied, ${mapped.join("; ")}.`;
}
export {
  formatFailureDetails,
  MAX_LISTED_FAILURES,
  MAX_LISTED_FAILURE_REASONS,
  APPROVED_PATH_MISMATCH_TEXT,
  jsonByteLength,
  countLargeDataUris,
  EMBEDDED_CONTENT_MIN_CHARS,
  describePathProblems,
  isReadDbAction,
  isWriteDbWithFile,
  describeCommentAuthorAccess,
  APPROVED_PATH_CHECK_MS,
};
