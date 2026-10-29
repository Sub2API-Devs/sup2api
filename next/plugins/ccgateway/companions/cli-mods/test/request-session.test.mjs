import test from 'node:test';
import assert from 'node:assert/strict';
import { requestSessionID, previousSession } from '../request-identity.js';
import { sessionTurn, continueSession, continueDirectSession, requestThread, promptHash } from '../request-session.js';

const session = '12345678-1234-4123-8123-123456789012';
const identity = previous => ({ version: 2, mode: 'replace', rewrite: true, session_id: session, carrier: 'json', ...previous !== undefined && { previous } });
async function context(value, run) {
  const old = process.env.CCG_REQUEST_IDENTITY;
  if (value === undefined) delete process.env.CCG_REQUEST_IDENTITY;
  else process.env.CCG_REQUEST_IDENTITY = JSON.stringify(value);
  try { return await run(); }
  finally { if (old === undefined) delete process.env.CCG_REQUEST_IDENTITY; else process.env.CCG_REQUEST_IDENTITY = old; }
}
const turn = (promptIndex, turnIndex) => ({ promptIndex, turnIndex });
const kept = (prompt, turnIndex, text = 'earlier') => ({ thread: 'main', request_id: 'req_previous01', turn_position: { prompt_index: prompt, turn_index: turnIndex }, prompt_hash: promptHash(text) });
const prompt = text => ({ type: 'user', message: { role: 'user', content: text } });
const assistant = () => ({ type: 'assistant', message: { role: 'assistant', content: 'ok' } });
const toolResult = () => ({ type: 'user', message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: 't', content: 'x' }] } });

test('the Worker context may carry what it remembers of the session thread', async () => {
  await context(identity(kept(0, 2)), () => assert.deepEqual(previousSession(), kept(0, 2)));
  await context(identity({ thread: 'agent-1', request_id: 'req_sub' }), () => assert.equal(previousSession().thread, 'agent-1'));
  for (const invalid of [
    { request_id: 'req_x' },                                      // no thread
    { thread: 'main', request_id: 'not-a-request-id' },
    { thread: 'main', request_id: 'req_' + 'x'.repeat(37) },
    { thread: 'main', turn_position: { prompt_index: 0, turn_index: 1 } },          // turn without its hash
    { thread: 'main', turn_position: { prompt_index: 2, turn_index: 1 }, prompt_hash: promptHash('a') },
    { thread: 'main', turn_position: { prompt_index: 0, turn_index: 1e7 + 1 }, prompt_hash: promptHash('a') },
    { thread: 'agent-1', turn_position: { prompt_index: 0, turn_index: 1 }, prompt_hash: promptHash('a') }, // a subagent has no turn
    { thread: 'main', extra: true },
  ]) await context(identity(invalid), () => assert.throws(() => requestSessionID(), /Invalid Worker request identity/, JSON.stringify(invalid)));
  // The memory is a session's: without one there is nothing to continue.
  const { session_id: _s, ...sessionless } = identity(kept(0, 1));
  await context(sessionless, () => assert.throws(() => requestSessionID(), /Invalid Worker request identity/));
});

test('the turn follows the native count and never goes behind the remembered one', () => {
  const previous = kept(0, 3, 'third');
  // Nothing remembered: the native count from the history stands.
  assert.deepEqual(sessionTurn(turn(0, 4), { fresh: true, hash: promptHash('fourth'), human: false }, undefined), turn(0, 4));
  // A full history: the native count already agrees.
  assert.deepEqual(sessionTurn(turn(0, 4), { fresh: true, hash: promptHash('fourth'), human: false }, previous), turn(0, 4));
  // A shortened history (only the last turn): one turn past the remembered.
  assert.deepEqual(sessionTurn(turn(0, 1), { fresh: true, hash: promptHash('fourth'), human: false }, previous), turn(0, 4));
  // A human's prompt is also one prompt past (native vKn).
  assert.deepEqual(sessionTurn(turn(0, 1), { fresh: true, hash: promptHash('fourth'), human: true }, kept(2, 3, 'third')), turn(3, 4));
  // A tool result's continuation and a retry of the remembered prompt stay in its turn.
  assert.deepEqual(sessionTurn(turn(0, 1), { fresh: false, hash: promptHash('third'), human: false }, previous), turn(0, 3));
  assert.deepEqual(sessionTurn(turn(0, 1), { fresh: true, hash: promptHash('third'), human: false }, previous), turn(0, 3));
  // A history ahead of the memory (another Worker answered meanwhile) wins.
  assert.deepEqual(sessionTurn(turn(0, 9), { fresh: true, hash: promptHash('ninth'), human: false }, previous), turn(0, 9));
  // No native count (a compacted history): the remembered turn still counts.
  assert.deepEqual(sessionTurn(undefined, { fresh: true, hash: promptHash('fourth'), human: false }, previous), turn(0, 4));
  // Past the native bound the native count stands.
  assert.deepEqual(sessionTurn(turn(0, 1), { fresh: true, hash: promptHash('next'), human: false }, kept(0, 1e7)), turn(0, 1));
});

