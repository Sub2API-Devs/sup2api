// Scopes as text (CONTRACTS §21): ids by name through the lookup, a deleted
// one as "#12 (deleted)"; a role's scopes as one summary line.
import { useI18n } from 'vue-i18n'
import { useEntityNames } from '@/components/entity/lookup'
import type { EntityKind } from '@/components/entity/entities'
import { SCOPABLE, parsePermission, scopeSuffix, type Scope } from '@/authz/implies'

export function useScopeLabels() {
  const { t } = useI18n()
  const names = useEntityNames()

  /** "name #id", "#id (deleted)" once the lookup knows no such row. */
  function rowLabel(kind: EntityKind, id: number): string {
    const text = names.label(kind, id)
    return names.gone(kind, id) ? t('roles.scope.deleted', { label: text }) : text
  }

  /** One scope of action, short. */
  function scopeLabel(action: string, s: Scope): string {
    const row = SCOPABLE[action]
    if (s.all) return t('roles.scope.all')
    if (s.own) return t('roles.scope.own')
    if (s.group > 0 && s.id) return `${rowLabel('group', s.group)} / ${rowLabel(row, s.id)}`
    if (s.group > 0) return rowLabel('group', s.group)
    if (s.id && !s.group) return rowLabel(row, s.id)
    return scopeSuffix(action, s)
  }

  /** The narrower-than-every-row scopes among keys, per action ("Accounts · Edit: own, cc-low #12"); '' without any. */
  function summary(keys: readonly string[]): string {
    const byAction = new Map<string, string[]>()
    for (const k of keys) {
      const p = parsePermission(k)
      if (!p || p.scope.all || !SCOPABLE[p.action]) continue
      byAction.set(p.action, [...(byAction.get(p.action) ?? []), scopeLabel(p.action, p.scope)])
    }
    return [...byAction]
      .map(([action, scopes]) => {
        const [resource, ...verb] = action.split(':')
        const name = `${t(`roles.scope.resources.${resource}`)} · ${t(`roles.scope.actions.${verb.at(-1)}`)}`
        return t('roles.scope.summary', { action: name, scopes: scopes.join(t('roles.listSep')) })
      })
      .join('; ')
  }

  return { rowLabel, scopeLabel, summary }
}
