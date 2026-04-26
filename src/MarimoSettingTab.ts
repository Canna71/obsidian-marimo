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

		// ── Marimo ────────────────────────────────────────────────────────────
		new Setting(containerEl).setHeading().setName("Marimo");

		new Setting(containerEl)
			.setName("Executable")
			.setDesc(
				'The marimo binary. Use "marimo" if it is on your PATH, or paste ' +
				"the full path. Run `which marimo` in your terminal to find it."
			)
			.addText((text) =>
				text
					.setPlaceholder("marimo")
					.setValue(this.plugin.settings.marimoPath)
					.onChange(async (value) => {
						this.plugin.settings.marimoPath = value.trim() || "marimo";
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Base port")
			.setDesc("Port for the first marimo server. Additional open notebooks use consecutive ports.")
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

		new Setting(containerEl)
			.setName("Extra arguments")
			.setDesc(
				"Space-separated flags appended to every marimo edit invocation. " +
				"--headless and --no-token are always added automatically."
			)
			.addText((text) =>
				text
					.setPlaceholder("")
					.setValue(this.plugin.settings.extraArgs)
					.onChange(async (value) => {
						this.plugin.settings.extraArgs = value.trim();
						await this.plugin.saveSettings();
					})
			);

		// ── Jupyter ───────────────────────────────────────────────────────────
		new Setting(containerEl).setHeading().setName("Jupyter");

		new Setting(containerEl)
			.setName("Executable")
			.setDesc(
				'The jupyter binary. Use "jupyter" if it is on your PATH, or paste ' +
				"the full path. Run `which jupyter` in your terminal to find it."
			)
			.addText((text) =>
				text
					.setPlaceholder("jupyter")
					.setValue(this.plugin.settings.jupyterPath)
					.onChange(async (value) => {
						this.plugin.settings.jupyterPath = value.trim() || "jupyter";
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Base port")
			.setDesc("Port for the first Jupyter server. Additional open notebooks use consecutive ports.")
			.addText((text) =>
				text
					.setPlaceholder("8888")
					.setValue(String(this.plugin.settings.jupyterPort))
					.onChange(async (value) => {
						const n = parseInt(value.trim(), 10);
						if (!isNaN(n) && n >= 1024 && n <= 65_535) {
							this.plugin.settings.jupyterPort = n;
							await this.plugin.saveSettings();
						}
					})
			);

		new Setting(containerEl)
			.setName("Interface")
			.setDesc("Classic Notebook interface or JupyterLab.")
			.addDropdown((drop) =>
				drop
					.addOption("notebook", "Classic notebook")
					.addOption("lab", "JupyterLab")
					.setValue(this.plugin.settings.jupyterMode)
					.onChange(async (value) => {
						this.plugin.settings.jupyterMode = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Extra arguments")
			.setDesc(
				"Space-separated flags appended to every jupyter invocation. " +
				"--no-browser, token disable, and XSRF disable are always added automatically."
			)
			.addText((text) =>
				text
					.setPlaceholder("--ServerApp.token=")
					.setValue(this.plugin.settings.jupyterExtraArgs)
					.onChange(async (value) => {
						this.plugin.settings.jupyterExtraArgs = value.trim();
						await this.plugin.saveSettings();
					})
			);

		// ── Shared ────────────────────────────────────────────────────────────
		new Setting(containerEl).setHeading().setName("Shared");

		new Setting(containerEl)
			.setName("Extra PATH directories")
			.setDesc(
				"Directories prepended to PATH for all notebook servers (one per line). " +
				"Add directories containing node, python, jupyter, or other tools " +
				"that cannot be found when launching from Obsidian. " +
				'Run "echo $PATH" in your terminal to see candidates.'
			)
			.addTextArea((text) => {
				text
					.setPlaceholder(
						"/Users/you/.nvm/versions/node/v22.0.0/bin\n/opt/homebrew/bin"
					)
					.setValue(this.plugin.settings.extraPath)
					.onChange(async (value) => {
						this.plugin.settings.extraPath = value;
						await this.plugin.saveSettings();
					});
				text.inputEl.rows = 4;
				text.inputEl.addClass("marimo-folders-textarea");
				return text;
			});

		// ── Watched folders ───────────────────────────────────────────────────
		new Setting(containerEl).setHeading().setName("Watched folders");

		new Setting(containerEl)
			.setName("Folders")
			.setDesc(
				"Vault-relative folder paths (one per line). " +
				".py and .ipynb files inside these folders open automatically as notebook servers. " +
				"Leave empty to open all .py and .ipynb files automatically."
			)
			.addTextArea((text) => {
				text
					.setPlaceholder("notebooks\nresearch/jupyter")
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
