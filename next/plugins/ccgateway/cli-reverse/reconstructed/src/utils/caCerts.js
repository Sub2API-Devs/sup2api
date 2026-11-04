/**
 * utils/caCerts.ts
 *
 * CA 证书缓存的清理。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/caCerts.ts
 * pieces: chunk-hq88884p.js (41)
 * attribution: placement 40, fingerprint 1
 */
import * as tlsModule_2 from "tls";
import { memoizeAlias } from "../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { HostScoped } from "./hostScoped.js";
import { getRootSession } from "../bootstrap/state.js";
import { serializeCalls } from "./promiseQueue.js";
import { hasCaEnvOverride } from "./anthropicHosts.js";
import { env } from "./env.js";
import { getFsImplementation } from "./fsOperations.js";
import { logForDebugging } from "./debug.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { hasNodeOption } from "./envUtils.js";
import { importMetaRequire } from "../../runtime/bun-runtime.js";
import { count, uniq } from "./collections.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "./errors.js";
import { identity } from "./identity.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-hq88884p.js:28542-28581 placement (2.1.88 match: filterToBundledAndMcp, 0.596)
/**
 * 一次性告警去重集合。
 */
var DEFAULT_CA_CERT_SOURCES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var warnedCaKeys;
deferInit("chunk-hq88884p.js:28542", () => {
  DEFAULT_CA_CERT_SOURCES = ["bundled", "system"];
  warnedCaKeys = new Set();
});
//@ chunk-hq88884p.js:28581-28637 placement
/**
 * 同一类 CA 证书告警只打印一次。
 */
function warnOnceCa(warningKey) {
  if (warnedCaKeys.has(warningKey)) return false;
  warnedCaKeys.add(warningKey);
  return true;
}
//@ chunk-hq88884p.js:28637-28890 placement
class CaCertState {
  extraCACerts = null;
  certificates = memoizeAlias((input) => refreshCaState(this, input));
  runtimeStoreBundles = new WeakSet();
  customerLists = new WeakMap();
  trustOverrideSeen = false;
  storeCertificates = undefined;
  tenantLists = new WeakMap();
  fromHost = null;
  warnedExtraCerts = new Set();
  refusesBundledFallback = false;
}
//@ chunk-hq88884p.js:28890-28915 placement
/**
 * 按宿主隔离的 CA 证书状态缓存。
 */
var caCertStateByHost; // deferred: uses CaCertState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-hq88884p.js:28890", () => {
  caCertStateByHost = new HostScoped(() => new CaCertState());
});
//@ chunk-hq88884p.js:28915-28951 placement
/**
 * 取出当前宿主的 CA 证书状态。
 */
function getCaCertState() {
  return caCertStateByHost.of(getRootSession().host);
}
//@ chunk-hq88884p.js:28951-29505 placement
var loadExtraCACerts; // deferred: uses getCaCertState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-hq88884p.js:28951", () => {
  loadExtraCACerts = serializeCalls(async () => {
    let caCertState = getCaCertState();
    caCertState.trustOverrideSeen ||= hasCaEnvOverride();
    if (caCertState.fromHost) return false;
    let extraCertsPath = env.NODE_EXTRA_CA_CERTS;
    if (!extraCertsPath) {
      if (caCertState.extraCACerts !== null) {
        caCertState.extraCACerts = null;
        clearCACertsCache_2(caCertState);
        return true;
      }
      return false;
    }
    try {
      let content = await getFsImplementation().readFile(extraCertsPath, {
        encoding: "utf8",
      });
      if (caCertState.extraCACerts?.path === extraCertsPath && caCertState.extraCACerts.content === content)
        return false;
      caCertState.extraCACerts = {
        path: extraCertsPath,
        content,
      };
    } catch (error) {
      logForDebugging(`CA certs: Failed to read NODE_EXTRA_CA_CERTS file (${extraCertsPath}): ${error}`, {
        level: "error",
      });
      if (warnOnceCa("read_failed")) logFeatureBad("ca_certs_load", "read_failed");
      if (caCertState.extraCACerts === null) return false;
      caCertState.extraCACerts = null;
    }
    clearCACertsCache_2(caCertState);
    return true;
  });
});
//@ chunk-hq88884p.js:29505-30014 placement
/**
 * 解析 CLAUDE_CODE_CERT_STORE（bundled/system）。
 */
function certStoreSources() {
  let CLAUDE_CODE_CERT_STORE = env.CLAUDE_CODE_CERT_STORE;
  if (CLAUDE_CODE_CERT_STORE) {
    let sources = [];
    for (let part of CLAUDE_CODE_CERT_STORE.split(",")) {
      let lower = part.trim().toLowerCase();
      if (lower === "bundled" || lower === "system") {
        if (!sources.includes(lower)) sources.push(lower);
      } else if (lower) {
        logForDebugging(`CA certs: unrecognized CLAUDE_CODE_CERT_STORE source '${lower}', ignoring`, {
          level: "warn",
        });
        if (warnOnceCa("parse_skip")) logFeatureSad("ca_certs_load", "parse_skip");
      }
    }
    if (sources.length === 0 && warnOnceCa("parse_all_invalid"))
      logFeatureSad("ca_certs_load", "parse_all_invalid");
    return sources.length > 0 ? sources : DEFAULT_CA_CERT_SOURCES;
  }
  if (hasNodeOption("--use-system-ca") || hasNodeOption("--use-openssl-ca")) return ["system"];
  return DEFAULT_CA_CERT_SOURCES;
}
//@ chunk-hq88884p.js:30014-30466 placement
/**
 * 去掉已过期的证书。
 */
function dropExpiredCerts(certs, nowMs = Date.now(), parsedByPem) {
  let { X509Certificate } = importMetaRequire("crypto");
  let expiredCount = 0;
  let filtered = certs.filter((pem) => {
    try {
      let cert = new X509Certificate(pem);
      let time = new Date(cert.validTo).getTime();
      if (Number.isNaN(time) || time > nowMs) {
        if (
          parsedByPem &&
          !cert.checkIssued(cert) &&
          !(cert.subject === cert.issuer && cert.verify(cert.publicKey))
        )
          parsedByPem.set(pem, cert);
        return true;
      }
      expiredCount++;
      return false;
    } catch {
      return true;
    }
  });
  if (expiredCount > 0) {
    logForDebugging(`CA certs: Dropped ${expiredCount} expired certificate(s) from system store`);
    if (warnOnceCa("expired_dropped"))
      logFeatureSad("ca_certs_load", "expired_dropped", {
        dropped_count: expiredCount,
      });
  }
  return filtered;
}
//@ chunk-hq88884p.js:30466-30505 placement
var buffer; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-hq88884p.js:30466", () => {
  buffer = Buffer.from("0603551d0e", "hex");
});
//@ chunk-hq88884p.js:30505-30666 placement
function extractDerField(raw, marker) {
  let index = raw.indexOf(marker);
  let index_2 = raw.indexOf(buffer, index === -1 ? 0 : index + marker.length);
  if (index_2 === -1) return;
  let lenOffset = index_2 + buffer.length;
  let endOffset = raw[lenOffset] === 1 ? lenOffset + 3 : lenOffset;
  return raw.subarray(lenOffset, endOffset + 2 + (raw[endOffset + 1] ?? 0));
}
//@ chunk-hq88884p.js:30666-33141 placement
/**
 * 选出有锚点的证书链。
 */
