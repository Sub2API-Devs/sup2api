/**
 * screens/_new/useSerialTaskRunner.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (2)
 * attribution: sole-consumer-new 2
 */
import { j, R, ce } from "../../../vendor/react/cjs/react.production.js";
import { wt } from "../../remote/remoteMode.js";
import { isUnattendedInteractiveSession } from "../../utils/concurrentSessions.js";
import { logError } from "../../utils/log.js";

//@ chunk-18hwfzwa.js:1801080-1801084 sole-consumer-new
j();
/**
 * 串行任务执行 Hook：同时只运行一个任务，运行中到达的任务按键合并后续执行（无人值守时跳过）。
 */
//@ chunk-18hwfzwa.js:1801084-1801339 sole-consumer-new
function useSerialTaskRunner() {
  let h = R(!1),
    x = R(new Map()),
    D = ce((L, ee) => {
      if (wt() || isUnattendedInteractiveSession()) return;
      if (h.current) {
        x.current.set(L, ee);
        return;
      }
      ((h.current = !0),
        ee()
          .catch(logError)
          .finally(() => {
            h.current = !1;
            let [ke] = x.current;
            if (ke) {
              let [Re, Be] = ke;
              (x.current.delete(Re), D(Re, Be));
            }
          }));
    }, []);
  return D;
}

export { useSerialTaskRunner };
