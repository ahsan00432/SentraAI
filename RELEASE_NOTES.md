# SentraAI 1.0.0

Initial release of SentraAI, a lightweight security intelligence platform for agentic systems.

## Highlights

- Scan AI-agent repositories from the command line with `sentraai scan <directory>`.
- Review scan results in a local browser dashboard.
- Integrate scans into CI with the GitHub composite action.
- Return structured scan results through the local `/api/scan` endpoint.
- Calculate a security score from 0 to 100 using severity-weighted findings.
- Provide remediation guidance for each detected issue.

## Security Coverage

The scanner checks six areas of an agent project:

- **MCP servers:** possible arbitrary command execution and unrestricted filesystem access.
- **Agent tools:** shell command execution and unrestricted network requests.
- **Prompts:** untrusted input interpolated into agent instructions.
- **GitHub Actions:** broad or write-level workflow permissions.
- **Dependencies:** install scripts that download executable content and unstable version references.
- **Secrets:** common hard-coded API keys and token patterns.

## Delivery Surfaces

### CLI

Run a local scan with:

```bash
node ./bin/sentraai.js scan /path/to/project
```

The command exits with status `2` when critical findings are detected, making it suitable for CI gates. Invalid commands and missing directories exit with status `1`.

### Dashboard

Start the local dashboard with:

```bash
npm start
```

The dashboard is available at `http://127.0.0.1:4173` by default and supports repository selection, full scans, category filtering, findings, coverage, and score review.

### GitHub Action

The composite action accepts a `path` input, defaulting to the checked-out repository:

```yaml
- uses: your-org/sentraai@main
  with:
    path: .
```

### API

The dashboard server exposes `GET /api/scan?path=/path/to/project` and returns JSON containing the score, findings, coverage, scanned file count, project root, and scan timestamp.

## Scoring

| Severity | Score deduction |
| --- | ---: |
| Critical | 24 |
| High | 14 |
| Medium | 7 |
| Low | 3 |

Scores are clamped to a minimum of `0`, and duplicate findings with the same title in the same file are removed.

## Known Limitations

- Detection is based on filename and regular-expression heuristics.
- Results can include false positives and may miss obfuscated or dynamically generated behavior.
- Scans operate on local files and do not resolve dependencies or execute project code.
- Scan history is not persisted.
- The local dashboard/API has no authentication and should remain on a trusted local interface.

See [README.md](README.md) for installation, configuration, project structure, and detailed usage documentation.