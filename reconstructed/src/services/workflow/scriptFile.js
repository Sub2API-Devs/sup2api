/**
 * services/workflow/scriptFile.ts
 *
 * 工作流脚本文件路径（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-41w44bgm.js (5), chunk-82kqcve8.js (7)
 * attribution: placement 12
 */
import { join, sep, resolve } from "path";
import { mkdir, writeFile, open, realpath } from "fs/promises";
import { constants } from "fs";
import { resolveProjectDir, getProjectKeyIfRepresentable } from "../../utils/sessionStorage.js";
import { getSessionId } from "../../bootstrap/state.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { isValidKeySegment, STORAGE_SPACES } from "../../utils/storage/storageSpaces.js";
import { logForDebugging } from "../../utils/debug.js";
import { isUncOrDevicePath, isDevicePrefixPath } from "../../utils/pathClassification.js";
import { isNetworkOrSpecialPath } from "../../utils/networkPaths.js";
import { FILE_READ_TOOL_NAME } from "../../tools/FileReadTool/constants.js";
import { WORKFLOW_TOOL_NAME } from "../../tools/WorkflowTool/constants.js";
import { getToolPermissionContext } from "../../utils/permissions/toolPermissionContext.js";
import { getCwd } from "../../utils/cwd.js";
import { poolCanRead, readAutoAllowedForMutation } from "../../utils/permissions/filesystem.js";
import { O_NONBLOCK_FLAG, O_NOFOLLOW_FLAG_2 } from "../../skills/bundledSkills.js";
import { isENOENT } from "../../utils/errors.js";
import { fdRealPath } from "../../utils/plugins/npmPluginSource.js";

//@ chunk-82kqcve8.js:156136-156162 placement
/**
 * 工作流脚本与脚本包的大小上限。
 */
var MAX_SCRIPT_FILE_BYTES = 524288;
var MAX_SCRIPT_BUNDLE_BYTES = 1048576;
//@ chunk-82kqcve8.js:156162-156263 placement
/**
 * 把工作流名转成文件名用的 slug（小写、非字母数字转连字符），为空时用 workflow。
 */
function slugifyWorkflowName(e) {
  return (
    e
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "workflow"
  );
}
//@ chunk-82kqcve8.js:156263-156324 placement
/**
 * 会话工作流脚本目录（带结尾分隔符）。
 */
function workflowScriptsDir() {
  return join(resolveProjectDir(), getSessionId(), "workflows", "scripts") + sep;
}
//@ chunk-82kqcve8.js:156324-156375 placement
/**
 * 由工作流名与哈希拼出脚本文件路径。
 */
function workflowScriptPath(e, n) {
  return `${workflowScriptsDir()}${slugifyWorkflowName(e)}-${n}.js`;
}
//@ chunk-82kqcve8.js:156375-156889 placement
function resolveWorkflowScriptPath(e, n, script, storageV5) {
  let h = workflowScriptsDir();
  let y = workflowScriptPath(e, n);
  let w = `${slugifyWorkflowName(e)}-${n}.js`;
  (async () => {
    let S = isStorageV5Enabled() && storageV5 ? getProjectKeyIfRepresentable(resolveProjectDir()) : undefined;
    let sessionId = getSessionId();
    try {
      await mkdir(h, {
        recursive: true,
        mode: 448,
      });
      if (isStorageV5Enabled() && storageV5 && S !== undefined && isValidKeySegment(w)) {
        let O = await storageV5.write(
          STORAGE_SPACES.sidecar(S, sessionId, ["workflows", "scripts", w]),
          script,
          {
            publishDiscipline: "inPlace",
            mode: 384,
          },
        );
        if (!O.ok)
          logForDebugging(`Failed to persist workflow script to ${y}: ${O.error.code}`, {
            level: "warn",
          });
        return;
      }
      await writeFile(y, script, {
        encoding: "utf-8",
        mode: 384,
      });
    } catch (error) {
      logForDebugging(`Failed to persist workflow script to ${y}: ${error}`, {
        level: "warn",
      });
    }
  })();
  return y;
}
//@ chunk-82kqcve8.js:156889-156936 placement
/**
 * 把 CRLF 统一成 LF。
 */
