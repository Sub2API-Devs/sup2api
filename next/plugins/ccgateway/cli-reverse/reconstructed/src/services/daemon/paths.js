/**
 * services/daemon/paths.ts
 *
 * 2.1.316 新增：守护进程路径
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-nt75hmzb.js (43), chunk-z5p8mhdc.js (2)
 * attribution: placement 45
 */
import { join, resolve, dirname, basename } from "path";
import { createHash, randomBytes } from "crypto";
import { lstatSync, rmSync, readFileSync, mkdirSync, writeFileSync } from "fs";
import { lstat, readFile, rm, mkdir, chmod, utimes, readdir } from "fs/promises";
import { connect } from "net";
import { getClaudeConfigDir } from "../../utils/envUtils.js";
import { env } from "../../utils/env.js";
import { memoizeAlias } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { isENOENT, getErrnoCode } from "../../utils/errors.js";
import { writeAndPublishSync, writeFileAtomic } from "../../utils/atomicPublishWrite.js";
import { getPlatform } from "../../utils/platform.js";
import {
  assertMappedNamespace,
  ENOTOWNED,
  isDaemonSocketGoneError,
} from "../../utils/sandbox/userNamespace.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-nt75hmzb.js:2968-3031 placement
/**
 * daemonDirFor：取 daemon 目录。
 */
function daemonDirFor(configDir) {
  return configDir === undefined ? join(getClaudeConfigDir(), "daemon") : join(configDir, "daemon");
}
//@ chunk-nt75hmzb.js:3031-3104 placement
/**
 * daemonPipeKey：由配置目录派生的 daemon 管道键。
 */
function daemonPipeKey() {
  return createHash("sha256").update(resolve(getClaudeConfigDir())).digest("hex").slice(0, 8);
}
//@ chunk-nt75hmzb.js:3104-3234 placement
/**
 * 返回守护进程运行目录：/tmp（Termux 用其前缀下的 tmp）下按 uid 与配置标识区分的子目录。
 */
function getDaemonRuntimeDir() {
  let uid = process.getuid?.() ?? 0;
  let tmpBase = env.TERMUX_VERSION && env.PREFIX ? join(env.PREFIX, "tmp") : "/tmp";
  return join(tmpBase, `cc-daemon-${uid}`, daemonPipeKey());
}
//@ chunk-nt75hmzb.js:3234-3257 placement
/**
 * DAEMON_PIPE_KEY_RE：daemon 管道键格式。
 */
var DAEMON_PIPE_KEY_RE = /^[a-f0-9]{16}$/;
//@ chunk-nt75hmzb.js:3257-3299 placement
/**
 * daemonPipeKeyFile：daemon 管道密钥文件路径。
 */
function daemonPipeKeyFile(configDir) {
  return join(daemonDirFor(configDir), "pipe.key");
}
//@ chunk-nt75hmzb.js:3299-3808 placement
/**
 * 读取或生成守护进程 pipe.key（16 位十六进制随机数）：文件无效时删除重建，内容为空时重试几次；用 wx 独占创建，竞争失败时重读。
 */
var getDaemonPipeKey; // deferred: uses daemonPipeKeyFile of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-nt75hmzb.js:3299", () => {
  getDaemonPipeKey = memoizeAlias(
    () => {
      let keyPath = daemonPipeKeyFile();
      for (let attempt = 0; attempt < 8; attempt++) {
        let content;
        try {
          let stats = lstatSync(keyPath);
          if (!stats.isFile() || stats.size > 4096) {
            try {
              rmSync(keyPath, {
                recursive: true,
                force: true,
              });
            } catch {}
            content = "invalid";
          } else content = readFileSync(keyPath, "utf8").trim();
        } catch (error) {
          if (!isENOENT(error)) throw error;
        }
        if (content !== undefined) {
          if (DAEMON_PIPE_KEY_RE.test(content)) return content;
          if (content === "" && attempt < 3) continue;
          let str = randomBytes(8).toString("hex");
          writeAndPublishSync(keyPath, str, 384);
          return str;
        }
        let str = randomBytes(8).toString("hex");
        mkdirSync(daemonDirFor(), {
          recursive: true,
          mode: 448,
        });
        try {
          writeFileSync(keyPath, str, {
            flag: "wx",
            mode: 384,
          });
          return str;
        } catch (error) {
          if (getErrnoCode(error) !== "EEXIST") throw error;
        }
      }
      throw Error("daemon pipe.key is not a valid nonce");
    },
    () => getClaudeConfigDir(),
  );
});
//@ chunk-nt75hmzb.js:3808-3865 placement
function daemonPipePath(key) {
  return `\\\\.\\pipe\\cc-daemon-${getDaemonPipeKey()}-${key}`;
}
//@ chunk-nt75hmzb.js:3865-3938 placement
/**
 * redactDaemonPipeKey：错误信息里脱敏 daemon 管道键。
 */
