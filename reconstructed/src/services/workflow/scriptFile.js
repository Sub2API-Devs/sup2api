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
import {
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
  join as join_8,
  join as join_9,
  join as join_10,
  join as join_11,
  join as join_12,
  sep,
  sep as sep_2,
  sep as sep_3,
  sep as sep_4,
  sep as sep_5,
  sep as sep_6,
  sep as sep_7,
  sep as sep_8,
  resolve,
  resolve as resolve_2,
} from "path";
import { mkdir, writeFile, open, open as open_2, realpath } from "fs/promises";
import { constants } from "fs";
import { resolveProjectDir, getProjectKeyIfRepresentable } from "../../utils/sessionStorage.js";
import { getSessionId } from "../../bootstrap/state.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { isValidKeySegment, STORAGE_SPACES } from "../../utils/storage/storageSpaces.js";
import { logForDebugging } from "../../utils/debug.js";
import { Qn, gb } from "../../utils/pathClassification.js";
import { n_ } from "../../utils/networkPaths.js";
import { FILE_READ_TOOL_NAME } from "../../tools/FileReadTool/constants.js";
import { WORKFLOW_TOOL_NAME } from "../../tools/WorkflowTool/constants.js";
import { getToolPermissionContext } from "../../utils/permissions/toolPermissionContext.js";
import { getCwd } from "../../utils/cwd.js";
import { poolCanRead, readAutoAllowedForMutation } from "../../utils/permissions/filesystem.js";
import { Fs, O_NOFOLLOW_FLAG } from "../../skills/bundledSkills.js";
import { isENOENT } from "../../utils/errors.js";
import { fdRealPath } from "../../utils/plugins/npmPluginSource.js";

//@ chunk-82kqcve8.js:156136-156162 placement
var gx = 524288,
  aar = 1048576;
/**
 * 把工作流名转成文件名用的 slug（小写、非字母数字转连字符），为空时用 workflow。
 */
//@ chunk-82kqcve8.js:156162-156263 placement
function slugifyWorkflowName(e) {
  return (
    e
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "workflow"
  );
}
//@ chunk-82kqcve8.js:156263-156324 placement
function OAt() {
  return join_9(resolveProjectDir(), getSessionId(), "workflows", "scripts") + sep_6;
}
//@ chunk-82kqcve8.js:156324-156375 placement
function Lf(e, n) {
  return `${OAt()}${slugifyWorkflowName(e)}-${n}.js`;
}
//@ chunk-82kqcve8.js:156375-156889 placement
function resolveWorkflowScriptPath(e, n, r, s) {
  let h = OAt(),
    y = Lf(e, n),
    w = `${slugifyWorkflowName(e)}-${n}.js`;
  return (
    (async () => {
      let S = isStorageV5Enabled() && s ? getProjectKeyIfRepresentable(resolveProjectDir()) : void 0,
        R = getSessionId();
      try {
        if (
          (await mkdir(h, { recursive: !0, mode: 448 }),
          isStorageV5Enabled() && s && S !== void 0 && isValidKeySegment(w))
        ) {
          let write = await s.write(STORAGE_SPACES.sidecar(S, R, ["workflows", "scripts", w]), r, {
            publishDiscipline: "inPlace",
            mode: 384,
          });
          if (!write.ok)
            logForDebugging(`Failed to persist workflow script to ${y}: ${write.error.code}`, {
              level: "warn",
            });
          return;
        }
        await writeFile(y, r, { encoding: "utf-8", mode: 384 });
      } catch (error) {
        logForDebugging(`Failed to persist workflow script to ${y}: ${error}`, { level: "warn" });
      }
    })(),
    y
  );
}
//@ chunk-82kqcve8.js:156889-156936 placement
function wPe(e) {
  return e.replaceAll(
    `\r
`,
    `
`,
  );
}
//@ chunk-82kqcve8.js:156936-157089 placement
function networkScriptPathError(e, n) {
  return Qn(e) || gb(e) || n_(e) || n_(n)
    ? `Network (UNC, NT-namespace, or automount) paths are not allowed for workflow scriptPath: ${e}`
    : null;
}
//@ chunk-41w44bgm.js:12301-12600 placement
function scriptPathNotReadableMessage(e) {
  return `scriptPath must be a script path this tool returned, or a file you can already read (the working directory or a directory you have added): ${e}
A session that cannot call ${FILE_READ_TOOL_NAME} cannot load any scriptPath. Pass the whole script inline through ${WORKFLOW_TOOL_NAME}'s \`script\` input instead.`;
}
//@ chunk-41w44bgm.js:12600-12667 placement
function Rr(e) {
  return { tools: e.options.tools, permissions: () => getToolPermissionContext(e) };
}
//@ chunk-41w44bgm.js:12667-12760 placement
function ZMr(e, n) {
  let r = resolve(getCwd(), e),
    h = networkScriptPathError(e, r);
  if (h !== null) return h;
  return Mr(r, n) ? null : scriptPathNotReadableMessage(e);
}
//@ chunk-41w44bgm.js:12760-12856 placement
function Mr(e, n) {
  if ((n.tools ?? []).length > 0 && !poolCanRead(n)) return !1;
  return readAutoAllowedForMutation(WORKFLOW_TOOL_NAME, e, n, n.permissions());
}
/**
 * 安全加载 scriptPath 指定的工作流脚本：拒绝网络路径；打开后要求单链接普通文件、realpath 与 fd 身份一致、在可读范围内且不超过大小上限，读出并规范化脚本文本。
 */
