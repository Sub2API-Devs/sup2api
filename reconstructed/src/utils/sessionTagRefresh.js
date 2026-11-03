/**
 * utils/sessionTagRefresh.ts
 *
 * 2.1.316 新增：会话标签刷新
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-cc8c7ddd.js (1)
 * attribution: placement 1
 */
import { isPublishToolEnabled } from "../services/artifacts/artifactToolGates.js";
import { reportBridgeArtifacts } from "../bridge/replBridgeHandle.js";
import { frameUrlRowsToPersist, frameUrlToRecord } from "../tools/ArtifactTool/artifactResumeCarry.js";
import { isRemoteEgressSuppressedFor, pinSessionId } from "./sessionStorage.js";
import { getSessionId } from "../bootstrap/state.js";

//@ chunk-cc8c7ddd.js:347-419 placement
function aW(r) {
  if (isPublishToolEnabled())
    reportBridgeArtifacts(
      frameUrlRowsToPersist(r).map(([, e]) => frameUrlToRecord(e)),
      () => isRemoteEgressSuppressedFor(pinSessionId(getSessionId())),
    );
}

export { aW };
