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
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-bzr73sfg.js:253719-253776 fingerprint = renderFrame (0.771)
/**
 * 帧内容高度是否已达到/超过视口高度（主屏模式下内容会进入回滚区）。
 */
function isFrameOverflowing(frame) {
  return frame.screen.height >= frame.viewport.height;
}
//@ chunk-bzr73sfg.js:258955-259050 fingerprint = CARRIAGE_RETURN (0.73)
var CARRIAGE_RETURN; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var NEWLINE;
var ERASE_TO_EOL_PATCH;
deferInit("chunk-bzr73sfg.js:258955", () => {
  CARRIAGE_RETURN = {
    type: "carriageReturn",
  };
  NEWLINE = {
    type: "stdout",
    content: `
`,
  };
  ERASE_TO_EOL_PATCH = {
    type: "stdout",
    content: eraseToEndOfLine(),
  };
});
//@ chunk-bzr73sfg.js:259050-263509 fingerprint = LogUpdate (0.962)
/**
 * 增量输出：render(prev, next, altScreen, decstbmAllowed) 比较两帧屏幕，产出 Patch 列表（stdout 文字、styleStr、hyperlink、cursorMove/cursorTo、clear、clearTerminal…）。非 TTY 时整帧输出；视口变小/宽度变化/内容缩到视口以内等情况整屏重置（clearTerminal，会闪）；有 scrollHint 且允许 DECSTBM 时先用滚动区域把旧帧行上移/下移再 diff；diff 时跳过宽字符占位格，行尾空白用 EL 清除；改动落在已滚入回滚区的行上时只能整屏重置。慢于 50ms 记日志。
 */
