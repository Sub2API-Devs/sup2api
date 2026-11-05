/**
 * vscode-jsonrpc/lib/common/api.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: vscode-jsonrpc@8.2.0..8.2.1
 * pieces: chunk-mvgr3jmb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_messages } from "./messages.js";
import { require_linkedMap } from "./linkedMap.js";
import { require_disposable } from "./disposable.js";
import { require_events } from "./events.js";
import { require_cancellation } from "./cancellation.js";
import { require_sharedArrayCancellation } from "./sharedArrayCancellation.js";
import { require_messageReader } from "./messageReader.js";
import { require_messageWriter } from "./messageWriter.js";
import { require_messageBuffer } from "./messageBuffer.js";
import { require_connection } from "./connection.js";
import { require_ral } from "./ral.js";

//@ chunk-mvgr3jmb.js:44883-52297 cjs-fingerprint
var require_api = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.ProgressType =
    cjsExports.ProgressToken =
    cjsExports.createMessageConnection =
    cjsExports.NullLogger =
    cjsExports.ConnectionOptions =
    cjsExports.ConnectionStrategy =
    cjsExports.AbstractMessageBuffer =
    cjsExports.WriteableStreamMessageWriter =
    cjsExports.AbstractMessageWriter =
    cjsExports.MessageWriter =
    cjsExports.ReadableStreamMessageReader =
    cjsExports.AbstractMessageReader =
    cjsExports.MessageReader =
    cjsExports.SharedArrayReceiverStrategy =
    cjsExports.SharedArraySenderStrategy =
    cjsExports.CancellationToken =
    cjsExports.CancellationTokenSource =
    cjsExports.Emitter =
    cjsExports.Event =
    cjsExports.Disposable =
    cjsExports.LRUCache =
    cjsExports.Touch =
    cjsExports.LinkedMap =
    cjsExports.ParameterStructures =
    cjsExports.NotificationType9 =
    cjsExports.NotificationType8 =
    cjsExports.NotificationType7 =
    cjsExports.NotificationType6 =
    cjsExports.NotificationType5 =
    cjsExports.NotificationType4 =
    cjsExports.NotificationType3 =
    cjsExports.NotificationType2 =
    cjsExports.NotificationType1 =
    cjsExports.NotificationType0 =
    cjsExports.NotificationType =
    cjsExports.ErrorCodes =
    cjsExports.ResponseError =
    cjsExports.RequestType9 =
    cjsExports.RequestType8 =
    cjsExports.RequestType7 =
    cjsExports.RequestType6 =
    cjsExports.RequestType5 =
    cjsExports.RequestType4 =
    cjsExports.RequestType3 =
    cjsExports.RequestType2 =
    cjsExports.RequestType1 =
    cjsExports.RequestType0 =
    cjsExports.RequestType =
    cjsExports.Message =
    cjsExports.RAL =
      undefined;
  cjsExports.MessageStrategy =
    cjsExports.CancellationStrategy =
    cjsExports.CancellationSenderStrategy =
    cjsExports.CancellationReceiverStrategy =
    cjsExports.ConnectionError =
    cjsExports.ConnectionErrors =
    cjsExports.LogTraceNotification =
    cjsExports.SetTraceNotification =
    cjsExports.TraceFormat =
    cjsExports.TraceValues =
    cjsExports.Trace =
      undefined;
  var messages_1 = require_messages();
  Object.defineProperty(cjsExports, "Message", {
    enumerable: true,
    get: function () {
      return messages_1.Message;
    },
  });
  Object.defineProperty(cjsExports, "RequestType", {
    enumerable: true,
    get: function () {
      return messages_1.RequestType;
    },
  });
  Object.defineProperty(cjsExports, "RequestType0", {
    enumerable: true,
    get: function () {
      return messages_1.RequestType0;
    },
  });
  Object.defineProperty(cjsExports, "RequestType1", {
    enumerable: true,
    get: function () {
      return messages_1.RequestType1;
    },
  });
  Object.defineProperty(cjsExports, "RequestType2", {
    enumerable: true,
    get: function () {
      return messages_1.RequestType2;
    },
  });
  Object.defineProperty(cjsExports, "RequestType3", {
    enumerable: true,
    get: function () {
      return messages_1.RequestType3;
    },
  });
  Object.defineProperty(cjsExports, "RequestType4", {
    enumerable: true,
    get: function () {
      return messages_1.RequestType4;
    },
  });
  Object.defineProperty(cjsExports, "RequestType5", {
    enumerable: true,
    get: function () {
      return messages_1.RequestType5;
    },
  });
  Object.defineProperty(cjsExports, "RequestType6", {
    enumerable: true,
    get: function () {
      return messages_1.RequestType6;
    },
  });
  Object.defineProperty(cjsExports, "RequestType7", {
    enumerable: true,
    get: function () {
      return messages_1.RequestType7;
    },
  });
  Object.defineProperty(cjsExports, "RequestType8", {
    enumerable: true,
    get: function () {
      return messages_1.RequestType8;
    },
  });
  Object.defineProperty(cjsExports, "RequestType9", {
    enumerable: true,
    get: function () {
      return messages_1.RequestType9;
    },
  });
  Object.defineProperty(cjsExports, "ResponseError", {
    enumerable: true,
    get: function () {
      return messages_1.ResponseError;
    },
  });
  Object.defineProperty(cjsExports, "ErrorCodes", {
    enumerable: true,
    get: function () {
      return messages_1.ErrorCodes;
    },
  });
  Object.defineProperty(cjsExports, "NotificationType", {
    enumerable: true,
    get: function () {
      return messages_1.NotificationType;
    },
  });
  Object.defineProperty(cjsExports, "NotificationType0", {
    enumerable: true,
    get: function () {
      return messages_1.NotificationType0;
    },
  });
  Object.defineProperty(cjsExports, "NotificationType1", {
    enumerable: true,
    get: function () {
      return messages_1.NotificationType1;
    },
  });
  Object.defineProperty(cjsExports, "NotificationType2", {
    enumerable: true,
    get: function () {
      return messages_1.NotificationType2;
    },
  });
  Object.defineProperty(cjsExports, "NotificationType3", {
    enumerable: true,
    get: function () {
      return messages_1.NotificationType3;
    },
  });
  Object.defineProperty(cjsExports, "NotificationType4", {
    enumerable: true,
    get: function () {
      return messages_1.NotificationType4;
    },
  });
  Object.defineProperty(cjsExports, "NotificationType5", {
    enumerable: true,
    get: function () {
      return messages_1.NotificationType5;
    },
  });
  Object.defineProperty(cjsExports, "NotificationType6", {
    enumerable: true,
    get: function () {
      return messages_1.NotificationType6;
    },
  });
  Object.defineProperty(cjsExports, "NotificationType7", {
    enumerable: true,
    get: function () {
      return messages_1.NotificationType7;
    },
  });
  Object.defineProperty(cjsExports, "NotificationType8", {
    enumerable: true,
    get: function () {
      return messages_1.NotificationType8;
    },
  });
  Object.defineProperty(cjsExports, "NotificationType9", {
    enumerable: true,
    get: function () {
      return messages_1.NotificationType9;
    },
  });
  Object.defineProperty(cjsExports, "ParameterStructures", {
    enumerable: true,
    get: function () {
      return messages_1.ParameterStructures;
    },
  });
  var linkedMap_1 = require_linkedMap();
  Object.defineProperty(cjsExports, "LinkedMap", {
    enumerable: true,
    get: function () {
      return linkedMap_1.LinkedMap;
    },
  });
  Object.defineProperty(cjsExports, "LRUCache", {
    enumerable: true,
    get: function () {
      return linkedMap_1.LRUCache;
    },
  });
  Object.defineProperty(cjsExports, "Touch", {
    enumerable: true,
    get: function () {
      return linkedMap_1.Touch;
    },
  });
  var disposable_1 = require_disposable();
  Object.defineProperty(cjsExports, "Disposable", {
    enumerable: true,
    get: function () {
      return disposable_1.Disposable;
    },
  });
  var events_1 = require_events();
  Object.defineProperty(cjsExports, "Event", {
    enumerable: true,
    get: function () {
      return events_1.Event;
    },
  });
  Object.defineProperty(cjsExports, "Emitter", {
    enumerable: true,
    get: function () {
      return events_1.Emitter;
    },
  });
  var cancellation_1 = require_cancellation();
  Object.defineProperty(cjsExports, "CancellationTokenSource", {
    enumerable: true,
    get: function () {
      return cancellation_1.CancellationTokenSource;
    },
  });
  Object.defineProperty(cjsExports, "CancellationToken", {
    enumerable: true,
    get: function () {
      return cancellation_1.CancellationToken;
    },
  });
  var sharedArrayCancellation_1 = require_sharedArrayCancellation();
  Object.defineProperty(cjsExports, "SharedArraySenderStrategy", {
    enumerable: true,
    get: function () {
      return sharedArrayCancellation_1.SharedArraySenderStrategy;
    },
  });
  Object.defineProperty(cjsExports, "SharedArrayReceiverStrategy", {
    enumerable: true,
    get: function () {
      return sharedArrayCancellation_1.SharedArrayReceiverStrategy;
    },
  });
  var messageReader_1 = require_messageReader();
  Object.defineProperty(cjsExports, "MessageReader", {
    enumerable: true,
    get: function () {
      return messageReader_1.MessageReader;
    },
  });
  Object.defineProperty(cjsExports, "AbstractMessageReader", {
    enumerable: true,
    get: function () {
      return messageReader_1.AbstractMessageReader;
    },
  });
  Object.defineProperty(cjsExports, "ReadableStreamMessageReader", {
    enumerable: true,
    get: function () {
      return messageReader_1.ReadableStreamMessageReader;
    },
  });
  var messageWriter_1 = require_messageWriter();
  Object.defineProperty(cjsExports, "MessageWriter", {
    enumerable: true,
    get: function () {
      return messageWriter_1.MessageWriter;
    },
  });
  Object.defineProperty(cjsExports, "AbstractMessageWriter", {
    enumerable: true,
    get: function () {
      return messageWriter_1.AbstractMessageWriter;
    },
  });
  Object.defineProperty(cjsExports, "WriteableStreamMessageWriter", {
    enumerable: true,
    get: function () {
      return messageWriter_1.WriteableStreamMessageWriter;
    },
  });
  var messageBuffer_1 = require_messageBuffer();
  Object.defineProperty(cjsExports, "AbstractMessageBuffer", {
    enumerable: true,
    get: function () {
      return messageBuffer_1.AbstractMessageBuffer;
    },
  });
  var connection_1 = require_connection();
  Object.defineProperty(cjsExports, "ConnectionStrategy", {
    enumerable: true,
    get: function () {
      return connection_1.ConnectionStrategy;
    },
  });
  Object.defineProperty(cjsExports, "ConnectionOptions", {
    enumerable: true,
    get: function () {
      return connection_1.ConnectionOptions;
    },
  });
  Object.defineProperty(cjsExports, "NullLogger", {
    enumerable: true,
    get: function () {
      return connection_1.NullLogger;
    },
  });
  Object.defineProperty(cjsExports, "createMessageConnection", {
    enumerable: true,
    get: function () {
      return connection_1.createMessageConnection;
    },
  });
  Object.defineProperty(cjsExports, "ProgressToken", {
    enumerable: true,
    get: function () {
      return connection_1.ProgressToken;
    },
  });
  Object.defineProperty(cjsExports, "ProgressType", {
    enumerable: true,
    get: function () {
      return connection_1.ProgressType;
    },
  });
  Object.defineProperty(cjsExports, "Trace", {
    enumerable: true,
    get: function () {
      return connection_1.Trace;
    },
  });
  Object.defineProperty(cjsExports, "TraceValues", {
    enumerable: true,
    get: function () {
      return connection_1.TraceValues;
    },
  });
  Object.defineProperty(cjsExports, "TraceFormat", {
    enumerable: true,
    get: function () {
      return connection_1.TraceFormat;
    },
  });
  Object.defineProperty(cjsExports, "SetTraceNotification", {
    enumerable: true,
    get: function () {
      return connection_1.SetTraceNotification;
    },
  });
  Object.defineProperty(cjsExports, "LogTraceNotification", {
    enumerable: true,
    get: function () {
      return connection_1.LogTraceNotification;
    },
  });
  Object.defineProperty(cjsExports, "ConnectionErrors", {
    enumerable: true,
    get: function () {
      return connection_1.ConnectionErrors;
    },
  });
  Object.defineProperty(cjsExports, "ConnectionError", {
    enumerable: true,
    get: function () {
      return connection_1.ConnectionError;
    },
  });
  Object.defineProperty(cjsExports, "CancellationReceiverStrategy", {
    enumerable: true,
    get: function () {
      return connection_1.CancellationReceiverStrategy;
    },
  });
  Object.defineProperty(cjsExports, "CancellationSenderStrategy", {
    enumerable: true,
    get: function () {
      return connection_1.CancellationSenderStrategy;
    },
  });
  Object.defineProperty(cjsExports, "CancellationStrategy", {
    enumerable: true,
    get: function () {
      return connection_1.CancellationStrategy;
    },
  });
  Object.defineProperty(cjsExports, "MessageStrategy", {
    enumerable: true,
    get: function () {
      return connection_1.MessageStrategy;
    },
  });
  var ral_1 = require_ral();
  cjsExports.RAL = ral_1.default;
});
export { require_api };
