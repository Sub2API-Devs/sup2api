/**
 * @aws-sdk/core/dist-cjs/submodules/protocols/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/core@3.936.0
 * pieces: chunk-edce4vxq.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../../runtime/bun-runtime.js";
import { Ut } from "../../../../../@smithy/core/dist-cjs/submodules/cbor/index.js";
import { _D } from "../../../../../@smithy/core/dist-cjs/submodules/schema/index.js";
import { ff } from "../../../../../@smithy/core/dist-cjs/submodules/client/index.js";
import { jRt } from "../../../../../@smithy/core/dist-cjs/submodules/protocols/index.js";
import { z6t } from "../../../../../@smithy/core/dist-cjs/submodules/serde/index.js";
import { base64Module } from "../../../../credential-provider-web-identity/dist-cjs/index.js";
import { IR } from "../../../../../@smithy/util-utf8/dist-cjs/index.js";
import { jt } from "../../../../xml-builder/dist-cjs/index.js";

//@ chunk-edce4vxq.js:136783-166742 cjs-fingerprint
var Fme = x(function (Sd) {
  var ei = Ut(),
    U = _D(),
    he = ff(),
    Y = jRt(),
    X = z6t(),
    qe = base64Module(),
    ri = IR(),
    se = jt();
  class De {
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
        m = U.TypeRegistry.for(c);
      try {
        return { errorSchema: a?.(m, d) ?? m.getSchema(e), errorMetadata: f };
      } catch (error) {
        s.message = s.message ?? s.Message ?? "UnknownError";
        let N = U.TypeRegistry.for("smithy.ts.sdk.synthetic." + c),
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
          decorateServiceException = he.decorateServiceException(e, t);
        if (r) ((decorateServiceException.Message = r), (decorateServiceException.message = r));
        return decorateServiceException;
      }
      return he.decorateServiceException(e, t);
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
  class si extends ei.SmithyRpcV2CborProtocol {
    awsQueryCompatible;
    mixin;
    constructor({ defaultNamespace: e, awsQueryCompatible: t }) {
      super({ defaultNamespace: e });
      ((this.awsQueryCompatible = !!t), (this.mixin = new De(this.awsQueryCompatible)));
    }
    async serializeRequest(e, t, r) {
      let serializeRequest = await super.serializeRequest(e, t, r);
      if (this.awsQueryCompatible) serializeRequest.headers["x-amzn-query-mode"] = "true";
      return serializeRequest;
    }
    async handleError(e, t, r, s, o) {
      if (this.awsQueryCompatible) this.mixin.setQueryCompatError(s, r);
      let a = ei.loadSmithyRpcV2CborErrorCode(r, s) ?? "Unknown",
        { errorSchema: errorSchema, errorMetadata: errorMetadata } =
          await this.mixin.getErrorSchemaOrThrowBaseException(a, this.options.defaultNamespace, r, s, o),
        of = U.NormalizedSchema.of(errorSchema),
        m = s.message ?? s.Message ?? "Unknown",
        N = new (U.TypeRegistry.for(errorSchema[1]).getErrorCtor(errorSchema) ?? Error)(m),
        b = {};
      for (let [T, _] of of.structIterator()) b[T] = this.deserializer.readValue(_, s[T]);
      if (this.awsQueryCompatible) this.mixin.queryCompatOutput(s, b);
      throw this.mixin.decorateServiceException(
        Object.assign(N, errorMetadata, { $fault: of.getMergedTraits().error, message: m }, b),
        s,
      );
    }
  }
  var hd = (e) => {
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
    fd = (e) => {
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
    pd = (e) => {
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
  class Ee {
    serdeContext;
    setSerdeContext(e) {
      this.serdeContext = e;
    }
  }
  function md(e, t, r) {
    if (r?.source) {
      let source = r.source;
      if (typeof t === "number") {
        if (t > Number.MAX_SAFE_INTEGER || t < Number.MIN_SAFE_INTEGER || source !== String(t))
          if (source.includes(".")) return new X.NumericValue(source, "bigDecimal");
          else return BigInt(source);
      }
    }
    return t;
  }
  var ni = (e, t) => he.collectBody(e, t).then((r) => (t?.utf8Encoder ?? ri.toUtf8)(r)),
    mr = (e, t) =>
      ni(e, t).then((r) => {
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
    gd = async (e, t) => {
      let r = await mr(e, t);
      return ((r.message = r.message ?? r.Message), r);
    },
    gr = (e, t) => {
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
  class yr extends Ee {
    settings;
    constructor(e) {
      super();
      this.settings = e;
    }
    async read(e, t) {
      return this._read(e, typeof t === "string" ? JSON.parse(t, md) : await mr(t, this.serdeContext));
    }
    readObject(e, t) {
      return this._read(e, t);
    }
    _read(e, t) {
      let r = t !== null && typeof t === "object",
        of = U.NormalizedSchema.of(e);
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
      if (of.isBlobSchema() && typeof t === "string") return qe.fromBase64(t);
      let mediaType = of.getMergedTraits().mediaType;
      if (of.isStringSchema() && typeof t === "string" && mediaType) {
        if (mediaType === "application/json" || mediaType.endsWith("+json")) return X.LazyJsonString.from(t);
      }
      if (of.isTimestampSchema() && t != null)
        switch (Y.determineTimestampFormat(of, this.settings)) {
          case 5:
            return X.parseRfc3339DateTimeWithOffset(t);
          case 6:
            return X.parseRfc7231DateTime(t);
          case 7:
            return X.parseEpochTimestamp(t);
          default:
            return (
              console.warn("Missing timestamp format, parsing value with Date constructor:", t),
              new Date(t)
            );
        }
      if (of.isBigIntegerSchema() && (typeof t === "number" || typeof t === "string")) return BigInt(t);
      if (of.isBigDecimalSchema() && t != null) {
        if (t instanceof X.NumericValue) return t;
        let a = t;
        if (a.type === "bigDecimal" && "string" in a) return new X.NumericValue(a.string, a.type);
        return new X.NumericValue(String(t), "bigDecimal");
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
            if (d instanceof X.NumericValue) a[c] = d;
            else a[c] = this._read(of, d);
          return a;
        } else return structuredClone(t);
      return t;
    }
  }
  var fromCharCode = String.fromCharCode(925);
  class ii {
    values = new Map();
    counter = 0;
    stage = 0;
    createReplacer() {
      if (this.stage === 1) throw Error("@aws-sdk/core/protocols - JsonReplacer already created.");
      if (this.stage === 2) throw Error("@aws-sdk/core/protocols - JsonReplacer exhausted.");
      return (
        (this.stage = 1),
        (e, t) => {
          if (t instanceof X.NumericValue) {
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
  class Er extends Ee {
    settings;
    buffer;
    rootSchema;
    constructor(e) {
      super();
      this.settings = e;
    }
    write(e, t) {
      ((this.rootSchema = U.NormalizedSchema.of(e)), (this.buffer = this._write(this.rootSchema, t)));
    }
    writeDiscriminatedDocument(e, t) {
      if ((this.write(e, t), typeof this.buffer === "object"))
        this.buffer.__type = U.NormalizedSchema.of(e).getName(!0);
    }
    flush() {
      let { rootSchema: rootSchema } = this;
      if (((this.rootSchema = void 0), rootSchema?.isStructSchema() || rootSchema?.isDocumentSchema())) {
        let t = new ii();
        return t.replaceInJson(JSON.stringify(this.buffer, t.createReplacer(), 0));
      }
      return this.buffer;
    }
    _write(e, t, r) {
      let s = t !== null && typeof t === "object",
        of = U.NormalizedSchema.of(e);
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
        return (this.serdeContext?.base64Encoder ?? qe.toBase64)(t);
      }
      if ((of.isTimestampSchema() || of.isDocumentSchema()) && t instanceof Date)
        switch (Y.determineTimestampFormat(of, this.settings)) {
          case 5:
            return t.toISOString().replace(".000Z", "Z");
          case 6:
            return X.dateToUtcString(t);
          case 7:
            return t.getTime() / 1000;
          default:
            return (console.warn("Missing timestamp format, using epoch seconds", t), t.getTime() / 1000);
        }
      if (of.isNumericSchema() && typeof t === "number") {
        if (Math.abs(t) === 1 / 0 || isNaN(t)) return String(t);
      }
      if (of.isStringSchema()) {
        if (typeof t > "u" && of.isIdempotencyToken()) return X.generateIdempotencyToken();
        let mediaType = of.getMergedTraits().mediaType;
        if (t != null && mediaType) {
          if (mediaType === "application/json" || mediaType.endsWith("+json"))
            return X.LazyJsonString.from(t);
        }
      }
      if (of.isDocumentSchema())
        if (s) {
          let a = Array.isArray(t) ? [] : {};
          for (let [c, d] of Object.entries(t))
            if (d instanceof X.NumericValue) a[c] = d;
            else a[c] = this._write(of, d);
          return a;
        } else return structuredClone(t);
      return t;
    }
  }
  class lt extends Ee {
    settings;
    constructor(e) {
      super();
      this.settings = e;
    }
    createSerializer() {
      let e = new Er(this.settings);
      return (e.setSerdeContext(this.serdeContext), e);
    }
    createDeserializer() {
      let e = new yr(this.settings);
      return (e.setSerdeContext(this.serdeContext), e);
    }
  }
  class dt extends Y.RpcProtocol {
    serializer;
    deserializer;
    serviceTarget;
    codec;
    mixin;
    awsQueryCompatible;
    constructor({ defaultNamespace: e, serviceTarget: t, awsQueryCompatible: r }) {
      super({ defaultNamespace: e });
      ((this.serviceTarget = t),
        (this.codec = new lt({ timestampFormat: { useTrait: !0, default: 7 }, jsonName: !1 })),
        (this.serializer = this.codec.createSerializer()),
        (this.deserializer = this.codec.createDeserializer()),
        (this.awsQueryCompatible = !!r),
        (this.mixin = new De(this.awsQueryCompatible)));
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
      if (U.deref(e.input) === "unit" || !serializeRequest.body) serializeRequest.body = "{}";
      return serializeRequest;
    }
    getPayloadCodec() {
      return this.codec;
    }
    async handleError(e, t, r, s, o) {
      if (this.awsQueryCompatible) this.mixin.setQueryCompatError(s, r);
      let a = gr(r, s) ?? "Unknown",
        { errorSchema: errorSchema, errorMetadata: errorMetadata } =
          await this.mixin.getErrorSchemaOrThrowBaseException(a, this.options.defaultNamespace, r, s, o),
        of = U.NormalizedSchema.of(errorSchema),
        m = s.message ?? s.Message ?? "Unknown",
        N = new (U.TypeRegistry.for(errorSchema[1]).getErrorCtor(errorSchema) ?? Error)(m),
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
  class oi extends dt {
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
  class ai extends dt {
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
  class ci extends Y.HttpBindingProtocol {
    serializer;
    deserializer;
    codec;
    mixin = new De();
    constructor({ defaultNamespace: e }) {
      super({ defaultNamespace: e });
      let t = { timestampFormat: { useTrait: !0, default: 7 }, httpBindings: !0, jsonName: !0 };
      ((this.codec = new lt(t)),
        (this.serializer = new Y.HttpInterceptingShapeSerializer(this.codec.createSerializer(), t)),
        (this.deserializer = new Y.HttpInterceptingShapeDeserializer(this.codec.createDeserializer(), t)));
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
        of = U.NormalizedSchema.of(e.input);
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
        of = U.NormalizedSchema.of(e.output);
      for (let [a, c] of of.structIterator())
        if (c.getMemberTraits().httpPayload && !(a in deserializeResponse)) deserializeResponse[a] = null;
      return deserializeResponse;
    }
    async handleError(e, t, r, s, o) {
      let a = gr(r, s) ?? "Unknown",
        { errorSchema: errorSchema, errorMetadata: errorMetadata } =
          await this.mixin.getErrorSchemaOrThrowBaseException(a, this.options.defaultNamespace, r, s, o),
        of = U.NormalizedSchema.of(errorSchema),
        m = s.message ?? s.Message ?? "Unknown",
        N = new (U.TypeRegistry.for(errorSchema[1]).getErrorCtor(errorSchema) ?? Error)(m);
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
  var yd = (e) => {
    if (e == null) return;
    if (typeof e === "object" && "__type" in e) delete e.__type;
    return he.expectUnion(e);
  };
  class ht extends Ee {
    settings;
    stringDeserializer;
    constructor(e) {
      super();
      ((this.settings = e), (this.stringDeserializer = new Y.FromStringShapeDeserializer(e)));
    }
    setSerdeContext(e) {
      ((this.serdeContext = e), this.stringDeserializer.setSerdeContext(e));
    }
    read(e, t, r) {
      let of = U.NormalizedSchema.of(e),
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
      let c = (this.serdeContext?.utf8Encoder ?? ri.toUtf8)(t),
        xml = this.parseXml(c);
      return this.readSchema(e, r ? xml[r] : xml);
    }
    readSchema(e, t) {
      let of = U.NormalizedSchema.of(e);
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
          t = se.parseXML(e);
        } catch (error) {
          if (error && typeof error === "object")
            Object.defineProperty(error, "$responseBodyText", { value: e });
          throw error;
        }
        let r = "#text",
          s = Object.keys(t)[0],
          o = t[s];
        if (o[r]) ((o[s] = o[r]), delete o[r]);
        return he.getValueFromTextNode(o);
      }
      return {};
    }
  }
  class ui extends Ee {
    settings;
    buffer;
    constructor(e) {
      super();
      this.settings = e;
    }
    write(e, t, r = "") {
      if (this.buffer === void 0) this.buffer = "";
      let of = U.NormalizedSchema.of(e);
      if (r && !r.endsWith(".")) r += ".";
      if (of.isBlobSchema()) {
        if (typeof t === "string" || t instanceof Uint8Array)
          (this.writeKey(r), this.writeValue((this.serdeContext?.base64Encoder ?? qe.toBase64)(t)));
      } else if (of.isBooleanSchema() || of.isNumericSchema() || of.isStringSchema()) {
        if (t != null) (this.writeKey(r), this.writeValue(String(t)));
        else if (of.isIdempotencyToken()) (this.writeKey(r), this.writeValue(X.generateIdempotencyToken()));
      } else if (of.isBigIntegerSchema()) {
        if (t != null) (this.writeKey(r), this.writeValue(String(t)));
      } else if (of.isBigDecimalSchema()) {
        if (t != null)
          (this.writeKey(r), this.writeValue(t instanceof X.NumericValue ? t.string : String(t)));
      } else if (of.isTimestampSchema()) {
        if (t instanceof Date)
          switch ((this.writeKey(r), Y.determineTimestampFormat(of, this.settings))) {
            case 5:
              this.writeValue(t.toISOString().replace(".000Z", "Z"));
              break;
            case 6:
              this.writeValue(he.dateToUtcString(t));
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
      this.buffer += `&${Y.extendedEncodeURIComponent(e)}=`;
    }
    writeValue(e) {
      this.buffer += Y.extendedEncodeURIComponent(e);
    }
  }
  class Sr extends Y.RpcProtocol {
    options;
    serializer;
    deserializer;
    mixin = new De();
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
      ((this.serializer = new ui(t)), (this.deserializer = new ht(t)));
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
        U.deref(e.input) === "unit" || !serializeRequest.body)
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
        of = U.NormalizedSchema.of(e.output),
        a = {};
      if (r.statusCode >= 300) {
        let collectBody = await Y.collectBody(r.body, t);
        if (collectBody.byteLength > 0) Object.assign(a, await deserializer.read(15, collectBody));
        await this.handleError(e, t, r, a, this.deserializeMetadata(r));
      }
      for (let key in r.headers) {
        let N = r.headers[key];
        (delete r.headers[key], (r.headers[key.toLowerCase()] = N));
      }
      let c = e.name.split("#")[1] ?? e.name,
        d = of.isStructSchema() && this.useNestedResult() ? c + "Result" : void 0,
        collectBody = await Y.collectBody(r.body, t);
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
                return _.find((v) => U.NormalizedSchema.of(v).getMergedTraits().awsQueryError?.[0] === I);
              }
            },
          ),
        of = U.NormalizedSchema.of(errorSchema),
        b = new (U.TypeRegistry.for(errorSchema[1]).getErrorCtor(errorSchema) ?? Error)(queryErrorMessage),
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
  class li extends Sr {
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
  var di = (e, t) =>
      ni(e, t).then((r) => {
        if (r.length) {
          let s;
          try {
            s = se.parseXML(r);
          } catch (error) {
            if (error && typeof error === "object")
              Object.defineProperty(error, "$responseBodyText", { value: r });
            throw error;
          }
          let o = "#text",
            a = Object.keys(s)[0],
            c = s[a];
          if (c[o]) ((c[a] = c[o]), delete c[o]);
          return he.getValueFromTextNode(c);
        }
        return {};
      }),
    Ed = async (e, t) => {
      let r = await di(e, t);
      if (r.Error) r.Error.message = r.Error.message ?? r.Error.Message;
      return r;
    },
    hi = (e, t) => {
      if (t?.Error?.Code !== void 0) return t.Error.Code;
      if (t?.Code !== void 0) return t.Code;
      if (e.statusCode == 404) return "NotFound";
    };
  class wr extends Ee {
    settings;
    stringBuffer;
    byteBuffer;
    buffer;
    constructor(e) {
      super();
      this.settings = e;
    }
    write(e, t) {
      let of = U.NormalizedSchema.of(e);
      if (of.isStringSchema() && typeof t === "string") this.stringBuffer = t;
      else if (of.isBlobSchema())
        this.byteBuffer = "byteLength" in t ? t : (this.serdeContext?.base64Decoder ?? qe.fromBase64)(t);
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
      let of = se.XmlNode.of(o),
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
            let of_2 = se.XmlNode.of(m.getMergedTraits().xmlName ?? m.getMemberName());
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
            let of = se.XmlNode.of(
              f ? (mergedTraits.xmlName ?? e.getMemberName()) : (mergedTraits_2.xmlName ?? "member"),
            );
            (this.writeSimpleInto(valueSchema, T, of, y), b.addChildNode(of));
          }
        };
      if (f) {
        for (let b of t) if (d || b != null) N(r, b);
      } else {
        let of = se.XmlNode.of(mergedTraits.xmlName ?? e.getMemberName());
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
          let of = se.XmlNode.of(f, W),
            [Pe, q] = this.getXmlnsAttribute(keySchema, I);
          if (q) of.addAttribute(Pe, q);
          v.addChildNode(of);
          let of_2 = se.XmlNode.of(N);
          if (valueSchema.isListSchema()) this.writeList(valueSchema, M, of_2, I);
          else if (valueSchema.isMapSchema()) this.writeMap(valueSchema, M, of_2, I, !0);
          else if (valueSchema.isStructSchema()) of_2 = this.writeStruct(valueSchema, M, I);
          else this.writeSimpleInto(valueSchema, M, of_2, I);
          v.addChildNode(of_2);
        };
      if (T) {
        for (let [v, W] of Object.entries(t))
          if (b || W != null) {
            let of = se.XmlNode.of(mergedTraits.xmlName ?? e.getMemberName());
            (F(of, v, W), r.addChildNode(of));
          }
      } else {
        let v;
        if (!o) {
          if (((v = se.XmlNode.of(mergedTraits.xmlName ?? e.getMemberName())), I)) v.addAttribute(_, I);
          r.addChildNode(v);
        }
        for (let [W, M] of Object.entries(t))
          if (b || M != null) {
            let of = se.XmlNode.of("entry");
            (F(of, W, M), (o ? r : v).addChildNode(of));
          }
      }
    }
    writeSimple(e, t) {
      if (t === null) throw Error("@aws-sdk/core/protocols - (XML serializer) cannot write null value.");
      let of = U.NormalizedSchema.of(e),
        s = null;
      if (t && typeof t === "object")
        if (of.isBlobSchema()) s = (this.serdeContext?.base64Encoder ?? qe.toBase64)(t);
        else if (of.isTimestampSchema() && t instanceof Date)
          switch (Y.determineTimestampFormat(of, this.settings)) {
            case 5:
              s = t.toISOString().replace(".000Z", "Z");
              break;
            case 6:
              s = he.dateToUtcString(t);
              break;
            case 7:
              s = String(t.getTime() / 1000);
              break;
            default:
              (console.warn("Missing timestamp format, using http date", t), (s = he.dateToUtcString(t)));
              break;
          }
        else if (of.isBigDecimalSchema() && t) {
          if (t instanceof X.NumericValue) return t.string;
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
        if (t === void 0 && of.isIdempotencyToken()) s = X.generateIdempotencyToken();
        else s = String(t);
      if (s === null) throw Error(`Unhandled schema-value pair ${of.getName(!0)}=${t}`);
      return s;
    }
    writeSimpleInto(e, t, r, s) {
      let writeSimple = this.writeSimple(e, t),
        of = U.NormalizedSchema.of(e),
        c = new se.XmlText(writeSimple),
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
  class xr extends Ee {
    settings;
    constructor(e) {
      super();
      this.settings = e;
    }
    createSerializer() {
      let e = new wr(this.settings);
      return (e.setSerdeContext(this.serdeContext), e);
    }
    createDeserializer() {
      let e = new ht(this.settings);
      return (e.setSerdeContext(this.serdeContext), e);
    }
  }
  class fi extends Y.HttpBindingProtocol {
    codec;
    serializer;
    deserializer;
    mixin = new De();
    constructor(e) {
      super(e);
      let t = {
        timestampFormat: { useTrait: !0, default: 5 },
        httpBindings: !0,
        xmlNamespace: e.xmlNamespace,
        serviceNamespace: e.defaultNamespace,
      };
      ((this.codec = new xr(t)),
        (this.serializer = new Y.HttpInterceptingShapeSerializer(this.codec.createSerializer(), t)),
        (this.deserializer = new Y.HttpInterceptingShapeDeserializer(this.codec.createDeserializer(), t)));
    }
    getPayloadCodec() {
      return this.codec;
    }
    getShapeId() {
      return "aws.protocols#restXml";
    }
    async serializeRequest(e, t, r) {
      let serializeRequest = await super.serializeRequest(e, t, r),
        of = U.NormalizedSchema.of(e.input);
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
      let a = hi(r, s) ?? "Unknown",
        { errorSchema: errorSchema, errorMetadata: errorMetadata } =
          await this.mixin.getErrorSchemaOrThrowBaseException(a, this.options.defaultNamespace, r, s, o),
        of = U.NormalizedSchema.of(errorSchema),
        m = s.Error?.message ?? s.Error?.Message ?? s.message ?? s.Message ?? "Unknown",
        N = new (U.TypeRegistry.for(errorSchema[1]).getErrorCtor(errorSchema) ?? Error)(m);
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
  Sd.AwsEc2QueryProtocol = li;
  Sd.AwsJson1_0Protocol = oi;
  Sd.AwsJson1_1Protocol = ai;
  Sd.AwsJsonRpcProtocol = dt;
  Sd.AwsQueryProtocol = Sr;
  Sd.AwsRestJsonProtocol = ci;
  Sd.AwsRestXmlProtocol = fi;
  Sd.AwsSmithyRpcV2CborProtocol = si;
  Sd.JsonCodec = lt;
  Sd.JsonShapeDeserializer = yr;
  Sd.JsonShapeSerializer = Er;
  Sd.XmlCodec = xr;
  Sd.XmlShapeDeserializer = ht;
  Sd.XmlShapeSerializer = wr;
  Sd._toBool = fd;
  Sd._toNum = pd;
  Sd._toStr = hd;
  Sd.awsExpectUnion = yd;
  Sd.loadRestJsonErrorCode = gr;
  Sd.loadRestXmlErrorCode = hi;
  Sd.parseJsonBody = mr;
  Sd.parseJsonErrorBody = gd;
  Sd.parseXmlBody = di;
  Sd.parseXmlErrorBody = Ed;
});

export { Fme };
