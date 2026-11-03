/**
 * @aws-sdk/credential-provider-http/dist-cjs/fromHttp/checkUrl.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/credential-provider-http@3.936.0..3.972.41
 * pieces: chunk-0c72454j.js (3)
 * attribution: esm-layout 2, esm-fingerprint 1
 */
import { Re } from "../../../../../runtime/bun-runtime.js";
import { SD } from "../../../core/dist-cjs/submodules/client/index.js";
import { E$ } from "../../../../@smithy/node-http-handler/dist-cjs/index.js";
import { $h } from "../../../../@smithy/property-provider/dist-cjs/index.js";

//@ chunk-0c72454j.js:467-504 esm-layout
var E = Re(SD()),
  N = Re(E$()),
  m = Re($h());
//@ chunk-0c72454j.js:531-546 esm-layout
var A = Re($h());
//@ chunk-0c72454j.js:546-1266 esm-fingerprint
var w = "169.254.170.2",
  g = "169.254.170.23",
  S = "[fd00:ec2::23]",
  h = (e, o) => {
    if (e.protocol === "https:") return;
    if (e.hostname === w || e.hostname === g || e.hostname === S) return;
    if (e.hostname.includes("[")) {
      if (e.hostname === "[::1]" || e.hostname === "[0000:0000:0000:0000:0000:0000:0000:0001]") return;
    } else {
      if (e.hostname === "localhost") return;
      let parts = e.hostname.split("."),
        r = (t) => {
          let s = parseInt(t, 10);
          return 0 <= s && s <= 255;
        };
      if (parts[0] === "127" && r(parts[1]) && r(parts[2]) && r(parts[3]) && parts.length === 4) return;
    }
    throw new A.CredentialsProviderError(
      `URL not accepted. It must either be HTTPS or match one of the following:
  - loopback CIDR 127.0.0.0/8 or [::1/128]
  - ECS container host 169.254.170.2
  - EKS container host 169.254.170.23 or [fd00:ec2::23]`,
      { logger: o },
    );
  };

export { m, h, N, E };
