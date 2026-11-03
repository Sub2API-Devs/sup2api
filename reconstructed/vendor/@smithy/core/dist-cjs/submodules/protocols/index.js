/**
 * @smithy/core/dist-cjs/submodules/protocols/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @smithy/core@3.30.0
 * pieces: chunk-wjd9n4jx.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../../runtime/bun-runtime.js";
import { Xns } from "../../../../util-stream/dist-cjs/index.js";
import { _D } from "../schema/index.js";
import { z6t } from "../serde/index.js";
import { Kg } from "../../../../protocol-http/dist-cjs/index.js";
import { base64Module } from "../../../../../@aws-sdk/credential-provider-web-identity/dist-cjs/index.js";
import { IR } from "../../../../util-utf8/dist-cjs/index.js";

//@ chunk-wjd9n4jx.js:35068-49122 cjs-fingerprint
var jRt = x(function (Ci) {
  var he = Xns(),
    E = _D(),
    T = z6t(),
    Q = Kg(),
    fe = base64Module(),
    Re = IR(),
    P = async (e = new Uint8Array(), t) => {
      if (e instanceof Uint8Array) return he.Uint8ArrayBlobAdapter.mutate(e);
      if (!e) return he.Uint8ArrayBlobAdapter.mutate(new Uint8Array());
      let streamCollector = t.streamCollector(e);
      return he.Uint8ArrayBlobAdapter.mutate(await streamCollector);
    };
  function G(e) {
    return encodeURIComponent(e).replace(/[!'()*]/g, function (t) {
      return "%" + t.charCodeAt(0).toString(16).toUpperCase();
    });
  }
  class j {
    serdeContext;
    setSerdeContext(e) {
      this.serdeContext = e;
    }
  }
  class de extends j {
    options;
    constructor(e) {
      super();
      this.options = e;
    }
    getRequestType() {
      return Q.HttpRequest;
    }
    getResponseType() {
      return Q.HttpResponse;
    }
    setSerdeContext(e) {
      if (
        ((this.serdeContext = e),
        this.serializer.setSerdeContext(e),
        this.deserializer.setSerdeContext(e),
        this.getPayloadCodec())
      )
        this.getPayloadCodec().setSerdeContext(e);
    }
    updateServiceEndpoint(e, t) {
      if ("url" in t) {
        if (
          ((e.protocol = t.url.protocol),
          (e.hostname = t.url.hostname),
          (e.port = t.url.port ? Number(t.url.port) : void 0),
          (e.path = t.url.pathname),
          (e.fragment = t.url.hash || void 0),
          (e.username = t.url.username || void 0),
          (e.password = t.url.password || void 0),
          !e.query)
        )
          e.query = {};
        for (let [r, s] of t.url.searchParams.entries()) e.query[r] = s;
        return e;
      } else
        return (
          (e.protocol = t.protocol),
          (e.hostname = t.hostname),
          (e.port = t.port ? Number(t.port) : void 0),
          (e.path = t.path),
          (e.query = { ...t.query }),
          e
        );
    }
    setHostPrefix(e, t, r) {
      let of = E.NormalizedSchema.of(t.input),
        translateTraits = E.translateTraits(t.traits ?? {});
      if (translateTraits.endpoint) {
        let i = translateTraits.endpoint?.[0];
        if (typeof i === "string") {
          let filtered = [...of.structIterator()].filter(([, o]) => o.getMergedTraits().hostLabel);
          for (let [o] of filtered) {
            let c = r[o];
            if (typeof c !== "string")
              throw Error(`@smithy/core/schema - ${o} in input must be a string as hostLabel.`);
            i = i.replace(`{${o}}`, c);
          }
          e.hostname = i + e.hostname;
        }
      }
    }
    deserializeMetadata(e) {
      return {
        httpStatusCode: e.statusCode,
        requestId:
          e.headers["x-amzn-requestid"] ?? e.headers["x-amzn-request-id"] ?? e.headers["x-amz-request-id"],
        extendedRequestId: e.headers["x-amz-id-2"],
        cfId: e.headers["x-amz-cf-id"],
      };
    }
    async serializeEventStream({ eventStream: e, requestSchema: t, initialRequest: r }) {
      return (await this.loadEventStreamCapability()).serializeEventStream({
        eventStream: e,
        requestSchema: t,
        initialRequest: r,
      });
    }
    async deserializeEventStream({ response: e, responseSchema: t, initialResponseContainer: r }) {
      return (await this.loadEventStreamCapability()).deserializeEventStream({
        response: e,
        responseSchema: t,
        initialResponseContainer: r,
      });
    }
    async loadEventStreamCapability() {
      let { EventStreamSerde: EventStreamSerde } = await import("./chunk-w1q1hkg4.js");
      return new EventStreamSerde({
        marshaller: this.getEventStreamMarshaller(),
        serializer: this.serializer,
        deserializer: this.deserializer,
        serdeContext: this.serdeContext,
        defaultContentType: this.getDefaultContentType(),
      });
    }
    getDefaultContentType() {
      throw Error(
        `@smithy/core/protocols - ${this.constructor.name} getDefaultContentType() implementation missing.`,
      );
    }
    async deserializeHttpMessage(e, t, r, s, n) {
      return [];
    }
    getEventStreamMarshaller() {
      let serdeContext = this.serdeContext;
      if (!serdeContext.eventStreamMarshaller)
        throw Error("@smithy/core - HttpProtocol: eventStreamMarshaller missing in serdeContext.");
      return serdeContext.eventStreamMarshaller;
    }
  }
  class Or extends de {
    async serializeRequest(e, t, r) {
      let s = { ...(t ?? {}) },
        serializer = this.serializer,
        i = {},
        a = {},
        endpoint = await r.endpoint(),
        of = E.NormalizedSchema.of(e?.input),
        schema = of.getSchema(),
        h = !1,
        f,
        d = new Q.HttpRequest({
          protocol: "",
          hostname: "",
          port: void 0,
          path: "",
          fragment: void 0,
          query: i,
          headers: a,
          body: void 0,
        });
      if (endpoint) {
        (this.updateServiceEndpoint(d, endpoint), this.setHostPrefix(d, e, s));
        let translateTraits = E.translateTraits(e.traits);
        if (translateTraits.http) {
          d.method = translateTraits.http[0];
          let [m, p] = translateTraits.http[1].split("?");
          if (d.path == "/") d.path = m;
          else d.path += m;
          let uRLSearchParams = new URLSearchParams(p ?? "");
          Object.assign(i, Object.fromEntries(uRLSearchParams));
        }
      }
      for (let [l, m] of of.structIterator()) {
        let p = m.getMergedTraits() ?? {},
          S = s[l];
        if (S == null && !m.isIdempotencyToken()) continue;
        if (p.httpPayload) {
          if (m.isStreaming())
            if (m.isStructSchema()) {
              if (s[l]) f = await this.serializeEventStream({ eventStream: s[l], requestSchema: of });
            } else f = S;
          else (serializer.write(m, S), (f = serializer.flush()));
          delete s[l];
        } else if (p.httpLabel) {
          serializer.write(m, S);
          let flush = serializer.flush();
          if (d.path.includes(`{${l}+}`))
            d.path = d.path.replace(`{${l}+}`, flush.split("/").map(G).join("/"));
          else if (d.path.includes(`{${l}}`)) d.path = d.path.replace(`{${l}}`, G(flush));
          delete s[l];
        } else if (p.httpHeader)
          (serializer.write(m, S), (a[p.httpHeader.toLowerCase()] = String(serializer.flush())), delete s[l]);
        else if (typeof p.httpPrefixHeaders === "string") {
          for (let [R, Y] of Object.entries(S)) {
            let Ae = p.httpPrefixHeaders + R;
            (serializer.write([m.getValueSchema(), { httpHeader: Ae }], Y),
              (a[Ae.toLowerCase()] = serializer.flush()));
          }
          delete s[l];
        } else if (p.httpQuery || p.httpQueryParams) (this.serializeQuery(m, S, i), delete s[l]);
        else h = !0;
      }
      if (h && s) (serializer.write(schema, s), (f = serializer.flush()));
      return ((d.headers = a), (d.query = i), (d.body = f), d);
    }
    serializeQuery(e, t, r) {
      let serializer = this.serializer,
        mergedTraits = e.getMergedTraits();
      if (mergedTraits.httpQueryParams) {
        for (let [i, a] of Object.entries(t))
          if (!(i in r)) {
            let valueSchema = e.getValueSchema();
            (Object.assign(valueSchema.getMergedTraits(), {
              ...mergedTraits,
              httpQuery: i,
              httpQueryParams: void 0,
            }),
              this.serializeQuery(valueSchema, a, r));
          }
        return;
      }
      if (e.isListSchema()) {
        let i = !!e.getMergedTraits().sparse,
          a = [];
        for (let o of t) {
          serializer.write([e.getValueSchema(), mergedTraits], o);
          let flush = serializer.flush();
          if (i || flush !== void 0) a.push(flush);
        }
        r[mergedTraits.httpQuery] = a;
      } else (serializer.write([e, mergedTraits], t), (r[mergedTraits.httpQuery] = serializer.flush()));
    }
    async deserializeResponse(e, t, r) {
      let deserializer = this.deserializer,
        of = E.NormalizedSchema.of(e.output),
        i = {};
      if (r.statusCode >= 300) {
        let o = await P(r.body, t);
        if (o.byteLength > 0) Object.assign(i, await deserializer.read(15, o));
        throw (
          await this.handleError(e, t, r, i, this.deserializeMetadata(r)),
          Error("@smithy/core/protocols - HTTP Protocol error handler failed to throw.")
        );
      }
      for (let key in r.headers) {
        let c = r.headers[key];
        (delete r.headers[key], (r.headers[key.toLowerCase()] = c));
      }
      let deserializeHttpMessage = await this.deserializeHttpMessage(of, t, r, i);
      if (deserializeHttpMessage.length) {
        let o = await P(r.body, t);
        if (o.byteLength > 0) {
          let read = await deserializer.read(of, o);
          for (let u of deserializeHttpMessage) i[u] = read[u];
        }
      } else if (deserializeHttpMessage.discardResponseBody) await P(r.body, t);
      return ((i.$metadata = this.deserializeMetadata(r)), i);
    }
    async deserializeHttpMessage(e, t, r, s, n) {
      let i;
      if (s instanceof Set) i = n;
      else i = s;
      let a = !0,
        deserializer = this.deserializer,
        of = E.NormalizedSchema.of(e),
        u = [];
      for (let [h, f] of of.structIterator()) {
        let memberTraits = f.getMemberTraits();
        if (memberTraits.httpPayload) {
          if (((a = !1), f.isStreaming()))
            if (f.isStructSchema())
              i[h] = await this.deserializeEventStream({ response: r, responseSchema: of });
            else i[h] = he.sdkStreamMixin(r.body);
          else if (r.body) {
            let m = await P(r.body, t);
            if (m.byteLength > 0) i[h] = await deserializer.read(f, m);
          }
        } else if (memberTraits.httpHeader) {
          let lower = String(memberTraits.httpHeader).toLowerCase(),
            m = r.headers[lower];
          if (m != null)
            if (f.isListSchema()) {
              let valueSchema = f.getValueSchema();
              valueSchema.getMergedTraits().httpHeader = lower;
              let S;
              if (valueSchema.isTimestampSchema() && valueSchema.getSchema() === 4)
                S = T.splitEvery(m, ",", 2);
              else S = T.splitHeader(m);
              let R = [];
              for (let Y of S) R.push(await deserializer.read(valueSchema, Y.trim()));
              i[h] = R;
            } else i[h] = await deserializer.read(f, m);
        } else if (memberTraits.httpPrefixHeaders !== void 0) {
          i[h] = {};
          for (let [l, m] of Object.entries(r.headers))
            if (l.startsWith(memberTraits.httpPrefixHeaders)) {
              let valueSchema = f.getValueSchema();
              ((valueSchema.getMergedTraits().httpHeader = l),
                (i[h][l.slice(memberTraits.httpPrefixHeaders.length)] = await deserializer.read(
                  valueSchema,
                  m,
                )));
            }
        } else if (memberTraits.httpResponseCode) i[h] = r.statusCode;
        else u.push(h);
      }
      return ((u.discardResponseBody = a), u);
    }
  }
  class $r extends de {
    async serializeRequest(e, t, r) {
      let serializer = this.serializer,
        n = {},
        i = {},
        endpoint = await r.endpoint(),
        of = E.NormalizedSchema.of(e?.input),
        schema = of.getSchema(),
        u,
        h = new Q.HttpRequest({
          protocol: "",
          hostname: "",
          port: void 0,
          path: "/",
          fragment: void 0,
          query: n,
          headers: i,
          body: void 0,
        });
      if (endpoint) (this.updateServiceEndpoint(h, endpoint), this.setHostPrefix(h, e, t));
      let f = { ...t };
      if (t) {
        let eventStreamMember = of.getEventStreamMember();
        if (eventStreamMember) {
          if (f[eventStreamMember]) {
            let l = {};
            for (let [m, p] of of.structIterator())
              if (m !== eventStreamMember && f[m]) (serializer.write(p, f[m]), (l[m] = serializer.flush()));
            u = await this.serializeEventStream({
              eventStream: f[eventStreamMember],
              requestSchema: of,
              initialRequest: l,
            });
          }
        } else (serializer.write(schema, f), (u = serializer.flush()));
      }
      return ((h.headers = i), (h.query = n), (h.body = u), (h.method = "POST"), h);
    }
    async deserializeResponse(e, t, r) {
      let deserializer = this.deserializer,
        of = E.NormalizedSchema.of(e.output),
        i = {};
      if (r.statusCode >= 300) {
        let o = await P(r.body, t);
        if (o.byteLength > 0) Object.assign(i, await deserializer.read(15, o));
        throw (
          await this.handleError(e, t, r, i, this.deserializeMetadata(r)),
          Error("@smithy/core/protocols - RPC Protocol error handler failed to throw.")
        );
      }
      for (let key in r.headers) {
        let c = r.headers[key];
        (delete r.headers[key], (r.headers[key.toLowerCase()] = c));
      }
      let eventStreamMember = of.getEventStreamMember();
      if (eventStreamMember)
        i[eventStreamMember] = await this.deserializeEventStream({
          response: r,
          responseSchema: of,
          initialResponseContainer: i,
        });
      else {
        let o = await P(r.body, t);
        if (o.byteLength > 0) Object.assign(i, await deserializer.read(of, o));
      }
      return ((i.$metadata = this.deserializeMetadata(r)), i);
    }
  }
  var Rr = (e, t, r, s, n, i) => {
    if (t != null && t[r] !== void 0) {
      let a = s();
      if (a.length <= 0) throw Error("Empty value provided for input HTTP label: " + r + ".");
      e = e.replace(
        n,
        i
          ? a
              .split("/")
              .map((o) => G(o))
              .join("/")
          : G(a),
      );
    } else throw Error("No value provided for input HTTP label: " + r + ".");
    return e;
  };
  function Mi(e, t) {
    return new Ie(e, t);
  }
  class Ie {
    input;
    context;
    query = {};
    method = "";
    headers = {};
    path = "";
    body = null;
    hostname = "";
    resolvePathStack = [];
    constructor(e, t) {
      ((this.input = e), (this.context = t));
    }
    async build() {
      let {
        hostname: hostname,
        protocol: protocol = "https",
        port: port,
        path: path,
      } = await this.context.endpoint();
      this.path = path;
      for (let n of this.resolvePathStack) n(this.path);
      return new Q.HttpRequest({
        protocol: protocol,
        hostname: this.hostname || hostname,
        port: port,
        method: this.method,
        path: this.path,
        query: this.query,
        body: this.body,
        headers: this.headers,
      });
    }
    hn(e) {
      return ((this.hostname = e), this);
    }
    bp(e) {
      return (
        this.resolvePathStack.push((t) => {
          this.path = `${t?.endsWith("/") ? t.slice(0, -1) : t || ""}` + e;
        }),
        this
      );
    }
    p(e, t, r, s) {
      return (
        this.resolvePathStack.push((n) => {
          this.path = Rr(n, this.input, e, t, r, s);
        }),
        this
      );
    }
    h(e) {
      return ((this.headers = e), this);
    }
    q(e) {
      return ((this.query = e), this);
    }
    b(e) {
      return ((this.body = e), this);
    }
    m(e) {
      return ((this.method = e), this);
    }
  }
  function Pe(e, t) {
    if (t.timestampFormat.useTrait) {
      if (e.isTimestampSchema() && (e.getSchema() === 5 || e.getSchema() === 6 || e.getSchema() === 7))
        return e.getSchema();
    }
    let {
      httpLabel: httpLabel,
      httpPrefixHeaders: httpPrefixHeaders,
      httpHeader: httpHeader,
      httpQuery: httpQuery,
    } = e.getMergedTraits();
    return (
      (t.httpBindings
        ? typeof httpPrefixHeaders === "string" || Boolean(httpHeader)
          ? 6
          : Boolean(httpQuery) || Boolean(httpLabel)
            ? 5
            : void 0
        : void 0) ?? t.timestampFormat.default
    );
  }
  class Ne extends j {
    settings;
    constructor(e) {
      super();
      this.settings = e;
    }
    read(e, t) {
      let of = E.NormalizedSchema.of(e);
      if (of.isListSchema()) return T.splitHeader(t).map((s) => this.read(of.getValueSchema(), s));
      if (of.isBlobSchema()) return (this.serdeContext?.base64Decoder ?? fe.fromBase64)(t);
      if (of.isTimestampSchema())
        switch (Pe(of, this.settings)) {
          case 5:
            return T._parseRfc3339DateTimeWithOffset(t);
          case 6:
            return T._parseRfc7231DateTime(t);
          case 7:
            return T._parseEpochTimestamp(t);
          default:
            return (
              console.warn("Missing timestamp format, parsing value with Date constructor:", t),
              new Date(t)
            );
        }
      if (of.isStringSchema()) {
        let mediaType = of.getMergedTraits().mediaType,
          n = t;
        if (mediaType) {
          if (of.getMergedTraits().httpHeader) n = this.base64ToUtf8(n);
          if (mediaType === "application/json" || mediaType.endsWith("+json")) n = T.LazyJsonString.from(n);
          return n;
        }
      }
      if (of.isNumericSchema()) return Number(t);
      if (of.isBigIntegerSchema()) return BigInt(t);
      if (of.isBigDecimalSchema()) return new T.NumericValue(t, "bigDecimal");
      if (of.isBooleanSchema()) return String(t).toLowerCase() === "true";
      return t;
    }
    base64ToUtf8(e) {
      return (this.serdeContext?.utf8Encoder ?? Re.toUtf8)(
        (this.serdeContext?.base64Decoder ?? fe.fromBase64)(e),
      );
    }
  }
  class Br extends j {
    codecDeserializer;
    stringDeserializer;
    constructor(e, t) {
      super();
      ((this.codecDeserializer = e), (this.stringDeserializer = new Ne(t)));
    }
    setSerdeContext(e) {
      (this.stringDeserializer.setSerdeContext(e),
        this.codecDeserializer.setSerdeContext(e),
        (this.serdeContext = e));
    }
    read(e, t) {
      let of = E.NormalizedSchema.of(e),
        mergedTraits = of.getMergedTraits(),
        n = this.serdeContext?.utf8Encoder ?? Re.toUtf8;
      if (mergedTraits.httpHeader || mergedTraits.httpResponseCode)
        return this.stringDeserializer.read(of, n(t));
      if (mergedTraits.httpPayload) {
        if (of.isBlobSchema()) {
          let i = this.serdeContext?.utf8Decoder ?? Re.fromUtf8;
          if (typeof t === "string") return i(t);
          return t;
        } else if (of.isStringSchema()) {
          if ("byteLength" in t) return n(t);
          return t;
        }
      }
      return this.codecDeserializer.read(of, t);
    }
  }
  class ze extends j {
    settings;
    stringBuffer = "";
    constructor(e) {
      super();
      this.settings = e;
    }
    write(e, t) {
      let of = E.NormalizedSchema.of(e);
      switch (typeof t) {
        case "object":
          if (t === null) {
            this.stringBuffer = "null";
            return;
          }
          if (of.isTimestampSchema()) {
            if (!(t instanceof Date))
              throw Error(
                `@smithy/core/protocols - received non-Date value ${t} when schema expected Date in ${of.getName(!0)}`,
              );
            switch (Pe(of, this.settings)) {
              case 5:
                this.stringBuffer = t.toISOString().replace(".000Z", "Z");
                break;
              case 6:
                this.stringBuffer = T.dateToUtcString(t);
                break;
              case 7:
                this.stringBuffer = String(t.getTime() / 1000);
                break;
              default:
                (console.warn("Missing timestamp format, using epoch seconds", t),
                  (this.stringBuffer = String(t.getTime() / 1000)));
            }
            return;
          }
          if (of.isBlobSchema() && "byteLength" in t) {
            this.stringBuffer = (this.serdeContext?.base64Encoder ?? fe.toBase64)(t);
            return;
          }
          if (of.isListSchema() && Array.isArray(t)) {
            let i = "";
            for (let a of t) {
              this.write([of.getValueSchema(), of.getMergedTraits()], a);
              let flush = this.flush(),
                c = of.getValueSchema().isTimestampSchema() ? flush : T.quoteHeader(flush);
              if (i !== "") i += ", ";
              i += c;
            }
            this.stringBuffer = i;
            return;
          }
          this.stringBuffer = JSON.stringify(t, null, 2);
          break;
        case "string":
          let mediaType = of.getMergedTraits().mediaType,
            n = t;
          if (mediaType) {
            if (mediaType === "application/json" || mediaType.endsWith("+json")) n = T.LazyJsonString.from(n);
            if (of.getMergedTraits().httpHeader) {
              this.stringBuffer = (this.serdeContext?.base64Encoder ?? fe.toBase64)(n.toString());
              return;
            }
          }
          this.stringBuffer = t;
          break;
        default:
          if (of.isIdempotencyToken()) this.stringBuffer = T.generateIdempotencyToken();
          else this.stringBuffer = String(t);
      }
    }
    flush() {
      let stringBuffer = this.stringBuffer;
      return ((this.stringBuffer = ""), stringBuffer);
    }
  }
  class Ir {
    codecSerializer;
    stringSerializer;
    buffer;
    constructor(e, t, r = new ze(t)) {
      ((this.codecSerializer = e), (this.stringSerializer = r));
    }
    setSerdeContext(e) {
      (this.codecSerializer.setSerdeContext(e), this.stringSerializer.setSerdeContext(e));
    }
    write(e, t) {
      let of = E.NormalizedSchema.of(e),
        mergedTraits = of.getMergedTraits();
      if (mergedTraits.httpHeader || mergedTraits.httpLabel || mergedTraits.httpQuery) {
        (this.stringSerializer.write(of, t), (this.buffer = this.stringSerializer.flush()));
        return;
      }
      return this.codecSerializer.write(of, t);
    }
    flush() {
      if (this.buffer !== void 0) {
        let buffer = this.buffer;
        return ((this.buffer = void 0), buffer);
      }
      return this.codecSerializer.flush();
    }
  }
  Ci.FromStringShapeDeserializer = Ne;
  Ci.HttpBindingProtocol = Or;
  Ci.HttpInterceptingShapeDeserializer = Br;
  Ci.HttpInterceptingShapeSerializer = Ir;
  Ci.HttpProtocol = de;
  Ci.RequestBuilder = Ie;
  Ci.RpcProtocol = $r;
  Ci.SerdeContext = j;
  Ci.ToStringShapeSerializer = ze;
  Ci.collectBody = P;
  Ci.determineTimestampFormat = Pe;
  Ci.extendedEncodeURIComponent = G;
  Ci.requestBuilder = Mi;
  Ci.resolvedPath = Rr;
});

export { jRt };
