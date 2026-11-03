/**
 * zod/v4/locales/fr.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-7vp249v4.js (2)
 * attribution: esm-layout 1, esm-fingerprint 1
 */
import {
  _parse,
  _parseAsync,
  _safeParse,
  _safeParseAsync,
  _encode,
  rr,
  _encodeAsync,
  nr,
  _safeEncode,
  sr,
  _safeEncodeAsync,
} from "../core/parse.js";
import { ZodRealError } from "../classic/errors.js";
import { ur } from "../core/regexes.js";
import { globalConfig, config } from "../core/core.js";
import { qe } from "./en.js";

//@ chunk-7vp249v4.js:79741-79853 esm-layout
var Ti = _parse(ZodRealError);
var Ni = _parseAsync(ZodRealError);
var slo = _safeParse(ZodRealError);
var Ci = _safeParseAsync(ZodRealError);
var Ri = _encode(ZodRealError);
var Di = rr(ZodRealError);
var ji = _encodeAsync(ZodRealError);
var Li = nr(ZodRealError);
var Fi = _safeEncode(ZodRealError);
var Mi = sr(ZodRealError);
var Ui = _safeEncodeAsync(ZodRealError);
var Ji = ur(ZodRealError);
//@ chunk-7vp249v4.js:79853-79897 esm-fingerprint
function Ys() {
  if (!globalConfig.localeError) config(qe());
}
export { Ys, Ti, Ni, slo, Ci, Ri, Di, ji, Li, Fi, Mi, Ui, Ji };
