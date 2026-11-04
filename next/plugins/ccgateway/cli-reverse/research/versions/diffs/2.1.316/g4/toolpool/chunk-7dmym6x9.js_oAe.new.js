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
    if ($NEW_chunk_e6aww6q8_js_DTs($l31) !== ".ipynb") return { result: false, message: "File must be a Jupyter notebook (.ipynb file). For editing other file types, use the FileEdit tool.", errorCode: 2 };
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
    let { readFileState: $l50, getFileHistoryState: $l51, applyFileHistoryOp: $l52 } = $l15, $l53 = $m_qb($l42), $l54 = ($l55) => ({ data: { new_source: $l43, old_source: void 0, cell_type: $l45 ?? "code", language: "python", edit_mode: "replace", error: $l55, cell_id: $l44, notebook_path: $l53, original_file: "", updated_file: "" } }), $l56 = $m_Rme($l48, $l53), $l57 = $NEW_chunk_82kqcve8_js_oYt($l53, $l15.permissions(), $l56);
    if ($l57 !== void 0) return $l54($l57);
    await $m_LQe($l51, $l52, $l53, $l49.uuid);
    try {
      return await $m_J2($l53, async () => {
        let $l58 = await $m_pw($l53, $l56);
        try {
          let $l59;
          try {
            $l59 = await $l58.readExisting($m_rj);
          } catch ($l60) {
            if ($m_l1($l60)) return $l54($m_qee());
            throw $l60;
          }
          if ($l59 === null) return $l54("Notebook file does not exist.");
          if ($l59.notText) return $l54($m_WAt($l59.notText));
          let { content: $l61, encoding: $l62, lineEndings: $l63 } = $l59, $l64 = await $m_Ak($l58.ioPath), $l65;
          try {
            $l65 = $m_ee($l61);
          } catch {
            return $l54("Notebook is not valid JSON.");
          }
          if (!$m_pyt($l65)) return $l54($m_AEe);
          let $l66 = $l50.get($l53), $l67 = false;
          if ($m_Yoe($l66)) {
            if ($l67 = $m_bvt($l66, $m_Av($l61)), !$l67 && $l64 <= $l66.timestamp) try {
              $l67 = $m_bvt($l66, $m__($m_yZe($l65)));
            } catch ($l68) {
              $m_t(`NotebookEdit: the cells cannot be rendered as Read renders them: ${$m_d($l68)}`);
            }
          }
          let $l69;
          if (!$l44) $l69 = 0;
          else {
            if ($l69 = $l65.cells.findIndex(($l70) => $l70.id === $l44), $l69 === -1) {
              let $l71 = $m_n7e($l44);
              if ($l71 !== void 0) $l69 = $l71;
            }
            if ($l46 === "insert") $l69 += 1;
          }
          let $l72 = $l46;
          if ($l72 === "replace" && $l69 === $l65.cells.length) {
            if ($l72 = "insert", !$l45) $l45 = "code";
          }
          let $l73 = $l65.metadata?.language_info?.name ?? "python", $l74 = void 0;
          if ($l65.nbformat > 4 || $l65.nbformat === 4 && $l65.nbformat_minor >= 5) {
            if ($l72 === "insert") $l74 = $NEW_chunk_e6aww6q8_js_ITs().slice(0, 8);
            else if ($l44 !== null) $l74 = $l44;
          }
          let $l75;
          if ($l72 === "delete") {
            let $l76 = $l65.cells[$l69];
            $l75 = Array.isArray($l76.source) ? $l76.source.join("") : $l76.source, $l65.cells.splice($l69, 1);
          } else if ($l72 === "insert") {
            let $l77;
            if ($l45 === "markdown") $l77 = { cell_type: "markdown", id: $l74, source: $l43, metadata: {} };
            else $l77 = { cell_type: "code", id: $l74, source: $l43, metadata: {}, execution_count: null, outputs: [] };
            $l65.cells.splice($l69, 0, $l77);
          } else {
            let $l78 = $l65.cells[$l69];
            if ($l75 = Array.isArray($l78.source) ? $l78.source.join("") : $l78.source, $l78.source = $l43, $l78.cell_type === "code") $l78.execution_count = null, $l78.outputs = [];
            if ($l45 && $l45 !== $l78.cell_type) $l78.cell_type = $l45;
          }
          let $l79 = $m__($l65, null, 1);
          if (Buffer.byteLength($m_TIe($l79, $l63), $l62) > $m_rj) return $l54(`Edit rejected: the updated notebook would exceed the maximum size this tool can read (${$m_Qt($m_rj)}). The file was left unchanged.`);
          await $l58.recheckBeforeWrite();
          let $l80 = await $m_plt($l58.ioPath, $l79, $l62, $l63);
          return $l50.set($l53, { content: $l79, timestamp: $l80, offset: void 0, limit: void 0, ...!$l67 && { contentNotInModelContext: true } }), { data: { new_source: $l43, old_source: $l75, cell_type: $l45 ?? "code", language: $l73, edit_mode: $l72 ?? "replace", cell_id: $l74 || void 0, error: "", notebook_path: $l53, original_file: $l61, updated_file: $l79 } };
        } catch ($l81) {
          $m_Sme($l81, $l58, $l53);
        } finally {
          await $l58.close();
        }
      });
    } catch ($l82) {
      if ($l82 instanceof $m_L_) throw $l82;
      return $l54($m_va($l82 instanceof Error ? $l82.message : "Unknown error occurred while editing notebook"));
    }
  } };
} });
