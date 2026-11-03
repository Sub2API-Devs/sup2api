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
  jsxProd_default_2,
  Fragment,
  jsxProd_default,
} from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Link } from "../../../ink/components/Text.js";
import { isRemoteSessionAvailable } from "../../../remote/remoteMode.js";
import {
  getLongTurnNudgeConfig,
  canShowLongTurnNudge,
  isWithinDayHours,
  recordLongTurnNudgeShown,
  getPermissionNudgeConfig,
  canShowPermissionNudge,
  recordPermissionNudgeShown,
  shouldShowRemoteControlUpsell,
  canShowPushUpsell,
  RC_MIN_TURN_SECONDS,
  noteRcUpsellShown,
  notePushUpsellShown,
} from "../../../services/tips/remoteControlNudges.js";
import { logEvent } from "../../../services/analytics/index.js";
import { fromEnum } from "../../../services/analytics/safeMetadata.js";
import { isBridgeInboundAllowed } from "../../../commands/bridge/bridge.js";

//@ chunk-18hwfzwa.js:1781197-1781226 placement
var RC_LONG_TURN_NUDGE = "rc-long-turn-nudge";
//@ chunk-18hwfzwa.js:1781226-1781785 placement
/**
 * 长回合提醒："Still working. Check in from your phone"，附 Remote Control 链接（读屏模式下直接显示 URL）。
 */
