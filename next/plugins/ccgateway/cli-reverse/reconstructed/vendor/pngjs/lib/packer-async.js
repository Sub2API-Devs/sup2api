/**
 * pngjs/lib/packer-async.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: pngjs@5.0.0
 * pieces: chunk-s2h2kd6t.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS, importMetaRequire } from "../../../runtime/bun-runtime.js";
import { require_constants } from "./constants.js";
import { require_packer } from "./packer.js";

//@ chunk-s2h2kd6t.js:42993-43714 cjs-fingerprint
var require_packer_async = __commonJS(function (cjsExports, cjsModule) {
  var util = importMetaRequire("util");
  var Stream = importMetaRequire("stream");
  var constants = require_constants();
  var Packer = require_packer();
  var PackerAsync = (cjsModule.exports = function (opt) {
    Stream.call(this);
    let options = opt || {};
    this._packer = new Packer(options);
    this._deflate = this._packer.createDeflate();
    this.readable = true;
  });
  util.inherits(PackerAsync, Stream);
  PackerAsync.prototype.pack = function (data, width, height, gamma) {
    this.emit("data", Buffer.from(constants.PNG_SIGNATURE));
    this.emit("data", this._packer.packIHDR(width, height));
    if (gamma) this.emit("data", this._packer.packGAMA(gamma));
    let filteredData = this._packer.filterData(data, width, height);
    this._deflate.on("error", this.emit.bind(this, "error"));
    this._deflate.on(
      "data",
      function (compressedData) {
        this.emit("data", this._packer.packIDAT(compressedData));
      }.bind(this),
    );
    this._deflate.on(
      "end",
      function () {
        this.emit("data", this._packer.packIEND());
        this.emit("end");
      }.bind(this),
    );
    this._deflate.end(filteredData);
  };
});
export { require_packer_async };
