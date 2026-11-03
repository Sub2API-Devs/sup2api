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
import { xo } from "../bootstrap/sessionSlices.js";
import { prependDirToPathEnv, stripShellQuotes } from "./path.js";
import { peo, feo } from "../components/PromptInput/AgentsPill.js";
import { jsonStringify, jsonParse } from "./slowOperations.js";
import { execFileNoThrowWithCwd } from "./execFileNoThrow.js";
import { H3n } from "./shell/powershellProvider.js";
import { Cr, useSetAppState, useAppState } from "../state/AppState.js";
import { Xre } from "./transcriptDiagnostics.js";
import { release } from "../state/teammateViewHelpers.js";
import { useTerminalSize } from "../hooks/useTerminalSize.js";
import { useClock } from "../ink/components/ClockContext.js";
import { R, P, j, yt } from "../../vendor/react/cjs/react.production.js";
import { trackReceivedMessageUuid } from "../cli/print.js";
import { Ny, mT } from "../components/CoordinatorAgentStatus.js";
import { subscribeGlobalConfigInstalled } from "./config.js";
import { EDITOR_MODES } from "./configConstants.js";

//@ chunk-18hwfzwa.js:810409-810547 placement
function subagentStatusLineCommand() {
  let h = isStatusLineManagedOnly()
    ? getSettingsForSource("policySettings")?.subagentStatusLine
    : getSettingsAfterPluginLoad("subagentStatusLine");
  return h?.type === "command" ? h.command : void 0;
}
//@ chunk-18hwfzwa.js:810547-812078 placement
async function runSubagentStatusLine(h, x, D, L) {
  if (shouldDisableAllHooksIncludingManaged() || isCustomizationDisabled("statusLine")) return {};
  if (shouldSkipHookDueToTrust())
    return (logForDebugging("Skipping subagentStatusLine execution - workspace trust not accepted"), {});
  let ee = subagentStatusLineCommand();
  if (ee === void 0 || h.length === 0) return {};
  let ke = getCwd(),
    Re = { id: getSessionId(), project: { originalCwd: getOriginalCwd(), projectRoot: getProjectRoot() } },
    Be = {
      ...createBaseHookInput(Re, ke),
      columns: x,
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
        contextWindowSize: Ot.model ? getContextWindow(Ot.model, getSdkBetas()) : void 0,
        tokenCount: Ot.progress?.tokenCount ?? 0,
        tokenSamples: L.get(Ot.id) ?? [],
        cwd: Ot.cwd ?? ke,
      })),
    },
    He = getPlatform() === "windows",
    We = He ? getGitBashPathCached() : null,
    ze = He && !We ? await getCachedPowerShellPath() : null,
    Xe = He && We ? (Ot) => Ot.replaceAll("\\", "/") : (Ot) => Ot,
    rt = {
      ...subprocessEnv(),
      ...claudeSubprocessEnv(claudeEnvContextFrom(Be)),
      CLAUDE_PROJECT_DIR: Xe(getProjectConfigRoot() ?? xo(Re).projectRoot),
    };
  if (We) prependDirToPathEnv(rt, We);
  let kt = {
      cwd: getProjectConfigRoot() ?? ke,
      env: rt,
      extendEnv: !1,
      timeout: peo,
      input: jsonStringify(Be),
      preserveOutputOnError: !0,
      toolCgroupClass: "plugin",
    },
    At = ze
      ? await execFileNoThrowWithCwd(ze, H3n(ee), { ...kt })
      : await execFileNoThrowWithCwd(We ? stripShellQuotes(ee) : ee, [], {
          shell: He ? (We ?? !0) : !0,
          ...kt,
        });
  if (At.code !== 0)
    return (
      logForDebugging(`subagentStatusLine exited ${At.code}: ${At.error ?? At.stderr}`, { level: "error" }),
      {}
    );
  let It = {};
  for (let Ot of At.stdout.split(`
`)) {
    if (!Ot.trim()) continue;
    let Et;
    try {
      Et = jsonParse(Ot);
    } catch {
      logForDebugging(`subagentStatusLine emitted non-JSON line: ${Ot}`, { level: "error" });
      continue;
    }
    let safeParse = feo().safeParse(Et);
    if (!safeParse.success) {
      logForDebugging(`subagentStatusLine emitted invalid schema: ${safeParse.error.message}`, {
        level: "error",
      });
      continue;
    }
    It[safeParse.data.id] = { content: safeParse.data.content };
  }
  return It;
}
//@ chunk-18hwfzwa.js:812078-812099 placement
var heo = 300,
  tXe = 5000;
