/**
 * components/providerSetup/bedrock/BedrockCredentialsStep.tsx
 *
 * 2.1.316 新增。Bedrock 设置向导：认证方式与访问密钥步骤。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-sx9xc5ee.js (6)
 * attribution: placement 6
 */
import { j, y } from "../../../../vendor/react/cjs/react.production.js";
import { w } from "../../../../vendor/react/compiler-runtime.js";
import { useWizard } from "../../wizard/useWizard.js";
import { MEMO_CACHE_SENTINEL } from "../../../../runtime/bun-runtime.js";
import { e, r } from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { AgentsList } from "../../agents/AgentsList.js";
import { Text, Box } from "../../../ink/components/Text.js";
import { WizardDialogLayout } from "../../wizard/WizardDialogLayout.js";
import { ModelSelector } from "../../agents/ModelSelector.js";

//@ chunk-sx9xc5ee.js:1426-1430 placement
j();
/**
 * Bedrock 访问密钥表单字段：Access key ID、Secret access key（掩码）、可选 Session token（仅 STS 临时凭证需要）。
 */
//@ chunk-sx9xc5ee.js:1430-1769 placement
var ACCESS_KEY_FIELDS = [
  { type: "text", key: "accessKeyId", label: "Access key ID", placeholder: "AKIA\u2026", required: !0 },
  { type: "text", key: "secretAccessKey", label: "Secret access key", mask: "*", required: !0 },
  {
    type: "text",
    key: "sessionToken",
    label: "Session token",
    mask: "*",
    hint: () => "Only needed for temporary credentials from STS. Leave empty for long-lived keys.",
  },
];
//@ chunk-sx9xc5ee.js:1769-2744 placement
function BedrockAccessKeysStep() {
  let $ = w(16),
    {
      goBack: goBack,
      goNext: goNext,
      updateWizardData: updateWizardData,
      wizardData: wizardData,
      title: title,
    } = useWizard();
  const m = wizardData.accessKeyId ?? "",
    g = wizardData.secretAccessKey ?? "",
    h = wizardData.sessionToken ?? "";
  let B;
  if ($[0] !== m || $[1] !== g || $[2] !== h)
    ((B = { accessKeyId: m, secretAccessKey: g, sessionToken: h }),
      ($[0] = m),
      ($[1] = g),
      ($[2] = h),
      ($[3] = B));
  else B = $[3];
  let [p, A] = y(B),
    E;
  if (
    $[4] !== goNext ||
    $[5] !== updateWizardData ||
    $[6] !== p.accessKeyId ||
    $[7] !== p.secretAccessKey ||
    $[8] !== p.sessionToken
  )
    ((E = () => {
      (updateWizardData({
        accessKeyId: p.accessKeyId.trim(),
        secretAccessKey: p.secretAccessKey.trim(),
        sessionToken: p.sessionToken.trim() || void 0,
      }),
        goNext());
    }),
      ($[4] = goNext),
      ($[5] = updateWizardData),
      ($[6] = p.accessKeyId),
      ($[7] = p.secretAccessKey),
      ($[8] = p.sessionToken),
      ($[9] = E));
  else E = $[9];
  let k = E;
  const f = title ?? "Set up AWS Bedrock";
  let C;
  if ($[10] === MEMO_CACHE_SENTINEL) ((C = (v, T) => A((_) => ({ ..._, [v]: T }))), ($[10] = C));
  else C = $[10];
  let D;
  if ($[11] !== goBack || $[12] !== k || $[13] !== f || $[14] !== p)
    ((D = e(AgentsList, {
      title: f,
      subtitle: "AWS access keys",
      fields: ACCESS_KEY_FIELDS,
      values: p,
      onChange: C,
      onSubmit: k,
      onCancel: goBack,
      submitLabel: "Continue",
    })),
      ($[11] = goBack),
      ($[12] = k),
      ($[13] = f),
      ($[14] = p),
      ($[15] = D));
  else D = $[15];
  return D;
}
//@ chunk-sx9xc5ee.js:2744-2842 placement
var b = {
  AUTH_METHOD: 0,
  PROFILE: 1,
  BEARER: 2,
  ACCESS_KEY_ID: 3,
  REGION: 4,
  VERIFY: 5,
  PIN_MODELS: 6,
  CONFIRM: 7,
};
//@ chunk-sx9xc5ee.js:2842-3817 placement
function BedrockAuthMethodStep() {
  let $ = w(9),
    { goBack: goBack, goToStep: goToStep, updateWizardData: updateWizardData } = useWizard(),
    t;
  if ($[0] === MEMO_CACHE_SENTINEL)
    ((t = [
      { label: "AWS profile (SSO or named profile)", value: "profile" },
      { label: "Bedrock API key (bearer token)", value: "bearer" },
      { label: "Access key + secret", value: "accessKey" },
      { label: "Use credentials already in my environment", value: "environment" },
    ]),
      ($[0] = t));
  else t = $[0];
  let m = t,
    g;
  if ($[1] === MEMO_CACHE_SENTINEL)
    ((g = { profile: b.PROFILE, bearer: b.BEARER, accessKey: b.ACCESS_KEY_ID, environment: b.REGION }),
      ($[1] = g));
  else g = $[1];
  let h = g,
    u;
  if ($[2] !== goToStep || $[3] !== updateWizardData)
    ((u = (B) => {
      let p = B;
      (updateWizardData({ authMethod: p }), goToStep(h[p]));
    }),
      ($[2] = goToStep),
      ($[3] = updateWizardData),
      ($[4] = u));
  else u = $[4];
  let A = u,
    E;
  if ($[5] === MEMO_CACHE_SENTINEL)
    ((E = e(Text, {
      dimColor: !0,
      children:
        "Claude Code uses the standard AWS credential chain. Pick the method you already use with the AWS CLI.",
    })),
      ($[5] = E));
  else E = $[5];
  let k;
  if ($[6] !== goBack || $[7] !== A)
    ((k = e(WizardDialogLayout, {
      subtitle: "How do you authenticate to AWS?",
      children: r(Box, {
        flexDirection: "column",
        gap: 1,
        children: [E, e(ModelSelector, { options: m, onChange: A, onCancel: goBack })],
      }),
    })),
      ($[6] = goBack),
      ($[7] = A),
      ($[8] = k));
  else k = $[8];
  return k;
}
//@ chunk-sx9xc5ee.js:3817-3821 placement
j();

export { b, BedrockAuthMethodStep, BedrockAccessKeysStep };