function normalizeCrLf(e) {
  return e.replaceAll(
    `\r
`,
    `
`,
  );
}
//@ chunk-82kqcve8.js:156936-157089 placement
function networkScriptPathError(e, n) {
  return isUncOrDevicePath(e) ||
    isDevicePrefixPath(e) ||
    isNetworkOrSpecialPath(e) ||
    isNetworkOrSpecialPath(n)
    ? `Network (UNC, NT-namespace, or automount) paths are not allowed for workflow scriptPath: ${e}`
    : null;
}
//@ chunk-41w44bgm.js:12301-12600 placement
function scriptPathNotReadableMessage(scriptPath) {
  return `scriptPath must be a script path this tool returned, or a file you can already read (the working directory or a directory you have added): ${scriptPath}
A session that cannot call ${FILE_READ_TOOL_NAME} cannot load any scriptPath. Pass the whole script inline through ${WORKFLOW_TOOL_NAME}'s \`script\` input instead.`;
}
//@ chunk-41w44bgm.js:12600-12667 placement
/**
 * 由上下文得到工具表与权限读取器。
 */
function workflowToolContext(context) {
  return {
    tools: context.options.tools,
    permissions: () => getToolPermissionContext(context),
  };
}
//@ chunk-41w44bgm.js:12667-12760 placement
/**
 * 脚本路径不可用时的拒绝说明（网络路径、不可读）。
 */
function scriptPathRefusal(scriptPath, n) {
  let r = resolve(getCwd(), scriptPath);
  let h = networkScriptPathError(scriptPath, r);
  if (h !== null) return h;
  return canReadWorkflowScript(r, n) ? null : scriptPathNotReadableMessage(scriptPath);
}
//@ chunk-41w44bgm.js:12760-12856 placement
/**
 * 是否允许读取该工作流脚本（受工具表与权限规则约束）。
 */
function canReadWorkflowScript(e, n) {
  if ((n.tools ?? []).length > 0 && !poolCanRead(n)) return false;
  return readAutoAllowedForMutation(WORKFLOW_TOOL_NAME, e, n, n.permissions());
}
//@ chunk-41w44bgm.js:12856-13979 placement
/**
 * 安全加载 scriptPath 指定的工作流脚本：拒绝网络路径；打开后要求单链接普通文件、realpath 与 fd 身份一致、在可读范围内且不超过大小上限，读出并规范化脚本文本。
 */
async function loadWorkflowScriptFile(scriptPath, permissionContext) {
  let r = scriptPathRefusal(scriptPath, permissionContext);
  if (r !== null)
    return {
      error: r,
    };
  let h = resolve(getCwd(), scriptPath);
  let T = constants.O_RDONLY | O_NONBLOCK_FLAG;
  let y;
  try {
    y = await open(h, T);
  } catch (error) {
    return {
      error: isENOENT(error)
        ? `Workflow script file not found: ${scriptPath}`
        : `Failed to read workflow script file ${scriptPath}`,
    };
  }
  try {
    let stats = await y.stat({
      bigint: true,
    });
    if (stats.ino === 0n || stats.nlink > 1n)
      return {
        error: scriptPathNotReadableMessage(scriptPath),
      };
    let L = await fdRealPath(y.fd);
    let j = L ?? (await realpath(h));
    if (L === null) {
      let te = await open(j, T | O_NOFOLLOW_FLAG_2);
      try {
        let stats_2 = await te.stat({
          bigint: true,
        });
        if (stats_2.ino !== stats.ino || stats_2.dev !== stats.dev || stats_2.nlink !== 1n)
          return {
            error: scriptPathNotReadableMessage(scriptPath),
          };
      } finally {
        await te.close();
      }
      if ((await realpath(j).catch(() => null)) !== j)
        return {
          error: scriptPathNotReadableMessage(scriptPath),
        };
      if (
        (
          await y.stat({
            bigint: true,
          })
        ).nlink !== 1n
      )
        return {
          error: scriptPathNotReadableMessage(scriptPath),
        };
    }
    if (!canReadWorkflowScript(j, permissionContext))
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
    let he = Buffer.alloc(Number(stats.size));
    let ke = 0;
    while (ke < he.length) {
      let { bytesRead } = await y.read(he, ke, he.length - ke, ke);
      if (bytesRead === 0) break;
      ke += bytesRead;
    }
    return {
      script: normalizeCrLf(he.subarray(0, ke).toString("utf-8")),
      path: j,
    };
  } catch {
    return {
      error: `Failed to read workflow script file ${scriptPath}`,
    };
  } finally {
    await y.close();
  }
}
export {
  workflowScriptsDir,
  loadWorkflowScriptFile,
  workflowToolContext,
  MAX_SCRIPT_FILE_BYTES,
  MAX_SCRIPT_BUNDLE_BYTES,
  resolveWorkflowScriptPath,
  slugifyWorkflowName,
  normalizeCrLf,
  scriptPathRefusal,
};
