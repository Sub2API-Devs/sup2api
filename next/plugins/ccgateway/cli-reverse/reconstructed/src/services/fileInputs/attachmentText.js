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
function filesApiUnavailableReason(signal) {
  try {
    assertFilesApiAvailable(getOauthConfig().BASE_API_URL, signal);
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
function escapeNonAscii(value) {
  return jsonStringify(value).replace(
    /[^\x20-\x7e]/g,
    (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`,
  );
}
//@ chunk-ptefra21.js:722-895 placement
function shortenPathForList(path) {
  let escaped = escapeNonAscii(path);
  if (escaped.length <= MAX_SUMMARY_CHARS) return escaped;
  let chars = [...path];
  let startIndex = chars.length;
  let length = 5;
  while (startIndex > 0) {
    length += escapeNonAscii(chars[startIndex - 1]).length - 2;
    if (length > MAX_SUMMARY_CHARS) break;
    startIndex--;
  }
  return escapeNonAscii(`...${chars.slice(startIndex).join("")}`);
}
//@ chunk-ptefra21.js:895-1183 placement
function attachmentListText(files) {
  let parts = [];
  let totalChars = 0;
  for (let { path, name, size } of files) {
    let line = `${shortenPathForList(path)}${basename(path) === name ? "" : `, the file ${shortenPathForList(name)}`} (${size} bytes)`;
    totalChars += line.length + 2;
    if (totalChars > MAX_LIST_CHARS) break;
    parts.push(line);
  }
  let omittedCount = files.length - parts.length;
  return `Attaches ${files.length} ${plural(files.length, "file")}: ${parts.join("; ")}${omittedCount > 0 ? `; and ${omittedCount} more` : ""}`;
}
//@ chunk-ptefra21.js:1183-1373 placement
function parseJsonPointer(instancePath) {
  if (instancePath === "") return;
  let joined = instancePath
    .slice(1)
    .split("/")
    .map((segment) => segment.replaceAll("~1", "/").replaceAll("~0", "~"))
    .map((part, rest) => (rest === 0 ? part : /^\d+$/.test(part) ? `[${part}]` : `.${part}`))
    .join("");
  return truncatedEscaped(joined);
}
//@ chunk-ptefra21.js:1373-1429 placement
function truncatedEscaped(path) {
  return escapeNonAscii(path.length > MAX_PATH_CHARS ? `${truncateToLength(path, MAX_PATH_CHARS)}...` : path);
}
export {
  truncatedEscaped,
  parseJsonPointer,
  filesApiUnavailableReason,
  attachmentListText,
  escapeNonAscii,
  shortenPathForList,
};
