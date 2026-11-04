/**
 * _unknown/bedrockRuntimeConfig.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: _unknown/bedrockRuntimeConfig.js
 * pieces: chunk-3cddmtk7.js (4)
 * attribution: placement 4
 */
import { EventStreamMarshaller } from "../@smithy/core/dist-cjs/submodules/event-streams/index.js";
import { __toESM } from "../../runtime/bun-runtime.js";
import { hashModule, bodyLengthNodeModule } from "../unresolved-cjs/index.js";
import { require_retry } from "../@smithy/core/dist-cjs/submodules/retry/index.js";
import { require_node_config_provider } from "../@smithy/node-config-provider/dist-cjs/index.js";
import { require_node_http_handler } from "../@smithy/node-http-handler/dist-cjs/index.js";
import { require_index_browser as require_index_browser_2 } from "../@smithy/core/dist-cjs/submodules/retry/index.browser.js";
import { require_core_2 } from "../@aws-sdk/core/dist-cjs/index.js";
import { require_protocols } from "../@aws-sdk/core/dist-cjs/submodules/protocols/index.js";
import { require_core } from "../@smithy/core/dist-cjs/index.js";
import { require_client } from "../@smithy/core/dist-cjs/submodules/client/index.js";
import { require_url_parser } from "../@smithy/url-parser/dist-cjs/index.js";
import { base64Module as base64Module_2 } from "../@aws-sdk/credential-provider-web-identity/dist-cjs/index.js";
import { require_util_utf8 } from "../@smithy/util-utf8/dist-cjs/index.js";
import { require_util_endpoints } from "../@aws-sdk/util-endpoints/dist-cjs/index.js";
import { require_index_browser } from "../@smithy/core/dist-cjs/submodules/endpoints/index.browser.js";

//@ chunk-3cddmtk7.js:20617-20640 placement
var eventStreamCodec = (options) => new EventStreamMarshaller(options);
//@ chunk-3cddmtk7.js:20640-20716 placement
var require_hash_node = __toESM(hashModule());
var import_retry = __toESM(require_retry());
var import_node_config_provider = __toESM(require_node_config_provider());
var import_node_http_handler = __toESM(require_node_http_handler());
var require_util_body_length_node = __toESM(bodyLengthNodeModule());
var import_index_browser_2 = __toESM(require_index_browser_2());
//@ chunk-3cddmtk7.js:20716-20803 placement
var import_core_2 = __toESM(require_core_2());
var import_protocols = __toESM(require_protocols());
var import_core = __toESM(require_core());
var import_client = __toESM(require_client());
var import_url_parser = __toESM(require_url_parser());
var base64Module = __toESM(base64Module_2());
var import_util_utf8 = __toESM(require_util_utf8());
//@ chunk-3cddmtk7.js:20803-20831 placement
var import_util_endpoints = __toESM(require_util_endpoints());
var import_index_browser = __toESM(require_index_browser());
export {
  import_index_browser,
  import_util_endpoints,
  base64Module,
  import_core_2,
  import_core,
  import_client,
  import_protocols,
  import_url_parser,
  import_util_utf8,
  import_node_config_provider,
  require_util_body_length_node,
  eventStreamCodec,
  import_retry,
  import_node_http_handler,
  import_index_browser_2,
  require_hash_node,
};
