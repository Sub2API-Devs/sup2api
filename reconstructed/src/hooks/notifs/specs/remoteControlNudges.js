/**
 * hooks/notifs/specs/remoteControlNudges.ts
 *
 * 2.1.316 新增。启动通知：Remote Control 推荐。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (5)
 * attribution: placement 5
 */
import { w } from "../../../../vendor/react/compiler-runtime.js";
import { useIsScreenReaderEnabled } from "../../../ink/components/ErrorBoundary.js";
import { MEMO_CACHE_SENTINEL } from "../../../../runtime/bun-runtime.js";
import {
  r,
  Fragment,
  e,
} from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Link } from "../../../ink/components/Text.js";
import { wt } from "../../../remote/remoteMode.js";
import {
  getLongTurnNudgeConfig,
  canShowLongTurnNudge,
  isWithinDayHours,
  recordLongTurnNudgeShown,
  getPermissionNudgeConfig,
  JNs,
  recordPermissionNudgeShown,
  shouldShowRemoteControlUpsell,
  JTo,
  RC_MIN_TURN_SECONDS,
  VNs,
  qNs,
} from "../../../services/tips/remoteControlNudges.js";
import { logEvent } from "../../../services/analytics/index.js";
import { fromEnum } from "../../../services/analytics/safeMetadata.js";
import { VTt } from "../../../commands/bridge/bridge.js";

//@ chunk-18hwfzwa.js:1781197-1781226 placement
var RC_LONG_TURN_NUDGE = "rc-long-turn-nudge";
/**
 * 长回合提醒："Still working. Check in from your phone"，附 Remote Control 链接（读屏模式下直接显示 URL）。
 */
//@ chunk-18hwfzwa.js:1781226-1781785 placement
function StillWorkingPhoneLink(h) {
  let $ = w(8),
    { url: url } = h,
    screenReader = useIsScreenReaderEnabled(),
    ee;
  if ($[0] === MEMO_CACHE_SENTINEL)
    ((ee = r(Text, { dimColor: !0, children: ["Check in from your phone", " \xB7 "] })), ($[0] = ee));
  else ee = $[0];
  let ke;
  if ($[1] !== url)
    ((ke = r(Fragment, { children: [ee, e(Text, { color: "suggestion", children: url })] })),
      ($[1] = url),
      ($[2] = ke));
  else ke = $[2];
  let Re = ke,
    Be;
  if ($[3] === MEMO_CACHE_SENTINEL) ((Be = e(Text, { children: "Still working. " })), ($[3] = Be));
  else Be = $[3];
  let He;
  if ($[4] !== Re || $[5] !== screenReader || $[6] !== url)
    ((He = r(Fragment, {
      children: [
        Be,
        screenReader
          ? Re
          : e(Link, {
              url: url,
              fallback: Re,
              children: e(Text, { color: "suggestion", children: "Check in from your phone" }),
            }),
      ],
    })),
      ($[4] = Re),
      ($[5] = screenReader),
      ($[6] = url),
      ($[7] = He));
  else He = $[7];
  return He;
}
//@ chunk-18hwfzwa.js:1781785-1782573 placement
var rcLongTurnNudgeNoticeSpec = {
  id: "rc-long-turn-nudge",
  deps: (h) => [h.turnAtRender.isLoading, h.replBridgeActive, h.removeNotification, h.clock],
  setup() {
    let h = !1;
    return (
      {
        turnAtRender: { isLoading: x },
        replBridgeActive: replBridgeActive,
        removeNotification: removeNotification,
        clock: clock,
      },
      ke,
    ) => {
      if (!x) {
        if (h) ((h = !1), removeNotification(RC_LONG_TURN_NUDGE));
        return;
      }
      if (!replBridgeActive || h || wt()) return;
      let Re = getLongTurnNudgeConfig();
      if (Re === null || !canShowLongTurnNudge(Re) || !isWithinDayHours(Re)) return;
      let Be = clock.setTimeout(() => {
        let {
          addNotification: addNotification,
          replBridgeSessionUrl: replBridgeSessionUrl,
          store: store,
          storageV5: storageV5,
        } = ke();
        if (h || !replBridgeSessionUrl) return;
        if (((h = !0), Re.probability < 1 && Math.random() >= Re.probability)) return;
        (recordLongTurnNudgeShown(Re, storageV5),
          addNotification({
            key: RC_LONG_TURN_NUDGE,
            kind: "upsell",
            jsx: e(StillWorkingPhoneLink, { url: replBridgeSessionUrl }),
            priority: "medium",
            requeueOnPreempt: !0,
            timeoutMs: 2147483647,
          }),
          logEvent("tengu_rc_long_turn_nudge_shown", {
            auto_on: store.getState().replBridgeAutoOnByDefault,
            threshold_sec: Re.thresholdSec,
          }));
      }, Re.thresholdSec * 1000);
      return () => Be();
    };
  },
};
//@ chunk-18hwfzwa.js:1782573-1783832 placement
var RC_PERMISSION_NUDGE = "rc-permission-nudge",
  aGo = new Set(["default", "plan", "acceptEdits"]),
  jTt = {
    id: "rc-permission-nudge",
    deps: (h) => [
      h.permissionPromptCount,
      h.turnAtRender.isLoading,
      h.replBridgeActive,
      h.replBridgeSessionUrl,
      h.permissionMode,
      h.addNotification,
      h.removeNotification,
      h.storageV5,
    ],
    setup() {
      let h = !1,
        x = !1,
        D = 0,
        L = null,
        ee = () => {};
      function ke({
        addNotification: addNotification,
        turnAtRender: turnAtRender,
        replBridgeActive: replBridgeActive,
        replBridgeSessionUrl: replBridgeSessionUrl,
        permissionMode: permissionMode,
        permissionPromptCount: permissionPromptCount,
        storageV5: storageV5,
      }) {
        if (permissionPromptCount < D) D = 0;
        if (h || !replBridgeActive || !replBridgeSessionUrl || !aGo.has(permissionMode) || wt()) return;
        if (!x) {
          let kt = getPermissionNudgeConfig();
          if (
            kt.probability <= 0 ||
            permissionPromptCount < kt.afterPromptCount ||
            permissionPromptCount <= D ||
            !JNs(kt.maxImpressions)
          )
            return;
          if (((D = permissionPromptCount), Math.random() >= kt.probability)) return;
          x = !0;
        }
        if (turnAtRender.isLoading) return;
        ((h = !0),
          recordPermissionNudgeShown(storageV5),
          addNotification({
            key: RC_PERMISSION_NUDGE,
            kind: "upsell",
            segments: [
              { text: "Approve tool calls from your phone \xB7 ", dim: !0 },
              { text: replBridgeSessionUrl, color: "suggestion" },
            ],
            priority: "medium",
            requeueOnPreempt: !0,
            timeoutMs: 2147483647,
          }),
          logEvent("tengu_rc_permission_nudge_shown", {
            permission_mode: fromEnum(permissionMode),
            prompt_count: permissionPromptCount,
          }));
      }
      return {
        effect: (Re) => {
          ke(Re);
          let Be = { isLoading: Re.turnAtRender.isLoading, rcReady: Re.replBridgeActive },
            He = L === null || L.isLoading !== Be.isLoading || L.rcReady !== Be.rcReady;
          if (((L = Be), He && h && (Be.isLoading || !Be.rcReady)))
            Re.removeNotification(RC_PERMISSION_NUDGE);
          ee = Re.removeNotification;
        },
        dispose: () => ee(RC_PERMISSION_NUDGE),
      };
    },
  };
