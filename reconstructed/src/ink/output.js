/**
 * ink/output.ts
 *
 * Output：渲染期操作队列（write/blit/clip/clear/shift/noSelect），落到 Screen 网格；写行时调用原生 CellSegmenter
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/output.ts
 * pieces: chunk-ag5x7vhf.js (1), chunk-bfrv6ttc.js (1), chunk-bzr73sfg.js (13)
 * attribution: fingerprint 3, callgraph-fingerprint 1, sole-consumer 6, affinity 1, layout 2, file-local 2
 */
import {
  createScreenSegmenter,
  packWord1,
  resetScreen,
  SoftWrapKind,
  blitRegion,
  shiftRows,
  packSoftWrap,
  SW_ELIDED_SEP,
  copyNoSelectRegion,
  markNoSelect,
  clearNoSelect,
  paintSegments,
  cellAtIndex,
} from "./screen.js";
import { BIDI_CONTROL_RANGES } from "./render-border.js";
import { kBe } from "./colorize.js";
import { a2t } from "./terminalImages.js";
import { DEFAULT_TAB_WIDTH } from "./wrapAnsi.js";
import { dropItalicIfStandout, downgradeTrueColorCodes } from "./terminalColorSupport.js";
import { needsBidiReorder } from "./bidi.js";
import { unionRect } from "./layout/geometry.js";
import { hd } from "./layout/node.js";
import { logForDebugging } from "../utils/debug.js";
import { LINK_END, link } from "./termio/osc.js";
import { RESET } from "./outputReplay.js";
import { getGraphemeSegmenter } from "../utils/intl.js";

//@ chunk-bzr73sfg.js:276084-276116 sole-consumer
var RUN_SHIFT = 10,
  WIDTH_BITS = 255,
  TAB_FLAG = 256,
  MAX_SGR_KEYS_BEFORE_RESET = 2048;
/**
 * Output 的行切分器，包装原生 Bun.ant.CellSegmenter：segment(text, reorder) 把带 ANSI 的一行切成字素格（cells：[字素下标, 宽度|制表符位|段号<<10]）与样式/链接段（runs：[sgr 键下标, uri 下标]）；width() 算显示宽度（制表位展开）；keepColumns() 只保留裁剪区内的格；paint() 调原生 paint 把格写进屏幕，字素用 charIndices() 映射到屏幕字符池、样式段用 runWords() 映射成 packWord1（SGR 键 → AnsiCode → StylePool id，链接 → 超链接池）。原生驻留表过大或样式池/chalk 换代时重建。
 */