function redactDaemonPipeKey(text) {
  return text.replace(/cc-daemon-[0-9a-f]{16}/g, "cc-daemon-*");
}
//@ chunk-nt75hmzb.js:3938-4059 placement
/**
 * 对错误消息与堆栈中的路径做脱敏后返回原错误对象。
 */
function redactErrorPaths(error) {
  if (error instanceof Error) {
    error.message = redactDaemonPipeKey(error.message);
    if (typeof error.stack === "string") error.stack = redactDaemonPipeKey(error.stack);
  }
  return error;
}
//@ chunk-nt75hmzb.js:4059-4104 placement
/**
 * daemonControlKeyFile：daemon 控制密钥文件路径。
 */
function daemonControlKeyFile(configDir) {
  return join(daemonDirFor(configDir), "control.key");
}
//@ chunk-nt75hmzb.js:4104-4406 placement
/**
 * 读取守护进程令牌文件（≤4096 字节），不存在或无效时生成 32 位十六进制随机令牌并原子写入（权限 600）。
 */
async function getOrCreateDaemonToken() {
  let keyPath = daemonControlKeyFile();
  try {
    let stats = await lstat(keyPath);
    if (stats.isFile() && stats.size <= 4096) {
      let trimmed = (await readFile(keyPath, "utf8")).trim();
      if (trimmed) return trimmed;
    } else
      await rm(keyPath, {
        recursive: true,
        force: true,
      }).catch(() => {});
  } catch (error) {
    if (!isENOENT(error)) throw error;
  }
  let str = randomBytes(16).toString("hex");
  await mkdir(daemonDirFor(), {
    recursive: true,
    mode: 448,
  });
  await writeFileAtomic(keyPath, str, 384);
  return str;
}
//@ chunk-nt75hmzb.js:4406-4546 placement
/**
 * 读取守护进程令牌文件（必须是不超过 4096 字节的普通文件），失败或为空返回 undefined。
 */
async function readDaemonToken() {
  try {
    let stats = await lstat(daemonControlKeyFile());
    if (!stats.isFile() || stats.size > 4096) return;
    return (await readFile(daemonControlKeyFile(), "utf8")).trim() || undefined;
  } catch {
    return;
  }
}
//@ chunk-nt75hmzb.js:4546-4871 placement
/**
 * 创建守护进程目录：Windows 只创建并设 700；其他平台创建后校验所有者是当前用户，并把权限收紧到 700。
 */
async function ensureDaemonDir() {
  let dir = daemonDirFor();
  if (getPlatform() === "windows") {
    await mkdir(dir, {
      recursive: true,
    });
    await chmod(dir, 448).catch(() => {});
    return;
  }
  await mkdir(dir, {
    recursive: true,
    mode: 448,
  });
  assertMappedNamespace();
  let uid = process.getuid?.();
  let stats = await lstat(dir);
  if (uid !== undefined && stats.uid !== uid)
    throw Error(`refusing to use daemon dir: ${dir} is owned by uid ${stats.uid}`);
  if ((stats.mode & 511) !== 448) await chmod(dir, 448);
}
//@ chunk-nt75hmzb.js:4871-5027 placement
/**
 * 创建守护进程运行目录（权限 700），刷新其时间戳，并校验它和父目录归当前用户所有。
 */
