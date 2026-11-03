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
import { rat, iG, Aae } from "../../utils/sandbox/proxyDenial.js";
import { isMaxContentLengthError } from "../../utils/errors.js";
import { isForbiddenProxy, isNotFoundProxy } from "./shareEntries.js";

//@ chunk-4xpk3fhh.js:1088-1130 placement
var q = "/_warmup",
  x = 3000,
  J = 600000,
  z = 262144;
//@ chunk-4xpk3fhh.js:1130-1244 placement
function artifactHostUnreachable(e) {
  let n = getLiveState();
  return (
    n.contentHostEgressDenied.has(e.env) || n.contentHostEgressUnanswered.has(artifactContentOriginUrlFor(e))
  );
}
//@ chunk-4xpk3fhh.js:1244-1334 placement
function P(e) {
  let n = getLiveState().contentHostEgressProbed.get(e);
  return n !== void 0 && Date.now() - n < J;
}
//@ chunk-4xpk3fhh.js:1334-1413 placement
function artifactHostAnswerAtHand(e) {
  return (
    isDiskless() || getLiveState().contentHostEgressDenied.has(e.env) || P(artifactContentOriginUrlFor(e))
  );
}
//@ chunk-4xpk3fhh.js:1413-1910 placement
async function probeArtifactHostEgress(e, n) {
  let r = getLiveState(),
    o = artifactContentOriginUrlFor(e);
  if (isDiskless()) {
    (r.contentHostEgressProbed.delete(o), r.contentHostEgressUnanswered.add(o));
    return;
  }
  if (r.contentHostEgressDenied.has(e.env)) {
    (r.contentHostEgressProbed.delete(o), r.contentHostEgressUnanswered.add(o));
    return;
  }
  if (P(o)) return;
  let s = r.contentHostEgressInFlight.get(o);
  if (s !== void 0)
    return s.catch((l) => {
      if (n.aborted) throw l;
      return probeArtifactHostEgress(e, n);
    });
  let f = probeContentHostEgress(e, o, n).finally(() => {
    r.contentHostEgressInFlight.delete(o);
  });
  return (r.contentHostEgressInFlight.set(o, f), f);
}
/**
 * 探测能否访问 artifact 内容主机：带超时 GET 探测路径；网络被拒时记为拒绝（并标记该环境），无应答或无法识别的状态记为不可达，2xx 或代理的 403/404 记为已探测可达。
 */
//@ chunk-4xpk3fhh.js:1910-2846 placement
async function probeContentHostEgress(target, hostUrl, signal) {
  let o = getLiveState(),
    s = () => {
      (o.contentHostEgressUnanswered.delete(hostUrl), o.contentHostEgressProbed.set(hostUrl, Date.now()));
    },
    f = (p) => {
      (logForDebugging(
        `[artifact] egress probe of ${hostUrl}: ${p}; reading the host as unreachable for this check`,
      ),
        o.contentHostEgressProbed.delete(hostUrl),
        o.contentHostEgressUnanswered.add(hostUrl));
    },
    l = () => {
      (o.contentHostEgressProbed.delete(hostUrl),
        o.contentHostEgressUnanswered.add(hostUrl),
        o.contentHostEgressDenied.add(target.env));
    },
    response;
  try {
    response = await externalHttp.get(`${hostUrl}${q}`, {
      signal: AbortSignal.any([signal, AbortSignal.timeout(x)]),
      timeout: x,
      maxRedirects: 0,
      maxContentLength: z,
      responseType: "text",
      validateStatus: () => !0,
    });
  } catch (error) {
    if (signal.aborted) throw error;
    if (rat(error)) return l();
    return f(isMaxContentLengthError(error) ? "an answer larger than the cap" : "no answer");
  }
  if (iG(response.status, response.headers)) return l();
  let h = () => Aae(response.headers, response.data, (p) => p);
  if (!(
    (response.status >= 200 && response.status < 300) ||
    (response.status === 403 && isForbiddenProxy(response.headers, h())) ||
    (response.status === 404 && isNotFoundProxy(response.headers, h()))
  ))
    return f(`unrecognised HTTP ${response.status}`);
  return s();
}

export { artifactHostUnreachable, probeArtifactHostEgress, artifactHostAnswerAtHand };