function StillWorkingPhoneLink(props) {
  let $ = w(8);
  let { url } = props;
  let screenReader = useIsScreenReaderEnabled();
  let ee;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    ee = jsxProd_default_2(Text, {
      dimColor: true,
      children: ["Check in from your phone", " \xB7 "],
    });
    $[0] = ee;
  } else ee = $[0];
  let ke;
  if ($[1] !== url) {
    ke = jsxProd_default_2(Fragment, {
      children: [
        ee,
        jsxProd_default(Text, {
          color: "suggestion",
          children: url,
        }),
      ],
    });
    $[1] = url;
    $[2] = ke;
  } else ke = $[2];
  let Re = ke;
  let Be;
  if ($[3] === MEMO_CACHE_SENTINEL) {
    Be = jsxProd_default(Text, {
      children: "Still working. ",
    });
    $[3] = Be;
  } else Be = $[3];
  let He;
  if ($[4] !== Re || $[5] !== screenReader || $[6] !== url) {
    He = jsxProd_default_2(Fragment, {
      children: [
        Be,
        screenReader
          ? Re
          : jsxProd_default(Link, {
              url,
              fallback: Re,
              children: jsxProd_default(Text, {
                color: "suggestion",
                children: "Check in from your phone",
              }),
            }),
      ],
    });
    $[4] = Re;
    $[5] = screenReader;
    $[6] = url;
    $[7] = He;
  } else He = $[7];
  return He;
}
//@ chunk-18hwfzwa.js:1781785-1782573 placement
var rcLongTurnNudgeNoticeSpec = {
  id: "rc-long-turn-nudge",
  deps: (h) => [h.turnAtRender.isLoading, h.replBridgeActive, h.removeNotification, h.clock],
  setup() {
    let h = false;
    return ({ turnAtRender: { isLoading }, replBridgeActive, removeNotification, clock }, ke) => {
      if (!isLoading) {
        if (h) {
          h = false;
          removeNotification(RC_LONG_TURN_NUDGE);
        }
        return;
      }
      if (!replBridgeActive || h || isRemoteSessionAvailable()) return;
      let longTurnNudgeConfig = getLongTurnNudgeConfig();
      if (
        longTurnNudgeConfig === null ||
        !canShowLongTurnNudge(longTurnNudgeConfig) ||
        !isWithinDayHours(longTurnNudgeConfig)
      )
        return;
      let Be = clock.setTimeout(() => {
        let { addNotification, replBridgeSessionUrl, store, storageV5 } = ke();
        if (h || !replBridgeSessionUrl) return;
        h = true;
        if (longTurnNudgeConfig.probability < 1 && Math.random() >= longTurnNudgeConfig.probability) return;
        recordLongTurnNudgeShown(longTurnNudgeConfig, storageV5);
        addNotification({
          key: RC_LONG_TURN_NUDGE,
          kind: "upsell",
          jsx: jsxProd_default(StillWorkingPhoneLink, {
            url: replBridgeSessionUrl,
          }),
          priority: "medium",
          requeueOnPreempt: true,
          timeoutMs: 2147483647,
        });
        logEvent("tengu_rc_long_turn_nudge_shown", {
          auto_on: store.getState().replBridgeAutoOnByDefault,
          threshold_sec: longTurnNudgeConfig.thresholdSec,
        });
      }, longTurnNudgeConfig.thresholdSec * 1000);
      return () => Be();
    };
  },
};
//@ chunk-18hwfzwa.js:1782573-1783832 placement
var RC_PERMISSION_NUDGE = "rc-permission-nudge";
var RC_NUDGE_MODES = new Set(["default", "plan", "acceptEdits"]);
var rcPermissionNudgeNoticeSpec = {
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
    let h = false;
    let x = false;
    let D = 0;
    let L = null;
    let ee = () => {};
    function ke({
      addNotification,
      turnAtRender,
      replBridgeActive,
      replBridgeSessionUrl,
      permissionMode,
      permissionPromptCount,
      storageV5,
    }) {
      if (permissionPromptCount < D) D = 0;
      if (
        h ||
        !replBridgeActive ||
        !replBridgeSessionUrl ||
        !RC_NUDGE_MODES.has(permissionMode) ||
        isRemoteSessionAvailable()
      )
        return;
      if (!x) {
        let permissionNudgeConfig = getPermissionNudgeConfig();
        if (
          permissionNudgeConfig.probability <= 0 ||
          permissionPromptCount < permissionNudgeConfig.afterPromptCount ||
          permissionPromptCount <= D ||
          !canShowPermissionNudge(permissionNudgeConfig.maxImpressions)
        )
          return;
        D = permissionPromptCount;
        if (Math.random() >= permissionNudgeConfig.probability) return;
        x = true;
      }
      if (turnAtRender.isLoading) return;
      h = true;
      recordPermissionNudgeShown(storageV5);
      addNotification({
        key: RC_PERMISSION_NUDGE,
        kind: "upsell",
        segments: [
          {
            text: "Approve tool calls from your phone \xB7 ",
            dim: true,
          },
          {
            text: replBridgeSessionUrl,
            color: "suggestion",
          },
        ],
        priority: "medium",
        requeueOnPreempt: true,
        timeoutMs: 2147483647,
      });
      logEvent("tengu_rc_permission_nudge_shown", {
        permission_mode: fromEnum(permissionMode),
        prompt_count: permissionPromptCount,
      });
    }
    return {
      effect: (Re) => {
        ke(Re);
        let Be = {
          isLoading: Re.turnAtRender.isLoading,
          rcReady: Re.replBridgeActive,
        };
        let He = L === null || L.isLoading !== Be.isLoading || L.rcReady !== Be.rcReady;
        L = Be;
        if (He && h && (Be.isLoading || !Be.rcReady)) Re.removeNotification(RC_PERMISSION_NUDGE);
        ee = Re.removeNotification;
      },
      dispose: () => ee(RC_PERMISSION_NUDGE),
    };
  },
};
//@ chunk-18hwfzwa.js:1783832-1785048 placement
var RC_IDLE_UPSELL = "rc-idle-upsell";
var PUSH_IDLE_UPSELL = "push-idle-upsell";
var remoteControlUpsellNoticeSpec = {
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
    let h = false;
    return ({
      addNotification,
      removeNotification,
      clock,
      store,
      turnAtRender: { isLoading, lastQueryCompletionTime },
      storageV5,
    }) => {
      if (isRemoteSessionAvailable() || lastQueryCompletionTime === 0 || isLoading || h) return;
      let He =
        !isBridgeInboundAllowed(store) && shouldShowRemoteControlUpsell()
          ? "rc"
          : canShowPushUpsell()
            ? "push"
            : null;
      if (He === null) return;
      let We = Date.now() - lastQueryCompletionTime;
      let ze = RC_MIN_TURN_SECONDS * 60000 - We;
      let Xe = clock.setTimeout(
        () => {
          if (h) return;
          let idleMinutes = Math.round((Date.now() - lastQueryCompletionTime) / 60000);
          if (He === "rc") {
            if (isBridgeInboundAllowed(store) || !shouldShowRemoteControlUpsell()) return;
            h = true;
            noteRcUpsellShown(storageV5);
            addNotification({
              key: RC_IDLE_UPSELL,
              kind: "upsell",
              segments: [
                {
                  text: "control this session from your phone \xB7 ",
                  dim: true,
                },
                {
                  text: "/remote-control",
                  color: "suggestion",
                },
              ],
              priority: "medium",
              timeoutMs: 2147483647,
            });
            logEvent("tengu_rc_upsell_notification_shown", {
              idleMinutes,
            });
          } else {
            if (!canShowPushUpsell()) return;
            h = true;
            notePushUpsellShown(storageV5);
            addNotification({
              key: PUSH_IDLE_UPSELL,
              kind: "upsell",
              segments: [
                {
                  text: "get pinged when Claude finishes \xB7 enable push notifications in ",
                  dim: true,
                },
                {
                  text: "/config",
                  color: "suggestion",
                },
              ],
              priority: "medium",
              timeoutMs: 2147483647,
            });
            logEvent("tengu_push_notif_upsell_notification_shown", {
              idleMinutes,
            });
          }
        },
        Math.max(0, ze),
      );
      return () => {
        Xe();
        removeNotification(RC_IDLE_UPSELL);
        removeNotification(PUSH_IDLE_UPSELL);
      };
    };
  },
};
export { remoteControlUpsellNoticeSpec, rcLongTurnNudgeNoticeSpec, rcPermissionNudgeNoticeSpec };
