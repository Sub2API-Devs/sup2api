/**
 * @smithy/core/dist-cjs/submodules/event-streams/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @smithy/core@3.30.0
 * pieces: chunk-3cddmtk7.js (9), chunk-w1q1hkg4.js (4)
 * attribution: esm-fingerprint 7, esm-layout 6
 */
import { Readable, Readable as Readable_2 } from "stream";
import { E_2 } from "../../../../eventstream-codec/dist-es/EventStreamCodec.js";
import { J, Q, K, Z } from "../../../../eventstream-codec/dist-cjs/index.js";
import { Re, Xa } from "../../../../../../runtime/bun-runtime.js";
import { dR } from "../config/index.native.js";
import { EE } from "../../index.js";
import { _D } from "../schema/index.js";
import { oe } from "../../../../../@aws-sdk/eventstream-handler-node/dist-es/EventStreamPayloadHandler.js";
import { Hme } from "../../../../../@aws-sdk/util-user-agent-node/dist-cjs/index.js";
import { IR } from "../../../../util-utf8/dist-cjs/index.js";

//@ chunk-3cddmtk7.js:11622-12369 esm-fingerprint
function Ce(e) {
  let t = 0,
    o = 0,
    r = null,
    n = null,
    s = (i) => {
      if (typeof i !== "number")
        throw Error("Attempted to allocate an event message where size was not a number: " + i);
      ((t = i), (o = 4), (r = new Uint8Array(i)), new DataView(r.buffer).setUint32(0, i, !1));
    },
    a = async function* () {
      let i = e[Symbol.asyncIterator]();
      while (!0) {
        let { value: c, done: p } = await i.next();
        if (p) {
          if (!t) return;
          else if (t === o) yield r;
          else throw Error("Truncated event message received.");
          return;
        }
        let u = c.length,
          _ = 0;
        while (_ < u) {
          if (!r) {
            let T = u - _;
            if (!n) n = new Uint8Array(4);
            let min = Math.min(4 - o, T);
            if ((n.set(c.slice(_, _ + min), o), (o += min), (_ += min), o < 4)) break;
            (s(new DataView(n.buffer).getUint32(0, !1)), (n = null));
          }
          let min = Math.min(t - o, u - _);
          if ((r.set(c.slice(_, _ + min), o), (o += min), (_ += min), t && t === o))
            (yield r, (r = null), (t = 0), (o = 0));
        }
      }
    };
  return { [Symbol.asyncIterator]: a };
}
//@ chunk-3cddmtk7.js:12369-12920 esm-fingerprint
function ve(e, t) {
  return async function (o) {
    let { value: r } = o.headers[":message-type"];
    if (r === "error") {
      let n = Error(o.headers[":error-message"].value || "UnknownError");
      throw ((n.name = o.headers[":error-code"].value), n);
    } else if (r === "exception") {
      let n = o.headers[":exception-type"].value,
        s = { [n]: o },
        a = await e(s);
      if (a.$unknown) {
        let i = Error(t(o.body));
        throw ((i.name = n), i);
      }
      throw a[n];
    } else if (r === "event") {
      let n = { [o.headers[":event-type"].value]: o },
        s = await e(n);
      if (s.$unknown) return;
      return s;
    } else throw Error(`Unrecognizable event type: ${o.headers[":event-type"].value}`);
  };
}
//@ chunk-3cddmtk7.js:12920-13329 esm-fingerprint
class ee {
  eventStreamCodec;
  utfEncoder;
  constructor({ utf8Encoder: e, utf8Decoder: t }) {
    ((this.eventStreamCodec = new E_2(e, t)), (this.utfEncoder = e));
  }
  deserialize(e, t) {
    let o = Ce(e);
    return new J({
      messageStream: new Q({ inputStream: o, decoder: this.eventStreamCodec }),
      deserializer: ve(t, this.utfEncoder),
    });
  }
  serialize(e, t) {
    return new K({
      messageStream: new Z({ inputStream: e, serializer: t }),
      encoder: this.eventStreamCodec,
      includeEndFrame: !0,
    });
  }
}
//@ chunk-3cddmtk7.js:13329-13368 esm-layout
var it = Re(dR()),
  B = Re(EE()),
  ct = Re(_D());
