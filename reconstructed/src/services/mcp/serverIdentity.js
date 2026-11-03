/**
 * services/mcp/serverIdentity.ts
 *
 * 2.1.316 新增：MCP 服务器标识的长度限制、命名空间 UUID 与已知哈希集合；重建服务器/工具的线上名称映射等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-6mwt0myy.js (67)
 * attribution: placement 67
 */
import { isIPv6 } from "net";
import { randomUUID } from "crypto";
import { BASE58 } from "../../skills/bundled/scheduleRemoteAgents.js";
import { hashAgentId } from "../../utils/agentId.js";
import { isWellFormedString, firstLineOf } from "../../utils/stringUtils.js";
import { computeContentHash } from "../../utils/commitAttribution.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { onProcessRootHost, getRootSession } from "../../bootstrap/state.js";
import { lMe } from "../../utils/taggedId.js";
import { uniq } from "../../utils/collections.js";
import { normalizeNameForMCP } from "./normalization.js";
import { isPlainObject } from "../../utils/isPlainObject.js";
import {
  mcpInfoFromString,
  MCP_TOOL_PREFIX,
  getToolNameForPermissionCheck,
  getMcpToolAliasNames,
} from "./mcpStringUtils.js";
import { hasWildcard, eSr } from "../../utils/permissions/permissionRuleParser.js";
import { getPrefixServerKey } from "../../components/agents/ToolSelector.js";

/**
 * 从带前缀的 base58 id 中解出 UUID。
 */
//@ chunk-6mwt0myy.js:1694-1995 placement
function decodeTaggedUuid(e) {
  let index = e.lastIndexOf("_");
  if (index < 0) return;
  let sliced = e.slice(index + 1);
  if (!sliced.startsWith("01")) return;
  let t = BASE58(sliced.slice(2));
  if (t === void 0) return;
  let padded = t.toString(16).padStart(32, "0");
  if (padded.length !== 32) return;
  return `${padded.slice(0, 8)}-${padded.slice(8, 12)}-${padded.slice(12, 16)}-${padded.slice(16, 20)}-${padded.slice(20, 32)}`;
}
/**
 * MCP 服务器标识的长度限制、命名空间 UUID 与已知哈希集合。
 */
