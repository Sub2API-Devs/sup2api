/**
 * @smithy/core/dist-cjs/submodules/endpoints/index.browser.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @smithy/core@3.30.0
 * pieces: chunk-a3vzsfpr.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../../runtime/bun-runtime.js";
import { W1e } from "../../../../types/dist-cjs/index.js";

//@ chunk-a3vzsfpr.js:819-7701 cjs-fingerprint
var YJ = x(function ($e) {
  var O = W1e();
  class U {
    capacity;
    data = new Map();
    parameters = [];
    constructor({ size: e, params: n }) {
      if (((this.capacity = e ?? 50), n)) this.parameters = n;
    }
    get(e, n) {
      let hash = this.hash(e);
      if (hash === !1) return n();
      if (!this.data.has(hash)) {
        if (this.data.size > this.capacity + 10) {
          let keys = this.data.keys(),
            s = 0;
          while (!0) {
            let { value: o, done: i } = keys.next();
            if ((this.data.delete(o), i || ++s > 10)) break;
          }
        }
        this.data.set(hash, n());
      }
      return this.data.get(hash);
    }
    size() {
      return this.data.size;
    }
    hash(e) {
      let n = "",
        { parameters: parameters } = this;
      if (parameters.length === 0) return !1;
      for (let r of parameters) {
        let s = String(e[r] ?? "");
        if (s.includes("|;")) return !1;
        n += s + "|;";
      }
      return n;
    }
  }
  var regExp = new RegExp(
      "^(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)(?:\\.(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)){3}$",
    ),
    A = (e) => regExp.test(e) || (e.startsWith("[") && e.endsWith("]")),
    regExp_2 = new RegExp("^(?!.*-$)(?!-)[a-zA-Z0-9-]{1,63}$"),
    m = (e, n = !1) => {
      if (!n) return regExp_2.test(e);
      let parts = e.split(".");
      for (let r of parts) if (!m(r)) return !1;
      return !0;
    },
    I = {},
    N = "endpoints";
  function d(e) {
    if (typeof e !== "object" || e == null) return e;
    if ("ref" in e) return `$${d(e.ref)}`;
    if ("fn" in e) return `${e.fn}(${(e.argv || []).map(d).join(", ")})`;
    return JSON.stringify(e, null, 2);
  }
  class EndpointError extends Error {
    constructor(e) {
      super(e);
      this.name = "EndpointError";
    }
  }
  var ae = (e, n) => e === n,
    le = (e) => {
      let parts = e.split("."),
        t = [];
      for (let r of parts) {
        let index = r.indexOf("[");
        if (index !== -1) {
          if (r.indexOf("]") !== r.length - 1) throw new EndpointError(`Path: '${e}' does not end with ']'`);
          let sliced = r.slice(index + 1, -1);
          if (Number.isNaN(parseInt(sliced)))
            throw new EndpointError(`Invalid array index: '${sliced}' in path: '${e}'`);
          if (index !== 0) t.push(r.slice(0, index));
          t.push(sliced);
        } else t.push(r);
      }
      return t;
    },
    D = (e, n) =>
      le(n).reduce((t, r) => {
        if (typeof t !== "object")
          throw new EndpointError(`Index '${r}' in '${n}' not found in '${JSON.stringify(e)}'`);
        else if (Array.isArray(t)) return t[parseInt(r)];
        return t[r];
      }, e),
    ue = (e) => e != null,
    de = (e) => !e,
    S = { [O.EndpointURLScheme.HTTP]: 80, [O.EndpointURLScheme.HTTPS]: 443 },
    fe = (e) => {
      let n = (() => {
        try {
          if (e instanceof URL) return e;
          if (typeof e === "object" && "hostname" in e) {
            let {
                hostname: hostname,
                port: port,
                protocol: protocol = "",
                path: path = "",
                query: query = {},
              } = e,
              T = new URL(`${protocol}//${hostname}${port ? `:${port}` : ""}${path}`);
            return (
              (T.search = Object.entries(query)
                .map(([Y, ee]) => `${Y}=${ee}`)
                .join("&")),
              T
            );
          }
          return new URL(e);
        } catch (error) {
          return null;
        }
      })();
      if (!n) return (console.error(`Unable to parse ${JSON.stringify(e)} as a whatwg URL.`), null);
      let href = n.href,
        { host: host, hostname: hostname, pathname: pathname, protocol: protocol, search: search } = n;
      if (search) return null;
      let sliced = protocol.slice(0, -1);
      if (!Object.values(O.EndpointURLScheme).includes(sliced)) return null;
      let c = A(hostname),
        g =
          href.includes(`${host}:${S[sliced]}`) ||
          (typeof e === "string" && e.includes(`${host}:${S[sliced]}`)),
        p = `${host}${g ? `:${S[sliced]}` : ""}`;
      return {
        scheme: sliced,
        authority: p,
        path: pathname,
        normalizedPath: pathname.endsWith("/") ? pathname : `${pathname}/`,
        isIp: c,
      };
    },
    ge = (e, n) => e === n,
    pe = (e, n, t, r) => {
      if (n >= t || e.length < t) return null;
      if (!r) return e.substring(n, t);
      return e.substring(e.length - t, e.length - n);
    },
    Ee = (e) =>
      encodeURIComponent(e).replace(/[!*'()]/g, (n) => `%${n.charCodeAt(0).toString(16).toUpperCase()}`),
    Ne = {
      booleanEquals: ae,
      getAttr: D,
      isSet: ue,
      isValidHostLabel: m,
      not: de,
      parseURL: fe,
      stringEquals: ge,
      substring: pe,
      uriEncode: Ee,
    },
    b = (e, n) => {
      let t = [],
        r = { ...n.endpointParams, ...n.referenceRecord },
        s = 0;
      while (s < e.length) {
        let index = e.indexOf("{", s);
        if (index === -1) {
          t.push(e.slice(s));
          break;
        }
        t.push(e.slice(s, index));
        let index_2 = e.indexOf("}", index);
        if (index_2 === -1) {
          t.push(e.slice(index));
          break;
        }
        if (e[index + 1] === "{" && e[index_2 + 1] === "}")
          (t.push(e.slice(index + 1, index_2)), (s = index_2 + 2));
        let substring = e.substring(index + 1, index_2);
        if (substring.includes("#")) {
          let [l, c] = substring.split("#");
          t.push(D(r[l], c));
        } else t.push(r[substring]);
        s = index_2 + 1;
      }
      return t.join("");
    },
    he = ({ ref: ref }, n) => ({ ...n.endpointParams, ...n.referenceRecord })[ref],
    h = (e, n, t) => {
      if (typeof e === "string") return b(e, t);
      else if (e.fn) return F.callFunction(e, t);
      else if (e.ref) return he(e, t);
      throw new EndpointError(`'${n}': ${String(e)} is not a string, function or reference.`);
    },
    C = ({ fn: fn, argv: argv }, t) => {
      let mapped = argv.map((o) =>
          ["boolean", "number"].includes(typeof o) ? o : F.evaluateExpression(o, "arg", t),
        ),
        parts = fn.split(".");
      if (parts[0] in I && parts[1] != null) return I[parts[0]][parts[1]](...mapped);
      return Ne[fn](...mapped);
    },
    F = { evaluateExpression: h, callFunction: C },
    _e = ({ assign: assign, ...n }, t) => {
      if (assign && assign in t.referenceRecord)
        throw new EndpointError(`'${assign}' is already defined in Reference Record.`);
      let r = C(n, t);
      return (
        t.logger?.debug?.(`${N} evaluateCondition: ${d(n)} = ${d(r)}`),
        { result: r === "" ? !0 : !!r, ...(assign != null && { toAssign: { name: assign, value: r } }) }
      );
    },
    w = (e = [], n) => {
      let t = {};
      for (let r of e) {
        let { result: s, toAssign: toAssign } = _e(r, {
          ...n,
          referenceRecord: { ...n.referenceRecord, ...t },
        });
        if (!s) return { result: s };
        if (toAssign)
          ((t[toAssign.name] = toAssign.value),
            n.logger?.debug?.(`${N} assign: ${toAssign.name} := ${d(toAssign.value)}`));
      }
      return { result: !0, referenceRecord: t };
    },
    Re = (e, n) =>
      Object.entries(e).reduce(
        (t, [r, s]) => ({
          ...t,
          [r]: s.map((o) => {
            let i = h(o, "Header value entry", n);
            if (typeof i !== "string") throw new EndpointError(`Header '${r}' value '${i}' is not a string`);
            return i;
          }),
        }),
        {},
      ),
    y = (e, n) => Object.entries(e).reduce((t, [r, s]) => ({ ...t, [r]: G.getEndpointProperty(s, n) }), {}),
    L = (e, n) => {
      if (Array.isArray(e)) return e.map((t) => L(t, n));
      switch (typeof e) {
        case "string":
          return b(e, n);
        case "object":
          if (e === null) throw new EndpointError(`Unexpected endpoint property: ${e}`);
          return G.getEndpointProperties(e, n);
        case "boolean":
          return e;
        default:
          throw new EndpointError(`Unexpected endpoint property type: ${typeof e}`);
      }
    },
    G = { getEndpointProperty: L, getEndpointProperties: y },
    Se = (e, n) => {
      let t = h(e, "Endpoint URL", n);
      if (typeof t === "string")
        try {
          return new URL(t);
        } catch (error) {
          throw (console.error(`Failed to construct URL with ${t}`, error), error);
        }
      throw new EndpointError(`Endpoint URL must be a string, got ${typeof t}`);
    },
    Oe = (e, n) => {
      let { conditions: conditions, endpoint: endpoint } = e,
        { result: s, referenceRecord: referenceRecord } = w(conditions, n);
      if (!s) return;
      let i = { ...n, referenceRecord: { ...n.referenceRecord, ...referenceRecord } },
        { url: url, properties: properties, headers: headers } = endpoint;
      return (
        n.logger?.debug?.(`${N} Resolving endpoint from template: ${d(endpoint)}`),
        {
          ...(headers != null && { headers: Re(headers, i) }),
          ...(properties != null && { properties: y(properties, i) }),
          url: Se(url, i),
        }
      );
    },
    Ie = (e, n) => {
      let { conditions: conditions, error: error } = e,
        { result: s, referenceRecord: referenceRecord } = w(conditions, n);
      if (!s) return;
      throw new EndpointError(
        h(error, "Error", { ...n, referenceRecord: { ...n.referenceRecord, ...referenceRecord } }),
      );
    },
    V = (e, n) => {
      for (let t of e)
        if (t.type === "endpoint") {
          let r = Oe(t, n);
          if (r) return r;
        } else if (t.type === "error") Ie(t, n);
        else if (t.type === "tree") {
          let evaluateTreeRule = z.evaluateTreeRule(t, n);
          if (evaluateTreeRule) return evaluateTreeRule;
        } else throw new EndpointError(`Unknown endpoint rule: ${t}`);
      throw new EndpointError("Rules evaluation failed");
    },
    me = (e, n) => {
      let { conditions: conditions, rules: rules } = e,
        { result: s, referenceRecord: referenceRecord } = w(conditions, n);
      if (!s) return;
      return z.evaluateRules(rules, { ...n, referenceRecord: { ...n.referenceRecord, ...referenceRecord } });
    },
    z = { evaluateRules: V, evaluateTreeRule: me },
    we = (e, n) => {
      let { endpointParams: endpointParams, logger: logger } = n,
        { parameters: parameters, rules: rules } = e;
      n.logger?.debug?.(`${N} Initial EndpointParams: ${d(endpointParams)}`);
      let mapped = Object.entries(parameters)
        .filter(([, c]) => c.default != null)
        .map(([c, g]) => [c, g.default]);
      if (mapped.length > 0) for (let [c, g] of mapped) endpointParams[c] = endpointParams[c] ?? g;
      let mapped_2 = Object.entries(parameters)
        .filter(([, c]) => c.required)
        .map(([c]) => c);
      for (let c of mapped_2)
        if (endpointParams[c] == null) throw new EndpointError(`Missing required parameter: '${c}'`);
      let l = V(rules, { endpointParams: endpointParams, logger: logger, referenceRecord: {} });
      return (n.logger?.debug?.(`${N} Resolved endpoint: ${d(l)}`), l);
    };
  $e.EndpointCache = U;
  $e.EndpointError = EndpointError;
  $e.customEndpointFunctions = I;
  $e.isIpAddress = A;
  $e.isValidHostLabel = m;
  $e.resolveEndpoint = we;
});

export { YJ };
