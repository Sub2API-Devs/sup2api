/**
 * ink/terminalModes.ts
 *
 * 2.1.316 新增。终端模式（备用屏、鼠标、焦点等）切换。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-24t3dkzb.js (13)
 * attribution: placement 13
 */
import { StdinContext } from "./components/StdinContext.js";
import { init_react_production, qt } from "../../vendor/react/cjs/react.production.js";
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

//@ chunk-24t3dkzb.js:8756-8766 placement
var StdinContextAlias = StdinContext;
//@ chunk-24t3dkzb.js:8766-8770 placement
init_react_production();
//@ chunk-24t3dkzb.js:8770-8786 placement
var TerminalSizeContext = qt(null);
//@ chunk-24t3dkzb.js:8786-8790 placement
init_react_production();
//@ chunk-24t3dkzb.js:8790-8881 placement
function setSurfaceColorsSequence({ background, foreground }) {
  return osc(OSC.SET_BG_COLOR, background) + osc(OSC.SET_FG_COLOR, foreground);
}
//@ chunk-24t3dkzb.js:8881-8945 placement
function resetSurfaceColorsSequence() {
  return osc(OSC.RESET_BG_COLOR) + osc(OSC.RESET_FG_COLOR);
}
//@ chunk-24t3dkzb.js:8945-9074 placement
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
//@ chunk-24t3dkzb.js:9074-9536 placement
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
//@ chunk-24t3dkzb.js:9536-11357 placement
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
  isSet(r) {
    return this.entries.some((entry) => entry.mode === r);
  }
  set(r, n) {
    if (this.isSet(r)) return "";
    let o = this.add(this.entry(r, n));
    if (r === "altScreen") o += this.add(modeEntry("altScreenKeys"));
    return this.suspended ? "" : o;
  }
  reset(r) {
    if (!this.isSet(r)) return "";
    let n = r === "altScreen" ? this.remove("altScreenKeys") : "";
    let o = this.remove(r);
    if (this.suspended && r === this.kept) {
      this.kept = undefined;
      return o;
    }
    return this.suspended ? "" : n + o;
  }
  reassert(r) {
    if (this.suspended) return "";
    return this.entries.find((entry) => entry.mode === r)?.on ?? "";
  }
  reassertKeys() {
    if (this.suspended) return "";
    let r = this.isSet("altScreen") ? "altScreenKeys" : "extendedKeys";
    return this.entries.find((entry) => entry.mode === r)?.on ?? "";
  }
  reassertFrom(r) {
    if (this.suspended || !this.isSet(r)) return "";
    return this.entries
      .filter((entry) => MODE_LAYER[entry.mode] >= MODE_LAYER[r])
      .reduce((acc, entry) => acc + entry.on, "");
  }
  suspend(r) {
    if (this.suspended) return "";
    this.suspended = true;
    this.kept = r;
    return this.entries.reduceRight((n, o) => (o.mode === r ? n : n + o.off), "");
  }
  resume({ clearKeys: r = false } = {}) {
    if (!this.suspended) return "";
    this.suspended = false;
    this.kept = undefined;
    let n = this.isSet("altScreen");
    let o = r ? disableModifyOtherKeysSequence() + (n ? "" : popKittyKeyboardSequence()) : "";
    return this.entries.reduce(
      (acc, entry) => acc + entry.on + (r && entry.mode === "altScreen" ? popKittyKeyboardSequence() : ""),
      o,
    );
  }
  resetAll() {
    let r = this.suspended ? this.entries.filter((entry) => entry.mode === this.kept) : this.entries;
    this.entries = [];
    this.kept = undefined;
    return r.reduceRight((n, o) => n + o.off, "");
  }
  entry(mode, n) {
    switch (mode) {
      case "mouse": {
        let o = typeof n === "string" ? n : "off";
        return {
          mode,
          on: mouseTrackingSequence(o),
          off: o === "off" ? "" : DISABLE_MOUSE_TRACKING,
        };
      }
      case "surface":
        return {
          mode,
          on: typeof n === "object" ? setSurfaceColorsSequence(n) : "",
          off: resetSurfaceColorsSequence(),
        };
      default:
        return modeEntry(mode);
    }
  }
  add(r) {
    let index = this.entries.findIndex((entry) => MODE_LAYER[entry.mode] > MODE_LAYER[r.mode]);
    if (index === -1) this.entries.push(r);
    else this.entries.splice(index, 0, r);
    return r.on;
  }
  remove(r) {
    let index = this.entries.findIndex((entry) => entry.mode === r);
    if (index === -1) return "";
    return this.entries.splice(index, 1)[0].off;
  }
}
//@ chunk-24t3dkzb.js:11357-11375 placement
var TerminalModesContext = qt(new TerminalModes());
//@ chunk-24t3dkzb.js:11375-11420 placement
TerminalModesContext.displayName = "InternalTerminalModesContext";
//@ chunk-24t3dkzb.js:11420-11430 placement
var TerminalModesContextAlias = TerminalModesContext;
//@ chunk-24t3dkzb.js:11430-11434 placement
init_react_production();
export { TerminalSizeContext, StdinContextAlias, TerminalModesContextAlias, TerminalModes };
