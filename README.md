# Notebooks

An [Obsidian](https://obsidian.md) plugin that opens [marimo](https://marimo.io) (`.py`) and [Jupyter](https://jupyter.org) (`.ipynb`) notebooks as interactive embedded views directly inside Obsidian panes.

> **Desktop only.** This plugin spawns native processes and is not available on mobile.

---

## Features

- **Marimo notebooks** (`.py`): launches `marimo edit` in headless mode and embeds the live UI in an Obsidian pane.
- **Jupyter notebooks** (`.ipynb`): launches `jupyter notebook` or `jupyter lab` and embeds the interface in an Obsidian pane.
- **Automatic interception**: clicking a `.py` or `.ipynb` file in the file explorer opens it as an embedded notebook instead of a plain text editor.
- **Context menu**: right-click any `.py` or `.ipynb` file and choose **Open as notebook**.
- **Command palette**: run the command **Notebooks: Open as notebook** on the active file.
- **Watched folders**: optionally restrict auto-open behaviour to specific folders; files outside those folders open normally.
- **Per-file server management**: each notebook gets its own server process on a unique port. Processes are stopped when the pane is closed.
- **Configurable paths and arguments**: set full executable paths and pass extra CLI arguments for both marimo and Jupyter.

---

## Requirements

| Requirement | Notes |
|---|---|
| Obsidian ≥ 1.0.0 | Desktop only |
| [marimo](https://marimo.io) | Required for `.py` notebooks |
| [Jupyter](https://jupyter.org/install) (`notebook` or `lab`) | Required for `.ipynb` notebooks |
| Python environment with the above installed | Make sure the executables are on PATH or configure their full paths in settings |

Install the notebook servers with pip:

```bash
pip install marimo
pip install notebook        # classic Jupyter interface
# or
pip install jupyterlab      # JupyterLab interface
```

Verify the installations:

```bash
marimo --version
jupyter --version
```

---

## Installation

### From the Obsidian community plugins directory (recommended)

1. Open **Settings → Community plugins**.
2. Disable **Restricted mode** if prompted.
3. Click **Browse**, search for **Notebooks**, and install.
4. Enable the plugin.

### Manual installation

1. Download `main.js`, `manifest.json`, and `styles.css` from the [latest release](https://github.com/Canna71/obsidian-notebooks/releases).
2. Copy the three files into `<vault>/.obsidian/plugins/obsidian-notebooks/`.
3. Reload Obsidian and enable the plugin under **Settings → Community plugins**.

---

## Getting started

### 1. Set executable paths

If `marimo` or `jupyter` are not on the PATH that Obsidian sees (common when using pyenv, conda, or virtual environments), supply the full path in settings.

Find the paths in your terminal:

```bash
which marimo   # e.g. /Users/you/.pyenv/shims/marimo
which jupyter  # e.g. /Users/you/.pyenv/shims/jupyter
```

Paste the output into **Settings → Notebooks → Marimo → Executable** and **Settings → Notebooks → Jupyter → Executable**.

### 2. (Optional) Configure watched folders

Go to **Settings → Notebooks → Watched folders** and add vault-relative folder paths, one per line:

```
notebooks
research/data
```

Files inside these folders open automatically as notebook views when clicked. Leave the field empty to open **all** `.py` and `.ipynb` files as notebooks automatically.

### 3. Open a notebook

| Method | How |
|---|---|
| Click | Click any `.py` or `.ipynb` file in the file explorer |
| Right-click | **Open as notebook** in the context menu |
| Command palette | **Notebooks: Open as notebook** |

---

## Settings reference

### Marimo

| Setting | Default | Description |
|---|---|---|
| Executable | `marimo` | Path to the marimo binary. Use the full path if marimo is not on Obsidian's PATH. |
| Base port | `2718` | Port for the first marimo server. Additional open notebooks use consecutive ports. |
| Extra arguments | _(empty)_ | Flags appended to every `marimo edit` invocation. `--headless` and `--no-token` are always included automatically. |

### Jupyter

| Setting | Default | Description |
|---|---|---|
| Executable | `jupyter` | Path to the jupyter binary. Use the full path if jupyter is not on Obsidian's PATH. |
| Interface | `notebook` | Choose `notebook` (classic) or `lab` (JupyterLab). |
| Base port | `8888` | Port for the first Jupyter server. Additional open notebooks use consecutive ports. |
| Extra arguments | _(empty)_ | Flags appended to every `jupyter` invocation. `--no-browser`, token disable, and XSRF disable are always included automatically. |

### Shared

| Setting | Default | Description |
|---|---|---|
| Extra PATH directories | _(empty)_ | Newline-separated directories prepended to PATH for all notebook servers. Useful when Obsidian's inherited PATH is missing your Python environment (e.g. pyenv shims or a virtualenv). |
| Watched folders | _(empty)_ | Newline-separated vault-relative folder paths. When non-empty, only `.py` and `.ipynb` files inside these folders open automatically as notebooks. Leave empty to auto-open all matching files. |

---

## Troubleshooting

### "marimo not found" / "jupyter not found"

Obsidian inherits a minimal PATH that may not include your Python environment. Fix with one of:

- **Extra PATH directories** setting: add the directory containing the executable (e.g. `/Users/you/.pyenv/shims`).
- **Executable** setting: enter the absolute path to the binary (e.g. `/usr/local/bin/marimo`).

Run `which marimo` or `which jupyter` in a terminal to find the correct path.

### Notebook opens blank or shows a login page

- **marimo**: the plugin passes `--no-token` automatically. If the login page appears, make sure you have not added conflicting token flags in **Extra arguments**.
- **Jupyter**: the plugin passes `--ServerApp.token= --ServerApp.disable_check_xsrf=True` automatically. If you have old values like `--NotebookApp.token=` in **Extra arguments**, remove them — those flags are rejected by Jupyter ≥ 7.

### File opens as plain text instead of a notebook view

- Confirm the plugin is enabled.
- Confirm the file extension is exactly `.py` or `.ipynb`.
- If **Watched folders** is configured, check that the file is inside one of the listed folders.

### Node.js not found (marimo Copilot integration)

marimo uses Node.js for its GitHub Copilot integration. Add the directory containing `node` to **Settings → Notebooks → Extra PATH directories**, e.g.:

```
/Users/you/.nvm/versions/node/v22.0.0/bin
```

### Relative imports fail inside a notebook

The server working directory is set to the folder containing the notebook, so imports relative to the notebook file should resolve correctly. If they fail, check that the imported files are in the same directory as the notebook.

### Notebook takes too long to start

The plugin waits up to 20 seconds for the server to accept connections. A **Retry** button appears on timeout. If your machine or notebook is slow, click **Retry** once the server has had more time to start.

### Orphaned processes after a crash

Servers are stopped automatically when their pane is closed. If Obsidian crashes, orphaned processes may remain. Kill them with:

```bash
pkill -f "marimo edit"
pkill -f "jupyter notebook"
pkill -f "jupyter lab"
```

---

## Development

```bash
git clone https://github.com/Canna71/obsidian-notebooks
cd obsidian-notebooks
npm install --legacy-peer-deps
npm run dev          # watch mode — rebuilds on every save
npm run build        # production build
```

Symlink or copy the plugin folder into your test vault's `.obsidian/plugins/` directory. Install the [Hot-Reload plugin](https://github.com/pjeby/hot-reload) for automatic plugin reloading during development.

Source layout:

| File | Purpose |
|---|---|
| `src/main.ts` | Plugin entry point, settings, command and event registration |
| `src/MarimoView.ts` | `ItemView` that hosts the embedded iframe |
| `src/ProcessManager.ts` | Spawns and tracks marimo / Jupyter server processes |
| `src/MarimoSettingTab.ts` | Settings UI |

---

## License

[MIT](LICENSE)