//@ chunk-6mwt0myy.js:2024-5798 placement
var MCP_SERVER_ID_LIMITS = 2048,
  X = 54,
  Y = 253,
  V = 21,
  R = 32,
  Z = 8,
  q = 65535,
  Q = "6ba7b811-9dad-11d1-80b4-00c04fd430c8",
  J = new Set([
    "001d7d58914b066125876ce23d2d6d112d8289118e9a57f569a430c38d8faa3c",
    "058c32f177ce90792b36d516790f6443d632f83c6119d72ef32b1a815be6ee87",
    "08c07051187ca5d47aa75782fc2060a206e136d85cb398778a9f54e3db2caa47",
    "0ebe1e8065774e27792b7880d5caf63a366a8f4c135e5a42e15ba58769ae20f9",
    "0ff9d8927e9828d185f11126acb1b8da2e92a15012de9ed113b3d1a04a73f407",
    "10be6beef496b89dae799c37bd04e5eba2a6264a0a4d605f5661b50d7dc4d1ea",
    "1360816558a23fd518959284a182f4d9e1cb362f47e472cff3b455babcba3144",
    "1e5fb8ca7bc55583e22e442dbd431ba55b70a579c5d1e7429ec9c91d4d9cf008",
    "1f100a7fa106825b9587fc9102815e07bc345e84c6ef109b39ce776af439ce7f",
    "21a3230e03772a58aff1b3709a9e232850916337e1fba95c434076b6668c6e08",
    "243689f0a34348668a106d9b4c366eba9a279d3a38c831e34ca67a53430f35f8",
    "2824b7bb47f3e5ae3e0e90c4ea28182e5c0060e6497a4f7020a913a14d8c18cd",
    "2c1ce718525496974dc28bd457a3de87820bfd74fd5a499cac0db7aa6b33d9b8",
    "36c717254b394a2fd1d02f706960152d8d1ae2e7155a152037e730721dd3dbac",
    "380e87dd0048d82132f3259960c821b86a101e84da8ef94fa20cf8ceb4f905dd",
    "38c5db643cca7001e885f94c1c72bce5ffd5ca3e6c00f36b9381a1ff1c677515",
    "3d8c0d8ccdf38a6d9103dbda04b18dade7588e32db531e85b051a2bc07c55fe6",
    "4b75867727276e96a05d681ede545d314c7c7106b3fa9fbd5643c2dc1662cb94",
    "585b9501131729a7b00bd745e8fe7ab9687ffdaaf91e4c6408d94b7fc15e8f2b",
    "66b8245886077eaaa79f378369261e020fb19d2c6ae53f94dfd8dfbc0282d029",
    "750bd39768d2b52a276a0f16e37e8d89cc51808ed2aee34292a613728c215aec",
    "7b1694f99542e733abaa2b776ab1261a98fc697118538d53d3b0242ffed329d3",
    "7deb7a951ec3b81573a7bf1e375e584b444c1bdf4cf5fc820708c663ba57b292",
    "82142dc93de09756fc53b25be1e0cedbcc71bb8418ee720d9d8a0ca8fc74b71a",
    "836e98bf162bd453eb76c3115a7bfc6649b5d8e0b09c61288aee7a7214dcabe3",
    "8f68ef8293d7c78db41cb358a2a5f3e54eada3985950d78ec79640d804cf9c26",
    "a6ebfa4f158ef450cef3c6738c4107a87e4300cfa8900ffe801de9cca91dfe0c",
    "ac4db1553b96800b17a9badb490cd250e8957f1516b0755985f92b98e6e77fb5",
    "b1f3f7220f5aa8683d21539155e87e170952dbed4ecc5c6637979100cc791b5d",
    "b4126249adb972b50222897e622fa7980e4ac2cb717c1891a2e250798331aff7",
    "b6ed110d3683e593243d76a62dc45f6a7374ebf59d23aec3fc5361fb34bad9dd",
    "c064fbca9d9de8dd9bb0624984403b28d0da807a69365d4f7fb09123ecb0c405",
    "d4c3e8a11256ab82a4fc72560eb4a2b0e87bad820c290dd9b03616de240aa6db",
    "d780682093f3c46cce9817cf19a8ae72d8e863af8e11d2e3c2017af411b17893",
    "dd7f1bcb57a00ea6327356b1bf0751320daae910c9d3309d22e83924ddb67cc4",
    "df471311a60874f28a0b62b44b471480efda48bcc55af7659834f0af40f32f71",
    "e32dc9b0503a1d4982d028acd3a7fd5c4d30f044e7e336f78632d572b40d5328",
    "e537c3eb39f7a75157dfb1d52e0fc930bbf1af9a0040456e74b2ee7b62136d2c",
    "ea307c363088a80405d68d46e1b4117c1a982dbe35eaab9fcf1d51577e2b8181",
    "fb099cb999784a21b51ca9a017b44877826f93f380021e05e6fee571d3861edb",
    "fe2914f62e20325b719ba405e6a8f299f46ce8f1ad11b6f03681ceda5a935454",
  ]),
  ee = new Set([
    "0e4a7f621b2756c6d34c5f409d886ec7622482db96cbcfae01e14b142ce12b1d",
    "0f4dd7885db7d0bf0b1e86b5dd22c2d4f9937994c66e30f3cf0fd7468033f7d4",
    "12ca17b49af2289436f303e0166030a21e525d266e209267433801a8fd4071a0",
    "28cac3b96a52871fc67bc5f353858d4f945316d964778d026fafd408e9840cf5",
    "49960de5880e8c687434170f6476605b8fe4aeb9a28632c7995cf3ba831d9763",
    "d470ff28ce01e69add79d828d4085e3ec719a6536712b5d60afcf1a10976e451",
    "eff8e7ca506627fe15dda5e0e512fcaad70b6d520f37cc76597fdb4f2d83a1a3",
  ]),
  ne = /^(?:([^:/?#]+):)?(?:\/\/([^/?#]*))?([^?#]*)(?:\?[^#]*)?(?:#(.*))?$/,
  re = /[\u0000-\u0020\u007f\\\u0085\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]/,
  te = /^(?:[A-Za-z0-9\-._~!$&'()*+,;=:@/]|%[0-9A-Fa-f]{2})*$/,
  oe = /%(?![0-9A-Fa-f]{2})/,
  se = /^([A-Za-z0-9._-]+)(?::(.*))?$/,
  ie = /^\[([0-9A-Fa-f:.]*:[0-9A-Fa-f:.]*)\](?::(.*))?$/,
  ae = /^[0-9]{1,5}$/,
  de = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/,
  ce = /^(?:[0-9]+|0x[0-9a-f]*)$/,
  ORG_CONNECTOR = "org-connector-";
//@ chunk-6mwt0myy.js:5798-5867 placement
function N(e) {
  return hashAgentId(`mcp://claude.ai/client-integration/${e}`, Q);
}
//@ chunk-6mwt0myy.js:5867-5972 placement
function isSafeKeySegment(e) {
  return /^[A-Za-z0-9_-]+$/.test(e) && !e.includes("__") && !e.startsWith("_") && !e.endsWith("_");
}
//@ chunk-6mwt0myy.js:5972-6045 placement
function ye(e) {
  return e === void 0 || (ae.test(e) && Number(e) >= 1 && Number(e) <= q);
}
//@ chunk-6mwt0myy.js:6045-6122 placement
function ue(e) {
  return te.test(e) && !e.split("/").some((n) => n === "." || n === "..");
}
/**
 * 解析服务器 URL 为身份（协议、主机、路径）。
 */
//@ chunk-6mwt0myy.js:6122-6505 placement = parseGitRemote (0.781)
function parseServerUrlIdentity(input) {
  if (
    input === "" ||
    Array.from(input).length > MCP_SERVER_ID_LIMITS ||
    !isWellFormedString(input) ||
    re.test(input)
  )
    return;
  let [, n, r, t, s] = ne.exec(input) ?? [],
    i = n?.toLowerCase();
  if ((i !== "http" && i !== "https") || !r || t === void 0 || !ue(t) || oe.test(s ?? "")) return;
  let hostWithoutPort = se.exec(r) ?? ie.exec(r);
  if (
    !hostWithoutPort?.[1] ||
    !ye(hostWithoutPort[2]) ||
    (hostWithoutPort[1].includes(":") && !isIPv6(hostWithoutPort[1]))
  )
    return;
  let replaced = hostWithoutPort[1].toLowerCase().replace(/\.$/, "");
  return replaced === "" || ee.has(computeContentHash(replaced)) ? void 0 : { scheme: i, host: replaced };
}
//@ chunk-6mwt0myy.js:6505-6593 placement
function pe(e) {
  for (let n = 1; n <= e.length; n++) if (J.has(computeContentHash(e.slice(0, n)))) return !0;
  return !1;
}
//@ chunk-6mwt0myy.js:6593-6786 placement
function hostStandardKey(e, n) {
  let parts = n.split("."),
    t = parts.at(-1) ?? "";
  if (
    e !== "https" ||
    n.length > Y ||
    parts.length < 2 ||
    t.includes("-") ||
    ce.test(t) ||
    !parts.every((i) => de.test(i))
  )
    return;
  let joined = parts.join("_");
  return pe(joined) ? void 0 : joined;
}
//@ chunk-6mwt0myy.js:6786-6852 placement
function be(e) {
  return `${e}-`.replace(/[_-]+/g, "-").startsWith(ORG_CONNECTOR);
}
//@ chunk-6mwt0myy.js:6852-7119 placement = ghIsDangerousCallback (0.773)
function ghIsDangerousCallback(e) {
  let n = parseServerUrlIdentity(e);
  if (n === void 0) return;
  let { scheme: scheme, host: host } = n,
    s = `${scheme}://${host.includes(":") ? `[${host}]` : host}`,
    sliced = computeContentHash(s).slice(0, R),
    o = hostStandardKey(scheme, host),
    a = `h-${sliced}`,
    d = o === void 0 ? a : o.length > X ? `${o.slice(0, V).replace(/^[_-]+|[_-]+$/g, "")}-${sliced}` : o,
    c = be(d) ? a : d;
  return isSafeKeySegment(c) ? c : void 0;
}
//@ chunk-6mwt0myy.js:7119-7217 placement
function GPi(e, n) {
  let r = [e, ...n];
  return e !== "" && r.every(isWellFormedString)
    ? `local-${computeContentHash(jsonStringify(r)).slice(0, R)}`
    : void 0;
}
/**
 * stdio 服务器命令/参数是否变化。
 */
//@ chunk-6mwt0myy.js:7217-7380 placement
function stdioIdentityDiff(e, n) {
  let r = e.args ?? [];
  return e.command === n.command && r.length === (n.args?.length ?? 0) && r.every((t, s) => t === n.args?.[s])
    ? void 0
    : { command: e.command, args: r };
}
//@ chunk-6mwt0myy.js:7380-7430 placement
function b(e, n) {
  return `${e}-a${computeContentHash(n).slice(0, Z)}`;
}
/**
 * 为服务器分配不冲突的标准键（固定优先）。
 */
//@ chunk-6mwt0myy.js:7430-7788 placement
function assignStandardKeys(e) {
  let n = new Map();
  for (let { id: id, key: key, pinned: pinned = !1 } of e) {
    let a = n.get(id);
    if (key !== void 0 && (a === void 0 || (pinned && !a.pinned) || (pinned === a.pinned && key < a.key)))
      n.set(id, { key: key, pinned: pinned });
  }
  let r = new Map(),
    t = new Map();
  for (let [s, { key: i, pinned: o }] of n) {
    if (o) {
      r.set(s, i);
      continue;
    }
    t.set(i, (t.get(i) ?? new Set()).add(s));
  }
  for (let [s, i] of t) for (let o of i) r.set(o, i.size > 1 ? b(s, o) : s);
  return r;
}
//@ chunk-6mwt0myy.js:7788-7882 placement
var MCP = "mcp__",
  Se = [],
  MCP_RETIRED = "mcp__retired-",
  _e = /-a[0-9a-f]{8}(?:__|$)/,
  ve = /^(.*[^_])-a[0-9a-f]{8}$/;
/**
 * 创建 MCP 服务器身份状态（遗留键、线名映射等）。
 */
//@ chunk-6mwt0myy.js:7882-8406 placement
function createServerIdentityState() {
  return {
    active: !1,
    readLegacyKeyOwner: () => {
      return;
    },
    claimLegacyKeyOwner: async () => {
      return;
    },
    legacyKeyOwners: new Map(),
    unsavedLegacyKeys: new Set(),
    refusedLegacyKeys: new Map(),
    needsRebuild: !1,
    servers: new Map(),
    tools: new Map(),
    wireByInternal: new Map(),
    internalByWire: new Map(),
    wireKeyByInternalKey: new Map(),
    internalKeyByWireKey: new Map(),
    keptLegacyNames: 0,
    sessionKeyById: new Map(),
    formerKeys: new Map(),
    formerSessionKeys: new Map(),
    spelledKeys: new Map(),
    otherDenyOrAskNames: new Map(),
    retiredWireNames: new Map(),
    wireHolders: new Map(),
    sentWires: new Map(),
  };
}
//@ chunk-6mwt0myy.js:8406-8455 placement
var Ke = new SessionRootSlot(createServerIdentityState),
  A = new HostScoped(() => ({ used: !1 })),
  he = createServerIdentityState();
//@ chunk-6mwt0myy.js:8455-8500 placement
function y() {
  return onProcessRootHost(A).used ? Ke.of(getRootSession()) : he;
}
/**
 * 启用服务器身份映射，并接入旧键归属的读取与认领函数。
 */
//@ chunk-6mwt0myy.js:8500-8610 placement
function activateServerIdentity(e) {
  onProcessRootHost(A).used = !0;
  let n = y();
  ((n.active = !0), (n.readLegacyKeyOwner = e.read), (n.claimLegacyKeyOwner = e.claim));
}
/**
 * 服务器身份映射是否启用。
 */
//@ chunk-6mwt0myy.js:8610-8642 placement
function isServerIdentityActive() {
  return y().active;
}
//@ chunk-6mwt0myy.js:8642-8684 placement
function KPi() {
  return y().keptLegacyNames;
}
//@ chunk-6mwt0myy.js:8684-8792 placement
function ownerIdOf(e) {
  return e.serverType === "claudeai-proxy" && e.serverId
    ? (decodeTaggedUuid(e.serverId) ?? e.serverId)
    : N(e.serverName);
}
/**
 * 为工具重新分配键。
 */
//@ chunk-6mwt0myy.js:8792-9124 placement
function reassignToolKey(e, n, r, t) {
  let s = e.tools.get(n),
    i = s && e.servers.get(s.serverId)?.standardKey;
  if (s === void 0 || i === void 0 || i.pinned) return;
  let o = new Set(t.values());
  for (let a = 0; a <= e.tools.size; a++) {
    let d = a === 0 ? s.serverId : `${s.serverId}#${a}`,
      c = `${MCP}${b(i.key, d)}__${s.toolPart}`;
    if (c.length > lMe) return;
    if (!r.has(c) && !o.has(c)) return c;
  }
  return;
}
//@ chunk-6mwt0myy.js:9124-9248 placement
function shouldRecordRename(e, n, r, t) {
  return (
    r !== t &&
    !(n.has(r) && e.servers.get(r)?.mayRecordOwner === !1 && e.servers.get(t)?.mayRecordOwner !== !1)
  );
}
/**
 * 重建服务器/工具的线上名称映射。
 */
//@ chunk-6mwt0myy.js:9248-11960 placement
function rebuildWireNames(e) {
  let n = [...e.servers.values()],
    r = assignStandardKeys([
      ...n.map(({ id: id, standardKey: standardKey }) => ({
        id: id,
        key: standardKey?.key,
        pinned: standardKey?.pinned,
      })),
      ...[...e.formerKeys].flatMap(([o, a]) =>
        [...a]
          .filter((d) => d !== e.servers.get(o)?.standardKey?.key)
          .map((d) => ({ id: `former:${d}:${o}`, key: d })),
      ),
    ]);
  for (let { id: id, legacyKey: legacyKey } of n) {
    let d = firstLineOf(`${legacyKey}__`, "__");
    e.spelledKeys.set(d, (e.spelledKeys.get(d) ?? new Set()).add(id));
  }
  for (let [o, a] of r) {
    let d = e.servers.get(o)?.standardKey;
    if (
      [...(e.spelledKeys.get(a) ?? [])].some((f) => shouldRecordRename(e, r, f, o)) &&
      d?.key === a &&
      !d.pinned
    )
      r.set(o, b(a, o));
  }
  let t = new Map();
  for (let { legacyKey: legacyKey } of n) t.set(legacyKey, (t.get(legacyKey) ?? 0) + 1);
  let internalByWire = e.internalByWire;
  ((e.sessionKeyById = r),
    (e.wireByInternal = new Map()),
    (e.internalByWire = new Map()),
    (e.wireKeyByInternalKey = new Map()),
    (e.internalKeyByWireKey = new Map()),
    (e.keptLegacyNames = 0));
  for (let { id: id, legacyKey: legacyKey } of n) {
    let d = r.get(id);
    if (d !== void 0 && d !== legacyKey) {
      if ((e.internalKeyByWireKey.set(d, legacyKey), t.get(legacyKey) === 1))
        e.wireKeyByInternalKey.set(legacyKey, d);
    }
  }
  let i = new Map();
  for (let [o, { serverId: a, toolPart: d }] of e.tools) {
    let c = r.get(a),
      f = `${MCP}${c}__${d}`;
    if (c !== void 0 && f.length <= lMe) i.set(o, f);
  }
  for (let [o, a] of e.sentWires) {
    let d = e.tools.get(o),
      c = d && e.servers.get(d.serverId),
      f = c?.standardKey;
    if (d !== void 0 && c !== void 0 && f !== void 0 && i.has(o)) {
      let found = [f.key, b(f.key, d.serverId)].find((m) => a === `${MCP}${m}__${d.toolPart}`),
        any = [...(e.spelledKeys.get(f.key) ?? [])].some((m) => shouldRecordRename(e, r, m, d.serverId));
      if (found !== void 0 && !(found === f.key && any)) {
        if (
          (i.set(o, a),
          e.internalKeyByWireKey.set(found, c.legacyKey),
          e.wireKeyByInternalKey.has(c.legacyKey))
        )
          e.wireKeyByInternalKey.set(c.legacyKey, found);
      }
    }
  }
  for (let o = !0; o;) {
    o = !1;
    let a = new Set([...e.tools.keys()].filter((c) => !i.has(c))),
      d = new Set();
    for (let [c, f] of i) {
      let l = d.has(f) || (a.has(f) && f !== c);
      if ((d.add(f), l)) {
        let u = reassignToolKey(e, c, a, i);
        if (u === void 0) i.delete(c);
        else i.set(c, u);
        o = !0;
      }
    }
  }
  e.keptLegacyNames = e.tools.size - i.size;
  for (let [o, a] of i) {
    (e.wireByInternal.set(o, a), e.internalByWire.set(a, o));
    let d = e.wireHolders.get(a);
    e.wireHolders.set(a, d === void 0 || d === o ? o : null);
  }
  for (let [o, { serverId: a, toolPart: d }] of e.tools)
    for (let c of e.formerKeys.get(a) ?? []) {
      let f = `${MCP}${c}__${d}`;
      if (e.wireHolders.get(f) === o && !e.internalByWire.has(f) && (f === o || !e.tools.has(f)))
        e.internalByWire.set(f, o);
    }
  for (let [o, a] of internalByWire) {
    let d = o === a && e.tools.has(o) && !e.wireByInternal.has(o);
    if (!e.internalByWire.has(o) && !e.retiredWireNames.has(o) && !d)
      e.retiredWireNames.set(o, `${MCP_RETIRED}${randomUUID().replaceAll("-", "")}`);
  }
  e.otherDenyOrAskNames = new Map();
  for (let [o, { serverId: a, toolPart: d }] of e.tools) {
    let c = i.get(o),
      filtered = uniq([
        ...[r.get(a), e.servers.get(a)?.standardKey?.key, e.servers.get(a)?.denyKey].flatMap((l) =>
          l === void 0 ? [] : [`${MCP}${l}__${d}`],
        ),
        ...(c === void 0 ? [] : [c]),
        ...[...(e.formerKeys.get(a) ?? []), ...(e.formerSessionKeys.get(a) ?? [])].map(
          (l) => `${MCP}${l}__${d}`,
        ),
      ]).filter((l) => l !== o);
    if (filtered.length > 0) e.otherDenyOrAskNames.set(o, filtered);
  }
}
/**
 * 判断并记录某服务器的旧权限键是否被拒用（有争议或被强制拒绝时记入拒用集合）。
 */
//@ chunk-6mwt0myy.js:11960-12184 placement
async function isLegacyKeyRefused(e, n = !1, r = !0) {
  let t = y();
  if (!t.active) return !1;
  let s = normalizeNameForMCP(e.serverName),
    i = ownerIdOf(e),
    o = n || (await isLegacyKeyContested(t, s, i, r)),
    a = t.refusedLegacyKeys.get(s) ?? new Set();
  if ((t.refusedLegacyKeys.set(s, a), o)) a.add(i);
  else a.delete(i);
  return o;
}
//@ chunk-6mwt0myy.js:12184-12417 placement
function isKeyHeldByOther(e, n, r) {
  return [...e.servers.values()].some(
    (t) =>
      t.legacyKey !== n &&
      !(r && t.mayRecordOwner === !1) &&
      (t.standardKey?.key === n ||
        e.sessionKeyById.get(t.id) === n ||
        e.formerKeys.get(t.id)?.has(n) ||
        e.formerSessionKeys.get(t.id)?.has(n)),
  );
}
/**
 * 是否可记录服务器键的所有者。
 */
//@ chunk-6mwt0myy.js:12417-12523 placement
function mayRecordServerOwner(e) {
  let n = y();
  return (
    n.active &&
    isKeyHeldByOther(n, normalizeNameForMCP(e.serverName), n.servers.get(ownerIdOf(e))?.mayRecordOwner !== !1)
  );
}
/**
 * 遗留键是否被其他服务器占用。
 */
//@ chunk-6mwt0myy.js:12523-12950 placement
async function isLegacyKeyContested(e, n, r, t) {
  if (isKeyHeldByOther(e, n, t)) return !0;
  let s = e.unsavedLegacyKeys.has(n) ? void 0 : e.readLegacyKeyOwner(n),
    i = e.legacyKeyOwners.get(n);
  if (s !== void 0 || i !== void 0) return (s ?? r) !== r || (i ?? r) !== r;
  if (!t) return e.unsavedLegacyKeys.has(n);
  e.unsavedLegacyKeys.add(n);
  let claimLegacyKeyOwner = await e.claimLegacyKeyOwner(n, r);
  if (claimLegacyKeyOwner === void 0) return !0;
  e.unsavedLegacyKeys.delete(n);
  let a = e.legacyKeyOwners.get(n) ?? claimLegacyKeyOwner;
  return (e.legacyKeyOwners.set(n, a), a !== r);
}
/**
 * 认领遗留键。
 */
//@ chunk-6mwt0myy.js:12950-13294 placement
async function claimLegacyKey(e) {
  let n = y();
  if (!n.active) return !1;
  let r = normalizeNameForMCP(e.serverName);
  if (isKeyHeldByOther(n, r, !0)) return !1;
  let t = ownerIdOf(e),
    s = legacyKeyOwnerOf(n, r);
  if (s !== void 0) n.legacyKeyOwners.set(r, s);
  if ((n.unsavedLegacyKeys.add(r), (await n.claimLegacyKeyOwner(r, t, !0)) !== t)) return !1;
  return (
    n.legacyKeyOwners.set(r, t),
    n.unsavedLegacyKeys.delete(r),
    n.refusedLegacyKeys.get(r)?.delete(t),
    !0
  );
}
/**
 * 判断某服务器的旧键是否已被另一身份的服务器持有。
 */
//@ chunk-6mwt0myy.js:13294-13498 placement
function isLegacyKeyOwnedElsewhere(e) {
  let n = y(),
    r = normalizeNameForMCP(e.serverName),
    t = n.legacyKeyOwners.get(r) ?? n.readLegacyKeyOwner(r);
  return (
    n.active &&
    (!n.unsavedLegacyKeys.has(r) || n.legacyKeyOwners.has(r)) &&
    !isKeyHeldByOther(n, r, !0) &&
    t !== void 0 &&
    t !== ownerIdOf(e)
  );
}
/**
 * 是否拥有遗留键。
 */
//@ chunk-6mwt0myy.js:13498-13603 placement
function ownsLegacyKey(e) {
  let n = y(),
    r = normalizeNameForMCP(e.serverName),
    t = ownerIdOf(e);
  return legacyKeyOwnerOf(n, r) === t && (n.legacyKeyOwners.get(r) ?? t) === t;
}
/**
 * 判断某服务器的旧键是否尚未被本服务器认领（未保存或归属他人）。
 */
//@ chunk-6mwt0myy.js:13603-13723 placement
function isLegacyKeyUnclaimed(e) {
  let n = y(),
    r = normalizeNameForMCP(e.serverName),
    t = legacyKeyOwnerOf(n, r);
  return n.active && (t === void 0 ? n.unsavedLegacyKeys.has(r) : t !== ownerIdOf(e));
}
//@ chunk-6mwt0myy.js:13723-13831 placement
function legacyKeyOwnerOf(e, n) {
  return (e.unsavedLegacyKeys.has(n) ? void 0 : e.readLegacyKeyOwner(n)) ?? e.legacyKeyOwners.get(n);
}
/**
 * 更新服务器身份记录。
 */
//@ chunk-6mwt0myy.js:13831-14442 placement
function updateServerIdentity(
  e,
  { server: server, standardKey: standardKey, denyKey: denyKey, mayRecordOwner: mayRecordOwner },
) {
  let i = ownerIdOf(server),
    o = normalizeNameForMCP(server.serverName),
    a = e.servers.get(i),
    d = a?.standardKey,
    c = standardKey ?? d,
    f = denyKey ?? a?.denyKey,
    l = mayRecordOwner ?? a?.mayRecordOwner;
  if (
    a === void 0 ||
    a.legacyKey !== o ||
    d?.key !== c?.key ||
    d?.pinned !== c?.pinned ||
    a.denyKey !== f ||
    a.mayRecordOwner !== l
  ) {
    if (d !== void 0 && !d.pinned && d.key !== c?.key) {
      e.formerKeys.set(i, (e.formerKeys.get(i) ?? new Set()).add(d.key));
      let u = e.sessionKeyById.get(i);
      if (u !== void 0) e.formerSessionKeys.set(i, (e.formerSessionKeys.get(i) ?? new Set()).add(u));
    }
    ((e.needsRebuild = !0),
      e.servers.set(i, { id: i, legacyKey: o, standardKey: c, denyKey: f, mayRecordOwner: l }));
  }
  return i;
}
//@ chunk-6mwt0myy.js:14442-14554 placement
function rebuildIfNeeded(e) {
  if (e.needsRebuild) {
    let n = { ...e };
    try {
      (rebuildWireNames(e), (e.needsRebuild = !1));
    } catch (error) {
      throw (Object.assign(e, n), error);
    }
  }
}
//@ chunk-6mwt0myy.js:14554-14627 placement
function qPi(e) {
  let n = y();
  if (!n.active) return;
  for (let r of e) updateServerIdentity(n, r);
  rebuildIfNeeded(n);
}
/**
 * 登记工具到服务器身份的映射，有变化时标记需要重建线上名。
 */
//@ chunk-6mwt0myy.js:14627-14864 placement
function registerToolIdentities(e) {
  let n = y();
  if (!n.active) return;
  for (let r of e) {
    let t = updateServerIdentity(n, r),
      s = normalizeNameForMCP(r.server.serverName);
    if (n.tools.get(r.name)?.serverId !== t)
      ((n.needsRebuild = !0),
        n.tools.set(r.name, { serverId: t, toolPart: r.name.slice(`${MCP}${s}__`.length) }));
  }
  rebuildIfNeeded(n);
}
/**
 * 记录已发送给模型的工具线上名。
 */
//@ chunk-6mwt0myy.js:14864-14989 placement
function noteSentWireNames(e) {
  let { active: active, wireByInternal: wireByInternal, sentWires: sentWires } = y();
  if (active)
    for (let s of e) {
      let i = wireByInternal.get(s);
      if (i !== void 0) sentWires.set(s, i);
    }
}
/**
 * 内部名对应的线上名。
 */
//@ chunk-6mwt0myy.js:14989-15041 placement
function wireName(e) {
  return y().wireByInternal.get(e) ?? e;
}
/**
 * 把线上工具名换回内部名（含已退役的线上名）。
 */
//@ chunk-6mwt0myy.js:15041-15147 placement
function internalToolNameFor(e) {
  return (
    (e.startsWith(MCP_RETIRED) ? [...y().retiredWireNames].find(([, r]) => r === e) : void 0)?.[0] ??
    wireName(e)
  );
}
/**
 * 线上名对应的内部名。
 */
//@ chunk-6mwt0myy.js:15147-15237 placement
function internalName(e) {
  let { internalByWire: internalByWire, retiredWireNames: retiredWireNames } = y();
  return internalByWire.get(e) ?? retiredWireNames.get(e) ?? e;
}
/**
 * 线上键对应的内部键。
 */
//@ chunk-6mwt0myy.js:15237-15295 placement
function internalKey(e) {
  return y().internalKeyByWireKey.get(e) ?? e;
}
//@ chunk-6mwt0myy.js:15295-15449 placement
function mapServerSegment(e, n) {
  if (!e.startsWith(MCP)) return e;
  let sliced = e.slice(MCP.length),
    index = sliced.indexOf("__"),
    s = index === -1 ? sliced : sliced.slice(0, index);
  return `${MCP}${n(s)}${index === -1 ? "" : sliced.slice(index)}`;
}
/**
 * 把 mcp__ 前缀名转为内部键。
 */
//@ chunk-6mwt0myy.js:15449-15481 placement
function toInternalToolName(e) {
  return mapServerSegment(e, internalKey);
}
/**
 * 规则是否引用了遗留键。
 */
//@ chunk-6mwt0myy.js:15481-15814 placement
function matchLegacyRule(e, n) {
  let { wireKeyByInternalKey: wireKeyByInternalKey, refusedLegacyKeys: refusedLegacyKeys } = y(),
    s;
  for (let [i, o] of wireKeyByInternalKey) {
    let a = `${MCP}${i}`;
    if ((e === a || e.startsWith(`${a}__`) || e.startsWith(`${a}(`)) && i.length > (s?.legacy.length ?? -1))
      s = { legacy: i, wire: o };
  }
  return s === void 0 || (n === "allow" && (refusedLegacyKeys.get(s.legacy)?.size ?? 0) > 0)
    ? e
    : `${MCP}${s.wire}${e.slice(MCP.length + s.legacy.length)}`;
}
//@ chunk-6mwt0myy.js:15814-15872 placement
function qao(e) {
  return y().otherDenyOrAskNames.get(e) ?? Se;
}
/**
 * 把权限规则中的服务器名规范化（去掉身份后缀），未变化时返回 undefined。
 */
//@ chunk-6mwt0myy.js:15872-15980 placement
function ruleWithNormalizedServer(e) {
  if (!_e.test(e) || !y().active) return;
  let n = mapServerSegment(e, (r) => ve.exec(r)?.[1] ?? r);
  return n === e ? void 0 : n;
}
/**
 * 为权限规则生成按标准键表示的工具行，供规则匹配使用。
 */
//@ chunk-6mwt0myy.js:15980-16242 placement
function standardKeyRuleRow(e, n) {
  let r = ruleWithNormalizedServer(e);
  if (r === void 0) return;
  let { tools: tools, servers: servers, sessionKeyById: sessionKeyById } = y(),
    o = tools.get(n),
    a = o === void 0 ? void 0 : servers.get(o.serverId)?.standardKey?.key;
  return o === void 0 || a === void 0 || sessionKeyById.get(o.serverId) !== a
    ? void 0
    : { rule: r, row: `${MCP}${a}__${o.toolPart}` };
}
//@ chunk-6mwt0myy.js:16242-16318 placement
function E(e) {
  return typeof e === "number" && Number.isInteger(e) && e > 0 ? e : void 0;
}
//@ chunk-6mwt0myy.js:16318-16372 placement
var Oe = { always_allow: !0, always_ask: !0, always_deny: !0 };
//@ chunk-6mwt0myy.js:16372-16435 placement
function Me(e) {
  return typeof e === "string" && Object.hasOwn(Oe, e);
}
/**
 * 解析服务器工具策略条目：合法策略原样保留，不认识的策略改写为 always_ask。
 */
//@ chunk-6mwt0myy.js:16435-16704 placement
function parseToolPolicyEntry(e) {
  if (!isPlainObject(e) || typeof e.name !== "string") return;
  let { name: n, permission_policy: permission_policy } = e;
  if (permission_policy === void 0) return { policy: { name: n }, rewritten: !1 };
  return Me(permission_policy)
    ? { policy: { name: n, permission_policy: permission_policy }, rewritten: !1 }
    : { policy: { name: n, permission_policy: "always_ask" }, rewritten: !0 };
}
/**
 * 比较两组工具策略列表是否相同。
 */
//@ chunk-6mwt0myy.js:16704-16872 placement
function sameToolPolicies(e, n) {
  if (e === void 0 || n === void 0) return e === n;
  return (
    e.length === n.length &&
    e.every((r, t) => r.name === n[t]?.name && r.permission_policy === n[t]?.permission_policy)
  );
}
/**
 * 解析服务器的附加设置（timeout、disableAutoBackground、tools、connectorId）。
 */
//@ chunk-6mwt0myy.js:16872-17376 placement
function parseMcpServerSettings(e) {
  if (!isPlainObject(e)) return { settings: {}, ignored: [] };
  let {
      timeout: timeout,
      disableAutoBackground: disableAutoBackground,
      tools: tools,
      connectorId: connectorId,
    } = e,
    i = E(timeout),
    o = [];
  if (timeout !== void 0 && i === void 0) o.push("timeout");
  if (disableAutoBackground !== void 0 && typeof disableAutoBackground !== "boolean")
    o.push("disableAutoBackground");
  let a = parseToolPolicies(tools);
  if (inspectToolsList(e) !== void 0) o.push("tools");
  let d = typeof connectorId === "string" && connectorId !== "";
  if (connectorId !== void 0 && !d) o.push("connectorId");
  return {
    settings: {
      ...(i !== void 0 && { timeout: i }),
      ...(disableAutoBackground === !0 && { disableAutoBackground: disableAutoBackground }),
      ...(a !== void 0 && { tools: a }),
      ...(d && { connectorId: connectorId }),
    },
    ignored: o,
  };
}
/**
 * 检查 tools[] 条目（丢弃、改写数量）。
 */
//@ chunk-6mwt0myy.js:17376-17644 placement
function inspectToolsList(e) {
  let n = isPlainObject(e) ? e.tools : void 0;
  if (n === void 0) return;
  if (!Array.isArray(n)) return { kind: "not_a_list" };
  let r = 0,
    t = 0;
  for (let s of n) {
    let i = parseToolPolicyEntry(s);
    if (i === void 0) r++;
    else if (i.rewritten) t++;
  }
  return r + t > 0 ? { kind: "entries", dropped: r, rewritten: t, kept: n.length - r } : void 0;
}
/**
 * 描述 tools[] 的问题。
 */
//@ chunk-6mwt0myy.js:17644-18029 placement
function describeToolsListIssues(e) {
  if (e.kind === "not_a_list") return "tools[] is not a list; no per-tool policy taken";
  let n = [];
  if (e.dropped > 0)
    n.push(`dropped ${e.dropped} malformed tools[] ${e.dropped === 1 ? "entry" : "entries"}`);
  if (e.rewritten > 0)
    n.push(
      `read ${e.rewritten} tools[] ${e.rewritten === 1 ? "entry" : "entries"} with an invalid permission_policy as always_ask`,
    );
  return `${n.join(", ")}; kept ${e.kept}`;
}
//@ chunk-6mwt0myy.js:18029-18150 placement
function parseToolPolicies(e) {
  if (!Array.isArray(e)) return;
  let n = [];
  for (let r of e) {
    let t = parseToolPolicyEntry(r);
    if (t !== void 0) n.push(t.policy);
  }
  return n;
}
//@ chunk-6mwt0myy.js:21160-21199 placement
function mcpRuleMatchesToolName(e, n) {
  return compileMcpRuleMatcher(e)(mcpInfoFromString(n));
}
/**
 * compileMcpRuleMatcher：把 mcp__server、mcp__server__*、mcp__server__<通配> 规则编译成对 {serverName, toolName} 的谓词。
 */
//@ chunk-6mwt0myy.js:21199-21467 placement
function compileMcpRuleMatcher(e) {
  let n = mcpInfoFromString(e);
  if (n === null) return () => !1;
  let r = n.toolName === void 0 || n.toolName === "*",
    t = n.toolName !== void 0 && hasWildcard(n.toolName) ? n.toolName : void 0,
    s;
  return (i) =>
    i !== null &&
    n.serverName === i.serverName &&
    (r || (i.toolName !== void 0 && t !== void 0 && (s ??= eSr(t))(i.toolName)));
}
/**
 * 工具对应的 mcp__ 规则前缀。
 */
//@ chunk-6mwt0myy.js:21467-21719 placement = getToolNameForPermissionCheck (1)
function getMcpServerRulePrefixes(tool) {
  if (tool.mcpInfo) {
    let { serverName: serverName } = tool.mcpInfo;
    return [
      `${MCP_TOOL_PREFIX}${normalizeNameForMCP(serverName)}`,
      `${MCP_TOOL_PREFIX}${getPrefixServerKey(serverName)}`,
    ];
  }
  let n = [];
  if (!tool.name.startsWith(MCP_TOOL_PREFIX)) return n;
  for (
    let index = tool.name.indexOf("__", MCP_TOOL_PREFIX.length);
    index !== -1;
    index = tool.name.indexOf("__", index + 1)
  )
    n.push(tool.name.slice(0, index));
  return n;
}
/**
 * parseMcpToolNameCandidates：工具名在 __ 处的各种可能切分（服务器名本身含 __ 时）。
 */
//@ chunk-6mwt0myy.js:21719-21897 placement
function parseMcpToolNameCandidates(e) {
  let n = mcpInfoFromString(e);
  if (n === null || n.toolName === void 0) return n === null ? [] : [n];
  return getMcpServerRulePrefixes({ name: e }).map((r) => ({
    serverName: r.slice(MCP_TOOL_PREFIX.length),
    toolName: e.slice(r.length + 2),
  }));
}
//@ chunk-6mwt0myy.js:21897-22019 placement = getToolNameForPermissionCheck (1)
function ruleWithinServerPrefix(e, n) {
  return (
    n.mcpInfo
      ? [`${MCP_TOOL_PREFIX}${normalizeNameForMCP(n.mcpInfo.serverName)}`]
      : getMcpServerRulePrefixes(n)
  ).every((r) => e === r || e.startsWith(`${r}__`));
}
/**
 * 规则是否匹配 MCP 工具。
 */
//@ chunk-6mwt0myy.js:22019-22067 placement
function mcpRuleMatchesTool(e, n) {
  return mcpRuleMatchesToolName(e, getToolNameForPermissionCheck(n)) && ruleWithinServerPrefix(e, n);
}
//@ chunk-6mwt0myy.js:22067-22198 placement
function mcpRuleMatchesToolAlias(e, n) {
  if (!n.mcpInfo || !isServerIdentityActive()) return !1;
  let r = standardKeyRuleRow(e, getToolNameForPermissionCheck(n));
  return (
    getMcpToolAliasNames(n).includes(e) || (r !== void 0 && r.rule === r.row) || mcpRuleMatchesToolAny(e, n)
  );
}
/**
 * mcpRuleMatchesToolAny：规则通过工具名、别名、服务器前缀任一方式匹配该工具。
 */
//@ chunk-6mwt0myy.js:22198-22383 placement
function mcpRuleMatchesToolAny(e, n) {
  let r = n.mcpInfo ? standardKeyRuleRow(e, getToolNameForPermissionCheck(n)) : void 0;
  return (
    (r !== void 0 && mcpRuleMatchesToolAny(r.rule, { name: r.row })) ||
    mcpRuleMatchesToolName(e, getToolNameForPermissionCheck(n)) ||
    (e.startsWith(MCP_TOOL_PREFIX) && getMcpServerRulePrefixes(n).includes(e)) ||
    getMcpToolAliasNames(n).some((t) => mcpRuleMatchesToolAny(e, { name: t }))
  );
}

export {
  isServerIdentityActive,
  standardKeyRuleRow,
  ruleWithinServerPrefix,
  compileMcpRuleMatcher,
  getMcpServerRulePrefixes,
  ruleWithNormalizedServer,
  toInternalToolName,
  mcpRuleMatchesToolAlias,
  mcpRuleMatchesTool,
  mcpRuleMatchesToolName,
  stdioIdentityDiff,
  parseToolPolicyEntry,
  ownsLegacyKey,
  isLegacyKeyUnclaimed,
  mayRecordServerOwner,
  isLegacyKeyRefused,
  isLegacyKeyOwnedElsewhere,
  parseMcpServerSettings,
  inspectToolsList,
  describeToolsListIssues,
  sameToolPolicies,
  decodeTaggedUuid,
  internalName,
  qao,
  mcpRuleMatchesToolAny,
  internalKey,
  activateServerIdentity,
  ghIsDangerousCallback,
  claimLegacyKey,
  qPi,
  GPi,
  wireName,
  internalToolNameFor,
  KPi,
  registerToolIdentities,
  noteSentWireNames,
  parseMcpToolNameCandidates,
  matchLegacyRule,
};