async function ensureDaemonRuntimeDir() {
  if (getPlatform() === "windows") return;
  let daemonRuntimeDir = getDaemonRuntimeDir();
  await mkdir(daemonRuntimeDir, {
    recursive: true,
    mode: 448,
  });
  let date = new Date();
  await utimes(daemonRuntimeDir, date, date).catch(() => {});
  await assertOwnedPrivateDirs([dirname(daemonRuntimeDir), daemonRuntimeDir]);
}
//@ chunk-nt75hmzb.js:5047-5281 placement
async function assertOwnedPrivateDirs(dirs) {
  let uid = process.getuid?.();
  assertMappedNamespace();
  for (let dir of dirs) {
    let stats = await lstat(dir);
    if (uid !== undefined && stats.uid !== uid)
      throw Object.assign(Error(`refusing to bind: ${dir} is owned by uid ${stats.uid}`), {
        code: ENOTOWNED,
      });
    if ((stats.mode & 511) !== 448) await chmod(dir, 448);
  }
}
//@ chunk-nt75hmzb.js:5281-5482 placement
/**
 * 用户命名空间没有 uid 映射、无法校验目录与对端所有者时拒绝使用守护进程套接字的说明。
 */
var UNMAPPED_NAMESPACE_REFUSAL =
  "refusing to use the daemon socket: this process runs in a user namespace without a uid mapping, so directory and peer ownership cannot be verified (start it with a mapping, e.g. unshare -Ur)";
//@ chunk-nt75hmzb.js:5547-5816 placement
/**
 * 创建守护进程套接字所需的私有目录（运行目录、两类固定目录及指定目录），并校验所有者与权限；Windows 只创建目录。
 */
async function ensureDaemonSocketDirs(dir) {
  if (getPlatform() === "windows") {
    await mkdir(dir, {
      recursive: true,
    }).catch(() => {});
    return;
  }
  await ensureDaemonRuntimeDir();
  let defaults = [daemonPtyDir(), daemonRvDir()];
  for (let dir of defaults)
    await mkdir(dir, {
      recursive: true,
      mode: 448,
    });
  if (!defaults.includes(dir)) {
    if (
      await mkdir(dir, {
        recursive: true,
        mode: 448,
      }).then(
        () => true,
        () => false,
      )
    )
      defaults.push(dir);
  }
  await assertOwnedPrivateDirs(defaults);
}
//@ chunk-nt75hmzb.js:5816-6334 placement
/**
 * 后台清理其他已停止的守护进程运行目录：控制套接字连不上、超过 10 秒未修改且 rv/pty/spare 都为空的目录直接删除。
 */
function cleanupStaleDaemonDirs() {
  if (getPlatform() === "windows") return;
  let daemonRuntimeDir = getDaemonRuntimeDir();
  let parentDir = dirname(daemonRuntimeDir);
  let selfName = basename(daemonRuntimeDir);
  readdir(parentDir, {
    withFileTypes: true,
  })
    .then(async (entries) => {
      for (let entry of entries) {
        if (!entry.isDirectory() || entry.name === selfName) continue;
        let dirPath = join(parentDir, entry.name);
        if (!(await isSocketDead(join(dirPath, "control.sock")))) continue;
        let stats = await lstat(dirPath).catch(() => null);
        if (!stats || Date.now() - stats.mtimeMs < 1e4) continue;
        let rvEntries = await readdir(join(dirPath, "rv")).catch(() => []);
        let ptyEntries = await readdir(join(dirPath, "pty")).catch(() => []);
        let spareEntries = await readdir(join(dirPath, "spare")).catch(() => []);
        if (rvEntries.length || ptyEntries.length || spareEntries.length) continue;
        await rm(dirPath, {
          recursive: true,
          force: true,
        }).catch(() => {});
      }
    })
    .catch(() => {});
}
//@ chunk-nt75hmzb.js:6406-6599 placement
function isSocketDead(socketPath) {
  let resolve;
  let promise = new Promise((resolve_2) => {
    resolve = resolve_2;
  });
  let socket = connect(socketPath);
  socket.setTimeout(1000, () => {
    socket.destroy();
    resolve(false);
  });
  socket.on("error", (error) => {
    resolve(isDaemonSocketGoneError(getErrnoCode(error)));
  });
  socket.once("connect", () => {
    socket.end(`{"op":"ping"}
`);
    resolve(false);
  });
  return promise;
}
//@ chunk-nt75hmzb.js:6599-6641 placement
/**
 * daemonDispatchDir：取 daemon dispatch 目录。
 */