//@ chunk-3cddmtk7.js:13368-13451 esm-fingerprint
var ge = (e) => Object.assign(e, { eventStreamMarshaller: e.eventStreamSerdeProvider(e) });
//@ chunk-3cddmtk7.js:19948-19970 esm-layout
var ne = (e) => new oe(e);
//@ chunk-3cddmtk7.js:19970-20009 esm-layout
var D = Re(Hme()),
  v = Re(dR()),
  ze = Re(EE());
//@ chunk-3cddmtk7.js:20044-20285 esm-fingerprint
async function* Ie(e) {
  let t = !1,
    o = !1,
    r = [];
  (e.on("error", (n) => {
    if (!t) t = !0;
    if (n) throw n;
  }),
    e.on("data", (n) => {
      r.push(n);
    }),
    e.on("end", () => {
      t = !0;
    }));
  while (!o) {
    let promise = await new Promise((s) => setTimeout(() => s(r.shift()), 0));
    if (promise) yield promise;
    o = t && r.length === 0;
  }
}
//@ chunk-3cddmtk7.js:20285-20617 esm-fingerprint
class Gur {
  universalMarshaller;
  constructor({ utf8Encoder: e, utf8Decoder: t }) {
    this.universalMarshaller = new ee({ utf8Decoder: t, utf8Encoder: e });
  }
  deserialize(e, t) {
    let o = typeof e[Symbol.asyncIterator] === "function" ? e : Ie(e);
    return this.universalMarshaller.deserialize(o, t);
  }
  serialize(e, t) {
    return Readable_2.from(this.universalMarshaller.serialize(e, t));
  }
}
//@ chunk-w1q1hkg4.js:263-3851 esm-fingerprint
class x {
  marshaller;
  serializer;
  deserializer;
  serdeContext;
  defaultContentType;
  constructor({ marshaller: a, serializer: i, deserializer: o, serdeContext: m, defaultContentType: d }) {
    ((this.marshaller = a),
      (this.serializer = i),
      (this.deserializer = o),
      (this.serdeContext = m),
      (this.defaultContentType = d));
  }
  async serializeEventStream({ eventStream: a, requestSchema: i, initialRequest: o }) {
    let marshaller = this.marshaller,
      eventStreamMember = i.getEventStreamMember(),
      memberSchema = i.getMemberSchema(eventStreamMember),
      serializer = this.serializer,
      defaultContentType = this.defaultContentType,
      h = Symbol("initialRequestMarker"),
      S = {
        async *[Symbol.asyncIterator]() {
          if (o) {
            let r = {
              ":event-type": { type: "string", value: "initial-request" },
              ":message-type": { type: "string", value: "event" },
              ":content-type": { type: "string", value: defaultContentType },
            };
            serializer.write(i, o);
            let flush = serializer.flush();
            yield { [h]: !0, headers: r, body: flush };
          }
          for await (let r of a) yield r;
        },
      };
    return marshaller.serialize(S, (r) => {
      if (r[h]) return { headers: r.headers, body: r.body };
      let t = Object.keys(r).find((s) => s !== "__type") ?? "",
        {
          additionalHeaders: additionalHeaders,
          body: body,
          eventType: eventType,
          explicitPayloadContentType: explicitPayloadContentType,
        } = this.writeEventBody(t, memberSchema, r);
      return {
        headers: {
          ":event-type": { type: "string", value: eventType },
          ":message-type": { type: "string", value: "event" },
          ":content-type": { type: "string", value: explicitPayloadContentType ?? defaultContentType },
          ...additionalHeaders,
        },
        body: body,
      };
    });
  }
  async deserializeEventStream({ response: a, responseSchema: i, initialResponseContainer: o }) {
    let marshaller = this.marshaller,
      eventStreamMember = i.getEventStreamMember(),
      memberSchemas = i.getMemberSchema(eventStreamMember).getMemberSchemas(),
      f = Symbol("initialResponseMarker"),
      deserialize = marshaller.deserialize(a.body, async (t) => {
        let e = Object.keys(t).find((l) => l !== "__type") ?? "",
          body = t[e].body;
        if (e === "initial-response") {
          let read = await this.deserializer.read(i, body);
          return (delete read[eventStreamMember], { [f]: !0, ...read });
        } else if (e in memberSchemas) {
          let l = memberSchemas[e];
          if (l.isStructSchema()) {
            let c = {},
              u = !1;
            for (let [s, v] of l.structIterator()) {
              let { eventHeader: eventHeader, eventPayload: eventPayload } = v.getMergedTraits();
              if (((u = u || Boolean(eventHeader || eventPayload)), eventPayload)) {
                if (v.isBlobSchema()) c[s] = body;
                else if (v.isStringSchema()) c[s] = (this.serdeContext?.utf8Encoder ?? z.toUtf8)(body);
                else if (v.isStructSchema()) c[s] = await this.deserializer.read(v, body);
              } else if (eventHeader) {
                let b = t[e].headers[s]?.value;
                if (b != null)
                  if (v.isNumericSchema())
                    if (b && typeof b === "object" && "bytes" in b) c[s] = BigInt(b.toString());
                    else c[s] = Number(b);
                  else c[s] = b;
              }
            }
            if (u) return { [e]: c };
          }
          return { [e]: await this.deserializer.read(l, body) };
        } else return { $unknown: t };
      }),
      S = deserialize[Symbol.asyncIterator](),
      r = await S.next();
    if (r.done) return deserialize;
    if (r.value?.[f]) {
      if (!i)
        throw Error(
          "@smithy::core/protocols - initial-response event encountered in event stream but no response schema given.",
        );
      for (let [t, e] of Object.entries(r.value)) o[t] = e;
    }
    return {
      async *[Symbol.asyncIterator]() {
        if (!r?.value?.[f]) yield r.value;
        while (!0) {
          let { done: t, value: e } = await S.next();
          if (t) break;
          yield e;
        }
      },
    };
  }
  writeEventBody(a, i, o) {
    let serializer = this.serializer,
      d = a,
      p = null,
      y,
      f = (() => i.getSchema()[4].includes(a))(),
      h = {};
    if (!f) {
      let [t, e] = o[a];
      ((d = t), serializer.write(15, e));
    } else {
      let memberSchema = i.getMemberSchema(a);
      if (memberSchema.isStructSchema()) {
        for (let [e, n] of memberSchema.structIterator()) {
          let { eventHeader: eventHeader, eventPayload: eventPayload } = n.getMergedTraits();
          if (eventPayload) {
            p = e;
            break;
          } else if (eventHeader) {
            let u = o[a][e],
              s = "binary";
            if (n.isNumericSchema())
              if (-2147483648 <= u && u <= 2147483647) s = "integer";
              else s = "long";
            else if (n.isTimestampSchema()) s = "timestamp";
            else if (n.isStringSchema()) s = "string";
            else if (n.isBooleanSchema()) s = "boolean";
            if (u != null) ((h[e] = { type: s, value: u }), delete o[a][e]);
          }
        }
        if (p !== null) {
          let memberSchema_2 = memberSchema.getMemberSchema(p);
          if (memberSchema_2.isBlobSchema()) y = "application/octet-stream";
          else if (memberSchema_2.isStringSchema()) y = "text/plain";
          serializer.write(memberSchema_2, o[a][p]);
        } else serializer.write(memberSchema, o[a]);
      } else
        throw Error("@smithy/core/event-streams - non-struct member not supported in event stream union.");
    }
    let flush = serializer.flush();
    return {
      body: typeof flush === "string" ? (this.serdeContext?.utf8Decoder ?? z.fromUtf8)(flush) : flush,
      eventType: d,
      explicitPayloadContentType: y,
      additionalHeaders: h,
    };
  }
}
//@ chunk-w1q1hkg4.js:3851-3859 esm-layout
var z, E;
//@ chunk-w1q1hkg4.js:3859-3886 esm-layout
var M = Xa(() => {
  z = IR();
  E = x;
});
//@ chunk-w1q1hkg4.js:3886-3890 esm-layout
M();

export { it, ge, ct, B, Gur, D, ne, ze, v };
