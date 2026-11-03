/**
 * components/workflows/WorkflowSaveDialog.tsx
 *
 * 2.1.316 新增。保存动态工作流对话框。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-axsvbsqv.js (9)
 * attribution: placement 9
 */
import { join, dirname } from "path";
import { mkdir, writeFile } from "fs/promises";
import { init_react_production, y } from "../../../vendor/react/cjs/react.production.js";
import { userWorkflowsDir, clearAllWorkflows } from "../../services/workflow/loadWorkflows.js";
import { getProjectConfigRoot } from "../../bootstrap/state.js";
import { logFeatureSad, logFeatureBad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { nearestNonHomeRoot } from "../../utils/settings/settingsStorage.js";
import { getProjectDirsUpToHome } from "../../utils/markdownConfigLoader.js";
import { slugifyWorkflowName } from "../../services/workflow/scriptFile.js";
import { isPathConfigDir } from "../../utils/envUtils.js";
import { assertDirChainReal } from "../../utils/fsSafety/atomicWriteStaging.js";
import { writeFileAtomic } from "../../utils/file.js";
import {
  getErrnoCode,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from "../../utils/errors.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { STORAGE_SPACES } from "../../utils/storage/storageSpaces.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useTheme_2 } from "../design-system/ThemeProvider.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { useProject } from "../../context/session.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { useKeybinding } from "../../keybindings/useKeybinding.js";
import { tildify } from "../../utils/path.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { Byline } from "../design-system/Byline.js";
import { TextInput } from "../TextInput.js";
import { ErrorText } from "../ErrorText.js";
import { FocusColumn } from "../design-system/FocusColumn.js";
import { Dialog } from "../design-system/Dialog.js";

//@ chunk-axsvbsqv.js:7923-7927 placement
init_react_production();
//@ chunk-axsvbsqv.js:8052-8096 placement
var NAME_CONFLICT_HINT = "Use a different name or overwrite.";
//@ chunk-axsvbsqv.js:8096-8470 placement
/**
 * 求动态工作流保存目录：用户范围用用户目录；--project-config-root 下项目范围不可用；否则用仓库根或已有工作流目录下的 .claude/workflows。
 */
async function getWorkflowSaveDir(scope, cwd) {
  if (scope === "user") return userWorkflowsDir();
  if (getProjectConfigRoot() !== null) {
    logFeatureSad("workflow_save", "project_scope_unavailable");
    throw Error(
      "Project-scope workflow saves are unavailable in a session started with --project-config-root",
    );
  }
  let l = nearestNonHomeRoot(cwd);
  if (l === null) return join(cwd, ".claude", "workflows");
  let u = (await getProjectDirsUpToHome("workflows", cwd))[0];
  if (u !== undefined) return u;
  return join(l, ".claude", "workflows");
}
//@ chunk-axsvbsqv.js:8470-9114 placement
/**
 * 保存动态工作流脚本：用户范围且有存储 v5 时走存储；项目范围先校验目录链为真实目录；按需覆盖或排他写入（已存在时报错）。
 */
async function saveDynamicWorkflow(options, storage) {
  let name = slugifyWorkflowName(options.name);
  let dir = await getWorkflowSaveDir(options.scope, options.cwd);
  let filePath = join(dir, `${name}.js`);
  if (storage !== undefined && options.scope === "user")
    return saveWorkflowToStorage(storage, name, filePath, options);
  let checkParent = options.scope !== "user" && !isPathConfigDir(dirname(dir));
  if (checkParent)
    try {
      await assertDirChainReal(dirname(dirname(dir)), dir);
    } catch (error) {
      logFeatureBad("workflow_save", "write_failed");
      throw error;
    }
  await mkdir(dir, {
    recursive: true,
    mode: 448,
  });
  try {
    if (options.overwrite)
      await writeFileAtomic(filePath, options.script, {
        encoding: "utf8",
        mode: 384,
        checkParentDir: checkParent,
      });
    else
      await writeFile(filePath, options.script, {
        encoding: "utf8",
        mode: 384,
        flag: "wx",
      });
  } catch (error) {
    if (!options.overwrite && getErrnoCode(error) === "EEXIST") {
      logFeatureSad("workflow_save", "already_exists");
      throw Error(`Dynamic workflow "${name}" already exists at ${filePath}. ${NAME_CONFLICT_HINT}`);
    }
    logFeatureBad("workflow_save", "write_failed");
    throw error;
  }
  return finishWorkflowSave(name, filePath, options);
}
//@ chunk-axsvbsqv.js:9114-9379 placement
async function finishWorkflowSave(name, path, l) {
  clearAllWorkflows();
  let { clearCommandMemoizationCaches } = await import("./chunk-aeccp9b6.js");
  clearCommandMemoizationCaches();
  logFeatureOk("workflow_save");
  logEvent("tengu_workflow_saved", {
    scope: fromEnum(l.scope),
    overwrite: l.overwrite,
    script_size_chars: l.script.length,
  });
  return {
    name,
    path,
    scope: l.scope,
  };
}
//@ chunk-axsvbsqv.js:9379-9893 placement
/**
 * 通过存储 v5 写入用户范围的工作流脚本（覆盖时原子写，否则要求不存在），失败时转换为对应错误。
 */
async function saveWorkflowToStorage(storage, name, displayPath, options) {
  let d = await storage.write(
    STORAGE_SPACES.userConfigDir("workflows", [`${name}.js`]),
    options.script,
    options.overwrite
      ? {
          mode: 384,
          publishDiscipline: "atomic",
        }
      : {
          mode: 384,
          precondition: {
            type: "ifAbsent",
          },
        },
  );
  if (!d.ok) {
    if (!options.overwrite && d.error.code === "AlreadyExists") {
      logFeatureSad("workflow_save", "already_exists");
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Dynamic workflow "${name}" already exists at ${displayPath}. ${NAME_CONFLICT_HINT}`,
        "workflow name collision",
      );
    }
    logFeatureBad("workflow_save", "write_failed");
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Workflow save failed: ${d.error.code} (${displayPath})`,
      "workflow save failed",
    );
  }
  return finishWorkflowSave(name, displayPath, options);
}
//@ chunk-axsvbsqv.js:9893-9923 placement
function selectCwd(dn) {
  return dn.cwd;
}
//@ chunk-axsvbsqv.js:9923-9978 placement
function toggleSaveScope(ho) {
  return ho === "project" ? "user" : "project";
}
//@ chunk-axsvbsqv.js:9978-13272 placement
/**
 * 保存动态工作流的对话框。
 */
function WorkflowSaveDialog(props) {
  let $ = w(54);
  let { script, defaultName, onDone } = props;
  let { storageV5 } = useTheme_2();
  let { columns } = useTerminalSize();
  let cwd = useProject(selectCwd);
  let [b, x] = y(defaultName);
  let [A, v] = y(defaultName.length);
  let [T, M] = y("project");
  let [I, N] = y(false);
  let [E, V] = y(null);
  let [J, z] = y(null);
  let B;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    B = () => {
      V(null);
      z(null);
    };
    $[0] = B;
  } else B = $[0];
  let H = B;
  let Y;
  if ($[1] === MEMO_CACHE_SENTINEL) {
    Y = (pt) => {
      x(pt);
      H();
    };
    $[1] = Y;
  } else Y = $[1];
  let onChange = Y;
  let wt;
  if (
    $[2] !== E ||
    $[3] !== cwd ||
    $[4] !== b ||
    $[5] !== onDone ||
    $[6] !== I ||
    $[7] !== T ||
    $[8] !== script ||
    $[9] !== storageV5
  ) {
    wt = () => {
      if (I) {
        return;
      }
      let trimmed = b.trim();
      if (!trimmed) {
        return;
      }
      N(true);
      z(null);
      saveDynamicWorkflow(
        {
          name: trimmed,
          scope: T,
          script,
          overwrite: E !== null,
          cwd,
        },
        storageV5,
      )
        .then((at) => {
          onDone(
            `Dynamic workflow saved to ${at.path}. Invoke as /${at.name} or Workflow({name: "${at.name}"}) in future sessions.`,
          );
        })
        .catch((error) => {
          let U = error instanceof Error ? error.message : String(error);
          if (U.includes(NAME_CONFLICT_HINT)) {
            let match = U.match(/at (.+?)\. /);
            V(match?.[1] ?? "(unknown path)");
          } else z(U);
          N(false);
        });
    };
    $[2] = E;
    $[3] = cwd;
    $[4] = b;
    $[5] = onDone;
    $[6] = I;
    $[7] = T;
    $[8] = script;
    $[9] = storageV5;
    $[10] = wt;
  } else wt = $[10];
  let onSubmit = wt;
  let rt;
  if ($[11] !== onDone) {
    rt = () => onDone();
    $[11] = onDone;
    $[12] = rt;
  } else rt = $[12];
  let W = rt;
  let G;
  if ($[13] === MEMO_CACHE_SENTINEL) {
    G = {
      context: "Settings",
      isActive: true,
    };
    $[13] = G;
  } else G = $[13];
  useKeybinding("confirm:no", W, G);
  let dt;
  if ($[14] === MEMO_CACHE_SENTINEL) {
    dt = (event) => {
      if (event.key === "tab") {
        event.preventDefault();
        M(toggleSaveScope);
        H();
      }
    };
    $[14] = dt;
  } else dt = $[14];
  let onKeyDown = dt;
  let zt;
  if ($[15] !== b) {
    zt = slugifyWorkflowName(b.trim() || "workflow");
    $[15] = b;
    $[16] = zt;
  } else zt = $[16];
  let ee = zt;
  let Rt;
  if ($[17] !== T || $[18] !== ee) {
    Rt = T === "project" ? `.claude/workflows/${ee}.js` : tildify(join(userWorkflowsDir(), `${ee}.js`));
    $[17] = T;
    $[18] = ee;
    $[19] = Rt;
  } else Rt = $[19];
  let yt = Rt;
  const Ot = T === "project" ? "Project" : "User";
  let subtitle;
  if ($[20] !== Ot || $[21] !== yt) {
    subtitle = jsxProd_default_2(Text, {
      dimColor: true,
      children: [Ot, " scope \xB7 ", yt],
    });
    $[20] = Ot;
    $[21] = yt;
    $[22] = subtitle;
  } else subtitle = $[22];
  const action = E ? "overwrite" : "save";
  let qe;
  if ($[23] !== action) {
    qe = jsxProd_default(KeyboardShortcutHint, {
      chord: "enter",
      action,
    });
    $[23] = action;
    $[24] = qe;
  } else qe = $[24];
  let sn;
  let po;
  if ($[25] === MEMO_CACHE_SENTINEL) {
    sn = jsxProd_default(KeyboardShortcutHint, {
      chord: "tab",
      action: "toggle scope",
    });
    po = jsxProd_default(KeyboardShortcutHint, {
      chord: "escape",
      action: "cancel",
    });
    $[25] = sn;
    $[26] = po;
  } else {
    sn = $[25];
    po = $[26];
  }
  let inputGuide;
  if ($[27] !== qe) {
    inputGuide = jsxProd_default_2(Byline, {
      children: [qe, sn, po],
    });
    $[27] = qe;
    $[28] = inputGuide;
  } else inputGuide = $[28];
  let fo;
  if ($[29] === MEMO_CACHE_SENTINEL) {
    fo = jsxProd_default(Text, {
      children: "Save as:",
    });
    $[29] = fo;
  } else fo = $[29];
  let an;
  if ($[30] === MEMO_CACHE_SENTINEL) {
    an = jsxProd_default(Text, {
      children: ">",
    });
    $[30] = an;
  } else an = $[30];
  const focus = !I;
  const showCursor = !I;
  let st;
  if (
    $[31] !== columns ||
    $[32] !== A ||
    $[33] !== onSubmit ||
    $[34] !== b ||
    $[35] !== focus ||
    $[36] !== showCursor
  ) {
    st = jsxProd_default_2(Box, {
      flexDirection: "row",
      gap: 1,
      marginTop: 1,
      children: [
        an,
        jsxProd_default(TextInput, {
          value: b,
          onChange,
          onSubmit,
          focus,
          showCursor,
          columns,
          cursorOffset: A,
          onChangeCursorOffset: v,
        }),
      ],
    });
    $[31] = columns;
    $[32] = A;
    $[33] = onSubmit;
    $[34] = b;
    $[35] = focus;
    $[36] = showCursor;
    $[37] = st;
  } else st = $[37];
  let Yt;
  if ($[38] !== E) {
    Yt =
      E &&
      jsxProd_default(Box, {
        marginTop: 1,
        children: jsxProd_default_2(Text, {
          color: "warning",
          children: [E, " already exists. Press Enter again to overwrite, or change the name."],
        }),
      });
    $[38] = E;
    $[39] = Yt;
  } else Yt = $[39];
  let ve;
  if ($[40] !== J) {
    ve =
      J &&
      jsxProd_default(Box, {
        marginTop: 1,
        children: jsxProd_default(ErrorText, {
          error: J,
        }),
      });
    $[40] = J;
    $[41] = ve;
  } else ve = $[41];
  let We;
  if ($[42] !== I) {
    We =
      I &&
      jsxProd_default(Box, {
        marginTop: 1,
        children: jsxProd_default(Text, {
          dimColor: true,
          children: "Saving\u2026",
        }),
      });
    $[42] = I;
    $[43] = We;
  } else We = $[43];
  let children;
  if ($[44] !== st || $[45] !== Yt || $[46] !== ve || $[47] !== We) {
    children = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [fo, st, Yt, ve, We],
    });
    $[44] = st;
    $[45] = Yt;
    $[46] = ve;
    $[47] = We;
    $[48] = children;
  } else children = $[48];
  let cn;
  if ($[49] !== W || $[50] !== subtitle || $[51] !== inputGuide || $[52] !== children) {
    cn = jsxProd_default(FocusColumn, {
      onKeyDown,
      children: jsxProd_default(Dialog, {
        title: "Save dynamic workflow",
        subtitle,
        onCancel: W,
        color: "permission",
        isCancelActive: false,
        inputGuide,
        children,
      }),
    });
    $[49] = W;
    $[50] = subtitle;
    $[51] = inputGuide;
    $[52] = children;
    $[53] = cn;
  } else cn = $[53];
  return cn;
}
export { WorkflowSaveDialog };
