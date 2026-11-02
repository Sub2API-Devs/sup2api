// The tools build injects on a session's first turn, compared with the tools
// array an unmodified official Claude Code sends on its own first turn
// (fixtures/official-request-<version>.json, e2e/capture-official.sh: one
// print-mode request). Injecting a tool carries only its definition
// (2026-11-02); each must be the official one byte for byte, in the official
// order, with what the official request pairs with it (the deferred tool
// placeholder after ToolSearch). The only allowed difference is one that
// depends on how the session was launched, not on the tool: Bash's background
// timeout default, which Claude Code takes as 600000 ms in a single-shot print
// session (claude -p, the capture) and from its own default (1800000 ms) in
// every other session, the request command's included (chunk-fym4r1th.js Znr:
// singleShotPrintSession). Anything else fails.
const sessionDependent = [
  { tool: 'Bash', official: '(default 600000ms / 10 minutes,', injected: '(default 1800000ms / 30 minutes,' },
  { tool: 'Bash', official: '(default 600000 ms,', injected: '(default 1800000 ms,' },
];

// compareInjectedTools returns the differences between the injected tools and
// the official ones of the same names (and the placeholder), [] when equal.
function compareInjectedTools(official, injected, names) {
  const problems = [];
  const chosen = new Set(names);
  // The official tools the injection must reproduce: the chosen names, and
  // the placeholder where ToolSearch is among them.
  const expected = official.filter(tool => chosen.has(tool.name) || tool.name === 'DeferredToolPlaceholder' && chosen.has('ToolSearch'));
  const order = list => list.map(tool => tool.name).join(',');
  if (order(expected) !== order(injected)) problems.push(`order: official ${order(expected)}, injected ${order(injected)}`);
  for (const tool of expected) {
    const ours = injected.find(item => item.name === tool.name);
    if (!ours) { problems.push(`${tool.name}: missing`); continue; }
    let text = JSON.stringify(ours);
    for (const allowed of sessionDependent.filter(item => item.tool === tool.name)) text = text.split(allowed.injected).join(allowed.official);
    if (text !== JSON.stringify(tool)) {
      const a = JSON.stringify(tool); let at = 0;
      while (at < a.length && a[at] === text[at]) at++;
      problems.push(`${tool.name}: differs at ${at}: official ${JSON.stringify(a.slice(Math.max(0, at - 40), at + 80))}, injected ${JSON.stringify(text.slice(Math.max(0, at - 40), at + 80))}`);
    }
  }
  return problems;
}

module.exports = { compareInjectedTools, sessionDependent };
