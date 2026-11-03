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
  dirname,
  basename,
  basename as basename_2,
  basename as basename_3,
} from "path";
import {
  mkdir,
  mkdir as mkdir_2,
  mkdir as mkdir_3,
  writeFile,
  writeFile as writeFile_2,
  realpath,
  open,
  open as open_2,
  open as open_3,
  open as open_4,
  open as open_5,
  unlink,
  unlink as unlink_2,
  unlink as unlink_3,
  unlink as unlink_4,
  readdir,
  readdir as readdir_2,
  readdir as readdir_3,
  readdir as readdir_4,
  rename,
  rename as rename_2,
  rename as rename_3,
  readFile,
  readFile as readFile_2,
  readFile as readFile_3,
  stat,
  stat as stat_2,
  stat as stat_3,
} from "fs/promises";
import { homedir, homedir as homedir_2 } from "os";
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
import { Se, readCaBundleFile } from "./caBundle.js";
import { sleep } from "../utils/sleep.js";
import { getXDGDataHome } from "../utils/xdg.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { $c } from "../utils/platformTargets.js";
import { readLinesReverse_2 } from "../utils/fsOperations.js";
import { subprocessEnv } from "../utils/subprocessEnv.js";
import { writeFileAtomic } from "../utils/atomicPublishWrite.js";
import { CA_CERT_ENV_VARS, q_r, wve } from "../utils/settings/managedSettingsKeys.js";
import { execFileNoThrow } from "../utils/execFileNoThrow.js";

/**
 * 描述外部命令的运行结果：退出码、超时仍在运行、输出超限，或未能运行（附错误）。
 */
//@ chunk-awy329vy.js:44083-44302 placement
function describeExecOutcome(n) {
  if (n.exitCode !== void 0) return `exit status ${n.exitCode}`;
  if (n.timedOut) return "still running at the deadline";
  if (n.maxBufferExceeded) return "output over the cap";
  return `did not run (${n.error ?? "unknown"})`;
}
/**
 * 把外部工具的 stdout/stderr 合并后（超长截断）写入 agent-proxy 调试日志。
 */
