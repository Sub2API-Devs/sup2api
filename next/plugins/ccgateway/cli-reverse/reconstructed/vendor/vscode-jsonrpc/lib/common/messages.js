/**
 * vscode-jsonrpc/lib/common/messages.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: vscode-jsonrpc@8.2.0..8.2.1
 * pieces: chunk-mvgr3jmb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_is } from "./is.js";

//@ chunk-mvgr3jmb.js:5002-8904 cjs-fingerprint
var require_messages = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.Message =
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
    cjsExports.RequestType9 =
    cjsExports.RequestType8 =
    cjsExports.RequestType7 =
    cjsExports.RequestType6 =
    cjsExports.RequestType5 =
    cjsExports.RequestType4 =
    cjsExports.RequestType3 =
    cjsExports.RequestType2 =
    cjsExports.RequestType1 =
    cjsExports.RequestType =
    cjsExports.RequestType0 =
    cjsExports.AbstractMessageSignature =
    cjsExports.ParameterStructures =
    cjsExports.ResponseError =
    cjsExports.ErrorCodes =
      undefined;
  var is = require_is();
  var ErrorCodes;
  (function (ErrorCodes) {
    ErrorCodes.ParseError = -32700;
    ErrorCodes.InvalidRequest = -32600;
    ErrorCodes.MethodNotFound = -32601;
    ErrorCodes.InvalidParams = -32602;
    ErrorCodes.InternalError = -32603;
    ErrorCodes.jsonrpcReservedErrorRangeStart = -32099;
    ErrorCodes.serverErrorStart = -32099;
    ErrorCodes.MessageWriteError = -32099;
    ErrorCodes.MessageReadError = -32098;
    ErrorCodes.PendingResponseRejected = -32097;
    ErrorCodes.ConnectionInactive = -32096;
    ErrorCodes.ServerNotInitialized = -32002;
    ErrorCodes.UnknownErrorCode = -32001;
    ErrorCodes.jsonrpcReservedErrorRangeEnd = -32000;
    ErrorCodes.serverErrorEnd = -32000;
  })(ErrorCodes || (cjsExports.ErrorCodes = ErrorCodes = {}));
  class ResponseError extends Error {
    constructor(code, message, data) {
      super(message);
      this.code = is.number(code) ? code : ErrorCodes.UnknownErrorCode;
      this.data = data;
      Object.setPrototypeOf(this, ResponseError.prototype);
    }
    toJson() {
      let result = {
        code: this.code,
        message: this.message,
      };
      if (this.data !== undefined) result.data = this.data;
      return result;
    }
  }
  cjsExports.ResponseError = ResponseError;
  class ParameterStructures {
    constructor(kind) {
      this.kind = kind;
    }
    static is(value) {
      return (
        value === ParameterStructures.auto ||
        value === ParameterStructures.byName ||
        value === ParameterStructures.byPosition
      );
    }
    toString() {
      return this.kind;
    }
  }
  cjsExports.ParameterStructures = ParameterStructures;
  ParameterStructures.auto = new ParameterStructures("auto");
  ParameterStructures.byPosition = new ParameterStructures("byPosition");
  ParameterStructures.byName = new ParameterStructures("byName");
  class AbstractMessageSignature {
    constructor(method, numberOfParams) {
      this.method = method;
      this.numberOfParams = numberOfParams;
    }
    get parameterStructures() {
      return ParameterStructures.auto;
    }
  }
  cjsExports.AbstractMessageSignature = AbstractMessageSignature;
  class RequestType0 extends AbstractMessageSignature {
    constructor(method) {
      super(method, 0);
    }
  }
  cjsExports.RequestType0 = RequestType0;
  class RequestType extends AbstractMessageSignature {
    constructor(method, _parameterStructures = ParameterStructures.auto) {
      super(method, 1);
      this._parameterStructures = _parameterStructures;
    }
    get parameterStructures() {
      return this._parameterStructures;
    }
  }
  cjsExports.RequestType = RequestType;
  class RequestType1 extends AbstractMessageSignature {
    constructor(method, _parameterStructures = ParameterStructures.auto) {
      super(method, 1);
      this._parameterStructures = _parameterStructures;
    }
    get parameterStructures() {
      return this._parameterStructures;
    }
  }
  cjsExports.RequestType1 = RequestType1;
  class RequestType2 extends AbstractMessageSignature {
    constructor(method) {
      super(method, 2);
    }
  }
  cjsExports.RequestType2 = RequestType2;
  class RequestType3 extends AbstractMessageSignature {
    constructor(method) {
      super(method, 3);
    }
  }
  cjsExports.RequestType3 = RequestType3;
  class RequestType4 extends AbstractMessageSignature {
    constructor(method) {
      super(method, 4);
    }
  }
  cjsExports.RequestType4 = RequestType4;
  class RequestType5 extends AbstractMessageSignature {
    constructor(method) {
      super(method, 5);
    }
  }
  cjsExports.RequestType5 = RequestType5;
  class RequestType6 extends AbstractMessageSignature {
    constructor(method) {
      super(method, 6);
    }
  }
  cjsExports.RequestType6 = RequestType6;
  class RequestType7 extends AbstractMessageSignature {
    constructor(method) {
      super(method, 7);
    }
  }
  cjsExports.RequestType7 = RequestType7;
  class RequestType8 extends AbstractMessageSignature {
    constructor(method) {
      super(method, 8);
    }
  }
  cjsExports.RequestType8 = RequestType8;
  class RequestType9 extends AbstractMessageSignature {
    constructor(method) {
      super(method, 9);
    }
  }
  cjsExports.RequestType9 = RequestType9;
  class NotificationType extends AbstractMessageSignature {
    constructor(method, _parameterStructures = ParameterStructures.auto) {
      super(method, 1);
      this._parameterStructures = _parameterStructures;
    }
    get parameterStructures() {
      return this._parameterStructures;
    }
  }
  cjsExports.NotificationType = NotificationType;
  class NotificationType0 extends AbstractMessageSignature {
    constructor(method) {
      super(method, 0);
    }
  }
  cjsExports.NotificationType0 = NotificationType0;
  class NotificationType1 extends AbstractMessageSignature {
    constructor(method, _parameterStructures = ParameterStructures.auto) {
      super(method, 1);
      this._parameterStructures = _parameterStructures;
    }
    get parameterStructures() {
      return this._parameterStructures;
    }
  }
  cjsExports.NotificationType1 = NotificationType1;
  class NotificationType2 extends AbstractMessageSignature {
    constructor(method) {
      super(method, 2);
    }
  }
  cjsExports.NotificationType2 = NotificationType2;
  class NotificationType3 extends AbstractMessageSignature {
    constructor(method) {
      super(method, 3);
    }
  }
  cjsExports.NotificationType3 = NotificationType3;
  class NotificationType4 extends AbstractMessageSignature {
    constructor(method) {
      super(method, 4);
    }
  }
  cjsExports.NotificationType4 = NotificationType4;
  class NotificationType5 extends AbstractMessageSignature {
    constructor(method) {
      super(method, 5);
    }
  }
  cjsExports.NotificationType5 = NotificationType5;
  class NotificationType6 extends AbstractMessageSignature {
    constructor(method) {
      super(method, 6);
    }
  }
  cjsExports.NotificationType6 = NotificationType6;
  class NotificationType7 extends AbstractMessageSignature {
    constructor(method) {
      super(method, 7);
    }
  }
  cjsExports.NotificationType7 = NotificationType7;
  class NotificationType8 extends AbstractMessageSignature {
    constructor(method) {
      super(method, 8);
    }
  }
  cjsExports.NotificationType8 = NotificationType8;
  class NotificationType9 extends AbstractMessageSignature {
    constructor(method) {
      super(method, 9);
    }
  }
  cjsExports.NotificationType9 = NotificationType9;
  var Message;
  (function (Message) {
    function isRequest(message) {
      let candidate = message;
      return candidate && is.string(candidate.method) && (is.string(candidate.id) || is.number(candidate.id));
    }
    Message.isRequest = isRequest;
    function isNotification(message) {
      let candidate = message;
      return candidate && is.string(candidate.method) && message.id === undefined;
    }
    Message.isNotification = isNotification;
    function isResponse(message) {
      let candidate = message;
      return (
        candidate &&
        (candidate.result !== undefined || !!candidate.error) &&
        (is.string(candidate.id) || is.number(candidate.id) || candidate.id === null)
      );
    }
    Message.isResponse = isResponse;
  })(Message || (cjsExports.Message = Message = {}));
});
export { require_messages };
