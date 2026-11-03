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
  wWe,
  loadCloudPluginsDeclaration,
  collectPluginForwardingInputs,
  resolveCloudPluginsConsent,
  writeCloudPluginsConsent,
} from "../../cli/headlessCloud/cloudPlugins.js";
import { kpt } from "../../utils/hooks/deviceHooks/contentDigest.js";
import { e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { ModelStep } from "../../components/agents/new-agent-creation/wizard-steps/ModelStep.js";
import { hr } from "../../utils/invisibleChars.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";

/**
 * /cloud-plugins 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
//@ chunk-n30mmv2p.js:16519-16742 placement
var callCloudPluginsCommand = async (onDone, context) => {
  let l = readCloudPluginsConsent(context.storageV5),
    of = kpt.of(context.session.host),
    h = await readCloudPluginCounts(context.storageV5);
  return e(ModelStep, {
    forwarded: h.forwarded,
    stayed: h.stayed,
    consentLocation: hr(wWe()),
    onDone: (p) => {
      decideCloudPlugins(p, { deps: l, memory: of }).then((i) => onDone(i));
    },
  });
};
//@ chunk-n30mmv2p.js:16742-16982 placement
async function readCloudPluginCounts(u) {
  try {
    let o = loadCloudPluginsDeclaration(await collectPluginForwardingInputs(u));
    return { forwarded: o.counts.forwarded, stayed: o.dropped.length };
  } catch (error) {
    return (
      logForDebugging(
        `/cloud-plugins: could not read this machine's plugin choices (${errorMessage(error)})`,
        { level: "warn" },
      ),
      { forwarded: 0, stayed: 0 }
    );
  }
}
//@ chunk-n30mmv2p.js:16982-18572 placement
async function decideCloudPlugins(u, { deps: deps, memory: memory }) {
  let m = await resolveCloudPluginsConsent(memory.consentPin, deps).catch(() => "unset");
  logEvent("tengu_cloud_plugins_consent", { choice: fromEnum(u), previous: fromEnum(m) });
  let h =
    m === "accepted"
      ? "cloud sessions from this machine use your enabled plugins"
      : m === "declined"
        ? "your plugins stay on this machine"
        : "cloud sessions from this machine keep loading only the repository\u2019s and your organization\u2019s plugins";
  if (u === "not_now") {
    if (m === "accepted" && memory.setAsideSessions.size > 0)
      return "Nothing decided for the session attached here, which does not go by the saved answer: answer Yes or No in /cloud-plugins when you want to choose for it. Other cloud sessions from this machine use your enabled plugins.";
    return m === "unset"
      ? `Nothing decided: ${h}. Run /cloud-plugins when you want to choose.`
      : `Left as it was: ${h}.`;
  }
  if (!(await writeCloudPluginsConsent(u, deps)))
    return `Couldn\u2019t save that: ${hr(wWe())} could not be written, so nothing changed \u2014 ${h}. Check that the folder is writable, then run /cloud-plugins again.`;
  return (
    (memory.consentPin.value = Promise.resolve(u)),
    (memory.consentPin.given = !0),
    (memory.consentPin.persisted = !0),
    memory.decided.emit(u),
    `Saved: ${u === "accepted" ? "cloud sessions from this machine use your enabled plugins \u2014 the ones attached from this terminal now, new ones from the start" : m === "accepted" ? "your plugins stay on this machine from now on \u2014 nothing more is sent from this terminal, and a session already using them keeps them only until it restarts" : "your plugins stay on this machine; cloud sessions load only the repository\u2019s and your organization\u2019s plugins"}. Run /cloud-plugins again to change it.`
  );
}
