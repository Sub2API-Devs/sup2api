/**
 * commands/teleport/sendToCloud.tsx
 *
 * 2.1.316 新增：把当前会话发送到云端继续（tengu_teleport_send_to_cloud）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-d293e2d7.js (4)
 * attribution: placement 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { init_react_production, useState } from "../../../vendor/react/cjs/react.production.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { retireResumeSwapPair } from "../../screens/repl/sessionRehydration.js";
import {
  applyArtifactResumeCarry,
  emptyArtifactCarry,
} from "../../tools/ArtifactTool/artifactResumeCarry.js";
import { useAppStoreDirect, useAppState } from "../../state/AppState.js";
import { useDialogStore } from "../../state/dialogQueue.js";
import { useSession } from "../../context/session.js";
import { isClaudeAISubscriber } from "../../utils/auth.js";
import { isRemoteControlOfferable } from "../../bridge/bridgeGates.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { TeleportResumeWrapper } from "../../components/TeleportResumeWrapper.js";
import { resetConversation } from "../../utils/conversationReset.js";

//@ chunk-d293e2d7.js:18743-18747 placement
init_react_production();
//@ chunk-d293e2d7.js:18747-18812 placement
/**
 * /teleport 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
var teleportCommandCall = async (onDone, context) =>
  jsxProd_default(TeleportCommandView, {
    onExit: onDone,
    context,
    exposure: {
      logged: false,
    },
  });
//@ chunk-d293e2d7.js:18812-18936 placement
/**
 * 发送到云端后清理恢复交换对、发送消息固定和相关状态。
 */
function retireSendToCloudState(getAppState, setAppState, dialogStore, session) {
  retireResumeSwapPair(getAppState, setAppState, dialogStore, session);
  setAppState((state) =>
    Object.keys(state.sendMessagePins).length === 0
      ? state
      : {
          ...state,
          sendMessagePins: {},
        },
  );
  applyArtifactResumeCarry(setAppState, emptyArtifactCarry());
}
//@ chunk-d293e2d7.js:18936-19927 placement
/**
 * /teleport 的界面：开启 tengu_teleport_send_to_cloud 且可发送（或可提供 Remote Control）时显示 TeleportMenu；否则显示从云端恢复会话的 TeleportResumeWrapper。
 */
function TeleportCommandView({ onExit, context, exposure }) {
  let appStoreDirect = useAppStoreDirect();
  let dialogStore = useDialogStore();
  let session = useSession();
  let reason = () =>
    retireSendToCloudState(appStoreDirect.getState, appStoreDirect.setState, dialogStore, session);
  let hasSession = useAppState(
    (state) => Boolean(state.replBridgeSessionId) && !state.replBridgeOutboundOnly,
  );
  let enabledWithoutSession = useAppState(
    (state) => state.replBridgeEnabled && !state.replBridgeOutboundOnly && !state.replBridgeSessionId,
  );
  let [sendsByCopy] = useState(
    () =>
      (exposure.sendsByCopy ??= (() => {
        let moveModule = require("../../utils/teleport/localSessionMove.js");
        return (
          moveModule.isConversationMoveServed() &&
          isClaudeAISubscriber() &&
          moveModule.isConversationMovePossibleHere() &&
          !(
            (hasSession || enabledWithoutSession) &&
            require("../../utils/background/remote/remoteSession.js").isInMonorepoWorkingCopyByFiles()
          )
        );
      })()),
  );
  let [shouldTeleport] = useState(
    () =>
      sendsByCopy ||
      ((hasSession || isRemoteControlOfferable()) &&
        getFeatureValue_CACHED_MAY_BE_STALE("tengu_teleport_send_to_cloud", false)),
  );
  if (shouldTeleport) {
    let { TeleportMenu } = require("./teleportToCloud.js");
    return jsxProd_default(TeleportMenu, {
      onExit,
      context,
      exposure,
      retireOnSurface: reason,
      canSend: sendsByCopy || hasSession,
      canMoveByRemoteControl:
        hasSession && getFeatureValue_CACHED_MAY_BE_STALE("tengu_teleport_send_to_cloud", false),
      sendsByCopy,
    });
  }
  return jsxProd_default(TeleportResumeWrapper, {
    onComplete: (resumeResult) => {
      resetConversation(context, resumeResult.log, reason, session);
      onExit("Session resumed successfully", {
        display: "system",
      });
    },
    onCancel: () => {
      onExit("Teleport cancelled", {
        display: "system",
      });
    },
    onError: (errorMessage, errorDetails) => {
      onExit(errorMessage, {
        display: "system",
      });
    },
    isEmbedded: true,
    source: "localCommand",
  });
}
export { TeleportCommandView, teleportCommandCall, retireSendToCloudState };
