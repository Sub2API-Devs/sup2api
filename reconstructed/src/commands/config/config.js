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
import { j, R, P } from "../../../vendor/react/cjs/react.production.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
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
j();
/**
 * /config 命令：无参数时打开设置界面，有 key=value 时直接设置。
 */
//@ chunk-ak1qv1dp.js:17281-17856 placement
var call = async (onDone, context, args) => {
  let r = args?.trim() || "";
  if (!r)
    return e(Settings, {
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
      { display: "system" },
    );
    return;
  }
  let a = parseConfigShorthand(r);
  if (!a) {
    onDone(`Expected key=value, got "${sanitizeTelemetryString(r)}". Run /config to open settings.`, {
      display: "system",
    });
    return;
  }
  return e(ShowHelp, { pairs: a, caller: context, onDone: onDone });
};
//@ chunk-ak1qv1dp.js:17856-18207 placement = ShowHelp (0.383)
function ShowHelp(t0) {
  let C = w(6),
    { pairs: pairs, caller: caller, onDone: onDone } = t0,
    [, o] = useTheme(),
    a = R(!1),
    f,
    u;
  if (C[0] !== caller || C[1] !== onDone || C[2] !== pairs || C[3] !== o)
    ((f = () => {
      if (a.current) {
        return;
      }
      ((a.current = !0),
        applyConfigShorthand(pairs, caller, { setTheme: o }).then((h) =>
          onDone(
            h.map((S) => collapseShorthandResultOffBox(S, isBridgeOrTransport(caller.session))).join(`
`),
            { display: "system" },
          ),
        ));
    }),
      (u = [pairs, caller, onDone, o]),
      (C[0] = caller),
      (C[1] = onDone),
      (C[2] = pairs),
      (C[3] = o),
      (C[4] = f),
      (C[5] = u));
  else ((f = C[4]), (u = C[5]));
  return (P(f, u), null);
}
//@ chunk-q8cyy466.js:17324-17644 fingerprint = call (0.717)
var call_2 = async (o, t, g, l) => {
  let i = isVimModeEnabled(l);
  return r(Box, {
    flexDirection: "column",
    children: [
      e(Text, { color: "suggestion", children: i }),
      e(Settings, {
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
