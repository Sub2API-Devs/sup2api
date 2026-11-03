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
import {
  createHash,
  createHash as createHash_2,
  createHash as createHash_3,
  X509Certificate,
  X509Certificate as X509Certificate_2,
  X509Certificate as X509Certificate_3,
  X509Certificate as X509Certificate_4,
} from "crypto";
import {
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  basename,
  basename as basename_2,
  basename as basename_3,
} from "path";
import {
  readdir,
  readdir as readdir_2,
  readdir as readdir_3,
  readdir as readdir_4,
  lstat,
  lstat as lstat_2,
  unlink,
  unlink as unlink_2,
  unlink as unlink_3,
  unlink as unlink_4,
  chmod,
  chmod as chmod_2,
  rename,
  rename as rename_2,
  rename as rename_3,
  mkdir,
  mkdir as mkdir_2,
  mkdir as mkdir_3,
  open,
  open as open_2,
  open as open_3,
  open as open_4,
  open as open_5,
  symlink,
  stat,
  stat as stat_2,
  stat as stat_3,
  readlink,
  readlink as readlink_2,
} from "fs/promises";
import { constants, constants as constants_2, constants as constants_3 } from "fs";
import { env } from "../utils/env.js";
import { whichAsync } from "../utils/which.js";
import { writeIfMissing } from "../utils/atomicPublishWrite.js";
import { isENOENT, errorMessage } from "../utils/errors.js";
import { zq } from "../utils/platformTargets.js";
import { logForDebugging } from "../utils/debug.js";
import { execFileNoThrow } from "../utils/execFileNoThrow.js";
import { logToolOutput, describeExecOutcome } from "./toolTrust.js";
import { readFileSyncCached } from "../utils/file.js";

//@ chunk-awy329vy.js:34747-35690 placement
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
  },
  CHANGEIT = "changeit",
  Uo = ["pending", "fresh", "convert_pkcs12_keystore_to_jks"],
  yn = 262144,
  Wo = 33554432,
  jo = 4194304,
  Yo = 4277010157,
  Xo = 2,
  Sn = 2,
  X_509 = "X.509",
  Cn = 20,
  Jo = /^-----(?:BEGIN ([^-\n]*)-----[\s\S]*?^-----END \1-----)?/m;
