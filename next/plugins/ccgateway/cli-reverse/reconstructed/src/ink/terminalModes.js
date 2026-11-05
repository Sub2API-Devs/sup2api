/**
 * ink/terminalModes.ts
 *
 * 2.1.316 新增。终端模式（备用屏、鼠标、焦点等）切换。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-xd1cb3xs.js (13)
 * attribution: placement 13
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { StdinContext } from "./components/StdinContext.js";
import { init_react_production, createContext } from "../../vendor/react/cjs/react.production.js";
import { osc, OSC } from "./termio/osc.js";
import {
  EBP,
  DBP,
  ENABLE_THEME_NOTIFY,
  DISABLE_THEME_NOTIFY,
  EFE,
  DFE,
  ENABLE_MOUSE_PIXELS,
  DISABLE_MOUSE_PIXELS,
  ENTER_ALT_SCREEN,
  EXIT_ALT_SCREEN,
  mouseTrackingSequence,
  DISABLE_MOUSE_TRACKING,
} from "./termio/dec.js";
import {
  enableExtendedKeysSequence,
  disableModifyOtherKeysSequence,
  popKittyKeyboardSequence,
} from "./terminal.js";
import { ERASE_SCREEN, CURSOR_HOME } from "./termio/csi.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-xd1cb3xs.js:8686-8696 placement
var StdinContextAlias; // deferred: uses StdinContext (./components/StdinContext.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-xd1cb3xs.js:8686", () => {
  StdinContextAlias = StdinContext;
});
//@ chunk-xd1cb3xs.js:8696-8700 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-xd1cb3xs.js:8696", () => {
  init_react_production();
});
//@ chunk-xd1cb3xs.js:8700-8716 placement
var TerminalSizeContext; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-xd1cb3xs.js:8700", () => {
  TerminalSizeContext = createContext(null);
});
//@ chunk-xd1cb3xs.js:8716-8720 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-xd1cb3xs.js:8716", () => {
  init_react_production();
});
//@ chunk-xd1cb3xs.js:8720-8811 placement
function setSurfaceColorsSequence({ background, foreground }) {
  return osc(OSC.SET_BG_COLOR, background) + osc(OSC.SET_FG_COLOR, foreground);
}
//@ chunk-xd1cb3xs.js:8811-8875 placement
function resetSurfaceColorsSequence() {
  return osc(OSC.RESET_BG_COLOR) + osc(OSC.RESET_FG_COLOR);
}
//@ chunk-xd1cb3xs.js:8875-9004 placement
var MODE_LAYER = {
  bracketedPaste: 0,
  themeReports: 0,
  extendedKeys: 0,
  altScreen: 1,
  altScreenKeys: 2,
  mouse: 2,
  mousePixels: 2,
  surface: 3,
  focusEvents: 4,
};
//@ chunk-xd1cb3xs.js:9004-9466 placement
/**
 * 终端模式 → {on, off} 序列：括号粘贴 2004、主题报告 2031、焦点事件 1004、像素鼠标 1016、扩展键（kitty 键盘 + modifyOtherKeys）、备用屏 1049（附清屏）、备用屏专用键模式。
 */
function modeEntry(mode) {
  switch (mode) {
    case "bracketedPaste":
      return {
        mode,
        on: EBP,
        off: DBP,
      };
    case "themeReports":
      return {
        mode,
        on: ENABLE_THEME_NOTIFY,
        off: DISABLE_THEME_NOTIFY,
      };
    case "focusEvents":
      return {
        mode,
        on: EFE,
        off: DFE,
      };
    case "mousePixels":
      return {
        mode,
        on: ENABLE_MOUSE_PIXELS,
        off: DISABLE_MOUSE_PIXELS,
      };
    case "extendedKeys":
      return {
        mode,
        get on() {
          return enableExtendedKeysSequence();
        },
        get off() {
          return disableModifyOtherKeysSequence() + popKittyKeyboardSequence();
        },
      };
    case "altScreen":
      return {
        mode,
        on: ENTER_ALT_SCREEN + ERASE_SCREEN + CURSOR_HOME,
        get off() {
          return EXIT_ALT_SCREEN + disableModifyOtherKeysSequence();
        },
      };
    case "altScreenKeys":
      return {
        mode,
        get on() {
          return enableExtendedKeysSequence();
        },
        get off() {
          return popKittyKeyboardSequence();
        },
      };
  }
}
//@ chunk-xd1cb3xs.js:9466-11287 placement
/**
 * 终端模式管理：按设置顺序记录已开的模式（鼠标、表面颜色、括号粘贴、焦点、扩展键、备用屏…），set/reset 返回要写的序列；suspend/resume 在挂起或交出终端时成组关闭/恢复（可保留一个）；reassertKeys/reassertFrom 在终端可能丢失状态时重发；resetAll 退出时全部关闭（逆序）。
 */
