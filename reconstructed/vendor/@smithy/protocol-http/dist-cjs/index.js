/**
 * @smithy/protocol-http/dist-cjs/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @smithy/protocol-http@5.3.0..5.3.14
 * pieces: chunk-hq88884p.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { W1e } from "../../types/dist-cjs/index.js";

//@ chunk-hq88884p.js:2578-4952 cjs-fingerprint
var Kg = x(function (Ir) {
  var Or = W1e(),
    Pr = (e) => ({
      setHttpHandler(r) {
        e.httpHandler = r;
      },
      httpHandler() {
        return e.httpHandler;
      },
      updateHttpClientConfig(r, n) {
        e.httpHandler?.updateHttpClientConfig(r, n);
      },
      httpHandlerConfigs() {
        return e.httpHandler.httpHandlerConfigs();
      },
    }),
    kr = (e) => ({ httpHandler: e.httpHandler() });
  class et {
    name;
    kind;
    values;
    constructor({ name: e, kind: r = Or.FieldPosition.HEADER, values: n = [] }) {
      ((this.name = e), (this.kind = r), (this.values = n));
    }
    add(e) {
      this.values.push(e);
    }
    set(e) {
      this.values = e;
    }
    remove(e) {
      this.values = this.values.filter((r) => r !== e);
    }
    toString() {
      return this.values.map((e) => (e.includes(",") || e.includes(" ") ? `"${e}"` : e)).join(", ");
    }
    get() {
      return this.values;
    }
  }
  class tt {
    entries = {};
    encoding;
    constructor({ fields: e = [], encoding: r = "utf-8" }) {
      (e.forEach(this.setField.bind(this)), (this.encoding = r));
    }
    setField(e) {
      this.entries[e.name.toLowerCase()] = e;
    }
    getField(e) {
      return this.entries[e.toLowerCase()];
    }
    removeField(e) {
      delete this.entries[e.toLowerCase()];
    }
    getByType(e) {
      return Object.values(this.entries).filter((r) => r.kind === e);
    }
  }
  class ue {
    method;
    protocol;
    hostname;
    port;
    path;
    query;
    headers;
    username;
    password;
    fragment;
    body;
    constructor(e) {
      ((this.method = e.method || "GET"),
        (this.hostname = e.hostname || "localhost"),
        (this.port = e.port),
        (this.query = e.query || {}),
        (this.headers = e.headers || {}),
        (this.body = e.body),
        (this.protocol = e.protocol
          ? e.protocol.slice(-1) !== ":"
            ? `${e.protocol}:`
            : e.protocol
          : "https:"),
        (this.path = e.path ? (e.path.charAt(0) !== "/" ? `/${e.path}` : e.path) : "/"),
        (this.username = e.username),
        (this.password = e.password),
        (this.fragment = e.fragment));
    }
    static clone(e) {
      let r = new ue({ ...e, headers: { ...e.headers } });
      if (r.query) r.query = Dr(r.query);
      return r;
    }
    static isInstance(e) {
      if (!e) return !1;
      let r = e;
      return (
        "method" in r &&
        "protocol" in r &&
        "hostname" in r &&
        "path" in r &&
        typeof r.query === "object" &&
        typeof r.headers === "object"
      );
    }
    clone() {
      return ue.clone(this);
    }
  }
  function Dr(e) {
    return Object.keys(e).reduce((r, n) => {
      let o = e[n];
      return { ...r, [n]: Array.isArray(o) ? [...o] : o };
    }, {});
  }
  class nt {
    statusCode;
    reason;
    headers;
    body;
    constructor(e) {
      ((this.statusCode = e.statusCode),
        (this.reason = e.reason),
        (this.headers = e.headers || {}),
        (this.body = e.body));
    }
    static isInstance(e) {
      if (!e) return !1;
      let r = e;
      return typeof r.statusCode === "number" && typeof r.headers === "object";
    }
  }
  function Hr(e) {
    return /^[a-z0-9][a-z0-9\.\-]*[a-z0-9]$/.test(e);
  }
  Ir.Field = et;
  Ir.Fields = tt;
  Ir.HttpRequest = ue;
  Ir.HttpResponse = nt;
  Ir.getHttpHandlerExtensionConfiguration = Pr;
  Ir.isValidHostname = Hr;
  Ir.resolveHttpHandlerRuntimeConfig = kr;
});

export { Kg };
