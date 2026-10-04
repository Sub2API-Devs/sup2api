export default {
 runtime: {"switchHint": "Proxy changes restart this account’s egress and may interrupt existing calls. Other accounts are unaffected.", "enable": "Enable per-account containers and external egress", "setup": "Install the remote account controller at 127.0.0.1:8787 first and use its key as the admin key. Shared containers are not automatically migrated."},
  title: 'CCGateway management', description: 'Manage local or SSH gateways, outbound proxies and Claude authorization.', readOnly: 'Your permissions allow viewing configuration only.', failed: 'Operation failed. Check the connection configuration and retry.',
  auth: { models: 'Models', modelsHint: 'Prefilled with the plugin preset; add or remove freely. Press Enter after a model name; an empty list allows every model.', mapping: 'Model mapping', mappingHint: 'Request model → upstream model; billing and group allowlists still use the request model.', title: 'Claude authorization and account', hint: 'Provide Messages API through Claude Code. Each container has its own authorization.', healthy: 'Service online', offline: 'Service unavailable', loggedIn: 'Authorized', loggedOut: 'Not authorized', unknown: 'Status unknown', start: 'Get authorization link', logout: 'Sign out', confirmLogout: 'Signing out prevents linked accounts from calling models. Continue?', open: 'Open Claude authorization', expires: 'Authorization link expires: {time}', code: 'Full authorization code (code#state)', complete: 'Complete authorization', expired: 'Session expired. Cancel and request a new authorization link.', name: 'Account name', connect: 'Create scheduling account', connected: 'Created account #{id}', accounts: 'Open accounts', connectHint: 'Create a managed CCGateway account with core-managed credentials. Choose groups here; accounts without groups do not participate in scheduling.', pending: 'Authorization callback completed. Refresh status to confirm.' },
  accountAuth: {
    title: 'Claude authorization', saveAndAuthorize: 'Save and authorize',
    steps: { save: 'Save the account', container: 'Start the account container', login: 'Open the link and sign in to Claude', code: 'Paste the authorization code', done: 'Done' },
    saveHint: "Fill in the name, groups and proxy, then click 'Save and authorize': the account's own container starts right away and the Claude authorization link is requested as soon as it is ready.",
    saved: 'Saved (account #{id})',
    containerStarting: 'Starting the account container…', containerPreparing: 'Container {name} is being prepared; checking every 2 seconds…', containerReady: 'Container {name} is ready', containerError: 'The container reports an error ({status}); synchronize again and retry.',
    syncFailed: 'The account container could not be started', statusFailed: 'The account container status could not be read', healthFailed: 'The container runs, but its Claude login state could not be read',
    setup: { runtimes: 'Per-account containers are not enabled in CCGateway', docker: 'The CCGateway Docker connection (local or SSH) is not configured', adminKey: 'The container admin key (CCG_ADMIN_KEY) is missing' },
    openSettings: 'Open CCGateway settings', retry: 'Retry', resync: 'Synchronize again', reason: 'Reason: {message}',
    getLink: 'Get authorization link', gettingLink: 'Requesting the authorization link…', openLink: 'Open Claude authorization', startFailed: 'The authorization link could not be requested', badSession: 'The service returned an untrusted or expired authorization link',
    linkHint: 'Sign in to Claude on the new page and approve; it then shows an authorization code. Copy all of it into the next step.', expiresIn: 'link expires in {time}', expired: 'The authorization link has expired; request a new one.',
    codeLabel: 'Full authorization code (code#state)', codePlaceholder: 'Paste the code, like xxxx#yyyy', codeShape: 'The code normally contains # (code#state); make sure you copied all of it.', submit: 'Complete authorization',
    completeFailed: 'The code was rejected; check that it is complete and the link has not expired', notConfirmed: 'The code was accepted, but the container has not confirmed the login yet; retry shortly or request a new link.', regetLink: 'Request a new link', cancel: 'Cancel this authorization',
    authorized: 'Authorized', loggedOut: 'Not authorized', authorizedToast: 'Claude authorization completed', authorizedHint: 'The account container is signed in to Claude; the account can be scheduled.', reauthorize: 'Authorize again', finish: 'Done, close',
    readOnly: 'Starting the container and authorizing need the right to edit this account (or settings:manage); ask an administrator.', noRead: 'You may not view the container state of this account.',
    blocked: {
      no_proxy: { title: 'Account container stopped: no proxy', fix: 'Claude Code accounts must reach the internet through a proxy (the container has no direct egress). Pick or paste a proxy under "Proxy" above and save; the container restarts by itself.' },
      proxy_disabled: { title: 'Account container stopped: its proxy is disabled', fix: 'Pick another proxy under "Proxy" above and save, or enable the proxy again on the Proxies page, then synchronize again.' },
      account_disabled: { title: 'Account container stopped: the account is disabled', fix: 'Disabled accounts run no container. Reset or enable the account in the list first, then come back to authorize it.' },
      unknown: { title: 'The core stopped this account container', fix: 'Check the account status and its proxy, then synchronize again.' },
      pickProxy: 'Pick a proxy', openProxies: 'Open Proxies'
    },
    proxyRequired: 'Claude Code accounts need a proxy', proxyRequiredHint: 'Claude Code account containers only reach the internet through a proxy, there is no direct fallback; containers of accounts without one are stopped.'
  },
  runtimes: {
    title: 'Account containers', hint: 'One container per Claude Code account. Authorization happens on the Accounts page: creating an account starts its container and walks you through the login. This list only shows the state.',
    account: 'Account', container: 'Container', auth: 'Claude authorization', typeOAuth: 'OAuth (signed in inside the container)', typeApiKey: 'API Key',
    state: { ready: 'Ready', preparing: 'Preparing', error: 'Error', unavailable: 'Unavailable', unknown: 'Unknown' },
    checking: 'Checking', authorized: 'Authorized', notAuthorized: 'Not authorized', noAuthNeeded: 'No authorization needed',
    goAuthorize: 'Authorize on the Accounts page', goEdit: 'Open on the Accounts page', openAccounts: 'Create / manage accounts', empty: 'No Claude Code account yet; create one on the Accounts page.', loadFailed: 'Accounts could not be loaded'
  },

    proxy: {
      title: 'CCGateway outbound proxy', description: 'Configure Claude CLI outbound connections. Only HTTP / HTTPS proxies are supported; the official CLI does not support SOCKS.', effect: 'New requests use the saved configuration. In-flight requests keep their previous proxy; no container restart is required. The proxy must be reachable from the remote container.',
      mode: 'Proxy mode', inherit: 'Inherit container environment', direct: 'Connect directly', proxy: 'Custom proxy', url: 'Proxy URL', keep: 'Saved; leave blank to retain', support: 'HTTP / HTTPS URLs may include authentication. Saved credentials are never returned.', current: 'Saved proxy:', clear: 'Saving this mode clears the stored custom proxy URL.', revision: 'Configuration revision {revision}',
      save: 'Save outbound proxy', saved: 'Proxy configuration saved for new requests.', reload: 'Reload proxy configuration', required: 'Enter a URL when configuring a proxy for the first time.', invalid: 'Enter a valid HTTP or HTTPS proxy URL.', failed: 'Proxy operation failed. Check the connection and configuration, then retry.', show: 'Show', hide: 'Hide'
    },
    remote: {
      unconfigured: 'Not configured',
      admin_key: 'Container admin key (CCG_ADMIN_KEY)', api_key: 'Container API key (CCG_API_KEY)', keysHint: 'Use target container keys. Saved values are never returned; leave blank to retain.',
      title: 'CCGateway Docker connection', authorization: 'Built-in · Gateway authorization', description: 'Manage an existing CCGateway container locally or through SSH. This does not install Docker or deploy an image.',
      routingHint: 'SSH mode tunnels authorization and model requests to remote 127.0.0.1:8787; Docker and gateway API ports need not be public. Local mode still uses CCGATEWAY_URL. The saved CCG_API_KEY and CCG_ADMIN_KEY below must match the target container.',
      mode: 'Connection mode', local: 'Local Docker', ssh: 'Remote SSH', host: 'SSH host', port: 'SSH port', user: 'SSH user', authMode: 'SSH authentication', password: 'SSH password', privateKey: 'SSH private key', passphrase: 'Private key passphrase (optional)',
      fingerprint: 'Host key fingerprint', probe: 'Probe host fingerprint', verifyFingerprint: 'Verify this fingerprint through a trusted channel. The discovered fingerprint is not saved automatically; explicitly use it after checking.', useFingerprint: 'Use this fingerprint',
      keepSecret: 'Saved; leave blank to keep', secretsHint: 'Passwords, private keys and passphrases are never returned. Leave blank to retain saved values. Do not enter Claude authorization codes or model API keys here.', newCredentials: 'After changing the host, port or SSH user, enter the corresponding password or private key again.',
      required: 'Enter a valid SSH host, port, user and host fingerprint.', targetRequired: 'Enter an SSH host and a valid port first.',
      save: 'Save connection', saved: 'Connection configuration saved.', reload: 'Reload configuration', test: 'Test saved connection', saveFirst: 'Save the configuration before testing or managing containers.', savedOnly: 'Actions use only the saved SSH configuration. Remote actions are unavailable in local mode.',
      actions: { status: 'Container status', start: 'Start container', stop: 'Stop container', restart: 'Restart container', logs: 'View logs' },
      confirmAction: 'Run “{action}”? This may interrupt requests handled by the container.', confirm: 'Confirm action', cancel: 'Cancel', failed: 'Operation failed. Please retry.'
    },
}
