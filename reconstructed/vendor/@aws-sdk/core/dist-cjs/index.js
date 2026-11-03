/**
 * @aws-sdk/core/dist-cjs/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/core@3.936.0
 * pieces: chunk-0rkz0exm.js (3), chunk-edce4vxq.js (1)
 * attribution: esm-layout 2, esm-fingerprint 1, cjs-fingerprint 1
 */
import { Re, x } from "../../../../runtime/bun-runtime.js";
import { SD } from "./submodules/client/index.js";
import { Kg } from "../../../@smithy/protocol-http/dist-cjs/index.js";
import { EE } from "../../../@smithy/core/dist-cjs/index.js";
import { $h } from "../../../@smithy/property-provider/dist-cjs/index.js";
import { yat } from "../../../@smithy/signature-v4/dist-cjs/index.js";
import { Ut } from "../../../@smithy/core/dist-cjs/submodules/cbor/index.js";
import { _D } from "../../../@smithy/core/dist-cjs/submodules/schema/index.js";
import { ff } from "../../../@smithy/core/dist-cjs/submodules/client/index.js";
import { jRt } from "../../../@smithy/core/dist-cjs/submodules/protocols/index.js";
import { z6t } from "../../../@smithy/core/dist-cjs/submodules/serde/index.js";
import { base64Module } from "../../credential-provider-web-identity/dist-cjs/index.js";
import { IR } from "../../../@smithy/util-utf8/dist-cjs/index.js";
import { jt } from "../../xml-builder/dist-cjs/index.js";

//@ chunk-0rkz0exm.js:445-460 esm-layout
var a = Re(SD());
//@ chunk-0rkz0exm.js:460-500 esm-layout
var c = Kg(),
  d = EE(),
  l = $h(),
  u = SD(),
  S = yat();