function daemonDispatchDir(configDir) {
  return join(daemonDirFor(configDir), "dispatch");
}
//@ chunk-nt75hmzb.js:6641-6692 placement
/**
 * daemonRejectedDir：取 daemon 被拒任务目录。
 */
function daemonRejectedDir() {
  return join(daemonDirFor(), "dispatch", "rejected");
}
//@ chunk-nt75hmzb.js:6692-6736 placement
/**
 * daemonRosterFile：daemon roster 文件路径。
 */
function daemonRosterFile(configDir) {
  return join(daemonDirFor(configDir), "roster.json");
}
//@ chunk-nt75hmzb.js:6736-6761 placement
var ATTACH_JOURNAL = "attach-journal";
//@ chunk-nt75hmzb.js:6761-6794 placement
/**
 * daemonAttachJournal：daemon 附加日志路径。
 */
function daemonAttachJournal() {
  return join(daemonDirFor(), ATTACH_JOURNAL);
}
//@ chunk-nt75hmzb.js:6794-6830 placement
/**
 * daemonRvDir：daemon rv 目录。
 */
function daemonRvDir() {
  return join(getDaemonRuntimeDir(), "rv");
}
//@ chunk-nt75hmzb.js:6830-6868 placement
/**
 * daemonAuthDir：daemon 认证目录。
 */
function daemonAuthDir(configDir) {
  return join(daemonDirFor(configDir), "auth");
}
//@ chunk-nt75hmzb.js:6868-6912 placement
/**
 * daemonAuthFile：daemon 认证文件路径。
 */
function daemonAuthFile(name) {
  return join(daemonAuthDir(), `${name}.json`);
}
//@ chunk-nt75hmzb.js:6912-6956 placement
/**
 * hostManagedDir：宿主管辖目录。
 */
function hostManagedDir() {
  return join(daemonDirFor(), "host-managed");
}
//@ chunk-nt75hmzb.js:6956-6990 placement
/**
 * hostManagedEntry：宿主管辖目录下的条目。
 */
function hostManagedEntry(short) {
  return join(hostManagedDir(), short);
}
//@ chunk-nt75hmzb.js:6990-7041 placement
/**
 * daemonTokensFile：daemon 令牌文件路径。
 */
function daemonTokensFile(name) {
  return join(daemonAuthDir(), `${name}.tokens.json`);
}
//@ chunk-nt75hmzb.js:7041-7124 placement
/**
 * daemonRvSocket：rv 套接字路径。
 */
function daemonRvSocket(short) {
  if (getPlatform() === "windows") return daemonPipePath(`rv-${short}`);
  return join(daemonRvDir(), `${short}.sock`);
}
//@ chunk-nt75hmzb.js:7124-7161 placement
/**
 * daemonPtyDir：daemon pty 目录。
 */
function daemonPtyDir() {
  return join(getDaemonRuntimeDir(), "pty");
}
//@ chunk-nt75hmzb.js:7161-7244 placement
/**
 * daemonPtySocket：pty 套接字路径。
 */
function daemonPtySocket(id) {
  if (getPlatform() === "windows") return daemonPipePath(`pty-${id}`);
  return join(daemonPtyDir(), `${id}.sock`);
}
//@ chunk-nt75hmzb.js:7244-7283 placement
/**
 * daemonSpareDir：daemon spare 目录。
 */
function daemonSpareDir() {
  return join(getDaemonRuntimeDir(), "spare");
}
//@ chunk-nt75hmzb.js:7283-7331 placement
/**
 * daemonSparePtySocket：spare pty 套接字路径。
 */
