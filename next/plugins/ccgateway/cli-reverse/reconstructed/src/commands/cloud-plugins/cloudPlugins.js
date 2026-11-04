/**
 * commands/cloud-plugins/cloudPlugins.ts
 *
 * 2.1.316 新增：云插件决策。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-n30mmv2p.js (3)
 * attribution: placement 3
 */
import {
  readCloudPluginsConsent,
  cloudPluginsConsentFilePath,
  loadCloudPluginsDeclaration,
  collectPluginForwardingInputs,
  resolveCloudPluginsConsent,
  writeCloudPluginsConsent,
} from "../../cli/headlessCloud/cloudPlugins.js";
import { deviceProofStateRegistry } from "../../utils/hooks/deviceHooks/contentDigest.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { ModelStep } from "../../components/agents/new-agent-creation/wizard-steps/ModelStep.js";
import { stripInvisibleChars } from "../../utils/invisibleChars.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";

//@ chunk-n30mmv2p.js:16519-16742 placement
/**
 * /cloud-plugins 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
var callCloudPluginsCommand = async (onDone, context) => {
  let deps = readCloudPluginsConsent(context.storageV5);
  let memory = deviceProofStateRegistry.of(context.session.host);
  let cloudPluginCounts = await readCloudPluginCounts(context.storageV5);
  return jsxProd_default(ModelStep, {
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
//@ chunk-n30mmv2p.js:16742-16982 placement
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
//@ chunk-n30mmv2p.js:16982-18572 placement
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
