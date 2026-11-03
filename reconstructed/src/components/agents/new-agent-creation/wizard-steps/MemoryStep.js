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
import {
  MAX_ACCOUNT_OPTIONS,
  listItem,
  MANUAL_PROJECT_VALUE,
} from "../../../vertexSetup/vertexCredentials.js";
import { useKeybinding } from "../../../../keybindings/useKeybinding.js";
import { VERTEX_WIZARD_STEPS_2 } from "../../../vertexSetup/VertexSetupWizard.js";
import { plural } from "../../../../utils/stringUtils.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
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
function MemoryStep(props) {
  let $ = w(48);
  let { projectsPromise } = props;
  let c = Qr(projectsPromise);
  let { goBack, goToStep, updateWizardData, wizardData } = useWizard();
  let f = c.length > MAX_ACCOUNT_OPTIONS;
  let k;
  if ($[0] !== c || $[1] !== wizardData.projectId) {
    k = wizardData.projectId && !c.includes(wizardData.projectId);
    $[0] = c;
    $[1] = wizardData.projectId;
    $[2] = k;
  } else k = $[2];
  let g = Boolean(k);
  let [_, A] = y(c.length === 0 || f || g);
  let [projectId, setProjectId] = y(wizardData.projectId ?? "");
  let [x, T] = y(projectId.length);
  let [C, E] = y(null);
  const context = _ ? "Settings" : "Confirmation";
  let b;
  if ($[3] !== context) {
    b = {
      context,
    };
    $[3] = context;
    $[4] = b;
  } else b = $[4];
  useKeybinding("confirm:no", goBack, b);
  let W;
  if ($[5] !== goToStep || $[6] !== updateWizardData) {
    W = (projectId) => {
      updateWizardData({
        projectId,
      });
      goToStep(VERTEX_WIZARD_STEPS_2.REGION);
    };
    $[5] = goToStep;
    $[6] = updateWizardData;
    $[7] = W;
  } else W = $[7];
  let F = W;
  if (!_) {
    const J = c.length;
    let N;
    if ($[8] !== c.length) {
      N = plural(c.length, "project");
      $[8] = c.length;
      $[9] = N;
    } else N = $[9];
    let G;
    if ($[10] !== c.length || $[11] !== N) {
      G = jsxProd_default_2(Text, {
        dimColor: true,
        children: ["Found ", J, " ", N, " in your gcloud configurations."],
      });
      $[10] = c.length;
      $[11] = N;
      $[12] = G;
    } else G = $[12];
    let B;
    if ($[13] !== c || $[14] !== wizardData.projectId) {
      B = c.indexOf(wizardData.projectId ?? "");
      $[13] = c;
      $[14] = wizardData.projectId;
      $[15] = B;
    } else B = $[15];
    const defaultFocusIndex = Math.max(0, B);
    let onSelect;
    if ($[16] !== c || $[17] !== F) {
      onSelect = (value) => {
        let it = c[value];
        if (it === undefined) A(true);
        else F(it);
      };
      $[16] = c;
      $[17] = F;
      $[18] = onSelect;
    } else onSelect = $[18];
    let M;
    if ($[19] !== c) {
      M = c.map(listItem);
      $[19] = c;
      $[20] = M;
    } else M = $[20];
    let X;
    if ($[21] === MEMO_CACHE_SENTINEL) {
      X = jsxProd_default(
        OrderedListWithItem.Item,
        {
          label: "Type a different project\u2026",
        },
        MANUAL_PROJECT_VALUE,
      );
      $[21] = X;
    } else X = $[21];
    let Z;
    if ($[22] !== onSelect || $[23] !== M || $[24] !== defaultFocusIndex) {
      Z = jsxProd_default_2(OrderedListWithItem, {
        defaultFocusIndex,
        onSelect,
        children: [M, X],
      });
      $[22] = onSelect;
      $[23] = M;
      $[24] = defaultFocusIndex;
      $[25] = Z;
    } else Z = $[25];
    let nt;
    if ($[26] !== Z || $[27] !== G) {
      nt = jsxProd_default(WizardDialogLayout, {
        subtitle: "GCP project",
        children: jsxProd_default_2(Box, {
          flexDirection: "column",
          gap: 1,
          children: [G, Z],
        }),
      });
      $[26] = Z;
      $[27] = G;
      $[28] = nt;
    } else nt = $[28];
    return nt;
  }
  let J;
  if ($[29] !== F || $[30] !== projectId) {
    J = () => {
      let trimmed = projectId.trim();
      if (!trimmed) {
        E("Project ID is required");
        return;
      }
      E(null);
      F(trimmed);
    };
    $[29] = F;
    $[30] = projectId;
    $[31] = J;
  } else J = $[31];
  let onSubmit = J;
  let footerText;
  if ($[32] === MEMO_CACHE_SENTINEL) {
    footerText = jsxProd_default_2(Byline, {
      children: [
        jsxProd_default(KeyboardShortcutHint, {
          chord: "enter",
          action: "continue",
        }),
        jsxProd_default(ConfigurableShortcutHint, {
          action: "confirm:no",
          context: "Settings",
          fallback: "Esc",
          description: "go back",
        }),
      ],
    });
    $[32] = footerText;
  } else footerText = $[32];
  let G;
  if ($[33] === MEMO_CACHE_SENTINEL) {
    G = jsxProd_default(Text, {
      children: "The project where Vertex AI is enabled.",
    });
    $[33] = G;
  } else G = $[33];
  let B;
  if ($[34] !== c.length || $[35] !== f) {
    B =
      f &&
      jsxProd_default_2(Text, {
        dimColor: true,
        children: ["Found ", c.length, " projects \u2014 too many to list."],
      });
    $[34] = c.length;
    $[35] = f;
    $[36] = B;
  } else B = $[36];
  let H;
  if ($[37] === MEMO_CACHE_SENTINEL) {
    H = jsxProd_default(Text, {
      dimColor: true,
      children: "Find it with `gcloud config get-value project` or in the GCP console header.",
    });
    $[37] = H;
  } else H = $[37];
  let z;
  if ($[38] !== x || $[39] !== onSubmit || $[40] !== projectId) {
    z = jsxProd_default(Box, {
      marginTop: 1,
      children: jsxProd_default(TextInput, {
        value: projectId,
        onChange: setProjectId,
        onSubmit,
        placeholder: "my-gcp-project",
        columns: 60,
        cursorOffset: x,
        onChangeCursorOffset: T,
        focus: true,
        showCursor: true,
      }),
    });
    $[38] = x;
    $[39] = onSubmit;
    $[40] = projectId;
    $[41] = z;
  } else z = $[41];
  let M;
  if ($[42] !== C) {
    M =
      C &&
      jsxProd_default(Box, {
        marginTop: 1,
        children: jsxProd_default(ErrorText, {
          error: C,
        }),
      });
    $[42] = C;
    $[43] = M;
  } else M = $[43];
  let X;
  if ($[44] !== z || $[45] !== M || $[46] !== B) {
    X = jsxProd_default(WizardDialogLayout, {
      subtitle: "GCP project ID",
      footerText,
      children: jsxProd_default_2(Box, {
        flexDirection: "column",
        children: [G, B, H, z, M],
      }),
    });
    $[44] = z;
    $[45] = M;
    $[46] = B;
    $[47] = X;
  } else X = $[47];
  return X;
}
export { MemoryStep };
