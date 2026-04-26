import {
	Menu,
	normalizePath,
	Plugin,
	TAbstractFile,
	TFile,
	WorkspaceLeaf,
} from "obsidian";
import { MARIMO_VIEW_TYPE, MarimoView } from "./MarimoView";
import { MarimoSettingTab } from "./MarimoSettingTab";
import { ProcessManager } from "./ProcessManager";

export interface MarimoPluginSettings {
	watchedFolders: string[];
	// marimo
	marimoPort: number;
	marimoPath: string;
	extraArgs: string;
	extraPath: string;
	// jupyter
	jupyterPort: number;
	jupyterPath: string;
	jupyterMode: string;
	jupyterExtraArgs: string;
}

const DEFAULT_SETTINGS: MarimoPluginSettings = {
	watchedFolders: [],
	// marimo
	marimoPort: 2718,
	marimoPath: "marimo",
	extraArgs: "",
	extraPath: "",
	// jupyter
	jupyterPort: 8888,
	jupyterPath: "jupyter",
	jupyterMode: "notebook",
	jupyterExtraArgs: "",
};

export default class MarimoPlugin extends Plugin {
	settings: MarimoPluginSettings;
	processManager: ProcessManager;

	async onload() {
		await this.loadSettings();

		this.processManager = new ProcessManager();

		this.registerView(
			MARIMO_VIEW_TYPE,
			(leaf) => new MarimoView(leaf, this)
		);

		// Register both extensions so Obsidian routes them to our view.
		// The view itself decides whether to start a server (watched folder)
		// or show a placeholder (not watched).
		this.registerExtensions(["py", "ipynb"], MARIMO_VIEW_TYPE);

		// Context-menu entry on any .py file.
		this.registerEvent(
			this.app.workspace.on(
				"file-menu",
				(menu: Menu, file: TAbstractFile) => {
					if (!(file instanceof TFile) || (file.extension !== "py" && file.extension !== "ipynb"))
						return;
					menu.addItem((item) =>
						item
							.setTitle("Open as notebook")
							.setIcon("code-2")
							.onClick(() => this.openMarimoView(file))
					);
				}
			)
		);

		// Command palette entry — only active when a .py file is open.
		this.addCommand({
			id: "open-as-notebook",
			name: "Open as notebook",
			checkCallback: (checking: boolean) => {
				const file = this.app.workspace.getActiveFile();
				if (file?.extension !== "py") return false;
				if (!checking) this.openMarimoView(file);
				return true;
			},
		});

		this.addSettingTab(new MarimoSettingTab(this.app, this));
	}

	onunload() {
		this.processManager.killAll();
	}

	// ── helpers ──────────────────────────────────────────────────────────────

	/** True when the file should auto-start a notebook server. */
	isWatched(file: TFile): boolean {
		if (file.extension !== "py" && file.extension !== "ipynb") return false;
		// No folders configured → treat every .py file as a marimo notebook.
		if (this.settings.watchedFolders.length === 0) return true;
		const fp = normalizePath(file.path);
		return this.settings.watchedFolders.some((folder) => {
			const f = normalizePath(folder);
			return fp.startsWith(f + "/") || fp === f;
		});
	}

	async openMarimoView(file: TFile): Promise<void> {
		const { workspace } = this.app;

		// Reuse an existing marimo leaf for the same file if one is open.
		let target: WorkspaceLeaf | null = null;
		workspace.iterateAllLeaves((leaf) => {
			const state = leaf.getViewState();
			if (
				state.type === MARIMO_VIEW_TYPE &&
				state.state?.file === file.path
			) {
				target = leaf;
			}
		});

		if (target) {
			workspace.revealLeaf(target);
			return;
		}

		const leaf = workspace.getLeaf("tab");
		await leaf.setViewState({
			type: MARIMO_VIEW_TYPE,
			active: true,
			state: { file: file.path },
		});
		workspace.revealLeaf(leaf);
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
