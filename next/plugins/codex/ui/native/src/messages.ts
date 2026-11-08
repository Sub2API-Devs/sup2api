// Codex UI messages, registered under plugin.codex.* via host.addMessages.
// vue-i18n syntax: avoid the special characters @ | { } in plain text.
const zh = {
  tabs: { device: '设备码登录', siwc: 'Sign in with ChatGPT' },
  tabsLabel: '授权方式',
  intro: {
    device: '在任意设备的浏览器里打开 OpenAI 验证页并输入验证码，授权后自动完成。与 Codex CLI 设备码登录相同。',
    siwc: 'OpenAI 官方第三方入口（ChatGPT plan usage）。在浏览器里登录同意后，把跳转后的网址粘回这里。'
  },
  current: {
    title: '当前授权',
    email: '邮箱',
    plan: '套餐',
    expires: '令牌过期',
    expired: '已过期（会自动刷新）',
    accountId: 'ChatGPT 账号 ID',
    clientId: 'Client ID',
    unknown: '—',
    reauth: '重新授权',
    cancelReauth: '取消重新授权',
    reauthHint: '重新授权成功后保存账号才会替换令牌；未完成时保存，保留原有凭证。',
    kept: '未重新授权，保存时保留原有凭证。'
  },
  done: {
    title: '已授权',
    titleReauth: '已重新授权，保存账号后生效',
    detail: '{email} · {plan}',
    noEmail: '已获取令牌',
    again: '重新授权'
  },
  device: {
    start: '开始',
    starting: '正在获取验证码…',
    step1: '打开验证页面',
    step2: '输入验证码',
    codeLabel: '验证码',
    copyCode: '复制验证码',
    openLink: '打开验证页面',
    waiting: '等待授权…',
    expiresIn: '{time} 后过期',
    expired: '验证码已过期，请重新开始。',
    failed: '授权失败',
    retry: '重新开始',
    cancel: '取消',
    notEnabled: '如提示未开启：在 ChatGPT 设置 → 安全 中开启“设备码授权”（企业工作区需管理员开启）。'
  },
  siwc: {
    generate: '生成授权链接',
    generating: '正在生成…',
    regenerate: '重新生成链接',
    linkLabel: '授权链接',
    copyLink: '复制链接',
    openLink: '在新窗口打开',
    step1: '在浏览器中打开授权链接，登录 ChatGPT 并同意授权',
    step2: '粘贴跳转后的完整网址',
    redirectNote: '同意后浏览器会跳到一个 127.0.0.1 开头、打不开的页面，这是正常的。把地址栏里的完整网址复制下来，粘到下面。',
    callbackLabel: '回调网址',
    callbackPlaceholder: 'http://127.0.0.1:1455/auth/callback?code=…',
    complete: '完成授权',
    completing: '正在换取令牌…',
    shape: {
      invalid: '这不像一个网址，请粘贴地址栏里以 http:// 开头的完整网址。',
      denied: '这个网址带有 error 参数：授权被拒绝或失败，请重新生成链接再试。',
      no_code: '网址里没有 code 参数，请确认复制的是同意授权后跳转到的地址。'
    },
    failed: '授权失败',
    reauthKeepsHost: '重新授权沿用本账号已有的 Client ID 和宿主 ID。'
  },
  plan: {
    free: 'Free',
    go: 'Go',
    plus: 'Plus',
    pro: 'Pro',
    team: 'Team',
    business: 'Business',
    enterprise: 'Enterprise',
    edu: 'Edu'
  },
  validate: {
    required: '请先完成授权，拿到令牌后再保存。',
    inProgress: '授权还没完成：完成后再保存。'
  },
  serverErrors: '凭证校验失败',
  actionFailed: '操作失败'
}

type Messages = typeof zh

const en: Messages = {
  tabs: { device: 'Device code', siwc: 'Sign in with ChatGPT' },
  tabsLabel: 'Sign-in method',
  intro: {
    device: 'Open the OpenAI verification page in a browser on any device and enter the code; this form finishes by itself once you approve. Same as the Codex CLI device code login.',
    siwc: "OpenAI's official third-party sign-in (ChatGPT plan usage). Sign in and consent in your browser, then paste the address you land on back here."
  },
  current: {
    title: 'Current authorization',
    email: 'Email',
    plan: 'Plan',
    expires: 'Token expires',
    expired: 'Expired (refreshed automatically)',
    accountId: 'Account ID',
    clientId: 'Client ID',
    unknown: '—',
    reauth: 'Re-authorize',
    cancelReauth: 'Cancel re-authorization',
    reauthHint: 'The tokens are replaced when you save the account after re-authorizing; saving before that keeps the current credentials.',
    kept: 'Not re-authorized: saving keeps the current credentials.'
  },
  done: {
    title: 'Authorized',
    titleReauth: 'Re-authorized: save the account to apply',
    detail: '{email} · {plan}',
    noEmail: 'Tokens received',
    again: 'Authorize again'
  },
  device: {
    start: 'Start',
    starting: 'Getting a code…',
    step1: 'Open the verification page',
    step2: 'Enter the code',
    codeLabel: 'Code',
    copyCode: 'Copy code',
    openLink: 'Open verification page',
    waiting: 'Waiting for approval…',
    expiresIn: 'Expires in {time}',
    expired: 'The code has expired. Start again.',
    failed: 'Authorization failed',
    retry: 'Start again',
    cancel: 'Cancel',
    notEnabled: 'If it says device codes are not enabled: turn on "Device code authorization" in ChatGPT Settings → Security (a workspace admin has to allow it for business workspaces).'
  },
  siwc: {
    generate: 'Generate sign-in link',
    generating: 'Generating…',
    regenerate: 'Generate a new link',
    linkLabel: 'Sign-in link',
    copyLink: 'Copy link',
    openLink: 'Open in a new window',
    step1: 'Open the link in your browser, sign in to ChatGPT and consent',
    step2: 'Paste the full address you were sent to',
    redirectNote: 'After you consent, the browser goes to a page starting with 127.0.0.1 that does not load. That is expected: copy the full address from the address bar and paste it below.',
    callbackLabel: 'Callback address',
    callbackPlaceholder: 'http://127.0.0.1:1455/auth/callback?code=…',
    complete: 'Complete sign-in',
    completing: 'Exchanging tokens…',
    shape: {
      invalid: 'This does not look like an address. Paste the full address from the address bar, starting with http://.',
      denied: 'This address carries an error parameter: consent was refused or failed. Generate a new link and try again.',
      no_code: 'The address has no code parameter. Make sure you copied the address you landed on after consenting.'
    },
    failed: 'Sign-in failed',
    reauthKeepsHost: "Re-authorizing reuses this account's issued client ID and host ID."
  },
  plan: {
    free: 'Free',
    go: 'Go',
    plus: 'Plus',
    pro: 'Pro',
    team: 'Team',
    business: 'Business',
    enterprise: 'Enterprise',
    edu: 'Edu'
  },
  validate: {
    required: 'Finish the authorization first: save once the tokens are in.',
    inProgress: 'The authorization is not finished yet: save once it is.'
  },
  serverErrors: 'Credential check failed',
  actionFailed: 'Action failed'
}

export default { zh, en }
