/**
 * cli/remoteIO/orphanAgentRestore.ts
 *
 * 2.1.316 新增。云会话恢复时找回孤儿后台代理并提示中断任务。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-z4g2ta8k.js (9)
 * attribution: placement 9
 */
import { getTaskOutputData } from "../../tools/TaskOutputTool/TaskOutputTool.js";
import { SENDMESSAGE } from "../../tools/SendMessageTool/constants.js";
import { escapeXml_2 as escapeXml } from "../../utils/confusables.js";
import { mainAgentId } from "../../bootstrap/state.js";
import { formatTaskNotification } from "../../utils/xmlTags.js";
import { rememberResumableAgents, rememberStoppedAgents } from "../../tools/AgentTool/agentLaunch.js";
import { isTurnHandoffResumeEnabled } from "./turnHandoff.js";
import { isPlainObject } from "../../utils/isPlainObject.js";
import { normalizeAgentIdOrNull } from "../../utils/agentId.js";
import { logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { restoreAgentSidecarFromStream, readAgentMetadata } from "../../utils/sessionStorage.js";
import { validateAgentMetadata, describeStorageError } from "../../utils/agentMetadata.js";
import { logForDebugging } from "../../utils/debug.js";

//@ chunk-z4g2ta8k.js:5081-6451 placement
function orphanAgentRestoreNotice(e, n, r, s) {
  let mapped = e.filter((O) => s?.has(O.task_id)).map((O) => O.task_id);
  let mapped_2 = e
    .filter((O) => !s?.has(O.task_id) && (getTaskOutputData(O) || r?.has(O.task_id)))
    .map((O) => O.task_id);
  let S = mapped_2.some((O) => r?.has(O))
    ? ", as the agent type it ran as (if that type is not available right now the resume is refused: try it again, or start the agent again)"
    : ", as a general-purpose agent with the same tools if its saved settings did not survive the restart";
  let k = "Every other stopped task listed here is lost: do not send a message to its id.";
  let P =
    mapped_2.length > 0 && n(SENDMESSAGE)
      ? `Only these stopped agents can be resumed: ${mapped_2.join(", ")}. To resume one, send a message to its agent id (agent names no longer resolve after a restart) with the ${SENDMESSAGE} tool instead of re-creating it: it continues from its saved transcript${S}. If no transcript is found the resume fails; re-create the agent then. Every other stopped task listed here is lost: do not send a message to its id.`
      : "";
  return mapped.length === 0
    ? P
    : `These stopped agents are being resumed automatically from their saved transcripts: ${mapped.join(", ")}. Each goes on where it stopped and reports back to you in a notification when it is done, so you need not launch it again.${n(SENDMESSAGE) ? ` If one does not report back, send a message to its agent id with the ${SENDMESSAGE} tool to resume it.` : ""} ${P || "Every other stopped task listed here is lost: do not send a message to its id."}`;
}
//@ chunk-z4g2ta8k.js:6451-6923 placement
/**
 * 从任务列表中挑出不在已有列表里的任务，按 task_id 去重并规范化字段（类型、描述、状态、输出文件）。
 */
function collectOrphanTasks(e, n) {
  let r = new Map();
  for (let s of e) {
    if (
      typeof s?.task_id !== "string" ||
      !s.task_id ||
      r.has(s.task_id) ||
      n.some((h) => h.task_id === s.task_id)
    )
      continue;
    r.set(s.task_id, {
      task_id: s.task_id,
      task_type: typeof s.task_type === "string" ? s.task_type : "",
      description: typeof s.description === "string" ? s.description : "",
      status: (typeof s.status === "string" && s.status) || "unknown",
      ...(typeof s.output_file === "string" &&
        s.output_file && {
          output_file: s.output_file,
        }),
    });
  }
  return Array.from(r.values());
}
//@ chunk-z4g2ta8k.js:6923-7300 placement
/**
 * 把被中断的任务归类为 agent / monitor / shell：本地代理与工作流算 agent；监控类任务由代理拥有时算 agent，环境或观察者所有的忽略；纯 bash 只在允许时算 shell。
 */
function interruptedTaskKind(e, includeShells) {
  switch (e.task_type) {
    case "local_agent":
    case "local_workflow":
      return "agent";
    case "monitor_mcp":
    case "monitor_ws":
    case "local_bash":
      if (e.ambient === true || e.observer_owned === true) return;
      if (typeof e.owner_agent_id === "string" && e.owner_agent_id !== "") return "agent";
      if (e.task_type !== "local_bash" || e.shell_kind === "monitor") return "monitor";
      return includeShells ? "shell" : undefined;
    default:
      return;
  }
}
//@ chunk-z4g2ta8k.js:7300-9091 placement
function describeInterruptedTasks(
  e,
  {
    interruptionKind,
    hasQueuedMainThreadCommand,
    deferredResumePending,
    rescueSuppressed,
    enabled,
    includeShells,
    hasTool,
    alsoResumable,
    autoResumed,
    lostTimers,
  },
) {
  let x = {
    agent: 0,
    monitor: 0,
    shell: 0,
  };
  let filtered = e.filter((j) => {
    let ae = interruptedTaskKind(j, includeShells);
    if (ae === undefined || autoResumed?.has(j.task_id)) return false;
    x[ae]++;
    return true;
  });
  let filtered_2 = e.filter((j) => autoResumed?.has(j.task_id));
  if (
    !enabled ||
    (filtered.length === 0 && lostTimers.length === 0 && filtered_2.length === 0) ||
    interruptionKind !== "none" ||
    (filtered_2.length === 0 && (hasQueuedMainThreadCommand || deferredResumePending)) ||
    rescueSuppressed
  )
    return;
  let joined = filtered
    .map((j) => `"${escapeXml(j.description || "(no description)")}" (task ${escapeXml(j.task_id)})`)
    .join(", ");
  let q = orphanAgentRestoreNotice(filtered, hasTool, alsoResumable);
  let z = q
    ? `None of it will report back on its own. ${q} Re-create anything else`
    : "That work is lost \u2014 no result or further notification will arrive for it. Re-create it";
  let joined_2 = lostTimers.map(escapeXml).join("; ");
  let L = [
    filtered_2.length > 0 &&
      `The container running this session was restarted. These background agents are being resumed automatically and will report back: ${filtered_2.map((j) => `"${escapeXml(j.description || "(no description)")}" (task ${escapeXml(j.task_id)})`).join(", ")}.`,
    filtered.length > 0 &&
      `The container running this session was restarted before background work reported back: ${joined}. ${z} if still needed (a long-running server or watcher that nothing is waiting on does not need restarting now), or tell the user what was lost.`,
    lostTimers.length > 0 &&
      `${filtered.length > 0 ? "Timers that were pending in that container will not fire either" : "The container running this session was restarted, so these pending timers will not fire"}: ${joined_2}. Schedule each again if still needed (do the work of an overdue one now)${filtered.length > 0 ? "" : ", or tell the user what was lost"}.`,
  ];
  return {
    command: {
      mode: "task-notification",
      priority: "later",
      agentId: mainAgentId(),
      isMeta: true,
      startedBy: "restart",
      ...(lostTimers.length > 0 && {
        wakesForLostTimers: true,
      }),
      skipAttachments: true,
      value: formatTaskNotification({
        status: "stopped",
        summary: L.filter(Boolean).join(" "),
      }),
    },
    counts: x,
  };
}
//@ chunk-z4g2ta8k.js:9091-9101 placement
var MAX_RESTORED_AGENTS_LISTED = 50;
//@ chunk-z4g2ta8k.js:9101-10867 placement
async function restoreOrphanAgents({ recorded, stopped, toldOfAnyway, readAgentMetadataEvents, storageV5 }) {
  let y = new Set(stopped.filter(getTaskOutputData).map((S) => S.task_id));
  rememberResumableAgents(y);
  if (!isTurnHandoffResumeEnabled())
    return {
      alsoResumable: new Set(),
      stillOffered: [],
      toKeep: undefined,
    };
  try {
    let S = new Map();
    let k = new Set(toldOfAnyway.map((L) => L.task_id));
    let P = Array.isArray(recorded) ? recorded : [];
    for (let L of P.slice(-MAX_RESTORED_AGENTS_LISTED)) {
      if (!isPlainObject(L) || typeof L.task_id !== "string") continue;
      let j = normalizeAgentIdOrNull(L.task_id);
      if (j !== null && !k.has(j)) S.set(j, L.told === true ? "told" : "untold");
    }
    for (let L of stopped) {
      let j = L.task_type === "local_agent" ? normalizeAgentIdOrNull(L.task_id) : null;
      if (j !== null) S.set(j, "stopped");
    }
    if (S.size === 0)
      return {
        alsoResumable: new Set(),
        stillOffered: [],
        toKeep: [],
      };
    let O = new Set(Array.from(S.keys()).filter((key) => !y.has(key)));
    rememberStoppedAgents(O);
    let results = await Promise.all(Array.from(S.keys(), (L) => readAgentMetadataSafe(L, storageV5)));
    let filtered = Array.from(S.keys()).filter((key, j) => results[j] === null);
    let U = filtered.length > 0 ? await readAgentMetadataEvents(filtered) : [];
    if (U === null) logFeatureSad("subagent_sidecar_from_stream", "read_failed");
    let M = new Map((U ?? []).map((L) => [L.session_agent_id, L.payload]));
    let results_2 = await Promise.all(
      Array.from(S, async ([L, j], ae) => {
        let de = results[ae] === null ? M.get(L) : undefined;
        let ne =
          de === undefined
            ? results[ae]
            : (await restoreAgentSidecarFromStream(L, de, storageV5)) === "failed"
              ? undefined
              : await readAgentMetadataSafe(L, storageV5);
        let launch = ne ? validateAgentMetadata(ne) : undefined;
        return {
          agentId: L,
          mark: j,
          sidecar: ne,
          launch,
        };
      }),
    );
    let filtered_2 = results_2.filter(
      ({ sidecar, launch }) => sidecar?.launchedWithDefaults === true && isRestorableOrphanAgent(launch),
    );
    let z = new Set(filtered_2.map((L) => L.agentId));
    let filtered_3 = results_2.filter(
      (L) =>
        y.has(L.agentId) ||
        z.has(L.agentId) ||
        L.mark !== "stopped" ||
        L.sidecar === undefined ||
        (L.sidecar === null && U === null),
    );
    return {
      alsoResumable: z,
      stillOffered: results_2
        .filter((L) => L.mark === "untold")
        .map((L) => ({
          task_id: L.agentId,
          task_type: "local_agent",
          description: L.launch?.description ?? "",
        })),
      toKeep: filtered_3.slice(-MAX_RESTORED_AGENTS_LISTED).map((L) => ({
        task_id: L.agentId,
        ...(L.mark === "told" && {
          told: true,
        }),
      })),
    };
  } catch (error) {
    logForDebugging(`[orphanAgentRestore] ${describeStorageError(error)}`, {
      level: "error",
    });
    return {
      alsoResumable: new Set(),
      stillOffered: [],
      toKeep: undefined,
    };
  }
}
//@ chunk-z4g2ta8k.js:10867-10926 placement
/**
 * 判断子代理是否可被恢复：以默认参数启动且属于可恢复的孤儿代理。
 */
function isRestorableDefaultLaunchedAgent(e) {
  return e?.launchedWithDefaults === true && isRestorableOrphanAgent(e);
}
//@ chunk-z4g2ta8k.js:10926-11070 placement
function isRestorableOrphanAgent(e) {
  return (
    e !== undefined &&
    e.spawnDepth === 1 &&
    e.parentAgentId === undefined &&
    e.spawnedWithWorktree !== true &&
    e.stoppedByUser !== true &&
    e.finished !== true
  );
}
//@ chunk-z4g2ta8k.js:11070-11186 placement
async function readAgentMetadataSafe(e, storageV5) {
  try {
    return await readAgentMetadata(e, storageV5);
  } catch (error) {
    logForDebugging(`[orphanAgentRestore] ${describeStorageError(error)}`, {
      level: "error",
    });
    return;
  }
}
export {
  collectOrphanTasks,
  restoreOrphanAgents,
  orphanAgentRestoreNotice,
  describeInterruptedTasks,
  isRestorableDefaultLaunchedAgent,
};
