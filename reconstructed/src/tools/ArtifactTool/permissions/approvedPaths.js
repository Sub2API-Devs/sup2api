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

//@ chunk-qxvqcab6.js:9381-10244 placement
var APPROVED_PATH_MISMATCH_TEXT = {
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
//@ chunk-qxvqcab6.js:10244-10348 placement
function isReadDbAction(e) {
  return typeof e === "object" && e !== null && e.action === "read_db" && typeof e.out_dir === "string";
}
//@ chunk-qxvqcab6.js:10348-10515 placement
function isWriteDbWithFile(e) {
  if (typeof e !== "object" || e === null || e.action !== "write_db") return false;
  if (typeof e.file_path === "string") return true;
  return batchWrites(e).some((n) => n.filePath !== undefined);
}
//@ chunk-qxvqcab6.js:10515-10528 placement
var APPROVED_PATH_CHECK_MS = 3000;
//@ chunk-qxvqcab6.js:10528-10605 placement
function jsonByteLength(e) {
  try {
    return Buffer.byteLength(jsonStringify(e), "utf8");
  } catch {
    return null;
  }
}
//@ chunk-qxvqcab6.js:10605-10787 placement
/**
 * 文件审批检查里的量值：data URI 阈值、内嵌内容下限与 base64 正则/行宽。
 */
var DATA_URI_LIMITS = 1024;
var EMBEDDED_CONTENT_MIN_CHARS = 49152;
var DATA_URI_BASE64_REGEX =
  /data:[a-z0-9.+-]+\/[a-z0-9.+-]+(?:;[a-z0-9=.+-]+)*;base64,[A-Za-z0-9+/_-]{1000,}/gi;
var BASE64_LINE_REGEX = /^[A-Za-z0-9+/_-]+$/;
var BASE64_PADDED_REGEX = /^[A-Za-z0-9+/_-]+={0,2}$/;
var BASE64_LINE_WIDTHS = new Set([60, 64, 76]);
//@ chunk-qxvqcab6.js:10787-11180 placement
function looksLikeSecretLine(e) {
  let trimmed = e.trim();
  let index = trimmed.indexOf(`
`);
  let sliced = trimmed.slice(index + 1, index + 513);
  if (!/[A-Z]/.test(sliced) || !/[a-z]/.test(sliced) || !/[0-9]/.test(sliced)) return false;
  if (index === -1) return BASE64_PADDED_REGEX.test(trimmed);
  let s = stripSuffix(trimmed.slice(0, index), "\r");
  if (!BASE64_LINE_REGEX.test(s)) return false;
  let lines = trimmed.slice(index + 1).replaceAll(
    `\r
`,
    `
`,
  ).split(`
`);
  let a = lines.pop() ?? "";
  let l = lines[0]?.length ?? s.length;
  return (
    BASE64_LINE_WIDTHS.has(l) &&
    s.length <= l &&
    a.length <= l &&
    BASE64_PADDED_REGEX.test(a) &&
    lines.every((line) => line.length === l && BASE64_LINE_REGEX.test(line))
  );
}
//@ chunk-qxvqcab6.js:11180-11277 placement
/**
 * 统计文本中大体积 data URI 的字符数（疑似密钥行则按整行计）。
 */
function largeDataUriChars(e) {
  if (looksLikeSecretLine(e)) return e.length;
  let n = 0;
  for (let r of e.matchAll(DATA_URI_BASE64_REGEX)) n += r[0].length;
  return n;
}
//@ chunk-qxvqcab6.js:11277-11515 placement
function countLargeDataUris(e) {
  let n = 0;
  let chars = 0;
  let o = [...e];
  while (o.length > 0) {
    let s = o.pop();
    if (typeof s === "string") {
      let u = s.length >= DATA_URI_LIMITS ? largeDataUriChars(s) : 0;
      if (u > 0) {
        n++;
        chars += u;
      }
    } else if (typeof s === "object" && s !== null) for (let u of Object.values(s)) o.push(u);
  }
  return {
    strings: n,
    chars,
  };
}
//@ chunk-qxvqcab6.js:11515-11861 placement
function describeCommentAuthorAccess(account, role, r, o, s, u) {
  let a = isOwnPrincipal(account, r);
  let l = s.get(account);
  let d = `${l ?? "viewer"}${!a && u.has(account) ? ", outside your organization" : ""} ${account.slice(0, 8)}`;
  let f =
    role === "assistant"
      ? a
        ? "Claude (via the user)"
        : `Claude (via ${d})`
      : role !== undefined && role !== ""
        ? `viewer ${account.slice(0, 8)} (unverified lane)`
        : a
          ? l !== undefined
            ? `the user (${l})`
            : "the user"
          : d;
  return o ? `${f}, posted by the artifact` : f;
}
//@ chunk-qxvqcab6.js:11861-11878 placement
/**
 * 失败说明里最多列出的原因条数。
 */
var MAX_LISTED_FAILURES = 5;
var MAX_LISTED_FAILURE_REASONS = 10;
//@ chunk-qxvqcab6.js:11878-11981 placement = formatFailureDetails (0.777)
function formatFailureDetails(failures, includeReasons) {
  let moreText = failures.length > includeReasons ? ` and ${failures.length - includeReasons} more` : "";
  return `${failures.slice(0, includeReasons).join(", ")}${moreText}`;
}
//@ chunk-qxvqcab6.js:11981-12023 placement
/**
 * 判断路径问题是否属于越界类。
 */
var isOutsidePathProblem = (e) => e.outsideAsk || e.flaggedOutside;
//@ chunk-qxvqcab6.js:12023-13435 placement
/**
 * 把文件路径问题（经符号链接到工作区外、不在可访问目录、读规则覆盖等）组成给用户的说明。
 */
function describePathProblems(e) {
  let [n] = e;
  if (e.length === 1 && n !== undefined) {
    let a = [];
    if (isOutsidePathProblem(n))
      a.push(
        n.resolvesOutside
          ? "reaches, through a symbolic link, a file outside the folders this session can read"
          : "is outside the folders this session can read",
      );
    if (n.linkNote !== "" && !isOutsidePathProblem(n))
      a.push("is a hard link to a file that may also live elsewhere on this machine");
    return a.length === 0
      ? ""
      : ` The local file "${truncatePathMiddle(n.askPath, 256)}" ${a.join(" and ")}.`;
  }
  let r = (group) =>
    ` (${formatFailureDetails(
      group.map((l) => `"${truncatePathMiddle(l.askPath, 256)}"`),
      MAX_LISTED_FAILURE_REASONS,
    )})`;
  let filtered = [
    {
      group: e.filter((a) => isOutsidePathProblem(a) && !a.resolvesOutside),
      one: "is outside the folders this session can read",
      many: "are outside the folders this session can read",
    },
    {
      group: e.filter((a) => a.resolvesOutside),
      one: "reaches, through a symbolic link, a file outside the folders this session can read",
      many: "reach, through symbolic links, files outside the folders this session can read",
    },
    {
      group: e.filter((a) => a.linkNote !== "" && !isOutsidePathProblem(a)),
      one: "is a hard link to a file that may also live elsewhere on this machine",
      many: "are hard links to files that may also live elsewhere on this machine",
    },
  ].filter((a) => a.group.length > 0);
  let [s] = filtered;
  if (s === undefined) return "";
  if (filtered.length === 1 && s.group.length === e.length)
    return ` ${e.length === 2 ? "Both" : `All ${e.length}`} local files being copied ${s.many}${r(s.group)}.`;
  let mapped = filtered.map((a) => `${a.group.length} ${a.group.length === 1 ? a.one : a.many}${r(a.group)}`);
  return ` Of the ${e.length} local files being copied, ${mapped.join("; ")}.`;
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
