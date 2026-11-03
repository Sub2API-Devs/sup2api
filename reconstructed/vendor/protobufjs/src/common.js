/**
 * protobufjs/src/common.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: protobufjs@7.6.0
 * pieces: chunk-pwh5dx3n.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";

//@ chunk-pwh5dx3n.js:141305-142798 cjs-fingerprint
var th = x(function (RA, eh) {
  eh.exports = ot;
  var dT = /\/|\./;
  function ot(e, t) {
    if (!dT.test(e))
      ((e = "google/protobuf/" + e + ".proto"),
        (t = { nested: { google: { nested: { protobuf: { nested: t } } } } }));
    ot[e] = t;
  }
  ot("any", { Any: { fields: { type_url: { type: "string", id: 1 }, value: { type: "bytes", id: 2 } } } });
  var Zd;
  ot("duration", {
    Duration: (Zd = { fields: { seconds: { type: "int64", id: 1 }, nanos: { type: "int32", id: 2 } } }),
  });
  ot("timestamp", { Timestamp: Zd });
  ot("empty", { Empty: { fields: {} } });
  ot("struct", {
    Struct: { fields: { fields: { keyType: "string", type: "Value", id: 1 } } },
    Value: {
      oneofs: {
        kind: { oneof: ["nullValue", "numberValue", "stringValue", "boolValue", "structValue", "listValue"] },
      },
      fields: {
        nullValue: { type: "NullValue", id: 1 },
        numberValue: { type: "double", id: 2 },
        stringValue: { type: "string", id: 3 },
        boolValue: { type: "bool", id: 4 },
        structValue: { type: "Struct", id: 5 },
        listValue: { type: "ListValue", id: 6 },
      },
    },
    NullValue: { values: { NULL_VALUE: 0 } },
    ListValue: { fields: { values: { rule: "repeated", type: "Value", id: 1 } } },
  });
  ot("wrappers", {
    DoubleValue: { fields: { value: { type: "double", id: 1 } } },
    FloatValue: { fields: { value: { type: "float", id: 1 } } },
    Int64Value: { fields: { value: { type: "int64", id: 1 } } },
    UInt64Value: { fields: { value: { type: "uint64", id: 1 } } },
    Int32Value: { fields: { value: { type: "int32", id: 1 } } },
    UInt32Value: { fields: { value: { type: "uint32", id: 1 } } },
    BoolValue: { fields: { value: { type: "bool", id: 1 } } },
    StringValue: { fields: { value: { type: "string", id: 1 } } },
    BytesValue: { fields: { value: { type: "bytes", id: 1 } } },
  });
  ot("field_mask", { FieldMask: { fields: { paths: { rule: "repeated", type: "string", id: 1 } } } });
  ot.get = function (t) {
    return ot[t] || null;
  };
});

export { th };
