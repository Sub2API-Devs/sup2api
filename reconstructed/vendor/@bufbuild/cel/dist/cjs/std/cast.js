/**
 * @bufbuild/cel/dist/cjs/std/cast.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/cel@0.4.0
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../../runtime/bun-runtime.js";
import { li } from "../../../../protobuf/dist/commonjs/index.js";
import { Os } from "../../../../../@anthropic-ai/bedrock-sdk/core/error.js";
import { H_ } from "./math.js";
import { Ei } from "../type.js";
import { L_ } from "../duration.js";
import { Tc } from "../func.js";
import { ld } from "../eval.js";

//@ chunk-fq0cr76a.js:487762-490216 cjs-fingerprint
var kB = x(function (NB) {
  Object.defineProperty(NB, "__esModule", { value: !0 });
  var Ho = li(),
    Wo = Os(),
    Bs = H_(),
    ar = Ei(),
    RB = L_(),
    Pt = Tc(),
    IB = ld(),
    textEncoder = new TextEncoder(),
    textDecoder = new TextDecoder(void 0, { fatal: !0 });
  function ote(e) {
    switch (e) {
      case "true":
      case "True":
      case "TRUE":
      case "t":
      case "1":
        return !0;
      case "false":
      case "False":
      case "FALSE":
      case "f":
      case "0":
        return !1;
    }
    throw Error(`Unable to convert string '${e}' to bool`);
  }
  function ate(e) {
    try {
      return textDecoder.decode(e);
    } catch (error) {
      throw Error(`Failed to decode bytes as string: ${error}`);
    }
  }
  function lte(e) {
    try {
      return Ho.fromJson(Wo.TimestampSchema, e);
    } catch (error) {
      throw Error(`Failed to parse timestamp: ${error}`);
    }
  }
  function cte(e) {
    if (Ho.isMessage(e)) return ar.objectType(IB.getMsgDesc(e.$typeName));
    return ar.celType(e);
  }
  function Ca(e) {
    return e;
  }
  var {
    BOOL: BOOL,
    BYTES: BYTES,
    DOUBLE: DOUBLE,
    DYN: DYN,
    INT: INT,
    STRING: STRING,
    TYPE: TYPE,
    UINT: UINT,
  } = ar.CelScalar;
  NB.default = [
    Pt.celFunc("int", [INT], INT, Ca),
    Pt.celFunc("int", [UINT], INT, (e) => Bs.safeInt(e.value)),
    Pt.celFunc("int", [DOUBLE], INT, Bs.safeInt),
    Pt.celFunc("int", [STRING], INT, Bs.safeInt),
    Pt.celFunc("int", [ar.TIMESTAMP], INT, (e) => Bs.safeInt(e.message.seconds)),
    Pt.celFunc("int", [ar.DURATION], INT, (e) => Bs.safeInt(e.message.seconds)),
    Pt.celFunc("uint", [UINT], UINT, Ca),
    Pt.celFunc("uint", [INT], UINT, Bs.safeUint),
    Pt.celFunc("uint", [DOUBLE], UINT, Bs.safeUint),
    Pt.celFunc("uint", [STRING], UINT, Bs.safeUint),
    Pt.celFunc("double", [DOUBLE], DOUBLE, Ca),
    Pt.celFunc("double", [INT], DOUBLE, (e) => Number(e)),
    Pt.celFunc("double", [UINT], DOUBLE, (e) => Number(e.value)),
    Pt.celFunc("double", [STRING], DOUBLE, (e) => Number(e)),
    Pt.celFunc("bool", [BOOL], BOOL, Ca),
    Pt.celFunc("bool", [STRING], BOOL, ote),
    Pt.celFunc("bytes", [BYTES], BYTES, Ca),
    Pt.celFunc("bytes", [STRING], BYTES, (e) => textEncoder.encode(e)),
    Pt.celFunc("string", [STRING], STRING, Ca),
    Pt.celFunc("string", [BOOL], STRING, (e) => e.toString()),
    Pt.celFunc("string", [INT], STRING, (e) => e.toString()),
    Pt.celFunc("string", [UINT], STRING, (e) => e.value.toString()),
    Pt.celFunc("string", [DOUBLE], STRING, (e) => e.toString()),
    Pt.celFunc("string", [BYTES], STRING, ate),
    Pt.celFunc("string", [ar.TIMESTAMP], STRING, (e) => Ho.toJson(Wo.TimestampSchema, e.message)),
    Pt.celFunc("string", [ar.DURATION], STRING, (e) => Ho.toJson(Wo.DurationSchema, e.message)),
    Pt.celFunc("timestamp", [ar.TIMESTAMP], ar.TIMESTAMP, Ca),
    Pt.celFunc("timestamp", [STRING], ar.TIMESTAMP, lte),
    Pt.celFunc("timestamp", [INT], ar.TIMESTAMP, (e) => Wo.timestampFromMs(Number(e))),
    Pt.celFunc("duration", [ar.DURATION], ar.DURATION, Ca),
    Pt.celFunc("duration", [STRING], ar.DURATION, RB.parseDuration),
    Pt.celFunc("duration", [INT], ar.DURATION, (e) => Ho.create(Wo.DurationSchema, { seconds: e })),
    Pt.celFunc("type", [DYN], TYPE, cte),
    Pt.celFunc("dyn", [DYN], DYN, Ca),
  ];
});

export { kB };
