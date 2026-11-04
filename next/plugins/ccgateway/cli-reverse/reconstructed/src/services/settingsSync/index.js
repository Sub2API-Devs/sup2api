/**
 * services/settingsSync/index.ts
 *
 * 用户设置/记忆在云端会话与本机之间同步（CLAUDE.md、rules 等文件条目的打包与回写），以及若干混入的远程会话辅助代码。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/settingsSync/index.ts
 * pieces: chunk-aepeg2w5.js (1), chunk-axmbhcjg.js (1), chunk-e4xept39.js (2), chunk-e6aww6q8.js (1), chunk-s61vbvea.js (1)
 * attribution: callgraph-fingerprint 4, sole-consumer 1, fingerprint 1
 */
import { sep, join } from "path";
import { hostOfUrl } from "../analytics/telemetryCredentialGuard.js";
import { getOauthConfig } from "../../constants/oauth.js";
import { ReferralEligibilityUnavailableError } from "../api/referral.js";
import { classifyAxiosError } from "../../utils/errors.js";
import { getMemoryPath, getUserClaudeRulesDir, getManagedClaudeRulesDir } from "../../utils/config.js";
import { STORAGE_SPACES, isValidKeySegment } from "../../utils/storage/storageSpaces.js";
import { getAutoMemPathOrNull } from "../../memdir/paths.js";
import { projectKeyFromMemoryDir } from "../../memdir/teamMemPrompts.js";
import { CLOUD_SESSION_BANNERS, CODE_HERE_OR_AT } from "../../components/messages/SystemTextMessage.js";
import { createCloudSessionStatusMessage, createSystemMessage } from "../../utils/messages.js";
import { isInstructionsMemoryType_3, MAX_INCLUDE_DEPTH, processMdRules } from "../../utils/claudemd.js";
import { INCLUDE_EXTERNAL, MAX_INCLUDE_READS } from "../homeSeed/homeInventory.js";
import { CLAUDE_MD, RULES } from "../homeSeed/workingFiles.js";

//@ chunk-aepeg2w5.js:129791-129852 callgraph-fingerprint = getSettingsSyncEndpoint (1)
function getSettingsSyncEndpoint() {
  try {
    return hostOfUrl(getOauthConfig().BASE_API_URL);
  } catch {
    return;
  }
}
//@ chunk-s61vbvea.js:500862-501122 callgraph-fingerprint = fetchUserSettingsOnce (0.351)
function fetchUserSettingsOnce(error) {
  if (error instanceof ReferralEligibilityUnavailableError) return error.errorCode;
  let { kind, status } = classifyAxiosError(error);
  switch (kind) {
    case "timeout":
      return "timeout";
    case "network":
      return "network_error";
    case "auth":
    case "http":
      return status !== undefined ? `http_${status}` : "network_error";
    case "other":
      return "request_failed";
  }
}
//@ chunk-e6aww6q8.js:3156204-3156535 callgraph-fingerprint = buildEntriesFromLocalFiles (0.234)
function buildEntriesFromLocalFiles(projectId) {
  if (projectId === getMemoryPath("User")) return STORAGE_SPACES.state("user-memory");
  let rulesPrefix = getUserClaudeRulesDir() + sep;
  if (projectId.startsWith(rulesPrefix)) {
    let parts = projectId.slice(rulesPrefix.length).split(sep);
    return parts.every(isValidKeySegment) ? STORAGE_SPACES.userConfigDir("rules", parts) : undefined;
  }
  let autoMemPathOrNull = getAutoMemPathOrNull();
  if (autoMemPathOrNull !== null && projectId.startsWith(autoMemPathOrNull)) {
    let projectKey = projectKeyFromMemoryDir(autoMemPathOrNull);
    let parts = projectId.slice(autoMemPathOrNull.length).split(sep);
    return projectKey !== undefined && parts.every(isValidKeySegment)
      ? STORAGE_SPACES.memory(projectKey, parts)
      : undefined;
  }
  return;
}
//@ chunk-e4xept39.js:335-379 sole-consumer
/**
 * 把云端会话横幅与「在此处…」提示拼起来，供会话状态消息使用。
 */
function bannerWithCodeHere(bannerKind, codeUrl) {
  return `${CLOUD_SESSION_BANNERS[bannerKind]}${CODE_HERE_OR_AT}${codeUrl}`;
}
//@ chunk-e4xept39.js:379-445 fingerprint = tryReadFileForSync (1)
function tryReadFileForSync(sessionId, remoteSessionUrl, isCloudSession) {
  let content = bannerWithCodeHere(sessionId, remoteSessionUrl);
  return isCloudSession
    ? createCloudSessionStatusMessage(sessionId, remoteSessionUrl, content)
    : createSystemMessage(content, "info");
}
//@ chunk-axmbhcjg.js:8417-8926 callgraph-fingerprint = applyRemoteEntriesToLocal (0.178)
async function applyRemoteEntriesToLocal(configDir, counters, signal) {
  let includeReader = (rulesDir, ruleType) => () =>
    isInstructionsMemoryType_3(
      rulesDir,
      ruleType,
      new Set(),
      INCLUDE_EXTERNAL,
      ruleType === "User" ? 0 : MAX_INCLUDE_DEPTH - 1,
    );
  let exceedsSizeLimit = (content, type) => async () => [
    ...(await processMdRules({
      rulesDir: content,
      type,
      processedPaths: new Set(),
      includeExternal: INCLUDE_EXTERNAL,
      conditionalRule: false,
    })),
    ...(await processMdRules({
      rulesDir: content,
      type,
      processedPaths: new Set(),
      includeExternal: INCLUDE_EXTERNAL,
      conditionalRule: true,
    })),
  ];
  let readers = [
    includeReader(getMemoryPath("Managed"), "Managed"),
    exceedsSizeLimit(getManagedClaudeRulesDir(), "Managed"),
    includeReader(join(configDir, CLAUDE_MD), "User"),
    exceedsSizeLimit(join(configDir, RULES), "User"),
  ];
  let entries = [];
  for (let reader of readers) {
    if (signal?.aborted) return null;
    let readEntries = await reader();
    counters.reads += readEntries.length;
    if (counters.reads > MAX_INCLUDE_READS) return null;
    entries.push(...readEntries);
  }
  return entries;
}
export {
  tryReadFileForSync,
  getSettingsSyncEndpoint,
  fetchUserSettingsOnce,
  applyRemoteEntriesToLocal,
  buildEntriesFromLocalFiles,
};
