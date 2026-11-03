/**
 * @typespec/ts-http-runtime/dist/esm/nodeHttpClient.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @typespec/ts-http-runtime@0.2.3..0.3.0
 * pieces: chunk-mrx6y2r5.js (10)
 * attribution: esm-layout 1, esm-fingerprint 9
 */
import { Transform } from "stream";
import * as httpModule from "http";
import * as httpsModule from "https";
import * as zlibModule from "zlib";
import { AbortError_2, RestError } from "./restError.js";
import { tt } from "./util/sanitizer.js";
import { Ve } from "./log.js";
import { et } from "./pipelineRequest.js";

//@ chunk-mrx6y2r5.js:37932-37942 esm-layout
var Pm = {};
//@ chunk-mrx6y2r5.js:37942-37994 esm-fingerprint
function Gn(e) {
  return e && typeof e.pipe === "function";
}
//@ chunk-mrx6y2r5.js:37994-38224 esm-fingerprint
function fl(e) {
  if (e.readable === !1) return Promise.resolve();
  return new Promise((t) => {
    let r = () => {
      (t(), e.removeListener("close", r), e.removeListener("end", r), e.removeListener("error", r));
    };
    (e.on("close", r), e.on("end", r), e.on("error", r));
  });
}
//@ chunk-mrx6y2r5.js:38224-38280 esm-fingerprint
function ml(e) {
  return e && typeof e.byteLength === "number";
}
//@ chunk-mrx6y2r5.js:38280-38502 esm-fingerprint
class Ks extends Transform {
  _transform(e, t, r) {
    (this.push(e), (this.loadedBytes += e.length));
    try {
      (this.progressCallback({ loadedBytes: this.loadedBytes }), r());
    } catch (error) {
      r(error);
    }
  }
  constructor(e) {
    super();
    ((this.loadedBytes = 0), (this.progressCallback = e));
  }
}
//@ chunk-mrx6y2r5.js:38502-41828 esm-fingerprint
class pl {
  constructor() {
    this.cachedHttpsAgents = new WeakMap();
  }
  async sendRequest(e) {
    var t, r, n;
    let abortController = new AbortController(),
      i;
    if (e.abortSignal) {
      if (e.abortSignal.aborted)
        throw new AbortError_2("The operation was aborted. Request has already been canceled.");
      ((i = (u) => {
        if (u.type === "abort") abortController.abort();
      }),
        e.abortSignal.addEventListener("abort", i));
    }
    let s;
    if (e.timeout > 0)
      s = setTimeout(() => {
        let u = new tt();
        (Ve.info(`request to '${u.sanitizeUrl(e.url)}' timed out. canceling...`), abortController.abort());
      }, e.timeout);
    let a = e.headers.get("Accept-Encoding"),
      c =
        (a === null || a === void 0 ? void 0 : a.includes("gzip")) ||
        (a === null || a === void 0 ? void 0 : a.includes("deflate")),
      l = typeof e.body === "function" ? e.body() : e.body;
    if (l && !e.headers.has("Content-Length")) {
      let u = getBodyLength(l);
      if (u !== null) e.headers.set("Content-Length", u);
    }
    let d;
    try {
      if (l && e.onUploadProgress) {
        let onUploadProgress = e.onUploadProgress,
          v = new Ks(onUploadProgress);
        if (
          (v.on("error", (U) => {
            Ve.error("Error in upload progress", U);
          }),
          Gn(l))
        )
          l.pipe(v);
        else v.end(l);
        l = v;
      }
      let request = await this.makeRequest(e, abortController, l);
      if (s !== void 0) clearTimeout(s);
      let m = Om(request),
        y = { status: (t = request.statusCode) !== null && t !== void 0 ? t : 0, headers: m, request: e };
      if (e.method === "HEAD") return (request.resume(), y);
      d = c ? Nm(request, m) : request;
      let onDownloadProgress = e.onDownloadProgress;
      if (onDownloadProgress) {
        let I = new Ks(onDownloadProgress);
        (I.on("error", (v) => {
          Ve.error("Error in download progress", v);
        }),
          d.pipe(I),
          (d = I));
      }
      if (
        ((r = e.streamResponseStatusCodes) === null || r === void 0
          ? void 0
          : r.has(Number.POSITIVE_INFINITY)) ||
        ((n = e.streamResponseStatusCodes) === null || n === void 0 ? void 0 : n.has(y.status))
      )
        y.readableStreamBody = d;
      else y.bodyAsText = await xm(d);
      return y;
    } finally {
      if (e.abortSignal && i) {
        let resolved = Promise.resolve();
        if (Gn(l)) resolved = fl(l);
        let resolved_2 = Promise.resolve();
        if (Gn(d)) resolved_2 = fl(d);
        Promise.all([resolved, resolved_2])
          .then(() => {
            var p;
            if (i) (p = e.abortSignal) === null || p === void 0 || p.removeEventListener("abort", i);
          })
          .catch((p) => {
            Ve.warning("Error when cleaning up abortListener on httpRequest", p);
          });
      }
    }
  }
  makeRequest(e, t, r) {
    var n;
    let o = new URL(e.url),
      i = o.protocol !== "https:";
    if (i && !e.allowInsecureConnection)
      throw Error(`Cannot connect to ${e.url} while allowInsecureConnection is false.`);
    let s = (n = e.agent) !== null && n !== void 0 ? n : this.getOrCreateAgent(e, i),
      merged = Object.assign(
        {
          agent: s,
          hostname: o.hostname,
          path: `${o.pathname}${o.search}`,
          port: o.port,
          method: e.method,
          headers: e.headers.toJSON({ preserveCase: !0 }),
        },
        e.requestOverrides,
      );
    return new Promise((c, l) => {
      let d = i ? httpModule.request(merged, c) : httpsModule.request(merged, c);
      if (
        (d.once("error", (u) => {
          var m;
          l(
            new RestError(u.message, {
              code: (m = u.code) !== null && m !== void 0 ? m : RestError.REQUEST_SEND_ERROR,
              request: e,
            }),
          );
        }),
        t.signal.addEventListener("abort", () => {
          let u = new AbortError_2(
            "The operation was aborted. Rejecting from abort signal callback while making request.",
          );
          (d.destroy(u), l(u));
        }),
        r && Gn(r))
      )
        r.pipe(d);
      else if (r)
        if (typeof r === "string" || Buffer.isBuffer(r)) d.end(r);
        else if (ml(r)) d.end(ArrayBuffer.isView(r) ? Buffer.from(r.buffer) : Buffer.from(r));
        else (Ve.error("Unrecognized body type", r), l(new RestError("Unrecognized body type")));
      else d.end();
    });
  }
  getOrCreateAgent(e, t) {
    var r;
    let disableKeepAlive = e.disableKeepAlive;
    if (t) {
      if (disableKeepAlive) return httpModule.globalAgent;
      if (!this.cachedHttpAgent) this.cachedHttpAgent = new httpModule.Agent({ keepAlive: !0 });
      return this.cachedHttpAgent;
    } else {
      if (disableKeepAlive && !e.tlsSettings) return httpsModule.globalAgent;
      let o = (r = e.tlsSettings) !== null && r !== void 0 ? r : Pm,
        i = this.cachedHttpsAgents.get(o);
      if (i && i.options.keepAlive === !disableKeepAlive) return i;
      return (
        Ve.info("No cached TLS Agent exist, creating a new Agent"),
        (i = new httpsModule.Agent(Object.assign({ keepAlive: !disableKeepAlive }, o))),
        this.cachedHttpsAgents.set(o, i),
        i
      );
    }
  }
}
//@ chunk-mrx6y2r5.js:41828-41989 esm-fingerprint
function Om(e) {
  let t = et();
  for (let r of Object.keys(e.headers)) {
    let n = e.headers[r];
    if (Array.isArray(n)) {
      if (n.length > 0) t.set(r, n[0]);
    } else if (n) t.set(r, n);
  }
  return t;
}
//@ chunk-mrx6y2r5.js:41989-42172 esm-fingerprint
function Nm(e, t) {
  let r = t.get("Content-Encoding");
  if (r === "gzip") {
    let gunzip = zlibModule.createGunzip();
    return (e.pipe(gunzip), gunzip);
  } else if (r === "deflate") {
    let inflate = zlibModule.createInflate();
    return (e.pipe(inflate), inflate);
  }
  return e;
}
//@ chunk-mrx6y2r5.js:42172-42529 esm-fingerprint
function xm(e) {
  return new Promise((t, r) => {
    let n = [];
    (e.on("data", (o) => {
      if (Buffer.isBuffer(o)) n.push(o);
      else n.push(Buffer.from(o));
    }),
      e.on("end", () => {
        t(Buffer.concat(n).toString("utf8"));
      }),
      e.on("error", (o) => {
        if (o && (o === null || o === void 0 ? void 0 : o.name) === "AbortError") r(o);
        else
          r(new RestError(`Error reading response as text: ${o.message}`, { code: RestError.PARSE_ERROR }));
      }));
  });
}
//@ chunk-mrx6y2r5.js:42529-42736 esm-fingerprint
function getBodyLength(e) {
  if (!e) return 0;
  else if (Buffer.isBuffer(e)) return e.length;
  else if (Gn(e)) return null;
  else if (ml(e)) return e.byteLength;
  else if (typeof e === "string") return Buffer.from(e).length;
  else return null;
}

export { pl };
