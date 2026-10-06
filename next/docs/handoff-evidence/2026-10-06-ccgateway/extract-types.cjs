#!/usr/bin/env node
// Extract $.tool.register signature from the generated type definition.
const fs = require('fs');
const path = require('path');

const root = fs.mkdtempSync('/work/types-probe-');
const plugin = path.join(root, 'plugin');
fs.mkdirSync(plugin + '/.claude-plugin', { recursive: true });
fs.mkdirSync(plugin + '/hooks');
fs.writeFileSync(plugin + '/.claude-plugin/plugin.json', JSON.stringify({ name: 'types-probe', version: '1.0.0', description: 'types probe' }));
fs.writeFileSync(plugin + '/hooks/hooks.json', JSON.stringify({ modules: ['./noop.js'] }));
fs.writeFileSync(plugin + '/hooks/noop.js', 'export function register(on) {}');

const { spawnSync } = require('child_process');
const result = spawnSync('/usr/local/bin/claude', ['-p', '--plugin-dir', plugin, '--help'], { cwd: root, encoding: 'utf8', timeout: 30000 });

const typesFile = path.join(plugin, '.claude-plugin/types/claude-code/index.d.ts');
if (!fs.existsSync(typesFile)) {
  console.error('Type definition not generated. stderr:', result.stderr.slice(0, 500));
  process.exit(1);
}

const content = fs.readFileSync(typesFile, 'utf8');
const lines = content.split('\n');

// Find $.tool.register
let registerStart = -1, registerEnd = -1;
for (let i = 0; i < lines.length; i++) {
  if (/^\s*(readonly\s+)?register\s*:\s*\(/.test(lines[i])) {
    registerStart = i;
    let depth = 0, foundOpen = false;
    for (let j = i; j < lines.length; j++) {
      for (const c of lines[j]) {
        if (c === '(') { depth++; foundOpen = true; }
        else if (c === ')') { depth--; if (foundOpen && depth === 0) { registerEnd = j; break; } }
      }
      if (registerEnd >= 0) break;
    }
    break;
  }
}

function extract(label, pattern, maxLines = 200) {
  const idx = lines.findIndex(l => pattern.test(l));
  if (idx < 0) return null;
  return lines.slice(idx, Math.min(idx + maxLines, lines.length)).join('\n').slice(0, 3000);
}

const out = {
  register: registerStart >= 0 ? lines.slice(registerStart, registerEnd + 1).join('\n') : null,
  toolList: extract('tool.list', /^\s*(readonly\s+)?list\s*:\s*\(/),
  toolDescribe: extract('tool.describe event', /interface\s+ToolDescribeEvent/),
  toolCall: extract('tool.call event', /interface\s+ToolCallEvent/),
  sessionStart: extract('session.start', /interface\s+SessionStartEvent/),
  promptCompose: extract('prompt.compose', /interface\s+PromptComposeEvent/),
  hooksClosureNote: lines.filter(l => /close.*over|self-contained/i.test(l)).slice(0, 5),
};

console.log(JSON.stringify(out, null, 2));
fs.rmSync(root, { recursive: true, force: true });
