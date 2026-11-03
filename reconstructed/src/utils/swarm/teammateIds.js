/**
 * utils/swarm/teammateIds.ts
 *
 * 队友 id（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-qg0af0yq.js (11)
 * attribution: placement 11
 */
import { truncateToLength } from "../stringUtils.js";

//@ chunk-qg0af0yq.js:17811-17888 placement
var kn = /[^\p{L}\p{N}._-]+/gu,
  On = /^[._-]+|[._-]+$/gu,
  Fn = /[\p{L}\p{N}]/u,
  Mn = 20;
//@ chunk-qg0af0yq.js:17888-17986 placement
function Hb(e) {
  let trimmed = Dn(e).trim(),
    t = [...trimmed];
  return t.length > 64 ? `${t.slice(0, 64).join("")}\u2026` : trimmed;
}
//@ chunk-qg0af0yq.js:17986-18059 placement
function Dn(e) {
  return e.replace(/[\p{Cf}\p{Cc}\p{Cs}\p{Zl}\p{Zp}]/gu, "");
}
//@ chunk-qg0af0yq.js:18059-18189 placement
function sanitizeTeammateLabel(e, n = Mn) {
  let replaced = Hb(e).replace(kn, "-").replace(On, "");
  if (!Fn.test(replaced)) return "";
  let r = truncateToLength(replaced, n);
  return r === replaced ? replaced : `${r}\u2026`;
}
//@ chunk-qg0af0yq.js:18189-18209 placement
var zoo = 512,
  Y = 4 * zoo;
//@ chunk-qg0af0yq.js:18209-18480 placement
function firstMeaningfulLine(e, n) {
  let t = 0;
  while (t <= e.length) {
    let index = e.indexOf(
        `
`,
        t,
      ),
      i = index === -1 ? e.length : index,
      s = i - t <= Y,
      o = truncateToLength(e.slice(t, Math.min(i, t + Y)), Y),
      trimmed = n(o).replace(/\s+/g, " ").trim();
    if (trimmed !== "" || !s) {
      let l = truncateToLength(trimmed, zoo);
      return !s || l.length < trimmed.length ? `${l}\u2026` : l;
    }
    if (index === -1) break;
    t = index + 1;
  }
  return "";
}
//@ chunk-qg0af0yq.js:18480-18582 placement
function sanitizeAddressPart(e) {
  if (typeof e !== "string") return;
  let n = Hb(e.replace(/["<>]/g, ""));
  return n === "" ? void 0 : n;
}
//@ chunk-qg0af0yq.js:18582-18593 placement
var ND = 200;
//@ chunk-qg0af0yq.js:18593-18628 placement
function MG(e, n) {
  return `${e}@${n}`;
}
//@ chunk-qg0af0yq.js:18628-18708 placement
function Koo(e) {
  return e.replace(/%|[^\x20-\x7e]/gu, (n) => encodeURIComponent(n));
}
//@ chunk-qg0af0yq.js:18708-18766 placement
function Fhr(e, n) {
  let now = Date.now();
  return `${e}-${now}@${n}`;
}

export { sanitizeTeammateLabel, sanitizeAddressPart, Hb, ND, MG, zoo, Fhr, firstMeaningfulLine, Koo };
