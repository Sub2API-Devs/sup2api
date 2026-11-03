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
import { join, join as join_2, join as join_3, dirname } from "path";
import { mkdir, writeFile } from "fs/promises";
import { j, y } from "../../../vendor/react/cjs/react.production.js";
import { iFt, lDr } from "../../services/workflow/loadWorkflows.js";
import { getProjectConfigRoot } from "../../bootstrap/state.js";
import { logFeatureSad, logFeatureBad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { iIn } from "../../utils/settings/settingsStorage.js";
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
import { Me } from "../design-system/ThemeProvider.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { useProject } from "../../context/session.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { useKeybinding } from "../../keybindings/useKeybinding.js";
import { tildify } from "../../utils/path.js";
import { r, e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { Byline } from "../design-system/Byline.js";
import { TextInput } from "../TextInput.js";
import { ErrorText } from "../ErrorText.js";
import { FocusColumn } from "../design-system/FocusColumn.js";
import { Dialog } from "../design-system/Dialog.js";

//@ chunk-axsvbsqv.js:7923-7927 placement
j();
//@ chunk-axsvbsqv.js:8052-8096 placement
var Be = "Use a different name or overwrite.";
/**
 * 求动态工作流保存目录：用户范围用用户目录；--project-config-root 下项目范围不可用；否则用仓库根或已有工作流目录下的 .claude/workflows。
 */
//@ chunk-axsvbsqv.js:8096-8470 placement
async function getWorkflowSaveDir(o, i) {
  if (o === "user") return iFt();
  if (getProjectConfigRoot() !== null)
    throw (
      logFeatureSad("workflow_save", "project_scope_unavailable"),
      Error("Project-scope workflow saves are unavailable in a session started with --project-config-root")
    );
  let l = iIn(i);
  if (l === null) return join_3(i, ".claude", "workflows");
  let u = (await getProjectDirsUpToHome("workflows", i))[0];
  if (u !== void 0) return u;
  return join_3(l, ".claude", "workflows");
}
/**
 * 保存动态工作流脚本：用户范围且有存储 v5 时走存储；项目范围先校验目录链为真实目录；按需覆盖或排他写入（已存在时报错）。
 */
//@ chunk-axsvbsqv.js:8470-9114 placement
async function saveDynamicWorkflow(o, i) {
  let name = slugifyWorkflowName(o.name),
    dir = await getWorkflowSaveDir(o.scope, o.cwd),
    filePath = join_3(dir, `${name}.js`);
  if (i !== void 0 && o.scope === "user") return saveWorkflowToStorage(i, name, filePath, o);
  let checkParent = o.scope !== "user" && !isPathConfigDir(dirname(dir));
  if (checkParent)
    try {
      await assertDirChainReal(dirname(dirname(dir)), dir);
    } catch (error) {
      throw (logFeatureBad("workflow_save", "write_failed"), error);
    }
  await mkdir(dir, { recursive: !0, mode: 448 });
  try {
    if (o.overwrite)
      await writeFileAtomic(filePath, o.script, { encoding: "utf8", mode: 384, checkParentDir: checkParent });
    else await writeFile(filePath, o.script, { encoding: "utf8", mode: 384, flag: "wx" });
  } catch (error) {
    if (!o.overwrite && getErrnoCode(error) === "EEXIST")
      throw (
        logFeatureSad("workflow_save", "already_exists"),
        Error(`Dynamic workflow "${name}" already exists at ${filePath}. ${Be}`)
      );
    throw (logFeatureBad("workflow_save", "write_failed"), error);
  }
  return finishWorkflowSave(name, filePath, o);
}
//@ chunk-axsvbsqv.js:9114-9379 placement
async function finishWorkflowSave(o, i, l) {
  lDr();
  let { clearCommandMemoizationCaches: clearCommandMemoizationCaches } = await import("./chunk-aeccp9b6.js");
  return (
    clearCommandMemoizationCaches(),
    logFeatureOk("workflow_save"),
    logEvent("tengu_workflow_saved", {
      scope: fromEnum(l.scope),
      overwrite: l.overwrite,
      script_size_chars: l.script.length,
    }),
    { name: o, path: i, scope: l.scope }
  );
}
/**
 * 通过存储 v5 写入用户范围的工作流脚本（覆盖时原子写，否则要求不存在），失败时转换为对应错误。
 */
//@ chunk-axsvbsqv.js:9379-9893 placement
async function saveWorkflowToStorage(storage, name, displayPath, options) {
  let write = await storage.write(
    STORAGE_SPACES.userConfigDir("workflows", [`${name}.js`]),
    options.script,
    options.overwrite
      ? { mode: 384, publishDiscipline: "atomic" }
      : { mode: 384, precondition: { type: "ifAbsent" } },
  );
  if (!write.ok) {
    if (!options.overwrite && write.error.code === "AlreadyExists")
      throw (
        logFeatureSad("workflow_save", "already_exists"),
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `Dynamic workflow "${name}" already exists at ${displayPath}. ${Be}`,
          "workflow name collision",
        )
      );
    throw (
      logFeatureBad("workflow_save", "write_failed"),
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Workflow save failed: ${write.error.code} (${displayPath})`,
        "workflow save failed",
      )
    );
  }
  return finishWorkflowSave(name, displayPath, options);
}
//@ chunk-axsvbsqv.js:9893-9923 placement
function selectCwd(dn) {
  return dn.cwd;
}
//@ chunk-axsvbsqv.js:9923-9978 placement
function Cl(ho) {
  return ho === "project" ? "user" : "project";
}
/**
 * 保存动态工作流的对话框。
 */
//@ chunk-axsvbsqv.js:9978-13272 placement
function WorkflowSaveDialog(o) {
  let $ = w(54),
    { script: script, defaultName: defaultName, onDone: onDone } = o,
    { storageV5: storageV5 } = Me(),
    { columns: columns } = useTerminalSize(),
    h = useProject(selectCwd),
    [b, x] = y(defaultName),
    [A, v] = y(defaultName.length),
    [T, M] = y("project"),
    [I, N] = y(!1),
    [E, V] = y(null),
    [J, z] = y(null),
    B;
  if ($[0] === MEMO_CACHE_SENTINEL)
    ((B = () => {
      (V(null), z(null));
    }),
      ($[0] = B));
  else B = $[0];
  let H = B,
    Y;
  if ($[1] === MEMO_CACHE_SENTINEL)
    ((Y = (pt) => {
      (x(pt), H());
    }),
      ($[1] = Y));
  else Y = $[1];
  let gt = Y,
    wt;
  if (
    $[2] !== E ||
    $[3] !== h ||
    $[4] !== b ||
    $[5] !== onDone ||
    $[6] !== I ||
    $[7] !== T ||
    $[8] !== script ||
    $[9] !== storageV5
  )
    ((wt = () => {
      if (I) {
        return;
      }
      let trimmed = b.trim();
      if (!trimmed) {
        return;
      }
      (N(!0),
        z(null),
        saveDynamicWorkflow(
          { name: trimmed, scope: T, script: script, overwrite: E !== null, cwd: h },
          storageV5,
        )
          .then((at) => {
            onDone(
              `Dynamic workflow saved to ${at.path}. Invoke as /${at.name} or Workflow({name: "${at.name}"}) in future sessions.`,
            );
          })
          .catch((ct) => {
            let U = ct instanceof Error ? ct.message : String(ct);
            if (U.includes(Be)) {
              let match = U.match(/at (.+?)\. /);
              V(match?.[1] ?? "(unknown path)");
            } else z(U);
            N(!1);
          }));
    }),
      ($[2] = E),
      ($[3] = h),
      ($[4] = b),
      ($[5] = onDone),
      ($[6] = I),
      ($[7] = T),
      ($[8] = script),
      ($[9] = storageV5),
      ($[10] = wt));
  else wt = $[10];
  let ot = wt,
    rt;
  if ($[11] !== onDone) ((rt = () => onDone()), ($[11] = onDone), ($[12] = rt));
  else rt = $[12];
  let W = rt,
    G;
  if ($[13] === MEMO_CACHE_SENTINEL) ((G = { context: "Settings", isActive: !0 }), ($[13] = G));
  else G = $[13];
  useKeybinding("confirm:no", W, G);
  let dt;
  if ($[14] === MEMO_CACHE_SENTINEL)
    ((dt = (St) => {
      if (St.key === "tab") (St.preventDefault(), M(Cl), H());
    }),
      ($[14] = dt));
  else dt = $[14];
  let kt = dt,
    zt;
  if ($[15] !== b) ((zt = slugifyWorkflowName(b.trim() || "workflow")), ($[15] = b), ($[16] = zt));
  else zt = $[16];
  let ee = zt,
    Rt;
  if ($[17] !== T || $[18] !== ee)
    ((Rt = T === "project" ? `.claude/workflows/${ee}.js` : tildify(join_2(iFt(), `${ee}.js`))),
      ($[17] = T),
      ($[18] = ee),
      ($[19] = Rt));
  else Rt = $[19];
  let yt = Rt;
  const Ot = T === "project" ? "Project" : "User";
  let pe;
  if ($[20] !== Ot || $[21] !== yt)
    ((pe = r(Text, { dimColor: !0, children: [Ot, " scope \xB7 ", yt] })),
      ($[20] = Ot),
      ($[21] = yt),
      ($[22] = pe));
  else pe = $[22];
  const fe = E ? "overwrite" : "save";
  let qe;
  if ($[23] !== fe)
    ((qe = e(KeyboardShortcutHint, { chord: "enter", action: fe })), ($[23] = fe), ($[24] = qe));
  else qe = $[24];
  let sn, po;
  if ($[25] === MEMO_CACHE_SENTINEL)
    ((sn = e(KeyboardShortcutHint, { chord: "tab", action: "toggle scope" })),
      (po = e(KeyboardShortcutHint, { chord: "escape", action: "cancel" })),
      ($[25] = sn),
      ($[26] = po));
  else ((sn = $[25]), (po = $[26]));
  let oe;
  if ($[27] !== qe) ((oe = r(Byline, { children: [qe, sn, po] })), ($[27] = qe), ($[28] = oe));
  else oe = $[28];
  let fo;
  if ($[29] === MEMO_CACHE_SENTINEL) ((fo = e(Text, { children: "Save as:" })), ($[29] = fo));
  else fo = $[29];
  let an;
  if ($[30] === MEMO_CACHE_SENTINEL) ((an = e(Text, { children: ">" })), ($[30] = an));
  else an = $[30];
  const mo = !I,
    go = !I;
  let st;
  if ($[31] !== columns || $[32] !== A || $[33] !== ot || $[34] !== b || $[35] !== mo || $[36] !== go)
    ((st = r(Box, {
      flexDirection: "row",
      gap: 1,
      marginTop: 1,
      children: [
        an,
        e(TextInput, {
          value: b,
          onChange: gt,
          onSubmit: ot,
          focus: mo,
          showCursor: go,
          columns: columns,
          cursorOffset: A,
          onChangeCursorOffset: v,
        }),
      ],
    })),
      ($[31] = columns),
      ($[32] = A),
      ($[33] = ot),
      ($[34] = b),
      ($[35] = mo),
      ($[36] = go),
      ($[37] = st));
  else st = $[37];
  let Yt;
  if ($[38] !== E)
    ((Yt =
      E &&
      e(Box, {
        marginTop: 1,
        children: r(Text, {
          color: "warning",
          children: [E, " already exists. Press Enter again to overwrite, or change the name."],
        }),
      })),
      ($[38] = E),
      ($[39] = Yt));
  else Yt = $[39];
  let ve;
  if ($[40] !== J)
    ((ve = J && e(Box, { marginTop: 1, children: e(ErrorText, { error: J }) })), ($[40] = J), ($[41] = ve));
  else ve = $[41];
  let We;
  if ($[42] !== I)
    ((We = I && e(Box, { marginTop: 1, children: e(Text, { dimColor: !0, children: "Saving\u2026" }) })),
      ($[42] = I),
      ($[43] = We));
  else We = $[43];
  let se;
  if ($[44] !== st || $[45] !== Yt || $[46] !== ve || $[47] !== We)
    ((se = r(Box, { flexDirection: "column", children: [fo, st, Yt, ve, We] })),
      ($[44] = st),
      ($[45] = Yt),
      ($[46] = ve),
      ($[47] = We),
      ($[48] = se));
  else se = $[48];
  let cn;
  if ($[49] !== W || $[50] !== pe || $[51] !== oe || $[52] !== se)
    ((cn = e(FocusColumn, {
      onKeyDown: kt,
      children: e(Dialog, {
        title: "Save dynamic workflow",
        subtitle: pe,
        onCancel: W,
        color: "permission",
        isCancelActive: !1,
        inputGuide: oe,
        children: se,
      }),
    })),
      ($[49] = W),
      ($[50] = pe),
      ($[51] = oe),
      ($[52] = se),
      ($[53] = cn));
  else cn = $[53];
  return cn;
}

export { WorkflowSaveDialog };
