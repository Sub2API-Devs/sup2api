/**
 * services/skillsSync/orgSkillsApi.ts
 *
 * 2.1.316 新增：组织技能同步 API。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-zaz3dq46.js (6)
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-zaz3dq46.js:554-678 placement
/**
 * 组织技能 API 常量：列表超时、下载超时、下载大小上限与 list-skills 路径。
 */
var SKILLS_LIST_TIMEOUT_MS; // deferred: uses MAX_SPILL_BYTES (../../utils/plugins/commandSource.js) of its import cycle while loading; runs once the cycle is complete
var ORG_SKILL_ZIP_TIMEOUT_MS;
var maxOrgSkillZipBytes;
var MAX_ORG_SKILL_LIST_BYTES;
var ORG_SKILLS_LIST_PATH;
deferInit("chunk-zaz3dq46.js:554", () => {
  SKILLS_LIST_TIMEOUT_MS = 30000;
  ORG_SKILL_ZIP_TIMEOUT_MS = 300000;
  maxOrgSkillZipBytes = MAX_SPILL_BYTES;
  MAX_ORG_SKILL_LIST_BYTES = 16777216;
  ORG_SKILLS_LIST_PATH = "/api/oauth/organizations/:orgUUID/skills/list-skills?include_wiggle_skills=true";
});
//@ chunk-zaz3dq46.js:678-746 placement
/**
 * 按入口类型追加 entrypoint 查询参数，得到组织技能列表路径。
 */
function orgSkillsListPath(entrypointKind) {
  return entrypointKind
    ? `${ORG_SKILLS_LIST_PATH}&entrypoint=${encodeURIComponent(entrypointKind)}`
    : ORG_SKILLS_LIST_PATH;
}
//@ chunk-zaz3dq46.js:746-786 placement
var WRAPPED_SKILLS_QUERY = "&wrapped_skills_as_plugins=true";
//@ chunk-zaz3dq46.js:786-871 placement
/**
 * 请求组织技能列表；可重试的失败再请求一次。
 */
async function fetchOrgSkillsListWithRetry(options = {}) {
  let orgSkillsList = await fetchOrgSkillsList(options);
  if (!orgSkillsList.success && isNotFoundServerError(orgSkillsList)) return fetchOrgSkillsList(options);
  return orgSkillsList;
}
//@ chunk-zaz3dq46.js:871-1498 placement
/**
 * 请求组织技能列表：过滤合法项（可排除 Anthropic 自有技能），记录归属与宿主挂载类型，返回转换后的技能列表或失败结果。
 */
async function fetchOrgSkillsList(options) {
  try {
    let url = `${orgSkillsListPath(getEntrypointKind())}${options.convertedSkillsAsPlugins === true ? WRAPPED_SKILLS_QUERY : ""}`;
    let response = await apiClient.get(url, {
      auth: "teleport-org",
      isBackground: options.isBackground,
      timeout: SKILLS_LIST_TIMEOUT_MS,
      maxContentLength: MAX_ORG_SKILL_LIST_BYTES,
      credentials: options.credentials,
      earlyAnswer: options.earlyAnswer,
    });
    if (!response.ok || !Array.isArray(response.data?.skills)) return listErrorResult("skills", response);
    let skills = response.data.skills.filter(isSkillEnabled);
    let filtered = skills.filter(
      (skill) => options.withoutAnthropicsOwn !== true || getSkillOwnership(skill) !== "anthropic",
    );
    let skills_2 = filtered.map(toSkillRow);
    try {
      recordListedSkillOwnerships([...filtered, ...skills]);
    } catch (error) {
      logForDiagnosticsNoPII("warn", "skills_sync_ownerships_not_recorded");
      logError(toError(error));
    }
    try {
      indexHostMountKinds(skills);
    } catch (error) {
      logForDiagnosticsNoPII("warn", "skills_sync_host_mount_kinds_not_recorded");
      logError(toError(error));
    }
    return {
      success: true,
      skills: skills_2,
    };
  } catch (error) {
    return transportErrorResult(error);
  }
}
//@ chunk-zaz3dq46.js:1498-2261 placement
/**
 * 下载组织技能 zip（可指定版本）并写入文件；响应不是 zip 或请求失败时记录诊断并返回 false。
 */
async function downloadOrgSkillZip(skillId, destPath, requestedVersion, options = {}) {
  let entrypointKind = getEntrypointKind();
  let queryParts = [];
  if (entrypointKind) queryParts.push(`entrypoint=${encodeURIComponent(entrypointKind)}`);
  if (requestedVersion) queryParts.push(`version=${encodeURIComponent(requestedVersion)}`);
  let queryString = queryParts.length > 0 ? `?${queryParts.join("&")}` : "";
  let zipBytes;
  try {
    let response = await apiClient.get(
      `/api/oauth/organizations/:orgUUID/skills/${encodeURIComponent(skillId)}/download${queryString}`,
      {
        auth: "teleport-org",
        isBackground: options.isBackground,
        timeout: ORG_SKILL_ZIP_TIMEOUT_MS,
        responseType: "arraybuffer",
        maxContentLength: maxOrgSkillZipBytes,
        credentials: options.credentials,
      },
    );
    if (!response.ok || !response.data) {
      logForDiagnosticsNoPII("warn", "skills_sync_download_not_ok", {
        reason: response.ok ? "empty_body" : response.reason,
      });
      return false;
    }
    zipBytes = Buffer.from(response.data);
    if (!isZipMagic(zipBytes)) {
      logForDiagnosticsNoPII("warn", "skills_sync_download_not_zip", {
        serverError: errorTypeFromBody(zipBytes),
        bodyLen: zipBytes.length,
      });
      return false;
    }
  } catch (error) {
    let { kind } = classifyAxiosError(error);
    logForDiagnosticsNoPII("warn", "skills_sync_download_exception", {
      kind,
    });
    return false;
  }
  await writeFile(destPath, zipBytes);
  return true;
}
export { ORG_SKILL_ZIP_TIMEOUT_MS, downloadOrgSkillZip, fetchOrgSkillsListWithRetry };
