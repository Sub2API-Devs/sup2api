/**
 * components/permissions/wrapWidth.ts
 *
 * 2.1.316 新增：按显示宽度换行
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-y6209p35.js (3)
 * attribution: placement 3
 */

//@ chunk-y6209p35.js:191-201 placement
var yce = 8;
/**
 * 按显示宽度把字符序列切分成多行。
 */
//@ chunk-y6209p35.js:201-329 placement
function wrapByWidth(o, u) {
  let e = [],
    n = "",
    t = 0;
  for (let r of o) {
    let s = l(r);
    if (t + s > u && n !== "") (e.push(n), (n = ""), (t = 0));
    ((n += r), (t += s));
  }
  return (e.push(n), e);
}
//@ chunk-y6209p35.js:329-377 placement
function l(o) {
  return o.length === 1 && o < "\x80" ? 1 : 2;
}

export { yce, wrapByWidth };
