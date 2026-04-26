# Marimo notebooks for Obsidian

Open `.py` marimo notebooks as interactive web views directly inside Obsidian.

## How it works

When you open a Python file that lives in one of your configured **watched folders**, the plugin launches `marimo edit <file>` in the background and embeds the resulting web UI in an Obsidian pane via an `<iframe>`. The marimo server process is killed automatically when you close the tab or unload the plugin.

## Requirements

- Obsidian **1.0.0** or later (desktop only)
- [marimo](https://marimo.io) installed and accessible on your PATH:

  ```bash
  pip install marimo
  # verify
  marimo --version
  ```

## Installation

### Manual (development)

1. Clone or copy this folder into your vault's `.obsidian/plugins/obsidian-marimo/`.
2. In that folder, run:

   ```bash
   npm install --legacy-peer-deps
   npm run build
   ```

3. In Obsidian → **Settings → Community plugins**, disable Safe mode, then enable **Marimo notebooks**.

## Usage

### Automatic opening (watched folders)

1. Go to **Settings → Marimo notebooks → Watched folders**.
2. Add vault-relative paths (one per line), e.g.:

   ```
   notebooks
   research/marimo
   ```

3. Click any `.py` file inside a watched folder — it opens as a marimo notebook instead of plain text.

### Manual opening

- **Right-click** any `.py` file in the file explorer → **Open as marimo notebook**.
- **Command palette** → **Marimo notebooks: Open as marimo notebook** (available when a `.py` file is the active editor).

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| Marimo executable | `marimo` | Path to the marimo binary. Supply an absolute path if it is not on your PATH. |
| Base port | `2718` | Port used by the first marimo server. Additional simultaneously open notebooks use consecutive ports. |
| Extra command-line arguments | _(empty)_ | Space-separated flags appended to every `marimo edit` call. `--no-browser` is always added automatically. Use `--no-token` here if your marimo version requires it. |
| Watched folders | _(empty)_ | Vault-relative folder paths that trigger automatic opening. |

## Development

```bash
npm install --legacy-peer-deps
npm run dev        # watch mode — rebuilds on every save
```

After each rebuild, reload the plugin in Obsidian via **Settings → Community plugins → Marimo notebooks → Reload** (or use the [Hot-Reload plugin](https://github.com/pjeby/hot-reload) for automatic reloading).

## Test plan

### Desktop

- [ ] `.py` file in a watched folder opens in a marimo iframe (not plain text).
- [ ] `.py` file outside watched folders opens as plain text; right-click → "Open as marimo notebook" opens it in a marimo tab.
- [ ] Two different `.py` notebooks can be open simultaneously (each on its own port).
- [ ] Closing a marimo tab kills the corresponding marimo process.
- [ ] Reloading/disabling the plugin kills all marimo processes.
- [ ] Settings changes persist across Obsidian restarts.
- [ ] Invalid marimo executable path shows a helpful error notice.
- [ ] Marimo not installed shows an install hint notice.

### Mobile

This plugin is **desktop only** (`isDesktopOnly: true` in `manifest.json`) because it spawns native child processes. No mobile testing is required.
