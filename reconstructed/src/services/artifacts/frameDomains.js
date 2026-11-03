/**
 * services/artifacts/frameDomains.ts
 *
 * Artifact frame 域名与网络策略说明（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-f6553xe3.js (6)
 * attribution: placement 6
 */
import { ARTIFACT_TOOL_NAME } from "../../tools/ArtifactTool/constants.js";
import { WEBFETCH } from "../../tools/WebFetchTool/prompt.js";
import { claudeAiEnvironment } from "../../constants/claudeAiOrigin.js";
import { getLiveState } from "../liveReplica/liveReplica.js";
import { frameRelayActive, relayDeclined } from "./frameRelay.js";
import { ARTIFACT_MOUNT } from "./artifactMount.js";
import { isCoworkEntrypoint } from "../../utils/entrypointKinds.js";

/**
 * Cowork 云会话里允许直接读取 artifact 的说明：网络访问由 claude.ai 的"Allow network egress"设置决定，需加入给定域名。
 */
//@ chunk-f6553xe3.js:414-769 placement
function describeCoworkEgress(e) {
  return `This cloud session's network access follows the "Allow network egress" setting for Cowork in claude.ai, not an environment allowlist. To allow direct artifact reads here, an organization admin (or the user, on an individual plan) can turn that setting on and either allow all domains or add ${e} to its additional allowed domains.`;
}
//@ chunk-f6553xe3.js:769-871 placement
class ReaderAvailabilityRegistry {
  availability = () => !1;
  register(e) {
    this.availability = e;
  }
  isAvailable() {
    return this.availability();
  }
}
//@ chunk-f6553xe3.js:871-885 placement
var VFr = new ReaderAvailabilityRegistry();
//@ chunk-f6553xe3.js:885-917 placement
function oKs(e) {
  VFr.register(e);
}
/**
 * 给出读取 artifact 链接的方法说明：Artifact 工具可用时用其 read 动作，否则用 WebFetch。
 */
//@ chunk-f6553xe3.js:917-1025 placement
function describeArtifactReadMethod() {
  return VFr.isAvailable()
    ? `read it with the ${ARTIFACT_TOOL_NAME} tool (action: "read", url)`
    : `${WEBFETCH} the url`;
}
//@ chunk-f6553xe3.js:1025-2145 placement
function describeFrameDomains() {
  let e = describeArtifactReadMethod(),
    o = claudeAiEnvironment(),
    i =
      getLiveState().contentHostEgressDenied.has(o) &&
      !(frameRelayActive() && !relayDeclined(ARTIFACT_MOUNT)),
    t = o === "staging" ? "*.frame.staging.claudeusercontent.com" : "*.frame.claudeusercontent.com";
  return {
    readRemedy: e,
    forceAdvisory:
      " force:true discards that newer version \u2014 someone's save from the page itself, or another session's publish \u2014 so use it only when the user explicitly asks to overwrite.",
    contentReadsBlocked: i
      ? isCoworkEntrypoint()
        ? `The artifact content host is blocked from this session, so the live version can be neither read nor handed over here. ${describeCoworkEgress(t)} Tell the user, and publish again only once you can build on the live version.`
        : `This environment's network allowlist blocks the artifact content host, so the live version can be neither read nor handed over here until ${t} is added at environment settings \u2192 Code \u2192 Network access \u2192 Custom \u2192 Allowed domains. An admin can add the same entry to a shared environment from admin settings \u2192 Cloud environments; sessions that run in that environment get the access. Tell the user, and publish again only once you can build on the live version.`
      : null,
  };
}

export { VFr, describeFrameDomains, describeArtifactReadMethod, oKs, describeCoworkEgress };
