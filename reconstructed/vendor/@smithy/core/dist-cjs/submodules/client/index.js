/**
 * @smithy/core/dist-cjs/submodules/client/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @smithy/core@3.30.0
 * pieces: chunk-ke7ft91e.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../../runtime/bun-runtime.js";
import { q } from "../../../../middleware-stack/dist-cjs/index.js";
import { jRt } from "../protocols/index.js";
import { W1e } from "../../../../types/dist-cjs/index.js";
import { _D } from "../schema/index.js";
import { z6t } from "../serde/index.js";

//@ chunk-ke7ft91e.js:3961-12613 cjs-fingerprint
var ff = x(function (E) {
  var V = q(),
    T = jRt(),
    O = W1e(),
    K = _D(),
    D = z6t();
  class j {
    config;
    middlewareStack = V.constructStack();
    initConfig;
    handlers;
    constructor(e) {
      this.config = e;
    }
    send(e, t, r) {
      let n = typeof t !== "function" ? t : void 0,
        a = typeof t === "function" ? t : r,
        o = n === void 0 && this.config.cacheMiddleware === !0,
        d;
      if (o) {
        if (!this.handlers) this.handlers = new WeakMap();
        let handlers = this.handlers;
        if (handlers.has(e.constructor)) d = handlers.get(e.constructor);
        else
          ((d = e.resolveMiddleware(this.middlewareStack, this.config, n)), handlers.set(e.constructor, d));
      } else (delete this.handlers, (d = e.resolveMiddleware(this.middlewareStack, this.config, n)));
      if (a)
        d(e)
          .then(
            (u) => a(null, u.output),
            (u) => a(u),
          )
          .catch(() => {});
      else return d(e).then((u) => u.output);
    }
    destroy() {
      (this.config?.requestHandler?.destroy?.(), delete this.handlers);
    }
  }
  var z = "***SensitiveInformation***";
  function R(e, t) {
    if (t == null) return t;
    let of = K.NormalizedSchema.of(e);
    if (of.getMergedTraits().sensitive) return z;
    if (of.isListSchema()) {
      if (!!of.getValueSchema().getMergedTraits().sensitive) return z;
    } else if (of.isMapSchema()) {
      if (
        !!of.getKeySchema().getMergedTraits().sensitive ||
        !!of.getValueSchema().getMergedTraits().sensitive
      )
        return z;
    } else if (of.isStructSchema() && typeof t === "object") {
      let n = t,
        a = {};
      for (let [o, d] of of.structIterator()) if (n[o] != null) a[o] = R(d, n[o]);
      return a;
    }
    return t;
  }
  class F {
    middlewareStack = V.constructStack();
    schema;
    static classBuilder() {
      return new W();
    }
    resolveMiddlewareWithContext(
      e,
      t,
      r,
      {
        middlewareFn: n,
        clientName: a,
        commandName: o,
        inputFilterSensitiveLog: d,
        outputFilterSensitiveLog: u,
        smithyContext: g,
        additionalContext: w,
        CommandCtor: I,
      },
    ) {
      for (let m of n.bind(this)(I, e, t, r)) this.middlewareStack.use(m);
      let combined = e.concat(this.middlewareStack),
        { logger: logger } = t,
        l = {
          logger: logger,
          clientName: a,
          commandName: o,
          inputFilterSensitiveLog: d,
          outputFilterSensitiveLog: u,
          [O.SMITHY_CONTEXT_KEY]: { commandInstance: this, ...g },
          ...w,
        },
        { requestHandler: requestHandler } = t;
      return combined.resolve((m) => requestHandler.handle(m.request, r || {}), l);
    }
  }
  class W {
    _init = () => {};
    _ep = {};
    _middlewareFn = () => [];
    _commandName = "";
    _clientName = "";
    _additionalContext = {};
    _smithyContext = {};
    _inputFilterSensitiveLog = void 0;
    _outputFilterSensitiveLog = void 0;
    _serializer = null;
    _deserializer = null;
    _operationSchema;
    init(e) {
      this._init = e;
    }
    ep(e) {
      return ((this._ep = e), this);
    }
    m(e) {
      return ((this._middlewareFn = e), this);
    }
    s(e, t, r = {}) {
      return ((this._smithyContext = { service: e, operation: t, ...r }), this);
    }
    c(e = {}) {
      return ((this._additionalContext = e), this);
    }
    n(e, t) {
      return ((this._clientName = e), (this._commandName = t), this);
    }
    f(e = (r) => r, t = (r) => r) {
      return ((this._inputFilterSensitiveLog = e), (this._outputFilterSensitiveLog = t), this);
    }
    ser(e) {
      return ((this._serializer = e), this);
    }
    de(e) {
      return ((this._deserializer = e), this);
    }
    sc(e) {
      return ((this._operationSchema = e), (this._smithyContext.operationSchema = e), this);
    }
    build() {
      let e = this,
        t;
      return (t = class extends F {
        input;
        static getEndpointParameterInstructions() {
          return e._ep;
        }
        constructor(...[r]) {
          super();
          ((this.input = r ?? {}), e._init(this), (this.schema = e._operationSchema));
        }
        resolveMiddleware(r, n, a) {
          let _operationSchema = e._operationSchema,
            d = _operationSchema?.[4] ?? _operationSchema?.input,
            u = _operationSchema?.[5] ?? _operationSchema?.output;
          return this.resolveMiddlewareWithContext(r, n, a, {
            CommandCtor: t,
            middlewareFn: e._middlewareFn,
            clientName: e._clientName,
            commandName: e._commandName,
            inputFilterSensitiveLog:
              e._inputFilterSensitiveLog ?? (_operationSchema ? R.bind(null, d) : (g) => g),
            outputFilterSensitiveLog:
              e._outputFilterSensitiveLog ?? (_operationSchema ? R.bind(null, u) : (g) => g),
            smithyContext: e._smithyContext,
            additionalContext: e._additionalContext,
          });
        }
        serialize = e._serializer;
        deserialize = e._deserializer;
      });
    }
  }
  var ee = "***SensitiveInformation***",
    te = (e, t) => {
      for (let r of Object.keys(e)) {
        let n = e[r],
          a = async function (d, u, g) {
            let w = new n(d);
            if (typeof u === "function") this.send(w, u);
            else if (typeof g === "function") {
              if (typeof u !== "object") throw Error(`Expected http options but got ${typeof u}`);
              this.send(w, u || {}, g);
            } else return this.send(w, u);
          },
          replaced = (r[0].toLowerCase() + r.slice(1)).replace(/Command$/, "");
        t.prototype[replaced] = a;
      }
    };
  class _ extends Error {
    $fault;
    $response;
    $retryable;
    $metadata;
    constructor(e) {
      super(e.message);
      (Object.setPrototypeOf(this, Object.getPrototypeOf(this).constructor.prototype),
        (this.name = e.name),
        (this.$fault = e.$fault),
        (this.$metadata = e.$metadata));
    }
    static isInstance(e) {
      if (!e) return !1;
      let t = e;
      return (
        _.prototype.isPrototypeOf(t) ||
        (Boolean(t.$fault) && Boolean(t.$metadata) && (t.$fault === "client" || t.$fault === "server"))
      );
    }
    static [Symbol.hasInstance](e) {
      if (!e) return !1;
      let t = e;
      if (this === _) return _.isInstance(e);
      if (_.isInstance(e)) {
        if (t.name && this.name) return this.prototype.isPrototypeOf(e) || t.name === this.name;
        return this.prototype.isPrototypeOf(e);
      }
      return !1;
    }
  }
  var B = (e, t = {}) => {
      Object.entries(t)
        .filter(([, n]) => n !== void 0)
        .forEach(([n, a]) => {
          if (e[n] == null || e[n] === "") e[n] = a;
        });
      let r = e.message || e.Message || "UnknownError";
      return ((e.message = r), delete e.Message, e);
    },
    H = ({ output: output, parsedBody: parsedBody, exceptionCtor: exceptionCtor, errorCode: errorCode }) => {
      let a = ne(output),
        o = a.httpStatusCode ? a.httpStatusCode + "" : void 0,
        d = new exceptionCtor({
          name: parsedBody?.code || parsedBody?.Code || errorCode || o || "UnknownError",
          $fault: "client",
          $metadata: a,
        });
      throw B(d, parsedBody);
    },
    re =
      (e) =>
      ({ output: output, parsedBody: parsedBody, errorCode: errorCode }) => {
        H({ output: output, parsedBody: parsedBody, exceptionCtor: e, errorCode: errorCode });
      },
    ne = (e) => ({
      httpStatusCode: e.statusCode,
      requestId:
        e.headers["x-amzn-requestid"] ?? e.headers["x-amzn-request-id"] ?? e.headers["x-amz-request-id"],
      extendedRequestId: e.headers["x-amz-id-2"],
      cfId: e.headers["x-amz-cf-id"],
    }),
    ie = (e) => {
      switch (e) {
        case "standard":
          return { retryMode: "standard", connectionTimeout: 3100 };
        case "in-region":
          return { retryMode: "standard", connectionTimeout: 1100 };
        case "cross-region":
          return { retryMode: "standard", connectionTimeout: 3100 };
        case "mobile":
          return { retryMode: "standard", connectionTimeout: 30000 };
        default:
          return {};
      }
    },
    L = !1,
    se = (e) => {
      if (e && !L && parseInt(e.substring(1, e.indexOf("."))) < 16) L = !0;
    },
    oe = (e) => {
      let t = [];
      for (let key in O.AlgorithmId) {
        let n = O.AlgorithmId[key];
        if (e[n] === void 0) continue;
        t.push({ algorithmId: () => n, checksumConstructor: () => e[n] });
      }
      return {
        addChecksumAlgorithm(r) {
          t.push(r);
        },
        checksumAlgorithms() {
          return t;
        },
      };
    },
    ae = (e) => {
      let t = {};
      return (
        e.checksumAlgorithms().forEach((r) => {
          t[r.algorithmId()] = r.checksumConstructor();
        }),
        t
      );
    },
    le = (e) => ({
      setRetryStrategy(t) {
        e.retryStrategy = t;
      },
      retryStrategy() {
        return e.retryStrategy;
      },
    }),
    ce = (e) => {
      let t = {};
      return ((t.retryStrategy = e.retryStrategy()), t);
    },
    U = (e) => Object.assign(oe(e), le(e)),
    de = U,
    ue = (e) => Object.assign(ae(e), ce(e)),
    fe = (e) => (Array.isArray(e) ? e : [e]),
    G = (e) => {
      for (let key in e)
        if (e.hasOwnProperty(key) && e[key]["#text"] !== void 0) e[key] = e[key]["#text"];
        else if (typeof e[key] === "object" && e[key] !== null) e[key] = G(e[key]);
      return e;
    },
    he = (e) => e != null;
  class Y {
    trace() {}
    debug() {}
    info() {}
    warn() {}
    error() {}
  }
  function Z(e, t, r) {
    let n, a, o;
    if (typeof t > "u" && typeof r > "u") ((n = {}), (o = e));
    else if (((n = e), typeof t === "function")) return ((a = t), (o = r), ge(n, a, o));
    else o = t;
    for (let d of Object.keys(o)) {
      if (!Array.isArray(o[d])) {
        n[d] = o[d];
        continue;
      }
      X(n, null, o, d);
    }
    return n;
  }
  var me = (e) => {
      let t = {};
      for (let [r, n] of Object.entries(e || {})) t[r] = [, n];
      return t;
    },
    pe = (e, t) => {
      let r = {};
      for (let key in t) X(r, e, t, key);
      return r;
    },
    ge = (e, t, r) =>
      Z(
        e,
        Object.entries(r).reduce((n, [a, o]) => {
          if (Array.isArray(o)) n[a] = o;
          else if (typeof o === "function") n[a] = [t, o()];
          else n[a] = [t, o];
          return n;
        }, {}),
      ),
    X = (e, t, r, n) => {
      if (t !== null) {
        let d = r[n];
        if (typeof d === "function") d = [, d];
        let [u = ye, g = we, w = n] = d;
        if ((typeof u === "function" && u(t[w])) || (typeof u !== "function" && !!u)) e[n] = g(t[w]);
        return;
      }
      let [a, o] = r[n];
      if (typeof o === "function") {
        let d,
          u = a === void 0 && (d = o()) != null,
          g = (typeof a === "function" && !!a(void 0)) || (typeof a !== "function" && !!a);
        if (u) e[n] = d;
        else if (g) e[n] = o();
      } else {
        let d = a === void 0 && o != null,
          u = (typeof a === "function" && !!a(o)) || (typeof a !== "function" && !!a);
        if (d || u) e[n] = o;
      }
    },
    ye = (e) => e != null,
    we = (e) => e,
    Se = (e) => {
      if (e !== e) return "NaN";
      switch (e) {
        case 1 / 0:
          return "Infinity";
        case -1 / 0:
          return "-Infinity";
        default:
          return e;
      }
    },
    ve = (e) => e.toISOString().replace(".000Z", "Z"),
    k = (e) => {
      if (e == null) return {};
      if (Array.isArray(e)) return e.filter((t) => t != null).map(k);
      if (typeof e === "object") {
        let t = {};
        for (let r of Object.keys(e)) {
          if (e[r] == null) continue;
          t[r] = k(e[r]);
        }
        return t;
      }
      return e;
    };
  Object.defineProperty(E, "collectBody", {
    enumerable: !0,
    get: function () {
      return T.collectBody;
    },
  });
  Object.defineProperty(E, "extendedEncodeURIComponent", {
    enumerable: !0,
    get: function () {
      return T.extendedEncodeURIComponent;
    },
  });
  Object.defineProperty(E, "resolvedPath", {
    enumerable: !0,
    get: function () {
      return T.resolvedPath;
    },
  });
  E.Client = j;
  E.Command = F;
  E.NoOpLogger = Y;
  E.SENSITIVE_STRING = ee;
  E.ServiceException = _;
  E._json = k;
  E.convertMap = me;
  E.createAggregatedClient = te;
  E.decorateServiceException = B;
  E.emitWarningIfUnsupportedVersion = se;
  E.getArrayIfSingleItem = fe;
  E.getDefaultClientConfiguration = de;
  E.getDefaultExtensionConfiguration = U;
  E.getValueFromTextNode = G;
  E.isSerializableHeaderValue = he;
  E.loadConfigsForDefaultMode = ie;
  E.map = Z;
  E.resolveDefaultRuntimeConfig = ue;
  E.serializeDateTime = ve;
  E.serializeFloat = Se;
  E.take = pe;
  E.throwDefaultError = H;
  E.withBaseException = re;
  Object.keys(D).forEach(function (e) {
    if (e !== "default" && !Object.prototype.hasOwnProperty.call(E, e))
      Object.defineProperty(E, e, {
        enumerable: !0,
        get: function () {
          return D[e];
        },
      });
  });
});

export { ff };
