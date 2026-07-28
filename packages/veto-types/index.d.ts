/* ----------------------------------------------------------------------------
 * Veto Plugin API — Type Declarations
 *
 * IMPORTANT:
 *   This package provides ONLY type declarations.
 *   It contains zero runtime code and must NOT be bundled into plugins.
 *
 *   The "veto" module is injected at runtime by the Veto Plugin Host —
 *   similar to how VS Code provides the "vscode" module in its Extension Host.
 *
 * Usage in plugin source:
 *
 *   import { logger, storage, events, commands } from "veto";
 *
 * In plugin package.json:
 *
 *   "devDependencies": {
 *     "veto-dts": "^0.1.0"
 *   }
 * ------------------------------------------------------------------------ */

// ============================================================================
// 1. Logger
// ============================================================================

/**
 * Logger interface providing leveled logging for plugins.
 *
 * Output is captured by the Veto Plugin Host and routed to the platform's
 * unified log system.  Plugins should NOT rely on `console.*` methods directly.
 */
declare module 'veto' {
  export interface Logger {
    /** Log an informational message. */
    info(message: string): void

    /** Log a warning. */
    warn(message: string): void

    /**
     * Log an error.
     * Accepts either an `Error` object (with stack trace) or a plain string.
     */
    error(error: Error | string): void

    /**
     * Log a debug message.
     * Debug output may be suppressed at the Host level depending on log-level
     * configuration.
     */
    debug(message: string): void
  }

  // ============================================================================
  // 2. Storage
  // ============================================================================

  /**
   * Key-value persistence scoped to the calling plugin.
   *
   * All values are serialized as JSON.  Storage is isolated per-plugin —
   * plugin A cannot read or write plugin B's keys.
   *
   * ```ts
   * await storage.set("lastOpenFile", "/path/to/file.txt");
   * const file = await storage.get<string>("lastOpenFile");
   * ```
   */
  export interface Storage {
    /**
     * Retrieve a value by key.
     * @returns The deserialized value, or `undefined` if the key doesn't exist.
     */
    get<T = unknown>(key: string): Promise<T | undefined>

    /**
     * Persist a value under the given key.
     * Existing values are overwritten silently.
     */
    set<T = unknown>(key: string, value: T): Promise<void>

    /**
     * Remove a key and its associated value.
     * Deleting a non-existent key is a no-op (no error thrown).
     */
    delete(key: string): Promise<void>

    /**
     * List all keys in this plugin's storage namespace.
     * Useful for migration or cleanup routines.
     */
    keys(): Promise<string[]>
  }

  // ============================================================================
  // 3. Event Bus
  // ============================================================================

  /**
   * Type-safe pub/sub event bus.
   *
   * Events are namespaced per-plugin by default.  Cross-plugin events require
   * the `veto.` prefix and are subject to platform governance.
   *
   * ```ts
   * // Subscribe
   * const disposable = events.on<FileChangedPayload>("fileChanged", (data) => {
   *   console.log(data.path);
   * });
   *
   * // Emit (within your own plugin)
   * events.emit("fileChanged", { path: "/foo.txt" });
   *
   * // Unsubscribe
   * disposable.dispose();
   * ```
   */
  export interface EventBus {
    /**
     * Subscribe to an event.
     * @param event  — Event name. Use `veto.*` prefix for platform-level events.
     * @param callback — Invoked each time the event fires.
     * @returns A `Disposable` — call `.dispose()` to unsubscribe.
     */
    on<T = unknown>(event: string, callback: (data: T) => void): Disposable

    /**
     * Fire an event.
     * Listeners are invoked asynchronously; this call does NOT await them.
     */
    emit<T = unknown>(event: string, data: T): void
  }

  // ============================================================================
  // 4. Commands
  // ============================================================================

  /**
   * Command registry — mirrors VS Code's command API.
   *
   * Plugins register commands that can be invoked programmatically or triggered
   * by the platform (menus, keybindings, toolbar buttons).
   *
   * ```ts
   * // Register
   * const disposable = commands.registerCommand("myPlugin.sayHello", (name: string) => {
   *   logger.info(`Hello, ${name}!`);
   * });
   *
   * // Execute (your own or another plugin's public commands)
   * await commands.executeCommand("myPlugin.sayHello", "World");
   *
   * // Clean up on deactivation
   * disposable.dispose();
   * ```
   */
  export interface Commands {
    /**
     * Register a command handler.
     * @param id      — Unique command identifier (e.g. `"myPlugin.doSomething"`).
     * @param handler — The function to invoke when the command is executed.
     * @returns A `Disposable` that unregisters the command when disposed.
     */
    registerCommand(id: string, handler: (...args: any[]) => any): Disposable

    /**
     * Execute a registered command.
     * @param id   — The command identifier.
     * @param args — Arguments forwarded to the handler.
     * @returns The handler's return value, wrapped in a Promise.
     * @throws If the command is not registered or the handler throws.
     */
    executeCommand<T = unknown>(id: string, ...args: any[]): Promise<T>

    /**
     * Return all registered command IDs.
     * Useful for discovery / debugging.
     */
    getCommands(): Promise<string[]>
  }

  // ============================================================================
  // 5. Disposable
  // ============================================================================

  /**
   * Represents a resource that can be released when no longer needed.
   *
   * Pattern borrowed from VS Code — `registerCommand`, `on`, etc. all return a
   * `Disposable` so plugins can clean up in `deactivate()`.
   */
  export interface Disposable {
    dispose(): void
  }

  // ============================================================================
  // 6. Plugin Lifecycle
  // ============================================================================

  /**
   * The context object passed to a plugin's `activate` function.
   *
   * It carries everything a plugin needs to interact with the Veto platform.
   */
  export interface PluginContext {
    /** Unique identifier for this plugin instance. */
    readonly id: string

    /** The plugin's own scoped logger. */
    readonly logger: Logger

    /** The plugin's own scoped persistent storage. */
    readonly storage: Storage

    /** The plugin-scoped event bus. */
    readonly events: EventBus

    /** The global command registry. */
    readonly commands: Commands

    /**
     * Absolute path to the plugin's installation directory on disk.
     * Useful for loading bundled assets (HTML, images, data files).
     */
    readonly extensionPath: string

    /**
     * Arbitrary plugin metadata declared in the plugin's `package.json`
     * under the `"veto"` key.
     */
    readonly metadata: Record<string, unknown>
  }

  /**
   * Plugin activation entry-point.
   *
   * Called by the Veto Plugin Host when the plugin is activated (startup, or
   * when one of its activation events fires).
   *
   * @returns Optionally a Promise if activation is asynchronous.
   */
  export type ActivateFunction = (context: PluginContext) => void | Promise<void>

  /**
   * Plugin deactivation entry-point.
   *
   * Called by the Veto Plugin Host when the plugin is being deactivated
   * (shutdown, disable, or uninstall).  Plugins should release all resources
   * (disposables, timers, connections) here.
   *
   * @returns Optionally a Promise if deactivation is asynchronous.
   */
  export type DeactivateFunction = () => void | Promise<void>
}
