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
import { init_react_production, useState, useEffect } from "../../../vendor/react/cjs/react.production.js";
import { useStdin } from "../../components/design-system/ThemeProvider.js";
import { useSession } from "../../context/session.js";
import { useAppStoreDirect, useSessionHooksRegistry, useAppStateSession } from "../../state/AppState.js";
import { useSpinnerStore } from "../../components/Spinner/spinnerStatus.js";
import {
  isDapperDawnEnabled,
  isKeepaliveArmed,
  onSpinnerStateChange,
  setInteractive,
} from "../../services/api/cacheKeepalive.js";
import { isWorking } from "../../services/artifacts/artifactPresence.js";
import { hasActiveAgentTasks } from "../../tasks/taskStatus.js";
import { waitingFor, subscribeWaiting } from "../../services/artifacts/presenceSocket.js";
import { logError } from "../../utils/log.js";
import { getRipgrepStatus } from "../../utils/ripgrep.js";
import { sessionHooksRegistrySlot } from "../../utils/model/modelSwitchHooks.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-18hwfzwa.js:1739793-1739797 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:1739793", () => {
  init_react_production();
});
//@ chunk-18hwfzwa.js:1739797-1740165 placement
function useSuspendResume() {
  let { internal_eventEmitter } = useStdin();
  let [count, setCount] = useState(0);
  useEffect(() => {
    let onSuspend = () => {
      process.stdout.write(`
Claude Code has been suspended. Run \`fg\` to bring Claude Code back.
Note: ctrl + z now suspends Claude Code, ctrl + _ undoes input.
`);
    };
    let onEffect = () => {
      setCount((count) => count + 1);
    };
    internal_eventEmitter?.on("suspend", onSuspend);
    internal_eventEmitter?.on("resume", onEffect);
    return () => {
      internal_eventEmitter?.off("suspend", onSuspend);
      internal_eventEmitter?.off("resume", onEffect);
    };
  }, [internal_eventEmitter]);
  return count;
}
//@ chunk-18hwfzwa.js:1740165-1740169 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:1740165", () => {
  init_react_production();
});
//@ chunk-18hwfzwa.js:1740169-1740549 placement
/**
 * 后台会话中同步工作状态（旋转模式、压缩、子任务、等待）。
 */
function useBackgroundStatusSync() {
  let session = useSession();
  let appStoreDirect = useAppStoreDirect();
  let spinnerStore = useSpinnerStore();
  useEffect(() => {
    function sync() {
      try {
        if (!isDapperDawnEnabled() && !isKeepaliveArmed()) return;
        let { mode, isCompacting } = spinnerStore.get();
        onSpinnerStateChange({
          working: isWorking(session),
          spinnerMode: mode,
          isCompacting,
          delegatedWorkRunning: hasActiveAgentTasks(appStoreDirect.getState().tasks),
          waitingFor: waitingFor(session),
        });
      } catch (error) {
        logError(error);
      }
    }
    setInteractive(true);
    sync();
    let cleanups = [
      spinnerStore.subscribe(sync),
      getRipgrepStatus(session, sync),
      subscribeWaiting(session, sync),
      appStoreDirect.subscribe(sync),
    ];
    return () => {
      for (let cleanup of cleanups) cleanup();
      setInteractive(false);
    };
  }, [session, appStoreDirect, spinnerStore]);
}
//@ chunk-18hwfzwa.js:1740549-1740553 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:1740549", () => {
  init_react_production();
});
//@ chunk-18hwfzwa.js:1740553-1740766 placement
/**
 * 挂载期间替换相关实例的注册表，卸载时恢复。
 */
function useRegistryOverride(session) {
  let sessionHooksRegistry = useSessionHooksRegistry();
  let appStateSession = useAppStateSession();
  useEffect(() => {
    let registries = new Set([
      sessionHooksRegistrySlot.of(session),
      sessionHooksRegistrySlot.of(appStateSession),
    ]);
    let pairs = new Map([...registries].map((registry) => [registry, registry.registry]));
    for (let registry of registries) registry.registry = sessionHooksRegistry;
    return () => {
      for (let [registry, hooksRegistry] of pairs) registry.registry = hooksRegistry;
    };
  }, [session, appStateSession, sessionHooksRegistry]);
}
//@ chunk-18hwfzwa.js:1740766-1740770 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:1740766", () => {
  init_react_production();
});
export { useRegistryOverride, useBackgroundStatusSync, useSuspendResume };
