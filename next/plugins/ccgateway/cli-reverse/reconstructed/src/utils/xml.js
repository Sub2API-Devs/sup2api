/**
 * utils/xml.ts
 *
 * XML/HTML 转义、按转义后长度截断、安全 Markdown→HTML 渲染、协调者中继消息标签校验
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/xml.ts
 * pieces: chunk-1dbza2qv.js (1), chunk-72da5r6r.js (1)
 * attribution: fingerprint 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { escapeXml_2 } from "./confusables.js";
import {
  MAX_WARNING_TEXT_CHARS,
  AMPERSAND_FORMS_RE,
  ANGLE_OPEN_VARIANTS_RE,
  ANGLE_CLOSE_VARIANTS_RE,
  TRAILING_AMPERSAND_RE,
} from "../services/artifacts/artifactPeople.js";
import { sweepAskCopy } from "../tools/ArtifactTool/artifactUrls.js";
import { truncateToLength } from "./stringUtils.js";

//@ chunk-72da5r6r.js:24121-24199 fingerprint (2.1.88 match: escapeXmlAttr, 1)
function escapeXmlAttr(s) {
  return escapeXml_2(s).replaceAll('"', "&quot;").replaceAll("'", "&apos;");
}
//@ chunk-1dbza2qv.js:13625-13750 fingerprint (2.1.88 match: escapeXml, 1)
function escapeXml(text, maxLength = MAX_WARNING_TEXT_CHARS) {
  let replaced = (sweepAskCopy(text) ?? "")
    .replace(AMPERSAND_FORMS_RE, "&amp;")
    .replace(ANGLE_OPEN_VARIANTS_RE, "&lt;")
    .replace(ANGLE_CLOSE_VARIANTS_RE, "&gt;");
  return truncateToLength(replaced, maxLength).replace(TRAILING_AMPERSAND_RE, "");
}
export { escapeXml, escapeXmlAttr };
