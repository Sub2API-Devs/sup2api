function SELF($l0, $l1 = [], $l2, $l3) {
  $l0 = $m_zGt($l0, $l3?.accountMemoryWithheld, $m_fq(() => $l1));
  let $l4 = $m_lTt($m_bvs($l0, $l3?.preserveTrailingThinking)), $l5 = $m_aJe($l3?.thinkingStripPlan, $m_kZ($l4)), $l6 = $m_iJe($l3?.advisorStripPlan, $m_uB($l4)), $l7 = $l2 !== void 0 && $m_T6($l2), $l8 = $l2 !== void 0 && $l7 && $m_lar($l2), $l9 = $l7 ? /* @__PURE__ */ new Map() : void 0, $l10 = new Set($l1.map(($l11) => $l11.name)), $l12 = $l3?.keptToolNames;
  for (let $l13 of [...$l12 ?? [], ...$l3?.declaredToolNames ?? []]) $l10.add($l13);
  let $l14 = $l3?.echoWireToolInputs === true, $l15 = $l3?.ingestPool, $l16, $l17 = () => $l16 ??= $m__h(), $l18, $l19 = () => $l18 ??= $m_FBt($l0, $l3?.reminderFold), $l20 = $m_oJe($l0), $l21, $l22 = () => $l21 ??= $m_Het(), $l23 = $m_Uwt($m_dTs($l4, true, $l7), $l4, $l1.some(($l24) => $m_xt($l24, $m_Yp))), $l25 = $m_Tle($l4), $l26 = $m_fvs($l4), $l27 = $m_dwt($l4), $l28 = $m_fwt($l4), $l29, $l30 = false;
  for (let $l31 of $l23) if ($l31.type === "attachment" && $l31.attachment.type === "read_truncation_notice" && !$m_Ugt($l31)) ($l29 ??= /* @__PURE__ */ new Set()).add($l31.attachment.toolUseID);
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
    if (!$m_zte($l45)) {
      $l40 = false;
      continue;
    }
    if (!$l40) $l40 = true, $l39++;
    let $l46 = $m_I3n($l45) ?? (Array.isArray($l45.message.content) && $l45.message.content[0]?.type === "text" ? ($l35 ??= $m_mTs())[$l45.message.content[0].text] : void 0);
    if (!$l46) continue;
    let $l47 = $l45.errorDetails ?? "", $l48 = $m_ZSt($l47);
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
          if ($l59 === void 0) $l59 = $m_STs($l53.attachment, $m_kTs), $l42.set($l53.uuid, $l59);
          if ($l54 = new Set([...$l56].filter(($l60) => $l59.has($l60))), $l54.size === 0) continue;
        } else if (!$m_KOe($l53, $l56)) {
          if (!$m_hTs($l53)) continue;
          if ($l41 === void 0) {
            $l41 = /* @__PURE__ */ new Map();
            for (let $l61 of $l23) {
              if ($l61.type !== "assistant" || !Array.isArray($l61.message.content)) continue;
              for (let $l62 of $l61.message.content) if ($l62.type === "tool_use") $l41.set($l62.id, $l62.name);
            }
          }
          let $l63 = $m__Ts($l53, $l41), $l64 = [...$l56].filter(($l65) => $l63.has($l65));
          if ($l64.length === 0) continue;
          let $l66 = $l37.get($l53.uuid) ?? /* @__PURE__ */ new Map();
          for (let $l67 of $l64) if (!$l66.has($l67)) $l66.set($l67, $l39);
          $l37.set($l53.uuid, $l66);
          break;
        } else $l54 = new Set([...$l56].filter(($l68) => $m_KOe($l53, /* @__PURE__ */ new Set([$l68]))));
      } else if ($l53.type !== "user" || !$m_KOe($l53, $l46)) {
        if ($m_zte($l53) || $m_gy($l53) || $l53.type === "user" && $l53.isMeta) continue;
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
  let $l73 = [], $l74 = $m_Eft(), $l75 = [], $l76 = [], $l77 = [], $l78 = /* @__PURE__ */ new Map(), $l79 = $l3?.inlineToolDefinitions !== void 0 ? $m_wSt($l0, $l3.nameOnlyAnnouncements) : void 0, $l80 = /* @__PURE__ */ new Set(), $l81, $l82 = [], $l83 = [], $l84 = $l3?.keptReminders === true && $l7, $l85 = /* @__PURE__ */ new Map(), $l86 = /* @__PURE__ */ new Set(), $l87 = [], $l88 = false, $l89 = /* @__PURE__ */ new Map(), $l90 = 0, $l91 = $m_vTs($l4), $l92 = $l91 && /* @__PURE__ */ new Set(), $l93 = [], $l94 = /* @__PURE__ */ new Set(), $l95 = /* @__PURE__ */ new Set(), $l96 = /* @__PURE__ */ new Map(), $l97, $l98 = /* @__PURE__ */ new Set();
  function $l99($l100, $l101, $l102) {
    let $l103 = $l100.userRoleGuard === true, $l104 = ($l105) => {
      if ($l103 || $m_Ele($l100.kinds)) $l3?.onSessionNoticeRender?.({ uuid: $l101, timestamp: $l102, guarded: $l103, ...$l105 });
    }, $l106 = $l100;
    if (!$l103 && $l94.has($l101)) return true;
    if ($l103) {
      let $l107 = $l94.has($l101) ? void 0 : $m_Fbt($l100, $l95);
      if ($l94.add($l101), $l107 === void 0) return $l104({ reason: "repeated", outcome: "omitted" }), true;
      $l106 = $l107;
    }
    let $l108 = $l103 && $m_Ibt(), $l109 = !$l103 && $m_Ole($l100), $l110 = $m_Pz(), $l111 = $l110 || $l108 ? $m_wTs($l73, $l106, $l101, !$l103 ? "tail_text" : $l108 ? "second_pair" : "refuse", $l109 ? ($l112) => $l96.has($l112) || $l98.has($l112) : $l108 ? ($l113) => $l96.get($l113) === "declared" || $l98.has($l113) : ($l114) => $l98.has($l114)) : void 0;
    if ($l111 === "no_assistant") $l3?.onDeclaredRoundRender?.($l101, $l100);
    if ($l111 === "no_assistant" && ($l108 || $l109)) {
      let $l115 = $l91?.get($l101) ?? null;
      if ($l93.push({ attachment: $l106, uuid: $l101, timestamp: $l102, anchor: $l115, guarded: $l103 }), $l94.add($l101), $l103) $m_B6n($l106, $l95);
      if ($l115 === null) $l116($l92);
      return true;
    }
    if ($l103 && ($l111 === "hosted" || $l111 === "second_pair")) $m_B6n($l106, $l95);
    let $l117 = $m_ETs($l111, $l110, $l103);
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
        let $l134 = $m_Xa($l126 ? $m_Lbt : $m_Swt), $l135 = $l73.findLastIndex(($l136) => $l136.type !== "api_system"), $l137 = $l73[$l135];
        if (!$l132 && $l137?.type === "user") {
          let $l138 = $l137.message.content;
          $l73[$l135] = { ...$l137, message: { ...$l137.message, content: [...typeof $l138 === "string" ? [{ type: "text", text: $l138 }] : $l138, { type: "text", text: $l134 }] } };
        } else $l73.push($m_Ie({ content: $l134, isMeta: true, uuid: $m_AD("wake", $l124) }));
      }
      if ($l122 === 0 && !$l129 && !$l132) $l130();
      $l97 = $l127;
      let $l139 = `${$m_aNe}${$l124}`, $l140 = $m_mft({ type: "tool_use", id: $l139, name: $m_Yp, input: {} }, $l124);
      $l96.set($l140.uuid, $l127), $l73.push($l140, $m_Ie({ content: [{ type: "tool_result", tool_use_id: $l139, content: $m_sEt($m_HZ($l123.envelopes, $l123.remainingWakeCount, $l123.toolsUsed), $l123.media) }], isMeta: true, uuid: $l124 })), $l89.clear(), $l90 = $l73.length;
    }
  }
  let $l141 = [];
  function $l131() {
    if ($l141.length === 0) return;
    let $l142 = $l141.splice(0), $l143 = $m_e1($l73);
    if ($l143?.type === "user") {
      $l73[$l73.length - 1] = $l142.reduce(($l144, $l145) => $m_KN($l144, $l145, $l74), $l143);
      return;
    }
    $l73.push($l142.reduce(($l146, $l147) => $m_KN($l146, $l147, $l74)));
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
    let $l167 = $l156.length > 0 || $l158.size > 0 ? $l153 : void 0, $l168 = $m_e1($l73);
    if ($l168?.type === "api_system") {
      if ($m_sle($l168, $l152, $l155, $l167, $l162), $l148.length > 0) $l168.reminderFromRecords = true;
      if ($m_kft($l168, $l156, $l157, $l158, $l80), $l165.length > 0) $l168.foldedAttachmentTypes = [...$l168.foldedAttachmentTypes ?? [], ...$l165];
    } else if ($l168?.type === "user") {
      $l88 = true;
      let $l169 = $m_rle("");
      if ($m_sle($l169, $l152, $l155, $l167, $l162), $l148.length > 0) $l169.reminderFromRecords = true;
      if ($l81?.toolDefinitions !== void 0) for (let $l170 of Object.keys($l81.toolDefinitions)) $l80.add($l170);
      if ($l81 = $l169, $m_kft($l169, $l156, $l157, $l158, $l80), $l165.length > 0) $l169.foldedAttachmentTypes = $l165;
      $l73.push($l169);
    } else {
      let $l171 = $m_jI($l167 ?? $l152, $l154);
      if ($l148.length > 0 && $l171 === "") return;
      $l73.push($m_Ie({ content: $l8 ? $l171 : $m_Xa($l171), isMeta: true, ephemeral: $l154 !== "" || void 0 }));
    }
  }
  let $l172 = /* @__PURE__ */ new Set();
  function $l173($l174, $l175, $l176) {
    if ($l172.has($l175)) return true;
    let $l177 = $m_OTs($l73, $l174, $l175, { ...$l176, behindEarlierMessages: $l28.has($l175), report: $l2 !== void 0, flushTail: $l130, isRoundHost: ($l178) => $l98.has($l178) });
    if ($l177 === false) return false;
    if ($l172.add($l175), $l177 === "new_turn") $l89.clear(), $l90 = $l73.length;
    return true;
  }
  function $l179($l180, $l181) {
    let $l182 = $m_MTs($l180, $l181);
    if ($l182 === void 0 || $l98.has($l182.call.uuid)) return;
    let $l183 = $m_e1($l73);
    if ($l183?.type === "user") $l73[$l73.length - 1] = $m_dft($l183, $l182.notice, $l19(), $l7, $l20);
    else $l73.push($l182.notice);
    $l130(), $l98.add($l182.call.uuid), $l73.push($l182.call, $l182.results), $l89.clear(), $l90 = $l73.length;
  }
  let $l184;
  for (let $l185 of $l23) {
    if ($l92 !== void 0) {
      if ($l184 !== void 0) $l92.add($l184);
      $l184 = $l185.uuid, $l116($l92);
    }
    if ($m_hb($l185)) continue;
    switch ($l185.type) {
      case "progress":
        continue;
      case "system": {
        if (!$m_p1($l185)) continue;
        $l131(), $l85.clear();
        let $l186 = $m_Ie({ content: $l185.content, uuid: $l185.uuid, timestamp: $l185.timestamp }), $l187 = $m_e1($l73);
        if ($l187?.type === "user") {
          $l73[$l73.length - 1] = $m_KN($l187, $l186, $l74);
          continue;
        }
        $l73.push($l186);
        continue;
      }
      case "user": {
        if ($m_Tcn($l185)) continue;
        $l131(), $l85.clear();
        let $l188 = $l185;
        if ($l185.taskDelivery && $l173($l185.taskDelivery, $l185.uuid, { startsTurn: true, inDrainPosition: false, inHumanTurn: false })) continue;
        if ($l185.taskDelivery) $l188 = { ...$l188, taskDelivery: void 0 };
        if ($l185.origin?.kind === "task-notification") {
          let $l189 = $l188.message.content, $l190, $l191 = $l185.origin.subkind === "scheduled-trigger" ? $m_T4o : $l185.origin.subkind === "projects-relay" && $l185.hearthRelayMessageIds !== void 0 ? ($l192, $l193 = false) => $m_h$o($l192, { serverEnvelope: !$l193 }) : void 0;
          if ($l191) $l190 = typeof $l189 === "string" ? $l191($l189) : [{ type: "text", text: $l191($l189.filter(($l194) => $l194.type === "text").map(($l195) => $l195.type === "text" ? $l195.text : "").join(`

`), $m_U($l189, ($l196) => $l196.type === "text") > 1) }, ...$l189.filter(($l197) => $l197.type !== "text")];
          else if (typeof $l189 === "string") $l190 = $m_k4o($l189);
          else {
            let $l198 = $l189.filter(($l199) => $l199.type === "text").map(($l200) => $l200.text).join(`
`);
            $l190 = [{ type: "text", text: $m_k4o($l198) }, ...$l189.filter(($l201) => $l201.type !== "text")];
          }
          $l188 = { ...$l188, origin: void 0, message: { ...$l188.message, content: $l190 } };
        }
        if ($l185.origin?.kind === "peer" && $l185.origin.activityObservation !== void 0) {
          let $l202 = $m_vft(), $l203 = $l188.message.content, $l204 = typeof $l203 === "string" ? $l203 : $l203[0]?.type === "text" ? $l203[0].text : void 0, $l205 = $l204 !== void 0 && $m_B4o.some(($l206) => $l204.startsWith(`${$l206}
`));
          if ($l202 && $l205) $l188 = { ...$l188, origin: void 0, message: { ...$l188.message, content: typeof $l203 === "string" ? $m_Xa($m_REt($l203)) : $l203.map(($l207) => $l207.type === "text" ? { ...$l207, text: $m_Xa($m_REt($l207.text)) } : $l207) } };
          else if ($m_Vr().idleObservationFence === void 0) $l188 = { ...$l188, origin: void 0 };
        }
        if (!$l17()) $l188 = $m_nJe($l188);
        else $l188 = $m_uTs($l188, $l1, $l10, $l3?.strippedToolReferenceKeys);
        let $l208 = $l36.get($l188.uuid);
        if ($l208) {
          let $l209 = $m_H6n($l188, $l208);
          if ($l209 === null) continue;
          $l188 = $l209;
        }
        $l188 = $m_O3([$l188], $l43.get($l188.uuid)?.reason ?? "")[0];
        let $l210 = $l188.message.content;
        if (Array.isArray($l210) && !$l210.some(($l211) => $l211.type === "text" && $l211.text.startsWith($m_O6n)) && $m_cTs($l210)) $l188 = { ...$l188, message: { ...$l188.message, content: [...$l210, { type: "text", text: $m_O6n }] } };
        if ($l9) {
          let $l212 = $m_jTs($l188, $l9);
          if ($l212) {
            $l188 = $l212.cleaned;
            let $l213 = $l8 ? $l212.reminders.map($m_Xa) : $l212.reminders;
            $l75.push(...$l213), $l82.push(...$l213);
          }
        }
        let $l214 = $m_WTs($l185, $l29, $l32);
        $l188 = $m_F6n($l188);
        let $l215 = $m_e1($l73);
        if ($l215?.type === "user") $l73[$l73.length - 1] = $m_KN($l215, $l188, $l74);
        else $l73.push($l188);
        if ($l214 !== void 0) {
          let $l216 = $m__D($l214);
          if ($l7) $l75.push($l216), $l82.push($l216);
          else {
            let $l217 = $m_e1($l73), $l218 = $m_Ie({ content: $m_Xa($l216), isMeta: true });
            if ($l217?.type === "user") $l73[$l73.length - 1] = $m_dft($l217, $l218, $l19(), false, $l20);
            else $l73.push($l218);
          }
        }
        continue;
      }
      case "assistant": {
        $l116(), $l131();
        let $l219 = $l17(), $l220 = $m_s3s($l185.message.content, $l185.batchToolUses, $l1), $l221;
        for (let $l222 = 0; $l222 < $l220.length; $l222++) {
          let $l223 = $l220[$l222];
          if ($l223.type === "text" && Array.isArray($l223.citations) && $l223.citations.some(($l224) => $l224?.type !== "web_search_result_location")) $l221 ??= $l220.slice(), $l221[$l222] = { ...$l223, citations: $l223.citations.filter(($l225) => $l225?.type === "web_search_result_location") };
          if ($l223.type !== "tool_use") continue;
          $l9?.set($l223.id, $l223.name);
          let $l226 = $m_xn($l1, $l223.name), $l227 = $l226?.name ?? $l223.name, $l228 = $l14 && $m_sn($l185.wireToolInputs) ? $l185.wireToolInputs : void 0, $l229 = $l228 !== void 0 && Object.hasOwn($l228, $l223.id) ? $l228[$l223.id] : void 0, $l230 = $l228 !== void 0 && $m_sn($l229) && $m_k9t($l228, $l223.id, $l229, $l223.input, $l227, $l226, $l185.wireIngestContext?.[$l223.id], $l15) ? $l227 === $m_In ? $m_i5t($l229) ?? $l229 : $l229 : $m_Y3t($l227, $l223.input, $l226 !== void 0 || $l12?.has($m_cd($l223.name)) === true);
          if ($l219 && $l230 === $l223.input && $l227 === $l223.name) continue;
          $l221 ??= $l220.slice(), $l221[$l222] = $l219 ? { ...$l223, name: $l227, input: $l230 } : { type: "tool_use", id: $l223.id, name: $l227, input: $l230 };
        }
        let $l231 = $l221 ?? ($l220 !== $l185.message.content ? $l220 : void 0), $l232 = $l185;
        if ($l185.wireToolInputs !== void 0 || $l185.wireIngestContext !== void 0 || $l231 !== void 0) {
          let { wireToolInputs: $l233, wireIngestContext: $l234, ...$l235 } = $l185;
          $l232 = $l231 !== void 0 ? { ...$l235, message: { ...$l185.message, content: $l231 } } : $l235;
        }
        for (; $l90 < $l73.length; $l90++) {
          let $l236 = $l73[$l90];
          if ($l236.type === "assistant") $l89.set($l236.message.id, $l90);
          else if ($l236.type !== "api_system" && !$m_gy($l236)) $l89.clear();
        }
        let $l237 = $l89.get($l232.message.id), $l238 = $l237 === void 0 ? void 0 : $l73[$l237];
        if ($l237 !== void 0 && $l238?.type === "assistant") $l73[$l237] = $m_ITs($l238, $l232, { echoApiBlockOrder: $l3?.echoApiBlockOrder === true });
        else {
          $l130();
          let $l239 = $l232.message.content, $l240 = $l3?.echoApiBlockOrder === true && typeof $l232.apiBlockIndex === "number" ? $l239 : $m_N3n($l239);
          if ($l240 === $l239) $l73.push($l232);
          else {
            let { apiBlockIndex: $l241, apiBlockIndices: $l242, ...$l243 } = $l232;
            $l73.push({ ...$l243, message: { ...$l232.message, content: $l240 } });
          }
        }
        continue;
      }
      case "attachment": {
        if ($m_Ugt($l185)) continue;
        if ($l185.attachment.type === "poll_events" && $l185.attachment.deliveredVia === void 0 && $l3?.pollEventsAsText !== true && $l99($l185.attachment, $l185.uuid, $l185.timestamp)) continue;
        if ($l185.attachment.type === "queued_command" && $l185.attachment.taskDelivery && $l173($l185.attachment.taskDelivery, $l185.uuid, { startsTurn: false, inDrainPosition: $l27.has($l185.uuid), inHumanTurn: $l25.has($l185.uuid) })) continue;
        if ($l185.attachment.type === "project_doc_reads") {
          $l179($l185.attachment, $l185.uuid);
          continue;
        }
        let $l244 = $l185.attachment.type === "batching_reminder" || $l185.attachment.type === "secondary_reminder";
        if ($l244 && !$l7) continue;
        if ($l185.attachment.type === "output_limit_note" && !($l7 && typeof $l185.attachment.model === "string" && $m_Z5($l185.attachment.model, $l2))) continue;
        if ($l84 && ($l185.attachment.type === "batching_reminder_sent" || $l185.attachment.type === "secondary_reminder_sent") && $l185.attachment.clearAt === "next_user_message") {
          let $l245 = $m_YOe([$m_Ie({ content: $m_Xa($l185.attachment.text), isMeta: true })]) ?? "";
          $l85.set($l185.attachment.type, $l245 && $l8 ? $m_Xa($l245) : $l245);
          continue;
        }
        let $l246 = $l7 && $l3?.surfaceLateToolAdditions === true && $l3.inlineToolDefinitions !== void 0 && $l185.attachment.type === "deferred_tools_delta" ? $m_Ovs($l79?.get($l185.uuid), $l3.inlineToolDefinitions) : void 0, $l247 = $l7 && $l3?.surfaceLateToolAdditions === true && $l185.attachment.type === "deferred_tools_delta" && $l3.nameOnlyAnnouncements?.has($l185.uuid) !== true ? [...$m__i($l185.attachment.surfacedNames), ...$l246 !== void 0 ? $m__i($l185.attachment.replacedNames) : []].filter(($l248) => $l246?.definitions.get($l248) !== void 0 || $l3.deferredWireToolNames?.has($l248) === true) : [], $l249 = $l246 !== void 0 && $l185.attachment.type === "deferred_tools_delta" && $l3?.nameOnlyAnnouncements?.has($l185.uuid) !== true ? $m__i($l185.attachment.removedByBlock) : [], $l250 = $l7 && $l3?.advisorToolChanges === true && $l185.attachment.type === "advisor_tool" ? $l185.attachment.toolChange : void 0, $l251 = $m_bft($l185.attachment), $l252 = $m_wft($l185.attachment), $l253 = $l7 && $l185.attachment.type === "queued_command" && $l185.attachment.humanTurn === true && $l185.attachment.commandMode === "prompt" && $l185.attachment.isMeta !== true && $m_$v($l185) && !$m_uie($l185.attachment) && $l22(), $l254 = $l26.has($l185.uuid) || $l247.length > 0 || $l249.length > 0 || $l250 !== void 0, $l255 = { inHumanTurn: $l25.has($l185.uuid), surfacedToolNames: $l247 }, $l256 = $l3?.withoutAttachmentHooks ? $m_nLe($l185, $l255) : $m_K3n($l185, $l255, $l254), $l257 = $l256.messages, { isKnownType: $l258, recordedRole: $l259 } = $l256, $l260 = $m_R3n($l185.attachment, $l259 === "user" ? $l2 : void 0) ? "user" : "system", $l261 = $l259 === void 0 ? $l258 && !$m_C3n($l185.attachment) : $l259 === "system";
        if ($l2 !== void 0 && $l257.length > 0 && (!$l258 || $l259 !== void 0 && $l259 !== $l260) && typeof $l185.attachment === "object" && !$m_U6n.has($l185.attachment)) $m_U6n.add($l185.attachment), $m_a("tengu_attachment_role_unknown_or_differs", { is_known_type: $l258, recorded_role: $m_c($l259 ?? "none"), should_promote: $l261, system_turns_on: $l7 });
        let $l262 = $l36.get($l185.uuid);
        if ($l262) $l257 = $l257.flatMap(($l263) => {
          let $l264 = $m_H6n($l263, $l262);
          return $l264 === null ? [] : [$l264];
        });
        let $l265 = $l185.attachment.type === "queued_command" && $m_Zxt($l185.attachment.reminderId) ? $l185.attachment.reminderId : void 0, $l266 = $l43.get($l185.uuid)?.reason ?? "";
        if ($l257 = $l257.map(($l267) => {
          let $l268 = $m_O3([$l267], $l266)[0];
          if ($l265 === void 0 || !$m_N6n($l267, $l265)) return $m_F6n($l268);
          let $l269 = $l268.message.content;
          if ($l268 === $l267 || typeof $l269 === "string") return $l267;
          let $l270 = $l269.filter(($l271) => $l271.type !== "text" || $m_sBe($l271.text) === $l265);
          return { ...$l268, message: { ...$l268.message, content: $l270 } };
        }), $l253) {
          let $l272 = [];
          for (let $l273 of $l257) {
            if ($l273.isMeta) {
              $l272.push($l273);
              continue;
            }
            let $l274 = $l273.message.content;
            $l141.push({ ...$l273, message: { ...$l273.message, content: typeof $l274 === "string" ? $m_Pce($l274) : $l274.map(($l275) => $l275.type === "text" ? { ...$l275, text: $m_Pce($l275.text) } : $l275) } });
          }
          if ($l272.length === 0) continue;
          $l257 = $l272;
        }
        if ($l7 && $l265 !== void 0) {
          let $l276 = [], $l277 = [];
          for (let $l278 of $l257) if ($m_N6n($l278, $l265) || $m_fTs($l278)) $l276.push($l278);
          else $l277.push($l278);
          if ($l276.length > 0) {
            let $l279 = $m_e1($l73);
            if ($l279?.type === "user") $l73[$l73.length - 1] = $l276.reduce(($l280, $l281) => $m_KN($l280, $l281, $l74), $l279);
            else $l73.push(...$l276);
            if ($l277.length === 0) continue;
            $l257 = $l277;
          }
        }
        if ($l7 && $l261) {
          let $l282 = $m_YOe($l257);
          if ($l282 !== null) {
            let $l283 = $l8 ? $m_Xa($l282) : $l282;
            if ($l244) {
              $l83.push($l283), $l86.add(`${$l185.attachment.type}_sent`);
              continue;
            }
            $l75.push($l283), $l87.push({ type: $l185.attachment.type, entry: $l75.length - 1 });
            let $l284 = { ...$l255, surfacedToolNames: [] }, $l285 = $l247.length > 0 ? $m_YOe($l3?.withoutAttachmentHooks ? $m_nLe($l185, $l284).messages : $m_UWe($l185, $l284)) ?? $l282 : $l282;
            $l82.push($l8 ? $m_Xa($l285) : $l285);
            for (let $l286 of $l249) $l77.push({ op: "remove", name: $l286, byValue: true });
            for (let $l287 of $l247) {
              let $l288 = $l246?.definitions.get($l287);
              if ($l288 === void 0) $l76.push($l287);
              else $l78.set($l287, $l288), $l77.push({ op: "add", name: $l287 });
            }
            if ($l250 !== void 0) $l77.push({ op: $l250, name: $m_TLe });
            continue;
          }
        }
        let $l289 = $l19() && !$l251 && !$l252 ? $l257.map($m_T3n) : $l257, $l290 = $l251 || $l252 || $l7 && ($l185.attachment.type === "account_memory_recall" || $l185.attachment.type === "nested_memory" || $m_E3n($l185.attachment)), $l291 = $m_e1($l73);
        if ($l291?.type === "user") {
          $l73[$l73.length - 1] = $l289.reduce(($l292, $l293) => $l290 ? $m_KN($l292, $l293, $l74) : $m_dft($l292, $l293, $l19(), $l7, $l20), $l291);
          continue;
        }
        $l73.push(...$l289);
        continue;
      }
    }
  }
  $l116(), $l130();
  let $l294 = $m_Tvs($l73, $l3?.preserveTrailingThinking), $l295 = $m_r9n($l294, $l3?.preserveTrailingThinking), $l296 = $l295.length === $l294.length ? $l295 : $m_JOe($l295), $l297 = $m_X3n($l296, $l3?.preserveTrailingThinking), $l298 = $m_n9n($l297), $l299 = $m_vvs($l298), $l300;
  if ($l7) $l300 = $l88 ? $m_DTs($l299, $l8) : $l299;
  else if ($l19()) $l300 = $m_O3n($m_JOe($l299), $l7, $l20);
  else $l300 = $l299;
  let $l301 = $l3?.echoApiBlockOrder === true ? $m_rJe($l300, $l3?.preserveTrailingThinking) : $l300, $l302 = $l5.size > 0 ? $m_Cvs($l301, $l5) : $l301, $l303 = $m_pTs($l6.size > 0 ? $m_xw($l302, $l6) : $l302);
  return $m_i3s($m_ywt($l303), $l1);
}
;
