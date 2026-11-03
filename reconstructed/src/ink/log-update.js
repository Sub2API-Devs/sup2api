/**
 * ink/log-update.ts
 *
 * LogUpdate：把新帧与上一帧逐行逐格 diff 成 Patch 列表（光标移动、样式切换、超链接、清行、滚动区域提示）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/log-update.ts
 * pieces: chunk-bzr73sfg.js (12)
 * attribution: fingerprint 10, callgraph-witnessed 2
 */
import {
  eraseToEndOfLine,
  setScrollRegion,
  scrollUp,
  scrollDown,
  RESET_SCROLL_REGION,
  CURSOR_HOME,
} from "./termio/csi.js";
import {
  cellAt,
  screensEqual,
  shiftRows,
  diffEach,
  isEmptyCellAt,
  charInCellAt,
  visibleCellAtIndex,
  isMultiCodeUnitGrapheme,
} from "./screen.js";
import { LINK_END, link } from "./termio/osc.js";
import { logForDebugging } from "../utils/debug.js";
import { bunStringWidth } from "./stringWidth.js";
import { repeatString } from "../utils/stringUtils.js";

/**
 * 帧内容高度是否已达到/超过视口高度（主屏模式下内容会进入回滚区）。
 */
//@ chunk-bzr73sfg.js:253719-253776 fingerprint = renderFrame (0.771)
function isFrameOverflowing(frame) {
  return frame.screen.height >= frame.viewport.height;
}
//@ chunk-bzr73sfg.js:258955-259050 fingerprint = CARRIAGE_RETURN (0.73)
var CARRIAGE_RETURN = { type: "carriageReturn" },
  NEWLINE = {
    type: "stdout",
    content: `
`,
  },
  ERASE_TO_EOL_PATCH = { type: "stdout", content: eraseToEndOfLine() };
/**
 * 增量输出：render(prev, next, altScreen, decstbmAllowed) 比较两帧屏幕，产出 Patch 列表（stdout 文字、styleStr、hyperlink、cursorMove/cursorTo、clear、clearTerminal…）。非 TTY 时整帧输出；视口变小/宽度变化/内容缩到视口以内等情况整屏重置（clearTerminal，会闪）；有 scrollHint 且允许 DECSTBM 时先用滚动区域把旧帧行上移/下移再 diff；diff 时跳过宽字符占位格，行尾空白用 EL 清除；改动落在已滚入回滚区的行上时只能整屏重置。慢于 50ms 记日志。
 */
