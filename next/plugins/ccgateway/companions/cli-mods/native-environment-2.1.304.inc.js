// Inserted only into the independently hash-bound 2.1.304 core module.
// All readers and renderers below are native bindings verified for that build.
export async function ccgatewayEnvironment(context, selected) {
  const wanted = new Set(selected);
  const unavailableFields = [];
  const override = cle();
  if (override !== undefined) {
    let proxy = null;
    if (wanted.has('agent_proxy')) {
      try { proxy = l1(override) ? ule(override) : foo(); }
      catch { unavailableFields.push('agent_proxy'); }
    }
    return {
      text: zkt({ ...override, ccgatewayProxyText: proxy }),
      fieldText: { agent_proxy: proxy },
      unavailableFields,
    };
  }
  const snapshot = {
    platform: a.platform, additionalWorkingDirectories: [],
    ccgatewayProxyText: null,
  };
  async function read(field, key, reader) {
    if (!wanted.has(field)) return;
    try { snapshot[key] = await reader(); }
    catch { unavailableFields.push(field); }
  }
  if (['primary_directory', 'git_repository', 'worktree'].some(field => wanted.has(field))) {
    snapshot.workingDirectory = context.workingDirectory;
    snapshot.isGitRepo = false;
    snapshot.isWorktree = false;
  }
  await read('git_repository', 'isGitRepo', () => gH());
  await read('worktree', 'isWorktree', () => Cl() !== null || hK(context.workingDirectory));
  await read('additional_directories', 'additionalWorkingDirectories', () => [...context.additionalWorkingDirectories]);
  await read('shell', 'shell', () => uoo());
  await read('os_version', 'osVersion', () => poo());
  await read('scratchpad_directory', 'scratchpadDirectory', () => moo());
  await read('github_cli', 'githubCli', () => Nkt());
  await read('agent_proxy', 'ccgatewayProxyText', () => foo());
  return {
    text: zkt(snapshot),
    fieldText: { agent_proxy: snapshot.ccgatewayProxyText },
    unavailableFields,
  };
}
