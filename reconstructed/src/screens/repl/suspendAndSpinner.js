/**
 * screens/repl/suspendAndSpinner.ts
 *
 * 2.1.316 新增。挂起与加载动画。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (7)
 * attribution: placement 7
 */
import { j, y, P } from "../../../vendor/react/cjs/react.production.js";
import { useStdin } from "../../components/design-system/ThemeProvider.js";
import { useSession } from "../../context/session.js";
import { Cr, useSessionHooksRegistry, useAppStateSession } from "../../state/AppState.js";
import { useSpinnerStore } from "../../components/Spinner/spinnerStatus.js";
import { njt, LVs, onSpinnerStateChange, setInteractive } from "../../services/api/cacheKeepalive.js";
import { fzn } from "../../services/artifacts/artifactPresence.js";
import { hasActiveAgentTasks } from "../../tasks/taskStatus.js";
import { oRo, $Fs } from "../../services/artifacts/presenceSocket.js";
import { logError } from "../../utils/log.js";
import { getRipgrepStatus } from "../../utils/ripgrep.js";
import { ptt } from "../../utils/model/modelSwitchHooks.js";

//@ chunk-18hwfzwa.js:1739793-1739797 placement
j();
//@ chunk-18hwfzwa.js:1739797-1740165 placement
function useSuspendResume() {
  let { internal_eventEmitter: internal_eventEmitter } = useStdin(),
    [x, D] = y(0);
  return (
    P(() => {
      let L = () => {
          process.stdout.write(`
Claude Code has been suspended. Run \`fg\` to bring Claude Code back.
Note: ctrl + z now suspends Claude Code, ctrl + _ undoes input.
`);
        },
        ee = () => {
          D((ke) => ke + 1);
        };
      return (
        internal_eventEmitter?.on("suspend", L),
        internal_eventEmitter?.on("resume", ee),
        () => {
          (internal_eventEmitter?.off("suspend", L), internal_eventEmitter?.off("resume", ee));
        }
      );
    }, [internal_eventEmitter]),
    x
  );
}
//@ chunk-18hwfzwa.js:1740165-1740169 placement
j();
/**
 * 后台会话中同步工作状态（旋转模式、压缩、子任务、等待）。
 */
//@ chunk-18hwfzwa.js:1740169-1740549 placement
function useBackgroundStatusSync() {
  let h = useSession(),
    x = Cr(),
    D = useSpinnerStore();
  P(() => {
    function L() {
      try {
        if (!njt() && !LVs()) return;
        let { mode: mode, isCompacting: isCompacting } = D.get();
        onSpinnerStateChange({
          working: fzn(h),
          spinnerMode: mode,
          isCompacting: isCompacting,
          delegatedWorkRunning: hasActiveAgentTasks(x.getState().tasks),
          waitingFor: oRo(h),
        });
      } catch (error) {
        logError(error);
      }
    }
    (setInteractive(!0), L());
    let ee = [D.subscribe(L), getRipgrepStatus(h, L), $Fs(h, L), x.subscribe(L)];
    return () => {
      for (let ke of ee) ke();
      setInteractive(!1);
    };
  }, [h, x, D]);
}
//@ chunk-18hwfzwa.js:1740549-1740553 placement
j();
/**
 * 挂载期间替换相关实例的注册表，卸载时恢复。
 */
//@ chunk-18hwfzwa.js:1740553-1740766 placement
function useRegistryOverride(h) {
  let x = useSessionHooksRegistry(),
    D = useAppStateSession();
  P(() => {
    let L = new Set([ptt.of(h), ptt.of(D)]),
      ee = new Map([...L].map((ke) => [ke, ke.registry]));
    for (let ke of L) ke.registry = x;
    return () => {
      for (let [ke, Re] of ee) ke.registry = Re;
    };
  }, [h, D, x]);
}
//@ chunk-18hwfzwa.js:1740766-1740770 placement
j();

export { useRegistryOverride, useBackgroundStatusSync, useSuspendResume };
