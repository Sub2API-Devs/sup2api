/**
 * parse5/dist/serializer/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: parse5@7.2.0..7.2.1
 * pieces: chunk-6ja29j2n.js (2)
 * attribution: esm-fingerprint 1, esm-layout 1
 */
import { c } from "../../lib/common/html.js";
import { re } from "../parser/index.js";

//@ chunk-6ja29j2n.js:179577-179730 esm-fingerprint
var _s = new Set([
  c.AREA,
  c.BASE,
  c.BASEFONT,
  c.BGSOUND,
  c.BR,
  c.COL,
  c.EMBED,
  c.FRAME,
  c.HR,
  c.IMG,
  c.INPUT,
  c.KEYGEN,
  c.LINK,
  c.META,
  c.PARAM,
  c.SOURCE,
  c.TRACK,
  c.WBR,
]);
//@ chunk-6ja29j2n.js:179730-179769 esm-layout
function parse(e, t) {
  return re.parse(e, t);
}
