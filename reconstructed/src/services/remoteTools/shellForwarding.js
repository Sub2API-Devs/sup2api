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
import { E, u, _enum, string, M, literal } from "../../../vendor/zod/v4/classic/schemas.js";
import { SAFE_ID_PATTERN } from "../../remote/tools/protocolConstants.js";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { POWERSHELL_TOOL_NAME } from "../../tools/PowerShellTool/toolName.js";

//@ chunk-rwmkxy9d.js:347-364 placement
/**
 * 目录同步协议里世代与序号的上限。
 */
var MAX_TREE_SEQUENCE = 2147483647;
//@ chunk-rwmkxy9d.js:364-936 placement
/**
 * 目录同步答复的协议结构：版本、帧（一侧、世代、树哈希、实例与序号）、结果种类与原因。
 */
var SYNC_ANSWER_VERSION = 2;
var MAX_REASON_LENGTH = 64;
var TREE_HASH_PATTERN = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/;
var GENERATION_SCHEMA = DoctorLazy(() => E().int().min(0).max(MAX_TREE_SEQUENCE));
var SYNC_FRAME_SCHEMA = DoctorLazy(() =>
  u({
    side: _enum(["device", "cloud"]),
    generation: GENERATION_SCHEMA(),
    tree: string().regex(TREE_HASH_PATTERN).nullable(),
    appliedGeneration: GENERATION_SCHEMA(),
    mayHaveUnuploadedChanges: M(),
    shipping: GENERATION_SCHEMA().nullable(),
    appliesOtherSide: M(),
    instanceId: string().regex(SAFE_ID_PATTERN),
    sequence: E().int().min(0).max(MAX_TREE_SEQUENCE),
  }),
);
var SYNC_OUTCOME_KINDS = [
  "shipped",
  "shipping",
  "unchanged",
  "deferred",
  "kept_here",
  "failed",
  "not_running",
];
var reasonSchema = (e) =>
  string()
    .max(e)
    .regex(/^[a-z0-9_]+$/);
var SYNC_REASON_SCHEMA = DoctorLazy(() => reasonSchema(MAX_REASON_LENGTH));
var SYNC_ANSWER_SCHEMA = DoctorLazy(() =>
  u({
    v: literal(SYNC_ANSWER_VERSION),
    frame: SYNC_FRAME_SCHEMA(),
    outcome: u({
      kind: _enum(SYNC_OUTCOME_KINDS),
      reason: SYNC_REASON_SCHEMA().optional(),
    }),
    ask_id: string().regex(SAFE_ID_PATTERN).optional(),
  }),
);
//@ chunk-rwmkxy9d.js:936-1184 placement
/**
 * 解析设备端的同步答复帧，非设备侧或格式不符时返回 null。
 */
function parseSyncAnswer(e) {
  let n = SYNC_ANSWER_SCHEMA().safeParse(e);
  if (!n.success) return null;
  let { v: t, frame, outcome, ask_id: askId } = n.data;
  if (frame.side !== "device") return null;
  return {
    v: t,
    frame,
    outcome: {
      kind: outcome.kind,
      ...(outcome.reason !== undefined && {
        reason: outcome.reason,
      }),
    },
    ...(askId !== undefined && {
      askId,
    }),
  };
}
//@ chunk-rwmkxy9d.js:1184-1364 placement
/**
 * 把同步答复转为线上格式（原因不合法时省略）。
 */
function toWireSyncAnswer(e) {
  let n = SYNC_REASON_SCHEMA().safeParse(e.outcome.reason);
  return {
    v: e.v,
    frame: e.frame,
    outcome: {
      kind: e.outcome.kind,
      ...(n.success && {
        reason: n.data,
      }),
    },
    ...(e.askId !== undefined && {
      ask_id: e.askId,
    }),
  };
}
//@ chunk-rwmkxy9d.js:1364-1405 placement
/**
 * 尚未收到对端同步帧时的空状态（帧与时间都为空、标记过期）。
 */
var EMPTY_PEER_FRAME = {
  frame: null,
  heardAt: null,
  stale: true,
};
//@ chunk-rwmkxy9d.js:1405-1672 placement
/**
 * 按宿主（来源加名字）和服务世代保存值的存储，世代变化后旧值失效。
 */
function createPerHostEpochStore() {
  let e = new Map();
  let n = (r) => `${r.source}:${r.name}`;
  let t = (r) => {
    let a = e.get(n(r));
    return a !== undefined && a.servingEpoch === r.description?.epoch ? a.value : undefined;
  };
  return {
    of: t,
    file(r, a) {
      let epoch = r.description?.epoch;
      if (epoch !== undefined)
        e.set(n(r), {
          servingEpoch: epoch,
          value: a(t(r)),
        });
    },
  };
}
//@ chunk-rwmkxy9d.js:1672-1956 placement
/**
 * 记录各宿主最新的对端同步帧（按实例与序号取新），支持整体标记为过期。
 */
function createPeerFrameStore() {
  let perHostEpochStore = createPerHostEpochStore();
  let n = 0;
  return {
    peer(t) {
      let r = perHostEpochStore.of(t);
      return r === undefined
        ? EMPTY_PEER_FRAME
        : {
            frame: r.frame,
            heardAt: r.heardAt,
            stale: r.era < n,
          };
    },
    heard(t, r, heardAt) {
      perHostEpochStore.file(t, (i) =>
        i === undefined || i.frame.instanceId !== r.instanceId || r.sequence > i.frame.sequence
          ? {
              frame: r,
              heardAt,
              era: n,
            }
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
//@ chunk-rwmkxy9d.js:2021-2199 placement
/**
 * 生成 shell 能力标签（bash、powershell 及其版本）。
 */
function shellCapabilityTag(e) {
  let n = [...(e.bash ? ["bash"] : []), ...(e.powershell ? ["powershell"] : [])];
  if (n.length === 0) return;
  let edition = e.powershell?.edition;
  return `${n.join("+")}${edition === undefined ? "" : `:${edition}`}`;
}
//@ chunk-rwmkxy9d.js:2199-2408 placement
/**
 * 解析 shell 能力标签。
 */
function parseShellCapabilityTag(shell) {
  let n = shell === undefined ? null : _.exec(shell);
  if (n === null) return;
  let t = n[2];
  if (n[1] === "bash")
    return t === undefined
      ? {
          bash: true,
          powershell: undefined,
        }
      : undefined;
  return {
    bash: n[1] === "bash+powershell",
    powershell: {
      edition: t,
    },
  };
}
//@ chunk-rwmkxy9d.js:2408-2507 placement
/**
 * 由工具表生成 shell 能力标签（bash、PowerShell 及版本）。
 */
function shellCapabilityFor(e, resolvedPowerShellEdition) {
  return {
    bash: e.includes(BASH_TOOL_NAME),
    powershell: e.includes(POWERSHELL_TOOL_NAME)
      ? {
          edition: resolvedPowerShellEdition ?? undefined,
        }
      : undefined,
  };
}
//@ chunk-rwmkxy9d.js:2507-2523 placement
/**
 * 同步答案的缓存有效期。
 */
var SYNC_ANSWER_TTL_MS = 86400000;
export {
  shellCapabilityTag,
  shellCapabilityFor,
  SYNC_ANSWER_TTL_MS,
  toWireSyncAnswer,
  SYNC_ANSWER_VERSION,
  createPerHostEpochStore,
  createPeerFrameStore,
  parseSyncAnswer,
  parseShellCapabilityTag,
};
