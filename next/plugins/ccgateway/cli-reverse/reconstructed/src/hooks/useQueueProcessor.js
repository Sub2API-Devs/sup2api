/**
 * hooks/useQueueProcessor.ts
 *
 * 排队命令处理：回合空闲且无本地 JSX 对话框时依次出队执行。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/useQueueProcessor.ts
 * pieces: chunk-czq1j3j2.js (1)
 * attribution: callgraph-fingerprint 1
 */
import {
  useCallback,
  useSyncExternalStore,
  useContext,
  useState,
  useRef,
  useEffect,
} from "../../vendor/react/cjs/react.production.js";
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
  scriptAskHoldsSlot,
  neverSubscribed,
  processQueueIfReady,
} from "../utils/queueProcessor.js";
import { LOCAL_JSX_DIALOG, isLocalJsxHoldingQueue } from "../commands/rate-limit-options/index.js";
import {
  subscribeConsentHandoffPending,
  isConsentHandoffPending,
} from "../services/remoteManagedSettings/securityCheck.js";
import { useSession } from "../context/session.js";
import { codeModeAccepted } from "../utils/codeMode/accepted.js";
import { isAsyncReplEnabled } from "../tools/RefreshMcpToolsTool/RefreshMcpToolsTool.js";
import { onLoadingScansRead } from "../plugins/functionHooks/hooksModuleLoader.js";
import { getActiveMessageQueue } from "../query/presenceCheck.js";
import { switchSerializerSlot } from "../utils/model/modelSwitchHooks.js";
import { logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { isSessionOwnerDialogOpen } from "../components/dialogs/dialogKinds.js";
import { isIdleDrainableMainThreadCommand } from "../utils/messageQueueManager.js";
import { isPendingContinuationUuid } from "../services/quotaAutoResume/quotaAutoResume.js";

//@ chunk-czq1j3j2.js:1709114-1711876 callgraph-fingerprint (2.1.88 match: useQueueProcessor, 0.225)
function useQueueProcessor({ turn, hasActiveLocalJsxUI, commands, handOverInFlight }) {
  let guard = turn.guard;
  let isQueryActive = useCallback((command) => mayReachModel(command, commands), [commands]);
  let queueSnapshot = useSyncExternalStore(guard.subscribe, guard.getSnapshot);
  let commandQueueOrDefault = useCommandQueueOrDefault();
  let commandQueue = useCommandQueue();
  let dialogStore = useContext(DialogStoreContext);
  let selectNonInterrupting = useCallback(
    () =>
      dialogStore !== null &&
      dialogStore
        .getState()
        .open.some((dialog) => dialog.userInvoked !== true && NON_INTERRUPTING_DIALOGS.has(dialog.kind)),
    [dialogStore],
  );
  let hasBlockingDialog = useSyncExternalStore(
    dialogStore?.subscribe ?? NOOP_UNSUBSCRIBE,
    selectNonInterrupting,
    selectNonInterrupting,
  );
  let selectAnyDialog = useCallback(
    () => dialogStore !== null && hasOpenDialogOfKind(dialogStore.getState(), LOCAL_JSX_DIALOG.kind),
    [dialogStore],
  );
  let hasAnyDialog = useSyncExternalStore(
    dialogStore?.subscribe ?? NOOP_UNSUBSCRIBE,
    selectAnyDialog,
    selectAnyDialog,
  );
  let peekNext = useCallback(() => {
    let command = selectAnyDialog() ? peekNextProcessableCommand(commandQueueOrDefault) : undefined;
    if (command === undefined) return false;
    let isBridge = command.bridgeOrigin === true;
    let reasons =
      isBridge || command.skipSlashCommands !== true
        ? prependModeCharacterToInput_2(command, commands)
        : undefined;
    return (
      ((reasons?.type === "local-jsx" || (reasons?.type === "local" && reasons.name === "rewind")) &&
        !isBridge) ||
      (reasons?.type === "local" &&
        reasons.name === "clear" &&
        !isBridgeSlashCommandUnavailable(command, commands))
    );
  }, [selectAnyDialog, commandQueueOrDefault, commands]);
  let handoffPending = useSyncExternalStore(
    subscribeConsentHandoffPending,
    isConsentHandoffPending,
    isConsentHandoffPending,
  );
  let session = useSession();
  let queueRef = codeModeAccepted() ? scriptAskHoldsSlot() : null;
  let pendingCommand =
    queueRef?.peek(session) ?? (queueRef !== null && isAsyncReplEnabled() ? queueRef.of(session) : undefined);
  let turnActive = useSyncExternalStore(
    pendingCommand?.subscribe ?? NOOP_UNSUBSCRIBE,
    pendingCommand?.getSnapshot ?? neverSubscribed,
    pendingCommand?.getSnapshot ?? neverSubscribed,
  );
  let handoverInFlight = useSyncExternalStore(
    handOverInFlight.subscribe,
    handOverInFlight.getSnapshot,
    handOverInFlight.getSnapshot,
  );
  let blocked = useCallback(() => {
    if (handOverInFlight.getSnapshot()) return;
    processQueueIfReady({
      queue: commandQueueOrDefault,
      executeInput: turn.executeQueuedInput,
      waitsOnSessionStart: isQueryActive,
      screeningStale: turn.queuedScreeningStale(),
    });
  }, [commandQueueOrDefault, turn, isQueryActive, handOverInFlight]);
  let [processed, setProcessed] = useState(0);
  let [skipped, setSkipped] = useState(0);
  let [resurrected, setResurrected] = useState(0);
  let activeMessageQueueRef = useRef(undefined);
  useEffect(
    () => () => {
      activeMessageQueueRef.current = undefined;
    },
    [],
  );
  let [turns, setTurns] = useState(0);
  useEffect(
    () =>
      onLoadingScansRead(() => {
        setTurns((count) => count + 1);
      }),
    [],
  );
  let turnRef = useRef(null);
  useEffect(() => {
    if (!queueSnapshot) turnRef.current = null;
  }, [queueSnapshot]);
  useEffect(() => {
    let activeMessageQueue = getActiveMessageQueue();
    if (activeMessageQueue !== undefined && activeMessageQueueRef.current !== activeMessageQueue) {
      activeMessageQueueRef.current = activeMessageQueue;
      activeMessageQueue.then(() => {
        if (activeMessageQueueRef.current !== activeMessageQueue) return;
        if (
          !guard.isActive &&
          switchSerializerSlot.of(session).pending === 0 &&
          !selectNonInterrupting() &&
          !isConsentHandoffPending() &&
          (!codeModeAccepted() || scriptAskHoldsSlot()?.peek(session)?.getSnapshot() !== true) &&
          !(dialogStore !== null && isLocalJsxHoldingQueue(dialogStore.getState())) &&
          !peekNext() &&
          commandQueueOrDefault.getCommandQueue().length > 0
        )
          blocked();
        setResurrected((count) => count + 1);
      });
    }
    if (hasActiveLocalJsxUI && dialogStore !== null && !guard.isRunning) {
      let nextCommand = peekNextProcessableCommand(commandQueueOrDefault);
      if (
        nextCommand !== undefined &&
        turnRef.current !== nextCommand &&
        isBridgeSlashCommandUnavailable(nextCommand, commands)
      ) {
        turnRef.current = nextCommand;
        dialogStore.dismissKind(LOCAL_JSX_DIALOG.kind);
        logFeatureOk("bridge_clear_dismisses_local_dialog");
        return;
      }
    }
    if (queueSnapshot || guard.isActive) return;
    if (
      hasActiveLocalJsxUI &&
      ((dialogStore !== null && isSessionOwnerDialogOpen(dialogStore.getState())) ||
        !commandQueueOrDefault
          .getCommandQueueSnapshot()
          .every(
            (queued) => !isIdleDrainableMainThreadCommand(queued) || isPendingContinuationUuid(queued.uuid),
          ))
    )
      return;
    if (peekNext()) return;
    if (
      hasBlockingDialog ||
      selectNonInterrupting() ||
      handoffPending ||
      isConsentHandoffPending() ||
      (codeModeAccepted() && (turnActive || scriptAskHoldsSlot()?.peek(session)?.getSnapshot() === true))
    )
      return;
    if (commandQueue.length === 0) return;
    let filtered = commandQueueOrDefault.getCommandQueueSnapshot().filter(isIdleDrainableMainThreadCommand);
    if (filtered.length > 0 && filtered.every((item) => item.admissionExempt === "resurrected")) {
      let hooksPromise = turn.awaitSessionStartHooks(new AbortController().signal);
      if (hooksPromise) {
        let done = true;
        hooksPromise
          .catch(() => {})
          .then(() => {
            if (!done) return;
            if (
              !guard.isActive &&
              switchSerializerSlot.of(session).pending === 0 &&
              !selectNonInterrupting() &&
              !isConsentHandoffPending() &&
              (!codeModeAccepted() || scriptAskHoldsSlot()?.peek(session)?.getSnapshot() !== true) &&
              !(dialogStore !== null && isLocalJsxHoldingQueue(dialogStore.getState())) &&
              !peekNext() &&
              commandQueueOrDefault.getCommandQueue().length > 0
            )
              blocked();
            setSkipped((count) => count + 1);
          });
        return () => {
          done = false;
        };
      }
    }
    let serializer = switchSerializerSlot.of(session);
    if (serializer.pending > 0) {
      let done_ = true;
      serializer.tail.then(() => {
        if (!done_) return;
        if (
          !guard.isActive &&
          serializer.pending === 0 &&
          !selectNonInterrupting() &&
          !isConsentHandoffPending() &&
          (!codeModeAccepted() || scriptAskHoldsSlot()?.peek(session)?.getSnapshot() !== true) &&
          !(dialogStore !== null && isLocalJsxHoldingQueue(dialogStore.getState())) &&
          !peekNext() &&
          commandQueueOrDefault.getCommandQueue().length > 0
        )
          blocked();
        setProcessed((count) => count + 1);
      });
      return () => {
        done_ = false;
      };
    }
    blocked();
  }, [
    commandQueueOrDefault,
    commandQueue,
    queueSnapshot,
    turn,
    hasActiveLocalJsxUI,
    hasBlockingDialog,
    selectNonInterrupting,
    handoffPending,
    turnActive,
    handoverInFlight,
    guard,
    session,
    processed,
    skipped,
    resurrected,
    turns,
    dialogStore,
    commands,
    blocked,
    hasAnyDialog,
    peekNext,
  ]);
}
export { useQueueProcessor };
