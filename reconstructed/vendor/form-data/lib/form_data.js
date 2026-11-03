/**
 * form-data/lib/form_data.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: form-data@4.0.6
 * pieces: chunk-h6b7mazd.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x, importMetaRequire } from "../../../runtime/bun-runtime.js";
import { xn } from "../../combined-stream/lib/combined_stream.js";
import { Sn } from "../../mime-types/index.js";
import { Mn } from "../../asynckit/index.js";
import { ds } from "../../es-set-tostringtag/index.js";
import { ms } from "../../hasown/index.js";
import { bs } from "./populate.js";

//@ chunk-h6b7mazd.js:21450-27156 cjs-fingerprint
var Rs = x(function (Sp, Es) {
  var dr = xn(),
    tc = importMetaRequire("util"),
    fr = importMetaRequire("path"),
    rc = importMetaRequire("http"),
    oc = importMetaRequire("https"),
    parse = importMetaRequire("url").parse,
    ic = importMetaRequire("fs"),
    Stream = importMetaRequire("stream").Stream,
    uc = importMetaRequire("crypto"),
    lr = Sn(),
    cc = Mn(),
    fc = ds(),
    pe = ms(),
    pr = bs();
  function gs(e) {
    return String(e).replace(/\r/g, "%0D").replace(/\n/g, "%0A").replace(/"/g, "%22");
  }
  function A(e) {
    if (!(this instanceof A)) return new A(e);
    ((this._overheadLength = 0),
      (this._valueLength = 0),
      (this._valuesToMeasure = []),
      dr.call(this),
      (e = e || {}));
    for (var key in e) this[key] = e[key];
  }
  tc.inherits(A, dr);
  A.LINE_BREAK = `\r
`;
  A.DEFAULT_CONTENT_TYPE = "application/octet-stream";
  A.prototype.append = function (e, t, r) {
    if (((r = r || {}), typeof r === "string")) r = { filename: r };
    var n = dr.prototype.append.bind(this);
    if (typeof t === "number" || t == null) t = String(t);
    if (Array.isArray(t)) {
      this._error(Error("Arrays are not supported."));
      return;
    }
    var _multiPartHeader = this._multiPartHeader(e, t, r),
      _multiPartFooter = this._multiPartFooter();
    (n(_multiPartHeader), n(t), n(_multiPartFooter), this._trackLength(_multiPartHeader, t, r));
  };
  A.prototype._trackLength = function (e, t, r) {
    var n = 0;
    if (r.knownLength != null) n += Number(r.knownLength);
    else if (Buffer.isBuffer(t)) n = t.length;
    else if (typeof t === "string") n = Buffer.byteLength(t);
    if (
      ((this._valueLength += n),
      (this._overheadLength += Buffer.byteLength(e) + A.LINE_BREAK.length),
      !t || (!t.path && !(t.readable && pe(t, "httpVersion")) && !(t instanceof Stream)))
    )
      return;
    if (!r.knownLength) this._valuesToMeasure.push(t);
  };
  A.prototype._lengthRetriever = function (e, t) {
    if (pe(e, "fd"))
      if (e.end != null && e.end != 1 / 0 && e.start != null) t(null, e.end + 1 - (e.start ? e.start : 0));
      else
        ic.stat(e.path, function (r, n) {
          if (r) {
            t(r);
            return;
          }
          var o = n.size - (e.start ? e.start : 0);
          t(null, o);
        });
    else if (pe(e, "httpVersion")) t(null, Number(e.headers["content-length"]));
    else if (pe(e, "httpModule"))
      (e.on("response", function (r) {
        (e.pause(), t(null, Number(r.headers["content-length"])));
      }),
        e.resume());
    else t("Unknown stream");
  };
  A.prototype._multiPartHeader = function (e, t, r) {
    if (typeof r.header === "string") return r.header;
    var _getContentDisposition = this._getContentDisposition(t, r),
      _getContentType = this._getContentType(t, r),
      s = "",
      i = {
        "Content-Disposition": ["form-data", 'name="' + gs(e) + '"'].concat(_getContentDisposition || []),
        "Content-Type": [].concat(_getContentType || []),
      };
    if (typeof r.header === "object") pr(i, r.header);
    var a;
    for (var key in i)
      if (pe(i, key)) {
        if (((a = i[key]), a == null)) continue;
        if (!Array.isArray(a)) a = [a];
        if (a.length) s += key + ": " + a.join("; ") + A.LINE_BREAK;
      }
    return "--" + this.getBoundary() + A.LINE_BREAK + s + A.LINE_BREAK;
  };
  A.prototype._getContentDisposition = function (e, t) {
    var r;
    if (typeof t.filepath === "string") r = fr.normalize(t.filepath).replace(/\\/g, "/");
    else if (t.filename || (e && (e.name || e.path)))
      r = fr.basename(t.filename || (e && (e.name || e.path)));
    else if (e && e.readable && pe(e, "httpVersion")) r = fr.basename(e.client._httpMessage.path || "");
    if (r) return 'filename="' + gs(r) + '"';
  };
  A.prototype._getContentType = function (e, t) {
    var contentType = t.contentType;
    if (!contentType && e && e.name) contentType = lr.lookup(e.name);
    if (!contentType && e && e.path) contentType = lr.lookup(e.path);
    if (!contentType && e && e.readable && pe(e, "httpVersion")) contentType = e.headers["content-type"];
    if (!contentType && (t.filepath || t.filename)) contentType = lr.lookup(t.filepath || t.filename);
    if (!contentType && e && typeof e === "object") contentType = A.DEFAULT_CONTENT_TYPE;
    return contentType;
  };
  A.prototype._multiPartFooter = function () {
    return function (e) {
      var LINE_BREAK = A.LINE_BREAK,
        r = this._streams.length === 0;
      if (r) LINE_BREAK += this._lastBoundary();
      e(LINE_BREAK);
    }.bind(this);
  };
  A.prototype._lastBoundary = function () {
    return "--" + this.getBoundary() + "--" + A.LINE_BREAK;
  };
  A.prototype.getHeaders = function (e) {
    var t,
      r = { "content-type": "multipart/form-data; boundary=" + this.getBoundary() };
    for (t in e) if (pe(e, t)) r[t.toLowerCase()] = e[t];
    return r;
  };
  A.prototype.setBoundary = function (e) {
    if (typeof e !== "string") throw TypeError("FormData boundary must be a string");
    this._boundary = e;
  };
  A.prototype.getBoundary = function () {
    if (!this._boundary) this._generateBoundary();
    return this._boundary;
  };
  A.prototype.getBuffer = function () {
    var e = new Buffer.alloc(0),
      boundary = this.getBoundary();
    for (var r = 0, n = this._streams.length; r < n; r++)
      if (typeof this._streams[r] !== "function") {
        if (Buffer.isBuffer(this._streams[r])) e = Buffer.concat([e, this._streams[r]]);
        else e = Buffer.concat([e, Buffer.from(this._streams[r])]);
        if (
          typeof this._streams[r] !== "string" ||
          this._streams[r].substring(2, boundary.length + 2) !== boundary
        )
          e = Buffer.concat([e, Buffer.from(A.LINE_BREAK)]);
      }
    return Buffer.concat([e, Buffer.from(this._lastBoundary())]);
  };
  A.prototype._generateBoundary = function () {
    this._boundary = "--------------------------" + uc.randomBytes(12).toString("hex");
  };
  A.prototype.getLengthSync = function () {
    var e = this._overheadLength + this._valueLength;
    if (this._streams.length) e += this._lastBoundary().length;
    if (!this.hasKnownLength()) this._error(Error("Cannot calculate proper length in synchronous way."));
    return e;
  };
  A.prototype.hasKnownLength = function () {
    var e = !0;
    if (this._valuesToMeasure.length) e = !1;
    return e;
  };
  A.prototype.getLength = function (e) {
    var t = this._overheadLength + this._valueLength;
    if (this._streams.length) t += this._lastBoundary().length;
    if (!this._valuesToMeasure.length) {
      process.nextTick(e.bind(this, null, t));
      return;
    }
    cc.parallel(this._valuesToMeasure, this._lengthRetriever, function (r, n) {
      if (r) {
        e(r);
        return;
      }
      (n.forEach(function (o) {
        t += o;
      }),
        e(null, t));
    });
  };
  A.prototype.submit = function (e, t) {
    var r,
      n,
      o = { method: "post" };
    if (typeof e === "string")
      ((e = parse(e)),
        (n = pr({ port: e.port, path: e.pathname, host: e.hostname, protocol: e.protocol }, o)));
    else if (((n = pr(e, o)), !n.port)) n.port = n.protocol === "https:" ? 443 : 80;
    if (((n.headers = this.getHeaders(e.headers)), n.protocol === "https:")) r = oc.request(n);
    else r = rc.request(n);
    return (
      this.getLength(
        function (s, i) {
          if (s && s !== "Unknown stream") {
            this._error(s);
            return;
          }
          if (i) r.setHeader("Content-Length", i);
          if ((this.pipe(r), t)) {
            var a,
              l = function (f, c) {
                return (r.removeListener("error", l), r.removeListener("response", a), t.call(this, f, c));
              };
            ((a = l.bind(this, null)), r.on("error", l), r.on("response", a));
          }
        }.bind(this),
      ),
      r
    );
  };
  A.prototype._error = function (e) {
    if (!this.error) ((this.error = e), this.pause(), this.emit("error", e));
  };
  A.prototype.toString = function () {
    return "[object FormData]";
  };
  fc(A.prototype, "FormData");
  Es.exports = A;
});

export { Rs };
