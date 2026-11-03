/**
 * @azure/core-client/dist/esm/deserializationPolicy.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @azure/core-client@1.9.2..1.10.0
 * pieces: chunk-mrx6y2r5.js (8)
 * attribution: esm-fingerprint 8
 */
import { ei, ht } from "../index.js";
import { ft } from "./operationHelpers.js";
import { Wr } from "../../../core-rest-pipeline/dist/esm/policies/tracingPolicy.js";

//@ chunk-mrx6y2r5.js:69687-69800 esm-fingerprint
var qp = ["application/json", "text/json"],
  Kp = ["application/xml", "application/atom+xml"],
  DESERIALIZATIONPOLICY = "deserializationPolicy";
//@ chunk-mrx6y2r5.js:69800-70392 esm-fingerprint
function vd(e = {}) {
  var t, r, n, o, i, s, a;
  let c =
      (r = (t = e.expectedContentTypes) === null || t === void 0 ? void 0 : t.json) !== null && r !== void 0
        ? r
        : qp,
    l =
      (o = (n = e.expectedContentTypes) === null || n === void 0 ? void 0 : n.xml) !== null && o !== void 0
        ? o
        : Kp,
    { parseXML: parseXML, serializerOptions: serializerOptions } = e,
    m = {
      xml: {
        rootName:
          (i =
            serializerOptions === null || serializerOptions === void 0
              ? void 0
              : serializerOptions.xml.rootName) !== null && i !== void 0
            ? i
            : "",
        includeRoot:
          (s =
            serializerOptions === null || serializerOptions === void 0
              ? void 0
              : serializerOptions.xml.includeRoot) !== null && s !== void 0
            ? s
            : !1,
        xmlCharKey:
          (a =
            serializerOptions === null || serializerOptions === void 0
              ? void 0
              : serializerOptions.xml.xmlCharKey) !== null && a !== void 0
            ? a
            : ei,
      },
    };
  return {
    name: DESERIALIZATIONPOLICY,
    async sendRequest(p, y) {
      let T = await y(p);
      return Wp(c, l, T, m, parseXML);
    },
  };
}
//@ chunk-mrx6y2r5.js:70392-70643 esm-fingerprint
function jp(e) {
  let t,
    request = e.request,
    n = ft(request),
    o = n === null || n === void 0 ? void 0 : n.operationSpec;
  if (o)
    if (!(n === null || n === void 0 ? void 0 : n.operationResponseGetter)) t = o.responses[e.status];
    else t = n === null || n === void 0 ? void 0 : n.operationResponseGetter(o, e);
  return t;
}
//@ chunk-mrx6y2r5.js:70643-70807 esm-fingerprint
function Yp(e) {
  let request = e.request,
    r = ft(request),
    n = r === null || r === void 0 ? void 0 : r.shouldDeserialize,
    o;
  if (n === void 0) o = !0;
  else if (typeof n === "boolean") o = n;
  else o = n(e);
  return o;
}
//@ chunk-mrx6y2r5.js:70807-71688 esm-fingerprint
async function Wp(e, t, r, n, o) {
  let i = await Xp(e, t, r, n, o);
  if (!Yp(i)) return i;
  let s = ft(i.request),
    a = s === null || s === void 0 ? void 0 : s.operationSpec;
  if (!a || !a.responses) return i;
  let c = jp(i),
    { error: error, shouldReturnResponse: shouldReturnResponse } = Jp(i, a, c, n);
  if (error) throw error;
  else if (shouldReturnResponse) return i;
  if (c) {
    if (c.bodyMapper) {
      let parsedBody = i.parsedBody;
      if (a.isXML && c.bodyMapper.type.name === ht.Sequence)
        parsedBody = typeof parsedBody === "object" ? parsedBody[c.bodyMapper.xmlElementName] : [];
      try {
        i.parsedBody = a.serializer.deserialize(c.bodyMapper, parsedBody, "operationRes.parsedBody", n);
      } catch (error) {
        throw new Wr(`Error ${error} occurred in deserializing the responseBody - ${i.bodyAsText}`, {
          statusCode: i.status,
          request: i.request,
          response: i,
        });
      }
    } else if (a.httpMethod === "HEAD") i.parsedBody = r.status >= 200 && r.status < 300;
    if (c.headersMapper)
      i.parsedHeaders = a.serializer.deserialize(
        c.headersMapper,
        i.headers.toJSON(),
        "operationRes.parsedHeaders",
        { xml: {}, ignoreUnknownProperties: !0 },
      );
  }
  return i;
}
//@ chunk-mrx6y2r5.js:71688-71786 esm-fingerprint
function Qp(e) {
  let keys = Object.keys(e.responses);
  return keys.length === 0 || (keys.length === 1 && keys[0] === "default");
}
//@ chunk-mrx6y2r5.js:71786-73127 esm-fingerprint
function Jp(e, t, r, n) {
  var o, i, s, a, c;
  let l = 200 <= e.status && e.status < 300;
  if (Qp(t) ? l : !!r)
    if (r) {
      if (!r.isError) return { error: null, shouldReturnResponse: !1 };
    } else return { error: null, shouldReturnResponse: !1 };
  let u = r !== null && r !== void 0 ? r : t.responses.default,
    m = ((o = e.request.streamResponseStatusCodes) === null || o === void 0 ? void 0 : o.has(e.status))
      ? `Unexpected status code: ${e.status}`
      : e.bodyAsText,
    p = new Wr(m, { statusCode: e.status, request: e.request, response: e });
  if (
    !u &&
    !(
      ((s = (i = e.parsedBody) === null || i === void 0 ? void 0 : i.error) === null || s === void 0
        ? void 0
        : s.code) &&
      ((c = (a = e.parsedBody) === null || a === void 0 ? void 0 : a.error) === null || c === void 0
        ? void 0
        : c.message)
    )
  )
    throw p;
  let y = u === null || u === void 0 ? void 0 : u.bodyMapper,
    T = u === null || u === void 0 ? void 0 : u.headersMapper;
  try {
    if (e.parsedBody) {
      let parsedBody = e.parsedBody,
        v;
      if (y) {
        let B = parsedBody;
        if (t.isXML && y.type.name === ht.Sequence) {
          B = [];
          let xmlElementName = y.xmlElementName;
          if (typeof parsedBody === "object" && xmlElementName) B = parsedBody[xmlElementName];
        }
        v = t.serializer.deserialize(y, B, "error.response.parsedBody", n);
      }
      let U = parsedBody.error || v || parsedBody;
      if (((p.code = U.code), U.message)) p.message = U.message;
      if (y) p.response.parsedBody = v;
    }
    if (e.headers && T)
      p.response.parsedHeaders = t.serializer.deserialize(
        T,
        e.headers.toJSON(),
        "operationRes.parsedHeaders",
      );
  } catch (error) {
    p.message = `Error "${error.message}" occurred in deserializing the responseBody - "${e.bodyAsText}" for the default response.`;
  }
  return { error: p, shouldReturnResponse: !1 };
}
//@ chunk-mrx6y2r5.js:73127-73790 esm-fingerprint
async function Xp(e, t, r, n, o) {
  var i;
  if (
    !((i = r.request.streamResponseStatusCodes) === null || i === void 0 ? void 0 : i.has(r.status)) &&
    r.bodyAsText
  ) {
    let bodyAsText = r.bodyAsText,
      a = r.headers.get("Content-Type") || "",
      c = !a ? [] : a.split(";").map((l) => l.toLowerCase());
    try {
      if (c.length === 0 || c.some((l) => e.indexOf(l) !== -1))
        return ((r.parsedBody = JSON.parse(bodyAsText)), r);
      else if (c.some((l) => t.indexOf(l) !== -1)) {
        if (!o) throw Error("Parsing XML not supported.");
        let l = await o(bodyAsText, n.xml);
        return ((r.parsedBody = l), r);
      }
    } catch (error) {
      let d = `Error "${error}" occurred while parsing the response body - ${r.bodyAsText}.`,
        u = error.code || Wr.PARSE_ERROR;
      throw new Wr(d, { code: u, statusCode: r.status, request: r.request, response: r });
    }
  }
  return r;
}

export { vd };
