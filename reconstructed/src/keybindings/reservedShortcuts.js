/**
 * keybindings/reservedShortcuts.ts
 *
 * 保留快捷键表与按键串规范化；本模块 34 个声明是误归的路径/沙箱/符号常量
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/keybindings/reservedShortcuts.ts
 * pieces: chunk-6qssfmzs.js (3)
 * attribution: fingerprint 2, affinity 1
 */

/**
 * 保留快捷键：NON_REBINDABLE（ctrl+c/ctrl+d 硬编码、ctrl+m=Enter、ctrl+[=Esc、ctrl+i=Tab、ctrl+h=Backspace、capslock 收不到）；TERMINAL_RESERVED（ctrl+z SIGTSTP 警告、ctrl+\ SIGQUIT）；MACOS_RESERVED（cmd+c/v/x/q/w/tab/space）。
 */
//@ chunk-6qssfmzs.js:7531-8790 fingerprint = MACOS_RESERVED (0.618)
var NON_REBINDABLE = [
    { key: "ctrl+c", reason: "Cannot be rebound - used for interrupt/exit (hardcoded)", severity: "error" },
    { key: "ctrl+d", reason: "Cannot be rebound - used for exit (hardcoded)", severity: "error" },
    {
      key: "ctrl+m",
      reason: "Cannot be rebound - identical to Enter in terminals (both send CR)",
      severity: "error",
    },
    { key: "ctrl+[", reason: "Cannot be rebound - identical to Escape in terminals", severity: "error" },
    { key: "ctrl+i", reason: "Cannot be rebound - identical to Tab in terminals", severity: "error" },
    { key: "ctrl+h", reason: "Cannot be rebound - identical to Backspace in terminals", severity: "error" },
    { key: "capslock", reason: "Caps Lock is not delivered to terminal applications", severity: "error" },
  ],
  TERMINAL_RESERVED = [
    { key: "ctrl+z", reason: "Unix process suspend (SIGTSTP)", severity: "warning" },
    { key: "ctrl+\\", reason: "Terminal quit signal (SIGQUIT)", severity: "error" },
  ],
  MACOS_RESERVED = [
    { key: "cmd+c", reason: "macOS system copy", severity: "error" },
    { key: "cmd+v", reason: "macOS system paste", severity: "error" },
    { key: "cmd+x", reason: "macOS system cut", severity: "error" },
    { key: "cmd+q", reason: "macOS quit application", severity: "error" },
    { key: "cmd+w", reason: "macOS close window/tab", severity: "error" },
    { key: "cmd+tab", reason: "macOS app switcher", severity: "error" },
    { key: "cmd+space", reason: "macOS Spotlight", severity: "error" },
  ];
//@ chunk-6qssfmzs.js:8959-9131 affinity
var KEY_ALIASES = {
  esc: "escape",
  return: "enter",
  del: "delete",
  "\u2191": "up",
  "\u2193": "down",
  "\u2190": "left",
  "\u2192": "right",
  caps: "capslock",
  "caps-lock": "capslock",
  caps_lock: "capslock",
};
//@ chunk-6qssfmzs.js:9131-9545 fingerprint = normalizeStep (0.892)
function normalizeStep(step) {
  let parts = step.split("+"),
    modifiers = [],
    mainKey = "";
  for (let part of parts) {
    let lower = part.trim().toLowerCase();
    if (
      ["ctrl", "control", "alt", "opt", "option", "meta", "cmd", "command", "super", "win", "shift"].includes(
        lower,
      )
    )
      if (lower === "control") modifiers.push("ctrl");
      else if (lower === "option" || lower === "opt" || lower === "meta") modifiers.push("alt");
      else if (lower === "command" || lower === "cmd" || lower === "super" || lower === "win")
        modifiers.push("cmd");
      else modifiers.push(lower);
    else mainKey = KEY_ALIASES[lower] ?? lower;
  }
  return (modifiers.sort(), [...modifiers, mainKey].join("+"));
}

export { NON_REBINDABLE, TERMINAL_RESERVED, MACOS_RESERVED, normalizeStep };
