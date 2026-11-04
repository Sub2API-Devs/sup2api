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
function describeExecOutcome(result) {
  if (result.exitCode !== undefined) return `exit status ${result.exitCode}`;
  if (result.timedOut) return "still running at the deadline";
  if (result.maxBufferExceeded) return "output over the cap";
  return `did not run (${result.error ?? "unknown"})`;
}
//@ chunk-awy329vy.js:44302-44463 placement
/**
 * 把外部工具的 stdout/stderr 合并后（超长截断）写入 agent-proxy 调试日志。
 */
function logToolOutput(label, result) {
  let trimmed = `${result.stdout}
${result.stderr}`.trim();
  if (!trimmed) return;
  if (trimmed.length > MAX_LOGGED_OUTPUT_CHARS)
    trimmed = `${trimmed.slice(0, MAX_LOGGED_OUTPUT_CHARS)}\u2026 (${trimmed.length} chars)`;
  logForDebugging(`[agent-proxy] ${label}: ${trimmed}`);
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
  storePath,
  denylist = [...BLOCKED_ROOT_SHA256, ...BLOCKED_ROOT_SPKI_SHA256, ...LEAKED_CA_SPKI_SHA256],
) {
  let sliced = createHash("sha256")
    .update(
      [...denylist].sort().join(`
`),
    )
    .digest("hex")
    .slice(0, 16);
  return `${storePath}${CA_BUNDLE_V2_SUFFIX}-${sliced}.pem`;
}
//@ chunk-awy329vy.js:45157-45292 placement
/**
 * 生成 JVM 信任库系统属性字符串（-Djavax.net.ssl.trustStore 等）并与已有 JAVA_TOOL_OPTIONS 合并；已有 trustStore 设置时原样保留。
 */
function buildJavaTrustOptions(storePath, storeType, token) {
  let trimmed = token?.trim();
  if (trimmed?.includes("javax.net.ssl.trustStore=")) return trimmed;
  let joined = javaTrustStoreArgs(storePath, storeType).join(" ");
  return trimmed ? `${joined} ${trimmed}` : joined;
}
//@ chunk-awy329vy.js:45292-45518 placement
function javaTrustStoreArgs(storePath, storeType) {
  return storeType === "JKS"
    ? [`-Djavax.net.ssl.trustStore=${storePath}`, "-Djavax.net.ssl.trustStoreType=JKS"]
    : [
        `-Djavax.net.ssl.trustStore=${storePath}`,
        `-Djavax.net.ssl.trustStorePassword=${CHANGEIT_2}`,
        "-Djavax.net.ssl.trustStoreType=PKCS12",
      ];
}
//@ chunk-awy329vy.js:45518-48332 placement
/**
 * 为 Java、NSS、Bazel、gsutil 等工具配置 CA 信任。
 */
