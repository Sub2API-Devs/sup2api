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
import { MAX_SPILL_BYTES } from "../../utils/plugins/commandSource.js";
import { isNotFoundServerError } from "../plugins/accountSync/syncedPluginHooks.js";
import { getEntrypointKind } from "../../utils/entrypointKinds.js";
import { apiClient } from "../routines/routinesApi.js";
import {
  listErrorResult,
  transportErrorResult,
  errorTypeFromBody,
} from "../plugins/accountSync/listPlugins.js";
import {
  isSkillEnabled,
  getSkillOwnership,
  toSkillRow,
  indexHostMountKinds,
} from "../../skills/hostSkillMounts.js";
import { recordListedSkillOwnerships } from "./listedSkillOwnership.js";
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";
import { logError } from "../../utils/log.js";
import { toError, classifyAxiosError } from "../../utils/errors.js";
import { isZipMagic } from "../plugins/accountSync/sessionSkillManifest.js";

//@ chunk-g748wv6p.js:554-678 placement
/**
 * 组织技能 API 常量：列表超时、下载超时、下载大小上限与 list-skills 路径。
 */
var SKILLS_LIST_TIMEOUT_MS = 30000;
var ORG_SKILL_ZIP_TIMEOUT_MS = 300000;
var _ = MAX_SPILL_BYTES;
var MAX_ORG_SKILL_LIST_BYTES = 16777216;
var ORG_SKILLS_LIST_PATH = "/api/oauth/organizations/:orgUUID/skills/list-skills?include_wiggle_skills=true";
//@ chunk-g748wv6p.js:678-746 placement
/**
 * 按入口类型追加 entrypoint 查询参数，得到组织技能列表路径。
 */
function orgSkillsListPath(entrypointKind) {
  return entrypointKind
    ? `${ORG_SKILLS_LIST_PATH}&entrypoint=${encodeURIComponent(entrypointKind)}`
    : ORG_SKILLS_LIST_PATH;
}
//@ chunk-g748wv6p.js:746-786 placement
var WRAPPED_SKILLS_QUERY = "&wrapped_skills_as_plugins=true";
//@ chunk-g748wv6p.js:786-871 placement
/**
 * 请求组织技能列表；可重试的失败再请求一次。
 */
async function fetchOrgSkillsListWithRetry(t = {}) {
  let orgSkillsList = await fetchOrgSkillsList(t);
  if (!orgSkillsList.success && isNotFoundServerError(orgSkillsList)) return fetchOrgSkillsList(t);
  return orgSkillsList;
}
//@ chunk-g748wv6p.js:871-1498 placement
/**
 * 请求组织技能列表：过滤合法项（可排除 Anthropic 自有技能），记录归属与宿主挂载类型，返回转换后的技能列表或失败结果。
 */
async function fetchOrgSkillsList(t) {
  try {
    let r = `${orgSkillsListPath(getEntrypointKind())}${t.convertedSkillsAsPlugins === true ? WRAPPED_SKILLS_QUERY : ""}`;
    let response = await apiClient.get(r, {
      auth: "teleport-org",
      isBackground: t.isBackground,
      timeout: SKILLS_LIST_TIMEOUT_MS,
      maxContentLength: MAX_ORG_SKILL_LIST_BYTES,
      credentials: t.credentials,
      earlyAnswer: t.earlyAnswer,
    });
    if (!response.ok || !Array.isArray(response.data?.skills)) return listErrorResult("skills", response);
    let filtered = response.data.skills.filter(isSkillEnabled);
    let filtered_2 = filtered.filter(
      (s) => t.withoutAnthropicsOwn !== true || getSkillOwnership(s) !== "anthropic",
    );
    let skills = filtered_2.map(toSkillRow);
    try {
      recordListedSkillOwnerships([...filtered_2, ...filtered]);
    } catch (error) {
      logForDiagnosticsNoPII("warn", "skills_sync_ownerships_not_recorded");
      logError(toError(error));
    }
    try {
      indexHostMountKinds(filtered);
    } catch (error) {
      logForDiagnosticsNoPII("warn", "skills_sync_host_mount_kinds_not_recorded");
      logError(toError(error));
    }
    return {
      success: true,
      skills,
    };
  } catch (error) {
    return transportErrorResult(error);
  }
}
//@ chunk-g748wv6p.js:1498-2264 placement
/**
 * 下载组织技能 zip（可指定版本）并写入文件；响应不是 zip 或请求失败时记录诊断并返回 false。
 */
async function downloadOrgSkillZip(skillId, r, requestedVersion, e = {}) {
  let entrypointKind = getEntrypointKind();
  let i = [];
  if (entrypointKind) i.push(`entrypoint=${encodeURIComponent(entrypointKind)}`);
  if (requestedVersion) i.push(`version=${encodeURIComponent(requestedVersion)}`);
  let s = i.length > 0 ? `?${i.join("&")}` : "";
  try {
    let o = await apiClient.get(
      `/api/oauth/organizations/:orgUUID/skills/${encodeURIComponent(skillId)}/download${s}`,
      {
        auth: "teleport-org",
        isBackground: e.isBackground,
        timeout: ORG_SKILL_ZIP_TIMEOUT_MS,
        responseType: "arraybuffer",
        maxContentLength: _,
        credentials: e.credentials,
      },
    );
    if (!o.ok || !o.data) {
      logForDiagnosticsNoPII("warn", "skills_sync_download_not_ok", {
        reason: o.ok ? "empty_body" : o.reason,
      });
      return false;
    }
    let buffer = Buffer.from(o.data);
    if (!isZipMagic(buffer)) {
      logForDiagnosticsNoPII("warn", "skills_sync_download_not_zip", {
        serverError: errorTypeFromBody(buffer),
        bodyLen: buffer.length,
      });
      return false;
    }
    await writeFile(r, buffer);
    return true;
  } catch (error) {
    let { kind } = classifyAxiosError(error);
    logForDiagnosticsNoPII("warn", "skills_sync_download_exception", {
      kind,
    });
    return false;
  }
}
export { ORG_SKILL_ZIP_TIMEOUT_MS, downloadOrgSkillZip, fetchOrgSkillsListWithRetry };
