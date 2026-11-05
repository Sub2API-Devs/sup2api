/**
 * services/fileInputs/attachmentText.ts
 *
 * 2.1.316 新增：附件列表文本与路径转义
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-t1nb81ct.js (6), chunk-vncaht6k.js (1)
 * attribution: placement 7
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { basename } from "path";
import { jsonStringify } from "../../utils/slowOperations.js";
import { plural, truncateToLength } from "../../utils/stringUtils.js";
import { assertFilesApiAvailable } from "../api/filesApi.js";
import { getOauthConfig } from "../../constants/oauth.js";
import { hasComplianceTaint } from "../policyLimits/complianceTaints.js";
import { isEssentialTrafficOnly } from "../../utils/privacyLevel.js";

//@ chunk-t1nb81ct.js:308-330 placement
/**
 * 附件摘要的最大字符数（300）。
 */
var MAX_PATH_CHARS = 100;
var MAX_LIST_CHARS = 900;
var MAX_SUMMARY_CHARS = 300;
//@ chunk-t1nb81ct.js:330-441 placement
function escapeNonAscii(value) {
  return jsonStringify(value).replace(
    /[^\x20-\x7e]/g,
    (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`,
  );
}
//@ chunk-t1nb81ct.js:441-614 placement
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
//@ chunk-t1nb81ct.js:614-902 placement
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
//@ chunk-t1nb81ct.js:902-1093 placement
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
//@ chunk-t1nb81ct.js:1093-1149 placement
function truncatedEscaped(path) {
  return escapeNonAscii(path.length > MAX_PATH_CHARS ? `${truncateToLength(path, MAX_PATH_CHARS)}...` : path);
}
//@ chunk-vncaht6k.js:336-485 placement
function filesApiUnavailableReason(signal) {
  try {
    assertFilesApiAvailable(getOauthConfig().BASE_API_URL, signal);
  } catch {
    return "egress_blocked";
  }
  if (hasComplianceTaint("zdr")) return "egress_blocked";
  return isEssentialTrafficOnly() ? "essential_traffic" : undefined;
}
export {
  truncatedEscaped,
  parseJsonPointer,
  filesApiUnavailableReason,
  shortenPathForList,
  attachmentListText,
  escapeNonAscii,
};
