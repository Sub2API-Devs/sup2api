/**
 * plugins/functionHooks/hooks-worker/hooks-worker.js: the function-hooks worker (a worker thread's entry; a second program)
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64): the file of the same path in the
 * build. It is not one of the scanned chunks: its names come from naming/worker-hooks-worker.json
 * (renamed and checked by tools/emit/worker-names.mjs) and its imports name the reading tree's modules. Started by
 * plugins/functionHooks/hooksWorker.js; built as its own entry (build.mjs).
 */
import { workerData } from "worker_threads";
import { setMatcherLog, serializeMatcherList } from "../../../utils/hooks/functionHookMatchers.js";
import { forwardAbort, hookScopeStore } from "../dispatch/chain.js";
import { surfaceRowLedger, parseAskUserQuestionRenderRequest } from "../ui/treeConstants.js";
import { markScrollActivity } from "../vm/vmGlobals.js";
import { isUiEventName } from "../api/agentToolOps.js";
import { rejectionText, unawaitedOpMessage } from "../vm/moduleLoader.js";
import {
  abortReasonText,
  HooksError,
  causeString,
  nextNotPlainData,
  argsNotPlainData,
  makeHooksOrPlainError,
  settledIfPlainData,
  readWeakTag,
  readTag,
} from "../hooksErrors.js";
import { errorMessage } from "../../../utils/errors.js";
import { setEventTableEntries } from "../../../utils/pathTable.js";
import {
  createHookHostBridge,
  MARKS_NEWEST_DISPATCH_SLOT,
  MARKS_ANSWERS_SENT_SLOT,
  MARKS_ANSWERED_DISPATCH_SLOT,
  takePending,
} from "../hostBridge.js";

//@ src/plugins/functionHooks/hooks-worker/hooks-worker.js (original; names from naming/worker-hooks-worker.json)
var createWorkerState = (workerGlobal) => ({
  post: (message) => workerGlobal.postMessage(message),
  ports: new Map(),
  pendingNext: new Map(),
  pendingSteps: new Map(),
  streams: new Map(),
  nextCounter: 0,
  opCounter: 0,
});
function describeRejection(bridge, reason) {
  let failure = bridge.opFailureOf(reason) ?? readTag(reason);
  if (failure === undefined) return rejectionText(reason);
  return unawaitedOpMessage(failure);
}
var reportUnhandledRejections = (state, bridge) => {
  process.on("unhandledRejection", (reason) =>
    state.post({
      type: "unhandled",
      error: describeRejection(bridge, reason),
    }),
  );
};
var awaitPortReply = ({ pending, key, send, onAbort, signal, notPlainMessage }) =>
  new Promise((resolve, reject) => {
    let stopAbortForwarder = () => {};
    pending.set(key, {
      resolve: (value) => {
        stopAbortForwarder();
        resolve(value);
      },
      reject: (error) => {
        stopAbortForwarder();
        reject(error);
      },
    });
    try {
      send();
    } catch (thrown) {
      pending.delete(key);
      reject(new HooksError(notPlainMessage(thrown)));
      return;
    }
    stopAbortForwarder = forwardAbort(signal, {
      abort: onAbort,
    });
  });
