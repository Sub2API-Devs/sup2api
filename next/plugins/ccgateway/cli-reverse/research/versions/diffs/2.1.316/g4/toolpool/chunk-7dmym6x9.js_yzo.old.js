async function SELF({ file_path: $l0, content: $l1 }, $l2, $l3) {
  let { readFileState: $l4, userModified: $l5, getFileHistoryState: $l6, applyFileHistoryOp: $l7, dynamicSkillDirTriggers: $l8 } = $l2, $l9 = $m_qb($l0), $l10 = $m_Rme($l2, $l9);
  if ($m_lB($l9, $l2.permissions())) throw new $m_BX($m_tkn);
  if ($l2.remoteCall === void 0) await $m_Sq($l2.session.host, $l9, $l8, $l2.storageV5);
  if ($l2.remoteCall === void 0) await $m_kGe.of($l2.session).beforeFileEdited($l9);
  let $l11 = await $m_FUr($l2, $l10, { toolName: $m_Yt, absolutePath: $l9, input: { file_path: $l0, content: $l1 } }), $l12 = $m_m_e($l2, $l10, await $m_H_e($l2.session.host, $l10));
  if ($l11 === void 0) await $m_LQe($l6, $l7, $l9, $l3.uuid);
  let $l13 = await $m_J2($l9, async () => {
    let $l14 = await $m_pw($l9, $l10, { createParents: $l11 === void 0 }).catch(($l15) => {
      if ($l11 !== void 0 && $m_z($l15)) return null;
      throw $l15;
    });
    try {
      let $l16 = $l14 === null ? null : await $l14.readExisting();
      if ($l14 !== null && $l16 !== null) {
        if ($l4.holdsOnlyStartOf($l9)) throw new $m_BX($m_e7o);
        await $m_hzo({ fullFilePath: $l9, ioPath: $l14.ioPath, diskContent: $l16.content, lastRead: $l4.get($l9), preReadGuard: $m_abn($m_Je($l2.model()), $l2.remoteCall), readBaseline: $l2.remoteCall?.readBaseline, servedOn: $l2.remoteCall?.origin.hostName, readNotAutoAllowed: () => !$m_bbe($m_Yt, $l9, $l2, $l2.permissions()) });
      }
      if ($l16?.notText) throw new $m_BX($m_WAt($l16.notText));
      let $l17 = $l16?.encoding ?? "utf8", $l18 = $l16?.content ?? null, $l19 = $l1, $l20 = $m_tL($l2), $l21 = $m_Sht($l9, $l1, $l20) ?? $m_q7e($l9, $l1);
      if ($l21 !== null) throw new $m_C($l21, "memory-directory write refused at call time");
      $l1 = $m_SQ($l9, $l1, $l20);
      let $l22 = $m_d_e($l2.session.host, $l2.toolUseId), $l23 = await $m_s1t($l9), $l24 = $l11 !== void 0 || $l14 === null ? void 0 : await $m_Jcn($l2, $l23, $l18, $l1, { remote: $l2.remoteCall !== void 0 }), $l25 = $m_D_t($l23, $l1, $l24?.context);
      $m_Zcn($l25.sharedItemBlock, "team"), $l1 = $l25.content;
      let $l26 = $l1 !== $l19 || $l22;
      if ($l11 !== void 0 || $l14 === null) return await $m_UUr({ writeCtx: $l2, tool: "Write", absolutePath: $l11?.path ?? $l9, currentContent: $l18, proposedContent: $l1 }), { oldContent: $l18, memdirStamped: $l26, staged: true };
      let $l27;
      $l1 = $m_veo($l18, $l1), await $l14.recheckBeforeWrite();
      try {
        $l27 = await $m_plt($l14.ioPath, $l1, $l17, "LF");
      } catch ($l28) {
        throw $m_nk($l9), $l28;
      }
      if (await $m_Qcn($l23, $l1, $l25.item, $l24?.rev), $l4.set($l9, { content: $m_zy($l1), timestamp: $l27, offset: void 0, limit: void 0, ...($l5 || $l26) && { contentNotInModelContext: true } }), $l17 === "utf8") $m_Lvt($l9, $l1);
      else $m_nk($l9);
      return { oldContent: $l18, memdirStamped: $l26, staged: false };
    } catch ($l29) {
      if ($l14 === null) throw $l29;
      $m_Sme($l29, $l14, $l9);
    } finally {
      await $l14?.close();
    }
  }), { oldContent: $l30, memdirStamped: $l31, staged: $l32 } = $l13;
  if ($l32) return { data: { type: $l30 === null ? "create" : "update", filePath: $l0, content: $l1, structuredPatch: [], originalFile: $l30, userModified: $l5 ?? false, staged: true, stagedWording: $m_NUr({ session: $l2.session, served: $l2.remoteCall !== void 0, cause: $l11?.cause ?? "unapproved" }) }, remedy: { kind: "staged_for_review", path: $l11?.path ?? $l9 } };
  if ($l2.remoteCall === void 0) $m_Jz($l2.nestedMemoryAttachmentTriggers, $l9);
  let $l33 = $l30 !== null && $l30.length > $m_X7e, $l34 = $l2.remoteCall === void 0 ? $m_UTe() : void 0;
  if ($l34) $m_lan($l2.session, $l9), $m_dan($l2.session, $l9), $l34.changeFile($l9, $l1).catch(($l35) => {
    $m_t(`LSP: Failed to notify server of file change for ${$l9}: ${$l35.message}`, { level: "error" });
  }), $l34.saveFile($l9).catch(($l36) => {
    $m_t(`LSP: Failed to notify server of file save for ${$l9}: ${$l36.message}`, { level: "error" });
  });
  if ($m_bht($l9, $l33 ? null : $l30, $l1), $l9.endsWith(`${$m_pzo}CLAUDE.md`)) $m_a("tengu_write_claudemd", {});
  let $l37;
  if ($m_oBr($l2) && !$l33) {
    let $l38 = Date.now(), $l39 = await $m_iBr($l9);
    if ($l39 && $m_sBr($l39)) $l37 = $l39;
    $m_a("tengu_tool_use_diff_computed", { isWriteTool: true, durationMs: Date.now() - $l38, hasDiff: !!$l39 });
  }
  let $l40 = $l2.callerLogsSharedEvents ? $m_$6n : $m_a1t;
  if ($l30) {
    let $l41 = $l33 ? [] : $m_qye({ filePath: $l0, oldContent: $l30, newContent: $l1, convertTabs: true, isForToolResult: $l11 === void 0 }), $l42 = { type: "update", filePath: $l0, content: $l1, structuredPatch: $l41, originalFile: $l33 ? null : $l30, userModified: $l5 ?? false, ...$l31 && { memdirStamped: true }, ...$l12 && { syncedSkillNext: $l12 }, ...$l37 && { gitDiff: $l37 } };
    return $l40($l41, $l3.message.model, $l33 ? $l1 : void 0, $l33 ? $l30 : void 0), $m_oR({ operation: "write", tool: "FileWriteTool", filePath: $l9, type: "update" }), { data: $l42 };
  }
  let $l43 = { type: "create", filePath: $l0, content: $l1, structuredPatch: [], originalFile: null, userModified: $l5 ?? false, ...$l31 && { memdirStamped: true }, ...$l12 && { syncedSkillNext: $l12 }, ...$l37 && { gitDiff: $l37 } };
  return $l40([], $l3.message.model, $l1), $m_oR({ operation: "write", tool: "FileWriteTool", filePath: $l9, type: "create" }), { data: $l43 };
}
;
