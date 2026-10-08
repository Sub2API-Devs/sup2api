export default {
  title: '使用记录',
  description: '网关的每一次请求及其计费过程。',
  myTitle: '使用记录',
  myDescription: '你的每一次请求与余额变动。',
  statsTitle: '使用统计',
  statsDescription: '按时间段统计你的请求量、Token 与费用。',
  stats: {
    input: '输入 Token',
    output: '输出 Token',
    byModel: '按模型'
  },
  tabs: {
    requests: '请求记录',
    ledger: '余额变动'
  },
  range: {
    custom: '自定义'
  },
  filters: {
    userId: '用户 ID',
    accountId: '账号 ID',
    clientRequestId: '客户端请求 ID',
    clientRequestIdPlaceholder: '精确匹配 X-Request-Id'
  },
  success: {
    ok: '成功',
    failed: '失败'
  },
  summary: {
    requests: '请求数',
    successRate: '成功率',
    tokens: 'Token',
    tokensSub: '输入 {input} · 输出 {output}',
    cost: '费用',
    daily: '每日',
    partial: '按最近 {n} 条请求统计'
  },
  showDetails: '查看详情',
  hideDetails: '收起详情',
  errors: {
    model_not_allowed: '模型不可用',
    no_available_account: '暂无可用账号',
    rate_limit_exceeded: '超过速率限制'
  },
  cols: {
    route: '分组 / 账号',
    input: '输入',
    output: '输出',
    cost: '费用',
    accountType: '账号类型',
    upstreamProtocol: '上游协议',
    clientRequestId: '客户端请求 ID'
  },
  filterByClientRequestId: '{id}（点击按此 ID 筛选）',
  cacheTitle: '缓存读 {r} · 缓存写 {w}',
  cached: '缓存',
  cacheEvidence: {
    title: '上游缓存写入观测',
    total: '已报告的写入总量',
    five: '已报告的 5 分钟写入',
    hour: '已报告的 1 小时写入',
    unclassified: 'TTL 未细分',
    pricing: '计费桶与 TTL 观测分开记录。未细分部分按平台默认缓存写入费率计价；不据此认定为 5 分钟缓存。原费用保持不变。',
    missing: '本记录没有可用的 TTL 来源证据。以上为原计费桶，不能据此认定实际 5 分钟用量；原费用保持不变。',
    counter: { absent: '未报告', null: '报告为空', invalid: '报告值无效' },
    component: { additional: '附加用量 #{index} 的独立缓存观测', replacement: '替代计费用量 #{index} 的独立缓存观测' },
    status: {
      complete: '已报告的 TTL 细分完整。',
      partial: 'TTL 细分不完整，已报告值可能早于最新总量。',
      unknown: 'TTL 归属未知，未推算缺失细分。',
      inconsistent: '已报告的缓存计数不一致，无法确定 TTL 分配。'
    }
  },
  converted: '已转换',
  convertedFrom: '由端点协议 {protocol} 转换',
  free: '免费',
  stream: '流',
  blocked: '拦截',
  blockedBy: '被 {plugin} 拦截',
  billing: {
    title: '计费详情',
    price: '价格规则',
    tier: '档位',
    rules: '加价规则',
    matched: '命中',
    notMatched: '未命中',
    breakdown: '明细',
    inputs: '计费条件取值',
    statusLabel: '结算状态',
    ledger: '账本 #{id}',
    freeNote: '被钩子拒绝、上游失败且没有用量的请求不计费。',
    status: {
      billed: '已结算',
      pending: '待结算',
      failed: '结算失败',
      free: '免费'
    }
  },
  request: {
    title: '请求',
    id: '请求 ID',
    clientId: '客户端请求 ID',
    clientIdNone: '客户端没有发送 X-Request-Id',
    endpoint: '端点',
    upstreamModel: '上游模型',
    apiKey: 'API Key',
    statusCode: 'HTTP 状态',
    latency: '耗时',
    firstToken: '首 token',
    error: '错误'
  },
  tokens: {
    title: 'Token 用量',
    cacheDefaultBucket: '缓存写入（默认计费桶）',
    cache1hBucket: '缓存写入（1 小时计费桶）',
    knownRound: '第 {round} 轮已知用量',
    incompleteRounds: '以下仅为已记录的分轮用量，整体用量尚未确认，不能作为本次请求总计。未估算缺失用量，计费状态保持不变。'
  },
  hooks: {
    title: '钩子决策'
  },
  sticky: {
    title: '粘性会话',
    rule: '规则',
    hit: '绑定',
    hitYes: '命中',
    hitNo: '未命中'
  }
}
