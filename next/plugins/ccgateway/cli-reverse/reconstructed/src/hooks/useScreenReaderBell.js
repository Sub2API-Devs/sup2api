/**
 * hooks/useScreenReaderBell.ts
 *
 * 2.1.316 新增：返回一个回调：仅在开启屏幕阅读器时按最小间隔通过终端通知发出响铃（间隔按宿主记录）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-6gyvmn2t.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { useIsScreenReaderEnabled } from "../ink/components/ErrorBoundary.js";
import { useTerminalNotification } from "../ink/useTerminalNotification.js";
import { useHost } from "../context/session.js";
import { useCallback } from "../../vendor/react/cjs/react.production.js";
import { claimOnceStore } from "../services/api/verificationRequired.js";
import { MAX_LIST_ENTRIES_WITHOUT_UUID_LOGGED } from "../bridge/inboundMessages.js";

//@ chunk-6gyvmn2t.js:548-711 placement
/**
 * 返回一个回调：仅在开启屏幕阅读器时按最小间隔（Vv）通过终端通知发出响铃，间隔记录在每宿主的 claimOnceStore 里。
 */
function useScreenReaderBell() {
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let terminalNotification = useTerminalNotification();
  let host = useHost();
  return useCallback(() => {
    if (!isScreenReaderEnabled) return;
    let claimState = claimOnceStore.of(host);
    let now = Date.now();
    if (now - claimState.lastBellAt < MAX_LIST_ENTRIES_WITHOUT_UUID_LOGGED) return;
    claimState.lastBellAt = now;
    terminalNotification.notifyBell();
  }, [isScreenReaderEnabled, terminalNotification, host]);
}
export { useScreenReaderBell };
