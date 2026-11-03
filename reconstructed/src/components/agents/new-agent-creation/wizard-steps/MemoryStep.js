/**
 * components/agents/new-agent-creation/wizard-steps/MemoryStep.tsx
 *
 * 向导记忆步骤；实际内容为 gcloud 项目选择（疑似匹配错误）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/agents/new-agent-creation/wizard-steps/MemoryStep.tsx
 * pieces: chunk-y6fv30yg.js (1)
 * attribution: callgraph-fingerprint 1
 */
import { w } from "../../../../../vendor/react/compiler-runtime.js";
import { Qr, y } from "../../../../../vendor/react/cjs/react.production.js";
import { useWizard } from "../../../wizard/useWizard.js";
import { Le, listItem, MANUAL_PROJECT_VALUE } from "../../../vertexSetup/vertexCredentials.js";
import { useKeybinding } from "../../../../keybindings/useKeybinding.js";
import { VERTEX_WIZARD_STEPS } from "../../../vertexSetup/VertexSetupWizard.js";
import { plural } from "../../../../utils/stringUtils.js";
import { r, e } from "../../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../../../ink/components/Text.js";
import { MEMO_CACHE_SENTINEL } from "../../../../../runtime/bun-runtime.js";
import { OrderedListWithItem } from "../../../CustomSelect/selectTable.js";
import { WizardDialogLayout } from "../../../wizard/WizardDialogLayout.js";
import { Byline } from "../../../design-system/Byline.js";
import { KeyboardShortcutHint } from "../../../design-system/KeyboardShortcutHint.js";
import { ConfigurableShortcutHint } from "../../../ConfigurableShortcutHint.js";
import { TextInput } from "../../../TextInput.js";
import { ErrorText } from "../../../ErrorText.js";

