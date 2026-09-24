export default {
  title: '使用记录',
  description: '网关的每一次请求及其计费过程。',
  myTitle: '我的用量',
  myDescription: '你的请求记录与费用。',
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
  cols: {
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
    title: 'Token 用量'
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
