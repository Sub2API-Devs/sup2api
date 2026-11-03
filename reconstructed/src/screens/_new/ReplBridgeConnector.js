/**
 * screens/_new/ReplBridgeConnector.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (7)
 * attribution: sole-consumer-new 7
 */
import { j, ce, Q } from "../../../vendor/react/cjs/react.production.js";
import { useSession } from "../../context/session.js";
import { useStoreSelector } from "../../hooks/useStoreSelector.js";
import { useMainLoopModel as useMainLoopModel_3 } from "../../hooks/useMainLoopModel.js";
import { Ukt } from "../repl/engineTurnReader.js";
import { useReplBridge } from "../../hooks/useReplBridge.js";
import { Cr } from "../../state/AppState.js";
import { createSystemMessage } from "../../utils/messages.js";
import { useRegisterNotificationTranscriptSink } from "../../context/notifications.js";
import { ge } from "../../utils/identity.js";

//@ chunk-18hwfzwa.js:1622704-1622708 sole-consumer-new
j();
/**
 * 把 REPL 的转录、命令、模型、工具、MCP 客户端、系统提示等接到 Remote Control 桥（useReplBridge）。
 */
//@ chunk-18hwfzwa.js:1622708-1623365 sole-consumer-new
function ReplBridgeConnector({
  turn: turn,
  transcript: transcript,
  scope: scope,
  permissionRelays: permissionRelays,
  transport: transport,
  spawnThinkingConfig: spawnThinkingConfig,
  thinkingDisplayFlag: thinkingDisplayFlag,
  customSystemPrompt: customSystemPrompt,
  appendSystemPrompt: appendSystemPrompt,
  systemPromptSnapshot: systemPromptSnapshot,
}) {
  let ze = useSession(),
    Xe = useStoreSelector(transcript),
    rt = useStoreSelector(scope, (Ot) => Ot.commands),
    kt = useMainLoopModel_3(),
    At = ce(() => turn.cancel("remote"), [turn]),
    It = Ukt(turn.guard, () => turn.isExternalLoading);
  return useReplBridge(
    Xe,
    transcript,
    At,
    rt,
    kt,
    () => ({
      session: ze,
      tools: scope.computeTools(),
      mcpClients: scope.computeMcpClients(),
      customSystemPrompt: customSystemPrompt,
      appendSystemPrompt: appendSystemPrompt,
      systemPromptSnapshot: systemPromptSnapshot,
      runningTurnModelOverride: turn.runningTurnModelOverride ?? void 0,
    }),
    permissionRelays,
    () => turn.guard.isRunning || turn.isExternalLoading,
    transport.runBridgeImmediateCommand,
    spawnThinkingConfig,
    scope.updateDynamicMcpConfig,
    It,
    thinkingDisplayFlag,
  );
}
//@ chunk-18hwfzwa.js:1623365-1623369 sole-consumer-new
j();
/**
 * 提供写入/撤回会话内提示消息的接口：写入时追加或替换最后一条系统消息（查看子代理时不写），撤回时把该消息降级为 info。
 */
//@ chunk-18hwfzwa.js:1623369-1623795 sole-consumer-new
function useInformationalMessageSink(h) {
  let x = Cr(),
    D = Q(
      () => ({
        write({ text: L, level: ee }, ke) {
          if (x.getState().viewingAgentTaskId !== void 0) return;
          let Re = { ...createSystemMessage(L, ee), persist: !1 };
          return (
            h.replace((Be) =>
              ke !== void 0 && Be.at(-1)?.uuid === ke ? [...Be.slice(0, -1), Re] : [...Be, Re],
            ),
            Re.uuid
          );
        },
        retract: (L) =>
          h.replace((ee) =>
            ee.every((ke) => ke.uuid !== L)
              ? ee
              : ee.map((ke) =>
                  ke.uuid === L && ke.type === "system" && ke.subtype === "informational"
                    ? { ...ke, level: "info" }
                    : ke,
                ),
          ),
      }),
      [h, x],
    );
  useRegisterNotificationTranscriptSink(D);
}
//@ chunk-18hwfzwa.js:1623795-1623838 sole-consumer-new
var Xxs = ge({ isOwed: !0 }, (h) => {
  h.isOwed = !0;
});
//@ chunk-18hwfzwa.js:1623838-1623862 sole-consumer-new
function IIe() {
  return [];
}
//@ chunk-18hwfzwa.js:1623862-1623866 sole-consumer-new
j();

export { IIe, useInformationalMessageSink, ReplBridgeConnector };
