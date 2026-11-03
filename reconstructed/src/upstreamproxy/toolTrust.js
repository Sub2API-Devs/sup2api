/**
 * upstreamproxy/toolTrust.ts
 *
 * 2.1.316 新增。为 Java/NSS/Bazel 等工具配置 CA 信任。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-awy329vy.js (34)
 * attribution: placement 33, affinity 1
 */
import { createHash, X509Certificate } from "crypto";
import { join, dirname, basename } from "path";
import { mkdir, writeFile, realpath, open, unlink, readdir, rename, readFile, stat } from "fs/promises";
import { homedir } from "os";
import { MAX_LOGGED_OUTPUT_CHARS } from "./systemTrust.js";
import { logForDebugging } from "../utils/debug.js";
import {
  BLOCKED_ROOT_SHA256,
  BLOCKED_ROOT_SPKI_SHA256,
  LEAKED_CA_SPKI_SHA256,
  withoutBlockedCerts,
} from "../utils/caCerts.js";
import { errorMessage, isFsInaccessible, isENOENT, getErrnoCode } from "../utils/errors.js";
import { logFeatureBad, logFeatureOk, logFeatureSad } from "../services/analytics/featureTelemetry.js";
import { whichAsync } from "../utils/which.js";
import { env } from "../utils/env.js";
import { PEM_CERT_BLOCK_RE } from "../utils/mtls.js";
import { compareBundleWithFile, readCaBundleFile } from "./caBundle.js";
import { sleep } from "../utils/sleep.js";
import { getXDGDataHome } from "../utils/xdg.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { readOnlyNoFollowFlags } from "../utils/platformTargets.js";
import { readLinesReverse_2 } from "../utils/fsOperations.js";
import { subprocessEnv } from "../utils/subprocessEnv.js";
import { writeFileAtomic } from "../utils/atomicPublishWrite.js";
import {
  CA_CERT_ENV_VARS_2,
  CA_CERT_ENV_VARS,
  caCertEnvVarList,
} from "../utils/settings/managedSettingsKeys.js";
import { execFileNoThrow } from "../utils/execFileNoThrow.js";

//@ chunk-awy329vy.js:44083-44302 placement
/**
 * 描述外部命令的运行结果：退出码、超时仍在运行、输出超限，或未能运行（附错误）。
 */
function describeExecOutcome(n) {
  if (n.exitCode !== undefined) return `exit status ${n.exitCode}`;
  if (n.timedOut) return "still running at the deadline";
  if (n.maxBufferExceeded) return "output over the cap";
  return `did not run (${n.error ?? "unknown"})`;
}
//@ chunk-awy329vy.js:44302-44463 placement
/**
 * 把外部工具的 stdout/stderr 合并后（超长截断）写入 agent-proxy 调试日志。
 */
function logToolOutput(n, e) {
  let trimmed = `${e.stdout}
${e.stderr}`.trim();
  if (!trimmed) return;
  if (trimmed.length > MAX_LOGGED_OUTPUT_CHARS)
    trimmed = `${trimmed.slice(0, MAX_LOGGED_OUTPUT_CHARS)}\u2026 (${trimmed.length} chars)`;
  logForDebugging(`[agent-proxy] ${n}: ${trimmed}`);
}
//@ chunk-awy329vy.js:44755-45013 placement
/**
 * keytool 路径含空白或引号时无法安全引用。
 */