test('build puts the request-id and the turn where Claude Code reads them', async () => {
  await context(identity(kept(0, 3, 'third')), () => {
    const records = [prompt('third'), assistant(), toolResult(), assistant(), prompt('fourth')];
    records[4].turnPosition = turn(0, 1);  // the native count of a shortened history
    const report = continueSession(records, records[4], { human: false, thread: 'main' });
    assert.equal(records[3].requestId, 'req_previous01', 'the last assistant record');
    assert.equal(records[1].requestId, undefined);
    assert.deepEqual(records[4].turnPosition, turn(0, 4));
    assert.deepEqual(report, { thread: 'main', turn_position: { prompt_index: 0, turn_index: 4 }, prompt_hash: promptHash('fourth') });
  });
  // A tool loop's next request keeps the prompt's turn.
  await context(identity(kept(0, 4, 'fourth')), () => {
    const records = [prompt('fourth'), assistant(), toolResult()];
    records[0].turnPosition = turn(0, 1);
    const report = continueSession(records, records[0], { human: false, thread: 'main' });
    assert.deepEqual(records[0].turnPosition, turn(0, 4));
    assert.equal(records[1].requestId, 'req_previous01');
    assert.deepEqual(report.turn_position, { prompt_index: 0, turn_index: 4 });
  });
  // A session's first request: nothing to name, the native count is reported.
  await context(identity(), () => {
    const records = [prompt('first')];
    records[0].turnPosition = turn(0, 1);
    assert.deepEqual(continueSession(records, records[0], { human: false, thread: 'main' }), { thread: 'main', turn_position: { prompt_index: 0, turn_index: 1 }, prompt_hash: promptHash('first') });
    assert.equal(records[0].requestId, undefined);
  });
  // A history without a prompt: the request-id still goes, no turn is reported.
  await context(identity(kept(0, 2)), () => {
    const records = [assistant(), toolResult()];
    assert.deepEqual(continueSession(records, undefined, { human: false, thread: 'main' }), { thread: 'main' });
    assert.equal(records[0].requestId, 'req_previous01');
  });
});

test('the memory is used only for the thread it was kept for', async () => {
  // A subagent's thread: its own request-id, and no turn (its header has none).
  await context(identity({ thread: 'agent-1', request_id: 'req_subagent01' }), () => {
    const records = [prompt('task'), assistant(), toolResult()];
    assert.deepEqual(continueSession(records, undefined, { human: false, thread: 'agent-1' }), { thread: 'agent-1' });
    assert.equal(records[1].requestId, 'req_subagent01');
    // The same memory is not another thread's.
    const other = [prompt('task'), assistant()];
    assert.deepEqual(continueSession(other, other[0], { human: false, thread: 'main' }).thread, 'main');
    assert.equal(other[1].requestId, undefined);
  });
  // A subagent whose agent ID is unknown does not use the memory at all.
  await context(identity(kept(0, 2)), () => {
    const records = [prompt('task'), assistant()];
    assert.equal(continueSession(records, records[0], { human: false, thread: undefined }), undefined);
    assert.equal(records[1].requestId, undefined);
  });
  assert.equal(requestThread(undefined), 'main');
  assert.equal(requestThread({ requestClass: 'main' }), 'main');
  assert.equal(requestThread({ requestClass: 'subagent', agentContext: { agentId: 'agent-1' } }), 'agent-1');
  assert.equal(requestThread({ requestClass: 'subagent', agentContext: {} }), undefined);
});

test('direct hands Claude Code the request-id and the turn', async () => {
  const messages = [{ role: 'user', content: 'third' }, { role: 'assistant', content: 'ok' }, { role: 'user', content: 'fourth' }];
  await context(identity(kept(0, 3, 'third')), () => {
    const continued = continueDirectSession(messages, { turnOrigin: 'sdk', turnPosition: turn(0, 2), prompt: 'fourth', fresh: true }, { human: false, thread: 'main' });
    assert.deepEqual(continued, { previousRequestId: 'req_previous01', turnPosition: turn(0, 4), session: { thread: 'main', turn_position: { prompt_index: 0, turn_index: 4 }, prompt_hash: promptHash('fourth') } });
    // Without an assistant message there is no previous request to name.
    assert.equal(continueDirectSession(messages.slice(0, 1), { turnOrigin: 'sdk', turnPosition: turn(0, 1), prompt: 'third', fresh: true }, { human: false, thread: 'main' }).previousRequestId, undefined);
  });
  await context(identity({ thread: 'agent-1', request_id: 'req_subagent01' }), () => {
    assert.deepEqual(continueDirectSession(messages, undefined, { human: false, thread: 'agent-1' }), { previousRequestId: 'req_subagent01', session: { thread: 'agent-1' } });
  });
});
