/**
 * zod/v4/classic/checks.cjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1hnjmk23.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_core_2 } from "../core/index.cjs";

//@ chunk-1hnjmk23.js:588183-591485 cjs-fingerprint
var require_checks_2 = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.slugify =
    cjsExports.toUpperCase =
    cjsExports.toLowerCase =
    cjsExports.trim =
    cjsExports.normalize =
    cjsExports.overwrite =
    cjsExports.mime =
    cjsExports.property =
    cjsExports.endsWith =
    cjsExports.startsWith =
    cjsExports.includes =
    cjsExports.uppercase =
    cjsExports.lowercase =
    cjsExports.regex =
    cjsExports.length =
    cjsExports.minLength =
    cjsExports.maxLength =
    cjsExports.size =
    cjsExports.minSize =
    cjsExports.maxSize =
    cjsExports.multipleOf =
    cjsExports.nonnegative =
    cjsExports.nonpositive =
    cjsExports.negative =
    cjsExports.positive =
    cjsExports.gte =
    cjsExports.gt =
    cjsExports.lte =
    cjsExports.lt =
      undefined;
  var index_js_1 = require_core_2();
  Object.defineProperty(cjsExports, "lt", {
    enumerable: true,
    get: function () {
      return index_js_1._lt;
    },
  });
  Object.defineProperty(cjsExports, "lte", {
    enumerable: true,
    get: function () {
      return index_js_1._lte;
    },
  });
  Object.defineProperty(cjsExports, "gt", {
    enumerable: true,
    get: function () {
      return index_js_1._gt;
    },
  });
  Object.defineProperty(cjsExports, "gte", {
    enumerable: true,
    get: function () {
      return index_js_1._gte;
    },
  });
  Object.defineProperty(cjsExports, "positive", {
    enumerable: true,
    get: function () {
      return index_js_1._positive;
    },
  });
  Object.defineProperty(cjsExports, "negative", {
    enumerable: true,
    get: function () {
      return index_js_1._negative;
    },
  });
  Object.defineProperty(cjsExports, "nonpositive", {
    enumerable: true,
    get: function () {
      return index_js_1._nonpositive;
    },
  });
  Object.defineProperty(cjsExports, "nonnegative", {
    enumerable: true,
    get: function () {
      return index_js_1._nonnegative;
    },
  });
  Object.defineProperty(cjsExports, "multipleOf", {
    enumerable: true,
    get: function () {
      return index_js_1._multipleOf;
    },
  });
  Object.defineProperty(cjsExports, "maxSize", {
    enumerable: true,
    get: function () {
      return index_js_1._maxSize;
    },
  });
  Object.defineProperty(cjsExports, "minSize", {
    enumerable: true,
    get: function () {
      return index_js_1._minSize;
    },
  });
  Object.defineProperty(cjsExports, "size", {
    enumerable: true,
    get: function () {
      return index_js_1._size;
    },
  });
  Object.defineProperty(cjsExports, "maxLength", {
    enumerable: true,
    get: function () {
      return index_js_1._maxLength;
    },
  });
  Object.defineProperty(cjsExports, "minLength", {
    enumerable: true,
    get: function () {
      return index_js_1._minLength;
    },
  });
  Object.defineProperty(cjsExports, "length", {
    enumerable: true,
    get: function () {
      return index_js_1._length;
    },
  });
  Object.defineProperty(cjsExports, "regex", {
    enumerable: true,
    get: function () {
      return index_js_1._regex;
    },
  });
  Object.defineProperty(cjsExports, "lowercase", {
    enumerable: true,
    get: function () {
      return index_js_1._lowercase;
    },
  });
  Object.defineProperty(cjsExports, "uppercase", {
    enumerable: true,
    get: function () {
      return index_js_1._uppercase;
    },
  });
  Object.defineProperty(cjsExports, "includes", {
    enumerable: true,
    get: function () {
      return index_js_1._includes;
    },
  });
  Object.defineProperty(cjsExports, "startsWith", {
    enumerable: true,
    get: function () {
      return index_js_1._startsWith;
    },
  });
  Object.defineProperty(cjsExports, "endsWith", {
    enumerable: true,
    get: function () {
      return index_js_1._endsWith;
    },
  });
  Object.defineProperty(cjsExports, "property", {
    enumerable: true,
    get: function () {
      return index_js_1._property;
    },
  });
  Object.defineProperty(cjsExports, "mime", {
    enumerable: true,
    get: function () {
      return index_js_1._mime;
    },
  });
  Object.defineProperty(cjsExports, "overwrite", {
    enumerable: true,
    get: function () {
      return index_js_1._overwrite;
    },
  });
  Object.defineProperty(cjsExports, "normalize", {
    enumerable: true,
    get: function () {
      return index_js_1._normalize;
    },
  });
  Object.defineProperty(cjsExports, "trim", {
    enumerable: true,
    get: function () {
      return index_js_1._trim;
    },
  });
  Object.defineProperty(cjsExports, "toLowerCase", {
    enumerable: true,
    get: function () {
      return index_js_1._toLowerCase;
    },
  });
  Object.defineProperty(cjsExports, "toUpperCase", {
    enumerable: true,
    get: function () {
      return index_js_1._toUpperCase;
    },
  });
  Object.defineProperty(cjsExports, "slugify", {
    enumerable: true,
    get: function () {
      return index_js_1._slugify;
    },
  });
  (function () {
    var keys = Object.getOwnPropertyNames(cjsExports);
    for (var i = 0; i < keys.length; i++) {
      var desc = Object.getOwnPropertyDescriptor(cjsExports, keys[i]);
      if (!desc || !desc.get || !desc.configurable) continue;
      var value;
      try {
        value = desc.get();
      } catch (e) {
        continue;
      }
      if (value === undefined) continue;
      Object.defineProperty(cjsExports, keys[i], {
        value,
        writable: false,
        enumerable: desc.enumerable,
        configurable: false,
      });
    }
    Object.freeze(cjsExports);
  })();
});
export { require_checks_2 };
