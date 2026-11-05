/**
 * hooks/useInputBuffer.ts
 *
 * 输入撤销缓冲：防抖记录输入快照，支持撤销（ctrl+_）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/useInputBuffer.ts
 * pieces: chunk-czq1j3j2.js (2)
 * attribution: placement 1, fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  init_react_production,
  useRef,
  useState,
  useCallback,
} from "../../vendor/react/cjs/react.production.js";
import { useClock } from "../ink/components/ClockContext.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-czq1j3j2.js:884668-884672 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:884668", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:896920-897895 fingerprint (2.1.88 match: useInputBuffer, 0.92)
/**
 * 撤销缓冲：pushToBuffer 防抖记录 {text, cursorOffset, pastedContents}，undo 回到上一个快照，clearBuffer 清空；最多 maxBufferSize 条。
 */
function useInputBuffer({ maxBufferSize, debounceMs }) {
  let clock = useClock();
  let lastPushTime = useRef({
    entries: [],
    index: -1,
  });
  let [buffer, setBuffer] = useState(lastPushTime.current);
  let lastPushTime_2 = useRef(0);
  let pendingPush = useRef(null);
  let pushToBuffer = useCallback(
    (text, cursorOffset, pastedContents = {}, options = {}) => {
      let now = Date.now();
      if (pendingPush.current) {
        pendingPush.current();
        pendingPush.current = null;
      }
      if (!options.immediate && now - lastPushTime_2.current < debounceMs) {
        pendingPush.current = clock.setTimeout(
          () => pushToBuffer(text, cursorOffset, pastedContents),
          debounceMs,
        );
        return;
      }
      lastPushTime_2.current = now;
      let newBuffer = lastPushTime.current;
      if (newBuffer.entries[newBuffer.index]?.text === text) return;
      let updatedBuffer = [
        ...newBuffer.entries.slice(0, newBuffer.index + 1),
        {
          text,
          cursorOffset,
          pastedContents,
          timestamp: now,
        },
      ];
      let trimmedEntries =
        updatedBuffer.length > maxBufferSize ? updatedBuffer.slice(-maxBufferSize) : updatedBuffer;
      lastPushTime.current = {
        entries: trimmedEntries,
        index: trimmedEntries.length - 1,
      };
      setBuffer(lastPushTime.current);
    },
    [debounceMs, maxBufferSize, clock],
  );
  let undo = useCallback(() => {
    if (pendingPush.current) {
      pendingPush.current();
      pendingPush.current = null;
    }
    let buffer_ = lastPushTime.current;
    let entry = buffer_.entries[buffer_.index];
    if (!entry) return;
    lastPushTime.current = {
      entries: buffer_.entries,
      index: buffer_.index - 1,
    };
    setBuffer(lastPushTime.current);
    return entry;
  }, []);
  let clearBuffer = useCallback(() => {
    lastPushTime.current = {
      entries: [],
      index: -1,
    };
    setBuffer(lastPushTime.current);
    lastPushTime_2.current = 0;
    if (pendingPush.current) {
      pendingPush.current();
      pendingPush.current = null;
    }
  }, []);
  let canUndo = buffer.index >= 0 && buffer.entries[buffer.index] !== undefined;
  return {
    pushToBuffer,
    undo,
    canUndo,
    clearBuffer,
  };
}
export { useInputBuffer };
