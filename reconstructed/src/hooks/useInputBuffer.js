/**
 * hooks/useInputBuffer.ts
 *
 * 输入撤销缓冲：防抖记录输入快照，支持撤销（ctrl+_）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/useInputBuffer.ts
 * pieces: chunk-18hwfzwa.js (2)
 * attribution: placement 1, fingerprint 1
 */
import { init_react_production, R, y, ce } from "../../vendor/react/cjs/react.production.js";
import { useClock } from "../ink/components/ClockContext.js";

//@ chunk-18hwfzwa.js:864032-864036 placement
init_react_production();
//@ chunk-18hwfzwa.js:864036-865011 fingerprint = useInputBuffer (0.92)
/**
 * 撤销缓冲：pushToBuffer 防抖记录 {text, cursorOffset, pastedContents}，undo 回到上一个快照，clearBuffer 清空；最多 maxBufferSize 条。
 */
function useInputBuffer({ maxBufferSize, debounceMs }) {
  let clock = useClock();
  let lastPushTime = R({
    entries: [],
    index: -1,
  });
  let [ee, ke] = y(lastPushTime.current);
  let lastPushTime_2 = R(0);
  let pendingPush = R(null);
  let pushToBuffer = ce(
    (text, cursorOffset, pastedContents = {}, It = {}) => {
      let now = Date.now();
      if (pendingPush.current) {
        pendingPush.current();
        pendingPush.current = null;
      }
      if (!It.immediate && now - lastPushTime_2.current < debounceMs) {
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
      let Lt = updatedBuffer.length > maxBufferSize ? updatedBuffer.slice(-maxBufferSize) : updatedBuffer;
      lastPushTime.current = {
        entries: Lt,
        index: Lt.length - 1,
      };
      ke(lastPushTime.current);
    },
    [debounceMs, maxBufferSize, clock],
  );
  let undo = ce(() => {
    if (pendingPush.current) {
      pendingPush.current();
      pendingPush.current = null;
    }
    let rt = lastPushTime.current;
    let kt = rt.entries[rt.index];
    if (!kt) return;
    lastPushTime.current = {
      entries: rt.entries,
      index: rt.index - 1,
    };
    ke(lastPushTime.current);
    return kt;
  }, []);
  let clearBuffer = ce(() => {
    lastPushTime.current = {
      entries: [],
      index: -1,
    };
    ke(lastPushTime.current);
    lastPushTime_2.current = 0;
    if (pendingPush.current) {
      pendingPush.current();
      pendingPush.current = null;
    }
  }, []);
  let canUndo = ee.index >= 0 && ee.entries[ee.index] !== undefined;
  return {
    pushToBuffer,
    undo,
    canUndo,
    clearBuffer,
  };
}
export { useInputBuffer };
