/**
 * utils/caCerts.ts
 *
 * CA 证书缓存的清理。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/caCerts.ts
 * pieces: chunk-355mdh7x.js (54)
 * attribution: placement 47, layout 6, fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import * as tlsModule_2 from "tls";
import { importMetaRequire } from "../../runtime/bun-runtime.js";
import { logForDebugging } from "./debug.js";
import { CERT_KEY_BY_SHA256, hasCaEnvOverride, TRUSTED_CERT_FINGERPRINTS } from "./anthropicHosts.js";
import { memoizeAlias } from "../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { HostScoped } from "./hostScoped.js";
import { getRootSession, onProcessRootHost } from "../bootstrap/state.js";
import { serializeCalls } from "./promiseQueue.js";
import { env } from "./env.js";
import { getFsImplementation } from "./fsOperations.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { hasNodeOption } from "./envUtils.js";
import { countWhere } from "./collections.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "./errors.js";
import { normalizeCaseForComparison_2 } from "./permissions/filesystem.js";
import { identity } from "./identity.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-355mdh7x.js:59488-59527 placement (2.1.88 match: filterToBundledAndMcp, 0.597)
/**
 * 一次性告警去重集合。
 */
var DEFAULT_CA_CERT_SOURCES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var warnedCaKeys;
deferInit("chunk-355mdh7x.js:59488", () => {
  DEFAULT_CA_CERT_SOURCES = ["bundled", "system"];
  warnedCaKeys = new Set();
});
//@ chunk-355mdh7x.js:59527-59583 placement
/**
 * 同一类 CA 证书告警只打印一次。
 */
function warnOnceCa(warningKey) {
  if (warnedCaKeys.has(warningKey)) return false;
  warnedCaKeys.add(warningKey);
  return true;
}
//@ chunk-355mdh7x.js:59583-59715 layout
var MAX_PARSED_CERT_BLOCKS = 2048;
var PEM_CERT_BLOCK_RE_2 =
  /^-----BEGIN CERTIFICATE-----\n((?:[A-Za-z0-9+/]{1,76}\n)*[A-Za-z0-9+/]{1,76}={0,2})\n-----END CERTIFICATE-----\n?$/;
//@ chunk-355mdh7x.js:59715-60358 layout
class caCertState {
  ofBlock = new Map();
  ofBundledRoot = new Map();
  #e = new Map();
  readBundledRoots() {
    let { rootCertificates } = importMetaRequire("tls");
    this.#t(rootCertificates);
    return rootCertificates;
  }
  readSystemStore() {
    let tlsModule = importMetaRequire("tls");
    let caCertificates = tlsModule.getCACertificates?.("system");
    this.#t(caCertificates ?? []);
    return caCertificates;
  }
  knownRootOf(pem) {
    return this.#e.get(pem);
  }
  #t(certificates) {
    let { createHash } = importMetaRequire("crypto");
    for (let pem of certificates) {
      if (this.#e.has(pem)) continue;
      this.#e.set(pem, undefined);
      if (pem.length > 65536) continue;
      let replaced = PEM_CERT_BLOCK_RE_2.exec(pem)?.[1]?.replaceAll(
        `
`,
        "",
      );
      let buffer = Buffer.from(replaced ?? "", "base64");
      if (buffer.toString("base64") !== replaced) continue;
      let certHash = createHash("sha256").update(buffer).digest("hex");
      let known = CERT_KEY_BY_SHA256.get(certHash);
      if (known)
        this.#e.set(pem, {
          hashes: {
            certificate: certHash,
            key: known.key,
            keyReadThrew: false,
          },
          expires: known.expires,
        });
    }
  }
}
//@ chunk-355mdh7x.js:60358-60700 placement
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
  servedCertificates = [];
  droppedCrossCertificates = [];
  knownHashes = new caCertState();
  keepsKnownHashes = false;
}
//@ chunk-355mdh7x.js:60700-60725 placement
/**
 * 按宿主隔离的 CA 证书状态缓存。
 */
var caCertStateByHost; // deferred: uses CaCertState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-355mdh7x.js:60700", () => {
  caCertStateByHost = new HostScoped(() => new CaCertState());
});
//@ chunk-355mdh7x.js:60725-60762 placement
/**
 * 取出当前宿主的 CA 证书状态。
 */
function getCaCertState() {
  return caCertStateByHost.of(getRootSession().host);
}
//@ chunk-355mdh7x.js:60762-61317 placement
var loadExtraCACerts; // deferred: uses getCaCertState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-355mdh7x.js:60762", () => {
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
//@ chunk-355mdh7x.js:61317-61826 placement
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
//@ chunk-355mdh7x.js:61826-62348 placement
/**
 * 去掉已过期的证书。
 */