function chooseAnchoredCerts(pems, parsedByPem, otherParsed) {
  let unchanged = {
    list: pems,
    alone: pems,
  };
  try {
    let singlePemCerts = new Map();
    let certsBySubject = new Map();
    for (let pem of pems) {
      let cert = parsedByPem.get(pem);
      if (cert && pemSpans(pem).length === 1) {
        singlePemCerts.set(pem, cert);
        let subjectKey = formatShortcut(cert.subject ?? "");
        certsBySubject.set(subjectKey, [...(certsBySubject.get(subjectKey) ?? []), cert]);
      }
    }
    let now = Date.now();
    let issuersOf = new Map();
    for (let cert of singlePemCerts.values())
      issuersOf.set(
        cert,
        (certsBySubject.get(formatShortcut(cert.issuer ?? "")) ?? []).filter(
          (candidate) =>
            candidate !== cert &&
            !(new Date(candidate.validTo).getTime() <= now) &&
            cert.checkIssued(candidate),
        ),
      );
    let filtered = [...singlePemCerts.values()].filter((cert) => {
      let visited = new Set();
      let stack = [...(issuersOf.get(cert) ?? [])];
      while (stack.length > 0) {
        let issuer = stack.pop();
        if (issuer === cert) return Boolean(cert.subject);
        if (issuer && !visited.has(issuer)) {
          visited.add(issuer);
          stack.push(...(issuersOf.get(issuer) ?? []));
        }
      }
      return false;
    });
    if (filtered.length === 0) return unchanged;
    let { X509Certificate } = importMetaRequire("crypto");
    let parseFailed = false;
    let [systemCerts = [], extraCerts = []] = [
      pems.filter((pem) => !singlePemCerts.has(pem)),
      otherParsed,
    ].map((list) =>
      list.flatMap((block) =>
        pemSpans(block).flatMap(([start, end]) => {
          try {
            return [new X509Certificate(block.slice(start, end))];
          } catch {
            parseFailed = true;
            return [];
          }
        }),
      ),
    );
    if (parseFailed) {
      logForDebugging(
        "CA certs: Left cross-certificates that loop in the system store: a certificate in the CA list does not parse",
      );
      return unchanged;
    }
    let allCerts = [...systemCerts, ...extraCerts, ...singlePemCerts.values()];
    let loops = new Set();
    for (let cert of filtered)
      try {
        let time = new Date(cert.validTo).getTime();
        let spkiDer = cert.publicKey.export({
          type: "spki",
          format: "der",
        });
        let derField = extractDerField(cert.raw, spkiDer);
        let found = systemCerts.find((systemCert) => {
          if (
            systemCert.subject !== cert.subject ||
            !systemCert.ca ||
            !(new Date(systemCert.validFrom).getTime() <= now) ||
            !(new Date(systemCert.validTo).getTime() > now) ||
            !(new Date(systemCert.validTo).getTime() >= time)
          )
            return false;
          let systemSpki = systemCert.publicKey.export({
            type: "spki",
            format: "der",
          });
          let derField_2 = extractDerField(systemCert.raw, systemSpki);
          return (
            systemSpki.equals(spkiDer) &&
            (derField_2 === undefined || (derField !== undefined && derField_2.equals(derField))) &&
            systemCert.checkIssued(systemCert) &&
            systemCert.verify(systemCert.publicKey)
          );
        });
        let subjectKey = formatShortcut(cert.subject);
        if (
          found &&
          !allCerts.some(
            (other) =>
              other !== cert &&
              formatShortcut(other.issuer ?? "") === subjectKey &&
              other.checkIssued(cert) &&
              !other.checkIssued(found),
          )
        )
          loops.add(cert);
      } catch (error) {
        logForDebugging(
          `CA certs: Left a cross-certificate that loops in the system store (${`${cert.subject}`.replaceAll(
            `
`,
            ", ",
          )}): ${error}`,
          {
            level: "error",
          },
        );
      }
    if (loops.size === 0) return unchanged;
    let extraFingerprints = new Set(extraCerts.map((cert) => cert.fingerprint256));
    let droppable = new Set([...loops].filter((cert) => !extraFingerprints.has(cert.fingerprint256)));
    if (droppable.size < loops.size)
      logForDebugging(
        `CA certs: Kept ${loops.size - droppable.size} cross-certificate(s) that certify each other in a loop in the system store: NODE_EXTRA_CA_CERTS lists them too`,
      );
    if (droppable.size > 0) {
      logForDebugging(
        `CA certs: Dropped ${droppable.size} cross-certificate(s) from system store that certify each other in a loop beside their root: ${[
          ...droppable,
        ]
          .map((cert) =>
            `${cert.subject}`.replaceAll(
              `
`,
              ", ",
            ),
          )
          .join("; ")}`,
      );
      if (warnOnceCa("cross_loop_dropped"))
        logFeatureSad("ca_certs_load", "cross_loop_dropped", {
          dropped_count: droppable.size,
        });
    }
    let filtered_2 = pems.filter((pem) => {
      let cert = singlePemCerts.get(pem);
      return !cert || !loops.has(cert);
    });
    return {
      list:
        droppable.size === loops.size
          ? filtered_2
          : pems.filter((pem) => {
              let cert = singlePemCerts.get(pem);
              return !cert || !droppable.has(cert);
            }),
      alone: filtered_2,
    };
  } catch (error) {
    logForDebugging(`CA certs: Left the system store's certificates as they are: ${error}`, {
      level: "error",
    });
    return unchanged;
  }
}
//@ chunk-hq88884p.js:33141-36691 placement
/**
 * 被拒根证书与 SPKI 的索引（快速判断某证书是否在黑名单）。
 */
