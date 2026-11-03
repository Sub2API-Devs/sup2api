/**
 * utils/messages/forwardedTurnSanitize.ts
 *
 * 2.1.316 新增：转发回合清理。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-03eraja6.js (10)
 * attribution: placement 10
 */
import { UK, nve, escapeXml_2 as escapeXml, bv } from "../confusables.js";
import { urlPatternToRegex } from "../stringUtils.js";

//@ chunk-03eraja6.js:273-342 placement
function j6o(t) {
  return (
    "  " +
    t.replace(
      e4e,
      `
`,
    ).split(`
`).join(`
  `)
  );
}
//@ chunk-03eraja6.js:342-404 placement
var W6o = VF,
  e4e = /\r\n?|[\u001c-\u001e\u2028\u2029\u0085\v\f]/g;
//@ chunk-03eraja6.js:404-446 placement
function t4e(t) {
  return t.replace(
    e4e,
    `
`,
  );
}
//@ chunk-03eraja6.js:446-527 placement
var Nxe = /[\p{Cf}\p{Default_Ignorable_Code_Point}]/gu,
  { open: open, close: close, slash: slash } = UK;
/**
 * 中和转发回合中的链接：去掉特殊字符，并把指向指定地址的括号链接改写为普通方括号，避免被当成可点击链接。
 */
//@ chunk-03eraja6.js:527-674 placement
function neutralizeForwardedLinks(t, r) {
  return r
    .replace(Nxe, "")
    .replace(
      new RegExp(
        `[${open}]([\\s${slash}]*${urlPatternToRegex(t)}\\b(?:${nve(`^${open}${close}`, 2)}[${close}])?)`,
        "giu",
      ),
      (n, o) => "[" + o,
    );
}
//@ chunk-03eraja6.js:674-751 placement
var FORWARDED_USER_TURNS = "forwarded_user_turns",
  FORWARDED_TURN = "forwarded_turn",
  p = ["transcript", FORWARDED_USER_TURNS, FORWARDED_TURN];
//@ chunk-03eraja6.js:751-810 placement
function yot(t) {
  let r = t;
  for (let n of p) r = neutralizeForwardedLinks(n, r);
  return r;
}
//@ chunk-03eraja6.js:810-871 placement
function VF(t) {
  return (
    "  " +
    yot(t4e(t)).split(`
`).join(`
  `)
  );
}
//@ chunk-03eraja6.js:871-910 placement
var a = /[\x00-\x08\x0b-\x1f\x7f-\x9f]/g;
//@ chunk-03eraja6.js:910-983 placement
function b6r(t) {
  return j6o(escapeXml(bv(t4e(t).replace(Nxe, "").replace(a, ""))));
}

export {
  b6r,
  yot,
  VF,
  Nxe,
  neutralizeForwardedLinks,
  FORWARDED_TURN,
  FORWARDED_USER_TURNS,
  t4e,
  e4e,
  j6o,
  W6o,
};
