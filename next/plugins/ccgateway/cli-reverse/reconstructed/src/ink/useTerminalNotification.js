/**
 * ink/useTerminalNotification.ts
 *
 * 终端通知（OSC 9/777 等）与 TerminalWriteContext
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/useTerminalNotification.ts
 * pieces: chunk-xd1cb3xs.js (3)
 * attribution: placement 1, layout 1, fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { createContext, useContext, useCallback, useMemo } from "../../vendor/react/cjs/react.production.js";
import { wrapForMultiplexer, osc, OSC, ITERM2_OSC9, PROGRESS } from "./termio/osc.js";
import { BEL } from "./termio/ansi.js";
import { isProgressReportingAvailable } from "./terminal.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-xd1cb3xs.js:11364-11479 placement
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
//@ chunk-xd1cb3xs.js:11479-11511 layout (2.1.88 match: TerminalWriteProvider, 1)
var TerminalWriteContext; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var TerminalWriteProvider;
deferInit("chunk-xd1cb3xs.js:11479", () => {
  TerminalWriteContext = createContext(null);
  TerminalWriteProvider = TerminalWriteContext.Provider;
});
//@ chunk-xd1cb3xs.js:11511-12532 fingerprint (2.1.88 match: useTerminalNotification, 1)
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
export { TerminalWriteProvider, TerminalWriteContext, useTerminalNotification };
