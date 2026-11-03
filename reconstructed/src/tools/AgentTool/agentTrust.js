/**
 * tools/AgentTool/agentTrust.ts
 *
 * 2.1.316 新增：子代理信任判定
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (8)
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

//@ chunk-e6aww6q8.js:2315215-2315374 placement
function isAgentDefinitionTrusted(e) {
  if (isSourceAdminTrusted(e.source)) return true;
  if (e.source === "userSettings" || e.source === "flagSettings") return true;
  if (!e.baseDir) return isWorkspacePersistedTrusted();
  return isTrustKeyPersistedTrusted(getAgentFolderTrustKey(e.baseDir));
}
//@ chunk-e6aww6q8.js:2315374-2315433 placement
/**
 * 取代理定义所在目录的信任键。
 */
function agentBaseDirTrustKey(e) {
  if (!e.baseDir) return;
  return getAgentFolderTrustKey(e.baseDir);
}
//@ chunk-e6aww6q8.js:2315433-2315460 placement
var agentFolderTrustKeySlots = new HostScoped(() => new Map());
//@ chunk-e6aww6q8.js:2315460-2315571 placement
function getAgentFolderTrustKey(baseDir) {
  let n = agentFolderTrustKeySlots.of(getRootSession().host);
  let r = n.get(baseDir);
  if (r !== undefined) return r;
  let persistedTrustKeyForPath = getPersistedTrustKeyForPath(AGENT_PATHS(baseDir));
  n.set(baseDir, persistedTrustKeyForPath);
  return persistedTrustKeyForPath;
}
//@ chunk-e6aww6q8.js:2315664-2315697 placement
/**
 * JSON 字符串化并转义不可见字符。
 */
function escapedJsonStringify(e) {
  return escapeInvisibleChars(jsonStringify(e));
}
//@ chunk-e6aww6q8.js:2315697-2315778 placement
/**
 * 判断代理定义是否含对象形式 mcpServers 且未被信任。
 */
function hasUntrustedMcpServerEntries(e) {
  return (e.mcpServers ?? []).some((n) => typeof n !== "string") && !isAgentDefinitionTrusted(e);
}
//@ chunk-e6aww6q8.js:2315778-2316209 placement
/**
 * 生成项目代理定义所在文件夹未被信任时的提示文字。
 */
function agentFolderTrustHint(e) {
  if (ignoresPersistedTrust())
    return `${capitalize(PERSISTED_TRUST_IGNORED)}. Move the definition to the user or managed agents folder instead.`;
  let originalCwdOrNull = getOriginalCwdOrNull();
  let r =
    agentBaseDirTrustKey(e) ??
    (originalCwdOrNull === null ? null : getWorkspacePersistedTrustKey(originalCwdOrNull));
  if (r === null)
    return "This session has no working directory and the definition has no folder of its own, so there is no folder to trust.";
  return `Run Claude Code in that folder once and accept the trust dialog, or set projects[${escapedJsonStringify(r)}].hasTrustDialogAccepted: true in ${describeGlobalConfigFile()}.`;
}
//@ chunk-e6aww6q8.js:2316209-2316796 placement
function checkAgentOriginTrust(e, n, r = "hooks") {
  if (
    r === "mcpServers" &&
    !firstGatedTrustDiagnosticFor(`agent-origin-skip\x00${n}\x00${r}\x00${e.agentType}\x00${e.baseDir ?? ""}`)
  )
    return;
  let s = n === "mainThread" ? "main-thread agent" : "agent";
  let h = replaceControlChars(e.agentType);
  let y =
    r === "definition"
      ? `${s} '${h}'`
      : `frontmatter ${r === "hooks" ? "hooks" : "MCP servers"} for ${s} '${h}'`;
  logForDebugging(
    `Skipping ${y}: the folder its definition file came from is not trusted (source: ${e.source}). ${agentFolderTrustHint(e)}`,
    {
      level: "error",
    },
  );
  logEvent("tengu_agent_hooks_origin_untrusted", {
    what: fromEnum(r),
    source: fromEnum(e.source),
    surface: fromEnum(n),
    fromAdditionalDirectory: fromEnum(e.fromAdditionalDirectory === true ? "true" : "false"),
  });
}
export {
  isAgentDefinitionTrusted,
  checkAgentOriginTrust,
  hasUntrustedMcpServerEntries,
  agentFolderTrustHint,
  escapedJsonStringify,
  agentBaseDirTrustKey,
};
