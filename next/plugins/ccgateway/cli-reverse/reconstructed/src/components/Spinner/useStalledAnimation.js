/**
 * components/Spinner/useStalledAnimation.ts
 *
 * 检测响应停滞并驱动 Spinner 变色的 hook。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/Spinner/useStalledAnimation.ts
 * pieces: chunk-hzenv5c0.js (1)
 * attribution: fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { useRef } from "../../../vendor/react/cjs/react.production.js";

//@ chunk-hzenv5c0.js:7378-7955 fingerprint (2.1.88 match: useStalledAnimation, 0.832)
function useStalledAnimation(
  time,
  currentResponseLength,
  hasActiveTools = false,
  reducedMotion = false,
  agentId,
) {
  let lastTokenTime = useRef(time);
  let lastResponseLength = useRef(currentResponseLength);
  let stalledIntensityRef = useRef(0);
  let lastSmoothTime = useRef(time);
  let lastSmoothTime_2 = useRef(agentId);
  if (currentResponseLength > lastResponseLength.current || lastSmoothTime_2.current !== agentId) {
    lastSmoothTime_2.current = agentId;
    lastTokenTime.current = time;
    lastResponseLength.current = currentResponseLength;
    stalledIntensityRef.current = 0;
    lastSmoothTime.current = time;
  } else if (currentResponseLength < lastResponseLength.current)
    lastResponseLength.current = currentResponseLength;
  let timeSinceLastToken;
  if (hasActiveTools) {
    timeSinceLastToken = 0;
    lastTokenTime.current = time;
  } else timeSinceLastToken = time - lastTokenTime.current;
  let isStalled = timeSinceLastToken > 1e4 && !hasActiveTools;
  let intensity = isStalled ? Math.min((timeSinceLastToken - 1e4) / 1e4, 1) : 0;
  if (!reducedMotion && (intensity > 0 || stalledIntensityRef.current > 0)) {
    let deltaMs = time - lastSmoothTime.current;
    if (deltaMs >= 50) {
      let steps = Math.floor(deltaMs / 50);
      let current = stalledIntensityRef.current;
      for (let i = 0; i < steps; i++) {
        let diff = intensity - current;
        if (Math.abs(diff) < 0.01) {
          current = intensity;
          break;
        }
        current += diff * 0.1;
      }
      stalledIntensityRef.current = current;
      lastSmoothTime.current = time;
    }
  } else {
    stalledIntensityRef.current = intensity;
    lastSmoothTime.current = time;
  }
  let effectiveIntensity = reducedMotion ? intensity : stalledIntensityRef.current;
  return {
    isStalled,
    stalledIntensity: effectiveIntensity,
    timeSinceLastToken,
  };
}
export { useStalledAnimation };
