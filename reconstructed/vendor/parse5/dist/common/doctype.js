/**
 * parse5/dist/common/doctype.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: parse5@7.2.0..7.2.1
 * pieces: chunk-6ja29j2n.js (4)
 * attribution: esm-fingerprint 4
 */
import { O } from "../../lib/common/html.js";

//@ chunk-6ja29j2n.js:126135-128770 esm-fingerprint
var HTML = "html",
  ABOUT_LEGACY_COMPAT = "about:legacy-compat",
  Ut = "http://www.ibm.com/data/dtd/v11/ibmxhtml1-transitional.dtd",
  Ye = [
    "+//silmaril//dtd html pro v0r11 19970101//",
    "-//as//dtd html 3.0 aswedit + extensions//",
    "-//advasoft ltd//dtd html 3.0 aswedit + extensions//",
    "-//ietf//dtd html 2.0 level 1//",
    "-//ietf//dtd html 2.0 level 2//",
    "-//ietf//dtd html 2.0 strict level 1//",
    "-//ietf//dtd html 2.0 strict level 2//",
    "-//ietf//dtd html 2.0 strict//",
    "-//ietf//dtd html 2.0//",
    "-//ietf//dtd html 2.1e//",
    "-//ietf//dtd html 3.0//",
    "-//ietf//dtd html 3.2 final//",
    "-//ietf//dtd html 3.2//",
    "-//ietf//dtd html 3//",
    "-//ietf//dtd html level 0//",
    "-//ietf//dtd html level 1//",
    "-//ietf//dtd html level 2//",
    "-//ietf//dtd html level 3//",
    "-//ietf//dtd html strict level 0//",
    "-//ietf//dtd html strict level 1//",
    "-//ietf//dtd html strict level 2//",
    "-//ietf//dtd html strict level 3//",
    "-//ietf//dtd html strict//",
    "-//ietf//dtd html//",
    "-//metrius//dtd metrius presentational//",
    "-//microsoft//dtd internet explorer 2.0 html strict//",
    "-//microsoft//dtd internet explorer 2.0 html//",
    "-//microsoft//dtd internet explorer 2.0 tables//",
    "-//microsoft//dtd internet explorer 3.0 html strict//",
    "-//microsoft//dtd internet explorer 3.0 html//",
    "-//microsoft//dtd internet explorer 3.0 tables//",
    "-//netscape comm. corp.//dtd html//",
    "-//netscape comm. corp.//dtd strict html//",
    "-//o'reilly and associates//dtd html 2.0//",
    "-//o'reilly and associates//dtd html extended 1.0//",
    "-//o'reilly and associates//dtd html extended relaxed 1.0//",
    "-//sq//dtd html 2.0 hotmetal + extensions//",
    "-//softquad software//dtd hotmetal pro 6.0::19990601::extensions to html 4.0//",
    "-//softquad//dtd hotmetal pro 4.0::19971010::extensions to html 4.0//",
    "-//spyglass//dtd html 2.0 extended//",
    "-//sun microsystems corp.//dtd hotjava html//",
    "-//sun microsystems corp.//dtd hotjava strict html//",
    "-//w3c//dtd html 3 1995-03-24//",
    "-//w3c//dtd html 3.2 draft//",
    "-//w3c//dtd html 3.2 final//",
    "-//w3c//dtd html 3.2//",
    "-//w3c//dtd html 3.2s draft//",
    "-//w3c//dtd html 4.0 frameset//",
    "-//w3c//dtd html 4.0 transitional//",
    "-//w3c//dtd html experimental 19960712//",
    "-//w3c//dtd html experimental 970421//",
    "-//w3c//dtd w3 html//",
    "-//w3o//dtd w3 html 3.0//",
    "-//webtechs//dtd mozilla html 2.0//",
    "-//webtechs//dtd mozilla html//",
  ],
  Ft = [...Ye, "-//w3c//dtd html 4.01 frameset//", "-//w3c//dtd html 4.01 transitional//"],
  yt = new Set(["-//w3o//dtd w3 html strict 3.0//en//", "-/w3c/dtd html 4.0 transitional/en", "html"]),
  ve = ["-//w3c//dtd xhtml 1.0 frameset//", "-//w3c//dtd xhtml 1.0 transitional//"],
  wt = [...ve, "-//w3c//dtd html 4.01 frameset//", "-//w3c//dtd html 4.01 transitional//"];
//@ chunk-6ja29j2n.js:128770-128823 esm-fingerprint
function ye(e, t) {
  return t.some((a) => e.startsWith(a));
}
//@ chunk-6ja29j2n.js:128823-128914 esm-fingerprint
function Qe(e) {
  return (
    e.name === HTML && e.publicId === null && (e.systemId === null || e.systemId === ABOUT_LEGACY_COMPAT)
  );
}
//@ chunk-6ja29j2n.js:128914-129218 esm-fingerprint
function Ge(e) {
  if (e.name !== HTML) return O.QUIRKS;
  let { systemId: systemId } = e;
  if (systemId && systemId.toLowerCase() === Ut) return O.QUIRKS;
  let { publicId: publicId } = e;
  if (publicId !== null) {
    if (((publicId = publicId.toLowerCase()), yt.has(publicId))) return O.QUIRKS;
    let n = systemId === null ? Ft : Ye;
    if (ye(publicId, n)) return O.QUIRKS;
    if (((n = systemId === null ? ve : wt), ye(publicId, n))) return O.LIMITED_QUIRKS;
  }
  return O.NO_QUIRKS;
}

export { Ge, Qe };
