/**
 * @azure/msal-node/dist/crypto/GuidGenerator.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @azure/msal-node@3.8.1
 * pieces: chunk-mrx6y2r5.js (2)
 * attribution: esm-layout 1, esm-fingerprint 1
 */
import { dy } from "../../../../mermaid/dist/chunks/mermaid.esm/mindmap-definition-HWZWQOMJ.mjs";

//@ chunk-mrx6y2r5.js:225695-225705 esm-layout
var nc = dy;
//@ chunk-mrx6y2r5.js:225746-225884 esm-fingerprint
class Ro {
  generateGuid() {
    return nc();
  }
  isGuid(guid) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(guid);
  }
}
export { Ro };