//@ chunk-awy329vy.js:44302-44463 placement
function logToolOutput(n, e) {
  let trimmed = `${e.stdout}
${e.stderr}`.trim();
  if (!trimmed) return;
  if (trimmed.length > MAX_LOGGED_OUTPUT_CHARS)
    trimmed = `${trimmed.slice(0, MAX_LOGGED_OUTPUT_CHARS)}\u2026 (${trimmed.length} chars)`;
  logForDebugging(`[agent-proxy] ${n}: ${trimmed}`);
}
//@ chunk-awy329vy.js:44755-45013 placement
var CHANGEIT_2 = "changeit",
  fi = /[\s'"]/,
  Wn = "# >>> ccr-agent-proxy (managed by Claude Code) >>>",
  Ge = "# <<< ccr-agent-proxy <<<",
  jn = ".ca-v2",
  pi = 4277010157,
  gi = 33554432,
  hi = 2,
  mi = 2,
  yi = 20,
  _i = /^Your keystore contains 0 entries\s*$/m,
  wi = 3000,
  Yn = 16,
  Xn = 16777216,
  bi = ".checked-v1";
/**
 * 按拒绝证书列表（根证书/SPKI/泄露 CA 哈希）的摘要生成证书包文件名，使列表变化时文件名随之变化。
 */
//@ chunk-awy329vy.js:45013-45157 placement
function getBundlePathForDenylist(
  n,
  e = [...BLOCKED_ROOT_SHA256, ...BLOCKED_ROOT_SPKI_SHA256, ...LEAKED_CA_SPKI_SHA256],
) {
  let sliced = createHash_3("sha256")
    .update(
      [...e].sort().join(`
`),
    )
    .digest("hex")
    .slice(0, 16);
  return `${n}${jn}-${sliced}.pem`;
}
/**
 * 生成 JVM 信任库系统属性字符串（-Djavax.net.ssl.trustStore 等）并与已有 JAVA_TOOL_OPTIONS 合并；已有 trustStore 设置时原样保留。
 */
//@ chunk-awy329vy.js:45157-45292 placement
function buildJavaTrustOptions(n, e, r) {
  let o = r?.trim();
  if (o?.includes("javax.net.ssl.trustStore=")) return o;
  let joined = javaTrustStoreArgs(n, e).join(" ");
  return o ? `${joined} ${o}` : joined;
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
/**
 * 为 Java、NSS、Bazel、gsutil 等工具配置 CA 信任。
 */
//@ chunk-awy329vy.js:45518-48332 placement
async function configureToolTrust(n) {
  let e = [],
    r = { failureCodes: e },
    o = { used: !1 },
    s = join_4(n.stateDir, "agent-proxy-ca.crt");
  try {
    (await mkdir_3(n.stateDir, { recursive: !0 }), await writeFile_2(s, n.ccrCa, "utf8"));
  } catch (error) {
    return (
      logForDebugging(
        `[agent-proxy] tool trust setup skipped: cannot write CA file: ${errorMessage(error)}`,
        { level: "warn" },
      ),
      logFeatureBad("agent_proxy_tool_trust", "ca_file_write_failed"),
      r
    );
  }
  let h = await Dn(n.keytoolBin, findKeytool),
    l = await Dn(n.certutilBin, () => whichAsync("certutil")),
    u = (n.nssRecords ?? !env.CCR_AGENT_PROXY_NSS_RECORDS_DISABLED) ? n.stateDir : void 0,
    [p, y] = await Promise.all([
      (async () => {
        if (!h) {
          logForDebugging("[agent-proxy] no keytool found; skipping JVM truststore");
          return;
        }
        let T = join_4(n.stateDir, "java-truststore.p12"),
          S = n.bazelrcPath ?? "/etc/bazel.bazelrc",
          x,
          b = [],
          match = n.ccrCa.match(PEM_CERT_BLOCK_RE),
          v = async () => {
            let { cacerts: cacerts, store: store } = await loadJdkCacerts(h, b),
              I =
                store !== void 0 &&
                match !== null &&
                match.every((Y) => {
                  let X = base64URLEncode(Y);
                  return X.length >= 64 && X[0] === 48 && store.includes(X);
                }) &&
                inspectJksStore(store) === "clean";
            return { cacerts: cacerts, usable: I };
          },
          P = await v(),
          E = await statTrustStore(T),
          A = E.state === "file" && (await Se(getBundlePathForDenylist(T), n.ccrCa)) === "same";
        if (!P.usable && !A)
          (await n.systemTrust?.then(
            () => {},
            () => {},
          ),
            (P = await v()));
        if (P.cacerts && P.usable)
          (logForDebugging(`[agent-proxy] JDK truststore at ${P.cacerts} already holds the CA; using it`),
            (x = { path: P.cacerts, type: "JKS", source: "system" }));
        else if (A)
          (logForDebugging(`[agent-proxy] reusing JVM truststore at ${T}`),
            (x = { path: T, type: "PKCS12", source: "reused" }));
        else {
          let M = (Y) => importIntoJvmTruststore(h, P.cacerts, n.ccrCa, s, T, Y),
            R = [],
            I = await M(R);
          if (R[0] === "java_truststore_seed_failed")
            ((o.used = !0),
              logForDebugging("[agent-proxy] keytool seed failed; trying once more after a pause"),
              await (n.seedRetryPause?.() ?? sleep(wi)),
              (I = await M(e)));
          else e.push(...R);
          if (!I) {
            await loadJdkCacerts(h, b);
            for (let { cacerts: cacerts, store: store } of b) {
              let L = inspectJksStore(store);
              if (L !== "part_written") {
                r.rejectedJdkStorePath = L === "failed_filter" ? cacerts : void 0;
                break;
              }
            }
            if (await cleanupJavaTrust(h, T, E, r.rejectedJdkStorePath, S, e))
              r.retiredJavaTrustStorePath = T;
            return;
          }
          x = { path: I, type: "PKCS12", source: "built" };
        }
        if (fi.test(x.path)) {
          (logForDebugging(
            `[agent-proxy] truststore path contains JVM-unsafe characters; not emitting JAVA_TOOL_OPTIONS: ${x.path}`,
            { level: "warn" },
          ),
            e.push("jvm_unsafe_truststore_path"));
          return;
        }
        return (
          (r.javaTrustStorePath = x.path),
          (r.javaTrustStoreType = x.type),
          await writeBazelTrustBlock(x.path, x.type, S, e),
          x.source
        );
      })(),
      (async () => {
        if (!l) {
          logForDebugging("[agent-proxy] certutil not found; skipping NSS trust for browsers");
          return;
        }
        return addToNssDb(
          s,
          n.ccrCa,
          n.nssDbDirs ?? [join_4(homedir_2(), ".pki", "nssdb"), join_4(getXDGDataHome(), "pki", "nssdb")],
          l,
          u,
          e,
        );
      })(),
      writeBotoConfig(n.caBundlePath, n.botoConfigPath ?? join_4(homedir_2(), ".boto"), e),
      writeLoginShellCaEnv(n, n.profileDPath ?? "/etc/profile.d/ccr-agent-proxy-ca.sh", e).then((T) => {
        r.profileDPath = T;
      }),
    ]),
    w =
      y === void 0
        ? void 0
        : { nss_dbs_unchanged: y.unchanged, ...(u !== void 0 && { nss_dbs_certutil_skipped: y.byRecord }) };
  if (e.length === 0)
    logFeatureOk("agent_proxy_tool_trust", {
      reused: p === "reused",
      ...(p && { store: fromEnum(p) }),
      ...(o.used && { java_seed_retried: !0 }),
      ...w,
    });
  else {
    let T = e[0];
    if (o.used || w)
      logFeatureSad("agent_proxy_tool_trust", T, { ...(o.used && { java_seed_retried: !0 }), ...w });
    else logFeatureSad("agent_proxy_tool_trust", T);
  }
  return r;
}
//@ chunk-awy329vy.js:48332-48418 placement
async function Dn(n, e) {
  if (n)
    return realpath(n).catch(() => {
      return;
    });
  return (await e()) ?? void 0;
}
/**
 * 找 keytool：PATH 中与 JAVA_HOME/bin 下的候选，解析真实路径，优先选能找到 cacerts 的那个，否则返回第一个找到的。
 */
//@ chunk-awy329vy.js:48418-48642 placement
async function findKeytool() {
  let n = [await whichAsync("keytool"), env.JAVA_HOME ? join_4(env.JAVA_HOME, "bin", "keytool") : void 0],
    e;
  for (let r of n) {
    if (!r) continue;
    let o = await realpath(r).catch(() => {
      return;
    });
    if (!o) continue;
    if (((e ??= o), await findJdkCacerts(o))) return o;
  }
  return e;
}
//@ chunk-awy329vy.js:48642-48825 placement
async function findJdkCacerts(n) {
  let e = dirname(dirname(n));
  for (let r of [join_4(e, "lib", "security", "cacerts"), join_4(e, "jre", "lib", "security", "cacerts")]) {
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
    e = await open_5(n, $c());
    let stats = await e.stat();
    return stats.isFile()
      ? { state: "file", identity: `${stats.ino}:${stats.size}:${stats.mtimeMs}` }
      : { state: "unusable" };
  } catch (error) {
    return { state: isFsInaccessible(error) ? "unusable" : "unknown" };
  } finally {
    await e?.close().catch(() => {});
  }
}
//@ chunk-awy329vy.js:49081-49206 placement
function hasParsableSpki(n) {
  if (BLOCKED_ROOT_SPKI_SHA256.size === 0) return !0;
  try {
    return (new X509Certificate_4(n).publicKey.export({ type: "spki", format: "der" }), !0);
  } catch {
    return !1;
  }
}
//@ chunk-awy329vy.js:49477-49636 affinity
async function loadJdkCacerts(n, e) {
  let r = await findJdkCacerts(n),
    o = r === void 0 ? void 0 : await readLinesReverse_2(r, gi);
  if (r !== void 0 && o !== void 0) e.unshift({ cacerts: r, store: o });
  return { cacerts: r, store: o };
}
/**
 * 解析 JKS 信任库的二进制结构，提取所有证书转为 PEM 并检查是否含被拒证书：clean（完整且干净）、part_written（截断/未写完）、failed_filter（格式不对或含被拒证书）。
 */
//@ chunk-awy329vy.js:49636-50296 placement
function inspectJksStore(buffer) {
  let pemCerts = [],
    r = !1;
  try {
    if (buffer.readUInt32BE(0) !== pi || buffer.readUInt32BE(4) !== hi) return "failed_filter";
    let offset = 12;
    for (let uInt32BE = buffer.readUInt32BE(8); uInt32BE > 0; uInt32BE--) {
      if (buffer.readUInt32BE(offset) !== mi) return "failed_filter";
      ((offset += 4),
        (offset += 2 + buffer.readUInt16BE(offset)),
        (offset += 8),
        (offset += 2 + buffer.readUInt16BE(offset)));
      let uInt32BE = buffer.readUInt32BE(offset);
      if (((offset += 4), offset + uInt32BE > buffer.length)) return "part_written";
      let str = buffer.toString("base64", offset, offset + uInt32BE);
      (pemCerts.push(`-----BEGIN CERTIFICATE-----
${str}
-----END CERTIFICATE-----`),
        (offset += uInt32BE));
    }
    let s = offset + yi;
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
async function importIntoJvmTruststore(n, e, r, o, s, h) {
  if (!e) {
    (logForDebugging(`[agent-proxy] no JDK cacerts found near ${n}; skipping JVM truststore`),
      h.push("jdk_cacerts_not_found"));
    return;
  }
  let l = `${s}.${process.pid}.tmp`;
  await unlink_4(l).catch(() => {});
  let u = await runToolCommand(n, [
    "-importkeystore",
    "-noprompt",
    "-srckeystore",
    e,
    "-srcstorepass",
    CHANGEIT_2,
    "-destkeystore",
    l,
    "-deststoretype",
    "PKCS12",
    "-deststorepass",
    CHANGEIT_2,
  ]);
  if (!u.ok) {
    (logForDebugging(`[agent-proxy] keytool importkeystore failed: ${u.detail}`, { level: "warn" }),
      h.push("java_truststore_seed_failed"),
      await unlink_4(l).catch(() => {}));
    return;
  }
  let p = await removeDeniedStoreEntries(n, l);
  if (!p.ok) {
    (logForDebugging(`[agent-proxy] could not filter the JVM truststore: ${p.detail}`, { level: "warn" }),
      h.push("java_truststore_filter_failed"),
      await unlink_4(l).catch(() => {}));
    return;
  }
  let y = await importCertToStore(n, l, "ccr-agent-proxy", o);
  if (!y.ok) {
    (logForDebugging(`[agent-proxy] keytool importcert failed: ${y.detail}`, { level: "warn" }),
      h.push("java_truststore_import_failed"),
      await unlink_4(l).catch(() => {}));
    return;
  }
  let w = Ee(r),
    T = !0;
  if (w !== void 0) {
    let C = `${l}.second.crt`,
      v = await writeFile_2(
        C,
        `${w}
`,
        "utf8",
      ).then(
        () => importCertToStore(n, l, "ccr-agent-proxy-2", C),
        (P) => ({ ok: !1, detail: errorMessage(P) }),
      );
    if ((await unlink_4(C).catch(() => {}), !v.ok))
      (logForDebugging(
        `[agent-proxy] could not import the second certificate: ${v.detail}; the store holds the first only and is rebuilt on the next start`,
        { level: "warn" },
      ),
        h.push("java_truststore_second_import_failed"),
        (T = !1));
  }
  let S = getBundlePathForDenylist(s);
  await unlink_4(S).catch(() => {});
  let x = dirname(s),
    b = `${basename_3(s)}${jn}-`;
  for (let C of await readdir_4(x).catch(() => []))
    if (C.startsWith(b)) await unlink_4(join_4(x, C)).catch(() => {});
  try {
    await rename_3(l, s).catch(async () => {
      (await writeFile_2(s, await readFile_3(l)), await unlink_4(l).catch(() => {}));
    });
  } catch (error) {
    (logForDebugging(`[agent-proxy] could not move JVM truststore into place: ${errorMessage(error)}`, {
      level: "warn",
    }),
      h.push("java_truststore_publish_failed"),
      await unlink_4(l).catch(() => {}));
    return;
  }
  if (T)
    await writeFile_2(S, r, "utf8").catch((C) => {
      logForDebugging(`[agent-proxy] could not record the truststore's CA: ${errorMessage(C)}`);
    });
  return (logForDebugging(`[agent-proxy] JVM truststore built at ${s}`), s);
}
//@ chunk-awy329vy.js:52161-52237 placement
function Zn() {
  return { ...subprocessEnv(), _JAVA_OPTIONS: void 0, JAVA_TOOL_OPTIONS: void 0 };
}
/**
 * 用 keytool 列出 PKCS12 信任库条目，找出含被拒证书或无法解析 SPKI 的条目别名；列表无法使用时返回失败。
 */
//@ chunk-awy329vy.js:52237-52803 placement
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
    Zn(),
  );
  if (!result.ok) return { ok: !1, detail: result.detail, aliases: [] };
  let entries = result.stdout.split(/^Alias name: /m).slice(1),
    filteredPem = withoutBlockedCerts(result.stdout, "agent proxy trust");
  if (
    filteredPem === void 0 ||
    (entries.length === 0 && !_i.test(result.stdout)) ||
    entries.some((l) => !l.match(PEM_CERT_BLOCK_RE))
  )
    return { ok: !1, detail: `no usable listing (${entries.length} entries read)`, aliases: [] };
  return {
    ok: !0,
    detail: "",
    aliases: entries
      .filter((l) => l.match(PEM_CERT_BLOCK_RE)?.some((u) => !filteredPem.includes(u) || !hasParsableSpki(u)))
      .map((l) =>
        l
          .slice(
            0,
            l.indexOf(`
`),
          )
          .trimEnd(),
      ),
  };
}
/**
 * 删除信任库中被拒或不可读的条目（拒绝以 - 开头的别名），删除后复查，仍有剩余则返回失败。
 */
//@ chunk-awy329vy.js:52803-53337 placement
async function removeDeniedStoreEntries(keytoolPath, storePath) {
  let listing = await listDeniedStoreAliases(keytoolPath, storePath);
  if (!listing.ok || listing.aliases.length === 0) return listing;
  if (listing.aliases.some((aliase) => aliase.startsWith("-")))
    return { ok: !1, detail: "an entry to remove has an unsafe alias" };
  logForDebugging(
    `[agent-proxy] removing ${listing.aliases.length} denied or unreadable entries from the JVM truststore`,
  );
  for (let aliase of listing.aliases) {
    let h = await runToolCommand(
      keytoolPath,
      ["-delete", "-alias", aliase, "-keystore", storePath, "-storetype", "PKCS12", "-storepass", CHANGEIT_2],
      Zn(),
    );
    if (!h.ok) return h;
  }
  let remaining = await listDeniedStoreAliases(keytoolPath, storePath);
  return remaining.ok && remaining.aliases.length > 0
    ? { ok: !1, detail: `${remaining.aliases.length} entries remain` }
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
/**
 * 判断旧的 JVM 信任库是否应作废（证书包读取失败/变化或库里有被拒条目），从 .bazelrc 中移除指向它的信任块，并在确认是同一文件时删除；返回是否已作废。
 */
//@ chunk-awy329vy.js:53472-54136 placement
async function cleanupJavaTrust(keytool, storePath, previousState, otherStorePath, bazelrcPath, failures) {
  let l = await readCaBundleFile(getBundlePathForDenylist(storePath)),
    stale =
      previousState.state !== "unknown" &&
      l.state !== "failed" &&
      !(previousState.state === "file" && l.state === "read");
  if (stale && previousState.state === "file") {
    let T = await listDeniedStoreAliases(keytool, storePath);
    stale = !T.ok || T.aliases.length > 0;
  }
  let currentState = await statTrustStore(storePath),
    y =
      currentState.state === "file" &&
      previousState.state === "file" &&
      currentState.identity === previousState.identity,
    w = stale && (y || currentState.state === "unusable");
  try {
    let T = await readFile_3(bazelrcPath, "utf8").catch((b) => {
        if (isENOENT(b)) return "";
        throw b;
      }),
      { block: block, rest: rest } = splitBazelTrustBlock(T);
    if ((w && block.includes(storePath)) || (otherStorePath !== void 0 && block.includes(otherStorePath)))
      (await writeFile_2(bazelrcPath, rest, "utf8"),
        logForDebugging(`[agent-proxy] removed Bazel trust block from ${bazelrcPath}`));
  } catch (error) {
    (logForDebugging(`[agent-proxy] could not update ${bazelrcPath}: ${errorMessage(error)}`),
      failures.push("bazelrc_write_failed"));
  }
  if (w && y) await unlink_4(storePath).catch(() => {});
  return w;
}
//@ chunk-awy329vy.js:54136-54310 placement
function splitBazelTrustBlock(n) {
  let index = n.indexOf(Wn),
    index_2 = n.indexOf(Ge);
  return index >= 0 && index_2 > index
    ? {
        block: n.slice(index, index_2 + Ge.length),
        rest: n.slice(0, index) + n.slice(index_2 + Ge.length).replace(/^\n/, ""),
      }
    : { block: "", rest: n };
}
/**
 * 在 .bazelrc 中写入（替换）agent-proxy 信任块：用 startup --host_jvm_args 传递信任库参数（Bazel 内嵌 JDK 不读 JAVA_TOOL_OPTIONS）；读写失败记入失败列表。
 */
//@ chunk-awy329vy.js:54310-54933 placement
async function writeBazelTrustBlock(storePath, storeType, bazelrcPath, failures) {
  let joined = javaTrustStoreArgs(storePath, storeType)
      .map((y) => `--host_jvm_args=${y}`)
      .join(" "),
    h = `${Wn}
# Bazel's repository downloader runs on its embedded JDK and ignores
# JAVA_TOOL_OPTIONS; carry the agent-proxy truststore via startup options.
startup ${joined}
${Ge}
`,
    current;
  try {
    current = await readFile_3(bazelrcPath, "utf8");
  } catch (error) {
    if (!isENOENT(error)) {
      (logForDebugging(`[agent-proxy] could not read ${bazelrcPath}: ${errorMessage(error)}`),
        failures.push("bazelrc_write_failed"));
      return;
    }
    current = "";
  }
  let trimEnd = splitBazelTrustBlock(current).rest.trimEnd(),
    p = trimEnd
      ? `${trimEnd}

${h}`
      : h;
  if (p === current) return;
  try {
    (await writeFile_2(bazelrcPath, p, "utf8"),
      logForDebugging(`[agent-proxy] wrote Bazel trust block to ${bazelrcPath}`));
  } catch (error) {
    (logForDebugging(`[agent-proxy] could not write ${bazelrcPath}: ${errorMessage(error)}`),
      failures.push("bazelrc_write_failed"));
  }
}
//@ chunk-awy329vy.js:54933-57088 placement
async function addToNssDb(n, e, r, o, s, h) {
  let l = 0,
    u = 0,
    p = e.match(PEM_CERT_BLOCK_RE)?.[0],
    y = Ee(e),
    w = `${n}.${process.pid}.second`,
    T = p === void 0 ? void 0 : y === void 0 ? [p] : [p, y];
  if (y !== void 0)
    await writeFile_2(
      w,
      `${y}
`,
      "utf8",
    ).catch(() => {});
  for (let S of r) {
    let x = await mkdir_3(S, { recursive: !0 }).then(
      (A) => (A === void 0 ? "was_there" : "new"),
      (A) => {
        logForDebugging(`[agent-proxy] could not create NSS dir ${S}: ${errorMessage(A)}`);
        return;
      },
    );
    if (x === void 0) {
      h.push("nss_add_failed");
      continue;
    }
    let b = `sql:${S}`,
      C = s === void 0 ? void 0 : getNssDbPath(s, S),
      v = C === void 0 || T === void 0 ? void 0 : await fingerprintNssDb(S, T, o);
    if (C !== void 0 && v !== void 0) {
      let A = await readCaBundleFile(C);
      if (A.state === "read" && A.text === v) {
        (logForDebugging(
          `[agent-proxy] NSS DB at ${S} matches the record of an earlier start that found the served certificates trusted; left as is without running certutil`,
        ),
          l++,
          u++);
        continue;
      }
    }
    if (
      x === "was_there" &&
      T !== void 0 &&
      (await verifyNssDb(o, b, T).catch(
        (A) => (
          logForDebugging(`[agent-proxy] NSS check of ${S} threw, taken as a difference: ${errorMessage(A)}`),
          !1
        ),
      ))
    ) {
      if (
        (logForDebugging(
          `[agent-proxy] NSS DB at ${S} already holds the served certificates, trusted; left as is`,
        ),
        l++,
        C !== void 0 && v !== void 0 && (await fingerprintNssDb(S, T, o)) === v)
      )
        await writeFileAtomic(C, v).catch((A) => {
          logForDebugging(
            `[agent-proxy] could not record the NSS check of ${S}: ${errorMessage(A)}; the next start will run certutil again`,
          );
        });
      else if (C !== void 0)
        logForDebugging(
          `[agent-proxy] NSS check of ${S} not recorded: the directory ${v === void 0 ? `has an entry that is not a regular file, more than ${Yn} entries or ${Xn / 1024 / 1024} MiB, or it or certutil could not be read` : "changed or became unreadable during the check"}; the next start will run certutil again`,
        );
      continue;
    }
    if (x === "was_there")
      (await runToolCommand(o, ["-D", "-d", b, "-n", "ccr-agent-proxy"]),
        await runToolCommand(o, ["-D", "-d", b, "-n", "ccr-agent-proxy-2"]));
    let P = Mn(b, "ccr-agent-proxy", n),
      E = await runToolCommand(o, P);
    if (!E.ok)
      (await runToolCommand(o, ["-N", "--empty-password", "-d", b]), (E = await runToolCommand(o, P)));
    if (E.ok) {
      if ((logForDebugging(`[agent-proxy] MITM CA added to NSS DB at ${S}`), y !== void 0)) {
        let A = await runToolCommand(o, Mn(b, "ccr-agent-proxy-2", w));
        if (!A.ok)
          (logForDebugging(
            `[agent-proxy] could not add the second certificate to the NSS DB at ${S}: ${A.detail}; it holds the first only`,
          ),
            h.push("nss_second_add_failed"));
      }
    } else
      (logForDebugging(`[agent-proxy] certutil -A failed for ${S}: ${E.detail}`), h.push("nss_add_failed"));
  }
  return (await unlink_4(w).catch(() => {}), { unchanged: l, byRecord: u });
}
//@ chunk-awy329vy.js:57088-57191 placement
function getNssDbPath(n, e) {
  let sliced = createHash_3("sha256").update(e).digest("hex").slice(0, 16);
  return join_4(n, `nssdb-${sliced}${bi}`);
}
/**
 * 计算 NSS 证书库的指纹：证书集合、证书包文件大小与修改时间、库目录各文件尾部内容；文件过多或读取失败时返回 undefined。
 */
//@ chunk-awy329vy.js:57191-57631 placement
async function fingerprintNssDb(n, e, r) {
  let o = createHash_3("sha256");
  o.update(`${e.length}\x00`);
  for (let s of e.map((h) => base64URLEncode(h).toString("base64")).sort()) o.update(`${s}\x00`);
  try {
    let s = await stat_3(r);
    o.update(`${r}\x00${s.size}\x00${s.mtimeMs}\x00`);
    let sorted = (await readdir_4(n)).sort();
    if (sorted.length > Yn) return;
    let l = Xn;
    for (let u of sorted) {
      let p = await readLinesReverse_2(join_4(n, u), l);
      if (p === void 0) return;
      ((l -= p.length), o.update(`${u}\x00${p.length}\x00`), o.update(p));
    }
  } catch {
    return;
  }
  return o.digest("hex");
}
//@ chunk-awy329vy.js:57631-57695 placement
function Mn(n, e, r) {
  return ["-A", "-d", n, "-t", "C,,", "-n", e, "-i", r];
}
/**
 * 用 certutil 检查 NSS 库里 agent-proxy 证书条目：数量与信任标志符合预期，且导出的证书集合与期望完全一致。
 */
//@ chunk-awy329vy.js:57695-58305 placement
async function verifyNssDb(certutil, dbDir, certs) {
  let o = await runToolCommand(certutil, ["-L", "-d", dbDir]);
  if (!o.ok) return !1;
  let mapped = o.stdout
      .split(
        `
`,
      )
      .map((p) => p.trim().split(/\s+/)),
    h = ["ccr-agent-proxy", "ccr-agent-proxy-2"];
  for (let [p, y] of h.entries()) {
    let mapped_2 = mapped.filter((S) => S.length === 2 && S[0] === y).map((S) => S[1]),
      T = p < certs.length ? 1 : 0;
    if (mapped_2.length !== T || mapped_2.some((S) => S !== "C,,")) return !1;
  }
  let l = new Set();
  for (let p of h.slice(0, certs.length)) {
    let y = await runToolCommand(certutil, ["-L", "-d", dbDir, "-n", p, "-a"]);
    if (!y.ok) return !1;
    for (let w of y.stdout.match(PEM_CERT_BLOCK_RE) ?? []) l.add(base64URLEncode(w).toString("base64"));
  }
  let u = new Set(certs.map((p) => base64URLEncode(p).toString("base64")));
  return l.size === u.size && [...u].every((p) => l.has(p));
}
/**
 * 为 gsutil 写入 .boto（ca_certificates_file 指向证书包），文件已存在则不覆盖，其他写失败记入失败列表。
 */
//@ chunk-awy329vy.js:58305-58573 placement
async function writeBotoConfig(n, e, r) {
  let o = `[Boto]
ca_certificates_file = ${n}
`;
  try {
    (await writeFile_2(e, o, { flag: "wx", mode: 420 }),
      logForDebugging(`[agent-proxy] wrote ${e} for gsutil trust`));
  } catch (error) {
    if (getErrnoCode(error) === "EEXIST") return;
    (logForDebugging(`[agent-proxy] could not write ${e}: ${errorMessage(error)}`),
      r.push("boto_write_failed"));
  }
}
//@ chunk-awy329vy.js:58573-59484 placement
async function writeLoginShellCaEnv(n, e, r) {
  if (!n.hasSystemCa) {
    await unlink_4(e).catch(() => {});
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
  for (let h of [...CA_CERT_ENV_VARS, ...q_r]) o.push("  " + Hn(h, n.caBundlePath));
  for (let [h, l] of Object.entries(wve)) o.push("  " + Hn(h, l));
  o.push("fi");
  let s =
    o.join(`
`) +
    `
`;
  try {
    return (
      await mkdir_3(dirname(e), { recursive: !0 }),
      await writeFile_2(e, s, { mode: 420 }),
      logForDebugging(`[agent-proxy] wrote ${e} for login-shell trust`),
      e
    );
  } catch (error) {
    (logForDebugging(`[agent-proxy] could not write ${e}: ${errorMessage(error)}`),
      r.push("profile_d_write_failed"));
    return;
  }
}
//@ chunk-awy329vy.js:59484-59569 placement
function Hn(n, e) {
  return `if [ -z "\${${n}:-}" ]; then ${n}=${shellQuote(e)}; fi; export ${n}`;
}
//@ chunk-awy329vy.js:59569-59621 placement = shellQuote (1)
function shellQuote(s) {
  return `'${s.replace(/'/g, "'\\''")}'`;
}
//@ chunk-awy329vy.js:59621-59703 placement
function Ee(n) {
  let e = n.match(PEM_CERT_BLOCK_RE) ?? [];
  return e.length === 2 && e[1] !== e[0] ? e[1] : void 0;
}
//@ chunk-awy329vy.js:59703-59800 placement = base64URLEncode (1)
function base64URLEncode(buffer) {
  return Buffer.from(buffer.replace(/-----(?:BEGIN|END) CERTIFICATE-----/g, ""), "base64");
}
/**
 * 以 20 秒超时运行外部命令（保留输出、不使用 cwd），返回 ok、stdout 与失败说明。
 */
//@ chunk-awy329vy.js:59800-60056 placement
async function runToolCommand(n, e, r) {
  let o = await execFileNoThrow(n, e, { timeout: 20000, preserveOutputOnError: !0, useCwd: !1, env: r });
  if (o.code === 0) return { ok: !0, stdout: o.stdout, detail: "" };
  return {
    ok: !1,
    stdout: o.stdout,
    detail: `${o.error ?? `exit ${o.code}`} ${o.stderr.slice(0, 200)}`.trim(),
  };
}

export { configureToolTrust, buildJavaTrustOptions, Ee, logToolOutput, describeExecOutcome };
