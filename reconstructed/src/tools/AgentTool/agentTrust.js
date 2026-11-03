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
  if (isSourceAdminTrusted(e.source)) return !0;
  if (e.source === "userSettings" || e.source === "flagSettings") return !0;
  if (!e.baseDir) return isWorkspacePersistedTrusted();
  return isTrustKeyPersistedTrusted(getAgentFolderTrustKey(e.baseDir));
}
//@ chunk-e6aww6q8.js:2315374-2315433 placement
function NFo(e) {
  if (!e.baseDir) return;
  return getAgentFolderTrustKey(e.baseDir);
}
//@ chunk-e6aww6q8.js:2315433-2315460 placement
var icr = new HostScoped(() => new Map());
//@ chunk-e6aww6q8.js:2315460-2315571 placement
function getAgentFolderTrustKey(e) {
  let of = icr.of(getRootSession().host),
    r = of.get(e);
  if (r !== void 0) return r;
  let s = getPersistedTrustKeyForPath(AGENT_PATHS(e));
  return (of.set(e, s), s);
}
//@ chunk-e6aww6q8.js:2315664-2315697 placement
function $Fo(e) {
  return escapeInvisibleChars(jsonStringify(e));
}
//@ chunk-e6aww6q8.js:2315697-2315778 placement
function w1r(e) {
  return (e.mcpServers ?? []).some((n) => typeof n !== "string") && !isAgentDefinitionTrusted(e);
}
/**
 * 生成项目代理定义所在文件夹未被信任时的提示文字。
 */
//@ chunk-e6aww6q8.js:2315778-2316209 placement
function agentFolderTrustHint(e) {
  if (ignoresPersistedTrust())
    return `${capitalize(PERSISTED_TRUST_IGNORED)}. Move the definition to the user or managed agents folder instead.`;
  let n = getOriginalCwdOrNull(),
    r = NFo(e) ?? (n === null ? null : getWorkspacePersistedTrustKey(n));
  if (r === null)
    return "This session has no working directory and the definition has no folder of its own, so there is no folder to trust.";
  return `Run Claude Code in that folder once and accept the trust dialog, or set projects[${$Fo(r)}].hasTrustDialogAccepted: true in ${describeGlobalConfigFile()}.`;
}
//@ chunk-e6aww6q8.js:2316209-2316796 placement
function checkAgentOriginTrust(e, n, r = "hooks") {
  if (
    r === "mcpServers" &&
    !firstGatedTrustDiagnosticFor(`agent-origin-skip\x00${n}\x00${r}\x00${e.agentType}\x00${e.baseDir ?? ""}`)
  )
    return;
  let s = n === "mainThread" ? "main-thread agent" : "agent",
    h = replaceControlChars(e.agentType),
    y =
      r === "definition"
        ? `${s} '${h}'`
        : `frontmatter ${r === "hooks" ? "hooks" : "MCP servers"} for ${s} '${h}'`;
  (logForDebugging(
    `Skipping ${y}: the folder its definition file came from is not trusted (source: ${e.source}). ${agentFolderTrustHint(e)}`,
    { level: "error" },
  ),
    logEvent("tengu_agent_hooks_origin_untrusted", {
      what: fromEnum(r),
      source: fromEnum(e.source),
      surface: fromEnum(n),
      fromAdditionalDirectory: fromEnum(e.fromAdditionalDirectory === !0 ? "true" : "false"),
    }));
}

export { isAgentDefinitionTrusted, checkAgentOriginTrust, w1r, agentFolderTrustHint, $Fo, NFo };
