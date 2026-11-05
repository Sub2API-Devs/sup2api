/**
 * services/workflow/scriptFile.ts
 *
 * 工作流脚本文件路径（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-a2q0x549.js (7), chunk-kd2wbncj.js (6)
 * attribution: placement 13
 */
import { join as join_2, sep as sep_2, resolve } from "path";
import { mkdir, writeFile, open, realpath } from "fs/promises";
import { constants } from "fs";
import { resolveProjectDir, getProjectKeyIfRepresentable } from "../../utils/sessionStorage.js";
import { getSessionId } from "../../bootstrap/state.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { isValidKeySegment, STORAGE_SPACES } from "../../utils/storage/storageSpaces.js";
import { logForDebugging } from "../../utils/debug.js";
import { isUncOrDevicePath, isDevicePrefixPath } from "../../utils/pathClassification.js";
import { isNetworkOrSpecialPath } from "../../utils/networkPaths.js";
import { READ } from "../../tools/FileReadTool/constants.js";
import { WORKFLOW_TOOL_NAME } from "../../tools/WorkflowTool/constants.js";
import { getToolPermissionContext } from "../../utils/permissions/toolPermissionContext.js";
import { codeModeAccepted } from "../../utils/codeMode/accepted.js";
import { getCwd } from "../../utils/cwd.js";
import { poolCanRead, readAutoAllowedForMutation } from "../../utils/permissions/filesystem.js";
import { isENOENT } from "../../utils/errors.js";
import { fdRealPath } from "../../utils/plugins/npmPluginSource.js";
import { getPlatform } from "../../utils/platform.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-a2q0x549.js:154219-154245 placement
/**
 * 工作流脚本与脚本包的大小上限。
 */
var MAX_SCRIPT_FILE_BYTES = 524288;
var MAX_SCRIPT_BUNDLE_BYTES = 1048576;
//@ chunk-a2q0x549.js:154245-154346 placement
/**
 * 把工作流名转成文件名用的 slug（小写、非字母数字转连字符），为空时用 workflow。
 */
function slugifyWorkflowName(name) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "workflow"
  );
}
//@ chunk-a2q0x549.js:154346-154407 placement
/**
 * 会话工作流脚本目录（带结尾分隔符）。
 */
function workflowScriptsDir() {
  return join_2(resolveProjectDir(), getSessionId(), "workflows", "scripts") + sep_2;
}
//@ chunk-a2q0x549.js:154407-154458 placement
/**
 * 由工作流名与哈希拼出脚本文件路径。
 */
function workflowScriptPath(workflowName, runId) {
  return `${workflowScriptsDir()}${slugifyWorkflowName(workflowName)}-${runId}.js`;
}
//@ chunk-a2q0x549.js:154458-154972 placement
function resolveWorkflowScriptPath(workflowName, runId, script, storageV5) {
  let scriptsDir = workflowScriptsDir();
  let filePath = workflowScriptPath(workflowName, runId);
  let fileName = `${slugifyWorkflowName(workflowName)}-${runId}.js`;
  (async () => {
    let projectKey =
      isStorageV5Enabled() && storageV5 ? getProjectKeyIfRepresentable(resolveProjectDir()) : undefined;
    let sessionId = getSessionId();
    try {
      await mkdir(scriptsDir, {
        recursive: true,
        mode: 448,
      });
      if (isStorageV5Enabled() && storageV5 && projectKey !== undefined && isValidKeySegment(fileName)) {
        let writeResult = await storageV5.write(
          STORAGE_SPACES.sidecar(projectKey, sessionId, ["workflows", "scripts", fileName]),
          script,
          {
            publishDiscipline: "inPlace",
            mode: 384,
          },
        );
        if (!writeResult.ok)
          logForDebugging(`Failed to persist workflow script to ${filePath}: ${writeResult.error.code}`, {
            level: "warn",
          });
        return;
      }
      await writeFile(filePath, script, {
        encoding: "utf-8",
        mode: 384,
      });
    } catch (error) {
      logForDebugging(`Failed to persist workflow script to ${filePath}: ${error}`, {
        level: "warn",
      });
    }
  })();
  return filePath;
}
//@ chunk-a2q0x549.js:154972-155019 placement
/**
 * 把 CRLF 统一成 LF。
 */
function normalizeCrLf(text) {
  return text.replaceAll(
    `\r
`,
    `
`,
  );
}
//@ chunk-a2q0x549.js:155019-155172 placement
function networkScriptPathError(rawPath, resolvedPath) {
  return isUncOrDevicePath(rawPath) ||
    isDevicePrefixPath(rawPath) ||
    isNetworkOrSpecialPath(rawPath) ||
    isNetworkOrSpecialPath(resolvedPath)
    ? `Network (UNC, NT-namespace, or automount) paths are not allowed for workflow scriptPath: ${rawPath}`
    : null;
}
//@ chunk-kd2wbncj.js:4449-4748 placement
function scriptPathNotReadableMessage(scriptPath) {
  return `scriptPath must be a script path this tool returned, or a file you can already read (the working directory or a directory you have added): ${scriptPath}
A session that cannot call ${READ} cannot load any scriptPath. Pass the whole script inline through ${WORKFLOW_TOOL_NAME}'s \`script\` input instead.`;
}
//@ chunk-kd2wbncj.js:4748-4923 placement
/**
 * 由上下文得到工具表与权限读取器。
 */
