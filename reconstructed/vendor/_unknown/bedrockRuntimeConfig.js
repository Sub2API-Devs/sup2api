/**
 * _unknown/bedrockRuntimeConfig.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: _unknown/bedrockRuntimeConfig.js
 * pieces: chunk-3cddmtk7.js (4)
 * attribution: placement 4
 */
import { Gur } from "../@smithy/core/dist-cjs/submodules/event-streams/index.js";
import { Re } from "../../runtime/bun-runtime.js";
import { Nme, $me } from "../unresolved-cjs/index.js";
import { dG } from "../@smithy/core/dist-cjs/submodules/retry/index.js";
import { wD } from "../@smithy/node-config-provider/dist-cjs/index.js";
import { E$ } from "../@smithy/node-http-handler/dist-cjs/index.js";
import { Mae } from "../@smithy/core/dist-cjs/submodules/retry/index.browser.js";
import { Rx } from "../@aws-sdk/core/dist-cjs/index.js";
import { Fme } from "../@aws-sdk/core/dist-cjs/submodules/protocols/index.js";
import { EE } from "../@smithy/core/dist-cjs/index.js";
import { ff } from "../@smithy/core/dist-cjs/submodules/client/index.js";
import { P4 } from "../@smithy/url-parser/dist-cjs/index.js";
import { base64Module } from "../@aws-sdk/credential-provider-web-identity/dist-cjs/index.js";
import { IR } from "../@smithy/util-utf8/dist-cjs/index.js";
import { Iae } from "../@aws-sdk/util-endpoints/dist-cjs/index.js";
import { YJ } from "../@smithy/core/dist-cjs/submodules/endpoints/index.browser.js";

//@ chunk-3cddmtk7.js:20617-20640 placement
var Te = (e) => new Gur(e);
//@ chunk-3cddmtk7.js:20640-20716 placement
var Qe = Re(Nme()),
  P = Re(dG()),
  C = Re(wD()),
  b = Re(E$()),
  Ke = Re($me()),
  Je = Re(Mae());
//@ chunk-3cddmtk7.js:20716-20803 placement
var He = Re(Rx()),
  Ve = Re(Fme()),
  qe = Re(EE()),
  je = Re(ff()),
  $e = Re(P4()),
  G = Re(base64Module()),
  k = Re(IR());
//@ chunk-3cddmtk7.js:20803-20831 placement
var We = Re(Iae()),
  A = Re(YJ());

export { A, We, G, He, qe, je, Ve, $e, k, C, Ke, Te, P, b, Je, Qe };