function dropExpiredCerts(certs, nowMs = Date.now(), parsedByPem, knownRoots) {
  let { X509Certificate } = importMetaRequire("crypto");
  let expiredCount = 0;
  let filtered = certs.filter((pem) => {
    let known = knownRoots?.knownRootOf(pem);
    if (known) {
      if (known.expires > nowMs) return true;
      expiredCount++;
      return false;
    }
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
//@ chunk-355mdh7x.js:62348-62387 placement
var buffer; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-355mdh7x.js:62348", () => {
  buffer = Buffer.from("0603551d0e", "hex");
});
//@ chunk-355mdh7x.js:62387-62548 placement
function extractDerField(raw, marker) {
  let index = raw.indexOf(marker);
  let index_2 = raw.indexOf(buffer, index === -1 ? 0 : index + marker.length);
  if (index_2 === -1) return;
  let lenOffset = index_2 + buffer.length;
  let endOffset = raw[lenOffset] === 1 ? lenOffset + 3 : lenOffset;
  return raw.subarray(lenOffset, endOffset + 2 + (raw[endOffset + 1] ?? 0));
}
//@ chunk-355mdh7x.js:62548-62689 layout
function collectIssuerClosure(cert, issuersOf) {
  let seen = new Set();
  let stack = [...(issuersOf.get(cert) ?? [])];
  while (stack.length > 0) {
    let current = stack.pop();
    if (current && !seen.has(current)) {
      seen.add(current);
      stack.push(...(issuersOf.get(current) ?? []));
    }
  }
  return seen;
}
//@ chunk-355mdh7x.js:62689-62828 layout
function isCrossSigningRoot(cross, cross_2, root) {
  try {
    return (
      formatShortcut(cross.issuer ?? "") === formatShortcut(cross_2.subject) &&
      cross.checkIssued(cross_2) &&
      !cross.checkIssued(root) &&
      cross.verify(cross_2.publicKey)
    );
  } catch {
    return false;
  }
}
//@ chunk-355mdh7x.js:62828-66408 placement
/**
 * 选出有锚点的证书链。
 */
function chooseAnchoredCerts(pems, parsedByPem, otherParsed, serverCerts) {
  let unchanged = {
    list: pems,
    alone: pems,
    judged: undefined,
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
    let issuersByCert = new Map();
    for (let cert of singlePemCerts.values())
      issuersByCert.set(
        cert,
        (certsBySubject.get(formatShortcut(cert.issuer ?? "")) ?? []).filter(
          (candidate) =>
            candidate !== cert &&
            !(new Date(candidate.validTo).getTime() <= now) &&
            cert.checkIssued(candidate),
        ),
      );
    let filtered = [...singlePemCerts.values()].filter(
      (cert) => Boolean(cert.subject) && collectIssuerClosure(cert, issuersByCert).has(cert),
    );
    if (filtered.length === 0)
      return {
        ...unchanged,
        judged: {
          looping: [],
          dropped: [],
        },
      };
    let { X509Certificate } = importMetaRequire("crypto");
    let parseFailed = false;
    let [systemCerts = [], otherParsedList = []] = [
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
    let allCerts = [...systemCerts, ...otherParsedList, ...singlePemCerts.values()];
    let looping = [];
    let droppable = new Set();
    let needed = new Set();
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
        if (found !== undefined) {
          looping.push({
            cross: cert,
            root: found,
          });
          let subjectKey = formatShortcut(cert.subject);
          if (
            !allCerts.some(
              (other) =>
                other !== cert &&
                formatShortcut(other.issuer ?? "") === subjectKey &&
                other.checkIssued(cert) &&
                !other.checkIssued(found),
            )
          )
            if (serverCerts.some((serverCert) => isCrossSigningRoot(serverCert, cert, found)))
              needed.add(cert);
            else droppable.add(cert);
        }
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
    let listedHashes = new Set(otherParsedList.map((cert) => cert.fingerprint256));
    let keptCount = 0;
    let notKeptCount = 0;
    if (needed.size > 0) {
      let candidates = [
        ...[...singlePemCerts.values()].filter(
          (cert) => !needed.has(cert) && (!droppable.has(cert) || listedHashes.has(cert.fingerprint256)),
        ),
        ...otherParsedList.filter((cert) => !cert.checkIssued(cert)),
        ...needed,
      ];
      let issuersByCert = new Map();
      for (let cert of candidates)
        issuersByCert.set(
          cert,
          candidates.filter(
            (other) =>
              other !== cert &&
              !(new Date(other.validTo).getTime() <= now) &&
              formatShortcut(other.subject ?? "") === formatShortcut(cert.issuer ?? "") &&
              cert.checkIssued(other),
          ),
        );
      for (let cert of needed) {
        let closure = collectIssuerClosure(cert, issuersByCert);
        if (
          candidates.some(
            (other) =>
              other !== cert && closure.has(other) && collectIssuerClosure(other, issuersByCert).has(cert),
          )
        ) {
          notKeptCount++;
          droppable.add(cert);
        } else keptCount++;
      }
    }
    if (notKeptCount > 0)
      logForDebugging(
        `CA certs: Did not keep ${notKeptCount} cross-certificate(s) for a server's certificate chain that needs them: another member of the same loop stays in the list or is also named by a server's certificate, and keeping both would bring the loop back. CLAUDE_CODE_DISABLE_LOOPED_CROSS_CERT_DROP=1 keeps them all.`,
      );
    if (keptCount > 0) {
      logForDebugging(
        `CA certs: Kept ${keptCount} cross-certificate(s) that loop in the system store: a server's certificate chain needs them (the root with the same name and key is not the issuer it names)`,
      );
      if (warnOnceCa("cross_loop_server_kept"))
        logFeatureSad("ca_certs_load", "cross_loop_server_kept", {
          kept_count: keptCount,
        });
    }
    let droppable_2 = new Set([...droppable].filter((cert) => !listedHashes.has(cert.fingerprint256)));
    let judged = {
      looping,
      dropped: looping.filter(({ cross }) => droppable_2.has(cross)),
    };
    if (droppable.size === 0)
      return {
        list: pems,
        alone: pems,
        judged,
      };
    if (droppable_2.size < droppable.size)
      logForDebugging(
        `CA certs: Kept ${droppable.size - droppable_2.size} cross-certificate(s) that certify each other in a loop in the system store: NODE_EXTRA_CA_CERTS lists them too`,
      );
    if (droppable_2.size > 0) {
      logForDebugging(
        `CA certs: Dropped ${droppable_2.size} cross-certificate(s) from system store that certify each other in a loop beside their root: ${[
          ...droppable_2,
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
          dropped_count: droppable_2.size,
        });
    }
    let filtered_2 = pems.filter((pem) => {
      let cert = singlePemCerts.get(pem);
      return !cert || !droppable.has(cert);
    });
    return {
      list:
        droppable_2.size === droppable.size
          ? filtered_2
          : pems.filter((pem) => {
              let cert = singlePemCerts.get(pem);
              return !cert || !droppable_2.has(cert);
            }),
      alone: filtered_2,
      judged,
    };
  } catch (error) {
    logForDebugging(`CA certs: Left the system store's certificates as they are: ${error}`, {
      level: "error",
    });
    return unchanged;
  }
}
//@ chunk-355mdh7x.js:66408-69959 placement
/**
 * 被拒根证书与 SPKI 的索引（快速判断某证书是否在黑名单）。
 */
var BLOCKED_ROOT_SHA256_2; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var BLOCKED_ROOT_SHA256;
var BLOCKED_ROOT_SPKI_SHA256;
var LEAKED_CA_SPKI_SHA256;
var blockedCaIndex;
deferInit("chunk-355mdh7x.js:66408", () => {
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
//@ chunk-355mdh7x.js:69959-70098 placement
function blockedRootSet(keptKeys) {
  let filtered = BLOCKED_ROOT_SHA256_2.filter((entry) => !keptKeys.has(entry.key));
  return {
    certificates: new Set(filtered.map((entry) => entry.certificate)),
    keys: new Set(filtered.map((entry) => entry.key)),
  };
}
//@ chunk-355mdh7x.js:70098-70254 placement
var BLOCKED_ROOTS; // deferred: uses blockedRootSet of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-355mdh7x.js:70098", () => {
  BLOCKED_ROOTS = blockedRootSet(
    new Set([
      "376a1a7082a593dccc20d561d119e9ab8d30f11cc321d0a37fa41f0df284e01c",
      "ece28e35289ce8621c72407949e5050052ad4607cc332eaf9b546029aacbfb7a",
    ]),
  );
});
//@ chunk-355mdh7x.js:70254-70609 placement
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
//@ chunk-355mdh7x.js:70609-70618 placement
/**
 * 嵌套被拒证书块的最大层数（8）。
 */
var MAX_NESTED_BLOCK_DEPTH = 8;
//@ chunk-355mdh7x.js:70618-70689 placement
/**
 * 来源是 NODE_EXTRA_CA_CERTS 时给出“整个文件”的补充说明。
 */
function describeSourceSuffix(source) {
  return source === "NODE_EXTRA_CA_CERTS" ? " (the whole file)" : "";
}
//@ chunk-355mdh7x.js:70689-73747 layout
function warnExtraCertsProblem(kind, fingerprint, warned) {
  let warnKey = `${kind}:${fingerprint}`;
  if (warned.has(warnKey)) return;
  warned.add(warnKey);
  let message = {
    block:
      "Claude Code ignored a block in the NODE_EXTRA_CA_CERTS file: the block holds a root certificate on the CLI's deny list, in a form Claude Code could not read. The other certificates in the file are still used.",
    file: "Claude Code ignored all of the NODE_EXTRA_CA_CERTS file: it holds a root certificate on the CLI's deny list, in a form Claude Code could not read. Run Claude Code with --debug to write its SHA-256 fingerprint to the debug log, then remove that certificate from the file.",
    damaged:
      "Claude Code used only the plain certificates it could read in full from the NODE_EXTRA_CA_CERTS file: the file holds a damaged copy of a root certificate on the CLI's deny list, such as one missing its END line. Run Claude Code with --debug to write its SHA-256 fingerprint to the debug log, then remove that copy from the file.",
    nested:
      "Claude Code ignored all of the NODE_EXTRA_CA_CERTS file: it holds root certificates on the CLI's deny list nested too deeply to cut out. Remove them so the rest of the file is used.",
    partlyLoaded:
      "Claude Code used only the certificates that it could read in full from the NODE_EXTRA_CA_CERTS file: its certificates cannot be loaded together, most likely because one of them is cut off or damaged, or because a line break is missing between two of them. Each -----BEGIN CERTIFICATE----- and -----END CERTIFICATE----- marker must be alone on its line. Fix the file so that every certificate in it is used.",
    unloadable:
      "Claude Code ignored all of the NODE_EXTRA_CA_CERTS file: it holds no certificate that Claude Code can read. The file must hold certificates in PEM format, in which each certificate is base64 text between a -----BEGIN CERTIFICATE----- line and an -----END CERTIFICATE----- line. Claude Code does not read a binary (DER) file, UTF-16 text, base64 text without those two lines, or a certificate that is cut off or damaged. Fix or replace the file, or unset NODE_EXTRA_CA_CERTS if you do not need it.",
    selfNamed: `Claude Code ignored the certificate with SHA-256 fingerprint ${fingerprint} in the NODE_EXTRA_CA_CERTS file: it names itself as its issuer, but Claude Code could not confirm that the certificate's own key signed it. Run Claude Code with --debug to write the certificate's subject and the cause to the debug log. If you do not know where the certificate came from, remove it from the file. If another root certificate of the same CA signed it, as when a CA renews its root with a new key, add the root that signed it to the file, if you still trust that root. If connections still fail, take that root out of the file again. Then, or if no other root signed it, set CLAUDE_CODE_DISABLE_SELF_NAMED_CERT_DROP=1, but only if you trust the ignored certificate, such as a self-signed root whose signature Claude Code cannot check or a server's own certificate. The variable keeps every certificate that Claude Code would ignore for this reason, whoever signed it, and can break connections that work without it.`,
  }[kind];
  console.error(message);
}
//@ chunk-355mdh7x.js:73747-73953 placement
function pemStartsWithRaw(block, cert) {
  let sliced = block.slice(block.indexOf("-----", 5) + 5, block.lastIndexOf("-----END"));
  let buffer = Buffer.from(sliced.replace(/[^A-Za-z0-9+/]/g, ""), "base64");
  let { raw } = cert;
  return buffer.length > raw.length && buffer.subarray(0, raw.length).equals(raw);
}
//@ chunk-355mdh7x.js:73953-74054 layout
function validateCaBundle(pem) {
  let tlsModule = importMetaRequire("tls");
  try {
    tlsModule.createSecureContext({
      ca: [pem],
    });
    return;
  } catch (error) {
    return String(error);
  }
}
//@ chunk-355mdh7x.js:74054-74554 placement
/**
 * 解析内置根证书 PEM，按 sha256 只保留允许列表中的证书，返回 base64 原文与哈希。
 */
function selectBundledRootCertificates(pems, state) {
  let { X509Certificate, createHash } = importMetaRequire("crypto");
  return pems.flatMap((pem) => {
    let knownHash = state?.knownRootOf(pem)?.hashes.certificate ?? state?.ofBundledRoot.get(pem);
    if (knownHash !== undefined && !blockedCaIndex.certificates.has(knownHash)) return [];
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
    state?.ofBundledRoot.set(pem, hash);
    if (!blockedCaIndex.certificates.has(hash)) return [];
    return [
      {
        base64: raw.subarray(0, raw.length - (raw.length % 3)).toString("base64"),
        hash,
      },
    ];
  });
}
//@ chunk-355mdh7x.js:74554-78298 placement
/**
 * 过滤掉拒绝名单中的证书。
 */
function withoutBlockedCertsUnsafe(
  entries,
  bundledRoots,
  blockedIndex = blockedCaIndex,
  warned = new Set(),
  state,
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
  let findBundledRoot = (block, bundled = bundledRoots) => {
    let replaced = block.replace(/\s+/g, "");
    return bundled.find(({ base64 }) => replaced.includes(base64));
  };
  let hashesOf = (cert) => {
    let certificate = sha256Hex(cert.raw);
    let keyReadThrew = false;
    try {
      let publicKey = cert.publicKey;
      try {
        publicKey = createPublicKey({
          key: publicKey.export({
            format: "jwk",
          }),
          format: "jwk",
        });
      } catch {
        keyReadThrew = true;
      }
      return {
        certificate,
        key: sha256Hex(
          publicKey.export({
            type: "spki",
            format: "der",
          }),
        ),
        keyReadThrew,
      };
    } catch {
      return {
        certificate,
        key: undefined,
        keyReadThrew: true,
      };
    }
  };
  let blockedHashOfHashes = ({ certificate, key }, index) =>
    index.certificates.has(certificate) ||
    (key !== undefined && (index.keys.has(key) || LEAKED_CA_SPKI_SHA256.has(key)))
      ? certificate
      : undefined;
  let blockedHashOfCert = (cert, index) => blockedHashOfHashes(hashesOf(cert), index);
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
    return blockedHashOfCert(cert, blockedCaIndex);
  };
  let kept = [];
  for (let { pem, source } of entries) {
    let isExtraCerts = source === "NODE_EXTRA_CA_CERTS" && blockedIndex === blockedCaIndex;
    let knownRoot = state?.knownRootOf(pem);
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
        let blockHash = state && sha256Hex(sliced);
        let hashes =
          knownRoot?.hashes ?? (blockHash === undefined ? undefined : state?.ofBlock.get(blockHash));
        let isListedBlock = hashes !== undefined && !blockedHashOfHashes(hashes, blockedCaIndex);
        if (
          isListedBlock &&
          knownRoot &&
          state &&
          blockHash !== undefined &&
          state.ofBlock.size < MAX_PARSED_CERT_BLOCKS
        )
          state.ofBlock.set(blockHash, knownRoot.hashes);
        let cert = isListedBlock ? undefined : parseCert(sliced);
        let note;
        if (cert) {
          let hashes = hashesOf(cert);
          if (
            state &&
            blockHash !== undefined &&
            !hashes.keyReadThrew &&
            state.ofBlock.size < MAX_PARSED_CERT_BLOCKS
          )
            state.ofBlock.set(blockHash, hashes);
          let ourHash = blockedHashOfHashes(hashes, blockedCaIndex);
          if (ourHash && !blockedHashOfHashes(hashes, blockedIndex)) {
            let isTrustedBlock = sliced.startsWith("-----BEGIN TRUSTED");
            if (!isTrustedBlock) reencoded.add(cert.toString());
            note = isTrustedBlock
              ? `Left certificate ${ourHash} from ${source} out of the list for hosts that aren't ours: it is in a TRUSTED CERTIFICATE block, which the runtime does not load`
              : `Re-encoded certificate ${ourHash} from ${source}: the list for hosts that aren't ours trusts it, and its original text could stop that list from loading`;
          } else if (ourHash) note = `Dropped blocked certificate ${ourHash} from ${source}`;
        } else if (!isListedBlock) {
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
      if (isExtraCerts) warnExtraCertsProblem("nested", sha256Hex(pem), warned);
      continue;
    }
    let outsideHash = findBundledRoot(text);
    let reencodedList = outsideHash
      ? [
          ...reencoded,
          ...(text.includes("\x00")
            ? []
            : pemSpans(text).flatMap(([start, end], index, allSpans) => {
                let block = text.slice(start, end);
                let cert =
                  start >= (allSpans[index - 1]?.[1] ?? 0) &&
                  (start === 0 ||
                    text[start - 1] ===
                      `
`) &&
                  /^(\r?\n|$)/.test(text.slice(end, end + 2)) &&
                  !block.startsWith("-----BEGIN TRUSTED")
                    ? parseCert(block)
                    : undefined;
                return cert && !pemStartsWithRaw(block, cert) && !blockedHashOfCert(cert, blockedIndex)
                  ? [cert.toString().trim()]
                  : [];
              })),
        ]
      : [];
    let hasParsableBlock = () => pemSpans(text).some(([start, end]) => parseCert(text.slice(start, end)));
    let shouldKeep = outsideHash
      ? reencodedList.length > 0
      : depth === 0 || reencoded.size > 0 || hasParsableBlock();
    let rewritten = !shouldKeep
      ? undefined
      : outsideHash
        ? reencodedList.join(`
`)
        : reencoded.size > 0
          ? [...reencoded, ...(hasParsableBlock() ? [text.trim()] : [])].join(`
`)
          : text;
    let loadError =
      rewritten !== undefined && source === "NODE_EXTRA_CA_CERTS" ? validateCaBundle(rewritten) : undefined;
    let loadableBlocks =
      rewritten === undefined || loadError === undefined
        ? []
        : pemSpans(rewritten)
            .map(([start, end]) => rewritten.slice(start, end))
            .filter(
              (block) =>
                !block.startsWith("-----BEGIN TRUSTED") &&
                parseCert(block) &&
                validateCaBundle(block) === undefined,
            );
    let keptText =
      loadError === undefined
        ? rewritten
        : loadableBlocks.length > 0
          ? loadableBlocks.join(`
`)
          : undefined;
    if (outsideHash)
      logForDebugging(
        `CA certs: ${source}${describeSourceSuffix(source)} holds blocked certificate ${outsideHash.hash} outside any block; ${shouldKeep ? `kept only the ${reencodedList.length} certificate(s) in it that parse, re-encoded` : "ignored it"}`,
      );
    if (isExtraCerts && (outsideHash || droppedUnreadable))
      warnExtraCertsProblem(
        keptText !== undefined ? (outsideHash ? "damaged" : "block") : "file",
        sha256Hex(pem),
        warned,
      );
    if (loadError !== undefined) {
      logForDebugging(
        `CA certs: The runtime cannot load ${depth > 0 || outsideHash ? "what is left of the NODE_EXTRA_CA_CERTS file" : "the NODE_EXTRA_CA_CERTS file"} as one CA list entry (${loadError}); ${keptText !== undefined ? `kept only the ${loadableBlocks.length} certificate(s) in it that the runtime loads one by one` : "ignored it"}`,
        {
          level: "error",
        },
      );
      if (isExtraCerts)
        warnExtraCertsProblem(keptText !== undefined ? "partlyLoaded" : "unloadable", sha256Hex(pem), warned);
    }
    if (keptText !== undefined) kept.push(keptText);
  }
  return kept;
}
//@ chunk-355mdh7x.js:78298-79314 placement
/**
 * 组合 CA 列表（额外证书、内置证书回退）。
 */
function buildCaList(
  entries,
  pems,
  blockedIndex = blockedCaIndex,
  bundledRootCertificates,
  warnedExtraCerts = new Set(),
  state,
) {
  let resolvedBundledRoots = bundledRootCertificates ?? selectBundledRootCertificates(pems, state);
  let list = withoutBlockedCertsUnsafe(entries, resolvedBundledRoots, blockedIndex, warnedExtraCerts, state);
  if (list.length > 0) return list;
  let mapped = pems.map((pem) => ({
    pem,
    source: "bundled",
  }));
  let bundledKept = withoutBlockedCertsUnsafe(mapped, resolvedBundledRoots, blockedIndex, undefined, state);
  if (bundledKept.length > 0) return bundledKept;
  if (pems.length === 0 && entries.length === 0)
    throw Error(
      "No certificate authority to trust: no usable CA certificate was found (none could be read, every one had expired, or the claude-code-server host handed none), and this runtime has no built-in root certificates. Check the CA files this process reads (SSL_CERT_FILE, SSL_CERT_DIR) and CLAUDE_CODE_CERT_STORE; NODE_EXTRA_CA_CERTS only adds to those and does not count on its own.",
    );
  if (pems.length === 0)
    throw Error(
      "No certificate authority to trust: every CA certificate found is on the CLI's deny list, and this runtime has no built-in root certificates. Add a certificate authority that is not on the deny list to the CA files (SSL_CERT_FILE, SSL_CERT_DIR).",
    );
  throw Error(
    "No root certificates are left to trust: every root built into this runtime is on the CLI's deny list. Update Claude Code.",
  );
}
//@ chunk-355mdh7x.js:79314-79435 placement
function withoutBlockedCerts(pem, source) {
  let tlsModule = importMetaRequire("tls");
  let state = knownHashesOf(onProcessRootHost(caCertStateByHost));
  return withoutBlockedCertsUnsafe(
    [
      {
        pem,
        source,
      },
    ],
    selectBundledRootCertificates(tlsModule.rootCertificates, state),
    undefined,
    undefined,
    state,
  )[0];
}
//@ chunk-355mdh7x.js:79435-79554 placement (2.1.88 match: hashContent, 0.789)
/**
 * 判定某个证书 SHA-256 是否在本机已知哈希白名单里。
 */
function denyListHasReadKeyOf(content) {
  let { createHash } = importMetaRequire("crypto");
  return (
    knownHashesOf(onProcessRootHost(caCertStateByHost))?.ofBlock.has(
      createHash("sha256").update(content).digest("hex"),
    ) ?? false
  );
}
//@ chunk-355mdh7x.js:79554-79753 placement
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
//@ chunk-355mdh7x.js:79753-79927 placement
function getCACertificates() {
  let state = getCaCertState();
  if (state.fromHost) return state.fromHost.certificates;
  let useClientCert = Boolean(env.CLAUDE_CODE_CLIENT_CERT);
  if (!state.certificates.cache.has(useClientCert)) resetKnownHashes(state);
  return state.certificates(useClientCert);
}
//@ chunk-355mdh7x.js:79927-80066 placement
/**
 * 取当前生效的客户端证书集合（来自主机或缓存）。
 */
function peekCACertificates() {
  let caCertState = getCaCertState();
  if (caCertState.fromHost) return caCertState.fromHost.certificates;
  return caCertState.certificates.cache.get(Boolean(env.CLAUDE_CODE_CLIENT_CERT));
}
//@ chunk-355mdh7x.js:80066-80341 placement
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
//@ chunk-355mdh7x.js:80341-80414 placement
function isRuntimeStoreCABundle(value) {
  return Array.isArray(value) && getCaCertState().runtimeStoreBundles.has(value);
}
//@ chunk-355mdh7x.js:80414-80494 placement
function hasSeenTrustOverride() {
  let caCertState = getCaCertState();
  caCertState.trustOverrideSeen ||= hasCaEnvOverride();
  return caCertState.trustOverrideSeen;
}
//@ chunk-355mdh7x.js:80494-80639 placement (2.1.88 match: formatShortcut, 1)
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
//@ chunk-355mdh7x.js:80639-81130 placement
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
//@ chunk-355mdh7x.js:81130-81300 placement
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
//@ chunk-355mdh7x.js:81300-84253 placement
/**
 * 去掉主体与签发者同名但非自签的证书。
 */
function dropSelfNamedCerts(pems, onDrop, state) {
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
  let runtimeRoots = new Set(
    tlsModule.rootCertificates.map((rootCertificate) => rootCertificate.replace(/-----[A-Z ]+-----|\s/g, "")),
  );
  let describePem = (pem) =>
    pemSpans(pem).map(([start, end]) => {
      let block = pem.slice(start, end);
      try {
        let cert = new X509Certificate(block);
        let subject = formatShortcut(cert.subject ?? "");
        let issuer = formatShortcut(cert.issuer ?? "");
        let startsWithRaw = pemStartsWithRaw(block, cert);
        let selfNamedTrusted = subject === issuer && TRUSTED_CERT_FINGERPRINTS.has(cert.fingerprint256);
        let isAnchored = startsWithRaw || selfNamedTrusted;
        let unconfirmed;
        if (!isAnchored && subject === issuer)
          try {
            isAnchored = dropDisabled || runtimeRoots.has(cert.raw.toString("base64")) || isSelfSigned(cert);
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
          trustData: startsWithRaw,
        };
      } catch {
        return {
          start,
          end,
          listed: undefined,
          trustData: false,
        };
      }
    });
  let mapped = pems.map((pem) => (state?.knownRootOf(pem) ? undefined : describePem(pem)));
  if (!mapped.some((entries) => entries?.some((entry) => entry.listed?.anchor === false)))
    return {
      kept: [...pems],
      dropped: 0,
    };
  let mapped_2 = mapped.map((entries, pemIndex) => entries ?? describePem(pems[pemIndex]));
  let flattened = mapped_2.flat().flatMap((entry) => entry.listed ?? []);
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
  let droppedCount = countWhere(flattened, (listed) => !listed.kept);
  if (droppedCount === 0 || droppedCount === flattened.length)
    return {
      kept: [...pems],
      dropped: 0,
    };
  let kept = pems.flatMap((pem, pemIndex) => {
    let entries = mapped_2[pemIndex];
    if (entries.every((entry) => entry.listed?.kept !== false)) return [pem];
    if (!entries.some((entry) => entry.listed?.kept))
      return entries.some((entry) => entry.listed) ? [] : [pem];
    let mapped = entries.map((entry, entryIndex) =>
      pem.slice(entries[entryIndex - 1]?.end ?? 0, entry.start),
    );
    if (!(
      entries.every(
        (entry, entryIndex) =>
          entry.start >= (entries[entryIndex - 1]?.end ?? 0) &&
          /(^|\n)$/.test(mapped[entryIndex]) &&
          /^(\r?\n|$)/.test(pem.slice(entry.end, entry.end + 2)),
      ) &&
      entries.every((entry) => entry.listed && !entry.trustData) &&
      !pem.includes("\x00") &&
      [...mapped, pem.slice(entries.at(-1).end)].every(
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
  mapped_2.forEach((entries, pemIndex) => {
    for (let { listed } of entries)
      if (listed?.unconfirmed && !listed.kept) {
        let { fingerprint256, subject } = listed.certificate;
        logForDebugging(
          `CA certs: Dropped the certificate with SHA-256 fingerprint ${fingerprint256} and subject ${JSON.stringify(subject ?? "")}: it names itself as its issuer, but ${listed.unconfirmed}, and no CA that chains to a root in the CA list signed it. If another root certificate of the same CA signed it, this one stays once this list holds that root certificate too. Only the lists for Claude Code's own connections take certificates from the NODE_EXTRA_CA_CERTS file. If you add that root and connections still fail, take it out again: while this list holds it, the variable below changes nothing. CLAUDE_CODE_DISABLE_SELF_NAMED_CERT_DROP=1 keeps every such certificate, whoever signed it, and can break connections that work without it.`,
          {
            level: "error",
          },
        );
        onDrop?.(pems[pemIndex], fingerprint256);
      }
  });
  return {
    kept,
    dropped: countWhere(flattened, (listed) => !listed.kept),
  };
}
//@ chunk-355mdh7x.js:84253-87047 placement
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
  let caState = knownHashesOf(state);
  let tlsModule_2 = caState?.readBundledRoots() ?? tlsModule.rootCertificates;
  let getCACertificates = tlsModule.getCACertificates;
  if (!included && included_2 && !getCACertificates) {
    logForDebugging(
      `CA certs: stores=system but system CA API unavailable${refusesBundledFallback ? "" : ", using bundled roots"}`,
    );
    if (warnOnceCa("system_api_unavailable")) logFeatureSad("ca_certs_load", "system_api_unavailable");
  }
  let entries = [];
  let emptyReason = "every certificate in the system CA store is expired or on the deny list";
  let pushRoots = (source, tlsModule) => {
    for (let pem of tlsModule)
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
    pushRoots("bundled", tlsModule_2);
    logForDebugging(`CA certs: Loaded ${tlsModule_2.length} bundled root certificates`);
  }
  if (included_2)
    try {
      let systemCerts = caState ? caState.readSystemStore() : getCACertificates?.("system");
      if (systemCerts && systemCerts.length > 0) {
        let unexpired = dropExpiredCerts(systemCerts, Date.now(), parsedByPem, caState);
        pushRoots("system", unexpired);
        logForDebugging(`CA certs: Loaded ${unexpired.length} system CA certificates`);
      } else {
        logForDebugging(`CA certs: system store ${getCACertificates ? "returned empty" : "unavailable"}`);
        emptyReason = getCACertificates
          ? "the system CA store is empty: check that this process can read its CA files (SSL_CERT_FILE, SSL_CERT_DIR, or the system's default paths)"
          : "the runtime has no system CA store";
        if (!included && !refusesBundledFallback) pushRoots("bundled", tlsModule_2);
      }
    } catch (error) {
      logForDebugging(`CA certs: Failed to load system CA certificates: ${error}`, {
        level: "error",
      });
      if (warnOnceCa("system_store_failed")) logFeatureSad("ca_certs_load", "system_store_failed");
      emptyReason = "reading the system CA store failed";
      if (!included && !refusesBundledFallback) pushRoots("bundled", tlsModule_2);
    }
  let bundledRootCertificates = selectBundledRootCertificates(tlsModule_2, caState);
  let baseList = refusesBundledFallback
    ? withoutBlockedCertsUnsafe(
        entries,
        bundledRootCertificates,
        blockedIndex,
        state.warnedExtraCerts,
        caState,
      )
    : buildCaList(
        entries,
        tlsModule_2,
        blockedIndex,
        bundledRootCertificates,
        state.warnedExtraCerts,
        caState,
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
          caState,
        );
    extraPems = all ? [content] : extraBlocks;
    extraUsed = all || extraBlocks.length > 0;
    logForDebugging(
      extraUsed
        ? `CA certs: Appended extra certificates from NODE_EXTRA_CA_CERTS (${NODE_EXTRA_CA_CERTS})${all ? ": all of them were already trusted from the CA store, so each is listed once" : ""}`
        : `CA certs: Nothing from NODE_EXTRA_CA_CERTS (${NODE_EXTRA_CA_CERTS}) is left to append`,
    );
  }
  let now = Date.now();
  let serverCerts = state.servedCertificates.filter(
    (servedCertificate) =>
      !(new Date(servedCertificate.validFrom).getTime() > now) &&
      new Date(servedCertificate.validTo).getTime() > now,
  );
  let envValue =
    useClientCert || env.CLAUDE_CODE_DISABLE_LOOPED_CROSS_CERT_DROP
      ? {
          list: baseList,
          alone: baseList,
          judged: undefined,
        }
      : chooseAnchoredCerts(baseList, parsedByPem, extraPems, serverCerts);
  let merged = normalizeCaseForComparison_2([...envValue.list, ...extraBlocks]);
  let selfNamedDropped = 0;
  let result = useClientCert
    ? {
        kept: merged,
        dropped: 0,
      }
    : dropSelfNamedCerts(
        merged,
        (pem, fingerprint) => {
          selfNamedDropped++;
          if (extraPems.some((extraPem) => extraPem.includes(pem.trim())))
            warnExtraCertsProblem("selfNamed", fingerprint, state.warnedExtraCerts);
        },
        caState,
      );
  return {
    list: result.kept,
    dropped: result.dropped,
    selfNamedDropped,
    storeCerts: envValue.alone,
    appendedExtraCerts: extraUsed,
    wantsBundled: included,
    wantsSystem: included_2,
    judged: envValue.judged,
    served: serverCerts,
  };
}
//@ chunk-355mdh7x.js:87047-88203 placement
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
  let {
    list,
    dropped,
    selfNamedDropped,
    storeCerts,
    appendedExtraCerts,
    wantsBundled,
    wantsSystem,
    judged,
    served,
  } = loadCaCertificates(state, useClientCert, blockedCaIndex);
  if (judged !== undefined) {
    state.droppedCrossCertificates = judged.dropped;
    state.servedCertificates = served.filter((pair) =>
      judged.looping.some(({ cross, root }) => isCrossSigningRoot(pair, cross, root)),
    );
  } else state.droppedCrossCertificates = [];
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
  state.storeCertificates = appendedExtraCerts ? normalizeCaseForComparison_2(storeCerts) : list;
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
//@ chunk-355mdh7x.js:88203-88212 placement
/**
 * 服务器可直接追加的证书数量上限 8。
 */
var MAX_SERVED_CERTIFICATES = 8;
//@ chunk-355mdh7x.js:88212-89134 placement
/**
 * 从服务器发来的证书里挑出用于选择系统交叉证书的补充项：以 8 张为限、按指纹去重，并打印忽略/记录日志。
 */
function noteServedCertificates(certificates) {
  let caCertState = getCaCertState();
  if (caCertState.fromHost) return false;
  let servedFingerprints = new Set(
    caCertState.servedCertificates.map((crossFingerprint) => crossFingerprint.fingerprint256),
  );
  let candidates = caCertState.droppedCrossCertificates.filter(
    ({ cross, root }) =>
      !caCertState.servedCertificates.some((servedCertificate) =>
        isCrossSigningRoot(servedCertificate, cross, root),
      ),
  );
  let now = Date.now();
  let accepted = [];
  let ignoredCount = 0;
  for (let certificate of certificates) {
    let candidateIndex = candidates.findIndex(
      ({ cross, root }) =>
        !servedFingerprints.has(certificate.fingerprint256) &&
        !(new Date(certificate.validFrom).getTime() > now) &&
        new Date(certificate.validTo).getTime() > now &&
        isCrossSigningRoot(certificate, cross, root),
    );
    if (candidateIndex === -1) continue;
    if (caCertState.servedCertificates.length + accepted.length >= MAX_SERVED_CERTIFICATES) {
      ignoredCount++;
      continue;
    }
    candidates.splice(candidateIndex, 1);
    servedFingerprints.add(certificate.fingerprint256);
    accepted.push(certificate);
  }
  if (ignoredCount > 0)
    logForDebugging(
      `CA certs: Ignored ${ignoredCount} more certificate(s) that a server sent: ${MAX_SERVED_CERTIFICATES} are already held to choose among the system store's cross-certificates`,
    );
  if (accepted.length === 0) return false;
  caCertState.servedCertificates = [...caCertState.servedCertificates, ...accepted];
  logForDebugging(
    `CA certs: Noted ${accepted.length} certificate(s) that a server sent; they only choose which system cross-certificates stay and are not added to the CA list`,
  );
  clearCACertsCache_2(caCertState);
  return true;
}
//@ chunk-355mdh7x.js:89134-89282 placement
/**
 * 判定是否还有未被记录的系统交叉证书待匹配。
 */
function hasDroppedLoopingCrossCertificates() {
  let caCertState = getCaCertState();
  return (
    caCertState.fromHost === null &&
    caCertState.droppedCrossCertificates.some(
      ({ cross, root }) =>
        !caCertState.servedCertificates.some((servedCertificate) =>
          isCrossSigningRoot(servedCertificate, cross, root),
        ),
    )
  );
}
//@ chunk-355mdh7x.js:89282-89341 placement
/**
 * 已丢弃交叉证书的数量。
 */
function cutLoopingCrossCertificateCount() {
  return getCaCertState().droppedCrossCertificates.length;
}
//@ chunk-355mdh7x.js:89341-89365 placement
/**
 * 清除 CA 证书缓存。
 */
function clearCACertsCache() {
  clearCACertsCache_2(getCaCertState());
}
//@ chunk-355mdh7x.js:89365-89421 fingerprint (2.1.88 match: clearCACertsCache, 0.866)
function clearCACertsCache_2(state) {
  resetKnownHashes(state);
  logForDebugging("Cleared CA certificates cache");
}
//@ chunk-355mdh7x.js:89421-89510 placement
/**
 * 在 remote 或 keepsKnownHashes 时返回已知哈希表；utils/caCerts 也用它。
 */
function knownHashesOf(state) {
  return env.CLAUDE_CODE_REMOTE === true || state.keepsKnownHashes ? state.knownHashes : undefined;
}
//@ chunk-355mdh7x.js:89510-89577 placement
/**
 * 清空证书缓存与已知哈希；utils/caCerts 在重载时调用。
 */
function resetKnownHashes(state) {
  state.certificates.cache.clear?.();
  state.knownHashes = new caCertState();
}
//@ chunk-355mdh7x.js:92981-93027 placement
/**
 * 记录已设置的运行时默认 CA 列表，避免重复设置。
 */
var caDefaultListState; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-355mdh7x.js:92981", () => {
  caDefaultListState = identity(
    {
      list: undefined,
    },
    (state) => {
      state.list = undefined;
    },
  );
});
//@ chunk-355mdh7x.js:93027-93105 placement
/**
 * 把若干 PEM 文本拆成各证书块。
 */
function splitPemBlocks(caCertificates) {
  return (caCertificates ?? []).flatMap((pem) => pemSpans(pem).map(([start, end]) => pem.slice(start, end)));
}
//@ chunk-355mdh7x.js:93105-93136 placement
/**
 * 把单个证书设为运行时默认 CA。
 */
function setDefaultCaFor(pem) {
  return trySetDefaultCaCertificates([pem]);
}
//@ chunk-355mdh7x.js:93136-93597 placement
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
//@ chunk-355mdh7x.js:93597-93673 placement
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
  splitPemBlocks,
  setDefaultCaFor,
  caListFor,
  applyDefaultCaCertificates,
  withoutBlockedOrUnanchoredCerts,
  cutLoopingCrossCertificateCount,
  noteServedCertificates,
  hasDroppedLoopingCrossCertificates,
  peekCACertificates,
  clearCACertsCache,
  loadExtraCACerts,
  withoutBlockedCerts,
  BLOCKED_ROOT_SHA256,
  BLOCKED_ROOT_SPKI_SHA256,
  LEAKED_CA_SPKI_SHA256,
  denyListHasReadKeyOf,
  hasSeenTrustOverride,
  isRuntimeStoreCABundle,
  pemSpans,
};
