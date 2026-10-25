// Brand colours and marks of the gateway platforms (CONTRACTS §13), shared by
// the platform icon and the group badge. Literal class names so Tailwind
// keeps them; a platform without its own colours uses the default theme.

export interface PlatformTheme {
  /** The badge itself. */
  badge: string
  /** A label inside the badge (the rate multiplier). */
  label: string
}

const THEMES: Record<string, PlatformTheme> = {
  anthropic: {
    badge: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
    label: 'bg-orange-200/60 text-orange-800 dark:bg-orange-800/40 dark:text-orange-300'
  },
  openai: {
    badge: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400',
    label: 'bg-emerald-200/60 text-emerald-800 dark:bg-emerald-800/40 dark:text-emerald-300'
  },
  gemini: {
    badge: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
    label: 'bg-blue-200/60 text-blue-800 dark:bg-blue-800/40 dark:text-blue-300'
  },
  volcengine: {
    badge: 'bg-sky-50 text-sky-700 dark:bg-sky-900/20 dark:text-sky-400',
    label: 'bg-sky-200/60 text-sky-800 dark:bg-sky-800/40 dark:text-sky-300'
  }
}

/** Several platforms in one group. */
const COMPOSITE: PlatformTheme = {
  badge: 'bg-cyan-50 text-cyan-800 dark:bg-cyan-900/20 dark:text-cyan-300',
  label: 'bg-cyan-200/70 text-cyan-900 dark:bg-cyan-900/50 dark:text-cyan-300'
}
const DEFAULT: PlatformTheme = {
  badge: 'bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-400',
  label: 'bg-violet-200/60 text-violet-800 dark:bg-violet-800/40 dark:text-violet-300'
}
const NONE: PlatformTheme = {
  badge: 'bg-gray-100 text-gray-700 dark:bg-dark-700 dark:text-dark-300',
  label: 'bg-black/10 dark:bg-white/10'
}

/** The theme of a group serving these platforms. */
export function platformTheme(ids: readonly string[] | null | undefined): PlatformTheme {
  if (!ids?.length) return NONE
  if (ids.length > 1) return COMPOSITE
  return THEMES[ids[0]] ?? DEFAULT
}

/** Brand marks (filled SVG paths) of the platforms that have one. */
export const PLATFORM_MARKS: Record<string, { viewBox: string; d: string }> = {
  anthropic: {
    viewBox: '0 0 16 16',
    d: 'm3.127 10.604 3.135-1.76.053-.153-.053-.085H6.11l-.525-.032-1.791-.048-1.554-.065-1.505-.08-.38-.081L0 7.832l.036-.234.32-.214.455.04 1.009.069 1.513.105 1.097.064 1.626.17h.259l.036-.105-.089-.065-.068-.064-1.566-1.062-1.695-1.121-.887-.646-.48-.327-.243-.306-.104-.67.435-.48.585.04.15.04.593.456 1.267.981 1.654 1.218.242.202.097-.068.012-.049-.109-.181-.9-1.626-.96-1.655-.428-.686-.113-.411a2 2 0 0 1-.068-.484l.496-.674L4.446 0l.662.089.279.242.411.94.666 1.48 1.033 2.014.302.597.162.553.06.17h.105v-.097l.085-1.134.157-1.392.154-1.792.052-.504.25-.605.497-.327.387.186.319.456-.045.294-.19 1.23-.37 1.93-.243 1.29h.142l.161-.16.654-.868 1.097-1.372.484-.545.565-.601.363-.287h.686l.505.751-.226.775-.707.895-.585.759-.839 1.13-.524.904.048.072.125-.012 1.897-.403 1.024-.186 1.223-.21.553.258.06.263-.218.536-1.307.323-1.533.307-2.284.54-.028.02.032.04 1.029.098.44.024h1.077l2.005.15.525.346.315.424-.053.323-.807.411-3.631-.863-.872-.218h-.12v.073l.726.71 1.331 1.202 1.667 1.55.084.383-.214.302-.226-.032-1.464-1.101-.565-.497-1.28-1.077h-.084v.113l.295.432 1.557 2.34.08.718-.112.234-.404.141-.444-.08-.911-1.28-.94-1.44-.759-1.291-.093.053-.448 4.821-.21.246-.484.186-.403-.307-.214-.496.214-.98.258-1.28.21-1.016.19-1.263.112-.42-.008-.028-.092.012-.953 1.307-1.448 1.957-1.146 1.227-.274.109-.477-.247.045-.44.266-.39 1.586-2.018.956-1.25.617-.723-.004-.105h-.036l-4.212 2.736-.75.096-.324-.302.04-.496.154-.162 1.267-.871z'
  },
  openai: {
    viewBox: '0 0 24 24',
    d: 'M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z'
  },
  gemini: { viewBox: '0 0 24 24', d: 'M12 2l1.89 7.2L21 12l-7.11 2.8L12 22l-1.89-7.2L3 12l7.11-2.8L12 2z' }
}
