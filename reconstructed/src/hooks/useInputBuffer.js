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
import { j, R, y, ce } from "../../vendor/react/cjs/react.production.js";
import { useClock } from "../ink/components/ClockContext.js";

//@ chunk-18hwfzwa.js:864032-864036 placement
j();
/**
 * 撤销缓冲：pushToBuffer 防抖记录 {text, cursorOffset, pastedContents}，undo 回到上一个快照，clearBuffer 清空；最多 maxBufferSize 条。
 */
//@ chunk-18hwfzwa.js:864036-865011 fingerprint = useInputBuffer (0.92)
function useInputBuffer({ maxBufferSize: maxBufferSize, debounceMs: debounceMs }) {
  let D = useClock(),
    lastPushTime = R({ entries: [], index: -1 }),
    [ee, ke] = y(lastPushTime.current),
    pendingPush = R(0),
    Be = R(null),
    pushToBuffer = ce(
      (rt, kt, At = {}, It = {}) => {
        let now = Date.now();
        if (Be.current) (Be.current(), (Be.current = null));
        if (!It.immediate && now - pendingPush.current < debounceMs) {
          Be.current = D.setTimeout(() => pushToBuffer(rt, kt, At), debounceMs);
          return;
        }
        pendingPush.current = now;
        let Et = lastPushTime.current;
        if (Et.entries[Et.index]?.text === rt) return;
        let updatedBuffer = [
            ...Et.entries.slice(0, Et.index + 1),
            { text: rt, cursorOffset: kt, pastedContents: At, timestamp: now },
          ],
          Lt = updatedBuffer.length > maxBufferSize ? updatedBuffer.slice(-maxBufferSize) : updatedBuffer;
        ((lastPushTime.current = { entries: Lt, index: Lt.length - 1 }), ke(lastPushTime.current));
      },
      [debounceMs, maxBufferSize, D],
    ),
    undo = ce(() => {
      if (Be.current) (Be.current(), (Be.current = null));
      let rt = lastPushTime.current,
        kt = rt.entries[rt.index];
      if (!kt) return;
      return (
        (lastPushTime.current = { entries: rt.entries, index: rt.index - 1 }),
        ke(lastPushTime.current),
        kt
      );
    }, []),
    clearBuffer = ce(() => {
      if (
        ((lastPushTime.current = { entries: [], index: -1 }),
        ke(lastPushTime.current),
        (pendingPush.current = 0),
        Be.current)
      )
        (Be.current(), (Be.current = null));
    }, []),
    canUndo = ee.index >= 0 && ee.entries[ee.index] !== void 0;
  return { pushToBuffer: pushToBuffer, undo: undo, canUndo: canUndo, clearBuffer: clearBuffer };
}

export { useInputBuffer };
