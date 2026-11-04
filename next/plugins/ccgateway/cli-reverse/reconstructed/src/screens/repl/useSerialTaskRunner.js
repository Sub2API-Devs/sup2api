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
import { init_react_production, useRef, useCallback } from "../../../vendor/react/cjs/react.production.js";
import { isRemoteSessionAvailable } from "../../remote/remoteMode.js";
import { isUnattendedInteractiveSession } from "../../utils/concurrentSessions.js";
import { logError } from "../../utils/log.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-18hwfzwa.js:1801080-1801084 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:1801080", () => {
  init_react_production();
});
//@ chunk-18hwfzwa.js:1801084-1801339 placement
/**
 * 串行任务执行 Hook：同时只运行一个任务，运行中到达的任务按键合并后续执行（无人值守时跳过）。
 */
function useSerialTaskRunner() {
  let running = useRef(false);
  let pending = useRef(new Map());
  let schedule = useCallback((key, task) => {
    if (isRemoteSessionAvailable() || isUnattendedInteractiveSession()) return;
    if (running.current) {
      pending.current.set(key, task);
      return;
    }
    running.current = true;
    task()
      .catch(logError)
      .finally(() => {
        running.current = false;
        let [entry] = pending.current;
        if (entry) {
          let [task, args] = entry;
          pending.current.delete(task);
          schedule(task, args);
        }
      });
  }, []);
  return schedule;
}
export { useSerialTaskRunner };
