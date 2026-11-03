/**
 * form-data/lib/form_data.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: form-data@4.0.6
 * pieces: chunk-h6b7mazd.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x, importMetaRequire } from "../../../runtime/bun-runtime.js";
import { require_combined_stream } from "../../combined-stream/lib/combined_stream.js";
import { require_mime_types } from "../../mime-types/index.js";
import { require_asynckit_2 } from "../../asynckit/index.js";
import { require_es_set_tostringtag } from "../../es-set-tostringtag/index.js";
import { require_hasown_2 } from "../../hasown/index.js";
import { require_populate } from "./populate.js";

//@ chunk-h6b7mazd.js:21450-27156 cjs-fingerprint
var require_form_data = x(function (cjsExports, cjsModule) {
  var CombinedStream = require_combined_stream();
  var util = importMetaRequire("util");
  var path = importMetaRequire("path");
  var http = importMetaRequire("http");
  var https = importMetaRequire("https");
  var parseUrl = importMetaRequire("url").parse;
  var fs = importMetaRequire("fs");
  var Stream = importMetaRequire("stream").Stream;
  var uc = importMetaRequire("crypto");
  var mime = require_mime_types();
  var asynckit = require_asynckit_2();
  var setToStringTag = require_es_set_tostringtag();
  var hasOwn = require_hasown_2();
  var populate = require_populate();
  function escapeHeaderParam(str) {
    return String(str).replace(/\r/g, "%0D").replace(/\n/g, "%0A").replace(/"/g, "%22");
  }
  function A(options) {
    if (!(this instanceof A)) return new A(options);
    this._overheadLength = 0;
    this._valueLength = 0;
    this._valuesToMeasure = [];
    CombinedStream.call(this);
    options = options || {};
    for (var option in options) this[option] = options[option];
  }
  util.inherits(A, CombinedStream);
  A.LINE_BREAK = `\r
`;
  A.DEFAULT_CONTENT_TYPE = "application/octet-stream";
  A.prototype.append = function (field, value, options) {
    options = options || {};
    if (typeof options === "string")
      options = {
        filename: options,
      };
    var append = CombinedStream.prototype.append.bind(this);
    if (typeof value === "number" || value == null) value = String(value);
    if (Array.isArray(value)) {
      this._error(Error("Arrays are not supported."));
      return;
    }
    var header = this._multiPartHeader(field, value, options);
    var footer = this._multiPartFooter();
    append(header);
    append(value);
    append(footer);
    this._trackLength(header, value, options);
  };
  A.prototype._trackLength = function (header, value, options) {
    var valueLength = 0;
    if (options.knownLength != null) valueLength += Number(options.knownLength);
    else if (Buffer.isBuffer(value)) valueLength = value.length;
    else if (typeof value === "string") valueLength = Buffer.byteLength(value);
    this._valueLength += valueLength;
    this._overheadLength += Buffer.byteLength(header) + A.LINE_BREAK.length;
    if (
      !value ||
      (!value.path && !(value.readable && hasOwn(value, "httpVersion")) && !(value instanceof Stream))
    )
      return;
    if (!options.knownLength) this._valuesToMeasure.push(value);
  };
  A.prototype._lengthRetriever = function (value, callback) {
    if (hasOwn(value, "fd")) {
      if (value.end != null && value.end != 1 / 0 && value.start != null)
        callback(null, value.end + 1 - (value.start ? value.start : 0));
      else
        fs.stat(value.path, function (err, stat) {
          if (err) {
            callback(err);
            return;
          }
          var fileSize = stat.size - (value.start ? value.start : 0);
          callback(null, fileSize);
        });
    } else if (hasOwn(value, "httpVersion")) callback(null, Number(value.headers["content-length"]));
    else if (hasOwn(value, "httpModule")) {
      value.on("response", function (response) {
        value.pause();
        callback(null, Number(response.headers["content-length"]));
      });
      value.resume();
    } else callback("Unknown stream");
  };
  A.prototype._multiPartHeader = function (field, value, options) {
    if (typeof options.header === "string") return options.header;
    var contentDisposition = this._getContentDisposition(value, options);
    var contentType = this._getContentType(value, options);
    var contents = "";
    var headers = {
      "Content-Disposition": ["form-data", 'name="' + escapeHeaderParam(field) + '"'].concat(
        contentDisposition || [],
      ),
      "Content-Type": [].concat(contentType || []),
    };
    if (typeof options.header === "object") populate(headers, options.header);
    var header;
    for (var prop in headers)
      if (hasOwn(headers, prop)) {
        header = headers[prop];
        if (header == null) continue;
        if (!Array.isArray(header)) header = [header];
        if (header.length) contents += prop + ": " + header.join("; ") + A.LINE_BREAK;
      }
    return "--" + this.getBoundary() + A.LINE_BREAK + contents + A.LINE_BREAK;
  };
  A.prototype._getContentDisposition = function (value, options) {
    var filename;
    if (typeof options.filepath === "string") filename = path.normalize(options.filepath).replace(/\\/g, "/");
    else if (options.filename || (value && (value.name || value.path)))
      filename = path.basename(options.filename || (value && (value.name || value.path)));
    else if (value && value.readable && hasOwn(value, "httpVersion"))
      filename = path.basename(value.client._httpMessage.path || "");
    if (filename) return 'filename="' + escapeHeaderParam(filename) + '"';
  };
  A.prototype._getContentType = function (value, options) {
    var contentType = options.contentType;
    if (!contentType && value && value.name) contentType = mime.lookup(value.name);
    if (!contentType && value && value.path) contentType = mime.lookup(value.path);
    if (!contentType && value && value.readable && hasOwn(value, "httpVersion"))
      contentType = value.headers["content-type"];
    if (!contentType && (options.filepath || options.filename))
      contentType = mime.lookup(options.filepath || options.filename);
    if (!contentType && value && typeof value === "object") contentType = A.DEFAULT_CONTENT_TYPE;
    return contentType;
  };
  A.prototype._multiPartFooter = function () {
    return function (next) {
      var footer = A.LINE_BREAK;
      var lastPart = this._streams.length === 0;
      if (lastPart) footer += this._lastBoundary();
      next(footer);
    }.bind(this);
  };
  A.prototype._lastBoundary = function () {
    return "--" + this.getBoundary() + "--" + A.LINE_BREAK;
  };
  A.prototype.getHeaders = function (userHeaders) {
    var header;
    var formHeaders = {
      "content-type": "multipart/form-data; boundary=" + this.getBoundary(),
    };
    for (header in userHeaders)
      if (hasOwn(userHeaders, header)) formHeaders[header.toLowerCase()] = userHeaders[header];
    return formHeaders;
  };
  A.prototype.setBoundary = function (boundary) {
    if (typeof boundary !== "string") throw TypeError("FormData boundary must be a string");
    this._boundary = boundary;
  };
  A.prototype.getBoundary = function () {
    if (!this._boundary) this._generateBoundary();
    return this._boundary;
  };
  A.prototype.getBuffer = function () {
    var dataBuffer = new Buffer.alloc(0);
    var boundary = this.getBoundary();
    for (var i = 0, len = this._streams.length; i < len; i++)
      if (typeof this._streams[i] !== "function") {
        if (Buffer.isBuffer(this._streams[i])) dataBuffer = Buffer.concat([dataBuffer, this._streams[i]]);
        else dataBuffer = Buffer.concat([dataBuffer, Buffer.from(this._streams[i])]);
        if (
          typeof this._streams[i] !== "string" ||
          this._streams[i].substring(2, boundary.length + 2) !== boundary
        )
          dataBuffer = Buffer.concat([dataBuffer, Buffer.from(A.LINE_BREAK)]);
      }
    return Buffer.concat([dataBuffer, Buffer.from(this._lastBoundary())]);
  };
  A.prototype._generateBoundary = function () {
    this._boundary = "--------------------------" + uc.randomBytes(12).toString("hex");
  };
  A.prototype.getLengthSync = function () {
    var knownLength = this._overheadLength + this._valueLength;
    if (this._streams.length) knownLength += this._lastBoundary().length;
    if (!this.hasKnownLength()) this._error(Error("Cannot calculate proper length in synchronous way."));
    return knownLength;
  };
  A.prototype.hasKnownLength = function () {
    var hasKnownLength = true;
    if (this._valuesToMeasure.length) hasKnownLength = false;
    return hasKnownLength;
  };
  A.prototype.getLength = function (cb) {
    var knownLength = this._overheadLength + this._valueLength;
    if (this._streams.length) knownLength += this._lastBoundary().length;
    if (!this._valuesToMeasure.length) {
      process.nextTick(cb.bind(this, null, knownLength));
      return;
    }
    asynckit.parallel(this._valuesToMeasure, this._lengthRetriever, function (err, values) {
      if (err) {
        cb(err);
        return;
      }
      values.forEach(function (length) {
        knownLength += length;
      });
      cb(null, knownLength);
    });
  };
  A.prototype.submit = function (params, cb) {
    var request;
    var options;
    var defaults = {
      method: "post",
    };
    if (typeof params === "string") {
      params = parseUrl(params);
      options = populate(
        {
          port: params.port,
          path: params.pathname,
          host: params.hostname,
          protocol: params.protocol,
        },
        defaults,
      );
    } else {
      options = populate(params, defaults);
      if (!options.port) options.port = options.protocol === "https:" ? 443 : 80;
    }
    options.headers = this.getHeaders(params.headers);
    if (options.protocol === "https:") request = https.request(options);
    else request = http.request(options);
    this.getLength(
      function (err, length) {
        if (err && err !== "Unknown stream") {
          this._error(err);
          return;
        }
        if (length) request.setHeader("Content-Length", length);
        this.pipe(request);
        if (cb) {
          var onResponse;
          var callback = function (error, responce) {
            request.removeListener("error", callback);
            request.removeListener("response", onResponse);
            return cb.call(this, error, responce);
          };
          onResponse = callback.bind(this, null);
          request.on("error", callback);
          request.on("response", onResponse);
        }
      }.bind(this),
    );
    return request;
  };
  A.prototype._error = function (err) {
    if (!this.error) {
      this.error = err;
      this.pause();
      this.emit("error", err);
    }
  };
  A.prototype.toString = function () {
    return "[object FormData]";
  };
  setToStringTag(A.prototype, "FormData");
  cjsModule.exports = A;
});
export { require_form_data };
