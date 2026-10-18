const fs = require('node:fs');
const [log, scenario] = process.argv.slice(2);
const event = JSON.parse(fs.readFileSync(0, 'utf8'));
fs.appendFileSync(log, JSON.stringify({ event: event.hook_event_name, tool: event.tool_name, input: event.tool_input, response: event.tool_response, error: event.error }) + '\n');
if (scenario === 'hooks-deny' && event.hook_event_name === 'PreToolUse') {
  process.stderr.write('HOOK_EXPLICIT_DENY');
  process.exit(2);
}
if (scenario === 'hooks-update' && event.hook_event_name === 'PreToolUse') {
  console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', updatedInput: { ...event.tool_input, script: 'FROM_PREHOOK' } } }));
}
if (scenario === 'hooks-update' && event.hook_event_name === 'PostToolUse') {
  console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PostToolUse', updatedToolOutput: { marker: 'POST_REWRITTEN', name: event.tool_name, original: event.tool_response } } }));
}
