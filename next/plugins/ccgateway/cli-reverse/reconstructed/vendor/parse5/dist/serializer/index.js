/**
 * parse5/dist/serializer/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: parse5@7.2.0..7.2.1
 * pieces: chunk-p9ac6cnb.js (2)
 * attribution: esm-fingerprint 1, esm-layout 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { TAG_NAMES } from "../../lib/common/html.js";
import { Parser } from "../parser/index.js";

//@ chunk-p9ac6cnb.js:179577-179730 esm-fingerprint
var VOID_ELEMENTS = new Set([
  TAG_NAMES.AREA,
  TAG_NAMES.BASE,
  TAG_NAMES.BASEFONT,
  TAG_NAMES.BGSOUND,
  TAG_NAMES.BR,
  TAG_NAMES.COL,
  TAG_NAMES.EMBED,
  TAG_NAMES.FRAME,
  TAG_NAMES.HR,
  TAG_NAMES.IMG,
  TAG_NAMES.INPUT,
  TAG_NAMES.KEYGEN,
  TAG_NAMES.LINK,
  TAG_NAMES.META,
  TAG_NAMES.PARAM,
  TAG_NAMES.SOURCE,
  TAG_NAMES.TRACK,
  TAG_NAMES.WBR,
]);
//@ chunk-p9ac6cnb.js:179730-179769 esm-layout
function parse(node, options) {
  return Parser.parse(node, options);
}
export { parse };
