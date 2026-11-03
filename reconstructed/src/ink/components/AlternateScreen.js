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
import { j, Se, NSe, qt } from "../../../vendor/react/cjs/react.production.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { TerminalSizeContext, TerminalModesContextAlias } from "../terminalModes.js";
import { TerminalWriteContext } from "../useTerminalNotification.js";
import { di } from "../terminal.js";
import { e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { BaseBox } from "./Box.js";

//@ chunk-2f336bka.js:422-426 placement
j();
/**
 * <AlternateScreen>：挂载时进入备用屏（DEC 1049）并按 mouseTracking（默认 full）开启鼠标跟踪、可选设置 surface 背景/前景色；内容高度固定为终端行数；卸载时退出备用屏、关闭鼠标、清选区并恢复扩展键与原生光标。进/出序列会尽量并入下一帧一起写（keepForNextFrame），避免闪烁。
 */
//@ chunk-2f336bka.js:426-1523 fingerprint = AlternateScreen (0.422)
function AlternateScreen(t0) {
  let f = w(16),
    { children: children, mouseTracking: t1, surface: surface } = t0,
    mouseTracking = t1 === void 0 ? "full" : t1,
    terminalSize = Se(TerminalSizeContext),
    writeRaw = Se(TerminalWriteContext),
    modes = Se(TerminalModesContextAlias),
    M,
    F;
  if (f[0] !== modes || f[1] !== surface || f[2] !== writeRaw)
    ((M = () => {
      if (!writeRaw || !surface) {
        return;
      }
      let ink = di().get(process.stdout);
      let N = modes.set("surface", surface);
      if (!ink?.keepForNextFrame(N)) writeRaw(N);
      return () => {
        let reset = modes.reset("surface");
        if (!ink?.keepForNextFrame(reset)) writeRaw(reset);
      };
    }),
      (F = [writeRaw, modes, surface]),
      (f[0] = modes),
      (f[1] = surface),
      (f[2] = writeRaw),
      (f[3] = M),
      (f[4] = F));
  else ((M = f[3]), (F = f[4]));
  NSe(M, F);
  let C, L;
  if (f[5] !== modes || f[6] !== mouseTracking || f[7] !== writeRaw)
    ((C = () => {
      let a = di().get(process.stdout);
      if (!writeRaw) {
        return;
      }
      let b =
        (a?.claimHeldAltScreen() ? modes.reset("mouse") : "") +
        modes.set("altScreen") +
        modes.set("mouse", mouseTracking) +
        (a?.nativeCursorSeq ?? "");
      if (!a?.keepForNextFrame(b)) writeRaw(b);
      return (
        a?.setAltScreenActive(!0, mouseTracking),
        () => {
          if (!a?.holdAltScreenLeave(() => leaveAlternateScreen(a, modes, writeRaw)))
            leaveAlternateScreen(a, modes, writeRaw);
        }
      );
    }),
      (L = [writeRaw, modes, mouseTracking]),
      (f[5] = modes),
      (f[6] = mouseTracking),
      (f[7] = writeRaw),
      (f[8] = C),
      (f[9] = L));
  else ((C = f[8]), (L = f[9]));
  NSe(C, L);
  const t4 = terminalSize?.rows ?? 24,
    g = mouseTracking === "full";
  let y;
  if (f[10] !== children || f[11] !== g)
    ((y = e(AlternateScreenContext, { value: g, children: children })),
      (f[10] = children),
      (f[11] = g),
      (f[12] = y));
  else y = f[12];
  let q;
  if (f[13] !== t4 || f[14] !== y)
    ((q = e(BaseBox, { flexDirection: "column", height: t4, width: "100%", flexShrink: 0, children: y })),
      (f[13] = t4),
      (f[14] = y),
      (f[15] = q));
  else q = f[15];
  return q;
}
//@ chunk-2f336bka.js:1523-1751 affinity
function leaveAlternateScreen(ink, modes, writeRaw) {
  let c = ink?.setAltScreenActive(!1) ?? "";
  ink?.clearTextSelection();
  let reset = modes.reset("mouse"),
    reset_2 = modes.reset("altScreen"),
    r = reset_2 !== "" && !ink?.hasUnmounted,
    t = r ? modes.reassert("extendedKeys") : "",
    f = r ? (ink?.nativeCursorSeq ?? "") : "";
  writeRaw(c + reset + reset_2 + t + f);
}
//@ chunk-yag8rcpb.js:229-233 placement
j();
//@ chunk-yag8rcpb.js:233-250 placement
var AlternateScreenContext = qt(null);

export { AlternateScreen, AlternateScreenContext };