//@ chunk-bzr73sfg.js:259050-263509 fingerprint = LogUpdate (0.962)
class LogUpdate {
  options;
  state;
  constructor(options) {
    this.options = options;
    this.state = { previousOutput: "" };
  }
  renderPreviousOutput_DEPRECATED(n) {
    if (!this.options.isTTY) return [NEWLINE];
    return this.getRenderOpsForDone(n);
  }
  reset() {
    ((this.state.previousOutput = ""), (this.forceReset = !1), (this.scrolledOutRows = new WeakMap()));
  }
  scrolledOutRows = new WeakMap();
  scrolledOutRowsOf(n) {
    return this.scrolledOutRows.get(n);
  }
  forceReset = !1;
  forceFullReset() {
    this.forceReset = !0;
  }
  renderFullFrame(n) {
    let { screen: screen } = n,
      { stylePool: stylePool } = this.options,
      m = [],
      none = stylePool.none,
      g = void 0;
    for (let E = 0; E < screen.height; E++) {
      let T = "";
      for (let A = 0; A < screen.width; A++) {
        let D = cellAt(screen, A, E);
        if (D && D.width !== 2) {
          if (D.hyperlink !== g) {
            if (g !== void 0) T += LINK_END;
            if (D.hyperlink !== void 0) T += link(D.hyperlink);
            g = D.hyperlink;
          }
          let transition = stylePool.transition(none, D.styleId);
          if (transition.length > 0) ((T += transition), (none = D.styleId));
          T += D.char;
        }
      }
      if (g !== void 0) ((T += LINK_END), (g = void 0));
      ((T += stylePool.transition(none, stylePool.none)), (none = stylePool.none), m.push(T.trimEnd()));
    }
    if (m.length === 0) return [];
    return [
      {
        type: "stdout",
        content: m.join(`
`),
      },
    ];
  }
  getRenderOpsForDone(n) {
    if (((this.state.previousOutput = ""), !n.cursor.visible)) return [{ type: "cursorShow" }];
    return [];
  }
  render(n, u, f = !1, m = !0) {
    if (!this.options.isTTY) {
      if (screensEqual(n.screen, u.screen)) return [];
      return this.renderFullFrame(u);
    }
    let startTime = performance.now(),
      stylePool = this.options.stylePool,
      T = n.cursor.y >= n.screen.height && isFrameOverflowing(n),
      max = Math.max(0, n.screen.height - Math.min(n.viewport.height, u.viewport.height)),
      D = isFrameOverflowing(n) ? 1 : 0,
      O = max + D;
    if (this.forceReset)
      return ((this.forceReset = !1), fullResetSequence_CAUSES_FLICKER(u, "clear", stylePool, f, O));
    if (
      u.viewport.height < n.viewport.height ||
      (u.viewport.height > n.viewport.height && T) ||
      (n.viewport.width !== 0 && u.viewport.width !== n.viewport.width)
    )
      return fullResetSequence_CAUSES_FLICKER(u, "resize", stylePool, f, O);
    let _ = [];
    if (f && u.scrollHint && m) {
      let { bottom: bottom, delta: delta } = u.scrollHint,
        max = Math.max(u.scrollHint.top, 1);
      if (max < bottom && bottom < n.screen.height && bottom < u.screen.height)
        (shiftRows(n.screen, max, bottom, delta),
          (_ = [
            {
              type: "stdout",
              content:
                setScrollRegion(max + 1, bottom + 1) +
                (delta > 0 ? scrollUp(delta) : scrollDown(-delta)) +
                RESET_SCROLL_REGION +
                CURSOR_HOME,
            },
          ]));
    }
    let U = u.screen.height < n.screen.height,
      L = u.screen.height <= n.viewport.height;
    if (T && L && U)
      return (
        logForDebugging(
          `Full reset (shrink->below): prevHeight=${n.screen.height}, nextHeight=${u.screen.height}, viewport=${n.viewport.height}`,
        ),
        fullResetSequence_CAUSES_FLICKER(u, "offscreen", stylePool, f, O)
      );
    let P = new VirtualScreen(n.cursor, u.viewport.width),
      z = Math.max(u.screen.height, 1) - Math.max(n.screen.height, 1),
      G = z < 0,
      X = z > 0;
    if (G) {
      let ce = n.screen.height - u.screen.height;
      if (ce > n.viewport.height)
        return fullResetSequence_CAUSES_FLICKER(u, "offscreen", this.options.stylePool, f, O);
      P.txn((pe) => [
        [
          { type: "clear", count: ce },
          { type: "cursorMove", x: 0, y: -1 },
        ],
        { dx: -pe.x, dy: -ce },
      ]);
    }
    let K = T ? 1 : 0,
      max_2 = Math.max(
        X
          ? n.screen.height - n.viewport.height + K
          : Math.max(n.screen.height, u.screen.height) - u.viewport.height + K,
        this.scrolledOutRows.get(n) ?? 0,
      ),
      Y = u.screen.height - u.viewport.height + 1,
      none = stylePool.none,
      V = void 0,
      ee = -1,
      ae = -1,
      ne = !1,
      de = !1,
      se = !1,
      ye = -1;
    if (
      (diffEach(n.screen, u.screen, (ce, pe, Se, xe) => {
        if (X && pe >= n.screen.height) return;
        if (xe && xe.width === 2) return;
        if (xe && xe.width === 3 && isEmptyCellAt(n.screen, ce, pe)) return;
        if (Se && (Se.width === 2 || Se.width === 3) && !xe) return;
        if (xe && isEmptyCellAt(u.screen, ce, pe) && !Se) return;
        if (pe < max_2) {
          if (f || G || pe >= Y) return ((se = !0), (ye = pe), !0);
          return;
        }
        if (pe !== ee)
          ((V = transitionHyperlink(P.diff, V, void 0)), (ee = pe), (ae = -1), (ne = !1), (de = !1));
        if (Se && isEmptyCellAt(u.screen, ce, pe)) {
          if (!ne) {
            if (((ne = !0), pe < u.screen.height)) {
              for (let fe = u.screen.width - 1; fe > ce; fe--)
                if (!isEmptyCellAt(u.screen, fe, pe)) {
                  ae = fe;
                  break;
                }
            }
          }
          if (ce > ae) {
            if (de) return;
            ((de = !0), moveCursorTo(P, ce, pe));
            let fe = none,
              ge = V;
            ((none = stylePool.none),
              (V = void 0),
              P.txn(() => {
                let we = [];
                return (
                  transitionStyle(we, stylePool, fe, stylePool.none),
                  transitionHyperlink(we, ge, void 0),
                  we.push(ERASE_TO_EOL_PATCH),
                  [we, { dx: 0, dy: 0 }]
                );
              }));
            return;
          }
        }
        if ((moveCursorTo(P, ce, pe), xe)) {
          let hyperlink = xe.hyperlink;
          V = transitionHyperlink(P.diff, V, hyperlink);
          let transition = stylePool.transition(none, xe.styleId);
          if (writeCellWithStyleStr(P, xe, transition)) none = xe.styleId;
        } else if (Se) {
          let fe = none,
            ge = V;
          ((none = stylePool.none),
            (V = void 0),
            P.txn(() => {
              let we = [];
              return (
                transitionStyle(we, stylePool, fe, stylePool.none),
                transitionHyperlink(we, ge, void 0),
                we.push({ type: "stdout", content: " " }),
                [we, { dx: 1, dy: 0 }]
              );
            }));
        }
      }),
      se)
    )
      return fullResetSequence_CAUSES_FLICKER(u, "offscreen", stylePool, f, O, {
        triggerY: ye,
        prevLine: readLine(n.screen, ye),
        nextLine: readLine(u.screen, ye),
      });
    if (
      ((none = transitionStyle(P.diff, stylePool, none, stylePool.none)),
      (V = transitionHyperlink(P.diff, V, void 0)),
      X)
    )
      renderFrameSlice(P, u, n.screen.height, u.screen.height, stylePool);
    if (f);
    else if (u.cursor.y >= u.screen.height)
      P.txn((ce) => {
        let pe = u.cursor.y - ce.y;
        if (pe > 0) {
          let xe = Array(1 + pe);
          xe[0] = CARRIAGE_RETURN;
          for (let fe = 0; fe < pe; fe++) xe[1 + fe] = NEWLINE;
          return [xe, { dx: -ce.x, dy: pe }];
        }
        let Se = u.cursor.y - ce.y;
        if (Se !== 0 || ce.x !== u.cursor.x) {
          let xe = [CARRIAGE_RETURN];
          return (
            xe.push({ type: "cursorMove", x: u.cursor.x, y: Se }),
            [xe, { dx: u.cursor.x - ce.x, dy: Se }]
          );
        }
        return [[], { dx: 0, dy: 0 }];
      });
    else moveCursorTo(P, u.cursor.x, u.cursor.y);
    if (max_2 > 0) this.scrolledOutRows.set(u, max_2);
    let ue = performance.now() - startTime;
    if (ue > 50) {
      let damage = u.screen.damage,
        pe = damage ? `${damage.width}x${damage.height} at (${damage.x},${damage.y})` : "none";
      logForDebugging(
        `Slow render: ${ue.toFixed(1)}ms, screen: ${u.screen.height}x${u.screen.width}, damage: ${pe}, changes: ${P.diff.length}`,
      );
    }
    return _.length > 0 ? [..._, ...P.diff] : P.diff;
  }
}
/**
 * 超链接切换：目标与当前不同时追加 hyperlink 补丁（OSC 8），返回新的当前链接。
 */