function workflowToolContext(context) {
  let toolContext = {
    tools: context.options.tools,
    permissions: () => getToolPermissionContext(context),
  };
  if (codeModeAccepted())
    Object.defineProperty(toolContext, "primitiveToolGrant", {
      get: () => context.primitiveToolGrant,
      enumerable: true,
    });
  return toolContext;
}
//@ chunk-kd2wbncj.js:4923-5016 placement
/**
 * 脚本路径不可用时的拒绝说明（网络路径、不可读）。
 */
function scriptPathRefusal(scriptPath, storage) {
  let resolved = resolve(getCwd(), scriptPath);
  let networkError = networkScriptPathError(scriptPath, resolved);
  if (networkError !== null) return networkError;
  return canReadWorkflowScript(resolved, storage) ? null : scriptPathNotReadableMessage(scriptPath);
}
//@ chunk-kd2wbncj.js:5016-5112 placement
/**
 * 是否允许读取该工作流脚本（受工具表与权限规则约束）。
 */
function canReadWorkflowScript(resolvedPath, permissionContext) {
  if ((permissionContext.tools ?? []).length > 0 && !poolCanRead(permissionContext)) return false;
  return readAutoAllowedForMutation(
    WORKFLOW_TOOL_NAME,
    resolvedPath,
    permissionContext,
    permissionContext.permissions(),
  );
}
//@ chunk-kd2wbncj.js:5112-6229 placement
/**
 * 安全加载 scriptPath 指定的工作流脚本：拒绝网络路径；打开后要求单链接普通文件、realpath 与 fd 身份一致、在可读范围内且不超过大小上限，读出并规范化脚本文本。
 */
async function loadWorkflowScriptFile(scriptPath, permissionContext) {
  let refusal = scriptPathRefusal(scriptPath, permissionContext);
  if (refusal !== null)
    return {
      error: refusal,
    };
  let absolutePath = resolve(getCwd(), scriptPath);
  let openFlags = constants.O_RDONLY | O_NONBLOCK_FLAG;
  let handle;
  try {
    handle = await open(absolutePath, openFlags);
  } catch (error) {
    return {
      error: isENOENT(error)
        ? `Workflow script file not found: ${scriptPath}`
        : `Failed to read workflow script file ${scriptPath}`,
    };
  }
  try {
    let stats = await handle.stat({
      bigint: true,
    });
    if (stats.ino === 0n || stats.nlink > 1n)
      return {
        error: scriptPathNotReadableMessage(scriptPath),
      };
    let fdPath = await fdRealPath(handle.fd);
    let realPath = fdPath ?? (await realpath(absolutePath));
    if (fdPath === null) {
      let verifyHandle = await open(realPath, openFlags | O_NOFOLLOW_FLAG);
      try {
        let stats_2 = await verifyHandle.stat({
          bigint: true,
        });
        if (stats_2.ino !== stats.ino || stats_2.dev !== stats.dev || stats_2.nlink !== 1n)
          return {
            error: scriptPathNotReadableMessage(scriptPath),
          };
      } finally {
        await verifyHandle.close();
      }
      if ((await realpath(realPath).catch(() => null)) !== realPath)
        return {
          error: scriptPathNotReadableMessage(scriptPath),
        };
      if (
        (
          await handle.stat({
            bigint: true,
          })
        ).nlink !== 1n
      )
        return {
          error: scriptPathNotReadableMessage(scriptPath),
        };
    }
    if (!canReadWorkflowScript(realPath, permissionContext))
      return {
        error: scriptPathNotReadableMessage(scriptPath),
      };
    if (!stats.isFile())
      return {
        error: `Workflow script file ${scriptPath} is not a regular file`,
      };
    if (stats.size > BigInt(MAX_SCRIPT_FILE_BYTES))
      return {
        error: `Workflow script file ${scriptPath} exceeds ${MAX_SCRIPT_FILE_BYTES} bytes`,
      };
    let buffer = Buffer.alloc(Number(stats.size));
    let totalRead = 0;
    while (totalRead < buffer.length) {
      let { bytesRead } = await handle.read(buffer, totalRead, buffer.length - totalRead, totalRead);
      if (bytesRead === 0) break;
      totalRead += bytesRead;
    }
    return {
      script: normalizeCrLf(buffer.subarray(0, totalRead).toString("utf-8")),
      path: realPath,
    };
  } catch {
    return {
      error: `Failed to read workflow script file ${scriptPath}`,
    };
  } finally {
    await handle.close();
  }
}
//@ chunk-kd2wbncj.js:6229-6303 placement
/**
 * 平台不支持的 O_NONBLOCK 回退为 0。
 */
var O_NONBLOCK_FLAG; // deferred: uses getPlatform (../../utils/platform.js) of its import cycle while loading; runs once the cycle is complete
var O_NOFOLLOW_FLAG;
deferInit("chunk-kd2wbncj.js:6229", () => {
  O_NONBLOCK_FLAG = getPlatform() === "windows" ? 0 : constants.O_NONBLOCK;
  O_NOFOLLOW_FLAG = getPlatform() === "windows" ? 0 : constants.O_NOFOLLOW;
});
export {
  slugifyWorkflowName,
  workflowScriptsDir,
  MAX_SCRIPT_FILE_BYTES,
  normalizeCrLf,
  MAX_SCRIPT_BUNDLE_BYTES,
  resolveWorkflowScriptPath,
  loadWorkflowScriptFile,
  workflowToolContext,
  scriptPathRefusal,
};
