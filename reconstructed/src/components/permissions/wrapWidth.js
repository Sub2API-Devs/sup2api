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
/**
 * 导出值：MAX_VISIBLE_ITEMS（8：列表/应用数超过该值即折叠）。
 */
var MAX_VISIBLE_ITEMS = 8;
//@ chunk-y6209p35.js:201-329 placement
/**
 * 按显示宽度把字符序列切分成多行。
 */
function wrapByWidth(o, u) {
  let e = [];
  let n = "";
  let t = 0;
  for (let r of o) {
    let s = charWidth(r);
    if (t + s > u && n !== "") {
      e.push(n);
      n = "";
      t = 0;
    }
    n += r;
    t += s;
  }
  e.push(n);
  return e;
}
//@ chunk-y6209p35.js:329-377 placement
function charWidth(o) {
  return o.length === 1 && o < "\x80" ? 1 : 2;
}
export { MAX_VISIBLE_ITEMS, wrapByWidth };
