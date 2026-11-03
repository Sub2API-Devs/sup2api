/**
 * utils/subagentStatusLine.ts
 *
 * 2.1.316 新增。子代理状态行。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (7)
 * attribution: placement 7
 */
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
import { R, P, init_react_production, yt } from "../../vendor/react/cjs/react.production.js";
import { trackReceivedMessageUuid } from "../cli/print.js";
import { agentRowPrefixWidth, AGENT_ROW_WIDTH_RESERVE } from "../components/CoordinatorAgentStatus.js";
import { subscribeGlobalConfigInstalled } from "./config.js";
import { EDITOR_MODES } from "./configConstants.js";

//@ chunk-18hwfzwa.js:810409-810547 placement
function subagentStatusLineCommand() {
  let h = isStatusLineManagedOnly()
    ? getSettingsForSource("policySettings")?.subagentStatusLine
    : getSettingsAfterPluginLoad("subagentStatusLine");
  return h?.type === "command" ? h.command : undefined;
}
//@ chunk-18hwfzwa.js:810547-812078 placement
async function runSubagentStatusLine(h, columns, D, L) {
  if (shouldDisableAllHooksIncludingManaged() || isCustomizationDisabled("statusLine")) return {};
  if (shouldSkipHookDueToTrust()) {
    logForDebugging("Skipping subagentStatusLine execution - workspace trust not accepted");
    return {};
  }
  let cmd = subagentStatusLineCommand();
  if (cmd === undefined || h.length === 0) return {};
  let cwd = getCwd();
  let Re = {
    id: getSessionId(),
    project: {
      originalCwd: getOriginalCwd(),
      projectRoot: getProjectRoot(),
    },
  };
  let Be = {
    ...createBaseHookInput(Re, cwd),
    columns,
    tasks: h.map((Ot) => ({
      id: Ot.id,
      name: D.get(Ot.id),
      type: Ot.type,
      agentType: Ot.agentType,
      status: Ot.status,
      description: Ot.description,
      label: getAgentProgressLabel(Ot) || Ot.description,
      startTime: Ot.startTime,
      model: Ot.model,
      effort: Ot.effort,
      contextWindowSize: Ot.model ? getContextWindow(Ot.model, getSdkBetas()) : undefined,
      tokenCount: Ot.progress?.tokenCount ?? 0,
      tokenSamples: L.get(Ot.id) ?? [],
      cwd: Ot.cwd ?? cwd,
    })),
  };
  let He = getPlatform() === "windows";
  let We = He ? getGitBashPathCached() : null;
  let ze = He && !We ? await getCachedPowerShellPath() : null;
  let Xe = He && We ? (Ot) => Ot.replaceAll("\\", "/") : (Ot) => Ot;
  let rt = {
    ...subprocessEnv(),
    ...claudeSubprocessEnv(claudeEnvContextFrom(Be)),
    CLAUDE_PROJECT_DIR: Xe(getProjectConfigRoot() ?? getSessionProject(Re).projectRoot),
  };
  if (We) prependDirToPathEnv(rt, We);
  let kt = {
    cwd: getProjectConfigRoot() ?? cwd,
    env: rt,
    extendEnv: false,
    timeout: SIDE_QUESTION_HINT_MS,
    input: jsonStringify(Be),
    preserveOutputOnError: true,
    toolCgroupClass: "plugin",
  };
  let At = ze
    ? await execFileNoThrowWithCwd(ze, buildPowerShellCommandArgs(cmd), {
        ...kt,
      })
    : await execFileNoThrowWithCwd(We ? stripShellQuotes(cmd) : cmd, [], {
        shell: He ? (We ?? true) : true,
        ...kt,
      });
  if (At.code !== 0) {
    logForDebugging(`subagentStatusLine exited ${At.code}: ${At.error ?? At.stderr}`, {
      level: "error",
    });
    return {};
  }
  let It = {};
  for (let line of At.stdout.split(`
`)) {
    if (!line.trim()) continue;
    let Et;
    try {
      Et = jsonParse(line);
    } catch {
      logForDebugging(`subagentStatusLine emitted non-JSON line: ${line}`, {
        level: "error",
      });
      continue;
    }
    let Dt = sideQuestionAgentsSchema().safeParse(Et);
    if (!Dt.success) {
      logForDebugging(`subagentStatusLine emitted invalid schema: ${Dt.error.message}`, {
        level: "error",
      });
      continue;
    }
    It[Dt.data.id] = {
      content: Dt.data.content,
    };
  }
  return It;
}
//@ chunk-18hwfzwa.js:812078-812099 placement
var TICK_DEBOUNCE_MS = 300;
var TICK_INTERVAL_MS = 5000;
//@ chunk-18hwfzwa.js:812099-812256 placement
function sameStatusLineContents(taskDecorations, x) {
  let keys = Object.keys(taskDecorations);
  let keys_2 = Object.keys(x);
  if (keys.length !== keys_2.length) return false;
  for (let ee of keys) if (taskDecorations[ee]?.content !== x[ee]?.content) return false;
  return true;
}
//@ chunk-18hwfzwa.js:812465-813789 placement
function useSubagentStatusLineTick() {
  let appStoreDirect = useAppStoreDirect();
  let setAppState = useSetAppState();
  let D = useAppState((ze) => ze.settings?.subagentStatusLine?.command !== undefined);
  let L = subscribeCoordinatorPanel();
  let ee = D && !L && (!shouldAllowManagedHooksOnly() || subagentStatusLineCommand() !== undefined);
  let ke = useAppState((ze) => (ee ? release(ze.tasks, ze.viewingAgentTaskId).length : 0));
  let { columns } = useTerminalSize();
  let clock = useClock();
  let He = R(false);
  let We = R(new Map());
  P(() => {
    if (!ee) {
      setAppState((At) =>
        Object.keys(At.taskDecorations).length === 0
          ? At
          : {
              ...At,
              taskDecorations: {},
            },
      );
      return;
    }
    let ze = false;
    let Xe = () => {
      if (He.current) return;
      let state = appStoreDirect.getState();
      let It = release(state.tasks, state.viewingAgentTaskId);
      trackReceivedMessageUuid(
        We.current,
        It.map((Et) => ({
          id: Et.id,
          tokenCount: Et.progress?.tokenCount ?? 0,
        })),
      );
      if (It.length === 0) {
        setAppState((Et) =>
          Object.keys(Et.taskDecorations).length === 0
            ? Et
            : {
                ...Et,
                taskDecorations: {},
              },
        );
        return;
      }
      He.current = true;
      let Ot = new Map();
      for (let [Et, Dt] of state.agentNameRegistry) Ot.set(Dt, Et);
      runSubagentStatusLine(
        It,
        Math.max(0, columns - agentRowPrefixWidth() - AGENT_ROW_WIDTH_RESERVE),
        Ot,
        We.current,
      )
        .then((Et) => {
          if (ze) return;
          setAppState((Dt) => {
            let Lt = new Set(It.map((Xt) => Xt.id));
            let oo = {};
            for (let [key, value] of Object.entries(Et)) if (Lt.has(key)) oo[key] = value;
            return sameStatusLineContents(Dt.taskDecorations, oo)
              ? Dt
              : {
                  ...Dt,
                  taskDecorations: oo,
                };
          });
        })
        .catch((error) => {
          logForDebugging(`subagentStatusLine tick failed: ${error}`, {
            level: "error",
          });
        })
        .finally(() => {
          He.current = false;
          if (
            release(appStoreDirect.getState().tasks, appStoreDirect.getState().viewingAgentTaskId).length ===
            0
          )
            Xe();
        });
    };
    if (ke === 0) {
      Xe();
      return;
    }
    let rt = clock.setTimeout(Xe, TICK_DEBOUNCE_MS);
    let kt = clock.setTimeout(function At() {
      try {
        Xe();
      } finally {
        kt = clock.setTimeout(At, TICK_INTERVAL_MS);
      }
    }, TICK_INTERVAL_MS);
    return () => {
      ze = true;
      rt();
      kt();
    };
  }, [ee, ke, columns, appStoreDirect, setAppState, clock]);
}
//@ chunk-18hwfzwa.js:813789-813793 placement
init_react_production();
//@ chunk-18hwfzwa.js:813793-813854 placement
function useEditorMode() {
  useAppState((h) => h.settings.editorMode);
  return yt(subscribeGlobalConfigInstalled, EDITOR_MODES);
}
export { useEditorMode, useSubagentStatusLineTick };
