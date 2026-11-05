/**
 * utils/agentNameRegistry.ts
 *
 * 2.1.316 新增：子代理名称登记
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-tz3jw2na.js (5)
 * attribution: placement 5
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isInProcessTeammateTask } from "../tasks/InProcessTeammateTask/types.js";
import { isTerminalTaskStatus } from "../tasks/taskStatus.js";
import { isWaitingOnChildren, FLAG_IDLE_WINDOW } from "../tasks/LocalAgentTask/keepalive.js";
import { isReservedSessionName } from "./sessionAddresses.js";
import { logForDebugging } from "./debug.js";
import { import_sortedIndex_2 } from "../../vendor/lodash-es/_inlinedHelpers.js";

//@ chunk-tz3jw2na.js:409-533 placement
function findAgentRecord(agentRecords, agentId) {
  if (Object.hasOwn(agentRecords, agentId)) return agentRecords[agentId];
  return Object.values(agentRecords).find(
    (task) => isInProcessTeammateTask(task) && task.identity.resumableAgentId === agentId,
  );
}
//@ chunk-tz3jw2na.js:533-763 placement
function liveAgentNames(agentNameRegistry, tasks) {
  return new Map(
    [...agentNameRegistry].filter(([, agentId]) => {
      let agentRecord = findAgentRecord(tasks, agentId);
      if (agentRecord === undefined) return false;
      if (!isTerminalTaskStatus(agentRecord.status)) return true;
      return (
        isWaitingOnChildren(agentRecord) &&
        "keepaliveReasons" in agentRecord &&
        agentRecord.keepaliveReasons !== undefined &&
        [...agentRecord.keepaliveReasons].some((keepaliveReason) => keepaliveReason !== FLAG_IDLE_WINDOW)
      );
    }),
  );
}
//@ chunk-tz3jw2na.js:763-886 placement
var NOOP_AGENT_NAME_REGISTRY = {
  registerName() {},
  allocateName(name) {
    return name;
  },
  nameOf() {
    return;
  },
  clearTodos() {},
  setTeammate() {},
  setSendMessagePin() {},
};
//@ chunk-tz3jw2na.js:886-2167 placement
/**
 * 子代理名称登记：分配不冲突的名称、记录已调用的代理类型。
 */
function createAgentNameRegistry(getAppState, setAppState) {
  return {
    registerName(name, agentId) {
      if (isReservedSessionName(name)) {
        logForDebugging(`[registerName] refused reserved or agent-id-shaped name "${name}" for ${agentId}`);
        return;
      }
      setAppState((prevState) => {
        if (prevState.agentNameRegistry.get(name) === agentId) return prevState;
        let nextRegistry = new Map(prevState.agentNameRegistry);
        nextRegistry.set(name, agentId);
        return {
          ...prevState,
          agentNameRegistry: nextRegistry,
        };
      });
    },
    allocateName(preferredName) {
      let baseName = sanitizeAgentName(preferredName);
      let state = getAppState();
      let agentNameRegistry = state.agentNameRegistry;
      let teammateNames = new Set(
        Object.values(state.teamContext?.teammates ?? {}).map((teammate) => teammate.name),
      );
      for (let j = 1; ; j++) {
        let candidate = j === 1 ? baseName : `${baseName}-${j}`;
        if (isReservedSessionName(candidate) || teammateNames.has(candidate)) continue;
        let existingAgentId = agentNameRegistry.get(candidate);
        if (existingAgentId === undefined || findAgentRecord(state.tasks, existingAgentId) === undefined)
          return candidate;
      }
    },
    nameOf(agentId) {
      for (let [name, mappedAgentId] of getAppState().agentNameRegistry)
        if (mappedAgentId === agentId) return name;
      return;
    },
    clearTodos(agentId) {
      setAppState((prevState) => {
        if (!(agentId in prevState.todos)) return prevState;
        let { [agentId]: removedTodo, ...remainingTodos } = prevState.todos;
        return {
          ...prevState,
          todos: remainingTodos,
        };
      });
    },
    setSendMessagePin(key, pinValue) {
      setAppState((prevState) => {
        let previousPin = Object.hasOwn(prevState.sendMessagePins, key)
          ? prevState.sendMessagePins[key]
          : undefined;
        if (import_sortedIndex_2(previousPin, pinValue)) return prevState;
        return {
          ...prevState,
          sendMessagePins: {
            ...prevState.sendMessagePins,
            [key]: pinValue,
          },
        };
      });
    },
    setTeammate(name, teammate) {
      if (teammate !== undefined && isReservedSessionName(teammate.name)) {
        logForDebugging(
          `[setTeammate] refused reserved or agent-id-shaped teammate name "${teammate.name}" for ${name}`,
        );
        return;
      }
      setAppState((prevState) => {
        let teamContext = prevState.teamContext;
        if (!teamContext) return prevState;
        let existingTeammate = teamContext.teammates?.[name];
        if (teammate === undefined) {
          if (!existingTeammate) return prevState;
          let { [name]: removedTeammate, ...remainingTeammates } = teamContext.teammates;
          return {
            ...prevState,
            teamContext: {
              ...teamContext,
              teammates: remainingTeammates,
            },
          };
        }
        if (existingTeammate === teammate) return prevState;
        return {
          ...prevState,
          teamContext: {
            ...teamContext,
            teammates: {
              ...teamContext.teammates,
              [name]: teammate,
            },
          },
        };
      });
    },
  };
}
//@ chunk-tz3jw2na.js:2167-2279 placement
function sanitizeAgentName(rawName) {
  let sliced = rawName
    .replace(/[^A-Za-z0-9_-]+/g, "-")
    .replace(/^-+/, "")
    .slice(0, 64);
  return sliced.length > 0 ? sliced : "agent";
}
export { NOOP_AGENT_NAME_REGISTRY, liveAgentNames, createAgentNameRegistry };
