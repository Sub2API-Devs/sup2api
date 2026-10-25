// Clients a key can be used from, per platform it reaches: how to configure
// each one (files or environment variables, per shell) and its CC Switch
// import. Only the gateway's own address and the key go into the snippets.

export type Shell = 'unix' | 'powershell' | 'cmd'
export const SHELLS: Shell[] = ['unix', 'powershell', 'cmd']

/** One thing to put in place: a file (path) or commands to run (no path). */
export interface Snippet {
  path?: string
  content: string
}

export interface KeyClient {
  id: string
  label: string
  /** The platform whose endpoints the client calls. */
  platform: string
  /** Whether the snippets depend on the shell. */
  perShell: boolean
  snippets(base: string, key: string, shell: Shell): Snippet[]
  /** CC Switch app and endpoint (ccswitch://v1/import). */
  ccSwitch: { app: string; endpoint(base: string): string }
}

const v1 = (base: string) => `${base}/v1`

function envLines(vars: Record<string, string>, shell: Shell): string {
  return Object.entries(vars)
    .map(([k, v]) => (shell === 'unix' ? `export ${k}="${v}"` : shell === 'powershell' ? `$env:${k}="${v}"` : `set ${k}=${v}`))
    .join('\n')
}

const home = (shell: Shell, dir: string) => (shell === 'unix' ? `~/${dir}` : `%USERPROFILE%\\${dir}`)
const join = (shell: Shell, dir: string, file: string) => `${home(shell, dir)}${shell === 'unix' ? '/' : '\\'}${file}`

const claudeEnv = (base: string, key: string) => ({ ANTHROPIC_BASE_URL: base, ANTHROPIC_AUTH_TOKEN: key })

export const CLIENTS: KeyClient[] = [
  {
    id: 'claude',
    label: 'Claude Code',
    platform: 'anthropic',
    perShell: true,
    snippets: (base, key, shell) => [
      { content: envLines(claudeEnv(base, key), shell) },
      { path: join(shell, '.claude', 'settings.json'), content: JSON.stringify({ env: claudeEnv(base, key) }, null, 2) }
    ],
    ccSwitch: { app: 'claude', endpoint: (base) => base }
  },
  {
    id: 'codex',
    label: 'Codex CLI',
    platform: 'openai',
    perShell: true,
    snippets: (base, key, shell) => [
      {
        path: join(shell, '.codex', 'config.toml'),
        content: `model_provider = "sub2api"

[model_providers.sub2api]
name = "sub2api"
base_url = "${v1(base)}"
wire_api = "responses"
requires_openai_auth = true`
      },
      { path: join(shell, '.codex', 'auth.json'), content: JSON.stringify({ OPENAI_API_KEY: key }, null, 2) }
    ],
    ccSwitch: { app: 'codex', endpoint: v1 }
  },
  {
    id: 'gemini',
    label: 'Gemini CLI',
    platform: 'gemini',
    perShell: true,
    snippets: (base, key, shell) => [{ content: envLines({ GOOGLE_GEMINI_BASE_URL: base, GEMINI_API_KEY: key }, shell) }],
    ccSwitch: { app: 'gemini', endpoint: (base) => base }
  }
]

/** The clients of the platforms a key reaches, in CLIENTS order. */
export const clientsFor = (platforms: readonly string[] | null | undefined) => CLIENTS.filter((c) => platforms?.includes(c.platform))

/** The CC Switch deep link importing the key as a provider of the client. */
export function ccSwitchLink(client: KeyClient, base: string, name: string, key: string): string {
  const q = new URLSearchParams({
    resource: 'provider',
    app: client.ccSwitch.app,
    name,
    homepage: base,
    endpoint: client.ccSwitch.endpoint(base),
    apiKey: key,
    configFormat: 'json'
  })
  return `ccswitch://v1/import?${q}`
}

/** The gateway's address as clients call it: this console's origin. */
export const gatewayBase = () => window.location.origin
