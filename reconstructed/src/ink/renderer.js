/**
 * ink/renderer.ts
 *
 * createRenderer：计算 yoga 布局后调用 renderNodeToOutput 生成一帧
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/renderer.ts
 * pieces: chunk-bzr73sfg.js (1)
 * attribution: fingerprint 1
 */
import { createRenderState, resetRenderState, hasStaleAbsolutePaint } from "./render-node-to-output.js";
import { logForDebugging } from "../utils/debug.js";
import { createScreen, clampWideGraphemesAtRightEdge } from "./screen.js";
import { Output } from "./output.js";
import { Iy } from "./squash-text-nodes.js";
import { renderNodeToOutputAlias } from "./render-to-screen-reader.js";
import { markDirty } from "./dom.js";

/**
 * 创建帧渲染函数：每次调用用根节点的 yoga 尺寸建/复用 Output，从根 renderNodeToOutput（上一帧被污染或布局异常时不 blit），收尾处理行尾宽字素，返回 Frame：screen、viewport（备用屏时高度 +1）、cursor（主屏放在内容末尾，备用屏放在最后一行）、scrollHint、followScroll、layoutShifted、staleAbsolutePaint、scrollDrainPending。
 */
//@ chunk-bzr73sfg.js:320291-321779 fingerprint = createRenderer (0.898)
function createRenderer(node, stylePool) {
  let output,
    state = createRenderState();
  return (options) => {
    let {
        frontFrame: frontFrame,
        backFrame: backFrame,
        isTTY: isTTY,
        terminalWidth: terminalWidth,
        terminalRows: terminalRows,
      } = options,
      prevScreen = frontFrame.screen,
      backScreen = backFrame.screen,
      { charPool: charPool, hyperlinkPool: hyperlinkPool } = backScreen,
      computedHeight = node.yogaNode?.getComputedHeight(),
      computedWidth = node.yogaNode?.getComputedWidth(),
      badHeight = computedHeight === void 0 || !Number.isFinite(computedHeight) || computedHeight < 0,
      badWidth = computedWidth === void 0 || !Number.isFinite(computedWidth) || computedWidth < 0;
    if (!node.yogaNode || badHeight || badWidth) {
      if (node.yogaNode && (badHeight || badWidth))
        logForDebugging(
          `Invalid yoga dimensions: width=${computedWidth}, height=${computedHeight}, childNodes=${node.childNodes.length}, terminalWidth=${terminalWidth}, terminalRows=${terminalRows}`,
        );
      return {
        screen: createScreen(terminalWidth, 0, stylePool, charPool, hyperlinkPool),
        viewport: { width: terminalWidth, height: terminalRows },
        cursor: { x: 0, y: 0, visible: !0 },
      };
    }
    let width = Math.floor(node.yogaNode.getComputedWidth()),
      yogaHeight = Math.floor(node.yogaNode.getComputedHeight()),
      screenHeight = options.altScreen ? terminalRows : yogaHeight;
    if (options.altScreen && yogaHeight > terminalRows)
      logForDebugging(
        `alt-screen: yoga height ${yogaHeight} > terminalRows ${terminalRows} \u2014 ` +
          "something is rendering outside <AlternateScreen>. Overflow clipped.",
        { level: "warn" },
      );
    let screen = backScreen ?? createScreen(width, screenHeight, stylePool, charPool, hyperlinkPool);
    if (output) output.reset(width, screenHeight, screen);
    else output = new Output({ width: width, height: screenHeight, stylePool: stylePool, screen: screen });
    (resetRenderState(state), (state.overlayActive = options.overlayActive));
    let blitSource = Iy(node) || options.prevFrameContaminated ? void 0 : prevScreen;
    renderNodeToOutputAlias(node, output, state, { prevScreen: blitSource });
    let renderedScreen = output.get();
    if (isTTY && renderedScreen.width === terminalWidth) clampWideGraphemesAtRightEdge(renderedScreen);
    let scrollDrainNode = state.scrollDrainNode;
    if (scrollDrainNode) markDirty(scrollDrainNode);
    return {
      scrollHint: options.altScreen ? state.scrollHint : null,
      scrollDrainPending: scrollDrainNode !== null,
      followScroll: state.followScroll,
      layoutShifted: state.layoutShifted,
      staleAbsolutePaint:
        blitSource !== void 0 && (state.absolutePaintCut || hasStaleAbsolutePaint(state, output)),
      screen: renderedScreen,
      viewport: { width: terminalWidth, height: options.altScreen ? terminalRows + 1 : terminalRows },
      cursor: {
        x: 0,
        y: options.altScreen ? Math.max(0, Math.min(screen.height, terminalRows) - 1) : screen.height,
        visible: !isTTY || screen.height === 0,
      },
    };
  };
}

export { createRenderer };
