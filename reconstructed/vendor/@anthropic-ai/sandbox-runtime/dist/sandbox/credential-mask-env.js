/**
 * @anthropic-ai/sandbox-runtime/dist/sandbox/credential-mask-env.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sandbox-runtime@0.0.81
 * pieces: chunk-fq0cr76a.js (2)
 * attribution: esm-fingerprint 2
 */
import { randomUUID, randomUUID as randomUUID_2, randomUUID as randomUUID_3 } from "crypto";
import { Vm, Gm, Wm } from "./credential-decode.js";
import { At } from "../utils/debug.js";
import { $m } from "./credential-mask-files.js";

//@ chunk-fq0cr76a.js:712377-712391 esm-fingerprint
var ENV = "env:";
//@ chunk-fq0cr76a.js:712391-714642 esm-fingerprint
function RR(e, n, r, s = process.env) {
  let h = {},
    y = [];
  for (let b of e) {
    if (b.mode !== "mask") continue;
    let S = s[b.name];
    if (S === void 0) continue;
    let w = b.injectHosts ?? n;
    if (b.decode === "jwt") {
      if (!Vm(S)) {
        let D = `[sandbox-runtime] WARNING: credentials.envVars entry "${b.name}" has decode "jwt" but its value did not verify as a JWT. The variable is left UNPROTECTED (real value visible as-is inside the sandbox). Fix the config or remove the entry.`;
        (console.warn(D), At(D, { level: "warn" }));
        continue;
      }
      if (b.maskClaims?.length) {
        let D = Gm(S, b.maskClaims, (L, V) => r.register(`${ENV}${b.name}#${L}`, V, w));
        if (D === null) {
          let L = `[sandbox-runtime] WARNING: credentials.envVars entry "${b.name}" has maskClaims ${JSON.stringify(b.maskClaims)} but none is present as a string claim in its JWT value. The variable is left UNPROTECTED (real value visible as-is inside the sandbox). Fix the config or remove the entry.`;
          (console.warn(L), At(L, { level: "warn" }));
          continue;
        }
        let filtered = b.maskClaims.filter((maskClaim) => !D.claimSentinels.has(maskClaim));
        if (filtered.length > 0)
          At(
            `[credential-mask] env var "${b.name}": maskClaims ${JSON.stringify(filtered)} absent or non-string in the ` +
              "JWT \u2014 skipped.",
          );
        h[b.name] = r.registerWithSentinel(`${ENV}${b.name}`, D.fakeToken, S, w);
        continue;
      }
      h[b.name] = r.registerWithSentinel(`${ENV}${b.name}`, Wm(randomUUID_3()), S, w);
      continue;
    }
    if (b.extract === void 0) {
      h[b.name] = r.register(b.name, S, w);
      continue;
    }
    let R = $m(S, b.extract, (D, O) => r.register(`${ENV}${b.name}#${O}`, D, w));
    if (R === null) {
      let D = b.onExtractNoMatch ?? "warn";
      if (D === "error")
        throw Error(
          `credentials.envVars entry "${b.name}": extract pattern "${b.extract}" matched nothing (onExtractNoMatch: "error"). Fix the regex, change to "warn"/"deny", or remove the entry.`,
        );
      if (D === "deny") {
        (At(
          `[credential-mask] extract pattern /${b.extract}/ matched nothing in the value of ${b.name} \u2014 unsetting the variable.`,
          { level: "warn" },
        ),
          y.push(b.name));
        continue;
      }
      let O = `[sandbox-runtime] WARNING: credentials.envVars entry "${b.name}" has extract pattern "${b.extract}" that matched nothing in the variable's value. The variable is left UNPROTECTED (visible as-is inside the sandbox). Fix the regex, set onExtractNoMatch to "deny" or "error", or remove the entry.`;
      (console.warn(O), At(O, { level: "warn" }));
      continue;
    }
    h[b.name] = R.fakeContent;
  }
  return { setEnvVars: h, degradeToUnsetNames: y };
}

export { RR };
