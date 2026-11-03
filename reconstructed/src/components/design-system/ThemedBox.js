/**
 * components/design-system/ThemedBox.tsx
 *
 * 主题感知的 Box：把主题色名解析为实际颜色（rgb/#/ansi256/ansi: 直通）后交给 Ink Box（全项目 860+ 处使用）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/design-system/ThemedBox.tsx
 * pieces: chunk-x6v6jz2y.js (2)
 * attribution: fingerprint 2
 */
import { isBuiltinTheme } from "../../utils/theme.js";
import { useResolvedTheme } from "./ThemeProvider.js";
import { e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { BaseBox } from "../../ink/components/Box.js";

//@ chunk-x6v6jz2y.js:5808-5964 fingerprint = resolveColor (1)
function resolveColor(color, theme) {
  if (!color) return;
  if (
    color.startsWith("rgb(") ||
    color.startsWith("#") ||
    color.startsWith("ansi256(") ||
    color.startsWith("ansi:")
  )
    return color;
  return isBuiltinTheme(color) ? theme[color] : void 0;
}
//@ chunk-x6v6jz2y.js:5964-6240 fingerprint = ThemedBox (0.952)
function ThemedBox(t0) {
  let r = useResolvedTheme();
  return e(BaseBox, {
    ...t0,
    borderColor: resolveColor(t0.borderColor, r),
    borderTopColor: resolveColor(t0.borderTopColor, r),
    borderBottomColor: resolveColor(t0.borderBottomColor, r),
    borderLeftColor: resolveColor(t0.borderLeftColor, r),
    borderRightColor: resolveColor(t0.borderRightColor, r),
    backgroundColor: resolveColor(t0.backgroundColor, r),
  });
}

export { ThemedBox };
