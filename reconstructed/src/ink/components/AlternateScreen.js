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
import { init_react_production, Se, NSe, qt } from "../../../vendor/react/cjs/react.production.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { TerminalSizeContext, TerminalModesContextAlias } from "../terminalModes.js";
import { TerminalWriteContext } from "../useTerminalNotification.js";
import { getSecondRootError } from "../terminal.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { BaseBox } from "./Box.js";

//@ chunk-2f336bka.js:422-426 placement
init_react_production();
//@ chunk-2f336bka.js:426-1523 fingerprint = AlternateScreen (0.422)
/**
 * <AlternateScreen>：挂载时进入备用屏（DEC 1049）并按 mouseTracking（默认 full）开启鼠标跟踪、可选设置 surface 背景/前景色；内容高度固定为终端行数；卸载时退出备用屏、关闭鼠标、清选区并恢复扩展键与原生光标。进/出序列会尽量并入下一帧一起写（keepForNextFrame），避免闪烁。
 */
function AlternateScreen(props) {
  let f = w(16);
  let { children, mouseTracking, surface } = props;
  let mouseTracking_2 = mouseTracking === undefined ? "full" : mouseTracking;
  let terminalSize = Se(TerminalSizeContext);
  let writeRaw = Se(TerminalWriteContext);
  let modes = Se(TerminalModesContextAlias);
  let M;
  let F;
  if (f[0] !== modes || f[1] !== surface || f[2] !== writeRaw) {
    M = () => {
      if (!writeRaw || !surface) {
        return;
      }
      let ink = getSecondRootError().get(process.stdout);
      let N = modes.set("surface", surface);
      if (!ink?.keepForNextFrame(N)) writeRaw(N);
      return () => {
        let P = modes.reset("surface");
        if (!ink?.keepForNextFrame(P)) writeRaw(P);
      };
    };
    F = [writeRaw, modes, surface];
    f[0] = modes;
    f[1] = surface;
    f[2] = writeRaw;
    f[3] = M;
    f[4] = F;
  } else {
    M = f[3];
    F = f[4];
  }
  NSe(M, F);
  let C;
  let L;
  if (f[5] !== modes || f[6] !== mouseTracking_2 || f[7] !== writeRaw) {
    C = () => {
      let a = getSecondRootError().get(process.stdout);
      if (!writeRaw) {
        return;
      }
      let b =
        (a?.claimHeldAltScreen() ? modes.reset("mouse") : "") +
        modes.set("altScreen") +
        modes.set("mouse", mouseTracking_2) +
        (a?.nativeCursorSeq ?? "");
      if (!a?.keepForNextFrame(b)) writeRaw(b);
      a?.setAltScreenActive(true, mouseTracking_2);
      return () => {
        if (!a?.holdAltScreenLeave(() => leaveAlternateScreen(a, modes, writeRaw)))
          leaveAlternateScreen(a, modes, writeRaw);
      };
    };
    L = [writeRaw, modes, mouseTracking_2];
    f[5] = modes;
    f[6] = mouseTracking_2;
    f[7] = writeRaw;
    f[8] = C;
    f[9] = L;
  } else {
    C = f[8];
    L = f[9];
  }
  NSe(C, L);
  const height = terminalSize?.rows ?? 24;
  const value = mouseTracking_2 === "full";
  let children_2;
  if (f[10] !== children || f[11] !== value) {
    children_2 = jsxProd_default(AlternateScreenContext, {
      value,
      children,
    });
    f[10] = children;
    f[11] = value;
    f[12] = children_2;
  } else children_2 = f[12];
  let q;
  if (f[13] !== height || f[14] !== children_2) {
    q = jsxProd_default(BaseBox, {
      flexDirection: "column",
      height,
      width: "100%",
      flexShrink: 0,
      children: children_2,
    });
    f[13] = height;
    f[14] = children_2;
    f[15] = q;
  } else q = f[15];
  return q;
}
//@ chunk-2f336bka.js:1523-1751 affinity
function leaveAlternateScreen(ink, modes, writeRaw) {
  let c = ink?.setAltScreenActive(false) ?? "";
  ink?.clearTextSelection();
  let i = modes.reset("mouse");
  let k = modes.reset("altScreen");
  let r = k !== "" && !ink?.hasUnmounted;
  let t = r ? modes.reassert("extendedKeys") : "";
  let f = r ? (ink?.nativeCursorSeq ?? "") : "";
  writeRaw(c + i + k + t + f);
}
//@ chunk-yag8rcpb.js:229-233 placement
init_react_production();
//@ chunk-yag8rcpb.js:233-250 placement
var AlternateScreenContext = qt(null);
export { AlternateScreen, AlternateScreenContext };
