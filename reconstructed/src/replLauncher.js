/**
 * replLauncher.tsx
 *
 * 并入已有模块：REPL 启动器导出占位。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/replLauncher.tsx
 * pieces: chunk-19arrzdw.js (3)
 * attribution: placement 1, facade-exports 2
 */
import { j, R, ce, y, P } from "../vendor/react/cjs/react.production.js";
import { syncSessionPermissionMode } from "./services/api/sessionFlags.js";
import { Cr } from "./state/AppState.js";
import { y$n, persistFullscreenTrial } from "./components/FullscreenUpsellTrial.js";
import { createQueryEngine } from "./engine/queryEngine.js";
import { query } from "./query.js";
import { toSlashCommands } from "./commands.js";
import { toSdkModelInfos } from "./entrypoints/sdk/coreSchemas.js";
import { getEnabledModelOptions, getUnavailableModelOptions } from "./utils/model/modelOptions.js";
import { toAgentInfos } from "./tools/AgentTool/loadAgentsDir.js";
import { toAccountInfo } from "./utils/auth.js";
import { hasCustomOutputStyle } from "./constants/outputStyles.js";
import { mcpServerStatusSnapshots } from "./services/mcp/config.js";
import { buildSystemInitFields } from "./utils/messages/systemInit.js";
import { parseUserSpecifiedModel } from "./utils/model/modelDisplay.js";
import { getDefaultMainLoopModelSetting } from "./utils/model/planModeModel.js";
import { toExternalPermissionMode } from "./utils/permissions/PermissionMode.js";
import { e } from "../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { FleetNudgeStore } from "./components/fleet/FleetNudgeStore.js";
import { createReplMessageQueue } from "./replSessionSeat.js";
import { armFullscreenBootCanary, recordFullscreenRenderFailure } from "./utils/fullscreenBootGuard.js";
import { o0n } from "./dialogLaunchers.js";
import { onChangeAppState } from "./state/onChangeAppState.js";

//@ chunk-19arrzdw.js:855-859 placement
j();
//@ chunk-19arrzdw.js:859-954 facade-exports
function launchSessionRepl(...n) {
  let { mode: mode } = n[1].initialState.toolPermissionContext;
  return (syncSessionPermissionMode(mode), launchRepl(...n));
}
//@ chunk-19arrzdw.js:954-2312 facade-exports
async function launchRepl(n, t, p, l) {
  let { AppRoot: AppRoot } = await import("./chunk-f6d8289b.js"),
    { REPL: REPL } = await import("./chunk-3e2f3btj.js");
  function S(r) {
    let a = Cr();
    y$n();
    let f = R(r.commands),
      A = ce((s) => {
        f.current = s;
      }, []),
      g = R(() => {
        throw Error("engine: queryParams called before REPL registered builder");
      }),
      E = ce((s) => {
        g.current = s;
      }, []),
      [m] = y(() =>
        createQueryEngine({
          run: query,
          queryParams: async (s) => g.current(),
          commands: () => toSlashCommands(f.current),
          models: () => toSdkModelInfos(getEnabledModelOptions()),
          unavailableModels: () => toSdkModelInfos(getUnavailableModelOptions()),
          agents: () => toAgentInfos(a.getState().agentDefinitions.activeAgents),
          account: toAccountInfo(),
          outputStyle: hasCustomOutputStyle(),
          mcpServers: () => mcpServerStatusSnapshots(a.getState().mcp.clients),
          ambient: buildSystemInitFields,
          initialModel: () => {
            let state = a.getState();
            return parseUserSpecifiedModel(
              state.mainLoopModelForSession ?? state.mainLoopModel ?? getDefaultMainLoopModelSetting(),
            );
          },
          initialPermissionMode: () => toExternalPermissionMode(a.getState().toolPermissionContext.mode),
          hostOwnsPermissionMode: !0,
          hostOwnsModel: !0,
        }),
      );
    return (
      P(() => () => m.close(), [m]),
      e(REPL, { ...r, engine: m, onCommandsChange: A, onQueryParamsChange: E })
    );
  }
  let {
      session: session,
      storageV5: storageV5,
      credentials: credentials,
      fleetNudgeStore: fleetNudgeStore = new FleetNudgeStore({ storageV5: storageV5 }),
    } = t,
    M = createReplMessageQueue(storageV5);
  await armFullscreenBootCanary({ onHealthy: () => persistFullscreenTrial(storageV5), storageV5: storageV5 });
  let h = o0n(session, t.initialState, (r) => onChangeAppState(r, session, storageV5, credentials));
  try {
    await l(
      n,
      e(AppRoot, {
        session: session,
        storageV5: storageV5,
        messageQueue: M,
        store: h,
        fleetNudgeStore: fleetNudgeStore,
        sessionHooks: t.sessionHooks,
        writesExitHandoff: !0,
        getFpsMetrics: t.getFpsMetrics,
        stats: t.stats,
        keybindings: !1,
        children: e(S, { ...p }),
      }),
      session,
      storageV5,
      credentials,
    );
  } catch (error) {
    throw (await recordFullscreenRenderFailure().catch(() => !1), error);
  }
}

export { launchSessionRepl };
