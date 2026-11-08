<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { SBadge, SLink, useViewport, type Tone } from '@sub2api/ui'
import { useCatalog } from './catalog'
import { configRoute, dashboardRoute, loadAccountWeight, shortTime, useDwHost, weightOf, weightTone, type AccountWeight } from './host'

// account.list.weight slot, under the weight in the account list: "▼ N"
// while the account has degraded keys (N = the lowest effective weight),
// "▲ N" when every key below its base climbs, "Stats only" when its
// override turns adjusting off. Hovering or focusing the badge opens a card
// of the lowest keys with links to all of them, their events and the
// override; on touch screens a tap toggles it (focus would open it first).
// STooltip lets no pointer in, so the card is our own teleported panel; as
// it sits at the end of <body>, Enter or ArrowDown on the badge moves focus
// into it, and Tab past its ends or Escape brings focus back and closes it.
// The list keeps a row's instance across its reloads, so a new row object
// reloads too.
const props = defineProps<{ account: { id: number; name?: string; weight?: number } }>()
const host = useDwHost()
const t = host.t
const catalog = useCatalog()
const { touch } = useViewport()
const weight = ref<AccountWeight | null>(null)

async function load() {
  const id = props.account?.id
  const w = id ? await loadAccountWeight(id) : null
  if (props.account?.id === id) weight.value = w // the row may show another account by now
}

watch(() => [props.account, props.account?.weight], load, { immediate: true })

const keys = computed(() => weight.value?.keys ?? [])
/** The bare group name (the catalog's label adds "#id"): the card is tight. */
const groupName = (id: number) => catalog.state.groups.find((g) => g.id === id)?.name ?? `#${id}`
const badge = computed<{ tone: Tone; text: string; label: string } | null>(() => {
  const w = weight.value
  if (!w) return null
  if (w.adjust_off) return { tone: 'gray', text: t('acct.badge.statsOnly'), label: t('acct.badge.statsOnlyAria') }
  const params = { w: w.lowest, base: w.base, n: w.degraded }
  // ▲ only when every key below its base is listed and climbing (a plugin before 0.5.1 sends no state).
  if (keys.value.length === w.degraded && keys.value.every((k) => k.state === 'climbing')) {
    return { tone: 'success', text: `▲ ${w.lowest}`, label: t('acct.badge.climbingAria', params) }
  }
  return { tone: weightTone(w.lowest, w.base), text: `▼ ${w.lowest}`, label: t('acct.badge.degradingAria', params) }
})

// ---- the card: opened after a short hover, kept while the pointer is on
// the badge or the card, closed on leave, Escape, scroll or a tap elsewhere.
const anchor = ref<HTMLElement>()
const card = ref<HTMLElement>()
const open = ref(false)
const pos = ref({ top: 0, left: 0 })
let timer: ReturnType<typeof setTimeout> | undefined
let returning = false // focus is being put back on the badge: do not reopen

function later(fn: () => void, ms: number) {
  clearTimeout(timer)
  timer = setTimeout(fn, ms)
}

async function show() {
  clearTimeout(timer)
  if (open.value) return
  open.value = true
  window.addEventListener('scroll', hide, true)
  window.addEventListener('resize', hide)
  document.addEventListener('pointerdown', onOutside, true)
  await nextTick()
  const a = anchor.value?.getBoundingClientRect()
  const c = card.value
  if (!a || !c) return
  // Below the badge, above when there is no room; from its left edge, or
  // ending at its right edge when that runs off the screen; always inside it.
  const m = 8
  const { offsetWidth: w, offsetHeight: h } = c
  const below = a.bottom + 4 + h <= window.innerHeight - m || a.top - 4 - h < m
  const left = a.left + w <= window.innerWidth - m ? a.left : a.right - w
  pos.value = { top: below ? a.bottom + 4 : a.top - 4 - h, left: Math.min(Math.max(m, left), Math.max(m, window.innerWidth - w - m)) }
}

function hide() {
  clearTimeout(timer)
  open.value = false
  window.removeEventListener('scroll', hide, true)
  window.removeEventListener('resize', hide)
  document.removeEventListener('pointerdown', onOutside, true)
}

function onOutside(e: PointerEvent) {
  const target = e.target as Node
  if (!anchor.value?.contains(target) && !card.value?.contains(target)) hide()
}

const cardLinks = () => [...(card.value?.querySelectorAll<HTMLElement>('a[href]') ?? [])]

