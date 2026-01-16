# MinerU CLI Zotero Plugin

Zotero 7 plugin that calls the MinerU CLI to parse PDF attachments and attach the resulting Markdown file as a linked attachment.

## Features
- Context menu action on parent items and PDF attachments.
- Batch parsing for multi-selection.
- Uses a temporary `mineru.json` file to avoid passing the API key on the command line.
- Per-PDF images directory: `Images_<attachmentKey>` with Markdown references rewritten by the CLI.

## Requirements
- Zotero 7
- MinerU CLI installed (Python or Rust version)
- CLI supports `--config` and `--images-dir`

## Configuration (Zotero Preferences)
Open `Tools -> Add-ons -> MinerU CLI for Zotero -> Preferences`:
- `CLI path`: full path to the executable (e.g., `C:\\path\\to\\mineru-cli.exe`)
- `Endpoint`: defaults to `https://mineru.net/api/v4`
- `API key`: your MinerU API key

## Usage
1. Select one or more items (parent items or PDF attachments).
2. Right-click and choose `MinerU: Parse PDF to Markdown`.
3. The plugin runs the CLI per PDF and links the generated Markdown to the parent item.

If a Markdown file already exists:
- If it is already linked, the plugin skips it.
- If it is not linked, the plugin links it without re-running the CLI.

## Build XPI
From the plugin root:

```bash
bash ./make-zips
```

Then install the XPI in Zotero (`Tools -> Add-ons -> Install Add-on From File`).

## Update manifest (GitHub releases)
Zotero requires `applications.zotero.update_url` and `strict_max_version` in `manifest.json`.  
This project uses a GitHub-hosted update manifest:

- `update_url`: `https://raw.githubusercontent.com/leike0813/mineru-cli-zotero/main/updates.json`
- `update_link` (release asset): `https://github.com/leike0813/mineru-cli-zotero/releases/download/v<version>/mineru-cli-zotero.xpi`

To publish a new version:
1. Update `src/manifest.json` version.
2. Run `bash ./make-zips` to build `build/mineru-cli-zotero.xpi` and `updates.json`.
3. Create a GitHub Release tagged `v<version>` and upload `mineru-cli-zotero.xpi`.
4. Commit and push `updates.json` to `main`.

## Troubleshooting install errors
If Zotero says the add-on is “not compatible” and it doesn’t appear in the add-ons list, the most common cause is an incorrectly packaged XPI.

Open the `.xpi` with 7-Zip and check the top-level entries:
- MUST contain `manifest.json` at the root (not `src/manifest.json`)
- MUST contain `bootstrap.js` at the root

Rebuild using `python ./make-xpi.py` and install the generated `build/mineru-cli-zotero.xpi`.

## Notes
- `manifest.json` does not include an update URL yet. Add one when you publish updates.
