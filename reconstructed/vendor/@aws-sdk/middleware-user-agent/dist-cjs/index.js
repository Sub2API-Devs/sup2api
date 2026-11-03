/**
 * @aws-sdk/middleware-user-agent/dist-cjs/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/middleware-user-agent@3.936.0..3.972.18
 * pieces: chunk-edce4vxq.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { EE } from "../../../@smithy/core/dist-cjs/index.js";
import { Iae } from "../../util-endpoints/dist-cjs/index.js";
import { Kg } from "../../../@smithy/protocol-http/dist-cjs/index.js";
import { Rx } from "../../core/dist-cjs/index.js";

//@ chunk-edce4vxq.js:111841-115054 cjs-fingerprint
var Oae = x(function (Qc) {
  var Bc = EE(),
    Lc = Iae(),
    Uc = Kg(),
    ie = Rx(),
    Qs = void 0;
  function Vc(e) {
    if (e === void 0) return !0;
    return typeof e === "string" && e.length <= 50;
  }
  function Fc(e) {
    let normalizeProvider = Bc.normalizeProvider(e.userAgentAppId ?? Qs),
      { customUserAgent: customUserAgent } = e;
    return Object.assign(e, {
      customUserAgent: typeof customUserAgent === "string" ? [[customUserAgent]] : customUserAgent,
      userAgentAppId: async () => {
        let s = await normalizeProvider();
        if (!Vc(s)) {
          let o = e.logger?.constructor?.name === "NoOpLogger" || !e.logger ? console : e.logger;
          if (typeof s !== "string") o?.warn("userAgentAppId must be a string or undefined.");
          else if (s.length > 50)
            o?.warn("The provided userAgentAppId exceeds the maximum length of 50 characters.");
        }
        return s;
      },
    });
  }
  var jc = /\d{12}\.ddb/;
  async function qc(e, t, r) {
    if (r.request?.headers?.["smithy-protocol"] === "rpc-v2-cbor")
      ie.setFeature(e, "PROTOCOL_RPC_V2_CBOR", "M");
    if (typeof t.retryStrategy === "function") {
      let retryStrategy = await t.retryStrategy();
      if (typeof retryStrategy.acquireInitialRetryToken === "function")
        if (retryStrategy.constructor?.name?.includes("Adaptive"))
          ie.setFeature(e, "RETRY_MODE_ADAPTIVE", "F");
        else ie.setFeature(e, "RETRY_MODE_STANDARD", "E");
      else ie.setFeature(e, "RETRY_MODE_LEGACY", "D");
    }
    if (typeof t.accountIdEndpointMode === "function") {
      let endpointV2 = e.endpointV2;
      if (String(endpointV2?.url?.hostname).match(jc)) ie.setFeature(e, "ACCOUNT_ID_ENDPOINT", "O");
      switch (await t.accountIdEndpointMode?.()) {
        case "disabled":
          ie.setFeature(e, "ACCOUNT_ID_MODE_DISABLED", "Q");
          break;
        case "preferred":
          ie.setFeature(e, "ACCOUNT_ID_MODE_PREFERRED", "P");
          break;
        case "required":
          ie.setFeature(e, "ACCOUNT_ID_MODE_REQUIRED", "R");
          break;
      }
    }
    let o = e.__smithy_context?.selectedHttpAuthScheme?.identity;
    if (o?.$source) {
      let a = o;
      if (a.accountId) ie.setFeature(e, "RESOLVED_ACCOUNT_ID", "T");
      for (let [c, d] of Object.entries(a.$source ?? {})) ie.setFeature(e, c, d);
    }
  }
  var Xs = "user-agent",
    tr = "x-amz-user-agent",
    Ws = " ",
    rr = "/",
    Hc = /[^!$%&'*+\-.^_`|~\w]/g,
    Gc = /[^!$%&'*+\-.^_`|~\w#]/g,
    Ks = "-",
    Xc = 1024;
  function Wc(e) {
    let t = "";
    for (let key in e) {
      let s = e[key];
      if (t.length + s.length + 1 <= Xc) {
        if (t.length) t += "," + s;
        else t += s;
        continue;
      }
      break;
    }
    return t;
  }
  var Ys = (e) => (t, r) => async (s) => {
      let { request: request } = s;
      if (!Uc.HttpRequest.isInstance(request)) return t(s);
      let { headers: headers } = request,
        c = r?.userAgent?.map(it) || [],
        mapped = (await e.defaultUserAgentProvider()).map(it);
      await qc(r, e, s);
      let f = r;
      mapped.push(`m/${Wc(Object.assign({}, r.__smithy_context?.features, f.__aws_sdk_context?.features))}`);
      let m = e?.customUserAgent?.map(it) || [],
        userAgentAppId = await e.userAgentAppId();
      if (userAgentAppId) mapped.push(it(["app", `${userAgentAppId}`]));
      let userAgentPrefix = Lc.getUserAgentPrefix(),
        joined = (userAgentPrefix ? [userAgentPrefix] : []).concat([...mapped, ...c, ...m]).join(Ws),
        joined_2 = [...mapped.filter((_) => _.startsWith("aws-sdk-")), ...m].join(Ws);
      if (e.runtime !== "browser") {
        if (joined_2) headers[tr] = headers[tr] ? `${headers[Xs]} ${joined_2}` : joined_2;
        headers[Xs] = joined;
      } else headers[tr] = joined;
      return t({ ...s, request: request });
    },
    it = (e) => {
      let joined = e[0]
          .split(rr)
          .map((c) => c.replace(Hc, Ks))
          .join(rr),
        r = e[1]?.replace(Gc, Ks),
        index = joined.indexOf(rr),
        substring = joined.substring(0, index),
        substring_2 = joined.substring(index + 1);
      if (substring === "api") substring_2 = substring_2.toLowerCase();
      return [substring, substring_2, r]
        .filter((c) => c && c.length > 0)
        .reduce((c, d, f) => {
          switch (f) {
            case 0:
              return d;
            case 1:
              return `${c}/${d}`;
            default:
              return `${c}#${d}`;
          }
        }, "");
    },
    Js = {
      name: "getUserAgentMiddleware",
      step: "build",
      priority: "low",
      tags: ["SET_USER_AGENT", "USER_AGENT"],
      override: !0,
    },
    Kc = (e) => ({
      applyToStack: (t) => {
        t.add(Ys(e), Js);
      },
    });
  Qc.DEFAULT_UA_APP_ID = Qs;
  Qc.getUserAgentMiddlewareOptions = Js;
  Qc.getUserAgentPlugin = Kc;
  Qc.resolveUserAgentConfig = Fc;
  Qc.userAgentMiddleware = Ys;
});

export { Oae };
