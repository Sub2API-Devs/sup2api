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
import {
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  sep,
  sep as sep_2,
  sep as sep_3,
  sep as sep_4,
  sep as sep_5,
  sep as sep_6,
  sep as sep_7,
  sep as sep_8,
  sep as sep_9,
  sep as sep_10,
  sep as sep_11,
  sep as sep_12,
  sep as sep_13,
  sep as sep_14,
  sep as sep_15,
  sep as sep_16,
  sep as sep_17,
  sep as sep_18,
  sep as sep_19,
  sep as sep_20,
  sep as sep_21,
  sep as sep_22,
  sep as sep_23,
  sep as sep_24,
  sep as sep_25,
  sep as sep_26,
  sep as sep_27,
  sep as sep_28,
  sep as sep_29,
  sep as sep_30,
  sep as sep_31,
  sep as sep_32,
  sep as sep_33,
  sep as sep_34,
  sep as sep_35,
  sep as sep_36,
  sep as sep_37,
  sep as sep_38,
  sep as sep_39,
  sep as sep_40,
  sep as sep_41,
  sep as sep_42,
  sep as sep_43,
  sep as sep_44,
  sep as sep_45,
  sep as sep_46,
  sep as sep_47,
  sep as sep_48,
  sep as sep_49,
  sep as sep_50,
  sep as sep_51,
  sep as sep_52,
  sep as sep_53,
  sep as sep_54,
  sep as sep_55,
  sep as sep_56,
  sep as sep_57,
  sep as sep_58,
  sep as sep_59,
  sep as sep_60,
  sep as sep_61,
  sep as sep_62,
  sep as sep_63,
  sep as sep_64,
  sep as sep_65,
  sep as sep_66,
  sep as sep_67,
  sep as sep_68,
  sep as sep_69,
  sep as sep_70,
  sep as sep_71,
  sep as sep_72,
  sep as sep_73,
} from "path";
import { CLOUD_SESSION_BANNERS, CODE_HERE_OR_AT } from "../../components/messages/SystemTextMessage.js";
import { createCloudSessionStatusMessage, createSystemMessage } from "../../utils/messages.js";
import { Fa } from "../analytics/telemetryCredentialGuard.js";
import { getOauthConfig } from "../../constants/oauth.js";
import { isInstructionsMemoryType_3, MAX_INCLUDE_DEPTH, processMdRules } from "../../utils/claudemd.js";
import { pe, gt } from "../homeSeed/homeInventory.js";
import { getMemoryPath, getManagedClaudeRulesDir, getUserClaudeRulesDir } from "../../utils/config.js";
import { CLAUDE_MD, RULES } from "../homeSeed/workingFiles.js";
import { STORAGE_SPACES, isValidKeySegment } from "../../utils/storage/storageSpaces.js";
import { getAutoMemPathOrNull } from "../../memdir/paths.js";
import { projectKeyFromMemoryDir } from "../../memdir/teamMemPrompts.js";
import { ReferralEligibilityUnavailableError } from "../api/referral.js";
import { classifyAxiosError } from "../../utils/errors.js";

//@ chunk-e4xept39.js:335-379 sole-consumer
function a(e, t) {
  return `${CLOUD_SESSION_BANNERS[e]}${CODE_HERE_OR_AT}${t}`;
}
//@ chunk-e4xept39.js:379-445 fingerprint = tryReadFileForSync (1)
function tryReadFileForSync(e, t, o) {
  let s = a(e, t);
  return o ? createCloudSessionStatusMessage(e, t, s) : createSystemMessage(s, "info");
}
//@ chunk-aepeg2w5.js:129791-129852 callgraph-fingerprint = getSettingsSyncEndpoint (1)
function getSettingsSyncEndpoint() {
  try {
    return Fa(getOauthConfig().BASE_API_URL);
  } catch {
    return;
  }
}
//@ chunk-axmbhcjg.js:8417-8926 callgraph-fingerprint = applyRemoteEntriesToLocal (0.178)
async function applyRemoteEntriesToLocal(e, n, r) {
  let o = (d, f) => () =>
      isInstructionsMemoryType_3(d, f, new Set(), pe, f === "User" ? 0 : MAX_INCLUDE_DEPTH - 1),
    exceedsSizeLimit = (content, f) => async () => [
      ...(await processMdRules({
        rulesDir: content,
        type: f,
        processedPaths: new Set(),
        includeExternal: pe,
        conditionalRule: !1,
      })),
      ...(await processMdRules({
        rulesDir: content,
        type: f,
        processedPaths: new Set(),
        includeExternal: pe,
        conditionalRule: !0,
      })),
    ],
    s = [
      o(getMemoryPath("Managed"), "Managed"),
      exceedsSizeLimit(getManagedClaudeRulesDir(), "Managed"),
      o(join_3(e, CLAUDE_MD), "User"),
      exceedsSizeLimit(join_3(e, RULES), "User"),
    ],
    u = [];
  for (let d of s) {
    if (r?.aborted) return null;
    let f = await d();
    if (((n.reads += f.length), n.reads > gt)) return null;
    u.push(...f);
  }
  return u;
}
//@ chunk-e6aww6q8.js:3156204-3156535 callgraph-fingerprint = buildEntriesFromLocalFiles (0.234)
function buildEntriesFromLocalFiles(projectId) {
  if (projectId === getMemoryPath("User")) return STORAGE_SPACES.state("user-memory");
  let n = getUserClaudeRulesDir() + sep_48;
  if (projectId.startsWith(n)) {
    let parts = projectId.slice(n.length).split(sep_48);
    return parts.every(isValidKeySegment) ? STORAGE_SPACES.userConfigDir("rules", parts) : void 0;
  }
  let r = getAutoMemPathOrNull();
  if (r !== null && projectId.startsWith(r)) {
    let s = projectKeyFromMemoryDir(r),
      parts = projectId.slice(r.length).split(sep_48);
    return s !== void 0 && parts.every(isValidKeySegment) ? STORAGE_SPACES.memory(s, parts) : void 0;
  }
  return;
}
//@ chunk-s61vbvea.js:500862-501122 callgraph-fingerprint = fetchUserSettingsOnce (0.351)
function fetchUserSettingsOnce(e) {
  if (e instanceof ReferralEligibilityUnavailableError) return e.errorCode;
  let { kind: kind, status: status } = classifyAxiosError(e);
  switch (kind) {
    case "timeout":
      return "timeout";
    case "network":
      return "network_error";
    case "auth":
    case "http":
      return status !== void 0 ? `http_${status}` : "network_error";
    case "other":
      return "request_failed";
  }
}

export {
  tryReadFileForSync,
  getSettingsSyncEndpoint,
  fetchUserSettingsOnce,
  applyRemoteEntriesToLocal,
  buildEntriesFromLocalFiles,
};
