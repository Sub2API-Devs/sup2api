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
import { MAX_WIRE_TOOL_NAME_BYTES } from "../../utils/taggedId.js";
import { uniq } from "../../utils/collections.js";
import { normalizeNameForMCP } from "./normalization.js";
import { isPlainObject } from "../../utils/isPlainObject.js";
import {
  mcpInfoFromString,
  MCP_TOOL_PREFIX,
  getToolNameForPermissionCheck,
  getMcpToolAliasNames,
} from "./mcpStringUtils.js";
import { hasWildcard, wildcardRuleRegex } from "../../utils/permissions/permissionRuleParser.js";
import { getPrefixServerKey } from "../../components/agents/ToolSelector.js";

//@ chunk-6mwt0myy.js:1694-1995 placement
/**
 * 从带前缀的 base58 id 中解出 UUID。
 */
function decodeTaggedUuid(e) {
  let index = e.lastIndexOf("_");
  if (index < 0) return;
  let sliced = e.slice(index + 1);
  if (!sliced.startsWith("01")) return;
  let t = BASE58(sliced.slice(2));
  if (t === undefined) return;
  let padded = t.toString(16).padStart(32, "0");
  if (padded.length !== 32) return;
  return `${padded.slice(0, 8)}-${padded.slice(8, 12)}-${padded.slice(12, 16)}-${padded.slice(16, 20)}-${padded.slice(20, 32)}`;
}
//@ chunk-6mwt0myy.js:2024-5798 placement
/**
 * 匹配纯数字或 0x 开头标签的正则（避免 IP 形态）。
 */
