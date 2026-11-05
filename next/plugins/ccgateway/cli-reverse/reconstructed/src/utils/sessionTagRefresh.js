/**
 * utils/sessionTagRefresh.ts
 *
 * 2.1.316 新增：会话标签刷新
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-yj845692.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isPublishToolEnabled } from "../services/artifacts/artifactToolGates.js";
import { reportBridgeArtifacts } from "../bridge/replBridgeHandle.js";
import { frameUrlRowsToPersist, frameUrlToRecord } from "../tools/ArtifactTool/artifactResumeCarry.js";
import { isRemoteEgressSuppressedFor, pinSessionId } from "./sessionStorage.js";
import { getSessionId } from "../bootstrap/state.js";

//@ chunk-yj845692.js:347-419 placement
/**
 * persistBridgeArtifactFrames：持久化 bridge 产物 frame。
 */
function persistBridgeArtifactFrames(frameUrls) {
  if (isPublishToolEnabled())
    reportBridgeArtifacts(
      frameUrlRowsToPersist(frameUrls).map(([, url]) => frameUrlToRecord(url)),
      () => isRemoteEgressSuppressedFor(pinSessionId(getSessionId())),
    );
}
export { persistBridgeArtifactFrames };