//@ chunk-18hwfzwa.js:812099-812256 placement
function sameStatusLineContents(h, x) {
  let keys = Object.keys(h),
    keys_2 = Object.keys(x);
  if (keys.length !== keys_2.length) return !1;
  for (let ee of keys) if (h[ee]?.content !== x[ee]?.content) return !1;
  return !0;
}
//@ chunk-18hwfzwa.js:812465-813789 placement
function useSubagentStatusLineTick() {
  let h = Cr(),
    x = useSetAppState(),
    D = useAppState((ze) => ze.settings?.subagentStatusLine?.command !== void 0),
    L = Xre(),
    ee = D && !L && (!shouldAllowManagedHooksOnly() || subagentStatusLineCommand() !== void 0),
    ke = useAppState((ze) => (ee ? release(ze.tasks, ze.viewingAgentTaskId).length : 0)),
    { columns: columns } = useTerminalSize(),
    Be = useClock(),
    He = R(!1),
    We = R(new Map());
  P(() => {
    if (!ee) {
      x((At) => (Object.keys(At.taskDecorations).length === 0 ? At : { ...At, taskDecorations: {} }));
      return;
    }
    let ze = !1,
      Xe = () => {
        if (He.current) return;
        let state = h.getState(),
          It = release(state.tasks, state.viewingAgentTaskId);
        if (
          (trackReceivedMessageUuid(
            We.current,
            It.map((Et) => ({ id: Et.id, tokenCount: Et.progress?.tokenCount ?? 0 })),
          ),
          It.length === 0)
        ) {
          x((Et) => (Object.keys(Et.taskDecorations).length === 0 ? Et : { ...Et, taskDecorations: {} }));
          return;
        }
        He.current = !0;
        let Ot = new Map();
        for (let [Et, Dt] of state.agentNameRegistry) Ot.set(Dt, Et);
        runSubagentStatusLine(It, Math.max(0, columns - Ny() - mT), Ot, We.current)
          .then((Et) => {
            if (ze) return;
            x((Dt) => {
              let Lt = new Set(It.map((Xt) => Xt.id)),
                oo = {};
              for (let [Xt, io] of Object.entries(Et)) if (Lt.has(Xt)) oo[Xt] = io;
              return sameStatusLineContents(Dt.taskDecorations, oo) ? Dt : { ...Dt, taskDecorations: oo };
            });
          })
          .catch((Et) => {
            logForDebugging(`subagentStatusLine tick failed: ${Et}`, { level: "error" });
          })
          .finally(() => {
            if (
              ((He.current = !1), release(h.getState().tasks, h.getState().viewingAgentTaskId).length === 0)
            )
              Xe();
          });
      };
    if (ke === 0) {
      Xe();
      return;
    }
    let rt = Be.setTimeout(Xe, heo),
      kt = Be.setTimeout(function At() {
        try {
          Xe();
        } finally {
          kt = Be.setTimeout(At, tXe);
        }
      }, tXe);
    return () => {
      ((ze = !0), rt(), kt());
    };
  }, [ee, ke, columns, h, x, Be]);
}
//@ chunk-18hwfzwa.js:813789-813793 placement
j();
//@ chunk-18hwfzwa.js:813793-813854 placement
function Cg() {
  return (useAppState((h) => h.settings.editorMode), yt(subscribeGlobalConfigInstalled, EDITOR_MODES));
}

export { Cg, useSubagentStatusLineTick };