var makeNextCallback = (state, dispatchId) => (argument, signal, floors) => {
  let nextId = ++state.nextCounter;
  return awaitPortReply({
    pending: state.pendingNext,
    key: `${dispatchId}:${nextId}`,
    send: () =>
      state.post({
        type: "next",
        id: dispatchId,
        nextId,
        argument,
        floors,
      }),
    onAbort: () =>
      state.post({
        type: "next_abort",
        id: dispatchId,
        nextId,
        reason: abortReasonText(signal),
        ...settledIfPlainData(signal),
      }),
    signal,
    notPlainMessage: (thrown) => nextNotPlainData(errorMessage(thrown)),
  });
};
function requestOp(
  state,
  { environmentId, op: opName, args, signal, dispatchId, registration, serving, rootEvent, pressing },
) {
  let entry = state.ports.get(environmentId);
  if (!entry) return Promise.reject(new HooksError(`${opName}: the plugin's environment is unloaded`));
  let { port } = entry;
  let opId = ++state.opCounter;
  if (dispatchId !== undefined && !isUiEventName(opName)) entry.owedOps.set(opId, dispatchId);
  return awaitPortReply({
    pending: entry.pendingOps,
    key: opId,
    send: () =>
      port.postMessage({
        type: "op",
        opId,
        dispatchId,
        registration,
        serving,
        rootEvent,
        pressing,
        op: opName,
        args,
      }),
    onAbort: signal
      ? () =>
          port.postMessage({
            type: "op_abort",
            opId,
            reason: abortReasonText(signal),
          })
      : () => {},
    signal,
    notPlainMessage: (thrown) => argsNotPlainData(opName, errorMessage(thrown)),
  });
}
var makeStreamNextCallback = (state, dispatchId) => (argument, signal, floors) => {
  let nextId = ++state.nextCounter;
  let sentOpen = false;
  let isFinished = false;
  let pullOnce = () =>
    awaitPortReply({
      pending: state.pendingSteps,
      key: `${dispatchId}:${nextId}`,
      send: () => {
        state.post({
          type: "next_pull",
          id: dispatchId,
          nextId,
          ...(sentOpen
            ? {}
            : {
                open: {
                  argument,
                  floors,
                },
              }),
        });
        sentOpen = true;
      },
      onAbort: () =>
        state.post({
          type: "next_abort",
          id: dispatchId,
          nextId,
          reason: abortReasonText(signal),
          ...settledIfPlainData(signal),
        }),
      signal,
      notPlainMessage: (thrown) => nextNotPlainData(errorMessage(thrown)),
    });
  return (async function* () {
    try {
      while (true) {
        let step = await pullOnce().catch((error) => {
          isFinished = true;
          throw error;
        });
        if (step.done) {
          isFinished = true;
          return step.value;
        }
        yield step.value;
      }
    } finally {
      if (sentOpen && !isFinished)
        state.post({
          type: "next_close",
          id: dispatchId,
          nextId,
        });
    }
  })();
};
var requestOpStream = (
  state,
  { environmentId, op: opName, args, signal, dispatchId, registration, serving, rootEvent },
) =>
  (async function* () {
    let unloadedError = () => new HooksError(`${opName}: the plugin's environment is unloaded`);
    let entry = state.ports.get(environmentId);
    if (!entry) throw unloadedError();
    let { port, pendingOps, owedOps } = entry;
    let opId = ++state.opCounter;
    let openFrame = {
      dispatchId,
      registration,
      serving,
      rootEvent,
      op: opName,
      args,
    };
    let sentOpen = false;
    let isFinished = false;
    function pullOnce() {
      if (state.ports.get(environmentId) !== entry) return Promise.reject(unloadedError());
      if (dispatchId !== undefined) owedOps.set(opId, dispatchId);
      return awaitPortReply({
        pending: pendingOps,
        key: opId,
        send: () => {
          port.postMessage({
            type: "op_pull",
            opId,
            ...(sentOpen
              ? {}
              : {
                  open: openFrame,
                }),
          });
          sentOpen = true;
        },
        onAbort: signal
          ? () =>
              port.postMessage({
                type: "op_abort",
                opId,
                reason: abortReasonText(signal),
              })
          : () => {},
        signal,
        notPlainMessage: (thrown) => argsNotPlainData(opName, errorMessage(thrown)),
      });
    }
    try {
      while (true) {
        let step = await pullOnce().catch((error) => {
          isFinished = true;
          throw error;
        });
        if (step.done) {
          isFinished = true;
          return step.value;
        }
        yield step.value;
      }
    } finally {
      if (sentOpen && !isFinished)
        port.postMessage({
          type: "op_close",
          opId,
        });
    }
  })();
