/**
 * @azure/msal-node/dist/crypto/GuidGenerator.mjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @azure/msal-node@3.8.1
 * pieces: chunk-b5df2wx1.js (2)
 * attribution: esm-layout 1, esm-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { uuid } from "../../../../mermaid/dist/chunks/mermaid.esm/mindmap-definition-HWZWQOMJ.mjs";

//@ chunk-b5df2wx1.js:225695-225705 esm-layout
var getRandomValues = uuid;
//@ chunk-b5df2wx1.js:225746-225884 esm-fingerprint
class GuidGenerator {
  generateGuid() {
    return getRandomValues();
  }
  isGuid(guid) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(guid);
  }
}
export { GuidGenerator };
