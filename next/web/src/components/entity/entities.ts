// The entities the console picks by name (EntityPicker, GET /lookup/{kind}).
// Each is one description: where it is looked up, how it shows, who may look
// it up. A new entity is a new entry here; the picker does not change.

export type EntityKind = 'user' | 'group' | 'api_key' | 'account' | 'model' | 'proxy'

export interface EntityDescriptor {
  /** The {kind} of GET /lookup/{kind}. */
  path: string
  /** SIcon name. */
  icon: string
  /** i18n key of the entity's name (placeholder, "No matching …"). */
  label: string
  /** False when the id is the name itself (models): no "#id" and nothing to look up by id. */
  numeric: boolean
  /** Any one of these lets the caller look the entity up; none = every signed-in user. */
  permissions: string[]
  /** The same for a `mine` lookup; left out where `mine` asks nothing less. */
  minePermissions?: string[]
  /**
   * Lookup parameters that name another entity, with the i18n key ({name})
   * of the line that tells the user what the parameter did to the list.
   */
  scopes?: Record<string, { kind: EntityKind; note: string }>
}

const OWN_OR_ALL = (resource: string) => [`${resource}:read`, `${resource}:own:read`]

export const ENTITIES: Record<EntityKind, EntityDescriptor> = {
  user: { path: 'users', icon: 'user', label: 'entity.kind.user', numeric: true, permissions: ['user:read'] },
  group: { path: 'groups', icon: 'group', label: 'entity.kind.group', numeric: true, permissions: ['group:read'], minePermissions: [] },
  api_key: {
    path: 'api-keys',
    icon: 'key',
    label: 'entity.kind.api_key',
    numeric: true,
    // The usage records already show every key's id, name and owner to this permission.
    permissions: ['usage:all:read'],
    minePermissions: ['apikey:self:manage'],
    scopes: { user_id: { kind: 'user', note: 'entity.scope.userKeys' } }
  },
  account: {
    path: 'accounts',
    icon: 'account',
    label: 'entity.kind.account',
    numeric: true,
    permissions: OWN_OR_ALL('account'),
    scopes: { prefer_group_id: { kind: 'group', note: 'entity.scope.groupAccountsFirst' } }
  },
  model: { path: 'models', icon: 'cpu', label: 'entity.kind.model', numeric: false, permissions: ['price:read'], minePermissions: ['apikey:self:manage'] },
  proxy: { path: 'proxies', icon: 'proxy', label: 'entity.kind.proxy', numeric: true, permissions: OWN_OR_ALL('proxy') }
}

/**
 * An id of a numeric kind as the lookup takes one (typed as q, or in ids=): a
 * positive integer. "0" and "007" are not: typed, they are text, and their
 * name is never asked for (the core refuses a request that carries one).
 */
export const isEntityId = (v: string): boolean => /^[1-9]\d*$/.test(v)

/** The permissions of which one lets a caller look `kind` up (`mine`: only its own rows). */
export function lookupPermissions(kind: EntityKind, mine = false): string[] {
  const entity = ENTITIES[kind]
  return (mine && entity.minePermissions) || entity.permissions
}
