/**
 * utils/ansiToSvg.ts
 *
 * 把 ANSI 文本渲染为 SVG（解析 SGR、256 色，light/dark 主题）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/ansiToSvg.ts
 * pieces: chunk-t6e3jxy0.js (3)
 * attribution: affinity 1, fingerprint 1, callgraph-fingerprint 1
 */

//@ chunk-t6e3jxy0.js:366-764 affinity = SETTLED_GREY (1)
var ANSI_FG_RGB = {
    30: { r: 0, g: 0, b: 0 },
    31: { r: 205, g: 49, b: 49 },
    32: { r: 13, g: 188, b: 121 },
    33: { r: 229, g: 229, b: 16 },
    34: { r: 36, g: 114, b: 200 },
    35: { r: 188, g: 63, b: 188 },
    36: { r: 17, g: 168, b: 205 },
    37: { r: 229, g: 229, b: 229 },
    90: { r: 102, g: 102, b: 102 },
    91: { r: 241, g: 76, b: 76 },
    92: { r: 35, g: 209, b: 139 },
    93: { r: 245, g: 245, b: 67 },
    94: { r: 59, g: 142, b: 234 },
    95: { r: 214, g: 112, b: 214 },
    96: { r: 41, g: 184, b: 219 },
    97: { r: 255, g: 255, b: 255 },
  },
  DEFAULT_FG_RGB = { r: 229, g: 229, b: 229 },
  DEFAULT_BG_RGB = { r: 30, g: 30, b: 30 };
//@ chunk-t6e3jxy0.js:764-1679 fingerprint = parseAnsi (1)
function parseAnsi(text) {
  let r = [],
    parts = text.split(`
`);
  for (let line of parts) {
    let i = [],
      s = DEFAULT_FG_RGB,
      l = !1,
      o = 0;
    while (o < line.length) {
      if (line[o] === "\x1B" && line[o + 1] === "[") {
        let f = o + 2;
        while (f < line.length && !/[A-Za-z]/.test(line[f])) f++;
        if (line[f] === "m") {
          let codes = line
              .slice(o + 2, f)
              .split(";")
              .map(Number),
            c = 0;
          while (c < codes.length) {
            let d = codes[c];
            if (d === 0) ((s = DEFAULT_FG_RGB), (l = !1));
            else if (d === 1) l = !0;
            else if (d >= 30 && d <= 37) s = ANSI_FG_RGB[d] || DEFAULT_FG_RGB;
            else if (d >= 90 && d <= 97) s = ANSI_FG_RGB[d] || DEFAULT_FG_RGB;
            else if (d === 39) s = DEFAULT_FG_RGB;
            else if (d === 38) {
              if (codes[c + 1] === 5 && codes[c + 2] !== void 0) {
                let p = codes[c + 2];
                ((s = get256Color(p)), (c += 2));
              } else if (
                codes[c + 1] === 2 &&
                codes[c + 2] !== void 0 &&
                codes[c + 3] !== void 0 &&
                codes[c + 4] !== void 0
              )
                ((s = { r: codes[c + 2], g: codes[c + 3], b: codes[c + 4] }), (c += 4));
            }
            c++;
          }
        }
        o = f + 1;
        continue;
      }
      if (line[o] === "\x1B") {
        if (line[o + 1] === "]") {
          let f = o + 2;
          while (f < line.length && line[f] !== "\x07" && !(line[f] === "\x1B" && line[f + 1] === "\\")) f++;
          o = line[f] === "\x1B" ? f + 2 : f + 1;
        } else o++;
        continue;
      }
      let g = o;
      while (o < line.length && line[o] !== "\x1B") o++;
      let spanText = line.slice(g, o);
      if (spanText) i.push({ text: spanText, color: s, bold: l });
    }
    if (i.length === 0) i.push({ text: "", color: DEFAULT_FG_RGB, bold: !1 });
    r.push(i);
  }
  return r;
}
//@ chunk-t6e3jxy0.js:1679-2159 callgraph-fingerprint = get256Color (1)
function get256Color(index) {
  if (index < 16)
    return (
      [
        { r: 0, g: 0, b: 0 },
        { r: 128, g: 0, b: 0 },
        { r: 0, g: 128, b: 0 },
        { r: 128, g: 128, b: 0 },
        { r: 0, g: 0, b: 128 },
        { r: 128, g: 0, b: 128 },
        { r: 0, g: 128, b: 128 },
        { r: 192, g: 192, b: 192 },
        { r: 128, g: 128, b: 128 },
        { r: 255, g: 0, b: 0 },
        { r: 0, g: 255, b: 0 },
        { r: 255, g: 255, b: 0 },
        { r: 0, g: 0, b: 255 },
        { r: 255, g: 0, b: 255 },
        { r: 0, g: 255, b: 255 },
        { r: 255, g: 255, b: 255 },
      ][index] || DEFAULT_FG_RGB
    );
  if (index < 232) {
    let n = index - 16,
      floored = Math.floor(n / 36),
      floored_2 = Math.floor((n % 36) / 6),
      s = n % 6;
    return {
      r: floored === 0 ? 0 : 55 + floored * 40,
      g: floored_2 === 0 ? 0 : 55 + floored_2 * 40,
      b: s === 0 ? 0 : 55 + s * 40,
    };
  }
  let r = (index - 232) * 10 + 8;
  return { r, g: r, b: r };
}

export { DEFAULT_BG_RGB, parseAnsi };