var BLOCKED_ROOT_SHA256_2; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var BLOCKED_ROOT_SHA256;
var BLOCKED_ROOT_SPKI_SHA256;
var LEAKED_CA_SPKI_SHA256;
var blockedCaIndex;
deferInit("chunk-hq88884p.js:33141", () => {
  BLOCKED_ROOT_SHA256_2 = [
    {
      certificate: "86a1ecba089c4a8d3bbe2734c612ba341d813e043cf9e8a862cd5c57a36bbe6b",
      key: "8d417db2dd8bf5e3084d1e3f196d583849d81bdd4c00c70b9d39369e96b8c782",
    },
    {
      certificate: "bc4d809b15189d78db3e1d8cf4f9726a795da1643ca5f1358e1ddb0edc0d7eb3",
      key: "eabc185c4e82d942b1a5978ba3c0181487d6b3b9974e5c49f72f6d0bd9637150",
    },
    {
      certificate: "40f6af0346a99aa1cd1d555a4e9cce62c7f9634603ee406615833dc8c8d00367",
      key: "376a1a7082a593dccc20d561d119e9ab8d30f11cc321d0a37fa41f0df284e01c",
    },
    {
      certificate: "125609aa301da0a249b97a8239cb6a34216f44dcac9f3954b14292f2e8c8608f",
      key: "b7408b4d2be0238ba37004dd34e276c6019bd2f24c9db7d4980f5f6c359a4bcc",
    },
    {
      certificate: "0d74ef67c88de3560365e225aef976f915e901347b73352d81ab5b4132bb2150",
      key: "941ea0cbce0926d9f34ec667cee669b61fd39f4338fa0b91048d5749d8880d25",
    },
    {
      certificate: "1997770a5633fb6d0440abf7d7e87e15d795f094f8c2959dadb00e785866bf48",
      key: "1cbbd4cb5eec6a287e34636c07c78378fa3eb3c6d3fb0563286870f283d87034",
    },
    {
      certificate: "1aa0c2709e831bd6e3b5129a00ba41f7eeef020872f1e6504bf0f6c3f24f3af3",
      key: "71f8adeec2b58adbdf6205c98dde928a4254b03695193d7f9a63a9a2588095d0",
    },
    {
      certificate: "46cd083b47e80402028df493960ea19c85fe851950d5165f1c7da4faa951e2f8",
      key: "3f83a68c4e80fc3f4f487e3105ad146498e56a09a3ea223b2a2982943f5995d7",
    },
    {
      certificate: "47911bc8f32a11b029e0bb10a348b459404b87731b870a2f3fa97b4705dc4c25",
      key: "33836758bd871b8d464bd669b0b81832880b81e363fb8cbb21ba8e843a138858",
    },
    {
      certificate: "75d2ce75979cf2a43b172c9f89f733dda2136031db4bbf3698b053714c077155",
      key: "11567f2aaf4325c4044880c6ed2b37f1ca2586d87059cf254934d97c4fee89a5",
    },
    {
      certificate: "7dd78d5f4f13459a83dff9abbba62edbaf6f2d102bf257fd712f4d9f2746ed8d",
      key: "c619e4780ed8e0abeda24ad732567de4383a7ea941338f6d1a7d1b49ac792fe9",
    },
    {
      certificate: "8abfc40faeaf13cbc8bb67b61c8d097a321cd2fee047c54256927e0f8bfeadfd",
      key: "b5ee1c904ac2aae39c92601ab466269c0c1cd0b96badbd251b0ed88e6c4ded68",
    },
    {
      certificate: "bbd8b3d745efb79198d93b9c482b9d934537325729ea2f02c129261f91be2e3d",
      key: "8dd3d055a7f47ffbca287285dcfd201dde92823ccc484d30f11cc40f079b3a3e",
    },
    {
      certificate: "be0c7a1e9ed59990c3060095c2d6a9fd55a6e9448728f3235c7c3c0108fa2f43",
      key: "e3212ac258d6d86f464c1150866a298c04a42783c1d17d7baa6a24ac0323f139",
    },
    {
      certificate: "c626090fd48ddbf2eee327e6a3d2ca78bd350c1faf0ceff015d834c3bd176ab0",
      key: "cf36ee3b065cb7405569f6c189b54c2f3d43042a995e3f5fcfccefe09ad73177",
    },
    {
      certificate: "cef71e70b7c29addf6c30cd19e614b38fd5f02a435a0eeddd0087e183d101a51",
      key: "ece28e35289ce8621c72407949e5050052ad4607cc332eaf9b546029aacbfb7a",
    },
    {
      certificate: "d7a7a0fb5d7e2731d771e9484ebcdef71d5f0c3e0a2948782bc83ee0ea699ef4",
      key: "bd153ed7b0434f6886b17bce8bbe84ed340c7132d702a8f4fa318f756ecbd6f3",
    },
    {
      certificate: "f2edaaff3d9b701fb4d14c9f285f8c0bad90fc3bcc1fa07d47f4718edaba34a5",
      key: "0a6c2b2ca5b364207954171987ac9d2178561569d8205457e77ca90c32ede282",
    },
    {
      certificate: "f76a0d440c418dc5b362be8e11e0a5d06023f4396093e4f455827bf55153d8a4",
      key: "5da77dc800f4c6fa93c6015aa6bd898fdb7c28d869e764571b25c00375a77755",
    },
  ];
  BLOCKED_ROOT_SHA256 = new Set(BLOCKED_ROOT_SHA256_2.map((entry) => entry.certificate));
  BLOCKED_ROOT_SPKI_SHA256 = new Set(BLOCKED_ROOT_SHA256_2.map((entry) => entry.key));
  LEAKED_CA_SPKI_SHA256 = new Set([
    "ebed6475c2c2d80fcb199f3fe8dd6e6b3ce60b77eb15d4e42c3dec0c6f5b5105",
    "49dd353dc2b919a3770645117d0e60c16115e7d1bc259eefe734b00ea434fe5f",
    "e0254c7fcdc265e2f0f8a428dabb75ab4ae039b4872d62f5ee57f0877d5a8a41",
    "5c0660a2b164910d8ff589c18e14552e9e0ec237dcefe2cb736d41a4811f81a0",
    "ec4ffa1ad0ac88081314b7aaffef6a91f97cd57291bb5ba686c5415f5eb4f6b6",
    "92c063d67e8f14db71d288e11266ffdaf69cbf115f7bab14f3bc2f68d25e0e30",
    "43bffa19d6ef651451f6841e019931e96f6f2eaeff28ab4b6f1ce4576de2717b",
    "63ecefee431d49523bc1136c4e72d0206a477086caf606cd5cf025686c109cf8",
  ]);
  blockedCaIndex = {
    certificates: BLOCKED_ROOT_SHA256,
    keys: BLOCKED_ROOT_SPKI_SHA256,
  };
});
//@ chunk-hq88884p.js:36691-36830 placement
function blockedRootSet(keptKeys) {
  let filtered = BLOCKED_ROOT_SHA256_2.filter((entry) => !keptKeys.has(entry.key));
  return {
    certificates: new Set(filtered.map((entry) => entry.certificate)),
    keys: new Set(filtered.map((entry) => entry.key)),
  };
}
//@ chunk-hq88884p.js:36830-36986 placement
var BLOCKED_ROOTS; // deferred: uses blockedRootSet of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-hq88884p.js:36830", () => {
  BLOCKED_ROOTS = blockedRootSet(
    new Set([
      "376a1a7082a593dccc20d561d119e9ab8d30f11cc321d0a37fa41f0df284e01c",
      "ece28e35289ce8621c72407949e5050052ad4607cc332eaf9b546029aacbfb7a",
    ]),
  );
});
//@ chunk-hq88884p.js:36986-37341 placement
function pemSpans(text) {
  let spans = [];
  let index = text.indexOf("-----BEGIN ");
  let index_2 = text.indexOf("-----END ");
  let spanStart = -1;
  while (index_2 !== -1) {
    if (index !== -1 && index < index_2) {
      spanStart = index;
      index = text.indexOf("-----BEGIN ", index + 1);
      continue;
    }
    let sliced = text.slice(index_2, index_2 + 80);
    let index_3 = sliced.indexOf("-----", 9);
    if (
      index_3 === -1 ||
      sliced.slice(0, index_3).includes(`
`)
    ) {
      index_2 = text.indexOf("-----END ", index_2 + 1);
      continue;
    }
    let spanEnd = index_2 + index_3 + 5;
    if (spanStart !== -1) {
      spans.push([spanStart, spanEnd]);
      spanStart = -1;
    }
    index_2 = text.indexOf("-----END ", spanEnd);
  }
  return spans;
}
//@ chunk-hq88884p.js:37341-37350 placement
/**
 * 嵌套被拒证书块的最大层数（8）。
 */