class LogUpdate {
  options;
  state;
  constructor(options) {
    this.options = options;
    this.state = {
      previousOutput: "",
    };
  }
  renderPreviousOutput_DEPRECATED(prevFrame) {
    if (!this.options.isTTY) return [NEWLINE];
    return this.getRenderOpsForDone(prevFrame);
  }
  reset() {
    this.state.previousOutput = "";
    this.forceReset = false;
    this.scrolledOutRows = new WeakMap();
  }
  scrolledOutRows = new WeakMap();
  scrolledOutRowsOf(frame) {
    return this.scrolledOutRows.get(frame);
  }
  forceReset = false;
  forceFullReset() {
    this.forceReset = true;
  }
  renderFullFrame(frame) {
    let { screen } = frame;
    let { stylePool } = this.options;
    let lines = [];
    let currentStyles = stylePool.none;
    let currentHyperlink = undefined;
    for (let y = 0; y < screen.height; y++) {
      let line = "";
      for (let x = 0; x < screen.width; x++) {
        let cell = cellAt(screen, x, y);
        if (cell && cell.width !== 2) {
          if (cell.hyperlink !== currentHyperlink) {
            if (currentHyperlink !== undefined) line += LINK_END;
            if (cell.hyperlink !== undefined) line += link(cell.hyperlink);
            currentHyperlink = cell.hyperlink;
          }
          let transition = stylePool.transition(currentStyles, cell.styleId);
          if (transition.length > 0) {
            line += transition;
            currentStyles = cell.styleId;
          }
          line += cell.char;
        }
      }
      if (currentHyperlink !== undefined) {
        line += LINK_END;
        currentHyperlink = undefined;
      }
      line += stylePool.transition(currentStyles, stylePool.none);
      currentStyles = stylePool.none;
      lines.push(line.trimEnd());
    }
    if (lines.length === 0) return [];
    return [
      {
        type: "stdout",
        content: lines.join(`
`),
      },
    ];
  }
  getRenderOpsForDone(prev) {
    this.state.previousOutput = "";
    if (!prev.cursor.visible)
      return [
        {
          type: "cursorShow",
        },
      ];
    return [];
  }
  render(prev, next, allowScroll = false, decstbmSafe = true) {
    if (!this.options.isTTY) {
      if (screensEqual(prev.screen, next.screen)) return [];
      return this.renderFullFrame(next);
    }
    let startTime = performance.now();
    let stylePool = this.options.stylePool;
    let prevHadScrollback = prev.cursor.y >= prev.screen.height && isFrameOverflowing(prev);
    let max = Math.max(0, prev.screen.height - Math.min(prev.viewport.height, next.viewport.height));
    let overflowRows = isFrameOverflowing(prev) ? 1 : 0;
    let maxHeight = max + overflowRows;
    if (this.forceReset) {
      this.forceReset = false;
      return fullResetSequence_CAUSES_FLICKER(next, "clear", stylePool, allowScroll, maxHeight);
    }
    if (
      next.viewport.height < prev.viewport.height ||
      (next.viewport.height > prev.viewport.height && prevHadScrollback) ||
      (prev.viewport.width !== 0 && next.viewport.width !== prev.viewport.width)
    )
      return fullResetSequence_CAUSES_FLICKER(next, "resize", stylePool, allowScroll, maxHeight);
    let scrollPatch = [];
    if (allowScroll && next.scrollHint && decstbmSafe) {
      let { bottom, delta } = next.scrollHint;
      let top = Math.max(next.scrollHint.top, 1);
      if (top < bottom && bottom < prev.screen.height && bottom < next.screen.height) {
        shiftRows(prev.screen, top, bottom, delta);
        scrollPatch = [
          {
            type: "stdout",
            content:
              setScrollRegion(top + 1, bottom + 1) +
              (delta > 0 ? scrollUp(delta) : scrollDown(-delta)) +
              RESET_SCROLL_REGION +
              CURSOR_HOME,
          },
        ];
      }
    }
    let shrinking = next.screen.height < prev.screen.height;
    let nextFitsViewport = next.screen.height <= prev.viewport.height;
    if (prevHadScrollback && nextFitsViewport && shrinking) {
      logForDebugging(
        `Full reset (shrink->below): prevHeight=${prev.screen.height}, nextHeight=${next.screen.height}, viewport=${prev.viewport.height}`,
      );
      return fullResetSequence_CAUSES_FLICKER(next, "offscreen", stylePool, allowScroll, maxHeight);
    }
    let screen = new VirtualScreen(prev.cursor, next.viewport.width);
    let heightDelta = Math.max(next.screen.height, 1) - Math.max(prev.screen.height, 1);
    let shrinking_2 = heightDelta < 0;
    let growing = heightDelta > 0;
    if (shrinking_2) {
      let linesToClear = prev.screen.height - next.screen.height;
      if (linesToClear > prev.viewport.height)
        return fullResetSequence_CAUSES_FLICKER(
          next,
          "offscreen",
          this.options.stylePool,
          allowScroll,
          maxHeight,
        );
      screen.txn((prev) => [
        [
          {
            type: "clear",
            count: linesToClear,
          },
          {
            type: "cursorMove",
            x: 0,
            y: -1,
          },
        ],
        {
          dx: -prev.x,
          dy: -linesToClear,
        },
      ]);
    }
    let cursorRestoreScroll = prevHadScrollback ? 1 : 0;
    let viewportY = Math.max(
      growing
        ? prev.screen.height - prev.viewport.height + cursorRestoreScroll
        : Math.max(prev.screen.height, next.screen.height) - next.viewport.height + cursorRestoreScroll,
      this.scrolledOutRows.get(prev) ?? 0,
    );
    let viewportY_2 = next.screen.height - next.viewport.height + 1;
    let currentStyleId = stylePool.none;
    let currentHyperlink = undefined;
    let lastRow = -1;
    let lastCol = -1;
    let needsFullReset = false;
    let resetTriggerY = false;
    let needsFullReset_2 = false;
    let resetTriggerY_2 = -1;
    diffEach(prev.screen, next.screen, (x, y, removed, added) => {
      if (growing && y >= prev.screen.height) return;
      if (added && added.width === 2) return;
      if (added && added.width === 3 && isEmptyCellAt(prev.screen, x, y)) return;
      if (removed && (removed.width === 2 || removed.width === 3) && !added) return;
      if (added && isEmptyCellAt(next.screen, x, y) && !removed) return;
      if (y < viewportY) {
        if (allowScroll || shrinking_2 || y >= viewportY_2) {
          needsFullReset_2 = true;
          resetTriggerY_2 = y;
          return true;
        }
        return;
      }
      if (y !== lastRow) {
        currentHyperlink = transitionHyperlink(screen.diff, currentHyperlink, undefined);
        lastRow = y;
        lastCol = -1;
        needsFullReset = false;
        resetTriggerY = false;
      }
      if (removed && isEmptyCellAt(next.screen, x, y)) {
        if (!needsFullReset) {
          needsFullReset = true;
          if (y < next.screen.height) {
            for (let idx = next.screen.width - 1; idx > x; idx--)
              if (!isEmptyCellAt(next.screen, idx, y)) {
                lastCol = idx;
                break;
              }
          }
        }
        if (x > lastCol) {
          if (resetTriggerY) return;
          resetTriggerY = true;
          moveCursorTo(screen, x, y);
          let prevStyleId = currentStyleId;
          let prevHyperlink = currentHyperlink;
          currentStyleId = stylePool.none;
          currentHyperlink = undefined;
          screen.txn(() => {
            let patches = [];
            transitionStyle(patches, stylePool, prevStyleId, stylePool.none);
            transitionHyperlink(patches, prevHyperlink, undefined);
            patches.push(ERASE_TO_EOL_PATCH);
            return [
              patches,
              {
                dx: 0,
                dy: 0,
              },
            ];
          });
          return;
        }
      }
      moveCursorTo(screen, x, y);
      if (added) {
        let targetHyperlink = added.hyperlink;
        currentHyperlink = transitionHyperlink(screen.diff, currentHyperlink, targetHyperlink);
        let styleStr = stylePool.transition(currentStyleId, added.styleId);
        if (writeCellWithStyleStr(screen, added, styleStr)) currentStyleId = added.styleId;
      } else if (removed) {
        let styleIdToReset = currentStyleId;
        let hyperlinkToReset = currentHyperlink;
        currentStyleId = stylePool.none;
        currentHyperlink = undefined;
        screen.txn(() => {
          let patches = [];
          transitionStyle(patches, stylePool, styleIdToReset, stylePool.none);
          transitionHyperlink(patches, hyperlinkToReset, undefined);
          patches.push({
            type: "stdout",
            content: " ",
          });
          return [
            patches,
            {
              dx: 1,
              dy: 0,
            },
          ];
        });
      }
    });
    if (needsFullReset_2)
      return fullResetSequence_CAUSES_FLICKER(next, "offscreen", stylePool, allowScroll, maxHeight, {
        triggerY: resetTriggerY_2,
        prevLine: readLine(prev.screen, resetTriggerY_2),
        nextLine: readLine(next.screen, resetTriggerY_2),
      });
    currentStyleId = transitionStyle(screen.diff, stylePool, currentStyleId, stylePool.none);
    currentHyperlink = transitionHyperlink(screen.diff, currentHyperlink, undefined);
    if (growing) renderFrameSlice(screen, next, prev.screen.height, next.screen.height, stylePool);
    if (allowScroll);
    else if (next.cursor.y >= next.screen.height)
      screen.txn((prev) => {
        let rowsToCreate = next.cursor.y - prev.y;
        if (rowsToCreate > 0) {
          let patches = Array(1 + rowsToCreate);
          patches[0] = CARRIAGE_RETURN;
          for (let i = 0; i < rowsToCreate; i++) patches[1 + i] = NEWLINE;
          return [
            patches,
            {
              dx: -prev.x,
              dy: rowsToCreate,
            },
          ];
        }
        let dy = next.cursor.y - prev.y;
        if (dy !== 0 || prev.x !== next.cursor.x) {
          let patches = [CARRIAGE_RETURN];
          patches.push({
            type: "cursorMove",
            x: next.cursor.x,
            y: dy,
          });
          return [
            patches,
            {
              dx: next.cursor.x - prev.x,
              dy,
            },
          ];
        }
        return [
          [],
          {
            dx: 0,
            dy: 0,
          },
        ];
      });
    else moveCursorTo(screen, next.cursor.x, next.cursor.y);
    if (viewportY > 0) this.scrolledOutRows.set(next, viewportY);
    let elapsed = performance.now() - startTime;
    if (elapsed > 50) {
      let damage = next.screen.damage;
      let damageInfo = damage ? `${damage.width}x${damage.height} at (${damage.x},${damage.y})` : "none";
      logForDebugging(
        `Slow render: ${elapsed.toFixed(1)}ms, screen: ${next.screen.height}x${next.screen.width}, damage: ${damageInfo}, changes: ${screen.diff.length}`,
      );
    }
    return scrollPatch.length > 0 ? [...scrollPatch, ...screen.diff] : screen.diff;
  }
}
//@ chunk-bzr73sfg.js:263509-263592 fingerprint = transitionHyperlink (1)
/**
 * 超链接切换：目标与当前不同时追加 hyperlink 补丁（OSC 8），返回新的当前链接。
 */
