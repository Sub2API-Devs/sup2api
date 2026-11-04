/**
 * commands/teleport/sendToCloud.tsx
 *
 * 2.1.316 新增：把当前会话发送到云端继续（tengu_teleport_send_to_cloud）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-c2tx3syd.js (5)
 * attribution: placement 5
 */
import { init_react_production, useState } from "../../../vendor/react/cjs/react.production.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { retireResumeSwapPair } from "../../screens/repl/sessionRehydration.js";
import {
  applyArtifactResumeCarry,
  emptyArtifactCarry,
} from "../../tools/ArtifactTool/artifactResumeCarry.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useAppStoreDirect, useAppState } from "../../state/AppState.js";
import { useDialogStore } from "../../state/dialogQueue.js";
import { useSession } from "../../context/session.js";
import { isRemoteControlOfferable } from "../../bridge/bridgeGates.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { resetConversation } from "../../utils/conversationReset.js";
import { TeleportResumeWrapper } from "../../components/TeleportResumeWrapper.js";

//@ chunk-c2tx3syd.js:17543-17547 placement
init_react_production();
//@ chunk-c2tx3syd.js:17547-17626 placement
function isInboundBridgeConnected(appState) {
  return Boolean(appState.replBridgeSessionId) && !appState.replBridgeOutboundOnly;
}
//@ chunk-c2tx3syd.js:17626-17692 placement
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
//@ chunk-c2tx3syd.js:17692-17816 placement
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
//@ chunk-c2tx3syd.js:17816-18944 placement
/**
 * /teleport 的界面：开启 tengu_teleport_send_to_cloud 且可发送（或可提供 Remote Control）时显示 TeleportMenu；否则显示从云端恢复会话的 TeleportResumeWrapper。
 */
function TeleportCommandView(props) {
  let $ = useMemoCache(25);
  let { onExit, context, exposure } = props;
  let appStoreDirect = useAppStoreDirect();
  let dialogStore = useDialogStore();
  let session = useSession();
  let retireStateCached;
  if (
    $[0] !== dialogStore ||
    $[1] !== session ||
    $[2] !== appStoreDirect.getState ||
    $[3] !== appStoreDirect.setState
  ) {
    retireStateCached = () =>
      retireSendToCloudState(appStoreDirect.getState, appStoreDirect.setState, dialogStore, session);
    $[0] = dialogStore;
    $[1] = session;
    $[2] = appStoreDirect.getState;
    $[3] = appStoreDirect.setState;
    $[4] = retireStateCached;
  } else retireStateCached = $[4];
  let retireState = retireStateCached;
  let appState = useAppState(isInboundBridgeConnected);
  let shouldTeleportCached;
  if ($[5] !== appState) {
    shouldTeleportCached = () =>
      (appState || isRemoteControlOfferable()) &&
      getFeatureValue_CACHED_MAY_BE_STALE("tengu_teleport_send_to_cloud", false);
    $[5] = appState;
    $[6] = shouldTeleportCached;
  } else shouldTeleportCached = $[6];
  let [shouldTeleport] = useState(shouldTeleportCached);
  if (shouldTeleport) {
    let { TeleportMenu } = require("./teleportToCloud.js");
    let menuElement;
    if (
      $[7] !== context ||
      $[8] !== exposure ||
      $[9] !== appState ||
      $[10] !== onExit ||
      $[11] !== retireState
    ) {
      menuElement = jsxProd_default(TeleportMenu, {
        onExit,
        context,
        exposure,
        retireOnSurface: retireState,
        canSend: appState,
      });
      $[7] = context;
      $[8] = exposure;
      $[9] = appState;
      $[10] = onExit;
      $[11] = retireState;
      $[12] = menuElement;
    } else menuElement = $[12];
    return menuElement;
  }
  let onComplete;
  if ($[13] !== context || $[14] !== onExit || $[15] !== retireState || $[16] !== session) {
    onComplete = (resumeResult) => {
      resetConversation(context, resumeResult.log, retireState, session);
      onExit("Session resumed successfully", {
        display: "system",
      });
    };
    $[13] = context;
    $[14] = onExit;
    $[15] = retireState;
    $[16] = session;
    $[17] = onComplete;
  } else onComplete = $[17];
  let onCancel;
  let onError;
  if ($[18] !== onExit) {
    onCancel = () => {
      onExit("Teleport cancelled", {
        display: "system",
      });
    };
    onError = (errorMessage, errorDetails) => {
      onExit(errorMessage, {
        display: "system",
      });
    };
    $[18] = onExit;
    $[19] = onCancel;
    $[20] = onError;
  } else {
    onCancel = $[19];
    onError = $[20];
  }
  let resumeWrapper;
  if ($[21] !== onComplete || $[22] !== onCancel || $[23] !== onError) {
    resumeWrapper = jsxProd_default(TeleportResumeWrapper, {
      onComplete,
      onCancel,
      onError,
      isEmbedded: true,
      source: "localCommand",
    });
    $[21] = onComplete;
    $[22] = onCancel;
    $[23] = onError;
    $[24] = resumeWrapper;
  } else resumeWrapper = $[24];
  return resumeWrapper;
}
export { TeleportCommandView, teleportCommandCall, retireSendToCloudState };
