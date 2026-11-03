/**
 * vscode-jsonrpc/lib/common/connection.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: vscode-jsonrpc@8.2.0..8.2.1
 * pieces: chunk-t4ksmxzx.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { require_ral } from "./ral.js";
import { require_is } from "./is.js";
import { require_messages } from "./messages.js";
import { require_linkedMap } from "./linkedMap.js";
import { require_events } from "./events.js";
import { require_cancellation } from "./cancellation.js";

//@ chunk-t4ksmxzx.js:26637-44519 cjs-fingerprint
var require_connection = x(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.createMessageConnection =
    cjsExports.ConnectionOptions =
    cjsExports.MessageStrategy =
    cjsExports.CancellationStrategy =
    cjsExports.CancellationSenderStrategy =
    cjsExports.CancellationReceiverStrategy =
    cjsExports.RequestCancellationReceiverStrategy =
    cjsExports.IdCancellationReceiverStrategy =
    cjsExports.ConnectionStrategy =
    cjsExports.ConnectionError =
    cjsExports.ConnectionErrors =
    cjsExports.LogTraceNotification =
    cjsExports.SetTraceNotification =
    cjsExports.TraceFormat =
    cjsExports.TraceValues =
    cjsExports.Trace =
    cjsExports.NullLogger =
    cjsExports.ProgressType =
    cjsExports.ProgressToken =
      undefined;
  var ral_1 = require_ral();
  var Is = require_is();
  var messages_1 = require_messages();
  var linkedMap_1 = require_linkedMap();
  var events_1 = require_events();
  var cancellation_1 = require_cancellation();
  var CancelNotification;
  (function (CancelNotification) {
    CancelNotification.type = new messages_1.NotificationType("$/cancelRequest");
  })(CancelNotification || (CancelNotification = {}));
  var ProgressToken;
  (function (ProgressToken) {
    function is(value) {
      return typeof value === "string" || typeof value === "number";
    }
    ProgressToken.is = is;
  })(ProgressToken || (cjsExports.ProgressToken = ProgressToken = {}));
  var ProgressNotification;
  (function (ProgressNotification) {
    ProgressNotification.type = new messages_1.NotificationType("$/progress");
  })(ProgressNotification || (ProgressNotification = {}));
  class ProgressType {
    constructor() {}
  }
  cjsExports.ProgressType = ProgressType;
  var StarRequestHandler;
  (function (StarRequestHandler) {
    function is(value) {
      return Is.func(value);
    }
    StarRequestHandler.is = is;
  })(StarRequestHandler || (StarRequestHandler = {}));
  cjsExports.NullLogger = Object.freeze({
    error: () => {},
    warn: () => {},
    info: () => {},
    log: () => {},
  });
  var Trace;
  (function (Trace) {
    Trace[(Trace.Off = 0)] = "Off";
    Trace[(Trace.Messages = 1)] = "Messages";
    Trace[(Trace.Compact = 2)] = "Compact";
    Trace[(Trace.Verbose = 3)] = "Verbose";
  })(Trace || (cjsExports.Trace = Trace = {}));
  var TraceValues;
  (function (TraceValues) {
    TraceValues.Off = "off";
    TraceValues.Messages = "messages";
    TraceValues.Compact = "compact";
    TraceValues.Verbose = "verbose";
  })(TraceValues || (cjsExports.TraceValues = TraceValues = {}));
  (function (Trace) {
    function fromString(value) {
      if (!Is.string(value)) return Trace.Off;
      switch (((value = value.toLowerCase()), value)) {
        case "off":
          return Trace.Off;
        case "messages":
          return Trace.Messages;
        case "compact":
          return Trace.Compact;
        case "verbose":
          return Trace.Verbose;
        default:
          return Trace.Off;
      }
    }
    Trace.fromString = fromString;
    function toString(value) {
      switch (value) {
        case Trace.Off:
          return "off";
        case Trace.Messages:
          return "messages";
        case Trace.Compact:
          return "compact";
        case Trace.Verbose:
          return "verbose";
        default:
          return "off";
      }
    }
    Trace.toString = toString;
  })(Trace || (cjsExports.Trace = Trace = {}));
  var TraceFormat;
  (function (TraceFormat) {
    TraceFormat.Text = "text";
    TraceFormat.JSON = "json";
  })(TraceFormat || (cjsExports.TraceFormat = TraceFormat = {}));
  (function (TraceFormat) {
    function fromString(value) {
      if (!Is.string(value)) return TraceFormat.Text;
      value = value.toLowerCase();
      if (value === "json") return TraceFormat.JSON;
      else return TraceFormat.Text;
    }
    TraceFormat.fromString = fromString;
  })(TraceFormat || (cjsExports.TraceFormat = TraceFormat = {}));
  var SetTraceNotification;
  (function (SetTraceNotification) {
    SetTraceNotification.type = new messages_1.NotificationType("$/setTrace");
  })(SetTraceNotification || (cjsExports.SetTraceNotification = SetTraceNotification = {}));
  var LogTraceNotification;
  (function (LogTraceNotification) {
    LogTraceNotification.type = new messages_1.NotificationType("$/logTrace");
  })(LogTraceNotification || (cjsExports.LogTraceNotification = LogTraceNotification = {}));
  var ConnectionErrors;
  (function (ConnectionErrors) {
    ConnectionErrors[(ConnectionErrors.Closed = 1)] = "Closed";
    ConnectionErrors[(ConnectionErrors.Disposed = 2)] = "Disposed";
    ConnectionErrors[(ConnectionErrors.AlreadyListening = 3)] = "AlreadyListening";
  })(ConnectionErrors || (cjsExports.ConnectionErrors = ConnectionErrors = {}));
  class ConnectionError extends Error {
    constructor(code, message) {
      super(message);
      this.code = code;
      Object.setPrototypeOf(this, ConnectionError.prototype);
    }
  }
  cjsExports.ConnectionError = ConnectionError;
  var ConnectionStrategy;
  (function (ConnectionStrategy) {
    function is(value) {
      let candidate = value;
      return candidate && Is.func(candidate.cancelUndispatched);
    }
    ConnectionStrategy.is = is;
  })(ConnectionStrategy || (cjsExports.ConnectionStrategy = ConnectionStrategy = {}));
  var IdCancellationReceiverStrategy;
  (function (IdCancellationReceiverStrategy) {
    function is(value) {
      let candidate = value;
      return (
        candidate &&
        (candidate.kind === undefined || candidate.kind === "id") &&
        Is.func(candidate.createCancellationTokenSource) &&
        (candidate.dispose === undefined || Is.func(candidate.dispose))
      );
    }
    IdCancellationReceiverStrategy.is = is;
  })(
    IdCancellationReceiverStrategy ||
      (cjsExports.IdCancellationReceiverStrategy = IdCancellationReceiverStrategy = {}),
  );
  var RequestCancellationReceiverStrategy;
  (function (RequestCancellationReceiverStrategy) {
    function is(value) {
      let candidate = value;
      return (
        candidate &&
        candidate.kind === "request" &&
        Is.func(candidate.createCancellationTokenSource) &&
        (candidate.dispose === undefined || Is.func(candidate.dispose))
      );
    }
    RequestCancellationReceiverStrategy.is = is;
  })(
    RequestCancellationReceiverStrategy ||
      (cjsExports.RequestCancellationReceiverStrategy = RequestCancellationReceiverStrategy = {}),
  );
  var CancellationReceiverStrategy;
  (function (CancellationReceiverStrategy) {
    CancellationReceiverStrategy.Message = Object.freeze({
      createCancellationTokenSource(_) {
        return new cancellation_1.CancellationTokenSource();
      },
    });
    function is(value) {
      return IdCancellationReceiverStrategy.is(value) || RequestCancellationReceiverStrategy.is(value);
    }
    CancellationReceiverStrategy.is = is;
  })(
    CancellationReceiverStrategy ||
      (cjsExports.CancellationReceiverStrategy = CancellationReceiverStrategy = {}),
  );
  var CancellationSenderStrategy;
  (function (CancellationSenderStrategy) {
    CancellationSenderStrategy.Message = Object.freeze({
      sendCancellation(conn, id) {
        return conn.sendNotification(CancelNotification.type, {
          id,
        });
      },
      cleanup(_) {},
    });
    function is(value) {
      let candidate = value;
      return candidate && Is.func(candidate.sendCancellation) && Is.func(candidate.cleanup);
    }
    CancellationSenderStrategy.is = is;
  })(CancellationSenderStrategy || (cjsExports.CancellationSenderStrategy = CancellationSenderStrategy = {}));
  var CancellationStrategy;
  (function (CancellationStrategy) {
    CancellationStrategy.Message = Object.freeze({
      receiver: CancellationReceiverStrategy.Message,
      sender: CancellationSenderStrategy.Message,
    });
    function is(value) {
      let candidate = value;
      return (
        candidate &&
        CancellationReceiverStrategy.is(candidate.receiver) &&
        CancellationSenderStrategy.is(candidate.sender)
      );
    }
    CancellationStrategy.is = is;
  })(CancellationStrategy || (cjsExports.CancellationStrategy = CancellationStrategy = {}));
  var MessageStrategy;
  (function (MessageStrategy) {
    function is(value) {
      let candidate = value;
      return candidate && Is.func(candidate.handleMessage);
    }
    MessageStrategy.is = is;
  })(MessageStrategy || (cjsExports.MessageStrategy = MessageStrategy = {}));
  var ConnectionOptions;
  (function (ConnectionOptions) {
    function is(value) {
      let candidate = value;
      return (
        candidate &&
        (CancellationStrategy.is(candidate.cancellationStrategy) ||
          ConnectionStrategy.is(candidate.connectionStrategy) ||
          MessageStrategy.is(candidate.messageStrategy))
      );
    }
    ConnectionOptions.is = is;
  })(ConnectionOptions || (cjsExports.ConnectionOptions = ConnectionOptions = {}));
  var ConnectionState;
  (function (ConnectionState) {
    ConnectionState[(ConnectionState.New = 1)] = "New";
    ConnectionState[(ConnectionState.Listening = 2)] = "Listening";
    ConnectionState[(ConnectionState.Closed = 3)] = "Closed";
    ConnectionState[(ConnectionState.Disposed = 4)] = "Disposed";
  })(ConnectionState || (ConnectionState = {}));
  function createMessageConnection(messageReader, messageWriter, _logger, options) {
    let logger = _logger !== undefined ? _logger : cjsExports.NullLogger;
    let sequenceNumber = 0;
    let notificationSequenceNumber = 0;
    let unknownResponseSequenceNumber = 0;
    let version = "2.0";
    let starRequestHandler = undefined;
    let requestHandlers = new Map();
    let starNotificationHandler = undefined;
    let notificationHandlers = new Map();
    let progressHandlers = new Map();
    let timer;
    let messageQueue = new linkedMap_1.LinkedMap();
    let responsePromises = new Map();
    let knownCanceledRequests = new Set();
    let requestTokens = new Map();
    let trace = Trace.Off;
    let traceFormat = TraceFormat.Text;
    let tracer;
    let state = ConnectionState.New;
    let errorEmitter = new events_1.Emitter();
    let closeEmitter = new events_1.Emitter();
    let unhandledNotificationEmitter = new events_1.Emitter();
    let unhandledProgressEmitter = new events_1.Emitter();
    let disposeEmitter = new events_1.Emitter();
    let cancellationStrategy =
      options && options.cancellationStrategy ? options.cancellationStrategy : CancellationStrategy.Message;
    function createRequestQueueKey(id) {
      if (id === null)
        throw Error("Can't send requests with id null since the response can't be correlated.");
      return "req-" + id.toString();
    }
    function createResponseQueueKey(id) {
      if (id === null) return "res-unknown-" + (++unknownResponseSequenceNumber).toString();
      else return "res-" + id.toString();
    }
    function createNotificationQueueKey() {
      return "not-" + (++notificationSequenceNumber).toString();
    }
    function addMessageToQueue(queue, message) {
      if (messages_1.Message.isRequest(message)) queue.set(createRequestQueueKey(message.id), message);
      else if (messages_1.Message.isResponse(message)) queue.set(createResponseQueueKey(message.id), message);
      else queue.set(createNotificationQueueKey(), message);
    }
    function cancelUndispatched(_message) {
      return;
    }
    function isListening() {
      return state === ConnectionState.Listening;
    }
    function isClosed() {
      return state === ConnectionState.Closed;
    }
    function isDisposed() {
      return state === ConnectionState.Disposed;
    }
    function closeHandler() {
      if (state === ConnectionState.New || state === ConnectionState.Listening) {
        state = ConnectionState.Closed;
        closeEmitter.fire(undefined);
      }
    }
    function readErrorHandler(error) {
      errorEmitter.fire([error, undefined, undefined]);
    }
    function writeErrorHandler(data) {
      errorEmitter.fire(data);
    }
    messageReader.onClose(closeHandler);
    messageReader.onError(readErrorHandler);
    messageWriter.onClose(closeHandler);
    messageWriter.onError(writeErrorHandler);
    function triggerMessageQueue() {
      if (timer || messageQueue.size === 0) return;
      timer = (0, ral_1.default)().timer.setImmediate(() => {
        timer = undefined;
        processMessageQueue();
      });
    }
    function handleMessage(message) {
      if (messages_1.Message.isRequest(message)) handleRequest(message);
      else if (messages_1.Message.isNotification(message)) handleNotification(message);
      else if (messages_1.Message.isResponse(message)) handleResponse(message);
      else handleInvalidMessage(message);
    }
    function processMessageQueue() {
      if (messageQueue.size === 0) return;
      let message = messageQueue.shift();
      try {
        let messageStrategy = options?.messageStrategy;
        if (MessageStrategy.is(messageStrategy)) messageStrategy.handleMessage(message, handleMessage);
        else handleMessage(message);
      } finally {
        triggerMessageQueue();
      }
    }
    let callback = (message) => {
      try {
        if (messages_1.Message.isNotification(message) && message.method === CancelNotification.type.method) {
          let cancelId = message.params.id;
          let key = createRequestQueueKey(cancelId);
          let toCancel = messageQueue.get(key);
          if (messages_1.Message.isRequest(toCancel)) {
            let strategy = options?.connectionStrategy;
            let response =
              strategy && strategy.cancelUndispatched
                ? strategy.cancelUndispatched(toCancel, cancelUndispatched)
                : cancelUndispatched(toCancel);
            if (response && (response.error !== undefined || response.result !== undefined)) {
              messageQueue.delete(key);
              requestTokens.delete(cancelId);
              response.id = toCancel.id;
              traceSendingResponse(response, message.method, Date.now());
              messageWriter
                .write(response)
                .catch(() => logger.error("Sending response for canceled message failed."));
              return;
            }
          }
          let cancellationToken = requestTokens.get(cancelId);
          if (cancellationToken !== undefined) {
            cancellationToken.cancel();
            traceReceivedNotification(message);
            return;
          } else knownCanceledRequests.add(cancelId);
        }
        addMessageToQueue(messageQueue, message);
      } finally {
        triggerMessageQueue();
      }
    };
    function handleRequest(requestMessage) {
      if (isDisposed()) return;
      function reply(resultOrError, method, startTime) {
        let message = {
          jsonrpc: version,
          id: requestMessage.id,
        };
        if (resultOrError instanceof messages_1.ResponseError) message.error = resultOrError.toJson();
        else message.result = resultOrError === undefined ? null : resultOrError;
        traceSendingResponse(message, method, startTime);
        messageWriter.write(message).catch(() => logger.error("Sending response failed."));
      }
      function replyError(error, method, startTime) {
        let message = {
          jsonrpc: version,
          id: requestMessage.id,
          error: error.toJson(),
        };
        traceSendingResponse(message, method, startTime);
        messageWriter.write(message).catch(() => logger.error("Sending response failed."));
      }
      function replySuccess(result, method, startTime) {
        if (result === undefined) result = null;
        let message = {
          jsonrpc: version,
          id: requestMessage.id,
          result,
        };
        traceSendingResponse(message, method, startTime);
        messageWriter.write(message).catch(() => logger.error("Sending response failed."));
      }
      traceReceivedRequest(requestMessage);
      let element = requestHandlers.get(requestMessage.method);
      let type;
      let requestHandler;
      if (element) {
        type = element.type;
        requestHandler = element.handler;
      }
      let startTime = Date.now();
      if (requestHandler || starRequestHandler) {
        let tokenKey = requestMessage.id ?? String(Date.now());
        let cancellationSource = IdCancellationReceiverStrategy.is(cancellationStrategy.receiver)
          ? cancellationStrategy.receiver.createCancellationTokenSource(tokenKey)
          : cancellationStrategy.receiver.createCancellationTokenSource(requestMessage);
        if (requestMessage.id !== null && knownCanceledRequests.has(requestMessage.id))
          cancellationSource.cancel();
        if (requestMessage.id !== null) requestTokens.set(tokenKey, cancellationSource);
        try {
          let handlerResult;
          if (requestHandler) {
            if (requestMessage.params === undefined) {
              if (type !== undefined && type.numberOfParams !== 0) {
                replyError(
                  new messages_1.ResponseError(
                    messages_1.ErrorCodes.InvalidParams,
                    `Request ${requestMessage.method} defines ${type.numberOfParams} params but received none.`,
                  ),
                  requestMessage.method,
                  startTime,
                );
                return;
              }
              handlerResult = requestHandler(cancellationSource.token);
            } else if (Array.isArray(requestMessage.params)) {
              if (type !== undefined && type.parameterStructures === messages_1.ParameterStructures.byName) {
                replyError(
                  new messages_1.ResponseError(
                    messages_1.ErrorCodes.InvalidParams,
                    `Request ${requestMessage.method} defines parameters by name but received parameters by position`,
                  ),
                  requestMessage.method,
                  startTime,
                );
                return;
              }
              handlerResult = requestHandler(...requestMessage.params, cancellationSource.token);
            } else {
              if (
                type !== undefined &&
                type.parameterStructures === messages_1.ParameterStructures.byPosition
              ) {
                replyError(
                  new messages_1.ResponseError(
                    messages_1.ErrorCodes.InvalidParams,
                    `Request ${requestMessage.method} defines parameters by position but received parameters by name`,
                  ),
                  requestMessage.method,
                  startTime,
                );
                return;
              }
              handlerResult = requestHandler(requestMessage.params, cancellationSource.token);
            }
          } else if (starRequestHandler)
            handlerResult = starRequestHandler(
              requestMessage.method,
              requestMessage.params,
              cancellationSource.token,
            );
          let promise = handlerResult;
          if (!handlerResult) {
            requestTokens.delete(tokenKey);
            replySuccess(handlerResult, requestMessage.method, startTime);
          } else if (promise.then)
            promise.then(
              (resultOrError) => {
                requestTokens.delete(tokenKey);
                reply(resultOrError, requestMessage.method, startTime);
              },
              (error) => {
                requestTokens.delete(tokenKey);
                if (error instanceof messages_1.ResponseError)
                  replyError(error, requestMessage.method, startTime);
                else if (error && Is.string(error.message))
                  replyError(
                    new messages_1.ResponseError(
                      messages_1.ErrorCodes.InternalError,
                      `Request ${requestMessage.method} failed with message: ${error.message}`,
                    ),
                    requestMessage.method,
                    startTime,
                  );
                else
                  replyError(
                    new messages_1.ResponseError(
                      messages_1.ErrorCodes.InternalError,
                      `Request ${requestMessage.method} failed unexpectedly without providing any details.`,
                    ),
                    requestMessage.method,
                    startTime,
                  );
              },
            );
          else {
            requestTokens.delete(tokenKey);
            reply(handlerResult, requestMessage.method, startTime);
          }
        } catch (error) {
          requestTokens.delete(tokenKey);
          if (error instanceof messages_1.ResponseError) reply(error, requestMessage.method, startTime);
          else if (error && Is.string(error.message))
            replyError(
              new messages_1.ResponseError(
                messages_1.ErrorCodes.InternalError,
                `Request ${requestMessage.method} failed with message: ${error.message}`,
              ),
              requestMessage.method,
              startTime,
            );
          else
            replyError(
              new messages_1.ResponseError(
                messages_1.ErrorCodes.InternalError,
                `Request ${requestMessage.method} failed unexpectedly without providing any details.`,
              ),
              requestMessage.method,
              startTime,
            );
        }
      } else
        replyError(
          new messages_1.ResponseError(
            messages_1.ErrorCodes.MethodNotFound,
            `Unhandled method ${requestMessage.method}`,
          ),
          requestMessage.method,
          startTime,
        );
    }
    function handleResponse(responseMessage) {
      if (isDisposed()) return;
      if (responseMessage.id === null) {
        if (responseMessage.error)
          logger.error(`Received response message without id: Error is: 
${JSON.stringify(responseMessage.error, undefined, 4)}`);
        else logger.error("Received response message without id. No further error information provided.");
      } else {
        let key = responseMessage.id;
        let responsePromise = responsePromises.get(key);
        traceReceivedResponse(responseMessage, responsePromise);
        if (responsePromise !== undefined) {
          responsePromises.delete(key);
          try {
            if (responseMessage.error) {
              let error = responseMessage.error;
              responsePromise.reject(new messages_1.ResponseError(error.code, error.message, error.data));
            } else if (responseMessage.result !== undefined) responsePromise.resolve(responseMessage.result);
            else throw Error("Should never happen.");
          } catch (error) {
            if (error.message)
              logger.error(
                `Response handler '${responsePromise.method}' failed with message: ${error.message}`,
              );
            else logger.error(`Response handler '${responsePromise.method}' failed unexpectedly.`);
          }
        }
      }
    }
    function handleNotification(message) {
      if (isDisposed()) return;
      let type = undefined;
      let notificationHandler;
      if (message.method === CancelNotification.type.method) {
        let cancelId = message.params.id;
        knownCanceledRequests.delete(cancelId);
        traceReceivedNotification(message);
        return;
      } else {
        let element = notificationHandlers.get(message.method);
        if (element) {
          notificationHandler = element.handler;
          type = element.type;
        }
      }
      if (notificationHandler || starNotificationHandler)
        try {
          traceReceivedNotification(message);
          if (notificationHandler) {
            if (message.params === undefined) {
              if (type !== undefined) {
                if (
                  type.numberOfParams !== 0 &&
                  type.parameterStructures !== messages_1.ParameterStructures.byName
                )
                  logger.error(
                    `Notification ${message.method} defines ${type.numberOfParams} params but received none.`,
                  );
              }
              notificationHandler();
            } else if (Array.isArray(message.params)) {
              let params = message.params;
              if (
                message.method === ProgressNotification.type.method &&
                params.length === 2 &&
                ProgressToken.is(params[0])
              )
                notificationHandler({
                  token: params[0],
                  value: params[1],
                });
              else {
                if (type !== undefined) {
                  if (type.parameterStructures === messages_1.ParameterStructures.byName)
                    logger.error(
                      `Notification ${message.method} defines parameters by name but received parameters by position`,
                    );
                  if (type.numberOfParams !== message.params.length)
                    logger.error(
                      `Notification ${message.method} defines ${type.numberOfParams} params but received ${params.length} arguments`,
                    );
                }
                notificationHandler(...params);
              }
            } else {
              if (
                type !== undefined &&
                type.parameterStructures === messages_1.ParameterStructures.byPosition
              )
                logger.error(
                  `Notification ${message.method} defines parameters by position but received parameters by name`,
                );
              notificationHandler(message.params);
            }
          } else if (starNotificationHandler) starNotificationHandler(message.method, message.params);
        } catch (error) {
          if (error.message)
            logger.error(`Notification handler '${message.method}' failed with message: ${error.message}`);
          else logger.error(`Notification handler '${message.method}' failed unexpectedly.`);
        }
      else unhandledNotificationEmitter.fire(message);
    }
    function handleInvalidMessage(message) {
      if (!message) {
        logger.error("Received empty message.");
        return;
      }
      logger.error(`Received message which is neither a response nor a notification message:
${JSON.stringify(message, null, 4)}`);
      let responseMessage = message;
      if (Is.string(responseMessage.id) || Is.number(responseMessage.id)) {
        let key = responseMessage.id;
        let responseHandler = responsePromises.get(key);
        if (responseHandler)
          responseHandler.reject(Error("The received response has neither a result nor an error property."));
      }
    }
    function stringifyTrace(params) {
      if (params === undefined || params === null) return;
      switch (trace) {
        case Trace.Verbose:
          return JSON.stringify(params, null, 4);
        case Trace.Compact:
          return JSON.stringify(params);
        default:
          return;
      }
    }
    function traceSendingRequest(message) {
      if (trace === Trace.Off || !tracer) return;
      if (traceFormat === TraceFormat.Text) {
        let data = undefined;
        if ((trace === Trace.Verbose || trace === Trace.Compact) && message.params)
          data = `Params: ${stringifyTrace(message.params)}

`;
        tracer.log(`Sending request '${message.method} - (${message.id})'.`, data);
      } else logLSPMessage("send-request", message);
    }
    function traceSendingNotification(message) {
      if (trace === Trace.Off || !tracer) return;
      if (traceFormat === TraceFormat.Text) {
        let data = undefined;
        if (trace === Trace.Verbose || trace === Trace.Compact)
          if (message.params)
            data = `Params: ${stringifyTrace(message.params)}

`;
          else
            data = `No parameters provided.

`;
        tracer.log(`Sending notification '${message.method}'.`, data);
      } else logLSPMessage("send-notification", message);
    }
    function traceSendingResponse(message, method, startTime) {
      if (trace === Trace.Off || !tracer) return;
      if (traceFormat === TraceFormat.Text) {
        let data = undefined;
        if (trace === Trace.Verbose || trace === Trace.Compact) {
          if (message.error && message.error.data)
            data = `Error data: ${stringifyTrace(message.error.data)}

`;
          else if (message.result)
            data = `Result: ${stringifyTrace(message.result)}

`;
          else if (message.error === undefined)
            data = `No result returned.

`;
        }
        tracer.log(
          `Sending response '${method} - (${message.id})'. Processing request took ${Date.now() - startTime}ms`,
          data,
        );
      } else logLSPMessage("send-response", message);
    }
    function traceReceivedRequest(message) {
      if (trace === Trace.Off || !tracer) return;
      if (traceFormat === TraceFormat.Text) {
        let data = undefined;
        if ((trace === Trace.Verbose || trace === Trace.Compact) && message.params)
          data = `Params: ${stringifyTrace(message.params)}

`;
        tracer.log(`Received request '${message.method} - (${message.id})'.`, data);
      } else logLSPMessage("receive-request", message);
    }
    function traceReceivedNotification(message) {
      if (trace === Trace.Off || !tracer || message.method === LogTraceNotification.type.method) return;
      if (traceFormat === TraceFormat.Text) {
        let data = undefined;
        if (trace === Trace.Verbose || trace === Trace.Compact)
          if (message.params)
            data = `Params: ${stringifyTrace(message.params)}

`;
          else
            data = `No parameters provided.

`;
        tracer.log(`Received notification '${message.method}'.`, data);
      } else logLSPMessage("receive-notification", message);
    }
    function traceReceivedResponse(message, responsePromise) {
      if (trace === Trace.Off || !tracer) return;
      if (traceFormat === TraceFormat.Text) {
        let data = undefined;
        if (trace === Trace.Verbose || trace === Trace.Compact) {
          if (message.error && message.error.data)
            data = `Error data: ${stringifyTrace(message.error.data)}

`;
          else if (message.result)
            data = `Result: ${stringifyTrace(message.result)}

`;
          else if (message.error === undefined)
            data = `No result returned.

`;
        }
        if (responsePromise) {
          let error = message.error
            ? ` Request failed: ${message.error.message} (${message.error.code}).`
            : "";
          tracer.log(
            `Received response '${responsePromise.method} - (${message.id})' in ${Date.now() - responsePromise.timerStart}ms.${error}`,
            data,
          );
        } else tracer.log(`Received response ${message.id} without active response promise.`, data);
      } else logLSPMessage("receive-response", message);
    }
    function logLSPMessage(type, message) {
      if (!tracer || trace === Trace.Off) return;
      let lspMessage = {
        isLSPMessage: true,
        type,
        message,
        timestamp: Date.now(),
      };
      tracer.log(lspMessage);
    }
    function throwIfClosedOrDisposed() {
      if (isClosed()) throw new ConnectionError(ConnectionErrors.Closed, "Connection is closed.");
      if (isDisposed()) throw new ConnectionError(ConnectionErrors.Disposed, "Connection is disposed.");
    }
    function throwIfListening() {
      if (isListening())
        throw new ConnectionError(ConnectionErrors.AlreadyListening, "Connection is already listening");
    }
    function throwIfNotListening() {
      if (!isListening()) throw Error("Call listen() first.");
    }
    function undefinedToNull(param) {
      if (param === undefined) return null;
      else return param;
    }
    function nullToUndefined(param) {
      if (param === null) return;
      else return param;
    }
    function isNamedParam(param) {
      return param !== undefined && param !== null && !Array.isArray(param) && typeof param === "object";
    }
    function computeSingleParam(parameterStructures, param) {
      switch (parameterStructures) {
        case messages_1.ParameterStructures.auto:
          if (isNamedParam(param)) return nullToUndefined(param);
          else return [undefinedToNull(param)];
        case messages_1.ParameterStructures.byName:
          if (!isNamedParam(param))
            throw Error("Received parameters by name but param is not an object literal.");
          return nullToUndefined(param);
        case messages_1.ParameterStructures.byPosition:
          return [undefinedToNull(param)];
        default:
          throw Error(`Unknown parameter structure ${parameterStructures.toString()}`);
      }
    }
    function computeMessageParams(type, params) {
      let result;
      let numberOfParams = type.numberOfParams;
      switch (numberOfParams) {
        case 0:
          result = undefined;
          break;
        case 1:
          result = computeSingleParam(type.parameterStructures, params[0]);
          break;
        default:
          result = [];
          for (let i = 0; i < params.length && i < numberOfParams; i++)
            result.push(undefinedToNull(params[i]));
          if (params.length < numberOfParams)
            for (let i = params.length; i < numberOfParams; i++) result.push(null);
          break;
      }
      return result;
    }
    let connection = {
      sendNotification: (type, ...args) => {
        throwIfClosedOrDisposed();
        let method;
        let messageParams;
        if (Is.string(type)) {
          method = type;
          let first = args[0];
          let paramStart = 0;
          let parameterStructures = messages_1.ParameterStructures.auto;
          if (messages_1.ParameterStructures.is(first)) {
            paramStart = 1;
            parameterStructures = first;
          }
          let paramEnd = args.length;
          let numberOfParams = paramEnd - paramStart;
          switch (numberOfParams) {
            case 0:
              messageParams = undefined;
              break;
            case 1:
              messageParams = computeSingleParam(parameterStructures, args[paramStart]);
              break;
            default:
              if (parameterStructures === messages_1.ParameterStructures.byName)
                throw Error(
                  `Received ${numberOfParams} parameters for 'by Name' notification parameter structure.`,
                );
              messageParams = args.slice(paramStart, paramEnd).map((value) => undefinedToNull(value));
              break;
          }
        } else {
          let params = args;
          method = type.method;
          messageParams = computeMessageParams(type, params);
        }
        let notificationMessage = {
          jsonrpc: version,
          method,
          params: messageParams,
        };
        traceSendingNotification(notificationMessage);
        return messageWriter.write(notificationMessage).catch((error) => {
          logger.error("Sending notification failed.");
          throw error;
        });
      },
      onNotification: (type, handler) => {
        throwIfClosedOrDisposed();
        let method;
        if (Is.func(type)) starNotificationHandler = type;
        else if (handler)
          if (Is.string(type)) {
            method = type;
            notificationHandlers.set(type, {
              type: undefined,
              handler,
            });
          } else {
            method = type.method;
            notificationHandlers.set(type.method, {
              type,
              handler,
            });
          }
        return {
          dispose: () => {
            if (method !== undefined) notificationHandlers.delete(method);
            else starNotificationHandler = undefined;
          },
        };
      },
      onProgress: (_type, token, handler) => {
        if (progressHandlers.has(token))
          throw Error(`Progress handler for token ${token} already registered`);
        progressHandlers.set(token, handler);
        return {
          dispose: () => {
            progressHandlers.delete(token);
          },
        };
      },
      sendProgress: (_type, token, value) =>
        connection.sendNotification(ProgressNotification.type, {
          token,
          value,
        }),
      onUnhandledProgress: unhandledProgressEmitter.event,
      sendRequest: (type, ...args) => {
        throwIfClosedOrDisposed();
        throwIfNotListening();
        let method;
        let messageParams;
        let token = undefined;
        if (Is.string(type)) {
          method = type;
          let first = args[0];
          let last = args[args.length - 1];
          let paramStart = 0;
          let parameterStructures = messages_1.ParameterStructures.auto;
          if (messages_1.ParameterStructures.is(first)) {
            paramStart = 1;
            parameterStructures = first;
          }
          let paramEnd = args.length;
          if (cancellation_1.CancellationToken.is(last)) {
            paramEnd = paramEnd - 1;
            token = last;
          }
          let numberOfParams = paramEnd - paramStart;
          switch (numberOfParams) {
            case 0:
              messageParams = undefined;
              break;
            case 1:
              messageParams = computeSingleParam(parameterStructures, args[paramStart]);
              break;
            default:
              if (parameterStructures === messages_1.ParameterStructures.byName)
                throw Error(
                  `Received ${numberOfParams} parameters for 'by Name' request parameter structure.`,
                );
              messageParams = args.slice(paramStart, paramEnd).map((value) => undefinedToNull(value));
              break;
          }
        } else {
          let params = args;
          method = type.method;
          messageParams = computeMessageParams(type, params);
          let numberOfParams = type.numberOfParams;
          token = cancellation_1.CancellationToken.is(params[numberOfParams])
            ? params[numberOfParams]
            : undefined;
        }
        let id = sequenceNumber++;
        let disposable;
        if (token)
          disposable = token.onCancellationRequested(() => {
            let p = cancellationStrategy.sender.sendCancellation(connection, id);
            if (p === undefined) {
              logger.log(`Received no promise from cancellation strategy when cancelling id ${id}`);
              return Promise.resolve();
            } else
              return p.catch(() => {
                logger.log(`Sending cancellation messages for id ${id} failed`);
              });
          });
        let requestMessage = {
          jsonrpc: version,
          id,
          method,
          params: messageParams,
        };
        traceSendingRequest(requestMessage);
        if (typeof cancellationStrategy.sender.enableCancellation === "function")
          cancellationStrategy.sender.enableCancellation(requestMessage);
        return new Promise(async (resolve, reject) => {
          let resolveWithCleanup = (r) => {
            resolve(r);
            cancellationStrategy.sender.cleanup(id);
            disposable?.dispose();
          };
          let rejectWithCleanup = (r) => {
            reject(r);
            cancellationStrategy.sender.cleanup(id);
            disposable?.dispose();
          };
          let responsePromise = {
            method,
            timerStart: Date.now(),
            resolve: resolveWithCleanup,
            reject: rejectWithCleanup,
          };
          try {
            responsePromises.set(id, responsePromise);
            await messageWriter.write(requestMessage);
          } catch (error) {
            responsePromises.delete(id);
            responsePromise.reject(
              new messages_1.ResponseError(
                messages_1.ErrorCodes.MessageWriteError,
                error.message ? error.message : "Unknown reason",
              ),
            );
            logger.error("Sending request failed.");
          }
        });
      },
      onRequest: (type, handler) => {
        throwIfClosedOrDisposed();
        let method = null;
        if (StarRequestHandler.is(type)) {
          method = undefined;
          starRequestHandler = type;
        } else if (Is.string(type)) {
          method = null;
          if (handler !== undefined) {
            method = type;
            requestHandlers.set(type, {
              handler,
              type: undefined,
            });
          }
        } else if (handler !== undefined) {
          method = type.method;
          requestHandlers.set(type.method, {
            type,
            handler,
          });
        }
        return {
          dispose: () => {
            if (method === null) return;
            if (method !== undefined) requestHandlers.delete(method);
            else starRequestHandler = undefined;
          },
        };
      },
      hasPendingResponse: () => responsePromises.size > 0,
      trace: async (_value, _tracer, sendNotificationOrTraceOptions) => {
        let _sendNotification = false;
        let _traceFormat = TraceFormat.Text;
        if (sendNotificationOrTraceOptions !== undefined)
          if (Is.boolean(sendNotificationOrTraceOptions)) _sendNotification = sendNotificationOrTraceOptions;
          else {
            _sendNotification = sendNotificationOrTraceOptions.sendNotification || false;
            _traceFormat = sendNotificationOrTraceOptions.traceFormat || TraceFormat.Text;
          }
        trace = _value;
        traceFormat = _traceFormat;
        if (trace === Trace.Off) tracer = undefined;
        else tracer = _tracer;
        if (_sendNotification && !isClosed() && !isDisposed())
          await connection.sendNotification(SetTraceNotification.type, {
            value: Trace.toString(_value),
          });
      },
      onError: errorEmitter.event,
      onClose: closeEmitter.event,
      onUnhandledNotification: unhandledNotificationEmitter.event,
      onDispose: disposeEmitter.event,
      end: () => {
        messageWriter.end();
      },
      dispose: () => {
        if (isDisposed()) return;
        state = ConnectionState.Disposed;
        disposeEmitter.fire(undefined);
        let error = new messages_1.ResponseError(
          messages_1.ErrorCodes.PendingResponseRejected,
          "Pending response rejected since connection got disposed",
        );
        for (let promise of responsePromises.values()) promise.reject(error);
        responsePromises = new Map();
        requestTokens = new Map();
        knownCanceledRequests = new Set();
        messageQueue = new linkedMap_1.LinkedMap();
        if (Is.func(messageWriter.dispose)) messageWriter.dispose();
        if (Is.func(messageReader.dispose)) messageReader.dispose();
      },
      listen: () => {
        throwIfClosedOrDisposed();
        throwIfListening();
        state = ConnectionState.Listening;
        messageReader.listen(callback);
      },
      inspect: () => {
        (0, ral_1.default)().console.log("inspect");
      },
    };
    connection.onNotification(LogTraceNotification.type, (params) => {
      if (trace === Trace.Off || !tracer) return;
      let verbose = trace === Trace.Verbose || trace === Trace.Compact;
      tracer.log(params.message, verbose ? params.verbose : undefined);
    });
    connection.onNotification(ProgressNotification.type, (params) => {
      let handler = progressHandlers.get(params.token);
      if (handler) handler(params.value);
      else unhandledProgressEmitter.fire(params);
    });
    return connection;
  }
  cjsExports.createMessageConnection = createMessageConnection;
});
export { require_connection };
