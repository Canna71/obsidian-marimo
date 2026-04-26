import { ChildProcess, spawn } from "child_process";
import { Notice } from "obsidian";

interface MarimoProcess {
	process: ChildProcess;
	port: number;
}

export class ProcessManager {
	private processes: Map<string, MarimoProcess> = new Map();

	/**
	 * Starts a marimo edit server for the given absolute file path.
	 * If a server for that file is already running, returns its URL immediately.
	 */
	start(
		absolutePath: string,
		basePort: number,
		marimoExecutable: string,
		extraArgs: string[]
	): { url: string; port: number } {
		const existing = this.processes.get(absolutePath);
		if (existing) {
			return { url: `http://localhost:${existing.port}`, port: existing.port };
		}

		const port = this.nextAvailablePort(basePort);
		const args = [
			"edit",
			absolutePath,
			"--port",
			String(port),
			"--headless",
			...extraArgs,
		];

		console.log("[marimo] spawning:", marimoExecutable, args.join(" "));

		const proc = spawn(marimoExecutable, args, {
			detached: false,
			stdio: ["ignore", "pipe", "pipe"],
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
					`Marimo executable not found: "${marimoExecutable}"\n` +
					`Set the full path in Settings → Marimo notebooks.`
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
