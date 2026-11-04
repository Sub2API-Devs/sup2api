function SELF($l0, $l1 = [], $l2, $l3) {
  $l0 = $m_N0t($l0, $l3?.accountMemoryWithheld, $m_t4(() => $l1));
  let $l4 = $m_wvt($m_RAs($l0, $l3?.preserveTrailingThinking)), $l5 = $m_VJe($l3?.thinkingStripPlan, $m_eZ($l4)), $l6 = $m_KJe($l3?.advisorStripPlan, $m_rB($l4)), $l7 = $l2 !== void 0 && $m_R3($l2), $l8 = $l2 !== void 0 && $l7 && $m_SFr($l2), $l9 = $l7 ? /* @__PURE__ */ new Map() : void 0, $l10 = new Set($l1.map(($l11) => $l11.name)), $l12 = $l3?.keptToolNames;
  for (let $l13 of [...$l12 ?? [], ...$l3?.declaredToolNames ?? []]) $l10.add($l13);
  let $l14 = $l3?.echoWireToolInputs === true, $l15 = $l3?.ingestPool, $l16, $l17 = () => $l16 ??= $m_s_(), $l18, $l19 = () => $l18 ??= $m_UMt($l0, $l3?.reminderFold), $l20 = $m_GJe($l0), $l21, $l22 = () => $l21 ??= $m_gnt(), $l23 = $m_tvt($m_vCs($l4, true, $l7), $l4, $l1.some(($l24) => $m_Ct($l24, $m_Lm))), $l25 = $m_Ole($l4), $l26 = $m_Kxs($l4), $l27 = $m_awt($l4), $l28 = $m_mwt($l4), $l29, $l30 = false;
  for (let $l31 of $l23) if ($l31.type === "attachment" && $l31.attachment.type === "read_truncation_notice" && !$m_g0n($l31)) ($l29 ??= /* @__PURE__ */ new Set()).add($l31.attachment.toolUseID);
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
    if (!$m_e7($l45)) {
      $l40 = false;
      continue;
    }
    if (!$l40) $l40 = true, $l39++;
    let $l46 = $m_a8n($l45) ?? (Array.isArray($l45.message.content) && $l45.message.content[0]?.type === "text" ? ($l35 ??= $m_ACs())[$l45.message.content[0].text] : void 0);
    if (!$l46) continue;
    let $l47 = $l45.errorDetails ?? "", $l48 = $m_tbt($l47);
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
          if ($l59 === void 0) $l59 = $m_WCs($l53.attachment, $m_UCs), $l42.set($l53.uuid, $l59);
          if ($l54 = new Set([...$l56].filter(($l60) => $l59.has($l60))), $l54.size === 0) continue;
        } else if (!$m_CDe($l53, $l56)) {
          if (!$m_NCs($l53)) continue;
          if ($l41 === void 0) {
            $l41 = /* @__PURE__ */ new Map();
            for (let $l61 of $l23) {
              if ($l61.type !== "assistant" || !Array.isArray($l61.message.content)) continue;
              for (let $l62 of $l61.message.content) if ($l62.type === "tool_use") $l41.set($l62.id, $l62.name);
            }
          }
          let $l63 = $m_$Cs($l53, $l41), $l64 = [...$l56].filter(($l65) => $l63.has($l65));
          if ($l64.length === 0) continue;
          let $l66 = $l37.get($l53.uuid) ?? /* @__PURE__ */ new Map();
          for (let $l67 of $l64) if (!$l66.has($l67)) $l66.set($l67, $l39);
          $l37.set($l53.uuid, $l66);
          break;
        } else $l54 = new Set([...$l56].filter(($l68) => $m_CDe($l53, /* @__PURE__ */ new Set([$l68]))));
      } else if ($l53.type !== "user" || !$m_CDe($l53, $l46)) {
        if ($m_e7($l53) || $m_Jy($l53) || $l53.type === "user" && $l53.isMeta) continue;
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
  let $l73 = [], $l74 = $m_Smt(), $l75 = [], $l76 = [], $l77 = [], $l78 = /* @__PURE__ */ new Map(), $l79 = $l3?.inlineToolDefinitions !== void 0 ? $m_n9e($l0, $l3.nameOnlyAnnouncements) : void 0, $l80 = /* @__PURE__ */ new Set(), $l81, $l82 = [], $l83 = [], $l84 = $l3?.keptReminders === true && $l7, $l85 = /* @__PURE__ */ new Map(), $l86 = /* @__PURE__ */ new Set(), $l87 = [], $l88 = false, $l89 = /* @__PURE__ */ new Map(), $l90 = 0, $l91 = $m_KCs($l4), $l92 = $l91 && /* @__PURE__ */ new Set(), $l93 = [], $l94 = /* @__PURE__ */ new Set(), $l95 = /* @__PURE__ */ new Set(), $l96 = /* @__PURE__ */ new Map(), $l97;
  function $l98($l99, $l100, $l101) {
    let $l102 = $l99.userRoleGuard === true, $l103 = ($l104) => {
      if ($l102 || $m_Dle($l99.kinds)) $l3?.onSessionNoticeRender?.({ uuid: $l100, timestamp: $l101, guarded: $l102, ...$l104 });
    }, $l105 = $l99;
    if (!$l102 && $l94.has($l100)) return true;
    if ($l102) {
      let $l106 = $l94.has($l100) ? void 0 : $m_qbt($l99, $l95);
      if ($l94.add($l100), $l106 === void 0) return $l103({ reason: "repeated", outcome: "omitted" }), true;
      $l105 = $l106;
    }
    let $l107 = $l102 && $m_jbt(), $l108 = !$l102 && $m_ade($l99), $l109 = $m_$j(), $l110 = $l109 || $l107 ? $m_zCs($l73, $l105, $l100, !$l102 ? "tail_text" : $l107 ? "second_pair" : "refuse", $l108 ? ($l111) => $l96.has($l111) : $l107 ? ($l112) => $l96.get($l112) === "declared" : void 0) : void 0;
    if ($l110 === "no_assistant") $l3?.onDeclaredRoundRender?.($l100, $l99);
    if ($l110 === "no_assistant" && ($l107 || $l108)) {
      let $l113 = $l91?.get($l100) ?? null;
      if ($l93.push({ attachment: $l105, uuid: $l100, timestamp: $l101, anchor: $l113, guarded: $l102 }), $l94.add($l100), $l102) $m_C9n($l105, $l95);
      if ($l113 === null) $l114($l92);
      return true;
    }
    if ($l102 && ($l110 === "hosted" || $l110 === "second_pair")) $m_C9n($l105, $l95);
    let $l115 = $m_VCs($l110, $l109, $l102);
    if ($l115 !== void 0) $l103($l115);
    return $l110 === "hosted" || $l110 === "second_pair" || $l110 === "tail_text";
  }
  function $l114($l116) {
    let $l117 = $l93.filter(($l118) => $l116 === void 0 || $l118.anchor === null || $l116.has($l118.anchor));
    if ($l117.length === 0) return;
    $l93.splice(0, $l93.length, ...$l93.filter(($l119) => !$l117.includes($l119)));
    for (let [$l120, { attachment: $l121, uuid: $l122, timestamp: $l123, guarded: $l124 }] of $l117.entries()) {
      if ($l124) $l3?.onSessionNoticeRender?.({ uuid: $l122, timestamp: $l123, guarded: true, reason: "no_assistant", outcome: "synthetic_round" });
      let $l125 = $l124 ? "session_notice" : "declared", $l126 = $l97 !== void 0 && $l97 !== $l125, $l127 = $l124 && !$l126;
      if ($l120 === 0) if ($l127) $l128();
      else $l129();
      let $l130 = !$l73.some(($l131) => $l131.type === "user");
      if ($l126 || $l124 && $l130) {
        let $l132 = $m_Ol($l124 ? $m_Wbt : $m_bwt), $l133 = $l73.findLastIndex(($l134) => $l134.type !== "api_system"), $l135 = $l73[$l133];
        if (!$l130 && $l135?.type === "user") {
          let $l136 = $l135.message.content;
          $l73[$l133] = { ...$l135, message: { ...$l135.message, content: [...typeof $l136 === "string" ? [{ type: "text", text: $l136 }] : $l136, { type: "text", text: $l132 }] } };
        } else $l73.push($m_Re({ content: $l132, isMeta: true, uuid: $m_UK("wake", $l122) }));
      }
      if ($l120 === 0 && !$l127 && !$l130) $l128();
      $l97 = $l125;
      let $l137 = `${$m_eOe}${$l122}`, $l138 = $m_amt({ type: "tool_use", id: $l137, name: $m_Lm, input: {} }, $l122);
      $l96.set($l138.uuid, $l125), $l73.push($l138, $m_Re({ content: [{ type: "tool_result", tool_use_id: $l137, content: $m_fft($m_OX($l121.envelopes, $l121.remainingWakeCount), $l121.media) }], isMeta: true, uuid: $l122 })), $l89.clear(), $l90 = $l73.length;
    }
  }
  let $l139 = [];
  function $l129() {
    if ($l139.length === 0) return;
    let $l140 = $l139.splice(0), $l141 = $m_s1($l73);
    if ($l141?.type === "user") {
      $l73[$l73.length - 1] = $l140.reduce(($l142, $l143) => $m_ZN($l142, $l143, $l74), $l141);
      return;
    }
    $l73.push($l140.reduce(($l144, $l145) => $m_ZN($l144, $l145, $l74)));
  }
  function $l128() {
    $l129();
    let $l146 = ["batching_reminder_sent", "secondary_reminder_sent"].filter(($l147) => !$l86.has($l147)).map(($l148) => $l85.get($l148) ?? "").filter(($l149) => $l149.trim() !== "");
    if ($l85.clear(), $l86.clear(), $l75.length === 0 && $l83.length === 0 && $l146.length === 0) return;
    let $l150 = $l75.join(`

`), $l151 = $l82.join(`

`), $l152 = $l83.join(`

`), $l153 = [...$l83, ...$l146].join(`

`), $l154 = $l76.splice(0), $l155 = $l77.splice(0), $l156 = new Map($l78);
    $l78.clear();
    let $l157 = [], $l158 = 0;
    for (let $l159 of $l75) $l157.push($l158), $l158 += $l159.length + 2;
    let $l160 = $l87.splice(0).map(({ type: $l161, entry: $l162 }) => ({ type: $l161, start: $l157[$l162] ?? 0, length: $l75[$l162]?.length ?? 0 })), $l163 = $l160.map(($l164) => $l164.type);
    $l75.length = 0, $l82.length = 0, $l83.length = 0;
    let $l165 = $l154.length > 0 || $l156.size > 0 ? $l151 : void 0, $l166 = $m_s1($l73);
    if ($l166?.type === "api_system") {
      if ($m_ale($l166, $l150, $l153, $l165, $l160), $l146.length > 0) $l166.reminderFromRecords = true;
      if ($m_fmt($l166, $l154, $l155, $l156, $l80), $l163.length > 0) $l166.foldedAttachmentTypes = [...$l166.foldedAttachmentTypes ?? [], ...$l163];
    } else if ($l166?.type === "user") {
      $l88 = true;
      let $l167 = $m_ile("");
      if ($m_ale($l167, $l150, $l153, $l165, $l160), $l146.length > 0) $l167.reminderFromRecords = true;
      if ($l81?.toolDefinitions !== void 0) for (let $l168 of Object.keys($l81.toolDefinitions)) $l80.add($l168);
      if ($l81 = $l167, $m_fmt($l167, $l154, $l155, $l156, $l80), $l163.length > 0) $l167.foldedAttachmentTypes = $l163;
      $l73.push($l167);
    } else {
      let $l169 = $m_mI($l165 ?? $l150, $l152);
      if ($l146.length > 0 && $l169 === "") return;
      $l73.push($m_Re({ content: $l8 ? $l169 : $m_Ol($l169), isMeta: true, ephemeral: $l152 !== "" || void 0 }));
    }
  }
  let $l170 = /* @__PURE__ */ new Set();
  function $l171($l172, $l173, $l174) {
    if ($l170.has($l173)) return true;
    let $l175 = $m_exs($l73, $l172, $l173, { ...$l174, behindEarlierMessages: $l28.has($l173), report: $l2 !== void 0, flushTail: $l128 });
    if ($l175 === false) return false;
    if ($l170.add($l173), $l175 === "new_turn") $l89.clear(), $l90 = $l73.length;
    return true;
  }
  let $l176;
  for (let $l177 of $l23) {
    if ($l92 !== void 0) {
      if ($l176 !== void 0) $l92.add($l176);
      $l176 = $l177.uuid, $l114($l92);
    }
    if ($m_TS($l177)) continue;
    switch ($l177.type) {
      case "progress":
        continue;
      case "system": {
        if (!$m_MK($l177)) continue;
        $l129(), $l85.clear();
        let $l178 = $m_Re({ content: $l177.content, uuid: $l177.uuid, timestamp: $l177.timestamp }), $l179 = $m_s1($l73);
        if ($l179?.type === "user") {
          $l73[$l73.length - 1] = $m_ZN($l179, $l178, $l74);
          continue;
        }
        $l73.push($l178);
        continue;
      }
      case "user": {
        if ($m_ken($l177)) continue;
        $l129(), $l85.clear();
        let $l180 = $l177;
        if ($l177.taskDelivery && $l171($l177.taskDelivery, $l177.uuid, { startsTurn: true, inDrainPosition: false, inHumanTurn: false })) continue;
        if ($l177.taskDelivery) $l180 = { ...$l180, taskDelivery: void 0 };
        if ($l177.origin?.kind === "task-notification") {
          let $l181 = $l180.message.content, $l182, $l183 = $l177.origin.subkind === "scheduled-trigger" ? $m_JOo : $l177.origin.subkind === "projects-relay" && $l177.hearthRelayMessageIds !== void 0 ? ($l184, $l185 = false) => $m_NSo($l184, { serverEnvelope: !$l185 }) : void 0;
          if ($l183) $l182 = typeof $l181 === "string" ? $l183($l181) : [{ type: "text", text: $l183($l181.filter(($l186) => $l186.type === "text").map(($l187) => $l187.type === "text" ? $l187.text : "").join(`

`), $m_F($l181, ($l188) => $l188.type === "text") > 1) }, ...$l181.filter(($l189) => $l189.type !== "text")];
          else if (typeof $l181 === "string") $l182 = $m_XOo($l181);
          else {
            let $l190 = $l181.filter(($l191) => $l191.type === "text").map(($l192) => $l192.text).join(`
`);
            $l182 = [{ type: "text", text: $m_XOo($l190) }, ...$l181.filter(($l193) => $l193.type !== "text")];
          }
          $l180 = { ...$l180, origin: void 0, message: { ...$l180.message, content: $l182 } };
        }
        if (!$l17()) $l180 = $m_WJe($l180);
        else $l180 = $m_TCs($l180, $l1, $l10, $l3?.strippedToolReferenceKeys);
        let $l194 = $l36.get($l180.uuid);
        if ($l194) {
          let $l195 = $m_R9n($l180, $l194);
          if ($l195 === null) continue;
          $l180 = $l195;
        }
        $l180 = $m_S3([$l180], $l43.get($l180.uuid)?.reason ?? "")[0];
        let $l196 = $l180.message.content;
        if (Array.isArray($l196) && !$l196.some(($l197) => $l197.type === "text" && $l197.text.startsWith($m_S9n)) && $m_CCs($l196)) $l180 = { ...$l180, message: { ...$l180.message, content: [...$l196, { type: "text", text: $m_S9n }] } };
        if ($l9) {
          let $l198 = $m_gxs($l180, $l9);
          if ($l198) {
            $l180 = $l198.cleaned;
            let $l199 = $l8 ? $l198.reminders.map($m_Ol) : $l198.reminders;
            $l75.push(...$l199), $l82.push(...$l199);
          }
        }
        let $l200 = $m_yxs($l177, $l29, $l32);
        $l180 = $m_T9n($l180);
        let $l201 = $m_s1($l73);
        if ($l201?.type === "user") $l73[$l73.length - 1] = $m_ZN($l201, $l180, $l74);
        else $l73.push($l180);
        if ($l200 !== void 0) {
          let $l202 = $m_AO($l200);
          if ($l7) $l75.push($l202), $l82.push($l202);
          else {
            let $l203 = $m_s1($l73), $l204 = $m_Re({ content: $m_Ol($l202), isMeta: true });
            if ($l203?.type === "user") $l73[$l73.length - 1] = $m_P9n($l203, $l204, $l19(), false, $l20);
            else $l73.push($l204);
          }
        }
        continue;
      }
      case "assistant": {
        $l114(), $l129();
        let $l205 = $l17(), $l206 = $m_YHs($l177.message.content, $l177.batchToolUses, $l1), $l207;
        for (let $l208 = 0; $l208 < $l206.length; $l208++) {
          let $l209 = $l206[$l208];
          if ($l209.type === "text" && Array.isArray($l209.citations) && $l209.citations.some(($l210) => $l210?.type !== "web_search_result_location")) $l207 ??= $l206.slice(), $l207[$l208] = { ...$l209, citations: $l209.citations.filter(($l211) => $l211?.type === "web_search_result_location") };
          if ($l209.type !== "tool_use") continue;
          $l9?.set($l209.id, $l209.name);
          let $l212 = $m_xn($l1, $l209.name), $l213 = $l212?.name ?? $l209.name, $l214 = $l14 && $m_$n($l177.wireToolInputs) ? $l177.wireToolInputs : void 0, $l215 = $l214 !== void 0 && Object.hasOwn($l214, $l209.id) ? $l214[$l209.id] : void 0, $l216 = $l214 !== void 0 && $m_$n($l215) && $m_o4t($l214, $l209.id, $l215, $l209.input, $l213, $l212, $l177.wireIngestContext?.[$l209.id], $l15) ? $l213 === $m_Cn ? $m_ujt($l215) ?? $l215 : $l215 : $m_DYt($l213, $l209.input, $l212 !== void 0 || $l12?.has($m_ac($l209.name)) === true);
          if ($l205 && $l216 === $l209.input && $l213 === $l209.name) continue;
          $l207 ??= $l206.slice(), $l207[$l208] = $l205 ? { ...$l209, name: $l213, input: $l216 } : { type: "tool_use", id: $l209.id, name: $l213, input: $l216 };
        }
        let $l217 = $l207 ?? ($l206 !== $l177.message.content ? $l206 : void 0), $l218 = $l177;
        if ($l177.wireToolInputs !== void 0 || $l177.wireIngestContext !== void 0 || $l217 !== void 0) {
          let { wireToolInputs: $l219, wireIngestContext: $l220, ...$l221 } = $l177;
          $l218 = $l217 !== void 0 ? { ...$l221, message: { ...$l177.message, content: $l217 } } : $l221;
        }
        for (; $l90 < $l73.length; $l90++) {
          let $l222 = $l73[$l90];
          if ($l222.type === "assistant") $l89.set($l222.message.id, $l90);
          else if ($l222.type !== "api_system" && !$m_Jy($l222)) $l89.clear();
        }
        let $l223 = $l89.get($l218.message.id), $l224 = $l223 === void 0 ? void 0 : $l73[$l223];
        if ($l223 !== void 0 && $l224?.type === "assistant") $l73[$l223] = $m_txs($l224, $l218, { echoApiBlockOrder: $l3?.echoApiBlockOrder === true });
        else {
          $l128();
          let $l225 = $l218.message.content, $l226 = $l3?.echoApiBlockOrder === true && typeof $l218.apiBlockIndex === "number" ? $l225 : $m_c8n($l225);
          if ($l226 === $l225) $l73.push($l218);
          else {
            let { apiBlockIndex: $l227, apiBlockIndices: $l228, ...$l229 } = $l218;
            $l73.push({ ...$l229, message: { ...$l218.message, content: $l226 } });
          }
        }
        continue;
      }
      case "attachment": {
        if ($m_g0n($l177)) continue;
        if ($l177.attachment.type === "poll_events" && $l177.attachment.deliveredVia === void 0 && $l3?.pollEventsAsText !== true && $l98($l177.attachment, $l177.uuid, $l177.timestamp)) continue;
        if ($l177.attachment.type === "queued_command" && $l177.attachment.taskDelivery && $l171($l177.attachment.taskDelivery, $l177.uuid, { startsTurn: false, inDrainPosition: $l27.has($l177.uuid), inHumanTurn: $l25.has($l177.uuid) })) continue;
        let $l230 = $l177.attachment.type === "batching_reminder" || $l177.attachment.type === "secondary_reminder";
        if ($l230 && !$l7) continue;
        if ($l177.attachment.type === "output_limit_note" && !($l7 && typeof $l177.attachment.model === "string" && $m_age($l177.attachment.model, $l2))) continue;
        if ($l84 && ($l177.attachment.type === "batching_reminder_sent" || $l177.attachment.type === "secondary_reminder_sent") && $l177.attachment.clearAt === "next_user_message") {
          let $l231 = $m_emt([$m_Re({ content: $m_Ol($l177.attachment.text), isMeta: true })]) ?? "";
          $l85.set($l177.attachment.type, $l231 && $l8 ? $m_Ol($l231) : $l231);
          continue;
        }
        let $l232 = $l7 && $l3?.surfaceLateToolAdditions === true && $l3.inlineToolDefinitions !== void 0 && $l177.attachment.type === "deferred_tools_delta" ? $m_HAs($l79?.get($l177.uuid), $l3.inlineToolDefinitions) : void 0, $l233 = $l7 && $l3?.surfaceLateToolAdditions === true && $l177.attachment.type === "deferred_tools_delta" && $l3.nameOnlyAnnouncements?.has($l177.uuid) !== true ? [...$m_Zi($l177.attachment.surfacedNames), ...$l232 !== void 0 ? $m_Zi($l177.attachment.replacedNames) : []].filter(($l234) => $l232?.definitions.get($l234) !== void 0 || $l3.deferredWireToolNames?.has($l234) === true) : [], $l235 = $l232 !== void 0 && $l177.attachment.type === "deferred_tools_delta" && $l3?.nameOnlyAnnouncements?.has($l177.uuid) !== true ? $m_Zi($l177.attachment.removedByBlock) : [], $l236 = $l7 && $l3?.advisorToolChanges === true && $l177.attachment.type === "advisor_tool" ? $l177.attachment.toolChange : void 0, $l237 = $m_gmt($l177.attachment), $l238 = $m_ymt($l177.attachment), $l239 = $l7 && $l177.attachment.type === "queued_command" && $l177.attachment.humanTurn === true && $l177.attachment.commandMode === "prompt" && $l177.attachment.isMeta !== true && $m_aA($l177) && !$m_bne($l177.attachment) && $l22(), $l240 = $l26.has($l177.uuid) || $l233.length > 0 || $l235.length > 0 || $l236 !== void 0, $l241 = { inHumanTurn: $l25.has($l177.uuid), surfacedToolNames: $l233 }, $l242 = $l3?.withoutAttachmentHooks ? $m_aBe($l177, $l241) : $m_I8n($l177, $l241, $l240), $l243 = $l242.messages, { isKnownType: $l244, recordedRole: $l245 } = $l242, $l246 = $m_t8n($l177.attachment) ? "user" : "system", $l247 = $l246 === "system" && ($l244 ? $l245 !== "user" : $l245 === "system");
        if ($l2 !== void 0 && $l243.length > 0 && (!$l244 || $l245 !== void 0 && $l245 !== $l246) && typeof $l177.attachment === "object" && !$m_x9n.has($l177.attachment)) $m_x9n.add($l177.attachment), $m_i("tengu_attachment_role_unknown_or_differs", { is_known_type: $l244, recorded_role: $m_c($l245 ?? "none"), should_promote: $l247, system_turns_on: $l7 });
        let $l248 = $l36.get($l177.uuid);
        if ($l248) $l243 = $l243.flatMap(($l249) => {
          let $l250 = $m_R9n($l249, $l248);
          return $l250 === null ? [] : [$l250];
        });
        let $l251 = $l177.attachment.type === "queued_command" && $m_Mwt($l177.attachment.reminderId) ? $l177.attachment.reminderId : void 0, $l252 = $l43.get($l177.uuid)?.reason ?? "";
        if ($l243 = $l243.map(($l253) => {
          let $l254 = $m_S3([$l253], $l252)[0];
          if ($l251 === void 0 || !$m_b9n($l253, $l251)) return $m_T9n($l254);
          let $l255 = $l254.message.content;
          if ($l254 === $l253 || typeof $l255 === "string") return $l253;
          let $l256 = $l255.filter(($l257) => $l257.type !== "text" || $m_ELe($l257.text) === $l251);
          return { ...$l254, message: { ...$l254.message, content: $l256 } };
        }), $l239) {
          let $l258 = [];
          for (let $l259 of $l243) {
            if ($l259.isMeta) {
              $l258.push($l259);
              continue;
            }
            let $l260 = $l259.message.content;
            $l139.push({ ...$l259, message: { ...$l259.message, content: typeof $l260 === "string" ? $m_Iie($l260) : $l260.map(($l261) => $l261.type === "text" ? { ...$l261, text: $m_Iie($l261.text) } : $l261) } });
          }
          if ($l258.length === 0) continue;
          $l243 = $l258;
        }
        if ($l7 && $l251 !== void 0) {
          let $l262 = [], $l263 = [];
          for (let $l264 of $l243) if ($m_b9n($l264, $l251)) $l262.push($l264);
          else $l263.push($l264);
          if ($l262.length > 0) {
            let $l265 = $m_s1($l73);
            if ($l265?.type === "user") $l73[$l73.length - 1] = $l262.reduce(($l266, $l267) => $m_ZN($l266, $l267, $l74), $l265);
            else $l73.push(...$l262);
            if ($l263.length === 0) continue;
            $l243 = $l263;
          }
        }
        if ($l7 && $l247) {
          let $l268 = $m_emt($l243);
          if ($l268 !== null) {
            let $l269 = $l8 ? $m_Ol($l268) : $l268;
            if ($l230) {
              $l83.push($l269), $l86.add(`${$l177.attachment.type}_sent`);
              continue;
            }
            $l75.push($l269), $l87.push({ type: $l177.attachment.type, entry: $l75.length - 1 });
            let $l270 = { ...$l241, surfacedToolNames: [] }, $l271 = $l233.length > 0 ? $m_emt($l3?.withoutAttachmentHooks ? $m_aBe($l177, $l270).messages : $m_fGe($l177, $l270)) ?? $l268 : $l268;
            $l82.push($l8 ? $m_Ol($l271) : $l271);
            for (let $l272 of $l235) $l77.push({ op: "remove", name: $l272, byValue: true });
            for (let $l273 of $l233) {
              let $l274 = $l232?.definitions.get($l273);
              if ($l274 === void 0) $l76.push($l273);
              else $l78.set($l273, $l274), $l77.push({ op: "add", name: $l273 });
            }
            if ($l236 !== void 0) $l77.push({ op: $l236, name: $m_iIe });
            continue;
          }
        }
        let $l275 = $l19() && !$l237 && !$l238 ? $l243.map($m_Q9n) : $l243, $l276 = $l237 || $l238 || $l7 && ($l177.attachment.type === "account_memory_recall" || $m_Z9n($l177.attachment)), $l277 = $m_s1($l73);
        if ($l277?.type === "user") {
          $l73[$l73.length - 1] = $l275.reduce(($l278, $l279) => $l276 ? $m_ZN($l278, $l279, $l74) : $m_P9n($l278, $l279, $l19(), $l7, $l20), $l277);
          continue;
        }
        $l73.push(...$l275);
        continue;
      }
    }
  }
  $l114(), $l128();
  let $l280 = $m_xAs($l73, $l3?.preserveTrailingThinking), $l281 = $m_B8n($l280, $l3?.preserveTrailingThinking), $l282 = $l281.length === $l280.length ? $l281 : $m_MDe($l281), $l283 = $m_L8n($l282, $l3?.preserveTrailingThinking), $l284 = $m_F8n($l283), $l285 = $m_AAs($l284), $l286;
  if ($l7) $l286 = $l88 ? $m_nxs($l285, $l8) : $l285;
  else if ($l19()) $l286 = $m_s8n($m_MDe($l285), $l7, $l20);
  else $l286 = $l285;
  let $l287 = $l3?.echoApiBlockOrder === true ? $m_zJe($l286, $l3?.preserveTrailingThinking) : $l286, $l288 = $l5.size > 0 ? $m_DAs($l287, $l5) : $l287, $l289 = $m_xCs($l6.size > 0 ? $m_zb($l288, $l6) : $l288);
  return $m_XHs($m_ywt($l289), $l1);
}
;