//@ chunk-y6fv30yg.js:11359-14249 callgraph-fingerprint = MemoryStep (0.315)
function MemoryStep(o) {
  let $ = w(48),
    { projectsPromise: projectsPromise } = o,
    c = Qr(projectsPromise),
    {
      goBack: goBack,
      goToStep: goToStep,
      updateWizardData: updateWizardData,
      wizardData: wizardData,
    } = useWizard(),
    f = c.length > Le,
    k;
  if ($[0] !== c || $[1] !== wizardData.projectId)
    ((k = wizardData.projectId && !c.includes(wizardData.projectId)),
      ($[0] = c),
      ($[1] = wizardData.projectId),
      ($[2] = k));
  else k = $[2];
  let g = Boolean(k),
    [_, A] = y(c.length === 0 || f || g),
    [d, D] = y(wizardData.projectId ?? ""),
    [x, T] = y(d.length),
    [C, E] = y(null);
  const v = _ ? "Settings" : "Confirmation";
  let b;
  if ($[3] !== v) ((b = { context: v }), ($[3] = v), ($[4] = b));
  else b = $[4];
  useKeybinding("confirm:no", goBack, b);
  let W;
  if ($[5] !== goToStep || $[6] !== updateWizardData)
    ((W = (Y) => {
      (updateWizardData({ projectId: Y }), goToStep(VERTEX_WIZARD_STEPS.REGION));
    }),
      ($[5] = goToStep),
      ($[6] = updateWizardData),
      ($[7] = W));
  else W = $[7];
  let F = W;
  if (!_) {
    const J = c.length;
    let N;
    if ($[8] !== c.length) ((N = plural(c.length, "project")), ($[8] = c.length), ($[9] = N));
    else N = $[9];
    let G;
    if ($[10] !== c.length || $[11] !== N)
      ((G = r(Text, { dimColor: !0, children: ["Found ", J, " ", N, " in your gcloud configurations."] })),
        ($[10] = c.length),
        ($[11] = N),
        ($[12] = G));
    else G = $[12];
    let B;
    if ($[13] !== c || $[14] !== wizardData.projectId)
      ((B = c.indexOf(wizardData.projectId ?? "")), ($[13] = c), ($[14] = wizardData.projectId), ($[15] = B));
    else B = $[15];
    const max = Math.max(0, B);
    let z;
    if ($[16] !== c || $[17] !== F)
      ((z = (value) => {
        let it = c[value];
        if (it === void 0) A(!0);
        else F(it);
      }),
        ($[16] = c),
        ($[17] = F),
        ($[18] = z));
    else z = $[18];
    let M;
    if ($[19] !== c) ((M = c.map(listItem)), ($[19] = c), ($[20] = M));
    else M = $[20];
    let X;
    if ($[21] === MEMO_CACHE_SENTINEL)
      ((X = e(OrderedListWithItem.Item, { label: "Type a different project\u2026" }, MANUAL_PROJECT_VALUE)),
        ($[21] = X));
    else X = $[21];
    let Z;
    if ($[22] !== z || $[23] !== M || $[24] !== max)
      ((Z = r(OrderedListWithItem, { defaultFocusIndex: max, onSelect: z, children: [M, X] })),
        ($[22] = z),
        ($[23] = M),
        ($[24] = max),
        ($[25] = Z));
    else Z = $[25];
    let nt;
    if ($[26] !== Z || $[27] !== G)
      ((nt = e(WizardDialogLayout, {
        subtitle: "GCP project",
        children: r(Box, { flexDirection: "column", gap: 1, children: [G, Z] }),
      })),
        ($[26] = Z),
        ($[27] = G),
        ($[28] = nt));
    else nt = $[28];
    return nt;
  }
  let J;
  if ($[29] !== F || $[30] !== d)
    ((J = () => {
      let trimmed = d.trim();
      if (!trimmed) {
        E("Project ID is required");
        return;
      }
      (E(null), F(trimmed));
    }),
      ($[29] = F),
      ($[30] = d),
      ($[31] = J));
  else J = $[31];
  let Ae = J,
    N;
  if ($[32] === MEMO_CACHE_SENTINEL)
    ((N = r(Byline, {
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
      ($[32] = N));
  else N = $[32];
  let G;
  if ($[33] === MEMO_CACHE_SENTINEL)
    ((G = e(Text, { children: "The project where Vertex AI is enabled." })), ($[33] = G));
  else G = $[33];
  let B;
  if ($[34] !== c.length || $[35] !== f)
    ((B =
      f && r(Text, { dimColor: !0, children: ["Found ", c.length, " projects \u2014 too many to list."] })),
      ($[34] = c.length),
      ($[35] = f),
      ($[36] = B));
  else B = $[36];
  let H;
  if ($[37] === MEMO_CACHE_SENTINEL)
    ((H = e(Text, {
      dimColor: !0,
      children: "Find it with `gcloud config get-value project` or in the GCP console header.",
    })),
      ($[37] = H));
  else H = $[37];
  let z;
  if ($[38] !== x || $[39] !== Ae || $[40] !== d)
    ((z = e(Box, {
      marginTop: 1,
      children: e(TextInput, {
        value: d,
        onChange: D,
        onSubmit: Ae,
        placeholder: "my-gcp-project",
        columns: 60,
        cursorOffset: x,
        onChangeCursorOffset: T,
        focus: !0,
        showCursor: !0,
      }),
    })),
      ($[38] = x),
      ($[39] = Ae),
      ($[40] = d),
      ($[41] = z));
  else z = $[41];
  let M;
  if ($[42] !== C)
    ((M = C && e(Box, { marginTop: 1, children: e(ErrorText, { error: C }) })), ($[42] = C), ($[43] = M));
  else M = $[43];
  let X;
  if ($[44] !== z || $[45] !== M || $[46] !== B)
    ((X = e(WizardDialogLayout, {
      subtitle: "GCP project ID",
      footerText: N,
      children: r(Box, { flexDirection: "column", children: [G, B, H, z, M] }),
    })),
      ($[44] = z),
      ($[45] = M),
      ($[46] = B),
      ($[47] = X));
  else X = $[47];
  return X;
}

export { MemoryStep };
