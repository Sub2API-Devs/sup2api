/**
 * vscode-jsonrpc/lib/common/api.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: vscode-jsonrpc@8.2.0..8.2.1
 * pieces: chunk-t4ksmxzx.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { ht } from "./messages.js";
import { mt } from "./linkedMap.js";
import { xr } from "./disposable.js";
import { _e } from "./events.js";
import { Ve } from "./cancellation.js";
import { Ur } from "./sharedArrayCancellation.js";
import { en } from "./messageReader.js";
import { un } from "./messageWriter.js";
import { hn } from "./messageBuffer.js";
import { Rn } from "./connection.js";
import { de } from "./ral.js";

//@ chunk-t4ksmxzx.js:44519-51933 cjs-fingerprint
var it = x(function (l) {
  Object.defineProperty(l, "__esModule", { value: !0 });
  l.ProgressType =
    l.ProgressToken =
    l.createMessageConnection =
    l.NullLogger =
    l.ConnectionOptions =
    l.ConnectionStrategy =
    l.AbstractMessageBuffer =
    l.WriteableStreamMessageWriter =
    l.AbstractMessageWriter =
    l.MessageWriter =
    l.ReadableStreamMessageReader =
    l.AbstractMessageReader =
    l.MessageReader =
    l.SharedArrayReceiverStrategy =
    l.SharedArraySenderStrategy =
    l.CancellationToken =
    l.CancellationTokenSource =
    l.Emitter =
    l.Event =
    l.Disposable =
    l.LRUCache =
    l.Touch =
    l.LinkedMap =
    l.ParameterStructures =
    l.NotificationType9 =
    l.NotificationType8 =
    l.NotificationType7 =
    l.NotificationType6 =
    l.NotificationType5 =
    l.NotificationType4 =
    l.NotificationType3 =
    l.NotificationType2 =
    l.NotificationType1 =
    l.NotificationType0 =
    l.NotificationType =
    l.ErrorCodes =
    l.ResponseError =
    l.RequestType9 =
    l.RequestType8 =
    l.RequestType7 =
    l.RequestType6 =
    l.RequestType5 =
    l.RequestType4 =
    l.RequestType3 =
    l.RequestType2 =
    l.RequestType1 =
    l.RequestType0 =
    l.RequestType =
    l.Message =
    l.RAL =
      void 0;
  l.MessageStrategy =
    l.CancellationStrategy =
    l.CancellationSenderStrategy =
    l.CancellationReceiverStrategy =
    l.ConnectionError =
    l.ConnectionErrors =
    l.LogTraceNotification =
    l.SetTraceNotification =
    l.TraceFormat =
    l.TraceValues =
    l.Trace =
      void 0;
  var p = ht();
  Object.defineProperty(l, "Message", {
    enumerable: !0,
    get: function () {
      return p.Message;
    },
  });
  Object.defineProperty(l, "RequestType", {
    enumerable: !0,
    get: function () {
      return p.RequestType;
    },
  });
  Object.defineProperty(l, "RequestType0", {
    enumerable: !0,
    get: function () {
      return p.RequestType0;
    },
  });
  Object.defineProperty(l, "RequestType1", {
    enumerable: !0,
    get: function () {
      return p.RequestType1;
    },
  });
  Object.defineProperty(l, "RequestType2", {
    enumerable: !0,
    get: function () {
      return p.RequestType2;
    },
  });
  Object.defineProperty(l, "RequestType3", {
    enumerable: !0,
    get: function () {
      return p.RequestType3;
    },
  });
  Object.defineProperty(l, "RequestType4", {
    enumerable: !0,
    get: function () {
      return p.RequestType4;
    },
  });
  Object.defineProperty(l, "RequestType5", {
    enumerable: !0,
    get: function () {
      return p.RequestType5;
    },
  });
  Object.defineProperty(l, "RequestType6", {
    enumerable: !0,
    get: function () {
      return p.RequestType6;
    },
  });
  Object.defineProperty(l, "RequestType7", {
    enumerable: !0,
    get: function () {
      return p.RequestType7;
    },
  });
  Object.defineProperty(l, "RequestType8", {
    enumerable: !0,
    get: function () {
      return p.RequestType8;
    },
  });
  Object.defineProperty(l, "RequestType9", {
    enumerable: !0,
    get: function () {
      return p.RequestType9;
    },
  });
  Object.defineProperty(l, "ResponseError", {
    enumerable: !0,
    get: function () {
      return p.ResponseError;
    },
  });
  Object.defineProperty(l, "ErrorCodes", {
    enumerable: !0,
    get: function () {
      return p.ErrorCodes;
    },
  });
  Object.defineProperty(l, "NotificationType", {
    enumerable: !0,
    get: function () {
      return p.NotificationType;
    },
  });
  Object.defineProperty(l, "NotificationType0", {
    enumerable: !0,
    get: function () {
      return p.NotificationType0;
    },
  });
  Object.defineProperty(l, "NotificationType1", {
    enumerable: !0,
    get: function () {
      return p.NotificationType1;
    },
  });
  Object.defineProperty(l, "NotificationType2", {
    enumerable: !0,
    get: function () {
      return p.NotificationType2;
    },
  });
  Object.defineProperty(l, "NotificationType3", {
    enumerable: !0,
    get: function () {
      return p.NotificationType3;
    },
  });
  Object.defineProperty(l, "NotificationType4", {
    enumerable: !0,
    get: function () {
      return p.NotificationType4;
    },
  });
  Object.defineProperty(l, "NotificationType5", {
    enumerable: !0,
    get: function () {
      return p.NotificationType5;
    },
  });
  Object.defineProperty(l, "NotificationType6", {
    enumerable: !0,
    get: function () {
      return p.NotificationType6;
    },
  });
  Object.defineProperty(l, "NotificationType7", {
    enumerable: !0,
    get: function () {
      return p.NotificationType7;
    },
  });
  Object.defineProperty(l, "NotificationType8", {
    enumerable: !0,
    get: function () {
      return p.NotificationType8;
    },
  });
  Object.defineProperty(l, "NotificationType9", {
    enumerable: !0,
    get: function () {
      return p.NotificationType9;
    },
  });
  Object.defineProperty(l, "ParameterStructures", {
    enumerable: !0,
    get: function () {
      return p.ParameterStructures;
    },
  });
  var Ce = mt();
  Object.defineProperty(l, "LinkedMap", {
    enumerable: !0,
    get: function () {
      return Ce.LinkedMap;
    },
  });
  Object.defineProperty(l, "LRUCache", {
    enumerable: !0,
    get: function () {
      return Ce.LRUCache;
    },
  });
  Object.defineProperty(l, "Touch", {
    enumerable: !0,
    get: function () {
      return Ce.Touch;
    },
  });
  var Pn = xr();
  Object.defineProperty(l, "Disposable", {
    enumerable: !0,
    get: function () {
      return Pn.Disposable;
    },
  });
  var tt = _e();
  Object.defineProperty(l, "Event", {
    enumerable: !0,
    get: function () {
      return tt.Event;
    },
  });
  Object.defineProperty(l, "Emitter", {
    enumerable: !0,
    get: function () {
      return tt.Emitter;
    },
  });
  var rt = Ve();
  Object.defineProperty(l, "CancellationTokenSource", {
    enumerable: !0,
    get: function () {
      return rt.CancellationTokenSource;
    },
  });
  Object.defineProperty(l, "CancellationToken", {
    enumerable: !0,
    get: function () {
      return rt.CancellationToken;
    },
  });
  var nt = Ur();
  Object.defineProperty(l, "SharedArraySenderStrategy", {
    enumerable: !0,
    get: function () {
      return nt.SharedArraySenderStrategy;
    },
  });
  Object.defineProperty(l, "SharedArrayReceiverStrategy", {
    enumerable: !0,
    get: function () {
      return nt.SharedArrayReceiverStrategy;
    },
  });
  var xe = en();
  Object.defineProperty(l, "MessageReader", {
    enumerable: !0,
    get: function () {
      return xe.MessageReader;
    },
  });
  Object.defineProperty(l, "AbstractMessageReader", {
    enumerable: !0,
    get: function () {
      return xe.AbstractMessageReader;
    },
  });
  Object.defineProperty(l, "ReadableStreamMessageReader", {
    enumerable: !0,
    get: function () {
      return xe.ReadableStreamMessageReader;
    },
  });
  var ke = un();
  Object.defineProperty(l, "MessageWriter", {
    enumerable: !0,
    get: function () {
      return ke.MessageWriter;
    },
  });
  Object.defineProperty(l, "AbstractMessageWriter", {
    enumerable: !0,
    get: function () {
      return ke.AbstractMessageWriter;
    },
  });
  Object.defineProperty(l, "WriteableStreamMessageWriter", {
    enumerable: !0,
    get: function () {
      return ke.WriteableStreamMessageWriter;
    },
  });
  var Tn = hn();
  Object.defineProperty(l, "AbstractMessageBuffer", {
    enumerable: !0,
    get: function () {
      return Tn.AbstractMessageBuffer;
    },
  });
  var R = Rn();
  Object.defineProperty(l, "ConnectionStrategy", {
    enumerable: !0,
    get: function () {
      return R.ConnectionStrategy;
    },
  });
  Object.defineProperty(l, "ConnectionOptions", {
    enumerable: !0,
    get: function () {
      return R.ConnectionOptions;
    },
  });
  Object.defineProperty(l, "NullLogger", {
    enumerable: !0,
    get: function () {
      return R.NullLogger;
    },
  });
  Object.defineProperty(l, "createMessageConnection", {
    enumerable: !0,
    get: function () {
      return R.createMessageConnection;
    },
  });
  Object.defineProperty(l, "ProgressToken", {
    enumerable: !0,
    get: function () {
      return R.ProgressToken;
    },
  });
  Object.defineProperty(l, "ProgressType", {
    enumerable: !0,
    get: function () {
      return R.ProgressType;
    },
  });
  Object.defineProperty(l, "Trace", {
    enumerable: !0,
    get: function () {
      return R.Trace;
    },
  });
  Object.defineProperty(l, "TraceValues", {
    enumerable: !0,
    get: function () {
      return R.TraceValues;
    },
  });
  Object.defineProperty(l, "TraceFormat", {
    enumerable: !0,
    get: function () {
      return R.TraceFormat;
    },
  });
  Object.defineProperty(l, "SetTraceNotification", {
    enumerable: !0,
    get: function () {
      return R.SetTraceNotification;
    },
  });
  Object.defineProperty(l, "LogTraceNotification", {
    enumerable: !0,
    get: function () {
      return R.LogTraceNotification;
    },
  });
  Object.defineProperty(l, "ConnectionErrors", {
    enumerable: !0,
    get: function () {
      return R.ConnectionErrors;
    },
  });
  Object.defineProperty(l, "ConnectionError", {
    enumerable: !0,
    get: function () {
      return R.ConnectionError;
    },
  });
  Object.defineProperty(l, "CancellationReceiverStrategy", {
    enumerable: !0,
    get: function () {
      return R.CancellationReceiverStrategy;
    },
  });
  Object.defineProperty(l, "CancellationSenderStrategy", {
    enumerable: !0,
    get: function () {
      return R.CancellationSenderStrategy;
    },
  });
  Object.defineProperty(l, "CancellationStrategy", {
    enumerable: !0,
    get: function () {
      return R.CancellationStrategy;
    },
  });
  Object.defineProperty(l, "MessageStrategy", {
    enumerable: !0,
    get: function () {
      return R.MessageStrategy;
    },
  });
  var bs = de();
  l.RAL = bs.default;
});

export { it };
