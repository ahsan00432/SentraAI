import fs from 'node:fs';
import path from 'node:path';

const ignored = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'coverage', '__pycache__']);
const categoryNames = ['MCP servers', 'Agent tools', 'Prompts', 'GitHub Actions', 'Dependencies', 'Secrets'];
const dependencyFiles = new Set(['package.json', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'requirements.txt', 'pyproject.toml', 'poetry.lock', 'go.mod']);
const promptExtensions = new Set(['.prompt', '.md', '.mdx', '.txt']);

function collectFiles(root) {
  const files = [];
  function walk(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (ignored.has(entry.name)) continue;
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(absolute);
      else if (entry.isFile()) files.push(absolute);
    }
  }
  walk(root);
  return files;
}

function looksLikeMcpConfig(relative, source) {
  const name = path.basename(relative).toLowerCase();
  return /(^|[/_.-])(mcp|claude_desktop_config|cursor|cline)([/_.-]|$)/i.test(relative) || (name.endsWith('.json') && /mcpServers|servers\s*:/i.test(source));
}

function scanProject(directory) {
  const root = path.resolve(directory || '.');
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) throw new Error(`Directory not found: ${root}`);
  const files = collectFiles(root);
  const findings = [];
  const categoryHits = new Map(categoryNames.map((name) => [name, 0]));
  const add = (severity, title, category, file, detail) => {
    const relative = path.relative(root, file).replaceAll('\\', '/') || '.';
    const duplicate = findings.some((item) => item.file === relative && item.title === title);
    if (duplicate) return;
    findings.push({ severity, title, category, file: relative, detail });
    categoryHits.set(category, categoryHits.get(category) + 1);
  };

  for (const file of files) {
    const relative = path.relative(root, file).replaceAll('\\', '/');
    const name = path.basename(file).toLowerCase();
    let source;
    try { source = fs.readFileSync(file, 'utf8'); } catch { continue; }
    const extension = path.extname(name);
    const isWorkflow = relative.startsWith('.github/workflows/') || (relative.includes('/workflows/') && (extension === '.yml' || extension === '.yaml'));
    const isScannerImplementation = relative === 'lib/scanner.js';
    const isMcp = !isScannerImplementation && (looksLikeMcpConfig(relative, source) || (/@modelcontextprotocol|McpServer|FastMCP/i.test(source) && /(mcp|server)/i.test(relative)));
    const isTool = /(agent|tool|plugin|function|mcp)/i.test(relative) && /\.(js|ts|mjs|cjs|py|json|yaml|yml)$/.test(name);
    const isPrompt = promptExtensions.has(extension) && /(prompt|instruction|agent|system|chat|template)/i.test(relative);

    if (/sk-[a-z0-9]{20,}|gh[pousr]_[a-z0-9]{20,}|AKIA[0-9A-Z]{16}|xox[baprs]-[a-z0-9-]{20,}|AIza[0-9A-Za-z_-]{30,}/i.test(source)) {
      add('CRITICAL', 'Possible hard-coded secret', 'Secrets', file, 'Move credentials to encrypted environment secrets.');
    }
    if (isMcp && /("command"\s*:\s*["'](?:bash|sh|cmd|powershell)|child_process|subprocess\.(run|Popen)|exec\()/i.test(source)) {
      add('CRITICAL', 'MCP server can execute arbitrary commands', 'MCP servers', file, 'Require an explicit command allowlist and avoid shell interpolation.');
    }
    if (isMcp && /(filesystem|readFile|writeFile|os\.environ|process\.env|path\.resolve|directory|root)/i.test(source)) {
      add('HIGH', 'MCP server may have unrestricted filesystem access', 'MCP servers', file, 'Restrict access to a project-scoped directory.');
    }
    if (isTool && /(child_process|exec\(|spawn\(|shell:\s*true|subprocess\.(run|Popen))/i.test(source)) {
      add('CRITICAL', 'Tool can execute arbitrary shell commands', 'Agent tools', file, 'Require an allowlist and disable shell interpolation.');
    }
    if (isTool && /(http\.request|fetch\(|axios|requests\.|urllib|net\.connect|socket\.)/i.test(source)) {
      add('HIGH', 'Agent tool can make unrestricted network requests', 'Agent tools', file, 'Restrict egress destinations and validate URLs.');
    }
    if (isWorkflow && /(pull_request_target|permissions:\s*write-all|contents:\s*write|id-token:\s*write)/i.test(source)) {
      add('MEDIUM', 'GitHub Action grants excessive permissions', 'GitHub Actions', file, 'Set read-only permissions by default.');
    }
    if (isPrompt && /(\{\{?\s*(input|query|message|user|content)|\$\{\s*(input|query|message|user)|f['"]{1,3}.*(input|query|message))/is.test(source)) {
      add('MEDIUM', 'Untrusted user input reaches agent instructions', 'Prompts', file, 'Delimit and validate external content before interpolation.');
    }
    if (dependencyFiles.has(name) && /\b(?:curl|wget)\b.*(?:install|postinstall|prepare)/is.test(source)) {
      add('HIGH', 'Dependency script downloads executable content', 'Dependencies', file, 'Review install hooks and pin trusted packages.');
    }
    if (dependencyFiles.has(name) && /(git\+https?:|@latest|\*\s*["']|\bmain\b)/i.test(source)) {
      add('MEDIUM', 'Dependency is not pinned to a stable version', 'Dependencies', file, 'Pin dependencies to reviewed versions.');
    }
  }

  const weights = { CRITICAL: 24, HIGH: 14, MEDIUM: 7, LOW: 3 };
  const score = Math.max(0, 100 - findings.reduce((total, finding) => total + weights[finding.severity], 0));
  const coverage = categoryNames.map((name) => ({ name, checked: name === 'MCP servers' ? files.filter((file) => looksLikeMcpConfig(path.relative(root, file), fs.readFileSync(file, 'utf8'))).length : files.length, findings: categoryHits.get(name), status: categoryHits.get(name) ? 'attention' : 'clear' }));
  return { root, score, filesScanned: files.length, findings, coverage, scannedAt: new Date().toISOString() };
}

export { categoryNames, scanProject };