var MAX_NESTED_BLOCK_DEPTH = 8;
//@ chunk-hq88884p.js:37350-37421 placement
/**
 * 来源是 NODE_EXTRA_CA_CERTS 时给出“整个文件”的补充说明。
 */
function describeSourceSuffix(source) {
  return source === "NODE_EXTRA_CA_CERTS" ? " (the whole file)" : "";
}
//@ chunk-hq88884p.js:37421-38924 placement
/**
 * 提示 NODE_EXTRA_CA_CERTS 中被拒的证书块（一次）。
 */
function warnBlockedCertBlock(kind, fingerprint, warned) {
  let key = `${kind}:${fingerprint}`;
  if (warned.has(key)) return;
  warned.add(key);
  let message = {
    block:
      "Claude Code ignored a block in the NODE_EXTRA_CA_CERTS file: the block holds a root certificate on the CLI's deny list, in a form Claude Code could not read. The other certificates in the file are still used.",
    file: "Claude Code ignored all of the NODE_EXTRA_CA_CERTS file: it holds a root certificate on the CLI's deny list, in a form Claude Code could not read. Run Claude Code with --debug to write its SHA-256 fingerprint to the debug log, then remove that certificate from the file.",
    damaged:
      "Claude Code used only the plain certificates it could read in full from the NODE_EXTRA_CA_CERTS file: the file holds a damaged copy of a root certificate on the CLI's deny list, such as one missing its END line. Run Claude Code with --debug to write its SHA-256 fingerprint to the debug log, then remove that copy from the file.",
    nested:
      "Claude Code ignored all of the NODE_EXTRA_CA_CERTS file: it holds root certificates on the CLI's deny list nested too deeply to cut out. Remove them so the rest of the file is used.",
    selfNamed: `Claude Code ignored the certificate with SHA-256 fingerprint ${fingerprint} in the NODE_EXTRA_CA_CERTS file: it names itself as its issuer, but Claude Code could not confirm that its own key signed it. Run Claude Code with --debug to write the cause to the debug log. If you trust that certificate, set CLAUDE_CODE_DISABLE_SELF_NAMED_CERT_DROP=1, which keeps every such certificate.`,
  }[kind];
  console.error(message);
}
//@ chunk-hq88884p.js:38924-39130 placement
function pemStartsWithRaw(block, cert) {
  let sliced = block.slice(block.indexOf("-----", 5) + 5, block.lastIndexOf("-----END"));
  let buffer = Buffer.from(sliced.replace(/[^A-Za-z0-9+/]/g, ""), "base64");
  let { raw } = cert;
  return buffer.length > raw.length && buffer.subarray(0, raw.length).equals(raw);
}
//@ chunk-hq88884p.js:39130-39484 placement (2.1.88 match: hashContent, 0.605)
/**
 * 解析内置根证书 PEM，按 sha256 只保留允许列表中的证书，返回 base64 原文与哈希。
 */
function selectBundledRootCertificates(content) {
  let { X509Certificate, createHash } = importMetaRequire("crypto");
  return content.flatMap((pem) => {
    let raw;
    try {
      raw = new X509Certificate(pem).raw;
    } catch (error) {
      logForDebugging(`CA certs: A bundled root does not parse: ${error}`, {
        level: "error",
      });
      return [];
    }
    let hash = createHash("sha256").update(raw).digest("hex");
    if (!blockedCaIndex.certificates.has(hash)) return [];
    return [
      {
        base64: raw.subarray(0, raw.length - (raw.length % 3)).toString("base64"),
        hash,
      },
    ];
  });
}
//@ chunk-hq88884p.js:39484-42148 placement
/**
 * 过滤掉拒绝名单中的证书。
 */
