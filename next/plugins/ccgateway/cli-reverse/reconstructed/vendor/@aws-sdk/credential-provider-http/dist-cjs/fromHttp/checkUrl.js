/**
 * @aws-sdk/credential-provider-http/dist-cjs/fromHttp/checkUrl.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/credential-provider-http@3.936.0..3.972.41
 * pieces: chunk-0c72454j.js (3)
 * attribution: esm-layout 2, esm-fingerprint 1
 */
import { __toESM } from "../../../../../runtime/bun-runtime.js";
import { require_client as require_client_2 } from "../../../core/dist-cjs/submodules/client/index.js";
import { require_node_http_handler } from "../../../../@smithy/node-http-handler/dist-cjs/index.js";
import { require_property_provider } from "../../../../@smithy/property-provider/dist-cjs/index.js";

//@ chunk-0c72454j.js:467-504 esm-layout
var import_client = __toESM(require_client_2());
var import_node_http_handler = __toESM(require_node_http_handler());
var import_property_provider = __toESM(require_property_provider());
//@ chunk-0c72454j.js:531-546 esm-layout
var import_property_provider_2 = __toESM(require_property_provider());
//@ chunk-0c72454j.js:546-1266 esm-fingerprint
var ECS_CONTAINER_HOST = "169.254.170.2";
var EKS_CONTAINER_HOST_IPv4 = "169.254.170.23";
var EKS_CONTAINER_HOST_IPv6 = "[fd00:ec2::23]";
var checkUrl = (url, logger) => {
  if (url.protocol === "https:") return;
  if (
    url.hostname === ECS_CONTAINER_HOST ||
    url.hostname === EKS_CONTAINER_HOST_IPv4 ||
    url.hostname === EKS_CONTAINER_HOST_IPv6
  )
    return;
  if (url.hostname.includes("[")) {
    if (url.hostname === "[::1]" || url.hostname === "[0000:0000:0000:0000:0000:0000:0000:0001]") return;
  } else {
    if (url.hostname === "localhost") return;
    let ipComponents = url.hostname.split(".");
    let inRange = (component) => {
      let num = parseInt(component, 10);
      return 0 <= num && num <= 255;
    };
    if (
      ipComponents[0] === "127" &&
      inRange(ipComponents[1]) &&
      inRange(ipComponents[2]) &&
      inRange(ipComponents[3]) &&
      ipComponents.length === 4
    )
      return;
  }
  throw new import_property_provider_2.CredentialsProviderError(
    `URL not accepted. It must either be HTTPS or match one of the following:
  - loopback CIDR 127.0.0.0/8 or [::1/128]
  - ECS container host 169.254.170.2
  - EKS container host 169.254.170.23 or [fd00:ec2::23]`,
    {
      logger,
    },
  );
};
export { import_property_provider, checkUrl, import_node_http_handler, import_client };