function transitionHyperlink(diff, current, target) {
  if (current !== target) {
    diff.push({
      type: "hyperlink",
      uri: target ?? "",
    });
    return target;
  }
  return current;
}
//@ chunk-bzr73sfg.js:263592-263692 fingerprint = transitionStyle (1)
/**
 * 样式切换：追加 StylePool.transition 给出的 SGR 串，返回目标 styleId。
 */
function transitionStyle(diff, stylePool, currentId, targetId) {
  let str = stylePool.transition(currentId, targetId);
  if (str.length > 0)
    diff.push({
      type: "styleStr",
      str,
    });
  return targetId;
}
//@ chunk-bzr73sfg.js:263692-263781 callgraph-witnessed = readLine (1)
/**
 * 读屏幕一行的纯文本（去尾部空白），用于整屏重置的调试信息。
 */
function readLine(screen, y) {
  let line = "";
  for (let x = 0; x < screen.width; x++) line += charInCellAt(screen, x, y) ?? " ";
  return line.trimEnd();
}
//@ chunk-bzr73sfg.js:263781-264043 fingerprint = fullResetSequence_CAUSES_FLICKER (0.766)
/**
 * 整屏重置：先发 clearTerminal（带原因 resize/offscreen/clear），再从 startY 起完整重画帧（主屏时只画最后一屏可见部分）。会闪烁，尽量避免。
 */
