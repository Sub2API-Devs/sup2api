/**
 * services/fileInputs/attachmentText.ts
 *
 * 2.1.316 新增：附件列表文本与路径转义
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ptefra21.js (7)
 * attribution: placement 7
 */
import { basename } from "path";
import { assertFilesApiAvailable } from "../api/filesApi.js";
import { getOauthConfig } from "../../constants/oauth.js";
import { hasComplianceTaint } from "../policyLimits/complianceTaints.js";
import { isEssentialTrafficOnly } from "../../utils/privacyLevel.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { plural, truncateToLength } from "../../utils/stringUtils.js";

//@ chunk-ptefra21.js:409-557 placement
function filesApiUnavailableReason(t) {
  try {
    assertFilesApiAvailable(getOauthConfig().BASE_API_URL, t);
  } catch {
    return "egress_blocked";
  }
  if (hasComplianceTaint("zdr")) return "egress_blocked";
  return isEssentialTrafficOnly() ? "essential_traffic" : undefined;
}
//@ chunk-ptefra21.js:589-611 placement
/**
 * 附件摘要的最大字符数（300）。
 */
var MAX_PATH_CHARS = 100;
var MAX_LIST_CHARS = 900;
var MAX_SUMMARY_CHARS = 300;
//@ chunk-ptefra21.js:611-722 placement
function escapeNonAscii(t) {
  return jsonStringify(t).replace(
    /[^\x20-\x7e]/g,
    (n) => `\\u${n.charCodeAt(0).toString(16).padStart(4, "0")}`,
  );
}
//@ chunk-ptefra21.js:722-895 placement
function shortenPathForList(t) {
  let n = escapeNonAscii(t);
  if (n.length <= MAX_SUMMARY_CHARS) return n;
  let e = [...t];
  let r = e.length;
  let o = 5;
  while (r > 0) {
    o += escapeNonAscii(e[r - 1]).length - 2;
    if (o > MAX_SUMMARY_CHARS) break;
    r--;
  }
  return escapeNonAscii(`...${e.slice(r).join("")}`);
}
//@ chunk-ptefra21.js:895-1183 placement
function attachmentListText(files) {
  let n = [];
  let e = 0;
  for (let { path, name: s, size } of files) {
    let i = `${shortenPathForList(path)}${basename(path) === s ? "" : `, the file ${shortenPathForList(s)}`} (${size} bytes)`;
    e += i.length + 2;
    if (e > MAX_LIST_CHARS) break;
    n.push(i);
  }
  let r = files.length - n.length;
  return `Attaches ${files.length} ${plural(files.length, "file")}: ${n.join("; ")}${r > 0 ? `; and ${r} more` : ""}`;
}
//@ chunk-ptefra21.js:1183-1373 placement
function parseJsonPointer(instancePath) {
  if (instancePath === "") return;
  let joined = instancePath
    .slice(1)
    .split("/")
    .map((e) => e.replaceAll("~1", "/").replaceAll("~0", "~"))
    .map((e, r) => (r === 0 ? e : /^\d+$/.test(e) ? `[${e}]` : `.${e}`))
    .join("");
  return truncatedEscaped(joined);
}
//@ chunk-ptefra21.js:1373-1429 placement
function truncatedEscaped(t) {
  return escapeNonAscii(t.length > MAX_PATH_CHARS ? `${truncateToLength(t, MAX_PATH_CHARS)}...` : t);
}
export {
  truncatedEscaped,
  parseJsonPointer,
  filesApiUnavailableReason,
  attachmentListText,
  escapeNonAscii,
  shortenPathForList,
};