//@ chunk-bzr73sfg.js:276116-279287 sole-consumer
class LineCellSegmenter {
  stylePool;
  charPool;
  native = createScreenSegmenter(BIDI_CONTROL_RANGES);
  cells = new Int32Array(512);
  runs = new Int32Array(512);
  count = 0;
  reordered = !1;
  graphemes = this.native.graphemes;
  sgrKeys = this.native.sgrKeys;
  sgrCloseKeys = this.native.sgrCloseKeys;
  uris = this.native.uris;
  charMap = new Int32Array(256);
  charMapLength = 0;
  styleIds = new Int32Array(64);
  styleGeneration;
  chalkGeneration = kBe();
  linkIds = new Int32Array(16);
  hyperlinkPool;
  words = new Int32Array(64);
  constructor(stylePool, charPool) {
    this.stylePool = stylePool;
    this.charPool = charPool;
    this.styleGeneration = stylePool.generation;
  }
  segment(n, u) {
    if (this.sgrKeys.length > a2t || this.uris.length > a2t || this.graphemes.length > 4 * a2t)
      this.resetNative();
    this.refreshGenerations();
    let segment = this.native.segment(n, this.cells, this.runs, u);
    if (segment < 0) {
      let max = Math.max(-segment, this.cells.length);
      ((this.cells = new Int32Array(2 * max)),
        (this.runs = new Int32Array(2 * max)),
        (segment = this.native.segment(n, this.cells, this.runs, u)));
    }
    return ((this.count = segment), (this.reordered = u), segment);
  }
  width(n, u, f) {
    let segment = this.segment(n, f),
      p = u;
    for (let g = 0; g < segment; g++) {
      let E = this.cells[2 * g + 1];
      p += (E & TAB_FLAG) !== 0 ? DEFAULT_TAB_WIDTH - (p % DEFAULT_TAB_WIDTH) : E & WIDTH_BITS;
    }
    return p - u;
  }
  keepColumns(n, u, f) {
    let m = n,
      max = Math.max(n, u),
      g = 0;
    for (let E = 0; E < this.count; E++) {
      let T = this.cells[2 * E + 1],
        A = m + ((T & TAB_FLAG) !== 0 ? DEFAULT_TAB_WIDTH - (m % DEFAULT_TAB_WIDTH) : T & WIDTH_BITS);
      if (m >= u && m < f && A <= f) {
        if (g === 0) max = m;
        ((this.cells[2 * g] = this.cells[2 * E]), (this.cells[2 * g + 1] = T), g++);
      }
      m = A;
    }
    return ((this.count = g), max);
  }
  trailingSpaces() {
    let n = 0;
    while (n < this.count && this.graphemes[this.cells[2 * (this.count - 1 - n)]] === " ") n++;
    return n;
  }
  charIndices() {
    let graphemes = this.graphemes;
    if (this.charMapLength < graphemes.length) {
      this.charMap = growInt32Array(this.charMap, graphemes.length, this.charMapLength);
      for (let charMapLength = this.charMapLength; charMapLength < graphemes.length; charMapLength++)
        this.charMap[charMapLength] = this.charPool.intern(graphemes[charMapLength]);
      this.charMapLength = graphemes.length;
    }
    return this.charMap;
  }
  runWords(n) {
    let count = this.count;
    if (count === 0) return this.words;
    if (this.hyperlinkPool !== n) ((this.hyperlinkPool = n), this.linkIds.fill(0));
    let f = this.cells[2 * count - 1] >>> RUN_SHIFT;
    if (this.reordered) for (let p = 0; p < count; p++) f = Math.max(f, this.cells[2 * p + 1] >>> RUN_SHIFT);
    let m = f + 1;
    this.words = growInt32Array(this.words, m, 0);
    for (let p = 0; p < m; p++) {
      let g = this.runs[2 * p + 1],
        E = 0;
      if (g !== 0) {
        if (
          ((this.linkIds = growInt32Array(this.linkIds, g + 1, this.linkIds.length)),
          (E = this.linkIds[g]),
          E === 0)
        )
          ((E = n.intern(this.uris[g]) + 1), (this.linkIds[g] = E));
        E -= 1;
      }
      this.words[p] = packWord1(this.styleId(this.runs[2 * p]), E, 0);
    }
    return this.words;
  }
  paint(n, u, f, m, p) {
    return this.native.paint(
      n,
      u,
      f,
      m,
      this.cells,
      this.count,
      void 0,
      this.charIndices(),
      this.runWords(p),
    );
  }
  refreshGenerations() {
    let n = kBe();
    if (this.stylePool.generation === this.styleGeneration && n === this.chalkGeneration) return;
    if (
      ((this.styleGeneration = this.stylePool.generation),
      (this.chalkGeneration = n),
      this.sgrKeys.length > MAX_SGR_KEYS_BEFORE_RESET)
    )
      this.resetNative();
    else this.styleIds.fill(0);
  }
  resetNative() {
    ((this.native = createScreenSegmenter(BIDI_CONTROL_RANGES)),
      (this.graphemes = this.native.graphemes),
      (this.sgrKeys = this.native.sgrKeys),
      (this.sgrCloseKeys = this.native.sgrCloseKeys),
      (this.uris = this.native.uris),
      (this.charMapLength = 0),
      this.linkIds.fill(0),
      (this.styleIds = new Int32Array(64)));
  }
  styleId(n) {
    this.styleIds = growInt32Array(this.styleIds, n + 1, this.styleIds.length);
    let u = this.styleIds[n];
    if (u === 0)
      ((u = this.stylePool.intern(dropItalicIfStandout(downgradeTrueColorCodes(this.ansiCodes(n)))) + 1),
        (this.styleIds[n] = u));
    return u - 1;
  }
  ansiCodes(n) {
    if (n === 0) return [];
    let parts = this.sgrKeys[n].split("\x00"),
      parts_2 = this.sgrCloseKeys[n].split("\x00"),
      m = [];
    for (let p = 0; p < parts.length; p++) {
      let g = parts[p];
      if (SGR_CODE_RE.test(g)) m.push({ type: "ansi", code: g, endCode: parts_2[p] });
    }
    return m;
  }
}
//@ chunk-bzr73sfg.js:279287-279359 sole-consumer
var SGR_CODE_RE = /^\x1b\[(?:\d{1,3})(?:;5;\d{1,3}|;2;\d{1,3};\d{1,3};\d{1,3})?m$/;
//@ chunk-bzr73sfg.js:279359-279505 sole-consumer
function growInt32Array(array, minLength, keep) {
  if (array.length >= minLength) return array;
  let int32Array = new Int32Array(Math.max(minLength, 2 * array.length));
  if (keep > 0) int32Array.set(array.subarray(0, Math.min(keep, array.length)));
  return int32Array;
}
//@ chunk-bzr73sfg.js:279505-279540 affinity
var DIRECTION_MARKS = { ltr: "\u200E", rtl: "\u200F" };
/**
 * 两个裁剪矩形求交（未定义的边视为无限）。
 */
//@ chunk-bzr73sfg.js:279540-279648 fingerprint = intersectClip (1)
function intersectClip(parent, child) {
  if (!parent) return child;
  return {
    x1: maxDefined(parent.x1, child.x1),
    x2: minDefined(parent.x2, child.x2),
    y1: maxDefined(parent.y1, child.y1),
    y2: minDefined(parent.y2, child.y2),
  };
}
//@ chunk-bzr73sfg.js:279648-279900 layout = intersectClip (0.795)
function isClipRedundant(outerClip, clip, rect) {
  if (clip === void 0) return !0;
  let m = maxDefined(outerClip?.x1, rect?.x) ?? -1 / 0,
    p = maxDefined(outerClip?.y1, rect?.y) ?? -1 / 0,
    g = minDefined(outerClip?.x2, rect && rect.x + rect.width) ?? 1 / 0,
    E = minDefined(outerClip?.y2, rect && rect.y + rect.height) ?? 1 / 0;
  if (m >= g || p >= E) return !0;
  return (
    m >= (clip.x1 ?? -1 / 0) && g <= (clip.x2 ?? 1 / 0) && p >= (clip.y1 ?? -1 / 0) && E <= (clip.y2 ?? 1 / 0)
  );
}
//@ chunk-bzr73sfg.js:279900-279984 file-local
function maxDefined(a, b) {
  if (a === void 0) return b;
  if (b === void 0) return a;
  return Math.max(a, b);
}
//@ chunk-bzr73sfg.js:279984-280068 file-local
function minDefined(a, b) {
  if (a === void 0) return b;
  if (b === void 0) return a;
  return Math.min(a, b);
}
//@ chunk-bzr73sfg.js:280068-280078 layout
var NO_ABSOLUTE_CLEARS = [];
/**
 * 渲染操作缓冲：renderNodeToOutput 往里记 write/blit/shift/clear/clip/noSelect 操作，get() 依次落到屏幕：clear 只扩大 damage（绝对定位节点的清除会阻止被其覆盖的 blit）；blit 从上一帧拷贝未变子树；write 按裁剪区截断文字（Bun.sliceAnsi）后用 LineCellSegmenter 切分并 paint，同时写软换行标记；最后应用 noSelect。writeDirected 支持 RTL 文本右对齐。写入远多于拷贝时记日志。
 */
//@ chunk-bzr73sfg.js:280078-285029 fingerprint = Output (0.81)
class Output {
  width;
  height;
  screen;
  operations = [];
  lineCells;
  constructor(n) {
    let { width: width, height: height, stylePool: stylePool, screen: screen } = n;
    ((this.width = width),
      (this.height = height),
      (this.screen = screen),
      (this.lineCells = new LineCellSegmenter(stylePool, screen.charPool)),
      resetScreen(screen, width, height));
  }
  reset(n, u, f) {
    ((this.width = n),
      (this.height = u),
      (this.screen = f),
      (this.operations.length = 0),
      resetScreen(f, n, u));
  }
  blit(n, u, f, m, p, g) {
    this.operations.push({
      type: "blit",
      src: n,
      x: u,
      y: f,
      width: m,
      height: p,
      restoreNoSelect: g?.restoreNoSelect,
      unclipped: g?.unclipped,
    });
  }
  blitsOver(n) {
    for (let operation of this.operations)
      if (
        operation.type === "blit" &&
        operation.x < n.x + n.width &&
        n.x < operation.x + operation.width &&
        operation.y < n.y + n.height &&
        n.y < operation.y + operation.height
      )
        return !0;
    return !1;
  }
  shift(n, u, f) {
    this.operations.push({ type: "shift", top: n, bottom: u, n: f });
  }
  clear(n, u) {
    this.operations.push({ type: "clear", region: n, fromAbsolute: u });
  }
  noSelect(n) {
    this.operations.push({ type: "noSelect", region: n, value: 1 });
  }
  clearNoSelect(n) {
    this.operations.push({ type: "noSelect", region: n, value: 0 });
  }
  write(n, u, f, m) {
    if (!f) return;
    this.operations.push({ type: "write", x: n, y: u, text: f, softWrap: m });
  }
  writeDirected(n, u, f, m, p, g) {
    if (!isDirectionalWrite(p)) {
      this.write(n, u, f, m);
      return;
    }
    if (p === "ltr") {
      if (f) this.operations.push({ type: "write", x: n, y: u, text: f, softWrap: m, direction: p });
      return;
    }
    let parts = f.split(`
`),
      min = Math.min(parts.length, this.height - u);
    for (let max = Math.max(0, -u); max < min; max++) {
      let D = parts[max],
        width = this.lineCells.width(D, n, !1),
        _ = m?.[max + 1] ?? SoftWrapKind.HardBreak,
        U = _ === SoftWrapKind.HardBreak ? 0 : this.lineCells.trailingSpaces(),
        L = _ === SoftWrapKind.Continuation && U < width,
        P = width - Math.min(U, Math.max(width - g, +L));
      if (P > 0)
        this.operations.push({
          type: "write",
          x: n + Math.max(0, g - P),
          y: u + max,
          text: P < width ? Bun.sliceAnsi(D, 0, P) : D,
          direction: p,
        });
    }
  }
  paintedWidth(n, u) {
    return this.lineCells.width(n, u, needsBidiReorder());
  }
  clip(n) {
    this.operations.push({ type: "clip", clip: n });
  }
  unclip() {
    this.operations.push({ type: "unclip" });
  }
  get() {
    let screen = this.screen,
      width = this.width,
      height = this.height,
      m = 0,
      p = 0,
      g = [];
    for (let _ = 0; _ < this.operations.length; _++) {
      let U = this.operations[_];
      if (U.type !== "clear") continue;
      let { x: L, y: P, width: width_2, height: height_2 } = U.region,
        max = Math.max(0, L),
        max_2 = Math.max(0, P),
        min = Math.min(L + width_2, width),
        min_2 = Math.min(P + height_2, height);
      if (max >= min || max_2 >= min_2) continue;
      let J = { x: max, y: max_2, width: min - max, height: min_2 - max_2 };
      if (((screen.damage = screen.damage ? unionRect(screen.damage, J) : J), U.fromAbsolute))
        g.push({ rect: J, opIndex: _ });
    }
    let E = [],
      T = [];
    for (let _ = 0; _ < this.operations.length; _++) {
      let U = this.operations[_];
      switch (U.type) {
        case "clear":
          continue;
        case "clip":
          E.push(intersectClip(E.at(-1), U.clip));
          continue;
        case "unclip":
          E.pop();
          continue;
        case "blit": {
          let { src: src, x: P, y: z, width: width_2, height: height_2 } = U,
            K = U.unclipped ? void 0 : E.at(-1),
            max = Math.max(P, K?.x1 ?? 0),
            max_2 = Math.max(z, K?.y1 ?? 0),
            min = Math.min(z + height_2, height, src.height, K?.y2 ?? 1 / 0),
            min_2 = Math.min(P + width_2, width, src.width, K?.x2 ?? 1 / 0);
          if (max >= min_2 || max_2 >= min) continue;
          let ee = g.length === 0 ? NO_ABSOLUTE_CLEARS : g.filter((ne) => ne.opIndex > _);
          if (ee.length === 0) {
            if (
              (blitRegion(screen, src, max, max_2, min_2, min),
              (m += (min - max_2) * (min_2 - max)),
              U.restoreNoSelect)
            )
              T.push({ opIndex: _, src: src, x1: max, y1: max_2, x2: min_2, y2: min });
            continue;
          }
          let ae = max_2;
          for (let ne = max_2; ne <= min; ne++)
            if (
              (ne < min &&
                ee.some(
                  ({ rect: rect }) =>
                    ne >= rect.y &&
                    ne < rect.y + rect.height &&
                    max >= rect.x &&
                    min_2 <= rect.x + rect.width,
                )) ||
              ne === min
            ) {
              if (ne > ae) {
                if (
                  (blitRegion(screen, src, max, ae, min_2, ne),
                  (m += (ne - ae) * (min_2 - max)),
                  U.restoreNoSelect)
                )
                  T.push({ opIndex: _, src: src, x1: max, y1: ae, x2: min_2, y2: ne });
              }
              ae = ne + 1;
            }
          continue;
        }
        case "shift": {
          shiftRows(screen, U.top, U.bottom, U.n);
          continue;
        }
        case "write": {
          let { text: text, softWrap: softWrap, direction: direction } = U,
            { x: G, y: X } = U,
            parts = text.split(`
`),
            q = 0,
            Y = 0,
            J,
            at = E.at(-1);
          if (at) {
            let ne = typeof at?.x1 === "number" && typeof at?.x2 === "number",
              de = typeof at?.y1 === "number" && typeof at?.y2 === "number",
              se = needsBidiReorder(),
              ye = ne && isDirectionalWrite(direction);
            if (ne && G > at.x2) continue;
            if (de) {
              let ue = parts.length;
              if (X + ue < at.y1 || X > at.y2) continue;
            }
            if (ne) {
              let ue = 0,
                ce = parts.length,
                pe = X;
              if (de)
                ((ue = X < at.y1 ? at.y1 - X : 0),
                  (ce = X + parts.length > at.y2 ? at.y2 - X : ce),
                  (pe = X < at.y1 ? at.y1 : X));
              ce = Math.min(ce, ue + (height - pe));
              let Se = !1;
              if (
                ((parts = parts.map((xe, fe) => {
                  if (fe < ue - 1 || fe >= ce) return xe;
                  let ge = G < at.x1 ? at.x1 - G : 0,
                    width = this.lineCells.width(xe, G, se);
                  if (G + width >= at.x1) Se = !0;
                  if (ye || (ge === 0 && G + width <= at.x2)) return xe;
                  let Fe = hd(xe),
                    Ne = at.x2 - G,
                    sliceAnsi = Bun.sliceAnsi(Fe, ge, Ne),
                    max = Math.max(G, at.x1),
                    Ae = at.x2 - max;
                  while (Ne > ge && this.lineCells.width(sliceAnsi, max, se) > Ae)
                    (Ne--, (sliceAnsi = Bun.sliceAnsi(Fe, ge, Ne)));
                  return sliceAnsi;
                })),
                !Se)
              )
                continue;
              if (ye) J = at;
              if (G < at.x1) G = at.x1;
            }
            if (de) {
              let ue = X < at.y1 ? at.y1 - X : 0,
                ce = parts.length,
                pe = X + ce > at.y2 ? at.y2 - X : ce;
              if (softWrap && ue > 0 && (softWrap[ue] ?? SoftWrapKind.HardBreak) !== SoftWrapKind.HardBreak) {
                let Se = J ? U.x : G,
                  xe = Se + this.lineCells.width(parts[ue - 1], Se, se);
                Y = packSoftWrap(J ? Math.min(Math.max(xe, G), J.x2) : xe, G);
              }
              if (((parts = parts.slice(ue, pe)), (q = ue), X < at.y1)) X = at.y1;
            }
          }
          let softWrap_2 = screen.softWrap,
            ae = 0;
          for (let ne of parts) {
            let de = X + ae;
            if (de >= height) break;
            let se = writeLineToScreen(screen, ne, J ? U.x : G, de, this.lineCells, direction, J);
            if (((p += se - G), softWrap)) {
              let ye = softWrap[q + ae];
              ((softWrap_2[de] =
                ye === SoftWrapKind.HardBreak || ye === void 0
                  ? 0
                  : ye === SoftWrapKind.ContinuationElidedSep
                    ? Y | SW_ELIDED_SEP
                    : Y),
                (Y = packSoftWrap(se, G)));
            }
            ae++;
          }
          continue;
        }
      }
    }
    let A = [],
      D = 0;
    for (let _ = 0; _ < this.operations.length; _++) {
      let U = this.operations[_];
      if (U.type === "clip") A.push(intersectClip(A.at(-1), U.clip));
      else if (U.type === "unclip") A.pop();
      else if (U.type === "blit")
        while (D < T.length && T[D].opIndex === _) {
          let { src: src, x1: x1, y1: y1, x2: x2, y2: y2 } = T[D];
          (copyNoSelectRegion(screen, src, x1, y1, x2, y2), D++);
        }
      else if (U.type === "noSelect") {
        let { x: L, y: P, width: width, height: height } = U.region,
          at = A.at(-1),
          max = Math.max(L, at?.x1 ?? 0),
          max_2 = Math.max(P, at?.y1 ?? 0),
          min = Math.min(L + width, at?.x2 ?? 1 / 0),
          min_2 = Math.min(P + height, at?.y2 ?? 1 / 0);
        if (min > max && min_2 > max_2)
          if (U.value === 1) markNoSelect(screen, max, max_2, min - max, min_2 - max_2);
          else clearNoSelect(screen, max, max_2, min - max, min_2 - max_2);
      }
    }
    let O = m + p;
    if (O > 1000 && p > m)
      logForDebugging(
        `High write ratio: blit=${m}, write=${p} (${((p / O) * 100).toFixed(1)}% writes), screen=${height}x${width}`,
      );
    return screen;
  }
}
//@ chunk-bzr73sfg.js:285029-285068 sole-consumer
function isDirectionalWrite(direction) {
  return direction !== void 0 && needsBidiReorder();
}
/**
 * 把一行写进屏幕：有方向时前置 LRM/RLM，交给 LineCellSegmenter 切分（必要时双向重排），按裁剪区保留列，paint 后返回结束列。
 */
//@ chunk-bzr73sfg.js:285068-285211 sole-consumer
function writeLineToScreen(screen, line, x, y, segmenter, direction, clip) {
  let T = isDirectionalWrite(direction) ? DIRECTION_MARKS[direction] + line : line;
  if ((segmenter.segment(T, needsBidiReorder()), clip !== void 0))
    x = segmenter.keepColumns(x, clip.x1, clip.x2);
  return segmenter.count === 0 ? x : paintSegments(screen, x, y, segmenter);
}
/**
 * 把屏幕的一行转回带样式与超链接的 ANSI 字符串（跳过占位格，去掉行尾无效空格），renderToScreen 用来把离屏渲染结果变成文本行。
 */
//@ chunk-ag5x7vhf.js:17851-18348 fingerprint = writeLineToScreen (0.806)
function serializeScreenRow(screen, stylePool, row) {
  let width = screen.width,
    k = row * width,
    _ = -1;
  for (let L = width - 1; L >= 0; L--) {
    let V = cellAtIndex(screen, k + L);
    if (V.width === 2) continue;
    if (V.char === " " && (V.styleId & 1) === 0 && V.hyperlink === void 0) continue;
    _ = L;
    break;
  }
  if (_ < 0) return "";
  let I = "",
    none = stylePool.none,
    A;
  for (let L = 0; L <= _; L++) {
    let V = cellAtIndex(screen, k + L);
    if (V.width === 2 || V.width === 3) continue;
    if (V.hyperlink !== A) {
      if (A !== void 0) I += LINK_END;
      if (V.hyperlink !== void 0) I += link(V.hyperlink);
      A = V.hyperlink;
    }
    ((I += stylePool.transition(none, V.styleId)), (none = V.styleId), (I += V.char));
  }
  if (A !== void 0) I += LINK_END;
  if (none !== stylePool.none) I += RESET;
  return I;
}
//@ chunk-bfrv6ttc.js:567-648 callgraph-fingerprint = flushBuffer (0.346)
function countGraphemes(e) {
  if (!e) return 0;
  let t = 0;
  for (let r of getGraphemeSegmenter().segment(e)) t++;
  return t;
}

export { countGraphemes, serializeScreenRow, Output, intersectClip, isClipRedundant };
