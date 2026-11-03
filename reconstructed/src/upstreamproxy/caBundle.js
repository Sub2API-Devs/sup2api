/**
 * upstreamproxy/caBundle.ts
 *
 * 2.1.316 新增。CA 证书包解析。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-awy329vy.js (9)
 * attribution: placement 8, affinity 1
 */
import { X509Certificate } from "crypto";
import { open, readFile } from "fs/promises";
import { PEM_CERT_BLOCK_RE } from "../utils/mtls.js";
import { readOnlyNoFollowFlags } from "../utils/platformTargets.js";
import { isENOENT, isFsInaccessible } from "../utils/errors.js";
import { findSocketOwnerPid } from "./relay.js";
import { countAndSortItems } from "../utils/exampleCommands.js";

//@ chunk-awy329vy.js:2378-2391 placement
/**
 * 读取 CA 包文件时的大小上限（64 KiB）。
 */
var MAX_CA_BUNDLE_FILE_BYTES = 65536;
//@ chunk-awy329vy.js:2391-3028 placement
function parseCaBundle(n) {
  let match = n.match(PEM_CERT_BLOCK_RE);
  if (!match)
    return {
      ok: false,
      reason: "no certificate block",
    };
  if (
    !n
      .split(PEM_CERT_BLOCK_RE)
      .every((s, h) =>
        h === match.length ? /^[ \t\r\n]*$/.test(s) : (h === 0 && s === "") || /^[ \t\r\n]*\n$/.test(s),
      )
  )
    return {
      ok: false,
      reason: "something other than certificate blocks that each start a line",
    };
  let o = [];
  for (let s of match) {
    let replaced = s.replace(/^-----BEGIN CERTIFICATE-----/, "").replace(/-----END CERTIFICATE-----$/, "");
    if (!/^[A-Za-z0-9+/= \t\r\n]*$/.test(replaced))
      return {
        ok: false,
        reason: "a certificate block holds more than base64",
      };
    try {
      o.push(new X509Certificate(s).raw.toString("base64"));
    } catch {
      return {
        ok: false,
        reason: "a certificate block does not parse",
      };
    }
  }
  return {
    ok: true,
    blocks: match,
    ders: o,
  };
}
//@ chunk-awy329vy.js:3028-3296 placement
function compareCaBundles(n, e) {
  if (n === e) return "same";
  let caBundle = parseCaBundle(n);
  let caBundle_2 = parseCaBundle(e);
  if (!caBundle.ok || !caBundle_2.ok || caBundle.ders.length !== caBundle_2.ders.length) return "different";
  if (caBundle.ders.every((der, h) => der === caBundle_2.ders[h])) return "same";
  return caBundle.ders.length === 2 &&
    caBundle.ders[0] === caBundle_2.ders[1] &&
    caBundle.ders[1] === caBundle_2.ders[0]
    ? "swapped"
    : "different";
}
//@ chunk-awy329vy.js:3296-3775 placement
/**
 * 安全读取 CA 证书包文件：只接受普通文件且不超过大小上限，否则返回 unreadable。
 */
async function readCaBundleFile(n) {
  let e;
  try {
    e = await open(n, readOnlyNoFollowFlags());
    let stats = await e.stat();
    if (!stats.isFile() || stats.size > MAX_CA_BUNDLE_FILE_BYTES)
      return {
        state: "unreadable",
      };
    let o = Buffer.alloc(stats.size + 1);
    let { bytesRead } = await e.read(o, 0, o.length, 0);
    if (bytesRead !== stats.size)
      return {
        state: "failed",
      };
    return {
      state: "read",
      text: new TextDecoder("utf-8", {
        fatal: true,
        ignoreBOM: true,
      }).decode(o.subarray(0, bytesRead)),
    };
  } catch (error) {
    if (isENOENT(error))
      return {
        state: "missing",
      };
    return {
      state: isFsInaccessible(error) || error instanceof TypeError ? "unreadable" : "failed",
    };
  } finally {
    await e?.close().catch(() => {});
  }
}
//@ chunk-awy329vy.js:3775-3865 placement
/**
 * 比较文件里的 CA 包与给定内容是否相同（读不到视为不同）。
 */
async function compareBundleWithFile(n, e) {
  let caBundleFile = await readCaBundleFile(n);
  return caBundleFile.state === "read" ? compareCaBundles(caBundleFile.text, e) : "different";
}
//@ chunk-awy329vy.js:3999-4133 placement
var PEER_PROCESS_PENDING = "<pending>";
var PEER_PROCESS_LOOKUP_FAILED = "<lookup-failed>";
var PEER_PROCESS_PROC_NET_UNREADABLE = "<proc-net-unreadable>";
var PEER_PROCESS_INODE_NOT_FOUND = "<inode-not-found>";
var PEER_PROCESS_PID_NOT_FOUND = "<pid-not-found>";
var PEER_PROCESS_COMM_UNREADABLE = "<comm-unreadable>";
//@ chunk-awy329vy.js:4133-4338 placement
/**
 * 在 Linux 上按本地/远端端口查 /proc/net/tcp(6) 找到连接 inode，再找到持有它的进程并读取 /proc/<pid>/comm；各失败环节返回 <…> 形式的占位标记。
 */
async function lookupPeerProcessName(remotePort, localPort) {
  let socketInode = await findSocketInode(remotePort, localPort);
  if (socketInode.startsWith("<")) return socketInode;
  let socketOwnerPid = await findSocketOwnerPid(socketInode);
  if (socketOwnerPid === undefined) return PEER_PROCESS_PID_NOT_FOUND;
  let s;
  try {
    s = sanitizeCommName(await readFile(`/proc/${socketOwnerPid}/comm`, "utf8"));
  } catch {
    return PEER_PROCESS_COMM_UNREADABLE;
  }
  return s.length > 0 ? s : PEER_PROCESS_COMM_UNREADABLE;
}
//@ chunk-awy329vy.js:4338-4404 placement
/**
 * 去掉不可打印字符与尖括号，取进程名（最多 64 字符）。
 */
function sanitizeCommName(file) {
  return file.replace(/[^\x20-\x7e]|</g, "").slice(0, 64);
}
//@ chunk-awy329vy.js:4404-4723 affinity
/**
 * 在 /proc/net/tcp 与 tcp6 中查找指定本地/远端地址对应的套接字 inode。
 */
async function findSocketInode(n, e) {
  let r = countAndSortItems(n);
  let o = countAndSortItems(e);
  let s = false;
  for (let h of ["/proc/net/tcp", "/proc/net/tcp6"]) {
    let l;
    try {
      l = await readFile(h, "utf8");
    } catch {
      continue;
    }
    s = true;
    for (let line of l.split(`
`)) {
      let parts = line.trim().split(/\s+/);
      if (parts.length < 10 || !parts[1].endsWith(":" + r) || !parts[2].endsWith(":" + o)) continue;
      let y = parts[9];
      if (y !== "0") return y;
    }
  }
  return s ? PEER_PROCESS_INODE_NOT_FOUND : PEER_PROCESS_PROC_NET_UNREADABLE;
}
export {
  readCaBundleFile,
  compareCaBundles,
  compareBundleWithFile,
  parseCaBundle,
  PEER_PROCESS_PENDING,
  lookupPeerProcessName,
  PEER_PROCESS_LOOKUP_FAILED,
};
