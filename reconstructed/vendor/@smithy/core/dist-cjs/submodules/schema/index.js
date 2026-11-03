/**
 * @smithy/core/dist-cjs/submodules/schema/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @smithy/core@3.30.0
 * pieces: chunk-wjd9n4jx.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../../runtime/bun-runtime.js";
import { Kg } from "../../../../protocol-http/dist-cjs/index.js";
import { bD } from "../../../../util-middleware/dist-cjs/index.js";

//@ chunk-wjd9n4jx.js:12581-22053 cjs-fingerprint
var _D = x(function (ps) {
  var ss = Kg(),
    cr = bD(),
    re = (e) => {
      if (typeof e === "function") return e();
      return e;
    },
    be = (e, t, r, s, n) => ({ name: t, namespace: e, traits: r, input: s, output: n }),
    ns = (e) => (t, r) => async (s) => {
      let { response: response } = await t(s),
        { operationSchema: operationSchema } = cr.getSmithyContext(r),
        [, a, o, c, u, h] = operationSchema ?? [];
      try {
        let deserializeResponse = await e.protocol.deserializeResponse(
          be(a, o, c, u, h),
          { ...e, ...r },
          response,
        );
        return { response: response, output: deserializeResponse };
      } catch (error) {
        if (
          (Object.defineProperty(error, "$response", {
            value: response,
            enumerable: !1,
            writable: !1,
            configurable: !1,
          }),
          !("$metadata" in error))
        ) {
          try {
            error.message += `
  Deserialization error: to see the raw response, inspect the hidden field {error}.$response on this object.`;
          } catch (error) {
            if (!r.logger || r.logger?.constructor?.name === "NoOpLogger")
              console.warn(
                "Deserialization error: to see the raw response, inspect the hidden field {error}.$response on this object.",
              );
            else
              r.logger?.warn?.(
                "Deserialization error: to see the raw response, inspect the hidden field {error}.$response on this object.",
              );
          }
          if (typeof error.$responseBodyText < "u") {
            if (error.$response) error.$response.body = error.$responseBodyText;
          }
          try {
            if (ss.HttpResponse.isInstance(response)) {
              let { headers: headers = {} } = response,
                entries = Object.entries(headers);
              error.$metadata = {
                httpStatusCode: response.statusCode,
                requestId: pe(/^x-[\w-]+-request-?id$/, entries),
                extendedRequestId: pe(/^x-[\w-]+-id-2$/, entries),
                cfId: pe(/^x-[\w-]+-cf-id$/, entries),
              };
            }
          } catch (error) {}
        }
        throw error;
      }
    },
    pe = (e, t) => (t.find(([r]) => r.match(e)) || [void 0, void 0])[1],
    is = (e) => (t, r) => async (s) => {
      let { operationSchema: operationSchema } = cr.getSmithyContext(r),
        [, i, a, o, c, u] = operationSchema ?? [],
        h = r.endpointV2?.url && e.urlParser ? async () => e.urlParser(r.endpointV2.url) : e.endpoint,
        serializeRequest = await e.protocol.serializeRequest(be(i, a, o, c, u), s.input, {
          ...e,
          ...r,
          endpoint: h,
        });
      return t({ ...s, request: serializeRequest });
    },
    ur = { name: "deserializerMiddleware", step: "deserialize", tags: ["DESERIALIZER"], override: !0 },
    hr = { name: "serializerMiddleware", step: "serialize", tags: ["SERIALIZER"], override: !0 };
  function os(e) {
    return {
      applyToStack: (t) => {
        (t.add(is(e), hr), t.add(ns(e), ur), e.protocol.setSerdeContext(e));
      },
    };
  }
  class w {
    name;
    namespace;
    traits;
    static assign(e, t) {
      return Object.assign(e, t);
    }
    static [Symbol.hasInstance](e) {
      let t = this.prototype.isPrototypeOf(e);
      if (!t && typeof e === "object" && e !== null) return e.symbol === this.symbol;
      return t;
    }
    getName() {
      return this.namespace + "#" + this.name;
    }
  }
  class se extends w {
    static symbol = Symbol.for("@smithy/lis");
    name;
    traits;
    valueSchema;
    symbol = se.symbol;
  }
  var as = (e, t, r, s) => w.assign(new se(), { name: t, namespace: e, traits: r, valueSchema: s });
  class ne extends w {
    static symbol = Symbol.for("@smithy/map");
    name;
    traits;
    keySchema;
    valueSchema;
    symbol = ne.symbol;
  }
  var cs = (e, t, r, s, n) =>
    w.assign(new ne(), { name: t, namespace: e, traits: r, keySchema: s, valueSchema: n });
  class ie extends w {
    static symbol = Symbol.for("@smithy/ope");
    name;
    traits;
    input;
    output;
    symbol = ie.symbol;
  }
  var us = (e, t, r, s, n) => w.assign(new ie(), { name: t, namespace: e, traits: r, input: s, output: n });
  class F extends w {
    static symbol = Symbol.for("@smithy/str");
    name;
    traits;
    memberNames;
    memberList;
    symbol = F.symbol;
  }
  var hs = (e, t, r, s, n) =>
    w.assign(new F(), { name: t, namespace: e, traits: r, memberNames: s, memberList: n });
  class oe extends F {
    static symbol = Symbol.for("@smithy/err");
    ctor;
    symbol = oe.symbol;
  }
  var fs = (e, t, r, s, n, i) =>
    w.assign(new oe(), { name: t, namespace: e, traits: r, memberNames: s, memberList: n, ctor: null });
  function k(e) {
    if (typeof e === "object") return e;
    e = e | 0;
    let t = {},
      r = 0;
    for (let s of [
      "httpLabel",
      "idempotent",
      "idempotencyToken",
      "sensitive",
      "httpPayload",
      "httpResponseCode",
      "httpQueryParams",
    ])
      if (((e >> r++) & 1) === 1) t[s] = 1;
    return t;
  }
  class C {
    ref;
    memberName;
    static symbol = Symbol.for("@smithy/nor");
    symbol = C.symbol;
    name;
    schema;
    _isMemberSchema;
    traits;
    memberTraits;
    normalizedTraits;
    constructor(e, t) {
      ((this.ref = e), (this.memberName = t));
      let r = [],
        s = e,
        n = e;
      this._isMemberSchema = !1;
      while (ye(s)) (r.push(s[1]), (s = s[0]), (n = re(s)), (this._isMemberSchema = !0));
      if (r.length > 0) {
        this.memberTraits = {};
        for (let i = r.length - 1; i >= 0; --i) {
          let a = r[i];
          Object.assign(this.memberTraits, k(a));
        }
      } else this.memberTraits = 0;
      if (n instanceof C) {
        let memberTraits = this.memberTraits;
        (Object.assign(this, n),
          (this.memberTraits = Object.assign({}, memberTraits, n.getMemberTraits(), this.getMemberTraits())),
          (this.normalizedTraits = void 0),
          (this.memberName = t ?? n.memberName));
        return;
      }
      if (((this.schema = re(n)), fr(this.schema)))
        ((this.name = `${this.schema[1]}#${this.schema[2]}`), (this.traits = this.schema[3]));
      else ((this.name = this.memberName ?? String(n)), (this.traits = 0));
      if (this._isMemberSchema && !t)
        throw Error(
          `@smithy/core/schema - NormalizedSchema member init ${this.getName(!0)} missing member name.`,
        );
    }
    static [Symbol.hasInstance](e) {
      let t = this.prototype.isPrototypeOf(e);
      if (!t && typeof e === "object" && e !== null) return e.symbol === this.symbol;
      return t;
    }
    static of(e) {
      let t = re(e);
      if (t instanceof C) return t;
      if (ye(t)) {
        let [r, s] = t;
        if (r instanceof C) return (Object.assign(r.getMergedTraits(), k(s)), r);
        throw Error(
          `@smithy/core/schema - may not init unwrapped member schema=${JSON.stringify(e, null, 2)}.`,
        );
      }
      return new C(t);
    }
    getSchema() {
      let schema = this.schema;
      if (schema[0] === 0) return schema[4];
      return schema;
    }
    getName(e = !1) {
      let { name: t } = this;
      return !e && t && t.includes("#") ? t.split("#")[1] : t || void 0;
    }
    getMemberName() {
      return this.memberName;
    }
    isMemberSchema() {
      return this._isMemberSchema;
    }
    isListSchema() {
      let schema = this.getSchema();
      return typeof schema === "number" ? schema >= 64 && schema < 128 : schema[0] === 1;
    }
    isMapSchema() {
      let schema = this.getSchema();
      return typeof schema === "number" ? schema >= 128 && schema <= 255 : schema[0] === 2;
    }
    isStructSchema() {
      let schema = this.getSchema();
      return schema[0] === 3 || schema[0] === -3;
    }
    isBlobSchema() {
      let schema = this.getSchema();
      return schema === 21 || schema === 42;
    }
    isTimestampSchema() {
      let schema = this.getSchema();
      return typeof schema === "number" && schema >= 4 && schema <= 7;
    }
    isUnitSchema() {
      return this.getSchema() === "unit";
    }
    isDocumentSchema() {
      return this.getSchema() === 15;
    }
    isStringSchema() {
      return this.getSchema() === 0;
    }
    isBooleanSchema() {
      return this.getSchema() === 2;
    }
    isNumericSchema() {
      return this.getSchema() === 1;
    }
    isBigIntegerSchema() {
      return this.getSchema() === 17;
    }
    isBigDecimalSchema() {
      return this.getSchema() === 19;
    }
    isStreaming() {
      let { streaming: streaming } = this.getMergedTraits();
      return !!streaming || this.getSchema() === 42;
    }
    isIdempotencyToken() {
      let e = (n) => (n & 4) === 4 || !!n?.idempotencyToken,
        { normalizedTraits: normalizedTraits, traits: traits, memberTraits: memberTraits } = this;
      return e(normalizedTraits) || e(traits) || e(memberTraits);
    }
    getMergedTraits() {
      return (
        this.normalizedTraits ??
        (this.normalizedTraits = { ...this.getOwnTraits(), ...this.getMemberTraits() })
      );
    }
    getMemberTraits() {
      return k(this.memberTraits);
    }
    getOwnTraits() {
      return k(this.traits);
    }
    getKeySchema() {
      let [e, t] = [this.isDocumentSchema(), this.isMapSchema()];
      if (!e && !t) throw Error(`@smithy/core/schema - cannot get key for non-map: ${this.getName(!0)}`);
      let schema = this.getSchema(),
        s = e ? 15 : (schema[4] ?? 0);
      return L([s, 0], "key");
    }
    getValueSchema() {
      let schema = this.getSchema(),
        [t, r, s] = [this.isDocumentSchema(), this.isMapSchema(), this.isListSchema()],
        n =
          typeof schema === "number"
            ? 63 & schema
            : schema && typeof schema === "object" && (r || s)
              ? schema[3 + schema[0]]
              : t
                ? 15
                : void 0;
      if (n != null) return L([n, 0], r ? "value" : "member");
      throw Error(`@smithy/core/schema - ${this.getName(!0)} has no value member.`);
    }
    getMemberSchema(e) {
      let schema = this.getSchema();
      if (this.isStructSchema() && schema[4].includes(e)) {
        let index = schema[4].indexOf(e),
          s = schema[5][index];
        return L(ye(s) ? s : [s, 0], e);
      }
      if (this.isDocumentSchema()) return L([15, 0], e);
      throw Error(`@smithy/core/schema - ${this.getName(!0)} has no no member=${e}.`);
    }
    getMemberSchemas() {
      let e = {};
      try {
        for (let [t, r] of this.structIterator()) e[t] = r;
      } catch (error) {}
      return e;
    }
    getEventStreamMember() {
      if (this.isStructSchema()) {
        for (let [e, t] of this.structIterator()) if (t.isStreaming() && t.isStructSchema()) return e;
      }
      return "";
    }
    *structIterator() {
      if (this.isUnitSchema()) return;
      if (!this.isStructSchema()) throw Error("@smithy/core/schema - cannot iterate non-struct schema.");
      let schema = this.getSchema();
      for (let t = 0; t < schema[4].length; ++t) yield [schema[4][t], L([schema[5][t], 0], schema[4][t])];
    }
  }
  function L(e, t) {
    if (e instanceof C) return Object.assign(e, { memberName: t, _isMemberSchema: !0 });
    return new C(e, t);
  }
  var ye = (e) => Array.isArray(e) && e.length === 2,
    fr = (e) => Array.isArray(e) && e.length >= 5;
  class H extends w {
    static symbol = Symbol.for("@smithy/sim");
    name;
    schemaRef;
    traits;
    symbol = H.symbol;
  }
  var ds = (e, t, r, s) => w.assign(new H(), { name: t, namespace: e, traits: s, schemaRef: r }),
    ms = (e, t, r, s) => w.assign(new H(), { name: t, namespace: e, traits: r, schemaRef: s }),
    ls = {
      BLOB: 21,
      STREAMING_BLOB: 42,
      BOOLEAN: 2,
      STRING: 0,
      NUMERIC: 1,
      BIG_INTEGER: 17,
      BIG_DECIMAL: 19,
      DOCUMENT: 15,
      TIMESTAMP_DEFAULT: 4,
      TIMESTAMP_DATE_TIME: 5,
      TIMESTAMP_HTTP_DATE: 6,
      TIMESTAMP_EPOCH_SECONDS: 7,
      LIST_MODIFIER: 64,
      MAP_MODIFIER: 128,
    };
  class M {
    namespace;
    schemas;
    exceptions;
    static registries = new Map();
    constructor(e, t = new Map(), r = new Map()) {
      ((this.namespace = e), (this.schemas = t), (this.exceptions = r));
    }
    static for(e) {
      if (!M.registries.has(e)) M.registries.set(e, new M(e));
      return M.registries.get(e);
    }
    register(e, t) {
      let normalizeShapeId = this.normalizeShapeId(e);
      M.for(normalizeShapeId.split("#")[0]).schemas.set(normalizeShapeId, t);
    }
    getSchema(e) {
      let normalizeShapeId = this.normalizeShapeId(e);
      if (!this.schemas.has(normalizeShapeId))
        throw Error(`@smithy/core/schema - schema not found for ${normalizeShapeId}`);
      return this.schemas.get(normalizeShapeId);
    }
    registerError(e, t) {
      let r = e,
        s = M.for(r[1]);
      (s.schemas.set(r[1] + "#" + r[2], r), s.exceptions.set(r, t));
    }
    getErrorCtor(e) {
      let t = e;
      return M.for(t[1]).exceptions.get(t);
    }
    getBaseException() {
      for (let e of this.exceptions.keys())
        if (Array.isArray(e)) {
          let [, t, r] = e,
            s = t + "#" + r;
          if (s.startsWith("smithy.ts.sdk.synthetic.") && s.endsWith("ServiceException")) return e;
        }
      return;
    }
    find(e) {
      return [...this.schemas.values()].find(e);
    }
    clear() {
      (this.schemas.clear(), this.exceptions.clear());
    }
    normalizeShapeId(e) {
      if (e.includes("#")) return e;
      return this.namespace + "#" + e;
    }
  }
  ps.ErrorSchema = oe;
  ps.ListSchema = se;
  ps.MapSchema = ne;
  ps.NormalizedSchema = C;
  ps.OperationSchema = ie;
  ps.SCHEMA = ls;
  ps.Schema = w;
  ps.SimpleSchema = H;
  ps.StructureSchema = F;
  ps.TypeRegistry = M;
  ps.deref = re;
  ps.deserializerMiddlewareOption = ur;
  ps.error = fs;
  ps.getSchemaSerdePlugin = os;
  ps.isStaticSchema = fr;
  ps.list = as;
  ps.map = cs;
  ps.op = us;
  ps.operation = be;
  ps.serializerMiddlewareOption = hr;
  ps.sim = ds;
  ps.simAdapter = ms;
  ps.struct = hs;
  ps.translateTraits = k;
});

export { _D };