//@ chunk-41w44bgm.js:12856-13979 placement
async function loadWorkflowScriptFile(scriptPath, permissionContext) {
  let r = ZMr(scriptPath, permissionContext);
  if (r !== null) return { error: r };
  let h = resolve(getCwd(), scriptPath),
    T = constants.O_RDONLY | Fs,
    y;
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
    let stats = await y.stat({ bigint: !0 });
    if (stats.ino === 0n || stats.nlink > 1n) return { error: scriptPathNotReadableMessage(scriptPath) };
    let L = await fdRealPath(y.fd),
      j = L ?? (await realpath(h));
    if (L === null) {
      let te = await open(j, T | O_NOFOLLOW_FLAG);
      try {
        let stats_2 = await te.stat({ bigint: !0 });
        if (stats_2.ino !== stats.ino || stats_2.dev !== stats.dev || stats_2.nlink !== 1n)
          return { error: scriptPathNotReadableMessage(scriptPath) };
      } finally {
        await te.close();
      }
      if ((await realpath(j).catch(() => null)) !== j)
        return { error: scriptPathNotReadableMessage(scriptPath) };
      if ((await y.stat({ bigint: !0 })).nlink !== 1n)
        return { error: scriptPathNotReadableMessage(scriptPath) };
    }
    if (!Mr(j, permissionContext)) return { error: scriptPathNotReadableMessage(scriptPath) };
    if (!stats.isFile()) return { error: `Workflow script file ${scriptPath} is not a regular file` };
    if (stats.size > BigInt(gx)) return { error: `Workflow script file ${scriptPath} exceeds ${gx} bytes` };
    let alloc = Buffer.alloc(Number(stats.size)),
      ke = 0;
    while (ke < alloc.length) {
      let { bytesRead: bytesRead } = await y.read(alloc, ke, alloc.length - ke, ke);
      if (bytesRead === 0) break;
      ke += bytesRead;
    }
    return { script: wPe(alloc.subarray(0, ke).toString("utf-8")), path: j };
  } catch {
    return { error: `Failed to read workflow script file ${scriptPath}` };
  } finally {
    await y.close();
  }
}

export { OAt, loadWorkflowScriptFile, Rr, gx, aar, resolveWorkflowScriptPath, slugifyWorkflowName, wPe, ZMr };
