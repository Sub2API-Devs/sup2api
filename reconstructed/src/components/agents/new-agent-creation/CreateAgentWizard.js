/**
 * components/agents/new-agent-creation/CreateAgentWizard.tsx
 *
 * 新建子代理向导入口；本模块实际字符串为 "Set up Amazon Bedrock"，疑似匹配错误。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/agents/new-agent-creation/CreateAgentWizard.tsx
 * pieces: chunk-sx9xc5ee.js (3)
 * attribution: file-last-pair 1, layout 1, fingerprint 1
 */
import {
  BedrockAuthMethodStep,
  BedrockAccessKeysStep,
} from "../../providerSetup/bedrock/BedrockCredentialsStep.js";
import {
  BedrockProfileStep,
  BedrockVerifyStep,
  BedrockModelCheckStep,
} from "../../providerSetup/bedrock/bedrockVerify.js";
import { GenerateStep } from "./wizard-steps/GenerateStep.js";
import { DescriptionStep } from "./wizard-steps/DescriptionStep.js";
import { BedrockSaveStep } from "../../providerSetup/bedrock/BedrockSaveStep.js";
import { w } from "../../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../../runtime/bun-runtime.js";
import { e } from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { WizardProvider } from "../../wizard/WizardProvider.js";

//@ chunk-sx9xc5ee.js:23427-23442 file-last-pair
function Mo() {}
//@ chunk-sx9xc5ee.js:23442-23475 layout
var fr = [
  BedrockAuthMethodStep,
  BedrockProfileStep,
  GenerateStep,
  BedrockAccessKeysStep,
  DescriptionStep,
  BedrockVerifyStep,
  BedrockModelCheckStep,
  BedrockSaveStep,
];
//@ chunk-sx9xc5ee.js:23475-23866 fingerprint = CreateAgentWizard (0.552)
function CreateAgentWizard(t0) {
  let $ = w(7),
    { onComplete: onComplete, onCancel: onCancel, exitOnCtrlCD: exitOnCtrlCD } = t0,
    m;
  if ($[0] !== onComplete) ((m = { onComplete: onComplete }), ($[0] = onComplete), ($[1] = m));
  else m = $[1];
  let g;
  if ($[2] === MEMO_CACHE_SENTINEL) ((g = {}), ($[2] = g));
  else g = $[2];
  let h;
  if ($[3] !== exitOnCtrlCD || $[4] !== onCancel || $[5] !== m)
    ((h = e(WizardProvider, {
      steps: fr,
      stepProps: m,
      initialData: g,
      onComplete: Mo,
      onCancel: onCancel,
      exitOnCtrlCD: exitOnCtrlCD,
      title: "Set up Amazon Bedrock",
      showStepCounter: !1,
    })),
      ($[3] = exitOnCtrlCD),
      ($[4] = onCancel),
      ($[5] = m),
      ($[6] = h));
  else h = $[6];
  return h;
}

export { CreateAgentWizard };
