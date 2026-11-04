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
import {
  init_react_production,
  useRef,
  useCallback,
  useState,
  useEffect,
} from "../vendor/react/cjs/react.production.js";
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
import { deferInit } from "../runtime/deferred-init.js";

//@ chunk-19arrzdw.js:855-859 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-19arrzdw.js:855", () => {
  init_react_production();
});
//@ chunk-19arrzdw.js:859-954 facade-exports
function launchSessionRepl(...args) {
  let { mode } = args[1].initialState.toolPermissionContext;
  syncSessionPermissionMode(mode);
  return launchRepl(...args);
}
//@ chunk-19arrzdw.js:954-2312 facade-exports
async function launchRepl(args, options, renderer, extra) {
  let { AppRoot } = await import("./components/AppRoot.js");
  let { REPL } = await import("./screens/REPL.js");
  function ReplRoot(initial) {
    let appStoreDirect = useAppStoreDirect();
    noopTrialEffect();
    let commandsRef = useRef(initial.commands);
    let onCommandsChange = useCallback((commands) => {
      commandsRef.current = commands;
    }, []);
    let queryParamsBuilder = useRef(() => {
      throw Error("engine: queryParams called before REPL registered builder");
    });
    let onQueryParamsChange = useCallback((params) => {
      queryParamsBuilder.current = params;
    }, []);
    let [engine] = useState(() =>
      createQueryEngine({
        run: query,
        queryParams: async (params) => queryParamsBuilder.current(),
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
    useEffect(() => () => engine.close(), [engine]);
    return jsxProd_default(REPL, {
      ...initial,
      engine,
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
  } = options;
  let messageQueue = createReplMessageQueue(storageV5);
  await armFullscreenBootCanary({
    onHealthy: () => persistFullscreenTrial(storageV5),
    storageV5,
  });
  let store = adoptEngineForLauncher(session, options.initialState, (nextState) =>
    onChangeAppState(nextState, session, storageV5, credentials),
  );
  try {
    await extra(
      args,
      jsxProd_default(AppRoot, {
        session,
        storageV5,
        messageQueue,
        store,
        fleetNudgeStore,
        sessionHooks: options.sessionHooks,
        writesExitHandoff: true,
        getFpsMetrics: options.getFpsMetrics,
        stats: options.stats,
        keybindings: false,
        children: jsxProd_default(ReplRoot, {
          ...renderer,
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
export { launchSessionRepl, launchRepl };
