/**
 * components/fleet/mountFleetView.ts
 *
 * 2.1.316 新增：挂载 FleetView。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-956pxp4g.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { createFleetViewHost } from "./useAttachFleetOwners.js";
import { mountFleetView } from "./FleetView.js";

//@ chunk-956pxp4g.js:18689-18759 placement
async function mountFleetViewWithComposerBack(renderer, options) {
  let mergedOptions = {
    ...options,
    host: options?.host ?? createFleetViewHost(),
  };
  await mountFleetView(renderer, mergedOptions);
}
export { mountFleetViewWithComposerBack };