//@ chunk-awy329vy.js:35690-37424 placement
async function installJavaStoreDirect(n, e, r) {
  try {
    if (env.CCR_AGENT_PROXY_JAVA_STORE_DIRECT_DISABLED) return "disabled";
    for (let x of ["hook", "postinst", "jar"]) {
      let b = await readSmallFileWithMeta(r[x], yn);
      if (b === void 0 || !r.knownSha256[x].includes(createHash_2("sha256").update(b.bytes).digest("hex")))
        return "package";
    }
    if (
      (await readSmallFileWithMeta(r.dpkgTriggerInterest, 1024))?.bytes.toString("latin1") !==
      `ca-certificates-java
`
    )
      return "package";
    let s = await readSmallFileWithMeta(r.defaults, yn);
    if (
      s === void 0 ||
      env.CACERT_UPDATES === "disabled" ||
      (env.DPKG_MAINTSCRIPT_PACKAGE ?? "") !== "" ||
      env.DPKG_ADMINDIR !== void 0 ||
      env.DPKG_ROOT !== void 0 ||
      s.bytes
        .toString("latin1")
        .split(
          `
`,
        )
        .filter((x) => !/^[ \t]*(#.*)?$/.test(x)).join(`
`) !== "cacerts_updates=yes"
    )
      return "settings";
    for (let x of Uo) if (await _n(join_3(r.stateDir, x))) return "unfinished";
    let h = await readSmallFileWithMeta(r.dpkgStatus, Wo),
      l = (await _n(r.dpkgUnincorporatedTriggers))
        ? await readSmallFileWithMeta(r.dpkgUnincorporatedTriggers, 1)
        : { bytes: Buffer.alloc(0) };
    if (
      h === void 0 ||
      h.bytes.includes(`
Triggers-Pending:`) ||
      h.bytes.includes(`
Triggers-Awaited:`) ||
      l?.bytes.length !== 0 ||
      (await readdir_3(r.dpkgUpdates)).length !== 0
    )
      return "unfinished";
    if ((await whichAsync("java")) === null) return "no_java";
    let u = n.startsWith("0") ? null : Jo.exec(n),
      p;
    try {
      p = new X509Certificate_3(u?.[1] === "CERTIFICATE" ? u[0] : "").raw;
    } catch {
      return "certificate";
    }
    let y = `debian:${basename_2(e)}`;
    if (!/^[\x21-\x40\x5b-\x7e]+$/.test(y)) return "alias";
    let w = await readSmallFileWithMeta(r.cacerts, jo),
      T = w && parseJavaKeystoreAliases(w.bytes);
    if (w === void 0 || T === void 0 || w.nlink !== 1) return "store";
    if (T.includes(y)) return "alias";
    let S = appendJavaKeystoreCert(w.bytes, y, p);
    try {
      let x = await writeIfMissing(r.cacerts, S, w.mode);
      try {
        let b = await lstat_2(x);
        if (b.uid !== w.uid || b.gid !== w.gid) return (await unlink_3(x), "store");
        (await chmod_2(x, w.mode), await rename_2(x, r.cacerts));
      } catch (error) {
        throw (await unlink_3(x).catch(() => {}), error);
      }
    } catch {
      return "write";
    }
    return (await mkdir_2(r.stateDir, { recursive: !0 }).catch(() => {}), "added");
  } catch {
    return "error";
  }
}
/**
 * 解析 Java KeyStore（JKS）字节：校验魔数与版本，逐个读取受信证书条目的别名（类型须为 X.509），最后校验整体 SHA-1 摘要；格式不符返回 undefined。
 */
//@ chunk-awy329vy.js:37424-37939 placement
function parseJavaKeystoreAliases(buffer) {
  let e = [],
    textDecoder = new TextDecoder("utf-8", { fatal: !0, ignoreBOM: !0 });
  try {
    if (buffer.readUInt32BE(0) !== Yo || buffer.readUInt32BE(4) !== Xo) return;
    let offset = 12;
    for (let uInt32BE = buffer.readUInt32BE(8); uInt32BE > 0; uInt32BE--) {
      if (buffer.readUInt32BE(offset) !== Sn) return;
      offset += 4;
      let h = offset + 2 + buffer.readUInt16BE(offset),
        chunk = buffer.subarray(offset + 2, h);
      if (chunk.some((p) => p === 0 || p >= 240)) return;
      (e.push(textDecoder.decode(chunk)), (offset = h + 8));
      let u = offset + 2 + buffer.readUInt16BE(offset);
      if (buffer.toString("utf8", offset + 2, u) !== X_509) return;
      offset = u + 4 + buffer.readUInt32BE(u);
    }
    if (
      offset + Cn !== buffer.length ||
      !javaKeystoreDigest(buffer.subarray(0, offset)).equals(buffer.subarray(offset))
    )
      return;
  } catch {
    return;
  }
  return e;
}
/**
 * 向 JKS 字节追加一个受信证书条目（别名、时间戳、X.509 证书），更新条目数并重新计算末尾摘要。
 */
//@ chunk-awy329vy.js:37939-38336 placement
function appendJavaKeystoreCert(n, e, r) {
  let alloc = Buffer.alloc(6 + e.length + 8 + 2 + X_509.length + 4),
    writeUInt32BE = alloc.writeUInt32BE(Sn, 0);
  ((writeUInt32BE = alloc.writeUInt16BE(e.length, writeUInt32BE)),
    (writeUInt32BE += alloc.write(e, writeUInt32BE, "latin1")),
    (writeUInt32BE = alloc.writeBigUInt64BE(BigInt(Date.now()), writeUInt32BE)),
    (writeUInt32BE = alloc.writeUInt16BE(X_509.length, writeUInt32BE)),
    (writeUInt32BE += alloc.write(X_509, writeUInt32BE, "latin1")),
    alloc.writeUInt32BE(r.length, writeUInt32BE));
  let buffer = Buffer.concat([n.subarray(0, n.length - Cn), alloc, r]);
  return (
    buffer.writeUInt32BE(n.readUInt32BE(8) + 1, 8),
    Buffer.concat([buffer, javaKeystoreDigest(buffer)])
  );
}
//@ chunk-awy329vy.js:38336-38465 placement
function javaKeystoreDigest(n) {
  return createHash_2("sha1")
    .update(Buffer.from(CHANGEIT, "utf16le").swap16())
    .update("Mighty Aphrodite", "utf8")
    .update(n)
    .digest();
}
//@ chunk-awy329vy.js:38465-38544 placement
async function _n(n) {
  return lstat_2(n).then(
    () => !0,
    (e) => {
      if (isENOENT(e)) return !1;
      throw e;
    },
  );
}
//@ chunk-awy329vy.js:38544-38797 placement
async function readSmallFileWithMeta(n, e) {
  let r;
  try {
    r = await open_4(n, constants_3.O_RDONLY | zq());
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
/**
 * Debian 系系统 CA 证书相关路径：更新脚本、配置文件、证书目录与证书包等。
 */
//@ chunk-awy329vy.js:38797-39477 placement
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
  },
  UPDATE_CA_CERTIFICATES_MARKERS = [
    "CERTSCONF=/etc/ca-certificates.conf",
    "CERTSDIR=/usr/share/ca-certificates",
    "LOCALCERTSDIR=/usr/local/share/ca-certificates",
    "ETCCERTSDIR=/etc/ssl/certs",
    "HOOKSDIR=/etc/ca-certificates/update.d",
  ],
  MAX_UPDATE_SCRIPT_BYTES = 65536,
  MAX_CA_CONF_BYTES = 262144,
  MAX_CERT_FILE_BYTES = 1048576,
  MAX_CA_BUNDLE_BYTES = 4194304,
  MAX_COMMAND_OUTPUT_BYTES = 1048576,
  MAX_LOGGED_OUTPUT_CHARS = 2048;
//@ chunk-awy329vy.js:39477-41785 placement
async function installSystemCaDirect(n, e) {
  let {
      anchorPath: anchorPath,
      link: link,
      layout: layout,
      recordPath: recordPath,
      timeoutMs: timeoutMs,
    } = e,
    buffer = Buffer.from(n, "utf8"),
    p;
  try {
    p = await runUpdateCaCertificates(anchorPath, link, buffer, layout);
  } catch (error) {
    p = { reason: "layout", detail: errorMessage(error) };
  }
  if ("reason" in p)
    return (
      logForDebugging(
        `[agent-proxy] direct CA install not attempted (${p.reason}: ${p.detail}); using ${layout.script}`,
      ),
      { outcome: "not_attempted", reason: p.reason }
    );
  await unlink_2(recordPath).catch(() => {});
  let y;
  try {
    ((y = await open_3(anchorPath, constants_2.O_WRONLY | constants_2.O_CREAT | constants_2.O_EXCL, 420)),
      await y.writeFile(buffer),
      await y.chmod(420),
      await y.close());
  } catch (error) {
    if (y) (await y.close().catch(() => {}), await unlink_2(anchorPath).catch(() => {}));
    return (
      logForDebugging(
        `[agent-proxy] direct CA install not attempted (anchor: ${errorMessage(error)}); using ${layout.script}`,
      ),
      { outcome: "not_attempted", reason: "anchor_create" }
    );
  }
  let w = !1,
    T = async (E, A) => {
      if (
        (logForDebugging(
          `[agent-proxy] direct CA install abandoned at ${E} (${A}); running ${layout.script} instead`,
          { level: "warn" },
        ),
        w)
      )
        await unlink_2(link).catch(() => {});
      return { outcome: "abandoned", step: E };
    };
  try {
    let E = await writeIfMissing(layout.bundle, p.bundle);
    try {
      (await chmod(E, 420), await rename(E, layout.bundle));
    } catch (error) {
      throw (await unlink_2(E).catch(() => {}), error);
    }
  } catch (error) {
    return await T("bundle", errorMessage(error));
  }
  try {
    (await symlink(anchorPath, link), (w = !0));
  } catch (error) {
    return await T("link", errorMessage(error));
  }
  let S = Date.now() + timeoutMs,
    x = (E, A) =>
      execFileNoThrow(E[0], E.slice(1), {
        timeout: Math.max(1, S - Date.now()),
        cwd: layout.certsDir,
        ...(A === void 0 ? { stdin: "ignore" } : { input: A }),
        maxBuffer: MAX_COMMAND_OUTPUT_BYTES,
        preserveOutputOnError: !0,
      }),
    b = await x(layout.rehash);
  if ((logToolOutput("openssl rehash", b), b.exitCode !== 0))
    return await T("rehash", describeExecOutcome(b));
  let C = [];
  if (
    (
      await stat_2(layout.hooksDir).catch(() => {
        return;
      })
    )?.isDirectory()
  ) {
    let E = await x(layout.listHooks);
    if (E.exitCode !== 0) return (logToolOutput("run-parts", E), await T("hooks", describeExecOutcome(E)));
    C = E.stdout
      .split(
        `
`,
      )
      .filter((A) => A.length > 0);
  }
  let P;
  for (let E of C) {
    if (E === layout.javaHook?.hook) {
      if (
        ((P = await installJavaStoreDirect(n, link, layout.javaHook)),
        logForDebugging(
          P === "added"
            ? `[agent-proxy] direct CA install: CA added to ${layout.javaHook.cacerts} without running ${E}`
            : `[agent-proxy] direct CA install: running ${E}, not adding to the Java store directly (${P})`,
        ),
        P === "added")
      )
        continue;
    }
    let A = await x(
      [E],
      `+${link}
`,
    );
    if ((logToolOutput(E, A), A.exitCode === void 0))
      return (
        logForDebugging(
          `[agent-proxy] direct CA install: hook ${E} gave no exit status (${describeExecOutcome(A)}); not recording the install, so the next start redoes it`,
          { level: "warn" },
        ),
        { outcome: "hook_incomplete" }
      );
    if (A.exitCode !== 0)
      logForDebugging(
        `[agent-proxy] direct CA install: hook ${E} exit status ${A.exitCode} ignored, as ${layout.script} ignores it`,
      );
  }
  return { outcome: "installed", ...(P && { javaStore: P }) };
}
//@ chunk-awy329vy.js:41785-43516 placement
async function runUpdateCaCertificates(n, e, r, o) {
  let s = o.script.includes("/") ? o.script : await whichAsync(o.script),
    h = s ? await readFileSyncCached(s, MAX_UPDATE_SCRIPT_BYTES) : void 0;
  if (
    h === void 0 ||
    !h.subarray(0, 9).equals(Buffer.from("#!/bin/sh")) ||
    !UPDATE_CA_CERTIFICATES_MARKERS.every((b) => h.includes(b))
  )
    return { reason: "script", detail: s ?? o.script };
  let l = await readFileSyncCached(o.conf, MAX_CA_CONF_BYTES);
  if (l === void 0 || l.length === 0) return { reason: "conf", detail: o.conf };
  for (let b of [o.certsDir, o.localCertsDir, o.distCertsDir])
    if (
      !(
        await lstat(b).catch(() => {
          return;
        })
      )?.isDirectory()
    )
      return { reason: "layout", detail: b };
  if (
    !(
      await lstat(o.bundle).catch(() => {
        return;
      })
    )?.isFile()
  )
    return { reason: "layout", detail: o.bundle };
  if (await vn(o.restorecon)) return { reason: "layout", detail: o.restorecon };
  for (let b of [n, e]) if (await vn(b)) return { reason: "anchor_present", detail: `${b} exists` };
  let u = [],
    p = (b) => ({ reason: "unsynced", detail: b });
  for (let b of l.toString("utf8").split(`
`)) {
    if (b === "" || b.startsWith("#")) continue;
    if (b.startsWith("!")) {
      let P = join_2(o.certsDir, `${basename(b.slice(1), ".crt")}.pem`);
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
    let C = join_2(o.distCertsDir, b);
    if (
      !(
        await stat_2(C).catch(() => {
          return;
        })
      )?.isFile()
    )
      continue;
    let v = await readLinkedSystemCert(C, o);
    if (v === void 0) return p(C);
    u.push(v);
  }
  let y = basename(n),
    w = [y];
  for (let b of await readdir_2(o.localCertsDir, { withFileTypes: !0 })) {
    let C = await stat_2(join_2(o.localCertsDir, b.name));
    if (C.isDirectory()) return p(`${b.name} is a directory`);
    if (C.isFile() && b.name.endsWith(".crt")) w.push(b.name);
  }
  w.sort();
  let T = Bn(r);
  for (let b of w) {
    if (b === y) {
      u.push(T);
      continue;
    }
    let C = join_2(o.localCertsDir, b),
      v = await readLinkedSystemCert(C, o);
    if (v === void 0) return p(C);
    u.push(v);
  }
  let S = await readFileSyncCached(o.bundle, MAX_CA_BUNDLE_BYTES),
    buffer = Buffer.concat(u.filter((b) => b !== T));
  if (S === void 0 || !S.equals(buffer)) return p("bundle differs from what the script would build");
  return { bundle: Buffer.concat(u) };
}
//@ chunk-awy329vy.js:43516-43720 placement
async function readLinkedSystemCert(n, e) {
  let r = basename(n, ".crt").replace(/ /g, "_").replace(/[()]/g, "=").replace(/,/g, "_") + ".pem";
  if (
    (await readlink_2(join_2(e.certsDir, r)).catch(() => {
      return;
    })) !== n
  )
    return;
  let s = await readFileSyncCached(n, MAX_CERT_FILE_BYTES);
  return s && Bn(s);
}
//@ chunk-awy329vy.js:43720-43808 placement
function Bn(n) {
  return n.length === 0 || n.at(-1) === 10
    ? n
    : Buffer.concat([
        n,
        Buffer.from(`
`),
      ]);
}
//@ chunk-awy329vy.js:43808-43887 placement
async function vn(n) {
  return lstat(n).then(
    () => !0,
    (e) => {
      if (isENOENT(e)) return !1;
      throw e;
    },
  );
}

export { DEBIAN_CA_PATHS, installSystemCaDirect, MAX_LOGGED_OUTPUT_CHARS };
