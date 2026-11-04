function SELF($l0, $l1 = [], $l2, $l3) {
  $l0 = $m_L1t($l0, $l3?.accountMemoryWithheld, $m__V(() => $l1));
  let $l4 = $m_ARt($m_Xxs($l0, $l3?.preserveTrailingThinking)), $l5 = $m_ytt($l3?.thinkingStripPlan, $m_hee($l4)), $l6 = $m_htt($l3?.advisorStripPlan, $m_KH($l4)), $l7 = $l2 !== void 0 && $m_k9($l2), $l8 = $l2 !== void 0 && $l7 && $m_lqr($l2), $l9 = $l7 ? /* @__PURE__ */ new Map() : void 0, $l10 = new Set($l1.map(($l11) => $l11.name)), $l12 = $l3?.keptToolNames;
  for (let $l13 of [...$l12 ?? [], ...$l3?.declaredToolNames ?? []]) $l10.add($l13);
  let $l14 = $l3?.echoWireToolInputs === true, $l15 = $l3?.ingestPool, $l16, $l17 = () => $l16 ??= $m_oh(), $l18, $l19 = () => $l18 ??= $m_L$t($l0, $l3?.reminderFold), $l20 = $m_ptt($l0), $l21, $l22 = () => $l21 ??= $m_Zrt(), $l23 = $m_mRt($m_WCs($l4, true, $l7), $l4, $l1.some(($l24) => $m_Rt($l24, $m_dg))), $l25 = $m_jde($l4), $l26 = $m_Uxs($l4), $l27 = $m_$Et($l4), $l28 = $m_WEt($l4), $l29, $l30 = false;
  for (let $l31 of $l23) if ($l31.type === "attachment" && $l31.attachment.type === "read_truncation_notice" && !$m_fpt($l31)) ($l29 ??= /* @__PURE__ */ new Set()).add($l31.attachment.toolUseID);
  else if (!$l30 && $l31.type === "user" && $l31.toolUseResult?.file?.truncatedByTokenCap === true) $l30 = true;
  let $l32;
  if ($l30) {
    $l32 = /* @__PURE__ */ new Set();
    for (let $l33 of $l23) if ($l33.type === "assistant" && Array.isArray($l33.message.content)) {
      for (let $l34 of $l33.message.content) if ($l34.type === "tool_use") $l32.add($l34.id);
    }
  }
  let $l35, $l36 = /* @__PURE__ */ new Map(), $l37 = /* @__PURE__ */ new Map(), $l38 = 0, $l39 = $l38, $l40 = false, $l41, $l42, $l43 = /* @__PURE__ */ new Map();
  for (let $l44 = 0; $l44 < $l23.length; $l44++) {
    let $l45 = $l23[$l44];
    if (!$m_mee($l45)) {
      $l40 = false;
      continue;
    }
    if (!$l40) $l40 = true, $l39++;
    let $l46 = $m_zZn($l45) ?? (Array.isArray($l45.message.content) && $l45.message.content[0]?.type === "text" ? ($l35 ??= $m_KCs())[$l45.message.content[0].text] : void 0);
    if (!$l46) continue;
    let $l47 = $l45.errorDetails ?? "", $l48 = $m_yvt($l47);
    if ($l48 !== void 0) {
      for (let $l49 = 0; $l49 < $l44; $l49++) {
        let { uuid: $l50 } = $l23[$l49], $l51 = $l43.get($l50);
        if ($l51 === void 0 || $l48 < $l51.limit) $l43.set($l50, { limit: $l48, reason: $l47 });
      }
      continue;
    }
    for (let $l52 = $l44 - 1; $l52 >= 0; $l52--) {
      let $l53 = $l23[$l52], $l54;
      if ($l45.healsDistinctCarrier) {
        if ($l53.type !== "user" && $l53.type !== "attachment") continue;
        let $l55 = $l37.get($l53.uuid), $l56 = $l55 ? new Set([...$l46].filter(($l57) => {
          let $l58 = $l55.get($l57);
          return $l58 === void 0 || $l58 === $l39;
        })) : $l46;
        if ($l56.size === 0) continue;
        if ($l53.type === "attachment") {
          $l42 ??= /* @__PURE__ */ new Map();
          let $l59 = $l42.get($l53.uuid);
          if ($l59 === void 0) $l59 = $m_ZCs($l53.attachment, $m_JCs), $l42.set($l53.uuid, $l59);
          if ($l54 = new Set([...$l56].filter(($l60) => $l59.has($l60))), $l54.size === 0) continue;
        } else if (!$m_JNe($l53, $l56)) {
          if (!$m_YCs($l53)) continue;
          if ($l41 === void 0) {
            $l41 = /* @__PURE__ */ new Map();
            for (let $l61 of $l23) {
              if ($l61.type !== "assistant" || !Array.isArray($l61.message.content)) continue;
              for (let $l62 of $l61.message.content) if ($l62.type === "tool_use") $l41.set($l62.id, $l62.name);
            }
          }
          let $l63 = $m_QCs($l53, $l41), $l64 = [...$l56].filter(($l65) => $l63.has($l65));
          if ($l64.length === 0) continue;
          let $l66 = $l37.get($l53.uuid) ?? /* @__PURE__ */ new Map();
          for (let $l67 of $l64) if (!$l66.has($l67)) $l66.set($l67, $l39);
          $l37.set($l53.uuid, $l66);
          break;
        } else $l54 = new Set([...$l56].filter(($l68) => $m_JNe($l53, /* @__PURE__ */ new Set([$l68]))));
      } else if ($l53.type !== "user" || !$m_JNe($l53, $l46)) {
        if ($m_mee($l53) || $m_Yh($l53) || $l53.type === "user" && $l53.isMeta) continue;
        break;
      } else $l54 = $l46;
      let $l69 = $l36.get($l53.uuid);
      if ($l69) for (let $l70 of $l54) $l69.add($l70);
      else $l36.set($l53.uuid, new Set($l54));
      let $l71 = $l37.get($l53.uuid) ?? /* @__PURE__ */ new Map();
      for (let $l72 of $l54) if (!$l71.has($l72)) $l71.set($l72, $l45.healsDistinctCarrier ? $l39 : $l38);
      $l37.set($l53.uuid, $l71);
      break;
    }
  }
  let $l73 = [], $l74 = $m_Jht(), $l75 = [], $l76 = [], $l77 = [], $l78 = /* @__PURE__ */ new Map(), $l79 = $l3?.inlineToolDefinitions !== void 0 ? $m_Myt($l0, $l3.nameOnlyAnnouncements) : void 0, $l80 = /* @__PURE__ */ new Set(), $l81, $l82 = [], $l83 = [], $l84 = $l3?.keptReminders === true && $l7, $l85 = /* @__PURE__ */ new Map(), $l86 = /* @__PURE__ */ new Set(), $l87 = [], $l88 = false, $l89 = /* @__PURE__ */ new Map(), $l90 = 0, $l91 = $m_oxs($l4), $l92 = $l91 && /* @__PURE__ */ new Set(), $l93 = [], $l94 = /* @__PURE__ */ new Set(), $l95 = /* @__PURE__ */ new Set(), $l96 = /* @__PURE__ */ new Map(), $l97, $l98 = /* @__PURE__ */ new Set();
  function $l99($l100, $l101, $l102) {
    let $l103 = $l100.userRoleGuard === true, $l104 = ($l105) => {
      if ($l103 || $m_zde($l100.kinds)) $l3?.onSessionNoticeRender?.({ uuid: $l101, timestamp: $l102, guarded: $l103, ...$l105 });
    }, $l106 = $l100;
    if (!$l103 && $l94.has($l101)) return true;
    if ($l103) {
      let $l107 = $l94.has($l101) ? void 0 : $m_mEt($l100, $l95);
      if ($l94.add($l101), $l107 === void 0) return $l104({ reason: "repeated", outcome: "omitted" }), true;
      $l106 = $l107;
    }
    let $l108 = $l103 && $m_dEt(), $l109 = !$l103 && $m_oue($l100), $l110 = $m_XG(), $l111 = $l110 || $l108 ? $m_txs($l73, $l106, $l101, !$l103 ? "tail_text" : $l108 ? "second_pair" : "refuse", $l109 ? ($l112) => $l96.has($l112) || $l98.has($l112) : $l108 ? ($l113) => $l96.get($l113) === "declared" || $l98.has($l113) : ($l114) => $l98.has($l114)) : void 0;
    if ($l111 === "no_assistant") $l3?.onDeclaredRoundRender?.($l101, $l100);
    if ($l111 === "no_assistant" && ($l108 || $l109)) {
      let $l115 = $l91?.get($l101) ?? null;
      if ($l93.push({ attachment: $l106, uuid: $l101, timestamp: $l102, anchor: $l115, guarded: $l103 }), $l94.add($l101), $l103) $m_pZn($l106, $l95);
      if ($l115 === null) $l116($l92);
      return true;
    }
    if ($l103 && ($l111 === "hosted" || $l111 === "second_pair")) $m_pZn($l106, $l95);
    let $l117 = $m_rxs($l111, $l110, $l103);
    if ($l117 !== void 0) $l104($l117);
    return $l111 === "hosted" || $l111 === "second_pair" || $l111 === "tail_text";
  }
  function $l116($l118) {
    let $l119 = $l93.filter(($l120) => $l118 === void 0 || $l120.anchor === null || $l118.has($l120.anchor));
    if ($l119.length === 0) return;
    $l93.splice(0, $l93.length, ...$l93.filter(($l121) => !$l119.includes($l121)));
    for (let [$l122, { attachment: $l123, uuid: $l124, timestamp: $l125, guarded: $l126 }] of $l119.entries()) {
      if ($l126) $l3?.onSessionNoticeRender?.({ uuid: $l124, timestamp: $l125, guarded: true, reason: "no_assistant", outcome: "synthetic_round" });
      let $l127 = $l126 ? "session_notice" : "declared", $l128 = $l97 !== void 0 && $l97 !== $l127, $l129 = $l126 && !$l128;
      if ($l122 === 0) if ($l129) $l130();
      else $l131();
      let $l132 = !$l73.some(($l133) => $l133.type === "user");
      if ($l128 || $l126 && $l132) {
        let $l134 = $m_Bl($l126 ? $m_cEt : $m_JEt), $l135 = $l73.findLastIndex(($l136) => $l136.type !== "api_system"), $l137 = $l73[$l135];
        if (!$l132 && $l137?.type === "user") {
          let $l138 = $l137.message.content;
          $l73[$l135] = { ...$l137, message: { ...$l137.message, content: [...typeof $l138 === "string" ? [{ type: "text", text: $l138 }] : $l138, { type: "text", text: $l134 }] } };
        } else $l73.push($m_Oe({ content: $l134, isMeta: true, uuid: $m_sN("wake", $l124) }));
      }
      if ($l122 === 0 && !$l129 && !$l132) $l130();
      $l97 = $l127;
      let $l139 = `${$m_iLe}${$l124}`, $l140 = $m_Lht({ type: "tool_use", id: $l139, name: $m_dg, input: {} }, $l124);
      $l96.set($l140.uuid, $l127), $l73.push($l140, $m_Oe({ content: [{ type: "tool_result", tool_use_id: $l139, content: $m_TSt($m_p7($l123.envelopes, $l123.remainingWakeCount), $l123.media) }], isMeta: true, uuid: $l124 })), $l89.clear(), $l90 = $l73.length;
    }
  }
  let $l141 = [];
  function $l131() {
    if ($l141.length === 0) return;
    let $l142 = $l141.splice(0), $l143 = $m_lB($l73);
    if ($l143?.type === "user") {
      $l73[$l73.length - 1] = $l142.reduce(($l144, $l145) => $m_OF($l144, $l145, $l74), $l143);
      return;
    }
    $l73.push($l142.reduce(($l146, $l147) => $m_OF($l146, $l147, $l74)));
  }
  function $l130() {
    $l131();
    let $l148 = ["batching_reminder_sent", "secondary_reminder_sent"].filter(($l149) => !$l86.has($l149)).map(($l150) => $l85.get($l150) ?? "").filter(($l151) => $l151.trim() !== "");
    if ($l85.clear(), $l86.clear(), $l75.length === 0 && $l83.length === 0 && $l148.length === 0) return;
    let $l152 = $l75.join(`

`), $l153 = $l82.join(`

`), $l154 = $l83.join(`

`), $l155 = [...$l83, ...$l148].join(`

`), $l156 = $l76.splice(0), $l157 = $l77.splice(0), $l158 = new Map($l78);
    $l78.clear();
    let $l159 = [], $l160 = 0;
    for (let $l161 of $l75) $l159.push($l160), $l160 += $l161.length + 2;
    let $l162 = $l87.splice(0).map(({ type: $l163, entry: $l164 }) => ({ type: $l163, start: $l159[$l164] ?? 0, length: $l75[$l164]?.length ?? 0 })), $l165 = $l162.map(($l166) => $l166.type);
    $l75.length = 0, $l82.length = 0, $l83.length = 0;
    let $l167 = $l156.length > 0 || $l158.size > 0 ? $l153 : void 0, $l168 = $m_lB($l73);
    if ($l168?.type === "api_system") {
      if ($m_Zle($l168, $l152, $l155, $l167, $l162), $l148.length > 0) $l168.reminderFromRecords = true;
      if ($m_zht($l168, $l156, $l157, $l158, $l80), $l165.length > 0) $l168.foldedAttachmentTypes = [...$l168.foldedAttachmentTypes ?? [], ...$l165];
    } else if ($l168?.type === "user") {
      $l88 = true;
      let $l169 = $m_Qle("");
      if ($m_Zle($l169, $l152, $l155, $l167, $l162), $l148.length > 0) $l169.reminderFromRecords = true;
      if ($l81?.toolDefinitions !== void 0) for (let $l170 of Object.keys($l81.toolDefinitions)) $l80.add($l170);
      if ($l81 = $l169, $m_zht($l169, $l156, $l157, $l158, $l80), $l165.length > 0) $l169.foldedAttachmentTypes = $l165;
      $l73.push($l169);
    } else {
      let $l171 = $m_aD($l167 ?? $l152, $l154);
      if ($l148.length > 0 && $l171 === "") return;
      $l73.push($m_Oe({ content: $l8 ? $l171 : $m_Bl($l171), isMeta: true, ephemeral: $l154 !== "" || void 0 }));
    }
  }
  let $l172 = /* @__PURE__ */ new Set();
  function $l173($l174, $l175, $l176) {
    if ($l172.has($l175)) return true;
    let $l177 = $m_uxs($l73, $l174, $l175, { ...$l176, behindEarlierMessages: $l28.has($l175), report: $l2 !== void 0, flushTail: $l130, isRoundHost: ($l178) => $l98.has($l178) });
    if ($l177 === false) return false;
    if ($l172.add($l175), $l177 === "new_turn") $l89.clear(), $l90 = $l73.length;
    return true;
  }
  function $l179($l180, $l181) {
    let $l182 = $m_dxs($l180, $l181);
    if ($l182 === void 0 || $l98.has($l182.call.uuid)) return;
    let $l183 = $m_lB($l73);
    if ($l183?.type === "user") $l73[$l73.length - 1] = $m_Pht($l183, $l182.notice, $l19(), $l7, $l20);
    else $l73.push($l182.notice);
    $l130(), $l98.add($l182.call.uuid), $l73.push($l182.call, $l182.results), $l89.clear(), $l90 = $l73.length;
  }
  let $l184;
  for (let $l185 of $l23) {
    if ($l92 !== void 0) {
      if ($l184 !== void 0) $l92.add($l184);
      $l184 = $l185.uuid, $l116($l92);
    }
    if ($m_Y_($l185)) continue;
    switch ($l185.type) {
      case "progress":
        continue;
      case "system": {
        if (!$m_RB($l185)) continue;
        $l131(), $l85.clear();
        let $l186 = $m_Oe({ content: $l185.content, uuid: $l185.uuid, timestamp: $l185.timestamp }), $l187 = $m_lB($l73);
        if ($l187?.type === "user") {
          $l73[$l73.length - 1] = $m_OF($l187, $l186, $l74);
          continue;
        }
        $l73.push($l186);
        continue;
      }
      case "user": {
        if ($m_Min($l185)) continue;
        $l131(), $l85.clear();
        let $l188 = $l185;
        if ($l185.taskDelivery && $l173($l185.taskDelivery, $l185.uuid, { startsTurn: true, inDrainPosition: false, inHumanTurn: false })) continue;
        if ($l185.taskDelivery) $l188 = { ...$l188, taskDelivery: void 0 };
        if ($l185.origin?.kind === "task-notification") {
          let $l189 = $l188.message.content, $l190, $l191 = $l185.origin.subkind === "scheduled-trigger" ? $m_SWo : $l185.origin.subkind === "projects-relay" && $l185.hearthRelayMessageIds !== void 0 ? ($l192, $l193 = false) => $m_uOo($l192, { serverEnvelope: !$l193 }) : void 0;
          if ($l191) $l190 = typeof $l189 === "string" ? $l191($l189) : [{ type: "text", text: $l191($l189.filter(($l194) => $l194.type === "text").map(($l195) => $l195.type === "text" ? $l195.text : "").join(`

`), $m_F($l189, ($l196) => $l196.type === "text") > 1) }, ...$l189.filter(($l197) => $l197.type !== "text")];
          else if (typeof $l189 === "string") $l190 = $m_bWo($l189);
          else {
            let $l198 = $l189.filter(($l199) => $l199.type === "text").map(($l200) => $l200.text).join(`
`);
            $l190 = [{ type: "text", text: $m_bWo($l198) }, ...$l189.filter(($l201) => $l201.type !== "text")];
          }
          $l188 = { ...$l188, origin: void 0, message: { ...$l188.message, content: $l190 } };
        }
        if (!$l17()) $l188 = $m_ftt($l188);
        else $l188 = $m_GCs($l188, $l1, $l10, $l3?.strippedToolReferenceKeys);
        let $l202 = $l36.get($l188.uuid);
        if ($l202) {
          let $l203 = $m_fZn($l188, $l202);
          if ($l203 === null) continue;
          $l188 = $l203;
        }
        $l188 = $m_Q5([$l188], $l43.get($l188.uuid)?.reason ?? "")[0];
        let $l204 = $l188.message.content;
        if (Array.isArray($l204) && !$l204.some(($l205) => $l205.type === "text" && $l205.text.startsWith($m_dZn)) && $m_zCs($l204)) $l188 = { ...$l188, message: { ...$l188.message, content: [...$l204, { type: "text", text: $m_dZn }] } };
        if ($l9) {
          let $l206 = $m_Sxs($l188, $l9);
          if ($l206) {
            $l188 = $l206.cleaned;
            let $l207 = $l8 ? $l206.reminders.map($m_Bl) : $l206.reminders;
            $l75.push(...$l207), $l82.push(...$l207);
          }
        }
        let $l208 = $m_bxs($l185, $l29, $l32);
        $l188 = $m_cZn($l188);
        let $l209 = $m_lB($l73);
        if ($l209?.type === "user") $l73[$l73.length - 1] = $m_OF($l209, $l188, $l74);
        else $l73.push($l188);
        if ($l208 !== void 0) {
          let $l210 = $m_NM($l208);
          if ($l7) $l75.push($l210), $l82.push($l210);
          else {
            let $l211 = $m_lB($l73), $l212 = $m_Oe({ content: $m_Bl($l210), isMeta: true });
            if ($l211?.type === "user") $l73[$l73.length - 1] = $m_Pht($l211, $l212, $l19(), false, $l20);
            else $l73.push($l212);
          }
        }
        continue;
      }
      case "assistant": {
        $l116(), $l131();
        let $l213 = $l17(), $l214 = $m_x2s($l185.message.content, $l185.batchToolUses, $l1), $l215;
        for (let $l216 = 0; $l216 < $l214.length; $l216++) {
          let $l217 = $l214[$l216];
          if ($l217.type === "text" && Array.isArray($l217.citations) && $l217.citations.some(($l218) => $l218?.type !== "web_search_result_location")) $l215 ??= $l214.slice(), $l215[$l216] = { ...$l217, citations: $l217.citations.filter(($l219) => $l219?.type === "web_search_result_location") };
          if ($l217.type !== "tool_use") continue;
          $l9?.set($l217.id, $l217.name);
          let $l220 = $m_Rn($l1, $l217.name), $l221 = $l220?.name ?? $l217.name, $l222 = $l14 && $m_mn($l185.wireToolInputs) ? $l185.wireToolInputs : void 0, $l223 = $l222 !== void 0 && Object.hasOwn($l222, $l217.id) ? $l222[$l217.id] : void 0, $l224 = $l222 !== void 0 && $m_mn($l223) && $m_K9t($l222, $l217.id, $l223, $l217.input, $l221, $l220, $l185.wireIngestContext?.[$l217.id], $l15) ? $l221 === $m_Mn ? $m_$Vt($l223) ?? $l223 : $l223 : $m_v9t($l221, $l217.input, $l220 !== void 0 || $l12?.has($m_gc($l217.name)) === true);
          if ($l213 && $l224 === $l217.input && $l221 === $l217.name) continue;
          $l215 ??= $l214.slice(), $l215[$l216] = $l213 ? { ...$l217, name: $l221, input: $l224 } : { type: "tool_use", id: $l217.id, name: $l221, input: $l224 };
        }
        let $l225 = $l215 ?? ($l214 !== $l185.message.content ? $l214 : void 0), $l226 = $l185;
        if ($l185.wireToolInputs !== void 0 || $l185.wireIngestContext !== void 0 || $l225 !== void 0) {
          let { wireToolInputs: $l227, wireIngestContext: $l228, ...$l229 } = $l185;
          $l226 = $l225 !== void 0 ? { ...$l229, message: { ...$l185.message, content: $l225 } } : $l229;
        }
        for (; $l90 < $l73.length; $l90++) {
          let $l230 = $l73[$l90];
          if ($l230.type === "assistant") $l89.set($l230.message.id, $l90);
          else if ($l230.type !== "api_system" && !$m_Yh($l230)) $l89.clear();
        }
        let $l231 = $l89.get($l226.message.id), $l232 = $l231 === void 0 ? void 0 : $l73[$l231];
        if ($l231 !== void 0 && $l232?.type === "assistant") $l73[$l231] = $m_cxs($l232, $l226, { echoApiBlockOrder: $l3?.echoApiBlockOrder === true });
        else {
          $l130();
          let $l233 = $l226.message.content, $l234 = $l3?.echoApiBlockOrder === true && typeof $l226.apiBlockIndex === "number" ? $l233 : $m_VZn($l233);
          if ($l234 === $l233) $l73.push($l226);
          else {
            let { apiBlockIndex: $l235, apiBlockIndices: $l236, ...$l237 } = $l226;
            $l73.push({ ...$l237, message: { ...$l226.message, content: $l234 } });
          }
        }
        continue;
      }
      case "attachment": {
        if ($m_fpt($l185)) continue;
        if ($l185.attachment.type === "poll_events" && $l185.attachment.deliveredVia === void 0 && $l3?.pollEventsAsText !== true && $l99($l185.attachment, $l185.uuid, $l185.timestamp)) continue;
        if ($l185.attachment.type === "queued_command" && $l185.attachment.taskDelivery && $l173($l185.attachment.taskDelivery, $l185.uuid, { startsTurn: false, inDrainPosition: $l27.has($l185.uuid), inHumanTurn: $l25.has($l185.uuid) })) continue;
        if ($l185.attachment.type === "project_doc_reads") {
          $l179($l185.attachment, $l185.uuid);
          continue;
        }
        let $l238 = $l185.attachment.type === "batching_reminder" || $l185.attachment.type === "secondary_reminder";
        if ($l238 && !$l7) continue;
        if ($l185.attachment.type === "output_limit_note" && !($l7 && typeof $l185.attachment.model === "string" && $m_XY($l185.attachment.model, $l2))) continue;
        if ($l84 && ($l185.attachment.type === "batching_reminder_sent" || $l185.attachment.type === "secondary_reminder_sent") && $l185.attachment.clearAt === "next_user_message") {
          let $l239 = $m_Mht([$m_Oe({ content: $m_Bl($l185.attachment.text), isMeta: true })]) ?? "";
          $l85.set($l185.attachment.type, $l239 && $l8 ? $m_Bl($l239) : $l239);
          continue;
        }
        let $l240 = $l7 && $l3?.surfaceLateToolAdditions === true && $l3.inlineToolDefinitions !== void 0 && $l185.attachment.type === "deferred_tools_delta" ? $m_aAs($l79?.get($l185.uuid), $l3.inlineToolDefinitions) : void 0, $l241 = $l7 && $l3?.surfaceLateToolAdditions === true && $l185.attachment.type === "deferred_tools_delta" && $l3.nameOnlyAnnouncements?.has($l185.uuid) !== true ? [...$m_Bi($l185.attachment.surfacedNames), ...$l240 !== void 0 ? $m_Bi($l185.attachment.replacedNames) : []].filter(($l242) => $l240?.definitions.get($l242) !== void 0 || $l3.deferredWireToolNames?.has($l242) === true) : [], $l243 = $l240 !== void 0 && $l185.attachment.type === "deferred_tools_delta" && $l3?.nameOnlyAnnouncements?.has($l185.uuid) !== true ? $m_Bi($l185.attachment.removedByBlock) : [], $l244 = $l7 && $l3?.advisorToolChanges === true && $l185.attachment.type === "advisor_tool" ? $l185.attachment.toolChange : void 0, $l245 = $m_Vht($l185.attachment), $l246 = $m_Yht($l185.attachment), $l247 = $l7 && $l185.attachment.type === "queued_command" && $l185.attachment.humanTurn === true && $l185.attachment.commandMode === "prompt" && $l185.attachment.isMeta !== true && $m_YE($l185) && !$m_joe($l185.attachment) && $l22(), $l248 = $l26.has($l185.uuid) || $l241.length > 0 || $l243.length > 0 || $l244 !== void 0, $l249 = { inHumanTurn: $l25.has($l185.uuid), surfacedToolNames: $l241 }, $l250 = $l3?.withoutAttachmentHooks ? $m_NWe($l185, $l249) : $m_reo($l185, $l249, $l248), $l251 = $l250.messages, { isKnownType: $l252, recordedRole: $l253 } = $l250, $l254 = $m_FZn($l185.attachment) ? "user" : "system", $l255 = $l253 === void 0 ? $l252 && !$m_$Zn($l185.attachment) : $l253 === "system";
        if ($l2 !== void 0 && $l251.length > 0 && (!$l252 || $l253 !== void 0 && $l253 !== $l254) && typeof $l185.attachment === "object" && !$m_mZn.has($l185.attachment)) $m_mZn.add($l185.attachment), $m_a("tengu_attachment_role_unknown_or_differs", { is_known_type: $l252, recorded_role: $m_c($l253 ?? "none"), should_promote: $l255, system_turns_on: $l7 });
        let $l256 = $l36.get($l185.uuid);
        if ($l256) $l251 = $l251.flatMap(($l257) => {
          let $l258 = $m_fZn($l257, $l256);
          return $l258 === null ? [] : [$l258];
        });
        let $l259 = $l185.attachment.type === "queued_command" && $m_QAt($l185.attachment.reminderId) ? $l185.attachment.reminderId : void 0, $l260 = $l43.get($l185.uuid)?.reason ?? "";
        if ($l251 = $l251.map(($l261) => {
          let $l262 = $m_Q5([$l261], $l260)[0];
          if ($l259 === void 0 || !$m_uZn($l261, $l259)) return $m_cZn($l262);
          let $l263 = $l262.message.content;
          if ($l262 === $l261 || typeof $l263 === "string") return $l261;
          let $l264 = $l263.filter(($l265) => $l265.type !== "text" || $m_Y$e($l265.text) === $l259);
          return { ...$l262, message: { ...$l262.message, content: $l264 } };
        }), $l247) {
          let $l266 = [];
          for (let $l267 of $l251) {
            if ($l267.isMeta) {
              $l266.push($l267);
              continue;
            }
            let $l268 = $l267.message.content;
            $l141.push({ ...$l267, message: { ...$l267.message, content: typeof $l268 === "string" ? $m_qle($l268) : $l268.map(($l269) => $l269.type === "text" ? { ...$l269, text: $m_qle($l269.text) } : $l269) } });
          }
          if ($l266.length === 0) continue;
          $l251 = $l266;
        }
        if ($l7 && $l259 !== void 0) {
          let $l270 = [], $l271 = [];
          for (let $l272 of $l251) if ($m_uZn($l272, $l259)) $l270.push($l272);
          else $l271.push($l272);
          if ($l270.length > 0) {
            let $l273 = $m_lB($l73);
            if ($l273?.type === "user") $l73[$l73.length - 1] = $l270.reduce(($l274, $l275) => $m_OF($l274, $l275, $l74), $l273);
            else $l73.push(...$l270);
            if ($l271.length === 0) continue;
            $l251 = $l271;
          }
        }
        if ($l7 && $l255) {
          let $l276 = $m_Mht($l251);
          if ($l276 !== null) {
            let $l277 = $l8 ? $m_Bl($l276) : $l276;
            if ($l238) {
              $l83.push($l277), $l86.add(`${$l185.attachment.type}_sent`);
              continue;
            }
            $l75.push($l277), $l87.push({ type: $l185.attachment.type, entry: $l75.length - 1 });
            let $l278 = { ...$l249, surfacedToolNames: [] }, $l279 = $l241.length > 0 ? $m_Mht($l3?.withoutAttachmentHooks ? $m_NWe($l185, $l278).messages : $m_Gze($l185, $l278)) ?? $l276 : $l276;
            $l82.push($l8 ? $m_Bl($l279) : $l279);
            for (let $l280 of $l243) $l77.push({ op: "remove", name: $l280, byValue: true });
            for (let $l281 of $l241) {
              let $l282 = $l240?.definitions.get($l281);
              if ($l282 === void 0) $l76.push($l281);
              else $l78.set($l281, $l282), $l77.push({ op: "add", name: $l281 });
            }
            if ($l244 !== void 0) $l77.push({ op: $l244, name: $m_wDe });
            continue;
          }
        }
        let $l283 = $l19() && !$l245 && !$l246 ? $l251.map($m_NZn) : $l251, $l284 = $l245 || $l246 || $l7 && ($l185.attachment.type === "account_memory_recall" || $l185.attachment.type === "nested_memory" || $m_LZn($l185.attachment)), $l285 = $m_lB($l73);
        if ($l285?.type === "user") {
          $l73[$l73.length - 1] = $l283.reduce(($l286, $l287) => $l284 ? $m_OF($l286, $l287, $l74) : $m_Pht($l286, $l287, $l19(), $l7, $l20), $l285);
          continue;
        }
        $l73.push(...$l283);
        continue;
      }
    }
  }
  $l116(), $l130();
  let $l288 = $m_Jxs($l73, $l3?.preserveTrailingThinking), $l289 = $m_ueo($l288, $l3?.preserveTrailingThinking), $l290 = $l289.length === $l288.length ? $l289 : $m_dLe($l289), $l291 = $m_ieo($l290, $l3?.preserveTrailingThinking), $l292 = $m_leo($l291), $l293 = $m_Zxs($l292), $l294;
  if ($l7) $l294 = $l88 ? $m_fxs($l293, $l8) : $l293;
  else if ($l19()) $l294 = $m_GZn($m_dLe($l293), $l7, $l20);
  else $l294 = $l293;
  let $l295 = $l3?.echoApiBlockOrder === true ? $m_mtt($l294, $l3?.preserveTrailingThinking) : $l294, $l296 = $l5.size > 0 ? $m_nAs($l295, $l5) : $l295, $l297 = $m_qCs($l6.size > 0 ? $m_tT($l296, $l6) : $l296);
  return $m_P2s($m_zEt($l297), $l1);
}
;