class TerminalModes {
  entries = [];
  suspended = false;
  kept;
  get isSuspended() {
    return this.suspended;
  }
  isSet(mode) {
    return this.entries.some((entry) => entry.mode === mode);
  }
  set(mode, value) {
    if (this.isSet(mode)) return "";
    let sequences = this.add(this.entry(mode, value));
    if (mode === "altScreen") sequences += this.add(modeEntry("altScreenKeys"));
    return this.suspended ? "" : sequences;
  }
  reset(mode) {
    if (!this.isSet(mode)) return "";
    let keysSequence = mode === "altScreen" ? this.remove("altScreenKeys") : "";
    let modeSequence = this.remove(mode);
    if (this.suspended && mode === this.kept) {
      this.kept = undefined;
      return modeSequence;
    }
    return this.suspended ? "" : keysSequence + modeSequence;
  }
  reassert(mode) {
    if (this.suspended) return "";
    return this.entries.find((entry) => entry.mode === mode)?.on ?? "";
  }
  reassertKeys() {
    if (this.suspended) return "";
    let keyMode = this.isSet("altScreen") ? "altScreenKeys" : "extendedKeys";
    return this.entries.find((entry) => entry.mode === keyMode)?.on ?? "";
  }
  reassertFrom(mode) {
    if (this.suspended || !this.isSet(mode)) return "";
    return this.entries
      .filter((entry) => MODE_LAYER[entry.mode] >= MODE_LAYER[mode])
      .reduce((acc, entry) => acc + entry.on, "");
  }
  suspend(keptMode) {
    if (this.suspended) return "";
    this.suspended = true;
    this.kept = keptMode;
    return this.entries.reduceRight(
      (accumulated, entry) => (entry.mode === keptMode ? accumulated : accumulated + entry.off),
      "",
    );
  }
  resume({ clearKeys = false } = {}) {
    if (!this.suspended) return "";
    this.suspended = false;
    this.kept = undefined;
    let hasAltScreen = this.isSet("altScreen");
    let keysResetSequence = clearKeys
      ? disableModifyOtherKeysSequence() + (hasAltScreen ? "" : popKittyKeyboardSequence())
      : "";
    return this.entries.reduce(
      (acc, entry) =>
        acc + entry.on + (clearKeys && entry.mode === "altScreen" ? popKittyKeyboardSequence() : ""),
      keysResetSequence,
    );
  }
  resetAll() {
    let activeEntries = this.suspended
      ? this.entries.filter((entry) => entry.mode === this.kept)
      : this.entries;
    this.entries = [];
    this.kept = undefined;
    return activeEntries.reduceRight((accumulated, entry) => accumulated + entry.off, "");
  }
  entry(mode, value) {
    switch (mode) {
      case "mouse": {
        let tracking = typeof value === "string" ? value : "off";
        return {
          mode,
          on: mouseTrackingSequence(tracking),
          off: tracking === "off" ? "" : DISABLE_MOUSE_TRACKING,
        };
      }
      case "surface":
        return {
          mode,
          on: typeof value === "object" ? setSurfaceColorsSequence(value) : "",
          off: resetSurfaceColorsSequence(),
        };
      default:
        return modeEntry(mode);
    }
  }
  add(entry) {
    let index = this.entries.findIndex((entry_2) => MODE_LAYER[entry_2.mode] > MODE_LAYER[entry.mode]);
    if (index === -1) this.entries.push(entry);
    else this.entries.splice(index, 0, entry);
    return entry.on;
  }
  remove(mode) {
    let index = this.entries.findIndex((entry) => entry.mode === mode);
    if (index === -1) return "";
    return this.entries.splice(index, 1)[0].off;
  }
}
//@ chunk-xd1cb3xs.js:11287-11305 placement
var TerminalModesContext; // deferred: uses TerminalModes of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-xd1cb3xs.js:11287", () => {
  TerminalModesContext = createContext(new TerminalModes());
});
//@ chunk-xd1cb3xs.js:11305-11350 placement
// deferred: uses TerminalModesContext of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-xd1cb3xs.js:11305", () => {
  TerminalModesContext.displayName = "InternalTerminalModesContext";
});
//@ chunk-xd1cb3xs.js:11350-11360 placement
var TerminalModesContextAlias; // deferred: uses TerminalModesContext of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-xd1cb3xs.js:11350", () => {
  TerminalModesContextAlias = TerminalModesContext;
});
//@ chunk-xd1cb3xs.js:11360-11364 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-xd1cb3xs.js:11360", () => {
  init_react_production();
});
export { TerminalSizeContext, StdinContextAlias, TerminalModes, TerminalModesContextAlias };
