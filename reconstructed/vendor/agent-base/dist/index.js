/**
 * agent-base/dist/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: agent-base@7.1.1..7.1.4
 * pieces: chunk-hq88884p.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x, importMetaRequire } from "../../../runtime/bun-runtime.js";
import { Qt } from "./helpers.js";

//@ chunk-hq88884p.js:18297-20967 cjs-fingerprint
var yhs = x(function (M) {
  var Zt =
      (M && M.__createBinding) ||
      (Object.create
        ? function (e, r, n, o) {
            if (o === void 0) o = n;
            var ownPropertyDescriptor = Object.getOwnPropertyDescriptor(r, n);
            if (
              !ownPropertyDescriptor ||
              ("get" in ownPropertyDescriptor
                ? !r.__esModule
                : ownPropertyDescriptor.writable || ownPropertyDescriptor.configurable)
            )
              ownPropertyDescriptor = {
                enumerable: !0,
                get: function () {
                  return r[n];
                },
              };
            Object.defineProperty(e, o, ownPropertyDescriptor);
          }
        : function (e, r, n, o) {
            if (o === void 0) o = n;
            e[o] = r[n];
          }),
    so =
      (M && M.__setModuleDefault) ||
      (Object.create
        ? function (e, r) {
            Object.defineProperty(e, "default", { enumerable: !0, value: r });
          }
        : function (e, r) {
            e.default = r;
          }),
    er =
      (M && M.__importStar) ||
      function (e) {
        if (e && e.__esModule) return e;
        var r = {};
        if (e != null) {
          for (var key in e)
            if (key !== "default" && Object.prototype.hasOwnProperty.call(e, key)) Zt(r, e, key);
        }
        return (so(r, e), r);
      },
    co =
      (M && M.__exportStar) ||
      function (e, r) {
        for (var key in e)
          if (key !== "default" && !Object.prototype.hasOwnProperty.call(r, key)) Zt(r, e, key);
      };
  Object.defineProperty(M, "__esModule", { value: !0 });
  M.Agent = void 0;
  var ao = er(importMetaRequire("net")),
    Jt = er(importMetaRequire("http")),
    tr = importMetaRequire("https");
  co(Qt(), M);
  var K = Symbol("AgentBaseInternalState");
  class rr extends Jt.Agent {
    constructor(e) {
      super(e);
      this[K] = {};
    }
    isSecureEndpoint(e) {
      if (e) {
        if (typeof e.secureEndpoint === "boolean") return e.secureEndpoint;
        if (typeof e.protocol === "string") return e.protocol === "https:";
      }
      let { stack: stack } = Error();
      if (typeof stack !== "string") return !1;
      return stack
        .split(
          `
`,
        )
        .some((n) => n.indexOf("(https.js:") !== -1 || n.indexOf("node:https:") !== -1);
    }
    incrementSockets(e) {
      if (this.maxSockets === 1 / 0 && this.maxTotalSockets === 1 / 0) return null;
      if (!this.sockets[e]) this.sockets[e] = [];
      let r = new ao.Socket({ writable: !1 });
      return (this.sockets[e].push(r), this.totalSocketCount++, r);
    }
    decrementSockets(e, r) {
      if (!this.sockets[e] || r === null) return;
      let n = this.sockets[e],
        index = n.indexOf(r);
      if (index !== -1) {
        if ((n.splice(index, 1), this.totalSocketCount--, n.length === 0)) delete this.sockets[e];
      }
    }
    getName(e) {
      if (typeof e.secureEndpoint === "boolean" ? e.secureEndpoint : this.isSecureEndpoint(e))
        return tr.Agent.prototype.getName.call(this, e);
      return super.getName(e);
    }
    createSocket(e, r, n) {
      let o = { ...r, secureEndpoint: this.isSecureEndpoint(r) },
        s = this.getName(o),
        incrementSockets = this.incrementSockets(s);
      Promise.resolve()
        .then(() => this.connect(e, o))
        .then(
          (a) => {
            if ((this.decrementSockets(s, incrementSockets), a instanceof Jt.Agent))
              try {
                return a.addRequest(e, o);
              } catch (error) {
                return n(error);
              }
            ((this[K].currentSocket = a), super.createSocket(e, r, n));
          },
          (a) => {
            (this.decrementSockets(s, incrementSockets), n(a));
          },
        );
    }
    createConnection() {
      let currentSocket = this[K].currentSocket;
      if (((this[K].currentSocket = void 0), !currentSocket))
        throw Error("No socket was returned in the `connect()` function");
      return currentSocket;
    }
    get defaultPort() {
      return this[K].defaultPort ?? (this.protocol === "https:" ? 443 : 80);
    }
    set defaultPort(e) {
      if (this[K]) this[K].defaultPort = e;
    }
    get protocol() {
      return this[K].protocol ?? (this.isSecureEndpoint() ? "https:" : "http:");
    }
    set protocol(e) {
      if (this[K]) this[K].protocol = e;
    }
  }
  M.Agent = rr;
});

export { yhs };