//@ chunk-bzr73sfg.js:263509-263592 fingerprint = transitionHyperlink (1)
function transitionHyperlink(diff, current, target) {
  if (current !== target) return (diff.push({ type: "hyperlink", uri: target ?? "" }), target);
  return current;
}
/**
 * 样式切换：追加 StylePool.transition 给出的 SGR 串，返回目标 styleId。
 */
//@ chunk-bzr73sfg.js:263592-263692 fingerprint = transitionStyle (1)
function transitionStyle(diff, stylePool, currentId, targetId) {
  let str = stylePool.transition(currentId, targetId);
  if (str.length > 0) diff.push({ type: "styleStr", str: str });
  return targetId;
}
/**
 * 读屏幕一行的纯文本（去尾部空白），用于整屏重置的调试信息。
 */
//@ chunk-bzr73sfg.js:263692-263781 callgraph-witnessed = readLine (1)
function readLine(screen, y) {
  let line = "";
  for (let m = 0; m < screen.width; m++) line += charInCellAt(screen, m, y) ?? " ";
  return line.trimEnd();
}
/**
 * 整屏重置：先发 clearTerminal（带原因 resize/offscreen/clear），再从 startY 起完整重画帧（主屏时只画最后一屏可见部分）。会闪烁，尽量避免。
 */
