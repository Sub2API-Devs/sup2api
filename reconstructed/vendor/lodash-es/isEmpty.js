/**
 * lodash-es/isEmpty.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: lodash-es@4.17.22..4.18.1
 * pieces: chunk-wy9dbk5f.js (1)
 * attribution: placement 1
 */
import {
  Phe,
  Xve,
  Iut,
  wMe,
  EMe,
  ido,
} from "../@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { ME } from "./toString.js";
import { nn, rn, hasOwnProperty } from "../../src/services/mcpServe/callUtils.js";
import { X8e } from "./_isPrototype.js";

/**
 * lodash isEmpty：null、空数组/字符串/arguments、空 Map/Set、无自有属性的对象为空。
 */
//@ chunk-wy9dbk5f.js:17789-18055 placement
function isEmpty(e) {
  if (e == null) return !0;
  if (
    Phe(e) &&
    (ME(e) || typeof e == "string" || typeof e.splice == "function" || Xve(e) || Iut(e) || wMe(e))
  )
    return !e.length;
  var r = EMe(e);
  if (r == nn || r == rn) return !e.size;
  if (X8e(e)) return !ido(e).length;
  for (var key in e) if (hasOwnProperty.call(e, key)) return !1;
  return !0;
}

export { isEmpty };
