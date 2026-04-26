# Obsidian Marimo

Open **marimo notebooks** (`.py`) and **Jupyter notebooks** (`.ipynb`) as fully interactive embedded views directly inside [Obsidian](https://obsidian.md).

The plugin launches the appropriate notebook server in the background and renders it in an Obsidian pane — no browser tab switching required.

> **Desktop only.** This plugin spawns native processes and is not available on mobile.

---

## Features

- Open `.py` marimo notebooks via `marimo edit` embedded in Obsidian
- Open `.ipynb` Jupyter notebooks via `jupyter notebook` or `jupyter lab` embedded in Obsidian
- Configurable **watched folders** — files in those folders open automatically as notebooks; files outside show a prompt
- Multiple notebooks can be open simultaneously, each on its own port
- Servers are started on demand and shut down automatically when the tab is closed
- Right-click context menu and command palette entries for any `.py` or `.ipynb` file

---

## Requirements

| Requirement | Notes |
|---|---|
| Obsidian 1.0+ | Desktop only |
| [marimo](https://marimo.io) | For `.py` notebooks |
| [Jupyter](https://jupyter.org) | For `.ipynb` notebooks |

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

### From the Obsidian community plugin browser _(coming soon)_

1. Open **Settings → Community plugins → Browse**.
2. Search for **Marimo notebooks**.
3. Click **Install**, then **Enable**.

### Manual install

1. Download the [latest release](https://github.com/Canna71/obsidian-marimo/releases/latest) and unzip it into your vault's `.obsidian/plugins/obsidian-marimo/` folder.
2. In Obsidian → **Settings → Community plugins**, enable **Marimo notebooks**.

---

## Getting started

### 1. Set executable paths

If `marimo` or `jupyter` are not on the PATH that Obsidian sees (common when using pyenv, conda, or nvm), supply the full path in settings.

Find the paths in your terminal:

```bash
which marimo   # e.g. /Users/you/.pyenv/shims/marimo
which jupyter  # e.g. /Users/you/.pyenv/shims/jupyter
```

Paste the output into **Settings → Marimo notebooks → Marimo → Executable** and **Settings → Marimo notebooks → Jupyter → Executable**.

### 2. (Optional) Add watched folders

Go to **Settings → Marimo notebooks → Watched folders** and add vault-relative folder paths, one per line:

```
notebooks
research/marimo
```

Files inside these folders open automatically as notebook views when clicked. Files outside watched folders still open in the notebook view but show a placeholder with an **Open as notebook** button.

Leave the field empty to open **all** `.py` and `.ipynb` files as notebooks automatically.

### 3. Open a notebook

| Method | How |
|---|---|
| Click | Click any `.py` or `.ipynb` file in the file explorer |
| Right-click | **Open as marimo notebook** in the context menu |
| Command palette | **Marimo notebooks: Open as marimo notebook** |

---

## Settings reference

### Marimo

| Setting | Default | Description |
|---|---|---|
| Executable | `marimo` | Path to the marimo binary. Use the full path if marimo is not on Obsidian's PATH. |
| Base port | `2718` | Port for the first marimo server. Additional open notebooks use consecutive ports. |
| Extra arguments | _(empty)_ | Space-separated flags appended to every `marimo edit` invocation. `--headless` and `--no-token` are always added automatically. |

### Jupyter

| Setting | Default | Description |
|---|---|---|
| Executable | `jupyter` | Path to the jupyter binary. Use the full path if jupyter is not on Obsidian's PATH. |
| Base port | `8888` | Port for the first Jupyter server. Additional open notebooks use consecutive ports. |
| Interface | Classic notebook | Choose between the classic Notebook interface and JupyterLab. |
| Extra arguments | _(empty)_ | Space-separated flags appended to every `jupyter` invocation. `--no-browser`, token disable, and XSRF disable are always added automatically. For Jupyter < 7 add `--NotebookApp.token= --NotebookApp.disable_check_xsrf=True`. |

### Shared

| Setting | Default | Description |
|---|---|---|
| Extra PATH directories | _(empty)_ | Directories prepended to PATH for all notebook servers, one per line. Use this to make `node`, `python`, or other tools visible to the servers when Obsidian cannot find them. |
| Watched folders | _(empty)_ | Vault-relative folder paths. `.py` and `.ipynb` files inside these folders open automatically as notebooks. Leave empty to open all such files automatically. |

---

## Troubleshooting

### Executable not found

Obsidian inherits a minimal system PATH that often omits user-installed tools (pyenv, conda, Homebrew, nvm). Fix: paste the full executable path into the relevant **Executable** setting (see [Getting started](#1-set-executable-paths)).

### Node.js not found (marimo Copilot)

marimo uses Node.js for GitHub Copilot integration. Add the directory containing `node` to **Settings → Marimo notebooks → Extra PATH directories**, e.g.:

```
/Users/you/.nvm/versions/node/v22.0.0/bin
```

### Jupyter: XSRF or token errors

For Jupyter < 7, add to **Jupyter → Extra arguments**:

```
--NotebookApp.token= --NotebookApp.disable_check_xsrf=True
```

### Notebook takes too long to start

The plugin waits up to 20 seconds for the server to accept connections. If your machine is slow or the notebook is large, try reloading the tab after the server is ready. A **Retry** button appears on timeout.

### Relative imports fail inside a notebook

The server working directory is set to the notebook's own folder, so `import`s relative to the notebook file should resolve correctly. If they don't, check that the files being imported are in the same folder as the notebook.

---

## Development

```bash
git clone https://github.com/Canna71/obsidian-marimo
cd obsidian-marimo
npm install --legacy-peer-deps
npm run dev        # watch mode — rebuilds on every save
```

Copy or symlink the plugin folder into your test vault's `.obsidian/plugins/` directory. After each rebuild, reload the plugin in Obsidian via **Settings → Community plugins → Marimo notebooks → Reload**, or install the [Hot-Reload plugin](https://github.com/pjeby/hot-reload) for automatic reloading.

To produce a release build:

```bash
npm run build
```

---

## License

[MIT](LICENSE)
