/**
 * commands/cloud-plugins/cloudPlugins.ts
 *
 * 2.1.316 新增：云插件决策。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-n55vkv52.js (5)
 * attribution: sole-consumer 2, placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useRef } from "../../../vendor/react/cjs/react.production.js";
import { truncatePathMiddle } from "../../utils/format.js";
import { plural } from "../../utils/stringUtils.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Byline } from "../../components/design-system/Byline.js";
import { KeyboardShortcutHint } from "../../components/design-system/KeyboardShortcutHint.js";
import { ConfigurableShortcutHint } from "../../components/ConfigurableShortcutHint.js";
import { Text, Box } from "../../ink/components/Text.js";
import { ModelSelector } from "../../components/agents/ModelSelector.js";
import { Dialog } from "../../components/design-system/Dialog.js";
import {
  readCloudPluginsConsent,
  cloudPluginsConsentFilePath,
  loadCloudPluginsDeclaration,
  collectPluginForwardingInputs,
  resolveCloudPluginsConsent,
  writeCloudPluginsConsent,
} from "../../cli/headlessCloud/cloudPlugins.js";
import { deviceProofStateRegistry } from "../../utils/hooks/deviceHooks/contentDigest.js";
import { stripInvisibleChars } from "../../utils/invisibleChars.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";

//@ chunk-n55vkv52.js:14980-14989 sole-consumer
var MAX_CONSENT_PATH_WIDTH = 72;
//@ chunk-n55vkv52.js:14989-17667 sole-consumer
function CloudPluginsConsentPrompt(props) {
  let $ = useMemoCache(34);
  let { forwarded, stayed, consentLocation, onDone } = props;
  let answeredRef = useRef(false);
  let pathText;
  if ($[0] !== consentLocation) {
    pathText = truncatePathMiddle(consentLocation.replace(/\s+/g, " "), MAX_CONSENT_PATH_WIDTH);
    $[0] = consentLocation;
    $[1] = pathText;
  } else pathText = $[1];
  let children = pathText;
  let finish;
  if ($[2] !== onDone) {
    finish = function model(outcome) {
      if (answeredRef.current) {
        return;
      }
      answeredRef.current = true;
      onDone(outcome);
    };
    $[2] = onDone;
    $[3] = finish;
  } else finish = $[3];
  let handleDone = finish;
  let forwardedLines;
  if ($[4] !== forwarded) {
    forwardedLines =
      forwarded > 0 ? [`${forwarded} plugin ${plural(forwarded, "choice")} would be sent`] : [];
    $[4] = forwarded;
    $[5] = forwardedLines;
  } else forwardedLines = $[5];
  let stayedLines;
  if ($[6] !== forwarded || $[7] !== stayed) {
    stayedLines =
      stayed > 0
        ? [
            `${stayed} ${forwarded > 0 ? "" : `plugin ${plural(stayed, "choice")} `}would stay on this machine (you are told which, and why, when a session starts)`,
          ]
        : [];
    $[6] = forwarded;
    $[7] = stayed;
    $[8] = stayedLines;
  } else stayedLines = $[8];
  let summaryLines;
  if ($[9] !== forwardedLines || $[10] !== stayedLines) {
    summaryLines = [...forwardedLines, ...stayedLines];
    $[9] = forwardedLines;
    $[10] = stayedLines;
    $[11] = summaryLines;
  } else summaryLines = $[11];
  let joined = summaryLines.join("; ");
  let onCancel;
  if ($[12] !== handleDone) {
    onCancel = () => handleDone("not_now");
    $[12] = handleDone;
    $[13] = onCancel;
  } else onCancel = $[13];
  let inputGuide;
  if ($[14] === MEMO_CACHE_SENTINEL) {
    inputGuide = jsxProd_default_2(Byline, {
      children: [
        jsxProd_default(KeyboardShortcutHint, {
          chord: "enter",
          action: "confirm",
        }),
        jsxProd_default(ConfigurableShortcutHint, {
          action: "confirm:no",
          context: "Confirmation",
          fallback: "Esc",
          description: "not now",
        }),
      ],
    });
    $[14] = inputGuide;
  } else inputGuide = $[14];
  let explainText;
  if ($[15] === MEMO_CACHE_SENTINEL) {
    explainText = jsxProd_default(Text, {
      children:
        "A cloud session normally loads only the repository's and your organization's plugins. If you say yes, each cloud session you start or attach to from this machine is also told which plugins you have turned on or off here for its folder \u2014 their names, and the address of any marketplace they come from on GitHub, in a git repository or at a URL \u2014 and installs the enabled ones itself. Saying yes sends nothing else: no plugin files, no other settings, no credentials, no local paths.",
    });
    $[15] = explainText;
  } else explainText = $[15];
  let currentLine;
  if ($[16] !== joined) {
    currentLine =
      joined !== "" &&
      jsxProd_default_2(Text, {
        dimColor: true,
        children: ["Right now: ", joined, "."],
      });
    $[16] = joined;
    $[17] = currentLine;
  } else currentLine = $[17];
  let answerNote;
  if ($[18] === MEMO_CACHE_SENTINEL) {
    answerNote = jsxProd_default(Text, {
      dimColor: true,
      children:
        "Yes and No are saved for this machine; run /cloud-plugins again to change your answer. Not now decides nothing. The answer is kept in:",
    });
    $[18] = answerNote;
  } else answerNote = $[18];
  let answerBox;
  if ($[19] !== children) {
    answerBox = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [
        answerNote,
        jsxProd_default(Text, {
          dimColor: true,
          children,
        }),
      ],
    });
    $[19] = children;
    $[20] = answerBox;
  } else answerBox = $[20];
  let bodyBox;
  if ($[21] !== answerBox || $[22] !== currentLine) {
    bodyBox = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [explainText, currentLine, answerBox],
    });
    $[21] = answerBox;
    $[22] = currentLine;
    $[23] = bodyBox;
  } else bodyBox = $[23];
  let options;
  if ($[24] === MEMO_CACHE_SENTINEL) {
    options = [
      {
        label: "Yes, use my enabled plugins in cloud sessions",
        value: "accepted",
      },
      {
        label: "No, keep them on this machine only",
        value: "declined",
      },
      {
        label: "Not now",
        value: "not_now",
      },
    ];
    $[24] = options;
  } else options = $[24];
  let onCancel_2;
  if ($[25] !== handleDone) {
    onCancel_2 = () => handleDone("not_now");
    $[25] = handleDone;
    $[26] = onCancel_2;
  } else onCancel_2 = $[26];
  let selector;
  if ($[27] !== handleDone || $[28] !== onCancel_2) {
    selector = jsxProd_default(ModelSelector, {
      options,
      defaultFocusValue: "not_now",
      onChange: handleDone,
      onCancel: onCancel_2,
    });
    $[27] = handleDone;
    $[28] = onCancel_2;
    $[29] = selector;
  } else selector = $[29];
  let dialog;
  if ($[30] !== bodyBox || $[31] !== selector || $[32] !== onCancel) {
    dialog = jsxProd_default_2(Dialog, {
      title: "Use your enabled plugins in cloud sessions you run from this machine?",
      onCancel,
      isCancelActive: false,
      inputGuide,
      children: [bodyBox, selector],
    });
    $[30] = bodyBox;
    $[31] = selector;
    $[32] = onCancel;
    $[33] = dialog;
  } else dialog = $[33];
  return dialog;
}
//@ chunk-n55vkv52.js:17667-17890 placement
/**
 * /cloud-plugins 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
var callCloudPluginsCommand = async (onDone, context) => {
  let deps = readCloudPluginsConsent(context.storageV5);
  let memory = deviceProofStateRegistry.of(context.session.host);
  let cloudPluginCounts = await readCloudPluginCounts(context.storageV5);
  return jsxProd_default(CloudPluginsConsentPrompt, {
    forwarded: cloudPluginCounts.forwarded,
    stayed: cloudPluginCounts.stayed,
    consentLocation: stripInvisibleChars(cloudPluginsConsentFilePath()),
    onDone: (choice) => {
      decideCloudPlugins(choice, {
        deps,
        memory,
      }).then((result) => onDone(result));
    },
  });
};
//@ chunk-n55vkv52.js:17890-18130 placement
async function readCloudPluginCounts(storage) {
  try {
    let cloudPluginsDeclaration = loadCloudPluginsDeclaration(await collectPluginForwardingInputs(storage));
    return {
      forwarded: cloudPluginsDeclaration.counts.forwarded,
      stayed: cloudPluginsDeclaration.dropped.length,
    };
  } catch (error) {
    logForDebugging(`/cloud-plugins: could not read this machine's plugin choices (${errorMessage(error)})`, {
      level: "warn",
    });
    return {
      forwarded: 0,
      stayed: 0,
    };
  }
}
//@ chunk-n55vkv52.js:18130-19720 placement
async function decideCloudPlugins(choice, { deps, memory }) {
  let consent = await resolveCloudPluginsConsent(memory.consentPin, deps).catch(() => "unset");
  logEvent("tengu_cloud_plugins_consent", {
    choice: fromEnum(choice),
    previous: fromEnum(consent),
  });
  let lines =
    consent === "accepted"
      ? "cloud sessions from this machine use your enabled plugins"
      : consent === "declined"
        ? "your plugins stay on this machine"
        : "cloud sessions from this machine keep loading only the repository\u2019s and your organization\u2019s plugins";
  if (choice === "not_now") {
    if (consent === "accepted" && memory.setAsideSessions.size > 0)
      return "Nothing decided for the session attached here, which does not go by the saved answer: answer Yes or No in /cloud-plugins when you want to choose for it. Other cloud sessions from this machine use your enabled plugins.";
    return consent === "unset"
      ? `Nothing decided: ${lines}. Run /cloud-plugins when you want to choose.`
      : `Left as it was: ${lines}.`;
  }
  if (!(await writeCloudPluginsConsent(choice, deps)))
    return `Couldn\u2019t save that: ${stripInvisibleChars(cloudPluginsConsentFilePath())} could not be written, so nothing changed \u2014 ${lines}. Check that the folder is writable, then run /cloud-plugins again.`;
  memory.consentPin.value = Promise.resolve(choice);
  memory.consentPin.given = true;
  memory.consentPin.persisted = true;
  memory.decided.emit(choice);
  return `Saved: ${choice === "accepted" ? "cloud sessions from this machine use your enabled plugins \u2014 the ones attached from this terminal now, new ones from the start" : consent === "accepted" ? "your plugins stay on this machine from now on \u2014 nothing more is sent from this terminal, and a session already using them keeps them only until it restarts" : "your plugins stay on this machine; cloud sessions load only the repository\u2019s and your organization\u2019s plugins"}. Run /cloud-plugins again to change it.`;
}
export { callCloudPluginsCommand, decideCloudPlugins };