//@ chunk-18hwfzwa.js:1783832-1785048 placement
var RC_IDLE_UPSELL = "rc-idle-upsell",
  PUSH_IDLE_UPSELL = "push-idle-upsell",
  KTt = {
    id: "remote-control-upsell",
    deps: (h) => {
      let turnAtRender = h.turnAtRender;
      return [
        turnAtRender.lastQueryCompletionTime,
        turnAtRender.isLoading,
        h.addNotification,
        h.removeNotification,
        h.clock,
        h.storageV5,
      ];
    },
    setup() {
      let h = !1;
      return ({
        addNotification: addNotification,
        removeNotification: removeNotification,
        clock: clock,
        store: store,
        turnAtRender: { isLoading: ke, lastQueryCompletionTime: Re },
        storageV5: storageV5,
      }) => {
        if (wt() || Re === 0 || ke || h) return;
        let He = !VTt(store) && shouldShowRemoteControlUpsell() ? "rc" : JTo() ? "push" : null;
        if (He === null) return;
        let We = Date.now() - Re,
          ze = RC_MIN_TURN_SECONDS * 60000 - We,
          Xe = clock.setTimeout(
            () => {
              if (h) return;
              let rounded = Math.round((Date.now() - Re) / 60000);
              if (He === "rc") {
                if (VTt(store) || !shouldShowRemoteControlUpsell()) return;
                ((h = !0),
                  VNs(storageV5),
                  addNotification({
                    key: RC_IDLE_UPSELL,
                    kind: "upsell",
                    segments: [
                      { text: "control this session from your phone \xB7 ", dim: !0 },
                      { text: "/remote-control", color: "suggestion" },
                    ],
                    priority: "medium",
                    timeoutMs: 2147483647,
                  }),
                  logEvent("tengu_rc_upsell_notification_shown", { idleMinutes: rounded }));
              } else {
                if (!JTo()) return;
                ((h = !0),
                  qNs(storageV5),
                  addNotification({
                    key: PUSH_IDLE_UPSELL,
                    kind: "upsell",
                    segments: [
                      { text: "get pinged when Claude finishes \xB7 enable push notifications in ", dim: !0 },
                      { text: "/config", color: "suggestion" },
                    ],
                    priority: "medium",
                    timeoutMs: 2147483647,
                  }),
                  logEvent("tengu_push_notif_upsell_notification_shown", { idleMinutes: rounded }));
              }
            },
            Math.max(0, ze),
          );
        return () => {
          (Xe(), removeNotification(RC_IDLE_UPSELL), removeNotification(PUSH_IDLE_UPSELL));
        };
      };
    },
  };

export { KTt, rcLongTurnNudgeNoticeSpec, jTt };