function daemonSparePtySocket(id) {
  return join(daemonSpareDir(), `${id}.pty.sock`);
}
//@ chunk-nt75hmzb.js:7331-7381 placement
/**
 * daemonSpareClaimSocket：spare claim 套接字路径。
 */
function daemonSpareClaimSocket(id) {
  return join(daemonSpareDir(), `${id}.claim.sock`);
}
//@ chunk-nt75hmzb.js:7381-7421 placement
/**
 * daemonPtyPidsDir：pty pid 目录。
 */
function daemonPtyPidsDir() {
  return join(daemonDirFor(), "pty-pids");
}
//@ chunk-nt75hmzb.js:7421-7464 placement
/**
 * daemonPtyPidFile：pty pid 文件路径。
 */
function daemonPtyPidFile(id) {
  return join(daemonPtyPidsDir(), `${id}.pid`);
}
//@ chunk-nt75hmzb.js:7464-7497 placement
/**
 * ptyErrFile：pty 错误输出文件。
 */
function ptyErrFile(id) {
  return ptySidecarFile(id, "err");
}
//@ chunk-nt75hmzb.js:7497-7531 placement
/**
 * ptyLateFile：pty 延迟输出文件。
 */
function ptyLateFile(id) {
  return ptySidecarFile(id, "late");
}
//@ chunk-nt75hmzb.js:7531-7630 placement
function ptySidecarFile(id, suffix) {
  if (getPlatform() === "windows") return join(daemonPtyPidsDir(), `${id.split("\\").pop()}.${suffix}`);
  return `${id}.${suffix}`;
}
//@ chunk-nt75hmzb.js:7630-7739 placement
/**
 * 返回记录命令退出状态的 .exec-exit 文件路径（Windows 放在专用目录下）。
 */
function getExecExitPath(filePath) {
  if (getPlatform() === "windows") return join(daemonPtyPidsDir(), `${filePath.split("\\").pop()}.exec-exit`);
  return `${filePath}.exec-exit`;
}
//@ chunk-nt75hmzb.js:7739-7827 placement
/**
 * daemonControlSocket：daemon 控制套接字。
 */
function daemonControlSocket() {
  if (getPlatform() === "windows") return daemonPipePath("control");
  assertMappedNamespace();
  return join(getDaemonRuntimeDir(), "control.sock");
}
//@ chunk-z5p8mhdc.js:255-298 placement
/**
 * 守护进程状态文件路径（configDir/daemon.json）。
 */
function daemonJsonPath() {
  return join(getClaudeConfigDir(), "daemon.json");
}
//@ chunk-z5p8mhdc.js:298-341 placement
/**
 * 守护进程日志文件路径（configDir/daemon.log）。
 */
function daemonLogPath() {
  return join(getClaudeConfigDir(), "daemon.log");
}
export {
  daemonTokensFile,
  daemonAuthDir,
  daemonControlSocket,
  redactDaemonPipeKey,
  daemonJsonPath,
  ptyErrFile,
  ptyLateFile,
  daemonAuthFile,
  daemonRvSocket,
  daemonPtySocket,
  ensureDaemonSocketDirs,
  daemonPtyPidFile,
  daemonSparePtySocket,
  daemonSpareClaimSocket,
  daemonSpareDir,
  daemonControlKeyFile,
  daemonPipeKeyFile,
  daemonRosterFile,
  daemonDispatchDir,
  daemonLogPath,
  readDaemonToken,
  hostManagedDir,
  hostManagedEntry,
  getDaemonRuntimeDir,
  getExecExitPath,
  daemonPtyPidsDir,
  daemonPtyDir,
  ensureDaemonRuntimeDir,
  getOrCreateDaemonToken,
  UNMAPPED_NAMESPACE_REFUSAL,
  daemonRejectedDir,
  ensureDaemonDir,
  daemonRvDir,
  cleanupStaleDaemonDirs,
  redactErrorPaths,
  daemonAttachJournal,
  ATTACH_JOURNAL,
};
