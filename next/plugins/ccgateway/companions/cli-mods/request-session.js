// A request whose billing header this CLI writes continues its upstream
// session as Claude Code's own would (2026-10-30). Claude Code reads two facts
// off each thread's own transcript (the main thread's, or a subagent's): the
// last answered request (the last assistant message's requestId, which its
// header writes as cc_prev_req) and, on the main thread, the last prompt's
// turn position (cc_prompt_index, cc_turn_index, counted over the prompts
// before it; a subagent's header carries no turn). A client sends the
// conversation's messages, not CC's transcript: no request-id, and maybe a
// shortened history (only its last turn, a compacted one) from which the
// native count starts again. The Worker remembers both per session thread
// (request-identity.js previousSession); here they go where Claude Code keeps
// them, so CC's own header writes the fields, and what this request used goes
// back to the Worker in the response metadata (kept only for an answered
// request). The memory is used only for the thread it was kept for; a request
// carrying the client's own header is not touched.
import { createHash } from 'node:crypto';
import { previousSession } from './request-identity.js';

const mainThread = 'main';
// The native count's own bound and test (tTt, $3).
const turnBound = 1e7;
const validTurn = turn => Boolean(turn) && Number.isInteger(turn.turnIndex) && Number.isInteger(turn.promptIndex) &&
  turn.turnIndex >= 1 && turn.turnIndex <= turnBound && turn.promptIndex >= 0 && turn.promptIndex <= turn.turnIndex;

// requestThread is the thread a request is built as: the main thread, or the
// subagent's agent ID (undefined when a subagent has none: such a request
// does not use the memory).
export const requestThread = agent => !agent || agent.requestClass === 'main' ? mainThread : agent.agentContext?.agentId;

// promptHash tells a prompt sent again (a retry) from a new one.
export const promptHash = content => createHash('sha256').update(JSON.stringify(content ?? null)).digest('hex');

// sessionTurn is the prompt's position: the native count from the history,
// never behind the remembered turn. A new prompt (the request's last user
// message, and not the remembered prompt again) is one turn past the
// remembered one, and a human's also one prompt past (native vKn); a tool
// result's continuation or a retry stays in the remembered turn. Without a
// remembered turn, or past the native bound, the native count stands.
export function sessionTurn(native, { fresh, hash, human }, previous) {
  const kept = previous?.turn_position;
  if (!kept) return native;
  const remembered = { promptIndex: kept.prompt_index, turnIndex: kept.turn_index };
  const floor = fresh && hash !== previous.prompt_hash
    ? { promptIndex: remembered.promptIndex + (human ? 1 : 0), turnIndex: remembered.turnIndex + 1 } : remembered;
  const turn = validTurn(native)
    ? { promptIndex: Math.max(native.promptIndex, floor.promptIndex), turnIndex: Math.max(native.turnIndex, floor.turnIndex) } : floor;
  return validTurn(turn) ? turn : native;
}

// remembered is the Worker's memory when it is this thread's.
function remembered(thread) {
  const previous = previousSession();
  return previous?.thread === thread ? previous : undefined;
}

// report is what the Worker keeps once the request is answered: the thread,
// and on the main thread the turn the header used with its prompt's hash.
function report(thread, turn, hash) {
  if (thread !== mainThread || !validTurn(turn)) return { thread };
  return { thread, turn_position: { prompt_index: turn.promptIndex, turn_index: turn.turnIndex }, prompt_hash: hash };
}

// continueSession puts the thread's facts on build's records: the remembered
// request-id on the last assistant record (CC's mmr reads it there), and the
// main thread prompt's position on its record (prompt: the last prompt's
// record, ccgatewayMarkTurns; CC's header reads it there). It returns the
// report, or undefined when the request does not use the memory.
export function continueSession(records, prompt, { human, thread }) {
  if (thread === undefined) return undefined;
  const previous = remembered(thread);
  if (previous?.request_id) {
    const last = records.findLast(record => record?.type === 'assistant');
    if (last) last.requestId = previous.request_id;
  }
  if (thread !== mainThread || !prompt) return report(thread);
  const hash = promptHash(prompt.message?.content);
  const fresh = records.findLast(record => record?.type === 'user') === prompt;
  const turn = sessionTurn(prompt.turnPosition, { fresh, hash, human }, previous);
  if (validTurn(turn)) prompt.turnPosition = turn;
  return report(thread, turn, hash);
}

// continueDirectSession is the same for direct, whose header CC builds from
// the values it is handed (request-natives.js directBuild): the request-id
// when the messages hold an assistant message, the main thread prompt's
// position (turn: ccgatewayPromptTurn's), and the report (session).
export function continueDirectSession(messages, turn, { human, thread }) {
  if (thread === undefined) return {};
  const previous = remembered(thread);
  const previousRequestId = previous?.request_id && messages.some(message => message?.role === 'assistant') ? previous.request_id : undefined;
  if (thread !== mainThread || !turn?.turnOrigin) return { previousRequestId, session: report(thread) };
  const hash = promptHash(turn.prompt);
  const turnPosition = sessionTurn(turn.turnPosition, { fresh: turn.fresh, hash, human }, previous);
  return { previousRequestId, turnPosition, session: report(thread, turnPosition, hash) };
}
