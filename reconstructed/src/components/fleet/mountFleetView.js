/**
 * components/fleet/mountFleetView.ts
 *
 * 2.1.316 新增：挂载 FleetView。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ygxzcsa5.js (1)
 * attribution: placement 1
 */
import { createFleetViewHost } from "./useAttachFleetOwners.js";
import { mountFleetView } from "./FleetView.js";

//@ chunk-ygxzcsa5.js:17373-17443 placement
async function mountFleetViewWithComposerBack(e, o) {
  let t = { ...o, host: o?.host ?? createFleetViewHost() };
  await mountFleetView(e, t);
}
