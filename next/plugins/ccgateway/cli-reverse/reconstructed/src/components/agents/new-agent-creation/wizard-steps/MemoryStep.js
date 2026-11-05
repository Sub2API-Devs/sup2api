/**
 * components/agents/new-agent-creation/wizard-steps/MemoryStep.tsx
 *
 * 向导记忆步骤；实际内容为 gcloud 项目选择（疑似匹配错误）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/agents/new-agent-creation/wizard-steps/MemoryStep.tsx
 * pieces: chunk-3qyfks39.js (1)
 * attribution: callgraph-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { useMemoCache } from "../../../../../vendor/react/compiler-runtime.js";
import { use, useState } from "../../../../../vendor/react/cjs/react.production.js";
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

//@ chunk-3qyfks39.js:11359-14249 callgraph-fingerprint (2.1.88 match: MemoryStep, 0.314)
function MemoryStep(props) {
  let $ = useMemoCache(48);
  let { projectsPromise } = props;
  let projects = use(projectsPromise);
  let { goBack, goToStep, updateWizardData, wizardData } = useWizard();
  let tooManyProjects = projects.length > MAX_ACCOUNT_OPTIONS;
  let savedProjectMissing;
  if ($[0] !== projects || $[1] !== wizardData.projectId) {
    savedProjectMissing = wizardData.projectId && !projects.includes(wizardData.projectId);
    $[0] = projects;
    $[1] = wizardData.projectId;
    $[2] = savedProjectMissing;
  } else savedProjectMissing = $[2];
  let needsManualEntry = Boolean(savedProjectMissing);
  let [manualMode, setManualMode] = useState(projects.length === 0 || tooManyProjects || needsManualEntry);
  let [projectId, setProjectId] = useState(wizardData.projectId ?? "");
  let [cursorOffset, setCursorOffset] = useState(projectId.length);
  let [error, setError] = useState(null);
  const context = manualMode ? "Settings" : "Confirmation";
  let keybindingsContext;
  if ($[3] !== context) {
    keybindingsContext = {
      context,
    };
    $[3] = context;
    $[4] = keybindingsContext;
  } else keybindingsContext = $[4];
  useKeybinding("confirm:no", goBack, keybindingsContext);
  let commitProject;
  if ($[5] !== goToStep || $[6] !== updateWizardData) {
    commitProject = (projectId) => {
      updateWizardData({
        projectId,
      });
      goToStep(VERTEX_WIZARD_STEPS_2.REGION);
    };
    $[5] = goToStep;
    $[6] = updateWizardData;
    $[7] = commitProject;
  } else commitProject = $[7];
  let handleProject = commitProject;
  if (!manualMode) {
    const projectCount = projects.length;
    let projectWord;
    if ($[8] !== projects.length) {
      projectWord = plural(projects.length, "project");
      $[8] = projects.length;
      $[9] = projectWord;
    } else projectWord = $[9];
    let foundLine;
    if ($[10] !== projects.length || $[11] !== projectWord) {
      foundLine = jsxProd_default_2(Text, {
        dimColor: true,
        children: ["Found ", projectCount, " ", projectWord, " in your gcloud configurations."],
      });
      $[10] = projects.length;
      $[11] = projectWord;
      $[12] = foundLine;
    } else foundLine = $[12];
    let defaultIndex;
    if ($[13] !== projects || $[14] !== wizardData.projectId) {
      defaultIndex = projects.indexOf(wizardData.projectId ?? "");
      $[13] = projects;
      $[14] = wizardData.projectId;
      $[15] = defaultIndex;
    } else defaultIndex = $[15];
    const defaultFocusIndex = Math.max(0, defaultIndex);
    let onSelect;
    if ($[16] !== projects || $[17] !== handleProject) {
      onSelect = (value) => {
        let project = projects[value];
        if (project === undefined) setManualMode(true);
        else handleProject(project);
      };
      $[16] = projects;
      $[17] = handleProject;
      $[18] = onSelect;
    } else onSelect = $[18];
    let projectItems;
    if ($[19] !== projects) {
      projectItems = projects.map(listItem);
      $[19] = projects;
      $[20] = projectItems;
    } else projectItems = $[20];
    let manualItem;
    if ($[21] === MEMO_CACHE_SENTINEL) {
      manualItem = jsxProd_default(
        OrderedListWithItem.Item,
        {
          label: "Type a different project\u2026",
        },
        MANUAL_PROJECT_VALUE,
      );
      $[21] = manualItem;
    } else manualItem = $[21];
    let projectList;
    if ($[22] !== onSelect || $[23] !== projectItems || $[24] !== defaultFocusIndex) {
      projectList = jsxProd_default_2(OrderedListWithItem, {
        defaultFocusIndex,
        onSelect,
        children: [projectItems, manualItem],
      });
      $[22] = onSelect;
      $[23] = projectItems;
      $[24] = defaultFocusIndex;
      $[25] = projectList;
    } else projectList = $[25];
    let selectLayout;
    if ($[26] !== projectList || $[27] !== foundLine) {
      selectLayout = jsxProd_default(WizardDialogLayout, {
        subtitle: "GCP project",
        children: jsxProd_default_2(Box, {
          flexDirection: "column",
          gap: 1,
          children: [foundLine, projectList],
        }),
      });
      $[26] = projectList;
      $[27] = foundLine;
      $[28] = selectLayout;
    } else selectLayout = $[28];
    return selectLayout;
  }
  let handleSubmit;
  if ($[29] !== handleProject || $[30] !== projectId) {
    handleSubmit = () => {
      let trimmed = projectId.trim();
      if (!trimmed) {
        setError("Project ID is required");
        return;
      }
      setError(null);
      handleProject(trimmed);
    };
    $[29] = handleProject;
    $[30] = projectId;
    $[31] = handleSubmit;
  } else handleSubmit = $[31];
  let onSubmit = handleSubmit;
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
  let introText;
  if ($[33] === MEMO_CACHE_SENTINEL) {
    introText = jsxProd_default(Text, {
      children: "The project where Vertex AI is enabled.",
    });
    $[33] = introText;
  } else introText = $[33];
  let tooManyLine;
  if ($[34] !== projects.length || $[35] !== tooManyProjects) {
    tooManyLine =
      tooManyProjects &&
      jsxProd_default_2(Text, {
        dimColor: true,
        children: ["Found ", projects.length, " projects \u2014 too many to list."],
      });
    $[34] = projects.length;
    $[35] = tooManyProjects;
    $[36] = tooManyLine;
  } else tooManyLine = $[36];
  let findHint;
  if ($[37] === MEMO_CACHE_SENTINEL) {
    findHint = jsxProd_default(Text, {
      dimColor: true,
      children: "Find it with `gcloud config get-value project` or in the GCP console header.",
    });
    $[37] = findHint;
  } else findHint = $[37];
  let inputBox;
  if ($[38] !== cursorOffset || $[39] !== onSubmit || $[40] !== projectId) {
    inputBox = jsxProd_default(Box, {
      marginTop: 1,
      children: jsxProd_default(TextInput, {
        value: projectId,
        onChange: setProjectId,
        onSubmit,
        placeholder: "my-gcp-project",
        columns: 60,
        cursorOffset,
        onChangeCursorOffset: setCursorOffset,
        focus: true,
        showCursor: true,
      }),
    });
    $[38] = cursorOffset;
    $[39] = onSubmit;
    $[40] = projectId;
    $[41] = inputBox;
  } else inputBox = $[41];
  let errorBox;
  if ($[42] !== error) {
    errorBox =
      error &&
      jsxProd_default(Box, {
        marginTop: 1,
        children: jsxProd_default(ErrorText, {
          error,
        }),
      });
    $[42] = error;
    $[43] = errorBox;
  } else errorBox = $[43];
  let layout;
  if ($[44] !== inputBox || $[45] !== errorBox || $[46] !== tooManyLine) {
    layout = jsxProd_default(WizardDialogLayout, {
      subtitle: "GCP project ID",
      footerText,
      children: jsxProd_default_2(Box, {
        flexDirection: "column",
        children: [introText, tooManyLine, findHint, inputBox, errorBox],
      }),
    });
    $[44] = inputBox;
    $[45] = errorBox;
    $[46] = tooManyLine;
    $[47] = layout;
  } else layout = $[47];
  return layout;
}
export { MemoryStep };
