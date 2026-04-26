import {
	FileSystemAdapter,
	ItemView,
	ViewStateResult,
	WorkspaceLeaf,
} from "obsidian";
import type MarimoPlugin from "./main";

export const MARIMO_VIEW_TYPE = "marimo-notebook";

interface MarimoViewState {
	filePath: string;
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
		if (!this.filePath) return "Marimo notebook";
		const name = this.filePath.split("/").pop() ?? this.filePath;
		return name.replace(/\.py$/, "");
	}

	getIcon(): string {
		return "code-2";
	}

	async setState(state: MarimoViewState, result: ViewStateResult): Promise<void> {
		const incoming = state?.filePath ?? "";
		if (incoming && incoming !== this.filePath) {
			if (this.filePath) {
				this.plugin.processManager.kill(this.absolutePath(this.filePath));
			}
			this.filePath = incoming;
			await this.renderContent();
		}
		await super.setState(state, result);
	}

	getState(): Record<string, unknown> {
		return { filePath: this.filePath };
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

		// Show a loading state while the server starts.
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

		let url: string;
		try {
			url = this.plugin.processManager.start(
				absolutePath,
				this.plugin.settings.marimoPort,
				this.plugin.settings.marimoPath,
				this.plugin.settings.extraArgs
					.split(/\s+/)
					.filter((s) => s.length > 0)
			);
		} catch (e) {
			this.showError(`Failed to start marimo: ${(e as Error).message}`);
			return;
		}

		const ready = await this.pollUntilReady(url, 20_000);
		contentEl.empty();

		if (!ready) {
			const err = contentEl.createDiv({ cls: "marimo-error" });
			err.createEl("p", { text: "Marimo did not respond in time." });
			err.createEl("p", {
				text: `You can try opening it directly: ${url}`,
			});
			const retryBtn = err.createEl("button", {
				cls: "mod-cta",
				text: "Retry",
			});
			retryBtn.addEventListener("click", () => this.renderContent());
			return;
		}

		const iframe = contentEl.createEl("iframe", {
			cls: "marimo-iframe",
			attr: { src: url },
		});
		// Keep TS happy — the element is inserted by createEl.
		void iframe;
	}

	private showError(message: string): void {
		const { contentEl } = this;
		contentEl.empty();
		const err = contentEl.createDiv({ cls: "marimo-error" });
		err.createEl("p", { cls: "marimo-error-title", text: "Error" });
		err.createEl("p", { text: message });
	}

	private async pollUntilReady(url: string, timeoutMs: number): Promise<boolean> {
		const deadline = Date.now() + timeoutMs;
		while (Date.now() < deadline) {
			try {
				const res = await fetch(url, {
					signal: AbortSignal.timeout(2000),
				});
				if (res.status < 500) return true;
			} catch {
				// Not ready yet — keep polling.
			}
			await sleep(600);
		}
		return false;
	}
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
