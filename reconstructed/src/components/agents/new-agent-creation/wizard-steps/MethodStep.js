/**
 * components/agents/new-agent-creation/wizard-steps/MethodStep.tsx
 *
 * 向导方式步骤；实际内容为 AWS profile 选择（疑似匹配错误）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/agents/new-agent-creation/wizard-steps/MethodStep.tsx
 * pieces: chunk-sx9xc5ee.js (1)
 * attribution: callgraph-fingerprint 1
 */
import { w } from "../../../../../vendor/react/compiler-runtime.js";
import { Qr, y } from "../../../../../vendor/react/cjs/react.production.js";
import { useWizard } from "../../../wizard/useWizard.js";
import { qe, Do, wo, ee } from "../../../providerSetup/bedrock/bedrockVerify.js";
import { useKeybinding } from "../../../../keybindings/useKeybinding.js";
import { b } from "../../../providerSetup/bedrock/BedrockCredentialsStep.js";
import { plural } from "../../../../utils/stringUtils.js";
import { r, e } from "../../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../../../ink/components/Text.js";
import { MEMO_CACHE_SENTINEL } from "../../../../../runtime/bun-runtime.js";
import { ModelSelector } from "../../ModelSelector.js";
import { WizardDialogLayout } from "../../../wizard/WizardDialogLayout.js";
import { Byline } from "../../../design-system/Byline.js";
import { KeyboardShortcutHint } from "../../../design-system/KeyboardShortcutHint.js";
import { ConfigurableShortcutHint } from "../../../ConfigurableShortcutHint.js";
import { TextInput } from "../../../TextInput.js";
import { ErrorText } from "../../../ErrorText.js";