function withoutBlockedCertsUnsafe(
  entries,
  bundledRootCertificates,
  blockedIndex = blockedCaIndex,
  warned = new Set(),
) {
  let { X509Certificate, createHash, createPublicKey } = importMetaRequire("crypto");
  let sha256Hex = (data) => createHash("sha256").update(data).digest("hex");
  let parseCert = (pemText) => {
    try {
      return new X509Certificate(pemText);
    } catch {
      return;
    }
  };
  let findBundledRoot = (block, bundled = bundledRootCertificates) => {
    let replaced = block.replace(/\s+/g, "");
    return bundled.find(({ base64 }) => replaced.includes(base64));
  };
  let blockedHashOf = (cert, caIndex) => {
    let certHash = sha256Hex(cert.raw);
    if (caIndex.certificates.has(certHash)) return certHash;
    try {
      let publicKey = cert.publicKey;
      try {
        publicKey = createPublicKey({
          key: publicKey.export({
            format: "jwk",
          }),
          format: "jwk",
        });
      } catch {}
      let spkiHash = sha256Hex(
        publicKey.export({
          type: "spki",
          format: "der",
        }),
      );
      return caIndex.keys.has(spkiHash) || LEAKED_CA_SPKI_SHA256.has(spkiHash) ? certHash : undefined;
    } catch {
      return;
    }
  };
  let blockedHashOfPem = (pemText) => {
    let sliced = pemText.slice(pemText.indexOf("-----", 5) + 5, pemText.lastIndexOf("-----END"));
    let buffer = Buffer.from(sliced.replace(/[^A-Za-z0-9+/]/g, ""), "base64");
    if (buffer[0] !== 48 || buffer.length < 2) return;
    let isLongForm = (buffer[1] & 128) !== 0;
    let lengthBytes = isLongForm ? buffer[1] & 127 : 0;
    if ((isLongForm && (lengthBytes === 0 || lengthBytes > 4)) || buffer.length < 2 + lengthBytes) return;
    let contentLength = isLongForm ? buffer.readUIntBE(2, lengthBytes) : buffer[1];
    if (2 + lengthBytes + contentLength > buffer.length) return;
    let chunk = buffer.subarray(0, 2 + lengthBytes + contentLength);
    let derHash = sha256Hex(chunk);
    if (blockedCaIndex.certificates.has(derHash)) return derHash;
    let cert;
    try {
      cert = new X509Certificate(chunk);
    } catch {
      return;
    }
    return blockedHashOf(cert, blockedCaIndex);
  };
  let kept = [];
  for (let { pem, source } of entries) {
    let isExtraCerts = source === "NODE_EXTRA_CA_CERTS" && blockedIndex === blockedCaIndex;
    let text = pem;
    let depth = 0;
    let droppedUnreadable = false;
    let reencoded = new Set();
    for (; depth <= MAX_NESTED_BLOCK_DEPTH; depth++) {
      let pieces = [];
      let keptFrom = 0;
      let previousEnd = 0;
      let cutSomething = false;
      for (let [start, end] of pemSpans(text)) {
        let sliced = text.slice(start, end);
        let cert = parseCert(sliced);
        let note;
        if (cert) {
          let ourHash = blockedHashOf(cert, blockedCaIndex);
          if (ourHash && !blockedHashOf(cert, blockedIndex)) {
            let isTrustedBlock = sliced.startsWith("-----BEGIN TRUSTED");
            if (!isTrustedBlock) reencoded.add(cert.toString());
            note = isTrustedBlock
              ? `Left certificate ${ourHash} from ${source} out of the list for hosts that aren't ours: it is in a TRUSTED CERTIFICATE block, which the runtime does not load`
              : `Re-encoded certificate ${ourHash} from ${source}: the list for hosts that aren't ours trusts it, and its original text could stop that list from loading`;
          } else if (ourHash) note = `Dropped blocked certificate ${ourHash} from ${source}`;
        } else {
          let hash = findBundledRoot(sliced)?.hash ?? blockedHashOfPem(sliced);
          if (hash) {
            droppedUnreadable = true;
            note = `Dropped an unreadable block from ${source}: the block contains blocked certificate ${hash}`;
          }
        }
        let max = Math.max(start, previousEnd);
        previousEnd = end;
        if (note && max >= keptFrom) {
          logForDebugging(`CA certs: ${note}`);
          pieces.push(text.slice(keptFrom, max));
          keptFrom = end;
          cutSomething = true;
        }
      }
      if (!cutSomething) break;
      pieces.push(text.slice(keptFrom));
      text = pieces.join("");
    }
    if (depth > MAX_NESTED_BLOCK_DEPTH) {
      logForDebugging(
        `CA certs: Ignored an entry from ${source}${describeSourceSuffix(source)}: blocked certificates are nested in it more than ${MAX_NESTED_BLOCK_DEPTH} deep`,
      );
      if (isExtraCerts) warnBlockedCertBlock("nested", sha256Hex(pem), warned);
      continue;
    }
    let outsideHash = findBundledRoot(text);
    let reencodedList = outsideHash
      ? [
          ...reencoded,
          ...(text.includes("\x00")
            ? []
            : pemSpans(text).flatMap(([start, end], index, allSpans) => {
                let sliced = text.slice(start, end);
                let cert =
                  start >= (allSpans[index - 1]?.[1] ?? 0) &&
                  (start === 0 ||
                    text[start - 1] ===
                      `
`) &&
                  /^(\r?\n|$)/.test(text.slice(end, end + 2)) &&
                  !sliced.startsWith("-----BEGIN TRUSTED")
                    ? parseCert(sliced)
                    : undefined;
                return cert && !pemStartsWithRaw(sliced, cert) && !blockedHashOf(cert, blockedIndex)
                  ? [cert.toString().trim()]
                  : [];
              })),
        ]
      : [];
    let hasParsable = () => pemSpans(text).some(([start, end]) => parseCert(text.slice(start, end)));
    let shouldKeep = outsideHash
      ? reencodedList.length > 0
      : depth === 0 || reencoded.size > 0 || hasParsable();
    if (outsideHash)
      logForDebugging(
        `CA certs: ${source}${describeSourceSuffix(source)} holds blocked certificate ${outsideHash.hash} outside any block; ${shouldKeep ? `kept only the ${reencodedList.length} certificate(s) in it that parse, re-encoded` : "ignored it"}`,
      );
    if (isExtraCerts && (outsideHash || droppedUnreadable))
      warnBlockedCertBlock(shouldKeep ? (outsideHash ? "damaged" : "block") : "file", sha256Hex(pem), warned);
    if (shouldKeep)
      kept.push(
        outsideHash
          ? reencodedList.join(`
`)
          : reencoded.size > 0
            ? [...reencoded, ...(hasParsable() ? [text.trim()] : [])].join(`
`)
            : text,
      );
  }
  return kept;
}
//@ chunk-hq88884p.js:42148-43143 placement
/**
 * 组合 CA 列表（额外证书、内置证书回退）。
 */
