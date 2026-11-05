/**
 * services/remoteTools/shellForwarding.ts
 *
 * 2.1.316 新增：shell 转发
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-a146j0mv.js (12)
 * attribution: placement 12
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  numberSchema,
  objectSchema,
  _enum,
  stringSchema,
  booleanSchema,
  literal,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { SAFE_ID_PATTERN } from "../../remote/tools/protocolConstants.js";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { POWERSHELL_TOOL_NAME } from "../../tools/PowerShellTool/toolName.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-a146j0mv.js:380-397 placement
/**
 * 目录同步协议里世代与序号的上限。
 */
var MAX_TREE_SEQUENCE = 2147483647;
//@ chunk-a146j0mv.js:397-969 placement
/**
 * 目录同步答复的协议结构：版本、帧（一侧、世代、树哈希、实例与序号）、结果种类与原因。
 */
var SYNC_ANSWER_VERSION; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var MAX_REASON_LENGTH;
var TREE_HASH_PATTERN;
var GENERATION_SCHEMA;
var SYNC_FRAME_SCHEMA;
var SYNC_OUTCOME_KINDS;
var reasonSchema;
var SYNC_REASON_SCHEMA;
var SYNC_ANSWER_SCHEMA;
deferInit("chunk-a146j0mv.js:397", () => {
  SYNC_ANSWER_VERSION = 2;
  MAX_REASON_LENGTH = 64;
  TREE_HASH_PATTERN = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/;
  GENERATION_SCHEMA = DoctorLazy(() => numberSchema().int().min(0).max(MAX_TREE_SEQUENCE));
  SYNC_FRAME_SCHEMA = DoctorLazy(() =>
    objectSchema({
      side: _enum(["device", "cloud"]),
      generation: GENERATION_SCHEMA(),
      tree: stringSchema().regex(TREE_HASH_PATTERN).nullable(),
      appliedGeneration: GENERATION_SCHEMA(),
      mayHaveUnuploadedChanges: booleanSchema(),
      shipping: GENERATION_SCHEMA().nullable(),
      appliesOtherSide: booleanSchema(),
      instanceId: stringSchema().regex(SAFE_ID_PATTERN),
      sequence: numberSchema().int().min(0).max(MAX_TREE_SEQUENCE),
    }),
  );
  SYNC_OUTCOME_KINDS = ["shipped", "shipping", "unchanged", "deferred", "kept_here", "failed", "not_running"];
  reasonSchema = (maxLength) =>
    stringSchema()
      .max(maxLength)
      .regex(/^[a-z0-9_]+$/);
  SYNC_REASON_SCHEMA = DoctorLazy(() => reasonSchema(MAX_REASON_LENGTH));
  SYNC_ANSWER_SCHEMA = DoctorLazy(() =>
    objectSchema({
      v: literal(SYNC_ANSWER_VERSION),
      frame: SYNC_FRAME_SCHEMA(),
      outcome: objectSchema({
        kind: _enum(SYNC_OUTCOME_KINDS),
        reason: SYNC_REASON_SCHEMA().optional(),
      }),
      ask_id: stringSchema().regex(SAFE_ID_PATTERN).optional(),
    }),
  );
});
//@ chunk-a146j0mv.js:969-1217 placement
/**
 * 解析设备端的同步答复帧，非设备侧或格式不符时返回 null。
 */
