/**
 * protobufjs/src/message.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: protobufjs@7.6.0
 * pieces: chunk-3k21nfa0.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";
import { require_minimal } from "./util/minimal.js";

//@ chunk-3k21nfa0.js:90850-91572 cjs-fingerprint
var require_message = __commonJS(function (cjsExports, cjsModule) {
  cjsModule.exports = Message;
  var util = require_minimal();
  function Message(properties) {
    if (properties)
      for (var keys = Object.keys(properties), i_2 = 0; i_2 < keys.length; ++i_2) {
        var key = keys[i_2];
        if (key === "__proto__") continue;
        this[key] = properties[key];
      }
  }
  Message.create = function (properties) {
    return this.$type.create(properties);
  };
  Message.encode = function (message, writer) {
    return this.$type.encode(message, writer);
  };
  Message.encodeDelimited = function (message, writer) {
    return this.$type.encodeDelimited(message, writer);
  };
  Message.decode = function (reader) {
    return this.$type.decode(reader);
  };
  Message.decodeDelimited = function (reader) {
    return this.$type.decodeDelimited(reader);
  };
  Message.verify = function (message) {
    return this.$type.verify(message);
  };
  Message.fromObject = function (object) {
    return this.$type.fromObject(object);
  };
  Message.toObject = function (message, options) {
    return this.$type.toObject(message, options);
  };
  Message.prototype.toJSON = function () {
    return this.$type.toObject(this, util.toJSONOptions);
  };
});
export { require_message };
