const scanButton = document.querySelector('#scanButton');
const scoreValue = document.querySelector('#scoreValue');
const toast = document.querySelector('#toast');
const findingsList = document.querySelector('.finding-list');
const coverageList = document.querySelector('.coverage-list');
const repoPath = document.querySelector('#repoPath');
const tabLinks = [...document.querySelectorAll('[data-tab]')];
const badge = '[![SentraAI](https://sentraai.dev/badge/acme/agent-lab)](https://sentraai.dev/acme/agent-lab)';
const iconByCategory = { 'MCP servers': ['coral', '⌘'], 'Agent tools': ['yellow', '⚿'], Prompts: ['blue', '⌁'], 'GitHub Actions': ['mint', '◎'], Dependencies: ['lilac', '⊙'], Secrets: ['coral', '◈'] };
let latestResult = { findings: [], coverage: [] };
let activeTab = 'all';

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  window.setTimeout(() => toast.classList.remove('show'), 2600);
}

function renderFindings(findings) {
  if (!findings.length) {
    findingsList.innerHTML = '<div class="empty-state"><span class="check">✓</span> No open findings. Your project is looking good.</div>';
    return;
  }
  findingsList.innerHTML = findings.slice(0, 6).map((finding) => {
    const level = finding.severity.toLowerCase();
    return `<div class="finding ${level}"><span class="severity-icon">${level === 'critical' ? '!' : level === 'high' ? '↑' : '~'}</span><div class="finding-info"><strong>${finding.title}</strong><span>${finding.file} · ${finding.category}</span></div><span class="severity-label">${finding.severity[0] + finding.severity.slice(1).toLowerCase()}</span><button class="arrow-button" title="View finding">→</button></div>`;
  }).join('');
}

function applyTab(category) {
  activeTab = category;
  tabLinks.forEach((link) => link.classList.toggle('active', link.dataset.tab === category));
  const findings = category === 'all' ? latestResult.findings : latestResult.findings.filter((finding) => finding.category === category);
  const coverage = category === 'all' ? latestResult.coverage : latestResult.coverage.filter((item) => item.name === category);
  const findingsTitle = document.querySelector('.findings-panel h2');
  findingsTitle.firstChild.textContent = category === 'all' ? 'Open findings ' : `${category} findings `;
  findingsTitle.querySelector('span').textContent = findings.length;
  renderFindings(findings);
  renderCoverage(coverage);
  document.querySelector('#findings').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderCoverage(coverage) {
  coverageList.innerHTML = coverage.map((item) => {
    const [color, icon] = iconByCategory[item.name] || ['blue', '◈'];
    const percentage = item.findings ? Math.max(38, 100 - item.findings * 16) : 100;
    return `<div class="coverage-row"><span class="coverage-icon ${color}">${icon}</span><div><strong>${item.name}</strong><span>${item.checked} files checked</span></div><div class="coverage-bar"><i style="width:${percentage}%"></i></div><b>${percentage}%</b></div>`;
  }).join('');
}

async function runScan() {
  scanButton.disabled = true;
  scanButton.innerHTML = '<span class="spark">◌</span> Scanning...';
  try {
    const response = await fetch(`/api/scan?path=${encodeURIComponent(repoPath.value || '.')}`);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Scan request failed');
    const result = payload;
    latestResult = result;
    scoreValue.textContent = result.score;
    applyTab(activeTab);
    showToast(`Scan complete: ${result.findings.length} finding${result.findings.length === 1 ? '' : 's'} found`);
  } catch (error) {
    showToast(error.message || 'Unable to scan this repository');
  } finally {
    scanButton.disabled = false;
    scanButton.innerHTML = '<span class="spark">✦</span> Run full scan';
  }
}

scanButton.addEventListener('click', runScan);
document.querySelector('#copyButton').addEventListener('click', async () => { await navigator.clipboard?.writeText(badge); showToast('Badge markdown copied to clipboard'); });
document.querySelector('#copyTextButton').addEventListener('click', async () => { await navigator.clipboard?.writeText(badge); showToast('Badge markdown copied to clipboard'); });
tabLinks.forEach((link) => link.addEventListener('click', (event) => { event.preventDefault(); applyTab(link.dataset.tab); }));
runScan();
