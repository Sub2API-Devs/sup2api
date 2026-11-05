/**
 * utils/subagentStatusLine.ts
 *
 * 2.1.316 新增。子代理状态行。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (7)
 * attribution: placement 7
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  init_react_production,
  useRef,
  useEffect,
  useSyncExternalStore,
} from "../../vendor/react/cjs/react.production.js";
import { isStatusLineManagedOnly } from "./hooks/hookInputRewrite.js";
import { getSettingsForSource, getSettingsAfterPluginLoad } from "./settings/settings.js";
import {
  shouldDisableAllHooksIncludingManaged,
  shouldAllowManagedHooksOnly,
} from "./hooks/hooksConfigSnapshot.js";
import { isCustomizationDisabled } from "./settings/customizationDisabled.js";
import { shouldSkipHookDueToTrust, createBaseHookInput } from "./hooks.js";
import { logForDebugging } from "./debug.js";
import { getCwd } from "./cwd.js";
import {
  getSessionId,
  getOriginalCwd,
  getProjectRoot,
  getSdkBetas,
  getProjectConfigRoot,
} from "../bootstrap/state.js";
import { getAgentProgressLabel } from "../tasks/LocalAgentTask/LocalAgentTask.js";
import { getContextWindow } from "./model/configs.js";
import { getPlatform } from "./platform.js";
import { getGitBashPathCached } from "./windowsPaths.js";
import { getCachedPowerShellPath } from "./shell/powershellDetection.js";
import { subprocessEnv } from "./subprocessEnv.js";
import { claudeSubprocessEnv, claudeEnvContextFrom } from "./claudeSubprocessEnv.js";
import { getSessionProject } from "../bootstrap/sessionSlices.js";
import { prependDirToPathEnv, stripShellQuotes } from "./path.js";
import { SIDE_QUESTION_HINT_MS, sideQuestionAgentsSchema } from "../components/PromptInput/AgentsPill.js";
import { jsonStringify, jsonParse } from "./slowOperations.js";
import { execFileNoThrowWithCwd } from "./execFileNoThrow.js";
import { buildPowerShellCommandArgs } from "./shell/powershellProvider.js";
import { useAppStoreDirect, useSetAppState, useAppState } from "../state/AppState.js";
import { subscribeCoordinatorPanel } from "./transcriptDiagnostics.js";
import { release } from "../state/teammateViewHelpers.js";
import { useTerminalSize } from "../hooks/useTerminalSize.js";
import { useClock } from "../ink/components/ClockContext.js";
import { trackReceivedMessageUuid } from "../cli/print.js";
import { agentRowPrefixWidth, AGENT_ROW_WIDTH_RESERVE } from "../components/CoordinatorAgentStatus.js";
import { subscribeGlobalConfigInstalled } from "./config.js";
import { EDITOR_MODES } from "./configConstants.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-czq1j3j2.js:834753-834757 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:834753", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:843132-843270 placement
function subagentStatusLineCommand() {
  let setting = isStatusLineManagedOnly()
    ? getSettingsForSource("policySettings")?.subagentStatusLine
    : getSettingsAfterPluginLoad("subagentStatusLine");
  return setting?.type === "command" ? setting.command : undefined;
}
//@ chunk-czq1j3j2.js:843270-844801 placement
async function runSubagentStatusLine(tasks, columns, names, tokenSamples) {
  if (shouldDisableAllHooksIncludingManaged() || isCustomizationDisabled("statusLine")) return {};
  if (shouldSkipHookDueToTrust()) {
    logForDebugging("Skipping subagentStatusLine execution - workspace trust not accepted");
    return {};
  }
  let command = subagentStatusLineCommand();
  if (command === undefined || tasks.length === 0) return {};
  let cwd = getCwd();
  let sessionInput = {
    id: getSessionId(),
    project: {
      originalCwd: getOriginalCwd(),
      projectRoot: getProjectRoot(),
    },
  };
  let hookInput = {
    ...createBaseHookInput(sessionInput, cwd),
    columns,
    tasks: tasks.map((task) => ({
      id: task.id,
      name: names.get(task.id),
      type: task.type,
      agentType: task.agentType,
      status: task.status,
      description: task.description,
      label: getAgentProgressLabel(task) || task.description,
      startTime: task.startTime,
      model: task.model,
      effort: task.effort,
      contextWindowSize: task.model ? getContextWindow(task.model, getSdkBetas()) : undefined,
      tokenCount: task.progress?.tokenCount ?? 0,
      tokenSamples: tokenSamples.get(task.id) ?? [],
      cwd: task.cwd ?? cwd,
    })),
  };
  let isWindows = getPlatform() === "windows";
  let gitBashPath = isWindows ? getGitBashPathCached() : null;
  let powerShellPath = isWindows && !gitBashPath ? await getCachedPowerShellPath() : null;
  let toPosixPath = isWindows && gitBashPath ? (path) => path.replaceAll("\\", "/") : (path) => path;
  let env = {
    ...subprocessEnv(),
    ...claudeSubprocessEnv(claudeEnvContextFrom(hookInput)),
    CLAUDE_PROJECT_DIR: toPosixPath(getProjectConfigRoot() ?? getSessionProject(sessionInput).projectRoot),
  };
  if (gitBashPath) prependDirToPathEnv(env, gitBashPath);
  let execOptions = {
    cwd: getProjectConfigRoot() ?? cwd,
    env,
    extendEnv: false,
    timeout: SIDE_QUESTION_HINT_MS,
    input: jsonStringify(hookInput),
    preserveOutputOnError: true,
    toolCgroupClass: "plugin",
  };
  let result = powerShellPath
    ? await execFileNoThrowWithCwd(powerShellPath, buildPowerShellCommandArgs(command), {
        ...execOptions,
      })
    : await execFileNoThrowWithCwd(gitBashPath ? stripShellQuotes(command) : command, [], {
        shell: isWindows ? (gitBashPath ?? true) : true,
        ...execOptions,
      });
  if (result.code !== 0) {
    logForDebugging(`subagentStatusLine exited ${result.code}: ${result.error ?? result.stderr}`, {
      level: "error",
    });
    return {};
  }
  let decorations = {};
  for (let line of result.stdout.split(`
`)) {
    if (!line.trim()) continue;
    let parsed;
    try {
      parsed = jsonParse(line);
    } catch {
      logForDebugging(`subagentStatusLine emitted non-JSON line: ${line}`, {
        level: "error",
      });
      continue;
    }
    let validated = sideQuestionAgentsSchema().safeParse(parsed);
    if (!validated.success) {
      logForDebugging(`subagentStatusLine emitted invalid schema: ${validated.error.message}`, {
        level: "error",
      });
      continue;
    }
    decorations[validated.data.id] = {
      content: validated.data.content,
    };
  }
  return decorations;
}
//@ chunk-czq1j3j2.js:844801-844822 placement
var TICK_DEBOUNCE_MS = 300;
var TICK_INTERVAL_MS = 5000;
//@ chunk-czq1j3j2.js:844822-844979 placement
function sameStatusLineContents(taskDecorations, other) {
  let keys = Object.keys(taskDecorations);
  let keys_2 = Object.keys(other);
  if (keys.length !== keys_2.length) return false;
  for (let key of keys) if (taskDecorations[key]?.content !== other[key]?.content) return false;
  return true;
}
//@ chunk-czq1j3j2.js:845188-846512 placement
function useSubagentStatusLineTick() {
  let appStoreDirect = useAppStoreDirect();
  let setAppState = useSetAppState();
  let commandConfigured = useAppState((state) => state.settings?.subagentStatusLine?.command !== undefined);
  let coordinatorPanelOpen = subscribeCoordinatorPanel();
  let enabled =
    commandConfigured &&
    !coordinatorPanelOpen &&
    (!shouldAllowManagedHooksOnly() || subagentStatusLineCommand() !== undefined);
  let taskCount = useAppState((state) =>
    enabled ? release(state.tasks, state.viewingAgentTaskId).length : 0,
  );
  let { columns } = useTerminalSize();
  let clock = useClock();
  let inFlightRef = useRef(false);
  let tokenSamplesRef = useRef(new Map());
  useEffect(() => {
    if (!enabled) {
      setAppState((state) =>
        Object.keys(state.taskDecorations).length === 0
          ? state
          : {
              ...state,
              taskDecorations: {},
            },
      );
      return;
    }
    let cancelled = false;
    let refresh = () => {
      if (inFlightRef.current) return;
      let state = appStoreDirect.getState();
      let tasks = release(state.tasks, state.viewingAgentTaskId);
      trackReceivedMessageUuid(
        tokenSamplesRef.current,
        tasks.map((task) => ({
          id: task.id,
          tokenCount: task.progress?.tokenCount ?? 0,
        })),
      );
      if (tasks.length === 0) {
        setAppState((state) =>
          Object.keys(state.taskDecorations).length === 0
            ? state
            : {
                ...state,
                taskDecorations: {},
              },
        );
        return;
      }
      inFlightRef.current = true;
      let nameByAgentId = new Map();
      for (let [agentId, name] of state.agentNameRegistry) nameByAgentId.set(name, agentId);
      runSubagentStatusLine(
        tasks,
        Math.max(0, columns - agentRowPrefixWidth() - AGENT_ROW_WIDTH_RESERVE),
        nameByAgentId,
        tokenSamplesRef.current,
      )
        .then((result) => {
          if (cancelled) return;
          setAppState((state) => {
            let liveIds = new Set(tasks.map((task) => task.id));
            let decorations = {};
            for (let [key, value] of Object.entries(result)) if (liveIds.has(key)) decorations[key] = value;
            return sameStatusLineContents(state.taskDecorations, decorations)
              ? state
              : {
                  ...state,
                  taskDecorations: decorations,
                };
          });
        })
        .catch((error) => {
          logForDebugging(`subagentStatusLine tick failed: ${error}`, {
            level: "error",
          });
        })
        .finally(() => {
          inFlightRef.current = false;
          if (
            release(appStoreDirect.getState().tasks, appStoreDirect.getState().viewingAgentTaskId).length ===
            0
          )
            refresh();
        });
    };
    if (taskCount === 0) {
      refresh();
      return;
    }
    let cancelDebounce = clock.setTimeout(refresh, TICK_DEBOUNCE_MS);
    let cancelInterval = clock.setTimeout(function tick() {
      try {
        refresh();
      } finally {
        cancelInterval = clock.setTimeout(tick, TICK_INTERVAL_MS);
      }
    }, TICK_INTERVAL_MS);
    return () => {
      cancelled = true;
      cancelDebounce();
      cancelInterval();
    };
  }, [enabled, taskCount, columns, appStoreDirect, setAppState, clock]);
}
//@ chunk-czq1j3j2.js:846516-846578 placement
function useEditorMode() {
  useAppState((state) => state.settings.editorMode);
  return useSyncExternalStore(subscribeGlobalConfigInstalled, EDITOR_MODES);
}
export { useSubagentStatusLineTick, useEditorMode };