async function configureToolTrust(options) {
  let failures = [];
  let result = {
    failureCodes: failures,
  };
  let seedState = {
    used: false,
  };
  let caFilePath = join(options.stateDir, "agent-proxy-ca.crt");
  try {
    await mkdir(options.stateDir, {
      recursive: true,
    });
    await writeFile(caFilePath, options.ccrCa, "utf8");
  } catch (error) {
    logForDebugging(`[agent-proxy] tool trust setup skipped: cannot write CA file: ${errorMessage(error)}`, {
      level: "warn",
    });
    logFeatureBad("agent_proxy_tool_trust", "ca_file_write_failed");
    return result;
  }
  let toolBinaryPath = await resolveToolBinaryPath(options.keytoolBin, findKeytool);
  let toolBinaryPath_2 = await resolveToolBinaryPath(options.certutilBin, () => whichAsync("certutil"));
  let stateDir =
    (options.nssRecords ?? !env.CCR_AGENT_PROXY_NSS_RECORDS_DISABLED) ? options.stateDir : undefined;
  let [jvmStore, bazelSetup] = await Promise.all([
    (async () => {
      if (!toolBinaryPath) {
        logForDebugging("[agent-proxy] no keytool found; skipping JVM truststore");
        return;
      }
      let storePath = join(options.stateDir, "java-truststore.p12");
      let bazelrcPath = options.bazelrcPath ?? "/etc/bazel.bazelrc";
      let trustStore;
      let cacertsList = [];
      let match = options.ccrCa.match(PEM_CERT_BLOCK_RE);
      let probeInstalled = async () => {
        let { cacerts, store } = await loadJdkCacerts(toolBinaryPath, cacertsList);
        let usable =
          store !== undefined &&
          match !== null &&
          match.every((certBlock) => {
            let encodedCert = base64URLEncode(certBlock);
            return encodedCert.length >= 64 && encodedCert[0] === 48 && store.includes(encodedCert);
          }) &&
          inspectJksStore(store) === "clean";
        return {
          cacerts,
          usable,
        };
      };
      let probeResult = await probeInstalled();
      let previousState = await statTrustStore(storePath);
      let reusableOnDisk =
        previousState.state === "file" &&
        (await compareBundleWithFile(getBundlePathForDenylist(storePath), options.ccrCa)) === "same";
      if (!probeResult.usable && !reusableOnDisk) {
        await options.systemTrust?.then(
          () => {},
          () => {},
        );
        probeResult = await probeInstalled();
      }
      if (probeResult.cacerts && probeResult.usable) {
        logForDebugging(
          `[agent-proxy] JDK truststore at ${probeResult.cacerts} already holds the CA; using it`,
        );
        trustStore = {
          path: probeResult.cacerts,
          type: "JKS",
          source: "system",
        };
      } else if (reusableOnDisk) {
        logForDebugging(`[agent-proxy] reusing JVM truststore at ${storePath}`);
        trustStore = {
          path: storePath,
          type: "PKCS12",
          source: "reused",
        };
      } else {
        let importOnce = (targetFailures) =>
          importIntoJvmTruststore(
            toolBinaryPath,
            probeResult.cacerts,
            options.ccrCa,
            caFilePath,
            storePath,
            targetFailures,
          );
        let importFailures = [];
        let imported = await importOnce(importFailures);
        if (importFailures[0] === "java_truststore_seed_failed") {
          seedState.used = true;
          logForDebugging("[agent-proxy] keytool seed failed; trying once more after a pause");
          await (options.seedRetryPause?.() ?? sleep(SEED_RETRY_BASE_MS));
          imported = await importOnce(failures);
        } else failures.push(...importFailures);
        if (!imported) {
          await loadJdkCacerts(toolBinaryPath, cacertsList);
          for (let { cacerts, store } of cacertsList) {
            let storeState = inspectJksStore(store);
            if (storeState !== "part_written") {
              result.rejectedJdkStorePath = storeState === "failed_filter" ? cacerts : undefined;
              break;
            }
          }
          if (
            await cleanupJavaTrust(
              toolBinaryPath,
              storePath,
              previousState,
              result.rejectedJdkStorePath,
              bazelrcPath,
              failures,
            )
          )
            result.retiredJavaTrustStorePath = storePath;
          return;
        }
        trustStore = {
          path: imported,
          type: "PKCS12",
          source: "built",
        };
      }
      if (KEYTOOL_PATH_UNSAFE_RE.test(trustStore.path)) {
        logForDebugging(
          `[agent-proxy] truststore path contains JVM-unsafe characters; not emitting JAVA_TOOL_OPTIONS: ${trustStore.path}`,
          {
            level: "warn",
          },
        );
        failures.push("jvm_unsafe_truststore_path");
        return;
      }
      result.javaTrustStorePath = trustStore.path;
      result.javaTrustStoreType = trustStore.type;
      await writeBazelTrustBlock(trustStore.path, trustStore.type, bazelrcPath, failures);
      return trustStore.source;
    })(),
    (async () => {
      if (!toolBinaryPath_2) {
        logForDebugging("[agent-proxy] certutil not found; skipping NSS trust for browsers");
        return;
      }
      return addToNssDb(
        caFilePath,
        options.ccrCa,
        options.nssDbDirs ?? [join(homedir(), ".pki", "nssdb"), join(getXDGDataHome(), "pki", "nssdb")],
        toolBinaryPath_2,
        stateDir,
        failures,
      );
    })(),
    writeBotoConfig(options.caBundlePath, options.botoConfigPath ?? join(homedir(), ".boto"), failures),
    writeLoginShellCaEnv(
      options,
      options.profileDPath ?? "/etc/profile.d/ccr-agent-proxy-ca.sh",
      failures,
    ).then((profileDPath) => {
      result.profileDPath = profileDPath;
    }),
  ]);
  let profilePath =
    bazelSetup === undefined
      ? undefined
      : {
          nss_dbs_unchanged: bazelSetup.unchanged,
          ...(stateDir !== undefined && {
            nss_dbs_certutil_skipped: bazelSetup.byRecord,
          }),
        };
  if (failures.length === 0)
    logFeatureOk("agent_proxy_tool_trust", {
      reused: jvmStore === "reused",
      ...(jvmStore && {
        store: fromEnum(jvmStore),
      }),
      ...(seedState.used && {
        java_seed_retried: true,
      }),
      ...profilePath,
    });
  else {
    let outcome = failures[0];
    if (seedState.used || profilePath)
      logFeatureSad("agent_proxy_tool_trust", outcome, {
        ...(seedState.used && {
          java_seed_retried: true,
        }),
        ...profilePath,
      });
    else logFeatureSad("agent_proxy_tool_trust", outcome);
  }
  return result;
}
//@ chunk-awy329vy.js:48332-48418 placement
/**
 * 解析 keytool/certutil 的真实路径（配置优先，其次 PATH 查找）。
 */
