import { ChildProcess, spawn } from "child_process";
import { basename, delimiter, dirname } from "path";
import { Notice } from "obsidian";

interface MarimoProcess {
	process: ChildProcess;
	port: number;
}

export class ProcessManager {
	private processes: Map<string, MarimoProcess> = new Map();

	start(
		absolutePath: string,
		basePort: number,
		marimoExecutable: string,
		extraArgs: string[],
		extraPathDirs: string[]
	): { url: string; port: number } {
		const existing = this.processes.get(absolutePath);
		if (existing) {
			return { url: `http://localhost:${existing.port}`, port: existing.port };
		}

		const port = this.nextAvailablePort(basePort);
		const [marimoCmd, ...marimoPrefix] = marimoExecutable.trim().split(/\s+/);
		const args = [
			...marimoPrefix,
			"edit",
			absolutePath,
			"--port", String(port),
			"--headless",
			"--no-token",
			...extraArgs,
		];

		const cwd = dirname(absolutePath);
		const envPath = [...extraPathDirs, process.env.PATH ?? ""].join(delimiter);
		console.log("[marimo] spawning:", marimoCmd, args.join(" "));
		console.log("[marimo] cwd:", cwd);
		console.log("[marimo] PATH:", envPath);

		const proc = spawn(marimoCmd, args, {
			cwd,
			detached: false,
			stdio: ["ignore", "pipe", "pipe"],
			env: { ...process.env, PATH: envPath },
		});

		proc.stdout?.on("data", (d: Buffer) =>
			console.log("[marimo stdout]", d.toString().trimEnd())
		);
		proc.stderr?.on("data", (d: Buffer) =>
			console.log("[marimo stderr]", d.toString().trimEnd())
		);

		proc.on("error", (err: NodeJS.ErrnoException) => {
			this.processes.delete(absolutePath);
			if (err.code === "ENOENT") {
				new Notice(
					`Marimo executable not found: "${marimoCmd}"\n` +
					`Set the full path in Settings → Notebooks.`
				);
			} else {
				new Notice(`Marimo process error: ${err.message}`);
			}
		});

		proc.on("exit", (code: number | null) => {
			this.processes.delete(absolutePath);
			if (code !== null && code !== 0) {
				new Notice(`Marimo exited unexpectedly (code ${code}).`);
			}
		});

		this.processes.set(absolutePath, { process: proc, port });
		return { url: `http://localhost:${port}`, port };
	}

	kill(absolutePath: string): void {
		const entry = this.processes.get(absolutePath);
		if (!entry) return;
		entry.process.kill();
		this.processes.delete(absolutePath);
	}

	killAll(): void {
		for (const { process } of this.processes.values()) {
			try {
				process.kill();
			} catch {
				// Already dead — nothing to do.
			}
		}
		this.processes.clear();
	}

	startJupyter(
		absolutePath: string,
		basePort: number,
		jupyterExecutable: string,
		mode: string,
		extraArgs: string[],
		extraPathDirs: string[]
	): { url: string; port: number } {
		const existing = this.processes.get(absolutePath);
		if (existing) {
			return {
				url: this.jupyterUrl(mode, existing.port, basename(absolutePath)),
				port: existing.port,
			};
		}

		const port = this.nextAvailablePort(basePort);
		const file = basename(absolutePath);
		const [jupyterCmd, ...jupyterPrefix] = jupyterExecutable.trim().split(/\s+/);
		const args = [
			...jupyterPrefix,
			mode,           // "notebook" or "lab"
			file,
			"--no-browser",
			"--port", String(port),
			"--ServerApp.token=",
			"--ServerApp.disable_check_xsrf=True",
			...extraArgs,
		];

		const cwd = dirname(absolutePath);
		const envPath = [...extraPathDirs, process.env.PATH ?? ""].join(delimiter);
		console.log("[jupyter] spawning:", jupyterCmd, args.join(" "));
		console.log("[jupyter] cwd:", cwd);
		console.log("[jupyter] PATH:", envPath);

		const proc = spawn(jupyterCmd, args, {
			cwd,
			detached: false,
			stdio: ["ignore", "pipe", "pipe"],
			env: { ...process.env, PATH: envPath },
		});

		proc.stdout?.on("data", (d: Buffer) =>
			console.log("[jupyter stdout]", d.toString().trimEnd())
		);
		proc.stderr?.on("data", (d: Buffer) =>
			console.log("[jupyter stderr]", d.toString().trimEnd())
		);

		proc.on("error", (err: NodeJS.ErrnoException) => {
			this.processes.delete(absolutePath);
			if (err.code === "ENOENT") {
				new Notice(
					`Jupyter executable not found: "${jupyterCmd}"\n` +
					`Set the full path in Settings → Notebooks.`
				);
			} else {
				new Notice(`Jupyter process error: ${err.message}`);
			}
		});

		proc.on("exit", (code: number | null) => {
			this.processes.delete(absolutePath);
			if (code !== null && code !== 0) {
				new Notice(`Jupyter exited unexpectedly (code ${code}).`);
			}
		});

		this.processes.set(absolutePath, { process: proc, port });
		return { url: this.jupyterUrl(mode, port, file), port };
	}

	private jupyterUrl(mode: string, port: number, filename: string): string {
		const encoded = encodeURIComponent(filename);
		return mode === "lab"
			? `http://localhost:${port}/lab/tree/${encoded}`
			: `http://localhost:${port}/notebooks/${encoded}`;
	}

	isRunning(absolutePath: string): boolean {
		return this.processes.has(absolutePath);
	}

	private nextAvailablePort(basePort: number): number {
		const used = new Set(
			[...this.processes.values()].map((p) => p.port)
		);
		let port = basePort;
		while (used.has(port)) port++;
		return port;
	}
}
