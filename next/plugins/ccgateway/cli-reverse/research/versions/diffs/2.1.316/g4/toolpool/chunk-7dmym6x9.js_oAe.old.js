SELF = $m_tn({ name: $m_Hi, ruleContentField: "notebook_path", searchHint: "edit Jupyter notebook cells (.ipynb)", backgrounding: "never", maxResultSizeChars: 1e5, shouldDefer: true, async description() {
  return $m__Gn;
}, async prompt() {
  return $m_kGn;
}, backfillObservableInput($l0) {
  if (typeof $l0.notebook_path === "string" && !$m_Ov($m_Hi)) $l0.notebook_path = $m_qb($l0.notebook_path);
}, userFacingName() {
  return "Edit Notebook";
}, getToolUseSummary: $m_SGn, getActivityDescription($l1) {
  let $l2 = $m_SGn($l1);
  return $l2 ? `Editing notebook ${$l2}` : "Editing notebook";
}, get inputSchema() {
  return $m_P_s();
}, get outputSchema() {
  return $m_M_s();
}, toAutoClassifierInput($l3) {
  let $l4 = $l3.edit_mode ?? "replace";
  if (!$m_pan()) return `${$l3.notebook_path} ${$l4}: ${$l3.new_source}`;
  return { notebook_path: $l3.notebook_path, mode: $l4, ...$l3.cell_id !== void 0 && { cell_id: $l3.cell_id }, ...$l4 !== "delete" && $l3.cell_type !== void 0 && { cell_type: $l3.cell_type }, ...$l4 === "delete" ? { ignored_source: $l3.new_source } : { adds: $l3.new_source } };
}, getPath($l5) {
  return $l5.notebook_path;
}, async preparePermissionMatcher({ notebook_path: $l6 }) {
  return ($l7) => $m_xnt($l7, $l6);
}, fromAnotherProcess($l8, $l9) {
  return { data: { ...$l8, notebook_path: String($l9.notebook_path ?? ""), new_source: String($l9.new_source ?? ""), edit_mode: String($l9.edit_mode ?? "replace"), ...$l8.cell_id !== void 0 && { cell_id: $m_use($m_Gc($l8.cell_id, 200)) }, ...$l8.error !== void 0 && { error: $m_use($m_Gc($l8.error, 2e3)) }, ...$l8.old_source !== void 0 && { old_source: $m_Gc($l8.old_source, 1e5) }, original_file: "", updated_file: "" } };
}, mapToolResultToToolResultBlockParam({ cell_id: $l10, edit_mode: $l11, new_source: $l12, error: $l13 }, $l14) {
  if ($l13) return { tool_use_id: $l14, type: "tool_result", content: $l13, is_error: true };
  switch ($l11) {
    case "replace":
      return { tool_use_id: $l14, type: "tool_result", content: `Updated cell ${$l10} with ${$l12}` };
    case "insert":
      return { tool_use_id: $l14, type: "tool_result", content: `Inserted cell ${$l10} with ${$l12}` };
    case "delete":
      return { tool_use_id: $l14, type: "tool_result", content: `Deleted cell ${$l10}` };
    default:
      return { tool_use_id: $l14, type: "tool_result", content: "Unknown edit mode" };
  }
}, create($l15) {
  return { permissionCheckFailureDecision($l16) {
    return $m__q($m_Hi, $m_D($l16) ? $l16.notebook_path : void 0, $l15.permissions());
  }, async checkPermissions($l17, $l18) {
    let $l19 = $m_qb($l17.notebook_path), $l20 = $m_Wi($l19);
    $l15.session.writePermissionStash.stash($l18.toolUseId, $l19, $l20.spellings);
    let $l21 = $m___(SELF, $l17, $l15.permissions(), $l20);
    return $l21.behavior === "deny" ? $l21 : $m_Sbe($l19, $l20) ?? $l21;
  }, async validateInput({ notebook_path: $l22, cell_type: $l23, cell_id: $l24, edit_mode: $l25 = "replace" }, $l26) {
    let $l27 = { toolUseId: $l26.toolUseId, session: $l15.session, agentId: $l15.agentId, agentWorktree: $l15.agentWorktree }, $l28 = $m_dv($m_Hi, [["notebook_path", $l22]]);
    if ($l28) return $l28;
    let $l29 = $m_nL($m_Hi, [["notebook_path", $l22]]);
    if ($l29) return $l29;
    let $l30 = $m_lq($m_Hi, [["notebook_path", $l22]]);
    if ($l30) return $l30;
    let $l31 = $m_qb($l22), $l32 = $m_bU($l31, $l27);
    if ($l32) return { result: false, message: $l32, errorCode: 12 };
    if ($m_A_s($l31) !== ".ipynb") return { result: false, message: "File must be a Jupyter notebook (.ipynb file). For editing other file types, use the FileEdit tool.", errorCode: 2 };
    if ($l25 === "insert" && !$l23) return { result: false, message: "Cell type is required when using edit_mode=insert.", errorCode: 5 };
    let $l33 = $l15.readFileState.get($l31);
    if (!$l33) return { result: false, message: "File has not been read yet. Read it first before writing to it.", errorCode: 9 };
    if ($m_yl($l31)) return { result: true };
    if ($m_eas()) try {
      let { mode: $l34 } = await $m_ie().stat($l31);
      if ($m_flt($l34)) return { result: false, message: $m_ult, errorCode: 11 };
    } catch ($l35) {
      if (!$m_z($l35)) throw $l35;
    }
    if (await $m_Ak($l31) > $l33.timestamp) return { result: false, message: "File has been modified since read, either by the user or by a linter. Read it again before attempting to write it.", errorCode: 10 };
    let $l36, $l37;
    try {
      ({ content: $l36, notText: $l37 } = await $m_N_($l31, $m_rj));
    } catch ($l38) {
      if ($m_z($l38)) return { result: false, message: "Notebook file does not exist.", errorCode: 1 };
      if ($m_l1($l38)) return { result: false, message: $m_qee(), errorCode: 13 };
      throw $l38;
    }
    if ($l37) return { result: false, message: $m_WAt($l37), errorCode: 15 };
    let $l39 = $m_st($l36);
    if (!$l39) return { result: false, message: "Notebook is not valid JSON.", errorCode: 6 };
    if (!$m_pyt($l39)) return { result: false, message: $m_AEe, errorCode: 6 };
    if (!$l24) {
      if ($l25 !== "insert") return { result: false, message: "Cell ID must be specified when not inserting a new cell.", errorCode: 7 };
    } else if (!$l39.cells.some(($l40) => $l40.id === $l24)) {
      let $l41 = $m_n7e($l24);
      if ($l41 === void 0) return { result: false, message: `Cell with ID "${$l24}" not found in notebook.`, errorCode: 8 };
      if (!$l39.cells[$l41]) return { result: false, message: `Cell with index ${$l41} does not exist in notebook.`, errorCode: 7 };
    }
    return { result: true };
  }, async call({ notebook_path: $l42, new_source: $l43, cell_id: $l44, cell_type: $l45, edit_mode: $l46 }, $l47) {
    let $l48 = { toolUseId: $l47.toolUseId, session: $l15.session, agentId: $l15.agentId, agentWorktree: $l15.agentWorktree }, { parentMessage: $l49 } = $l47;
    if ($l49 === void 0) throw Error("NotebookEdit: a call needs the message that issued it");
    let { readFileState: $l50, getFileHistoryState: $l51, applyFileHistoryOp: $l52 } = $l15, $l53 = $m_qb($l42), $l54 = ($l55) => ({ data: { new_source: $l43, old_source: void 0, cell_type: $l45 ?? "code", language: "python", edit_mode: "replace", error: $l55, cell_id: $l44, notebook_path: $l53, original_file: "", updated_file: "" } }), $l56 = $m_Rme($l48, $l53);
    await $m_LQe($l51, $l52, $l53, $l49.uuid);
    try {
      return await $m_J2($l53, async () => {
        let $l57 = await $m_pw($l53, $l56);
        try {
          let $l58;
          try {
            $l58 = await $l57.readExisting($m_rj);
          } catch ($l59) {
            if ($m_l1($l59)) return $l54($m_qee());
            throw $l59;
          }
          if ($l58 === null) return $l54("Notebook file does not exist.");
          if ($l58.notText) return $l54($m_WAt($l58.notText));
          let { content: $l60, encoding: $l61, lineEndings: $l62 } = $l58, $l63 = await $m_Ak($l57.ioPath), $l64;
          try {
            $l64 = $m_ee($l60);
          } catch {
            return $l54("Notebook is not valid JSON.");
          }
          if (!$m_pyt($l64)) return $l54($m_AEe);
          let $l65 = $l50.get($l53), $l66 = false;
          if ($m_Yoe($l65)) {
            if ($l66 = $m_bvt($l65, $m_Av($l60)), !$l66 && $l63 <= $l65.timestamp) try {
              $l66 = $m_bvt($l65, $m__($m_yZe($l64)));
            } catch ($l67) {
              $m_t(`NotebookEdit: the cells cannot be rendered as Read renders them: ${$m_d($l67)}`);
            }
          }
          let $l68;
          if (!$l44) $l68 = 0;
          else {
            if ($l68 = $l64.cells.findIndex(($l69) => $l69.id === $l44), $l68 === -1) {
              let $l70 = $m_n7e($l44);
              if ($l70 !== void 0) $l68 = $l70;
            }
            if ($l46 === "insert") $l68 += 1;
          }
          let $l71 = $l46;
          if ($l71 === "replace" && $l68 === $l64.cells.length) {
            if ($l71 = "insert", !$l45) $l45 = "code";
          }
          let $l72 = $l64.metadata?.language_info?.name ?? "python", $l73 = void 0;
          if ($l64.nbformat > 4 || $l64.nbformat === 4 && $l64.nbformat_minor >= 5) {
            if ($l71 === "insert") $l73 = $m_x_s().slice(0, 8);
            else if ($l44 !== null) $l73 = $l44;
          }
          let $l74;
          if ($l71 === "delete") {
            let $l75 = $l64.cells[$l68];
            $l74 = Array.isArray($l75.source) ? $l75.source.join("") : $l75.source, $l64.cells.splice($l68, 1);
          } else if ($l71 === "insert") {
            let $l76;
            if ($l45 === "markdown") $l76 = { cell_type: "markdown", id: $l73, source: $l43, metadata: {} };
            else $l76 = { cell_type: "code", id: $l73, source: $l43, metadata: {}, execution_count: null, outputs: [] };
            $l64.cells.splice($l68, 0, $l76);
          } else {
            let $l77 = $l64.cells[$l68];
            if ($l74 = Array.isArray($l77.source) ? $l77.source.join("") : $l77.source, $l77.source = $l43, $l77.cell_type === "code") $l77.execution_count = null, $l77.outputs = [];
            if ($l45 && $l45 !== $l77.cell_type) $l77.cell_type = $l45;
          }
          let $l78 = $m__($l64, null, 1);
          if (Buffer.byteLength($m_TIe($l78, $l62), $l61) > $m_rj) return $l54(`Edit rejected: the updated notebook would exceed the maximum size this tool can read (${$m_Qt($m_rj)}). The file was left unchanged.`);
          await $l57.recheckBeforeWrite();
          let $l79 = await $m_plt($l57.ioPath, $l78, $l61, $l62);
          return $l50.set($l53, { content: $l78, timestamp: $l79, offset: void 0, limit: void 0, ...!$l66 && { contentNotInModelContext: true } }), { data: { new_source: $l43, old_source: $l74, cell_type: $l45 ?? "code", language: $l72, edit_mode: $l71 ?? "replace", cell_id: $l73 || void 0, error: "", notebook_path: $l53, original_file: $l60, updated_file: $l78 } };
        } catch ($l80) {
          $m_Sme($l80, $l57, $l53);
        } finally {
          await $l57.close();
        }
      });
    } catch ($l81) {
      if ($l81 instanceof $m_L_) throw $l81;
      return $l54($m_va($l81 instanceof Error ? $l81.message : "Unknown error occurred while editing notebook"));
    }
  } };
} });
