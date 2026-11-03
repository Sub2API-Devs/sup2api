/**
 * services/daemon/paths.ts
 *
 * 2.1.316 新增：守护进程路径
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-nt75hmzb.js (12), chunk-z5p8mhdc.js (2)
 * attribution: placement 14
 */
import { join, dirname, basename } from "path";
import { lstatSync, rmSync, readFileSync, mkdirSync, writeFileSync } from "fs";
import { randomBytes } from "crypto";
import { lstat, readFile, rm, mkdir, chmod, utimes, readdir } from "fs/promises";
import { connect } from "net";
import { env } from "../../utils/env.js";
import {
  daemonPipeKey,
  daemonPipeKeyFile,
  DAEMON_PIPE_KEY_RE,
  daemonDirFor,
  daemonControlKeyFile,
  assertMappedNamespace,
  ENOTOWNED,
  daemonPtyDir,
  daemonRvDir,
  isDaemonSocketGoneError,
  daemonPtyPidsDir,
} from "../../utils/sandbox/userNamespace.js";
import { io } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { isENOENT, getErrnoCode } from "../../utils/errors.js";
import { writeAndPublishSync, writeFileAtomic } from "../../utils/atomicPublishWrite.js";
import { getClaudeConfigDir } from "../../utils/envUtils.js";
import { getPlatform } from "../../utils/platform.js";

//@ chunk-nt75hmzb.js:3104-3234 placement
/**
 * 返回守护进程运行目录：/tmp（Termux 用其前缀下的 tmp）下按 uid 与配置标识区分的子目录。
 */
function getDaemonRuntimeDir() {
  let e = process.getuid?.() ?? 0;
  let n = env.TERMUX_VERSION && env.PREFIX ? join(env.PREFIX, "tmp") : "/tmp";
  return join(n, `cc-daemon-${e}`, daemonPipeKey());
}
//@ chunk-nt75hmzb.js:3299-3808 placement
/**
 * 读取或生成守护进程 pipe.key（16 位十六进制随机数）：文件无效时删除重建，内容为空时重试几次；用 wx 独占创建，竞争失败时重读。
 */
var getDaemonPipeKey = io(
  () => {
    let keyPath = daemonPipeKeyFile();
    for (let attempt = 0; attempt < 8; attempt++) {
      let content;
      try {
        let s = lstatSync(keyPath);
        if (!s.isFile() || s.size > 4096) {
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
//@ chunk-nt75hmzb.js:4104-4406 placement
/**
 * 读取守护进程令牌文件（≤4096 字节），不存在或无效时生成 32 位十六进制随机令牌并原子写入（权限 600）。
 */
async function getOrCreateDaemonToken() {
  let e = daemonControlKeyFile();
  try {
    let t = await lstat(e);
    if (t.isFile() && t.size <= 4096) {
      let trimmed = (await readFile(e, "utf8")).trim();
      if (trimmed) return trimmed;
    } else
      await rm(e, {
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
  await writeFileAtomic(e, str, 384);
  return str;
}
//@ chunk-nt75hmzb.js:4406-4546 placement
/**
 * 读取守护进程令牌文件（必须是不超过 4096 字节的普通文件），失败或为空返回 undefined。
 */
async function readDaemonToken() {
  try {
    let e = await lstat(daemonControlKeyFile());
    if (!e.isFile() || e.size > 4096) return;
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
  let e = daemonDirFor();
  if (getPlatform() === "windows") {
    await mkdir(e, {
      recursive: true,
    });
    await chmod(e, 448).catch(() => {});
    return;
  }
  await mkdir(e, {
    recursive: true,
    mode: 448,
  });
  assertMappedNamespace();
  let n = process.getuid?.();
  let t = await lstat(e);
  if (n !== undefined && t.uid !== n)
    throw Error(`refusing to use daemon dir: ${e} is owned by uid ${t.uid}`);
  if ((t.mode & 511) !== 448) await chmod(e, 448);
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
async function assertOwnedPrivateDirs(e) {
  let n = process.getuid?.();
  assertMappedNamespace();
  for (let t of e) {
    let r = await lstat(t);
    if (n !== undefined && r.uid !== n)
      throw Object.assign(Error(`refusing to bind: ${t} is owned by uid ${r.uid}`), {
        code: ENOTOWNED,
      });
    if ((r.mode & 511) !== 448) await chmod(t, 448);
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
async function ensureDaemonSocketDirs(e) {
  if (getPlatform() === "windows") {
    await mkdir(e, {
      recursive: true,
    }).catch(() => {});
    return;
  }
  await ensureDaemonRuntimeDir();
  let n = [daemonPtyDir(), daemonRvDir()];
  for (let t of n)
    await mkdir(t, {
      recursive: true,
      mode: 448,
    });
  if (!n.includes(e)) {
    if (
      await mkdir(e, {
        recursive: true,
        mode: 448,
      }).then(
        () => true,
        () => false,
      )
    )
      n.push(e);
  }
  await assertOwnedPrivateDirs(n);
}
//@ chunk-nt75hmzb.js:5816-6334 placement
/**
 * 后台清理其他已停止的守护进程运行目录：控制套接字连不上、超过 10 秒未修改且 rv/pty/spare 都为空的目录直接删除。
 */
function cleanupStaleDaemonDirs() {
  if (getPlatform() === "windows") return;
  let daemonRuntimeDir = getDaemonRuntimeDir();
  let n = dirname(daemonRuntimeDir);
  let t = basename(daemonRuntimeDir);
  readdir(n, {
    withFileTypes: true,
  })
    .then(async (entries) => {
      for (let entry of entries) {
        if (!entry.isDirectory() || entry.name === t) continue;
        let dirPath = join(n, entry.name);
        if (!(await isSocketDead(join(dirPath, "control.sock")))) continue;
        let a = await lstat(dirPath).catch(() => null);
        if (!a || Date.now() - a.mtimeMs < 1e4) continue;
        let D = await readdir(join(dirPath, "rv")).catch(() => []);
        let R = await readdir(join(dirPath, "pty")).catch(() => []);
        let T = await readdir(join(dirPath, "spare")).catch(() => []);
        if (D.length || R.length || T.length) continue;
        await rm(dirPath, {
          recursive: true,
          force: true,
        }).catch(() => {});
      }
    })
    .catch(() => {});
}
//@ chunk-nt75hmzb.js:6406-6599 placement
function isSocketDead(e) {
  let n;
  let promise = new Promise((resolve) => {
    n = resolve;
  });
  let r = connect(e);
  r.setTimeout(1000, () => {
    r.destroy();
    n(false);
  });
  r.on("error", (s) => {
    n(isDaemonSocketGoneError(getErrnoCode(s)));
  });
  r.once("connect", () => {
    r.end(`{"op":"ping"}
`);
    n(false);
  });
  return promise;
}
//@ chunk-nt75hmzb.js:7630-7739 placement
/**
 * 返回记录命令退出状态的 .exec-exit 文件路径（Windows 放在专用目录下）。
 */
function getExecExitPath(e) {
  if (getPlatform() === "windows") return join(daemonPtyPidsDir(), `${e.split("\\").pop()}.exec-exit`);
  return `${e}.exec-exit`;
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
  daemonJsonPath,
  ensureDaemonSocketDirs,
  daemonLogPath,
  readDaemonToken,
  getDaemonRuntimeDir,
  getExecExitPath,
  ensureDaemonRuntimeDir,
  getOrCreateDaemonToken,
  UNMAPPED_NAMESPACE_REFUSAL,
  getDaemonPipeKey,
  ensureDaemonDir,
  cleanupStaleDaemonDirs,
};
