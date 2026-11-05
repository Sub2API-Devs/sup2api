/**
 * plugins/bundled/mermaid/boxCanvas.ts
 *
 * 2.1.316 新增：mermaid 插件用的字符画布（可画文本与带圆角、样式、链接的方框）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-q80fh8vc.js (3)
 * attribution: placement 3
 */
import { segmentGraphemesWithWidth, linkCells, textDisplayWidth } from "../../../ink/graphemeCells.js";

//@ chunk-q80fh8vc.js:8700-8857 placement (2.1.88 match: styledCharsWithGraphemeClustering, 0.365)
function createBoxCanvas(chars, stylePool) {
  let size = chars * stylePool;
  return {
    width: chars,
    height: stylePool,
    links: new Uint8Array(size),
    styles: new Uint8Array(size),
    rounded: new Uint8Array(size),
    glyphs: Array.from({
      length: size,
    }),
  };
}
//@ chunk-q80fh8vc.js:9449-9751 placement (2.1.88 match: unionRect, 0.809)
function drawCanvasText(canvas, at, text) {
  if (at.y < 0 || at.y >= canvas.height) return;
  let x = at.x;
  for (let grapheme of segmentGraphemesWithWidth(text)) {
    let fits = x >= 0 && x + grapheme.width <= canvas.width;
    if (fits && grapheme.width > 0) {
      canvas.glyphs[at.y * canvas.width + x] = grapheme.text;
      for (let k = 1; k < grapheme.width; k++) canvas.glyphs[at.y * canvas.width + x + k] = "";
    } else if (fits && x > at.x) {
      let index = at.y * canvas.width + x - 1;
      canvas.glyphs[index] = (canvas.glyphs[index] ?? "") + grapheme.text;
    }
    x += grapheme.width;
  }
}
//@ chunk-q80fh8vc.js:9751-10242 placement (2.1.88 match: clearRegion, 0.37)
function drawCanvasBox(boxCanvas, box, lines, isRounded) {
  let right = box.x + box.width - 1;
  let bottom = box.y + box.height - 1;
  for (let x = box.x; x < right; x++) {
    linkCells(
      boxCanvas,
      {
        x,
        y: box.y,
      },
      {
        x: x + 1,
        y: box.y,
      },
    );
    linkCells(
      boxCanvas,
      {
        x,
        y: bottom,
      },
      {
        x: x + 1,
        y: bottom,
      },
    );
  }
  for (let y = box.y; y < bottom; y++) {
    linkCells(
      boxCanvas,
      {
        x: box.x,
        y,
      },
      {
        x: box.x,
        y: y + 1,
      },
    );
    linkCells(
      boxCanvas,
      {
        x: right,
        y,
      },
      {
        x: right,
        y: y + 1,
      },
    );
  }
  for (let k = box.y + 1; k < bottom; k++)
    for (let k_2 = box.x + 1; k_2 < right; k_2++) boxCanvas.glyphs[k * boxCanvas.width + k_2] = " ";
  if (isRounded)
    for (let [x, y] of [
      [box.x, box.y],
      [right, box.y],
      [box.x, bottom],
      [right, bottom],
    ])
      boxCanvas.rounded[y * boxCanvas.width + x] = 1;
  let top = box.y + Math.floor((box.height - lines.length) / 2);
  lines.forEach((line, index) => {
    let left = box.x + Math.floor((box.width - textDisplayWidth(line)) / 2);
    drawCanvasText(
      boxCanvas,
      {
        x: left,
        y: top + index,
      },
      line,
    );
  });
}
export { createBoxCanvas, drawCanvasBox, drawCanvasText };
