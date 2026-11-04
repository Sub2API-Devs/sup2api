/**
 * context/voice.tsx
 *
 * 语音输入状态 store（idle/recording 等、转写、电平）的 Context 与 hooks。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/context/voice.tsx
 * pieces: chunk-e6aww6q8.js (1), chunk-hxkp4105.js (2), chunk-yj65zw1g.js (8)
 * attribution: fingerprint 4, placement 6, callgraph-fingerprint 1
 */
import {
  init_react_production,
  createContext,
  useState,
  useContext,
  useMemo,
} from "../../vendor/react/cjs/react.production.js";
import { createStore } from "../state/store.js";
import { resetGitFileWatcher_2 } from "../utils/git/gitFilesystem.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { jsxProd_default } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { useAppStoreDirect } from "../state/AppState.js";
import { createTaskFramework } from "../utils/task/framework.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:4007097-4007333 fingerprint = useVoiceState (0.675)
/**
 * 等待 store 状态满足谓词或超时（返回 true/false）。旧版名 useVoiceState 为错配。
 */
function waitForStoreState(readState, predicate, timeoutMs) {
  let check = () => {
    try {
      return predicate(readState.getState());
    } catch {
      return false;
    }
  };
  if (check()) return Promise.resolve(true);
  return new Promise((resolve) => {
    let timer = setTimeout(() => {
      cleanup();
      resolve(false);
    }, timeoutMs.timeoutMs);
    let cleanup = readState.subscribe(() => {
      if (check()) {
        clearTimeout(timer);
        cleanup();
        resolve(true);
      }
    });
  });
}
//@ chunk-yj65zw1g.js:343-347 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-yj65zw1g.js:343", () => {
  init_react_production();
});
//@ chunk-yj65zw1g.js:347-487 placement
function createVoiceStore() {
  let store = createStore(DEFAULT_STATE);
  let resetGitFileWatcher = new resetGitFileWatcher_2();
  store.subscribe(() => {
    if (store.getState().voiceState !== "recording") resetGitFileWatcher.reset();
  });
  return {
    store,
    levelSmoother: resetGitFileWatcher,
  };
}
//@ chunk-yj65zw1g.js:487-625 fingerprint = DEFAULT_STATE (0.925)
/**
 * 语音默认状态 {voiceState:"idle", voiceError:null, …}。
 */
var DEFAULT_STATE = {
  voiceState: "idle",
  voiceError: null,
  voiceInterimTranscript: "",
  voiceAudioLevels: [],
  voiceWarmingUp: false,
  awaitingVoiceSubmitDoubleTap: false,
};
//@ chunk-yj65zw1g.js:708-723 placement
var voiceContext; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-yj65zw1g.js:708", () => {
  voiceContext = createContext(null);
});
//@ chunk-yj65zw1g.js:723-877 placement
/**
 * 语音状态的 Context Provider：创建一次 store 与电平平滑器并提供给子组件。
 */
function VoiceProvider(props) {
  let $ = useMemoCache(3);
  let { children } = props;
  let [voiceStore] = useState(createVoiceStore);
  let providerElement;
  if ($[0] !== children || $[1] !== voiceStore) {
    providerElement = jsxProd_default(voiceContext.Provider, {
      value: voiceStore,
      children,
    });
    $[0] = children;
    $[1] = voiceStore;
    $[2] = providerElement;
  } else providerElement = $[2];
  return providerElement;
}
//@ chunk-yj65zw1g.js:877-983 fingerprint = useVoiceStore (1)
/**
 * 读取 Voice 上下文，不在 VoiceProvider 内抛错。
 */
function useVoiceStore() {
  let store = useContext(voiceContext);
  if (!store) {
    throw Error("useVoiceState must be used within a VoiceProvider");
  }
  return store;
}
//@ chunk-yj65zw1g.js:983-1015 placement
/**
 * 语音状态 store。
 */
function useVoiceStateStore() {
  return useVoiceStore().store;
}
//@ chunk-yj65zw1g.js:1240-1277 callgraph-fingerprint = useGetVoiceState (1)
/**
 * 语音 store 的 getState。
 */
function useGetVoiceState() {
  return useVoiceStateStore().getState;
}
//@ chunk-hxkp4105.js:300-304 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-hxkp4105.js:300", () => {
  init_react_production();
});
//@ chunk-hxkp4105.js:304-379 fingerprint = useSetVoiceState (0.688)
/**
 * 返回绑定 AppState store 的 setter（ih 包装）。
 */
function useSetVoiceState() {
  let appStoreDirect = useAppStoreDirect();
  return useMemo(
    () => createTaskFramework(() => appStoreDirect.getState(), appStoreDirect.setState),
    [appStoreDirect],
  );
}
export {
  useVoiceStateStore,
  useSetVoiceState,
  waitForStoreState,
  useVoiceStore,
  useGetVoiceState,
  VoiceProvider,
};
