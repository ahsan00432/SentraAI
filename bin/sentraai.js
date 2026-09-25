#!/usr/bin/env node
import { scanProject } from '../lib/scanner.js';

if (process.argv[2] !== 'scan') {
  console.log('Usage: sentraai scan <directory>');
  process.exit(1);
}

const root = process.argv[3] || '.';
const result = scanProject(root);
console.log('\n  SentraAI Security Scanner v1.0\n');
for (const label of ['MCP servers', 'agent tools', 'prompts', 'GitHub Actions', 'dependencies', 'secrets']) console.log(`  [+] Scanning ${label}`);
console.log('');
if (!result.findings.length) console.log('  PASS      No security findings detected');
else for (const finding of result.findings) console.log(`  ${finding.severity.padEnd(9)} ${finding.title} (${finding.file})`);
console.log(`\n  Score: ${result.score}/100`);
console.log(`  Scanned ${result.filesScanned} files. Found ${result.findings.length} finding(s).\n`);
process.exitCode = result.findings.some((finding) => finding.severity === 'CRITICAL') ? 2 : 0;
