/**
 * screens/repl/ReplBridgeConnector.tsx
 *
 * 2.1.316 新增：把 REPL 的转录、命令、模型、工具与 MCP 客户端接到 Remote Control 桥，并提供写入/撤回会话内提示消息的接口。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (7)
 * attribution: placement 7
 */
import { init_react_production, ce, Q } from "../../../vendor/react/cjs/react.production.js";
import { useSession } from "../../context/session.js";
import { useStoreSelector } from "../../hooks/useStoreSelector.js";
import { useMainLoopModel as useMainLoopModel_3 } from "../../hooks/useMainLoopModel.js";
import { isBusyOrPending } from "./engineTurnReader.js";
import { useReplBridge } from "../../hooks/useReplBridge.js";
import { useAppStoreDirect } from "../../state/AppState.js";
import { createSystemMessage } from "../../utils/messages.js";
import { useRegisterNotificationTranscriptSink } from "../../context/notifications.js";
import { identity as identity_4 } from "../../utils/identity.js";

//@ chunk-18hwfzwa.js:1622704-1622708 placement
init_react_production();
//@ chunk-18hwfzwa.js:1622708-1623365 placement
/**
 * 把 REPL 的转录、命令、模型、工具、MCP 客户端、系统提示等接到 Remote Control 桥（useReplBridge）。
 */
function ReplBridgeConnector({
  turn,
  transcript,
  scope,
  permissionRelays,
  transport,
  spawnThinkingConfig,
  thinkingDisplayFlag,
  customSystemPrompt,
  appendSystemPrompt,
  systemPromptSnapshot,
}) {
  let session = useSession();
  let storeSelector = useStoreSelector(transcript);
  let rt = useStoreSelector(scope, (Ot) => Ot.commands);
  let mainLoopModel = useMainLoopModel_3();
  let At = ce(() => turn.cancel("remote"), [turn]);
  let isTurnLive = isBusyOrPending(turn.guard, () => turn.isExternalLoading);
  return useReplBridge(
    storeSelector,
    transcript,
    At,
    rt,
    mainLoopModel,
    () => ({
      session,
      tools: scope.computeTools(),
      mcpClients: scope.computeMcpClients(),
      customSystemPrompt,
      appendSystemPrompt,
      systemPromptSnapshot,
      runningTurnModelOverride: turn.runningTurnModelOverride ?? undefined,
    }),
    permissionRelays,
    () => turn.guard.isRunning || turn.isExternalLoading,
    transport.runBridgeImmediateCommand,
    spawnThinkingConfig,
    scope.updateDynamicMcpConfig,
    isTurnLive,
    thinkingDisplayFlag,
  );
}
//@ chunk-18hwfzwa.js:1623365-1623369 placement
init_react_production();
//@ chunk-18hwfzwa.js:1623369-1623795 placement
/**
 * 提供写入/撤回会话内提示消息的接口：写入时追加或替换最后一条系统消息（查看子代理时不写），撤回时把该消息降级为 info。
 */
function useInformationalMessageSink(transcript) {
  let appStoreDirect = useAppStoreDirect();
  let D = Q(
    () => ({
      write({ text, level }, ke) {
        if (appStoreDirect.getState().viewingAgentTaskId !== undefined) return;
        let Re = {
          ...createSystemMessage(text, level),
          persist: false,
        };
        transcript.replace((Be) =>
          ke !== undefined && Be.at(-1)?.uuid === ke ? [...Be.slice(0, -1), Re] : [...Be, Re],
        );
        return Re.uuid;
      },
      retract: (L) =>
        transcript.replace((ee) =>
          ee.every((ke) => ke.uuid !== L)
            ? ee
            : ee.map((ke) =>
                ke.uuid === L && ke.type === "system" && ke.subtype === "informational"
                  ? {
                      ...ke,
                      level: "info",
                    }
                  : ke,
              ),
        ),
    }),
    [transcript, appStoreDirect],
  );
  useRegisterNotificationTranscriptSink(D);
}
//@ chunk-18hwfzwa.js:1623795-1623838 placement
var isOwedStore = identity_4(
  {
    isOwed: true,
  },
  (h) => {
    h.isOwed = true;
  },
);
//@ chunk-18hwfzwa.js:1623838-1623862 placement
function createEmptyList() {
  return [];
}
//@ chunk-18hwfzwa.js:1623862-1623866 placement
init_react_production();
export { createEmptyList, useInformationalMessageSink, ReplBridgeConnector };
