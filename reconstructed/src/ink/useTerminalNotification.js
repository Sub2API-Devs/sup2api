/**
 * ink/useTerminalNotification.ts
 *
 * 终端通知（OSC 9/777 等）与 TerminalWriteContext
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/useTerminalNotification.ts
 * pieces: chunk-24t3dkzb.js (3)
 * attribution: affinity 1, fingerprint 2
 */
import { createContext, useContext, useCallback, useMemo } from "../../vendor/react/cjs/react.production.js";
import { wrapForMultiplexer, osc, OSC, ITERM2_OSC9, PROGRESS } from "./termio/osc.js";
import { BEL } from "./termio/ansi.js";
import { isProgressReportingAvailable } from "./terminal.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-24t3dkzb.js:11434-11549 affinity
/**
 * 通知文本里的 C0/C1 控制字符换成空格（防止注入转义序列）。
 */
function sanitizeNotificationText(text) {
  let clean = "";
  for (let k = 0; k < text.length; k++) {
    let code = text.charCodeAt(k);
    clean += code < 32 || (code >= 127 && code <= 159) ? " " : text[k];
  }
  return clean;
}
//@ chunk-24t3dkzb.js:11549-11581 fingerprint = TerminalWriteProvider (1)
var TerminalWriteContext; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var TerminalWriteProvider;
deferInit("chunk-24t3dkzb.js:11549", () => {
  TerminalWriteContext = createContext(null);
  TerminalWriteProvider = TerminalWriteContext.Provider;
});
//@ chunk-24t3dkzb.js:11581-12602 fingerprint = useTerminalNotification (1)
/**
 * 终端通知钩子：iTerm2（OSC 9）、kitty（OSC 99 标题+正文+聚焦）、Ghostty（OSC 777 notify）、响铃（BEL）、进度条（OSC 9;4：running/error/indeterminate/completed，终端不支持时不写）；全部经 tmux/screen 透传包装。
 */
function useTerminalNotification() {
  let writeRaw = useContext(TerminalWriteContext);
  if (!writeRaw) throw Error("useTerminalNotification must be used within TerminalWriteProvider");
  let notifyITerm2 = useCallback(
    ({ message, title }) => {
      let displayString = title ? `${title}: ${message}` : message;
      writeRaw(wrapForMultiplexer(osc(OSC.ITERM2, sanitizeNotificationText(displayString))));
    },
    [writeRaw],
  );
  let notifyKitty = useCallback(
    ({ message, title, id }) => {
      writeRaw(wrapForMultiplexer(osc(OSC.KITTY, `i=${id}:d=0:p=title`, sanitizeNotificationText(title))));
      writeRaw(wrapForMultiplexer(osc(OSC.KITTY, `i=${id}:p=body`, sanitizeNotificationText(message))));
      writeRaw(wrapForMultiplexer(osc(OSC.KITTY, `i=${id}:d=1:a=focus`, "")));
    },
    [writeRaw],
  );
  let notifyGhostty = useCallback(
    ({ message, title }) => {
      writeRaw(
        wrapForMultiplexer(
          osc(OSC.GHOSTTY, "notify", sanitizeNotificationText(title), sanitizeNotificationText(message)),
        ),
      );
    },
    [writeRaw],
  );
  let notifyBell = useCallback(() => {
    writeRaw(BEL);
  }, [writeRaw]);
  let progress = useCallback(
    (state, percentage) => {
      if (!isProgressReportingAvailable()) return;
      if (!state) {
        writeRaw(wrapForMultiplexer(osc(OSC.ITERM2, ITERM2_OSC9.PROGRESS, PROGRESS.CLEAR, "")));
        return;
      }
      let pct = Math.max(0, Math.min(100, Math.round(percentage ?? 0)));
      switch (state) {
        case "completed":
          writeRaw(wrapForMultiplexer(osc(OSC.ITERM2, ITERM2_OSC9.PROGRESS, PROGRESS.CLEAR, "")));
          break;
        case "error":
          writeRaw(wrapForMultiplexer(osc(OSC.ITERM2, ITERM2_OSC9.PROGRESS, PROGRESS.ERROR, pct)));
          break;
        case "indeterminate":
          writeRaw(wrapForMultiplexer(osc(OSC.ITERM2, ITERM2_OSC9.PROGRESS, PROGRESS.INDETERMINATE, "")));
          break;
        case "running":
          writeRaw(wrapForMultiplexer(osc(OSC.ITERM2, ITERM2_OSC9.PROGRESS, PROGRESS.SET, pct)));
          break;
        case null:
          break;
      }
    },
    [writeRaw],
  );
  return useMemo(
    () => ({
      notifyITerm2,
      notifyKitty,
      notifyGhostty,
      notifyBell,
      progress,
    }),
    [notifyITerm2, notifyKitty, notifyGhostty, notifyBell, progress],
  );
}
export { useTerminalNotification, TerminalWriteContext, TerminalWriteProvider };
