/**
 * plugins/bundled/mermaid/boxCanvas.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-yb0ajcmt.js (3)
 * attribution: placement 3
 */
import { segmentGraphemesWithWidth, linkCells, A } from "../../../ink/graphemeCells.js";

//@ chunk-yb0ajcmt.js:8392-8549 placement = styledCharsWithGraphemeClustering (0.365)
function createBoxCanvas(chars, stylePool) {
  let n = chars * stylePool;
  return {
    width: chars,
    height: stylePool,
    links: new Uint8Array(n),
    styles: new Uint8Array(n),
    rounded: new Uint8Array(n),
    glyphs: Array.from({ length: n }),
  };
}
//@ chunk-yb0ajcmt.js:9141-9443 placement = unionRect (0.809)
function drawCanvasText(e, t, n) {
  if (t.y < 0 || t.y >= e.height) return;
  let o = t.x;
  for (let i of segmentGraphemesWithWidth(n)) {
    let u = o >= 0 && o + i.width <= e.width;
    if (u && i.width > 0) {
      e.glyphs[t.y * e.width + o] = i.text;
      for (let r = 1; r < i.width; r++) e.glyphs[t.y * e.width + o + r] = "";
    } else if (u && o > t.x) {
      let r = t.y * e.width + o - 1;
      e.glyphs[r] = (e.glyphs[r] ?? "") + i.text;
    }
    o += i.width;
  }
}
//@ chunk-yb0ajcmt.js:9443-9934 placement = clearRegion (0.37)
function drawCanvasBox(e, t, n, o) {
  let i = t.x + t.width - 1,
    u = t.y + t.height - 1;
  for (let s = t.x; s < i; s++)
    (linkCells(e, { x: s, y: t.y }, { x: s + 1, y: t.y }), linkCells(e, { x: s, y: u }, { x: s + 1, y: u }));
  for (let s = t.y; s < u; s++)
    (linkCells(e, { x: t.x, y: s }, { x: t.x, y: s + 1 }), linkCells(e, { x: i, y: s }, { x: i, y: s + 1 }));
  for (let s = t.y + 1; s < u; s++) for (let l = t.x + 1; l < i; l++) e.glyphs[s * e.width + l] = " ";
  if (o)
    for (let [s, l] of [
      [t.x, t.y],
      [i, t.y],
      [t.x, u],
      [i, u],
    ])
      e.rounded[l * e.width + s] = 1;
  let r = t.y + Math.floor((t.height - n.length) / 2);
  n.forEach((s, l) => {
    let a = t.x + Math.floor((t.width - A(s)) / 2);
    drawCanvasText(e, { x: a, y: r + l }, s);
  });
}

export { createBoxCanvas, drawCanvasBox, drawCanvasText };
