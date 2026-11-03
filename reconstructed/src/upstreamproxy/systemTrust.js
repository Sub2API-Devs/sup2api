/**
 * upstreamproxy/systemTrust.ts
 *
 * 2.1.316 新增。系统 CA 信任安装。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-awy329vy.js (13)
 * attribution: placement 13
 */
import { createHash, X509Certificate } from "crypto";
import { join, basename } from "path";
import { readdir, lstat, unlink, chmod, rename, mkdir, open, symlink, stat, readlink } from "fs/promises";
import { constants } from "fs";
import { env } from "../utils/env.js";
import { whichAsync } from "../utils/which.js";
import { writeIfMissing } from "../utils/atomicPublishWrite.js";
import { isENOENT, errorMessage } from "../utils/errors.js";
import { platformNoFollowFlags } from "../utils/platformTargets.js";
import { logForDebugging } from "../utils/debug.js";
import { execFileNoThrow } from "../utils/execFileNoThrow.js";
import { logToolOutput, describeExecOutcome } from "./toolTrust.js";
import { readFileSyncCached } from "../utils/file.js";

//@ chunk-awy329vy.js:34747-35690 placement
/**
 * 表示 dpkg 安装未完成的标记文件。
 */
var JAVA_CA_HOOK_PATHS = {
  hook: "/etc/ca-certificates/update.d/jks-keystore",
  postinst: "/var/lib/dpkg/info/ca-certificates-java.postinst",
  jar: "/usr/share/ca-certificates-java/ca-certificates-java.jar",
  knownSha256: {
    hook: ["254a87ea1f9fe37751e3ed90a79013f3424c7a5fe26bfe59fac312abff82dbda"],
    postinst: ["4d76cba4f4a8583c70bb4632e9c2c00a669396500b686c1f32cd2046a9e1e110"],
    jar: ["42a384eebe60fbe91a40d295fe5f1ff85e3a0db0d3a91016cd83994105d6b5c0"],
  },
  defaults: "/etc/default/cacerts",
  stateDir: "/var/lib/ca-certificates-java",
  dpkgStatus: "/var/lib/dpkg/status",
  dpkgUpdates: "/var/lib/dpkg/updates",
  dpkgUnincorporatedTriggers: "/var/lib/dpkg/triggers/Unincorp",
  dpkgTriggerInterest: "/var/lib/dpkg/triggers/update-ca-certificates-java",
  cacerts: "/etc/ssl/certs/java/cacerts",
};
var CHANGEIT = "changeit";
var DPKG_UNFINISHED_MARKERS = ["pending", "fresh", "convert_pkcs12_keystore_to_jks"];
var MAX_JAVA_CA_FILE_LINES = 262144;
var JAVA_CA_POSTINST_MAX_LINES = 33554432;
var JAVA_CA_CACERTS_MAX_LINES = 4194304;
var JKS_MAGIC = 4277010157;
var JKS_VERSION_MAGIC = 2;
var JKS_ENTRY_TAG = 2;
var X_509 = "X.509";
var JKS_TRAILER_BYTES = 20;
var JAVA_VERSION_RE = /^-----(?:BEGIN ([^-\n]*)-----[\s\S]*?^-----END \1-----)?/m;
//@ chunk-awy329vy.js:35690-37424 placement
async function installJavaStoreDirect(n, link, javaHook) {
  try {
    if (env.CCR_AGENT_PROXY_JAVA_STORE_DIRECT_DISABLED) return "disabled";
    for (let x of ["hook", "postinst", "jar"]) {
      let smallFileWithMeta = await readSmallFileWithMeta(javaHook[x], MAX_JAVA_CA_FILE_LINES);
      if (
        smallFileWithMeta === undefined ||
        !javaHook.knownSha256[x].includes(createHash("sha256").update(smallFileWithMeta.bytes).digest("hex"))
      )
        return "package";
    }
    if (
      (await readSmallFileWithMeta(javaHook.dpkgTriggerInterest, 1024))?.bytes.toString("latin1") !==
      `ca-certificates-java
`
    )
      return "package";
    let smallFileWithMeta = await readSmallFileWithMeta(javaHook.defaults, MAX_JAVA_CA_FILE_LINES);
    if (
      smallFileWithMeta === undefined ||
      env.CACERT_UPDATES === "disabled" ||
      (env.DPKG_MAINTSCRIPT_PACKAGE ?? "") !== "" ||
      env.DPKG_ADMINDIR !== undefined ||
      env.DPKG_ROOT !== undefined ||
      smallFileWithMeta.bytes
        .toString("latin1")
        .split(
          `
`,
        )
        .filter((line) => !/^[ \t]*(#.*)?$/.test(line)).join(`
`) !== "cacerts_updates=yes"
    )
      return "settings";
    for (let x of DPKG_UNFINISHED_MARKERS)
      if (await pathExistsAsync(join(javaHook.stateDir, x))) return "unfinished";
    let smallFileWithMeta_2 = await readSmallFileWithMeta(javaHook.dpkgStatus, JAVA_CA_POSTINST_MAX_LINES);
    let l = (await pathExistsAsync(javaHook.dpkgUnincorporatedTriggers))
      ? await readSmallFileWithMeta(javaHook.dpkgUnincorporatedTriggers, 1)
      : {
          bytes: Buffer.alloc(0),
        };
    if (
      smallFileWithMeta_2 === undefined ||
      smallFileWithMeta_2.bytes.includes(`
Triggers-Pending:`) ||
      smallFileWithMeta_2.bytes.includes(`
Triggers-Awaited:`) ||
      l?.bytes.length !== 0 ||
      (await readdir(javaHook.dpkgUpdates)).length !== 0
    )
      return "unfinished";
    if ((await whichAsync("java")) === null) return "no_java";
    let u = n.startsWith("0") ? null : JAVA_VERSION_RE.exec(n);
    let p;
    try {
      p = new X509Certificate(u?.[1] === "CERTIFICATE" ? u[0] : "").raw;
    } catch {
      return "certificate";
    }
    let y = `debian:${basename(link)}`;
    if (!/^[\x21-\x40\x5b-\x7e]+$/.test(y)) return "alias";
    let smallFileWithMeta_3 = await readSmallFileWithMeta(javaHook.cacerts, JAVA_CA_CACERTS_MAX_LINES);
    let T = smallFileWithMeta_3 && parseJavaKeystoreAliases(smallFileWithMeta_3.bytes);
    if (smallFileWithMeta_3 === undefined || T === undefined || smallFileWithMeta_3.nlink !== 1)
      return "store";
    if (T.includes(y)) return "alias";
    let S = appendJavaKeystoreCert(smallFileWithMeta_3.bytes, y, p);
    try {
      let x = await writeIfMissing(javaHook.cacerts, S, smallFileWithMeta_3.mode);
      try {
        let b = await lstat(x);
        if (b.uid !== smallFileWithMeta_3.uid || b.gid !== smallFileWithMeta_3.gid) {
          await unlink(x);
          return "store";
        }
        await chmod(x, smallFileWithMeta_3.mode);
        await rename(x, javaHook.cacerts);
      } catch (error) {
        await unlink(x).catch(() => {});
        throw error;
      }
    } catch {
      return "write";
    }
    await mkdir(javaHook.stateDir, {
      recursive: true,
    }).catch(() => {});
    return "added";
  } catch {
    return "error";
  }
}
//@ chunk-awy329vy.js:37424-37939 placement
/**
 * 解析 Java KeyStore（JKS）字节：校验魔数与版本，逐个读取受信证书条目的别名（类型须为 X.509），最后校验整体 SHA-1 摘要；格式不符返回 undefined。
 */
function parseJavaKeystoreAliases(buffer) {
  let e = [];
  let textDecoder = new TextDecoder("utf-8", {
    fatal: true,
    ignoreBOM: true,
  });
  try {
    if (buffer.readUInt32BE(0) !== JKS_MAGIC || buffer.readUInt32BE(4) !== JKS_VERSION_MAGIC) return;
    let offset = 12;
    for (let uInt32BE = buffer.readUInt32BE(8); uInt32BE > 0; uInt32BE--) {
      if (buffer.readUInt32BE(offset) !== JKS_ENTRY_TAG) return;
      offset += 4;
      let h = offset + 2 + buffer.readUInt16BE(offset);
      let chunk = buffer.subarray(offset + 2, h);
      if (chunk.some((p) => p === 0 || p >= 240)) return;
      e.push(textDecoder.decode(chunk));
      offset = h + 8;
      let u = offset + 2 + buffer.readUInt16BE(offset);
      if (buffer.toString("utf8", offset + 2, u) !== X_509) return;
      offset = u + 4 + buffer.readUInt32BE(u);
    }
    if (
      offset + JKS_TRAILER_BYTES !== buffer.length ||
      !javaKeystoreDigest(buffer.subarray(0, offset)).equals(buffer.subarray(offset))
    )
      return;
  } catch {
    return;
  }
  return e;
}
//@ chunk-awy329vy.js:37939-38336 placement
/**
 * 向 JKS 字节追加一个受信证书条目（别名、时间戳、X.509 证书），更新条目数并重新计算末尾摘要。
 */
function appendJavaKeystoreCert(bytes, e, r) {
  let o = Buffer.alloc(6 + e.length + 8 + 2 + X_509.length + 4);
  let s = o.writeUInt32BE(JKS_ENTRY_TAG, 0);
  s = o.writeUInt16BE(e.length, s);
  s += o.write(e, s, "latin1");
  s = o.writeBigUInt64BE(BigInt(Date.now()), s);
  s = o.writeUInt16BE(X_509.length, s);
  s += o.write(X_509, s, "latin1");
  o.writeUInt32BE(r.length, s);
  let buffer = Buffer.concat([bytes.subarray(0, bytes.length - JKS_TRAILER_BYTES), o, r]);
  buffer.writeUInt32BE(bytes.readUInt32BE(8) + 1, 8);
  return Buffer.concat([buffer, javaKeystoreDigest(buffer)]);
}
//@ chunk-awy329vy.js:38336-38465 placement
function javaKeystoreDigest(n) {
  return createHash("sha1")
    .update(Buffer.from(CHANGEIT, "utf16le").swap16())
    .update("Mighty Aphrodite", "utf8")
    .update(n)
    .digest();
}
//@ chunk-awy329vy.js:38465-38544 placement
/**
 * 异步判断路径是否存在（ENOENT 返回 false，其他错误抛出）。
 */
async function pathExistsAsync(n) {
  return lstat(n).then(
    () => true,
    (error) => {
      if (isENOENT(error)) return false;
      throw error;
    },
  );
}
//@ chunk-awy329vy.js:38544-38797 placement
async function readSmallFileWithMeta(n, e) {
  let r;
  try {
    r = await open(n, constants.O_RDONLY | platformNoFollowFlags());
    let stats = await r.stat();
    if (!stats.isFile() || stats.size > e) return;
    return {
      bytes: await r.readFile(),
      mode: stats.mode & 511,
      nlink: stats.nlink,
      uid: stats.uid,
      gid: stats.gid,
    };
  } catch {
    return;
  } finally {
    await r?.close().catch(() => {});
  }
}
//@ chunk-awy329vy.js:38797-39477 placement
/**
 * Debian 系系统 CA 证书相关路径：更新脚本、配置文件、证书目录与证书包等。
 */
var DEBIAN_CA_PATHS = {
  script: "update-ca-certificates",
  conf: "/etc/ca-certificates.conf",
  distCertsDir: "/usr/share/ca-certificates",
  localCertsDir: "/usr/local/share/ca-certificates",
  certsDir: "/etc/ssl/certs",
  bundle: "/etc/ssl/certs/ca-certificates.crt",
  hooksDir: "/etc/ca-certificates/update.d",
  restorecon: "/sbin/restorecon",
  rehash: ["openssl", "rehash", "."],
  listHooks: ["run-parts", "--test", "--", "/etc/ca-certificates/update.d"],
  javaHook: JAVA_CA_HOOK_PATHS,
};
var UPDATE_CA_CERTIFICATES_MARKERS = [
  "CERTSCONF=/etc/ca-certificates.conf",
  "CERTSDIR=/usr/share/ca-certificates",
  "LOCALCERTSDIR=/usr/local/share/ca-certificates",
  "ETCCERTSDIR=/etc/ssl/certs",
  "HOOKSDIR=/etc/ca-certificates/update.d",
];
var MAX_UPDATE_SCRIPT_BYTES = 65536;
var MAX_CA_CONF_BYTES = 262144;
var MAX_CERT_FILE_BYTES = 1048576;
var MAX_CA_BUNDLE_BYTES = 4194304;
var MAX_COMMAND_OUTPUT_BYTES = 1048576;
var MAX_LOGGED_OUTPUT_CHARS = 2048;
//@ chunk-awy329vy.js:39477-41785 placement
async function installSystemCaDirect(n, e) {
  let { anchorPath, link, layout, recordPath, timeoutMs } = e;
  let buffer = Buffer.from(n, "utf8");
  let p;
  try {
    p = await runUpdateCaCertificates(anchorPath, link, buffer, layout);
  } catch (error) {
    p = {
      reason: "layout",
      detail: errorMessage(error),
    };
  }
  if ("reason" in p) {
    logForDebugging(
      `[agent-proxy] direct CA install not attempted (${p.reason}: ${p.detail}); using ${layout.script}`,
    );
    return {
      outcome: "not_attempted",
      reason: p.reason,
    };
  }
  await unlink(recordPath).catch(() => {});
  let y;
  try {
    y = await open(anchorPath, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL, 420);
    await y.writeFile(buffer);
    await y.chmod(420);
    await y.close();
  } catch (error) {
    if (y) {
      await y.close().catch(() => {});
      await unlink(anchorPath).catch(() => {});
    }
    logForDebugging(
      `[agent-proxy] direct CA install not attempted (anchor: ${errorMessage(error)}); using ${layout.script}`,
    );
    return {
      outcome: "not_attempted",
      reason: "anchor_create",
    };
  }
  let w = false;
  let T = async (E, A) => {
    logForDebugging(
      `[agent-proxy] direct CA install abandoned at ${E} (${A}); running ${layout.script} instead`,
      {
        level: "warn",
      },
    );
    if (w) await unlink(link).catch(() => {});
    return {
      outcome: "abandoned",
      step: E,
    };
  };
  try {
    let E = await writeIfMissing(layout.bundle, p.bundle);
    try {
      await chmod(E, 420);
      await rename(E, layout.bundle);
    } catch (error) {
      await unlink(E).catch(() => {});
      throw error;
    }
  } catch (error) {
    return await T("bundle", errorMessage(error));
  }
  try {
    await symlink(anchorPath, link);
    w = true;
  } catch (error) {
    return await T("link", errorMessage(error));
  }
  let S = Date.now() + timeoutMs;
  let x = (E, A) =>
    execFileNoThrow(E[0], E.slice(1), {
      timeout: Math.max(1, S - Date.now()),
      cwd: layout.certsDir,
      ...(A === undefined
        ? {
            stdin: "ignore",
          }
        : {
            input: A,
          }),
      maxBuffer: MAX_COMMAND_OUTPUT_BYTES,
      preserveOutputOnError: true,
    });
  let b = await x(layout.rehash);
  logToolOutput("openssl rehash", b);
  if (b.exitCode !== 0) return await T("rehash", describeExecOutcome(b));
  let C = [];
  if (
    (
      await stat(layout.hooksDir).catch(() => {
        return;
      })
    )?.isDirectory()
  ) {
    let E = await x(layout.listHooks);
    if (E.exitCode !== 0) {
      logToolOutput("run-parts", E);
      return await T("hooks", describeExecOutcome(E));
    }
    C = E.stdout
      .split(
        `
`,
      )
      .filter((line) => line.length > 0);
  }
  let P;
  for (let E of C) {
    if (E === layout.javaHook?.hook) {
      P = await installJavaStoreDirect(n, link, layout.javaHook);
      logForDebugging(
        P === "added"
          ? `[agent-proxy] direct CA install: CA added to ${layout.javaHook.cacerts} without running ${E}`
          : `[agent-proxy] direct CA install: running ${E}, not adding to the Java store directly (${P})`,
      );
      if (P === "added") continue;
    }
    let A = await x(
      [E],
      `+${link}
`,
    );
    logToolOutput(E, A);
    if (A.exitCode === undefined) {
      logForDebugging(
        `[agent-proxy] direct CA install: hook ${E} gave no exit status (${describeExecOutcome(A)}); not recording the install, so the next start redoes it`,
        {
          level: "warn",
        },
      );
      return {
        outcome: "hook_incomplete",
      };
    }
    if (A.exitCode !== 0)
      logForDebugging(
        `[agent-proxy] direct CA install: hook ${E} exit status ${A.exitCode} ignored, as ${layout.script} ignores it`,
      );
  }
  return {
    outcome: "installed",
    ...(P && {
      javaStore: P,
    }),
  };
}
//@ chunk-awy329vy.js:41785-43516 placement
async function runUpdateCaCertificates(anchorPath, link, r, layout) {
  let s = layout.script.includes("/") ? layout.script : await whichAsync(layout.script);
  let h = s ? await readFileSyncCached(s, MAX_UPDATE_SCRIPT_BYTES) : undefined;
  if (
    h === undefined ||
    !h.subarray(0, 9).equals(Buffer.from("#!/bin/sh")) ||
    !UPDATE_CA_CERTIFICATES_MARKERS.every((b) => h.includes(b))
  )
    return {
      reason: "script",
      detail: s ?? layout.script,
    };
  let fileSync = await readFileSyncCached(layout.conf, MAX_CA_CONF_BYTES);
  if (fileSync === undefined || fileSync.length === 0)
    return {
      reason: "conf",
      detail: layout.conf,
    };
  for (let b of [layout.certsDir, layout.localCertsDir, layout.distCertsDir])
    if (
      !(
        await lstat(b).catch(() => {
          return;
        })
      )?.isDirectory()
    )
      return {
        reason: "layout",
        detail: b,
      };
  if (
    !(
      await lstat(layout.bundle).catch(() => {
        return;
      })
    )?.isFile()
  )
    return {
      reason: "layout",
      detail: layout.bundle,
    };
  if (await pathExistsOrThrow(layout.restorecon))
    return {
      reason: "layout",
      detail: layout.restorecon,
    };
  for (let b of [anchorPath, link])
    if (await pathExistsOrThrow(b))
      return {
        reason: "anchor_present",
        detail: `${b} exists`,
      };
  let u = [];
  let p = (detail) => ({
    reason: "unsynced",
    detail,
  });
  for (let line of fileSync.toString("utf8").split(`
`)) {
    if (line === "" || line.startsWith("#")) continue;
    if (line.startsWith("!")) {
      let P = join(layout.certsDir, `${basename(line.slice(1), ".crt")}.pem`);
      if (
        (
          await lstat(P).catch(() => {
            return;
          })
        )?.isSymbolicLink()
      )
        return p(`${P} still linked`);
      continue;
    }
    let detail = join(layout.distCertsDir, line);
    if (
      !(
        await stat(detail).catch(() => {
          return;
        })
      )?.isFile()
    )
      continue;
    let linkedSystemCert = await readLinkedSystemCert(detail, layout);
    if (linkedSystemCert === undefined) return p(detail);
    u.push(linkedSystemCert);
  }
  let y = basename(anchorPath);
  let w = [y];
  for (let b of await readdir(layout.localCertsDir, {
    withFileTypes: true,
  })) {
    let C = await stat(join(layout.localCertsDir, b.name));
    if (C.isDirectory()) return p(`${b.name} is a directory`);
    if (C.isFile() && b.name.endsWith(".crt")) w.push(b.name);
  }
  w.sort();
  let trailingNewline = ensureTrailingNewline(r);
  for (let b of w) {
    if (b === y) {
      u.push(trailingNewline);
      continue;
    }
    let detail = join(layout.localCertsDir, b);
    let linkedSystemCert = await readLinkedSystemCert(detail, layout);
    if (linkedSystemCert === undefined) return p(detail);
    u.push(linkedSystemCert);
  }
  let fileSync_2 = await readFileSyncCached(layout.bundle, MAX_CA_BUNDLE_BYTES);
  let buffer = Buffer.concat(u.filter((b) => b !== trailingNewline));
  if (fileSync_2 === undefined || !fileSync_2.equals(buffer))
    return p("bundle differs from what the script would build");
  return {
    bundle: Buffer.concat(u),
  };
}
//@ chunk-awy329vy.js:43516-43720 placement
async function readLinkedSystemCert(n, e) {
  let r = basename(n, ".crt").replace(/ /g, "_").replace(/[()]/g, "=").replace(/,/g, "_") + ".pem";
  if (
    (await readlink(join(e.certsDir, r)).catch(() => {
      return;
    })) !== n
  )
    return;
  let fileSync = await readFileSyncCached(n, MAX_CERT_FILE_BYTES);
  return fileSync && ensureTrailingNewline(fileSync);
}
//@ chunk-awy329vy.js:43720-43808 placement
/**
 * 内容末尾没有换行时补一个换行。
 */
function ensureTrailingNewline(n) {
  return n.length === 0 || n.at(-1) === 10
    ? n
    : Buffer.concat([
        n,
        Buffer.from(`
`),
      ]);
}
//@ chunk-awy329vy.js:43808-43887 placement
/**
 * 异步判断路径是否存在（仅把 ENOENT 视为不存在）。
 */
async function pathExistsOrThrow(n) {
  return lstat(n).then(
    () => true,
    (error) => {
      if (isENOENT(error)) return false;
      throw error;
    },
  );
}
export { DEBIAN_CA_PATHS, installSystemCaDirect, MAX_LOGGED_OUTPUT_CHARS };