var CHANGEIT_2 = "changeit";
var KEYTOOL_PATH_UNSAFE_RE = /[\s'"]/;
var CCR_BLOCK_START_MARKER = "# >>> ccr-agent-proxy (managed by Claude Code) >>>";
var CCR_BLOCK_END_MARKER = "# <<< ccr-agent-proxy <<<";
var CA_BUNDLE_V2_SUFFIX = ".ca-v2";
var JKS_LIST_MAGIC = 4277010157;
var MAX_KEYTOOL_OUTPUT_LINES = 33554432;
var JKS_LIST_MAGIC_2 = 2;
var JKS_ENTRY_MAGIC = 2;
var JKS_ENTRY_HEADER_BYTES = 20;
var EMPTY_KEYSTORE_RE = /^Your keystore contains 0 entries\s*$/m;
var SEED_RETRY_BASE_MS = 3000;
var MAX_NSS_ENTRIES = 16;
var MAX_NSS_DIR_BYTES = 16777216;
var NSS_CHECK_STAMP_SUFFIX = ".checked-v1";
//@ chunk-awy329vy.js:45013-45157 placement
/**
 * 按拒绝证书列表（根证书/SPKI/泄露 CA 哈希）的摘要生成证书包文件名，使列表变化时文件名随之变化。
 */
function getBundlePathForDenylist(
  n,
  e = [...BLOCKED_ROOT_SHA256, ...BLOCKED_ROOT_SPKI_SHA256, ...LEAKED_CA_SPKI_SHA256],
) {
  let sliced = createHash("sha256")
    .update(
      [...e].sort().join(`
`),
    )
    .digest("hex")
    .slice(0, 16);
  return `${n}${CA_BUNDLE_V2_SUFFIX}-${sliced}.pem`;
}
//@ chunk-awy329vy.js:45157-45292 placement
/**
 * 生成 JVM 信任库系统属性字符串（-Djavax.net.ssl.trustStore 等）并与已有 JAVA_TOOL_OPTIONS 合并；已有 trustStore 设置时原样保留。
 */
function buildJavaTrustOptions(javaTrustStorePath, javaTrustStoreType, token) {
  let trimmed = token?.trim();
  if (trimmed?.includes("javax.net.ssl.trustStore=")) return trimmed;
  let joined = javaTrustStoreArgs(javaTrustStorePath, javaTrustStoreType).join(" ");
  return trimmed ? `${joined} ${trimmed}` : joined;
}
//@ chunk-awy329vy.js:45292-45518 placement
function javaTrustStoreArgs(n, e) {
  return e === "JKS"
    ? [`-Djavax.net.ssl.trustStore=${n}`, "-Djavax.net.ssl.trustStoreType=JKS"]
    : [
        `-Djavax.net.ssl.trustStore=${n}`,
        `-Djavax.net.ssl.trustStorePassword=${CHANGEIT_2}`,
        "-Djavax.net.ssl.trustStoreType=PKCS12",
      ];
}
//@ chunk-awy329vy.js:45518-48332 placement
/**
 * 为 Java、NSS、Bazel、gsutil 等工具配置 CA 信任。
 */
async function configureToolTrust(n) {
  let failures = [];
  let r = {
    failureCodes: failures,
  };
  let o = {
    used: false,
  };
  let s = join(n.stateDir, "agent-proxy-ca.crt");
  try {
    await mkdir(n.stateDir, {
      recursive: true,
    });
    await writeFile(s, n.ccrCa, "utf8");
  } catch (error) {
    logForDebugging(`[agent-proxy] tool trust setup skipped: cannot write CA file: ${errorMessage(error)}`, {
      level: "warn",
    });
    logFeatureBad("agent_proxy_tool_trust", "ca_file_write_failed");
    return r;
  }
  let keytool = await resolveToolBinaryPath(n.keytoolBin, findKeytool);
  let toolBinaryPath = await resolveToolBinaryPath(n.certutilBin, () => whichAsync("certutil"));
  let stateDir = (n.nssRecords ?? !env.CCR_AGENT_PROXY_NSS_RECORDS_DISABLED) ? n.stateDir : undefined;
  let [p, y] = await Promise.all([
    (async () => {
      if (!keytool) {
        logForDebugging("[agent-proxy] no keytool found; skipping JVM truststore");
        return;
      }
      let storePath = join(n.stateDir, "java-truststore.p12");
      let bazelrcPath = n.bazelrcPath ?? "/etc/bazel.bazelrc";
      let x;
      let b = [];
      let match = n.ccrCa.match(PEM_CERT_BLOCK_RE);
      let v = async () => {
        let { cacerts, store } = await loadJdkCacerts(keytool, b);
        let usable =
          store !== undefined &&
          match !== null &&
          match.every((Y) => {
            let X = base64URLEncode(Y);
            return X.length >= 64 && X[0] === 48 && store.includes(X);
          }) &&
          inspectJksStore(store) === "clean";
        return {
          cacerts,
          usable,
        };
      };
      let P = await v();
      let previousState = await statTrustStore(storePath);
      let A =
        previousState.state === "file" &&
        (await compareBundleWithFile(getBundlePathForDenylist(storePath), n.ccrCa)) === "same";
      if (!P.usable && !A) {
        await n.systemTrust?.then(
          () => {},
          () => {},
        );
        P = await v();
      }
      if (P.cacerts && P.usable) {
        logForDebugging(`[agent-proxy] JDK truststore at ${P.cacerts} already holds the CA; using it`);
        x = {
          path: P.cacerts,
          type: "JKS",
          source: "system",
        };
      } else if (A) {
        logForDebugging(`[agent-proxy] reusing JVM truststore at ${storePath}`);
        x = {
          path: storePath,
          type: "PKCS12",
          source: "reused",
        };
      } else {
        let M = (Y) => importIntoJvmTruststore(keytool, P.cacerts, n.ccrCa, s, storePath, Y);
        let R = [];
        let I = await M(R);
        if (R[0] === "java_truststore_seed_failed") {
          o.used = true;
          logForDebugging("[agent-proxy] keytool seed failed; trying once more after a pause");
          await (n.seedRetryPause?.() ?? sleep(SEED_RETRY_BASE_MS));
          I = await M(failures);
        } else failures.push(...R);
        if (!I) {
          await loadJdkCacerts(keytool, b);
          for (let { cacerts, store } of b) {
            let L = inspectJksStore(store);
            if (L !== "part_written") {
              r.rejectedJdkStorePath = L === "failed_filter" ? cacerts : undefined;
              break;
            }
          }
          if (
            await cleanupJavaTrust(
              keytool,
              storePath,
              previousState,
              r.rejectedJdkStorePath,
              bazelrcPath,
              failures,
            )
          )
            r.retiredJavaTrustStorePath = storePath;
          return;
        }
        x = {
          path: I,
          type: "PKCS12",
          source: "built",
        };
      }
      if (KEYTOOL_PATH_UNSAFE_RE.test(x.path)) {
        logForDebugging(
          `[agent-proxy] truststore path contains JVM-unsafe characters; not emitting JAVA_TOOL_OPTIONS: ${x.path}`,
          {
            level: "warn",
          },
        );
        failures.push("jvm_unsafe_truststore_path");
        return;
      }
      r.javaTrustStorePath = x.path;
      r.javaTrustStoreType = x.type;
      await writeBazelTrustBlock(x.path, x.type, bazelrcPath, failures);
      return x.source;
    })(),
    (async () => {
      if (!toolBinaryPath) {
        logForDebugging("[agent-proxy] certutil not found; skipping NSS trust for browsers");
        return;
      }
      return addToNssDb(
        s,
        n.ccrCa,
        n.nssDbDirs ?? [join(homedir(), ".pki", "nssdb"), join(getXDGDataHome(), "pki", "nssdb")],
        toolBinaryPath,
        stateDir,
        failures,
      );
    })(),
    writeBotoConfig(n.caBundlePath, n.botoConfigPath ?? join(homedir(), ".boto"), failures),
    writeLoginShellCaEnv(n, n.profileDPath ?? "/etc/profile.d/ccr-agent-proxy-ca.sh", failures).then(
      (profileDPath) => {
        r.profileDPath = profileDPath;
      },
    ),
  ]);
  let w =
    y === undefined
      ? undefined
      : {
          nss_dbs_unchanged: y.unchanged,
          ...(stateDir !== undefined && {
            nss_dbs_certutil_skipped: y.byRecord,
          }),
        };
  if (failures.length === 0)
    logFeatureOk("agent_proxy_tool_trust", {
      reused: p === "reused",
      ...(p && {
        store: fromEnum(p),
      }),
      ...(o.used && {
        java_seed_retried: true,
      }),
      ...w,
    });
  else {
    let T = failures[0];
    if (o.used || w)
      logFeatureSad("agent_proxy_tool_trust", T, {
        ...(o.used && {
          java_seed_retried: true,
        }),
        ...w,
      });
    else logFeatureSad("agent_proxy_tool_trust", T);
  }
  return r;
}
//@ chunk-awy329vy.js:48332-48418 placement
/**
 * 解析 keytool/certutil 的真实路径（配置优先，其次 PATH 查找）。
 */
async function resolveToolBinaryPath(n, e) {
  if (n)
    return realpath(n).catch(() => {
      return;
    });
  return (await e()) ?? undefined;
}
//@ chunk-awy329vy.js:48418-48642 placement
/**
 * 找 keytool：PATH 中与 JAVA_HOME/bin 下的候选，解析真实路径，优先选能找到 cacerts 的那个，否则返回第一个找到的。
 */
async function findKeytool() {
  let n = [await whichAsync("keytool"), env.JAVA_HOME ? join(env.JAVA_HOME, "bin", "keytool") : undefined];
  let e;
  for (let r of n) {
    if (!r) continue;
    let o = await realpath(r).catch(() => {
      return;
    });
    if (!o) continue;
    e ??= o;
    if (await findJdkCacerts(o)) return o;
  }
  return e;
}
//@ chunk-awy329vy.js:48642-48825 placement
async function findJdkCacerts(n) {
  let e = dirname(dirname(n));
  for (let r of [join(e, "lib", "security", "cacerts"), join(e, "jre", "lib", "security", "cacerts")]) {
    let o = await realpath(r).catch(() => {
      return;
    });
    if (o) return o;
  }
  return;
}
//@ chunk-awy329vy.js:48825-49081 placement
async function statTrustStore(n) {
  let e;
  try {
    e = await open(n, readOnlyNoFollowFlags());
    let stats = await e.stat();
    return stats.isFile()
      ? {
          state: "file",
          identity: `${stats.ino}:${stats.size}:${stats.mtimeMs}`,
        }
      : {
          state: "unusable",
        };
  } catch (error) {
    return {
      state: isFsInaccessible(error) ? "unusable" : "unknown",
    };
  } finally {
    await e?.close().catch(() => {});
  }
}
//@ chunk-awy329vy.js:49081-49206 placement
function hasParsableSpki(n) {
  if (BLOCKED_ROOT_SPKI_SHA256.size === 0) return true;
  try {
    new X509Certificate(n).publicKey.export({
      type: "spki",
      format: "der",
    });
    return true;
  } catch {
    return false;
  }
}
//@ chunk-awy329vy.js:49477-49636 affinity
async function loadJdkCacerts(n, e) {
  let jdkCacerts = await findJdkCacerts(n);
  let o =
    jdkCacerts === undefined ? undefined : await readLinesReverse_2(jdkCacerts, MAX_KEYTOOL_OUTPUT_LINES);
  if (jdkCacerts !== undefined && o !== undefined)
    e.unshift({
      cacerts: jdkCacerts,
      store: o,
    });
  return {
    cacerts: jdkCacerts,
    store: o,
  };
}
//@ chunk-awy329vy.js:49636-50296 placement
/**
 * 解析 JKS 信任库的二进制结构，提取所有证书转为 PEM 并检查是否含被拒证书：clean（完整且干净）、part_written（截断/未写完）、failed_filter（格式不对或含被拒证书）。
 */
function inspectJksStore(buffer) {
  let pemCerts = [];
  let r = false;
  try {
    if (buffer.readUInt32BE(0) !== JKS_LIST_MAGIC || buffer.readUInt32BE(4) !== JKS_LIST_MAGIC_2)
      return "failed_filter";
    let offset = 12;
    for (let uInt32BE = buffer.readUInt32BE(8); uInt32BE > 0; uInt32BE--) {
      if (buffer.readUInt32BE(offset) !== JKS_ENTRY_MAGIC) return "failed_filter";
      offset += 4;
      offset += 2 + buffer.readUInt16BE(offset);
      offset += 8;
      offset += 2 + buffer.readUInt16BE(offset);
      let uInt32BE = buffer.readUInt32BE(offset);
      offset += 4;
      if (offset + uInt32BE > buffer.length) return "part_written";
      let str = buffer.toString("base64", offset, offset + uInt32BE);
      pemCerts.push(`-----BEGIN CERTIFICATE-----
${str}
-----END CERTIFICATE-----`);
      offset += uInt32BE;
    }
    let s = offset + JKS_ENTRY_HEADER_BYTES;
    if (s < buffer.length) return "failed_filter";
    r = s === buffer.length;
  } catch {
    return "part_written";
  }
  if (
    !pemCerts.every(hasParsableSpki) ||
    (withoutBlockedCerts(
      pemCerts.join(`
`),
      "agent proxy trust",
    )?.match(PEM_CERT_BLOCK_RE)?.length ?? 0) !== pemCerts.length
  )
    return "failed_filter";
  return r ? "clean" : "part_written";
}
//@ chunk-awy329vy.js:50296-52161 placement
async function importIntoJvmTruststore(keytoolPath, cacerts, ccrCa, o, s, h) {
  if (!cacerts) {
    logForDebugging(`[agent-proxy] no JDK cacerts found near ${keytoolPath}; skipping JVM truststore`);
    h.push("jdk_cacerts_not_found");
    return;
  }
  let storePath = `${s}.${process.pid}.tmp`;
  await unlink(storePath).catch(() => {});
  let u = await runToolCommand(keytoolPath, [
    "-importkeystore",
    "-noprompt",
    "-srckeystore",
    cacerts,
    "-srcstorepass",
    CHANGEIT_2,
    "-destkeystore",
    storePath,
    "-deststoretype",
    "PKCS12",
    "-deststorepass",
    CHANGEIT_2,
  ]);
  if (!u.ok) {
    logForDebugging(`[agent-proxy] keytool importkeystore failed: ${u.detail}`, {
      level: "warn",
    });
    h.push("java_truststore_seed_failed");
    await unlink(storePath).catch(() => {});
    return;
  }
  let p = await removeDeniedStoreEntries(keytoolPath, storePath);
  if (!p.ok) {
    logForDebugging(`[agent-proxy] could not filter the JVM truststore: ${p.detail}`, {
      level: "warn",
    });
    h.push("java_truststore_filter_failed");
    await unlink(storePath).catch(() => {});
    return;
  }
  let y = await importCertToStore(keytoolPath, storePath, "ccr-agent-proxy", o);
  if (!y.ok) {
    logForDebugging(`[agent-proxy] keytool importcert failed: ${y.detail}`, {
      level: "warn",
    });
    h.push("java_truststore_import_failed");
    await unlink(storePath).catch(() => {});
    return;
  }
  let w = firstPemCertAfterDifferent(ccrCa);
  let T = true;
  if (w !== undefined) {
    let C = `${storePath}.second.crt`;
    let v = await writeFile(
      C,
      `${w}
`,
      "utf8",
    ).then(
      () => importCertToStore(keytoolPath, storePath, "ccr-agent-proxy-2", C),
      (error) => ({
        ok: false,
        detail: errorMessage(error),
      }),
    );
    await unlink(C).catch(() => {});
    if (!v.ok) {
      logForDebugging(
        `[agent-proxy] could not import the second certificate: ${v.detail}; the store holds the first only and is rebuilt on the next start`,
        {
          level: "warn",
        },
      );
      h.push("java_truststore_second_import_failed");
      T = false;
    }
  }
  let bundlePathForDenylist = getBundlePathForDenylist(s);
  await unlink(bundlePathForDenylist).catch(() => {});
  let x = dirname(s);
  let b = `${basename(s)}${CA_BUNDLE_V2_SUFFIX}-`;
  for (let C of await readdir(x).catch(() => []))
    if (C.startsWith(b)) await unlink(join(x, C)).catch(() => {});
  try {
    await rename(storePath, s).catch(async () => {
      await writeFile(s, await readFile(storePath));
      await unlink(storePath).catch(() => {});
    });
  } catch (error) {
    logForDebugging(`[agent-proxy] could not move JVM truststore into place: ${errorMessage(error)}`, {
      level: "warn",
    });
    h.push("java_truststore_publish_failed");
    await unlink(storePath).catch(() => {});
    return;
  }
  if (T)
    await writeFile(bundlePathForDenylist, ccrCa, "utf8").catch((error) => {
      logForDebugging(`[agent-proxy] could not record the truststore's CA: ${errorMessage(error)}`);
    });
  logForDebugging(`[agent-proxy] JVM truststore built at ${s}`);
  return s;
}
//@ chunk-awy329vy.js:52161-52237 placement
/**
 * 运行 Java 工具时使用的环境（去掉 _JAVA_OPTIONS 与 JAVA_TOOL_OPTIONS）。
 */
function javaToolEnv() {
  return {
    ...subprocessEnv(),
    _JAVA_OPTIONS: undefined,
    JAVA_TOOL_OPTIONS: undefined,
  };
}
//@ chunk-awy329vy.js:52237-52803 placement
/**
 * 用 keytool 列出 PKCS12 信任库条目，找出含被拒证书或无法解析 SPKI 的条目别名；列表无法使用时返回失败。
 */
async function listDeniedStoreAliases(keytool, storePath) {
  let result = await runToolCommand(
    keytool,
    [
      "-list",
      "-rfc",
      "-keystore",
      storePath,
      "-storetype",
      "PKCS12",
      "-storepass",
      CHANGEIT_2,
      "-J-Duser.language=en",
    ],
    javaToolEnv(),
  );
  if (!result.ok)
    return {
      ok: false,
      detail: result.detail,
      aliases: [],
    };
  let entries = result.stdout.split(/^Alias name: /m).slice(1);
  let filteredPem = withoutBlockedCerts(result.stdout, "agent proxy trust");
  if (
    filteredPem === undefined ||
    (entries.length === 0 && !EMPTY_KEYSTORE_RE.test(result.stdout)) ||
    entries.some((entry) => !entry.match(PEM_CERT_BLOCK_RE))
  )
    return {
      ok: false,
      detail: `no usable listing (${entries.length} entries read)`,
      aliases: [],
    };
  return {
    ok: true,
    detail: "",
    aliases: entries
      .filter((entry) =>
        entry.match(PEM_CERT_BLOCK_RE)?.some((u) => !filteredPem.includes(u) || !hasParsableSpki(u)),
      )
      .map((entry) =>
        entry
          .slice(
            0,
            entry.indexOf(`
`),
          )
          .trimEnd(),
      ),
  };
}
//@ chunk-awy329vy.js:52803-53337 placement
/**
 * 删除信任库中被拒或不可读的条目（拒绝以 - 开头的别名），删除后复查，仍有剩余则返回失败。
 */
async function removeDeniedStoreEntries(keytoolPath, storePath) {
  let listing = await listDeniedStoreAliases(keytoolPath, storePath);
  if (!listing.ok || listing.aliases.length === 0) return listing;
  if (listing.aliases.some((alias) => alias.startsWith("-")))
    return {
      ok: false,
      detail: "an entry to remove has an unsafe alias",
    };
  logForDebugging(
    `[agent-proxy] removing ${listing.aliases.length} denied or unreadable entries from the JVM truststore`,
  );
  for (let alias of listing.aliases) {
    let h = await runToolCommand(
      keytoolPath,
      ["-delete", "-alias", alias, "-keystore", storePath, "-storetype", "PKCS12", "-storepass", CHANGEIT_2],
      javaToolEnv(),
    );
    if (!h.ok) return h;
  }
  let remaining = await listDeniedStoreAliases(keytoolPath, storePath);
  return remaining.ok && remaining.aliases.length > 0
    ? {
        ok: false,
        detail: `${remaining.aliases.length} entries remain`,
      }
    : remaining;
}
//@ chunk-awy329vy.js:53337-53472 placement
function importCertToStore(n, e, r, o) {
  return runToolCommand(n, [
    "-importcert",
    "-noprompt",
    "-alias",
    r,
    "-file",
    o,
    "-keystore",
    e,
    "-storetype",
    "PKCS12",
    "-storepass",
    CHANGEIT_2,
  ]);
}
//@ chunk-awy329vy.js:53472-54136 placement
/**
 * 判断旧的 JVM 信任库是否应作废（证书包读取失败/变化或库里有被拒条目），从 .bazelrc 中移除指向它的信任块，并在确认是同一文件时删除；返回是否已作废。
 */
async function cleanupJavaTrust(keytool, storePath, previousState, otherStorePath, bazelrcPath, failures) {
  let caBundleFile = await readCaBundleFile(getBundlePathForDenylist(storePath));
  let stale =
    previousState.state !== "unknown" &&
    caBundleFile.state !== "failed" &&
    !(previousState.state === "file" && caBundleFile.state === "read");
  if (stale && previousState.state === "file") {
    let T = await listDeniedStoreAliases(keytool, storePath);
    stale = !T.ok || T.aliases.length > 0;
  }
  let currentState = await statTrustStore(storePath);
  let y =
    currentState.state === "file" &&
    previousState.state === "file" &&
    currentState.identity === previousState.identity;
  let w = stale && (y || currentState.state === "unusable");
  try {
    let T = await readFile(bazelrcPath, "utf8").catch((error) => {
      if (isENOENT(error)) return "";
      throw error;
    });
    let { block, rest } = splitBazelTrustBlock(T);
    if (
      (w && block.includes(storePath)) ||
      (otherStorePath !== undefined && block.includes(otherStorePath))
    ) {
      await writeFile(bazelrcPath, rest, "utf8");
      logForDebugging(`[agent-proxy] removed Bazel trust block from ${bazelrcPath}`);
    }
  } catch (error) {
    logForDebugging(`[agent-proxy] could not update ${bazelrcPath}: ${errorMessage(error)}`);
    failures.push("bazelrc_write_failed");
  }
  if (w && y) await unlink(storePath).catch(() => {});
  return w;
}
//@ chunk-awy329vy.js:54136-54310 placement
function splitBazelTrustBlock(n) {
  let index = n.indexOf(CCR_BLOCK_START_MARKER);
  let index_2 = n.indexOf(CCR_BLOCK_END_MARKER);
  return index >= 0 && index_2 > index
    ? {
        block: n.slice(index, index_2 + CCR_BLOCK_END_MARKER.length),
        rest: n.slice(0, index) + n.slice(index_2 + CCR_BLOCK_END_MARKER.length).replace(/^\n/, ""),
      }
    : {
        block: "",
        rest: n,
      };
}
//@ chunk-awy329vy.js:54310-54933 placement
/**
 * 在 .bazelrc 中写入（替换）agent-proxy 信任块：用 startup --host_jvm_args 传递信任库参数（Bazel 内嵌 JDK 不读 JAVA_TOOL_OPTIONS）；读写失败记入失败列表。
 */
async function writeBazelTrustBlock(storePath, storeType, bazelrcPath, failures) {
  let joined = javaTrustStoreArgs(storePath, storeType)
    .map((y) => `--host_jvm_args=${y}`)
    .join(" ");
  let h = `${CCR_BLOCK_START_MARKER}
# Bazel's repository downloader runs on its embedded JDK and ignores
# JAVA_TOOL_OPTIONS; carry the agent-proxy truststore via startup options.
startup ${joined}
${CCR_BLOCK_END_MARKER}
`;
  let current;
  try {
    current = await readFile(bazelrcPath, "utf8");
  } catch (error) {
    if (!isENOENT(error)) {
      logForDebugging(`[agent-proxy] could not read ${bazelrcPath}: ${errorMessage(error)}`);
      failures.push("bazelrc_write_failed");
      return;
    }
    current = "";
  }
  let u = splitBazelTrustBlock(current).rest.trimEnd();
  let p = u
    ? `${u}

${h}`
    : h;
  if (p === current) return;
  try {
    await writeFile(bazelrcPath, p, "utf8");
    logForDebugging(`[agent-proxy] wrote Bazel trust block to ${bazelrcPath}`);
  } catch (error) {
    logForDebugging(`[agent-proxy] could not write ${bazelrcPath}: ${errorMessage(error)}`);
    failures.push("bazelrc_write_failed");
  }
}
//@ chunk-awy329vy.js:54933-57088 placement
async function addToNssDb(n, ccrCa, r, certutil, stateDir, h) {
  let l = 0;
  let u = 0;
  let p = ccrCa.match(PEM_CERT_BLOCK_RE)?.[0];
  let y = firstPemCertAfterDifferent(ccrCa);
  let w = `${n}.${process.pid}.second`;
  let certs = p === undefined ? undefined : y === undefined ? [p] : [p, y];
  if (y !== undefined)
    await writeFile(
      w,
      `${y}
`,
      "utf8",
    ).catch(() => {});
  for (let S of r) {
    let x = await mkdir(S, {
      recursive: true,
    }).then(
      (A) => (A === undefined ? "was_there" : "new"),
      (error) => {
        logForDebugging(`[agent-proxy] could not create NSS dir ${S}: ${errorMessage(error)}`);
        return;
      },
    );
    if (x === undefined) {
      h.push("nss_add_failed");
      continue;
    }
    let dbDir = `sql:${S}`;
    let C = stateDir === undefined ? undefined : getNssDbPath(stateDir, S);
    let v = C === undefined || certs === undefined ? undefined : await fingerprintNssDb(S, certs, certutil);
    if (C !== undefined && v !== undefined) {
      let caBundleFile = await readCaBundleFile(C);
      if (caBundleFile.state === "read" && caBundleFile.text === v) {
        logForDebugging(
          `[agent-proxy] NSS DB at ${S} matches the record of an earlier start that found the served certificates trusted; left as is without running certutil`,
        );
        l++;
        u++;
        continue;
      }
    }
    if (
      x === "was_there" &&
      certs !== undefined &&
      (await verifyNssDb(certutil, dbDir, certs).catch((error) => {
        logForDebugging(
          `[agent-proxy] NSS check of ${S} threw, taken as a difference: ${errorMessage(error)}`,
        );
        return false;
      }))
    ) {
      logForDebugging(
        `[agent-proxy] NSS DB at ${S} already holds the served certificates, trusted; left as is`,
      );
      l++;
      if (C !== undefined && v !== undefined && (await fingerprintNssDb(S, certs, certutil)) === v)
        await writeFileAtomic(C, v).catch((error) => {
          logForDebugging(
            `[agent-proxy] could not record the NSS check of ${S}: ${errorMessage(error)}; the next start will run certutil again`,
          );
        });
      else if (C !== undefined)
        logForDebugging(
          `[agent-proxy] NSS check of ${S} not recorded: the directory ${v === undefined ? `has an entry that is not a regular file, more than ${MAX_NSS_ENTRIES} entries or ${MAX_NSS_DIR_BYTES / 1024 / 1024} MiB, or it or certutil could not be read` : "changed or became unreadable during the check"}; the next start will run certutil again`,
        );
      continue;
    }
    if (x === "was_there") {
      await runToolCommand(certutil, ["-D", "-d", dbDir, "-n", "ccr-agent-proxy"]);
      await runToolCommand(certutil, ["-D", "-d", dbDir, "-n", "ccr-agent-proxy-2"]);
    }
    let P = certutilAddArgs(dbDir, "ccr-agent-proxy", n);
    let E = await runToolCommand(certutil, P);
    if (!E.ok) {
      await runToolCommand(certutil, ["-N", "--empty-password", "-d", dbDir]);
      E = await runToolCommand(certutil, P);
    }
    if (E.ok) {
      logForDebugging(`[agent-proxy] MITM CA added to NSS DB at ${S}`);
      if (y !== undefined) {
        let A = await runToolCommand(certutil, certutilAddArgs(dbDir, "ccr-agent-proxy-2", w));
        if (!A.ok) {
          logForDebugging(
            `[agent-proxy] could not add the second certificate to the NSS DB at ${S}: ${A.detail}; it holds the first only`,
          );
          h.push("nss_second_add_failed");
        }
      }
    } else {
      logForDebugging(`[agent-proxy] certutil -A failed for ${S}: ${E.detail}`);
      h.push("nss_add_failed");
    }
  }
  await unlink(w).catch(() => {});
  return {
    unchanged: l,
    byRecord: u,
  };
}
//@ chunk-awy329vy.js:57088-57191 placement
function getNssDbPath(n, e) {
  let sliced = createHash("sha256").update(e).digest("hex").slice(0, 16);
  return join(n, `nssdb-${sliced}${NSS_CHECK_STAMP_SUFFIX}`);
}
//@ chunk-awy329vy.js:57191-57631 placement
/**
 * 计算 NSS 证书库的指纹：证书集合、证书包文件大小与修改时间、库目录各文件尾部内容；文件过多或读取失败时返回 undefined。
 */
async function fingerprintNssDb(n, e, r) {
  let hash = createHash("sha256");
  hash.update(`${e.length}\x00`);
  for (let s of e.map((h) => base64URLEncode(h).toString("base64")).sort()) hash.update(`${s}\x00`);
  try {
    let s = await stat(r);
    hash.update(`${r}\x00${s.size}\x00${s.mtimeMs}\x00`);
    let sorted = (await readdir(n)).sort();
    if (sorted.length > MAX_NSS_ENTRIES) return;
    let l = MAX_NSS_DIR_BYTES;
    for (let u of sorted) {
      let linesReverse = await readLinesReverse_2(join(n, u), l);
      if (linesReverse === undefined) return;
      l -= linesReverse.length;
      hash.update(`${u}\x00${linesReverse.length}\x00`);
      hash.update(linesReverse);
    }
  } catch {
    return;
  }
  return hash.digest("hex");
}
//@ chunk-awy329vy.js:57631-57695 placement
/**
 * 构造 certutil 检查 NSS 证书条目的参数。
 */
function certutilAddArgs(n, e, r) {
  return ["-A", "-d", n, "-t", "C,,", "-n", e, "-i", r];
}
//@ chunk-awy329vy.js:57695-58305 placement
/**
 * 用 certutil 检查 NSS 库里 agent-proxy 证书条目：数量与信任标志符合预期，且导出的证书集合与期望完全一致。
 */
async function verifyNssDb(certutil, dbDir, certs) {
  let o = await runToolCommand(certutil, ["-L", "-d", dbDir]);
  if (!o.ok) return false;
  let mapped = o.stdout
    .split(
      `
`,
    )
    .map((line) => line.trim().split(/\s+/));
  let h = ["ccr-agent-proxy", "ccr-agent-proxy-2"];
  for (let [p, y] of h.entries()) {
    let mapped_2 = mapped.filter((S) => S.length === 2 && S[0] === y).map((S) => S[1]);
    let T = p < certs.length ? 1 : 0;
    if (mapped_2.length !== T || mapped_2.some((S) => S !== "C,,")) return false;
  }
  let l = new Set();
  for (let p of h.slice(0, certs.length)) {
    let y = await runToolCommand(certutil, ["-L", "-d", dbDir, "-n", p, "-a"]);
    if (!y.ok) return false;
    for (let w of y.stdout.match(PEM_CERT_BLOCK_RE) ?? []) l.add(base64URLEncode(w).toString("base64"));
  }
  let u = new Set(certs.map((cert) => base64URLEncode(cert).toString("base64")));
  return l.size === u.size && [...u].every((p) => l.has(p));
}
//@ chunk-awy329vy.js:58305-58573 placement
/**
 * 为 gsutil 写入 .boto（ca_certificates_file 指向证书包），文件已存在则不覆盖，其他写失败记入失败列表。
 */
async function writeBotoConfig(caBundlePath, e, r) {
  let o = `[Boto]
ca_certificates_file = ${caBundlePath}
`;
  try {
    await writeFile(e, o, {
      flag: "wx",
      mode: 420,
    });
    logForDebugging(`[agent-proxy] wrote ${e} for gsutil trust`);
  } catch (error) {
    if (getErrnoCode(error) === "EEXIST") return;
    logForDebugging(`[agent-proxy] could not write ${e}: ${errorMessage(error)}`);
    r.push("boto_write_failed");
  }
}
//@ chunk-awy329vy.js:58573-59484 placement
async function writeLoginShellCaEnv(n, e, r) {
  if (!n.hasSystemCa) {
    await unlink(e).catch(() => {});
    return;
  }
  let o = [
    "# Managed by Claude Code (CCR agent-proxy). Re-exports CA-trust env",
    "# vars for login shells that start from a scrubbed environment. Each",
    "# export is set-if-absent so an explicit value in the shell wins.",
    "# HTTPS_PROXY is intentionally NOT set here: the relay port is",
    "# ephemeral and persisting it would break all HTTPS in login shells",
    "# once the relay process exits. Scrubbed login shells dial direct.",
    `if [ -r ${shellQuote(n.caBundlePath)} ]; then`,
  ];
  for (let h of [...CA_CERT_ENV_VARS_2, ...CA_CERT_ENV_VARS])
    o.push("  " + exportEnvIfUnset(h, n.caBundlePath));
  for (let [key, value] of Object.entries(caCertEnvVarList)) o.push("  " + exportEnvIfUnset(key, value));
  o.push("fi");
  let s =
    o.join(`
`) +
    `
`;
  try {
    await mkdir(dirname(e), {
      recursive: true,
    });
    await writeFile(e, s, {
      mode: 420,
    });
    logForDebugging(`[agent-proxy] wrote ${e} for login-shell trust`);
    return e;
  } catch (error) {
    logForDebugging(`[agent-proxy] could not write ${e}: ${errorMessage(error)}`);
    r.push("profile_d_write_failed");
    return;
  }
}
//@ chunk-awy329vy.js:59484-59569 placement
/**
 * 生成“未设置则设置并导出环境变量”的 shell 片段。
 */
function exportEnvIfUnset(n, e) {
  return `if [ -z "\${${n}:-}" ]; then ${n}=${shellQuote(e)}; fi; export ${n}`;
}
//@ chunk-awy329vy.js:59569-59621 placement = shellQuote (1)
function shellQuote(s) {
  return `'${s.replace(/'/g, "'\\''")}'`;
}
//@ chunk-awy329vy.js:59621-59703 placement
/**
 * 从字符串里取第一张 PEM 证书（与首块不同时）。
 */
function firstPemCertAfterDifferent(n) {
  let e = n.match(PEM_CERT_BLOCK_RE) ?? [];
  return e.length === 2 && e[1] !== e[0] ? e[1] : undefined;
}
//@ chunk-awy329vy.js:59703-59800 placement = base64URLEncode (1)
function base64URLEncode(buffer) {
  return Buffer.from(buffer.replace(/-----(?:BEGIN|END) CERTIFICATE-----/g, ""), "base64");
}
//@ chunk-awy329vy.js:59800-60056 placement
/**
 * 以 20 秒超时运行外部命令（保留输出、不使用 cwd），返回 ok、stdout 与失败说明。
 */
async function runToolCommand(n, e, env) {
  let o = await execFileNoThrow(n, e, {
    timeout: 20000,
    preserveOutputOnError: true,
    useCwd: false,
    env,
  });
  if (o.code === 0)
    return {
      ok: true,
      stdout: o.stdout,
      detail: "",
    };
  return {
    ok: false,
    stdout: o.stdout,
    detail: `${o.error ?? `exit ${o.code}`} ${o.stderr.slice(0, 200)}`.trim(),
  };
}
export {
  configureToolTrust,
  buildJavaTrustOptions,
  firstPemCertAfterDifferent,
  logToolOutput,
  describeExecOutcome,
};