function parseSyncAnswer(value) {
  let parsed = SYNC_ANSWER_SCHEMA().safeParse(value);
  if (!parsed.success) return null;
  let { v: version, frame, outcome, ask_id: askId } = parsed.data;
  if (frame.side !== "device") return null;
  return {
    v: version,
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
//@ chunk-a146j0mv.js:1217-1397 placement
/**
 * 把同步答复转为线上格式（原因不合法时省略）。
 */
function toWireSyncAnswer(answer) {
  let reason = SYNC_REASON_SCHEMA().safeParse(answer.outcome.reason);
  return {
    v: answer.v,
    frame: answer.frame,
    outcome: {
      kind: answer.outcome.kind,
      ...(reason.success && {
        reason: reason.data,
      }),
    },
    ...(answer.askId !== undefined && {
      ask_id: answer.askId,
    }),
  };
}
//@ chunk-a146j0mv.js:1397-1438 placement
/**
 * 尚未收到对端同步帧时的空状态（帧与时间都为空、标记过期）。
 */
var EMPTY_PEER_FRAME = {
  frame: null,
  heardAt: null,
  stale: true,
};
//@ chunk-a146j0mv.js:1438-1705 placement
/**
 * 按宿主（来源加名字）和服务世代保存值的存储，世代变化后旧值失效。
 */
function createPerHostEpochStore() {
  let byHost = new Map();
  let keyOf = (host) => `${host.source}:${host.name}`;
  let read = (host) => {
    let entry = byHost.get(keyOf(host));
    return entry !== undefined && entry.servingEpoch === host.description?.epoch ? entry.value : undefined;
  };
  return {
    of: read,
    file(host, next) {
      let epoch = host.description?.epoch;
      if (epoch !== undefined)
        byHost.set(keyOf(host), {
          servingEpoch: epoch,
          value: next(read(host)),
        });
    },
  };
}
//@ chunk-a146j0mv.js:1705-1989 placement
/**
 * 记录各宿主最新的对端同步帧（按实例与序号取新），支持整体标记为过期。
 */
function createPeerFrameStore() {
  let perHostEpochStore = createPerHostEpochStore();
  let era = 0;
  return {
    peer(host) {
      let entry = perHostEpochStore.of(host);
      return entry === undefined
        ? EMPTY_PEER_FRAME
        : {
            frame: entry.frame,
            heardAt: entry.heardAt,
            stale: entry.era < era,
          };
    },
    heard(host, frame, heardAt) {
      perHostEpochStore.file(host, (existing) =>
        existing === undefined ||
        existing.frame.instanceId !== frame.instanceId ||
        frame.sequence > existing.frame.sequence
          ? {
              frame,
              heardAt,
              era,
            }
          : existing,
      );
    },
    invalidateAll() {
      era += 1;
    },
  };
}
//@ chunk-a146j0mv.js:1989-2054 placement
var _ = /^(bash|powershell|bash\+powershell)(?::(core|desktop))?$/;
//@ chunk-a146j0mv.js:2054-2232 placement
/**
 * 生成 shell 能力标签（bash、powershell 及其版本）。
 */
function shellCapabilityTag(shells) {
  let kinds = [...(shells.bash ? ["bash"] : []), ...(shells.powershell ? ["powershell"] : [])];
  if (kinds.length === 0) return;
  let edition = shells.powershell?.edition;
  return `${kinds.join("+")}${edition === undefined ? "" : `:${edition}`}`;
}
//@ chunk-a146j0mv.js:2232-2441 placement
/**
 * 解析 shell 能力标签。
 */
function parseShellCapabilityTag(shell) {
  let match = shell === undefined ? null : _.exec(shell);
  if (match === null) return;
  let edition = match[2];
  if (match[1] === "bash")
    return edition === undefined
      ? {
          bash: true,
          powershell: undefined,
        }
      : undefined;
  return {
    bash: match[1] === "bash+powershell",
    powershell: {
      edition,
    },
  };
}
//@ chunk-a146j0mv.js:2441-2540 placement
/**
 * 由工具表生成 shell 能力标签（bash、PowerShell 及版本）。
 */
function shellCapabilityFor(toolNames, resolvedPowerShellEdition) {
  return {
    bash: toolNames.includes(BASH_TOOL_NAME),
    powershell: toolNames.includes(POWERSHELL_TOOL_NAME)
      ? {
          edition: resolvedPowerShellEdition ?? undefined,
        }
      : undefined,
  };
}
//@ chunk-a146j0mv.js:2540-2557 placement
/**
 * 同步答案的缓存有效期。
 */
var SYNC_ANSWER_TTL_MS = 86400000;
export {
  SYNC_ANSWER_TTL_MS,
  parseShellCapabilityTag,
  createPerHostEpochStore,
  createPeerFrameStore,
  parseSyncAnswer,
  shellCapabilityTag,
  shellCapabilityFor,
  toWireSyncAnswer,
  SYNC_ANSWER_VERSION,
};
