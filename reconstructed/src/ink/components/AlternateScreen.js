/**
 * ink/components/AlternateScreen.tsx
 *
 * 并入已有模块：备用屏幕上下文
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/components/AlternateScreen.tsx
 * pieces: chunk-2f336bka.js (3), chunk-yag8rcpb.js (2)
 * attribution: placement 3, fingerprint 1, affinity 1
 */
import {
  init_react_production,
  createContext,
  useContext,
  useInsertionEffect,
} from "../../../vendor/react/cjs/react.production.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { TerminalSizeContext, TerminalModesContextAlias } from "../terminalModes.js";
import { TerminalWriteContext } from "../useTerminalNotification.js";
import { getSecondRootError } from "../terminal.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { BaseBox } from "./Box.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-yag8rcpb.js:229-233 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-yag8rcpb.js:229", () => {
  init_react_production();
});
//@ chunk-yag8rcpb.js:233-250 placement
var AlternateScreenContext; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-yag8rcpb.js:233", () => {
  AlternateScreenContext = createContext(null);
});
//@ chunk-2f336bka.js:422-426 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-2f336bka.js:422", () => {
  init_react_production();
});
//@ chunk-2f336bka.js:426-1523 fingerprint = AlternateScreen (0.422)
/**
 * <AlternateScreen>：挂载时进入备用屏（DEC 1049）并按 mouseTracking（默认 full）开启鼠标跟踪、可选设置 surface 背景/前景色；内容高度固定为终端行数；卸载时退出备用屏、关闭鼠标、清选区并恢复扩展键与原生光标。进/出序列会尽量并入下一帧一起写（keepForNextFrame），避免闪烁。
 */
function AlternateScreen(props) {
  let $ = useMemoCache(16);
  let { children, mouseTracking, surface } = props;
  let mouseTracking_2 = mouseTracking === undefined ? "full" : mouseTracking;
  let terminalSize = useContext(TerminalSizeContext);
  let writeRaw = useContext(TerminalWriteContext);
  let modes = useContext(TerminalModesContextAlias);
  let surfaceEffect;
  let surfaceDeps;
  if ($[0] !== modes || $[1] !== surface || $[2] !== writeRaw) {
    surfaceEffect = () => {
      if (!writeRaw || !surface) {
        return;
      }
      let ink = getSecondRootError().get(process.stdout);
      let surfaceSeq = modes.set("surface", surface);
      if (!ink?.keepForNextFrame(surfaceSeq)) writeRaw(surfaceSeq);
      return () => {
        let resetSeq = modes.reset("surface");
        if (!ink?.keepForNextFrame(resetSeq)) writeRaw(resetSeq);
      };
    };
    surfaceDeps = [writeRaw, modes, surface];
    $[0] = modes;
    $[1] = surface;
    $[2] = writeRaw;
    $[3] = surfaceEffect;
    $[4] = surfaceDeps;
  } else {
    surfaceEffect = $[3];
    surfaceDeps = $[4];
  }
  useInsertionEffect(surfaceEffect, surfaceDeps);
  let altScreenEffect;
  let altScreenDeps;
  if ($[5] !== modes || $[6] !== mouseTracking_2 || $[7] !== writeRaw) {
    altScreenEffect = () => {
      let ink = getSecondRootError().get(process.stdout);
      if (!writeRaw) {
        return;
      }
      let sequence =
        (ink?.claimHeldAltScreen() ? modes.reset("mouse") : "") +
        modes.set("altScreen") +
        modes.set("mouse", mouseTracking_2) +
        (ink?.nativeCursorSeq ?? "");
      if (!ink?.keepForNextFrame(sequence)) writeRaw(sequence);
      ink?.setAltScreenActive(true, mouseTracking_2);
      return () => {
        if (!ink?.holdAltScreenLeave(() => leaveAlternateScreen(ink, modes, writeRaw)))
          leaveAlternateScreen(ink, modes, writeRaw);
      };
    };
    altScreenDeps = [writeRaw, modes, mouseTracking_2];
    $[5] = modes;
    $[6] = mouseTracking_2;
    $[7] = writeRaw;
    $[8] = altScreenEffect;
    $[9] = altScreenDeps;
  } else {
    altScreenEffect = $[8];
    altScreenDeps = $[9];
  }
  useInsertionEffect(altScreenEffect, altScreenDeps);
  const height = terminalSize?.rows ?? 24;
  const value = mouseTracking_2 === "full";
  let children_2;
  if ($[10] !== children || $[11] !== value) {
    children_2 = jsxProd_default(AlternateScreenContext, {
      value,
      children,
    });
    $[10] = children;
    $[11] = value;
    $[12] = children_2;
  } else children_2 = $[12];
  let element;
  if ($[13] !== height || $[14] !== children_2) {
    element = jsxProd_default(BaseBox, {
      flexDirection: "column",
      height,
      width: "100%",
      flexShrink: 0,
      children: children_2,
    });
    $[13] = height;
    $[14] = children_2;
    $[15] = element;
  } else element = $[15];
  return element;
}
//@ chunk-2f336bka.js:1523-1751 affinity
function leaveAlternateScreen(ink, modes, writeRaw) {
  let disableSeq = ink?.setAltScreenActive(false) ?? "";
  ink?.clearTextSelection();
  let mouseResetSeq = modes.reset("mouse");
  let altScreenResetSeq = modes.reset("altScreen");
  let wasActive = altScreenResetSeq !== "" && !ink?.hasUnmounted;
  let extendedKeysSeq = wasActive ? modes.reassert("extendedKeys") : "";
  let cursorSeq = wasActive ? (ink?.nativeCursorSeq ?? "") : "";
  writeRaw(disableSeq + mouseResetSeq + altScreenResetSeq + extendedKeysSeq + cursorSeq);
}
export { AlternateScreen, AlternateScreenContext };