//@ chunk-0rkz0exm.js:500-571 esm-fingerprint
var g_2 = (e) => `AWS_BEARER_TOKEN_${e.replace(/[\s-]/g, "_").toUpperCase()}`;
//@ chunk-edce4vxq.js:75638-111841 cjs-fingerprint
var Rx = x(function (Ja) {
  var Ht = Kg(),
    me = EE(),
    Ns = $h(),
    Da = SD(),
    Ts = yat(),
    _s = Ut(),
    L = _D(),
    de = ff(),
    Q = jRt(),
    G = z6t(),
    Fe = base64Module(),
    Ds = IR(),
    re = jt(),
    qt = { warningEmitted: !1 },
    Pa = (e) => {
      if (e && !qt.warningEmitted && parseInt(e.substring(1, e.indexOf("."))) < 18)
        ((qt.warningEmitted = !0),
          process.emitWarning(`NodeDeprecationWarning: The AWS SDK for JavaScript (v3) will
no longer support Node.js 16.x on January 6, 2025.

To continue receiving updates to AWS services, bug fixes, and security
updates please upgrade to a supported Node.js LTS version.

More information can be found at: https://a.co/74kJMmI`));
    };
  function ka(e, t, r) {
    if (!e.$source) e.$source = {};
    return ((e.$source[t] = r), e);
  }
  function va(e, t, r) {
    if (!e.__aws_sdk_context) e.__aws_sdk_context = { features: {} };
    else if (!e.__aws_sdk_context.features) e.__aws_sdk_context.features = {};
    e.__aws_sdk_context.features[t] = r;
  }
  function za(e, t, r) {
    if (!e.$source) e.$source = {};
    return ((e.$source[t] = r), e);
  }
  var Cs = (e) => (Ht.HttpResponse.isInstance(e) ? (e.headers?.date ?? e.headers?.Date) : void 0),
    Gt = (e) => new Date(Date.now() + e),
    $a = (e, t) => Math.abs(Gt(t).getTime() - e) >= 300000,
    As = (e, t) => {
      let parse = Date.parse(e);
      if ($a(parse, t)) return parse - Date.now();
      return t;
    },
    Ve = (e, t) => {
      if (!t) throw Error(`Property \`${e}\` is not resolved for AWS SDK SigV4Auth`);
      return t;
    },
    Xt = async (e) => {
      let t = Ve("context", e.context),
        r = Ve("config", e.config),
        s = t.endpointV2?.properties?.authSchemes?.[0],
        a = await Ve("signer", r.signer)(s),
        c = e?.signingRegion,
        d = e?.signingRegionSet,
        f = e?.signingName;
      return { config: r, signer: a, signingRegion: c, signingRegionSet: d, signingName: f };
    };
  class tt {
    async sign(e, t, r) {
      if (!Ht.HttpRequest.isInstance(e))
        throw Error("The request is not an instance of `HttpRequest` and cannot be signed");
      let s = await Xt(r),
        { config: config, signer: signer } = s,
        { signingRegion: signingRegion, signingName: signingName } = s,
        context = r.context;
      if (context?.authSchemes?.length ?? !1) {
        let [y, N] = context.authSchemes;
        if (y?.name === "sigv4a" && N?.name === "sigv4")
          ((signingRegion = N?.signingRegion ?? signingRegion),
            (signingName = N?.signingName ?? signingName));
      }
      return await signer.sign(e, {
        signingDate: Gt(config.systemClockOffset),
        signingRegion: signingRegion,
        signingService: signingName,
      });
    }
    errorHandler(e) {
      return (t) => {
        let r = t.ServerTime ?? Cs(t.$response);
        if (r) {
          let s = Ve("config", e.config),
            systemClockOffset = s.systemClockOffset;
          if (
            ((s.systemClockOffset = As(r, s.systemClockOffset)),
            s.systemClockOffset !== systemClockOffset && t.$metadata)
          )
            t.$metadata.clockSkewCorrected = !0;
        }
        throw t;
      };
    }
    successHandler(e, t) {
      let r = Cs(e);
      if (r) {
        let s = Ve("config", t.config);
        s.systemClockOffset = As(r, s.systemClockOffset);
      }
    }
  }
  var Ba = tt;
  class Ps extends tt {
    async sign(e, t, r) {
      if (!Ht.HttpRequest.isInstance(e))
        throw Error("The request is not an instance of `HttpRequest` and cannot be signed");
      let {
          config: config,
          signer: signer,
          signingRegion: signingRegion,
          signingRegionSet: signingRegionSet,
          signingName: signingName,
        } = await Xt(r),
        joined = ((await config.sigv4aSigningRegionSet?.()) ?? signingRegionSet ?? [signingRegion]).join(",");
      return await signer.sign(e, {
        signingDate: Gt(config.systemClockOffset),
        signingRegion: joined,
        signingService: signingName,
      });
    }
  }
  var Rs = (e) => (typeof e === "string" && e.length > 0 ? e.split(",").map((t) => t.trim()) : []),
    ks = (e) => `AWS_BEARER_TOKEN_${e.replace(/[\s-]/g, "_").toUpperCase()}`,
    Is = "AWS_AUTH_SCHEME_PREFERENCE",
    Os = "auth_scheme_preference",
    La = {
      environmentVariableSelector: (e, t) => {
        if (t?.signingName) {
          if (ks(t.signingName) in e) return ["httpBearerAuth"];
        }
        if (!(Is in e)) return;
        return Rs(e[Is]);
      },
      configFileSelector: (e) => {
        if (!(Os in e)) return;
        return Rs(e[Os]);
      },
      default: [],
    },
    Ua = (e) => ((e.sigv4aSigningRegionSet = me.normalizeProvider(e.sigv4aSigningRegionSet)), e),
    Va = {
      environmentVariableSelector(e) {
        if (e.AWS_SIGV4A_SIGNING_REGION_SET)
          return e.AWS_SIGV4A_SIGNING_REGION_SET.split(",").map((t) => t.trim());
        throw new Ns.ProviderError("AWS_SIGV4A_SIGNING_REGION_SET not set in env.", { tryNextLink: !0 });
      },
      configFileSelector(e) {
        if (e.sigv4a_signing_region_set)
          return (e.sigv4a_signing_region_set ?? "").split(",").map((t) => t.trim());
        throw new Ns.ProviderError("sigv4a_signing_region_set not set in profile.", { tryNextLink: !0 });
      },
      default: void 0,
    },
    vs = (e) => {
      let credentials = e.credentials,
        r = !!e.credentials,
        s = void 0;
      (Object.defineProperty(e, "credentials", {
        set(m) {
          if (m && m !== credentials && m !== s) r = !0;
          credentials = m;
          let y = ja(e, { credentials: credentials, credentialDefaultProvider: e.credentialDefaultProvider }),
            N = qa(e, y);
          if (r && !N.attributed)
            ((s = async (b) => N(b).then((T) => Da.setCredentialFeature(T, "CREDENTIALS_CODE", "e"))),
              (s.memoized = N.memoized),
              (s.configBound = N.configBound),
              (s.attributed = !0));
          else s = N;
        },
        get() {
          return s;
        },
        enumerable: !0,
        configurable: !0,
      }),
        (e.credentials = credentials));
      let {
          signingEscapePath: signingEscapePath = !0,
          systemClockOffset: systemClockOffset = e.systemClockOffset || 0,
          sha256: sha256,
        } = e,
        d;
      if (e.signer) d = me.normalizeProvider(e.signer);
      else if (e.regionInfoProvider)
        d = () =>
          me
            .normalizeProvider(e.region)()
            .then(async (m) => [
              (await e.regionInfoProvider(m, {
                useFipsEndpoint: await e.useFipsEndpoint(),
                useDualstackEndpoint: await e.useDualstackEndpoint(),
              })) || {},
              m,
            ])
            .then(([m, y]) => {
              let { signingRegion: signingRegion, signingService: signingService } = m;
              ((e.signingRegion = e.signingRegion || signingRegion || y),
                (e.signingName = e.signingName || signingService || e.serviceId));
              let T = {
                ...e,
                credentials: e.credentials,
                region: e.signingRegion,
                service: e.signingName,
                sha256: sha256,
                uriEscapePath: signingEscapePath,
              };
              return new (e.signerConstructor || Ts.SignatureV4)(T);
            });
      else
        d = async (m) => {
          m = Object.assign(
            {},
            {
              name: "sigv4",
              signingName: e.signingName || e.defaultSigningName,
              signingRegion: await me.normalizeProvider(e.region)(),
              properties: {},
            },
            m,
          );
          let signingRegion = m.signingRegion,
            signingName = m.signingName;
          ((e.signingRegion = e.signingRegion || signingRegion),
            (e.signingName = e.signingName || signingName || e.serviceId));
          let b = {
            ...e,
            credentials: e.credentials,
            region: e.signingRegion,
            service: e.signingName,
            sha256: sha256,
            uriEscapePath: signingEscapePath,
          };
          return new (e.signerConstructor || Ts.SignatureV4)(b);
        };
      return Object.assign(e, {
        systemClockOffset: systemClockOffset,
        signingEscapePath: signingEscapePath,
        signer: d,
      });
    },
    Fa = vs;
  function ja(e, { credentials: credentials, credentialDefaultProvider: credentialDefaultProvider }) {
    let s;
    if (credentials)
      if (!credentials?.memoized)
        s = me.memoizeIdentityProvider(credentials, me.isIdentityExpired, me.doesIdentityRequireRefresh);
      else s = credentials;
    else if (credentialDefaultProvider)
      s = me.normalizeProvider(credentialDefaultProvider(Object.assign({}, e, { parentClientConfig: e })));
    else
      s = async () => {
        throw Error(
          "@aws-sdk/core::resolveAwsSdkSigV4Config - `credentials` not provided and no credentialDefaultProvider was configured.",
        );
      };
    return ((s.memoized = !0), s);
  }
  function qa(e, t) {
    if (t.configBound) return t;
    let r = async (s) => t({ ...s, callerClientConfig: e });
    return ((r.memoized = t.memoized), (r.configBound = !0), r);
  }
  class Ie {
    queryCompat;
    constructor(e = !1) {
      this.queryCompat = e;
    }
    resolveRestContentType(e, t) {
      let memberSchemas = t.getMemberSchemas(),
        found = Object.values(memberSchemas).find((o) => !!o.getMergedTraits().httpPayload);
      if (found) {
        let mediaType = found.getMergedTraits().mediaType;
        if (mediaType) return mediaType;
        else if (found.isStringSchema()) return "text/plain";
        else if (found.isBlobSchema()) return "application/octet-stream";
        else return e;
      } else if (!t.isUnitSchema()) {
        if (
          Object.values(memberSchemas).find((a) => {
            let {
              httpQuery: httpQuery,
              httpQueryParams: httpQueryParams,
              httpHeader: httpHeader,
              httpLabel: httpLabel,
              httpPrefixHeaders: httpPrefixHeaders,
            } = a.getMergedTraits();
            return (
              !httpQuery && !httpQueryParams && !httpHeader && !httpLabel && httpPrefixHeaders === void 0
            );
          })
        )
          return e;
      }
    }
    async getErrorSchemaOrThrowBaseException(e, t, r, s, o, a) {
      let c = t,
        d = e;
      if (e.includes("#")) [c, d] = e.split("#");
      let f = { $metadata: o, $fault: r.statusCode < 500 ? "client" : "server" },
        m = L.TypeRegistry.for(c);
      try {
        return { errorSchema: a?.(m, d) ?? m.getSchema(e), errorMetadata: f };
      } catch (error) {
        s.message = s.message ?? s.Message ?? "UnknownError";
        let N = L.TypeRegistry.for("smithy.ts.sdk.synthetic." + c),
          baseException = N.getBaseException();
        if (baseException) {
          let T = N.getErrorCtor(baseException) ?? Error;
          throw this.decorateServiceException(Object.assign(new T({ name: d }), f), s);
        }
        throw this.decorateServiceException(Object.assign(Error(d), f), s);
      }
    }
    decorateServiceException(e, t = {}) {
      if (this.queryCompat) {
        let r = e.Message ?? t.Message,
          decorateServiceException = de.decorateServiceException(e, t);
        if (r) ((decorateServiceException.Message = r), (decorateServiceException.message = r));
        return decorateServiceException;
      }
      return de.decorateServiceException(e, t);
    }
    setQueryCompatError(e, t) {
      let r = t.headers?.["x-amzn-query-error"];
      if (e !== void 0 && r != null) {
        let [s, o] = r.split(";"),
          entries = Object.entries(e),
          c = { Code: s, Type: o };
        Object.assign(e, c);
        for (let [d, f] of entries) c[d] = f;
        (delete c.__type, (e.Error = c));
      }
    }
    queryCompatOutput(e, t) {
      if (e.Error) t.Error = e.Error;
      if (e.Type) t.Type = e.Type;
      if (e.Code) t.Code = e.Code;
    }
  }
  class zs extends _s.SmithyRpcV2CborProtocol {
    awsQueryCompatible;
    mixin;
    constructor({ defaultNamespace: e, awsQueryCompatible: t }) {
      super({ defaultNamespace: e });
      ((this.awsQueryCompatible = !!t), (this.mixin = new Ie(this.awsQueryCompatible)));
    }
    async serializeRequest(e, t, r) {
      let serializeRequest = await super.serializeRequest(e, t, r);
      if (this.awsQueryCompatible) serializeRequest.headers["x-amzn-query-mode"] = "true";
      return serializeRequest;
    }
    async handleError(e, t, r, s, o) {
      if (this.awsQueryCompatible) this.mixin.setQueryCompatError(s, r);
      let a = _s.loadSmithyRpcV2CborErrorCode(r, s) ?? "Unknown",
        { errorSchema: errorSchema, errorMetadata: errorMetadata } =
          await this.mixin.getErrorSchemaOrThrowBaseException(a, this.options.defaultNamespace, r, s, o),
        of = L.NormalizedSchema.of(errorSchema),
        m = s.message ?? s.Message ?? "Unknown",
        N = new (L.TypeRegistry.for(errorSchema[1]).getErrorCtor(errorSchema) ?? Error)(m),
        b = {};
      for (let [T, _] of of.structIterator()) b[T] = this.deserializer.readValue(_, s[T]);
      if (this.awsQueryCompatible) this.mixin.queryCompatOutput(s, b);
      throw this.mixin.decorateServiceException(
        Object.assign(N, errorMetadata, { $fault: of.getMergedTraits().error, message: m }, b),
        s,
      );
    }
  }
  var Ha = (e) => {
      if (e == null) return e;
      if (typeof e === "number" || typeof e === "bigint") {
        let t = Error(`Received number ${e} where a string was expected.`);
        return ((t.name = "Warning"), console.warn(t), String(e));
      }
      if (typeof e === "boolean") {
        let t = Error(`Received boolean ${e} where a string was expected.`);
        return ((t.name = "Warning"), console.warn(t), String(e));
      }
      return e;
    },
    Ga = (e) => {
      if (e == null) return e;
      if (typeof e === "string") {
        let lower = e.toLowerCase();
        if (e !== "" && lower !== "false" && lower !== "true") {
          let r = Error(`Received string "${e}" where a boolean was expected.`);
          ((r.name = "Warning"), console.warn(r));
        }
        return e !== "" && lower !== "false";
      }
      return e;
    },
    Xa = (e) => {
      if (e == null) return e;
      if (typeof e === "string") {
        let t = Number(e);
        if (t.toString() !== e) {
          let r = Error(`Received string "${e}" where a number was expected.`);
          return ((r.name = "Warning"), console.warn(r), e);
        }
        return t;
      }
      return e;
    };
  class ge {
    serdeContext;
    setSerdeContext(e) {
      this.serdeContext = e;
    }
  }
  function Wa(e, t, r) {
    if (r?.source) {
      let source = r.source;
      if (typeof t === "number") {
        if (t > Number.MAX_SAFE_INTEGER || t < Number.MIN_SAFE_INTEGER || source !== String(t))
          if (source.includes(".")) return new G.NumericValue(source, "bigDecimal");
          else return BigInt(source);
      }
    }
    return t;
  }
  var $s = (e, t) => de.collectBody(e, t).then((r) => (t?.utf8Encoder ?? Ds.toUtf8)(r)),
    Wt = (e, t) =>
      $s(e, t).then((r) => {
        if (r.length)
          try {
            return JSON.parse(r);
          } catch (error) {
            if (error?.name === "SyntaxError")
              Object.defineProperty(error, "$responseBodyText", { value: r });
            throw error;
          }
        return {};
      }),
    Ka = async (e, t) => {
      let r = await Wt(e, t);
      return ((r.message = r.message ?? r.Message), r);
    },
    Kt = (e, t) => {
      let r = (a, c) => Object.keys(a).find((d) => d.toLowerCase() === c.toLowerCase()),
        s = (a) => {
          let c = a;
          if (typeof c === "number") c = c.toString();
          if (c.indexOf(",") >= 0) c = c.split(",")[0];
          if (c.indexOf(":") >= 0) c = c.split(":")[0];
          if (c.indexOf("#") >= 0) c = c.split("#")[1];
          return c;
        },
        o = r(e.headers, "x-amzn-errortype");
      if (o !== void 0) return s(e.headers[o]);
      if (t && typeof t === "object") {
        let a = r(t, "code");
        if (a && t[a] !== void 0) return s(t[a]);
        if (t.__type !== void 0) return s(t.__type);
      }
    };
  class Qt extends ge {
    settings;
    constructor(e) {
      super();
      this.settings = e;
    }
    async read(e, t) {
      return this._read(e, typeof t === "string" ? JSON.parse(t, Wa) : await Wt(t, this.serdeContext));
    }
    readObject(e, t) {
      return this._read(e, t);
    }
    _read(e, t) {
      let r = t !== null && typeof t === "object",
        of = L.NormalizedSchema.of(e);
      if (of.isListSchema() && Array.isArray(t)) {
        let valueSchema = of.getValueSchema(),
          c = [],
          d = !!of.getMergedTraits().sparse;
        for (let f of t) if (d || f != null) c.push(this._read(valueSchema, f));
        return c;
      } else if (of.isMapSchema() && r) {
        let valueSchema = of.getValueSchema(),
          c = {},
          d = !!of.getMergedTraits().sparse;
        for (let [f, m] of Object.entries(t)) if (d || m != null) c[f] = this._read(valueSchema, m);
        return c;
      } else if (of.isStructSchema() && r) {
        let a = {};
        for (let [c, d] of of.structIterator()) {
          let f = this.settings.jsonName ? (d.getMergedTraits().jsonName ?? c) : c,
            _read = this._read(d, t[f]);
          if (_read != null) a[c] = _read;
        }
        return a;
      }
      if (of.isBlobSchema() && typeof t === "string") return Fe.fromBase64(t);
      let mediaType = of.getMergedTraits().mediaType;
      if (of.isStringSchema() && typeof t === "string" && mediaType) {
        if (mediaType === "application/json" || mediaType.endsWith("+json")) return G.LazyJsonString.from(t);
      }
      if (of.isTimestampSchema() && t != null)
        switch (Q.determineTimestampFormat(of, this.settings)) {
          case 5:
            return G.parseRfc3339DateTimeWithOffset(t);
          case 6:
            return G.parseRfc7231DateTime(t);
          case 7:
            return G.parseEpochTimestamp(t);
          default:
            return (
              console.warn("Missing timestamp format, parsing value with Date constructor:", t),
              new Date(t)
            );
        }
      if (of.isBigIntegerSchema() && (typeof t === "number" || typeof t === "string")) return BigInt(t);
      if (of.isBigDecimalSchema() && t != null) {
        if (t instanceof G.NumericValue) return t;
        let a = t;
        if (a.type === "bigDecimal" && "string" in a) return new G.NumericValue(a.string, a.type);
        return new G.NumericValue(String(t), "bigDecimal");
      }
      if (of.isNumericSchema() && typeof t === "string")
        switch (t) {
          case "Infinity":
            return 1 / 0;
          case "-Infinity":
            return -1 / 0;
          case "NaN":
            return NaN;
        }
      if (of.isDocumentSchema())
        if (r) {
          let a = Array.isArray(t) ? [] : {};
          for (let [c, d] of Object.entries(t))
            if (d instanceof G.NumericValue) a[c] = d;
            else a[c] = this._read(of, d);
          return a;
        } else return structuredClone(t);
      return t;
    }
  }
  var fromCharCode = String.fromCharCode(925);
  class Bs {
    values = new Map();
    counter = 0;
    stage = 0;
    createReplacer() {
      if (this.stage === 1) throw Error("@aws-sdk/core/protocols - JsonReplacer already created.");
      if (this.stage === 2) throw Error("@aws-sdk/core/protocols - JsonReplacer exhausted.");
      return (
        (this.stage = 1),
        (e, t) => {
          if (t instanceof G.NumericValue) {
            let r = `${fromCharCode + "nv" + this.counter++}_` + t.string;
            return (this.values.set(`"${r}"`, t.string), r);
          }
          if (typeof t === "bigint") {
            let str = t.toString(),
              s = `${fromCharCode + "b" + this.counter++}_` + str;
            return (this.values.set(`"${s}"`, str), s);
          }
          return t;
        }
      );
    }
    replaceInJson(e) {
      if (this.stage === 0) throw Error("@aws-sdk/core/protocols - JsonReplacer not created yet.");
      if (this.stage === 2) throw Error("@aws-sdk/core/protocols - JsonReplacer exhausted.");
      if (((this.stage = 2), this.counter === 0)) return e;
      for (let [t, r] of this.values) e = e.replace(t, r);
      return e;
    }
  }
  class Yt extends ge {
    settings;
    buffer;
    rootSchema;
    constructor(e) {
      super();
      this.settings = e;
    }
    write(e, t) {
      ((this.rootSchema = L.NormalizedSchema.of(e)), (this.buffer = this._write(this.rootSchema, t)));
    }
    writeDiscriminatedDocument(e, t) {
      if ((this.write(e, t), typeof this.buffer === "object"))
        this.buffer.__type = L.NormalizedSchema.of(e).getName(!0);
    }
    flush() {
      let { rootSchema: rootSchema } = this;
      if (((this.rootSchema = void 0), rootSchema?.isStructSchema() || rootSchema?.isDocumentSchema())) {
        let t = new Bs();
        return t.replaceInJson(JSON.stringify(this.buffer, t.createReplacer(), 0));
      }
      return this.buffer;
    }
    _write(e, t, r) {
      let s = t !== null && typeof t === "object",
        of = L.NormalizedSchema.of(e);
      if (of.isListSchema() && Array.isArray(t)) {
        let valueSchema = of.getValueSchema(),
          c = [],
          d = !!of.getMergedTraits().sparse;
        for (let f of t) if (d || f != null) c.push(this._write(valueSchema, f));
        return c;
      } else if (of.isMapSchema() && s) {
        let valueSchema = of.getValueSchema(),
          c = {},
          d = !!of.getMergedTraits().sparse;
        for (let [f, m] of Object.entries(t)) if (d || m != null) c[f] = this._write(valueSchema, m);
        return c;
      } else if (of.isStructSchema() && s) {
        let a = {};
        for (let [c, d] of of.structIterator()) {
          let f = this.settings.jsonName ? (d.getMergedTraits().jsonName ?? c) : c,
            _write = this._write(d, t[c], of);
          if (_write !== void 0) a[f] = _write;
        }
        return a;
      }
      if (t === null && r?.isStructSchema()) return;
      if (
        (of.isBlobSchema() && (t instanceof Uint8Array || typeof t === "string")) ||
        (of.isDocumentSchema() && t instanceof Uint8Array)
      ) {
        if (of === this.rootSchema) return t;
        return (this.serdeContext?.base64Encoder ?? Fe.toBase64)(t);
      }
      if ((of.isTimestampSchema() || of.isDocumentSchema()) && t instanceof Date)
        switch (Q.determineTimestampFormat(of, this.settings)) {
          case 5:
            return t.toISOString().replace(".000Z", "Z");
          case 6:
            return G.dateToUtcString(t);
          case 7:
            return t.getTime() / 1000;
          default:
            return (console.warn("Missing timestamp format, using epoch seconds", t), t.getTime() / 1000);
        }
      if (of.isNumericSchema() && typeof t === "number") {
        if (Math.abs(t) === 1 / 0 || isNaN(t)) return String(t);
      }
      if (of.isStringSchema()) {
        if (typeof t > "u" && of.isIdempotencyToken()) return G.generateIdempotencyToken();
        let mediaType = of.getMergedTraits().mediaType;
        if (t != null && mediaType) {
          if (mediaType === "application/json" || mediaType.endsWith("+json"))
            return G.LazyJsonString.from(t);
        }
      }
      if (of.isDocumentSchema())
        if (s) {
          let a = Array.isArray(t) ? [] : {};
          for (let [c, d] of Object.entries(t))
            if (d instanceof G.NumericValue) a[c] = d;
            else a[c] = this._write(of, d);
          return a;
        } else return structuredClone(t);
      return t;
    }
  }
  class rt extends ge {
    settings;
    constructor(e) {
      super();
      this.settings = e;
    }
    createSerializer() {
      let e = new Yt(this.settings);
      return (e.setSerdeContext(this.serdeContext), e);
    }
    createDeserializer() {
      let e = new Qt(this.settings);
      return (e.setSerdeContext(this.serdeContext), e);
    }
  }
  class st extends Q.RpcProtocol {
    serializer;
    deserializer;
    serviceTarget;
    codec;
    mixin;
    awsQueryCompatible;
    constructor({ defaultNamespace: e, serviceTarget: t, awsQueryCompatible: r }) {
      super({ defaultNamespace: e });
      ((this.serviceTarget = t),
        (this.codec = new rt({ timestampFormat: { useTrait: !0, default: 7 }, jsonName: !1 })),
        (this.serializer = this.codec.createSerializer()),
        (this.deserializer = this.codec.createDeserializer()),
        (this.awsQueryCompatible = !!r),
        (this.mixin = new Ie(this.awsQueryCompatible)));
    }
    async serializeRequest(e, t, r) {
      let serializeRequest = await super.serializeRequest(e, t, r);
      if (!serializeRequest.path.endsWith("/")) serializeRequest.path += "/";
      if (
        (Object.assign(serializeRequest.headers, {
          "content-type": `application/x-amz-json-${this.getJsonRpcVersion()}`,
          "x-amz-target": `${this.serviceTarget}.${e.name}`,
        }),
        this.awsQueryCompatible)
      )
        serializeRequest.headers["x-amzn-query-mode"] = "true";
      if (L.deref(e.input) === "unit" || !serializeRequest.body) serializeRequest.body = "{}";
      return serializeRequest;
    }
    getPayloadCodec() {
      return this.codec;
    }
    async handleError(e, t, r, s, o) {
      if (this.awsQueryCompatible) this.mixin.setQueryCompatError(s, r);
      let a = Kt(r, s) ?? "Unknown",
        { errorSchema: errorSchema, errorMetadata: errorMetadata } =
          await this.mixin.getErrorSchemaOrThrowBaseException(a, this.options.defaultNamespace, r, s, o),
        of = L.NormalizedSchema.of(errorSchema),
        m = s.message ?? s.Message ?? "Unknown",
        N = new (L.TypeRegistry.for(errorSchema[1]).getErrorCtor(errorSchema) ?? Error)(m),
        b = {};
      for (let [T, _] of of.structIterator()) {
        let I = _.getMergedTraits().jsonName ?? T;
        b[T] = this.codec.createDeserializer().readObject(_, s[I]);
      }
      if (this.awsQueryCompatible) this.mixin.queryCompatOutput(s, b);
      throw this.mixin.decorateServiceException(
        Object.assign(N, errorMetadata, { $fault: of.getMergedTraits().error, message: m }, b),
        s,
      );
    }
  }
  class Ls extends st {
    constructor({ defaultNamespace: e, serviceTarget: t, awsQueryCompatible: r }) {
      super({ defaultNamespace: e, serviceTarget: t, awsQueryCompatible: r });
    }
    getShapeId() {
      return "aws.protocols#awsJson1_0";
    }
    getJsonRpcVersion() {
      return "1.0";
    }
    getDefaultContentType() {
      return "application/x-amz-json-1.0";
    }
  }
  class Us extends st {
    constructor({ defaultNamespace: e, serviceTarget: t, awsQueryCompatible: r }) {
      super({ defaultNamespace: e, serviceTarget: t, awsQueryCompatible: r });
    }
    getShapeId() {
      return "aws.protocols#awsJson1_1";
    }
    getJsonRpcVersion() {
      return "1.1";
    }
    getDefaultContentType() {
      return "application/x-amz-json-1.1";
    }
  }
  class Vs extends Q.HttpBindingProtocol {
    serializer;
    deserializer;
    codec;
    mixin = new Ie();
    constructor({ defaultNamespace: e }) {
      super({ defaultNamespace: e });
      let t = { timestampFormat: { useTrait: !0, default: 7 }, httpBindings: !0, jsonName: !0 };
      ((this.codec = new rt(t)),
        (this.serializer = new Q.HttpInterceptingShapeSerializer(this.codec.createSerializer(), t)),
        (this.deserializer = new Q.HttpInterceptingShapeDeserializer(this.codec.createDeserializer(), t)));
    }
    getShapeId() {
      return "aws.protocols#restJson1";
    }
    getPayloadCodec() {
      return this.codec;
    }
    setSerdeContext(e) {
      (this.codec.setSerdeContext(e), super.setSerdeContext(e));
    }
    async serializeRequest(e, t, r) {
      let serializeRequest = await super.serializeRequest(e, t, r),
        of = L.NormalizedSchema.of(e.input);
      if (!serializeRequest.headers["content-type"]) {
        let restContentType = this.mixin.resolveRestContentType(this.getDefaultContentType(), of);
        if (restContentType) serializeRequest.headers["content-type"] = restContentType;
      }
      if (
        serializeRequest.body == null &&
        serializeRequest.headers["content-type"] === this.getDefaultContentType()
      )
        serializeRequest.body = "{}";
      return serializeRequest;
    }
    async deserializeResponse(e, t, r) {
      let deserializeResponse = await super.deserializeResponse(e, t, r),
        of = L.NormalizedSchema.of(e.output);
      for (let [a, c] of of.structIterator())
        if (c.getMemberTraits().httpPayload && !(a in deserializeResponse)) deserializeResponse[a] = null;
      return deserializeResponse;
    }
    async handleError(e, t, r, s, o) {
      let a = Kt(r, s) ?? "Unknown",
        { errorSchema: errorSchema, errorMetadata: errorMetadata } =
          await this.mixin.getErrorSchemaOrThrowBaseException(a, this.options.defaultNamespace, r, s, o),
        of = L.NormalizedSchema.of(errorSchema),
        m = s.message ?? s.Message ?? "Unknown",
        N = new (L.TypeRegistry.for(errorSchema[1]).getErrorCtor(errorSchema) ?? Error)(m);
      await this.deserializeHttpMessage(errorSchema, t, r, s);
      let b = {};
      for (let [T, _] of of.structIterator()) {
        let I = _.getMergedTraits().jsonName ?? T;
        b[T] = this.codec.createDeserializer().readObject(_, s[I]);
      }
      throw this.mixin.decorateServiceException(
        Object.assign(N, errorMetadata, { $fault: of.getMergedTraits().error, message: m }, b),
        s,
      );
    }
    getDefaultContentType() {
      return "application/json";
    }
  }
  var Qa = (e) => {
    if (e == null) return;
    if (typeof e === "object" && "__type" in e) delete e.__type;
    return de.expectUnion(e);
  };
  class nt extends ge {
    settings;
    stringDeserializer;
    constructor(e) {
      super();
      ((this.settings = e), (this.stringDeserializer = new Q.FromStringShapeDeserializer(e)));
    }
    setSerdeContext(e) {
      ((this.serdeContext = e), this.stringDeserializer.setSerdeContext(e));
    }
    read(e, t, r) {
      let of = L.NormalizedSchema.of(e),
        memberSchemas = of.getMemberSchemas();
      if (
        of.isStructSchema() &&
        of.isMemberSchema() &&
        !!Object.values(memberSchemas).find((f) => !!f.getMemberTraits().eventPayload)
      ) {
        let f = {},
          m = Object.keys(memberSchemas)[0];
        if (memberSchemas[m].isBlobSchema()) f[m] = t;
        else f[m] = this.read(memberSchemas[m], t);
        return f;
      }
      let c = (this.serdeContext?.utf8Encoder ?? Ds.toUtf8)(t),
        xml = this.parseXml(c);
      return this.readSchema(e, r ? xml[r] : xml);
    }
    readSchema(e, t) {
      let of = L.NormalizedSchema.of(e);
      if (of.isUnitSchema()) return;
      let mergedTraits = of.getMergedTraits();
      if (of.isListSchema() && !Array.isArray(t)) return this.readSchema(of, [t]);
      if (t == null) return t;
      if (typeof t === "object") {
        let o = !!mergedTraits.sparse,
          a = !!mergedTraits.xmlFlattened;
        if (of.isListSchema()) {
          let valueSchema = of.getValueSchema(),
            f = [],
            m = valueSchema.getMergedTraits().xmlName ?? "member",
            y = a ? t : (t[0] ?? t)[m],
            N = Array.isArray(y) ? y : [y];
          for (let b of N) if (b != null || o) f.push(this.readSchema(valueSchema, b));
          return f;
        }
        let c = {};
        if (of.isMapSchema()) {
          let keySchema = of.getKeySchema(),
            valueSchema = of.getValueSchema(),
            m;
          if (a) m = Array.isArray(t) ? t : [t];
          else m = Array.isArray(t.entry) ? t.entry : [t.entry];
          let y = keySchema.getMergedTraits().xmlName ?? "key",
            N = valueSchema.getMergedTraits().xmlName ?? "value";
          for (let b of m) {
            let T = b[y],
              _ = b[N];
            if (_ != null || o) c[T] = this.readSchema(valueSchema, _);
          }
          return c;
        }
        if (of.isStructSchema()) {
          for (let [d, f] of of.structIterator()) {
            let mergedTraits = f.getMergedTraits(),
              y = !mergedTraits.httpPayload
                ? (f.getMemberTraits().xmlName ?? d)
                : (mergedTraits.xmlName ?? f.getName());
            if (t[y] != null) c[d] = this.readSchema(f, t[y]);
          }
          return c;
        }
        if (of.isDocumentSchema()) return t;
        throw Error(`@aws-sdk/core/protocols - xml deserializer unhandled schema type for ${of.getName(!0)}`);
      }
      if (of.isListSchema()) return [];
      if (of.isMapSchema() || of.isStructSchema()) return {};
      return this.stringDeserializer.read(of, t);
    }
    parseXml(e) {
      if (e.length) {
        let t;
        try {
          t = re.parseXML(e);
        } catch (error) {
          if (error && typeof error === "object")
            Object.defineProperty(error, "$responseBodyText", { value: e });
          throw error;
        }
        let r = "#text",
          s = Object.keys(t)[0],
          o = t[s];
        if (o[r]) ((o[s] = o[r]), delete o[r]);
        return de.getValueFromTextNode(o);
      }
      return {};
    }
  }
  class Fs extends ge {
    settings;
    buffer;
    constructor(e) {
      super();
      this.settings = e;
    }
    write(e, t, r = "") {
      if (this.buffer === void 0) this.buffer = "";
      let of = L.NormalizedSchema.of(e);
      if (r && !r.endsWith(".")) r += ".";
      if (of.isBlobSchema()) {
        if (typeof t === "string" || t instanceof Uint8Array)
          (this.writeKey(r), this.writeValue((this.serdeContext?.base64Encoder ?? Fe.toBase64)(t)));
      } else if (of.isBooleanSchema() || of.isNumericSchema() || of.isStringSchema()) {
        if (t != null) (this.writeKey(r), this.writeValue(String(t)));
        else if (of.isIdempotencyToken()) (this.writeKey(r), this.writeValue(G.generateIdempotencyToken()));
      } else if (of.isBigIntegerSchema()) {
        if (t != null) (this.writeKey(r), this.writeValue(String(t)));
      } else if (of.isBigDecimalSchema()) {
        if (t != null)
          (this.writeKey(r), this.writeValue(t instanceof G.NumericValue ? t.string : String(t)));
      } else if (of.isTimestampSchema()) {
        if (t instanceof Date)
          switch ((this.writeKey(r), Q.determineTimestampFormat(of, this.settings))) {
            case 5:
              this.writeValue(t.toISOString().replace(".000Z", "Z"));
              break;
            case 6:
              this.writeValue(de.dateToUtcString(t));
              break;
            case 7:
              this.writeValue(String(t.getTime() / 1000));
              break;
          }
      } else if (of.isDocumentSchema())
        throw Error(`@aws-sdk/core/protocols - QuerySerializer unsupported document type ${of.getName(!0)}`);
      else if (of.isListSchema()) {
        if (Array.isArray(t))
          if (t.length === 0) {
            if (this.settings.serializeEmptyLists) (this.writeKey(r), this.writeValue(""));
          } else {
            let valueSchema = of.getValueSchema(),
              a = this.settings.flattenLists || of.getMergedTraits().xmlFlattened,
              c = 1;
            for (let d of t) {
              if (d == null) continue;
              let key = this.getKey("member", valueSchema.getMergedTraits().xmlName),
                m = a ? `${r}${c}` : `${r}${key}.${c}`;
              (this.write(valueSchema, d, m), ++c);
            }
          }
      } else if (of.isMapSchema()) {
        if (t && typeof t === "object") {
          let keySchema = of.getKeySchema(),
            valueSchema = of.getValueSchema(),
            xmlFlattened = of.getMergedTraits().xmlFlattened,
            d = 1;
          for (let [f, m] of Object.entries(t)) {
            if (m == null) continue;
            let key = this.getKey("key", keySchema.getMergedTraits().xmlName),
              N = xmlFlattened ? `${r}${d}.${key}` : `${r}entry.${d}.${key}`,
              key_2 = this.getKey("value", valueSchema.getMergedTraits().xmlName),
              T = xmlFlattened ? `${r}${d}.${key_2}` : `${r}entry.${d}.${key_2}`;
            (this.write(keySchema, f, N), this.write(valueSchema, m, T), ++d);
          }
        }
      } else if (of.isStructSchema()) {
        if (t && typeof t === "object")
          for (let [o, a] of of.structIterator()) {
            if (t[o] == null && !a.isIdempotencyToken()) continue;
            let key = this.getKey(o, a.getMergedTraits().xmlName),
              d = `${r}${key}`;
            this.write(a, t[o], d);
          }
      } else if (of.isUnitSchema());
      else
        throw Error(`@aws-sdk/core/protocols - QuerySerializer unrecognized schema type ${of.getName(!0)}`);
    }
    flush() {
      if (this.buffer === void 0)
        throw Error("@aws-sdk/core/protocols - QuerySerializer cannot flush with nothing written to buffer.");
      let buffer = this.buffer;
      return (delete this.buffer, buffer);
    }
    getKey(e, t) {
      let r = t ?? e;
      if (this.settings.capitalizeKeys) return r[0].toUpperCase() + r.slice(1);
      return r;
    }
    writeKey(e) {
      if (e.endsWith(".")) e = e.slice(0, e.length - 1);
      this.buffer += `&${Q.extendedEncodeURIComponent(e)}=`;
    }
    writeValue(e) {
      this.buffer += Q.extendedEncodeURIComponent(e);
    }
  }
  class Jt extends Q.RpcProtocol {
    options;
    serializer;
    deserializer;
    mixin = new Ie();
    constructor(e) {
      super({ defaultNamespace: e.defaultNamespace });
      this.options = e;
      let t = {
        timestampFormat: { useTrait: !0, default: 5 },
        httpBindings: !1,
        xmlNamespace: e.xmlNamespace,
        serviceNamespace: e.defaultNamespace,
        serializeEmptyLists: !0,
      };
      ((this.serializer = new Fs(t)), (this.deserializer = new nt(t)));
    }
    getShapeId() {
      return "aws.protocols#awsQuery";
    }
    setSerdeContext(e) {
      (this.serializer.setSerdeContext(e), this.deserializer.setSerdeContext(e));
    }
    getPayloadCodec() {
      throw Error("AWSQuery protocol has no payload codec.");
    }
    async serializeRequest(e, t, r) {
      let serializeRequest = await super.serializeRequest(e, t, r);
      if (!serializeRequest.path.endsWith("/")) serializeRequest.path += "/";
      if (
        (Object.assign(serializeRequest.headers, { "content-type": "application/x-www-form-urlencoded" }),
        L.deref(e.input) === "unit" || !serializeRequest.body)
      )
        serializeRequest.body = "";
      let o = e.name.split("#")[1] ?? e.name;
      if (
        ((serializeRequest.body = `Action=${o}&Version=${this.options.version}` + serializeRequest.body),
        serializeRequest.body.endsWith("&"))
      )
        serializeRequest.body = serializeRequest.body.slice(-1);
      return serializeRequest;
    }
    async deserializeResponse(e, t, r) {
      let deserializer = this.deserializer,
        of = L.NormalizedSchema.of(e.output),
        a = {};
      if (r.statusCode >= 300) {
        let collectBody = await Q.collectBody(r.body, t);
        if (collectBody.byteLength > 0) Object.assign(a, await deserializer.read(15, collectBody));
        await this.handleError(e, t, r, a, this.deserializeMetadata(r));
      }
      for (let key in r.headers) {
        let N = r.headers[key];
        (delete r.headers[key], (r.headers[key.toLowerCase()] = N));
      }
      let c = e.name.split("#")[1] ?? e.name,
        d = of.isStructSchema() && this.useNestedResult() ? c + "Result" : void 0,
        collectBody = await Q.collectBody(r.body, t);
      if (collectBody.byteLength > 0) Object.assign(a, await deserializer.read(of, collectBody, d));
      return { $metadata: this.deserializeMetadata(r), ...a };
    }
    useNestedResult() {
      return !0;
    }
    async handleError(e, t, r, s, o) {
      let a = this.loadQueryErrorCode(r, s) ?? "Unknown",
        queryError = this.loadQueryError(s),
        queryErrorMessage = this.loadQueryErrorMessage(s);
      ((queryError.message = queryErrorMessage),
        (queryError.Error = { Type: queryError.Type, Code: queryError.Code, Message: queryErrorMessage }));
      let { errorSchema: errorSchema, errorMetadata: errorMetadata } =
          await this.mixin.getErrorSchemaOrThrowBaseException(
            a,
            this.options.defaultNamespace,
            r,
            queryError,
            o,
            (_, I) => {
              try {
                return _.getSchema(I);
              } catch (error) {
                return _.find((v) => L.NormalizedSchema.of(v).getMergedTraits().awsQueryError?.[0] === I);
              }
            },
          ),
        of = L.NormalizedSchema.of(errorSchema),
        b = new (L.TypeRegistry.for(errorSchema[1]).getErrorCtor(errorSchema) ?? Error)(queryErrorMessage),
        T = { Error: queryError.Error };
      for (let [_, I] of of.structIterator()) {
        let F = I.getMergedTraits().xmlName ?? _,
          v = queryError[F] ?? s[F];
        T[_] = this.deserializer.readSchema(I, v);
      }
      throw this.mixin.decorateServiceException(
        Object.assign(
          b,
          errorMetadata,
          { $fault: of.getMergedTraits().error, message: queryErrorMessage },
          T,
        ),
        s,
      );
    }
    loadQueryErrorCode(e, t) {
      let r = (t.Errors?.[0]?.Error ?? t.Errors?.Error ?? t.Error)?.Code;
      if (r !== void 0) return r;
      if (e.statusCode == 404) return "NotFound";
    }
    loadQueryError(e) {
      return e.Errors?.[0]?.Error ?? e.Errors?.Error ?? e.Error;
    }
    loadQueryErrorMessage(e) {
      let queryError = this.loadQueryError(e);
      return queryError?.message ?? queryError?.Message ?? e.message ?? e.Message ?? "Unknown";
    }
    getDefaultContentType() {
      return "application/x-www-form-urlencoded";
    }
  }
  class js extends Jt {
    options;
    constructor(e) {
      super(e);
      this.options = e;
      let t = { capitalizeKeys: !0, flattenLists: !0, serializeEmptyLists: !1 };
      Object.assign(this.serializer.settings, t);
    }
    useNestedResult() {
      return !1;
    }
  }
  var qs = (e, t) =>
      $s(e, t).then((r) => {
        if (r.length) {
          let s;
          try {
            s = re.parseXML(r);
          } catch (error) {
            if (error && typeof error === "object")
              Object.defineProperty(error, "$responseBodyText", { value: r });
            throw error;
          }
          let o = "#text",
            a = Object.keys(s)[0],
            c = s[a];
          if (c[o]) ((c[a] = c[o]), delete c[o]);
          return de.getValueFromTextNode(c);
        }
        return {};
      }),
    Ya = async (e, t) => {
      let r = await qs(e, t);
      if (r.Error) r.Error.message = r.Error.message ?? r.Error.Message;
      return r;
    },
    Hs = (e, t) => {
      if (t?.Error?.Code !== void 0) return t.Error.Code;
      if (t?.Code !== void 0) return t.Code;
      if (e.statusCode == 404) return "NotFound";
    };
  class Zt extends ge {
    settings;
    stringBuffer;
    byteBuffer;
    buffer;
    constructor(e) {
      super();
      this.settings = e;
    }
    write(e, t) {
      let of = L.NormalizedSchema.of(e);
      if (of.isStringSchema() && typeof t === "string") this.stringBuffer = t;
      else if (of.isBlobSchema())
        this.byteBuffer = "byteLength" in t ? t : (this.serdeContext?.base64Decoder ?? Fe.fromBase64)(t);
      else {
        this.buffer = this.writeStruct(of, t, void 0);
        let mergedTraits = of.getMergedTraits();
        if (mergedTraits.httpPayload && !mergedTraits.xmlName) this.buffer.withName(of.getName());
      }
    }
    flush() {
      if (this.byteBuffer !== void 0) {
        let byteBuffer = this.byteBuffer;
        return (delete this.byteBuffer, byteBuffer);
      }
      if (this.stringBuffer !== void 0) {
        let stringBuffer = this.stringBuffer;
        return (delete this.stringBuffer, stringBuffer);
      }
      let buffer = this.buffer;
      if (this.settings.xmlNamespace) {
        if (!buffer?.attributes?.xmlns) buffer.addAttribute("xmlns", this.settings.xmlNamespace);
      }
      return (delete this.buffer, buffer.toString());
    }
    writeStruct(e, t, r) {
      let mergedTraits = e.getMergedTraits(),
        o =
          e.isMemberSchema() && !mergedTraits.httpPayload
            ? (e.getMemberTraits().xmlName ?? e.getMemberName())
            : (mergedTraits.xmlName ?? e.getName());
      if (!o || !e.isStructSchema())
        throw Error(
          `@aws-sdk/core/protocols - xml serializer, cannot write struct with empty name or non-struct, schema=${e.getName(!0)}.`,
        );
      let of = re.XmlNode.of(o),
        [c, d] = this.getXmlnsAttribute(e, r);
      for (let [f, m] of e.structIterator()) {
        let y = t[f];
        if (y != null || m.isIdempotencyToken()) {
          if (m.getMergedTraits().xmlAttribute) {
            of.addAttribute(m.getMergedTraits().xmlName ?? f, this.writeSimple(m, y));
            continue;
          }
          if (m.isListSchema()) this.writeList(m, y, of, d);
          else if (m.isMapSchema()) this.writeMap(m, y, of, d);
          else if (m.isStructSchema()) of.addChildNode(this.writeStruct(m, y, d));
          else {
            let of_2 = re.XmlNode.of(m.getMergedTraits().xmlName ?? m.getMemberName());
            (this.writeSimpleInto(m, y, of_2, d), of.addChildNode(of_2));
          }
        }
      }
      if (d) of.addAttribute(c, d);
      return of;
    }
    writeList(e, t, r, s) {
      if (!e.isMemberSchema())
        throw Error(
          `@aws-sdk/core/protocols - xml serializer, cannot write non-member list: ${e.getName(!0)}`,
        );
      let mergedTraits = e.getMergedTraits(),
        valueSchema = e.getValueSchema(),
        mergedTraits_2 = valueSchema.getMergedTraits(),
        d = !!mergedTraits_2.sparse,
        f = !!mergedTraits.xmlFlattened,
        [m, y] = this.getXmlnsAttribute(e, s),
        N = (b, T) => {
          if (valueSchema.isListSchema()) this.writeList(valueSchema, Array.isArray(T) ? T : [T], b, y);
          else if (valueSchema.isMapSchema()) this.writeMap(valueSchema, T, b, y);
          else if (valueSchema.isStructSchema()) {
            let writeStruct = this.writeStruct(valueSchema, T, y);
            b.addChildNode(
              writeStruct.withName(
                f ? (mergedTraits.xmlName ?? e.getMemberName()) : (mergedTraits_2.xmlName ?? "member"),
              ),
            );
          } else {
            let of = re.XmlNode.of(
              f ? (mergedTraits.xmlName ?? e.getMemberName()) : (mergedTraits_2.xmlName ?? "member"),
            );
            (this.writeSimpleInto(valueSchema, T, of, y), b.addChildNode(of));
          }
        };
      if (f) {
        for (let b of t) if (d || b != null) N(r, b);
      } else {
        let of = re.XmlNode.of(mergedTraits.xmlName ?? e.getMemberName());
        if (y) of.addAttribute(m, y);
        for (let T of t) if (d || T != null) N(of, T);
        r.addChildNode(of);
      }
    }
    writeMap(e, t, r, s, o = !1) {
      if (!e.isMemberSchema())
        throw Error(
          `@aws-sdk/core/protocols - xml serializer, cannot write non-member map: ${e.getName(!0)}`,
        );
      let mergedTraits = e.getMergedTraits(),
        keySchema = e.getKeySchema(),
        f = keySchema.getMergedTraits().xmlName ?? "key",
        valueSchema = e.getValueSchema(),
        mergedTraits_2 = valueSchema.getMergedTraits(),
        N = mergedTraits_2.xmlName ?? "value",
        b = !!mergedTraits_2.sparse,
        T = !!mergedTraits.xmlFlattened,
        [_, I] = this.getXmlnsAttribute(e, s),
        F = (v, W, M) => {
          let of = re.XmlNode.of(f, W),
            [Pe, q] = this.getXmlnsAttribute(keySchema, I);
          if (q) of.addAttribute(Pe, q);
          v.addChildNode(of);
          let of_2 = re.XmlNode.of(N);
          if (valueSchema.isListSchema()) this.writeList(valueSchema, M, of_2, I);
          else if (valueSchema.isMapSchema()) this.writeMap(valueSchema, M, of_2, I, !0);
          else if (valueSchema.isStructSchema()) of_2 = this.writeStruct(valueSchema, M, I);
          else this.writeSimpleInto(valueSchema, M, of_2, I);
          v.addChildNode(of_2);
        };
      if (T) {
        for (let [v, W] of Object.entries(t))
          if (b || W != null) {
            let of = re.XmlNode.of(mergedTraits.xmlName ?? e.getMemberName());
            (F(of, v, W), r.addChildNode(of));
          }
      } else {
        let v;
        if (!o) {
          if (((v = re.XmlNode.of(mergedTraits.xmlName ?? e.getMemberName())), I)) v.addAttribute(_, I);
          r.addChildNode(v);
        }
        for (let [W, M] of Object.entries(t))
          if (b || M != null) {
            let of = re.XmlNode.of("entry");
            (F(of, W, M), (o ? r : v).addChildNode(of));
          }
      }
    }
    writeSimple(e, t) {
      if (t === null) throw Error("@aws-sdk/core/protocols - (XML serializer) cannot write null value.");
      let of = L.NormalizedSchema.of(e),
        s = null;
      if (t && typeof t === "object")
        if (of.isBlobSchema()) s = (this.serdeContext?.base64Encoder ?? Fe.toBase64)(t);
        else if (of.isTimestampSchema() && t instanceof Date)
          switch (Q.determineTimestampFormat(of, this.settings)) {
            case 5:
              s = t.toISOString().replace(".000Z", "Z");
              break;
            case 6:
              s = de.dateToUtcString(t);
              break;
            case 7:
              s = String(t.getTime() / 1000);
              break;
            default:
              (console.warn("Missing timestamp format, using http date", t), (s = de.dateToUtcString(t)));
              break;
          }
        else if (of.isBigDecimalSchema() && t) {
          if (t instanceof G.NumericValue) return t.string;
          return String(t);
        } else if (of.isMapSchema() || of.isListSchema())
          throw Error(
            "@aws-sdk/core/protocols - xml serializer, cannot call _write() on List/Map schema, call writeList or writeMap() instead.",
          );
        else
          throw Error(
            `@aws-sdk/core/protocols - xml serializer, unhandled schema type for object value and schema: ${of.getName(!0)}`,
          );
      if (of.isBooleanSchema() || of.isNumericSchema() || of.isBigIntegerSchema() || of.isBigDecimalSchema())
        s = String(t);
      if (of.isStringSchema())
        if (t === void 0 && of.isIdempotencyToken()) s = G.generateIdempotencyToken();
        else s = String(t);
      if (s === null) throw Error(`Unhandled schema-value pair ${of.getName(!0)}=${t}`);
      return s;
    }
    writeSimpleInto(e, t, r, s) {
      let writeSimple = this.writeSimple(e, t),
        of = L.NormalizedSchema.of(e),
        c = new re.XmlText(writeSimple),
        [d, f] = this.getXmlnsAttribute(of, s);
      if (f) r.addAttribute(d, f);
      r.addChildNode(c);
    }
    getXmlnsAttribute(e, t) {
      let mergedTraits = e.getMergedTraits(),
        [s, o] = mergedTraits.xmlNamespace ?? [];
      if (o && o !== t) return [s ? `xmlns:${s}` : "xmlns", o];
      return [void 0, void 0];
    }
  }
  class er extends ge {
    settings;
    constructor(e) {
      super();
      this.settings = e;
    }
    createSerializer() {
      let e = new Zt(this.settings);
      return (e.setSerdeContext(this.serdeContext), e);
    }
    createDeserializer() {
      let e = new nt(this.settings);
      return (e.setSerdeContext(this.serdeContext), e);
    }
  }
  class Gs extends Q.HttpBindingProtocol {
    codec;
    serializer;
    deserializer;
    mixin = new Ie();
    constructor(e) {
      super(e);
      let t = {
        timestampFormat: { useTrait: !0, default: 5 },
        httpBindings: !0,
        xmlNamespace: e.xmlNamespace,
        serviceNamespace: e.defaultNamespace,
      };
      ((this.codec = new er(t)),
        (this.serializer = new Q.HttpInterceptingShapeSerializer(this.codec.createSerializer(), t)),
        (this.deserializer = new Q.HttpInterceptingShapeDeserializer(this.codec.createDeserializer(), t)));
    }
    getPayloadCodec() {
      return this.codec;
    }
    getShapeId() {
      return "aws.protocols#restXml";
    }
    async serializeRequest(e, t, r) {
      let serializeRequest = await super.serializeRequest(e, t, r),
        of = L.NormalizedSchema.of(e.input);
      if (!serializeRequest.headers["content-type"]) {
        let restContentType = this.mixin.resolveRestContentType(this.getDefaultContentType(), of);
        if (restContentType) serializeRequest.headers["content-type"] = restContentType;
      }
      if (serializeRequest.headers["content-type"] === this.getDefaultContentType()) {
        if (typeof serializeRequest.body === "string")
          serializeRequest.body = '<?xml version="1.0" encoding="UTF-8"?>' + serializeRequest.body;
      }
      return serializeRequest;
    }
    async deserializeResponse(e, t, r) {
      return super.deserializeResponse(e, t, r);
    }
    async handleError(e, t, r, s, o) {
      let a = Hs(r, s) ?? "Unknown",
        { errorSchema: errorSchema, errorMetadata: errorMetadata } =
          await this.mixin.getErrorSchemaOrThrowBaseException(a, this.options.defaultNamespace, r, s, o),
        of = L.NormalizedSchema.of(errorSchema),
        m = s.Error?.message ?? s.Error?.Message ?? s.message ?? s.Message ?? "Unknown",
        N = new (L.TypeRegistry.for(errorSchema[1]).getErrorCtor(errorSchema) ?? Error)(m);
      await this.deserializeHttpMessage(errorSchema, t, r, s);
      let b = {};
      for (let [T, _] of of.structIterator()) {
        let I = _.getMergedTraits().xmlName ?? T,
          F = s.Error?.[I] ?? s[I];
        b[T] = this.codec.createDeserializer().readSchema(_, F);
      }
      throw this.mixin.decorateServiceException(
        Object.assign(N, errorMetadata, { $fault: of.getMergedTraits().error, message: m }, b),
        s,
      );
    }
    getDefaultContentType() {
      return "application/xml";
    }
  }
  Ja.AWSSDKSigV4Signer = Ba;
  Ja.AwsEc2QueryProtocol = js;
  Ja.AwsJson1_0Protocol = Ls;
  Ja.AwsJson1_1Protocol = Us;
  Ja.AwsJsonRpcProtocol = st;
  Ja.AwsQueryProtocol = Jt;
  Ja.AwsRestJsonProtocol = Vs;
  Ja.AwsRestXmlProtocol = Gs;
  Ja.AwsSdkSigV4ASigner = Ps;
  Ja.AwsSdkSigV4Signer = tt;
  Ja.AwsSmithyRpcV2CborProtocol = zs;
  Ja.JsonCodec = rt;
  Ja.JsonShapeDeserializer = Qt;
  Ja.JsonShapeSerializer = Yt;
  Ja.NODE_AUTH_SCHEME_PREFERENCE_OPTIONS = La;
  Ja.NODE_SIGV4A_CONFIG_OPTIONS = Va;
  Ja.XmlCodec = er;
  Ja.XmlShapeDeserializer = nt;
  Ja.XmlShapeSerializer = Zt;
  Ja._toBool = Ga;
  Ja._toNum = Xa;
  Ja._toStr = Ha;
  Ja.awsExpectUnion = Qa;
  Ja.emitWarningIfUnsupportedVersion = Pa;
  Ja.getBearerTokenEnvKey = ks;
  Ja.loadRestJsonErrorCode = Kt;
  Ja.loadRestXmlErrorCode = Hs;
  Ja.parseJsonBody = Wt;
  Ja.parseJsonErrorBody = Ka;
  Ja.parseXmlBody = qs;
  Ja.parseXmlErrorBody = Ya;
  Ja.resolveAWSSDKSigV4Config = Fa;
  Ja.resolveAwsSdkSigV4AConfig = Ua;
  Ja.resolveAwsSdkSigV4Config = vs;
  Ja.setCredentialFeature = ka;
  Ja.setFeature = va;
  Ja.setTokenFeature = za;
  Ja.state = qt;
  Ja.validateSigningProperties = Xt;
});

export { Rx, g_2, a };
