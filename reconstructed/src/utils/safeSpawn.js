/**
 * utils/safeSpawn.ts
 *
 * 2.1.316 新增：安全子进程启动。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-m4p5zn6n.js (5)
 * attribution: placement 5
 */
import { assertProgramLaunchAllowed } from "./disklessSession.js";
import {
  helperCgroupSpawnOptions,
  isToolMemoryCgroupDisabled,
  isToolCgroupPending,
  parkPendingPid,
} from "./toolCgroup.js";
import { resolveExecutableSafely } from "./findExecutableWindows.js";
import { execa, execaSync } from "../../vendor/execa/index.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "./errors.js";

//@ chunk-m4p5zn6n.js:40919-41221 placement
/**
 * 安全执行命令（拒绝当前目录下的可执行文件，套工具 cgroup）。
 */
async function safeExecFile(e, n = [], r = {}) {
  assertProgramLaunchAllowed();
  let { useToolMemoryCgroup, toolCgroupClass, ...u } = r;
  let d = {
    ...helperCgroupSpawnOptions({
      useToolMemoryCgroup,
      toolCgroupClass,
    }),
    ...u,
  };
  if (isToolMemoryCgroupDisabled()) {
    let executable = resolveExecutableSafely(e);
    if (executable === null)
      throw Error(`Command '${e}' not found or is in an unsafe location (current directory)`);
    return execa(executable, n, d);
  }
  return execa(e, n, d);
}
//@ chunk-m4p5zn6n.js:41221-41720 placement
/**
 * 安全 spawn（拒绝当前目录下的可执行文件，套工具 cgroup）。
 */
function safeSpawn(e, n = [], r = {}) {
  assertProgramLaunchAllowed();
  let { useToolMemoryCgroup, toolCgroupClass, ...u } = r;
  let d = e;
  if (isToolMemoryCgroupDisabled()) {
    let executable = resolveExecutableSafely(e);
    if (executable === null)
      throw Object.assign(
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `Command '${e}' not found or is in an unsafe location (current directory)`,
          "safeSpawn: command not found or is in an unsafe location (current directory)",
        ),
        {
          code: "ENOENT",
        },
      );
    d = executable;
  }
  let l = helperCgroupSpawnOptions({
    useToolMemoryCgroup,
    toolCgroupClass,
  });
  let f = execa(d, n, {
    ...l,
    ...u,
    buffer: false,
    reject: false,
  });
  if (useToolMemoryCgroup !== false && l.cgroup === undefined && isToolCgroupPending())
    parkPendingPid(toolCgroupClass ?? "helper", f.pid);
  f.catch(() => {});
  return f;
}
//@ chunk-m4p5zn6n.js:41720-42013 placement
/**
 * 同步安全执行命令。
 */
function safeExecFileSync(e, n = [], r = {}) {
  assertProgramLaunchAllowed();
  let { useToolMemoryCgroup, toolCgroupClass, ...u } = r;
  let d = {
    ...helperCgroupSpawnOptions({
      useToolMemoryCgroup,
      toolCgroupClass,
    }),
    ...u,
  };
  if (isToolMemoryCgroupDisabled()) {
    let executable = resolveExecutableSafely(e);
    if (executable === null)
      throw Error(`Command '${e}' not found or is in an unsafe location (current directory)`);
    return execaSync(executable, n, d);
  }
  return execaSync(e, n, d);
}
//@ chunk-m4p5zn6n.js:42013-42174 placement
/**
 * 以 shell 执行命令。
 */
async function safeExecShell(e, n = {}) {
  assertProgramLaunchAllowed();
  let { useToolMemoryCgroup, toolCgroupClass, ...s } = n;
  return execa(e, {
    ...helperCgroupSpawnOptions({
      useToolMemoryCgroup,
      toolCgroupClass,
    }),
    ...s,
    shell: true,
  });
}
//@ chunk-m4p5zn6n.js:42174-42328 placement
/**
 * 同步以 shell 执行命令。
 */
function safeExecShellSync(command, n = {}) {
  assertProgramLaunchAllowed();
  let { useToolMemoryCgroup, toolCgroupClass, ...s } = n;
  return execaSync(command, {
    ...helperCgroupSpawnOptions({
      useToolMemoryCgroup,
      toolCgroupClass,
    }),
    ...s,
    shell: true,
  });
}
export { safeExecShell, safeExecFile, safeSpawn, safeExecFileSync, safeExecShellSync };
