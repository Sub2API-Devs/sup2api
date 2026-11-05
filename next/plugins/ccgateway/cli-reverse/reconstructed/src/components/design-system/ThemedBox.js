/**
 * components/design-system/ThemedBox.tsx
 *
 * 主题感知的 Box：把主题色名解析为实际颜色（rgb/#/ansi256/ansi: 直通）后交给 Ink Box（全项目 860+ 处使用）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/design-system/ThemedBox.tsx
 * pieces: chunk-emhzq435.js (2)
 * attribution: fingerprint 2
 */
import { isBuiltinTheme } from "../../utils/theme.js";
import { useResolvedTheme } from "./ThemeProvider.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { BaseBox } from "../../ink/components/Box.js";

//@ chunk-emhzq435.js:5746-5902 fingerprint (2.1.88 match: resolveColor, 1)
function resolveColor(color, theme) {
  if (!color) return;
  if (
    color.startsWith("rgb(") ||
    color.startsWith("#") ||
    color.startsWith("ansi256(") ||
    color.startsWith("ansi:")
  )
    return color;
  return isBuiltinTheme(color) ? theme[color] : undefined;
}
//@ chunk-emhzq435.js:5902-6178 fingerprint (2.1.88 match: ThemedBox, 0.952)
function ThemedBox(t0) {
  let resolvedTheme = useResolvedTheme();
  return jsxProd_default(BaseBox, {
    ...t0,
    borderColor: resolveColor(t0.borderColor, resolvedTheme),
    borderTopColor: resolveColor(t0.borderTopColor, resolvedTheme),
    borderBottomColor: resolveColor(t0.borderBottomColor, resolvedTheme),
    borderLeftColor: resolveColor(t0.borderLeftColor, resolvedTheme),
    borderRightColor: resolveColor(t0.borderRightColor, resolvedTheme),
    backgroundColor: resolveColor(t0.backgroundColor, resolvedTheme),
  });
}
export { ThemedBox };
