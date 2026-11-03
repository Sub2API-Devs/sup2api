/**
 * @azure/core-client/dist/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @azure/core-client@1.9.2..1.10.0
 * pieces: chunk-mrx6y2r5.js (13)
 * attribution: esm-layout 2, esm-fingerprint 11
 */
import { ft, Nt } from "./esm/operationHelpers.js";

//@ chunk-mrx6y2r5.js:67078-67096 esm-layout
var Ca = "$",
  ei = "_";
//@ chunk-mrx6y2r5.js:67096-67355 esm-fingerprint
function Bp(e, t) {
  return (
    t !== "Composite" &&
    t !== "Dictionary" &&
    (typeof e === "string" ||
      typeof e === "number" ||
      typeof e === "boolean" ||
      (t === null || t === void 0
        ? void 0
        : t.match(/^(Date|DateTime|DateTimeRfc1123|UnixTime|ByteArray|Base64Url)$/i)) !== null ||
      e === void 0 ||
      e === null)
  );
}
//@ chunk-mrx6y2r5.js:67355-67618 esm-fingerprint
function zp(e) {
  let merged = Object.assign(Object.assign({}, e.headers), e.body);
  if (e.hasNullableType && Object.getOwnPropertyNames(merged).length === 0)
    return e.shouldWrapBody ? { body: null } : null;
  else return e.shouldWrapBody ? Object.assign(Object.assign({}, e.headers), { body: e.body }) : merged;
}
//@ chunk-mrx6y2r5.js:67618-68479 esm-fingerprint
function Aa(e, t) {
  var r, n;
  let parsedHeaders = e.parsedHeaders;
  if (e.request.method === "HEAD")
    return Object.assign(Object.assign({}, parsedHeaders), { body: e.parsedBody });
  let i = t && t.bodyMapper,
    s = Boolean(i === null || i === void 0 ? void 0 : i.nullable),
    a = i === null || i === void 0 ? void 0 : i.type.name;
  if (a === "Stream")
    return Object.assign(Object.assign({}, parsedHeaders), {
      blobBody: e.blobBody,
      readableStreamBody: e.readableStreamBody,
    });
  let c = (a === "Composite" && i.type.modelProperties) || {},
    any = Object.keys(c).some((d) => c[d].serializedName === "");
  if (a === "Sequence" || any) {
    let d = (r = e.parsedBody) !== null && r !== void 0 ? r : [];
    for (let u of Object.keys(c))
      if (c[u].serializedName) d[u] = (n = e.parsedBody) === null || n === void 0 ? void 0 : n[u];
    if (parsedHeaders) for (let u of Object.keys(parsedHeaders)) d[u] = parsedHeaders[u];
    return s && !e.parsedBody && !parsedHeaders && Object.getOwnPropertyNames(c).length === 0 ? null : d;
  }
  return zp({
    body: e.parsedBody,
    headers: parsedHeaders,
    hasNullableType: s,
    shouldWrapBody: Bp(e.parsedBody, a),
  });
}
//@ chunk-mrx6y2r5.js:68479-68798 esm-fingerprint
var ht = {
  Base64Url: "Base64Url",
  Boolean: "Boolean",
  ByteArray: "ByteArray",
  Composite: "Composite",
  Date: "Date",
  DateTime: "DateTime",
  DateTimeRfc1123: "DateTimeRfc1123",
  Dictionary: "Dictionary",
  Enum: "Enum",
  Number: "Number",
  Object: "Object",
  Sequence: "Sequence",
  String: "String",
  Stream: "Stream",
  TimeSpan: "TimeSpan",
  UnixTime: "UnixTime",
};
//@ chunk-mrx6y2r5.js:73790-73944 esm-fingerprint
function kd(e) {
  let t = new Set();
  for (let key in e.responses) {
    let n = e.responses[key];
    if (n.bodyMapper && n.bodyMapper.type.name === ht.Stream) t.add(Number(key));
  }
  return t;
}
//@ chunk-mrx6y2r5.js:73944-74092 esm-fingerprint
function nt(e) {
  let { parameterPath: parameterPath, mapper: mapper } = e,
    n;
  if (typeof parameterPath === "string") n = parameterPath;
  else if (Array.isArray(parameterPath)) n = parameterPath.join(".");
  else n = mapper.serializedName;
  return n;
}
//@ chunk-mrx6y2r5.js:74092-74121 esm-fingerprint
var SERIALIZATIONPOLICY = "serializationPolicy";
//@ chunk-mrx6y2r5.js:74121-74351 esm-fingerprint
function bd(e = {}) {
  let stringifyXML = e.stringifyXML;
  return {
    name: SERIALIZATIONPOLICY,
    async sendRequest(r, n) {
      let o = ft(r),
        i = o === null || o === void 0 ? void 0 : o.operationSpec,
        s = o === null || o === void 0 ? void 0 : o.operationArguments;
      if (i && s) (eg(r, s, i), tg(r, s, i, stringifyXML));
      return n(r);
    },
  };
}
//@ chunk-mrx6y2r5.js:74351-74847 esm-fingerprint
function eg(e, t, r) {
  var n, o;
  if (r.headerParameters)
    for (let headerParameter of r.headerParameters) {
      let a = Nt(t, headerParameter);
      if ((a !== null && a !== void 0) || headerParameter.mapper.required) {
        a = r.serializer.serialize(headerParameter.mapper, a, nt(headerParameter));
        let headerCollectionPrefix = headerParameter.mapper.headerCollectionPrefix;
        if (headerCollectionPrefix)
          for (let l of Object.keys(a)) e.headers.set(headerCollectionPrefix + l, a[l]);
        else e.headers.set(headerParameter.mapper.serializedName || nt(headerParameter), a);
      }
    }
  let i =
    (o = (n = t.options) === null || n === void 0 ? void 0 : n.requestOptions) === null || o === void 0
      ? void 0
      : o.customHeaders;
  if (i) for (let s of Object.keys(i)) e.headers.set(s, i[s]);
}
//@ chunk-mrx6y2r5.js:74847-76365 esm-fingerprint
function tg(
  e,
  t,
  r,
  n = function () {
    throw Error("XML serialization unsupported!");
  },
) {
  var o, i, s, a, c;
  let l = (o = t.options) === null || o === void 0 ? void 0 : o.serializerOptions,
    d = {
      xml: {
        rootName:
          (i = l === null || l === void 0 ? void 0 : l.xml.rootName) !== null && i !== void 0 ? i : "",
        includeRoot:
          (s = l === null || l === void 0 ? void 0 : l.xml.includeRoot) !== null && s !== void 0 ? s : !1,
        xmlCharKey:
          (a = l === null || l === void 0 ? void 0 : l.xml.xmlCharKey) !== null && a !== void 0 ? a : ei,
      },
    },
    xmlCharKey = d.xml.xmlCharKey;
  if (r.requestBody && r.requestBody.mapper) {
    e.body = Nt(t, r.requestBody);
    let mapper = r.requestBody.mapper,
      {
        required: required,
        serializedName: serializedName,
        xmlName: xmlName,
        xmlElementName: xmlElementName,
        xmlNamespace: xmlNamespace,
        xmlNamespacePrefix: xmlNamespacePrefix,
        nullable: nullable,
      } = mapper,
      X = mapper.type.name;
    try {
      if ((e.body !== void 0 && e.body !== null) || (nullable && e.body === null) || required) {
        let A = nt(r.requestBody);
        e.body = r.serializer.serialize(mapper, e.body, A, d);
        let C = X === ht.Stream;
        if (r.isXML) {
          let E = xmlNamespacePrefix ? `xmlns:${xmlNamespacePrefix}` : "xmlns",
            _ = rg(xmlNamespace, E, X, e.body, d);
          if (X === ht.Sequence)
            e.body = n(ng(_, xmlElementName || xmlName || serializedName, E, xmlNamespace), {
              rootName: xmlName || serializedName,
              xmlCharKey: xmlCharKey,
            });
          else if (!C) e.body = n(_, { rootName: xmlName || serializedName, xmlCharKey: xmlCharKey });
        } else if (
          X === ht.String &&
          (((c = r.contentType) === null || c === void 0 ? void 0 : c.match("text/plain")) ||
            r.mediaType === "text")
        )
          return;
        else if (!C) e.body = JSON.stringify(e.body);
      }
    } catch (error) {
      throw Error(
        `Error "${error.message}" occurred in serializing the payload - ${JSON.stringify(serializedName, void 0, "  ")}.`,
      );
    }
  } else if (r.formDataParameters && r.formDataParameters.length > 0) {
    e.formData = {};
    for (let formDataParameter of r.formDataParameters) {
      let p = Nt(t, formDataParameter);
      if (p !== void 0 && p !== null) {
        let y = formDataParameter.mapper.serializedName || nt(formDataParameter);
        e.formData[y] = r.serializer.serialize(formDataParameter.mapper, p, nt(formDataParameter), d);
      }
    }
  }
}
//@ chunk-mrx6y2r5.js:76365-76509 esm-fingerprint
function rg(e, t, r, n, o) {
  if (e && !["Composite", "Sequence", "Dictionary"].includes(r)) {
    let i = {};
    return ((i[o.xml.xmlCharKey] = n), (i[Ca] = { [t]: e }), i);
  }
  return n;
}
//@ chunk-mrx6y2r5.js:76509-76618 esm-layout
function ng(e, t, r, n) {
  if (!Array.isArray(e)) e = [e];
  if (!r || !n) return { [t]: e };
  let o = { [t]: e };
  return ((o[Ca] = { [r]: n }), o);
}

export { ei, ht, bd, nt, kd, Aa };
