/**
 * jose/dist/webapi/lib/options.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-2tyrgda4.js (7), chunk-5h78gfwc.js (2)
 * attribution: esm-layout 4, esm-fingerprint 4
 */
import { JOSENotSupported_2 } from "../../node/esm/util/errors.js";
import { __esm } from "../../../../../runtime/bun-runtime.js";
import { init_ecdhes } from "../../browser/runtime/ecdhes.js";
import { init_check_p2s } from "../../node/esm/lib/check_p2s.js";
import { init_key_management } from "./key_management.js";
import { init_cek } from "../../node/esm/lib/cek.js";
import {
  init_content_encryption,
  init_content_encryption_2,
  noopClaims,
  JOSENotSupported,
} from "./content_encryption.js";
import { init_jwk_to_key } from "../../browser/runtime/jwk_to_key.js";
import { init_check_key_type, init_encrypt } from "../../node/esm/lib/check_key_type.js";
import {
  init_decrypt_key_management,
  decryptKeyManagement,
} from "../../node/esm/lib/decrypt_key_management.js";

//@ chunk-5h78gfwc.js:27290-28047 esm-fingerprint
function validateCrit(Err, recognizedDefault, recognizedOption, protectedHeader, joseHeader) {
  if (joseHeader.crit !== undefined && protectedHeader?.crit === undefined)
    throw new Err('"crit" (Critical) Header Parameter MUST be integrity protected');
  if (!protectedHeader || protectedHeader.crit === undefined) return new Set();
  if (
    !Array.isArray(protectedHeader.crit) ||
    protectedHeader.crit.length === 0 ||
    protectedHeader.crit.some((input) => typeof input !== "string" || input.length === 0)
  )
    throw new Err('"crit" (Critical) Header Parameter MUST be an array of non-empty strings when present');
  let recognized;
  if (recognizedOption !== undefined)
    recognized = new Map([...Object.entries(recognizedOption), ...recognizedDefault.entries()]);
  else recognized = recognizedDefault;
  for (let parameter of protectedHeader.crit) {
    if (!recognized.has(parameter))
      throw new JOSENotSupported_2(`Extension Header Parameter "${parameter}" is not recognized`);
    if (joseHeader[parameter] === undefined)
      throw new Err(`Extension Header Parameter "${parameter}" is missing`);
    if (recognized.get(parameter) && protectedHeader[parameter] === undefined)
      throw new Err(`Extension Header Parameter "${parameter}" MUST be integrity protected`);
  }
  return new Set(protectedHeader.crit);
}
//@ chunk-5h78gfwc.js:28047-28225 esm-fingerprint
function validateAlgorithms_2(option, algorithms) {
  if (
    algorithms !== undefined &&
    (!Array.isArray(algorithms) || algorithms.some((s) => typeof s !== "string"))
  )
    throw TypeError(`"${option}" option must be an array of strings`);
  if (!algorithms) return;
  return new Set(algorithms);
}
//@ chunk-2tyrgda4.js:22519-22526 esm-layout
var decryptKeyManagement_default;
//@ chunk-2tyrgda4.js:22526-22601 esm-layout
var init_options = __esm(() => {
  init_ecdhes();
  init_check_p2s();
  init_key_management();
  init_cek();
  init_content_encryption();
  init_content_encryption_2();
  init_jwk_to_key();
  init_check_key_type();
  init_encrypt();
  noopClaims();
  init_decrypt_key_management();
  decryptKeyManagement_default = decryptKeyManagement;
});
//@ chunk-2tyrgda4.js:22601-23363 esm-fingerprint
function validateCritDuplicatesInit(Err, recognizedDefault, recognizedOption, protectedHeader, joseHeader) {
  if (joseHeader.crit !== undefined && protectedHeader.crit === undefined)
    throw new Err('"crit" (Critical) Header Parameter MUST be integrity protected');
  if (!protectedHeader || protectedHeader.crit === undefined) return new Set();
  if (
    !Array.isArray(protectedHeader.crit) ||
    protectedHeader.crit.length === 0 ||
    protectedHeader.crit.some((input) => typeof input !== "string" || input.length === 0)
  )
    throw new Err('"crit" (Critical) Header Parameter MUST be an array of non-empty strings when present');
  let recognized;
  if (recognizedOption !== undefined)
    recognized = new Map([...Object.entries(recognizedOption), ...recognizedDefault.entries()]);
  else recognized = recognizedDefault;
  for (let parameter of protectedHeader.crit) {
    if (!recognized.has(parameter))
      throw new JOSENotSupported(`Extension Header Parameter "${parameter}" is not recognized`);
    if (joseHeader[parameter] === undefined)
      throw new Err(`Extension Header Parameter "${parameter}" is missing`);
    else if (recognized.get(parameter) && protectedHeader[parameter] === undefined)
      throw new Err(`Extension Header Parameter "${parameter}" MUST be integrity protected`);
  }
  return new Set(protectedHeader.crit);
}
//@ chunk-2tyrgda4.js:23363-23369 esm-layout
var validateCritInit;
//@ chunk-2tyrgda4.js:23369-23395 esm-layout
var init_options_2 = __esm(() => {
  init_content_encryption_2();
  validateCritInit = validateCritDuplicatesInit;
});
//@ chunk-2tyrgda4.js:23395-23575 esm-fingerprint
var validateAlgorithms = (option, algorithms) => {
  if (
    algorithms !== undefined &&
    (!Array.isArray(algorithms) || algorithms.some((s) => typeof s !== "string"))
  )
    throw TypeError(`"${option}" option must be an array of strings`);
  if (!algorithms) return;
  return new Set(algorithms);
};
var validateAlgorithms_default;
//@ chunk-2tyrgda4.js:23575-23598 esm-layout (moved: shares a binding it assigns)
var init_decrypt = __esm(() => {
  validateAlgorithms_default = validateAlgorithms;
});
export {
  validateCritInit,
  validateAlgorithms_default,
  decryptKeyManagement_default,
  init_options,
  init_options_2,
  init_decrypt,
  validateCrit,
  validateAlgorithms_2,
};
