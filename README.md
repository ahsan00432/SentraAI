# SentraAI

Security intelligence for agentic systems.

SentraAI is a lightweight security scanner for repositories that contain AI agents, MCP servers, agent tools, prompts, automation workflows, and supporting dependencies. It can be used locally from the command line, through a browser-based dashboard, or in GitHub Actions.

## What SentraAI Does

SentraAI scans a project directory and produces:

- A security score from 0 to 100.
- Findings grouped by category and severity.
- The file associated with each finding.
- A short remediation recommendation.
- Coverage data for each scanner category.
- A machine-readable JSON result through the local API.

The scanner currently checks six areas:

| Category | Examples of checks |
| --- | --- |
| MCP servers | Shell command execution and potentially unrestricted filesystem access |
| Agent tools | Arbitrary shell commands and unrestricted network requests |
| Prompts | User-controlled content interpolated into agent instructions |
| GitHub Actions | Broad or write-level workflow permissions |
| Dependencies | Install hooks that download executable content and unstable version references |
| Secrets | Common hard-coded API key and token patterns |

SentraAI is a static, pattern-based scanner. It does not execute the files it scans, contact external services, or replace a full application security review.

## Quick Start

### Requirements

- Node.js 18 or newer.
- A project directory to scan.

SentraAI has no runtime dependencies and uses Node.js built-in modules.

### Run a scan

From this repository:

```bash
npm run scan
```

To scan another directory:

```bash
node ./bin/sentraai.js scan /path/to/agent-project
```

On Windows, use a path such as:

```powershell
node .\bin\sentraai.js scan C:\path\to\agent-project
```

The CLI prints the scanner categories, each finding, the final score, the number of files scanned, and the number of findings. It exits with status `2` when at least one `CRITICAL` finding is present; otherwise it exits with status `0`. Invalid commands or missing directories exit with status `1`.

### Start the dashboard

```bash
npm start
```

Then open <http://127.0.0.1:4173> in a browser. The dashboard lets you enter a repository path, run a scan, filter findings by category, inspect coverage, and view the resulting score.

Set `PORT` to use another local port:

```bash
PORT=8080 npm start
```

PowerShell:

```powershell
$env:PORT = 8080
npm start
```

The server binds to `127.0.0.1`, so it is intended for local use.

## GitHub Action

Use SentraAI as a composite action in a workflow:

```yaml
name: SentraAI security scan

on:
	pull_request:
	push:
		branches: [main]

jobs:
	security:
		runs-on: ubuntu-latest
		steps:
			- uses: actions/checkout@v4
			- name: Scan with SentraAI
				uses: your-org/sentraai@main
				with:
					path: .
```

The action runs the same CLI scanner and accepts one input:

| Input | Required | Default | Description |
| --- | --- | --- | --- |
| `path` | No | `.` | Repository path to scan |

Because the CLI returns status `2` for critical findings, a workflow job fails when a critical issue is detected. High and medium findings are reported without failing the process by themselves.

## Dashboard API

When the local server is running, scan a directory with:

```text
GET /api/scan?path=/path/to/project
```

If `path` is omitted, the server scans the SentraAI project directory. A successful response has this shape:

```json
{
	"root": "/path/to/project",
	"score": 86,
	"filesScanned": 24,
	"findings": [
		{
			"severity": "HIGH",
			"title": "Agent tool can make unrestricted network requests",
			"category": "Agent tools",
			"file": "src/tools/search.js",
			"detail": "Restrict egress destinations and validate URLs."
		}
	],
	"coverage": [
		{
			"name": "Agent tools",
			"checked": 24,
			"findings": 1,
			"status": "attention"
		}
	],
	"scannedAt": "2026-09-25T12:00:00.000Z"
}
```

Invalid paths and scan errors return HTTP `400` with an `error` message.

## Scoring

Every scan starts at `100`. Findings reduce the score according to severity:

| Severity | Deduction |
| --- | ---: |
| `CRITICAL` | 24 points |
| `HIGH` | 14 points |
| `MEDIUM` | 7 points |
| `LOW` | 3 points |

The score cannot go below `0`. Findings with the same title in the same file are de-duplicated.

## Files and Directories

The scanner recursively reads files under the target directory. It skips:

```text
node_modules/
.git/
dist/
build/
.next/
coverage/
__pycache__/
```

Dependency checks recognize `package.json`, `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, `requirements.txt`, `pyproject.toml`, `poetry.lock`, and `go.mod`.

Prompt checks consider `.prompt`, `.md`, `.mdx`, and `.txt` files whose paths suggest prompts, instructions, agents, systems, chats, or templates. MCP and tool checks use file names, paths, and source patterns to identify likely implementations.

## Project Structure

```text
bin/sentraai.js  Command-line entry point
lib/scanner.js   Shared scanning and scoring engine
server.js        Local HTTP server and JSON scan API
index.html       Dashboard markup
app.js           Dashboard interactions and API rendering
styles.css       Dashboard styling
action.yml       GitHub composite action definition
fixtures/        Scanner fixtures and sample project data
```

The CLI, dashboard, and GitHub Action all use `lib/scanner.js`, so a scan produces the same findings regardless of how it is started.

## Development

Run the scanner against the repository itself:

```bash
npm run scan
```

Start the dashboard during development:

```bash
npm start
```

There is currently no test runner configured in `package.json`. When extending a rule, add or update a focused fixture under `fixtures/` and verify both the CLI output and the dashboard response.

## Scope and Limitations

SentraAI is designed as an early, local security signal for agentic projects. The current implementation:

- Uses regular-expression and filename heuristics rather than a complete language parser.
- Reports likely risks and may produce false positives or miss obfuscated patterns.
- Does not inspect remote repositories unless they are available on the local filesystem.
- Does not resolve dependencies, execute package scripts, or dynamically analyze agent behavior.
- Does not persist scan history; each API request performs a fresh scan.
- Serves the dashboard and API without authentication, so keep the server bound to a trusted local interface.

Treat findings as prompts for review. Secrets should be revoked and rotated, not only removed from a file.

## License

SentraAI is available under the MIT License.
