import { App, normalizePath, PluginSettingTab, Setting } from "obsidian";
import type MarimoPlugin from "./main";

export class MarimoSettingTab extends PluginSettingTab {
	private plugin: MarimoPlugin;

	constructor(app: App, plugin: MarimoPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		// ── Marimo executable ──────────────────────────────────────────────
		new Setting(containerEl)
			.setName("Marimo executable")
			.setDesc(
				'The marimo binary to run. Use "marimo" if it is on your PATH, ' +
				"or paste the full path (e.g. /Users/you/.pyenv/shims/marimo). " +
				"Run `which marimo` in your terminal to find the path."
			)
			.addText((text) =>
				text
					.setPlaceholder("marimo")
					.setValue(this.plugin.settings.marimoPath)
					.onChange(async (value) => {
						this.plugin.settings.marimoPath =
							value.trim() || "marimo";
						await this.plugin.saveSettings();
					})
			);

		// ── Port ──────────────────────────────────────────────────────────
		new Setting(containerEl)
			.setName("Base port")
			.setDesc(
				"Port used by the first marimo server. Additional open notebooks use consecutive ports."
			)
			.addText((text) =>
				text
					.setPlaceholder("2718")
					.setValue(String(this.plugin.settings.marimoPort))
					.onChange(async (value) => {
						const n = parseInt(value.trim(), 10);
						if (!isNaN(n) && n >= 1024 && n <= 65_535) {
							this.plugin.settings.marimoPort = n;
							await this.plugin.saveSettings();
						}
					})
			);

		// ── Extra CLI args ─────────────────────────────────────────────────
		new Setting(containerEl)
			.setName("Extra command-line arguments")
			.setDesc(
				"Space-separated flags appended to every marimo edit invocation " +
					"(e.g. --no-token). --headless is always added automatically."
			)
			.addText((text) =>
				text
					.setPlaceholder("--no-token")
					.setValue(this.plugin.settings.extraArgs)
					.onChange(async (value) => {
						this.plugin.settings.extraArgs = value.trim();
						await this.plugin.saveSettings();
					})
			);

		// ── Watched folders ────────────────────────────────────────────────
		new Setting(containerEl).setHeading().setName("Watched folders");

		new Setting(containerEl)
			.setName("Folders")
			.setDesc(
				"Vault-relative folder paths (one per line). " +
					"Python files inside these folders open automatically as marimo notebooks. " +
					"Leave empty to disable automatic opening (you can still use the command or right-click menu)."
			)
			.addTextArea((text) => {
				text.setPlaceholder("notebooks\nscripts/marimo")
					.setValue(this.plugin.settings.watchedFolders.join("\n"))
					.onChange(async (value) => {
						this.plugin.settings.watchedFolders = value
							.split("\n")
							.map((line) => normalizePath(line.trim()))
							.filter((line) => line.length > 0 && line !== "/");
						await this.plugin.saveSettings();
					});
				text.inputEl.rows = 6;
				text.inputEl.addClass("marimo-folders-textarea");
				return text;
			});
	}
}
