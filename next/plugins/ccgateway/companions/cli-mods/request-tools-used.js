// Claude Code's tools-used header (x-claude-code-sandy-plover; request_tools_used_v1,
// SESSION-MEMORY-TOOLS-USED-DESIGN.md §3, §6). Its rules are Claude Code's own:
// the history reader (nD) names the tools a conversation's messages show, the
// session's set (wf) keeps names in first-use order under its own canonical
// form, and the serializer (Nf, at the send point) moves CC's built-in tools
// last, cuts at 64 items or 7168 characters and puts its stand-in first when
// it cut. This module only chooses what the set is filled with and tells the
// patched fetch wrapper (chunk-vn3g7zt8.js XS) what to send. It is installed
// for a version whose patch sends the header; the request command reaches it
// through request-agent.js, which every version has.
import { toolsUsedFromHistory, conversationToolsUsed, compactSummaryTools, companionTools, toolsUsedUnreadable } from './native-toolsUsed.js';
import { useToolsUsedMerge, requestToolsUsed } from './request-agent.js';

// The most names a response reports (the Worker keeps as many).
const reportMax = 256;
// The first Claude Code that sends the header by default: 2.1.316 keeps the
// same header behind a flag that is off (tengu_snug_mitten), so upstream sees
// it only from a client of this version on.
const firstSending = [2, 1, 318];

// historyRecords are the wire messages as the records the history reader
// reads ({type: role, message: {content}}). The wire carries none of CC's
// record marks, so each user block becomes a record of its own, marked as CC
// marks its records: a compact summary's opening (the module's own reader,
// compactSummaryTools) isCompactSummary; a turn companion, a block that is
// exactly CC's reminder with a tools-used list (companionTools), isMeta and
// turnCompanion. The reader takes a companion only when the next record is a
// prompt with an origin (one CC queued, not a person's): the wire does not say
// which, so the record after a companion gets an origin of no kind CC reads
// (the reader parses texts only for a task notification or a peer), an empty
// record when the companion ends its message or another companion follows.
const companionFollower = { kind: 'ccgateway-wire' };
function historyRecords(messages) {
  const records = [];
  for (const message of messages) {
    if (message?.role === 'assistant') {
      records.push({ type: 'assistant', message: { role: 'assistant', content: message.content } });
      continue;
    }
    if (message?.role !== 'user') continue;
    const blocks = typeof message.content === 'string' ? [{ type: 'text', text: message.content }] : Array.isArray(message.content) ? message.content : [];
    let follows = false;
    for (const block of blocks) {
      const text = block?.type === 'text' && typeof block.text === 'string' ? block.text : undefined;
      if (text !== undefined && companionTools(text) !== undefined) {
        if (follows) records.push({ type: 'user', origin: companionFollower, message: { role: 'user', content: [] } });
        records.push({ type: 'user', isMeta: true, turnCompanion: true, message: { role: 'user', content: [block] } });
        follows = true;
        continue;
      }
      records.push({
        type: 'user', message: { role: 'user', content: [block] },
        ...text !== undefined && compactSummaryTools(text) !== undefined && { isCompactSummary: true },
        ...follows && { origin: companionFollower },
      });
      follows = false;
    }
    if (follows) records.push({ type: 'user', origin: companionFollower, message: { role: 'user', content: [] } });
  }
  return records;
}

// clientNames are the names of the client's own header value, in its order,
// without the stand-in CC puts first in a value it cut (the contract's
// ToolsUsedNames: a first stand-in of a longer list).
function clientNames(value) {
  if (value === undefined) return [];
  const names = JSON.parse(value).map(item => item.name);
  return names.length > 1 && names[0] === toolsUsedUnreadable ? names.slice(1) : names;
}

// mergeToolsUsed fills the session's set for this request and returns what it
// reports: the Worker's memory as given (its stand-in, a name like any other,
// included), the client's own names, then the names the history reader finds
// in the request's messages (sorted, as CC's resume adds them), each added
// once in that order (the set's own record). The header is then the client's
// value when it sent one, else the set's.
export function mergeToolsUsed(tools, messages) {
  const set = conversationToolsUsed();
  // nD(records, no filter, true): the history reader with its full parse
  // (attachments, turn companions, origin texts, hand-back frames and Poll
  // manifests), not resume's tool blocks and summaries only (false).
  set.replace([...tools.memory ?? [], ...clientNames(tools.client), ...toolsUsedFromHistory(historyRecords(messages), undefined, true)]);
  return set.names().slice(0, reportMax);
}
useToolsUsedMerge(mergeToolsUsed);

// sendsToolsUsed says whether the User-Agent the request is sent with is a
// Claude Code that sends the header (claude-cli/X.Y.Z, at least 2.1.318). A
// request without one sends none.
function sendsToolsUsed(userAgent) {
  const found = /^claude-cli\/(\d+)\.(\d+)\.(\d+)(?![\d.])/.exec(userAgent ?? '');
  if (!found) return false;
  for (let i = 0; i < 3; i++) {
    const part = Number(found[i + 1]);
    if (part !== firstSending[i]) return part > firstSending[i];
  }
  return true;
}

// ccgatewayToolsUsedHeader is what the patched fetch wrapper sends, inside CC's
// own conditions for the header: undefined for CC's own value (no Worker
// context: an ordinary CLI, the management command, a request run by hand),
// null for none (the Worker gave no tools_used, or the request goes upstream
// with a User-Agent older than 2.1.318), else the value: the client's own as
// it came, or nativeValue() (Nf over the set mergeToolsUsed filled).
export function ccgatewayToolsUsedHeader(headers, nativeValue) {
  const request = requestToolsUsed();
  if (request === undefined) return undefined;
  if (!request.tools) return null;
  // The request command merges before sending; a request that reached the
  // send point without that (none does) merges here.
  if (request.reported === undefined) request.reported = mergeToolsUsed(request.tools, request.messages);
  if (!sendsToolsUsed(headers.get('user-agent'))) return null;
  return request.tools.client ?? nativeValue();
}
