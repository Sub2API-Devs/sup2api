/**
 * services/teamMemorySync/teamMemSecretGuard.ts
 *
 * 写共享记忆前的密钥检查，命中即拒绝写入。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/teamMemorySync/teamMemSecretGuard.ts
 * pieces: chunk-a477qqne.js (1)
 * attribution: fingerprint 1
 */
import { scanSecretsInVariants } from "../memoryStore/memoryKeys.js";
import { uniq } from "../../utils/collections.js";

//@ chunk-a477qqne.js:26963-27326 fingerprint (2.1.88 match: checkTeamMemSecrets, 0.518)
/**
 * 写团队/共享记忆前检查密钥，命中则拒绝（reason=secret），提示记忆存储不是放凭证的地方。
 */
function checkTeamMemSecrets(content) {
  let matches = scanSecretsInVariants(content);
  if (matches.length === 0) return null;
  return {
    outcome: "refused",
    reason: "secret",
    message: `Content contains potential secrets (${uniq(matches.map((match) => match.label)).join(", ")}) and cannot be written to memory. Memory stores are never a place for credentials, and project stores are shared with every collaborator. Remove the sensitive content and try again.`,
  };
}
export { checkTeamMemSecrets };
