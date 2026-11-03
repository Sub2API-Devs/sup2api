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
  return isEssentialTrafficOnly() ? "essential_traffic" : void 0;
}
//@ chunk-ptefra21.js:589-611 placement
var l = 100,
  f = 900,
  a = 300;
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
  if (n.length <= a) return n;
  let e = [...t],
    r = e.length,
    o = 5;
  while (r > 0) {
    if (((o += escapeNonAscii(e[r - 1]).length - 2), o > a)) break;
    r--;
  }
  return escapeNonAscii(`...${e.slice(r).join("")}`);
}
//@ chunk-ptefra21.js:895-1183 placement
function attachmentListText(t) {
  let n = [],
    e = 0;
  for (let { path: path, name: s, size: size } of t) {
    let i = `${shortenPathForList(path)}${basename(path) === s ? "" : `, the file ${shortenPathForList(s)}`} (${size} bytes)`;
    if (((e += i.length + 2), e > f)) break;
    n.push(i);
  }
  let r = t.length - n.length;
  return `Attaches ${t.length} ${plural(t.length, "file")}: ${n.join("; ")}${r > 0 ? `; and ${r} more` : ""}`;
}
//@ chunk-ptefra21.js:1183-1373 placement
function parseJsonPointer(t) {
  if (t === "") return;
  let joined = t
    .slice(1)
    .split("/")
    .map((e) => e.replaceAll("~1", "/").replaceAll("~0", "~"))
    .map((e, r) => (r === 0 ? e : /^\d+$/.test(e) ? `[${e}]` : `.${e}`))
    .join("");
  return truncatedEscaped(joined);
}
//@ chunk-ptefra21.js:1373-1429 placement
function truncatedEscaped(t) {
  return escapeNonAscii(t.length > l ? `${truncateToLength(t, l)}...` : t);
}

export {
  truncatedEscaped,
  parseJsonPointer,
  filesApiUnavailableReason,
  attachmentListText,
  escapeNonAscii,
  shortenPathForList,
};
