// Messages of the account area, merged under its own key in messages.ts.
const zh = {
  badge: {
    statsOnly: '只统计',
    degradingAria: '动态权重降权中，最低有效权重 {w}，基准 {base}，{n} 个键低于基准',
    climbingAria: '动态权重回升中，最低有效权重 {w}，基准 {base}，{n} 个键低于基准',
    statsOnlyAria: '动态权重只统计：账号覆盖关闭了调整'
  },
  card: {
    below: '{n} 个低于基准',
    noneBelow: '没有低于基准的键',
    base: '基准 {n}',
    allKeys: '全部键',
    events: '事件',
    adjustOff: '账号覆盖：调整关闭',
    edit: '去修改',
    more: '还有 {n} 个',
    col: { group: '分组', model: '模型', weight: '有效 / 基准', state: '状态', changed: '最近变化' },
    state: { degrading: '▼ 降权', climbing: '▲ 回升' }
  },
  tab: {
    keys: '{n} 个键',
    below: '{n} 个低于基准',
    lowest: '最低 {w} / {base}',
    override: '账号覆盖：{v}',
    overrideNone: '无',
    overrideUnknown: '未知',
    settings: '设置',
    events: '事件',
    resetAll: '重置全部'
  },
  table: {
    config: '生效配置',
    group: '分组配置',
    global: '全局配置',
    window: '{rate} · {n} 次',
    notEvaluated: '未评估 · 本窗 {n} 次',
    more: '更多操作',
    stateAria: { degrading: '降权中', climbing: '回升中' }
  },
  detail: {
    noClimb: '生效配置没有启用的回升项，降下去的权重不会自动恢复。',
    toConfig: '去配置',
    rules: '规则',
    trigger: '触发条件',
    windows: '各窗口',
    current: '本窗',
    samples: '样本',
    mOfN: '{n} 窗 {m} 次',
    hit: '命中',
    miss: '未命中',
    unjudged: '样本不足',
    samplesN: '{n}（回看 {lookback}）'
  }
}

const en: typeof zh = {
  badge: {
    statsOnly: 'Stats only',
    degradingAria: 'Dynamic weight degrading: lowest effective weight {w}, base {base}, {n} keys below base',
    climbingAria: 'Dynamic weight climbing: lowest effective weight {w}, base {base}, {n} keys below base',
    statsOnlyAria: 'Dynamic weight stats only: the account override turns adjusting off'
  },
  card: {
    below: '{n} below base',
    noneBelow: 'No key below base',
    base: 'base {n}',
    allKeys: 'All keys',
    events: 'Events',
    adjustOff: 'Account override: adjusting off',
    edit: 'Change',
    more: '{n} more',
    col: { group: 'Group', model: 'Model', weight: 'Eff / base', state: 'State', changed: 'Changed' },
    state: { degrading: '▼ Down', climbing: '▲ Up' }
  },
  tab: {
    keys: '{n} keys',
    below: '{n} below base',
    lowest: 'lowest {w} / {base}',
    override: 'Account override: {v}',
    overrideNone: 'none',
    overrideUnknown: 'unknown',
    settings: 'Settings',
    events: 'Events',
    resetAll: 'Reset all'
  },
  table: {
    config: 'Config',
    group: 'Group',
    global: 'Global',
    window: '{rate} · {n} req',
    notEvaluated: 'Not evaluated · {n} now',
    more: 'More actions',
    stateAria: { degrading: 'Degrading', climbing: 'Climbing' }
  },
  detail: {
    noClimb: 'The configuration in force has no enabled climb item: a degraded weight never recovers on its own.',
    toConfig: 'Configure',
    rules: 'Rule',
    trigger: 'Trigger',
    windows: 'Windows',
    current: 'This window',
    samples: 'Samples',
    mOfN: '{m} of {n} windows',
    hit: 'Hit',
    miss: 'Miss',
    unjudged: 'Too few samples',
    samplesN: '{n} (over {lookback})'
  }
}

export default { zh, en }