function fullResetSequence_CAUSES_FLICKER(frame, reason, stylePool, altScreen, scrolledRows, debug) {
  let startY = altScreen
    ? 0
    : Math.min(scrolledRows, Math.max(0, frame.screen.height - frame.viewport.height + 1));
  let screen = new VirtualScreen(
    {
      x: 0,
      y: startY,
    },
    frame.viewport.width,
  );
  renderFrameSlice(screen, frame, startY, frame.screen.height, stylePool);
  return [
    {
      type: "clearTerminal",
      reason,
      altScreen,
      viewportRows: frame.viewport.height,
      debug,
    },
    ...screen.diff,
  ];
}
//@ chunk-bzr73sfg.js:264043-264620 fingerprint = renderFrameSlice (1)
/**
 * 把帧的 [startY,endY) 行完整写进虚拟屏幕：逐格移动光标、切换链接与样式、写字符（跳过空白），每行结束复位样式并换行。
 */
function renderFrameSlice(screen, frame, startY, endY, stylePool) {
  let currentStyleId = stylePool.none;
  let currentHyperlink = undefined;
  let lastRenderedStyleId = -1;
  let { width: screenWidth, cells, charPool, hyperlinkPool } = frame.screen;
  let index = startY * screenWidth;
  for (let y = startY; y < endY; y += 1) {
    if (screen.cursor.y < y) {
      let rowsToAdvance = y - screen.cursor.y;
      screen.txn((prev) => {
        let patches = Array(1 + rowsToAdvance);
        patches[0] = CARRIAGE_RETURN;
        for (let i = 0; i < rowsToAdvance; i++) patches[1 + i] = NEWLINE;
        return [
          patches,
          {
            dx: -prev.x,
            dy: rowsToAdvance,
          },
        ];
      });
    }
    lastRenderedStyleId = -1;
    for (let x = 0; x < screenWidth; x += 1, index += 1) {
      let cell = visibleCellAtIndex(cells, charPool, hyperlinkPool, index, lastRenderedStyleId);
      if (!cell) continue;
      moveCursorTo(screen, x, y);
      let targetHyperlink = cell.hyperlink;
      currentHyperlink = transitionHyperlink(screen.diff, currentHyperlink, targetHyperlink);
      let styleStr = stylePool.transition(currentStyleId, cell.styleId);
      if (writeCellWithStyleStr(screen, cell, styleStr)) {
        currentStyleId = cell.styleId;
        lastRenderedStyleId = cell.styleId;
      }
    }
    currentStyleId = transitionStyle(screen.diff, stylePool, currentStyleId, stylePool.none);
    currentHyperlink = transitionHyperlink(screen.diff, currentHyperlink, undefined);
    screen.txn((prev) => [
      [CARRIAGE_RETURN, NEWLINE],
      {
        dx: -prev.x,
        dy: 1,
      },
    ]);
  }
  transitionStyle(screen.diff, stylePool, currentStyleId, stylePool.none);
  transitionHyperlink(screen.diff, currentHyperlink, undefined);
  return screen;
}
//@ chunk-bzr73sfg.js:264620-265125 fingerprint = writeCellWithStyleStr (1)
/**
 * 写一个格：宽字符放不下行尾则放弃；终端可能把某些 emoji（U+1FA70–1FAFF、带 VS16 的序列）算成 1 列时，先在后一列写空格占位、写完再 cursorTo 回正确列（宽度补偿）；更新虚拟光标。
 */
