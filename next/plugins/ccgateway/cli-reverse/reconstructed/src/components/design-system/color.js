/**
 * components/design-system/color.ts
 *
 * 把主题色名或原始颜色解析为 chalk 着色函数。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/design-system/color.ts
 * pieces: chunk-agvt6ygy.js (1)
 * attribution: placement 1
 */
import { colorize } from "../../../vendor/es-toolkit/dist/server/colors/index.mjs";
import { getTheme } from "../../utils/theme.js";

//@ chunk-agvt6ygy.js:231-456 placement (2.1.88 match: color, 1)
/**
 * 颜色解析为 chalk：rgb()/#hex/ansi256()/ansi: 直接用，主题键查当前调色板，foreground 表示默认前景。
 */
function color(c, theme, type = "foreground") {
  return (text) => {
    if (!c) return text;
    if (c.startsWith("rgb(") || c.startsWith("#") || c.startsWith("ansi256(") || c.startsWith("ansi:"))
      return colorize(text, c, type);
    let resolvedTheme = typeof theme === "string" ? getTheme(theme) : theme;
    return colorize(text, resolvedTheme[c], type);
  };
}
export { color };
