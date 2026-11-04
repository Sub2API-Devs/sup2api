/**
 * commands/config/config.tsx
 *
 * 并入已有模块：/config 命令：无参数时打开设置界面，有 key=value 时直接设置。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/config/config.tsx
 * pieces: chunk-ak1qv1dp.js (3), chunk-q8cyy466.js (1)
 * attribution: placement 3, fingerprint 1
 */
import { init_react_production, useRef, useEffect } from "../../../vendor/react/cjs/react.production.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Settings } from "../../components/Settings/Settings.js";
import { COMMON_HELP_ARGS, COMMON_INFO_ARGS_ALIAS } from "../../constants/xml.js";
import {
  listConfigKeys,
  parseConfigShorthand,
  applyConfigShorthand,
  collapseShorthandResultOffBox,
} from "./configShorthand.js";
import { sanitizeTelemetryString } from "../../utils/sanitization.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useTheme } from "../../components/design-system/ThemeProvider.js";
import { isBridgeOrTransport } from "../../cli/transportState.js";
import { isVimModeEnabled } from "../../components/PromptInput/utils.js";
import { Box, Text } from "../../ink/components/Text.js";

//@ chunk-ak1qv1dp.js:17277-17281 placement
init_react_production();
//@ chunk-ak1qv1dp.js:17281-17856 placement
/**
 * /config 命令：无参数时打开设置界面，有 key=value 时直接设置。
 */
var call = async (onDone, context, args) => {
  let rawArgs = args?.trim() || "";
  if (!rawArgs)
    return jsxProd_default(Settings, {
      onClose: onDone,
      storageV5: context.storageV5,
      credentials: context.credentials,
      messages: context.messages,
      mcpClients: context.options.mcpClients,
      ideInstallationStatus: context.options.ideInstallationStatus,
      defaultTab: "Config",
    });
  let lower = rawArgs.toLowerCase();
  if (COMMON_HELP_ARGS.includes(lower) || COMMON_INFO_ARGS_ALIAS.includes(lower)) {
    onDone(
      `Run /config to open settings, or /config key=value to set one directly.
${listConfigKeys(context)}`,
      {
        display: "system",
      },
    );
    return;
  }
  let configShorthand = parseConfigShorthand(rawArgs);
  if (!configShorthand) {
    onDone(`Expected key=value, got "${sanitizeTelemetryString(rawArgs)}". Run /config to open settings.`, {
      display: "system",
    });
    return;
  }
  return jsxProd_default(ShowHelp, {
    pairs: configShorthand,
    caller: context,
    onDone,
  });
};
//@ chunk-ak1qv1dp.js:17856-18207 placement = ShowHelp (0.383)
function ShowHelp(props) {
  let $ = useMemoCache(6);
  let { pairs, caller, onDone } = props;
  let [, setTheme] = useTheme();
  let committed = useRef(false);
  let commit;
  let deps;
  if ($[0] !== caller || $[1] !== onDone || $[2] !== pairs || $[3] !== setTheme) {
    commit = () => {
      if (committed.current) {
        return;
      }
      committed.current = true;
      applyConfigShorthand(pairs, caller, {
        setTheme,
      }).then((results) =>
        onDone(
          results.map((result) => collapseShorthandResultOffBox(result, isBridgeOrTransport(caller.session)))
            .join(`
`),
          {
            display: "system",
          },
        ),
      );
    };
    deps = [pairs, caller, onDone, setTheme];
    $[0] = caller;
    $[1] = onDone;
    $[2] = pairs;
    $[3] = setTheme;
    $[4] = commit;
    $[5] = deps;
  } else {
    commit = $[4];
    deps = $[5];
  }
  useEffect(commit, deps);
  return null;
}
//@ chunk-q8cyy466.js:17324-17644 fingerprint = call (0.717)
var call_2 = async (onDone, storageV5, context, args) => {
  let isVimMode = isVimModeEnabled(args);
  return jsxProd_default_2(Box, {
    flexDirection: "column",
    children: [
      jsxProd_default(Text, {
        color: "suggestion",
        children: isVimMode,
      }),
      jsxProd_default(Settings, {
        onClose: () => onDone(isVimMode),
        storageV5: storageV5.storageV5,
        credentials: storageV5.credentials,
        messages: storageV5.messages,
        mcpClients: storageV5.options.mcpClients,
        ideInstallationStatus: storageV5.options.ideInstallationStatus,
        defaultTab: "Config",
      }),
    ],
  });
};
export { call, call_2 };