async function intoCard(e: KeyboardEvent) {
  e.preventDefault()
  await show()
  cardLinks()[0]?.focus()
}

function backToBadge() {
  hide()
  returning = true
  anchor.value?.querySelector<HTMLElement>('a[href]')?.focus()
  returning = false
}

// Tab past the first or last link of the card goes back to the badge.
function onCardTab(e: KeyboardEvent) {
  const links = cardLinks()
  if (document.activeElement !== (e.shiftKey ? links[0] : links.at(-1))) return
  e.preventDefault()
  backToBadge()
}

function onFocusOut(e: FocusEvent) {
  const next = e.relatedTarget as Node | null
  if (!next || (!anchor.value?.contains(next) && !card.value?.contains(next))) later(hide, 0)
}

// A tap opens the card instead of following the badge: its links are in it.
function onTap(e: MouseEvent) {
  if (!touch.value) return
  e.preventDefault()
  if (open.value) hide()
  else void show()
}

onBeforeUnmount(hide)
</script>

<template>
  <span
    v-if="weight && badge"
    ref="anchor"
    class="dw-acct-weight"
    @mouseenter="touch || later(show, 200)"
    @mouseleave="touch || later(hide, 150)"
    @focusin="touch || returning || show()"
    @focusout="onFocusOut"
    @keydown.esc="hide"
    @click.capture="onTap"
  >
    <SLink :to="dashboardRoute('status', { account_id: account.id })" :aria-label="badge.label" aria-haspopup="true" :aria-expanded="open" @keydown.enter="intoCard" @keydown.down="intoCard">
      <SBadge :tone="badge.tone" size="xs" class="dw-num">{{ badge.text }}</SBadge>
    </SLink>
    <Teleport to="body">
      <div
        v-if="open"
        ref="card"
        class="dw-acct-card"
        role="region"
        :aria-label="badge.label"
        :style="{ top: `${pos.top}px`, left: `${pos.left}px` }"
        @mouseenter="touch || show()"
        @mouseleave="touch || later(hide, 150)"
        @focusout="onFocusOut"
        @keydown.esc.stop="backToBadge"
        @keydown.tab="onCardTab"
      >
        <div class="dw-acct-card-head">
          <span class="dw-acct-card-title">
            <b>{{ account.name || catalog.accountName(account.id) }}</b>
            <template v-if="weight.degraded"> · {{ t('acct.card.below', { n: weight.degraded }) }} · {{ t('acct.card.base', { n: weight.base }) }}</template>
            <template v-else> · {{ t('acct.card.noneBelow') }}</template>
          </span>
          <SLink :to="dashboardRoute('status', { account_id: account.id })">{{ t('acct.card.allKeys') }}</SLink>
          <SLink :to="dashboardRoute('events', { account_id: account.id })">{{ t('acct.card.events') }}</SLink>
        </div>
        <div v-if="weight.adjust_off" class="dw-acct-card-off">
          {{ t('acct.card.adjustOff') }} ·
          <SLink :to="configRoute(account.id)">{{ t('acct.card.edit') }}</SLink>
        </div>
        <table v-if="keys.length" class="dw-acct-mini">
          <thead>
            <tr>
              <th>{{ t('acct.card.col.group') }}</th>
              <th>{{ t('acct.card.col.model') }}</th>
              <th>{{ t('acct.card.col.weight') }}</th>
              <th>{{ t('acct.card.col.state') }}</th>
              <th>{{ t('acct.card.col.changed') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="k in keys" :key="`${k.group_id}|${k.model}`">
              <td class="dw-acct-ellipsis">{{ groupName(k.group_id) }}</td>
              <td class="dw-acct-ellipsis dw-acct-mono" :title="k.model">
                {{ k.model }}
              </td>
              <td class="dw-num" :class="weightOf(k.eff) === 0 ? 'dw-acct-danger' : ''">{{ weightOf(k.eff) }} / {{ k.base }}</td>
              <td :class="k.state ? `dw-acct-${k.state}` : ''">
                {{ k.state ? t(`acct.card.state.${k.state}`) : '—' }}
              </td>
              <td class="dw-num">
                {{ k.changed_at ? shortTime(new Date(k.changed_at)) : '—' }}
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="weight.degraded > keys.length && keys.length" class="dw-sub">
          {{ t('acct.card.more', { n: weight.degraded - keys.length }) }}
        </div>
      </div>
    </Teleport>
  </span>
</template>
