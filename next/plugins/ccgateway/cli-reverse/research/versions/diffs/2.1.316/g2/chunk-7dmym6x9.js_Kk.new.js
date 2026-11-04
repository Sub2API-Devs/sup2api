function SELF($l0, $l1 = [], $l2, $l3) {
  $l0 = $m_zGt($l0, $l3?.accountMemoryWithheld, $m_fq(() => $l1));
  let $l4 = $m_lTt($m_bvs($l0, $l3?.preserveTrailingThinking)), $l5 = $m_aJe($l3?.thinkingStripPlan, $m_kZ($l4)), $l6 = $m_iJe($l3?.advisorStripPlan, $m_uB($l4)), $l7 = $l2 !== void 0 && $m_T6($l2), $l8 = $l7 && !$NEW_chunk_aepeg2w5_js_Wss($l2), $l9 = $l2 !== void 0 && $l7 && $m_lar($l2), $l10 = $l7 ? /* @__PURE__ */ new Map() : void 0, $l11 = new Set($l1.map(($l12) => $l12.name)), $l13 = $l3?.keptToolNames;
  for (let $l14 of [...$l13 ?? [], ...$l3?.declaredToolNames ?? []]) $l11.add($l14);
  let $l15 = $l3?.echoWireToolInputs === true, $l16 = $l3?.ingestPool, $l17, $l18 = () => $l17 ??= $m__h(), $l19, $l20 = () => $l19 ??= $m_FBt($l0, $l3?.reminderFold), $l21 = $m_oJe($l0), $l22, $l23 = () => $l22 ??= $m_Het(), $l24 = $m_Uwt($m_dTs($l4, true, $l7), $l4, $l1.some(($l25) => $m_xt($l25, $m_Yp))), $l26 = $m_Tle($l4), $l27 = $m_fvs($l4), $l28 = $m_dwt($l4), $l29 = $m_fwt($l4), $l30, $l31 = false;
  for (let $l32 of $l24) if ($l32.type === "attachment" && $l32.attachment.type === "read_truncation_notice" && !$m_Ugt($l32)) ($l30 ??= /* @__PURE__ */ new Set()).add($l32.attachment.toolUseID);
  else if (!$l31 && $l32.type === "user" && $l32.toolUseResult?.file?.truncatedByTokenCap === true) $l31 = true;
  let $l33;
  if ($l31) {
    $l33 = /* @__PURE__ */ new Set();
    for (let $l34 of $l24) if ($l34.type === "assistant" && Array.isArray($l34.message.content)) {
      for (let $l35 of $l34.message.content) if ($l35.type === "tool_use") $l33.add($l35.id);
    }
  }
  let $l36, $l37 = /* @__PURE__ */ new Map(), $l38 = /* @__PURE__ */ new Map(), $l39 = 0, $l40 = $l39, $l41 = false, $l42, $l43, $l44 = /* @__PURE__ */ new Map();
  for (let $l45 = 0; $l45 < $l24.length; $l45++) {
    let $l46 = $l24[$l45];
    if (!$m_zte($l46)) {
      $l41 = false;
      continue;
    }
    if (!$l41) $l41 = true, $l40++;
    let $l47 = $m_I3n($l46) ?? (Array.isArray($l46.message.content) && $l46.message.content[0]?.type === "text" ? ($l36 ??= $m_mTs())[$l46.message.content[0].text] : void 0);
    if (!$l47) continue;
    let $l48 = $l46.errorDetails ?? "", $l49 = $m_ZSt($l48);
    if ($l49 !== void 0) {
      for (let $l50 = 0; $l50 < $l45; $l50++) {
        let { uuid: $l51 } = $l24[$l50], $l52 = $l44.get($l51);
        if ($l52 === void 0 || $l49 < $l52.limit) $l44.set($l51, { limit: $l49, reason: $l48 });
      }
      continue;
    }
    for (let $l53 = $l45 - 1; $l53 >= 0; $l53--) {
      let $l54 = $NEW_chunk_e6aww6q8_js_get($l24[$l53]), $l55;
      if ($l46.healsDistinctCarrier) {
        if ($l54.type !== "user" && $l54.type !== "attachment") continue;
        let $l56 = $l38.get($l54.uuid), $l57 = $l56 ? new Set([...$l47].filter(($l58) => {
          let $l59 = $l56.get($l58);
          return $l59 === void 0 || $l59 === $l40;
        })) : $l47;
        if ($l57.size === 0) continue;
        if ($l54.type === "attachment") {
          $l43 ??= /* @__PURE__ */ new Map();
          let $l60 = $l43.get($l54.uuid);
          if ($l60 === void 0) $l60 = $m_STs($l54.attachment, $m_kTs), $l43.set($l54.uuid, $l60);
          if ($l55 = new Set([...$l57].filter(($l61) => $l60.has($l61))), $l55.size === 0) continue;
        } else if (!$m_KOe($l54, $l57)) {
          if (!$m_hTs($l54)) continue;
          if ($l42 === void 0) {
            $l42 = /* @__PURE__ */ new Map();
            for (let $l62 of $l24) {
              if ($l62.type !== "assistant" || !Array.isArray($l62.message.content)) continue;
              for (let $l63 of $l62.message.content) if ($l63.type === "tool_use") $l42.set($l63.id, $l63.name);
            }
          }
          let $l64 = $m__Ts($l54, $l42), $l65 = [...$l57].filter(($l66) => $l64.has($l66));
          if ($l65.length === 0) continue;
          let $l67 = $l38.get($l54.uuid) ?? /* @__PURE__ */ new Map();
          for (let $l68 of $l65) if (!$l67.has($l68)) $l67.set($l68, $l40);
          $l38.set($l54.uuid, $l67);
          break;
        } else $l55 = new Set([...$l57].filter(($l69) => $m_KOe($l54, /* @__PURE__ */ new Set([$l69]))));
      } else if ($l54.type !== "user" || !$m_KOe($l54, $l47)) {
        if ($m_zte($l54) || $m_gy($l54) || $l54.type === "user" && $l54.isMeta) continue;
        break;
      } else $l55 = $l47;
      let $l70 = $l37.get($l54.uuid);
      if ($l70) for (let $l71 of $l55) $l70.add($l71);
      else $l37.set($l54.uuid, new Set($l55));
      let $l72 = $l38.get($l54.uuid) ?? /* @__PURE__ */ new Map();
      for (let $l73 of $l55) if (!$l72.has($l73)) $l72.set($l73, $l46.healsDistinctCarrier ? $l40 : $l39);
      $l38.set($l54.uuid, $l72);
      break;
    }
  }
  let $l74 = [], $l75 = $m_Eft(), $l76 = [], $l77 = [], $l78 = [], $l79 = /* @__PURE__ */ new Map(), $l80 = $l3?.inlineToolDefinitions !== void 0 ? $m_wSt($l0, $l3.nameOnlyAnnouncements) : void 0, $l81 = /* @__PURE__ */ new Set(), $l82, $l83 = [], $l84 = [], $l85 = $l3?.keptReminders === true && $l7, $l86 = /* @__PURE__ */ new Map(), $l87 = /* @__PURE__ */ new Set(), $l88 = [], $l89 = false, $l90 = /* @__PURE__ */ new Map(), $l91 = 0, $l92 = $m_vTs($l4), $l93 = $l92 && /* @__PURE__ */ new Set(), $l94 = [], $l95 = /* @__PURE__ */ new Set(), $l96 = /* @__PURE__ */ new Set(), $l97 = /* @__PURE__ */ new Map(), $l98, $l99 = /* @__PURE__ */ new Set();
  function $l100($l101, $l102, $l103) {
    let $l104 = $l101.userRoleGuard === true, $l105 = ($l106) => {
      if ($l104 || $m_Ele($l101.kinds)) $l3?.onSessionNoticeRender?.({ uuid: $l102, timestamp: $l103, guarded: $l104, ...$l106 });
    }, $l107 = $l101;
    if (!$l104 && $l95.has($l102)) return true;
    if ($l104) {
      let $l108 = $l95.has($l102) ? void 0 : $m_Fbt($l101, $l96);
      if ($l95.add($l102), $l108 === void 0) return $l105({ reason: "repeated", outcome: "omitted" }), true;
      $l107 = $l108;
    }
    let $l109 = $l104 && $m_Ibt(), $l110 = !$l104 && $m_Ole($l101), $l111 = $m_Pz(), $l112 = $l111 || $l109 ? $m_wTs($l74, $l107, $l102, !$l104 ? "tail_text" : $l109 ? "second_pair" : "refuse", $l110 ? ($l113) => $l97.has($l113) || $l99.has($l113) : $l109 ? ($l114) => $l97.get($l114) === "declared" || $l99.has($l114) : ($l115) => $l99.has($l115)) : void 0;
    if ($l112 === "no_assistant") $l3?.onDeclaredRoundRender?.($l102, $l101);
    if ($l112 === "no_assistant" && ($l109 || $l110)) {
      let $l116 = $l92?.get($l102) ?? null;
      if ($l94.push({ attachment: $l107, uuid: $l102, timestamp: $l103, anchor: $l116, guarded: $l104 }), $l95.add($l102), $l104) $m_B6n($l107, $l96);
      if ($l116 === null) $l117($l93);
      return true;
    }
    if ($l104 && ($l112 === "hosted" || $l112 === "second_pair")) $m_B6n($l107, $l96);
    let $l118 = $m_ETs($l112, $l111, $l104);
    if ($l118 !== void 0) $l105($l118);
    return $l112 === "hosted" || $l112 === "second_pair" || $l112 === "tail_text";
  }
  function $l117($l119) {
    let $l120 = $l94.filter(($l121) => $l119 === void 0 || $l121.anchor === null || $l119.has($l121.anchor));
    if ($l120.length === 0) return;
    $l94.splice(0, $l94.length, ...$l94.filter(($l122) => !$l120.includes($l122)));
    for (let [$l123, { attachment: $l124, uuid: $l125, timestamp: $l126, guarded: $l127 }] of $l120.entries()) {
      if ($l127) $l3?.onSessionNoticeRender?.({ uuid: $l125, timestamp: $l126, guarded: true, reason: "no_assistant", outcome: "synthetic_round" });
      let $l128 = $l127 ? "session_notice" : "declared", $l129 = $l98 !== void 0 && $l98 !== $l128, $l130 = $l127 && !$l129;
      if ($l123 === 0) if ($l130) $l131();
      else $l132();
      let $l133 = !$l74.some(($l134) => $l134.type === "user");
      if ($l129 || $l127 && $l133) {
        let $l135 = $m_Xa($l127 ? $m_Lbt : $m_Swt), $l136 = $l74.findLastIndex(($l137) => $l137.type !== "api_system"), $l138 = $l74[$l136];
        if (!$l133 && $l138?.type === "user") {
          let $l139 = $l138.message.content;
          $l74[$l136] = { ...$l138, message: { ...$l138.message, content: [...typeof $l139 === "string" ? [{ type: "text", text: $l139 }] : $l139, { type: "text", text: $l135 }] } };
        } else $l74.push($m_Ie({ content: $l135, isMeta: true, uuid: $m_AD("wake", $l125) }));
      }
      if ($l123 === 0 && !$l130 && !$l133) $l131();
      $l98 = $l128;
      let $l140 = `${$m_aNe}${$l125}`, $l141 = $m_mft({ type: "tool_use", id: $l140, name: $m_Yp, input: {} }, $l125);
      $l97.set($l141.uuid, $l128), $l74.push($l141, $m_Ie({ content: [{ type: "tool_result", tool_use_id: $l140, content: $m_sEt($m_HZ($l124.envelopes, $l124.remainingWakeCount, $l124.toolsUsed), $l124.media) }], isMeta: true, uuid: $l125 })), $l90.clear(), $l91 = $l74.length;
    }
  }
  let $l142 = [];
  function $l132() {
    if ($l142.length === 0) return;
    let $l143 = $l142.splice(0), $l144 = $m_e1($l74);
    if ($l144?.type === "user") {
      $l74[$l74.length - 1] = $l143.reduce(($l145, $l146) => $m_KN($l145, $l146, $l75), $l144);
      return;
    }
    $l74.push($l143.reduce(($l147, $l148) => $m_KN($l147, $l148, $l75)));
  }
  function $l149($l150, $l151) {
    if ($l7) {
      $l76.push($l151), $l83.push($l151);
      return;
    }
    let $l152 = $m_e1($l74), $l153 = $m_Ie({ content: $m_Xa($l150), isMeta: true });
    if ($l152?.type === "user") $l74[$l74.length - 1] = $m_dft($l152, $l153, $l20(), false, $l21);
    else $l74.push($l153);
  }
  function $l131() {
    $l132();
    let $l154 = ["batching_reminder_sent", "secondary_reminder_sent"].filter(($l155) => !$l87.has($l155)).map(($l156) => $l86.get($l156) ?? "").filter(($l157) => $l157.trim() !== "");
    if ($l86.clear(), $l87.clear(), $l76.length === 0 && $l84.length === 0 && $l154.length === 0) return;
    let $l158 = $l76.join(`

`), $l159 = $l83.join(`

`), $l160 = $l84.join(`

`), $l161 = [...$l84, ...$l154].join(`

`), $l162 = $l77.splice(0), $l163 = $l78.splice(0), $l164 = new Map($l79);
    $l79.clear();
    let $l165 = [], $l166 = 0;
    for (let $l167 of $l76) $l165.push($l166), $l166 += $l167.length + 2;
    let $l168 = $l88.splice(0).map(({ type: $l169, entry: $l170 }) => ({ type: $l169, start: $l165[$l170] ?? 0, length: $l76[$l170]?.length ?? 0 })), $l171 = $l168.map(($l172) => $l172.type);
    $l76.length = 0, $l83.length = 0, $l84.length = 0;
    let $l173 = $l162.length > 0 || $l164.size > 0 ? $l159 : void 0, $l174 = $m_e1($l74);
    if ($l174?.type === "api_system") {
      if ($m_sle($l174, $l158, $l161, $l173, $l168), $l154.length > 0) $l174.reminderFromRecords = true;
      if ($m_kft($l174, $l162, $l163, $l164, $l81), $l171.length > 0) $l174.foldedAttachmentTypes = [...$l174.foldedAttachmentTypes ?? [], ...$l171];
    } else if ($l174?.type === "user") {
      $l89 = true;
      let $l175 = $m_rle("");
      if ($m_sle($l175, $l158, $l161, $l173, $l168), $l154.length > 0) $l175.reminderFromRecords = true;
      if ($l82?.toolDefinitions !== void 0) for (let $l176 of Object.keys($l82.toolDefinitions)) $l81.add($l176);
      if ($l82 = $l175, $m_kft($l175, $l162, $l163, $l164, $l81), $l171.length > 0) $l175.foldedAttachmentTypes = $l171;
      $l74.push($l175);
    } else {
      let $l177 = $m_jI($l173 ?? $l158, $l160);
      if ($l154.length > 0 && $l177 === "") return;
      $l74.push($m_Ie({ content: $l9 ? $l177 : $m_Xa($l177), isMeta: true, ephemeral: $l160 !== "" || void 0 }));
    }
  }
  let $l178 = /* @__PURE__ */ new Set();
  function $l179($l180, $l181, $l182) {
    if ($l178.has($l181)) return true;
    let $l183 = $m_OTs($l74, $l180, $l181, { ...$l182, behindEarlierMessages: $l29.has($l181), report: $l2 !== void 0, flushTail: $l131, isRoundHost: ($l184) => $l99.has($l184) });
    if ($l183 === false) return false;
    if ($l178.add($l181), $l183 === "new_turn") $l90.clear(), $l91 = $l74.length;
    return true;
  }
  function $l185($l186, $l187) {
    let $l188 = $m_MTs($l186, $l187);
    if ($l188 === void 0 || $l99.has($l188.call.uuid)) return;
    let $l189 = $m_e1($l74);
    if ($l189?.type === "user") $l74[$l74.length - 1] = $m_dft($l189, $l188.notice, $l20(), $l7, $l21);
    else $l74.push($l188.notice);
    $l131(), $l99.add($l188.call.uuid), $l74.push($l188.call, $l188.results), $l90.clear(), $l91 = $l74.length;
  }
  let $l190;
  for (let $l191 of $l24) {
    if ($l93 !== void 0) {
      if ($l190 !== void 0) $l93.add($l190);
      $l190 = $l191.uuid, $l117($l93);
    }
    if ($m_hb($l191)) continue;
    switch ($l191.type) {
      case "progress":
        continue;
      case "system": {
        if (!$m_p1($l191)) continue;
        $l132(), $l86.clear();
        let $l192 = $m_Ie({ content: $l191.content, uuid: $l191.uuid, timestamp: $l191.timestamp }), $l193 = $m_e1($l74);
        if ($l193?.type === "user") {
          $l74[$l74.length - 1] = $m_KN($l193, $l192, $l75);
          continue;
        }
        $l74.push($l192);
        continue;
      }
      case "user": {
        if ($m_Tcn($l191)) continue;
        $l132(), $l86.clear();
        let $l194 = $l191;
        if ($l191.taskDelivery && $l179($l191.taskDelivery, $l191.uuid, { startsTurn: true, inDrainPosition: false, inHumanTurn: false })) continue;
        if ($l191.taskDelivery) $l194 = { ...$l194, taskDelivery: void 0 };
        if ($l191.origin?.kind === "task-notification") {
          let $l195 = $l194.message.content, $l196, $l197 = $l191.origin.subkind === "scheduled-trigger" ? ($l198) => $m_T4o($l198.join(`

`)) : $l191.origin.subkind === "projects-relay" && $NEW_chunk_aepeg2w5_js_C8t($l191) ? $NEW_chunk_s1zey0a9_js_VVr : void 0;
          if ($l197) $l196 = typeof $l195 === "string" ? $l197([$l195]) : [{ type: "text", text: $l197($l195.flatMap(($l199) => $l199.type === "text" ? [$l199.text] : [])) }, ...$l195.filter(($l200) => $l200.type !== "text")];
          else if (typeof $l195 === "string") $l196 = $m_k4o($l195);
          else {
            let $l201 = $l195.filter(($l202) => $l202.type === "text").map(($l203) => $l203.text).join(`
`);
            $l196 = [{ type: "text", text: $m_k4o($l201) }, ...$l195.filter(($l204) => $l204.type !== "text")];
          }
          $l194 = { ...$l194, origin: void 0, message: { ...$l194.message, content: $l196 } };
        }
        if ($l191.origin?.kind === "peer" && $l191.origin.activityObservation !== void 0) {
          let $l205 = $m_vft(), $l206 = $l194.message.content, $l207 = typeof $l206 === "string" ? $l206 : $l206[0]?.type === "text" ? $l206[0].text : void 0, $l208 = $l207 !== void 0 && $m_B4o.some(($l209) => $l207.startsWith(`${$l209}
`));
          if ($l205 && $l208) $l194 = { ...$l194, origin: void 0, message: { ...$l194.message, content: typeof $l206 === "string" ? $m_Xa($m_REt($l206)) : $l206.map(($l210) => $l210.type === "text" ? { ...$l210, text: $m_Xa($m_REt($l210.text)) } : $l210) } };
          else if ($m_Vr().idleObservationFence === void 0) $l194 = { ...$l194, origin: void 0 };
        }
        if (!$l18()) $l194 = $m_nJe($l194);
        else $l194 = $m_uTs($l194, $l1, $l11, $l3?.strippedToolReferenceKeys);
        let $l211 = $l37.get($l194.uuid);
        if ($l211) {
          let $l212 = $m_H6n($l194, $l211);
          if ($l212 === null) continue;
          $l194 = $l212;
        }
        $l194 = $m_O3([$l194], $l44.get($l194.uuid)?.reason ?? "")[0];
        let $l213 = $l194.message.content;
        if (Array.isArray($l213) && $m_cTs($l213)) {
          if ($l8) {
            let $l214 = $l213.filter(($l215) => $l215.type !== "text" || !$NEW_chunk_e6aww6q8_js_oxs.test($l215.text));
            if ($l214.length < $l213.length) $l194 = { ...$l194, message: { ...$l194.message, content: $l214 } };
          } else if (!$l213.some(($l216) => $l216.type === "text" && $l216.text.startsWith($m_O6n))) $l194 = { ...$l194, message: { ...$l194.message, content: [...$l213, { type: "text", text: $m_O6n }] } };
        }
        if ($l10) {
          let $l217 = $m_jTs($l194, $l10);
          if ($l217) {
            $l194 = $l217.cleaned;
            let $l218 = $l9 ? $l217.reminders.map($m_Xa) : $l217.reminders;
            $l76.push(...$l218), $l83.push(...$l218);
          }
        }
        let $l219 = $m_WTs($l191, $l30, $l33);
        if ($l194 = $m_F6n($l194), $l191.withdrawnImages !== void 0) $l194 = { ...$l194, withdrawnImages: void 0 };
        let $l220 = $m_e1($l74);
        if ($l220?.type === "user") $l74[$l74.length - 1] = $m_KN($l220, $l194, $l75);
        else $l74.push($l194);
        if ($l219 !== void 0) {
          let $l221 = $m__D($l219);
          $l149($l221, $l221);
        }
        for (let $l222 of $NEW_chunk_e6aww6q8_js_I6n($l191.withdrawnImages)) $l149($l222, $l9 ? $m_Xa($l222) : $l222);
        continue;
      }
      case "assistant": {
        $l117(), $l132();
        let $l223 = $l18(), $l224 = $m_s3s($l191.message.content, $l191.batchToolUses, $l1), $l225;
        for (let $l226 = 0; $l226 < $l224.length; $l226++) {
          let $l227 = $l224[$l226];
          if ($l227.type === "text" && Array.isArray($l227.citations) && $l227.citations.some(($l228) => $l228?.type !== "web_search_result_location")) $l225 ??= $l224.slice(), $l225[$l226] = { ...$l227, citations: $l227.citations.filter(($l229) => $l229?.type === "web_search_result_location") };
          if ($l227.type !== "tool_use") continue;
          $l10?.set($l227.id, $l227.name);
          let $l230 = $m_xn($l1, $l227.name), $l231 = $l230?.name ?? $l227.name, $l232 = $l15 && $m_sn($l191.wireToolInputs) ? $l191.wireToolInputs : void 0, $l233 = $l232 !== void 0 && Object.hasOwn($l232, $l227.id) ? $l232[$l227.id] : void 0, $l234 = $l232 !== void 0 && $m_sn($l233) && $m_k9t($l232, $l227.id, $l233, $l227.input, $l231, $l230, $l191.wireIngestContext?.[$l227.id], $l16) ? $l231 === $m_In ? $m_i5t($l233) ?? $l233 : $l233 : $m_Y3t($l231, $l227.input, $l230 !== void 0 || $l13?.has($m_cd($l227.name)) === true);
          if ($l223 && $l234 === $l227.input && $l231 === $l227.name) continue;
          $l225 ??= $l224.slice(), $l225[$l226] = $l223 ? { ...$l227, name: $l231, input: $l234 } : { type: "tool_use", id: $l227.id, name: $l231, input: $l234 };
        }
        let $l235 = $l225 ?? ($l224 !== $l191.message.content ? $l224 : void 0), $l236 = $l191;
        if ($l191.wireToolInputs !== void 0 || $l191.wireIngestContext !== void 0 || $l235 !== void 0) {
          let { wireToolInputs: $l237, wireIngestContext: $l238, ...$l239 } = $l191;
          $l236 = $l235 !== void 0 ? { ...$l239, message: { ...$l191.message, content: $l235 } } : $l239;
        }
        for (; $l91 < $l74.length; $l91++) {
          let $l240 = $l74[$l91];
          if ($l240.type === "assistant") $l90.set($l240.message.id, $l91);
          else if ($l240.type !== "api_system" && !$m_gy($l240)) $l90.clear();
        }
        let $l241 = $l90.get($l236.message.id), $l242 = $l241 === void 0 ? void 0 : $l74[$l241];
        if ($l241 !== void 0 && $l242?.type === "assistant") $l74[$l241] = $m_ITs($l242, $l236, { echoApiBlockOrder: $l3?.echoApiBlockOrder === true });
        else {
          $l131();
          let $l243 = $l236.message.content, $l244 = $l3?.echoApiBlockOrder === true && typeof $l236.apiBlockIndex === "number" ? $l243 : $m_N3n($l243);
          if ($l244 === $l243) $l74.push($l236);
          else {
            let { apiBlockIndex: $l245, apiBlockIndices: $l246, ...$l247 } = $l236;
            $l74.push({ ...$l247, message: { ...$l236.message, content: $l244 } });
          }
        }
        continue;
      }
      case "attachment": {
        if ($m_Ugt($l191)) continue;
        if ($l191.attachment.type === "poll_events" && $l191.attachment.deliveredVia === void 0 && $l3?.pollEventsAsText !== true && $l100($l191.attachment, $l191.uuid, $l191.timestamp)) continue;
        if ($l191.attachment.type === "queued_command" && $l191.attachment.taskDelivery && $l179($l191.attachment.taskDelivery, $l191.uuid, { startsTurn: false, inDrainPosition: $l28.has($l191.uuid), inHumanTurn: $l26.has($l191.uuid) })) continue;
        if ($l191.attachment.type === "project_doc_reads") {
          $l185($l191.attachment, $l191.uuid);
          continue;
        }
        let $l248 = $l191.attachment.type === "batching_reminder" || $l191.attachment.type === "secondary_reminder";
        if ($l248 && !$l7) continue;
        if ($l191.attachment.type === "output_limit_note" && !($l7 && typeof $l191.attachment.model === "string" && $m_Z5($l191.attachment.model, $l2))) continue;
        if ($l85 && ($l191.attachment.type === "batching_reminder_sent" || $l191.attachment.type === "secondary_reminder_sent") && $l191.attachment.clearAt === "next_user_message") {
          let $l249 = $m_YOe([$m_Ie({ content: $m_Xa($l191.attachment.text), isMeta: true })]) ?? "";
          $l86.set($l191.attachment.type, $l249 && $l9 ? $m_Xa($l249) : $l249);
          continue;
        }
        let $l250 = $l7 && $l3?.surfaceLateToolAdditions === true && $l3.inlineToolDefinitions !== void 0 && $l191.attachment.type === "deferred_tools_delta" ? $m_Ovs($l80?.get($l191.uuid), $l3.inlineToolDefinitions) : void 0, $l251 = $l7 && $l3?.surfaceLateToolAdditions === true && $l191.attachment.type === "deferred_tools_delta" && $l3.nameOnlyAnnouncements?.has($l191.uuid) !== true ? [...$m__i($l191.attachment.surfacedNames), ...$l250 !== void 0 ? $m__i($l191.attachment.replacedNames) : []].filter(($l252) => $l250?.definitions.get($l252) !== void 0 || $l3.deferredWireToolNames?.has($l252) === true) : [], $l253 = $l250 !== void 0 && $l191.attachment.type === "deferred_tools_delta" && $l3?.nameOnlyAnnouncements?.has($l191.uuid) !== true ? $m__i($l191.attachment.removedByBlock) : [], $l254 = $l7 && $l3?.advisorToolChanges === true && $l191.attachment.type === "advisor_tool" ? $l191.attachment.toolChange : void 0, $l255 = $m_bft($l191.attachment), $l256 = $m_wft($l191.attachment), $l257 = $l7 && $l191.attachment.type === "queued_command" && $l191.attachment.humanTurn === true && $l191.attachment.commandMode === "prompt" && $l191.attachment.isMeta !== true && $m_$v($l191) && !$m_uie($l191.attachment) && $l23(), $l258 = $l27.has($l191.uuid) || $l251.length > 0 || $l253.length > 0 || $l254 !== void 0, $l259 = { inHumanTurn: $l26.has($l191.uuid), surfacedToolNames: $l251 }, $l260 = $l3?.withoutAttachmentHooks ? $m_nLe($l191, $l259) : $m_K3n($l191, $l259, $l258), $l261 = $l260.messages, { isKnownType: $l262, recordedRole: $l263 } = $l260, $l264 = $m_R3n($l191.attachment) ? "user" : "system", $l265 = $l263 === void 0 ? $l262 && !$m_C3n($l191.attachment) : $l263 === "system";
        if ($l2 !== void 0 && $l261.length > 0 && (!$l262 || $l263 !== void 0 && $l263 !== $l264) && typeof $l191.attachment === "object" && !$m_U6n.has($l191.attachment)) $m_U6n.add($l191.attachment), $m_a("tengu_attachment_role_unknown_or_differs", { is_known_type: $l262, recorded_role: $m_c($l263 ?? "none"), should_promote: $l265, system_turns_on: $l7 });
        let $l266 = $l37.get($l191.uuid);
        if ($l266) $l261 = $l261.flatMap(($l267) => {
          let $l268 = $m_H6n($l267, $l266);
          return $l268 === null ? [] : [$l268];
        });
        let $l269 = $l191.attachment.type === "queued_command" && $m_Zxt($l191.attachment.reminderId) ? $l191.attachment.reminderId : void 0, $l270 = $l44.get($l191.uuid)?.reason ?? "";
        if ($l261 = $l261.map(($l271) => {
          let $l272 = $m_O3([$l271], $l270)[0];
          if ($l269 === void 0 || !$m_N6n($l271, $l269)) return $m_F6n($l272);
          let $l273 = $l272.message.content;
          if ($l272 === $l271 || typeof $l273 === "string") return $l271;
          let $l274 = $l273.filter(($l275) => $l275.type !== "text" || $m_sBe($l275.text) === $l269);
          return { ...$l272, message: { ...$l272.message, content: $l274 } };
        }), $l257) {
          let $l276 = [];
          for (let $l277 of $l261) {
            if ($l277.isMeta) {
              $l276.push($l277);
              continue;
            }
            let $l278 = $l277.message.content;
            $l142.push({ ...$l277, message: { ...$l277.message, content: typeof $l278 === "string" ? $m_Pce($l278) : $l278.map(($l279) => $l279.type === "text" ? { ...$l279, text: $m_Pce($l279.text) } : $l279) } });
          }
          if ($l276.length === 0) continue;
          $l261 = $l276;
        }
        if ($l7 && $l269 !== void 0) {
          let $l280 = [], $l281 = [];
          for (let $l282 of $l261) if ($m_N6n($l282, $l269) || $m_fTs($l282)) $l280.push($l282);
          else $l281.push($l282);
          if ($l280.length > 0) {
            let $l283 = $m_e1($l74);
            if ($l283?.type === "user") $l74[$l74.length - 1] = $l280.reduce(($l284, $l285) => $m_KN($l284, $l285, $l75), $l283);
            else $l74.push(...$l280);
            if ($l281.length === 0) continue;
            $l261 = $l281;
          }
        }
        if ($l7 && $l265) {
          let $l286 = $m_YOe($l261);
          if ($l286 !== null) {
            let $l287 = $l9 ? $m_Xa($l286) : $l286;
            if ($l248) {
              $l84.push($l287), $l87.add(`${$l191.attachment.type}_sent`);
              continue;
            }
            $l76.push($l287), $l88.push({ type: $l191.attachment.type, entry: $l76.length - 1 });
            let $l288 = { ...$l259, surfacedToolNames: [] }, $l289 = $l251.length > 0 ? $m_YOe($l3?.withoutAttachmentHooks ? $m_nLe($l191, $l288).messages : $m_UWe($l191, $l288)) ?? $l286 : $l286;
            $l83.push($l9 ? $m_Xa($l289) : $l289);
            for (let $l290 of $l253) $l78.push({ op: "remove", name: $l290, byValue: true });
            for (let $l291 of $l251) {
              let $l292 = $l250?.definitions.get($l291);
              if ($l292 === void 0) $l77.push($l291);
              else $l79.set($l291, $l292), $l78.push({ op: "add", name: $l291 });
            }
            if ($l254 !== void 0) $l78.push({ op: $l254, name: $m_TLe });
            continue;
          }
        }
        let $l293 = $l20() && !$l255 && !$l256 ? $l261.map($m_T3n) : $l261, $l294 = $l255 || $l256 || $l7 && ($l191.attachment.type === "account_memory_recall" || $l191.attachment.type === "cowork_memory_context" || $l191.attachment.type === "nested_memory" || $m_E3n($l191.attachment)), $l295 = $m_e1($l74);
        if ($l295?.type === "user") {
          $l74[$l74.length - 1] = $l293.reduce(($l296, $l297) => $l294 ? $m_KN($l296, $l297, $l75) : $m_dft($l296, $l297, $l20(), $l7, $l21), $l295);
          continue;
        }
        $l74.push(...$l293);
        continue;
      }
    }
  }
  $l117(), $l131();
  let $l298 = $m_Tvs($l74, $l3?.preserveTrailingThinking), $l299 = $m_r9n($l298, $l3?.preserveTrailingThinking), $l300 = $l299.length === $l298.length ? $l299 : $m_JOe($l299), $l301 = $m_X3n($l300, $l3?.preserveTrailingThinking), $l302 = $m_n9n($l301), $l303 = $m_vvs($l302), $l304;
  if ($l7) $l304 = $l89 ? $m_DTs($l303, $l9) : $l303;
  else if ($l20()) $l304 = $m_O3n($m_JOe($l303), $l7, $l21);
  else $l304 = $l303;
  let $l305 = $l3?.echoApiBlockOrder === true ? $m_rJe($l304, $l3?.preserveTrailingThinking) : $l304, $l306 = $l5.size > 0 ? $m_Cvs($l305, $l5) : $l305, $l307 = $m_pTs($l6.size > 0 ? $m_xw($l306, $l6) : $l306);
  return $m_i3s($m_ywt($l307), $l1);
}
;
