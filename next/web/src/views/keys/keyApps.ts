import { ccSwitchLink, clientsFor, trimBase, usageURL } from './keyClients'

// Desktop apps a key can be set up in with one link: CC Switch (one import
// per client of the key's platforms) and Magpie (one provider carrying every
// endpoint the key reaches, with its balance read from GET /v1/usage).

/** One quick setup of a key: the app (and client) and its import link. */
export interface KeyApp {
  id: string
  /** The app's name, as its import button and the "did not open" hint say it. */
  app: string
  label: string
  /** The client the import sets up; absent when it carries every platform of the key. */
  client?: string
  link(base: string, name: string, key: string): string
}

/** Magpie's base-URL parameters of each platform (https://usemagpie.ai/docs/import). */
const MAGPIE_ENDPOINTS: Record<string, (base: string) => Record<string, string>> = {
  anthropic: base => ({ anthropic: base }),
  openai: base => ({ chat: `${base}/v1`, responses: `${base}/v1` }),
  gemini: base => ({ gemini: `${base}/v1beta` })
}

const magpieEndpoints = (platforms: readonly string[] | null | undefined) =>
  Object.entries(MAGPIE_ENDPOINTS)
    .filter(([platform]) => platforms?.includes(platform))
    .map(([, endpoints]) => endpoints)

/**
 * What Magpie's provider editor takes for a key reaching platforms, by its
 * import parameter: the key, the endpoints of the protocols the platforms
 * speak (in MAGPIE_ENDPOINTS order) and where the balance is read.
 */
export function magpieFields(platforms: readonly string[] | null | undefined, base: string, key: string): Record<string, string> {
  const root = trimBase(base)
  const endpoints = magpieEndpoints(platforms).map(endpointsAt => endpointsAt(root))
  return Object.assign({ key }, ...endpoints, { balance: usageURL(root), balance_path: 'remaining' })
}

/**
 * The Magpie import link of a key reaching platforms; nothing is saved until
 * the user presses Add. It names no models: Magpie asks the gateway for them.
 */
export function magpieLink(platforms: readonly string[] | null | undefined, base: string, name: string, key: string): string {
  const q = new URLSearchParams({ name, ...magpieFields(platforms, base, key), website: trimBase(base) })
  // A space as %20, the way Magpie's own links spell it, not URLSearchParams' "+".
  return `magpie://import?${q.toString().replace(/\+/g, '%20')}`
}

/** The quick setups of a key reaching platforms, CC Switch's first. */
export function keyAppsFor(platforms: readonly string[] | null | undefined): KeyApp[] {
  const apps: KeyApp[] = clientsFor(platforms).map(c => ({
    id: `ccswitch:${c.id}`,
    app: 'CC Switch',
    label: `CC Switch · ${c.label}`,
    client: c.id,
    link: (base, name, key) => ccSwitchLink(c, base, name, key)
  }))
  if (magpieEndpoints(platforms).length)
    apps.push({ id: 'magpie', app: 'Magpie', label: 'Magpie', link: (base, name, key) => magpieLink(platforms, base, name, key) })
  return apps
}
