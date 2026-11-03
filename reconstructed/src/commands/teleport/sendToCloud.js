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
import { init_react_production, y } from "../../../vendor/react/cjs/react.production.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { retireResumeSwapPair } from "../../screens/repl/sessionRehydration.js";
import {
  applyArtifactResumeCarry,
  emptyArtifactCarry,
} from "../../tools/ArtifactTool/artifactResumeCarry.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
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
function isInboundBridgeConnected(B) {
  return Boolean(B.replBridgeSessionId) && !B.replBridgeOutboundOnly;
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
  setAppState((t) =>
    Object.keys(t.sendMessagePins).length === 0
      ? t
      : {
          ...t,
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
  let a = w(25);
  let { onExit, context, exposure } = props;
  let appStoreDirect = useAppStoreDirect();
  let dialogStore = useDialogStore();
  let session = useSession();
  let _;
  if (
    a[0] !== dialogStore ||
    a[1] !== session ||
    a[2] !== appStoreDirect.getState ||
    a[3] !== appStoreDirect.setState
  ) {
    _ = () => retireSendToCloudState(appStoreDirect.getState, appStoreDirect.setState, dialogStore, session);
    a[0] = dialogStore;
    a[1] = session;
    a[2] = appStoreDirect.getState;
    a[3] = appStoreDirect.setState;
    a[4] = _;
  } else _ = a[4];
  let i = _;
  let appState = useAppState(isInboundBridgeConnected);
  let L;
  if (a[5] !== appState) {
    L = () =>
      (appState || isRemoteControlOfferable()) &&
      getFeatureValue_CACHED_MAY_BE_STALE("tengu_teleport_send_to_cloud", false);
    a[5] = appState;
    a[6] = L;
  } else L = a[6];
  let [I] = y(L);
  if (I) {
    let { TeleportMenu } = require("./chunk-kczn6qx7.js");
    let r;
    if (a[7] !== context || a[8] !== exposure || a[9] !== appState || a[10] !== onExit || a[11] !== i) {
      r = jsxProd_default(TeleportMenu, {
        onExit,
        context,
        exposure,
        retireOnSurface: i,
        canSend: appState,
      });
      a[7] = context;
      a[8] = exposure;
      a[9] = appState;
      a[10] = onExit;
      a[11] = i;
      a[12] = r;
    } else r = a[12];
    return r;
  }
  let onComplete;
  if (a[13] !== context || a[14] !== onExit || a[15] !== i || a[16] !== session) {
    onComplete = (k) => {
      resetConversation(context, k.log, i, session);
      onExit("Session resumed successfully", {
        display: "system",
      });
    };
    a[13] = context;
    a[14] = onExit;
    a[15] = i;
    a[16] = session;
    a[17] = onComplete;
  } else onComplete = a[17];
  let onCancel;
  let onError;
  if (a[18] !== onExit) {
    onCancel = () => {
      onExit("Teleport cancelled", {
        display: "system",
      });
    };
    onError = (q, me) => {
      onExit(q, {
        display: "system",
      });
    };
    a[18] = onExit;
    a[19] = onCancel;
    a[20] = onError;
  } else {
    onCancel = a[19];
    onError = a[20];
  }
  let A;
  if (a[21] !== onComplete || a[22] !== onCancel || a[23] !== onError) {
    A = jsxProd_default(TeleportResumeWrapper, {
      onComplete,
      onCancel,
      onError,
      isEmbedded: true,
      source: "localCommand",
    });
    a[21] = onComplete;
    a[22] = onCancel;
    a[23] = onError;
    a[24] = A;
  } else A = a[24];
  return A;
}
