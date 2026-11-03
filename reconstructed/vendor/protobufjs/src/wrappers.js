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
var Ga = x(function (Ed) {
  var yE = Ed,
    _E = Os();
  yE[".google.protobuf.Any"] = {
    fromObject: function (e, t) {
      if (e && e["@type"]) {
        var substring = e["@type"].substring(e["@type"].lastIndexOf("/") + 1),
          lookup = this.lookup(substring);
        if (lookup) {
          var s = e["@type"].charAt(0) === "." ? e["@type"].slice(1) : e["@type"];
          if (s.indexOf("/") === -1) s = "/" + s;
          var n = t === void 0 ? 1 : t + 1;
          return this.create({ type_url: s, value: lookup.encode(lookup.fromObject(e, n)).finish() });
        }
      }
      return this.fromObject(e, t);
    },
    toObject: function (e, t) {
      var r = "type.googleapis.com/",
        i = "",
        s = "";
      if (t && t.json && e.type_url && e.value) {
        ((s = e.type_url.substring(e.type_url.lastIndexOf("/") + 1)),
          (i = e.type_url.substring(0, e.type_url.lastIndexOf("/") + 1)));
        var lookup = this.lookup(s);
        if (lookup) e = lookup.decode(e.value);
      }
      if (!(e instanceof this.ctor) && e instanceof _E) {
        var toObject = e.$type.toObject(e, t),
          o = e.$type.fullName[0] === "." ? e.$type.fullName.slice(1) : e.$type.fullName;
        if (i === "") i = r;
        return ((s = i + o), (toObject["@type"] = s), toObject);
      }
      return this.toObject(e, t);
    },
  };
});

export { Ga };
