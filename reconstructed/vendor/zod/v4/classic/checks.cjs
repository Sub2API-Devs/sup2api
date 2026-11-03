/**
 * zod/v4/classic/checks.cjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { Wr } from "../core/index.cjs";

//@ chunk-1ny7cxrt.js:587814-591116 cjs-fingerprint
var Ah = x(function (Dt) {
  Object.defineProperty(Dt, "__esModule", { value: !0 });
  Dt.slugify =
    Dt.toUpperCase =
    Dt.toLowerCase =
    Dt.trim =
    Dt.normalize =
    Dt.overwrite =
    Dt.mime =
    Dt.property =
    Dt.endsWith =
    Dt.startsWith =
    Dt.includes =
    Dt.uppercase =
    Dt.lowercase =
    Dt.regex =
    Dt.length =
    Dt.minLength =
    Dt.maxLength =
    Dt.size =
    Dt.minSize =
    Dt.maxSize =
    Dt.multipleOf =
    Dt.nonnegative =
    Dt.nonpositive =
    Dt.negative =
    Dt.positive =
    Dt.gte =
    Dt.gt =
    Dt.lte =
    Dt.lt =
      void 0;
  var en = Wr();
  Object.defineProperty(Dt, "lt", {
    enumerable: !0,
    get: function () {
      return en._lt;
    },
  });
  Object.defineProperty(Dt, "lte", {
    enumerable: !0,
    get: function () {
      return en._lte;
    },
  });
  Object.defineProperty(Dt, "gt", {
    enumerable: !0,
    get: function () {
      return en._gt;
    },
  });
  Object.defineProperty(Dt, "gte", {
    enumerable: !0,
    get: function () {
      return en._gte;
    },
  });
  Object.defineProperty(Dt, "positive", {
    enumerable: !0,
    get: function () {
      return en._positive;
    },
  });
  Object.defineProperty(Dt, "negative", {
    enumerable: !0,
    get: function () {
      return en._negative;
    },
  });
  Object.defineProperty(Dt, "nonpositive", {
    enumerable: !0,
    get: function () {
      return en._nonpositive;
    },
  });
  Object.defineProperty(Dt, "nonnegative", {
    enumerable: !0,
    get: function () {
      return en._nonnegative;
    },
  });
  Object.defineProperty(Dt, "multipleOf", {
    enumerable: !0,
    get: function () {
      return en._multipleOf;
    },
  });
  Object.defineProperty(Dt, "maxSize", {
    enumerable: !0,
    get: function () {
      return en._maxSize;
    },
  });
  Object.defineProperty(Dt, "minSize", {
    enumerable: !0,
    get: function () {
      return en._minSize;
    },
  });
  Object.defineProperty(Dt, "size", {
    enumerable: !0,
    get: function () {
      return en._size;
    },
  });
  Object.defineProperty(Dt, "maxLength", {
    enumerable: !0,
    get: function () {
      return en._maxLength;
    },
  });
  Object.defineProperty(Dt, "minLength", {
    enumerable: !0,
    get: function () {
      return en._minLength;
    },
  });
  Object.defineProperty(Dt, "length", {
    enumerable: !0,
    get: function () {
      return en._length;
    },
  });
  Object.defineProperty(Dt, "regex", {
    enumerable: !0,
    get: function () {
      return en._regex;
    },
  });
  Object.defineProperty(Dt, "lowercase", {
    enumerable: !0,
    get: function () {
      return en._lowercase;
    },
  });
  Object.defineProperty(Dt, "uppercase", {
    enumerable: !0,
    get: function () {
      return en._uppercase;
    },
  });
  Object.defineProperty(Dt, "includes", {
    enumerable: !0,
    get: function () {
      return en._includes;
    },
  });
  Object.defineProperty(Dt, "startsWith", {
    enumerable: !0,
    get: function () {
      return en._startsWith;
    },
  });
  Object.defineProperty(Dt, "endsWith", {
    enumerable: !0,
    get: function () {
      return en._endsWith;
    },
  });
  Object.defineProperty(Dt, "property", {
    enumerable: !0,
    get: function () {
      return en._property;
    },
  });
  Object.defineProperty(Dt, "mime", {
    enumerable: !0,
    get: function () {
      return en._mime;
    },
  });
  Object.defineProperty(Dt, "overwrite", {
    enumerable: !0,
    get: function () {
      return en._overwrite;
    },
  });
  Object.defineProperty(Dt, "normalize", {
    enumerable: !0,
    get: function () {
      return en._normalize;
    },
  });
  Object.defineProperty(Dt, "trim", {
    enumerable: !0,
    get: function () {
      return en._trim;
    },
  });
  Object.defineProperty(Dt, "toLowerCase", {
    enumerable: !0,
    get: function () {
      return en._toLowerCase;
    },
  });
  Object.defineProperty(Dt, "toUpperCase", {
    enumerable: !0,
    get: function () {
      return en._toUpperCase;
    },
  });
  Object.defineProperty(Dt, "slugify", {
    enumerable: !0,
    get: function () {
      return en._slugify;
    },
  });
  (function () {
    var ownPropertyNames = Object.getOwnPropertyNames(Dt);
    for (var t = 0; t < ownPropertyNames.length; t++) {
      var ownPropertyDescriptor = Object.getOwnPropertyDescriptor(Dt, ownPropertyNames[t]);
      if (!ownPropertyDescriptor || !ownPropertyDescriptor.get || !ownPropertyDescriptor.configurable)
        continue;
      var o;
      try {
        o = ownPropertyDescriptor.get();
      } catch (error) {
        continue;
      }
      if (o === void 0) continue;
      Object.defineProperty(Dt, ownPropertyNames[t], {
        value: o,
        writable: !1,
        enumerable: ownPropertyDescriptor.enumerable,
        configurable: !1,
      });
    }
    Object.freeze(Dt);
  })();
});

export { Ah };
