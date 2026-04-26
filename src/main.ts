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
	marimoPort: number;
	marimoPath: string;
	extraArgs: string;
}

const DEFAULT_SETTINGS: MarimoPluginSettings = {
	watchedFolders: [],
	marimoPort: 2718,
	marimoPath: "marimo",
	extraArgs: "",
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

		// Auto-open .py files in watched folders as marimo notebooks.
		this.registerEvent(
			this.app.workspace.on("file-open", (file: TFile | null) => {
				if (!file || !this.isWatched(file)) return;
				// Replace the current leaf's view with the marimo view so we
				// don't leave a raw-text tab behind.
				const leaf = this.app.workspace.getMostRecentLeaf();
				if (!leaf || leaf.getViewState().type === MARIMO_VIEW_TYPE)
					return;
				leaf.setViewState({
					type: MARIMO_VIEW_TYPE,
					active: true,
					state: { filePath: file.path },
				});
			})
		);

		// Context-menu entry on any .py file.
		this.registerEvent(
			this.app.workspace.on(
				"file-menu",
				(menu: Menu, file: TAbstractFile) => {
					if (!(file instanceof TFile) || file.extension !== "py")
						return;
					menu.addItem((item) =>
						item
							.setTitle("Open as marimo notebook")
							.setIcon("code-2")
							.onClick(() => this.openMarimoView(file))
					);
				}
			)
		);

		// Command palette entry — only active when a .py file is open.
		this.addCommand({
			id: "open-as-marimo-notebook",
			name: "Open as marimo notebook",
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

	/** True when the file should auto-open as a marimo notebook. */
	isWatched(file: TFile): boolean {
		if (file.extension !== "py") return false;
		if (this.settings.watchedFolders.length === 0) return false;
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
				state.state?.filePath === file.path
			) {
				target = leaf;
			}
		});

		if (target) {
			workspace.revealLeaf(target);
			return;
		}

		// Open in a new tab.
		const leaf = workspace.getLeaf("tab");
		await leaf.setViewState({
			type: MARIMO_VIEW_TYPE,
			active: true,
			state: { filePath: file.path },
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
