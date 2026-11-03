/**
 * hooks/useQueueProcessor.ts
 *
 * 排队命令处理：回合空闲且无本地 JSX 对话框时依次出队执行。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/useQueueProcessor.ts
 * pieces: chunk-18hwfzwa.js (1)
 * attribution: callgraph-fingerprint 1
 */
import { ce, yt, Se, y, R, P } from "../../vendor/react/cjs/react.production.js";
import { mayReachModel } from "../screens/repl/PromptSubmitController.js";
import { Nu } from "../context/QueuedMessageContext.js";
import { useCommandQueue } from "../components/Messages.js";
import { DialogStoreContext, C0t } from "../state/dialogQueue.js";
import {
  NON_INTERRUPTING_DIALOGS,
  NOOP_UNSUBSCRIBE,
  peekNextProcessableCommand,
  prependModeCharacterToInput_2,
  isBridgeSlashCommandUnavailable,
  rCt,
  processQueueIfReady,
} from "../utils/queueProcessor.js";
import { LOCAL_JSX_DIALOG, isLocalJsxHoldingQueue } from "../commands/rate-limit-options/index.js";
import {
  subscribeConsentHandoffPending,
  isConsentHandoffPending,
} from "../services/remoteManagedSettings/securityCheck.js";
import { useSession } from "../context/session.js";
import { onLoadingScansRead } from "../plugins/functionHooks/hooksModuleLoader.js";
import { getActiveMessageQueue } from "../query/presenceCheck.js";
import { sN } from "../utils/model/modelSwitchHooks.js";
import { logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { Ffe } from "../utils/messageQueueManager.js";
import { m0r } from "../services/quotaAutoResume/quotaAutoResume.js";

//@ chunk-18hwfzwa.js:1663315-1665839 callgraph-fingerprint = useQueueProcessor (0.225)
function useQueueProcessor({
  turn: turn,
  hasActiveLocalJsxUI: hasActiveLocalJsxUI,
  commands: commands,
  handOverInFlight: handOverInFlight,
}) {
  let guard = turn.guard,
    isQueryActive = ce((Io) => mayReachModel(Io, commands), [commands]),
    queueSnapshot = yt(guard.subscribe, guard.getSnapshot),
    Be = Nu(),
    He = useCommandQueue(),
    We = Se(DialogStoreContext),
    ze = ce(
      () =>
        We !== null &&
        We.getState().open.some((Io) => Io.userInvoked !== !0 && NON_INTERRUPTING_DIALOGS.has(Io.kind)),
      [We],
    ),
    Xe = yt(We?.subscribe ?? NOOP_UNSUBSCRIBE, ze, ze),
    rt = ce(() => We !== null && C0t(We.getState(), LOCAL_JSX_DIALOG.kind), [We]),
    kt = yt(We?.subscribe ?? NOOP_UNSUBSCRIBE, rt, rt),
    At = ce(() => {
      let Io = rt() ? peekNextProcessableCommand(Be) : void 0;
      if (Io === void 0) return !1;
      let Wo = Io.bridgeOrigin === !0,
        mn = Wo || Io.skipSlashCommands !== !0 ? prependModeCharacterToInput_2(Io, commands) : void 0;
      return (
        ((mn?.type === "local-jsx" || (mn?.type === "local" && mn.name === "rewind")) && !Wo) ||
        (mn?.type === "local" && mn.name === "clear" && !isBridgeSlashCommandUnavailable(Io, commands))
      );
    }, [rt, Be, commands]),
    It = yt(subscribeConsentHandoffPending, isConsentHandoffPending, isConsentHandoffPending),
    Ot = useSession(),
    Et = null,
    Dt = null?.peek(Ot) ?? void 0,
    Lt = yt(Dt?.subscribe ?? NOOP_UNSUBSCRIBE, Dt?.getSnapshot ?? rCt, Dt?.getSnapshot ?? rCt),
    oo = yt(handOverInFlight.subscribe, handOverInFlight.getSnapshot, handOverInFlight.getSnapshot),
    Xt = ce(() => {
      if (handOverInFlight.getSnapshot()) return;
      processQueueIfReady({
        queue: Be,
        executeInput: turn.executeQueuedInput,
        waitsOnSessionStart: isQueryActive,
        screeningStale: turn.queuedScreeningStale(),
      });
    }, [Be, turn, isQueryActive, handOverInFlight]),
    [io, so] = y(0),
    [po, ao] = y(0),
    [co, bo] = y(0),
    Ao = R(void 0);
  P(
    () => () => {
      Ao.current = void 0;
    },
    [],
  );
  let [Bo, Ro] = y(0);
  P(
    () =>
      onLoadingScansRead(() => {
        Ro((Io) => Io + 1);
      }),
    [],
  );
  let Ho = R(null);
  (P(() => {
    if (!queueSnapshot) Ho.current = null;
  }, [queueSnapshot]),
    P(() => {
      let Io = getActiveMessageQueue();
      if (Io !== void 0 && Ao.current !== Io)
        ((Ao.current = Io),
          Io.then(() => {
            if (Ao.current !== Io) return;
            if (
              !guard.isActive &&
              sN.of(Ot).pending === 0 &&
              !ze() &&
              !isConsentHandoffPending() &&
              !0 &&
              !(We !== null && isLocalJsxHoldingQueue(We.getState())) &&
              !At() &&
              Be.getCommandQueue().length > 0
            )
              Xt();
            bo((Cn) => Cn + 1);
          }));
      if (hasActiveLocalJsxUI && We !== null && !guard.isRunning) {
        let Cn = peekNextProcessableCommand(Be);
        if (Cn !== void 0 && Ho.current !== Cn && isBridgeSlashCommandUnavailable(Cn, commands)) {
          ((Ho.current = Cn),
            We.dismissKind(LOCAL_JSX_DIALOG.kind),
            logFeatureOk("bridge_clear_dismisses_local_dialog"));
          return;
        }
      }
      if (queueSnapshot || guard.isActive) return;
      if (hasActiveLocalJsxUI && !Be.getCommandQueueSnapshot().every((Cn) => !Ffe(Cn) || m0r(Cn.uuid)))
        return;
      if (At()) return;
      if (Xe || ze() || It || isConsentHandoffPending()) return;
      if (He.length === 0) return;
      let filtered = Be.getCommandQueueSnapshot().filter(Ffe);
      if (filtered.length > 0 && filtered.every((Cn) => Cn.admissionExempt === "resurrected")) {
        let awaitSessionStartHooks = turn.awaitSessionStartHooks(new AbortController().signal);
        if (awaitSessionStartHooks) {
          let No = !0;
          return (
            awaitSessionStartHooks
              .catch(() => {})
              .then(() => {
                if (!No) return;
                if (
                  !guard.isActive &&
                  sN.of(Ot).pending === 0 &&
                  !ze() &&
                  !isConsentHandoffPending() &&
                  !0 &&
                  !(We !== null && isLocalJsxHoldingQueue(We.getState())) &&
                  !At() &&
                  Be.getCommandQueue().length > 0
                )
                  Xt();
                ao((vo) => vo + 1);
              }),
            () => {
              No = !1;
            }
          );
        }
      }
      let of = sN.of(Ot);
      if (of.pending > 0) {
        let Cn = !0;
        return (
          of.tail.then(() => {
            if (!Cn) return;
            if (
              !guard.isActive &&
              of.pending === 0 &&
              !ze() &&
              !isConsentHandoffPending() &&
              !0 &&
              !(We !== null && isLocalJsxHoldingQueue(We.getState())) &&
              !At() &&
              Be.getCommandQueue().length > 0
            )
              Xt();
            so((No) => No + 1);
          }),
          () => {
            Cn = !1;
          }
        );
      }
      Xt();
    }, [
      Be,
      He,
      queueSnapshot,
      turn,
      hasActiveLocalJsxUI,
      Xe,
      ze,
      It,
      Lt,
      oo,
      guard,
      Ot,
      io,
      po,
      co,
      Bo,
      We,
      commands,
      Xt,
      kt,
      At,
    ]));
}

export { useQueueProcessor };
