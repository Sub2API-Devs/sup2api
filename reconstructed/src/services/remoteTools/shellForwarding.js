/**
 * services/remoteTools/shellForwarding.ts
 *
 * 2.1.316 新增：shell 转发
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-rwmkxy9d.js (12)
 * attribution: placement 12
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { E, u, U, o, M, T } from "../../../vendor/zod/v4/classic/schemas.js";
import { SAFE_ID_PATTERN } from "../../remote/tools/protocolConstants.js";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { POWERSHELL_TOOL_NAME } from "../../tools/PowerShellTool/toolName.js";

//@ chunk-rwmkxy9d.js:347-364 placement
var d = 2147483647;
/**
 * 目录同步答复的协议结构：版本、帧（一侧、世代、树哈希、实例与序号）、结果种类与原因。
 */
//@ chunk-rwmkxy9d.js:364-936 placement
var SYNC_ANSWER_VERSION = 2,
  MAX_REASON_LENGTH = 64,
  TREE_HASH_PATTERN = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/,
  GENERATION_SCHEMA = DoctorLazy(() => E().int().min(0).max(d)),
  SYNC_FRAME_SCHEMA = DoctorLazy(() =>
    u({
      side: U(["device", "cloud"]),
      generation: GENERATION_SCHEMA(),
      tree: o().regex(TREE_HASH_PATTERN).nullable(),
      appliedGeneration: GENERATION_SCHEMA(),
      mayHaveUnuploadedChanges: M(),
      shipping: GENERATION_SCHEMA().nullable(),
      appliesOtherSide: M(),
      instanceId: o().regex(SAFE_ID_PATTERN),
      sequence: E().int().min(0).max(d),
    }),
  ),
  SYNC_OUTCOME_KINDS = ["shipped", "shipping", "unchanged", "deferred", "kept_here", "failed", "not_running"],
  reasonSchema = (e) =>
    o()
      .max(e)
      .regex(/^[a-z0-9_]+$/),
  SYNC_REASON_SCHEMA = DoctorLazy(() => reasonSchema(MAX_REASON_LENGTH)),
  SYNC_ANSWER_SCHEMA = DoctorLazy(() =>
    u({
      v: T(SYNC_ANSWER_VERSION),
      frame: SYNC_FRAME_SCHEMA(),
      outcome: u({ kind: U(SYNC_OUTCOME_KINDS), reason: SYNC_REASON_SCHEMA().optional() }),
      ask_id: o().regex(SAFE_ID_PATTERN).optional(),
    }),
  );
/**
 * 解析设备端的同步答复帧，非设备侧或格式不符时返回 null。
 */
//@ chunk-rwmkxy9d.js:936-1184 placement
function parseSyncAnswer(e) {
  let safeParse = SYNC_ANSWER_SCHEMA().safeParse(e);
  if (!safeParse.success) return null;
  let { v: t, frame: frame, outcome: outcome, ask_id: ask_id } = safeParse.data;
  if (frame.side !== "device") return null;
  return {
    v: t,
    frame: frame,
    outcome: { kind: outcome.kind, ...(outcome.reason !== void 0 && { reason: outcome.reason }) },
    ...(ask_id !== void 0 && { askId: ask_id }),
  };
}
/**
 * 把同步答复转为线上格式（原因不合法时省略）。
 */
//@ chunk-rwmkxy9d.js:1184-1364 placement
function toWireSyncAnswer(e) {
  let safeParse = SYNC_REASON_SCHEMA().safeParse(e.outcome.reason);
  return {
    v: e.v,
    frame: e.frame,
    outcome: { kind: e.outcome.kind, ...(safeParse.success && { reason: safeParse.data }) },
    ...(e.askId !== void 0 && { ask_id: e.askId }),
  };
}
//@ chunk-rwmkxy9d.js:1364-1405 placement
var g = { frame: null, heardAt: null, stale: !0 };
/**
 * 按宿主（来源加名字）和服务世代保存值的存储，世代变化后旧值失效。
 */
//@ chunk-rwmkxy9d.js:1405-1672 placement
function createPerHostEpochStore() {
  let e = new Map(),
    n = (r) => `${r.source}:${r.name}`,
    t = (r) => {
      let a = e.get(n(r));
      return a !== void 0 && a.servingEpoch === r.description?.epoch ? a.value : void 0;
    };
  return {
    of: t,
    file(r, a) {
      let i = r.description?.epoch;
      if (i !== void 0) e.set(n(r), { servingEpoch: i, value: a(t(r)) });
    },
  };
}
/**
 * 记录各宿主最新的对端同步帧（按实例与序号取新），支持整体标记为过期。
 */
//@ chunk-rwmkxy9d.js:1672-1956 placement
function createPeerFrameStore() {
  let e = createPerHostEpochStore(),
    n = 0;
  return {
    peer(t) {
      let of = e.of(t);
      return of === void 0 ? g : { frame: of.frame, heardAt: of.heardAt, stale: of.era < n };
    },
    heard(t, r, a) {
      e.file(t, (i) =>
        i === void 0 || i.frame.instanceId !== r.instanceId || r.sequence > i.frame.sequence
          ? { frame: r, heardAt: a, era: n }
          : i,
      );
    },
    invalidateAll() {
      n += 1;
    },
  };
}
//@ chunk-rwmkxy9d.js:1956-2021 placement
var _ = /^(bash|powershell|bash\+powershell)(?::(core|desktop))?$/;
/**
 * 生成 shell 能力标签（bash、powershell 及其版本）。
 */
//@ chunk-rwmkxy9d.js:2021-2199 placement
function shellCapabilityTag(e) {
  let n = [...(e.bash ? ["bash"] : []), ...(e.powershell ? ["powershell"] : [])];
  if (n.length === 0) return;
  let t = e.powershell?.edition;
  return `${n.join("+")}${t === void 0 ? "" : `:${t}`}`;
}
/**
 * 解析 shell 能力标签。
 */
//@ chunk-rwmkxy9d.js:2199-2408 placement
function parseShellCapabilityTag(e) {
  let n = e === void 0 ? null : _.exec(e);
  if (n === null) return;
  let t = n[2];
  if (n[1] === "bash") return t === void 0 ? { bash: !0, powershell: void 0 } : void 0;
  return { bash: n[1] === "bash+powershell", powershell: { edition: t } };
}
//@ chunk-rwmkxy9d.js:2408-2507 placement
function UOs(e, n) {
  return {
    bash: e.includes(BASH_TOOL_NAME),
    powershell: e.includes(POWERSHELL_TOOL_NAME) ? { edition: n ?? void 0 } : void 0,
  };
}
//@ chunk-rwmkxy9d.js:2507-2523 placement
var B7 = 86400000;

export {
  shellCapabilityTag,
  UOs,
  B7,
  toWireSyncAnswer,
  SYNC_ANSWER_VERSION,
  createPerHostEpochStore,
  createPeerFrameStore,
  parseSyncAnswer,
  parseShellCapabilityTag,
};