function buildCaList(
  entries,
  content,
  blockedIndex = blockedCaIndex,
  bundledRootCertificates = selectBundledRootCertificates(content),
  warnedExtraCerts = new Set(),
) {
  let kept = withoutBlockedCertsUnsafe(entries, bundledRootCertificates, blockedIndex, warnedExtraCerts);
  if (kept.length > 0) return kept;
  let mapped = content.map((pem) => ({
    pem,
    source: "bundled",
  }));
  let bundledKept = withoutBlockedCertsUnsafe(mapped, bundledRootCertificates, blockedIndex);
  if (bundledKept.length > 0) return bundledKept;
  if (content.length === 0 && entries.length === 0)
    throw Error(
      "No certificate authority to trust: no usable CA certificate was found (none could be read, every one had expired, or the claude-code-server host handed none), and this runtime has no built-in root certificates. Check the CA files this process reads (SSL_CERT_FILE, SSL_CERT_DIR) and CLAUDE_CODE_CERT_STORE; NODE_EXTRA_CA_CERTS only adds to those and does not count on its own.",
    );
  if (content.length === 0)
    throw Error(
      "No certificate authority to trust: every CA certificate found is on the CLI's deny list, and this runtime has no built-in root certificates. Add a certificate authority that is not on the deny list to the CA files (SSL_CERT_FILE, SSL_CERT_DIR).",
    );
  throw Error(
    "No root certificates are left to trust: every root built into this runtime is on the CLI's deny list. Update Claude Code.",
  );
}
//@ chunk-hq88884p.js:43143-43233 placement
function withoutBlockedCerts(pem, source) {
  let tlsModule = importMetaRequire("tls");
  return withoutBlockedCertsUnsafe(
    [
      {
        pem,
        source,
      },
    ],
    selectBundledRootCertificates(tlsModule.rootCertificates),
  )[0];
}
//@ chunk-hq88884p.js:43233-43432 placement
function withoutBlockedOrUnanchoredCerts(caCertPem, source) {
  let filtered = withoutBlockedCerts(caCertPem, source);
  if (filtered === undefined || filtered === caCertPem) return filtered;
  let { kept, dropped } = dropSelfNamedCerts([filtered]);
  if (dropped > 0)
    logForDebugging(
      `CA certs: Dropped ${dropped} certificate(s) from ${source} that do not chain to a root in it`,
    );
  return kept[0];
}
//@ chunk-hq88884p.js:43432-43630 placement
function getCACertificates() {
  let caCertState = getCaCertState();
  if (caCertState.fromHost) return caCertState.fromHost.certificates;
  let useClientCert = Boolean(env.CLAUDE_CODE_CLIENT_CERT);
  if (!caCertState.certificates.cache.has(useClientCert)) caCertState.certificates.cache.clear?.();
  return caCertState.certificates(useClientCert);
}
//@ chunk-hq88884p.js:43630-43904 placement
function caListFor(forOtherHosts) {
  let caCertificates = getCACertificates();
  let state = getCaCertState();
  if (!forOtherHosts || !caCertificates || state.fromHost) return caCertificates;
  let cached = state.customerLists.get(caCertificates);
  if (cached) return cached;
  logForDebugging("CA certs: Building the list for hosts that aren't ours");
  let { list } = loadCaCertificates(state, Boolean(env.CLAUDE_CODE_CLIENT_CERT), BLOCKED_ROOTS);
  Object.freeze(list);
  state.customerLists.set(caCertificates, list);
  return list;
}
//@ chunk-hq88884p.js:43904-43976 placement
function isRuntimeStoreCABundle(value) {
  return Array.isArray(value) && getCaCertState().runtimeStoreBundles.has(value);
}
//@ chunk-hq88884p.js:43976-44055 placement
function hasSeenTrustOverride() {
  let caCertState = getCaCertState();
  caCertState.trustOverrideSeen ||= hasCaEnvOverride();
  return caCertState.trustOverrideSeen;
}
//@ chunk-hq88884p.js:44055-44199 placement (2.1.88 match: formatShortcut, 1)
function formatShortcut(shortcut) {
  return shortcut
    .split(
      `
`,
    )
    .map((line) =>
      line
        .split(" + ")
        .map((part) => part.replace(/\\0[9a-d]|[\s\\]/gi, "").toLowerCase())
        .sort()
        .join("+"),
    )
    .join("");
}
//@ chunk-hq88884p.js:44199-44690 placement
/**
 * 证书是否自签名。
 */
function isSelfSigned(cert) {
  let publicKey = cert.publicKey;
  if (cert.verify(publicKey)) return true;
  let { raw } = cert;
  let modulusBytes = Math.ceil((publicKey.asymmetricKeyDetails?.modulusLength ?? 0) / 8);
  if (!modulusBytes || raw[1] !== 130 || raw[5] !== 130) return false;
  let sigOffset = 8 + raw.readUInt16BE(6);
  let lengthBytes = modulusBytes < 127 ? 3 : modulusBytes < 255 ? 4 : 5;
  if (
    raw[sigOffset + 1] > 127 ||
    sigOffset + 2 + raw[sigOffset + 1] + lengthBytes + modulusBytes !== raw.length
  )
    return false;
  let { constants, verify } = importMetaRequire("crypto");
  let chunk = raw.subarray(4, sigOffset);
  let chunk_2 = raw.subarray(-modulusBytes);
  return ["md5", "sha1", "sha256", "sha384", "sha512"].some(
    (algorithm) =>
      verify(algorithm, chunk, publicKey, chunk_2) ||
      verify(
        algorithm,
        chunk,
        {
          key: publicKey,
          padding: constants.RSA_PKCS1_PSS_PADDING,
          saltLength: constants.RSA_PSS_SALTLEN_AUTO,
        },
        chunk_2,
      ),
  );
}
//@ chunk-hq88884p.js:44690-44860 placement
function isIssuerOf(issuer, cert) {
  let isSelfSignedCert = cert.subject === cert.issuer;
  try {
    return (
      issuer !== cert &&
      issuer.subject === cert.issuer &&
      (!isSelfSignedCert || issuer.certificate.ca) &&
      cert.certificate.verify(issuer.certificate.publicKey)
    );
  } catch {
    return !isSelfSignedCert;
  }
}
//@ chunk-hq88884p.js:44860-47131 placement
/**
 * 去掉主体与签发者同名但非自签的证书。
 */
function dropSelfNamedCerts(pems, onDrop) {
  let { X509Certificate } = importMetaRequire("crypto");
  let tlsModule = importMetaRequire("tls");
  let dropDisabled = Boolean(env.CLAUDE_CODE_DISABLE_SELF_NAMED_CERT_DROP);
  if (dropDisabled)
    logForDebugging(
      "CA certs: CLAUDE_CODE_DISABLE_SELF_NAMED_CERT_DROP is set: a certificate whose subject and issuer names match stays, whoever signed it",
      {
        level: "warn",
      },
    );
  let runtimeRoots = new Set(tlsModule.rootCertificates);
  let mapped = pems.map((pem) =>
    pemSpans(pem).map(([start, end]) => {
      let block = pem.slice(start, end);
      try {
        let cert = new X509Certificate(block);
        let subject = formatShortcut(cert.subject ?? "");
        let issuer = formatShortcut(cert.issuer ?? "");
        let trustData = pemStartsWithRaw(block, cert);
        let isAnchored = trustData;
        let unconfirmed;
        if (!isAnchored && subject === issuer)
          try {
            isAnchored = dropDisabled || runtimeRoots.has(block) || isSelfSigned(cert);
            unconfirmed = isAnchored
              ? undefined
              : "its own key did not sign it, or signed it in a form that Claude Code cannot check";
          } catch (error) {
            unconfirmed = `whether its own key signed it could not be checked (${error}), most likely because the runtime cannot read that key, and then TLS can verify nothing under it either`;
          }
        return {
          start,
          end,
          listed: {
            certificate: cert,
            subject,
            issuer,
            anchor: isAnchored,
            kept: isAnchored,
            unconfirmed,
          },
          trustData,
        };
      } catch {
        return {
          start,
          end,
          listed: undefined,
          trustData: false,
        };
      }
    }),
  );
  let flattened = mapped.flat().flatMap((entry) => entry.listed ?? []);
  let issuersOf = new Map(
    flattened
      .filter((listed) => !listed.anchor)
      .map((listed) => [listed, flattened.filter((candidate) => isIssuerOf(candidate, listed))]),
  );
  for (let changed = true; changed;) {
    changed = false;
    for (let [listed, issuers] of issuersOf)
      if (!listed.kept && issuers.some((issuerCert) => issuerCert.kept)) {
        listed.kept = true;
        changed = true;
      }
  }
  let droppedCount = count(flattened, (listed) => !listed.kept);
  if (droppedCount === 0 || droppedCount === flattened.length)
    return {
      kept: [...pems],
      dropped: 0,
    };
  let kept = pems.flatMap((pem, pemIndex) => {
    let entries = mapped[pemIndex];
    if (entries.every((entry) => entry.listed?.kept !== false)) return [pem];
    if (!entries.some((entry) => entry.listed?.kept))
      return entries.some((entry) => entry.listed) ? [] : [pem];
    let mapped_2 = entries.map((entry, entryIndex) =>
      pem.slice(entries[entryIndex - 1]?.end ?? 0, entry.start),
    );
    if (!(
      entries.every(
        (entry, entryIndex) =>
          entry.start >= (entries[entryIndex - 1]?.end ?? 0) &&
          /(^|\n)$/.test(mapped_2[entryIndex]) &&
          /^(\r?\n|$)/.test(pem.slice(entry.end, entry.end + 2)),
      ) &&
      entries.every((entry) => entry.listed && !entry.trustData) &&
      !pem.includes("\x00") &&
      [...mapped_2, pem.slice(entries.at(-1).end)].every(
        (text) => /^[\t\r\n\x20-\x7e]*$/.test(text) && !text.includes("-----"),
      )
    )) {
      for (let entry of entries) if (entry.listed) entry.listed.kept = true;
      return [pem];
    }
    return [
      entries
        .filter((entry) => entry.listed?.kept !== false)
        .map((entry) => pem.slice(entry.start, entry.end)).join(`
`),
    ];
  });
  mapped.forEach((entries, pemIndex) => {
    for (let { listed } of entries)
      if (listed?.unconfirmed && !listed.kept) {
        let { fingerprint256, subject } = listed.certificate;
        logForDebugging(
          `CA certs: Dropped the certificate with SHA-256 fingerprint ${fingerprint256} and subject ${JSON.stringify(subject ?? "")}: it names itself as its issuer, but ${listed.unconfirmed}, and no CA that chains to a root in the list signed it. CLAUDE_CODE_DISABLE_SELF_NAMED_CERT_DROP=1 keeps every such certificate.`,
          {
            level: "error",
          },
        );
        onDrop?.(pems[pemIndex], fingerprint256);
      }
  });
  return {
    kept,
    dropped: count(flattened, (listed) => !listed.kept),
  };
}
//@ chunk-hq88884p.js:47131-49781 placement
/**
 * 按证书来源加载 CA 证书（bundled/system/extra）。
 */
