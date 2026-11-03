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
import { require_retry } from "../@smithy/core/dist-cjs/submodules/retry/index.js";
import { require_node_config_provider } from "../@smithy/node-config-provider/dist-cjs/index.js";
import { require_node_http_handler } from "../@smithy/node-http-handler/dist-cjs/index.js";
import { require_index_browser as require_index_browser_2 } from "../@smithy/core/dist-cjs/submodules/retry/index.browser.js";
import { require_core as require_core_2 } from "../@aws-sdk/core/dist-cjs/index.js";
import { require_protocols } from "../@aws-sdk/core/dist-cjs/submodules/protocols/index.js";
import { require_core } from "../@smithy/core/dist-cjs/index.js";
import { require_client } from "../@smithy/core/dist-cjs/submodules/client/index.js";
import { require_url_parser } from "../@smithy/url-parser/dist-cjs/index.js";
import { base64Module } from "../@aws-sdk/credential-provider-web-identity/dist-cjs/index.js";
import { require_util_utf8 } from "../@smithy/util-utf8/dist-cjs/index.js";
import { require_util_endpoints } from "../@aws-sdk/util-endpoints/dist-cjs/index.js";
import { require_index_browser } from "../@smithy/core/dist-cjs/submodules/endpoints/index.browser.js";

//@ chunk-3cddmtk7.js:20617-20640 placement
var Te = (e) => new Gur(e);
//@ chunk-3cddmtk7.js:20640-20716 placement
var Qe = Re(Nme());
var P = Re(require_retry());
var C = Re(require_node_config_provider());
var b = Re(require_node_http_handler());
var Ke = Re($me());
var Je = Re(require_index_browser_2());
//@ chunk-3cddmtk7.js:20716-20803 placement
var He = Re(require_core_2());
var Ve = Re(require_protocols());
var qe = Re(require_core());
var je = Re(require_client());
var $e = Re(require_url_parser());
var G = Re(base64Module());
var k = Re(require_util_utf8());
//@ chunk-3cddmtk7.js:20803-20831 placement
var We = Re(require_util_endpoints());
var A = Re(require_index_browser());
export { A, We, G, He, qe, je, Ve, $e, k, C, Ke, Te, P, b, Je, Qe };
