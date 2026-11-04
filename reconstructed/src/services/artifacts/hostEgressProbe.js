/**
 * services/artifacts/hostEgressProbe.ts
 *
 * 2.1.316 新增：宿主出站可达性探测
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-4xpk3fhh.js (6)
 * attribution: placement 6
 */
import { getLiveState } from "../liveReplica/liveReplica.js";
import { artifactContentOriginUrlFor } from "../../tools/ArtifactTool/artifactUrls.js";
import { isDiskless } from "../../bootstrap/state.js";
import { logForDebugging } from "../../utils/debug.js";
import { externalHttp } from "../http/externalHttp.js";
import {
  isBlockedByProxyAllowlist,
  isAllowlistBlockedResponse,
  proxyDenialResult,
} from "../../utils/sandbox/proxyDenial.js";
import { isMaxContentLengthError } from "../../utils/errors.js";
import { isForbiddenProxy, isNotFoundProxy } from "./shareEntries.js";

//@ chunk-4xpk3fhh.js:1088-1130 placement
var WARMUP_PATH = "/_warmup";
var PROBE_TIMEOUT_MS = 3000;
var PROBE_CACHE_MS = 600000;
var MAX_PROBE_RESPONSE_BYTES = 262144;
//@ chunk-4xpk3fhh.js:1130-1244 placement
function artifactHostUnreachable(host) {
  let liveState = getLiveState();
  return (
    liveState.contentHostEgressDenied.has(host.env) ||
    liveState.contentHostEgressUnanswered.has(artifactContentOriginUrlFor(host))
  );
}
//@ chunk-4xpk3fhh.js:1244-1334 placement
function wasProbedRecently(host) {
  let probed = getLiveState().contentHostEgressProbed.get(host);
  return probed !== undefined && Date.now() - probed < PROBE_CACHE_MS;
}
//@ chunk-4xpk3fhh.js:1334-1413 placement
function artifactHostAnswerAtHand(at) {
  return (
    isDiskless() ||
    getLiveState().contentHostEgressDenied.has(at.env) ||
    wasProbedRecently(artifactContentOriginUrlFor(at))
  );
}
//@ chunk-4xpk3fhh.js:1413-1910 placement
async function probeArtifactHostEgress(target, signal) {
  let liveState = getLiveState();
  let contentOriginUrl = artifactContentOriginUrlFor(target);
  if (isDiskless()) {
    liveState.contentHostEgressProbed.delete(contentOriginUrl);
    liveState.contentHostEgressUnanswered.add(contentOriginUrl);
    return;
  }
  if (liveState.contentHostEgressDenied.has(target.env)) {
    liveState.contentHostEgressProbed.delete(contentOriginUrl);
    liveState.contentHostEgressUnanswered.add(contentOriginUrl);
    return;
  }
  if (wasProbedRecently(contentOriginUrl)) return;
  let inFlight = liveState.contentHostEgressInFlight.get(contentOriginUrl);
  if (inFlight !== undefined)
    return inFlight.catch((error) => {
      if (signal.aborted) throw error;
      return probeArtifactHostEgress(target, signal);
    });
  let probe = probeContentHostEgress(target, contentOriginUrl, signal).finally(() => {
    liveState.contentHostEgressInFlight.delete(contentOriginUrl);
  });
  liveState.contentHostEgressInFlight.set(contentOriginUrl, probe);
  return probe;
}
//@ chunk-4xpk3fhh.js:1910-2846 placement
/**
 * 探测能否访问 artifact 内容主机：带超时 GET 探测路径；网络被拒时记为拒绝（并标记该环境），无应答或无法识别的状态记为不可达，2xx 或代理的 403/404 记为已探测可达。
 */
async function probeContentHostEgress(target, hostUrl, signal) {
  let liveState = getLiveState();
  let done = () => {
    liveState.contentHostEgressUnanswered.delete(hostUrl);
    liveState.contentHostEgressProbed.set(hostUrl, Date.now());
  };
  let compare = (body) => {
    logForDebugging(
      `[artifact] egress probe of ${hostUrl}: ${body}; reading the host as unreachable for this check`,
    );
    liveState.contentHostEgressProbed.delete(hostUrl);
    liveState.contentHostEgressUnanswered.add(hostUrl);
  };
  let detail = () => {
    liveState.contentHostEgressProbed.delete(hostUrl);
    liveState.contentHostEgressUnanswered.add(hostUrl);
    liveState.contentHostEgressDenied.add(target.env);
  };
  let response;
  try {
    response = await externalHttp.get(`${hostUrl}${WARMUP_PATH}`, {
      signal: AbortSignal.any([signal, AbortSignal.timeout(PROBE_TIMEOUT_MS)]),
      timeout: PROBE_TIMEOUT_MS,
      maxRedirects: 0,
      maxContentLength: MAX_PROBE_RESPONSE_BYTES,
      responseType: "text",
      validateStatus: () => true,
    });
  } catch (error) {
    if (signal.aborted) throw error;
    if (isBlockedByProxyAllowlist(error)) return detail();
    return compare(isMaxContentLengthError(error) ? "an answer larger than the cap" : "no answer");
  }
  if (isAllowlistBlockedResponse(response.status, response.headers)) return detail();
  let denial = () => proxyDenialResult(response.headers, response.data, (line) => line);
  if (!(
    (response.status >= 200 && response.status < 300) ||
    (response.status === 403 && isForbiddenProxy(response.headers, denial())) ||
    (response.status === 404 && isNotFoundProxy(response.headers, denial()))
  ))
    return compare(`unrecognised HTTP ${response.status}`);
  return done();
}
export { artifactHostUnreachable, probeArtifactHostEgress, artifactHostAnswerAtHand };