function loadCaCertificates(state, useClientCert, blockedIndex) {
  let sources = certStoreSources();
  let NODE_EXTRA_CA_CERTS = env.NODE_EXTRA_CA_CERTS;
  let included = sources.includes("bundled");
  let included_2 = sources.includes("system");
  let refusesBundledFallback = !included && state.refusesBundledFallback;
  logForDebugging(`CA certs: stores=${sources.join(",")}, extraCertsPath=${NODE_EXTRA_CA_CERTS}`);
  let tlsModule = importMetaRequire("tls");
  let getCACertificates = tlsModule.getCACertificates;
  if (!included && included_2 && !getCACertificates) {
    logForDebugging(
      `CA certs: stores=system but system CA API unavailable${refusesBundledFallback ? "" : ", using bundled roots"}`,
    );
    if (warnOnceCa("system_api_unavailable")) logFeatureSad("ca_certs_load", "system_api_unavailable");
  }
  let entries = [];
  let emptyReason = "every certificate in the system CA store is expired or on the deny list";
  let pushRoots = (source, rootCertificates) => {
    for (let pem of rootCertificates)
      entries.push({
        pem,
        source,
      });
  };
  let extraBlocks = [];
  let extraUsed = false;
  let extraPems = [];
  let parsedByPem = new Map();
  if (included) {
    pushRoots("bundled", tlsModule.rootCertificates);
    logForDebugging(`CA certs: Loaded ${tlsModule.rootCertificates.length} bundled root certificates`);
  }
  if (included_2)
    try {
      let systemCerts = getCACertificates?.("system");
      if (systemCerts && systemCerts.length > 0) {
        let unexpired = dropExpiredCerts(systemCerts, Date.now(), parsedByPem);
        pushRoots("system", unexpired);
        logForDebugging(`CA certs: Loaded ${unexpired.length} system CA certificates`);
      } else {
        logForDebugging(`CA certs: system store ${getCACertificates ? "returned empty" : "unavailable"}`);
        emptyReason = getCACertificates
          ? "the system CA store is empty: check that this process can read its CA files (SSL_CERT_FILE, SSL_CERT_DIR, or the system's default paths)"
          : "the runtime has no system CA store";
        if (!included && !refusesBundledFallback) pushRoots("bundled", tlsModule.rootCertificates);
      }
    } catch (error) {
      logForDebugging(`CA certs: Failed to load system CA certificates: ${error}`, {
        level: "error",
      });
      if (warnOnceCa("system_store_failed")) logFeatureSad("ca_certs_load", "system_store_failed");
      emptyReason = "reading the system CA store failed";
      if (!included && !refusesBundledFallback) pushRoots("bundled", tlsModule.rootCertificates);
    }
  let bundledRootCertificates = selectBundledRootCertificates(tlsModule.rootCertificates);
  let baseList = refusesBundledFallback
    ? withoutBlockedCertsUnsafe(entries, bundledRootCertificates, blockedIndex, state.warnedExtraCerts)
    : buildCaList(
        entries,
        tlsModule.rootCertificates,
        blockedIndex,
        bundledRootCertificates,
        state.warnedExtraCerts,
      );
  if (baseList.length === 0)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `No certificate authority to trust: CLAUDE_CODE_CERT_STORE=system (or NODE_OPTIONS --use-system-ca or --use-openssl-ca) leaves out the runtime's bundled roots, and ${emptyReason}. NODE_EXTRA_CA_CERTS only adds to the store; it does not count on its own.`,
      "No certificate authority to trust",
    );
  if (NODE_EXTRA_CA_CERTS && state.extraCACerts?.path === NODE_EXTRA_CA_CERTS) {
    let content = state.extraCACerts.content;
    let knownPems = new Set(baseList.map((pem) => pem.trim()));
    let all = content
      .replace(/^\n{1,2}|\n{1,2}$/g, "")
      .split(/\n{1,2}(?=-----BEGIN CERTIFICATE-----)/)
      .every((block) => knownPems.has(block));
    extraBlocks = all
      ? []
      : withoutBlockedCertsUnsafe(
          [
            {
              pem: content,
              source: "NODE_EXTRA_CA_CERTS",
            },
          ],
          bundledRootCertificates,
          blockedIndex,
          state.warnedExtraCerts,
        );
    extraPems = all ? [content] : extraBlocks;
    extraUsed = all || extraBlocks.length > 0;
    logForDebugging(
      extraUsed
        ? `CA certs: Appended extra certificates from NODE_EXTRA_CA_CERTS (${NODE_EXTRA_CA_CERTS})${all ? ": all of them were already trusted from the CA store, so each is listed once" : ""}`
        : `CA certs: Nothing from NODE_EXTRA_CA_CERTS (${NODE_EXTRA_CA_CERTS}) is left to append`,
    );
  }
  let chosen =
    useClientCert || env.CLAUDE_CODE_DISABLE_LOOPED_CROSS_CERT_DROP
      ? {
          list: baseList,
          alone: baseList,
        }
      : chooseAnchoredCerts(baseList, parsedByPem, extraPems);
  let merged = uniq([...chosen.list, ...extraBlocks]);
  let selfNamedDropped = 0;
  let result = useClientCert
    ? {
        kept: merged,
        dropped: 0,
      }
    : dropSelfNamedCerts(merged, (pem, fingerprint) => {
        selfNamedDropped++;
        if (extraPems.some((extraPem) => extraPem.includes(pem.trim())))
          warnBlockedCertBlock("selfNamed", fingerprint, state.warnedExtraCerts);
      });
  return {
    list: result.kept,
    dropped: result.dropped,
    selfNamedDropped,
    storeCerts: chosen.alone,
    appendedExtraCerts: extraUsed,
    wantsBundled: included,
    wantsSystem: included_2,
  };
}
//@ chunk-hq88884p.js:49781-50750 placement
/**
 * 刷新 CA 状态（读取 NODE_EXTRA_CA_CERTS）。
 */
