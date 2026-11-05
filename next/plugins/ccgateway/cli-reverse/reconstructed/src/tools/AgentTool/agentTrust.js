/**
 * tools/AgentTool/agentTrust.ts
 *
 * 2.1.316 新增：子代理信任判定
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (8)
 * attribution: placement 8
 */
import { isSourceAdminTrusted } from "../../utils/settings/pluginOnlyPolicy.js";
import {
  isWorkspacePersistedTrusted,
  isTrustKeyPersistedTrusted,
  getPersistedTrustKeyForPath,
  ignoresPersistedTrust,
  PERSISTED_TRUST_IGNORED,
  getWorkspacePersistedTrustKey,
} from "../../utils/config.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { getRootSession, getOriginalCwdOrNull } from "../../bootstrap/state.js";
import { AGENT_PATHS } from "../../components/agents/types.js";
import { escapeInvisibleChars, replaceControlChars } from "../../utils/resultError.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { capitalize } from "../../utils/stringUtils.js";
import { describeGlobalConfigFile } from "../../utils/env.js";
import { firstGatedTrustDiagnosticFor } from "../../utils/permissions/permissionsLoader.js";
import { logForDebugging } from "../../utils/debug.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:2370606-2370765 placement
function isAgentDefinitionTrusted(agentDefinition) {
  if (isSourceAdminTrusted(agentDefinition.source)) return true;
  if (agentDefinition.source === "userSettings" || agentDefinition.source === "flagSettings") return true;
  if (!agentDefinition.baseDir) return isWorkspacePersistedTrusted();
  return isTrustKeyPersistedTrusted(getAgentFolderTrustKey(agentDefinition.baseDir));
}
//@ chunk-5xgkngpb.js:2370765-2370824 placement
/**
 * 取代理定义所在目录的信任键。
 */
function agentBaseDirTrustKey(agentDefinition) {
  if (!agentDefinition.baseDir) return;
  return getAgentFolderTrustKey(agentDefinition.baseDir);
}
//@ chunk-5xgkngpb.js:2370824-2370851 placement
var agentFolderTrustKeySlots; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:2370824", () => {
  agentFolderTrustKeySlots = new HostScoped(() => new Map());
});
//@ chunk-5xgkngpb.js:2370851-2370962 placement
function getAgentFolderTrustKey(absPath) {
  let cache = agentFolderTrustKeySlots.of(getRootSession().host);
  let cachedKey = cache.get(absPath);
  if (cachedKey !== undefined) return cachedKey;
  let persistedTrustKeyForPath = getPersistedTrustKeyForPath(AGENT_PATHS(absPath));
  cache.set(absPath, persistedTrustKeyForPath);
  return persistedTrustKeyForPath;
}
//@ chunk-5xgkngpb.js:2371055-2371088 placement
/**
 * JSON 字符串化并转义不可见字符。
 */
function escapedJsonStringify(value) {
  return escapeInvisibleChars(jsonStringify(value));
}
//@ chunk-5xgkngpb.js:2371088-2371169 placement
/**
 * 判断代理定义是否含对象形式 mcpServers 且未被信任。
 */
function hasUntrustedMcpServerEntries(agentDefinition) {
  return (
    (agentDefinition.mcpServers ?? []).some((server) => typeof server !== "string") &&
    !isAgentDefinitionTrusted(agentDefinition)
  );
}
//@ chunk-5xgkngpb.js:2371169-2371599 placement
/**
 * 生成项目代理定义所在文件夹未被信任时的提示文字。
 */
function agentFolderTrustHint(agentDefinition) {
  if (ignoresPersistedTrust())
    return `${capitalize(PERSISTED_TRUST_IGNORED)}. Move the definition to the user or managed agents folder instead.`;
  let originalCwdOrNull = getOriginalCwdOrNull();
  let trustKey =
    agentBaseDirTrustKey(agentDefinition) ??
    (originalCwdOrNull === null ? null : getWorkspacePersistedTrustKey(originalCwdOrNull));
  if (trustKey === null)
    return "This session has no working directory and the definition has no folder of its own, so there is no folder to trust.";
  return `Run Claude Code in that folder once and accept the trust dialog, or set projects[${escapedJsonStringify(trustKey)}].hasTrustDialogAccepted: true in ${describeGlobalConfigFile()}.`;
}
//@ chunk-5xgkngpb.js:2371599-2372186 placement
function checkAgentOriginTrust(agentDefinition, surface, what = "hooks") {
  if (
    what === "mcpServers" &&
    !firstGatedTrustDiagnosticFor(
      `agent-origin-skip\x00${surface}\x00${what}\x00${agentDefinition.agentType}\x00${agentDefinition.baseDir ?? ""}`,
    )
  )
    return;
  let agentLabel = surface === "mainThread" ? "main-thread agent" : "agent";
  let agentTypeName = replaceControlChars(agentDefinition.agentType);
  let subject =
    what === "definition"
      ? `${agentLabel} '${agentTypeName}'`
      : `frontmatter ${what === "hooks" ? "hooks" : "MCP servers"} for ${agentLabel} '${agentTypeName}'`;
  logForDebugging(
    `Skipping ${subject}: the folder its definition file came from is not trusted (source: ${agentDefinition.source}). ${agentFolderTrustHint(agentDefinition)}`,
    {
      level: "error",
    },
  );
  logEvent("tengu_agent_hooks_origin_untrusted", {
    what: fromEnum(what),
    source: fromEnum(agentDefinition.source),
    surface: fromEnum(surface),
    fromAdditionalDirectory: fromEnum(agentDefinition.fromAdditionalDirectory === true ? "true" : "false"),
  });
}
export {
  isAgentDefinitionTrusted,
  checkAgentOriginTrust,
  agentBaseDirTrustKey,
  agentFolderTrustHint,
  hasUntrustedMcpServerEntries,
  escapedJsonStringify,
};
