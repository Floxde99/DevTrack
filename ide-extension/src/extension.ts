import * as path from 'node:path';
import * as vscode from 'vscode';

type IdeContextPayload = {
  repo_name: string;
  git_branch: string;
  repo_path?: string;
  active_file?: string;
  editor_name?: string;
  editor_version?: string;
};

function getConfig() {
  const cfg = vscode.workspace.getConfiguration('devtrackIdeContext');
  return {
    daemonPort: cfg.get<number>('daemonPort', 3001),
    includeRepoPath: cfg.get<boolean>('includeRepoPath', false),
    includeActiveFilePath: cfg.get<boolean>('includeActiveFilePath', false),
  };
}

function getWorkspaceRoot() {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? null;
}

function getRepoName(rootPath: string) {
  return path.basename(rootPath);
}

function getActiveFileRelativePath(rootPath: string) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return null;
  const fsPath = editor.document.uri.fsPath;
  if (!fsPath) return null;
  const rel = path.relative(rootPath, fsPath);
  // If the active file isn't within the workspace root, don't send it.
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) return null;
  return rel.replaceAll('\\', '/');
}

function tryGetGitBranch(): string | null {
  try {
    const ext = vscode.extensions.getExtension('vscode.git');
    if (!ext) return null;
    const gitExtension = ext.exports as unknown as { getAPI?: (version: number) => any };
    const gitApi = gitExtension?.getAPI?.(1);
    const repo = gitApi?.repositories?.[0];
    const name = repo?.state?.HEAD?.name;
    return typeof name === 'string' && name.length ? name : null;
  } catch {
    return null;
  }
}

function getEditorInfo() {
  return {
    editor_name: vscode.env.appName,
    editor_version: vscode.version,
  };
}

async function postIdeContext(port: number, payload: IdeContextPayload) {
  const url = `http://127.0.0.1:${port}/api/ide-context`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1200);
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch {
    // Best-effort; daemon may not be running.
  } finally {
    clearTimeout(timeout);
  }
}

export function activate(context: vscode.ExtensionContext) {
  let lastSentJson: string | null = null;
  let sendTimer: NodeJS.Timeout | null = null;

  const scheduleSend = () => {
    if (sendTimer) clearTimeout(sendTimer);
    sendTimer = setTimeout(() => void sendNow(), 250);
  };

  const sendNow = async () => {
    const rootPath = getWorkspaceRoot();
    if (!rootPath) return;

    const cfg = getConfig();
    const repo_name = getRepoName(rootPath);
    const git_branch = tryGetGitBranch() ?? 'unknown';

    const payload: IdeContextPayload = {
      repo_name,
      git_branch,
      ...getEditorInfo(),
    };

    if (cfg.includeRepoPath) payload.repo_path = rootPath;
    if (cfg.includeActiveFilePath) {
      const rel = getActiveFileRelativePath(rootPath);
      if (rel) payload.active_file = rel;
    }

    const json = JSON.stringify(payload);
    if (json === lastSentJson) return;
    lastSentJson = json;

    await postIdeContext(cfg.daemonPort, payload);
  };

  // Initial send (best-effort).
  scheduleSend();

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(() => scheduleSend()),
    vscode.workspace.onDidChangeTextDocument(() => scheduleSend()),
    vscode.window.onDidChangeWindowState(() => scheduleSend()),
    vscode.workspace.onDidChangeWorkspaceFolders(() => scheduleSend())
  );

  // Branch changes (Git extension API, if available).
  try {
    const ext = vscode.extensions.getExtension('vscode.git');
    const gitExtension = ext?.exports as unknown as { getAPI?: (version: number) => any } | undefined;
    const gitApi = gitExtension?.getAPI?.(1);
    const repo = gitApi?.repositories?.[0];
    const disposable = repo?.state?.onDidChange?.(() => scheduleSend());
    if (disposable) context.subscriptions.push(disposable);
  } catch {
    // ignore
  }
}

export function deactivate() {}

