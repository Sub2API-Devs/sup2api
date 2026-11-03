/**
 * components/vertexSetup/VertexSetupWizard.tsx
 *
 * 2.1.316 新增：Google Vertex AI 设置向导
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-y6fv30yg.js (11)
 * attribution: placement 11
 */
import { j, y, R } from "../../../vendor/react/cjs/react.production.js";
import { r, e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { Me } from "../design-system/ThemeProvider.js";
import { useWizard } from "../wizard/useWizard.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { tildify } from "../../utils/path.js";
import { getSettingsFilePathForSource, updateSettingsForSource } from "../../utils/settings/settings.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnumOpt } from "../../services/analytics/safeMetadata.js";
import { StatusIcon } from "../design-system/StatusIcon.js";
import { ErrorText } from "../ErrorText.js";
import { ConfirmSelect } from "../design-system/ConfirmSelect.js";
import { WizardDialogLayout } from "../wizard/WizardDialogLayout.js";
import { No } from "../../utils/model/modelCatalog.js";
import {
  DEFAULT_3P_SONNET_KEY,
  DEFAULT_VERTEX_OPUS_KEY,
  DEFAULT_3P_HAIKU_KEY,
  DEFAULT_3P_FABLE_KEY,
} from "../../utils/model/model.js";
import { ToolsStep } from "../agents/new-agent-creation/wizard-steps/ToolsStep.js";
import { PromptStep } from "../agents/new-agent-creation/wizard-steps/PromptStep.js";
import { VertexProjectStep, VertexModelPinsStep } from "./vertexCredentials.js";
import { TypeStep } from "../agents/new-agent-creation/wizard-steps/TypeStep.js";
import { LocationStep } from "../agents/new-agent-creation/wizard-steps/LocationStep.js";
import { WizardProvider } from "../wizard/WizardProvider.js";

//@ chunk-y6fv30yg.js:1434-1525 placement
var VERTEX_WIZARD_STEPS = {
  AUTH_METHOD: 0,
  SERVICE_ACCOUNT: 1,
  PROJECT: 2,
  REGION: 3,
  VERIFY: 4,
  PIN_MODELS: 5,
  CONFIRM: 6,
};
//@ chunk-y6fv30yg.js:2554-2558 placement
j();
//@ chunk-y6fv30yg.js:2558-2594 placement
function St(J) {
  return J[1] !== void 0;
}
//@ chunk-y6fv30yg.js:2594-2697 placement
function renderEnvAssignment(o) {
  let [N, G] = o;
  return r(Text, { children: ["  ", e(Text, { color: "suggestion", children: N }), " = ", G] }, N);
}
/**
 * 由 Vertex 向导数据生成要写入设置的 env：开启 CLAUDE_CODE_USE_VERTEX 并清掉其他提供方开关，写项目 ID、区域、服务账号密钥文件与固定的 Sonnet/Opus/Fable/Haiku 模型。
 */
//@ chunk-y6fv30yg.js:2697-3522 placement
function buildVertexEnvSettings(o) {
  let envOverrides = {
    CLAUDE_CODE_USE_VERTEX: "1",
    CLAUDE_CODE_USE_BEDROCK: void 0,
    CLAUDE_CODE_USE_FOUNDRY: void 0,
    CLAUDE_CODE_USE_ANTHROPIC_AWS: void 0,
    CLAUDE_CODE_USE_ANTHROPIC_GOOGLE_CLOUD: void 0,
    CLAUDE_CODE_USE_MANTLE: void 0,
    ANTHROPIC_VERTEX_PROJECT_ID: o.projectId,
    CLOUD_ML_REGION: o.region,
    GOOGLE_APPLICATION_CREDENTIALS: void 0,
    ANTHROPIC_DEFAULT_SONNET_MODEL: void 0,
    ANTHROPIC_DEFAULT_OPUS_MODEL: void 0,
    ANTHROPIC_DEFAULT_HAIKU_MODEL: void 0,
    ANTHROPIC_DEFAULT_FABLE_MODEL: void 0,
    ANTHROPIC_SMALL_FAST_MODEL: void 0,
  };
  if (o.authMethod === "serviceAccount") envOverrides.GOOGLE_APPLICATION_CREDENTIALS = o.keyFile;
  if (o.pinSonnet) envOverrides.ANTHROPIC_DEFAULT_SONNET_MODEL = o.pinSonnet;
  if (o.pinOpus) envOverrides.ANTHROPIC_DEFAULT_OPUS_MODEL = o.pinOpus;
  if (o.pinFable) envOverrides.ANTHROPIC_DEFAULT_FABLE_MODEL = o.pinFable;
  if (o.pinHaiku) envOverrides.ANTHROPIC_DEFAULT_HAIKU_MODEL = o.pinHaiku;
  return envOverrides;
}
//@ chunk-y6fv30yg.js:3522-5539 placement = ConfirmStep (0.161)
function ConfirmStep(t0) {
  let $ = w(30),
    { onComplete: onComplete } = t0,
    { storageV5: storageV5 } = Me(),
    { goBack: goBack, wizardData: wizardData } = useWizard(),
    [h, p] = y(null),
    u;
  if ($[0] === MEMO_CACHE_SENTINEL)
    ((u = tildify(getSettingsFilePathForSource("userSettings") ?? "~/.claude/settings.json")), ($[0] = u));
  else u = $[0];
  let k = u,
    g;
  if ($[1] !== wizardData) ((g = buildVertexEnvSettings(wizardData)), ($[1] = wizardData), ($[2] = g));
  else g = $[2];
  let _ = g,
    A;
  if ($[3] !== _) ((A = Object.entries(_).filter(St)), ($[3] = _), ($[4] = A));
  else A = $[4];
  let d = A,
    D = R(!1),
    x;
  if (
    $[5] !== _ ||
    $[6] !== onComplete ||
    $[7] !== storageV5 ||
    $[8] !== wizardData.authMethod ||
    $[9] !== wizardData.pinFable ||
    $[10] !== wizardData.pinHaiku ||
    $[11] !== wizardData.pinOpus ||
    $[12] !== wizardData.pinSonnet ||
    $[13] !== wizardData.verifiedIdentity
  )
    ((x = async () => {
      if (D.current) {
        return;
      }
      D.current = !0;
      let { error: error } = await updateSettingsForSource("userSettings", { env: _ }, void 0, storageV5);
      if (error) {
        ((D.current = !1), p(error.message));
        return;
      }
      (logEvent("tengu_vertex_setup_complete", {
        auth_method: fromEnumOpt(wizardData.authMethod),
        pinned_models: Boolean(
          wizardData.pinSonnet || wizardData.pinOpus || wizardData.pinFable || wizardData.pinHaiku,
        ),
        verified: Boolean(wizardData.verifiedIdentity),
      }),
        onComplete(
          `Vertex AI configuration saved to ${k}.${wizardData.authMethod === "adc" ? " When your ADC token expires, run `gcloud auth application-default login` \u2014 Claude Code picks up refreshed credentials automatically." : ""}`,
        ));
    }),
      ($[5] = _),
      ($[6] = onComplete),
      ($[7] = storageV5),
      ($[8] = wizardData.authMethod),
      ($[9] = wizardData.pinFable),
      ($[10] = wizardData.pinHaiku),
      ($[11] = wizardData.pinOpus),
      ($[12] = wizardData.pinSonnet),
      ($[13] = wizardData.verifiedIdentity),
      ($[14] = x));
  else x = $[14];
  let C = x,
    E;
  if ($[15] === MEMO_CACHE_SENTINEL)
    ((E = r(Text, { children: ["These will be written to ", k, " under env:"] })), ($[15] = E));
  else E = $[15];
  let v;
  if ($[16] !== d)
    ((v = e(Box, { flexDirection: "column", children: d.map(renderEnvAssignment) })),
      ($[16] = d),
      ($[17] = v));
  else v = $[17];
  let b;
  if ($[18] !== wizardData.verifiedIdentity)
    ((b =
      wizardData.verifiedIdentity &&
      r(Text, {
        dimColor: !0,
        children: [
          e(StatusIcon, { status: "success", withSpace: !0 }),
          "Verified as ",
          wizardData.verifiedIdentity,
        ],
      })),
      ($[18] = wizardData.verifiedIdentity),
      ($[19] = b));
  else b = $[19];
  let W;
  if ($[20] !== h) ((W = e(ErrorText, { error: h })), ($[20] = h), ($[21] = W));
  else W = $[21];
  let Y;
  if ($[22] !== goBack || $[23] !== C)
    ((Y = e(ConfirmSelect, { confirmLabel: "Save", cancelLabel: "Cancel", onConfirm: C, onCancel: goBack })),
      ($[22] = goBack),
      ($[23] = C),
      ($[24] = Y));
  else Y = $[24];
  let F;
  if ($[25] !== v || $[26] !== b || $[27] !== W || $[28] !== Y)
    ((F = e(WizardDialogLayout, {
      subtitle: "Confirm and save",
      children: r(Box, { flexDirection: "column", gap: 1, children: [E, v, b, W, Y] }),
    })),
      ($[25] = v),
      ($[26] = b),
      ($[27] = W),
      ($[28] = Y),
      ($[29] = F));
  else F = $[29];
  return F;
}
//@ chunk-y6fv30yg.js:5539-5644 placement
function defaultVertexModels() {
  return {
    sonnet: No[DEFAULT_3P_SONNET_KEY].vertex,
    opus: No[DEFAULT_VERTEX_OPUS_KEY].vertex,
    haiku: No[DEFAULT_3P_HAIKU_KEY].vertex,
    fable: No[DEFAULT_3P_FABLE_KEY].vertex,
  };
}
//@ chunk-y6fv30yg.js:5644-5805 placement
function knownVertexModelIds(o) {
  let l = new Set();
  for (let c of Object.values(No))
    if (c.vertex !== null && c.vertex.toLowerCase().includes(o)) l.add(c.vertex);
  return [...l].sort().reverse();
}
//@ chunk-y6fv30yg.js:19411-19426 placement
function Ar() {}
//@ chunk-y6fv30yg.js:19426-19456 placement
var ot = [ToolsStep, PromptStep, VertexProjectStep, TypeStep, LocationStep, VertexModelPinsStep, ConfirmStep];
//@ chunk-y6fv30yg.js:19456-19849 placement
function VertexSetupWizard(o) {
  let t = w(7),
    { onComplete: onComplete, onCancel: onCancel, exitOnCtrlCD: exitOnCtrlCD } = o,
    h;
  if (t[0] !== onComplete) ((h = { onComplete: onComplete }), (t[0] = onComplete), (t[1] = h));
  else h = t[1];
  let p;
  if (t[2] === MEMO_CACHE_SENTINEL) ((p = {}), (t[2] = p));
  else p = t[2];
  let f;
  if (t[3] !== exitOnCtrlCD || t[4] !== onCancel || t[5] !== h)
    ((f = e(WizardProvider, {
      steps: ot,
      stepProps: h,
      initialData: p,
      onComplete: Ar,
      onCancel: onCancel,
      exitOnCtrlCD: exitOnCtrlCD,
      title: "Set up Google Vertex AI",
      showStepCounter: !1,
    })),
      (t[3] = exitOnCtrlCD),
      (t[4] = onCancel),
      (t[5] = h),
      (t[6] = f));
  else f = t[6];
  return f;
}

export { VertexSetupWizard, VERTEX_WIZARD_STEPS, defaultVertexModels, knownVertexModelIds };
