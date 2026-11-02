// Assigns every reconstructed first-party module to a documentation/naming
// domain (one domain = one phase-2 team member), by path prefix.
//   node tools/segment/domains.mjs [analysis]
// Output: analysis/segments/domains.json {domain: {modules: [...], bytes, decls}}
import fs from 'node:fs';
import path from 'node:path';

const A = process.argv[2] ?? 'analysis';
const mods = JSON.parse(fs.readFileSync(path.join(A, 'segments/modules.json'), 'utf8'));
export const DOMAINS = [
  ['bootstrap', /^(entrypoints\/(?!sdk)|main\.tsx|setup\.ts|cli\/|bootstrap\/|replLauncher|dialogLaunchers|interactiveHelpers|projectOnboarding|migrations\/|upstreamproxy\/|utils\/(startup|nativeInstaller|autoUpdater|doctor|localInstaller|cleanup|process|gracefulShutdown|cliArgs|earlyInput|warningHandler))/],
  ['query', /^(query\.ts|QueryEngine|query\/|services\/(api|compact|tokenEstimation|claudeAiLimits|rateLimit|mockRateLimits|PromptSuggestion|AgentSummary|toolUseSummary|awaySummary|vcr)|context\.ts|context\/|constants\/|utils\/(messages|tokens|model|api|context|queryHelpers|thinking|effort|fastMode|systemPrompt|attachments|sideQuestion|modelCost|betas|advisor|promptCategory|userPromptKeywords|toolResultStorage|contentArray|messageQueueManager|queryProfiler|conversationRecovery|cost|stream))|cost-tracker|costHook/],
  ['tools', /^(Tool\.ts|tools\.ts|tools\/|services\/tools|utils\/(toolSearch|toolPool|file|fileRead|readFile|fileHistory|diff|glob|ripgrep|notebook|imageResizer|pdf|webFetch|todo|tasks\.ts|filePersistence|treeify|truncate|codeIndexing))/],
  ['permissions', /^(types\/permissions|utils\/(permissions|sandbox|bash|shell|powershell|Shell|execFileNoThrow|execSyncWrapper|promptShellExecution|classifierApprovals|autoMode|yoloClassifier|secureStorage))/],
  ['extensions', /^(services\/(mcp|plugins|lsp|oauth\/mcp|mcpServerApproval)|plugins\/|skills\/|outputStyles\/|utils\/(plugins|skills|hooks|mcp|claudeInChrome|computerUse|deepLink|frontmatter|markdownConfigLoader|lsp|dxt))|schemas\//],
  ['ui', /^(ink\/|ink\.ts|components\/|screens\/|hooks\/|keybindings\/|vim\/|native-ts\/|outputStyles|utils\/(theme|terminal|ansi|render|format|highlight|cliHighlight|markdown|fullscreen|log\.ts|stringWidth|sliceAnsi|textHighlighting|hyperlink|statusNotice|treeify|fpsTracker|terminalPanel|editor|clipboard|imagePaste|asciicast|figures|keyboardShortcuts))/],
  ['state', /^(state\/|history\.ts|memdir\/|services\/(SessionMemory|extractMemories|teamMemorySync|analytics|oauth|settingsSync|remoteManagedSettings|policyLimits|diagnosticTracking|internalLogging|notifier|preventSleep|autoDream|MagicDocs|tips)|utils\/(settings|config|sessionStorage|session|auth|telemetry|secureStorage|env|envUtils|cwd|git|github|gitDiff|worktree|cache|memoize|errors|debug|log|json|path|platform|fsOperations|lockfile|signal|sleep|uuid|hash|crypto|http|proxy|mtls|user|billing|privacyLevel|managedEnv|undercover|commitAttribution|teleport|preflight|heapdump|perf|startupProfiler))/],
  ['agents', /^(coordinator\/|tasks\/|Task\.ts|tasks\.ts|assistant\/|bridge\/|remote\/|server\/|buddy\/|voice\/|moreright\/|entrypoints\/sdk|utils\/(swarm|teammate|agent|forkedAgent|standaloneAgent|background|sessionIngress|ultraplan|remote|bridge|cron|scheduled|inProcessTeammate)|services\/(voice|remote|bridge))/],
  ['commands', /^(commands\.ts|commands\/)/],
];
export function domainOf(p) {
  for (const [d, re] of DOMAINS) if (re.test(p)) return d;
  return p.startsWith('services/') ? 'state' : p.startsWith('utils/') ? 'state' : 'misc';
}
if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}` || process.argv[1]?.endsWith('domains.mjs')) {
  const out = {};
  for (const [p, m] of Object.entries(mods)) {
    if (m.kind !== 'first-party') continue;
    const d = domainOf(p);
    const o = (out[d] ??= { modules: [], bytes: 0, decls: 0 });
    o.modules.push(p);
    o.bytes += m.bytes;
    o.decls += m.decls.length;
  }
  for (const o of Object.values(out)) o.modules.sort();
  fs.writeFileSync(path.join(A, 'segments/domains.json'), JSON.stringify(out, null, 1));
  console.log(Object.fromEntries(Object.entries(out).map(([d, o]) => [d, `${o.modules.length} modules, ${(o.bytes / 1e6).toFixed(2)} MB, ${o.decls} decls`])));
  console.log('misc sample:', out.misc?.modules.slice(0, 40).join(' '));
}