async function resolveToolBinaryPath(configuredPath, fallback) {
  if (configuredPath)
    return realpath(configuredPath).catch(() => {
      return;
    });
  return (await fallback()) ?? undefined;
}
//@ chunk-awy329vy.js:48418-48642 placement
/**
 * 找 keytool：PATH 中与 JAVA_HOME/bin 下的候选，解析真实路径，优先选能找到 cacerts 的那个，否则返回第一个找到的。
 */
async function findKeytool() {
  let candidates = [
    await whichAsync("keytool"),
    env.JAVA_HOME ? join(env.JAVA_HOME, "bin", "keytool") : undefined,
  ];
  let firstFound;
  for (let candidate of candidates) {
    if (!candidate) continue;
    let resolved = await realpath(candidate).catch(() => {
      return;
    });
    if (!resolved) continue;
    firstFound ??= resolved;
    if (await findJdkCacerts(resolved)) return resolved;
  }
  return firstFound;
}
//@ chunk-awy329vy.js:48642-48825 placement
async function findJdkCacerts(keytoolPath) {
  let javaHome = dirname(dirname(keytoolPath));
  for (let candidate of [
    join(javaHome, "lib", "security", "cacerts"),
    join(javaHome, "jre", "lib", "security", "cacerts"),
  ]) {
    let resolved = await realpath(candidate).catch(() => {
      return;
    });
    if (resolved) return resolved;
  }
  return;
}
//@ chunk-awy329vy.js:48825-49081 placement
async function statTrustStore(storePath) {
  let handle;
  try {
    handle = await open(storePath, readOnlyNoFollowFlags());
    let stats = await handle.stat();
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
    await handle?.close().catch(() => {});
  }
}
//@ chunk-awy329vy.js:49081-49206 placement
function hasParsableSpki(pemText) {
  if (BLOCKED_ROOT_SPKI_SHA256.size === 0) return true;
  try {
    new X509Certificate(pemText).publicKey.export({
      type: "spki",
      format: "der",
    });
    return true;
  } catch {
    return false;
  }
}
//@ chunk-awy329vy.js:49477-49636 affinity
async function loadJdkCacerts(keytoolPath, out) {
  let filePath = await findJdkCacerts(keytoolPath);
  let storeLines =
    filePath === undefined ? undefined : await readLinesReverse_2(filePath, MAX_KEYTOOL_OUTPUT_LINES);
  if (filePath !== undefined && storeLines !== undefined)
    out.unshift({
      cacerts: filePath,
      store: storeLines,
    });
  return {
    cacerts: filePath,
    store: storeLines,
  };
}
//@ chunk-awy329vy.js:49636-50296 placement
/**
 * 解析 JKS 信任库的二进制结构，提取所有证书转为 PEM 并检查是否含被拒证书：clean（完整且干净）、part_written（截断/未写完）、failed_filter（格式不对或含被拒证书）。
 */
