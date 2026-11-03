/**
 * screens/repl/useSerialTaskRunner.ts
 *
 * 2.1.316 新增：串行任务执行 Hook：同时只运行一个任务，运行中到达的任务按键合并后续执行（远程与无人值守时跳过）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (2)
 * attribution: placement 2
 */
import { init_react_production, R, ce } from "../../../vendor/react/cjs/react.production.js";
import { isRemoteSessionAvailable } from "../../remote/remoteMode.js";
import { isUnattendedInteractiveSession } from "../../utils/concurrentSessions.js";
import { logError } from "../../utils/log.js";

//@ chunk-18hwfzwa.js:1801080-1801084 placement
init_react_production();
//@ chunk-18hwfzwa.js:1801084-1801339 placement
/**
 * 串行任务执行 Hook：同时只运行一个任务，运行中到达的任务按键合并后续执行（无人值守时跳过）。
 */
function useSerialTaskRunner() {
  let h = R(false);
  let x = R(new Map());
  let D = ce((L, ee) => {
    if (isRemoteSessionAvailable() || isUnattendedInteractiveSession()) return;
    if (h.current) {
      x.current.set(L, ee);
      return;
    }
    h.current = true;
    ee()
      .catch(logError)
      .finally(() => {
        h.current = false;
        let [ke] = x.current;
        if (ke) {
          let [Re, Be] = ke;
          x.current.delete(Re);
          D(Re, Be);
        }
      });
  }, []);
  return D;
}
export { useSerialTaskRunner };
