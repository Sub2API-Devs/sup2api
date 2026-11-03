/**
 * vscode-jsonrpc/lib/common/messages.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: vscode-jsonrpc@8.2.0..8.2.1
 * pieces: chunk-t4ksmxzx.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { we } from "./is.js";

//@ chunk-t4ksmxzx.js:4638-8540 cjs-fingerprint
var ht = x(function (vr) {
  Object.defineProperty(vr, "__esModule", { value: !0 });
  vr.Message =
    vr.NotificationType9 =
    vr.NotificationType8 =
    vr.NotificationType7 =
    vr.NotificationType6 =
    vr.NotificationType5 =
    vr.NotificationType4 =
    vr.NotificationType3 =
    vr.NotificationType2 =
    vr.NotificationType1 =
    vr.NotificationType0 =
    vr.NotificationType =
    vr.RequestType9 =
    vr.RequestType8 =
    vr.RequestType7 =
    vr.RequestType6 =
    vr.RequestType5 =
    vr.RequestType4 =
    vr.RequestType3 =
    vr.RequestType2 =
    vr.RequestType1 =
    vr.RequestType =
    vr.RequestType0 =
    vr.AbstractMessageSignature =
    vr.ParameterStructures =
    vr.ResponseError =
    vr.ErrorCodes =
      void 0;
  var K = we(),
    lt;
  (function (e) {
    ((e.ParseError = -32700),
      (e.InvalidRequest = -32600),
      (e.MethodNotFound = -32601),
      (e.InvalidParams = -32602),
      (e.InternalError = -32603),
      (e.jsonrpcReservedErrorRangeStart = -32099),
      (e.serverErrorStart = -32099),
      (e.MessageWriteError = -32099),
      (e.MessageReadError = -32098),
      (e.PendingResponseRejected = -32097),
      (e.ConnectionInactive = -32096),
      (e.ServerNotInitialized = -32002),
      (e.UnknownErrorCode = -32001),
      (e.jsonrpcReservedErrorRangeEnd = -32000),
      (e.serverErrorEnd = -32000));
  })(lt || (vr.ErrorCodes = lt = {}));
  class ft extends Error {
    constructor(e, r, n) {
      super(r);
      ((this.code = K.number(e) ? e : lt.UnknownErrorCode),
        (this.data = n),
        Object.setPrototypeOf(this, ft.prototype));
    }
    toJson() {
      let e = { code: this.code, message: this.message };
      if (this.data !== void 0) e.data = this.data;
      return e;
    }
  }
  vr.ResponseError = ft;
  class H {
    constructor(e) {
      this.kind = e;
    }
    static is(e) {
      return e === H.auto || e === H.byName || e === H.byPosition;
    }
    toString() {
      return this.kind;
    }
  }
  vr.ParameterStructures = H;
  H.auto = new H("auto");
  H.byPosition = new H("byPosition");
  H.byName = new H("byName");
  class q {
    constructor(e, r) {
      ((this.method = e), (this.numberOfParams = r));
    }
    get parameterStructures() {
      return H.auto;
    }
  }
  vr.AbstractMessageSignature = q;
  class Yt extends q {
    constructor(e) {
      super(e, 0);
    }
  }
  vr.RequestType0 = Yt;
  class Xt extends q {
    constructor(e, r = H.auto) {
      super(e, 1);
      this._parameterStructures = r;
    }
    get parameterStructures() {
      return this._parameterStructures;
    }
  }
  vr.RequestType = Xt;
  class Zt extends q {
    constructor(e, r = H.auto) {
      super(e, 1);
      this._parameterStructures = r;
    }
    get parameterStructures() {
      return this._parameterStructures;
    }
  }
  vr.RequestType1 = Zt;
  class er extends q {
    constructor(e) {
      super(e, 2);
    }
  }
  vr.RequestType2 = er;
  class tr extends q {
    constructor(e) {
      super(e, 3);
    }
  }
  vr.RequestType3 = tr;
  class rr extends q {
    constructor(e) {
      super(e, 4);
    }
  }
  vr.RequestType4 = rr;
  class nr extends q {
    constructor(e) {
      super(e, 5);
    }
  }
  vr.RequestType5 = nr;
  class ir extends q {
    constructor(e) {
      super(e, 6);
    }
  }
  vr.RequestType6 = ir;
  class sr extends q {
    constructor(e) {
      super(e, 7);
    }
  }
  vr.RequestType7 = sr;
  class or extends q {
    constructor(e) {
      super(e, 8);
    }
  }
  vr.RequestType8 = or;
  class ar extends q {
    constructor(e) {
      super(e, 9);
    }
  }
  vr.RequestType9 = ar;
  class cr extends q {
    constructor(e, r = H.auto) {
      super(e, 1);
      this._parameterStructures = r;
    }
    get parameterStructures() {
      return this._parameterStructures;
    }
  }
  vr.NotificationType = cr;
  class ur extends q {
    constructor(e) {
      super(e, 0);
    }
  }
  vr.NotificationType0 = ur;
  class dr extends q {
    constructor(e, r = H.auto) {
      super(e, 1);
      this._parameterStructures = r;
    }
    get parameterStructures() {
      return this._parameterStructures;
    }
  }
  vr.NotificationType1 = dr;
  class lr extends q {
    constructor(e) {
      super(e, 2);
    }
  }
  vr.NotificationType2 = lr;
  class fr extends q {
    constructor(e) {
      super(e, 3);
    }
  }
  vr.NotificationType3 = fr;
  class hr extends q {
    constructor(e) {
      super(e, 4);
    }
  }
  vr.NotificationType4 = hr;
  class pr extends q {
    constructor(e) {
      super(e, 5);
    }
  }
  vr.NotificationType5 = pr;
  class mr extends q {
    constructor(e) {
      super(e, 6);
    }
  }
  vr.NotificationType6 = mr;
  class gr extends q {
    constructor(e) {
      super(e, 7);
    }
  }
  vr.NotificationType7 = gr;
  class yr extends q {
    constructor(e) {
      super(e, 8);
    }
  }
  vr.NotificationType8 = yr;
  class br extends q {
    constructor(e) {
      super(e, 9);
    }
  }
  vr.NotificationType9 = br;
  var Qt;
  (function (e) {
    function r(c) {
      let h = c;
      return h && K.string(h.method) && (K.string(h.id) || K.number(h.id));
    }
    e.isRequest = r;
    function n(c) {
      let h = c;
      return h && K.string(h.method) && c.id === void 0;
    }
    e.isNotification = n;
    function s(c) {
      let h = c;
      return h && (h.result !== void 0 || !!h.error) && (K.string(h.id) || K.number(h.id) || h.id === null);
    }
    e.isResponse = s;
  })(Qt || (vr.Message = Qt = {}));
});

export { ht };
