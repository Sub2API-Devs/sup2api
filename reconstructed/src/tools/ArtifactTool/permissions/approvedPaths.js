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
import { mbt, X9 } from "../../../services/artifacts/artifactDb.js";
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
  size: `file_path is empty or larger than ${mbt} bytes \u2014 write_db reads at most that much JSON, and the document must serialize to ${X9} bytes or fewer`,
};
//@ chunk-qxvqcab6.js:10244-10348 placement
function isReadDbAction(e) {
  return typeof e === "object" && e !== null && e.action === "read_db" && typeof e.out_dir === "string";
}
//@ chunk-qxvqcab6.js:10348-10515 placement
function isWriteDbWithFile(e) {
  if (typeof e !== "object" || e === null || e.action !== "write_db") return !1;
  if (typeof e.file_path === "string") return !0;
  return batchWrites(e).some((n) => n.filePath !== void 0);
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
var DATA_URI_LIMITS = 1024,
  i0s = 49152,
  B = /data:[a-z0-9.+-]+\/[a-z0-9.+-]+(?:;[a-z0-9=.+-]+)*;base64,[A-Za-z0-9+/_-]{1000,}/gi,
  E = /^[A-Za-z0-9+/_-]+$/,
  C = /^[A-Za-z0-9+/_-]+={0,2}$/,
  L = new Set([60, 64, 76]);
//@ chunk-qxvqcab6.js:10787-11180 placement
function looksLikeSecretLine(e) {
  let trimmed = e.trim(),
    index = trimmed.indexOf(`
`),
    sliced = trimmed.slice(index + 1, index + 513);
  if (!/[A-Z]/.test(sliced) || !/[a-z]/.test(sliced) || !/[0-9]/.test(sliced)) return !1;
  if (index === -1) return C.test(trimmed);
  let s = stripSuffix(trimmed.slice(0, index), "\r");
  if (!E.test(s)) return !1;
  let parts = trimmed.slice(index + 1).replaceAll(
      `\r
`,
      `
`,
    ).split(`
`),
    a = parts.pop() ?? "",
    l = parts[0]?.length ?? s.length;
  return (
    L.has(l) && s.length <= l && a.length <= l && C.test(a) && parts.every((d) => d.length === l && E.test(d))
  );
}
//@ chunk-qxvqcab6.js:11180-11277 placement
function V(e) {
  if (looksLikeSecretLine(e)) return e.length;
  let n = 0;
  for (let r of e.matchAll(B)) n += r[0].length;
  return n;
}
//@ chunk-qxvqcab6.js:11277-11515 placement
function countLargeDataUris(e) {
  let n = 0,
    r = 0,
    o = [...e];
  while (o.length > 0) {
    let s = o.pop();
    if (typeof s === "string") {
      let u = s.length >= DATA_URI_LIMITS ? V(s) : 0;
      if (u > 0) (n++, (r += u));
    } else if (typeof s === "object" && s !== null) for (let u of Object.values(s)) o.push(u);
  }
  return { strings: n, chars: r };
}
//@ chunk-qxvqcab6.js:11515-11861 placement
function describeCommentAuthorAccess(e, n, r, o, s, u) {
  let a = isOwnPrincipal(e, r),
    l = s.get(e),
    d = `${l ?? "viewer"}${!a && u.has(e) ? ", outside your organization" : ""} ${e.slice(0, 8)}`,
    f =
      n === "assistant"
        ? a
          ? "Claude (via the user)"
          : `Claude (via ${d})`
        : n !== void 0 && n !== ""
          ? `viewer ${e.slice(0, 8)} (unverified lane)`
          : a
            ? l !== void 0
              ? `the user (${l})`
              : "the user"
            : d;
  return o ? `${f}, posted by the artifact` : f;
}
//@ chunk-qxvqcab6.js:11861-11878 placement
var MAX_LISTED_FAILURES = 5,
  Iko = 10;
//@ chunk-qxvqcab6.js:11878-11981 placement = formatFailureDetails (0.777)
function formatFailureDetails(failures, includeReasons) {
  let moreText = failures.length > includeReasons ? ` and ${failures.length - includeReasons} more` : "";
  return `${failures.slice(0, includeReasons).join(", ")}${moreText}`;
}
//@ chunk-qxvqcab6.js:11981-12023 placement
var S = (e) => e.outsideAsk || e.flaggedOutside;
/**
 * 把文件路径问题（经符号链接到工作区外、不在可访问目录、读规则覆盖等）组成给用户的说明。
 */
//@ chunk-qxvqcab6.js:12023-13435 placement
function describePathProblems(e) {
  let [n] = e;
  if (e.length === 1 && n !== void 0) {
    let a = [];
    if (S(n))
      a.push(
        n.resolvesOutside
          ? "reaches, through a symbolic link, a file outside the folders this session can read"
          : "is outside the folders this session can read",
      );
    if (n.linkNote !== "" && !S(n))
      a.push("is a hard link to a file that may also live elsewhere on this machine");
    return a.length === 0
      ? ""
      : ` The local file "${truncatePathMiddle(n.askPath, 256)}" ${a.join(" and ")}.`;
  }
  let r = (a) =>
      ` (${formatFailureDetails(
        a.map((l) => `"${truncatePathMiddle(l.askPath, 256)}"`),
        Iko,
      )})`,
    filtered = [
      {
        group: e.filter((a) => S(a) && !a.resolvesOutside),
        one: "is outside the folders this session can read",
        many: "are outside the folders this session can read",
      },
      {
        group: e.filter((a) => a.resolvesOutside),
        one: "reaches, through a symbolic link, a file outside the folders this session can read",
        many: "reach, through symbolic links, files outside the folders this session can read",
      },
      {
        group: e.filter((a) => a.linkNote !== "" && !S(a)),
        one: "is a hard link to a file that may also live elsewhere on this machine",
        many: "are hard links to files that may also live elsewhere on this machine",
      },
    ].filter((a) => a.group.length > 0),
    [s] = filtered;
  if (s === void 0) return "";
  if (filtered.length === 1 && s.group.length === e.length)
    return ` ${e.length === 2 ? "Both" : `All ${e.length}`} local files being copied ${s.many}${r(s.group)}.`;
  let mapped = filtered.map((a) => `${a.group.length} ${a.group.length === 1 ? a.one : a.many}${r(a.group)}`);
  return ` Of the ${e.length} local files being copied, ${mapped.join("; ")}.`;
}

export {
  formatFailureDetails,
  MAX_LISTED_FAILURES,
  Iko,
  APPROVED_PATH_MISMATCH_TEXT,
  jsonByteLength,
  countLargeDataUris,
  i0s,
  describePathProblems,
  isReadDbAction,
  isWriteDbWithFile,
  describeCommentAuthorAccess,
  APPROVED_PATH_CHECK_MS,
};
