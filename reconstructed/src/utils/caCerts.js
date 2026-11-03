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
import { io } from "../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
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

//@ chunk-hq88884p.js:28542-28581 placement = filterToBundledAndMcp (0.596)
/**
 * 一次性告警去重集合。
 */
var DEFAULT_CA_CERT_SOURCES = ["bundled", "system"];
var warnedCaKeys = new Set();
//@ chunk-hq88884p.js:28581-28637 placement
/**
 * 同一类 CA 证书告警只打印一次。
 */
function warnOnceCa(e) {
  if (warnedCaKeys.has(e)) return false;
  warnedCaKeys.add(e);
  return true;
}
//@ chunk-hq88884p.js:28637-28890 placement
class CaCertState {
  extraCACerts = null;
  certificates = io((e) => refreshCaState(this, e));
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
var caCertStateByHost = new HostScoped(() => new CaCertState());
//@ chunk-hq88884p.js:28915-28951 placement
/**
 * 取出当前宿主的 CA 证书状态。
 */
function getCaCertState() {
  return caCertStateByHost.of(getRootSession().host);
}
//@ chunk-hq88884p.js:28951-29505 placement
var loadExtraCACerts = serializeCalls(async () => {
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
//@ chunk-hq88884p.js:29505-30014 placement
/**
 * 解析 CLAUDE_CODE_CERT_STORE（bundled/system）。
 */
function certStoreSources() {
  let CLAUDE_CODE_CERT_STORE = env.CLAUDE_CODE_CERT_STORE;
  if (CLAUDE_CODE_CERT_STORE) {
    let r = [];
    for (let n of CLAUDE_CODE_CERT_STORE.split(",")) {
      let lower = n.trim().toLowerCase();
      if (lower === "bundled" || lower === "system") {
        if (!r.includes(lower)) r.push(lower);
      } else if (lower) {
        logForDebugging(`CA certs: unrecognized CLAUDE_CODE_CERT_STORE source '${lower}', ignoring`, {
          level: "warn",
        });
        if (warnOnceCa("parse_skip")) logFeatureSad("ca_certs_load", "parse_skip");
      }
    }
    if (r.length === 0 && warnOnceCa("parse_all_invalid"))
      logFeatureSad("ca_certs_load", "parse_all_invalid");
    return r.length > 0 ? r : DEFAULT_CA_CERT_SOURCES;
  }
  if (hasNodeOption("--use-system-ca") || hasNodeOption("--use-openssl-ca")) return ["system"];
  return DEFAULT_CA_CERT_SOURCES;
}
//@ chunk-hq88884p.js:30014-30466 placement
/**
 * 去掉已过期的证书。
 */
function dropExpiredCerts(e, r = Date.now(), n) {
  let { X509Certificate } = importMetaRequire("crypto");
  let s = 0;
  let filtered = e.filter((a) => {
    try {
      let u = new X509Certificate(a);
      let time = new Date(u.validTo).getTime();
      if (Number.isNaN(time) || time > r) {
        if (n && !u.checkIssued(u) && !(u.subject === u.issuer && u.verify(u.publicKey))) n.set(a, u);
        return true;
      }
      s++;
      return false;
    } catch {
      return true;
    }
  });
  if (s > 0) {
    logForDebugging(`CA certs: Dropped ${s} expired certificate(s) from system store`);
    if (warnOnceCa("expired_dropped"))
      logFeatureSad("ca_certs_load", "expired_dropped", {
        dropped_count: s,
      });
  }
  return filtered;
}
//@ chunk-hq88884p.js:30466-30505 placement
var buffer = Buffer.from("0603551d0e", "hex");
//@ chunk-hq88884p.js:30505-30666 placement
function extractDerField(raw, r) {
  let index = raw.indexOf(r);
  let index_2 = raw.indexOf(buffer, index === -1 ? 0 : index + r.length);
  if (index_2 === -1) return;
  let s = index_2 + buffer.length;
  let c = raw[s] === 1 ? s + 3 : s;
  return raw.subarray(s, c + 2 + (raw[c + 1] ?? 0));
}
//@ chunk-hq88884p.js:30666-33141 placement
/**
 * 选出有锚点的证书链。
 */
function chooseAnchoredCerts(e, r, n) {
  let o = {
    list: e,
    alone: e,
  };
  try {
    let s = new Map();
    let c = new Map();
    for (let y of e) {
      let T = r.get(y);
      if (T && pemSpans(y).length === 1) {
        s.set(y, T);
        let w = formatShortcut(T.subject ?? "");
        c.set(w, [...(c.get(w) ?? []), T]);
      }
    }
    let now = Date.now();
    let u = new Map();
    for (let y of s.values())
      u.set(
        y,
        (c.get(formatShortcut(y.issuer ?? "")) ?? []).filter(
          (T) => T !== y && !(new Date(T.validTo).getTime() <= now) && y.checkIssued(T),
        ),
      );
    let filtered = [...s.values()].filter((y) => {
      let T = new Set();
      let w = [...(u.get(y) ?? [])];
      while (w.length > 0) {
        let k = w.pop();
        if (k === y) return Boolean(y.subject);
        if (k && !T.has(k)) {
          T.add(k);
          w.push(...(u.get(k) ?? []));
        }
      }
      return false;
    });
    if (filtered.length === 0) return o;
    let { X509Certificate } = importMetaRequire("crypto");
    let E = false;
    let [h = [], P = []] = [e.filter((y) => !s.has(y)), n].map((y) =>
      y.flatMap((T) =>
        pemSpans(T).flatMap(([w, k]) => {
          try {
            return [new X509Certificate(T.slice(w, k))];
          } catch {
            E = true;
            return [];
          }
        }),
      ),
    );
    if (E) {
      logForDebugging(
        "CA certs: Left cross-certificates that loop in the system store: a certificate in the CA list does not parse",
      );
      return o;
    }
    let p = [...h, ...P, ...s.values()];
    let A = new Set();
    for (let y of filtered)
      try {
        let time = new Date(y.validTo).getTime();
        let w = y.publicKey.export({
          type: "spki",
          format: "der",
        });
        let derField = extractDerField(y.raw, w);
        let found = h.find((_) => {
          if (
            _.subject !== y.subject ||
            !_.ca ||
            !(new Date(_.validFrom).getTime() <= now) ||
            !(new Date(_.validTo).getTime() > now) ||
            !(new Date(_.validTo).getTime() >= time)
          )
            return false;
          let v = _.publicKey.export({
            type: "spki",
            format: "der",
          });
          let derField_2 = extractDerField(_.raw, v);
          return (
            v.equals(w) &&
            (derField_2 === undefined || (derField !== undefined && derField_2.equals(derField))) &&
            _.checkIssued(_) &&
            _.verify(_.publicKey)
          );
        });
        let S = formatShortcut(y.subject);
        if (
          found &&
          !p.some(
            (_) =>
              _ !== y && formatShortcut(_.issuer ?? "") === S && _.checkIssued(y) && !_.checkIssued(found),
          )
        )
          A.add(y);
      } catch (error) {
        logForDebugging(
          `CA certs: Left a cross-certificate that loops in the system store (${`${y.subject}`.replaceAll(
            `
`,
            ", ",
          )}): ${error}`,
          {
            level: "error",
          },
        );
      }
    if (A.size === 0) return o;
    let R = new Set(P.map((y) => y.fingerprint256));
    let d = new Set([...A].filter((y) => !R.has(y.fingerprint256)));
    if (d.size < A.size)
      logForDebugging(
        `CA certs: Kept ${A.size - d.size} cross-certificate(s) that certify each other in a loop in the system store: NODE_EXTRA_CA_CERTS lists them too`,
      );
    if (d.size > 0) {
      logForDebugging(
        `CA certs: Dropped ${d.size} cross-certificate(s) from system store that certify each other in a loop beside their root: ${[
          ...d,
        ]
          .map((y) =>
            `${y.subject}`.replaceAll(
              `
`,
              ", ",
            ),
          )
          .join("; ")}`,
      );
      if (warnOnceCa("cross_loop_dropped"))
        logFeatureSad("ca_certs_load", "cross_loop_dropped", {
          dropped_count: d.size,
        });
    }
    let filtered_2 = e.filter((y) => {
      let T = s.get(y);
      return !T || !A.has(T);
    });
    return {
      list:
        d.size === A.size
          ? filtered_2
          : e.filter((y) => {
              let T = s.get(y);
              return !T || !d.has(T);
            }),
      alone: filtered_2,
    };
  } catch (error) {
    logForDebugging(`CA certs: Left the system store's certificates as they are: ${error}`, {
      level: "error",
    });
    return o;
  }
}
//@ chunk-hq88884p.js:33141-36691 placement
/**
 * 被拒根证书与 SPKI 的索引（快速判断某证书是否在黑名单）。
 */
var BLOCKED_ROOT_SHA256_2 = [
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
var BLOCKED_ROOT_SHA256 = new Set(BLOCKED_ROOT_SHA256_2.map((e) => e.certificate));
var BLOCKED_ROOT_SPKI_SHA256 = new Set(BLOCKED_ROOT_SHA256_2.map((e) => e.key));
var LEAKED_CA_SPKI_SHA256 = new Set([
  "ebed6475c2c2d80fcb199f3fe8dd6e6b3ce60b77eb15d4e42c3dec0c6f5b5105",
  "49dd353dc2b919a3770645117d0e60c16115e7d1bc259eefe734b00ea434fe5f",
  "e0254c7fcdc265e2f0f8a428dabb75ab4ae039b4872d62f5ee57f0877d5a8a41",
  "5c0660a2b164910d8ff589c18e14552e9e0ec237dcefe2cb736d41a4811f81a0",
  "ec4ffa1ad0ac88081314b7aaffef6a91f97cd57291bb5ba686c5415f5eb4f6b6",
  "92c063d67e8f14db71d288e11266ffdaf69cbf115f7bab14f3bc2f68d25e0e30",
  "43bffa19d6ef651451f6841e019931e96f6f2eaeff28ab4b6f1ce4576de2717b",
  "63ecefee431d49523bc1136c4e72d0206a477086caf606cd5cf025686c109cf8",
]);
var blockedCaIndex = {
  certificates: BLOCKED_ROOT_SHA256,
  keys: BLOCKED_ROOT_SPKI_SHA256,
};
//@ chunk-hq88884p.js:36691-36830 placement
function blockedRootSet(e) {
  let filtered = BLOCKED_ROOT_SHA256_2.filter((n) => !e.has(n.key));
  return {
    certificates: new Set(filtered.map((n) => n.certificate)),
    keys: new Set(filtered.map((n) => n.key)),
  };
}
//@ chunk-hq88884p.js:36830-36986 placement
var BLOCKED_ROOTS = blockedRootSet(
  new Set([
    "376a1a7082a593dccc20d561d119e9ab8d30f11cc321d0a37fa41f0df284e01c",
    "ece28e35289ce8621c72407949e5050052ad4607cc332eaf9b546029aacbfb7a",
  ]),
);
//@ chunk-hq88884p.js:36986-37341 placement
function pemSpans(e) {
  let r = [];
  let index = e.indexOf("-----BEGIN ");
  let index_2 = e.indexOf("-----END ");
  let s = -1;
  while (index_2 !== -1) {
    if (index !== -1 && index < index_2) {
      s = index;
      index = e.indexOf("-----BEGIN ", index + 1);
      continue;
    }
    let sliced = e.slice(index_2, index_2 + 80);
    let index_3 = sliced.indexOf("-----", 9);
    if (
      index_3 === -1 ||
      sliced.slice(0, index_3).includes(`
`)
    ) {
      index_2 = e.indexOf("-----END ", index_2 + 1);
      continue;
    }
    let u = index_2 + index_3 + 5;
    if (s !== -1) {
      r.push([s, u]);
      s = -1;
    }
    index_2 = e.indexOf("-----END ", u);
  }
  return r;
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
function warnBlockedCertBlock(e, r, n) {
  let o = `${e}:${r}`;
  if (n.has(o)) return;
  n.add(o);
  let s = {
    block:
      "Claude Code ignored a block in the NODE_EXTRA_CA_CERTS file: the block holds a root certificate on the CLI's deny list, in a form Claude Code could not read. The other certificates in the file are still used.",
    file: "Claude Code ignored all of the NODE_EXTRA_CA_CERTS file: it holds a root certificate on the CLI's deny list, in a form Claude Code could not read. Run Claude Code with --debug to write its SHA-256 fingerprint to the debug log, then remove that certificate from the file.",
    damaged:
      "Claude Code used only the plain certificates it could read in full from the NODE_EXTRA_CA_CERTS file: the file holds a damaged copy of a root certificate on the CLI's deny list, such as one missing its END line. Run Claude Code with --debug to write its SHA-256 fingerprint to the debug log, then remove that copy from the file.",
    nested:
      "Claude Code ignored all of the NODE_EXTRA_CA_CERTS file: it holds root certificates on the CLI's deny list nested too deeply to cut out. Remove them so the rest of the file is used.",
    selfNamed: `Claude Code ignored the certificate with SHA-256 fingerprint ${r} in the NODE_EXTRA_CA_CERTS file: it names itself as its issuer, but Claude Code could not confirm that its own key signed it. Run Claude Code with --debug to write the cause to the debug log. If you trust that certificate, set CLAUDE_CODE_DISABLE_SELF_NAMED_CERT_DROP=1, which keeps every such certificate.`,
  }[e];
  console.error(s);
}
//@ chunk-hq88884p.js:38924-39130 placement
function pemStartsWithRaw(e, r) {
  let sliced = e.slice(e.indexOf("-----", 5) + 5, e.lastIndexOf("-----END"));
  let buffer = Buffer.from(sliced.replace(/[^A-Za-z0-9+/]/g, ""), "base64");
  let { raw } = r;
  return buffer.length > raw.length && buffer.subarray(0, raw.length).equals(raw);
}
//@ chunk-hq88884p.js:39130-39484 placement = hashContent (0.605)
/**
 * 解析内置根证书 PEM，按 sha256 只保留允许列表中的证书，返回 base64 原文与哈希。
 */
function selectBundledRootCertificates(content) {
  let { X509Certificate, createHash } = importMetaRequire("crypto");
  return content.flatMap((o) => {
    let s;
    try {
      s = new X509Certificate(o).raw;
    } catch (error) {
      logForDebugging(`CA certs: A bundled root does not parse: ${error}`, {
        level: "error",
      });
      return [];
    }
    let c = createHash("sha256").update(s).digest("hex");
    if (!blockedCaIndex.certificates.has(c)) return [];
    return [
      {
        base64: s.subarray(0, s.length - (s.length % 3)).toString("base64"),
        hash: c,
      },
    ];
  });
}
//@ chunk-hq88884p.js:39484-42148 placement
/**
 * 过滤掉拒绝名单中的证书。
 */
function withoutBlockedCertsUnsafe(
  e,
  bundledRootCertificates,
  n = blockedCaIndex,
  warnedExtraCerts = new Set(),
) {
  let { X509Certificate, createHash, createPublicKey } = importMetaRequire("crypto");
  let u = (p) => createHash("sha256").update(p).digest("hex");
  let l = (p) => {
    try {
      return new X509Certificate(p);
    } catch {
      return;
    }
  };
  let b = (p, A = bundledRootCertificates) => {
    let replaced = p.replace(/\s+/g, "");
    return A.find(({ base64 }) => replaced.includes(base64));
  };
  let E = (p, blockedCaIndex) => {
    let R = u(p.raw);
    if (blockedCaIndex.certificates.has(R)) return R;
    try {
      let publicKey = p.publicKey;
      try {
        publicKey = createPublicKey({
          key: publicKey.export({
            format: "jwk",
          }),
          format: "jwk",
        });
      } catch {}
      let O = u(
        publicKey.export({
          type: "spki",
          format: "der",
        }),
      );
      return blockedCaIndex.keys.has(O) || LEAKED_CA_SPKI_SHA256.has(O) ? R : undefined;
    } catch {
      return;
    }
  };
  let h = (p) => {
    let sliced = p.slice(p.indexOf("-----", 5) + 5, p.lastIndexOf("-----END"));
    let buffer = Buffer.from(sliced.replace(/[^A-Za-z0-9+/]/g, ""), "base64");
    if (buffer[0] !== 48 || buffer.length < 2) return;
    let d = (buffer[1] & 128) !== 0;
    let O = d ? buffer[1] & 127 : 0;
    if ((d && (O === 0 || O > 4)) || buffer.length < 2 + O) return;
    let y = d ? buffer.readUIntBE(2, O) : buffer[1];
    if (2 + O + y > buffer.length) return;
    let chunk = buffer.subarray(0, 2 + O + y);
    let w = u(chunk);
    if (blockedCaIndex.certificates.has(w)) return w;
    let k;
    try {
      k = new X509Certificate(chunk);
    } catch {
      return;
    }
    return E(k, blockedCaIndex);
  };
  let P = [];
  for (let { pem, source } of e) {
    let R = source === "NODE_EXTRA_CA_CERTS" && n === blockedCaIndex;
    let d = pem;
    let O = 0;
    let y = false;
    let T = new Set();
    for (; O <= MAX_NESTED_BLOCK_DEPTH; O++) {
      let _ = [];
      let v = 0;
      let D = 0;
      let V = false;
      for (let [Q, ce] of pemSpans(d)) {
        let sliced = d.slice(Q, ce);
        let ae = l(sliced);
        let re;
        if (ae) {
          let Y = E(ae, blockedCaIndex);
          if (Y && !E(ae, n)) {
            let Ze = sliced.startsWith("-----BEGIN TRUSTED");
            if (!Ze) T.add(ae.toString());
            re = Ze
              ? `Left certificate ${Y} from ${source} out of the list for hosts that aren't ours: it is in a TRUSTED CERTIFICATE block, which the runtime does not load`
              : `Re-encoded certificate ${Y} from ${source}: the list for hosts that aren't ours trusts it, and its original text could stop that list from loading`;
          } else if (Y) re = `Dropped blocked certificate ${Y} from ${source}`;
        } else {
          let Y = b(sliced)?.hash ?? h(sliced);
          if (Y) {
            y = true;
            re = `Dropped an unreadable block from ${source}: the block contains blocked certificate ${Y}`;
          }
        }
        let max = Math.max(Q, D);
        D = ce;
        if (re && max >= v) {
          logForDebugging(`CA certs: ${re}`);
          _.push(d.slice(v, max));
          v = ce;
          V = true;
        }
      }
      if (!V) break;
      _.push(d.slice(v));
      d = _.join("");
    }
    if (O > MAX_NESTED_BLOCK_DEPTH) {
      logForDebugging(
        `CA certs: Ignored an entry from ${source}${describeSourceSuffix(source)}: blocked certificates are nested in it more than ${MAX_NESTED_BLOCK_DEPTH} deep`,
      );
      if (R) warnBlockedCertBlock("nested", u(pem), warnedExtraCerts);
      continue;
    }
    let w = b(d);
    let k = w
      ? [
          ...T,
          ...(d.includes("\x00")
            ? []
            : pemSpans(d).flatMap(([_, v], D, V) => {
                let sliced = d.slice(_, v);
                let z =
                  _ >= (V[D - 1]?.[1] ?? 0) &&
                  (_ === 0 ||
                    d[_ - 1] ===
                      `
`) &&
                  /^(\r?\n|$)/.test(d.slice(v, v + 2)) &&
                  !sliced.startsWith("-----BEGIN TRUSTED")
                    ? l(sliced)
                    : undefined;
                return z && !pemStartsWithRaw(sliced, z) && !E(z, n) ? [z.toString().trim()] : [];
              })),
        ]
      : [];
    let I = () => pemSpans(d).some(([_, v]) => l(d.slice(_, v)));
    let S = w ? k.length > 0 : O === 0 || T.size > 0 || I();
    if (w)
      logForDebugging(
        `CA certs: ${source}${describeSourceSuffix(source)} holds blocked certificate ${w.hash} outside any block; ${S ? `kept only the ${k.length} certificate(s) in it that parse, re-encoded` : "ignored it"}`,
      );
    if (R && (w || y)) warnBlockedCertBlock(S ? (w ? "damaged" : "block") : "file", u(pem), warnedExtraCerts);
    if (S)
      P.push(
        w
          ? k.join(`
`)
          : T.size > 0
            ? [...T, ...(I() ? [d.trim()] : [])].join(`
`)
            : d,
      );
  }
  return P;
}
//@ chunk-hq88884p.js:42148-43143 placement
/**
 * 组合 CA 列表（额外证书、内置证书回退）。
 */
function buildCaList(
  e,
  content,
  n = blockedCaIndex,
  bundledRootCertificates = selectBundledRootCertificates(content),
  warnedExtraCerts = new Set(),
) {
  let c = withoutBlockedCertsUnsafe(e, bundledRootCertificates, n, warnedExtraCerts);
  if (c.length > 0) return c;
  let mapped = content.map((pem) => ({
    pem,
    source: "bundled",
  }));
  let u = withoutBlockedCertsUnsafe(mapped, bundledRootCertificates, n);
  if (u.length > 0) return u;
  if (content.length === 0 && e.length === 0)
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
  let n = importMetaRequire("tls");
  return withoutBlockedCertsUnsafe(
    [
      {
        pem,
        source,
      },
    ],
    selectBundledRootCertificates(n.rootCertificates),
  )[0];
}
//@ chunk-hq88884p.js:43233-43432 placement
function withoutBlockedOrUnanchoredCerts(caCertPem, r) {
  let n = withoutBlockedCerts(caCertPem, r);
  if (n === undefined || n === caCertPem) return n;
  let { kept, dropped } = dropSelfNamedCerts([n]);
  if (dropped > 0)
    logForDebugging(
      `CA certs: Dropped ${dropped} certificate(s) from ${r} that do not chain to a root in it`,
    );
  return kept[0];
}
//@ chunk-hq88884p.js:43432-43630 placement
function getCACertificates() {
  let caCertState = getCaCertState();
  if (caCertState.fromHost) return caCertState.fromHost.certificates;
  let r = Boolean(env.CLAUDE_CODE_CLIENT_CERT);
  if (!caCertState.certificates.cache.has(r)) caCertState.certificates.cache.clear?.();
  return caCertState.certificates(r);
}
//@ chunk-hq88884p.js:43630-43904 placement
function caListFor(e) {
  let caCertificates = getCACertificates();
  let caCertState = getCaCertState();
  if (!e || !caCertificates || caCertState.fromHost) return caCertificates;
  let o = caCertState.customerLists.get(caCertificates);
  if (o) return o;
  logForDebugging("CA certs: Building the list for hosts that aren't ours");
  let { list } = loadCaCertificates(caCertState, Boolean(env.CLAUDE_CODE_CLIENT_CERT), BLOCKED_ROOTS);
  Object.freeze(list);
  caCertState.customerLists.set(caCertificates, list);
  return list;
}
//@ chunk-hq88884p.js:43904-43976 placement
function isRuntimeStoreCABundle(e) {
  return Array.isArray(e) && getCaCertState().runtimeStoreBundles.has(e);
}
//@ chunk-hq88884p.js:43976-44055 placement
function hasSeenTrustOverride() {
  let caCertState = getCaCertState();
  caCertState.trustOverrideSeen ||= hasCaEnvOverride();
  return caCertState.trustOverrideSeen;
}
//@ chunk-hq88884p.js:44055-44199 placement = formatShortcut (1)
function formatShortcut(shortcut) {
  return shortcut
    .split(
      `
`,
    )
    .map((line) =>
      line
        .split(" + ")
        .map((n) => n.replace(/\\0[9a-d]|[\s\\]/gi, "").toLowerCase())
        .sort()
        .join("+"),
    )
    .join("");
}
//@ chunk-hq88884p.js:44199-44690 placement
/**
 * 证书是否自签名。
 */
function isSelfSigned(e) {
  let publicKey = e.publicKey;
  if (e.verify(publicKey)) return true;
  let { raw } = e;
  let o = Math.ceil((publicKey.asymmetricKeyDetails?.modulusLength ?? 0) / 8);
  if (!o || raw[1] !== 130 || raw[5] !== 130) return false;
  let s = 8 + raw.readUInt16BE(6);
  let c = o < 127 ? 3 : o < 255 ? 4 : 5;
  if (raw[s + 1] > 127 || s + 2 + raw[s + 1] + c + o !== raw.length) return false;
  let { constants, verify } = importMetaRequire("crypto");
  let chunk = raw.subarray(4, s);
  let chunk_2 = raw.subarray(-o);
  return ["md5", "sha1", "sha256", "sha384", "sha512"].some(
    (E) =>
      verify(E, chunk, publicKey, chunk_2) ||
      verify(
        E,
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
function isIssuerOf(e, r) {
  let n = r.subject === r.issuer;
  try {
    return (
      e !== r &&
      e.subject === r.issuer &&
      (!n || e.certificate.ca) &&
      r.certificate.verify(e.certificate.publicKey)
    );
  } catch {
    return !n;
  }
}
//@ chunk-hq88884p.js:44860-47131 placement
/**
 * 去掉主体与签发者同名但非自签的证书。
 */
function dropSelfNamedCerts(e, r) {
  let { X509Certificate } = importMetaRequire("crypto");
  let o = importMetaRequire("tls");
  let s = Boolean(env.CLAUDE_CODE_DISABLE_SELF_NAMED_CERT_DROP);
  if (s)
    logForDebugging(
      "CA certs: CLAUDE_CODE_DISABLE_SELF_NAMED_CERT_DROP is set: a certificate whose subject and issuer names match stays, whoever signed it",
      {
        level: "warn",
      },
    );
  let c = new Set(o.rootCertificates);
  let mapped = e.map((h) =>
    pemSpans(h).map(([P, p]) => {
      let sliced = h.slice(P, p);
      try {
        let R = new X509Certificate(sliced);
        let d = formatShortcut(R.subject ?? "");
        let O = formatShortcut(R.issuer ?? "");
        let y = pemStartsWithRaw(sliced, R);
        let T = y;
        let w;
        if (!T && d === O)
          try {
            T = s || c.has(sliced) || isSelfSigned(R);
            w = T
              ? undefined
              : "its own key did not sign it, or signed it in a form that Claude Code cannot check";
          } catch (error) {
            w = `whether its own key signed it could not be checked (${error}), most likely because the runtime cannot read that key, and then TLS can verify nothing under it either`;
          }
        return {
          start: P,
          end: p,
          listed: {
            certificate: R,
            subject: d,
            issuer: O,
            anchor: T,
            kept: T,
            unconfirmed: w,
          },
          trustData: y,
        };
      } catch {
        return {
          start: P,
          end: p,
          listed: undefined,
          trustData: false,
        };
      }
    }),
  );
  let flattened = mapped.flat().flatMap((h) => h.listed ?? []);
  let l = new Map(
    flattened.filter((h) => !h.anchor).map((h) => [h, flattened.filter((P) => isIssuerOf(P, h))]),
  );
  for (let h = true; h;) {
    h = false;
    for (let [P, p] of l)
      if (!P.kept && p.some((A) => A.kept)) {
        P.kept = true;
        h = true;
      }
  }
  let b = count(flattened, (h) => !h.kept);
  if (b === 0 || b === flattened.length)
    return {
      kept: [...e],
      dropped: 0,
    };
  let kept = e.flatMap((h, P) => {
    let p = mapped[P];
    if (p.every((d) => d.listed?.kept !== false)) return [h];
    if (!p.some((d) => d.listed?.kept)) return p.some((d) => d.listed) ? [] : [h];
    let mapped_2 = p.map((d, O) => h.slice(p[O - 1]?.end ?? 0, d.start));
    if (!(
      p.every(
        (d, O) =>
          d.start >= (p[O - 1]?.end ?? 0) &&
          /(^|\n)$/.test(mapped_2[O]) &&
          /^(\r?\n|$)/.test(h.slice(d.end, d.end + 2)),
      ) &&
      p.every((d) => d.listed && !d.trustData) &&
      !h.includes("\x00") &&
      [...mapped_2, h.slice(p.at(-1).end)].every(
        (d) => /^[\t\r\n\x20-\x7e]*$/.test(d) && !d.includes("-----"),
      )
    )) {
      for (let d of p) if (d.listed) d.listed.kept = true;
      return [h];
    }
    return [
      p.filter((d) => d.listed?.kept !== false).map((d) => h.slice(d.start, d.end)).join(`
`),
    ];
  });
  mapped.forEach((h, P) => {
    for (let { listed } of h)
      if (listed?.unconfirmed && !listed.kept) {
        let { fingerprint256, subject } = listed.certificate;
        logForDebugging(
          `CA certs: Dropped the certificate with SHA-256 fingerprint ${fingerprint256} and subject ${JSON.stringify(subject ?? "")}: it names itself as its issuer, but ${listed.unconfirmed}, and no CA that chains to a root in the list signed it. CLAUDE_CODE_DISABLE_SELF_NAMED_CERT_DROP=1 keeps every such certificate.`,
          {
            level: "error",
          },
        );
        r?.(e[P], fingerprint256);
      }
  });
  return {
    kept,
    dropped: count(flattened, (h) => !h.kept),
  };
}
//@ chunk-hq88884p.js:47131-49781 placement
/**
 * 按证书来源加载 CA 证书（bundled/system/extra）。
 */
function loadCaCertificates(e, r, n) {
  let o = certStoreSources();
  let NODE_EXTRA_CA_CERTS = env.NODE_EXTRA_CA_CERTS;
  let included = o.includes("bundled");
  let included_2 = o.includes("system");
  let refusesBundledFallback = !included && e.refusesBundledFallback;
  logForDebugging(`CA certs: stores=${o.join(",")}, extraCertsPath=${NODE_EXTRA_CA_CERTS}`);
  let l = importMetaRequire("tls");
  let getCACertificates = l.getCACertificates;
  if (!included && included_2 && !getCACertificates) {
    logForDebugging(
      `CA certs: stores=system but system CA API unavailable${refusesBundledFallback ? "" : ", using bundled roots"}`,
    );
    if (warnOnceCa("system_api_unavailable")) logFeatureSad("ca_certs_load", "system_api_unavailable");
  }
  let E = [];
  let h = "every certificate in the system CA store is expired or on the deny list";
  let P = (source, rootCertificates) => {
    for (let pem of rootCertificates)
      E.push({
        pem,
        source,
      });
  };
  let p = [];
  let A = false;
  let R = [];
  let d = new Map();
  if (included) {
    P("bundled", l.rootCertificates);
    logForDebugging(`CA certs: Loaded ${l.rootCertificates.length} bundled root certificates`);
  }
  if (included_2)
    try {
      let S = getCACertificates?.("system");
      if (S && S.length > 0) {
        let _ = dropExpiredCerts(S, Date.now(), d);
        P("system", _);
        logForDebugging(`CA certs: Loaded ${_.length} system CA certificates`);
      } else {
        logForDebugging(`CA certs: system store ${getCACertificates ? "returned empty" : "unavailable"}`);
        h = getCACertificates
          ? "the system CA store is empty: check that this process can read its CA files (SSL_CERT_FILE, SSL_CERT_DIR, or the system's default paths)"
          : "the runtime has no system CA store";
        if (!included && !refusesBundledFallback) P("bundled", l.rootCertificates);
      }
    } catch (error) {
      logForDebugging(`CA certs: Failed to load system CA certificates: ${error}`, {
        level: "error",
      });
      if (warnOnceCa("system_store_failed")) logFeatureSad("ca_certs_load", "system_store_failed");
      h = "reading the system CA store failed";
      if (!included && !refusesBundledFallback) P("bundled", l.rootCertificates);
    }
  let bundledRootCertificates = selectBundledRootCertificates(l.rootCertificates);
  let y = refusesBundledFallback
    ? withoutBlockedCertsUnsafe(E, bundledRootCertificates, n, e.warnedExtraCerts)
    : buildCaList(E, l.rootCertificates, n, bundledRootCertificates, e.warnedExtraCerts);
  if (y.length === 0)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `No certificate authority to trust: CLAUDE_CODE_CERT_STORE=system (or NODE_OPTIONS --use-system-ca or --use-openssl-ca) leaves out the runtime's bundled roots, and ${h}. NODE_EXTRA_CA_CERTS only adds to the store; it does not count on its own.`,
      "No certificate authority to trust",
    );
  if (NODE_EXTRA_CA_CERTS && e.extraCACerts?.path === NODE_EXTRA_CA_CERTS) {
    let content = e.extraCACerts.content;
    let _ = new Set(y.map((D) => D.trim()));
    let all = content
      .replace(/^\n{1,2}|\n{1,2}$/g, "")
      .split(/\n{1,2}(?=-----BEGIN CERTIFICATE-----)/)
      .every((D) => _.has(D));
    p = all
      ? []
      : withoutBlockedCertsUnsafe(
          [
            {
              pem: content,
              source: "NODE_EXTRA_CA_CERTS",
            },
          ],
          bundledRootCertificates,
          n,
          e.warnedExtraCerts,
        );
    R = all ? [content] : p;
    A = all || p.length > 0;
    logForDebugging(
      A
        ? `CA certs: Appended extra certificates from NODE_EXTRA_CA_CERTS (${NODE_EXTRA_CA_CERTS})${all ? ": all of them were already trusted from the CA store, so each is listed once" : ""}`
        : `CA certs: Nothing from NODE_EXTRA_CA_CERTS (${NODE_EXTRA_CA_CERTS}) is left to append`,
    );
  }
  let T =
    r || env.CLAUDE_CODE_DISABLE_LOOPED_CROSS_CERT_DROP
      ? {
          list: y,
          alone: y,
        }
      : chooseAnchoredCerts(y, d, R);
  let w = uniq([...T.list, ...p]);
  let k = 0;
  let I = r
    ? {
        kept: w,
        dropped: 0,
      }
    : dropSelfNamedCerts(w, (S, _) => {
        k++;
        if (R.some((v) => v.includes(S.trim()))) warnBlockedCertBlock("selfNamed", _, e.warnedExtraCerts);
      });
  return {
    list: I.kept,
    dropped: I.dropped,
    selfNamedDropped: k,
    storeCerts: T.alone,
    appendedExtraCerts: A,
    wantsBundled: included,
    wantsSystem: included_2,
  };
}
//@ chunk-hq88884p.js:49781-50750 placement
/**
 * 刷新 CA 状态（读取 NODE_EXTRA_CA_CERTS）。
 */
function refreshCaState(e, r) {
  e.trustOverrideSeen ||= hasCaEnvOverride();
  e.storeCertificates = undefined;
  let NODE_EXTRA_CA_CERTS = env.NODE_EXTRA_CA_CERTS;
  if (NODE_EXTRA_CA_CERTS && e.extraCACerts?.path !== NODE_EXTRA_CA_CERTS)
    try {
      let content = getFsImplementation().readFileSync(NODE_EXTRA_CA_CERTS, {
        encoding: "utf8",
      });
      e.extraCACerts = {
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
    loadCaCertificates(e, r, blockedCaIndex);
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
  e.storeCertificates = appendedExtraCerts ? uniq(storeCerts) : list;
  if (!appendedExtraCerts) e.runtimeStoreBundles.add(Object.freeze(list));
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
//@ chunk-hq88884p.js:50773-50854 fingerprint = clearCACertsCache (0.855)
function clearCACertsCache_2(caCertState) {
  caCertState.certificates.cache.clear?.();
  logForDebugging("Cleared CA certificates cache");
}
//@ chunk-hq88884p.js:54258-54304 placement
/**
 * 记录已设置的运行时默认 CA 列表，避免重复设置。
 */
var caDefaultListState = identity(
  {
    list: undefined,
  },
  (e) => {
    e.list = undefined;
  },
);
//@ chunk-hq88884p.js:54304-54382 placement
/**
 * 把若干 PEM 文本拆成各证书块。
 */
function splitPemBlocks(caCertificates) {
  return (caCertificates ?? []).flatMap((r) => pemSpans(r).map(([n, o]) => r.slice(n, o)));
}
//@ chunk-hq88884p.js:54382-54413 placement
/**
 * 把单个证书设为运行时默认 CA。
 */
function setDefaultCaFor(e) {
  return trySetDefaultCaCertificates([e]);
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
  let r = splitPemBlocks(caCertificates);
  if (r.length === 0) return;
  if (trySetDefaultCaCertificates(r)) {
    caDefaultListState.list = caCertificates;
    return;
  }
  let filtered = r.filter(setDefaultCaFor);
  logForDebugging(
    `CA certs: ${r.length - filtered.length} certificate(s) in the CA list could not be read and are skipped for connections that pass no CA. Check the NODE_EXTRA_CA_CERTS file, or the OS certificate store, for a damaged or cut-off certificate.`,
    {
      level: "warn",
    },
  );
  if (filtered.length > 0 && trySetDefaultCaCertificates(filtered)) caDefaultListState.list = caCertificates;
}
//@ chunk-hq88884p.js:54874-54950 placement
/**
 * 设置运行时默认 CA 证书，失败返回 false。
 */
function trySetDefaultCaCertificates(e) {
  try {
    tlsModule_2.setDefaultCACertificates(e);
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
};
