// The one-shot web search process of a passthrough request: run Claude Code's
// WebSearch once with the Worker's input, report the output and the text the
// model reads, and end the turn before any model request of its own.
export function register(on) {
  let done = false;
  on('turn.step', async function* ($, e, next) {
    if (!done) {
      done = true;
      const url = await $.env.get('CCGATEWAY_MOD_URL');
      const token = await $.env.get('CCGATEWAY_MOD_TOKEN');
      const input = JSON.parse(await $.env.get('CCGATEWAY_SEARCH_INPUT'));
      let answer;
      try {
        const call = await $.tool.call({ tool: 'WebSearch', query: input.query, allowed_domains: input.allowed_domains, blocked_domains: input.blocked_domains });
        answer = call.deny ? { error: call.deny } : call.isError ? { error: call.text || 'error' } : { result: call.result, text: call.text };
      } catch (error) {
        answer = { error: String(error?.message || error) };
      }
      await $.http.fetch(url, { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'content-type': 'application/json' }, body: JSON.stringify({ event: 'search_result', detail: answer }) });
    }
    await $.turn.abort({ turnId: e.turnId });
    return { turnId: e.turnId, index: e.index, answer: '', toolUses: [], stopReason: null, usage: null };
  });
}
