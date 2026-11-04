async function SELF($l0, $l1, $l2) {
  let { readFileState: $l3, userModified: $l4, getFileHistoryState: $l5, applyFileHistoryOp: $l6, dynamicSkillDirTriggers: $l7 } = $l1, { file_path: $l8, replace_all: $l9 = false } = $l0, { old_string: $l10, new_string: $l11 } = $l0, $l12 = $m_qb($l8), $l13 = $m_Rme($l1, $l12);
  if ($m_lB($l12, $l1.permissions())) throw new $m_BX($m_ekn);
  let $l14 = $NEW_chunk_82kqcve8_js_oYt($l12, $l1.permissions(), $l13);
  if ($l14 !== void 0) throw new $m_BX($l14);
  if ({ old_string: $l10, new_string: $l11 } = $m_yGn($l0, $l1), !$m_i.CLAUDE_CODE_SIMPLE && $l1.remoteCall === void 0) await $m_Sq($l1.session.host, $l12, $l7, $l1.storageV5);
  if ($l1.remoteCall === void 0) await $m_kGe.of($l1.session).beforeFileEdited($l12);
  let $l15 = await $m_FUr($l1, $l13, { toolName: $m_it, absolutePath: $l12, input: $l0 }), $l16 = $m_m_e($l1, $l13, await $m_H_e($l1.session.host, $l13));
  if ($l15 === void 0) await $m_LQe($l5, $l6, $l12, $l2.uuid);
  let { originalFileContents: $l17, actualOldString: $l18, actualNewString: $l19, updatedFile: $l20, patch: $l21, staleRecovered: $l22, contentNotInModelContext: $l23, staged: $l24 } = await $m_J2($l12, async () => {
    let $l25 = await $m_pw($l12, $l13, { createParents: $l10 === "" && $l15 === void 0 }).catch(($l26) => {
      if ($l15 !== void 0 && $l10 === "" && $m_z($l26)) return null;
      throw $l26;
    });
    try {
      let { content: $l27, fileExists: $l28, encoding: $l29, lineEndings: $l30, notText: $l31 } = await $m_R_s($l25), $l32 = $l3.get($l12), $l33 = $l28 && $l25 !== null && await $m_C_s({ ioPath: $l25.ioPath, fileContents: $l27, lastRead: $l32, oldString: $l10, replaceAll: $l9, preReadGuard: $m_abn($m_Je($l1.model()), $l1.remoteCall), readBaseline: $l1.remoteCall?.readBaseline, servedOn: $l1.remoteCall?.origin.hostName, readNotAutoAllowed: () => !$m_bbe($m_it, $l12, $l1, $l1.permissions()) });
      if ($l31) throw new $m_BX($m_WAt($l31));
      let $l34 = $m_uLe($l27, $l10) || $l10, $l35 = $m_D6n($l10, $l34, $m_F_t($l10, $l34, $l11)), $l36 = $m_tL($l1), $l37 = $m_Sht($l12, $l35, $l36) ?? $m_q7e($l12, $l35);
      if ($l37 !== null) throw new $m_C($l37, "memory-directory write refused an edit after escape decoding");
      let $l38 = $m_SQ($l12, $l35, $l36), $l39 = $l38 !== $l35, $l40 = $l10 === "" ? $m_veo($l27, $l38) : $l38, $l41 = $m_d_e($l1.session.host, $l1.toolUseId), $l42 = $l39 || $l41;
      if ($l39 && $l40 === $l34) throw new $m_C("Nothing to change once the invisible characters are removed and harness-tag text is defused in new_string: it then equals old_string. Nothing was written.", "memory-directory write lint left an edit with nothing to change");
      let $l43 = $m_eun({ filePath: $l12, fileContents: $l27, oldString: $l34, newString: $l40, replaceAll: $l9, isForToolResult: $l15 === void 0 }), $l44 = await $m_s1t($l12), $l45 = $l15 !== void 0 || $l25 === null ? void 0 : await $m_Jcn($l1, $l44, $l28 ? $l27 : null, $l43.updatedFile, { remote: $l1.remoteCall !== void 0 }), $l46 = $m_D_t($l44, $l43.updatedFile, $l45?.context);
      $m_Zcn($l46.sharedItemBlock, "team");
      let $l47 = $l46.content, $l48 = $l47 !== $l43.updatedFile, $l49 = !$l48 ? $l43.patch : $m_qye({ filePath: $l12, oldContent: $l27, newContent: $l47, convertTabs: true, isForToolResult: $l15 === void 0 }), $l50 = $l4 || $l48 || $l42 || $l28 && (!$m_Yoe($l32) || $l33 || !$m_bvt($l32, $m_Av($l27)));
      if ($l15 !== void 0 || $l25 === null) return await $m_UUr({ writeCtx: $l1, tool: "Edit", absolutePath: $l15?.path ?? $l12, currentContent: $l28 ? $l27 : null, proposedContent: $l47 }), { originalFileContents: $l27, actualOldString: $l34, actualNewString: $l40, updatedFile: $l47, patch: $l49, staleRecovered: $l33, contentNotInModelContext: $l50, staged: true };
      let $l51;
      await $l25.recheckBeforeWrite();
      try {
        $l51 = await $m_plt($l25.ioPath, $l47, $l29, $l30);
      } catch ($l52) {
        throw $m_nk($l12), $l52;
      }
      if (await $m_Qcn($l44, $l47, $l46.item, $l45?.rev), $l3.set($l12, { content: $m_Av($l47), timestamp: $l51, offset: void 0, limit: void 0, ...$l50 && { contentNotInModelContext: true }, ...$l28 && $l32?.isPartialView === true && { isPartialView: true } }), $l29 === "utf8" && $l30 !== "CRLF") $m_Lvt($l12, $l47);
      else $m_nk($l12);
      return { originalFileContents: $l27, actualOldString: $l34, actualNewString: $l40, updatedFile: $l47, patch: $l49, staleRecovered: $l33, contentNotInModelContext: $l50, staged: false };
    } catch ($l53) {
      if ($l25 === null) throw $l53;
      $m_Sme($l53, $l25, $l12);
    } finally {
      await $l25?.close();
    }
  });
  if ($l24) {
    let $l54 = $l1.remoteCall !== void 0 || $l1.inputFromAnotherMachine === true;
    return { data: { filePath: $l8, oldString: $l54 ? $l0.old_string : $l18, newString: $l54 ? $l0.new_string : $l11, originalFile: $l54 ? null : $l17, structuredPatch: $l54 ? [] : $l21, userModified: $l4 ?? false, replaceAll: $l9, staged: true, stagedWording: $m_NUr({ session: $l1.session, served: $l1.remoteCall !== void 0, cause: $l15?.cause ?? "unapproved" }) }, remedy: { kind: "staged_for_review", path: $l15?.path ?? $l12 } };
  }
  if ($l1.remoteCall === void 0) $m_Jz($l1.nestedMemoryAttachmentTriggers, $l12);
  let $l55 = $l1.remoteCall === void 0 ? $m_UTe() : void 0;
  if ($l55) $m_lan($l1.session, $l12), $m_dan($l1.session, $l12), $l55.changeFile($l12, $l20).catch(($l56) => {
    $m_t(`LSP: Failed to notify server of file change for ${$l12}: ${$l56.message}`, { level: "error" });
  }), $l55.saveFile($l12).catch(($l57) => {
    $m_t(`LSP: Failed to notify server of file save for ${$l12}: ${$l57.message}`, { level: "error" });
  });
  if ($m_bht($l12, $l17, $l20), $l12.endsWith(`${$NEW_chunk_e6aww6q8_js_ATs}CLAUDE.md`)) $m_a("tengu_write_claudemd", {});
  ($l1.callerLogsSharedEvents ? $m_$6n : $m_a1t)($l21, $l2.message.model), $m_oR({ operation: "edit", tool: "FileEditTool", filePath: $l12 }), $m_a("tengu_edit_string_lengths", { oldStringBytes: Buffer.byteLength($l10, "utf8"), newStringBytes: Buffer.byteLength($l11, "utf8"), replaceAll: $l9 });
  let $l58;
  if ($m_oBr($l1)) {
    let $l59 = Date.now(), $l60 = await $m_iBr($l12);
    if ($l60 && $m_sBr($l60)) $l58 = $l60;
    $m_a("tengu_tool_use_diff_computed", { isEditTool: true, durationMs: Date.now() - $l59, hasDiff: !!$l60 });
  }
  let $l61 = { filePath: $l8, oldString: $l18, newString: $l11, originalFile: $l17, structuredPatch: $l21, userModified: $l4 ?? false, replaceAll: $l9, ...$l22 && { staleRecovered: true }, ...$l23 && { contentNotInModelContext: true }, ...$l16 && { syncedSkillNext: $l16 }, ...$l58 && { gitDiff: $l58 } }, $l62 = { absoluteFilePath: $l12, output: $l61, originalFile: $l17, updatedFile: $l20, appliedNewString: $l19 }, $l63 = $l1.remoteCall !== void 0 ? void 0 : $l1.smallResultAsked === true ? $m_Jut($l62) : $l1.agentId !== void 0 ? $m_fGn($l62) : void 0;
  return { data: $l61, ...$l63 };
}
;
