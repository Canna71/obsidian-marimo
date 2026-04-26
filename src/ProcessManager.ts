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
	): string {
		const existing = this.processes.get(absolutePath);
		if (existing) {
			return `http://localhost:${existing.port}`;
		}

		const port = this.nextAvailablePort(basePort);
		const args = [
			"edit",
			"--port",
			String(port),
			"--no-browser",
			...extraArgs,
			absolutePath,
		];

		const proc = spawn(marimoExecutable, args, {
			detached: false,
			stdio: ["ignore", "pipe", "pipe"],
		});

		proc.on("error", (err: NodeJS.ErrnoException) => {
			this.processes.delete(absolutePath);
			if (err.code === "ENOENT") {
				new Notice(
					`Marimo not found. Install it with: pip install marimo\n` +
						`Or set the executable path in Marimo notebook settings.`
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
		return `http://localhost:${port}`;
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
