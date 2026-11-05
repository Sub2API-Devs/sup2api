/**
 * ink/termio/types.ts
 *
 * termio 公共类型与默认文本样式
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/termio/types.ts
 * pieces: chunk-kx37bqfp.js (1)
 * attribution: fingerprint 1
 */

//@ chunk-kx37bqfp.js:314-510 fingerprint (2.1.88 match: defaultStyle, 1)
/**
 * termio 文本样式的默认值（无粗体/斜体/下划线…，前景/背景/下划线色为 default）。
 */
function defaultStyle() {
  return {
    bold: false,
    dim: false,
    italic: false,
    underline: "none",
    blink: false,
    inverse: false,
    hidden: false,
    strikethrough: false,
    overline: false,
    fg: {
      type: "default",
    },
    bg: {
      type: "default",
    },
    underlineColor: {
      type: "default",
    },
  };
}
export { defaultStyle };
