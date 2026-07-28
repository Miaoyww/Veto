# veto-dts

TypeScript type declarations for the **Veto Plugin API**.

## What is this?

`veto-dts` provides IntelliSense and compile-time type-checking for Veto plugins. It is the counterpart to VS Code's `@types/vscode` — but for the Veto platform.

> ⚠️ **This package contains zero runtime code.** The actual `"veto"` module is injected by the Veto Plugin Host at runtime. You must NOT bundle `veto-dts` into your plugin distribution.

## Installation

```bash
npm install --save-dev veto-dts
```

## Usage

In your plugin source:

```ts
import { logger, storage, events, commands } from "veto";

// Logging
logger.info("Plugin started");
logger.warn("Something looks odd");
logger.error(new Error("Boom"));

// Persistent storage
await storage.set("favoriteColor", "blue");
const color = await storage.get<string>("favoriteColor");

// Events
const disposable = events.on<{ path: string }>("fileOpened", (data) => {
  logger.info(`Opened: ${data.path}`);
});
events.emit("ready", { loaded: true });

// Commands
commands.registerCommand("myPlugin.greet", (name: string) => {
  logger.info(`Hello, ${name}!`);
});
await commands.executeCommand("myPlugin.greet", "World");

// Cleanup
disposable.dispose();
```

## Plugin Lifecycle

Your plugin's entry file should export `activate` and `deactivate`:

```ts
import type { PluginContext } from "veto-dts";

export function activate(context: PluginContext): void {
  context.logger.info(`Plugin ${context.id} activated`);

  context.commands.registerCommand("myPlugin.hello", () => {
    context.logger.info("Hello from myPlugin!");
  });
}

export function deactivate(): void {
  // Release resources — timers, connections, etc.
}
```

## Related

- [Veto Platform](https://veto.miaoyww.top) — The MUN conference platform.
- `@veto/sdk` — Runtime SDK for Veto plugins (WIP).

## License

MIT
