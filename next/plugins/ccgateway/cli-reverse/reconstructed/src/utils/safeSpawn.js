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
async function safeExecFile(command, args = [], options = {}) {
  assertProgramLaunchAllowed();
  let { useToolMemoryCgroup, toolCgroupClass, ...rest } = options;
  let spawnOptions = {
    ...helperCgroupSpawnOptions({
      useToolMemoryCgroup,
      toolCgroupClass,
    }),
    ...rest,
  };
  if (isToolMemoryCgroupDisabled()) {
    let executable = resolveExecutableSafely(command);
    if (executable === null)
      throw Error(`Command '${command}' not found or is in an unsafe location (current directory)`);
    return execa(executable, args, spawnOptions);
  }
  return execa(command, args, spawnOptions);
}
//@ chunk-m4p5zn6n.js:41221-41720 placement
/**
 * 安全 spawn（拒绝当前目录下的可执行文件，套工具 cgroup）。
 */
function safeSpawn(command, args = [], options = {}) {
  assertProgramLaunchAllowed();
  let { useToolMemoryCgroup, toolCgroupClass, ...rest } = options;
  let executable = command;
  if (isToolMemoryCgroupDisabled()) {
    let executable_2 = resolveExecutableSafely(command);
    if (executable_2 === null)
      throw Object.assign(
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `Command '${command}' not found or is in an unsafe location (current directory)`,
          "safeSpawn: command not found or is in an unsafe location (current directory)",
        ),
        {
          code: "ENOENT",
        },
      );
    executable = executable_2;
  }
  let cgroupOptions = helperCgroupSpawnOptions({
    useToolMemoryCgroup,
    toolCgroupClass,
  });
  let child = execa(executable, args, {
    ...cgroupOptions,
    ...rest,
    buffer: false,
    reject: false,
  });
  if (useToolMemoryCgroup !== false && cgroupOptions.cgroup === undefined && isToolCgroupPending())
    parkPendingPid(toolCgroupClass ?? "helper", child.pid);
  child.catch(() => {});
  return child;
}
//@ chunk-m4p5zn6n.js:41720-42013 placement
/**
 * 同步安全执行命令。
 */
function safeExecFileSync(command, args = [], options = {}) {
  assertProgramLaunchAllowed();
  let { useToolMemoryCgroup, toolCgroupClass, ...rest } = options;
  let spawnOptions = {
    ...helperCgroupSpawnOptions({
      useToolMemoryCgroup,
      toolCgroupClass,
    }),
    ...rest,
  };
  if (isToolMemoryCgroupDisabled()) {
    let executable = resolveExecutableSafely(command);
    if (executable === null)
      throw Error(`Command '${command}' not found or is in an unsafe location (current directory)`);
    return execaSync(executable, args, spawnOptions);
  }
  return execaSync(command, args, spawnOptions);
}
//@ chunk-m4p5zn6n.js:42013-42174 placement
/**
 * 以 shell 执行命令。
 */
async function safeExecShell(command, options = {}) {
  assertProgramLaunchAllowed();
  let { useToolMemoryCgroup, toolCgroupClass, ...rest } = options;
  return execa(command, {
    ...helperCgroupSpawnOptions({
      useToolMemoryCgroup,
      toolCgroupClass,
    }),
    ...rest,
    shell: true,
  });
}
//@ chunk-m4p5zn6n.js:42174-42328 placement
/**
 * 同步以 shell 执行命令。
 */
function safeExecShellSync(command, options = {}) {
  assertProgramLaunchAllowed();
  let { useToolMemoryCgroup, toolCgroupClass, ...rest } = options;
  return execaSync(command, {
    ...helperCgroupSpawnOptions({
      useToolMemoryCgroup,
      toolCgroupClass,
    }),
    ...rest,
    shell: true,
  });
}
export { safeExecShell, safeExecFile, safeSpawn, safeExecFileSync, safeExecShellSync };
