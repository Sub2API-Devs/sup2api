/**
 * context/voice.tsx
 *
 * 语音输入状态 store（idle/recording 等、转写、电平）的 Context 与 hooks。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/context/voice.tsx
 * pieces: chunk-5xgkngpb.js (1), chunk-77bb8s6j.js (8), chunk-m7rax0fa.js (2)
 * attribution: fingerprint 3, placement 7, callgraph-fingerprint 1
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

//@ chunk-5xgkngpb.js:4112563-4112799 fingerprint (2.1.88 match: useVoiceState, 0.675)
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
//@ chunk-77bb8s6j.js:343-347 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-77bb8s6j.js:343", () => {
  init_react_production();
});
//@ chunk-77bb8s6j.js:347-487 placement
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
//@ chunk-77bb8s6j.js:487-625 fingerprint (2.1.88 match: DEFAULT_STATE, 0.925)
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
//@ chunk-77bb8s6j.js:708-723 placement
var voiceContext; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-77bb8s6j.js:708", () => {
  voiceContext = createContext(null);
});
//@ chunk-77bb8s6j.js:723-877 placement (2.1.88 match: TerminalWriteProvider, 1)
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
//@ chunk-77bb8s6j.js:877-983 fingerprint (2.1.88 match: useVoiceStore, 1)
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
//@ chunk-77bb8s6j.js:983-1015 placement
/**
 * 语音状态 store。
 */
function useVoiceStateStore() {
  return useVoiceStore().store;
}
//@ chunk-77bb8s6j.js:1240-1277 callgraph-fingerprint (2.1.88 match: useGetVoiceState, 1)
/**
 * 语音 store 的 getState。
 */
function useGetVoiceState() {
  return useVoiceStateStore().getState;
}
//@ chunk-m7rax0fa.js:300-304 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-m7rax0fa.js:300", () => {
  init_react_production();
});
//@ chunk-m7rax0fa.js:304-379 placement
/**
 * 返回绑定 AppState store 的 setter（ih 包装）。
 */
function useTaskFramework() {
  let appStoreDirect = useAppStoreDirect();
  return useMemo(
    () => createTaskFramework(() => appStoreDirect.getState(), appStoreDirect.setState),
    [appStoreDirect],
  );
}
export {
  waitForStoreState,
  useTaskFramework,
  useVoiceStateStore,
  useGetVoiceState,
  useVoiceStore,
  VoiceProvider,
};