function recordNewestDispatch(marks, dispatchId) {
  if (marks)
    Atomics.store(
      marks,
      MARKS_NEWEST_DISPATCH_SLOT,
      Math.max(Atomics.load(marks, MARKS_NEWEST_DISPATCH_SLOT), dispatchId),
    );
}
function recordAnsweredDispatch(marks, answersByDispatch, dispatchId) {
  let answerCount = (answersByDispatch.get(dispatchId) ?? 0) + 1;
  answersByDispatch.set(dispatchId, answerCount);
  if (marks) {
    Atomics.store(marks, MARKS_ANSWERED_DISPATCH_SLOT, dispatchId);
    Atomics.store(marks, MARKS_ANSWERS_SENT_SLOT, answerCount);
  }
}
function rejectPendingOps(entry) {
  for (let pending of entry.pendingOps.values())
    pending.reject(new HooksError("the plugin's environment was unloaded"));
  entry.pendingOps.clear();
}
function readSharedSlot(bootstrapData, key) {
  if (!(typeof bootstrapData === "object" && bootstrapData !== null && key in bootstrapData)) return;
  let slotValue = Object.getOwnPropertyDescriptor(bootstrapData, key)?.value;
  return slotValue instanceof SharedArrayBuffer ? new Int32Array(slotValue) : undefined;
}
function startHooksWorker(workerGlobal) {
  let state = createWorkerState(workerGlobal);
  let { post, ports, pendingNext, pendingSteps, streams } = state;
  let abortControllers = new Map();
  let stamp = readSharedSlot(workerData, "stamp");
  let marks = readSharedSlot(workerData, "marks");
  let answersByDispatch = new Map();
  setMatcherLog({
    log: (text, level) =>
      post({
        type: "log",
        text,
        level,
      }),
    hookFailed: (failure) =>
      post({
        type: "hook_failed",
        ...failure,
      }),
  });
  hookScopeStore.set((sighting) =>
    post({
      type: "passed_by",
      sighting,
    }),
  );
  let bridge = createHookHostBridge({
    hostOps: (request) => requestOp(state, request),
    hostStreamOps: (request) => requestOpStream(state, request),
    stamp,
  });
  reportUnhandledRejections(state, bridge);
  workerGlobal.onmessage = (messageEvent) => {
    let message = messageEvent.data;
    if (message.type === "ping") {
      post({
        type: "pong",
        n: message.n,
      });
      return;
    }
    switch ((markScrollActivity(stamp), message.type)) {
      case "load": {
        let { environmentId, port: environmentPort } = message;
        let pendingOps = new Map();
        let owedOps = new Map();
        ports.set(environmentId, {
          port: environmentPort,
          pendingOps,
          owedOps,
        });
        environmentPort.onmessage = (portMessageEvent) => {
          let frame = portMessageEvent.data;
          markScrollActivity(stamp);
          if (frame.type === "flush") {
            environmentPort.postMessage({
              type: "flushed",
              flushId: frame.flushId,
            });
            return;
          }
          let owedDispatchId = takePending(owedOps, frame.opId);
          if (owedDispatchId !== undefined) recordAnsweredDispatch(marks, answersByDispatch, owedDispatchId);
          let pending = takePending(pendingOps, frame.opId);
          if (frame.type === "op_result") pending?.resolve(frame.value);
          else pending?.reject(new HooksError(frame.error));
        };
        bridge.load(environmentId, message.args).then(
          (loaded) => {
            post({
              type: "loaded",
              environmentId,
              registered: serializeMatcherList(loaded.registered),
            });
          },
          (loadError) => {
            ports.delete(environmentId);
            environmentPort.close();
            let cause = causeString(loadError);
            post({
              type: "load_error",
              environmentId,
              error: errorMessage(loadError),
              ...(cause !== undefined && {
                cause,
              }),
            });
          },
        );
        return;
      }
      case "unload": {
        bridge.unload(message.environmentId);
        let entry = takePending(ports, message.environmentId);
        if (entry) {
          entry.port.close();
          rejectPendingOps(entry);
        }
        return;
      }
      case "build": {
        let { environmentId } = message;
        try {
          bridge.build(environmentId, message.table, message.suppressed);
          post({
            type: "built",
            environmentId,
          });
        } catch (buildError) {
          post({
            type: "built_error",
            environmentId,
            error: errorMessage(buildError),
          });
        }
        return;
      }
      case "resolve": {
        let { resolveId, environmentId, requests } = message;
        Promise.resolve()
          .then(() => bridge.resolveTables(environmentId, requests))
          .then(
            () =>
              post({
                type: "resolved",
                resolveId,
              }),
            (error) =>
              post({
                type: "resolve_error",
                resolveId,
                error: errorMessage(error),
              }),
          );
        return;
      }
      case "call": {
        let { callId, environmentId, call, callers } = message;
        Promise.resolve()
          .then(() =>
            bridge.callInterface(environmentId, call, {
              callId,
              callers,
            }),
          )
          .then(
            (value) => {
              try {
                post({
                  type: "call_result",
                  callId,
                  value,
                });
              } catch (cloneError) {
                post({
                  type: "call_error",
                  callId,
                  error: `$.${call.name}.${call.method} returned a value that is not plain data: ${errorMessage(cloneError)}`,
                });
              }
            },
            (error) =>
              post({
                type: "call_error",
                callId,
                error: errorMessage(error),
              }),
          );
        return;
      }
      case "dispatch": {
        let {
          id: dispatchId,
          event,
          payload,
          environments,
          leftOut,
          origin,
          raise,
          floors,
          cutAt,
          names,
          dialogClients,
          ended,
        } = message;
        let renderRequest = parseAskUserQuestionRenderRequest(event, payload);
        setEventTableEntries(event, names);
        if (renderRequest !== undefined) surfaceRowLedger.holdClients(renderRequest, dialogClients);
        recordNewestDispatch(marks, dispatchId);
        let abortController = new AbortController();
        abortControllers.set(dispatchId, abortController);
        Promise.resolve()
          .then(() =>
            bridge.dispatch(
              {
                id: dispatchId,
                event,
                payload,
                environments,
                leftOut,
                origin,
                raise,
                floors,
                cutAt,
                ended,
              },
              makeNextCallback(state, dispatchId),
              abortController.signal,
            ),
          )
          .then(
            (result) => {
              try {
                post({
                  type: "result",
                  id: dispatchId,
                  ...result,
                });
              } catch (cloneError) {
                post({
                  type: "error",
                  id: dispatchId,
                  error: `result not cloneable: ${errorMessage(cloneError)}`,
                  ...(result.withheld === true && {
                    withheld: true,
                  }),
                });
              }
            },
            (dispatchFailure) =>
              post({
                type: "error",
                id: dispatchId,
                error: errorMessage(dispatchFailure),
                ...(readWeakTag(dispatchFailure)?.isNoted === true && {
                  withheld: true,
                }),
              }),
          )
          .finally(() => {
            abortControllers.delete(dispatchId);
            answersByDispatch.delete(dispatchId);
          });
        return;
      }
      case "dispatch_stream": {
        let { id: dispatchId, type: messageType, ...streamRequest } = message;
        recordNewestDispatch(marks, dispatchId);
        let abortController = new AbortController();
        abortControllers.set(dispatchId, abortController);
        try {
          streams.set(
            dispatchId,
            bridge.dispatchStream(
              {
                id: dispatchId,
                ...streamRequest,
              },
              makeStreamNextCallback(state, dispatchId),
              abortController.signal,
            ),
          );
        } catch (error) {
          abortControllers.delete(dispatchId);
          answersByDispatch.delete(dispatchId);
          post({
            type: "error",
            id: dispatchId,
            error: errorMessage(error),
          });
        }
        return;
      }
      case "dialog_clients": {
        surfaceRowLedger.holdClients(message.site, message.clients);
        return;
      }
      case "stream_pull": {
        let finishStream = function () {
          streams.delete(dispatchId);
          abortControllers.delete(dispatchId);
          answersByDispatch.delete(dispatchId);
        };
        let { id: dispatchId } = message;
        let stream = streams.get(dispatchId);
        if (stream === undefined) {
          post({
            type: "error",
            id: dispatchId,
            error: "no stream is open for this dispatch",
          });
          return;
        }
        stream.next().then(
          (step) => {
            if (step.done === true) finishStream();
            try {
              post({
                type: "stream_step",
                id: dispatchId,
                step: {
                  done: step.done === true,
                  value: step.value,
                },
              });
            } catch (cloneError) {
              finishStream();
              stream.return(undefined).catch(() => {
                return;
              });
              post({
                type: "error",
                id: dispatchId,
                error: `a chunk that is not plain data: ${errorMessage(cloneError)}`,
              });
            }
          },
          (streamError) => {
            finishStream();
            post({
              type: "error",
              id: dispatchId,
              error: errorMessage(streamError),
            });
          },
        );
        return;
      }
      case "stream_close": {
        let stream = streams.get(message.id);
        streams.delete(message.id);
        abortControllers.delete(message.id);
        stream?.return(undefined).catch(() => {
          return;
        });
        return;
      }
      case "next_step": {
        recordAnsweredDispatch(marks, answersByDispatch, message.id);
        takePending(pendingSteps, `${message.id}:${message.nextId}`)?.resolve(message.step);
        return;
      }
      case "abort":
        abortControllers.get(message.id)?.abort(makeHooksOrPlainError(message.reason, message.isSettled));
        return;
      case "press": {
        let { pressId, environmentId, handle, e: event } = message;
        Promise.resolve()
          .then(() =>
            bridge.press(
              environmentId,
              {
                handle,
                sent: pressId,
              },
              event,
            ),
          )
          .then(
            () =>
              post({
                type: "press_result",
                pressId,
              }),
            (error) =>
              post({
                type: "press_error",
                pressId,
                error: errorMessage(error),
              }),
          );
        return;
      }
      case "press_release":
        bridge.releasePresses(message.environmentId, message.handles);
        return;
      case "next_result":
      case "next_error": {
        recordAnsweredDispatch(marks, answersByDispatch, message.id);
        let pendingKey = `${message.id}:${message.nextId}`;
        let pending = takePending(pendingNext, pendingKey);
        if (message.type === "next_result") pending?.resolve(message.result);
        else {
          let error = new HooksError(message.error);
          pending?.reject(error);
          takePending(pendingSteps, pendingKey)?.reject(error);
        }
        return;
      }
    }
  };
  post({
    type: "online",
  });
}
startHooksWorker(self);
