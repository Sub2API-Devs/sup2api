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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-6mwt0myy.js:1694-1995 placement
/**
 * 从带前缀的 base58 id 中解出 UUID。
 */
function decodeTaggedUuid(tag) {
  let index = tag.lastIndexOf("_");
  if (index < 0) return;
  let sliced = tag.slice(index + 1);
  if (!sliced.startsWith("01")) return;
  let decoded = BASE58(sliced.slice(2));
  if (decoded === undefined) return;
  let padded = decoded.toString(16).padStart(32, "0");
  if (padded.length !== 32) return;
  return `${padded.slice(0, 8)}-${padded.slice(8, 12)}-${padded.slice(12, 16)}-${padded.slice(16, 20)}-${padded.slice(20, 32)}`;
}
//@ chunk-6mwt0myy.js:2024-5798 placement
/**
 * 匹配纯数字或 0x 开头标签的正则（避免 IP 形态）。
 */
var MCP_SERVER_ID_LIMITS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var MAX_NAME_WITH_SUFFIX_CHARS;
var MAX_WIRE_NAME_CHARS;
var NAME_PREFIX_CHARS;
var HASH_SUFFIX_CHARS;
var SHORT_HASH_CHARS;
var MAX_PORT;
var CLAUDE_AI_NAMESPACE_UUID;
var RESERVED_TOOL_HASHES;
var RESERVED_HOST_HASHES;
var URL_PARTS_RE;
var UNSAFE_URL_CHARS_RE;
var SAFE_URL_CHARS_RE;
var BAD_PERCENT_RE;
var HOST_PORT_RE;
var BRACKETED_HOST_RE;
var PORT_RE;
var HOSTNAME_LABEL_RE;
var NUMERIC_LABEL_RE;
var ORG_CONNECTOR;
deferInit("chunk-6mwt0myy.js:2024", () => {
  MCP_SERVER_ID_LIMITS = 2048;
  MAX_NAME_WITH_SUFFIX_CHARS = 54;
  MAX_WIRE_NAME_CHARS = 253;
  NAME_PREFIX_CHARS = 21;
  HASH_SUFFIX_CHARS = 32;
  SHORT_HASH_CHARS = 8;
  MAX_PORT = 65535;
  CLAUDE_AI_NAMESPACE_UUID = "6ba7b811-9dad-11d1-80b4-00c04fd430c8";
  RESERVED_TOOL_HASHES = new Set([
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
  RESERVED_HOST_HASHES = new Set([
    "0e4a7f621b2756c6d34c5f409d886ec7622482db96cbcfae01e14b142ce12b1d",
    "0f4dd7885db7d0bf0b1e86b5dd22c2d4f9937994c66e30f3cf0fd7468033f7d4",
    "12ca17b49af2289436f303e0166030a21e525d266e209267433801a8fd4071a0",
    "28cac3b96a52871fc67bc5f353858d4f945316d964778d026fafd408e9840cf5",
    "49960de5880e8c687434170f6476605b8fe4aeb9a28632c7995cf3ba831d9763",
    "d470ff28ce01e69add79d828d4085e3ec719a6536712b5d60afcf1a10976e451",
    "eff8e7ca506627fe15dda5e0e512fcaad70b6d520f37cc76597fdb4f2d83a1a3",
  ]);
  URL_PARTS_RE = /^(?:([^:/?#]+):)?(?:\/\/([^/?#]*))?([^?#]*)(?:\?[^#]*)?(?:#(.*))?$/;
  UNSAFE_URL_CHARS_RE =
    /[\u0000-\u0020\u007f\\\u0085\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]/;
  SAFE_URL_CHARS_RE = /^(?:[A-Za-z0-9\-._~!$&'()*+,;=:@/]|%[0-9A-Fa-f]{2})*$/;
  BAD_PERCENT_RE = /%(?![0-9A-Fa-f]{2})/;
  HOST_PORT_RE = /^([A-Za-z0-9._-]+)(?::(.*))?$/;
  BRACKETED_HOST_RE = /^\[([0-9A-Fa-f:.]*:[0-9A-Fa-f:.]*)\](?::(.*))?$/;
  PORT_RE = /^[0-9]{1,5}$/;
  HOSTNAME_LABEL_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
  NUMERIC_LABEL_RE = /^(?:[0-9]+|0x[0-9a-f]*)$/;
  ORG_CONNECTOR = "org-connector-";
});
//@ chunk-6mwt0myy.js:5798-5867 placement
/**
 * 由服务器名生成 claude.ai 侧名的哈希。
 */
function claudeAiServerUuid(serverName) {
  return hashAgentId(`mcp://claude.ai/client-integration/${serverName}`, CLAUDE_AI_NAMESPACE_UUID);
}
//@ chunk-6mwt0myy.js:5867-5972 placement
function isSafeKeySegment(segment) {
  return (
    /^[A-Za-z0-9_-]+$/.test(segment) &&
    !segment.includes("__") &&
    !segment.startsWith("_") &&
    !segment.endsWith("_")
  );
}
//@ chunk-6mwt0myy.js:5972-6045 placement
/**
 * 判断字符串是否为合法端口号。
 */
function isValidPortString(port) {
  return port === undefined || (PORT_RE.test(port) && Number(port) >= 1 && Number(port) <= MAX_PORT);
}
//@ chunk-6mwt0myy.js:6045-6122 placement
/**
 * 判断路径是否安全（无 . 或 .. 段）。
 */
function isSafeUrlPath(path) {
  return (
    SAFE_URL_CHARS_RE.test(path) && !path.split("/").some((segment) => segment === "." || segment === "..")
  );
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
  let [, scheme, authority, path, suffix] = URL_PARTS_RE.exec(input) ?? [];
  let lower = scheme?.toLowerCase();
  if (
    (lower !== "http" && lower !== "https") ||
    !authority ||
    path === undefined ||
    !isSafeUrlPath(path) ||
    BAD_PERCENT_RE.test(suffix ?? "")
  )
    return;
  let hostWithoutPort = HOST_PORT_RE.exec(authority) ?? BRACKETED_HOST_RE.exec(authority);
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
function hasReservedPrefixHash(name) {
  for (let i = 1; i <= name.length; i++)
    if (RESERVED_TOOL_HASHES.has(computeContentHash(name.slice(0, i)))) return true;
  return false;
}
//@ chunk-6mwt0myy.js:6593-6786 placement
function hostStandardKey(scheme, host) {
  let parts = host.split(".");
  let tld = parts.at(-1) ?? "";
  if (
    scheme !== "https" ||
    host.length > MAX_WIRE_NAME_CHARS ||
    parts.length < 2 ||
    tld.includes("-") ||
    NUMERIC_LABEL_RE.test(tld) ||
    !parts.every((label) => HOSTNAME_LABEL_RE.test(label))
  )
    return;
  let name = parts.join("_");
  return hasReservedPrefixHash(name) ? undefined : name;
}
//@ chunk-6mwt0myy.js:6786-6852 placement
/**
 * 判断键是否为组织连接器键。
 */
function isOrgConnectorKey(key) {
  return `${key}-`.replace(/[_-]+/g, "-").startsWith(ORG_CONNECTOR);
}
//@ chunk-6mwt0myy.js:6852-7119 placement = ghIsDangerousCallback (0.773)
function ghIsDangerousCallback(input) {
  let serverUrlIdentity = parseServerUrlIdentity(input);
  if (serverUrlIdentity === undefined) return;
  let { scheme, host } = serverUrlIdentity;
  let origin = `${scheme}://${host.includes(":") ? `[${host}]` : host}`;
  let sliced = computeContentHash(origin).slice(0, HASH_SUFFIX_CHARS);
  let hostKey = hostStandardKey(scheme, host);
  let hashedKey = `h-${sliced}`;
  let key =
    hostKey === undefined
      ? hashedKey
      : hostKey.length > MAX_NAME_WITH_SUFFIX_CHARS
        ? `${hostKey.slice(0, NAME_PREFIX_CHARS).replace(/^[_-]+|[_-]+$/g, "")}-${sliced}`
        : hostKey;
  let safeKey = isOrgConnectorKey(key) ? hashedKey : key;
  return isSafeKeySegment(safeKey) ? safeKey : undefined;
}
//@ chunk-6mwt0myy.js:7119-7217 placement
/**
 * 生成 stdio 服务器的本地身份键（命令+参数的哈希）。
 */
function stdioLocalIdentity(command, args) {
  let parts = [command, ...args];
  return command !== "" && parts.every(isWellFormedString)
    ? `local-${computeContentHash(jsonStringify(parts)).slice(0, HASH_SUFFIX_CHARS)}`
    : undefined;
}
//@ chunk-6mwt0myy.js:7217-7380 placement
/**
 * stdio 服务器命令/参数是否变化。
 */
function stdioIdentityDiff(original, expanded) {
  let args = original.args ?? [];
  return original.command === expanded.command &&
    args.length === (expanded.args?.length ?? 0) &&
    args.every((arg, index) => arg === expanded.args?.[index])
    ? undefined
    : {
        command: original.command,
        args,
      };
}
//@ chunk-6mwt0myy.js:7380-7430 placement
/**
 * 给键加上短哈希后缀，避免冲突。
 */
function suffixedKey(key, id) {
  return `${key}-a${computeContentHash(id).slice(0, SHORT_HASH_CHARS)}`;
}
//@ chunk-6mwt0myy.js:7430-7788 placement
/**
 * 为服务器分配不冲突的标准键（固定优先）。
 */
function assignStandardKeys(entries) {
  let bestById = new Map();
  for (let { id, key, pinned = false } of entries) {
    let existing = bestById.get(id);
    if (
      key !== undefined &&
      (existing === undefined ||
        (pinned && !existing.pinned) ||
        (pinned === existing.pinned && key < existing.key))
    )
      bestById.set(id, {
        key,
        pinned,
      });
  }
  let result = new Map();
  let byKey = new Map();
  for (let [id, { key, pinned }] of bestById) {
    if (pinned) {
      result.set(id, key);
      continue;
    }
    byKey.set(key, (byKey.get(key) ?? new Set()).add(id));
  }
  for (let [key, ids] of byKey) for (let id of ids) result.set(id, ids.size > 1 ? suffixedKey(key, id) : key);
  return result;
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
var serverIdentitySlot; // deferred: uses SessionRootSlot (../../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
var identitySlotHostState;
var standaloneIdentityState;
deferInit("chunk-6mwt0myy.js:8406", () => {
  serverIdentitySlot = new SessionRootSlot(createServerIdentityState);
  identitySlotHostState = new HostScoped(() => ({
    used: false,
  }));
  standaloneIdentityState = createServerIdentityState();
});
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
function activateServerIdentity(handler) {
  onProcessRootHost(identitySlotHostState).used = true;
  let serverIdentityState = getServerIdentityState();
  serverIdentityState.active = true;
  serverIdentityState.readLegacyKeyOwner = handler.read;
  serverIdentityState.claimLegacyKeyOwner = handler.claim;
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
function ownerIdOf(mcpInfo) {
  return mcpInfo.serverType === "claudeai-proxy" && mcpInfo.serverId
    ? (decodeTaggedUuid(mcpInfo.serverId) ?? mcpInfo.serverId)
    : claudeAiServerUuid(mcpInfo.serverName);
}
//@ chunk-6mwt0myy.js:8792-9124 placement
/**
 * 为工具重新分配键。
 */
function reassignToolKey(state, internalKey, reserved, assigned) {
  let toolRecord = state.tools.get(internalKey);
  let standardKey = toolRecord && state.servers.get(toolRecord.serverId)?.standardKey;
  if (toolRecord === undefined || standardKey === undefined || standardKey.pinned) return;
  let assignedNames = new Set(assigned.values());
  for (let idx = 0; idx <= state.tools.size; idx++) {
    let candidateId = idx === 0 ? toolRecord.serverId : `${toolRecord.serverId}#${idx}`;
    let candidate = `${MCP_PREFIX}${suffixedKey(standardKey.key, candidateId)}__${toolRecord.toolPart}`;
    if (candidate.length > MAX_WIRE_TOOL_NAME_BYTES) return;
    if (!reserved.has(candidate) && !assignedNames.has(candidate)) return candidate;
  }
  return;
}
//@ chunk-6mwt0myy.js:9124-9248 placement
function shouldRecordRename(state, standardKeys, previousId, nextId) {
  return (
    previousId !== nextId &&
    !(
      standardKeys.has(previousId) &&
      state.servers.get(previousId)?.mayRecordOwner === false &&
      state.servers.get(nextId)?.mayRecordOwner !== false
    )
  );
}
//@ chunk-6mwt0myy.js:9248-11960 placement
/**
 * 重建服务器/工具的线上名称映射。
 */
function rebuildWireNames(state) {
  let servers = [...state.servers.values()];
  let standardKeyById = assignStandardKeys([
    ...servers.map(({ id, standardKey }) => ({
      id,
      key: standardKey?.key,
      pinned: standardKey?.pinned,
    })),
    ...[...state.formerKeys].flatMap(([serverId, formerKeys]) =>
      [...formerKeys]
        .filter((formerKey) => formerKey !== state.servers.get(serverId)?.standardKey?.key)
        .map((formerKey) => ({
          id: `former:${formerKey}:${serverId}`,
          key: formerKey,
        })),
    ),
  ]);
  for (let { id, legacyKey } of servers) {
    let legacyPrefix = firstLineOf(`${legacyKey}__`, "__");
    state.spelledKeys.set(legacyPrefix, (state.spelledKeys.get(legacyPrefix) ?? new Set()).add(id));
  }
  for (let [id, key] of standardKeyById) {
    let standardKey = state.servers.get(id)?.standardKey;
    if (
      [...(state.spelledKeys.get(key) ?? [])].some((otherId) =>
        shouldRecordRename(state, standardKeyById, otherId, id),
      ) &&
      standardKey?.key === key &&
      !standardKey.pinned
    )
      standardKeyById.set(id, suffixedKey(key, id));
  }
  let legacyCounts = new Map();
  for (let { legacyKey } of servers) legacyCounts.set(legacyKey, (legacyCounts.get(legacyKey) ?? 0) + 1);
  let internalByWire = state.internalByWire;
  state.sessionKeyById = standardKeyById;
  state.wireByInternal = new Map();
  state.internalByWire = new Map();
  state.wireKeyByInternalKey = new Map();
  state.internalKeyByWireKey = new Map();
  state.keptLegacyNames = 0;
  for (let { id, legacyKey } of servers) {
    let standardKey = standardKeyById.get(id);
    if (standardKey !== undefined && standardKey !== legacyKey) {
      state.internalKeyByWireKey.set(standardKey, legacyKey);
      if (legacyCounts.get(legacyKey) === 1) state.wireKeyByInternalKey.set(legacyKey, standardKey);
    }
  }
  let wireByInternal = new Map();
  for (let [internalKey, { serverId, toolPart }] of state.tools) {
    let standardKey = standardKeyById.get(serverId);
    let wireName = `${MCP_PREFIX}${standardKey}__${toolPart}`;
    if (standardKey !== undefined && wireName.length <= MAX_WIRE_TOOL_NAME_BYTES)
      wireByInternal.set(internalKey, wireName);
  }
  for (let [internalKey, sentWire] of state.sentWires) {
    let toolRecord = state.tools.get(internalKey);
    let serverRecord = toolRecord && state.servers.get(toolRecord.serverId);
    let standardKey = serverRecord?.standardKey;
    if (
      toolRecord !== undefined &&
      serverRecord !== undefined &&
      standardKey !== undefined &&
      wireByInternal.has(internalKey)
    ) {
      let found = [standardKey.key, suffixedKey(standardKey.key, toolRecord.serverId)].find(
        (candidateKey) => sentWire === `${MCP_PREFIX}${candidateKey}__${toolRecord.toolPart}`,
      );
      let any = [...(state.spelledKeys.get(standardKey.key) ?? [])].some((otherId) =>
        shouldRecordRename(state, standardKeyById, otherId, toolRecord.serverId),
      );
      if (found !== undefined && !(found === standardKey.key && any)) {
        wireByInternal.set(internalKey, sentWire);
        state.internalKeyByWireKey.set(found, serverRecord.legacyKey);
        if (state.wireKeyByInternalKey.has(serverRecord.legacyKey))
          state.wireKeyByInternalKey.set(serverRecord.legacyKey, found);
      }
    }
  }
  for (let changed = true; changed;) {
    changed = false;
    let freeKeys = new Set([...state.tools.keys()].filter((key) => !wireByInternal.has(key)));
    let seen = new Set();
    for (let [internalKey, wireName] of wireByInternal) {
      let collision = seen.has(wireName) || (freeKeys.has(wireName) && wireName !== internalKey);
      seen.add(wireName);
      if (collision) {
        let renamed = reassignToolKey(state, internalKey, freeKeys, wireByInternal);
        if (renamed === undefined) wireByInternal.delete(internalKey);
        else wireByInternal.set(internalKey, renamed);
        changed = true;
      }
    }
  }
  state.keptLegacyNames = state.tools.size - wireByInternal.size;
  for (let [internalKey, wireName] of wireByInternal) {
    state.wireByInternal.set(internalKey, wireName);
    state.internalByWire.set(wireName, internalKey);
    let holder = state.wireHolders.get(wireName);
    state.wireHolders.set(wireName, holder === undefined || holder === internalKey ? internalKey : null);
  }
  for (let [internalKey, { serverId, toolPart }] of state.tools)
    for (let formerKey of state.formerKeys.get(serverId) ?? []) {
      let wireName = `${MCP_PREFIX}${formerKey}__${toolPart}`;
      if (
        state.wireHolders.get(wireName) === internalKey &&
        !state.internalByWire.has(wireName) &&
        (wireName === internalKey || !state.tools.has(wireName))
      )
        state.internalByWire.set(wireName, internalKey);
    }
  for (let [wireName, internalKey] of internalByWire) {
    let isOwnName =
      wireName === internalKey && state.tools.has(wireName) && !state.wireByInternal.has(wireName);
    if (!state.internalByWire.has(wireName) && !state.retiredWireNames.has(wireName) && !isOwnName)
      state.retiredWireNames.set(wireName, `${MCP_RETIRED}${randomUUID().replaceAll("-", "")}`);
  }
  state.otherDenyOrAskNames = new Map();
  for (let [internalKey, { serverId, toolPart }] of state.tools) {
    let wireName = wireByInternal.get(internalKey);
    let filtered = uniq([
      ...[
        standardKeyById.get(serverId),
        state.servers.get(serverId)?.standardKey?.key,
        state.servers.get(serverId)?.denyKey,
      ].flatMap((keyName) => (keyName === undefined ? [] : [`${MCP_PREFIX}${keyName}__${toolPart}`])),
      ...(wireName === undefined ? [] : [wireName]),
      ...[...(state.formerKeys.get(serverId) ?? []), ...(state.formerSessionKeys.get(serverId) ?? [])].map(
        (formerKey) => `${MCP_PREFIX}${formerKey}__${toolPart}`,
      ),
    ]).filter((candidate) => candidate !== internalKey);
    if (filtered.length > 0) state.otherDenyOrAskNames.set(internalKey, filtered);
  }
}
//@ chunk-6mwt0myy.js:11960-12184 placement
/**
 * 判断并记录某服务器的旧权限键是否被拒用（有争议或被强制拒绝时记入拒用集合）。
 */
async function isLegacyKeyRefused(mcpInfo, forceContested = false, mayClaim = true) {
  let serverIdentityState = getServerIdentityState();
  if (!serverIdentityState.active) return false;
  let legacyKey = normalizeNameForMCP(mcpInfo.serverName);
  let ownerId = ownerIdOf(mcpInfo);
  let contested =
    forceContested || (await isLegacyKeyContested(serverIdentityState, legacyKey, ownerId, mayClaim));
  let refusers = serverIdentityState.refusedLegacyKeys.get(legacyKey) ?? new Set();
  serverIdentityState.refusedLegacyKeys.set(legacyKey, refusers);
  if (contested) refusers.add(ownerId);
  else refusers.delete(ownerId);
  return contested;
}
//@ chunk-6mwt0myy.js:12184-12417 placement
function isKeyHeldByOther(serverIdentityState, key, mayClaim) {
  return [...serverIdentityState.servers.values()].some(
    (server) =>
      server.legacyKey !== key &&
      !(mayClaim && server.mayRecordOwner === false) &&
      (server.standardKey?.key === key ||
        serverIdentityState.sessionKeyById.get(server.id) === key ||
        serverIdentityState.formerKeys.get(server.id)?.has(key) ||
        serverIdentityState.formerSessionKeys.get(server.id)?.has(key)),
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
async function isLegacyKeyContested(serverIdentityState, legacyKey, ownerId, mayClaim) {
  if (isKeyHeldByOther(serverIdentityState, legacyKey, mayClaim)) return true;
  let persistedOwner = serverIdentityState.unsavedLegacyKeys.has(legacyKey)
    ? undefined
    : serverIdentityState.readLegacyKeyOwner(legacyKey);
  let cachedOwner = serverIdentityState.legacyKeyOwners.get(legacyKey);
  if (persistedOwner !== undefined || cachedOwner !== undefined)
    return (persistedOwner ?? ownerId) !== ownerId || (cachedOwner ?? ownerId) !== ownerId;
  if (!mayClaim) return serverIdentityState.unsavedLegacyKeys.has(legacyKey);
  serverIdentityState.unsavedLegacyKeys.add(legacyKey);
  let claimed = await serverIdentityState.claimLegacyKeyOwner(legacyKey, ownerId);
  if (claimed === undefined) return true;
  serverIdentityState.unsavedLegacyKeys.delete(legacyKey);
  let resolvedOwner = serverIdentityState.legacyKeyOwners.get(legacyKey) ?? claimed;
  serverIdentityState.legacyKeyOwners.set(legacyKey, resolvedOwner);
  return resolvedOwner !== ownerId;
}
//@ chunk-6mwt0myy.js:12950-13294 placement
/**
 * 认领遗留键。
 */
async function claimLegacyKey(mcpInfo) {
  let serverIdentityState = getServerIdentityState();
  if (!serverIdentityState.active) return false;
  let legacyKey = normalizeNameForMCP(mcpInfo.serverName);
  if (isKeyHeldByOther(serverIdentityState, legacyKey, true)) return false;
  let ownerId = ownerIdOf(mcpInfo);
  let knownOwner = legacyKeyOwnerOf(serverIdentityState, legacyKey);
  if (knownOwner !== undefined) serverIdentityState.legacyKeyOwners.set(legacyKey, knownOwner);
  serverIdentityState.unsavedLegacyKeys.add(legacyKey);
  if ((await serverIdentityState.claimLegacyKeyOwner(legacyKey, ownerId, true)) !== ownerId) return false;
  serverIdentityState.legacyKeyOwners.set(legacyKey, ownerId);
  serverIdentityState.unsavedLegacyKeys.delete(legacyKey);
  serverIdentityState.refusedLegacyKeys.get(legacyKey)?.delete(ownerId);
  return true;
}
//@ chunk-6mwt0myy.js:13294-13498 placement
/**
 * 判断某服务器的旧键是否已被另一身份的服务器持有。
 */
function isLegacyKeyOwnedElsewhere(mcpInfo) {
  let serverIdentityState = getServerIdentityState();
  let legacyKey = normalizeNameForMCP(mcpInfo.serverName);
  let owner =
    serverIdentityState.legacyKeyOwners.get(legacyKey) ?? serverIdentityState.readLegacyKeyOwner(legacyKey);
  return (
    serverIdentityState.active &&
    (!serverIdentityState.unsavedLegacyKeys.has(legacyKey) ||
      serverIdentityState.legacyKeyOwners.has(legacyKey)) &&
    !isKeyHeldByOther(serverIdentityState, legacyKey, true) &&
    owner !== undefined &&
    owner !== ownerIdOf(mcpInfo)
  );
}
//@ chunk-6mwt0myy.js:13498-13603 placement
/**
 * 是否拥有遗留键。
 */
function ownsLegacyKey(mcpInfo) {
  let serverIdentityState = getServerIdentityState();
  let legacyKey = normalizeNameForMCP(mcpInfo.serverName);
  let ownerId = ownerIdOf(mcpInfo);
  return (
    legacyKeyOwnerOf(serverIdentityState, legacyKey) === ownerId &&
    (serverIdentityState.legacyKeyOwners.get(legacyKey) ?? ownerId) === ownerId
  );
}
//@ chunk-6mwt0myy.js:13603-13723 placement
/**
 * 判断某服务器的旧键是否尚未被本服务器认领（未保存或归属他人）。
 */
function isLegacyKeyUnclaimed(mcpInfo) {
  let serverIdentityState = getServerIdentityState();
  let legacyKey = normalizeNameForMCP(mcpInfo.serverName);
  let owner = legacyKeyOwnerOf(serverIdentityState, legacyKey);
  return (
    serverIdentityState.active &&
    (owner === undefined
      ? serverIdentityState.unsavedLegacyKeys.has(legacyKey)
      : owner !== ownerIdOf(mcpInfo))
  );
}
//@ chunk-6mwt0myy.js:13723-13831 placement
function legacyKeyOwnerOf(serverIdentityState, legacyKey) {
  return (
    (serverIdentityState.unsavedLegacyKeys.has(legacyKey)
      ? undefined
      : serverIdentityState.readLegacyKeyOwner(legacyKey)) ??
    serverIdentityState.legacyKeyOwners.get(legacyKey)
  );
}
//@ chunk-6mwt0myy.js:13831-14442 placement
/**
 * 更新服务器身份记录。
 */
function updateServerIdentity(serverIdentityState, { server, standardKey, denyKey, mayRecordOwner }) {
  let ownerId = ownerIdOf(server);
  let legacyKey = normalizeNameForMCP(server.serverName);
  let existing = serverIdentityState.servers.get(ownerId);
  let standardKey_2 = existing?.standardKey;
  let nextStandardKey = standardKey ?? standardKey_2;
  let nextDenyKey = denyKey ?? existing?.denyKey;
  let nextMayRecordOwner = mayRecordOwner ?? existing?.mayRecordOwner;
  if (
    existing === undefined ||
    existing.legacyKey !== legacyKey ||
    standardKey_2?.key !== nextStandardKey?.key ||
    standardKey_2?.pinned !== nextStandardKey?.pinned ||
    existing.denyKey !== nextDenyKey ||
    existing.mayRecordOwner !== nextMayRecordOwner
  ) {
    if (standardKey_2 !== undefined && !standardKey_2.pinned && standardKey_2.key !== nextStandardKey?.key) {
      serverIdentityState.formerKeys.set(
        ownerId,
        (serverIdentityState.formerKeys.get(ownerId) ?? new Set()).add(standardKey_2.key),
      );
      let sessionKey = serverIdentityState.sessionKeyById.get(ownerId);
      if (sessionKey !== undefined)
        serverIdentityState.formerSessionKeys.set(
          ownerId,
          (serverIdentityState.formerSessionKeys.get(ownerId) ?? new Set()).add(sessionKey),
        );
    }
    serverIdentityState.needsRebuild = true;
    serverIdentityState.servers.set(ownerId, {
      id: ownerId,
      legacyKey,
      standardKey: nextStandardKey,
      denyKey: nextDenyKey,
      mayRecordOwner: nextMayRecordOwner,
    });
  }
  return ownerId;
}
//@ chunk-6mwt0myy.js:14442-14554 placement
function rebuildIfNeeded(state) {
  if (state.needsRebuild) {
    let snapshot = {
      ...state,
    };
    try {
      rebuildWireNames(state);
      state.needsRebuild = false;
    } catch (error) {
      Object.assign(state, snapshot);
      throw error;
    }
  }
}
//@ chunk-6mwt0myy.js:14554-14627 placement
/**
 * 登记一批工具的身份，必要时标记重建线上名。
 */
function registerToolIdentities(servers) {
  let serverIdentityState = getServerIdentityState();
  if (!serverIdentityState.active) return;
  for (let server of servers) updateServerIdentity(serverIdentityState, server);
  rebuildIfNeeded(serverIdentityState);
}
//@ chunk-6mwt0myy.js:14627-14864 placement
/**
 * 登记工具到服务器身份的映射，有变化时标记需要重建线上名。
 */
function registerToolIdentities_2(tools) {
  let serverIdentityState = getServerIdentityState();
  if (!serverIdentityState.active) return;
  for (let tool of tools) {
    let serverId = updateServerIdentity(serverIdentityState, tool);
    let legacyKey = normalizeNameForMCP(tool.server.serverName);
    if (serverIdentityState.tools.get(tool.name)?.serverId !== serverId) {
      serverIdentityState.needsRebuild = true;
      serverIdentityState.tools.set(tool.name, {
        serverId,
        toolPart: tool.name.slice(`${MCP_PREFIX}${legacyKey}__`.length),
      });
    }
  }
  rebuildIfNeeded(serverIdentityState);
}
//@ chunk-6mwt0myy.js:14864-14989 placement
/**
 * 记录已发送给模型的工具线上名。
 */
function noteSentWireNames(internalKeys) {
  let { active, wireByInternal, sentWires } = getServerIdentityState();
  if (active)
    for (let internalKey of internalKeys) {
      let wireName = wireByInternal.get(internalKey);
      if (wireName !== undefined) sentWires.set(internalKey, wireName);
    }
}
//@ chunk-6mwt0myy.js:14989-15041 placement
/**
 * 内部名对应的线上名。
 */
function wireName(internalKey) {
  return getServerIdentityState().wireByInternal.get(internalKey) ?? internalKey;
}
//@ chunk-6mwt0myy.js:15041-15147 placement
/**
 * 把线上工具名换回内部名（含已退役的线上名）。
 */
function internalToolNameFor(name) {
  return (
    (name.startsWith(MCP_RETIRED)
      ? [...getServerIdentityState().retiredWireNames].find(([, retiredName]) => retiredName === name)
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
function internalKey(wireKey) {
  return getServerIdentityState().internalKeyByWireKey.get(wireKey) ?? wireKey;
}
//@ chunk-6mwt0myy.js:15295-15449 placement
function mapServerSegment(toolName, mapKey) {
  if (!toolName.startsWith(MCP_PREFIX)) return toolName;
  let sliced = toolName.slice(MCP_PREFIX.length);
  let index = sliced.indexOf("__");
  let serverKey = index === -1 ? sliced : sliced.slice(0, index);
  return `${MCP_PREFIX}${mapKey(serverKey)}${index === -1 ? "" : sliced.slice(index)}`;
}
//@ chunk-6mwt0myy.js:15449-15481 placement
/**
 * 把 mcp__ 前缀名转为内部键。
 */
function toInternalToolName(toolName) {
  return mapServerSegment(toolName, internalKey);
}
//@ chunk-6mwt0myy.js:15481-15814 placement
/**
 * 规则是否引用了遗留键。
 */
function matchLegacyRule(ruleName, behavior) {
  let { wireKeyByInternalKey, refusedLegacyKeys } = getServerIdentityState();
  let match;
  for (let [legacyKey, wireKey] of wireKeyByInternalKey) {
    let prefix = `${MCP_PREFIX}${legacyKey}`;
    if (
      (ruleName === prefix || ruleName.startsWith(`${prefix}__`) || ruleName.startsWith(`${prefix}(`)) &&
      legacyKey.length > (match?.legacy.length ?? -1)
    )
      match = {
        legacy: legacyKey,
        wire: wireKey,
      };
  }
  return match === undefined || (behavior === "allow" && (refusedLegacyKeys.get(match.legacy)?.size ?? 0) > 0)
    ? ruleName
    : `${MCP_PREFIX}${match.wire}${ruleName.slice(MCP_PREFIX.length + match.legacy.length)}`;
}
//@ chunk-6mwt0myy.js:15814-15872 placement
/**
 * 取某服务器在拒绝/询问名称表里的别名。
 */
function denyOrAskNamesFor(toolName) {
  return getServerIdentityState().otherDenyOrAskNames.get(toolName) ?? EMPTY_NAME_LIST;
}
//@ chunk-6mwt0myy.js:15872-15980 placement
/**
 * 把权限规则中的服务器名规范化（去掉身份后缀），未变化时返回 undefined。
 */
function ruleWithNormalizedServer(ruleName) {
  if (!RETIRED_KEY_RE.test(ruleName) || !getServerIdentityState().active) return;
  let normalized = mapServerSegment(
    ruleName,
    (serverKey) => TRAILING_SUFFIX_RE.exec(serverKey)?.[1] ?? serverKey,
  );
  return normalized === ruleName ? undefined : normalized;
}
//@ chunk-6mwt0myy.js:15980-16242 placement
/**
 * 为权限规则生成按标准键表示的工具行，供规则匹配使用。
 */
function standardKeyRuleRow(ruleName, toolNameForPermissionCheck) {
  let normalized = ruleWithNormalizedServer(ruleName);
  if (normalized === undefined) return;
  let { tools, servers, sessionKeyById } = getServerIdentityState();
  let toolRecord = tools.get(toolNameForPermissionCheck);
  let key = toolRecord === undefined ? undefined : servers.get(toolRecord.serverId)?.standardKey?.key;
  return toolRecord === undefined || key === undefined || sessionKeyById.get(toolRecord.serverId) !== key
    ? undefined
    : {
        rule: normalized,
        row: `${MCP_PREFIX}${key}__${toolRecord.toolPart}`,
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
  let { name, permission_policy: permissionPolicy } = tool;
  if (permissionPolicy === undefined)
    return {
      policy: {
        name,
      },
      rewritten: false,
    };
  return isToolPolicyValue(permissionPolicy)
    ? {
        policy: {
          name,
          permission_policy: permissionPolicy,
        },
        rewritten: false,
      }
    : {
        policy: {
          name,
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
      (tool, index) =>
        tool.name === tools_2[index]?.name && tool.permission_policy === tools_2[index]?.permission_policy,
    )
  );
}
//@ chunk-6mwt0myy.js:16872-17376 placement
/**
 * 解析服务器的附加设置（timeout、disableAutoBackground、tools、connectorId）。
 */
function parseMcpServerSettings(value) {
  if (!isPlainObject(value))
    return {
      settings: {},
      ignored: [],
    };
  let { timeout, disableAutoBackground, tools, connectorId } = value;
  let timeout_2 = positiveIntOrUndefined(timeout);
  let ignored = [];
  if (timeout !== undefined && timeout_2 === undefined) ignored.push("timeout");
  if (disableAutoBackground !== undefined && typeof disableAutoBackground !== "boolean")
    ignored.push("disableAutoBackground");
  let toolPolicies = parseToolPolicies(tools);
  if (inspectToolsList(value) !== undefined) ignored.push("tools");
  let hasConnectorId = typeof connectorId === "string" && connectorId !== "";
  if (connectorId !== undefined && !hasConnectorId) ignored.push("connectorId");
  return {
    settings: {
      ...(timeout_2 !== undefined && {
        timeout: timeout_2,
      }),
      ...(disableAutoBackground === true && {
        disableAutoBackground,
      }),
      ...(toolPolicies !== undefined && {
        tools: toolPolicies,
      }),
      ...(hasConnectorId && {
        connectorId,
      }),
    },
    ignored,
  };
}
//@ chunk-6mwt0myy.js:17376-17644 placement
/**
 * 检查 tools[] 条目（丢弃、改写数量）。
 */
function inspectToolsList(value) {
  let tools = isPlainObject(value) ? value.tools : undefined;
  if (tools === undefined) return;
  if (!Array.isArray(tools))
    return {
      kind: "not_a_list",
    };
  let dropped = 0;
  let rewritten = 0;
  for (let tool of tools) {
    let toolPolicyEntry = parseToolPolicyEntry(tool);
    if (toolPolicyEntry === undefined) dropped++;
    else if (toolPolicyEntry.rewritten) rewritten++;
  }
  return dropped + rewritten > 0
    ? {
        kind: "entries",
        dropped,
        rewritten,
        kept: tools.length - dropped,
      }
    : undefined;
}
//@ chunk-6mwt0myy.js:17644-18029 placement
/**
 * 描述 tools[] 的问题。
 */
function describeToolsListIssues(issue) {
  if (issue.kind === "not_a_list") return "tools[] is not a list; no per-tool policy taken";
  let parts = [];
  if (issue.dropped > 0)
    parts.push(`dropped ${issue.dropped} malformed tools[] ${issue.dropped === 1 ? "entry" : "entries"}`);
  if (issue.rewritten > 0)
    parts.push(
      `read ${issue.rewritten} tools[] ${issue.rewritten === 1 ? "entry" : "entries"} with an invalid permission_policy as always_ask`,
    );
  return `${parts.join(", ")}; kept ${issue.kept}`;
}
//@ chunk-6mwt0myy.js:18029-18150 placement
function parseToolPolicies(tools) {
  if (!Array.isArray(tools)) return;
  let policies = [];
  for (let tool of tools) {
    let toolPolicyEntry = parseToolPolicyEntry(tool);
    if (toolPolicyEntry !== undefined) policies.push(toolPolicyEntry.policy);
  }
  return policies;
}
//@ chunk-6mwt0myy.js:21160-21199 placement
function mcpRuleMatchesToolName(ruleName, toolNameForPermissionCheck) {
  return compileMcpRuleMatcher(ruleName)(mcpInfoFromString(toolNameForPermissionCheck));
}
//@ chunk-6mwt0myy.js:21199-21467 placement
/**
 * compileMcpRuleMatcher：把 mcp__server、mcp__server__*、mcp__server__<通配> 规则编译成对 {serverName, toolName} 的谓词。
 */
function compileMcpRuleMatcher(ruleName) {
  let parsed = mcpInfoFromString(ruleName);
  if (parsed === null) return () => false;
  let matchesAllTools = parsed.toolName === undefined || parsed.toolName === "*";
  let toolName = parsed.toolName !== undefined && hasWildcard(parsed.toolName) ? parsed.toolName : undefined;
  let wildcardMatcher;
  return (candidate) =>
    candidate !== null &&
    parsed.serverName === candidate.serverName &&
    (matchesAllTools ||
      (candidate.toolName !== undefined &&
        toolName !== undefined &&
        (wildcardMatcher ??= wildcardRuleRegex(toolName))(candidate.toolName)));
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
  let prefixes = [];
  if (!tool.name.startsWith(MCP_TOOL_PREFIX)) return prefixes;
  for (
    let index = tool.name.indexOf("__", MCP_TOOL_PREFIX.length);
    index !== -1;
    index = tool.name.indexOf("__", index + 1)
  )
    prefixes.push(tool.name.slice(0, index));
  return prefixes;
}
//@ chunk-6mwt0myy.js:21719-21897 placement
/**
 * parseMcpToolNameCandidates：工具名在 __ 处的各种可能切分（服务器名本身含 __ 时）。
 */
function parseMcpToolNameCandidates(ruleName) {
  let parsed = mcpInfoFromString(ruleName);
  if (parsed === null || parsed.toolName === undefined) return parsed === null ? [] : [parsed];
  return getMcpServerRulePrefixes({
    name: ruleName,
  }).map((prefix) => ({
    serverName: prefix.slice(MCP_TOOL_PREFIX.length),
    toolName: ruleName.slice(prefix.length + 2),
  }));
}
//@ chunk-6mwt0myy.js:21897-22019 placement = getToolNameForPermissionCheck (1)
function ruleWithinServerPrefix(ruleName, tool) {
  return (
    tool.mcpInfo
      ? [`${MCP_TOOL_PREFIX}${normalizeNameForMCP(tool.mcpInfo.serverName)}`]
      : getMcpServerRulePrefixes(tool)
  ).every((prefix) => ruleName === prefix || ruleName.startsWith(`${prefix}__`));
}
//@ chunk-6mwt0myy.js:22019-22067 placement
/**
 * 规则是否匹配 MCP 工具。
 */
function mcpRuleMatchesTool(ruleName, tool) {
  return (
    mcpRuleMatchesToolName(ruleName, getToolNameForPermissionCheck(tool)) &&
    ruleWithinServerPrefix(ruleName, tool)
  );
}
//@ chunk-6mwt0myy.js:22067-22198 placement
function mcpRuleMatchesToolAlias(ruleName, tool) {
  if (!tool.mcpInfo || !isServerIdentityActive()) return false;
  let standardRow = standardKeyRuleRow(ruleName, getToolNameForPermissionCheck(tool));
  return (
    getMcpToolAliasNames(tool).includes(ruleName) ||
    (standardRow !== undefined && standardRow.rule === standardRow.row) ||
    mcpRuleMatchesToolAny(ruleName, tool)
  );
}
//@ chunk-6mwt0myy.js:22198-22383 placement
/**
 * mcpRuleMatchesToolAny：规则通过工具名、别名、服务器前缀任一方式匹配该工具。
 */
function mcpRuleMatchesToolAny(ruleName, tool) {
  let standardRow = tool.mcpInfo
    ? standardKeyRuleRow(ruleName, getToolNameForPermissionCheck(tool))
    : undefined;
  return (
    (standardRow !== undefined &&
      mcpRuleMatchesToolAny(standardRow.rule, {
        name: standardRow.row,
      })) ||
    mcpRuleMatchesToolName(ruleName, getToolNameForPermissionCheck(tool)) ||
    (ruleName.startsWith(MCP_TOOL_PREFIX) && getMcpServerRulePrefixes(tool).includes(ruleName)) ||
    getMcpToolAliasNames(tool).some((name) =>
      mcpRuleMatchesToolAny(ruleName, {
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
