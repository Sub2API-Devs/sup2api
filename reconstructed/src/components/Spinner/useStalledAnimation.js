/**
 * components/Spinner/useStalledAnimation.ts
 *
 * 检测响应停滞并驱动 Spinner 变色的 hook。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/Spinner/useStalledAnimation.ts
 * pieces: chunk-3mec1atf.js (1)
 * attribution: fingerprint 1
 */
import { R } from "../../../vendor/react/cjs/react.production.js";

//@ chunk-3mec1atf.js:7371-7948 fingerprint = useStalledAnimation (0.835)
function useStalledAnimation(l, t, u = !1, o = !1, m) {
  let lastTokenTime = R(l),
    lastResponseLength = R(t),
    mountTime = R(0),
    stalledIntensityRef = R(l),
    lastSmoothTime = R(m);
  if (t > lastResponseLength.current || lastSmoothTime.current !== m)
    ((lastSmoothTime.current = m),
      (lastTokenTime.current = l),
      (lastResponseLength.current = t),
      (mountTime.current = 0),
      (stalledIntensityRef.current = l));
  else if (t < lastResponseLength.current) lastResponseLength.current = t;
  let timeSinceLastToken;
  if (u) ((timeSinceLastToken = 0), (lastTokenTime.current = l));
  else timeSinceLastToken = l - lastTokenTime.current;
  let isStalled = timeSinceLastToken > 1e4 && !u,
    f = isStalled ? Math.min((timeSinceLastToken - 1e4) / 1e4, 1) : 0;
  if (!o && (f > 0 || mountTime.current > 0)) {
    let W = l - stalledIntensityRef.current;
    if (W >= 50) {
      let steps = Math.floor(W / 50),
        current = mountTime.current;
      for (let k = 0; k < steps; k++) {
        let L = f - current;
        if (Math.abs(L) < 0.01) {
          current = f;
          break;
        }
        current += L * 0.1;
      }
      ((mountTime.current = current), (stalledIntensityRef.current = l));
    }
  } else ((mountTime.current = f), (stalledIntensityRef.current = l));
  let b = o ? f : mountTime.current;
  return { isStalled: isStalled, stalledIntensity: b, timeSinceLastToken: timeSinceLastToken };
}

export { useStalledAnimation };
