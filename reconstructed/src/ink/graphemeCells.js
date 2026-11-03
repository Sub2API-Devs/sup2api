/**
 * ink/graphemeCells.ts
 *
 * 2.1.316 新增：字符画布网格与宽字符/框线方向位（mermaid 渲染用）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-yb0ajcmt.js (14)
 * attribution: placement 14
 */

//@ chunk-yb0ajcmt.js:4703-6609 placement
var WIDE_CHAR_REGEX =
    /[\u1100-\u115F\u231A\u231B\u2329\u232A\u23E9-\u23EC\u23F0\u23F3\u25FD\u25FE\u2614\u2615\u2648-\u2653\u267F\u2693\u26A1\u26AA\u26AB\u26BD\u26BE\u26C4\u26C5\u26CE\u26D4\u26EA\u26F2\u26F3\u26F5\u26FA\u26FD\u2705\u270A\u270B\u2728\u274C\u274E\u2753-\u2755\u2757\u2795-\u2797\u27B0\u27BF\u2B1B\u2B1C\u2B50\u2B55\u2E80-\u3029\u302E-\u303E\u3041-\u3096\u309B-\u31E3\u31EF-\u3247\u3250-\u4DBF\u4E00-\uA4C6\uA960-\uA97C\uAC00-\uD7A3\uF900-\uFAFF\uFE10-\uFE19\uFE30-\uFE6B\uFF01-\uFF60\uFFE0-\uFFE6\u{16FE0}-\u{16FE3}\u{16FF0}\u{16FF1}\u{17000}-\u{187F7}\u{18800}-\u{18CD5}\u{18D00}-\u{18D08}\u{1AFF0}-\u{1B2FB}\u{1F004}\u{1F0CF}\u{1F18E}\u{1F191}-\u{1F19A}\u{1F200}-\u{1F320}\u{1F32D}-\u{1F335}\u{1F337}-\u{1F37C}\u{1F37E}-\u{1F393}\u{1F3A0}-\u{1F3CA}\u{1F3CF}-\u{1F3D3}\u{1F3E0}-\u{1F3F0}\u{1F3F4}\u{1F3F8}-\u{1F43E}\u{1F440}\u{1F442}-\u{1F4FC}\u{1F4FF}-\u{1F53D}\u{1F54B}-\u{1F54E}\u{1F550}-\u{1F567}\u{1F57A}\u{1F595}\u{1F596}\u{1F5A4}\u{1F5FB}-\u{1F64F}\u{1F680}-\u{1F6C5}\u{1F6CC}\u{1F6D0}-\u{1F6D2}\u{1F6D5}-\u{1F6D7}\u{1F6DC}-\u{1F6DF}\u{1F6EB}\u{1F6EC}\u{1F6F4}-\u{1F6FC}\u{1F7E0}-\u{1F7F0}\u{1F90C}-\u{1F93A}\u{1F93C}-\u{1F945}\u{1F947}-\u{1F9FF}\u{1FA70}-\u{1FA88}\u{1FA90}-\u{1FABD}\u{1FABF}-\u{1FAC5}\u{1FACE}-\u{1FADB}\u{1FAE0}-\u{1FAE8}\u{1FAF0}-\u{1FAF8}\u{20000}-\u{3FFFD}]/u,
  tt =
    /[\u00AD\u0300-\u036F\u0600-\u0605\u06DD\u070F\u08E2\u0E31\u0E34-\u0E3A\u0E47-\u0E4E\u0EB1\u0EB4-\u0EBC\u0EC8-\u0ECD\u1AB0-\u1AFF\u1DC0-\u1DFF\u200B-\u200F\u2060-\u2064\u20D0-\u20FF\uFE00-\uFE0F\uFE20-\uFE2F\uFEFF\u{E0000}-\u{E007F}\u{E0100}-\u{E01EF}]/u,
  nt =
    /[\p{Mn}\p{Me}\p{Cf}\p{Cn}\p{Co}\u1160-\u11FF\uD7B0-\uD7FF\u2630-\u2637\u268A-\u268F\u302A-\u302D\u3099\u309A\u31E4\u31E5\u4DC0-\u4DFF\u{16FE4}\u{16FF2}-\u{16FF6}\u{187F8}-\u{187FF}\u{18CFF}\u{18D09}-\u{18DF2}\u{1D300}-\u{1D376}\u{1F6D8}\u{1FA89}-\u{1FA8F}\u{1FABE}\u{1FAC6}-\u{1FACD}\u{1FADC}-\u{1FADF}\u{1FAE9}-\u{1FAEF}]/u,
  ot = /[\u{1F1E6}-\u{1F1FF}]/u;
//@ chunk-yb0ajcmt.js:6609-6667 placement
var rt = /[\u200D\u{1F3FB}-\u{1F3FF}]/u,
  Ee = /[\uFE0E\uFE0F]/;
//@ chunk-yb0ajcmt.js:6667-6800 placement
var EMOJI_RE = /\p{Emoji}/u,
  NARROW_SAFE_RE = /^[\u0020-\u007E\u00A0-\u00AC\u00AE-\u02FF\u2190-\u22FF\u2500-\u25FC]*$/,
  BR_TAG_RE = /<br\s*\/?>/i,
  WORD_CHAR_RE = /[\p{L}\p{N}_]/u;
//@ chunk-yb0ajcmt.js:6800-6811 placement
var ne = 128;
/**
 * 按字素切分字符串并给出每段显示宽度（处理 emoji、组合字符、全角）。
 */
