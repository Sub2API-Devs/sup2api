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
import {
  X509Certificate,
  X509Certificate as X509Certificate_2,
  X509Certificate as X509Certificate_3,
  X509Certificate as X509Certificate_4,
} from "crypto";
import {
  open,
  open as open_2,
  open as open_3,
  open as open_4,
  open as open_5,
  readFile,
  readFile as readFile_2,
  readFile as readFile_3,
} from "fs/promises";
import { PEM_CERT_BLOCK_RE } from "../utils/mtls.js";
import { $c } from "../utils/platformTargets.js";
import { isENOENT, isFsInaccessible } from "../utils/errors.js";
import { findSocketOwnerPid } from "./relay.js";
import { countAndSortItems } from "../utils/exampleCommands.js";

//@ chunk-awy329vy.js:2378-2391 placement
var Nr = 65536;
//@ chunk-awy329vy.js:2391-3028 placement
function parseCaBundle(n) {
  let match = n.match(PEM_CERT_BLOCK_RE);
  if (!match) return { ok: !1, reason: "no certificate block" };
  if (
    !n
      .split(PEM_CERT_BLOCK_RE)
      .every((s, h) =>
        h === match.length ? /^[ \t\r\n]*$/.test(s) : (h === 0 && s === "") || /^[ \t\r\n]*\n$/.test(s),
      )
  )
    return { ok: !1, reason: "something other than certificate blocks that each start a line" };
  let o = [];
  for (let s of match) {
    let replaced = s.replace(/^-----BEGIN CERTIFICATE-----/, "").replace(/-----END CERTIFICATE-----$/, "");
    if (!/^[A-Za-z0-9+/= \t\r\n]*$/.test(replaced))
      return { ok: !1, reason: "a certificate block holds more than base64" };
    try {
      o.push(new X509Certificate_2(s).raw.toString("base64"));
    } catch {
      return { ok: !1, reason: "a certificate block does not parse" };
    }
  }
  return { ok: !0, blocks: match, ders: o };
}
//@ chunk-awy329vy.js:3028-3296 placement
function compareCaBundles(n, e) {
  if (n === e) return "same";
  let r = parseCaBundle(n),
    o = parseCaBundle(e);
  if (!r.ok || !o.ok || r.ders.length !== o.ders.length) return "different";
  if (r.ders.every((der, h) => der === o.ders[h])) return "same";
  return r.ders.length === 2 && r.ders[0] === o.ders[1] && r.ders[1] === o.ders[0] ? "swapped" : "different";
}
/**
 * 安全读取 CA 证书包文件：只接受普通文件且不超过大小上限，否则返回 unreadable。
 */
//@ chunk-awy329vy.js:3296-3775 placement
async function readCaBundleFile(n) {
  let e;
  try {
    e = await open_2(n, $c());
    let stats = await e.stat();
    if (!stats.isFile() || stats.size > Nr) return { state: "unreadable" };
    let alloc = Buffer.alloc(stats.size + 1),
      { bytesRead: bytesRead } = await e.read(alloc, 0, alloc.length, 0);
    if (bytesRead !== stats.size) return { state: "failed" };
    return {
      state: "read",
      text: new TextDecoder("utf-8", { fatal: !0, ignoreBOM: !0 }).decode(alloc.subarray(0, bytesRead)),
    };
  } catch (error) {
    if (isENOENT(error)) return { state: "missing" };
    return { state: isFsInaccessible(error) || error instanceof TypeError ? "unreadable" : "failed" };
  } finally {
    await e?.close().catch(() => {});
  }
}
//@ chunk-awy329vy.js:3775-3865 placement
async function Se(n, e) {
  let r = await readCaBundleFile(n);
  return r.state === "read" ? compareCaBundles(r.text, e) : "different";
}
//@ chunk-awy329vy.js:3999-4133 placement
var PEER_PROCESS_PENDING = "<pending>",
  PEER_PROCESS_LOOKUP_FAILED = "<lookup-failed>",
  PEER_PROCESS_PROC_NET_UNREADABLE = "<proc-net-unreadable>",
  PEER_PROCESS_INODE_NOT_FOUND = "<inode-not-found>",
  PEER_PROCESS_PID_NOT_FOUND = "<pid-not-found>",
  PEER_PROCESS_COMM_UNREADABLE = "<comm-unreadable>";
/**
 * 在 Linux 上按本地/远端端口查 /proc/net/tcp(6) 找到连接 inode，再找到持有它的进程并读取 /proc/<pid>/comm；各失败环节返回 <…> 形式的占位标记。
 */
//@ chunk-awy329vy.js:4133-4338 placement
async function lookupPeerProcessName(n, e) {
  let r = await findSocketInode(n, e);
  if (r.startsWith("<")) return r;
  let o = await findSocketOwnerPid(r);
  if (o === void 0) return PEER_PROCESS_PID_NOT_FOUND;
  let s;
  try {
    s = Hr(await readFile_2(`/proc/${o}/comm`, "utf8"));
  } catch {
    return PEER_PROCESS_COMM_UNREADABLE;
  }
  return s.length > 0 ? s : PEER_PROCESS_COMM_UNREADABLE;
}
//@ chunk-awy329vy.js:4338-4404 placement
function Hr(n) {
  return n.replace(/[^\x20-\x7e]|</g, "").slice(0, 64);
}
/**
 * 在 /proc/net/tcp 与 tcp6 中查找指定本地/远端地址对应的套接字 inode。
 */
//@ chunk-awy329vy.js:4404-4723 affinity
async function findSocketInode(n, e) {
  let r = countAndSortItems(n),
    o = countAndSortItems(e),
    s = !1;
  for (let h of ["/proc/net/tcp", "/proc/net/tcp6"]) {
    let l;
    try {
      l = await readFile_2(h, "utf8");
    } catch {
      continue;
    }
    s = !0;
    for (let u of l.split(`
`)) {
      let parts = u.trim().split(/\s+/);
      if (parts.length < 10 || !parts[1].endsWith(":" + r) || !parts[2].endsWith(":" + o)) continue;
      let y = parts[9];
      if (y !== "0") return y;
    }
  }
  return s ? PEER_PROCESS_INODE_NOT_FOUND : PEER_PROCESS_PROC_NET_UNREADABLE;
}

export {
  PEER_PROCESS_PENDING,
  lookupPeerProcessName,
  PEER_PROCESS_LOOKUP_FAILED,
  readCaBundleFile,
  compareCaBundles,
  Se,
  parseCaBundle,
};
