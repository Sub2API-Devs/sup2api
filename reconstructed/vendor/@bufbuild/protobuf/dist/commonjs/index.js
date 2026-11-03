/**
 * @bufbuild/protobuf/dist/commonjs/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/protobuf@2.12.1
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { Uk } from "./types.js";
import { vg } from "../cjs/is-message.js";
import { wl } from "../cjs/create.js";
import { n_ } from "./clone.js";
import { Ns } from "../cjs/descriptors.js";
import { xP } from "./equals.js";
import { E_ } from "./fields.js";
import { qg } from "../cjs/registry.js";
import { qu } from "../cjs/to-binary.js";
import { Ku } from "./from-binary.js";
import { UP } from "./to-json.js";
import { JP } from "./from-json.js";
import { tL } from "./merge.js";
import { gp } from "./extensions.js";
import { ko } from "./proto-int64.js";

//@ chunk-fq0cr76a.js:466118-467800 cjs-fingerprint
var li = x(function (Vn) {
  var iQ =
      (Vn && Vn.__createBinding) ||
      (Object.create
        ? function (e, n, r, s) {
            if (s === void 0) s = r;
            var ownPropertyDescriptor = Object.getOwnPropertyDescriptor(n, r);
            if (
              !ownPropertyDescriptor ||
              ("get" in ownPropertyDescriptor
                ? !n.__esModule
                : ownPropertyDescriptor.writable || ownPropertyDescriptor.configurable)
            )
              ownPropertyDescriptor = {
                enumerable: !0,
                get: function () {
                  return n[r];
                },
              };
            Object.defineProperty(e, s, ownPropertyDescriptor);
          }
        : function (e, n, r, s) {
            if (s === void 0) s = r;
            e[s] = n[r];
          }),
    Ui =
      (Vn && Vn.__exportStar) ||
      function (e, n) {
        for (var key in e)
          if (key !== "default" && !Object.prototype.hasOwnProperty.call(n, key)) iQ(n, e, key);
      };
  Object.defineProperty(Vn, "__esModule", { value: !0 });
  Vn.getOption =
    Vn.hasOption =
    Vn.clearExtension =
    Vn.setExtension =
    Vn.getExtension =
    Vn.hasExtension =
    Vn.mergeFromBinary =
    Vn.fromBinary =
    Vn.toBinary =
      void 0;
  Ui(Uk(), Vn);
  Ui(vg(), Vn);
  Ui(wl(), Vn);
  Ui(n_(), Vn);
  Ui(Ns(), Vn);
  Ui(xP(), Vn);
  Ui(E_(), Vn);
  Ui(qg(), Vn);
  var oQ = qu();
  Object.defineProperty(Vn, "toBinary", {
    enumerable: !0,
    get: function () {
      return oQ.toBinary;
    },
  });
  var nL = Ku();
  Object.defineProperty(Vn, "fromBinary", {
    enumerable: !0,
    get: function () {
      return nL.fromBinary;
    },
  });
  Object.defineProperty(Vn, "mergeFromBinary", {
    enumerable: !0,
    get: function () {
      return nL.mergeFromBinary;
    },
  });
  Ui(UP(), Vn);
  Ui(JP(), Vn);
  Ui(tL(), Vn);
  var id = gp();
  Object.defineProperty(Vn, "hasExtension", {
    enumerable: !0,
    get: function () {
      return id.hasExtension;
    },
  });
  Object.defineProperty(Vn, "getExtension", {
    enumerable: !0,
    get: function () {
      return id.getExtension;
    },
  });
  Object.defineProperty(Vn, "setExtension", {
    enumerable: !0,
    get: function () {
      return id.setExtension;
    },
  });
  Object.defineProperty(Vn, "clearExtension", {
    enumerable: !0,
    get: function () {
      return id.clearExtension;
    },
  });
  Object.defineProperty(Vn, "hasOption", {
    enumerable: !0,
    get: function () {
      return id.hasOption;
    },
  });
  Object.defineProperty(Vn, "getOption", {
    enumerable: !0,
    get: function () {
      return id.getOption;
    },
  });
  Ui(ko(), Vn);
});

export { li };
