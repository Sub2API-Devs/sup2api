/**
 * @anthropic-ai/sandbox-runtime/dist/sandbox/credential-mask-env.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/sandbox-runtime@0.0.81
 * pieces: chunk-qg41pqt6.js (2)
 * attribution: esm-fingerprint 2
 */
import { randomUUID } from "crypto";
import { verifyJwt, maskJwtClaims, mintFakeJwt } from "./credential-decode.js";
import { logForDebugging as logForDebugging_2 } from "../utils/debug.js";
import { extractAndSubstitute } from "./credential-mask-files.js";

//@ chunk-qg41pqt6.js:714052-714066 esm-fingerprint
var ENV_EXTRACT_KEY_PREFIX = "env:";
//@ chunk-qg41pqt6.js:714066-716317 esm-fingerprint
function buildMaskedEnvVars(envVars, allowedDomains, registry, env = process.env) {
  let setEnvVars = {};
  let degradeToUnsetNames = [];
  for (let v of envVars) {
    if (v.mode !== "mask") continue;
    let real = env[v.name];
    if (real === undefined) continue;
    let injectHosts = v.injectHosts ?? allowedDomains;
    if (v.decode === "jwt") {
      if (!verifyJwt(real)) {
        let msg = `[sandbox-runtime] WARNING: credentials.envVars entry "${v.name}" has decode "jwt" but its value did not verify as a JWT. The variable is left UNPROTECTED (real value visible as-is inside the sandbox). Fix the config or remove the entry.`;
        console.warn(msg);
        logForDebugging_2(msg, {
          level: "warn",
        });
        continue;
      }
      if (v.maskClaims?.length) {
        let masked = maskJwtClaims(real, v.maskClaims, (claim, value) =>
          registry.register(`${ENV_EXTRACT_KEY_PREFIX}${v.name}#${claim}`, value, injectHosts),
        );
        if (masked === null) {
          let msg = `[sandbox-runtime] WARNING: credentials.envVars entry "${v.name}" has maskClaims ${JSON.stringify(v.maskClaims)} but none is present as a string claim in its JWT value. The variable is left UNPROTECTED (real value visible as-is inside the sandbox). Fix the config or remove the entry.`;
          console.warn(msg);
          logForDebugging_2(msg, {
            level: "warn",
          });
          continue;
        }
        let skipped = v.maskClaims.filter((c) => !masked.claimSentinels.has(c));
        if (skipped.length > 0)
          logForDebugging_2(
            `[credential-mask] env var "${v.name}": maskClaims ${JSON.stringify(skipped)} absent or non-string in the ` +
              "JWT \u2014 skipped.",
          );
        setEnvVars[v.name] = registry.registerWithSentinel(
          `${ENV_EXTRACT_KEY_PREFIX}${v.name}`,
          masked.fakeToken,
          real,
          injectHosts,
        );
        continue;
      }
      setEnvVars[v.name] = registry.registerWithSentinel(
        `${ENV_EXTRACT_KEY_PREFIX}${v.name}`,
        mintFakeJwt(randomUUID()),
        real,
        injectHosts,
      );
      continue;
    }
    if (v.extract === undefined) {
      setEnvVars[v.name] = registry.register(v.name, real, injectHosts);
      continue;
    }
    let extracted = extractAndSubstitute(real, v.extract, (cap, i) =>
      registry.register(`${ENV_EXTRACT_KEY_PREFIX}${v.name}#${i}`, cap, injectHosts),
    );
    if (extracted === null) {
      let onNoMatch = v.onExtractNoMatch ?? "warn";
      if (onNoMatch === "error")
        throw Error(
          `credentials.envVars entry "${v.name}": extract pattern "${v.extract}" matched nothing (onExtractNoMatch: "error"). Fix the regex, change to "warn"/"deny", or remove the entry.`,
        );
      if (onNoMatch === "deny") {
        logForDebugging_2(
          `[credential-mask] extract pattern /${v.extract}/ matched nothing in the value of ${v.name} \u2014 unsetting the variable.`,
          {
            level: "warn",
          },
        );
        degradeToUnsetNames.push(v.name);
        continue;
      }
      let msg = `[sandbox-runtime] WARNING: credentials.envVars entry "${v.name}" has extract pattern "${v.extract}" that matched nothing in the variable's value. The variable is left UNPROTECTED (visible as-is inside the sandbox). Fix the regex, set onExtractNoMatch to "deny" or "error", or remove the entry.`;
      console.warn(msg);
      logForDebugging_2(msg, {
        level: "warn",
      });
      continue;
    }
    setEnvVars[v.name] = extracted.fakeContent;
  }
  return {
    setEnvVars,
    degradeToUnsetNames,
  };
}
export { buildMaskedEnvVars };
