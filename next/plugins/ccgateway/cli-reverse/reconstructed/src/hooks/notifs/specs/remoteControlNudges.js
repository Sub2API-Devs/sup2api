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
import { useMemoCache } from "../../../../vendor/react/compiler-runtime.js";
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
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-18hwfzwa.js:1781197-1781226 placement
var RC_LONG_TURN_NUDGE = "rc-long-turn-nudge";
//@ chunk-18hwfzwa.js:1781226-1781785 placement
/**
 * 长回合提醒："Still working. Check in from your phone"，附 Remote Control 链接（读屏模式下直接显示 URL）。
 */
function StillWorkingPhoneLink(props) {
  let $ = useMemoCache(8);
  let { url } = props;
  let screenReader = useIsScreenReaderEnabled();
  let $_2;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    $_2 = jsxProd_default_2(Text, {
      dimColor: true,
      children: ["Check in from your phone", " \xB7 "],
    });
    $[0] = $_2;
  } else $_2 = $[0];
  let text;
  if ($[1] !== url) {
    text = jsxProd_default_2(Fragment, {
      children: [
        $_2,
        jsxProd_default(Text, {
          color: "suggestion",
          children: url,
        }),
      ],
    });
    $[1] = url;
    $[2] = text;
  } else text = $[2];
  let text_ = text;
  let linkElement;
  if ($[3] === MEMO_CACHE_SENTINEL) {
    linkElement = jsxProd_default(Text, {
      children: "Still working. ",
    });
    $[3] = linkElement;
  } else linkElement = $[3];
  let element;
  if ($[4] !== text_ || $[5] !== screenReader || $[6] !== url) {
    element = jsxProd_default_2(Fragment, {
      children: [
        linkElement,
        screenReader
          ? text_
          : jsxProd_default(Link, {
              url,
              fallback: text_,
              children: jsxProd_default(Text, {
                color: "suggestion",
                children: "Check in from your phone",
              }),
            }),
      ],
    });
    $[4] = text_;
    $[5] = screenReader;
    $[6] = url;
    $[7] = element;
  } else element = $[7];
  return element;
}
//@ chunk-18hwfzwa.js:1781785-1782573 placement
var rcLongTurnNudgeNoticeSpec = {
  id: "rc-long-turn-nudge",
  deps: (ctx) => [ctx.turnAtRender.isLoading, ctx.replBridgeActive, ctx.removeNotification, ctx.clock],
  setup() {
    let cancelled = false;
    return ({ turnAtRender: { isLoading }, replBridgeActive, removeNotification, clock }, timer) => {
      if (!isLoading) {
        if (cancelled) {
          cancelled = false;
          removeNotification(RC_LONG_TURN_NUDGE);
        }
        return;
      }
      if (!replBridgeActive || cancelled || isRemoteSessionAvailable()) return;
      let longTurnNudgeConfig = getLongTurnNudgeConfig();
      if (
        longTurnNudgeConfig === null ||
        !canShowLongTurnNudge(longTurnNudgeConfig) ||
        !isWithinDayHours(longTurnNudgeConfig)
      )
        return;
      let fired = clock.setTimeout(() => {
        let { addNotification, replBridgeSessionUrl, store, storageV5 } = timer();
        if (cancelled || !replBridgeSessionUrl) return;
        cancelled = true;
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
      return () => fired();
    };
  },
};
//@ chunk-18hwfzwa.js:1782573-1783832 placement
var RC_PERMISSION_NUDGE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var RC_NUDGE_MODES;
var rcPermissionNudgeNoticeSpec;
deferInit("chunk-18hwfzwa.js:1782573", () => {
  RC_PERMISSION_NUDGE = "rc-permission-nudge";
  RC_NUDGE_MODES = new Set(["default", "plan", "acceptEdits"]);
  rcPermissionNudgeNoticeSpec = {
    id: "rc-permission-nudge",
    deps: (ctx) => [
      ctx.permissionPromptCount,
      ctx.turnAtRender.isLoading,
      ctx.replBridgeActive,
      ctx.replBridgeSessionUrl,
      ctx.permissionMode,
      ctx.addNotification,
      ctx.removeNotification,
      ctx.storageV5,
    ],
    setup() {
      let armed = false;
      let firedOnce = false;
      let requestId = 0;
      let pendingTimer = null;
      let cleanup = () => {};
      function onRequest({
        addNotification,
        turnAtRender,
        replBridgeActive,
        replBridgeSessionUrl,
        permissionMode,
        permissionPromptCount,
        storageV5,
      }) {
        if (permissionPromptCount < requestId) requestId = 0;
        if (
          armed ||
          !replBridgeActive ||
          !replBridgeSessionUrl ||
          !RC_NUDGE_MODES.has(permissionMode) ||
          isRemoteSessionAvailable()
        )
          return;
        if (!firedOnce) {
          let permissionNudgeConfig = getPermissionNudgeConfig();
          if (
            permissionNudgeConfig.probability <= 0 ||
            permissionPromptCount < permissionNudgeConfig.afterPromptCount ||
            permissionPromptCount <= requestId ||
            !canShowPermissionNudge(permissionNudgeConfig.maxImpressions)
          )
            return;
          requestId = permissionPromptCount;
          if (Math.random() >= permissionNudgeConfig.probability) return;
          firedOnce = true;
        }
        if (turnAtRender.isLoading) return;
        armed = true;
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
        effect: (ctx) => {
          onRequest(ctx);
          let body = {
            isLoading: ctx.turnAtRender.isLoading,
            rcReady: ctx.replBridgeActive,
          };
          let element =
            pendingTimer === null ||
            pendingTimer.isLoading !== body.isLoading ||
            pendingTimer.rcReady !== body.rcReady;
          pendingTimer = body;
          if (element && armed && (body.isLoading || !body.rcReady))
            ctx.removeNotification(RC_PERMISSION_NUDGE);
          cleanup = ctx.removeNotification;
        },
        dispose: () => cleanup(RC_PERMISSION_NUDGE),
      };
    },
  };
});
//@ chunk-18hwfzwa.js:1783832-1785048 placement
var RC_IDLE_UPSELL = "rc-idle-upsell";
var PUSH_IDLE_UPSELL = "push-idle-upsell";
var remoteControlUpsellNoticeSpec = {
  id: "remote-control-upsell",
  deps: (ctx) => {
    let turnAtRender = ctx.turnAtRender;
    return [
      turnAtRender.lastQueryCompletionTime,
      turnAtRender.isLoading,
      ctx.addNotification,
      ctx.removeNotification,
      ctx.clock,
      ctx.storageV5,
    ];
  },
  setup() {
    let cancelled = false;
    return ({
      addNotification,
      removeNotification,
      clock,
      store,
      turnAtRender: { isLoading, lastQueryCompletionTime },
      storageV5,
    }) => {
      if (isRemoteSessionAvailable() || lastQueryCompletionTime === 0 || isLoading || cancelled) return;
      let timer =
        !isBridgeInboundAllowed(store) && shouldShowRemoteControlUpsell()
          ? "rc"
          : canShowPushUpsell()
            ? "push"
            : null;
      if (timer === null) return;
      let elapsedMs = Date.now() - lastQueryCompletionTime;
      let remainingMs = RC_MIN_TURN_SECONDS * 60000 - elapsedMs;
      let handle = clock.setTimeout(
        () => {
          if (cancelled) return;
          let idleMinutes = Math.round((Date.now() - lastQueryCompletionTime) / 60000);
          if (timer === "rc") {
            if (isBridgeInboundAllowed(store) || !shouldShowRemoteControlUpsell()) return;
            cancelled = true;
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
            cancelled = true;
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
        Math.max(0, remainingMs),
      );
      return () => {
        handle();
        removeNotification(RC_IDLE_UPSELL);
        removeNotification(PUSH_IDLE_UPSELL);
      };
    };
  },
};
export { remoteControlUpsellNoticeSpec, rcLongTurnNudgeNoticeSpec, rcPermissionNudgeNoticeSpec };
