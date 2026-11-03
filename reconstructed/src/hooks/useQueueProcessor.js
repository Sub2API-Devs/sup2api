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
import { useCommandQueueOrDefault } from "../context/QueuedMessageContext.js";
import { useCommandQueue } from "../components/Messages.js";
import { DialogStoreContext, hasOpenDialogOfKind } from "../state/dialogQueue.js";
import {
  NON_INTERRUPTING_DIALOGS,
  NOOP_UNSUBSCRIBE,
  peekNextProcessableCommand,
  prependModeCharacterToInput_2,
  isBridgeSlashCommandUnavailable,
  neverSubscribed,
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
import { switchSerializerSlot } from "../utils/model/modelSwitchHooks.js";
import { logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { isSendableQueuedCommand } from "../utils/messageQueueManager.js";
import { isPendingContinuationUuid } from "../services/quotaAutoResume/quotaAutoResume.js";

//@ chunk-18hwfzwa.js:1663315-1665839 callgraph-fingerprint = useQueueProcessor (0.225)
function useQueueProcessor({ turn, hasActiveLocalJsxUI, commands, handOverInFlight }) {
  let guard = turn.guard;
  let isQueryActive = ce((Io) => mayReachModel(Io, commands), [commands]);
  let queueSnapshot = yt(guard.subscribe, guard.getSnapshot);
  let commandQueueOrDefault = useCommandQueueOrDefault();
  let commandQueue = useCommandQueue();
  let We = Se(DialogStoreContext);
  let ze = ce(
    () =>
      We !== null &&
      We.getState().open.some((Io) => Io.userInvoked !== true && NON_INTERRUPTING_DIALOGS.has(Io.kind)),
    [We],
  );
  let Xe = yt(We?.subscribe ?? NOOP_UNSUBSCRIBE, ze, ze);
  let rt = ce(() => We !== null && hasOpenDialogOfKind(We.getState(), LOCAL_JSX_DIALOG.kind), [We]);
  let kt = yt(We?.subscribe ?? NOOP_UNSUBSCRIBE, rt, rt);
  let At = ce(() => {
    let Io = rt() ? peekNextProcessableCommand(commandQueueOrDefault) : undefined;
    if (Io === undefined) return false;
    let Wo = Io.bridgeOrigin === true;
    let mn = Wo || Io.skipSlashCommands !== true ? prependModeCharacterToInput_2(Io, commands) : undefined;
    return (
      ((mn?.type === "local-jsx" || (mn?.type === "local" && mn.name === "rewind")) && !Wo) ||
      (mn?.type === "local" && mn.name === "clear" && !isBridgeSlashCommandUnavailable(Io, commands))
    );
  }, [rt, commandQueueOrDefault, commands]);
  let It = yt(subscribeConsentHandoffPending, isConsentHandoffPending, isConsentHandoffPending);
  let session = useSession();
  let Et = null;
  let Dt = null?.peek(session) ?? undefined;
  let Lt = yt(
    Dt?.subscribe ?? NOOP_UNSUBSCRIBE,
    Dt?.getSnapshot ?? neverSubscribed,
    Dt?.getSnapshot ?? neverSubscribed,
  );
  let oo = yt(handOverInFlight.subscribe, handOverInFlight.getSnapshot, handOverInFlight.getSnapshot);
  let Xt = ce(() => {
    if (handOverInFlight.getSnapshot()) return;
    processQueueIfReady({
      queue: commandQueueOrDefault,
      executeInput: turn.executeQueuedInput,
      waitsOnSessionStart: isQueryActive,
      screeningStale: turn.queuedScreeningStale(),
    });
  }, [commandQueueOrDefault, turn, isQueryActive, handOverInFlight]);
  let [io, so] = y(0);
  let [po, ao] = y(0);
  let [co, bo] = y(0);
  let activeMessageQueueRef = R(undefined);
  P(
    () => () => {
      activeMessageQueueRef.current = undefined;
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
  P(() => {
    if (!queueSnapshot) Ho.current = null;
  }, [queueSnapshot]);
  P(() => {
    let activeMessageQueue = getActiveMessageQueue();
    if (activeMessageQueue !== undefined && activeMessageQueueRef.current !== activeMessageQueue) {
      activeMessageQueueRef.current = activeMessageQueue;
      activeMessageQueue.then(() => {
        if (activeMessageQueueRef.current !== activeMessageQueue) return;
        if (
          !guard.isActive &&
          switchSerializerSlot.of(session).pending === 0 &&
          !ze() &&
          !isConsentHandoffPending() &&
          true &&
          !(We !== null && isLocalJsxHoldingQueue(We.getState())) &&
          !At() &&
          commandQueueOrDefault.getCommandQueue().length > 0
        )
          Xt();
        bo((Cn) => Cn + 1);
      });
    }
    if (hasActiveLocalJsxUI && We !== null && !guard.isRunning) {
      let Cn = peekNextProcessableCommand(commandQueueOrDefault);
      if (Cn !== undefined && Ho.current !== Cn && isBridgeSlashCommandUnavailable(Cn, commands)) {
        Ho.current = Cn;
        We.dismissKind(LOCAL_JSX_DIALOG.kind);
        logFeatureOk("bridge_clear_dismisses_local_dialog");
        return;
      }
    }
    if (queueSnapshot || guard.isActive) return;
    if (
      hasActiveLocalJsxUI &&
      !commandQueueOrDefault
        .getCommandQueueSnapshot()
        .every((Cn) => !isSendableQueuedCommand(Cn) || isPendingContinuationUuid(Cn.uuid))
    )
      return;
    if (At()) return;
    if (Xe || ze() || It || isConsentHandoffPending()) return;
    if (commandQueue.length === 0) return;
    let filtered = commandQueueOrDefault.getCommandQueueSnapshot().filter(isSendableQueuedCommand);
    if (filtered.length > 0 && filtered.every((Cn) => Cn.admissionExempt === "resurrected")) {
      let Cn = turn.awaitSessionStartHooks(new AbortController().signal);
      if (Cn) {
        let No = true;
        Cn.catch(() => {}).then(() => {
          if (!No) return;
          if (
            !guard.isActive &&
            switchSerializerSlot.of(session).pending === 0 &&
            !ze() &&
            !isConsentHandoffPending() &&
            true &&
            !(We !== null && isLocalJsxHoldingQueue(We.getState())) &&
            !At() &&
            commandQueueOrDefault.getCommandQueue().length > 0
          )
            Xt();
          ao((vo) => vo + 1);
        });
        return () => {
          No = false;
        };
      }
    }
    let mn = switchSerializerSlot.of(session);
    if (mn.pending > 0) {
      let Cn = true;
      mn.tail.then(() => {
        if (!Cn) return;
        if (
          !guard.isActive &&
          mn.pending === 0 &&
          !ze() &&
          !isConsentHandoffPending() &&
          true &&
          !(We !== null && isLocalJsxHoldingQueue(We.getState())) &&
          !At() &&
          commandQueueOrDefault.getCommandQueue().length > 0
        )
          Xt();
        so((No) => No + 1);
      });
      return () => {
        Cn = false;
      };
    }
    Xt();
  }, [
    commandQueueOrDefault,
    commandQueue,
    queueSnapshot,
    turn,
    hasActiveLocalJsxUI,
    Xe,
    ze,
    It,
    Lt,
    oo,
    guard,
    session,
    io,
    po,
    co,
    Bo,
    We,
    commands,
    Xt,
    kt,
    At,
  ]);
}
export { useQueueProcessor };