//@ chunk-bzr73sfg.js:263781-264043 fingerprint = fullResetSequence_CAUSES_FLICKER (0.766)
function fullResetSequence_CAUSES_FLICKER(frame, reason, stylePool, altScreen, scrolledRows, debug) {
  let startY = altScreen
      ? 0
      : Math.min(scrolledRows, Math.max(0, frame.screen.height - frame.viewport.height + 1)),
    screen = new VirtualScreen({ x: 0, y: startY }, frame.viewport.width);
  return (
    renderFrameSlice(screen, frame, startY, frame.screen.height, stylePool),
    [
      {
        type: "clearTerminal",
        reason: reason,
        altScreen: altScreen,
        viewportRows: frame.viewport.height,
        debug: debug,
      },
      ...screen.diff,
    ]
  );
}
/**
 * 把帧的 [startY,endY) 行完整写进虚拟屏幕：逐格移动光标、切换链接与样式、写字符（跳过空白），每行结束复位样式并换行。
 */
//@ chunk-bzr73sfg.js:264043-264620 fingerprint = renderFrameSlice (1)
function renderFrameSlice(screen, frame, startY, endY, stylePool) {
  let currentStyleId = stylePool.none,
    E = void 0,
    lastRenderedStyleId = -1,
    { width: screenWidth, cells: cells, charPool: charPool, hyperlinkPool: hyperlinkPool } = frame.screen,
    U = startY * screenWidth;
  for (let L = startY; L < endY; L += 1) {
    if (screen.cursor.y < L) {
      let P = L - screen.cursor.y;
      screen.txn((prev) => {
        let G = Array(1 + P);
        G[0] = CARRIAGE_RETURN;
        for (let X = 0; X < P; X++) G[1 + X] = NEWLINE;
        return [G, { dx: -prev.x, dy: P }];
      });
    }
    lastRenderedStyleId = -1;
    for (let P = 0; P < screenWidth; P += 1, U += 1) {
      let cell = visibleCellAtIndex(cells, charPool, hyperlinkPool, U, lastRenderedStyleId);
      if (!cell) continue;
      moveCursorTo(screen, P, L);
      let targetHyperlink = cell.hyperlink;
      E = transitionHyperlink(screen.diff, E, targetHyperlink);
      let styleStr = stylePool.transition(currentStyleId, cell.styleId);
      if (writeCellWithStyleStr(screen, cell, styleStr))
        ((currentStyleId = cell.styleId), (lastRenderedStyleId = cell.styleId));
    }
    ((currentStyleId = transitionStyle(screen.diff, stylePool, currentStyleId, stylePool.none)),
      (E = transitionHyperlink(screen.diff, E, void 0)),
      screen.txn((prev) => [[CARRIAGE_RETURN, NEWLINE], { dx: -prev.x, dy: 1 }]));
  }
  return (
    transitionStyle(screen.diff, stylePool, currentStyleId, stylePool.none),
    transitionHyperlink(screen.diff, E, void 0),
    screen
  );
}
/**
 * 写一个格：宽字符放不下行尾则放弃；终端可能把某些 emoji（U+1FA70–1FAFF、带 VS16 的序列）算成 1 列时，先在后一列写空格占位、写完再 cursorTo 回正确列（宽度补偿）；更新虚拟光标。
 */
