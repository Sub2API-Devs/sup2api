/**
 * @bufbuild/cel/dist/cjs/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/cel@0.4.0
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { bl } from "./error.js";
import { Aa } from "./map.js";
import { $o } from "./list.js";
import { Bi } from "./uint.js";
import { Sp } from "./proto.js";
import { Ei } from "./type.js";
import { UF } from "./run.js";
import { gv } from "./plan.js";
import { rv } from "./parse.js";
import { Y_ } from "./env.js";
import { Tc } from "./func.js";

//@ chunk-fq0cr76a.js:629033-631450 cjs-fingerprint
var WF = x(function (Vr) {
  Object.defineProperty(Vr, "__esModule", { value: !0 });
  Vr.celFunc =
    Vr.celMethod =
    Vr.celEnv =
    Vr.parse =
    Vr.plan =
    Vr.run =
    Vr.isCelType =
    Vr.mapType =
    Vr.listType =
    Vr.CelScalar =
    Vr.objectType =
    Vr.celType =
    Vr.celFromScalar =
    Vr.isCelUint =
    Vr.celUint =
    Vr.celListConcat =
    Vr.isCelList =
    Vr.celList =
    Vr.isCelMap =
    Vr.celMap =
    Vr.isCelError =
    Vr.celError =
      void 0;
  var FF = bl();
  Object.defineProperty(Vr, "celError", {
    enumerable: !0,
    get: function () {
      return FF.celError;
    },
  });
  Object.defineProperty(Vr, "isCelError", {
    enumerable: !0,
    get: function () {
      return FF.isCelError;
    },
  });
  var MF = Aa();
  Object.defineProperty(Vr, "celMap", {
    enumerable: !0,
    get: function () {
      return MF.celMap;
    },
  });
  Object.defineProperty(Vr, "isCelMap", {
    enumerable: !0,
    get: function () {
      return MF.isCelMap;
    },
  });
  var yv = $o();
  Object.defineProperty(Vr, "celList", {
    enumerable: !0,
    get: function () {
      return yv.celList;
    },
  });
  Object.defineProperty(Vr, "isCelList", {
    enumerable: !0,
    get: function () {
      return yv.isCelList;
    },
  });
  Object.defineProperty(Vr, "celListConcat", {
    enumerable: !0,
    get: function () {
      return yv.celListConcat;
    },
  });
  var $F = Bi();
  Object.defineProperty(Vr, "celUint", {
    enumerable: !0,
    get: function () {
      return $F.celUint;
    },
  });
  Object.defineProperty(Vr, "isCelUint", {
    enumerable: !0,
    get: function () {
      return $F.isCelUint;
    },
  });
  var yae = Sp();
  Object.defineProperty(Vr, "celFromScalar", {
    enumerable: !0,
    get: function () {
      return yae.celFromScalar;
    },
  });
  var Pd = Ei();
  Object.defineProperty(Vr, "celType", {
    enumerable: !0,
    get: function () {
      return Pd.celType;
    },
  });
  Object.defineProperty(Vr, "objectType", {
    enumerable: !0,
    get: function () {
      return Pd.objectType;
    },
  });
  Object.defineProperty(Vr, "CelScalar", {
    enumerable: !0,
    get: function () {
      return Pd.CelScalar;
    },
  });
  Object.defineProperty(Vr, "listType", {
    enumerable: !0,
    get: function () {
      return Pd.listType;
    },
  });
  Object.defineProperty(Vr, "mapType", {
    enumerable: !0,
    get: function () {
      return Pd.mapType;
    },
  });
  Object.defineProperty(Vr, "isCelType", {
    enumerable: !0,
    get: function () {
      return Pd.isCelType;
    },
  });
  var bae = UF();
  Object.defineProperty(Vr, "run", {
    enumerable: !0,
    get: function () {
      return bae.run;
    },
  });
  var Sae = gv();
  Object.defineProperty(Vr, "plan", {
    enumerable: !0,
    get: function () {
      return Sae.plan;
    },
  });
  var Eae = rv();
  Object.defineProperty(Vr, "parse", {
    enumerable: !0,
    get: function () {
      return Eae.parse;
    },
  });
  var xae = Y_();
  Object.defineProperty(Vr, "celEnv", {
    enumerable: !0,
    get: function () {
      return xae.celEnv;
    },
  });
  var VF = Tc();
  Object.defineProperty(Vr, "celMethod", {
    enumerable: !0,
    get: function () {
      return VF.celMethod;
    },
  });
  Object.defineProperty(Vr, "celFunc", {
    enumerable: !0,
    get: function () {
      return VF.celFunc;
    },
  });
});

export { WF };
