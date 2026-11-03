/**
 * vscode-jsonrpc/lib/common/connection.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: vscode-jsonrpc@8.2.0..8.2.1
 * pieces: chunk-t4ksmxzx.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { de } from "./ral.js";
import { we } from "./is.js";
import { ht } from "./messages.js";
import { mt } from "./linkedMap.js";
import { _e } from "./events.js";
import { Ve } from "./cancellation.js";

//@ chunk-t4ksmxzx.js:26637-44519 cjs-fingerprint
var Rn = x(function (bn) {
  Object.defineProperty(bn, "__esModule", { value: !0 });
  bn.createMessageConnection =
    bn.ConnectionOptions =
    bn.MessageStrategy =
    bn.CancellationStrategy =
    bn.CancellationSenderStrategy =
    bn.CancellationReceiverStrategy =
    bn.RequestCancellationReceiverStrategy =
    bn.IdCancellationReceiverStrategy =
    bn.ConnectionStrategy =
    bn.ConnectionError =
    bn.ConnectionErrors =
    bn.LogTraceNotification =
    bn.SetTraceNotification =
    bn.TraceFormat =
    bn.TraceValues =
    bn.Trace =
    bn.NullLogger =
    bn.ProgressType =
    bn.ProgressToken =
      void 0;
  var pn = de(),
    m = we(),
    a = ht(),
    Ke = mt(),
    se = _e(),
    Ee = Ve(),
    ze;
  (function (e) {
    e.type = new a.NotificationType("$/cancelRequest");
  })(ze || (ze = {}));
  var Tt;
  (function (e) {
    function r(n) {
      return typeof n === "string" || typeof n === "number";
    }
    e.is = r;
  })(Tt || (bn.ProgressToken = Tt = {}));
  var De;
  (function (e) {
    e.type = new a.NotificationType("$/progress");
  })(De || (De = {}));
  class yn {
    constructor() {}
  }
  bn.ProgressType = yn;
  var Et;
  (function (e) {
    function r(n) {
      return m.func(n);
    }
    e.is = r;
  })(Et || (Et = {}));
  bn.NullLogger = Object.freeze({ error: () => {}, warn: () => {}, info: () => {}, log: () => {} });
  var E;
  (function (e) {
    ((e[(e.Off = 0)] = "Off"),
      (e[(e.Messages = 1)] = "Messages"),
      (e[(e.Compact = 2)] = "Compact"),
      (e[(e.Verbose = 3)] = "Verbose"));
  })(E || (bn.Trace = E = {}));
  var mn;
  (function (e) {
    ((e.Off = "off"), (e.Messages = "messages"), (e.Compact = "compact"), (e.Verbose = "verbose"));
  })(mn || (bn.TraceValues = mn = {}));
  (function (e) {
    function r(s) {
      if (!m.string(s)) return e.Off;
      switch (((s = s.toLowerCase()), s)) {
        case "off":
          return e.Off;
        case "messages":
          return e.Messages;
        case "compact":
          return e.Compact;
        case "verbose":
          return e.Verbose;
        default:
          return e.Off;
      }
    }
    e.fromString = r;
    function n(s) {
      switch (s) {
        case e.Off:
          return "off";
        case e.Messages:
          return "messages";
        case e.Compact:
          return "compact";
        case e.Verbose:
          return "verbose";
        default:
          return "off";
      }
    }
    e.toString = n;
  })(E || (bn.Trace = E = {}));
  var Y;
  (function (e) {
    ((e.Text = "text"), (e.JSON = "json"));
  })(Y || (bn.TraceFormat = Y = {}));
  (function (e) {
    function r(n) {
      if (!m.string(n)) return e.Text;
      if (((n = n.toLowerCase()), n === "json")) return e.JSON;
      else return e.Text;
    }
    e.fromString = r;
  })(Y || (bn.TraceFormat = Y = {}));
  var Ct;
  (function (e) {
    e.type = new a.NotificationType("$/setTrace");
  })(Ct || (bn.SetTraceNotification = Ct = {}));
  var Qe;
  (function (e) {
    e.type = new a.NotificationType("$/logTrace");
  })(Qe || (bn.LogTraceNotification = Qe = {}));
  var Ae;
  (function (e) {
    ((e[(e.Closed = 1)] = "Closed"),
      (e[(e.Disposed = 2)] = "Disposed"),
      (e[(e.AlreadyListening = 3)] = "AlreadyListening"));
  })(Ae || (bn.ConnectionErrors = Ae = {}));
  class Te extends Error {
    constructor(e, r) {
      super(r);
      ((this.code = e), Object.setPrototypeOf(this, Te.prototype));
    }
  }
  bn.ConnectionError = Te;
  var xt;
  (function (e) {
    function r(n) {
      let s = n;
      return s && m.func(s.cancelUndispatched);
    }
    e.is = r;
  })(xt || (bn.ConnectionStrategy = xt = {}));
  var Ge;
  (function (e) {
    function r(n) {
      let s = n;
      return (
        s &&
        (s.kind === void 0 || s.kind === "id") &&
        m.func(s.createCancellationTokenSource) &&
        (s.dispose === void 0 || m.func(s.dispose))
      );
    }
    e.is = r;
  })(Ge || (bn.IdCancellationReceiverStrategy = Ge = {}));
  var kt;
  (function (e) {
    function r(n) {
      let s = n;
      return (
        s &&
        s.kind === "request" &&
        m.func(s.createCancellationTokenSource) &&
        (s.dispose === void 0 || m.func(s.dispose))
      );
    }
    e.is = r;
  })(kt || (bn.RequestCancellationReceiverStrategy = kt = {}));
  var Ye;
  (function (e) {
    e.Message = Object.freeze({
      createCancellationTokenSource(n) {
        return new Ee.CancellationTokenSource();
      },
    });
    function r(n) {
      return Ge.is(n) || kt.is(n);
    }
    e.is = r;
  })(Ye || (bn.CancellationReceiverStrategy = Ye = {}));
  var Xe;
  (function (e) {
    e.Message = Object.freeze({
      sendCancellation(n, s) {
        return n.sendNotification(ze.type, { id: s });
      },
      cleanup(n) {},
    });
    function r(n) {
      let s = n;
      return s && m.func(s.sendCancellation) && m.func(s.cleanup);
    }
    e.is = r;
  })(Xe || (bn.CancellationSenderStrategy = Xe = {}));
  var Ze;
  (function (e) {
    e.Message = Object.freeze({ receiver: Ye.Message, sender: Xe.Message });
    function r(n) {
      let s = n;
      return s && Ye.is(s.receiver) && Xe.is(s.sender);
    }
    e.is = r;
  })(Ze || (bn.CancellationStrategy = Ze = {}));
  var et;
  (function (e) {
    function r(n) {
      let s = n;
      return s && m.func(s.handleMessage);
    }
    e.is = r;
  })(et || (bn.MessageStrategy = et = {}));
  var gn;
  (function (e) {
    function r(n) {
      let s = n;
      return s && (Ze.is(s.cancellationStrategy) || xt.is(s.connectionStrategy) || et.is(s.messageStrategy));
    }
    e.is = r;
  })(gn || (bn.ConnectionOptions = gn = {}));
  var te;
  (function (e) {
    ((e[(e.New = 1)] = "New"),
      (e[(e.Listening = 2)] = "Listening"),
      (e[(e.Closed = 3)] = "Closed"),
      (e[(e.Disposed = 4)] = "Disposed"));
  })(te || (te = {}));
  function rs(e, r, n, s) {
    let c = n !== void 0 ? n : bn.NullLogger,
      h = 0,
      P = 0,
      _ = 0,
      j = "2.0",
      I = void 0,
      X = new Map(),
      J = void 0,
      oe = new Map(),
      fe = new Map(),
      re,
      Q = new Ke.LinkedMap(),
      Z = new Map(),
      y = new Set(),
      b = new Map(),
      Off = E.Off,
      Text = Y.Text,
      k,
      New = te.New,
      ne = new se.Emitter(),
      ce = new se.Emitter(),
      he = new se.Emitter(),
      v = new se.Emitter(),
      z = new se.Emitter(),
      G = s && s.cancellationStrategy ? s.cancellationStrategy : Ze.Message;
    function pe(i) {
      if (i === null) throw Error("Can't send requests with id null since the response can't be correlated.");
      return "req-" + i.toString();
    }
    function me(i) {
      if (i === null) return "res-unknown-" + (++_).toString();
      else return "res-" + i.toString();
    }
    function ge() {
      return "not-" + (++P).toString();
    }
    function We(i, o) {
      if (a.Message.isRequest(o)) i.set(pe(o.id), o);
      else if (a.Message.isResponse(o)) i.set(me(o.id), o);
      else i.set(ge(), o);
    }
    function je(i) {
      return;
    }
    function qt() {
      return New === te.Listening;
    }
    function It() {
      return New === te.Closed;
    }
    function ye() {
      return New === te.Disposed;
    }
    function Dt() {
      if (New === te.New || New === te.Listening) ((New = te.Closed), ce.fire(void 0));
    }
    function An(i) {
      ne.fire([i, void 0, void 0]);
    }
    function zn(i) {
      ne.fire(i);
    }
    (e.onClose(Dt), e.onError(An), r.onClose(Dt), r.onError(zn));
    function At() {
      if (re || Q.size === 0) return;
      re = (0, pn.default)().timer.setImmediate(() => {
        ((re = void 0), Wn());
      });
    }
    function zt(i) {
      if (a.Message.isRequest(i)) Hn(i);
      else if (a.Message.isNotification(i)) Vn(i);
      else if (a.Message.isResponse(i)) Un(i);
      else Jn(i);
    }
    function Wn() {
      if (Q.size === 0) return;
      let i = Q.shift();
      try {
        let o = s?.messageStrategy;
        if (et.is(o)) o.handleMessage(i, zt);
        else zt(i);
      } finally {
        At();
      }
    }
    let Fn = (i) => {
      try {
        if (a.Message.isNotification(i) && i.method === ze.type.method) {
          let id = i.params.id,
            u = pe(id),
            f = Q.get(u);
          if (a.Message.isRequest(f)) {
            let L = s?.connectionStrategy,
              B = L && L.cancelUndispatched ? L.cancelUndispatched(f, je) : je(f);
            if (B && (B.error !== void 0 || B.result !== void 0)) {
              (Q.delete(u),
                b.delete(id),
                (B.id = f.id),
                Fe(B, i.method, Date.now()),
                r.write(B).catch(() => c.error("Sending response for canceled message failed.")));
              return;
            }
          }
          let M = b.get(id);
          if (M !== void 0) {
            (M.cancel(), ut(i));
            return;
          } else y.add(id);
        }
        We(Q, i);
      } finally {
        At();
      }
    };
    function Hn(i) {
      if (ye()) return;
      function o(T, D, C) {
        let W = { jsonrpc: j, id: i.id };
        if (T instanceof a.ResponseError) W.error = T.toJson();
        else W.result = T === void 0 ? null : T;
        (Fe(W, D, C), r.write(W).catch(() => c.error("Sending response failed.")));
      }
      function u(T, D, C) {
        let W = { jsonrpc: j, id: i.id, error: T.toJson() };
        (Fe(W, D, C), r.write(W).catch(() => c.error("Sending response failed.")));
      }
      function f(T, D, C) {
        if (T === void 0) T = null;
        let W = { jsonrpc: j, id: i.id, result: T };
        (Fe(W, D, C), r.write(W).catch(() => c.error("Sending response failed.")));
      }
      Gn(i);
      let M = X.get(i.method),
        L,
        B;
      if (M) ((L = M.type), (B = M.handler));
      let now = Date.now();
      if (B || I) {
        let T = i.id ?? String(Date.now()),
          D = Ge.is(G.receiver)
            ? G.receiver.createCancellationTokenSource(T)
            : G.receiver.createCancellationTokenSource(i);
        if (i.id !== null && y.has(i.id)) D.cancel();
        if (i.id !== null) b.set(T, D);
        try {
          let C;
          if (B)
            if (i.params === void 0) {
              if (L !== void 0 && L.numberOfParams !== 0) {
                u(
                  new a.ResponseError(
                    a.ErrorCodes.InvalidParams,
                    `Request ${i.method} defines ${L.numberOfParams} params but received none.`,
                  ),
                  i.method,
                  now,
                );
                return;
              }
              C = B(D.token);
            } else if (Array.isArray(i.params)) {
              if (L !== void 0 && L.parameterStructures === a.ParameterStructures.byName) {
                u(
                  new a.ResponseError(
                    a.ErrorCodes.InvalidParams,
                    `Request ${i.method} defines parameters by name but received parameters by position`,
                  ),
                  i.method,
                  now,
                );
                return;
              }
              C = B(...i.params, D.token);
            } else {
              if (L !== void 0 && L.parameterStructures === a.ParameterStructures.byPosition) {
                u(
                  new a.ResponseError(
                    a.ErrorCodes.InvalidParams,
                    `Request ${i.method} defines parameters by position but received parameters by name`,
                  ),
                  i.method,
                  now,
                );
                return;
              }
              C = B(i.params, D.token);
            }
          else if (I) C = I(i.method, i.params, D.token);
          let W = C;
          if (!C) (b.delete(T), f(C, i.method, now));
          else if (W.then)
            W.then(
              (V) => {
                (b.delete(T), o(V, i.method, now));
              },
              (V) => {
                if ((b.delete(T), V instanceof a.ResponseError)) u(V, i.method, now);
                else if (V && m.string(V.message))
                  u(
                    new a.ResponseError(
                      a.ErrorCodes.InternalError,
                      `Request ${i.method} failed with message: ${V.message}`,
                    ),
                    i.method,
                    now,
                  );
                else
                  u(
                    new a.ResponseError(
                      a.ErrorCodes.InternalError,
                      `Request ${i.method} failed unexpectedly without providing any details.`,
                    ),
                    i.method,
                    now,
                  );
              },
            );
          else (b.delete(T), o(C, i.method, now));
        } catch (error) {
          if ((b.delete(T), error instanceof a.ResponseError)) o(error, i.method, now);
          else if (error && m.string(error.message))
            u(
              new a.ResponseError(
                a.ErrorCodes.InternalError,
                `Request ${i.method} failed with message: ${error.message}`,
              ),
              i.method,
              now,
            );
          else
            u(
              new a.ResponseError(
                a.ErrorCodes.InternalError,
                `Request ${i.method} failed unexpectedly without providing any details.`,
              ),
              i.method,
              now,
            );
        }
      } else
        u(new a.ResponseError(a.ErrorCodes.MethodNotFound, `Unhandled method ${i.method}`), i.method, now);
    }
    function Un(i) {
      if (ye()) return;
      if (i.id === null)
        if (i.error)
          c.error(`Received response message without id: Error is: 
${JSON.stringify(i.error, void 0, 4)}`);
        else c.error("Received response message without id. No further error information provided.");
      else {
        let id = i.id,
          u = Z.get(id);
        if ((Yn(i, u), u !== void 0)) {
          Z.delete(id);
          try {
            if (i.error) {
              let error = i.error;
              u.reject(new a.ResponseError(error.code, error.message, error.data));
            } else if (i.result !== void 0) u.resolve(i.result);
            else throw Error("Should never happen.");
          } catch (error) {
            if (error.message)
              c.error(`Response handler '${u.method}' failed with message: ${error.message}`);
            else c.error(`Response handler '${u.method}' failed unexpectedly.`);
          }
        }
      }
    }
    function Vn(i) {
      if (ye()) return;
      let o = void 0,
        u;
      if (i.method === ze.type.method) {
        let id = i.params.id;
        (y.delete(id), ut(i));
        return;
      } else {
        let f = oe.get(i.method);
        if (f) ((u = f.handler), (o = f.type));
      }
      if (u || J)
        try {
          if ((ut(i), u))
            if (i.params === void 0) {
              if (o !== void 0) {
                if (o.numberOfParams !== 0 && o.parameterStructures !== a.ParameterStructures.byName)
                  c.error(`Notification ${i.method} defines ${o.numberOfParams} params but received none.`);
              }
              u();
            } else if (Array.isArray(i.params)) {
              let params = i.params;
              if (i.method === De.type.method && params.length === 2 && Tt.is(params[0]))
                u({ token: params[0], value: params[1] });
              else {
                if (o !== void 0) {
                  if (o.parameterStructures === a.ParameterStructures.byName)
                    c.error(
                      `Notification ${i.method} defines parameters by name but received parameters by position`,
                    );
                  if (o.numberOfParams !== i.params.length)
                    c.error(
                      `Notification ${i.method} defines ${o.numberOfParams} params but received ${params.length} arguments`,
                    );
                }
                u(...params);
              }
            } else {
              if (o !== void 0 && o.parameterStructures === a.ParameterStructures.byPosition)
                c.error(
                  `Notification ${i.method} defines parameters by position but received parameters by name`,
                );
              u(i.params);
            }
          else if (J) J(i.method, i.params);
        } catch (error) {
          if (error.message)
            c.error(`Notification handler '${i.method}' failed with message: ${error.message}`);
          else c.error(`Notification handler '${i.method}' failed unexpectedly.`);
        }
      else he.fire(i);
    }
    function Jn(i) {
      if (!i) {
        c.error("Received empty message.");
        return;
      }
      c.error(`Received message which is neither a response nor a notification message:
${JSON.stringify(i, null, 4)}`);
      let o = i;
      if (m.string(o.id) || m.number(o.id)) {
        let id = o.id,
          f = Z.get(id);
        if (f) f.reject(Error("The received response has neither a result nor an error property."));
      }
    }
    function ue(i) {
      if (i === void 0 || i === null) return;
      switch (Off) {
        case E.Verbose:
          return JSON.stringify(i, null, 4);
        case E.Compact:
          return JSON.stringify(i);
        default:
          return;
      }
    }
    function Kn(i) {
      if (Off === E.Off || !k) return;
      if (Text === Y.Text) {
        let o = void 0;
        if ((Off === E.Verbose || Off === E.Compact) && i.params)
          o = `Params: ${ue(i.params)}

`;
        k.log(`Sending request '${i.method} - (${i.id})'.`, o);
      } else be("send-request", i);
    }
    function Qn(i) {
      if (Off === E.Off || !k) return;
      if (Text === Y.Text) {
        let o = void 0;
        if (Off === E.Verbose || Off === E.Compact)
          if (i.params)
            o = `Params: ${ue(i.params)}

`;
          else
            o = `No parameters provided.

`;
        k.log(`Sending notification '${i.method}'.`, o);
      } else be("send-notification", i);
    }
    function Fe(i, o, u) {
      if (Off === E.Off || !k) return;
      if (Text === Y.Text) {
        let f = void 0;
        if (Off === E.Verbose || Off === E.Compact) {
          if (i.error && i.error.data)
            f = `Error data: ${ue(i.error.data)}

`;
          else if (i.result)
            f = `Result: ${ue(i.result)}

`;
          else if (i.error === void 0)
            f = `No result returned.

`;
        }
        k.log(`Sending response '${o} - (${i.id})'. Processing request took ${Date.now() - u}ms`, f);
      } else be("send-response", i);
    }
    function Gn(i) {
      if (Off === E.Off || !k) return;
      if (Text === Y.Text) {
        let o = void 0;
        if ((Off === E.Verbose || Off === E.Compact) && i.params)
          o = `Params: ${ue(i.params)}

`;
        k.log(`Received request '${i.method} - (${i.id})'.`, o);
      } else be("receive-request", i);
    }
    function ut(i) {
      if (Off === E.Off || !k || i.method === Qe.type.method) return;
      if (Text === Y.Text) {
        let o = void 0;
        if (Off === E.Verbose || Off === E.Compact)
          if (i.params)
            o = `Params: ${ue(i.params)}

`;
          else
            o = `No parameters provided.

`;
        k.log(`Received notification '${i.method}'.`, o);
      } else be("receive-notification", i);
    }
    function Yn(i, o) {
      if (Off === E.Off || !k) return;
      if (Text === Y.Text) {
        let u = void 0;
        if (Off === E.Verbose || Off === E.Compact) {
          if (i.error && i.error.data)
            u = `Error data: ${ue(i.error.data)}

`;
          else if (i.result)
            u = `Result: ${ue(i.result)}

`;
          else if (i.error === void 0)
            u = `No result returned.

`;
        }
        if (o) {
          let f = i.error ? ` Request failed: ${i.error.message} (${i.error.code}).` : "";
          k.log(`Received response '${o.method} - (${i.id})' in ${Date.now() - o.timerStart}ms.${f}`, u);
        } else k.log(`Received response ${i.id} without active response promise.`, u);
      } else be("receive-response", i);
    }
    function be(i, o) {
      if (!k || Off === E.Off) return;
      let u = { isLSPMessage: !0, type: i, message: o, timestamp: Date.now() };
      k.log(u);
    }
    function $e() {
      if (It()) throw new Te(Ae.Closed, "Connection is closed.");
      if (ye()) throw new Te(Ae.Disposed, "Connection is disposed.");
    }
    function Xn() {
      if (qt()) throw new Te(Ae.AlreadyListening, "Connection is already listening");
    }
    function Zn() {
      if (!qt()) throw Error("Call listen() first.");
    }
    function qe(i) {
      if (i === void 0) return null;
      else return i;
    }
    function Wt(i) {
      if (i === null) return;
      else return i;
    }
    function Ft(i) {
      return i !== void 0 && i !== null && !Array.isArray(i) && typeof i === "object";
    }
    function dt(i, o) {
      switch (i) {
        case a.ParameterStructures.auto:
          if (Ft(o)) return Wt(o);
          else return [qe(o)];
        case a.ParameterStructures.byName:
          if (!Ft(o)) throw Error("Received parameters by name but param is not an object literal.");
          return Wt(o);
        case a.ParameterStructures.byPosition:
          return [qe(o)];
        default:
          throw Error(`Unknown parameter structure ${i.toString()}`);
      }
    }
    function Ht(i, o) {
      let u,
        numberOfParams = i.numberOfParams;
      switch (numberOfParams) {
        case 0:
          u = void 0;
          break;
        case 1:
          u = dt(i.parameterStructures, o[0]);
          break;
        default:
          u = [];
          for (let M = 0; M < o.length && M < numberOfParams; M++) u.push(qe(o[M]));
          if (o.length < numberOfParams) for (let M = o.length; M < numberOfParams; M++) u.push(null);
          break;
      }
      return u;
    }
    let ve = {
      sendNotification: (i, ...o) => {
        $e();
        let u, f;
        if (m.string(i)) {
          u = i;
          let L = o[0],
            B = 0,
            auto = a.ParameterStructures.auto;
          if (a.ParameterStructures.is(L)) ((B = 1), (auto = L));
          let T = o.length,
            D = T - B;
          switch (D) {
            case 0:
              f = void 0;
              break;
            case 1:
              f = dt(auto, o[B]);
              break;
            default:
              if (auto === a.ParameterStructures.byName)
                throw Error(`Received ${D} parameters for 'by Name' notification parameter structure.`);
              f = o.slice(B, T).map((C) => qe(C));
              break;
          }
        } else {
          let L = o;
          ((u = i.method), (f = Ht(i, L)));
        }
        let M = { jsonrpc: j, method: u, params: f };
        return (
          Qn(M),
          r.write(M).catch((L) => {
            throw (c.error("Sending notification failed."), L);
          })
        );
      },
      onNotification: (i, o) => {
        $e();
        let u;
        if (m.func(i)) J = i;
        else if (o)
          if (m.string(i)) ((u = i), oe.set(i, { type: void 0, handler: o }));
          else ((u = i.method), oe.set(i.method, { type: i, handler: o }));
        return {
          dispose: () => {
            if (u !== void 0) oe.delete(u);
            else J = void 0;
          },
        };
      },
      onProgress: (i, o, u) => {
        if (fe.has(o)) throw Error(`Progress handler for token ${o} already registered`);
        return (
          fe.set(o, u),
          {
            dispose: () => {
              fe.delete(o);
            },
          }
        );
      },
      sendProgress: (i, o, u) => ve.sendNotification(De.type, { token: o, value: u }),
      onUnhandledProgress: v.event,
      sendRequest: (i, ...o) => {
        ($e(), Zn());
        let u,
          f,
          M = void 0;
        if (m.string(i)) {
          u = i;
          let T = o[0],
            D = o[o.length - 1],
            C = 0,
            auto = a.ParameterStructures.auto;
          if (a.ParameterStructures.is(T)) ((C = 1), (auto = T));
          let V = o.length;
          if (Ee.CancellationToken.is(D)) ((V = V - 1), (M = D));
          let ae = V - C;
          switch (ae) {
            case 0:
              f = void 0;
              break;
            case 1:
              f = dt(auto, o[C]);
              break;
            default:
              if (auto === a.ParameterStructures.byName)
                throw Error(`Received ${ae} parameters for 'by Name' request parameter structure.`);
              f = o.slice(C, V).map((ei) => qe(ei));
              break;
          }
        } else {
          let T = o;
          ((u = i.method), (f = Ht(i, T)));
          let numberOfParams = i.numberOfParams;
          M = Ee.CancellationToken.is(T[numberOfParams]) ? T[numberOfParams] : void 0;
        }
        let L = h++,
          B;
        if (M)
          B = M.onCancellationRequested(() => {
            let sendCancellation = G.sender.sendCancellation(ve, L);
            if (sendCancellation === void 0)
              return (
                c.log(`Received no promise from cancellation strategy when cancelling id ${L}`),
                Promise.resolve()
              );
            else
              return sendCancellation.catch(() => {
                c.log(`Sending cancellation messages for id ${L} failed`);
              });
          });
        let A = { jsonrpc: j, id: L, method: u, params: f };
        if ((Kn(A), typeof G.sender.enableCancellation === "function")) G.sender.enableCancellation(A);
        return new Promise(async (T, D) => {
          let C = (ae) => {
              (T(ae), G.sender.cleanup(L), B?.dispose());
            },
            W = (ae) => {
              (D(ae), G.sender.cleanup(L), B?.dispose());
            },
            V = { method: u, timerStart: Date.now(), resolve: C, reject: W };
          try {
            (Z.set(L, V), await r.write(A));
          } catch (error) {
            (Z.delete(L),
              V.reject(
                new a.ResponseError(
                  a.ErrorCodes.MessageWriteError,
                  error.message ? error.message : "Unknown reason",
                ),
              ),
              c.error("Sending request failed."));
          }
        });
      },
      onRequest: (i, o) => {
        $e();
        let u = null;
        if (Et.is(i)) ((u = void 0), (I = i));
        else if (m.string(i)) {
          if (((u = null), o !== void 0)) ((u = i), X.set(i, { handler: o, type: void 0 }));
        } else if (o !== void 0) ((u = i.method), X.set(i.method, { type: i, handler: o }));
        return {
          dispose: () => {
            if (u === null) return;
            if (u !== void 0) X.delete(u);
            else I = void 0;
          },
        };
      },
      hasPendingResponse: () => Z.size > 0,
      trace: async (i, o, u) => {
        let f = !1,
          Text_2 = Y.Text;
        if (u !== void 0)
          if (m.boolean(u)) f = u;
          else ((f = u.sendNotification || !1), (Text_2 = u.traceFormat || Y.Text));
        if (((Off = i), (Text = Text_2), Off === E.Off)) k = void 0;
        else k = o;
        if (f && !It() && !ye()) await ve.sendNotification(Ct.type, { value: E.toString(i) });
      },
      onError: ne.event,
      onClose: ce.event,
      onUnhandledNotification: he.event,
      onDispose: z.event,
      end: () => {
        r.end();
      },
      dispose: () => {
        if (ye()) return;
        ((New = te.Disposed), z.fire(void 0));
        let i = new a.ResponseError(
          a.ErrorCodes.PendingResponseRejected,
          "Pending response rejected since connection got disposed",
        );
        for (let o of Z.values()) o.reject(i);
        if (((Z = new Map()), (b = new Map()), (y = new Set()), (Q = new Ke.LinkedMap()), m.func(r.dispose)))
          r.dispose();
        if (m.func(e.dispose)) e.dispose();
      },
      listen: () => {
        ($e(), Xn(), (New = te.Listening), e.listen(Fn));
      },
      inspect: () => {
        (0, pn.default)().console.log("inspect");
      },
    };
    return (
      ve.onNotification(Qe.type, (i) => {
        if (Off === E.Off || !k) return;
        let o = Off === E.Verbose || Off === E.Compact;
        k.log(i.message, o ? i.verbose : void 0);
      }),
      ve.onNotification(De.type, (i) => {
        let o = fe.get(i.token);
        if (o) o(i.value);
        else v.fire(i);
      }),
      ve
    );
  }
  bn.createMessageConnection = rs;
});

export { Rn };