var MCP_SERVER_ID_LIMITS = 2048;
var MAX_NAME_WITH_SUFFIX_CHARS = 54;
var MAX_WIRE_NAME_CHARS = 253;
var NAME_PREFIX_CHARS = 21;
var HASH_SUFFIX_CHARS = 32;
var SHORT_HASH_CHARS = 8;
var MAX_PORT = 65535;
var CLAUDE_AI_NAMESPACE_UUID = "6ba7b811-9dad-11d1-80b4-00c04fd430c8";
var RESERVED_TOOL_HASHES = new Set([
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
]);
var RESERVED_HOST_HASHES = new Set([
  "0e4a7f621b2756c6d34c5f409d886ec7622482db96cbcfae01e14b142ce12b1d",
  "0f4dd7885db7d0bf0b1e86b5dd22c2d4f9937994c66e30f3cf0fd7468033f7d4",
  "12ca17b49af2289436f303e0166030a21e525d266e209267433801a8fd4071a0",
  "28cac3b96a52871fc67bc5f353858d4f945316d964778d026fafd408e9840cf5",
  "49960de5880e8c687434170f6476605b8fe4aeb9a28632c7995cf3ba831d9763",
  "d470ff28ce01e69add79d828d4085e3ec719a6536712b5d60afcf1a10976e451",
  "eff8e7ca506627fe15dda5e0e512fcaad70b6d520f37cc76597fdb4f2d83a1a3",
]);
var URL_PARTS_RE = /^(?:([^:/?#]+):)?(?:\/\/([^/?#]*))?([^?#]*)(?:\?[^#]*)?(?:#(.*))?$/;
var UNSAFE_URL_CHARS_RE =
  /[\u0000-\u0020\u007f\\\u0085\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]/;
var SAFE_URL_CHARS_RE = /^(?:[A-Za-z0-9\-._~!$&'()*+,;=:@/]|%[0-9A-Fa-f]{2})*$/;
var BAD_PERCENT_RE = /%(?![0-9A-Fa-f]{2})/;
var HOST_PORT_RE = /^([A-Za-z0-9._-]+)(?::(.*))?$/;
var BRACKETED_HOST_RE = /^\[([0-9A-Fa-f:.]*:[0-9A-Fa-f:.]*)\](?::(.*))?$/;
var PORT_RE = /^[0-9]{1,5}$/;
var HOSTNAME_LABEL_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
var NUMERIC_LABEL_RE = /^(?:[0-9]+|0x[0-9a-f]*)$/;
var ORG_CONNECTOR = "org-connector-";
//@ chunk-6mwt0myy.js:5798-5867 placement
/**
 * 由服务器名生成 claude.ai 侧名的哈希。
 */
function claudeAiServerUuid(serverName) {
  return hashAgentId(`mcp://claude.ai/client-integration/${serverName}`, CLAUDE_AI_NAMESPACE_UUID);
}
//@ chunk-6mwt0myy.js:5867-5972 placement
function isSafeKeySegment(e) {
  return /^[A-Za-z0-9_-]+$/.test(e) && !e.includes("__") && !e.startsWith("_") && !e.endsWith("_");
}
//@ chunk-6mwt0myy.js:5972-6045 placement
/**
 * 判断字符串是否为合法端口号。
 */
function isValidPortString(e) {
  return e === undefined || (PORT_RE.test(e) && Number(e) >= 1 && Number(e) <= MAX_PORT);
}
//@ chunk-6mwt0myy.js:6045-6122 placement
/**
 * 判断路径是否安全（无 . 或 .. 段）。
 */
function isSafeUrlPath(e) {
  return SAFE_URL_CHARS_RE.test(e) && !e.split("/").some((n) => n === "." || n === "..");
}
//@ chunk-6mwt0myy.js:6122-6505 placement = parseGitRemote (0.781)
/**
 * 解析服务器 URL 为身份（协议、主机、路径）。
 */
function parseServerUrlIdentity(input) {
  if (
    input === "" ||
    Array.from(input).length > MCP_SERVER_ID_LIMITS ||
    !isWellFormedString(input) ||
    UNSAFE_URL_CHARS_RE.test(input)
  )
    return;
  let [, n, r, t, s] = URL_PARTS_RE.exec(input) ?? [];
  let lower = n?.toLowerCase();
  if (
    (lower !== "http" && lower !== "https") ||
    !r ||
    t === undefined ||
    !isSafeUrlPath(t) ||
    BAD_PERCENT_RE.test(s ?? "")
  )
    return;
  let hostWithoutPort = HOST_PORT_RE.exec(r) ?? BRACKETED_HOST_RE.exec(r);
  if (
    !hostWithoutPort?.[1] ||
    !isValidPortString(hostWithoutPort[2]) ||
    (hostWithoutPort[1].includes(":") && !isIPv6(hostWithoutPort[1]))
  )
    return;
  let replaced = hostWithoutPort[1].toLowerCase().replace(/\.$/, "");
  return replaced === "" || RESERVED_HOST_HASHES.has(computeContentHash(replaced))
    ? undefined
    : {
        scheme: lower,
        host: replaced,
      };
}
//@ chunk-6mwt0myy.js:6505-6593 placement
/**
 * 判断名称的某个前缀哈希是否命中保留集合。
 */
function hasReservedPrefixHash(e) {
  for (let i = 1; i <= e.length; i++)
    if (RESERVED_TOOL_HASHES.has(computeContentHash(e.slice(0, i)))) return true;
  return false;
}
//@ chunk-6mwt0myy.js:6593-6786 placement
function hostStandardKey(scheme, host) {
  let parts = host.split(".");
  let t = parts.at(-1) ?? "";
  if (
    scheme !== "https" ||
    host.length > MAX_WIRE_NAME_CHARS ||
    parts.length < 2 ||
    t.includes("-") ||
    NUMERIC_LABEL_RE.test(t) ||
    !parts.every((i) => HOSTNAME_LABEL_RE.test(i))
  )
    return;
  let joined = parts.join("_");
  return hasReservedPrefixHash(joined) ? undefined : joined;
}
//@ chunk-6mwt0myy.js:6786-6852 placement
/**
 * 判断键是否为组织连接器键。
 */
function isOrgConnectorKey(e) {
  return `${e}-`.replace(/[_-]+/g, "-").startsWith(ORG_CONNECTOR);
}
//@ chunk-6mwt0myy.js:6852-7119 placement = ghIsDangerousCallback (0.773)
function ghIsDangerousCallback(e) {
  let serverUrlIdentity = parseServerUrlIdentity(e);
  if (serverUrlIdentity === undefined) return;
  let { scheme, host } = serverUrlIdentity;
  let s = `${scheme}://${host.includes(":") ? `[${host}]` : host}`;
  let sliced = computeContentHash(s).slice(0, HASH_SUFFIX_CHARS);
  let o = hostStandardKey(scheme, host);
  let a = `h-${sliced}`;
  let d =
    o === undefined
      ? a
      : o.length > MAX_NAME_WITH_SUFFIX_CHARS
        ? `${o.slice(0, NAME_PREFIX_CHARS).replace(/^[_-]+|[_-]+$/g, "")}-${sliced}`
        : o;
  let c = isOrgConnectorKey(d) ? a : d;
  return isSafeKeySegment(c) ? c : undefined;
}
//@ chunk-6mwt0myy.js:7119-7217 placement
/**
 * 生成 stdio 服务器的本地身份键（命令+参数的哈希）。
 */
function stdioLocalIdentity(command, n) {
  let r = [command, ...n];
  return command !== "" && r.every(isWellFormedString)
    ? `local-${computeContentHash(jsonStringify(r)).slice(0, HASH_SUFFIX_CHARS)}`
    : undefined;
}
//@ chunk-6mwt0myy.js:7217-7380 placement
/**
 * stdio 服务器命令/参数是否变化。
 */
function stdioIdentityDiff(e, n) {
  let args = e.args ?? [];
  return e.command === n.command &&
    args.length === (n.args?.length ?? 0) &&
    args.every((arg, s) => arg === n.args?.[s])
    ? undefined
    : {
        command: e.command,
        args,
      };
}
//@ chunk-6mwt0myy.js:7380-7430 placement
/**
 * 给键加上短哈希后缀，避免冲突。
 */
function suffixedKey(key, n) {
  return `${key}-a${computeContentHash(n).slice(0, SHORT_HASH_CHARS)}`;
}
//@ chunk-6mwt0myy.js:7430-7788 placement
/**
 * 为服务器分配不冲突的标准键（固定优先）。
 */
function assignStandardKeys(e) {
  let n = new Map();
  for (let { id, key, pinned = false } of e) {
    let a = n.get(id);
    if (
      key !== undefined &&
      (a === undefined || (pinned && !a.pinned) || (pinned === a.pinned && key < a.key))
    )
      n.set(id, {
        key,
        pinned,
      });
  }
  let r = new Map();
  let t = new Map();
  for (let [s, { key: i, pinned: o }] of n) {
    if (o) {
      r.set(s, i);
      continue;
    }
    t.set(i, (t.get(i) ?? new Set()).add(s));
  }
  for (let [s, i] of t) for (let o of i) r.set(o, i.size > 1 ? suffixedKey(s, o) : s);
  return r;
}
//@ chunk-6mwt0myy.js:7788-7882 placement
/**
 * 内部工具名前缀 mcp__。
 */
var MCP_PREFIX = "mcp__";
var EMPTY_NAME_LIST = [];
var MCP_RETIRED = "mcp__retired-";
var RETIRED_KEY_RE = /-a[0-9a-f]{8}(?:__|$)/;
var TRAILING_SUFFIX_RE = /^(.*[^_])-a[0-9a-f]{8}$/;
//@ chunk-6mwt0myy.js:7882-8406 placement
/**
 * 创建 MCP 服务器身份状态（遗留键、线名映射等）。
 */
function createServerIdentityState() {
  return {
    active: false,
    readLegacyKeyOwner: () => {
      return;
    },
    claimLegacyKeyOwner: async () => {
      return;
    },
    legacyKeyOwners: new Map(),
    unsavedLegacyKeys: new Set(),
    refusedLegacyKeys: new Map(),
    needsRebuild: false,
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
/**
 * 独立的服务器身份状态（无宿主作用域时使用）。
 */
var serverIdentitySlot = new SessionRootSlot(createServerIdentityState);
var identitySlotHostState = new HostScoped(() => ({
  used: false,
}));
var standaloneIdentityState = createServerIdentityState();
//@ chunk-6mwt0myy.js:8455-8500 placement
/**
 * 取当前有效的服务器身份状态。
 */
function getServerIdentityState() {
  return onProcessRootHost(identitySlotHostState).used
    ? serverIdentitySlot.of(getRootSession())
    : standaloneIdentityState;
}
//@ chunk-6mwt0myy.js:8500-8610 placement
/**
 * 启用服务器身份映射，并接入旧键归属的读取与认领函数。
 */
function activateServerIdentity(e) {
  onProcessRootHost(identitySlotHostState).used = true;
  let serverIdentityState = getServerIdentityState();
  serverIdentityState.active = true;
  serverIdentityState.readLegacyKeyOwner = e.read;
  serverIdentityState.claimLegacyKeyOwner = e.claim;
}
//@ chunk-6mwt0myy.js:8610-8642 placement
/**
 * 服务器身份映射是否启用。
 */
function isServerIdentityActive() {
  return getServerIdentityState().active;
}
//@ chunk-6mwt0myy.js:8642-8684 placement
/**
 * 取保留的旧服务器名集合。
 */
function getKeptLegacyNames() {
  return getServerIdentityState().keptLegacyNames;
}
//@ chunk-6mwt0myy.js:8684-8792 placement
function ownerIdOf(e) {
  return e.serverType === "claudeai-proxy" && e.serverId
    ? (decodeTaggedUuid(e.serverId) ?? e.serverId)
    : claudeAiServerUuid(e.serverName);
}
//@ chunk-6mwt0myy.js:8792-9124 placement
/**
 * 为工具重新分配键。
 */
function reassignToolKey(e, n, r, t) {
  let s = e.tools.get(n);
  let standardKey = s && e.servers.get(s.serverId)?.standardKey;
  if (s === undefined || standardKey === undefined || standardKey.pinned) return;
  let o = new Set(t.values());
  for (let idx = 0; idx <= e.tools.size; idx++) {
    let d = idx === 0 ? s.serverId : `${s.serverId}#${idx}`;
    let c = `${MCP_PREFIX}${suffixedKey(standardKey.key, d)}__${s.toolPart}`;
    if (c.length > MAX_WIRE_TOOL_NAME_BYTES) return;
    if (!r.has(c) && !o.has(c)) return c;
  }
  return;
}
//@ chunk-6mwt0myy.js:9124-9248 placement
function shouldRecordRename(e, n, r, t) {
  return (
    r !== t &&
    !(n.has(r) && e.servers.get(r)?.mayRecordOwner === false && e.servers.get(t)?.mayRecordOwner !== false)
  );
}
//@ chunk-6mwt0myy.js:9248-11960 placement
/**
 * 重建服务器/工具的线上名称映射。
 */
function rebuildWireNames(e) {
  let n = [...e.servers.values()];
  let r = assignStandardKeys([
    ...n.map(({ id, standardKey }) => ({
      id,
      key: standardKey?.key,
      pinned: standardKey?.pinned,
    })),
    ...[...e.formerKeys].flatMap(([o, a]) =>
      [...a]
        .filter((d) => d !== e.servers.get(o)?.standardKey?.key)
        .map((d) => ({
          id: `former:${d}:${o}`,
          key: d,
        })),
    ),
  ]);
  for (let { id, legacyKey } of n) {
    let d = firstLineOf(`${legacyKey}__`, "__");
    e.spelledKeys.set(d, (e.spelledKeys.get(d) ?? new Set()).add(id));
  }
  for (let [o, a] of r) {
    let standardKey = e.servers.get(o)?.standardKey;
    if (
      [...(e.spelledKeys.get(a) ?? [])].some((f) => shouldRecordRename(e, r, f, o)) &&
      standardKey?.key === a &&
      !standardKey.pinned
    )
      r.set(o, suffixedKey(a, o));
  }
  let t = new Map();
  for (let { legacyKey } of n) t.set(legacyKey, (t.get(legacyKey) ?? 0) + 1);
  let internalByWire = e.internalByWire;
  e.sessionKeyById = r;
  e.wireByInternal = new Map();
  e.internalByWire = new Map();
  e.wireKeyByInternalKey = new Map();
  e.internalKeyByWireKey = new Map();
  e.keptLegacyNames = 0;
  for (let { id, legacyKey } of n) {
    let d = r.get(id);
    if (d !== undefined && d !== legacyKey) {
      e.internalKeyByWireKey.set(d, legacyKey);
      if (t.get(legacyKey) === 1) e.wireKeyByInternalKey.set(legacyKey, d);
    }
  }
  let i = new Map();
  for (let [o, { serverId: a, toolPart: d }] of e.tools) {
    let c = r.get(a);
    let f = `${MCP_PREFIX}${c}__${d}`;
    if (c !== undefined && f.length <= MAX_WIRE_TOOL_NAME_BYTES) i.set(o, f);
  }
  for (let [o, a] of e.sentWires) {
    let d = e.tools.get(o);
    let c = d && e.servers.get(d.serverId);
    let standardKey = c?.standardKey;
    if (d !== undefined && c !== undefined && standardKey !== undefined && i.has(o)) {
      let found = [standardKey.key, suffixedKey(standardKey.key, d.serverId)].find(
        (m) => a === `${MCP_PREFIX}${m}__${d.toolPart}`,
      );
      let any = [...(e.spelledKeys.get(standardKey.key) ?? [])].some((m) =>
        shouldRecordRename(e, r, m, d.serverId),
      );
      if (found !== undefined && !(found === standardKey.key && any)) {
        i.set(o, a);
        e.internalKeyByWireKey.set(found, c.legacyKey);
        if (e.wireKeyByInternalKey.has(c.legacyKey)) e.wireKeyByInternalKey.set(c.legacyKey, found);
      }
    }
  }
  for (let o = true; o;) {
    o = false;
    let a = new Set([...e.tools.keys()].filter((key) => !i.has(key)));
    let d = new Set();
    for (let [c, f] of i) {
      let l = d.has(f) || (a.has(f) && f !== c);
      d.add(f);
      if (l) {
        let u = reassignToolKey(e, c, a, i);
        if (u === undefined) i.delete(c);
        else i.set(c, u);
        o = true;
      }
    }
  }
  e.keptLegacyNames = e.tools.size - i.size;
  for (let [o, a] of i) {
    e.wireByInternal.set(o, a);
    e.internalByWire.set(a, o);
    let d = e.wireHolders.get(a);
    e.wireHolders.set(a, d === undefined || d === o ? o : null);
  }
  for (let [o, { serverId: a, toolPart: d }] of e.tools)
    for (let c of e.formerKeys.get(a) ?? []) {
      let f = `${MCP_PREFIX}${c}__${d}`;
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
    let c = i.get(o);
    let filtered = uniq([
      ...[r.get(a), e.servers.get(a)?.standardKey?.key, e.servers.get(a)?.denyKey].flatMap((l) =>
        l === undefined ? [] : [`${MCP_PREFIX}${l}__${d}`],
      ),
      ...(c === undefined ? [] : [c]),
      ...[...(e.formerKeys.get(a) ?? []), ...(e.formerSessionKeys.get(a) ?? [])].map(
        (l) => `${MCP_PREFIX}${l}__${d}`,
      ),
    ]).filter((l) => l !== o);
    if (filtered.length > 0) e.otherDenyOrAskNames.set(o, filtered);
  }
}
//@ chunk-6mwt0myy.js:11960-12184 placement
/**
 * 判断并记录某服务器的旧权限键是否被拒用（有争议或被强制拒绝时记入拒用集合）。
 */
async function isLegacyKeyRefused(e, n = false, r = true) {
  let serverIdentityState = getServerIdentityState();
  if (!serverIdentityState.active) return false;
  let s = normalizeNameForMCP(e.serverName);
  let i = ownerIdOf(e);
  let o = n || (await isLegacyKeyContested(serverIdentityState, s, i, r));
  let a = serverIdentityState.refusedLegacyKeys.get(s) ?? new Set();
  serverIdentityState.refusedLegacyKeys.set(s, a);
  if (o) a.add(i);
  else a.delete(i);
  return o;
}
//@ chunk-6mwt0myy.js:12184-12417 placement
function isKeyHeldByOther(serverIdentityState, n, r) {
  return [...serverIdentityState.servers.values()].some(
    (server) =>
      server.legacyKey !== n &&
      !(r && server.mayRecordOwner === false) &&
      (server.standardKey?.key === n ||
        serverIdentityState.sessionKeyById.get(server.id) === n ||
        serverIdentityState.formerKeys.get(server.id)?.has(n) ||
        serverIdentityState.formerSessionKeys.get(server.id)?.has(n)),
  );
}
//@ chunk-6mwt0myy.js:12417-12523 placement
/**
 * 是否可记录服务器键的所有者。
 */
function mayRecordServerOwner(mcpInfo) {
  let serverIdentityState = getServerIdentityState();
  return (
    serverIdentityState.active &&
    isKeyHeldByOther(
      serverIdentityState,
      normalizeNameForMCP(mcpInfo.serverName),
      serverIdentityState.servers.get(ownerIdOf(mcpInfo))?.mayRecordOwner !== false,
    )
  );
}
//@ chunk-6mwt0myy.js:12523-12950 placement
/**
 * 遗留键是否被其他服务器占用。
 */
async function isLegacyKeyContested(serverIdentityState, n, r, t) {
  if (isKeyHeldByOther(serverIdentityState, n, t)) return true;
  let s = serverIdentityState.unsavedLegacyKeys.has(n)
    ? undefined
    : serverIdentityState.readLegacyKeyOwner(n);
  let i = serverIdentityState.legacyKeyOwners.get(n);
  if (s !== undefined || i !== undefined) return (s ?? r) !== r || (i ?? r) !== r;
  if (!t) return serverIdentityState.unsavedLegacyKeys.has(n);
  serverIdentityState.unsavedLegacyKeys.add(n);
  let o = await serverIdentityState.claimLegacyKeyOwner(n, r);
  if (o === undefined) return true;
  serverIdentityState.unsavedLegacyKeys.delete(n);
  let a = serverIdentityState.legacyKeyOwners.get(n) ?? o;
  serverIdentityState.legacyKeyOwners.set(n, a);
  return a !== r;
}
//@ chunk-6mwt0myy.js:12950-13294 placement
/**
 * 认领遗留键。
 */
async function claimLegacyKey(mcpInfo) {
  let serverIdentityState = getServerIdentityState();
  if (!serverIdentityState.active) return false;
  let r = normalizeNameForMCP(mcpInfo.serverName);
  if (isKeyHeldByOther(serverIdentityState, r, true)) return false;
  let t = ownerIdOf(mcpInfo);
  let s = legacyKeyOwnerOf(serverIdentityState, r);
  if (s !== undefined) serverIdentityState.legacyKeyOwners.set(r, s);
  serverIdentityState.unsavedLegacyKeys.add(r);
  if ((await serverIdentityState.claimLegacyKeyOwner(r, t, true)) !== t) return false;
  serverIdentityState.legacyKeyOwners.set(r, t);
  serverIdentityState.unsavedLegacyKeys.delete(r);
  serverIdentityState.refusedLegacyKeys.get(r)?.delete(t);
  return true;
}
//@ chunk-6mwt0myy.js:13294-13498 placement
/**
 * 判断某服务器的旧键是否已被另一身份的服务器持有。
 */
function isLegacyKeyOwnedElsewhere(e) {
  let serverIdentityState = getServerIdentityState();
  let r = normalizeNameForMCP(e.serverName);
  let t = serverIdentityState.legacyKeyOwners.get(r) ?? serverIdentityState.readLegacyKeyOwner(r);
  return (
    serverIdentityState.active &&
    (!serverIdentityState.unsavedLegacyKeys.has(r) || serverIdentityState.legacyKeyOwners.has(r)) &&
    !isKeyHeldByOther(serverIdentityState, r, true) &&
    t !== undefined &&
    t !== ownerIdOf(e)
  );
}
//@ chunk-6mwt0myy.js:13498-13603 placement
/**
 * 是否拥有遗留键。
 */
function ownsLegacyKey(mcpInfo) {
  let serverIdentityState = getServerIdentityState();
  let r = normalizeNameForMCP(mcpInfo.serverName);
  let t = ownerIdOf(mcpInfo);
  return (
    legacyKeyOwnerOf(serverIdentityState, r) === t && (serverIdentityState.legacyKeyOwners.get(r) ?? t) === t
  );
}
//@ chunk-6mwt0myy.js:13603-13723 placement
/**
 * 判断某服务器的旧键是否尚未被本服务器认领（未保存或归属他人）。
 */
function isLegacyKeyUnclaimed(e) {
  let serverIdentityState = getServerIdentityState();
  let r = normalizeNameForMCP(e.serverName);
  let t = legacyKeyOwnerOf(serverIdentityState, r);
  return (
    serverIdentityState.active &&
    (t === undefined ? serverIdentityState.unsavedLegacyKeys.has(r) : t !== ownerIdOf(e))
  );
}
//@ chunk-6mwt0myy.js:13723-13831 placement
function legacyKeyOwnerOf(serverIdentityState, n) {
  return (
    (serverIdentityState.unsavedLegacyKeys.has(n) ? undefined : serverIdentityState.readLegacyKeyOwner(n)) ??
    serverIdentityState.legacyKeyOwners.get(n)
  );
}
//@ chunk-6mwt0myy.js:13831-14442 placement
/**
 * 更新服务器身份记录。
 */
function updateServerIdentity(serverIdentityState, { server, standardKey, denyKey, mayRecordOwner }) {
  let i = ownerIdOf(server);
  let o = normalizeNameForMCP(server.serverName);
  let a = serverIdentityState.servers.get(i);
  let standardKey_2 = a?.standardKey;
  let c = standardKey ?? standardKey_2;
  let f = denyKey ?? a?.denyKey;
  let l = mayRecordOwner ?? a?.mayRecordOwner;
  if (
    a === undefined ||
    a.legacyKey !== o ||
    standardKey_2?.key !== c?.key ||
    standardKey_2?.pinned !== c?.pinned ||
    a.denyKey !== f ||
    a.mayRecordOwner !== l
  ) {
    if (standardKey_2 !== undefined && !standardKey_2.pinned && standardKey_2.key !== c?.key) {
      serverIdentityState.formerKeys.set(
        i,
        (serverIdentityState.formerKeys.get(i) ?? new Set()).add(standardKey_2.key),
      );
      let u = serverIdentityState.sessionKeyById.get(i);
      if (u !== undefined)
        serverIdentityState.formerSessionKeys.set(
          i,
          (serverIdentityState.formerSessionKeys.get(i) ?? new Set()).add(u),
        );
    }
    serverIdentityState.needsRebuild = true;
    serverIdentityState.servers.set(i, {
      id: i,
      legacyKey: o,
      standardKey: c,
      denyKey: f,
      mayRecordOwner: l,
    });
  }
  return i;
}
//@ chunk-6mwt0myy.js:14442-14554 placement
function rebuildIfNeeded(serverIdentityState) {
  if (serverIdentityState.needsRebuild) {
    let n = {
      ...serverIdentityState,
    };
    try {
      rebuildWireNames(serverIdentityState);
      serverIdentityState.needsRebuild = false;
    } catch (error) {
      Object.assign(serverIdentityState, n);
      throw error;
    }
  }
}
//@ chunk-6mwt0myy.js:14554-14627 placement
/**
 * 登记一批工具的身份，必要时标记重建线上名。
 */
function registerToolIdentities(e) {
  let serverIdentityState = getServerIdentityState();
  if (!serverIdentityState.active) return;
  for (let r of e) updateServerIdentity(serverIdentityState, r);
  rebuildIfNeeded(serverIdentityState);
}
//@ chunk-6mwt0myy.js:14627-14864 placement
/**
 * 登记工具到服务器身份的映射，有变化时标记需要重建线上名。
 */
function registerToolIdentities_2(e) {
  let serverIdentityState = getServerIdentityState();
  if (!serverIdentityState.active) return;
  for (let r of e) {
    let t = updateServerIdentity(serverIdentityState, r);
    let s = normalizeNameForMCP(r.server.serverName);
    if (serverIdentityState.tools.get(r.name)?.serverId !== t) {
      serverIdentityState.needsRebuild = true;
      serverIdentityState.tools.set(r.name, {
        serverId: t,
        toolPart: r.name.slice(`${MCP_PREFIX}${s}__`.length),
      });
    }
  }
  rebuildIfNeeded(serverIdentityState);
}
//@ chunk-6mwt0myy.js:14864-14989 placement
/**
 * 记录已发送给模型的工具线上名。
 */
function noteSentWireNames(e) {
  let { active, wireByInternal, sentWires } = getServerIdentityState();
  if (active)
    for (let s of e) {
      let i = wireByInternal.get(s);
      if (i !== undefined) sentWires.set(s, i);
    }
}
//@ chunk-6mwt0myy.js:14989-15041 placement
/**
 * 内部名对应的线上名。
 */
function wireName(e) {
  return getServerIdentityState().wireByInternal.get(e) ?? e;
}
//@ chunk-6mwt0myy.js:15041-15147 placement
/**
 * 把线上工具名换回内部名（含已退役的线上名）。
 */
function internalToolNameFor(name) {
  return (
    (name.startsWith(MCP_RETIRED)
      ? [...getServerIdentityState().retiredWireNames].find(([, r]) => r === name)
      : undefined)?.[0] ?? wireName(name)
  );
}
//@ chunk-6mwt0myy.js:15147-15237 placement
/**
 * 线上名对应的内部名。
 */
function internalName(name) {
  let { internalByWire, retiredWireNames } = getServerIdentityState();
  return internalByWire.get(name) ?? retiredWireNames.get(name) ?? name;
}
//@ chunk-6mwt0myy.js:15237-15295 placement
/**
 * 线上键对应的内部键。
 */
function internalKey(e) {
  return getServerIdentityState().internalKeyByWireKey.get(e) ?? e;
}
//@ chunk-6mwt0myy.js:15295-15449 placement
function mapServerSegment(e, n) {
  if (!e.startsWith(MCP_PREFIX)) return e;
  let sliced = e.slice(MCP_PREFIX.length);
  let index = sliced.indexOf("__");
  let s = index === -1 ? sliced : sliced.slice(0, index);
  return `${MCP_PREFIX}${n(s)}${index === -1 ? "" : sliced.slice(index)}`;
}
//@ chunk-6mwt0myy.js:15449-15481 placement
/**
 * 把 mcp__ 前缀名转为内部键。
 */
function toInternalToolName(e) {
  return mapServerSegment(e, internalKey);
}
//@ chunk-6mwt0myy.js:15481-15814 placement
/**
 * 规则是否引用了遗留键。
 */
function matchLegacyRule(e, n) {
  let { wireKeyByInternalKey, refusedLegacyKeys } = getServerIdentityState();
  let s;
  for (let [i, o] of wireKeyByInternalKey) {
    let a = `${MCP_PREFIX}${i}`;
    if ((e === a || e.startsWith(`${a}__`) || e.startsWith(`${a}(`)) && i.length > (s?.legacy.length ?? -1))
      s = {
        legacy: i,
        wire: o,
      };
  }
  return s === undefined || (n === "allow" && (refusedLegacyKeys.get(s.legacy)?.size ?? 0) > 0)
    ? e
    : `${MCP_PREFIX}${s.wire}${e.slice(MCP_PREFIX.length + s.legacy.length)}`;
}
//@ chunk-6mwt0myy.js:15814-15872 placement
/**
 * 取某服务器在拒绝/询问名称表里的别名。
 */
function denyOrAskNamesFor(e) {
  return getServerIdentityState().otherDenyOrAskNames.get(e) ?? EMPTY_NAME_LIST;
}
//@ chunk-6mwt0myy.js:15872-15980 placement
/**
 * 把权限规则中的服务器名规范化（去掉身份后缀），未变化时返回 undefined。
 */
function ruleWithNormalizedServer(e) {
  if (!RETIRED_KEY_RE.test(e) || !getServerIdentityState().active) return;
  let n = mapServerSegment(e, (r) => TRAILING_SUFFIX_RE.exec(r)?.[1] ?? r);
  return n === e ? undefined : n;
}
//@ chunk-6mwt0myy.js:15980-16242 placement
/**
 * 为权限规则生成按标准键表示的工具行，供规则匹配使用。
 */
function standardKeyRuleRow(e, toolNameForPermissionCheck) {
  let r = ruleWithNormalizedServer(e);
  if (r === undefined) return;
  let { tools, servers, sessionKeyById } = getServerIdentityState();
  let o = tools.get(toolNameForPermissionCheck);
  let key = o === undefined ? undefined : servers.get(o.serverId)?.standardKey?.key;
  return o === undefined || key === undefined || sessionKeyById.get(o.serverId) !== key
    ? undefined
    : {
        rule: r,
        row: `${MCP_PREFIX}${key}__${o.toolPart}`,
      };
}
//@ chunk-6mwt0myy.js:16242-16318 placement
/**
 * 正整数原样返回，否则 undefined。
 */
function positiveIntOrUndefined(timeout) {
  return typeof timeout === "number" && Number.isInteger(timeout) && timeout > 0 ? timeout : undefined;
}
//@ chunk-6mwt0myy.js:16318-16372 placement
/**
 * 合法的工具策略取值（always_allow/ask/deny）。
 */
var TOOL_POLICY_VALUES = {
  always_allow: true,
  always_ask: true,
  always_deny: true,
};
//@ chunk-6mwt0myy.js:16372-16435 placement
/**
 * 判断是否为合法工具策略取值。
 */
function isToolPolicyValue(permissionPolicy) {
  return typeof permissionPolicy === "string" && Object.hasOwn(TOOL_POLICY_VALUES, permissionPolicy);
}
//@ chunk-6mwt0myy.js:16435-16704 placement
/**
 * 解析服务器工具策略条目：合法策略原样保留，不认识的策略改写为 always_ask。
 */
function parseToolPolicyEntry(tool) {
  if (!isPlainObject(tool) || typeof tool.name !== "string") return;
  let { name: n, permission_policy: permissionPolicy } = tool;
  if (permissionPolicy === undefined)
    return {
      policy: {
        name: n,
      },
      rewritten: false,
    };
  return isToolPolicyValue(permissionPolicy)
    ? {
        policy: {
          name: n,
          permission_policy: permissionPolicy,
        },
        rewritten: false,
      }
    : {
        policy: {
          name: n,
          permission_policy: "always_ask",
        },
        rewritten: true,
      };
}
//@ chunk-6mwt0myy.js:16704-16872 placement
/**
 * 比较两组工具策略列表是否相同。
 */
function sameToolPolicies(tools, tools_2) {
  if (tools === undefined || tools_2 === undefined) return tools === tools_2;
  return (
    tools.length === tools_2.length &&
    tools.every(
      (r, t) => r.name === tools_2[t]?.name && r.permission_policy === tools_2[t]?.permission_policy,
    )
  );
}
//@ chunk-6mwt0myy.js:16872-17376 placement
/**
 * 解析服务器的附加设置（timeout、disableAutoBackground、tools、connectorId）。
 */
function parseMcpServerSettings(e) {
  if (!isPlainObject(e))
    return {
      settings: {},
      ignored: [],
    };
  let { timeout, disableAutoBackground, tools, connectorId } = e;
  let i = positiveIntOrUndefined(timeout);
  let o = [];
  if (timeout !== undefined && i === undefined) o.push("timeout");
  if (disableAutoBackground !== undefined && typeof disableAutoBackground !== "boolean")
    o.push("disableAutoBackground");
  let toolPolicies = parseToolPolicies(tools);
  if (inspectToolsList(e) !== undefined) o.push("tools");
  let d = typeof connectorId === "string" && connectorId !== "";
  if (connectorId !== undefined && !d) o.push("connectorId");
  return {
    settings: {
      ...(i !== undefined && {
        timeout: i,
      }),
      ...(disableAutoBackground === true && {
        disableAutoBackground,
      }),
      ...(toolPolicies !== undefined && {
        tools: toolPolicies,
      }),
      ...(d && {
        connectorId,
      }),
    },
    ignored: o,
  };
}
//@ chunk-6mwt0myy.js:17376-17644 placement
/**
 * 检查 tools[] 条目（丢弃、改写数量）。
 */
function inspectToolsList(e) {
  let tools = isPlainObject(e) ? e.tools : undefined;
  if (tools === undefined) return;
  if (!Array.isArray(tools))
    return {
      kind: "not_a_list",
    };
  let r = 0;
  let t = 0;
  for (let tool of tools) {
    let toolPolicyEntry = parseToolPolicyEntry(tool);
    if (toolPolicyEntry === undefined) r++;
    else if (toolPolicyEntry.rewritten) t++;
  }
  return r + t > 0
    ? {
        kind: "entries",
        dropped: r,
        rewritten: t,
        kept: tools.length - r,
      }
    : undefined;
}
//@ chunk-6mwt0myy.js:17644-18029 placement
/**
 * 描述 tools[] 的问题。
 */
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
function parseToolPolicies(tools) {
  if (!Array.isArray(tools)) return;
  let n = [];
  for (let r of tools) {
    let toolPolicyEntry = parseToolPolicyEntry(r);
    if (toolPolicyEntry !== undefined) n.push(toolPolicyEntry.policy);
  }
  return n;
}
//@ chunk-6mwt0myy.js:21160-21199 placement
function mcpRuleMatchesToolName(e, toolNameForPermissionCheck) {
  return compileMcpRuleMatcher(e)(mcpInfoFromString(toolNameForPermissionCheck));
}
//@ chunk-6mwt0myy.js:21199-21467 placement
/**
 * compileMcpRuleMatcher：把 mcp__server、mcp__server__*、mcp__server__<通配> 规则编译成对 {serverName, toolName} 的谓词。
 */
function compileMcpRuleMatcher(e) {
  let n = mcpInfoFromString(e);
  if (n === null) return () => false;
  let r = n.toolName === undefined || n.toolName === "*";
  let toolName = n.toolName !== undefined && hasWildcard(n.toolName) ? n.toolName : undefined;
  let s;
  return (i) =>
    i !== null &&
    n.serverName === i.serverName &&
    (r ||
      (i.toolName !== undefined &&
        toolName !== undefined &&
        (s ??= wildcardRuleRegex(toolName))(i.toolName)));
}
//@ chunk-6mwt0myy.js:21467-21719 placement = getToolNameForPermissionCheck (1)
/**
 * 工具对应的 mcp__ 规则前缀。
 */
function getMcpServerRulePrefixes(tool) {
  if (tool.mcpInfo) {
    let { serverName } = tool.mcpInfo;
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
//@ chunk-6mwt0myy.js:21719-21897 placement
/**
 * parseMcpToolNameCandidates：工具名在 __ 处的各种可能切分（服务器名本身含 __ 时）。
 */
function parseMcpToolNameCandidates(e) {
  let n = mcpInfoFromString(e);
  if (n === null || n.toolName === undefined) return n === null ? [] : [n];
  return getMcpServerRulePrefixes({
    name: e,
  }).map((r) => ({
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
//@ chunk-6mwt0myy.js:22019-22067 placement
/**
 * 规则是否匹配 MCP 工具。
 */
function mcpRuleMatchesTool(toolName, allowedAvailableTool) {
  return (
    mcpRuleMatchesToolName(toolName, getToolNameForPermissionCheck(allowedAvailableTool)) &&
    ruleWithinServerPrefix(toolName, allowedAvailableTool)
  );
}
//@ chunk-6mwt0myy.js:22067-22198 placement
function mcpRuleMatchesToolAlias(e, n) {
  if (!n.mcpInfo || !isServerIdentityActive()) return false;
  let r = standardKeyRuleRow(e, getToolNameForPermissionCheck(n));
  return (
    getMcpToolAliasNames(n).includes(e) ||
    (r !== undefined && r.rule === r.row) ||
    mcpRuleMatchesToolAny(e, n)
  );
}
//@ chunk-6mwt0myy.js:22198-22383 placement
/**
 * mcpRuleMatchesToolAny：规则通过工具名、别名、服务器前缀任一方式匹配该工具。
 */
function mcpRuleMatchesToolAny(e, n) {
  let r = n.mcpInfo ? standardKeyRuleRow(e, getToolNameForPermissionCheck(n)) : undefined;
  return (
    (r !== undefined &&
      mcpRuleMatchesToolAny(r.rule, {
        name: r.row,
      })) ||
    mcpRuleMatchesToolName(e, getToolNameForPermissionCheck(n)) ||
    (e.startsWith(MCP_TOOL_PREFIX) && getMcpServerRulePrefixes(n).includes(e)) ||
    getMcpToolAliasNames(n).some((name) =>
      mcpRuleMatchesToolAny(e, {
        name,
      }),
    )
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
  denyOrAskNamesFor,
  mcpRuleMatchesToolAny,
  internalKey,
  activateServerIdentity,
  ghIsDangerousCallback,
  claimLegacyKey,
  registerToolIdentities,
  stdioLocalIdentity,
  wireName,
  internalToolNameFor,
  getKeptLegacyNames,
  registerToolIdentities_2,
  noteSentWireNames,
  parseMcpToolNameCandidates,
  matchLegacyRule,
};
