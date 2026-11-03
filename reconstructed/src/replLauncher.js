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
import { init_react_production, R, ce, y, P } from "../vendor/react/cjs/react.production.js";
import { syncSessionPermissionMode } from "./services/api/sessionFlags.js";
import { useAppStoreDirect } from "./state/AppState.js";
import { noopTrialEffect, persistFullscreenTrial } from "./components/FullscreenUpsellTrial.js";
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
import { jsxProd_default } from "../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { FleetNudgeStore } from "./components/fleet/FleetNudgeStore.js";
import { createReplMessageQueue } from "./replSessionSeat.js";
import { armFullscreenBootCanary, recordFullscreenRenderFailure } from "./utils/fullscreenBootGuard.js";
import { adoptEngineForLauncher } from "./dialogLaunchers.js";
import { onChangeAppState } from "./state/onChangeAppState.js";

//@ chunk-19arrzdw.js:855-859 placement
init_react_production();
//@ chunk-19arrzdw.js:859-954 facade-exports
function launchSessionRepl(...n) {
  let { mode } = n[1].initialState.toolPermissionContext;
  syncSessionPermissionMode(mode);
  return launchRepl(...n);
}
//@ chunk-19arrzdw.js:954-2312 facade-exports
async function launchRepl(n, t, p, l) {
  let { AppRoot } = await import("./chunk-f6d8289b.js");
  let { REPL } = await import("./chunk-3e2f3btj.js");
  function S(r) {
    let appStoreDirect = useAppStoreDirect();
    noopTrialEffect();
    let commandsRef = R(r.commands);
    let onCommandsChange = ce((s) => {
      commandsRef.current = s;
    }, []);
    let g = R(() => {
      throw Error("engine: queryParams called before REPL registered builder");
    });
    let onQueryParamsChange = ce((s) => {
      g.current = s;
    }, []);
    let [m] = y(() =>
      createQueryEngine({
        run: query,
        queryParams: async (s) => g.current(),
        commands: () => toSlashCommands(commandsRef.current),
        models: () => toSdkModelInfos(getEnabledModelOptions()),
        unavailableModels: () => toSdkModelInfos(getUnavailableModelOptions()),
        agents: () => toAgentInfos(appStoreDirect.getState().agentDefinitions.activeAgents),
        account: toAccountInfo(),
        outputStyle: hasCustomOutputStyle(),
        mcpServers: () => mcpServerStatusSnapshots(appStoreDirect.getState().mcp.clients),
        ambient: buildSystemInitFields,
        initialModel: () => {
          let state = appStoreDirect.getState();
          return parseUserSpecifiedModel(
            state.mainLoopModelForSession ?? state.mainLoopModel ?? getDefaultMainLoopModelSetting(),
          );
        },
        initialPermissionMode: () =>
          toExternalPermissionMode(appStoreDirect.getState().toolPermissionContext.mode),
        hostOwnsPermissionMode: true,
        hostOwnsModel: true,
      }),
    );
    P(() => () => m.close(), [m]);
    return jsxProd_default(REPL, {
      ...r,
      engine: m,
      onCommandsChange,
      onQueryParamsChange,
    });
  }
  let {
    session,
    storageV5,
    credentials,
    fleetNudgeStore = new FleetNudgeStore({
      storageV5,
    }),
  } = t;
  let messageQueue = createReplMessageQueue(storageV5);
  await armFullscreenBootCanary({
    onHealthy: () => persistFullscreenTrial(storageV5),
    storageV5,
  });
  let store = adoptEngineForLauncher(session, t.initialState, (r) =>
    onChangeAppState(r, session, storageV5, credentials),
  );
  try {
    await l(
      n,
      jsxProd_default(AppRoot, {
        session,
        storageV5,
        messageQueue,
        store,
        fleetNudgeStore,
        sessionHooks: t.sessionHooks,
        writesExitHandoff: true,
        getFpsMetrics: t.getFpsMetrics,
        stats: t.stats,
        keybindings: false,
        children: jsxProd_default(S, {
          ...p,
        }),
      }),
      session,
      storageV5,
      credentials,
    );
  } catch (error) {
    await recordFullscreenRenderFailure().catch(() => false);
    throw error;
  }
}
export { launchSessionRepl };