//@ chunk-sx9xc5ee.js:16242-19292 callgraph-fingerprint = MethodStep (0.275)
function MethodStep(o) {
  let $ = w(52),
    { profilesPromise: profilesPromise } = o,
    c = Qr(profilesPromise),
    {
      goBack: goBack,
      goToStep: goToStep,
      updateWizardData: updateWizardData,
      wizardData: wizardData,
    } = useWizard(),
    h = c.length > qe,
    B;
  if ($[0] !== c || $[1] !== wizardData.awsProfile)
    ((B = wizardData.awsProfile && !c.includes(wizardData.awsProfile)),
      ($[0] = c),
      ($[1] = wizardData.awsProfile),
      ($[2] = B));
  else B = $[2];
  let p = Boolean(B),
    [A, E] = y(c.length === 0 || h || p),
    k;
  if ($[3] !== c || $[4] !== h) ((k = h ? c.find(Do) : void 0), ($[3] = c), ($[4] = h), ($[5] = k));
  else k = $[5];
  let f = k,
    [C, v] = y(wizardData.awsProfile ?? f ?? ""),
    [T, _] = y(C.length),
    [D, W] = y(null),
    G;
  if ($[6] !== A) ((G = { context: "Settings", isActive: A }), ($[6] = A), ($[7] = G));
  else G = $[7];
  useKeybinding("confirm:no", goBack, G);
  let X;
  if ($[8] !== goToStep || $[9] !== updateWizardData)
    ((X = (_e) => {
      (updateWizardData({ awsProfile: _e }), goToStep(b.REGION));
    }),
      ($[8] = goToStep),
      ($[9] = updateWizardData),
      ($[10] = X));
  else X = $[10];
  let U = X;
  if (!A) {
    const H = c.length;
    let F;
    if ($[11] !== c.length) ((F = plural(c.length, "profile")), ($[11] = c.length), ($[12] = F));
    else F = $[12];
    let V;
    if ($[13] !== c.length || $[14] !== F)
      ((V = r(Text, {
        dimColor: !0,
        children: ["Found ", H, " ", F, " in ~/.aws/config and ~/.aws/credentials."],
      })),
        ($[13] = c.length),
        ($[14] = F),
        ($[15] = V));
    else V = $[15];
    let M;
    if ($[16] !== c) {
      const mapped = c.map(wo);
      let I;
      if ($[18] === MEMO_CACHE_SENTINEL)
        ((I = { label: "Type a different name\u2026", value: ee }), ($[18] = I));
      else I = $[18];
      M = [...mapped, I];
      (($[16] = c), ($[17] = M));
    } else M = $[17];
    let K;
    if ($[19] !== c || $[20] !== wizardData.awsProfile)
      ((K = wizardData.awsProfile && c.includes(wizardData.awsProfile) ? wizardData.awsProfile : void 0),
        ($[19] = c),
        ($[20] = wizardData.awsProfile),
        ($[21] = K));
    else K = $[21];
    let I;
    if ($[22] !== U)
      ((I = (value) => {
        if (value === ee) E(!0);
        else U(value);
      }),
        ($[22] = U),
        ($[23] = I));
    else I = $[23];
    let L;
    if ($[24] !== goBack || $[25] !== I || $[26] !== M || $[27] !== K)
      ((L = e(ModelSelector, { options: M, defaultValue: K, onChange: I, onCancel: goBack })),
        ($[24] = goBack),
        ($[25] = I),
        ($[26] = M),
        ($[27] = K),
        ($[28] = L));
    else L = $[28];
    let J;
    if ($[29] !== L || $[30] !== V)
      ((J = e(WizardDialogLayout, {
        subtitle: "AWS profile",
        children: r(Box, { flexDirection: "column", gap: 1, children: [V, L] }),
      })),
        ($[29] = L),
        ($[30] = V),
        ($[31] = J));
    else J = $[31];
    return J;
  }
  let H;
  if ($[32] !== U || $[33] !== C)
    ((H = () => {
      let trimmed = C.trim();
      if (!trimmed) {
        W("Profile name is required");
        return;
      }
      (W(null), U(trimmed));
    }),
      ($[32] = U),
      ($[33] = C),
      ($[34] = H));
  else H = $[34];
  let Te = H,
    F;
  if ($[35] === MEMO_CACHE_SENTINEL)
    ((F = r(Byline, {
      children: [
        e(KeyboardShortcutHint, { chord: "enter", action: "continue" }),
        e(ConfigurableShortcutHint, {
          action: "confirm:no",
          context: "Settings",
          fallback: "Esc",
          description: "go back",
        }),
      ],
    })),
      ($[35] = F));
  else F = $[35];
  let V;
  if ($[36] === MEMO_CACHE_SENTINEL)
    ((V = e(Text, { children: "The name from ~/.aws/config (after [profile \u2026])." })), ($[36] = V));
  else V = $[36];
  let M;
  if ($[37] !== f || $[38] !== c.length || $[39] !== h)
    ((M =
      h &&
      r(Text, {
        dimColor: !0,
        children: [
          "Found ",
          c.length,
          " profiles \u2014 too many to list.",
          f && ` Prepopulated with "${f}".`,
        ],
      })),
      ($[37] = f),
      ($[38] = c.length),
      ($[39] = h),
      ($[40] = M));
  else M = $[40];
  let K;
  if ($[41] === MEMO_CACHE_SENTINEL)
    ((K = e(Text, {
      dimColor: !0,
      children: "If this is an SSO profile, run `aws sso login --profile NAME` first.",
    })),
      ($[41] = K));
  else K = $[41];
  let I;
  if ($[42] !== T || $[43] !== Te || $[44] !== C)
    ((I = e(Box, {
      marginTop: 1,
      children: e(TextInput, {
        value: C,
        onChange: v,
        onSubmit: Te,
        placeholder: "my-bedrock-profile",
        columns: 60,
        cursorOffset: T,
        onChangeCursorOffset: _,
        focus: !0,
        showCursor: !0,
      }),
    })),
      ($[42] = T),
      ($[43] = Te),
      ($[44] = C),
      ($[45] = I));
  else I = $[45];
  let L;
  if ($[46] !== D)
    ((L = D && e(Box, { marginTop: 1, children: e(ErrorText, { error: D }) })), ($[46] = D), ($[47] = L));
  else L = $[47];
  let J;
  if ($[48] !== I || $[49] !== L || $[50] !== M)
    ((J = e(WizardDialogLayout, {
      subtitle: "AWS profile name",
      footerText: F,
      children: r(Box, { flexDirection: "column", children: [V, M, K, I, L] }),
    })),
      ($[48] = I),
      ($[49] = L),
      ($[50] = M),
      ($[51] = J));
  else J = $[51];
  return J;
}

export { MethodStep };
