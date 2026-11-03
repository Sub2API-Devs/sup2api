/**
 * ink/termio/types.ts
 *
 * termio 公共类型与默认文本样式
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/termio/types.ts
 * pieces: chunk-m1vyn8g1.js (1)
 * attribution: fingerprint 1
 */

/**
 * termio 文本样式的默认值（无粗体/斜体/下划线…，前景/背景/下划线色为 default）。
 */
//@ chunk-m1vyn8g1.js:314-510 fingerprint = defaultStyle (1)
function defaultStyle() {
  return {
    bold: !1,
    dim: !1,
    italic: !1,
    underline: "none",
    blink: !1,
    inverse: !1,
    hidden: !1,
    strikethrough: !1,
    overline: !1,
    fg: { type: "default" },
    bg: { type: "default" },
    underlineColor: { type: "default" },
  };
}

export { defaultStyle };
