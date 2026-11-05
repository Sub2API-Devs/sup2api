
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{b,f}from"./chunk-vwtpw18x.js";import{N,d,HG}from"./chunk-63094ahz.js";import{G,ve}from"./chunk-5ythzcas.js";import{W}from"./chunk-0qffyy27.js";import{t}from"./chunk-6hadbefe.js";import{x}from"./chunk-8824h7w7.js";import{l}from"./chunk-nkv493nm.js";import{g,m}from"./chunk-47b8txen.js";import{p4}from"./chunk-9ys74nhz.js";import{tr}from"./chunk-sbrfdm61.js";import{gt}from"./chunk-5fn9rb8r.js";import{Oa,v,Jp,el,Y5}from"./chunk-exfmq47h.js";import{lt,Jt}from"./chunk-p223w7hd.js";import{sQ,HC,P5t,Me,$t,xdr}from"./chunk-5xgkngpb.js";import{Obr,ioe,s5}from"./chunk-a2q0x549.js";import{Yp,cN,XJe}from"./chunk-7jeh0w0e.js";import{Ty}from"./chunk-807vb177.js";import{XYn,JYn,jBr,WBr,GBr,J$e,zBr}from"./chunk-70rvh5wm.js";import{OEt,g6s,TGt,y6s}from"./chunk-z7mex7te.js";import{ZS,Rg}from"./chunk-j8qkeqz1.js";import{_p}from"./chunk-5d1nwe9e.js";import{pv,og,If}from"./chunk-xfwd817q.js";function K(){return v("tengu_onyx_plover",null)}function Rfn(){let e=K();return e?.enabled===!0||e?.available===!0}function rEt(){if(!Rfn())return!1;let e=gt().autoDreamEnabled;if(e!==void 0)return e;return K()?.enabled===!0}class Z{runner=null}var B=new W(()=>new Z);var le="## Team memory (`team/` subdirectory)\n\nThe `team/` subdirectory holds memories shared across everyone working in this repo. Other teammates' Claude sessions write here too \u2014 treat it differently from your personal files:\n\n- **Phase 1:** `ls team/` and skim it alongside your personal files. A teammate may have already captured something you'd otherwise duplicate.\n- **Phase 3:** Merge near-duplicates *within* `team/` the same way you would personal memories. If a personal memory restates a team memory, delete the personal one.\n- **Phase 4 \u2014 be conservative pruning `team/`:**\n  - DO delete or fix a team memory that is clearly contradicted by the current code, or that a newer team memory marks as superseded.\n  - DO NOT delete a team memory just because you don't recognize it or it isn't relevant to *your* recent sessions \u2014 a teammate may rely on it.\n  - When unsure, leave it. A stale team memory costs little; deleting a teammate's load-bearing note costs a lot.\n\nDo not promote personal memories into `team/` during a dream \u2014 that's a deliberate choice the user makes via `/remember`, not something to do reflexively.",de=`### Reconcile memories against CLAUDE.md

Project CLAUDE.md instructions are loaded in your system prompt. For each memory that captures feedback or project conventions (the \`feedback\`/\`project\` types, where tagged), check whether it contradicts a CLAUDE.md instruction on the same topic:

- **Memory is stale** \u2014 CLAUDE.md and the memory describe different procedures for the same task: CLAUDE.md is the maintained, checked-in source. Delete the memory, or rewrite it to agree if it carries context worth keeping (the *why* is still useful but the *how* is wrong).
- **CLAUDE.md may be stale** \u2014 the memory is clearly dated after CLAUDE.md and explicitly corrects it: do NOT edit CLAUDE.md during a dream. Annotate the memory with "contradicts CLAUDE.md \u2014 verify which is current" and list it in your summary so the user can update CLAUDE.md.
- **Not a conflict** \u2014 the memory adds detail CLAUDE.md doesn't cover, or narrows a CLAUDE.md rule with a stated reason. Leave it.

A \`feedback\` memory's "Why: the user corrected me" framing is not evidence it's newer than CLAUDE.md \u2014 CLAUDE.md may have been updated since.`;function Q(e,r,o,y=!1,c=!1,s=!1){return`# Dream: Memory Consolidation

You are performing a dream \u2014 a reflective pass over your memory files. Synthesize what you've learned recently into durable, well-organized memories so that future sessions can orient quickly.

Memory directory: \`${e}\`
${XJe}

Session transcripts: \`${r}\` (large JSONL files \u2014 grep narrowly, don't read whole files)
${y?`
${le}
`:""}
---

## Phase 1 \u2014 Orient

- \`ls\` the memory directory to see what already exists
- Read \`${Yp}\` to understand the current index
- Skim existing topic files so you improve them rather than creating duplicates
- If a \`sessions/\` subdirectory exists, review recent entries there

## Phase 2 \u2014 Gather recent signal

Look for new information worth persisting. Sources in rough priority order:

1. **Existing memories that drifted** \u2014 facts that contradict something you see in the codebase now
2. **Transcript search** \u2014 if you need specific context (e.g., "what was the error message from yesterday's build failure?"), grep the JSONL transcripts for narrow terms:
   \`grep -rn "<narrow term>" ${r}/ --include="*.jsonl" | tail -50\`

Don't exhaustively read transcripts. Look only for things you already suspect matter.

## Phase 3 \u2014 Consolidate

For each thing worth remembering, write or update a memory file at the top level of the memory directory. Use the memory file format and type conventions from your system prompt's auto-memory section \u2014 it's the source of truth for what to save, how to structure it, and what NOT to save.${c?` The ${pv} / ${og} / ${If} tools are unavailable in a dream: consolidate only this memory directory, and leave anything that section marks as shared with the project where it is \u2014 never copy it into these files.`:""}${""}

Focus on:
- Merging new signal into existing topic files rather than creating near-duplicates
- Converting relative dates ("yesterday", "last week") to absolute dates so they remain interpretable after time passes
- Deleting contradicted facts \u2014 if today's investigation disproves an old memory, fix it at the source

## Phase 4 \u2014 Prune and index

Update \`${Yp}\` so it stays under ${cN} lines AND under ~25KB. It's an **index**, not a dump \u2014 each entry should be one line under ~150 characters: \`- [Title](file.md) \u2014 one-line hook\`. Never write memory content directly into it.

- Remove pointers to memories that are now stale, wrong, or superseded
- Demote verbose entries: if an index line is over ~200 chars, it's carrying content that belongs in the topic file \u2014 shorten the line, move the detail
- Add pointers to newly important memories
- Resolve contradictions \u2014 if two files disagree, fix the wrong one

${de}

---

Return a brief summary of what you consolidated, updated, or pruned. If nothing changed (memories are already tight), say so.${o?`

## Additional context

${o}`:""}`}var ue=30;function Y(e){return typeof e==="object"&&e!==null&&"type"in e&&e.type==="dream"}function ee(e,r){let o=ZS("dream"),y={...Rg(o,"dream","dreaming"),type:"dream",status:"running",skipTranscript:!0,phase:"starting",sessionsReviewing:r.sessionsReviewing,filesTouched:[],turns:[],abortController:r.abortController,priorMtime:r.priorMtime,...r.storageV5!==void 0&&{storageV5:r.storageV5}};return e.register(y),o}function te(e,r,o,y){y.update(e,(c)=>{let s=new Set(c.filesTouched),n=o.filter((a)=>!s.has(a)&&s.add(a));if(r.text===""&&r.toolUseCount===0&&n.length===0)return c;return{...c,phase:n.length>0?"updating":c.phase,filesTouched:n.length>0?[...c.filesTouched,...n]:c.filesTouched,turns:c.turns.slice(-(ue-1)).concat(r)}})}function re(e,r){r.update(e,(o)=>({...o,status:"completed",endTime:Date.now(),notified:!0,abortController:void 0})),g("task_dream"),Oa(e,"completed",{skipTranscript:!0,ambient:!0})}function oe(e,r){r.update(e,(o)=>({...o,status:"failed",endTime:Date.now(),notified:!0,abortController:void 0})),m("task_dream","task_dream_failed"),Oa(e,"failed",{skipTranscript:!0,ambient:!0})}var w=null,ce=600000,pe=new RegExp(`^\\s*(?:${WBr})\\b`,"i"),se={minHours:24,minSessions:5};function fe(){let e=v("tengu_onyx_plover",null);return{minHours:typeof e?.minHours==="number"&&Number.isFinite(e.minHours)&&e.minHours>0?e.minHours:se.minHours,minSessions:typeof e?.minSessions==="number"&&Number.isFinite(e.minSessions)&&e.minSessions>0?e.minSessions:se.minSessions}}function he(){if(tr()!==null)return!1;if(p4())return!1;if(!Jp())return!1;if(ioe())return!1;return rEt()}function ge(){return!1}function Oqs(e){let r=0,o=!1,y=new Set;B.of(e).runner=async function(s,n){let a=fe(),u=ge();if(!u&&!he())return;let E;try{E=await OEt(void 0,s.toolUseContext.storageV5)}catch(i){t(`[autoDream] readLastConsolidatedAt failed: ${d(i)}`);return}let P=(Date.now()-E)/3600000;if(!u&&P<a.minHours)return;let q=Date.now()-r;if(!u&&q<ce){t(`[autoDream] scan throttle \u2014 time-gate passed but last scan was ${Math.round(q/1000)}s ago`);return}r=Date.now();let p;try{p=await y6s(E,s.toolUseContext.storageV5)}catch(i){t(`[autoDream] listSessionsTouchedSince failed: ${d(i)}`);return}let ae=G();if(p=p.filter((i)=>i!==ae),!u&&p.length<a.minSessions){t(`[autoDream] skip \u2014 ${p.length} sessions since last consolidation, need ${a.minSessions}`),l("tengu_auto_dream_skipped",{reason:b("sessions"),session_count:p.length,min_required:a.minSessions});return}let I=GBr(s.toolUseContext.getAppState().toolPermissionContext,Y5());if(I!==void 0){if(t(`[autoDream] skip \u2014 ${JYn(I)} would refuse memory writes`),l("tengu_auto_dream_skipped",{reason:b("permission_rule")}),n!==void 0){let i=jBr(e,I,el());if(i!==void 0)n($t(i,"warning"))}return}let D;if(u)D=E;else{try{D=await g6s(s.toolUseContext.storageV5)}catch(i){t(`[autoDream] lock acquire failed: ${d(i)}`);return}if(D===null){l("tengu_auto_dream_skipped",{reason:b("lock")});return}}let S=el(),M=void 0,h=M==="unplaced"||M==="capped"?void 0:M;if(h==="newer"||h!==void 0&&"unreadable"in h){if(!u)await TGt(D,s.toolUseContext.storageV5);if(h!=="newer"){if(t(`[autoDream] skipped: the memory items could not be read (cause: ${h.unreadable}); the warning above says why and what resumes consolidation`),l("tengu_auto_dream_skipped",{reason:b("items_unreadable")}),w!==null&&n!==void 0&&!y.has(h.unreadable))y.add(h.unreadable),n?.($t(await w.unreadableItemsNotice(h.unreadable,S),"warning"));return}if(t("[autoDream] skip \u2014 newer item record"),l("tengu_auto_dream_skipped",{reason:b("record_newer")}),w!==null&&n!==void 0&&!o)o=!0,n?.($t(w.NEWER_RECORD_NOTICE,"warning"));return}let F=s5();t(`[autoDream] firing \u2014 ${P.toFixed(1)}h since last, ${p.length} sessions to review`),l("tengu_auto_dream_fired",{hours_since:Math.round(P),sessions_since:p.length,team_memory_enabled:F});let{taskRegistry:R}=s.toolUseContext,C=new AbortController,L=ee(R,{sessionsReviewing:p.length,priorMtime:D,abortController:C,storageV5:s.toolUseContext.storageV5}),U="fork";try{let i=Ty(ve()),z=`

**Tool constraints for this run:** Shell access is restricted to read-only commands (\`ls\`, \`find\`, \`grep\`, \`cat\`, \`stat\`, \`wc\`, \`head\`, \`tail\`, and similar) plus deleting \`.md\` files inside the memory directory (outside protected subdirectories like \`.git\` or \`agents\`; \`rm\` takes no flags except \`-f\`). Anything else that writes, redirects to a file, or modifies state will be denied. Plan your exploration with this in mind.

Sessions since last consolidation (${p.length}):
${p.map((_)=>`- ${_}`).join(`
`)}`,we=!1,ne=Q(S,i,z,F,Obr(),!1),ie=_e(L,R,S),H=new Map,j=new Set,X=!1,J=!1,V=!1,A;try{A=await HC({promptMessages:[Me({content:ne})],cacheSafeParams:sQ(s),canUseTool:zBr(S,h!==void 0?w?.keptItemsOf(h):void 0,{fork:"dream",onWriteAllowed:(_,O)=>H.set(O,_)}),querySource:"auto_dream",forkLabel:"auto_dream",skipTranscript:!0,overrides:{abortController:C},onMessage:(_)=>{if(ie(_),ye(_,j),_.type==="assistant")X=_.isApiErrorMessage===!0},skipCacheWrite:P5t()}),J=!0,V=!C.signal.aborted&&!X}finally{let _=new Set([...H].filter(([k])=>!V||!j.has(k)).map(([,k])=>k)),O=new Set([...H].filter(([k])=>V&&j.has(k)).map(([,k])=>k));if(w!==null&&M==="capped")await w.deferCappedRunWrites({memoryDir:S,dreamWrote:_,mayHaveWritten:O});if(w!==null&&h!==void 0){let k=await w.settleDreamItems({memoryDir:S,before:h,dreamWrote:_,mayHaveWritten:O});if((k.skipped||k.failed)&&J&&!C.signal.aborted&&!u&&await w.claimLockGiveBack(S))await TGt(D,s.toolUseContext.storageV5)}}U="completion",re(L,R);let T=s.toolUseContext.taskRegistry.get(L),me=Y(T)?T.filesTouched.length:0;if(Y(T)&&T.filesTouched.length>0)n?.({...xdr(T.filesTouched),verb:"Improved"}),await XYn(s.toolUseContext,{source:"dream",summary:`consolidated ${T.filesTouched.length} ${x(T.filesTouched.length,"memory file")}`,paths:T.filesTouched});t(`[autoDream] completed \u2014 cache: read=${A.totalUsage.cache_read_input_tokens} created=${A.totalUsage.cache_creation_input_tokens}`),l("tengu_auto_dream_completed",{cache_read:A.totalUsage.cache_read_input_tokens,cache_created:A.totalUsage.cache_creation_input_tokens,output:A.totalUsage.output_tokens,sessions_reviewed:p.length,files_touched_count:me,team_memory_enabled:F,account_memory_line_rendered:!1})}catch(i){if(C.signal.aborted){t("[autoDream] aborted by user");return}if(t(`[autoDream] ${U} failed: ${d(i)}`),l("tengu_auto_dream_failed",{phase:f(U),error_class:HG(N(i))}),U==="fork")oe(L,R),await TGt(D,s.toolUseContext.storageV5)}}}function ye(e,r){if(e.type!=="user"||e.toolDenialKind!==void 0||typeof e.message.content==="string")return;for(let o of e.message.content)if(o.type==="tool_result"&&o.is_error===!0)r.add(o.tool_use_id)}function _e(e,r,o){return(y)=>{if(y.type!=="assistant")return;let c="",s=0,n=[];for(let a of y.message.content)if(a.type==="text")c+=a.text;else if(a.type==="tool_use"){if(s++,a.name===lt||a.name===Jt){let u=a.input;if(typeof u.file_path==="string")n.push(u.file_path)}else if(_p.includes(a.name)){let u=a.input;if(typeof u.command==="string"&&pe.test(u.command))for(let E of u.command.matchAll(/"[^"]*\.md"|'[^']*\.md'|(?:\/|[A-Za-z]:[\\/])\S*\.md\b/g))n.push(E[0].replace(/^["']|["']$/g,""))}}te(e,{text:c.trim(),toolUseCount:s},n.filter((a)=>J$e(a,o)),r)}}async function Mqs(e,r){await B.of(e.toolUseContext.session.host).runner?.(e,r)}
export{Rfn,rEt,Oqs,Mqs};