function inspectJksStore(buffer) {
  let pemCerts = [];
  let exactLength = false;
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
    let nextOffset = offset + JKS_ENTRY_HEADER_BYTES;
    if (nextOffset < buffer.length) return "failed_filter";
    exactLength = nextOffset === buffer.length;
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
  return exactLength ? "clean" : "part_written";
}
//@ chunk-awy329vy.js:50296-52161 placement
async function importIntoJvmTruststore(keytoolPath, cacerts, ccrCa, caFilePath, jdkStorePath, failures) {
  if (!cacerts) {
    logForDebugging(`[agent-proxy] no JDK cacerts found near ${keytoolPath}; skipping JVM truststore`);
    failures.push("jdk_cacerts_not_found");
    return;
  }
  let storePath = `${jdkStorePath}.${process.pid}.tmp`;
  await unlink(storePath).catch(() => {});
  let importResult = await runToolCommand(keytoolPath, [
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
  if (!importResult.ok) {
    logForDebugging(`[agent-proxy] keytool importkeystore failed: ${importResult.detail}`, {
      level: "warn",
    });
    failures.push("java_truststore_seed_failed");
    await unlink(storePath).catch(() => {});
    return;
  }
  let filterResult = await removeDeniedStoreEntries(keytoolPath, storePath);
  if (!filterResult.ok) {
    logForDebugging(`[agent-proxy] could not filter the JVM truststore: ${filterResult.detail}`, {
      level: "warn",
    });
    failures.push("java_truststore_filter_failed");
    await unlink(storePath).catch(() => {});
    return;
  }
  let certResult = await importCertToStore(keytoolPath, storePath, "ccr-agent-proxy", caFilePath);
  if (!certResult.ok) {
    logForDebugging(`[agent-proxy] keytool importcert failed: ${certResult.detail}`, {
      level: "warn",
    });
    failures.push("java_truststore_import_failed");
    await unlink(storePath).catch(() => {});
    return;
  }
  let secondCert = firstPemCertAfterDifferent(ccrCa);
  let secondOk = true;
  if (secondCert !== undefined) {
    let secondCertPath = `${storePath}.second.crt`;
    let secondImport = await writeFile(
      secondCertPath,
      `${secondCert}
`,
      "utf8",
    ).then(
      () => importCertToStore(keytoolPath, storePath, "ccr-agent-proxy-2", secondCertPath),
      (error) => ({
        ok: false,
        detail: errorMessage(error),
      }),
    );
    await unlink(secondCertPath).catch(() => {});
    if (!secondImport.ok) {
      logForDebugging(
        `[agent-proxy] could not import the second certificate: ${secondImport.detail}; the store holds the first only and is rebuilt on the next start`,
        {
          level: "warn",
        },
      );
      failures.push("java_truststore_second_import_failed");
      secondOk = false;
    }
  }
  let bundlePathForDenylist = getBundlePathForDenylist(jdkStorePath);
  await unlink(bundlePathForDenylist).catch(() => {});
  let storeDir = dirname(jdkStorePath);
  let stalePrefix = `${basename(jdkStorePath)}${CA_BUNDLE_V2_SUFFIX}-`;
  for (let staleName of await readdir(storeDir).catch(() => []))
    if (staleName.startsWith(stalePrefix)) await unlink(join(storeDir, staleName)).catch(() => {});
  try {
    await rename(storePath, jdkStorePath).catch(async () => {
      await writeFile(jdkStorePath, await readFile(storePath));
      await unlink(storePath).catch(() => {});
    });
  } catch (error) {
    logForDebugging(`[agent-proxy] could not move JVM truststore into place: ${errorMessage(error)}`, {
      level: "warn",
    });
    failures.push("java_truststore_publish_failed");
    await unlink(storePath).catch(() => {});
    return;
  }
  if (secondOk)
    await writeFile(bundlePathForDenylist, ccrCa, "utf8").catch((error) => {
      logForDebugging(`[agent-proxy] could not record the truststore's CA: ${errorMessage(error)}`);
    });
  logForDebugging(`[agent-proxy] JVM truststore built at ${jdkStorePath}`);
  return jdkStorePath;
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
        entry
          .match(PEM_CERT_BLOCK_RE)
          ?.some((pemCert) => !filteredPem.includes(pemCert) || !hasParsableSpki(pemCert)),
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
    let deleteResult = await runToolCommand(
      keytoolPath,
      ["-delete", "-alias", alias, "-keystore", storePath, "-storetype", "PKCS12", "-storepass", CHANGEIT_2],
      javaToolEnv(),
    );
    if (!deleteResult.ok) return deleteResult;
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
function importCertToStore(keytoolPath, storePath, alias, certPath) {
  return runToolCommand(keytoolPath, [
    "-importcert",
    "-noprompt",
    "-alias",
    alias,
    "-file",
    certPath,
    "-keystore",
    storePath,
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
    let listing = await listDeniedStoreAliases(keytool, storePath);
    stale = !listing.ok || listing.aliases.length > 0;
  }
  let currentState = await statTrustStore(storePath);
  let unchanged =
    currentState.state === "file" &&
    previousState.state === "file" &&
    currentState.identity === previousState.identity;
  let isStale = stale && (unchanged || currentState.state === "unusable");
  try {
    let bazelrc = await readFile(bazelrcPath, "utf8").catch((error) => {
      if (isENOENT(error)) return "";
      throw error;
    });
    let { block, rest } = splitBazelTrustBlock(bazelrc);
    if (
      (isStale && block.includes(storePath)) ||
      (otherStorePath !== undefined && block.includes(otherStorePath))
    ) {
      await writeFile(bazelrcPath, rest, "utf8");
      logForDebugging(`[agent-proxy] removed Bazel trust block from ${bazelrcPath}`);
    }
  } catch (error) {
    logForDebugging(`[agent-proxy] could not update ${bazelrcPath}: ${errorMessage(error)}`);
    failures.push("bazelrc_write_failed");
  }
  if (isStale && unchanged) await unlink(storePath).catch(() => {});
  return isStale;
}
//@ chunk-awy329vy.js:54136-54310 placement
function splitBazelTrustBlock(text) {
  let index = text.indexOf(CCR_BLOCK_START_MARKER);
  let index_2 = text.indexOf(CCR_BLOCK_END_MARKER);
  return index >= 0 && index_2 > index
    ? {
        block: text.slice(index, index_2 + CCR_BLOCK_END_MARKER.length),
        rest: text.slice(0, index) + text.slice(index_2 + CCR_BLOCK_END_MARKER.length).replace(/^\n/, ""),
      }
    : {
        block: "",
        rest: text,
      };
}
//@ chunk-awy329vy.js:54310-54933 placement
/**
 * 在 .bazelrc 中写入（替换）agent-proxy 信任块：用 startup --host_jvm_args 传递信任库参数（Bazel 内嵌 JDK 不读 JAVA_TOOL_OPTIONS）；读写失败记入失败列表。
 */
async function writeBazelTrustBlock(storePath, storeType, bazelrcPath, failures) {
  let joined = javaTrustStoreArgs(storePath, storeType)
    .map((arg) => `--host_jvm_args=${arg}`)
    .join(" ");
  let blockText = `${CCR_BLOCK_START_MARKER}
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
  let rest = splitBazelTrustBlock(current).rest.trimEnd();
  let next = rest
    ? `${rest}

${blockText}`
    : blockText;
  if (next === current) return;
  try {
    await writeFile(bazelrcPath, next, "utf8");
    logForDebugging(`[agent-proxy] wrote Bazel trust block to ${bazelrcPath}`);
  } catch (error) {
    logForDebugging(`[agent-proxy] could not write ${bazelrcPath}: ${errorMessage(error)}`);
    failures.push("bazelrc_write_failed");
  }
}
//@ chunk-awy329vy.js:54933-57088 placement
async function addToNssDb(dbDirParam, ccrCa, nssDirs, toolBinaryPath, stateDir, failures) {
  let addedCount = 0;
  let directoryCount = 0;
  let firstCert = ccrCa.match(PEM_CERT_BLOCK_RE)?.[0];
  let secondCert = firstPemCertAfterDifferent(ccrCa);
  let secondCertPath = `${dbDirParam}.${process.pid}.second`;
  let certs =
    firstCert === undefined ? undefined : secondCert === undefined ? [firstCert] : [firstCert, secondCert];
  if (secondCert !== undefined)
    await writeFile(
      secondCertPath,
      `${secondCert}
`,
      "utf8",
    ).catch(() => {});
  for (let dir of nssDirs) {
    let mkdirOutcome = await mkdir(dir, {
      recursive: true,
    }).then(
      (created) => (created === undefined ? "was_there" : "new"),
      (error) => {
        logForDebugging(`[agent-proxy] could not create NSS dir ${dir}: ${errorMessage(error)}`);
        return;
      },
    );
    if (mkdirOutcome === undefined) {
      failures.push("nss_add_failed");
      continue;
    }
    let dbDir = `sql:${dir}`;
    let recordPath = stateDir === undefined ? undefined : getNssDbPath(stateDir, dir);
    let fingerprint =
      recordPath === undefined || certs === undefined
        ? undefined
        : await fingerprintNssDb(dir, certs, toolBinaryPath);
    if (recordPath !== undefined && fingerprint !== undefined) {
      let caBundleFile = await readCaBundleFile(recordPath);
      if (caBundleFile.state === "read" && caBundleFile.text === fingerprint) {
        logForDebugging(
          `[agent-proxy] NSS DB at ${dir} matches the record of an earlier start that found the served certificates trusted; left as is without running certutil`,
        );
        addedCount++;
        directoryCount++;
        continue;
      }
    }
    if (
      mkdirOutcome === "was_there" &&
      certs !== undefined &&
      (await verifyNssDb(toolBinaryPath, dbDir, certs).catch((error) => {
        logForDebugging(
          `[agent-proxy] NSS check of ${dir} threw, taken as a difference: ${errorMessage(error)}`,
        );
        return false;
      }))
    ) {
      logForDebugging(
        `[agent-proxy] NSS DB at ${dir} already holds the served certificates, trusted; left as is`,
      );
      addedCount++;
      if (
        recordPath !== undefined &&
        fingerprint !== undefined &&
        (await fingerprintNssDb(dir, certs, toolBinaryPath)) === fingerprint
      )
        await writeFileAtomic(recordPath, fingerprint).catch((error) => {
          logForDebugging(
            `[agent-proxy] could not record the NSS check of ${dir}: ${errorMessage(error)}; the next start will run certutil again`,
          );
        });
      else if (recordPath !== undefined)
        logForDebugging(
          `[agent-proxy] NSS check of ${dir} not recorded: the directory ${fingerprint === undefined ? `has an entry that is not a regular file, more than ${MAX_NSS_ENTRIES} entries or ${MAX_NSS_DIR_BYTES / 1024 / 1024} MiB, or it or certutil could not be read` : "changed or became unreadable during the check"}; the next start will run certutil again`,
        );
      continue;
    }
    if (mkdirOutcome === "was_there") {
      await runToolCommand(toolBinaryPath, ["-D", "-d", dbDir, "-n", "ccr-agent-proxy"]);
      await runToolCommand(toolBinaryPath, ["-D", "-d", dbDir, "-n", "ccr-agent-proxy-2"]);
    }
    let addArgs = certutilAddArgs(dbDir, "ccr-agent-proxy", dbDirParam);
    let addResult = await runToolCommand(toolBinaryPath, addArgs);
    if (!addResult.ok) {
      await runToolCommand(toolBinaryPath, ["-N", "--empty-password", "-d", dbDir]);
      addResult = await runToolCommand(toolBinaryPath, addArgs);
    }
    if (addResult.ok) {
      logForDebugging(`[agent-proxy] MITM CA added to NSS DB at ${dir}`);
      if (secondCert !== undefined) {
        let secondResult = await runToolCommand(
          toolBinaryPath,
          certutilAddArgs(dbDir, "ccr-agent-proxy-2", secondCertPath),
        );
        if (!secondResult.ok) {
          logForDebugging(
            `[agent-proxy] could not add the second certificate to the NSS DB at ${dir}: ${secondResult.detail}; it holds the first only`,
          );
          failures.push("nss_second_add_failed");
        }
      }
    } else {
      logForDebugging(`[agent-proxy] certutil -A failed for ${dir}: ${addResult.detail}`);
      failures.push("nss_add_failed");
    }
  }
  await unlink(secondCertPath).catch(() => {});
  return {
    unchanged: addedCount,
    byRecord: directoryCount,
  };
}
//@ chunk-awy329vy.js:57088-57191 placement
function getNssDbPath(stateDir, caText) {
  let sliced = createHash("sha256").update(caText).digest("hex").slice(0, 16);
  return join(stateDir, `nssdb-${sliced}${NSS_CHECK_STAMP_SUFFIX}`);
}
//@ chunk-awy329vy.js:57191-57631 placement
/**
 * 计算 NSS 证书库的指纹：证书集合、证书包文件大小与修改时间、库目录各文件尾部内容；文件过多或读取失败时返回 undefined。
 */
async function fingerprintNssDb(dbDir, certs, stampPath) {
  let hash = createHash("sha256");
  hash.update(`${certs.length}\x00`);
  for (let certEntry of certs.map((encoded) => base64URLEncode(encoded).toString("base64")).sort())
    hash.update(`${certEntry}\x00`);
  try {
    let stampStats = await stat(stampPath);
    hash.update(`${stampPath}\x00${stampStats.size}\x00${stampStats.mtimeMs}\x00`);
    let sorted = (await readdir(dbDir)).sort();
    if (sorted.length > MAX_NSS_ENTRIES) return;
    let remainingBytes = MAX_NSS_DIR_BYTES;
    for (let fileName of sorted) {
      let linesReverse = await readLinesReverse_2(join(dbDir, fileName), remainingBytes);
      if (linesReverse === undefined) return;
      remainingBytes -= linesReverse.length;
      hash.update(`${fileName}\x00${linesReverse.length}\x00`);
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
function certutilAddArgs(dbDir, nickname, certPath) {
  return ["-A", "-d", dbDir, "-t", "C,,", "-n", nickname, "-i", certPath];
}
//@ chunk-awy329vy.js:57695-58305 placement
/**
 * 用 certutil 检查 NSS 库里 agent-proxy 证书条目：数量与信任标志符合预期，且导出的证书集合与期望完全一致。
 */
async function verifyNssDb(certutil, dbDir, certs) {
  let listResult = await runToolCommand(certutil, ["-L", "-d", dbDir]);
  if (!listResult.ok) return false;
  let mapped = listResult.stdout
    .split(
      `
`,
    )
    .map((line) => line.trim().split(/\s+/));
  let rows = ["ccr-agent-proxy", "ccr-agent-proxy-2"];
  for (let [index, nickname] of rows.entries()) {
    let mapped_2 = mapped
      .filter((row) => row.length === 2 && row[0] === nickname)
      .map((trustValues) => trustValues[1]);
    let expectCount = index < certs.length ? 1 : 0;
    if (mapped_2.length !== expectCount || mapped_2.some((trustValue) => trustValue !== "C,,")) return false;
  }
  let foundCerts = new Set();
  for (let nickname of rows.slice(0, certs.length)) {
    let certResult = await runToolCommand(certutil, ["-L", "-d", dbDir, "-n", nickname, "-a"]);
    if (!certResult.ok) return false;
    for (let pemBlock of certResult.stdout.match(PEM_CERT_BLOCK_RE) ?? [])
      foundCerts.add(base64URLEncode(pemBlock).toString("base64"));
  }
  let expected = new Set(certs.map((cert) => base64URLEncode(cert).toString("base64")));
  return (
    foundCerts.size === expected.size && [...expected].every((expectedCert) => foundCerts.has(expectedCert))
  );
}
//@ chunk-awy329vy.js:58305-58573 placement
/**
 * 为 gsutil 写入 .boto（ca_certificates_file 指向证书包），文件已存在则不覆盖，其他写失败记入失败列表。
 */
async function writeBotoConfig(caBundlePath, configPath, failures) {
  let content = `[Boto]
ca_certificates_file = ${caBundlePath}
`;
  try {
    await writeFile(configPath, content, {
      flag: "wx",
      mode: 420,
    });
    logForDebugging(`[agent-proxy] wrote ${configPath} for gsutil trust`);
  } catch (error) {
    if (getErrnoCode(error) === "EEXIST") return;
    logForDebugging(`[agent-proxy] could not write ${configPath}: ${errorMessage(error)}`);
    failures.push("boto_write_failed");
  }
}
//@ chunk-awy329vy.js:58573-59484 placement
async function writeLoginShellCaEnv(proxyState, profilePath, failures) {
  if (!proxyState.hasSystemCa) {
    await unlink(profilePath).catch(() => {});
    return;
  }
  let lines = [
    "# Managed by Claude Code (CCR agent-proxy). Re-exports CA-trust env",
    "# vars for login shells that start from a scrubbed environment. Each",
    "# export is set-if-absent so an explicit value in the shell wins.",
    "# HTTPS_PROXY is intentionally NOT set here: the relay port is",
    "# ephemeral and persisting it would break all HTTPS in login shells",
    "# once the relay process exits. Scrubbed login shells dial direct.",
    `if [ -r ${shellQuote(proxyState.caBundlePath)} ]; then`,
  ];
  for (let envVarName of [...CA_CERT_ENV_VARS_2, ...CA_CERT_ENV_VARS])
    lines.push("  " + exportEnvIfUnset(envVarName, proxyState.caBundlePath));
  for (let [key, value] of Object.entries(caCertEnvVarList)) lines.push("  " + exportEnvIfUnset(key, value));
  lines.push("fi");
  let script =
    lines.join(`
`) +
    `
`;
  try {
    await mkdir(dirname(profilePath), {
      recursive: true,
    });
    await writeFile(profilePath, script, {
      mode: 420,
    });
    logForDebugging(`[agent-proxy] wrote ${profilePath} for login-shell trust`);
    return profilePath;
  } catch (error) {
    logForDebugging(`[agent-proxy] could not write ${profilePath}: ${errorMessage(error)}`);
    failures.push("profile_d_write_failed");
    return;
  }
}
//@ chunk-awy329vy.js:59484-59569 placement
/**
 * 生成“未设置则设置并导出环境变量”的 shell 片段。
 */
function exportEnvIfUnset(name, value) {
  return `if [ -z "\${${name}:-}" ]; then ${name}=${shellQuote(value)}; fi; export ${name}`;
}
//@ chunk-awy329vy.js:59569-59621 placement (2.1.88 match: shellQuote, 1)
function shellQuote(s) {
  return `'${s.replace(/'/g, "'\\''")}'`;
}
//@ chunk-awy329vy.js:59621-59703 placement
/**
 * 从字符串里取第一张 PEM 证书（与首块不同时）。
 */
function firstPemCertAfterDifferent(caText) {
  let certs = caText.match(PEM_CERT_BLOCK_RE) ?? [];
  return certs.length === 2 && certs[1] !== certs[0] ? certs[1] : undefined;
}
//@ chunk-awy329vy.js:59703-59800 placement (2.1.88 match: base64URLEncode, 1)
function base64URLEncode(buffer) {
  return Buffer.from(buffer.replace(/-----(?:BEGIN|END) CERTIFICATE-----/g, ""), "base64");
}
//@ chunk-awy329vy.js:59800-60056 placement
/**
 * 以 20 秒超时运行外部命令（保留输出、不使用 cwd），返回 ok、stdout 与失败说明。
 */
async function runToolCommand(executable, argv, env) {
  let result = await execFileNoThrow(executable, argv, {
    timeout: 20000,
    preserveOutputOnError: true,
    useCwd: false,
    env,
  });
  if (result.code === 0)
    return {
      ok: true,
      stdout: result.stdout,
      detail: "",
    };
  return {
    ok: false,
    stdout: result.stdout,
    detail: `${result.error ?? `exit ${result.code}`} ${result.stderr.slice(0, 200)}`.trim(),
  };
}
export {
  configureToolTrust,
  buildJavaTrustOptions,
  firstPemCertAfterDifferent,
  logToolOutput,
  describeExecOutcome,
};
