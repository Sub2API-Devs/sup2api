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
import { init_react_production, R, P } from "../../../vendor/react/cjs/react.production.js";
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
import { w } from "../../../vendor/react/compiler-runtime.js";
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
  let r = args?.trim() || "";
  if (!r)
    return jsxProd_default(Settings, {
      onClose: onDone,
      storageV5: context.storageV5,
      credentials: context.credentials,
      messages: context.messages,
      mcpClients: context.options.mcpClients,
      ideInstallationStatus: context.options.ideInstallationStatus,
      defaultTab: "Config",
    });
  let lower = r.toLowerCase();
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
  let configShorthand = parseConfigShorthand(r);
  if (!configShorthand) {
    onDone(`Expected key=value, got "${sanitizeTelemetryString(r)}". Run /config to open settings.`, {
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
  let C = w(6);
  let { pairs, caller, onDone } = props;
  let [, o] = useTheme();
  let a = R(false);
  let f;
  let u;
  if (C[0] !== caller || C[1] !== onDone || C[2] !== pairs || C[3] !== o) {
    f = () => {
      if (a.current) {
        return;
      }
      a.current = true;
      applyConfigShorthand(pairs, caller, {
        setTheme: o,
      }).then((h) =>
        onDone(
          h.map((S) => collapseShorthandResultOffBox(S, isBridgeOrTransport(caller.session))).join(`
`),
          {
            display: "system",
          },
        ),
      );
    };
    u = [pairs, caller, onDone, o];
    C[0] = caller;
    C[1] = onDone;
    C[2] = pairs;
    C[3] = o;
    C[4] = f;
    C[5] = u;
  } else {
    f = C[4];
    u = C[5];
  }
  P(f, u);
  return null;
}
//@ chunk-q8cyy466.js:17324-17644 fingerprint = call (0.717)
var call_2 = async (o, t, g, l) => {
  let i = isVimModeEnabled(l);
  return jsxProd_default_2(Box, {
    flexDirection: "column",
    children: [
      jsxProd_default(Text, {
        color: "suggestion",
        children: i,
      }),
      jsxProd_default(Settings, {
        onClose: () => o(i),
        storageV5: t.storageV5,
        credentials: t.credentials,
        messages: t.messages,
        mcpClients: t.options.mcpClients,
        ideInstallationStatus: t.options.ideInstallationStatus,
        defaultTab: "Config",
      }),
    ],
  });
};
