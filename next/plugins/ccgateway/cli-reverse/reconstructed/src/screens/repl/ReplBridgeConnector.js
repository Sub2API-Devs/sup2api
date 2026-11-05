/**
 * screens/repl/ReplBridgeConnector.tsx
 *
 * 2.1.316 新增：把 REPL 的转录、命令、模型、工具与 MCP 客户端接到 Remote Control 桥，并提供写入/撤回会话内提示消息的接口。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (7)
 * attribution: placement 7
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { init_react_production, useCallback, useMemo } from "../../../vendor/react/cjs/react.production.js";
import { useSession } from "../../context/session.js";
import { useStoreSelector } from "../../hooks/useStoreSelector.js";
import { useMainLoopModel as useMainLoopModel_3 } from "../../hooks/useMainLoopModel.js";
import { isBusyOrPending } from "./engineTurnReader.js";
import { useReplBridge } from "../../hooks/useReplBridge.js";
import { useAppStoreDirect } from "../../state/AppState.js";
import { createSystemMessage } from "../../utils/messages.js";
import { useRegisterNotificationTranscriptSink } from "../../context/notifications.js";
import { identity as identity_4 } from "../../utils/identity.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-czq1j3j2.js:1610363-1610367 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:1610363", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:1618181-1618185 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:1618181", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:1662623-1662627 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:1662623", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:1666867-1667531 placement
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
  let commands = useStoreSelector(scope, (scopeState) => scopeState.commands);
  let mainLoopModel = useMainLoopModel_3();
  let onRemoteCancel = useCallback(() => turn.cancel("remote"), [turn]);
  let isTurnLive = isBusyOrPending(turn.guard, () => turn.isExternalLoading);
  return useReplBridge(
    storeSelector,
    transcript,
    onRemoteCancel,
    commands,
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
    undefined,
  );
}
//@ chunk-czq1j3j2.js:1667535-1667961 placement
/**
 * 提供写入/撤回会话内提示消息的接口：写入时追加或替换最后一条系统消息（查看子代理时不写），撤回时把该消息降级为 info。
 */
function useInformationalMessageSink(transcript) {
  let appStoreDirect = useAppStoreDirect();
  let sink = useMemo(
    () => ({
      write({ text, level }, options) {
        if (appStoreDirect.getState().viewingAgentTaskId !== undefined) return;
        let message = {
          ...createSystemMessage(text, level),
          persist: false,
        };
        transcript.replace((rows) =>
          options !== undefined && rows.at(-1)?.uuid === options
            ? [...rows.slice(0, -1), message]
            : [...rows, message],
        );
        return message.uuid;
      },
      retract: (uuid) =>
        transcript.replace((rows) =>
          rows.every((row) => row.uuid !== uuid)
            ? rows
            : rows.map((row) =>
                row.uuid === uuid && row.type === "system" && row.subtype === "informational"
                  ? {
                      ...row,
                      level: "info",
                    }
                  : row,
              ),
        ),
    }),
    [transcript, appStoreDirect],
  );
  useRegisterNotificationTranscriptSink(sink);
}
//@ chunk-czq1j3j2.js:1667961-1668004 placement
var isOwedStore; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:1667961", () => {
  isOwedStore = identity_4(
    {
      isOwed: true,
    },
    (store) => {
      store.isOwed = true;
    },
  );
});
//@ chunk-czq1j3j2.js:1668004-1668028 placement
function createEmptyList() {
  return [];
}
export { createEmptyList, useInformationalMessageSink, ReplBridgeConnector };
