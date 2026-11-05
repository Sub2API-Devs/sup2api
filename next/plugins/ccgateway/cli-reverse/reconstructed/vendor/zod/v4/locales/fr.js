/**
 * zod/v4/locales/fr.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-m4y44r15.js (2)
 * attribution: esm-layout 1, esm-fingerprint 1
 */
import {
  _parse,
  _parseAsync,
  _safeParse,
  _safeParseAsync,
  _encode,
  decodeFactory,
  _encodeAsync,
  decodeAsyncFactory,
  _safeEncode,
  safeDecodeFactory,
  _safeEncodeAsync,
} from "../core/parse.js";
import { ZodRealError } from "../classic/errors.js";
import { safeDecodeAsyncFactory } from "../core/regexes.js";
import { globalConfig, config } from "../core/core.js";
import { defaultLocale } from "./en.js";

//@ chunk-m4y44r15.js:79741-79853 esm-layout
var parse = _parse(ZodRealError);
var parseAsync = _parseAsync(ZodRealError);
var safeParse = _safeParse(ZodRealError);
var safeParseAsync = _safeParseAsync(ZodRealError);
var encode = _encode(ZodRealError);
var decode = decodeFactory(ZodRealError);
var encodeAsync = _encodeAsync(ZodRealError);
var decodeAsync = decodeAsyncFactory(ZodRealError);
var safeEncode = _safeEncode(ZodRealError);
var safeDecode = safeDecodeFactory(ZodRealError);
var safeEncodeAsync = _safeEncodeAsync(ZodRealError);
var safeDecodeAsync = safeDecodeAsyncFactory(ZodRealError);
//@ chunk-m4y44r15.js:79853-79897 esm-fingerprint
function initLocaleError() {
  if (!globalConfig.localeError) config(defaultLocale());
}
export {
  initLocaleError,
  parse,
  parseAsync,
  safeParse,
  safeParseAsync,
  encode,
  decode,
  encodeAsync,
  decodeAsync,
  safeEncode,
  safeDecode,
  safeEncodeAsync,
  safeDecodeAsync,
};
