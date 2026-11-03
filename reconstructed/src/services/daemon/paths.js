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
import { lstat, readFile, readFile as readFile_2, rm, mkdir, chmod, utimes, readdir } from "fs/promises";
import { connect } from "net";
import { env } from "../../utils/env.js";
import { q, K8o, G, c, hsr, S, ENOTOWNED, UTt, X3r, q8o, Xot } from "../../utils/sandbox/userNamespace.js";
import { io } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { isENOENT, getErrnoCode } from "../../utils/errors.js";
import { writeAndPublishSync, writeFileAtomic } from "../../utils/atomicPublishWrite.js";
import { getClaudeConfigDir } from "../../utils/envUtils.js";
import { getPlatform } from "../../utils/platform.js";

/**
 * 返回守护进程运行目录：/tmp（Termux 用其前缀下的 tmp）下按 uid 与配置标识区分的子目录。
 */
//@ chunk-nt75hmzb.js:3104-3234 placement
function getDaemonRuntimeDir() {
  let e = process.getuid?.() ?? 0,
    n = env.TERMUX_VERSION && env.PREFIX ? join(env.PREFIX, "tmp") : "/tmp";
  return join(n, `cc-daemon-${e}`, q());
}
/**
 * 读取或生成守护进程 pipe.key（16 位十六进制随机数）：文件无效时删除重建，内容为空时重试几次；用 wx 独占创建，竞争失败时重读。
 */
//@ chunk-nt75hmzb.js:3299-3808 placement
var getDaemonPipeKey = io(
  () => {
    let keyPath = K8o();
    for (let attempt = 0; attempt < 8; attempt++) {
      let content;
      try {
        let s = lstatSync(keyPath);
        if (!s.isFile() || s.size > 4096) {
          try {
            rmSync(keyPath, { recursive: !0, force: !0 });
          } catch {}
          content = "invalid";
        } else content = readFileSync(keyPath, "utf8").trim();
      } catch (error) {
        if (!isENOENT(error)) throw error;
      }
      if (content !== void 0) {
        if (G.test(content)) return content;
        if (content === "" && attempt < 3) continue;
        let str = randomBytes(8).toString("hex");
        return (writeAndPublishSync(keyPath, str, 384), str);
      }
      let str = randomBytes(8).toString("hex");
      mkdirSync(c(), { recursive: !0, mode: 448 });
      try {
        return (writeFileSync(keyPath, str, { flag: "wx", mode: 384 }), str);
      } catch (error) {
        if (getErrnoCode(error) !== "EEXIST") throw error;
      }
    }
    throw Error("daemon pipe.key is not a valid nonce");
  },
  () => getClaudeConfigDir(),
);
/**
 * 读取守护进程令牌文件（≤4096 字节），不存在或无效时生成 32 位十六进制随机令牌并原子写入（权限 600）。
 */
//@ chunk-nt75hmzb.js:4104-4406 placement
async function getOrCreateDaemonToken() {
  let e = hsr();
  try {
    let t = await lstat(e);
    if (t.isFile() && t.size <= 4096) {
      let trimmed = (await readFile(e, "utf8")).trim();
      if (trimmed) return trimmed;
    } else await rm(e, { recursive: !0, force: !0 }).catch(() => {});
  } catch (error) {
    if (!isENOENT(error)) throw error;
  }
  let str = randomBytes(16).toString("hex");
  return (await mkdir(c(), { recursive: !0, mode: 448 }), await writeFileAtomic(e, str, 384), str);
}
/**
 * 读取守护进程令牌文件（必须是不超过 4096 字节的普通文件），失败或为空返回 undefined。
 */
//@ chunk-nt75hmzb.js:4406-4546 placement
async function readDaemonToken() {
  try {
    let e = await lstat(hsr());
    if (!e.isFile() || e.size > 4096) return;
    return (await readFile(hsr(), "utf8")).trim() || void 0;
  } catch {
    return;
  }
}
/**
 * 创建守护进程目录：Windows 只创建并设 700；其他平台创建后校验所有者是当前用户，并把权限收紧到 700。
 */
//@ chunk-nt75hmzb.js:4546-4871 placement
async function ensureDaemonDir() {
  let e = c();
  if (getPlatform() === "windows") {
    (await mkdir(e, { recursive: !0 }), await chmod(e, 448).catch(() => {}));
    return;
  }
  (await mkdir(e, { recursive: !0, mode: 448 }), S());
  let n = process.getuid?.(),
    t = await lstat(e);
  if (n !== void 0 && t.uid !== n) throw Error(`refusing to use daemon dir: ${e} is owned by uid ${t.uid}`);
  if ((t.mode & 511) !== 448) await chmod(e, 448);
}
/**
 * 创建守护进程运行目录（权限 700），刷新其时间戳，并校验它和父目录归当前用户所有。
 */
