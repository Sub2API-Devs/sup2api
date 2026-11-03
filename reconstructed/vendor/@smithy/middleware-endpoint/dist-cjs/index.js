/**
 * @smithy/middleware-endpoint/dist-cjs/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @smithy/middleware-endpoint@4.3.0..4.3.15
 * pieces: chunk-edce4vxq.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { hn } from "./adaptors/getEndpointFromConfig.js";
import { P4 } from "../../url-parser/dist-cjs/index.js";
import { EE } from "../../core/dist-cjs/index.js";
import { bD } from "../../util-middleware/dist-cjs/index.js";
import { Yns } from "../../middleware-serde/dist-cjs/index.js";

//@ chunk-edce4vxq.js:116495-120842 cjs-fingerprint
var pK = x(function (bu) {
  var pn = hn(),
    fn = P4(),
    lu = EE(),
    at = bD(),
    du = Yns(),
    hu = async (e) => {
      let t = e?.Bucket || "";
      if (typeof e.Bucket === "string")
        e.Bucket = t.replace(/#/g, encodeURIComponent("#")).replace(/\?/g, encodeURIComponent("?"));
      if (yu(t)) {
        if (e.ForcePathStyle === !0) throw Error("Path-style addressing cannot be used with ARN buckets");
      } else if (
        !gu(t) ||
        (t.indexOf(".") !== -1 && !String(e.Endpoint).startsWith("http:")) ||
        t.toLowerCase() !== t ||
        t.length < 3
      )
        e.ForcePathStyle = !0;
      if (e.DisableMultiRegionAccessPoints) ((e.disableMultiRegionAccessPoints = !0), (e.DisableMRAP = !0));
      return e;
    },
    fu = /^[a-z0-9][a-z0-9\.\-]{1,61}[a-z0-9]$/,
    pu = /(\d+\.){3}\d+/,
    mu = /\.\./,
    gu = (e) => fu.test(e) && !pu.test(e) && !mu.test(e),
    yu = (e) => {
      let [t, r, s, , , o] = e.split(":"),
        a = t === "arn" && e.split(":").length >= 6,
        c = Boolean(a && r && s && o);
      if (a && !c) throw Error(`Invalid ARN: ${e} was an invalid ARN.`);
      return c;
    },
    Eu = (e, t, r) => {
      let s = async () => {
        let o = r[e] ?? r[t];
        if (typeof o === "function") return o();
        return o;
      };
      if (e === "credentialScope" || t === "CredentialScope")
        return async () => {
          let o = typeof r.credentials === "function" ? await r.credentials() : r.credentials;
          return o?.credentialScope ?? o?.CredentialScope;
        };
      if (e === "accountId" || t === "AccountId")
        return async () => {
          let o = typeof r.credentials === "function" ? await r.credentials() : r.credentials;
          return o?.accountId ?? o?.AccountId;
        };
      if (e === "endpoint" || t === "endpoint")
        return async () => {
          if (r.isCustomEndpoint === !1) return;
          let o = await s();
          if (o && typeof o === "object") {
            if ("url" in o) return o.url.href;
            if ("hostname" in o) {
              let { protocol: protocol, hostname: hostname, port: port, path: path } = o;
              return `${protocol}//${hostname}${port ? ":" + port : ""}${path}`;
            }
          }
          return o;
        };
      return s;
    },
    sr = (e) => {
      if (typeof e === "object") {
        if ("url" in e) return fn.parseUrl(e.url);
        return e;
      }
      return fn.parseUrl(e);
    },
    mn = async (e, t, r, s) => {
      if (!r.isCustomEndpoint) {
        let c;
        if (r.serviceConfiguredEndpoint) c = await r.serviceConfiguredEndpoint();
        else c = await pn.getEndpointFromConfig(r.serviceId);
        if (c) ((r.endpoint = () => Promise.resolve(sr(c))), (r.isCustomEndpoint = !0));
      }
      let o = await gn(e, t, r);
      if (typeof r.endpointProvider !== "function") throw Error("config.endpointProvider is not set.");
      return r.endpointProvider(o, s);
    },
    gn = async (e, t, r) => {
      let s = {},
        o = t?.getEndpointParameterInstructions?.() || {};
      for (let [a, c] of Object.entries(o))
        switch (c.type) {
          case "staticContextParams":
            s[a] = c.value;
            break;
          case "contextParams":
            s[a] = e[c.name];
            break;
          case "clientContextParams":
          case "builtInParams":
            s[a] = await Eu(c.name, a, r)();
            break;
          case "operationContextParams":
            s[a] = c.get(e);
            break;
          default:
            throw Error("Unrecognized endpoint parameter instruction: " + JSON.stringify(c));
        }
      if (Object.keys(o).length === 0) Object.assign(s, r);
      if (String(r.serviceId).toLowerCase() === "s3") await hu(s);
      return s;
    },
    yn =
      ({ config: config, instructions: instructions }) =>
      (r, s) =>
      async (o) => {
        if (config.isCustomEndpoint) lu.setFeature(s, "ENDPOINT_OVERRIDE", "N");
        let a = await mn(
          o.input,
          {
            getEndpointParameterInstructions() {
              return instructions;
            },
          },
          { ...config },
          s,
        );
        ((s.endpointV2 = a), (s.authSchemes = a.properties?.authSchemes));
        let c = s.authSchemes?.[0];
        if (c) {
          ((s.signing_region = c.signingRegion), (s.signing_service = c.signingName));
          let f = at.getSmithyContext(s)?.selectedHttpAuthScheme?.httpAuthOption;
          if (f)
            f.signingProperties = Object.assign(
              f.signingProperties || {},
              {
                signing_region: c.signingRegion,
                signingRegion: c.signingRegion,
                signing_service: c.signingName,
                signingName: c.signingName,
                signingRegionSet: c.signingRegionSet,
              },
              c.properties,
            );
        }
        return r({ ...o });
      },
    En = {
      step: "serialize",
      tags: ["ENDPOINT_PARAMETERS", "ENDPOINT_V2", "ENDPOINT"],
      name: "endpointV2Middleware",
      override: !0,
      relation: "before",
      toMiddleware: du.serializerMiddlewareOption.name,
    },
    Su = (e, t) => ({
      applyToStack: (r) => {
        r.addRelativeTo(yn({ config: e, instructions: t }), En);
      },
    }),
    wu = (e) => {
      let t = e.tls ?? !0,
        {
          endpoint: endpoint,
          useDualstackEndpoint: useDualstackEndpoint,
          useFipsEndpoint: useFipsEndpoint,
        } = e,
        a = endpoint != null ? async () => sr(await at.normalizeProvider(endpoint)()) : void 0,
        merged = Object.assign(e, {
          endpoint: a,
          tls: t,
          isCustomEndpoint: !!endpoint,
          useDualstackEndpoint: at.normalizeProvider(useDualstackEndpoint ?? !1),
          useFipsEndpoint: at.normalizeProvider(useFipsEndpoint ?? !1),
        }),
        f = void 0;
      return (
        (merged.serviceConfiguredEndpoint = async () => {
          if (e.serviceId && !f) f = pn.getEndpointFromConfig(e.serviceId);
          return f;
        }),
        merged
      );
    },
    xu = (e) => {
      let { endpoint: endpoint } = e;
      if (endpoint === void 0)
        e.endpoint = async () => {
          throw Error(
            "@smithy/middleware-endpoint: (default endpointRuleSet) endpoint is not set - you must configure an endpoint.",
          );
        };
      return e;
    };
  bu.endpointMiddleware = yn;
  bu.endpointMiddlewareOptions = En;
  bu.getEndpointFromInstructions = mn;
  bu.getEndpointPlugin = Su;
  bu.resolveEndpointConfig = wu;
  bu.resolveEndpointRequiredConfig = xu;
  bu.resolveParams = gn;
  bu.toEndpointV1 = sr;
});

export { pK };
