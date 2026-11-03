/**
 * services/skillsSync/orgSkillsApi.ts
 *
 * 2.1.316 新增：组织技能同步 API。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-g748wv6p.js (6)
 * attribution: placement 6
 */
import { writeFile } from "fs/promises";
import { Oxe } from "../../utils/plugins/commandSource.js";
import { Hee } from "../plugins/accountSync/syncedPluginHooks.js";
import { getEntrypointKind } from "../../utils/entrypointKinds.js";
import { apiClient } from "../routines/routinesApi.js";
import {
  listErrorResult,
  transportErrorResult,
  errorTypeFromBody,
} from "../plugins/accountSync/listPlugins.js";
import { lii, getSkillOwnership, toSkillRow, indexHostMountKinds } from "../../skills/hostSkillMounts.js";
import { recordListedSkillOwnerships } from "./listedSkillOwnership.js";
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";
import { logError } from "../../utils/log.js";
import { toError, classifyAxiosError } from "../../utils/errors.js";
import { L5r } from "../plugins/accountSync/sessionSkillManifest.js";

/**
 * 组织技能 API 常量：列表超时、下载超时、下载大小上限与 list-skills 路径。
 */
//@ chunk-g748wv6p.js:554-678 placement
var SKILLS_LIST_TIMEOUT_MS = 30000,
  qOo = 300000,
  _ = Oxe,
  m = 16777216,
  d = "/api/oauth/organizations/:orgUUID/skills/list-skills?include_wiggle_skills=true";
//@ chunk-g748wv6p.js:678-746 placement
function y(t) {
  return t ? `${d}&entrypoint=${encodeURIComponent(t)}` : d;
}
//@ chunk-g748wv6p.js:746-786 placement
var f = "&wrapped_skills_as_plugins=true";
//@ chunk-g748wv6p.js:786-871 placement
async function Aln(t = {}) {
  let r = await fetchOrgSkillsList(t);
  if (!r.success && Hee(r)) return fetchOrgSkillsList(t);
  return r;
}
/**
 * 请求组织技能列表：过滤合法项（可排除 Anthropic 自有技能），记录归属与宿主挂载类型，返回转换后的技能列表或失败结果。
 */
//@ chunk-g748wv6p.js:871-1498 placement
async function fetchOrgSkillsList(t) {
  try {
    let r = `${y(getEntrypointKind())}${t.convertedSkillsAsPlugins === !0 ? f : ""}`,
      n = await apiClient.get(r, {
        auth: "teleport-org",
        isBackground: t.isBackground,
        timeout: SKILLS_LIST_TIMEOUT_MS,
        maxContentLength: m,
        credentials: t.credentials,
        earlyAnswer: t.earlyAnswer,
      });
    if (!n.ok || !Array.isArray(n.data?.skills)) return listErrorResult("skills", n);
    let filtered = n.data.skills.filter(lii),
      filtered_2 = filtered.filter(
        (s) => t.withoutAnthropicsOwn !== !0 || getSkillOwnership(s) !== "anthropic",
      ),
      mapped = filtered_2.map(toSkillRow);
    try {
      recordListedSkillOwnerships([...filtered_2, ...filtered]);
    } catch (error) {
      (logForDiagnosticsNoPII("warn", "skills_sync_ownerships_not_recorded"), logError(toError(error)));
    }
    try {
      indexHostMountKinds(filtered);
    } catch (error) {
      (logForDiagnosticsNoPII("warn", "skills_sync_host_mount_kinds_not_recorded"), logError(toError(error)));
    }
    return { success: !0, skills: mapped };
  } catch (error) {
    return transportErrorResult(error);
  }
}
/**
 * 下载组织技能 zip（可指定版本）并写入文件；响应不是 zip 或请求失败时记录诊断并返回 false。
 */
//@ chunk-g748wv6p.js:1498-2264 placement
async function downloadOrgSkillZip(t, r, n, e = {}) {
  let c = getEntrypointKind(),
    i = [];
  if (c) i.push(`entrypoint=${encodeURIComponent(c)}`);
  if (n) i.push(`version=${encodeURIComponent(n)}`);
  let s = i.length > 0 ? `?${i.join("&")}` : "";
  try {
    let o = await apiClient.get(
      `/api/oauth/organizations/:orgUUID/skills/${encodeURIComponent(t)}/download${s}`,
      {
        auth: "teleport-org",
        isBackground: e.isBackground,
        timeout: qOo,
        responseType: "arraybuffer",
        maxContentLength: _,
        credentials: e.credentials,
      },
    );
    if (!o.ok || !o.data)
      return (
        logForDiagnosticsNoPII("warn", "skills_sync_download_not_ok", {
          reason: o.ok ? "empty_body" : o.reason,
        }),
        !1
      );
    let buffer = Buffer.from(o.data);
    if (!L5r(buffer))
      return (
        logForDiagnosticsNoPII("warn", "skills_sync_download_not_zip", {
          serverError: errorTypeFromBody(buffer),
          bodyLen: buffer.length,
        }),
        !1
      );
    return (await writeFile(r, buffer), !0);
  } catch (error) {
    let { kind: kind } = classifyAxiosError(error);
    return (logForDiagnosticsNoPII("warn", "skills_sync_download_exception", { kind: kind }), !1);
  }
}

export { qOo, downloadOrgSkillZip, Aln };