function refreshCaState(state, useClientCert) {
  state.trustOverrideSeen ||= hasCaEnvOverride();
  state.storeCertificates = undefined;
  let NODE_EXTRA_CA_CERTS = env.NODE_EXTRA_CA_CERTS;
  if (NODE_EXTRA_CA_CERTS && state.extraCACerts?.path !== NODE_EXTRA_CA_CERTS)
    try {
      let content = getFsImplementation().readFileSync(NODE_EXTRA_CA_CERTS, {
        encoding: "utf8",
      });
      state.extraCACerts = {
        path: NODE_EXTRA_CA_CERTS,
        content,
      };
    } catch (error) {
      logForDebugging(
        `CA certs: Failed to read NODE_EXTRA_CA_CERTS file (${NODE_EXTRA_CA_CERTS}): ${error}`,
        {
          level: "error",
        },
      );
      if (warnOnceCa("read_failed")) logFeatureBad("ca_certs_load", "read_failed");
    }
  let { list, dropped, selfNamedDropped, storeCerts, appendedExtraCerts, wantsBundled, wantsSystem } =
    loadCaCertificates(state, useClientCert, blockedCaIndex);
  if (dropped > 0) {
    logForDebugging(`CA certs: Dropped ${dropped} certificate(s) that do not chain to a root in the CA list`);
    if (selfNamedDropped > 0 && warnOnceCa("self_named_dropped"))
      logFeatureSad("ca_certs_load", "self_named_dropped", {
        dropped_count: selfNamedDropped,
      });
    if (dropped > selfNamedDropped && warnOnceCa("issuer_missing_dropped"))
      logFeatureSad("ca_certs_load", "issuer_missing_dropped", {
        dropped_count: dropped - selfNamedDropped,
      });
  }
  state.storeCertificates = appendedExtraCerts ? uniq(storeCerts) : list;
  if (!appendedExtraCerts) state.runtimeStoreBundles.add(Object.freeze(list));
  if (warnedCaKeys.size === 0 && warnOnceCa("ok"))
    logFeatureOk("ca_certs_load", {
      cert_count: list.length,
      store_bundled: wantsBundled,
      store_system: wantsSystem,
      extra_configured: Boolean(NODE_EXTRA_CA_CERTS),
    });
  return list;
}
//@ chunk-hq88884p.js:50750-50773 placement
/**
 * 清除 CA 证书缓存。
 */
function clearCACertsCache() {
  clearCACertsCache_2(getCaCertState());
}
//@ chunk-hq88884p.js:50773-50854 fingerprint (2.1.88 match: clearCACertsCache, 0.855)
function clearCACertsCache_2(caCertState) {
  caCertState.certificates.cache.clear?.();
  logForDebugging("Cleared CA certificates cache");
}
//@ chunk-hq88884p.js:54258-54304 placement
/**
 * 记录已设置的运行时默认 CA 列表，避免重复设置。
 */
var caDefaultListState; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-hq88884p.js:54258", () => {
  caDefaultListState = identity(
    {
      list: undefined,
    },
    (state) => {
      state.list = undefined;
    },
  );
});
//@ chunk-hq88884p.js:54304-54382 placement
/**
 * 把若干 PEM 文本拆成各证书块。
 */
function splitPemBlocks(caCertificates) {
  return (caCertificates ?? []).flatMap((pem) => pemSpans(pem).map(([start, end]) => pem.slice(start, end)));
}
//@ chunk-hq88884p.js:54382-54413 placement
/**
 * 把单个证书设为运行时默认 CA。
 */
function setDefaultCaFor(pem) {
  return trySetDefaultCaCertificates([pem]);
}
//@ chunk-hq88884p.js:54413-54874 placement
/**
 * 设置运行时默认 CA 证书。
 */
function applyDefaultCaCertificates() {
  let caCertificates = getCACertificates();
  if (
    caCertificates === caDefaultListState.list ||
    typeof tlsModule_2.setDefaultCACertificates !== "function"
  )
    return;
  let blocks = splitPemBlocks(caCertificates);
  if (blocks.length === 0) return;
  if (trySetDefaultCaCertificates(blocks)) {
    caDefaultListState.list = caCertificates;
    return;
  }
  let certificates = blocks.filter(setDefaultCaFor);
  logForDebugging(
    `CA certs: ${blocks.length - certificates.length} certificate(s) in the CA list could not be read and are skipped for connections that pass no CA. Check the NODE_EXTRA_CA_CERTS file, or the OS certificate store, for a damaged or cut-off certificate.`,
    {
      level: "warn",
    },
  );
  if (certificates.length > 0 && trySetDefaultCaCertificates(certificates))
    caDefaultListState.list = caCertificates;
}
//@ chunk-hq88884p.js:54874-54950 placement
/**
 * 设置运行时默认 CA 证书，失败返回 false。
 */
function trySetDefaultCaCertificates(certificates) {
  try {
    tlsModule_2.setDefaultCACertificates(certificates);
    return true;
  } catch {
    return false;
  }
}
export {
  getCACertificates,
  withoutBlockedCerts,
  splitPemBlocks,
  setDefaultCaFor,
  caListFor,
  applyDefaultCaCertificates,
  withoutBlockedOrUnanchoredCerts,
  loadExtraCACerts,
  BLOCKED_ROOT_SHA256,
  BLOCKED_ROOT_SPKI_SHA256,
  LEAKED_CA_SPKI_SHA256,
  hasSeenTrustOverride,
  isRuntimeStoreCABundle,
  clearCACertsCache,
  pemSpans,
};
