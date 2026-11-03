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
import { j, y } from "../../../vendor/react/cjs/react.production.js";
import { e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { retireResumeSwapPair } from "../../screens/repl/sessionRehydration.js";
import {
  applyArtifactResumeCarry,
  emptyArtifactCarry,
} from "../../tools/ArtifactTool/artifactResumeCarry.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { Cr, useAppState } from "../../state/AppState.js";
import { useDialogStore } from "../../state/dialogQueue.js";
import { useSession } from "../../context/session.js";
import { isRemoteControlOfferable } from "../../bridge/bridgeGates.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { resetConversation } from "../../utils/conversationReset.js";
import { TeleportResumeWrapper } from "../../components/TeleportResumeWrapper.js";

//@ chunk-c2tx3syd.js:17543-17547 placement
j();
//@ chunk-c2tx3syd.js:17547-17626 placement
function F(B) {
  return Boolean(B.replBridgeSessionId) && !B.replBridgeOutboundOnly;
}
/**
 * /teleport 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
//@ chunk-c2tx3syd.js:17626-17692 placement
var oe = async (onDone, context) =>
  e(TeleportCommandView, { onExit: onDone, context: context, exposure: { logged: !1 } });
/**
 * 发送到云端后清理恢复交换对、发送消息固定和相关状态。
 */
//@ chunk-c2tx3syd.js:17692-17816 placement
function retireSendToCloudState(getAppState, setAppState, dialogStore, session) {
  (retireResumeSwapPair(getAppState, setAppState, dialogStore, session),
    setAppState((t) => (Object.keys(t.sendMessagePins).length === 0 ? t : { ...t, sendMessagePins: {} })),
    applyArtifactResumeCarry(setAppState, emptyArtifactCarry()));
}
/**
 * /teleport 的界面：开启 tengu_teleport_send_to_cloud 且可发送（或可提供 Remote Control）时显示 TeleportMenu；否则显示从云端恢复会话的 TeleportResumeWrapper。
 */
//@ chunk-c2tx3syd.js:17816-18944 placement
function TeleportCommandView(props) {
  let a = w(25),
    { onExit: onExit, context: context, exposure: exposure } = props,
    t = Cr(),
    f = useDialogStore(),
    n = useSession(),
    _;
  if (a[0] !== f || a[1] !== n || a[2] !== t.getState || a[3] !== t.setState)
    ((_ = () => retireSendToCloudState(t.getState, t.setState, f, n)),
      (a[0] = f),
      (a[1] = n),
      (a[2] = t.getState),
      (a[3] = t.setState),
      (a[4] = _));
  else _ = a[4];
  let i = _,
    p = useAppState(F),
    L;
  if (a[5] !== p)
    ((L = () =>
      (p || isRemoteControlOfferable()) &&
      getFeatureValue_CACHED_MAY_BE_STALE("tengu_teleport_send_to_cloud", !1)),
      (a[5] = p),
      (a[6] = L));
  else L = a[6];
  let [I] = y(L);
  if (I) {
    let { TeleportMenu: TeleportMenu } = require("./chunk-kczn6qx7.js");
    let r;
    if (a[7] !== context || a[8] !== exposure || a[9] !== p || a[10] !== onExit || a[11] !== i)
      ((r = e(TeleportMenu, {
        onExit: onExit,
        context: context,
        exposure: exposure,
        retireOnSurface: i,
        canSend: p,
      })),
        (a[7] = context),
        (a[8] = exposure),
        (a[9] = p),
        (a[10] = onExit),
        (a[11] = i),
        (a[12] = r));
    else r = a[12];
    return r;
  }
  let r;
  if (a[13] !== context || a[14] !== onExit || a[15] !== i || a[16] !== n)
    ((r = (k) => {
      (resetConversation(context, k.log, i, n),
        onExit("Session resumed successfully", { display: "system" }));
    }),
      (a[13] = context),
      (a[14] = onExit),
      (a[15] = i),
      (a[16] = n),
      (a[17] = r));
  else r = a[17];
  let u, c;
  if (a[18] !== onExit)
    ((u = () => {
      onExit("Teleport cancelled", { display: "system" });
    }),
      (c = (q, me) => {
        onExit(q, { display: "system" });
      }),
      (a[18] = onExit),
      (a[19] = u),
      (a[20] = c));
  else ((u = a[19]), (c = a[20]));
  let A;
  if (a[21] !== r || a[22] !== u || a[23] !== c)
    ((A = e(TeleportResumeWrapper, {
      onComplete: r,
      onCancel: u,
      onError: c,
      isEmbedded: !0,
      source: "localCommand",
    })),
      (a[21] = r),
      (a[22] = u),
      (a[23] = c),
      (a[24] = A));
  else A = a[24];
  return A;
}