function writeCellWithStyleStr(screen, cell, styleStr) {
  let glyphWidth = cell.width === 1 ? Math.max(2, bunStringWidth(cell.char)) : 1;
  let cursorX = screen.cursor.x;
  let viewportWidth = screen.viewportWidth;
  if (glyphWidth >= 2 && cursorX < viewportWidth) {
    let threshold = isMultiCodeUnitGrapheme(cell.char) ? viewportWidth : viewportWidth + 1;
    if (cursorX + glyphWidth >= threshold) return false;
  }
  let diff = screen.diff;
  if (styleStr.length > 0)
    diff.push({
      type: "styleStr",
      str: styleStr,
    });
  let needsCompensation = glyphWidth >= 3 || (glyphWidth === 2 && needsWidthCompensation(cell.char));
  if (needsCompensation && cursorX + 1 < viewportWidth) {
    diff.push({
      type: "cursorTo",
      col: cursorX + 2,
    });
    diff.push({
      type: "stdout",
      content: repeatString(" ", glyphWidth - 1),
    });
    diff.push({
      type: "cursorTo",
      col: cursorX + 1,
    });
  }
  diff.push({
    type: "stdout",
    content: cell.char,
  });
  if (needsCompensation)
    diff.push({
      type: "cursorTo",
      col: cursorX + glyphWidth + 1,
    });
  if (cursorX >= viewportWidth) {
    screen.cursor.x = glyphWidth;
    screen.cursor.y++;
  } else screen.cursor.x = cursorX + glyphWidth;
  return true;
}
//@ chunk-bzr73sfg.js:265125-265309 callgraph-witnessed = moveCursorTo (0.545)
/**
 * 把虚拟光标移到 (x,y)：换行或光标在行尾时用 CR + 相对移动，同一行用 CHA（cursorTo）。
 */
function moveCursorTo(screen, targetX, targetY) {
  let cursor = screen.cursor;
  let dy = targetY - cursor.y;
  if (cursor.x >= screen.viewportWidth || dy !== 0)
    screen.diff.push(CARRIAGE_RETURN, {
      type: "cursorMove",
      x: targetX,
      y: dy,
    });
  else if (cursor.x !== targetX)
    screen.diff.push({
      type: "cursorTo",
      col: targetX + 1,
    });
  cursor.x = targetX;
  cursor.y = targetY;
}
//@ chunk-bzr73sfg.js:265309-265513 fingerprint = needsWidthCompensation (1)
/**
 * 该字符是否需要宽度补偿（终端与 Unicode 宽度表可能不一致的 emoji：Symbols and Pictographs Extended-A、带 U+FE0F 的序列）。
 */
function needsWidthCompensation(char) {
  let cp = char.codePointAt(0);
  if (cp === undefined) return false;
  if ((cp >= 129648 && cp <= 129791) || (cp >= 129792 && cp <= 130047)) return true;
  if (char.length >= 2) {
    for (let i = 0; i < char.length; i++) if (char.charCodeAt(i) === 65039) return true;
  }
  return false;
}
//@ chunk-bzr73sfg.js:265513-265713 fingerprint = VirtualScreen (0.916)
/**
 * 虚拟屏幕：记录光标位置和累计的 Patch；txn(fn) 以当前光标为输入，追加补丁并移动光标。
 */
class VirtualScreen {
  viewportWidth;
  cursor;
  diff = [];
  constructor(origin, viewportWidth) {
    this.viewportWidth = viewportWidth;
    this.cursor = {
      ...origin,
    };
  }
  txn(fn) {
    let [patches, next] = fn(this.cursor);
    for (let patch of patches) this.diff.push(patch);
    this.cursor.x += next.dx;
    this.cursor.y += next.dy;
  }
}
export { LogUpdate, isFrameOverflowing };
