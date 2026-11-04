async function SELF({ file_path: $l0, content: $l1 }, $l2, $l3) {
  let { readFileState: $l4, userModified: $l5, getFileHistoryState: $l6, applyFileHistoryOp: $l7, dynamicSkillDirTriggers: $l8 } = $l2, $l9 = $m_qb($l0), $l10 = $m_Rme($l2, $l9);
  if ($m_lB($l9, $l2.permissions())) throw new $m_BX($m_tkn);
  let $l11 = $NEW_chunk_82kqcve8_js_oYt($l9, $l2.permissions(), $l10);
  if ($l11 !== void 0) throw new $m_BX($l11);
  if ($l2.remoteCall === void 0) await $m_Sq($l2.session.host, $l9, $l8, $l2.storageV5);
  if ($l2.remoteCall === void 0) await $m_kGe.of($l2.session).beforeFileEdited($l9);
  let $l12 = await $m_FUr($l2, $l10, { toolName: $m_Yt, absolutePath: $l9, input: { file_path: $l0, content: $l1 } }), $l13 = $m_m_e($l2, $l10, await $m_H_e($l2.session.host, $l10));
  if ($l12 === void 0) await $m_LQe($l6, $l7, $l9, $l3.uuid);
  let $l14 = await $m_J2($l9, async () => {
    let $l15 = await $m_pw($l9, $l10, { createParents: $l12 === void 0 }).catch(($l16) => {
      if ($l12 !== void 0 && $m_z($l16)) return null;
      throw $l16;
    });
    try {
      let $l17 = $l15 === null ? null : await $l15.readExisting();
      if ($l15 !== null && $l17 !== null) {
        if ($l4.holdsOnlyStartOf($l9)) throw new $m_BX($m_e7o);
        await $m_hzo({ fullFilePath: $l9, ioPath: $l15.ioPath, diskContent: $l17.content, lastRead: $l4.get($l9), preReadGuard: $m_abn($m_Je($l2.model()), $l2.remoteCall), readBaseline: $l2.remoteCall?.readBaseline, servedOn: $l2.remoteCall?.origin.hostName, readNotAutoAllowed: () => !$m_bbe($m_Yt, $l9, $l2, $l2.permissions()) });
      }
      if ($l17?.notText) throw new $m_BX($m_WAt($l17.notText));
      let $l18 = $l17?.encoding ?? "utf8", $l19 = $l17?.content ?? null, $l20 = $l1, $l21 = $m_tL($l2), $l22 = $m_Sht($l9, $l1, $l21) ?? $m_q7e($l9, $l1);
      if ($l22 !== null) throw new $m_C($l22, "memory-directory write refused at call time");
      $l1 = $m_SQ($l9, $l1, $l21);
      let $l23 = $m_d_e($l2.session.host, $l2.toolUseId), $l24 = await $m_s1t($l9), $l25 = $l12 !== void 0 || $l15 === null ? void 0 : await $m_Jcn($l2, $l24, $l19, $l1, { remote: $l2.remoteCall !== void 0 }), $l26 = $m_D_t($l24, $l1, $l25?.context);
      $m_Zcn($l26.sharedItemBlock, "team"), $l1 = $l26.content;
      let $l27 = $l1 !== $l20 || $l23;
      if ($l12 !== void 0 || $l15 === null) return await $m_UUr({ writeCtx: $l2, tool: "Write", absolutePath: $l12?.path ?? $l9, currentContent: $l19, proposedContent: $l1 }), { oldContent: $l19, memdirStamped: $l27, staged: true };
      let $l28;
      $l1 = $m_veo($l19, $l1), await $l15.recheckBeforeWrite();
      try {
        $l28 = await $m_plt($l15.ioPath, $l1, $l18, "LF");
      } catch ($l29) {
        throw $m_nk($l9), $l29;
      }
      if (await $m_Qcn($l24, $l1, $l26.item, $l25?.rev), $l4.set($l9, { content: $m_zy($l1), timestamp: $l28, offset: void 0, limit: void 0, ...($l5 || $l27) && { contentNotInModelContext: true } }), $l18 === "utf8") $m_Lvt($l9, $l1);
      else $m_nk($l9);
      return { oldContent: $l19, memdirStamped: $l27, staged: false };
    } catch ($l30) {
      if ($l15 === null) throw $l30;
      $m_Sme($l30, $l15, $l9);
    } finally {
      await $l15?.close();
    }
  }), { oldContent: $l31, memdirStamped: $l32, staged: $l33 } = $l14, $l34 = $l31 !== null && $l31.length > $m_X7e;
  if ($l33) {
    let $l35 = $l2.remoteCall !== void 0 || $l2.inputFromAnotherMachine === true, $l36 = $l35 || $l31 === null || $l34 ? [] : $m_qye({ filePath: $l0, oldContent: $l31, newContent: $m_veo($l31, $m_C7($l1)), convertTabs: true });
    return { data: { type: $l31 === null ? "create" : "update", filePath: $l0, content: $l1, structuredPatch: $l36, originalFile: $l35 || $l34 ? null : $l31, userModified: $l5 ?? false, staged: true, stagedWording: $m_NUr({ session: $l2.session, served: $l2.remoteCall !== void 0, cause: $l12?.cause ?? "unapproved" }) }, remedy: { kind: "staged_for_review", path: $l12?.path ?? $l9 } };
  }
  if ($l2.remoteCall === void 0) $m_Jz($l2.nestedMemoryAttachmentTriggers, $l9);
  let $l37 = $l2.remoteCall === void 0 ? $m_UTe() : void 0;
  if ($l37) $m_lan($l2.session, $l9), $m_dan($l2.session, $l9), $l37.changeFile($l9, $l1).catch(($l38) => {
    $m_t(`LSP: Failed to notify server of file change for ${$l9}: ${$l38.message}`, { level: "error" });
  }), $l37.saveFile($l9).catch(($l39) => {
    $m_t(`LSP: Failed to notify server of file save for ${$l9}: ${$l39.message}`, { level: "error" });
  });
  if ($m_bht($l9, $l34 ? null : $l31, $l1), $l9.endsWith(`${$NEW_chunk_e6aww6q8_js_$Ko}CLAUDE.md`)) $m_a("tengu_write_claudemd", {});
  let $l40;
  if ($m_oBr($l2) && !$l34) {
    let $l41 = Date.now(), $l42 = await $m_iBr($l9);
    if ($l42 && $m_sBr($l42)) $l40 = $l42;
    $m_a("tengu_tool_use_diff_computed", { isWriteTool: true, durationMs: Date.now() - $l41, hasDiff: !!$l42 });
  }
  let $l43 = $l2.callerLogsSharedEvents ? $m_$6n : $m_a1t;
  if ($l31) {
    let $l44 = $l34 ? [] : $m_qye({ filePath: $l0, oldContent: $l31, newContent: $l1, convertTabs: true, isForToolResult: $l12 === void 0 }), $l45 = { type: "update", filePath: $l0, content: $l1, structuredPatch: $l44, originalFile: $l34 ? null : $l31, userModified: $l5 ?? false, ...$l32 && { memdirStamped: true }, ...$l13 && { syncedSkillNext: $l13 }, ...$l40 && { gitDiff: $l40 } };
    return $l43($l44, $l3.message.model, $l34 ? $l1 : void 0, $l34 ? $l31 : void 0), $m_oR({ operation: "write", tool: "FileWriteTool", filePath: $l9, type: "update" }), { data: $l45 };
  }
  let $l46 = { type: "create", filePath: $l0, content: $l1, structuredPatch: [], originalFile: null, userModified: $l5 ?? false, ...$l32 && { memdirStamped: true }, ...$l13 && { syncedSkillNext: $l13 }, ...$l40 && { gitDiff: $l40 } };
  return $l43([], $l3.message.model, $l1), $m_oR({ operation: "write", tool: "FileWriteTool", filePath: $l9, type: "create" }), { data: $l46 };
}
;
