/**
 * protobufjs/src/wrappers.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: protobufjs@7.6.0
 * pieces: chunk-pwh5dx3n.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { Os } from "./message.js";

//@ chunk-pwh5dx3n.js:101568-102455 cjs-fingerprint
var Ga = x(function (cjsExports) {
  var wrappers = cjsExports;
  var Message = Os();
  wrappers[".google.protobuf.Any"] = {
    fromObject: function (object, depth) {
      if (object && object["@type"]) {
        var name = object["@type"].substring(object["@type"].lastIndexOf("/") + 1);
        var type = this.lookup(name);
        if (type) {
          var type_url = object["@type"].charAt(0) === "." ? object["@type"].slice(1) : object["@type"];
          if (type_url.indexOf("/") === -1) type_url = "/" + type_url;
          var nextDepth = depth === undefined ? 1 : depth + 1;
          return this.create({
            type_url,
            value: type.encode(type.fromObject(object, nextDepth)).finish(),
          });
        }
      }
      return this.fromObject(object, depth);
    },
    toObject: function (message, options) {
      var googleApi = "type.googleapis.com/";
      var prefix = "";
      var name = "";
      if (options && options.json && message.type_url && message.value) {
        name = message.type_url.substring(message.type_url.lastIndexOf("/") + 1);
        prefix = message.type_url.substring(0, message.type_url.lastIndexOf("/") + 1);
        var type = this.lookup(name);
        if (type) message = type.decode(message.value);
      }
      if (!(message instanceof this.ctor) && message instanceof Message) {
        var object = message.$type.toObject(message, options);
        var messageName =
          message.$type.fullName[0] === "." ? message.$type.fullName.slice(1) : message.$type.fullName;
        if (prefix === "") prefix = googleApi;
        name = prefix + messageName;
        object["@type"] = name;
        return object;
      }
      return this.toObject(message, options);
    },
  };
});
export { Ga };