//@ chunk-bzr73sfg.js:264620-265125 fingerprint = writeCellWithStyleStr (1)
function writeCellWithStyleStr(screen, cell, styleStr) {
  let glyphWidth = cell.width === 1 ? Math.max(2, bunStringWidth(cell.char)) : 1,
    cursorX = screen.cursor.x,
    viewportWidth = screen.viewportWidth;
  if (glyphWidth >= 2 && cursorX < viewportWidth) {
    let A = isMultiCodeUnitGrapheme(cell.char) ? viewportWidth : viewportWidth + 1;
    if (cursorX + glyphWidth >= A) return !1;
  }
  let diff = screen.diff;
  if (styleStr.length > 0) diff.push({ type: "styleStr", str: styleStr });
  let needsCompensation = glyphWidth >= 3 || (glyphWidth === 2 && needsWidthCompensation(cell.char));
  if (needsCompensation && cursorX + 1 < viewportWidth)
    (diff.push({ type: "cursorTo", col: cursorX + 2 }),
      diff.push({ type: "stdout", content: repeatString(" ", glyphWidth - 1) }),
      diff.push({ type: "cursorTo", col: cursorX + 1 }));
  if ((diff.push({ type: "stdout", content: cell.char }), needsCompensation))
    diff.push({ type: "cursorTo", col: cursorX + glyphWidth + 1 });
  if (cursorX >= viewportWidth) ((screen.cursor.x = glyphWidth), screen.cursor.y++);
  else screen.cursor.x = cursorX + glyphWidth;
  return !0;
}
/**
 * 把虚拟光标移到 (x,y)：换行或光标在行尾时用 CR + 相对移动，同一行用 CHA（cursorTo）。
 */
//@ chunk-bzr73sfg.js:265125-265309 callgraph-witnessed = moveCursorTo (0.545)
function moveCursorTo(screen, targetX, targetY) {
  let cursor = screen.cursor,
    p = targetY - cursor.y;
  if (cursor.x >= screen.viewportWidth || p !== 0)
    screen.diff.push(CARRIAGE_RETURN, { type: "cursorMove", x: targetX, y: p });
  else if (cursor.x !== targetX) screen.diff.push({ type: "cursorTo", col: targetX + 1 });
  ((cursor.x = targetX), (cursor.y = targetY));
}
/**
 * 该字符是否需要宽度补偿（终端与 Unicode 宽度表可能不一致的 emoji：Symbols and Pictographs Extended-A、带 U+FE0F 的序列）。
 */
//@ chunk-bzr73sfg.js:265309-265513 fingerprint = needsWidthCompensation (1)
function needsWidthCompensation(char) {
  let cp = char.codePointAt(0);
  if (cp === void 0) return !1;
  if ((cp >= 129648 && cp <= 129791) || (cp >= 129792 && cp <= 130047)) return !0;
  if (char.length >= 2) {
    for (let f = 0; f < char.length; f++) if (char.charCodeAt(f) === 65039) return !0;
  }
  return !1;
}
/**
 * 虚拟屏幕：记录光标位置和累计的 Patch；txn(fn) 以当前光标为输入，追加补丁并移动光标。
 */
//@ chunk-bzr73sfg.js:265513-265713 fingerprint = VirtualScreen (0.916)
class VirtualScreen {
  viewportWidth;
  cursor;
  diff = [];
  constructor(n, u) {
    this.viewportWidth = u;
    this.cursor = { ...n };
  }
  txn(n) {
    let [u, f] = n(this.cursor);
    for (let m of u) this.diff.push(m);
    ((this.cursor.x += f.dx), (this.cursor.y += f.dy));
  }
}

export { LogUpdate, isFrameOverflowing };
