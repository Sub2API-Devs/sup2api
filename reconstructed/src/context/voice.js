/**
 * context/voice.tsx
 *
 * 语音输入状态 store（idle/recording 等、转写、电平）的 Context 与 hooks。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/context/voice.tsx
 * pieces: chunk-e6aww6q8.js (1), chunk-hxkp4105.js (2), chunk-yj65zw1g.js (8)
 * attribution: fingerprint 4, placement 5, affinity 1, callgraph-fingerprint 1
 */
import { j, qt, y, Se, Q } from "../../vendor/react/cjs/react.production.js";
import { createStore } from "../state/store.js";
import { resetGitFileWatcher_2 } from "../utils/git/gitFilesystem.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { e } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Cr } from "../state/AppState.js";
import { createTaskFramework } from "../utils/task/framework.js";

//@ chunk-yj65zw1g.js:343-347 placement
j();
//@ chunk-yj65zw1g.js:347-487 placement
function createVoiceStore() {
  let u = createStore(DEFAULT_STATE);
  let V = new resetGitFileWatcher_2();
  return (
    u.subscribe(() => {
      if (u.getState().voiceState !== "recording") V.reset();
    }),
    { store: u, levelSmoother: V }
  );
}
/**
 * 语音默认状态 {voiceState:"idle", voiceError:null, …}。
 */
//@ chunk-yj65zw1g.js:487-625 fingerprint = DEFAULT_STATE (0.925)
var DEFAULT_STATE = {
  voiceState: "idle",
  voiceError: null,
  voiceInterimTranscript: "",
  voiceAudioLevels: [],
  voiceWarmingUp: !1,
  awaitingVoiceSubmitDoubleTap: !1,
};
//@ chunk-yj65zw1g.js:708-723 placement
var i = qt(null);
/**
 * 语音状态的 Context Provider：创建一次 store 与电平平滑器并提供给子组件。
 */
//@ chunk-yj65zw1g.js:723-877 placement
function VoiceProvider(o) {
  let s = w(3),
    { children: children } = o,
    [n] = y(createVoiceStore),
    c;
  if (s[0] !== children || s[1] !== n)
    ((c = e(i.Provider, { value: n, children: children })), (s[0] = children), (s[1] = n), (s[2] = c));
  else c = s[2];
  return c;
}
/**
 * 读取 Voice 上下文，不在 VoiceProvider 内抛错。
 */
//@ chunk-yj65zw1g.js:877-983 fingerprint = useVoiceStore (1)
function useVoiceStore() {
  let store = Se(i);
  if (!store) {
    throw Error("useVoiceState must be used within a VoiceProvider");
  }
  return store;
}
/**
 * 语音状态 store。
 */
//@ chunk-yj65zw1g.js:983-1015 affinity
function useVoiceStateStore() {
  return useVoiceStore().store;
}
/**
 * 语音 store 的 getState。
 */
//@ chunk-yj65zw1g.js:1240-1277 callgraph-fingerprint = useGetVoiceState (1)
function useGetVoiceState() {
  return useVoiceStateStore().getState;
}
//@ chunk-hxkp4105.js:300-304 placement
j();
/**
 * 返回绑定 AppState store 的 setter（ih 包装）。
 */
//@ chunk-hxkp4105.js:304-379 fingerprint = useSetVoiceState (0.688)
function useSetVoiceState() {
  let t = Cr();
  return Q(() => createTaskFramework(() => t.getState(), t.setState), [t]);
}
/**
 * 等待 store 状态满足谓词或超时（返回 true/false）。旧版名 useVoiceState 为错配。
 */
//@ chunk-e6aww6q8.js:4007097-4007333 fingerprint = useVoiceState (0.675)
function waitForStoreState(e, n, r) {
  let s = () => {
    try {
      return n(e.getState());
    } catch {
      return !1;
    }
  };
  if (s()) return Promise.resolve(!0);
  return new Promise((h) => {
    let y = setTimeout(() => {
        (subscribe(), h(!1));
      }, r.timeoutMs),
      subscribe = e.subscribe(() => {
        if (s()) (clearTimeout(y), subscribe(), h(!0));
      });
  });
}

export {
  useSetVoiceState,
  waitForStoreState,
  useGetVoiceState,
  useVoiceStateStore,
  VoiceProvider,
  useVoiceStore,
};
