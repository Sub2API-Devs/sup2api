export default {
  login: {
    title: '登录 sub2api',
    subtitle: 'AI API 网关控制台',
    email: '邮箱',
    password: '密码',
    submit: '登录',
    failed: '登录失败',
    rateLimited: '尝试次数过多，请在 {n} 秒后重试',
    rateLimitedNoTime: '尝试次数过多，请稍后重试',
    sessionExpired: '登录已失效，请重新登录',
    passkey: '使用通行密钥登录',
    twoFactorHint: '请输入验证器应用里的 6 位验证码，或一个备用码。',
    code: '验证码',
    verify: '验证并登录',
    back: '返回密码登录',
    badCode: '验证码不正确'
  },
  errors: {
    invalid_argument: '输入有误',
    unauthenticated: '请重新登录',
    permission_denied: '没有权限',
    not_found: '不存在',
    conflict: '与现有数据冲突',
    insufficient_balance: '余额不足',
    model_price_not_configured: '模型价格未配置',
    model_not_allowed: '模型不允许使用',
    verification_required: '需要先验证身份',
    verification_cancelled: '已取消身份验证',
    rate_limited: '请求过于频繁',
    too_many_drafts: '未完成的账号草稿过多。请先完成或关闭其中一个，或等待约 15 分钟由系统清理被放弃的草稿',
    no_available_account: '没有可用账号',
    plugin_unavailable: '插件不可用',
    unavailable: '服务不可用',
    internal: '内部错误',
    network: '网络错误'
  }
}