//@ chunk-nt75hmzb.js:4871-5027 placement
async function ensureDaemonRuntimeDir() {
  if (getPlatform() === "windows") return;
  let e = getDaemonRuntimeDir();
  await mkdir(e, { recursive: !0, mode: 448 });
  let date = new Date();
  (await utimes(e, date, date).catch(() => {}), await assertOwnedPrivateDirs([dirname(e), e]));
}
//@ chunk-nt75hmzb.js:5047-5281 placement
async function assertOwnedPrivateDirs(e) {
  let n = process.getuid?.();
  S();
  for (let t of e) {
    let r = await lstat(t);
    if (n !== void 0 && r.uid !== n)
      throw Object.assign(Error(`refusing to bind: ${t} is owned by uid ${r.uid}`), { code: ENOTOWNED });
    if ((r.mode & 511) !== 448) await chmod(t, 448);
  }
}
/**
 * 用户命名空间没有 uid 映射、无法校验目录与对端所有者时拒绝使用守护进程套接字的说明。
 */
//@ chunk-nt75hmzb.js:5281-5482 placement
var UNMAPPED_NAMESPACE_REFUSAL =
  "refusing to use the daemon socket: this process runs in a user namespace without a uid mapping, so directory and peer ownership cannot be verified (start it with a mapping, e.g. unshare -Ur)";
/**
 * 创建守护进程套接字所需的私有目录（运行目录、两类固定目录及指定目录），并校验所有者与权限；Windows 只创建目录。
 */
//@ chunk-nt75hmzb.js:5547-5816 placement
async function ensureDaemonSocketDirs(e) {
  if (getPlatform() === "windows") {
    await mkdir(e, { recursive: !0 }).catch(() => {});
    return;
  }
  await ensureDaemonRuntimeDir();
  let n = [UTt(), X3r()];
  for (let t of n) await mkdir(t, { recursive: !0, mode: 448 });
  if (!n.includes(e)) {
    if (
      await mkdir(e, { recursive: !0, mode: 448 }).then(
        () => !0,
        () => !1,
      )
    )
      n.push(e);
  }
  await assertOwnedPrivateDirs(n);
}
/**
 * 后台清理其他已停止的守护进程运行目录：控制套接字连不上、超过 10 秒未修改且 rv/pty/spare 都为空的目录直接删除。
 */
//@ chunk-nt75hmzb.js:5816-6334 placement
function cleanupStaleDaemonDirs() {
  if (getPlatform() === "windows") return;
  let e = getDaemonRuntimeDir(),
    n = dirname(e),
    t = basename(e);
  readdir(n, { withFileTypes: !0 })
    .then(async (entries) => {
      for (let entry of entries) {
        if (!entry.isDirectory() || entry.name === t) continue;
        let dirPath = join(n, entry.name);
        if (!(await isSocketDead(join(dirPath, "control.sock")))) continue;
        let a = await lstat(dirPath).catch(() => null);
        if (!a || Date.now() - a.mtimeMs < 1e4) continue;
        let D = await readdir(join(dirPath, "rv")).catch(() => []),
          R = await readdir(join(dirPath, "pty")).catch(() => []),
          T = await readdir(join(dirPath, "spare")).catch(() => []);
        if (D.length || R.length || T.length) continue;
        await rm(dirPath, { recursive: !0, force: !0 }).catch(() => {});
      }
    })
    .catch(() => {});
}
//@ chunk-nt75hmzb.js:6406-6599 placement
function isSocketDead(e) {
  let n,
    promise = new Promise((s) => {
      n = s;
    }),
    r = connect(e);
  return (
    r.setTimeout(1000, () => {
      (r.destroy(), n(!1));
    }),
    r.on("error", (s) => {
      n(q8o(getErrnoCode(s)));
    }),
    r.once("connect", () => {
      (r.end(`{"op":"ping"}
`),
        n(!1));
    }),
    promise
  );
}
/**
 * 返回记录命令退出状态的 .exec-exit 文件路径（Windows 放在专用目录下）。
 */
//@ chunk-nt75hmzb.js:7630-7739 placement
function getExecExitPath(e) {
  if (getPlatform() === "windows") return join(Xot(), `${e.split("\\").pop()}.exec-exit`);
  return `${e}.exec-exit`;
}
//@ chunk-z5p8mhdc.js:255-298 placement
function jL() {
  return join(getClaudeConfigDir(), "daemon.json");
}
//@ chunk-z5p8mhdc.js:298-341 placement
function Fye() {
  return join(getClaudeConfigDir(), "daemon.log");
}

export {
  jL,
  ensureDaemonSocketDirs,
  Fye,
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
