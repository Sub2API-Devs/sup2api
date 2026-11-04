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
async function installJavaStoreDirect(javaVersion, link, javaHook) {
  try {
    if (env.CCR_AGENT_PROXY_JAVA_STORE_DIRECT_DISABLED) return "disabled";
    for (let hookPart of ["hook", "postinst", "jar"]) {
      let smallFileWithMeta = await readSmallFileWithMeta(javaHook[hookPart], MAX_JAVA_CA_FILE_LINES);
      if (
        smallFileWithMeta === undefined ||
        !javaHook.knownSha256[hookPart].includes(
          createHash("sha256").update(smallFileWithMeta.bytes).digest("hex"),
        )
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
    for (let marker of DPKG_UNFINISHED_MARKERS)
      if (await pathExistsAsync(join(javaHook.stateDir, marker))) return "unfinished";
    let smallFileWithMeta_2 = await readSmallFileWithMeta(javaHook.dpkgStatus, JAVA_CA_POSTINST_MAX_LINES);
    let triggersFile = (await pathExistsAsync(javaHook.dpkgUnincorporatedTriggers))
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
      triggersFile?.bytes.length !== 0 ||
      (await readdir(javaHook.dpkgUpdates)).length !== 0
    )
      return "unfinished";
    if ((await whichAsync("java")) === null) return "no_java";
    let versionMatch = javaVersion.startsWith("0") ? null : JAVA_VERSION_RE.exec(javaVersion);
    let certDer;
    try {
      certDer = new X509Certificate(versionMatch?.[1] === "CERTIFICATE" ? versionMatch[0] : "").raw;
    } catch {
      return "certificate";
    }
    let alias = `debian:${basename(link)}`;
    if (!/^[\x21-\x40\x5b-\x7e]+$/.test(alias)) return "alias";
    let smallFileWithMeta_3 = await readSmallFileWithMeta(javaHook.cacerts, JAVA_CA_CACERTS_MAX_LINES);
    let aliases = smallFileWithMeta_3 && parseJavaKeystoreAliases(smallFileWithMeta_3.bytes);
    if (smallFileWithMeta_3 === undefined || aliases === undefined || smallFileWithMeta_3.nlink !== 1)
      return "store";
    if (aliases.includes(alias)) return "alias";
    let newStore = appendJavaKeystoreCert(smallFileWithMeta_3.bytes, alias, certDer);
    try {
      let tempPath = await writeIfMissing(javaHook.cacerts, newStore, smallFileWithMeta_3.mode);
      try {
        let tempStats = await lstat(tempPath);
        if (tempStats.uid !== smallFileWithMeta_3.uid || tempStats.gid !== smallFileWithMeta_3.gid) {
          await unlink(tempPath);
          return "store";
        }
        await chmod(tempPath, smallFileWithMeta_3.mode);
        await rename(tempPath, javaHook.cacerts);
      } catch (error) {
        await unlink(tempPath).catch(() => {});
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
  let aliases = [];
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
      let aliasEnd = offset + 2 + buffer.readUInt16BE(offset);
      let chunk = buffer.subarray(offset + 2, aliasEnd);
      if (chunk.some((byte) => byte === 0 || byte >= 240)) return;
      aliases.push(textDecoder.decode(chunk));
      offset = aliasEnd + 8;
      let typeEnd = offset + 2 + buffer.readUInt16BE(offset);
      if (buffer.toString("utf8", offset + 2, typeEnd) !== X_509) return;
      offset = typeEnd + 4 + buffer.readUInt32BE(typeEnd);
    }
    if (
      offset + JKS_TRAILER_BYTES !== buffer.length ||
      !javaKeystoreDigest(buffer.subarray(0, offset)).equals(buffer.subarray(offset))
    )
      return;
  } catch {
    return;
  }
  return aliases;
}
//@ chunk-awy329vy.js:37939-38336 placement
/**
 * 向 JKS 字节追加一个受信证书条目（别名、时间戳、X.509 证书），更新条目数并重新计算末尾摘要。
 */
function appendJavaKeystoreCert(bytes, alias, digest) {
  let entry = Buffer.alloc(6 + alias.length + 8 + 2 + X_509.length + 4);
  let writeOffset = entry.writeUInt32BE(JKS_ENTRY_TAG, 0);
  writeOffset = entry.writeUInt16BE(alias.length, writeOffset);
  writeOffset += entry.write(alias, writeOffset, "latin1");
  writeOffset = entry.writeBigUInt64BE(BigInt(Date.now()), writeOffset);
  writeOffset = entry.writeUInt16BE(X_509.length, writeOffset);
  writeOffset += entry.write(X_509, writeOffset, "latin1");
  entry.writeUInt32BE(digest.length, writeOffset);
  let buffer = Buffer.concat([bytes.subarray(0, bytes.length - JKS_TRAILER_BYTES), entry, digest]);
  buffer.writeUInt32BE(bytes.readUInt32BE(8) + 1, 8);
  return Buffer.concat([buffer, javaKeystoreDigest(buffer)]);
}
//@ chunk-awy329vy.js:38336-38465 placement
function javaKeystoreDigest(keystore) {
  return createHash("sha1")
    .update(Buffer.from(CHANGEIT, "utf16le").swap16())
    .update("Mighty Aphrodite", "utf8")
    .update(keystore)
    .digest();
}
//@ chunk-awy329vy.js:38465-38544 placement
/**
 * 异步判断路径是否存在（ENOENT 返回 false，其他错误抛出）。
 */
async function pathExistsAsync(filePath) {
  return lstat(filePath).then(
    () => true,
    (error) => {
      if (isENOENT(error)) return false;
      throw error;
    },
  );
}
//@ chunk-awy329vy.js:38544-38797 placement
async function readSmallFileWithMeta(filePath, maxBytes) {
  let handle;
  try {
    handle = await open(filePath, constants.O_RDONLY | platformNoFollowFlags());
    let stats = await handle.stat();
    if (!stats.isFile() || stats.size > maxBytes) return;
    return {
      bytes: await handle.readFile(),
      mode: stats.mode & 511,
      nlink: stats.nlink,
      uid: stats.uid,
      gid: stats.gid,
    };
  } catch {
    return;
  } finally {
    await handle?.close().catch(() => {});
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
async function installSystemCaDirect(pemText, options) {
  let { anchorPath, link, layout, recordPath, timeoutMs } = options;
  let buffer = Buffer.from(pemText, "utf8");
  let updateResult;
  try {
    updateResult = await runUpdateCaCertificates(anchorPath, link, buffer, layout);
  } catch (error) {
    updateResult = {
      reason: "layout",
      detail: errorMessage(error),
    };
  }
  if ("reason" in updateResult) {
    logForDebugging(
      `[agent-proxy] direct CA install not attempted (${updateResult.reason}: ${updateResult.detail}); using ${layout.script}`,
    );
    return {
      outcome: "not_attempted",
      reason: updateResult.reason,
    };
  }
  await unlink(recordPath).catch(() => {});
  let anchorHandle;
  try {
    anchorHandle = await open(anchorPath, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL, 420);
    await anchorHandle.writeFile(buffer);
    await anchorHandle.chmod(420);
    await anchorHandle.close();
  } catch (error) {
    if (anchorHandle) {
      await anchorHandle.close().catch(() => {});
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
  let linkMade = false;
  let abandon = async (step, detail) => {
    logForDebugging(
      `[agent-proxy] direct CA install abandoned at ${step} (${detail}); running ${layout.script} instead`,
      {
        level: "warn",
      },
    );
    if (linkMade) await unlink(link).catch(() => {});
    return {
      outcome: "abandoned",
      step,
    };
  };
  try {
    let tempBundle = await writeIfMissing(layout.bundle, updateResult.bundle);
    try {
      await chmod(tempBundle, 420);
      await rename(tempBundle, layout.bundle);
    } catch (error) {
      await unlink(tempBundle).catch(() => {});
      throw error;
    }
  } catch (error) {
    return await abandon("bundle", errorMessage(error));
  }
  try {
    await symlink(anchorPath, link);
    linkMade = true;
  } catch (error) {
    return await abandon("link", errorMessage(error));
  }
  let deadlineMs = Date.now() + timeoutMs;
  let runScript = (argv, stdinData) =>
    execFileNoThrow(argv[0], argv.slice(1), {
      timeout: Math.max(1, deadlineMs - Date.now()),
      cwd: layout.certsDir,
      ...(stdinData === undefined
        ? {
            stdin: "ignore",
          }
        : {
            input: stdinData,
          }),
      maxBuffer: MAX_COMMAND_OUTPUT_BYTES,
      preserveOutputOnError: true,
    });
  let rehashResult = await runScript(layout.rehash);
  logToolOutput("openssl rehash", rehashResult);
  if (rehashResult.exitCode !== 0) return await abandon("rehash", describeExecOutcome(rehashResult));
  let fragments = [];
  if (
    (
      await stat(layout.hooksDir).catch(() => {
        return;
      })
    )?.isDirectory()
  ) {
    let hookListResult = await runScript(layout.listHooks);
    if (hookListResult.exitCode !== 0) {
      logToolOutput("run-parts", hookListResult);
      return await abandon("hooks", describeExecOutcome(hookListResult));
    }
    fragments = hookListResult.stdout
      .split(
        `
`,
      )
      .filter((line) => line.length > 0);
  }
  let bundleBytes;
  for (let hookPath of fragments) {
    if (hookPath === layout.javaHook?.hook) {
      bundleBytes = await installJavaStoreDirect(pemText, link, layout.javaHook);
      logForDebugging(
        bundleBytes === "added"
          ? `[agent-proxy] direct CA install: CA added to ${layout.javaHook.cacerts} without running ${hookPath}`
          : `[agent-proxy] direct CA install: running ${hookPath}, not adding to the Java store directly (${bundleBytes})`,
      );
      if (bundleBytes === "added") continue;
    }
    let hookResult = await runScript(
      [hookPath],
      `+${link}
`,
    );
    logToolOutput(hookPath, hookResult);
    if (hookResult.exitCode === undefined) {
      logForDebugging(
        `[agent-proxy] direct CA install: hook ${hookPath} gave no exit status (${describeExecOutcome(hookResult)}); not recording the install, so the next start redoes it`,
        {
          level: "warn",
        },
      );
      return {
        outcome: "hook_incomplete",
      };
    }
    if (hookResult.exitCode !== 0)
      logForDebugging(
        `[agent-proxy] direct CA install: hook ${hookPath} exit status ${hookResult.exitCode} ignored, as ${layout.script} ignores it`,
      );
  }
  return {
    outcome: "installed",
    ...(bundleBytes && {
      javaStore: bundleBytes,
    }),
  };
}
//@ chunk-awy329vy.js:41785-43516 placement
async function runUpdateCaCertificates(anchorPath, link, pemText, layout) {
  let scriptPath = layout.script.includes("/") ? layout.script : await whichAsync(layout.script);
  let scriptBytes = scriptPath ? await readFileSyncCached(scriptPath, MAX_UPDATE_SCRIPT_BYTES) : undefined;
  if (
    scriptBytes === undefined ||
    !scriptBytes.subarray(0, 9).equals(Buffer.from("#!/bin/sh")) ||
    !UPDATE_CA_CERTIFICATES_MARKERS.every((marker) => scriptBytes.includes(marker))
  )
    return {
      reason: "script",
      detail: scriptPath ?? layout.script,
    };
  let fileSync = await readFileSyncCached(layout.conf, MAX_CA_CONF_BYTES);
  if (fileSync === undefined || fileSync.length === 0)
    return {
      reason: "conf",
      detail: layout.conf,
    };
  for (let dirPath of [layout.certsDir, layout.localCertsDir, layout.distCertsDir])
    if (
      !(
        await lstat(dirPath).catch(() => {
          return;
        })
      )?.isDirectory()
    )
      return {
        reason: "layout",
        detail: dirPath,
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
  for (let targetPath of [anchorPath, link])
    if (await pathExistsOrThrow(targetPath))
      return {
        reason: "anchor_present",
        detail: `${targetPath} exists`,
      };
  let parts = [];
  let unsynced = (detail) => ({
    reason: "unsynced",
    detail,
  });
  for (let line of fileSync.toString("utf8").split(`
`)) {
    if (line === "" || line.startsWith("#")) continue;
    if (line.startsWith("!")) {
      let localPemPath = join(layout.certsDir, `${basename(line.slice(1), ".crt")}.pem`);
      if (
        (
          await lstat(localPemPath).catch(() => {
            return;
          })
        )?.isSymbolicLink()
      )
        return unsynced(`${localPemPath} still linked`);
      continue;
    }
    let distCertPath = join(layout.distCertsDir, line);
    if (
      !(
        await stat(distCertPath).catch(() => {
          return;
        })
      )?.isFile()
    )
      continue;
    let linkedSystemCert = await readLinkedSystemCert(distCertPath, layout);
    if (linkedSystemCert === undefined) return unsynced(distCertPath);
    parts.push(linkedSystemCert);
  }
  let anchorName = basename(anchorPath);
  let orderedNames = [anchorName];
  for (let entry of await readdir(layout.localCertsDir, {
    withFileTypes: true,
  })) {
    let entryStats = await stat(join(layout.localCertsDir, entry.name));
    if (entryStats.isDirectory()) return unsynced(`${entry.name} is a directory`);
    if (entryStats.isFile() && entry.name.endsWith(".crt")) orderedNames.push(entry.name);
  }
  orderedNames.sort();
  let trailingNewline = ensureTrailingNewline(pemText);
  for (let crtName of orderedNames) {
    if (crtName === anchorName) {
      parts.push(trailingNewline);
      continue;
    }
    let localCertPath = join(layout.localCertsDir, crtName);
    let linkedSystemCert = await readLinkedSystemCert(localCertPath, layout);
    if (linkedSystemCert === undefined) return unsynced(localCertPath);
    parts.push(linkedSystemCert);
  }
  let fileSync_2 = await readFileSyncCached(layout.bundle, MAX_CA_BUNDLE_BYTES);
  let buffer = Buffer.concat(parts.filter((part) => part !== trailingNewline));
  if (fileSync_2 === undefined || !fileSync_2.equals(buffer))
    return unsynced("bundle differs from what the script would build");
  return {
    bundle: Buffer.concat(parts),
  };
}
//@ chunk-awy329vy.js:43516-43720 placement
async function readLinkedSystemCert(certPath, layout) {
  let linkName =
    basename(certPath, ".crt").replace(/ /g, "_").replace(/[()]/g, "=").replace(/,/g, "_") + ".pem";
  if (
    (await readlink(join(layout.certsDir, linkName)).catch(() => {
      return;
    })) !== certPath
  )
    return;
  let bytes = await readFileSyncCached(certPath, MAX_CERT_FILE_BYTES);
  return bytes && ensureTrailingNewline(bytes);
}
//@ chunk-awy329vy.js:43720-43808 placement
/**
 * 内容末尾没有换行时补一个换行。
 */
function ensureTrailingNewline(bytes) {
  return bytes.length === 0 || bytes.at(-1) === 10
    ? bytes
    : Buffer.concat([
        bytes,
        Buffer.from(`
`),
      ]);
}
//@ chunk-awy329vy.js:43808-43887 placement
/**
 * 异步判断路径是否存在（仅把 ENOENT 视为不存在）。
 */
async function pathExistsOrThrow(filePath) {
  return lstat(filePath).then(
    () => true,
    (error) => {
      if (isENOENT(error)) return false;
      throw error;
    },
  );
}
export { DEBIAN_CA_PATHS, installSystemCaDirect, MAX_LOGGED_OUTPUT_CHARS };
