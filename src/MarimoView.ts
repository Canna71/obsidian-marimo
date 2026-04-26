import { createConnection } from "net";
import {
	FileSystemAdapter,
	ItemView,
	ViewStateResult,
	WorkspaceLeaf,
} from "obsidian";
import type MarimoPlugin from "./main";

export const MARIMO_VIEW_TYPE = "marimo-notebook";

interface MarimoViewState {
	file?: string;
	filePath?: string; // legacy key, kept for workspace restore compatibility
}

export class MarimoView extends ItemView {
	private plugin: MarimoPlugin;
	private filePath = "";

	constructor(leaf: WorkspaceLeaf, plugin: MarimoPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return MARIMO_VIEW_TYPE;
	}

	getDisplayText(): string {
		if (!this.filePath) return "Notebook";
		const name = this.filePath.split("/").pop() ?? this.filePath;
		return name.replace(/\.(py|ipynb)$/, "");
	}

	getIcon(): string {
		return "code-2";
	}

	async setState(state: MarimoViewState, result: ViewStateResult): Promise<void> {
		// Obsidian passes `state.file` when opening via registerExtensions.
		// Our own openMarimoView used `filePath`; keep that as a fallback so
		// any workspace state saved with the old key still restores correctly.
		const incoming = (state?.file ?? state?.filePath ?? "") as string;
		if (incoming && incoming !== this.filePath) {
			if (this.filePath) {
				this.plugin.processManager.kill(this.absolutePath(this.filePath));
			}
			this.filePath = incoming;
			const tfile = this.app.vault.getFileByPath(this.filePath);
			if (tfile && !this.plugin.isWatched(tfile)) {
				this.renderNotWatched();
			} else {
				await this.renderContent();
			}
		}
		await super.setState(state, result);
	}

	getState(): Record<string, unknown> {
		return { file: this.filePath };
	}

	async onOpen(): Promise<void> {
		// Content is populated via setState when the view is first attached.
	}

	async onClose(): Promise<void> {
		if (this.filePath) {
			this.plugin.processManager.kill(this.absolutePath(this.filePath));
		}
	}

	// ── private ──────────────────────────────────────────────────────────────

	private absolutePath(vaultPath: string): string {
		const adapter = this.app.vault.adapter;
		if (adapter instanceof FileSystemAdapter) {
			return adapter.getFullPath(vaultPath);
		}
		throw new Error("This plugin requires a file-system vault (desktop only).");
	}

	private async renderContent(): Promise<void> {
		const { contentEl } = this;
		contentEl.empty();

		const loading = contentEl.createDiv({ cls: "marimo-loading" });
		loading.createDiv({ cls: "marimo-spinner" });
		loading.createEl("p", {
			cls: "marimo-loading-text",
			text: "Starting marimo…",
		});

		let absolutePath: string;
		try {
			absolutePath = this.absolutePath(this.filePath);
		} catch (e) {
			this.showError((e as Error).message);
			return;
		}

		const extraPathDirs = this.plugin.settings.extraPath
			.split("\n")
			.map((s) => s.trim())
			.filter((s) => s.length > 0);

		const isJupyter = this.filePath.endsWith(".ipynb");

		let url: string;
		let port: number;
		try {
			if (isJupyter) {
				({ url, port } = this.plugin.processManager.startJupyter(
					absolutePath,
					this.plugin.settings.jupyterPort,
					this.plugin.settings.jupyterPath,
					this.plugin.settings.jupyterMode,
					this.plugin.settings.jupyterExtraArgs
						.split(/\s+/)
						.filter((s) => s.length > 0),
					extraPathDirs
				));
			} else {
				({ url, port } = this.plugin.processManager.start(
					absolutePath,
					this.plugin.settings.marimoPort,
					this.plugin.settings.marimoPath,
					this.plugin.settings.extraArgs
						.split(/\s+/)
						.filter((s) => s.length > 0),
					extraPathDirs
				));
			}
		} catch (e) {
			this.showError(`Failed to start notebook server: ${(e as Error).message}`);
			return;
		}

		const ready = await this.pollUntilReady(port, 20_000);
		contentEl.empty();

		if (!ready) {
			const err = contentEl.createDiv({ cls: "marimo-error" });
			err.createEl("p", { text: "Marimo did not respond in time." });
			err.createEl("p", { text: `You can try opening it directly: ${url}` });
			const retryBtn = err.createEl("button", {
				cls: "mod-cta",
				text: "Retry",
			});
			retryBtn.addEventListener("click", () => this.renderContent());
			return;
		}

		// marimo is running with --no-token so a plain iframe works fine.
		const iframe = contentEl.createEl("iframe", {
			cls: "marimo-iframe",
			attr: { src: url },
		});
		void iframe;
	}

	private renderNotWatched(): void {
		const { contentEl } = this;
		contentEl.empty();
		const box = contentEl.createDiv({ cls: "marimo-not-watched" });
		box.createEl("p", {
			cls: "marimo-not-watched-title",
			text: "Not a watched marimo notebook",
		});
		box.createEl("p", {
			text: `"${this.filePath}" is not inside any watched folder.`,
		});
		box.createEl("p", {
			text: "Add its folder in Settings → Marimo notebooks → Watched folders, or open it manually:",
		});
		const btn = box.createEl("button", {
			cls: "mod-cta",
			text: "Open as marimo notebook",
		});
		btn.addEventListener("click", () => this.renderContent());
	}

	private showError(message: string): void {
		const { contentEl } = this;
		contentEl.empty();
		const err = contentEl.createDiv({ cls: "marimo-error" });
		err.createEl("p", { cls: "marimo-error-title", text: "Error" });
		err.createEl("p", { text: message });
	}

	private pollUntilReady(port: number, timeoutMs: number): Promise<boolean> {
		return new Promise((resolve) => {
			const deadline = Date.now() + timeoutMs;

			function attempt() {
				const socket = createConnection({ host: "127.0.0.1", port });
				socket.on("connect", () => {
					socket.destroy();
					resolve(true);
				});
				socket.on("error", () => {
					socket.destroy();
					if (Date.now() < deadline) {
						setTimeout(attempt, 600);
					} else {
						resolve(false);
					}
				});
			}

			attempt();
		});
	}
}
