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
import { CR } from "./disklessSession.js";
import { q, Je, GMt, parkPendingPid } from "./toolCgroup.js";
import { resolveExecutableSafely } from "./findExecutableWindows.js";
import { WMt, B } from "../../vendor/execa/index.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "./errors.js";

/**
 * 安全执行命令（拒绝当前目录下的可执行文件，套工具 cgroup）。
 */
//@ chunk-m4p5zn6n.js:40919-41221 placement
async function safeExecFile(e, n = [], r = {}) {
  CR();
  let { useToolMemoryCgroup: useToolMemoryCgroup, toolCgroupClass: toolCgroupClass, ...u } = r,
    d = { ...q({ useToolMemoryCgroup: useToolMemoryCgroup, toolCgroupClass: toolCgroupClass }), ...u };
  if (Je()) {
    let l = resolveExecutableSafely(e);
    if (l === null) throw Error(`Command '${e}' not found or is in an unsafe location (current directory)`);
    return WMt(l, n, d);
  }
  return WMt(e, n, d);
}
/**
 * 安全 spawn（拒绝当前目录下的可执行文件，套工具 cgroup）。
 */
//@ chunk-m4p5zn6n.js:41221-41720 placement
function safeSpawn(e, n = [], r = {}) {
  CR();
  let { useToolMemoryCgroup: useToolMemoryCgroup, toolCgroupClass: toolCgroupClass, ...u } = r,
    d = e;
  if (Je()) {
    let p = resolveExecutableSafely(e);
    if (p === null)
      throw Object.assign(
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `Command '${e}' not found or is in an unsafe location (current directory)`,
          "safeSpawn: command not found or is in an unsafe location (current directory)",
        ),
        { code: "ENOENT" },
      );
    d = p;
  }
  let l = q({ useToolMemoryCgroup: useToolMemoryCgroup, toolCgroupClass: toolCgroupClass }),
    f = WMt(d, n, { ...l, ...u, buffer: !1, reject: !1 });
  if (useToolMemoryCgroup !== !1 && l.cgroup === void 0 && GMt())
    parkPendingPid(toolCgroupClass ?? "helper", f.pid);
  return (f.catch(() => {}), f);
}
/**
 * 同步安全执行命令。
 */
//@ chunk-m4p5zn6n.js:41720-42013 placement
function safeExecFileSync(e, n = [], r = {}) {
  CR();
  let { useToolMemoryCgroup: useToolMemoryCgroup, toolCgroupClass: toolCgroupClass, ...u } = r,
    d = { ...q({ useToolMemoryCgroup: useToolMemoryCgroup, toolCgroupClass: toolCgroupClass }), ...u };
  if (Je()) {
    let l = resolveExecutableSafely(e);
    if (l === null) throw Error(`Command '${e}' not found or is in an unsafe location (current directory)`);
    return B(l, n, d);
  }
  return B(e, n, d);
}
/**
 * 以 shell 执行命令。
 */
//@ chunk-m4p5zn6n.js:42013-42174 placement
async function safeExecShell(e, n = {}) {
  CR();
  let { useToolMemoryCgroup: useToolMemoryCgroup, toolCgroupClass: toolCgroupClass, ...s } = n;
  return WMt(e, {
    ...q({ useToolMemoryCgroup: useToolMemoryCgroup, toolCgroupClass: toolCgroupClass }),
    ...s,
    shell: !0,
  });
}
/**
 * 同步以 shell 执行命令。
 */
//@ chunk-m4p5zn6n.js:42174-42328 placement
function safeExecShellSync(e, n = {}) {
  CR();
  let { useToolMemoryCgroup: useToolMemoryCgroup, toolCgroupClass: toolCgroupClass, ...s } = n;
  return B(e, {
    ...q({ useToolMemoryCgroup: useToolMemoryCgroup, toolCgroupClass: toolCgroupClass }),
    ...s,
    shell: !0,
  });
}

export { safeExecShell, safeExecFile, safeSpawn, safeExecFileSync, safeExecShellSync };
