/**
 * agent-base/dist/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: agent-base@7.1.1..7.1.4
 * pieces: chunk-355mdh7x.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS, importMetaRequire } from "../../../runtime/bun-runtime.js";
import { require_helpers } from "./helpers.js";

//@ chunk-355mdh7x.js:18307-20988 cjs-fingerprint
var require_agent_base = __commonJS(function (cjsExports) {
  var __createBinding =
    (cjsExports && cjsExports.__createBinding) ||
    (Object.create
      ? function (o_2, m, k, k2) {
          if (k2 === undefined) k2 = k;
          var desc = Object.getOwnPropertyDescriptor(m, k);
          if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable))
            desc = {
              enumerable: true,
              get: function () {
                return m[k];
              },
            };
          Object.defineProperty(o_2, k2, desc);
        }
      : function (o_2, m, k, k2) {
          if (k2 === undefined) k2 = k;
          o_2[k2] = m[k];
        });
  var __setModuleDefault =
    (cjsExports && cjsExports.__setModuleDefault) ||
    (Object.create
      ? function (o, v) {
          Object.defineProperty(o, "default", {
            enumerable: true,
            value: v,
          });
        }
      : function (o, v) {
          o.default = v;
        });
  var __importStar =
    (cjsExports && cjsExports.__importStar) ||
    function (mod) {
      if (mod && mod.__esModule) return mod;
      var result = {};
      if (mod != null) {
        for (var k in mod)
          if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k))
            __createBinding(result, mod, k);
      }
      __setModuleDefault(result, mod);
      return result;
    };
  var __exportStar =
    (cjsExports && cjsExports.__exportStar) ||
    function (m, target) {
      for (var p in m)
        if (p !== "default" && !Object.prototype.hasOwnProperty.call(target, p))
          __createBinding(target, m, p);
    };
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.Agent = undefined;
  var net = __importStar(importMetaRequire("net"));
  var http = __importStar(importMetaRequire("http"));
  var https_1 = importMetaRequire("https");
  __exportStar(require_helpers(), cjsExports);
  var INTERNAL = Symbol("AgentBaseInternalState");
  class Agent extends http.Agent {
    constructor(opts) {
      super(opts);
      this[INTERNAL] = {};
    }
    isSecureEndpoint(options) {
      if (options) {
        if (typeof options.secureEndpoint === "boolean") return options.secureEndpoint;
        if (typeof options.protocol === "string") return options.protocol === "https:";
      }
      let { stack } = Error();
      if (typeof stack !== "string") return false;
      return stack
        .split(
          `
`,
        )
        .some((l) => l.indexOf("(https.js:") !== -1 || l.indexOf("node:https:") !== -1);
    }
    incrementSockets(name) {
      if (this.maxSockets === 1 / 0 && this.maxTotalSockets === 1 / 0) return null;
      if (!this.sockets[name]) this.sockets[name] = [];
      let fakeSocket = new net.Socket({
        writable: false,
      });
      this.sockets[name].push(fakeSocket);
      this.totalSocketCount++;
      return fakeSocket;
    }
    decrementSockets(name, socket) {
      if (!this.sockets[name] || socket === null) return;
      let sockets = this.sockets[name];
      let index = sockets.indexOf(socket);
      if (index !== -1) {
        sockets.splice(index, 1);
        this.totalSocketCount--;
        if (sockets.length === 0) delete this.sockets[name];
      }
    }
    getName(options) {
      if (
        typeof options.secureEndpoint === "boolean" ? options.secureEndpoint : this.isSecureEndpoint(options)
      )
        return https_1.Agent.prototype.getName.call(this, options);
      return super.getName(options);
    }
    createSocket(req, options, cb) {
      let connectOpts = {
        ...options,
        secureEndpoint: this.isSecureEndpoint(options),
      };
      let name = this.getName(connectOpts);
      let fakeSocket = this.incrementSockets(name);
      Promise.resolve()
        .then(() => this.connect(req, connectOpts))
        .then(
          (socket) => {
            this.decrementSockets(name, fakeSocket);
            if (socket instanceof http.Agent)
              try {
                return socket.addRequest(req, connectOpts);
              } catch (err) {
                return cb(err);
              }
            this[INTERNAL].currentSocket = socket;
            super.createSocket(req, options, cb);
          },
          (err) => {
            this.decrementSockets(name, fakeSocket);
            cb(err);
          },
        );
    }
    createConnection() {
      let socket = this[INTERNAL].currentSocket;
      this[INTERNAL].currentSocket = undefined;
      if (!socket) throw Error("No socket was returned in the `connect()` function");
      return socket;
    }
    get defaultPort() {
      return this[INTERNAL].defaultPort ?? (this.protocol === "https:" ? 443 : 80);
    }
    set defaultPort(v) {
      if (this[INTERNAL]) this[INTERNAL].defaultPort = v;
    }
    get protocol() {
      return this[INTERNAL].protocol ?? (this.isSecureEndpoint() ? "https:" : "http:");
    }
    set protocol(v) {
      if (this[INTERNAL]) this[INTERNAL].protocol = v;
    }
  }
  cjsExports.Agent = Agent;
});
export { require_agent_base };