//@ chunk-yb0ajcmt.js:6811-7310 placement = getGraphemeSegmenter (0.781)
function segmentGraphemesWithWidth(e) {
  if (NARROW_SAFE_RE.test(e)) return Array.from(e, (n) => ({ text: n, width: 1 }));
  let t = new Intl.Segmenter(void 0, { granularity: "grapheme" });
  return Array.from(t.segment(e), ({ segment: segment }) => {
    let list = Array.from(segment, (l) => graphemeCellWidth(l) ?? 1),
      i = segment.codePointAt(0) ?? 0,
      u = i >= 8252 && (i < 11264 || i >= 126976) && EMOJI_RE.test(String.fromCodePoint(i)),
      r = Ee.test(segment) && !Ee.test(segment[0] ?? ""),
      s = ot.test(segment)
        ? Math.min(list.length, 2)
        : segment.includes("\u20E3") || (u && rt.test(segment))
          ? 2
          : r
            ? list[0] === 2 || (segment.includes("\uFE0F") && i >= 128)
              ? 2
              : 1
            : list.reduce((l, a) => l + a, 0);
    return { text: segment, width: s };
  });
}
//@ chunk-yb0ajcmt.js:7310-7385 placement
function Ae(e) {
  return NARROW_SAFE_RE.test(e) || Array.from(e).every((t) => graphemeCellWidth(t) !== void 0);
}
//@ chunk-yb0ajcmt.js:7385-7439 placement
function A(e) {
  return segmentGraphemesWithWidth(e).reduce((t, n) => t + n.width, 0);
}
//@ chunk-yb0ajcmt.js:7439-7673 placement
function parseLabelLines(e) {
  let trimmed = e.trim();
  return (
    trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"') ? trimmed.slice(1, -1) : trimmed
  )
    .split(BR_TAG_RE)
    .map((i) => {
      let u = "";
      for (let r of i) {
        let s = r.codePointAt(0) ?? 0,
          l = s <= 31 || (s >= 127 && s <= 159);
        u += l ? (s === 9 ? " " : "") : r;
      }
      return u.trim();
    });
}
//@ chunk-yb0ajcmt.js:7673-7813 placement
function identifierWidth(e, t) {
  if (t.length === 1 && t[0] === e) return 0;
  let n = A(e);
  return Array.from(e).every((i) => WORD_CHAR_RE.test(i)) && n <= 16 ? n : Number.POSITIVE_INFINITY;
}
//@ chunk-yb0ajcmt.js:7813-8003 placement
function graphemeCellWidth(e) {
  let t = e.codePointAt(0) ?? 0,
    n = t & 127;
  if (
    (t >= 2304 &&
      t <= 3407 &&
      (n <= 2 || (n >= 58 && n <= 77 && n !== 61) || (n >= 81 && n <= 87) || n === 98 || n === 99)) ||
    tt.test(e)
  )
    return 0;
  return nt.test(e) ? void 0 : WIDE_CHAR_REGEX.test(e) ? 2 : 1;
}
//@ chunk-yb0ajcmt.js:8003-8392 placement
var BOX_DIRECTION_BITS = 1,
  v = 2,
  G = 4,
  X = 8,
  ut = [
    " ",
    "\u2502",
    "\u2502",
    "\u2502",
    "\u2500",
    "\u2518",
    "\u2510",
    "\u2524",
    "\u2500",
    "\u2514",
    "\u250C",
    "\u251C",
    "\u2500",
    "\u2534",
    "\u252C",
    "\u253C",
  ],
  lt = {
    [BOX_DIRECTION_BITS | G]: "\u256F",
    [v | G]: "\u256E",
    [BOX_DIRECTION_BITS | X]: "\u2570",
    [v | X]: "\u256D",
  },
  at = {
    solid: { across: "\u2500", down: "\u2502" },
    dotted: { across: "\u2504", down: "\u2506" },
    thick: { across: "\u2501", down: "\u2503" },
  },
  ke = ["solid", "dotted", "thick"],
  oe = 400000;
//@ chunk-yb0ajcmt.js:8549-8942 placement
function linkCells(e, t, n, o = "solid") {
  let i =
      Math.min(t.x, n.x) >= 0 &&
      Math.min(t.y, n.y) >= 0 &&
      Math.max(t.x, n.x) < e.width &&
      Math.max(t.y, n.y) < e.height,
    u = Math.abs(t.x - n.x) + Math.abs(t.y - n.y) === 1;
  if (!i || !u) return;
  let r = n.x > t.x ? X : n.x < t.x ? G : n.y > t.y ? v : BOX_DIRECTION_BITS,
    s = r === X ? G : r === G ? X : r === v ? BOX_DIRECTION_BITS : v,
    index = ke.indexOf(o);
  for (let [a, h] of [
    [t, r],
    [n, s],
  ]) {
    let c = a.y * e.width + a.x;
    ((e.links[c] = (e.links[c] ?? 0) | h), (e.styles[c] = Math.max(e.styles[c] ?? 0, index)));
  }
}
//@ chunk-yb0ajcmt.js:8942-9047 placement = diff (0.775)
function unlinkCell(e, t, n) {
  let o = n.x > t.x ? X : n.x < t.x ? G : n.y > t.y ? v : BOX_DIRECTION_BITS,
    i = t.y * e.width + t.x;
  e.links[i] = (e.links[i] ?? 0) & ~o;
}
//@ chunk-yb0ajcmt.js:9047-9141 placement
function linkPath(e, t, n = "solid") {
  for (let o = 1; o < t.length; o++) {
    let i = t[o - 1],
      u = t[o];
    if (i && u) linkCells(e, i, u, n);
  }
}

export {
  Ae,
  segmentGraphemesWithWidth,
  linkCells,
  A,
  at,
  ke,
  BOX_DIRECTION_BITS,
  v,
  G,
  X,
  lt,
  ut,
  oe,
  linkPath,
  unlinkCell,
  identifierWidth,
  ne,
  parseLabelLines,
  WORD_CHAR_RE,
};
