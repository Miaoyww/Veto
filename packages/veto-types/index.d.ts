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
 *   import { logger, events, storage, conference, timeline, notifications } from "veto";
 *
 * In plugin package.json:
 *
 *   "devDependencies": {
 *     "veto-dts": "^0.1.0"
 *   }
 * ------------------------------------------------------------------------ */

declare module 'veto' {
  // ============================================================================
  // 1. Logger
  // ============================================================================

  /**
   * Logger interface providing leveled logging for plugins.
   *
   * Output is captured by the Veto Plugin Host and routed to the platform's
   * unified log system.  Plugins should NOT rely on `console.*` methods directly.
   */
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
   * Supports exact match, prefix wildcard (`domain:*`), and global wildcard
   * (`*`) patterns — similar to VS Code's `EventEmitter` but string-based.
   *
   * ```ts
   * // Subscribe to all conference events
   * const unsubscribe = events.on("conference:*", (data) => {
   *   console.log(data.conferenceId, data.phase);
   * });
   *
   * // Emit (within your own plugin)
   * events.emit("custom:something_happened", { detail: 42 });
   *
   * // Unsubscribe
   * unsubscribe();
   * ```
   */
  export interface EventBus {
    /**
     * Subscribe to events matching the given pattern.
     *
     * @param pattern — Event type (exact match) or pattern with `*` wildcard.
     *                  Examples: `'conference:phase_changed'`, `'conference:*'`, `'*'`
     * @param callback — Invoked each time a matching event fires.
     *                   Receives only the `data` portion of the event payload.
     * @returns An unsubscribe function — call it to stop receiving events.
     */
    on(pattern: string, callback: (data: Record<string, unknown>) => void): () => void

    /**
     * Fire an event.
     * Listeners are invoked asynchronously; this call does NOT await them.
     *
     * @param type — Event type string (e.g. `'conference:phase_changed'`).
     * @param data — Payload forwarded to matching listeners.
     */
    emit(type: string, data?: Record<string, unknown>): void
  }

  // ============================================================================
  // 4. Conference API
  // ============================================================================

  /** Lightweight conference view returned by `conference.list()`. */
  export interface ConferenceSummary {
    readonly id: string
    readonly name: string
    readonly venue?: string
    readonly phase: string
    readonly presentCount: number
    readonly votingCount: number
    readonly currentSpeaker?: { delegation: string; remaining: number }
    readonly timelineId?: string | null
  }

  /** Full conference record returned by `conference.get()`. */
  export interface ConferenceEntry extends ConferenceSummary {
    readonly minutes?: MinutesEntry[]
  }

  /** Single entry in a conference's action log. */
  export interface MinutesEntry {
    readonly id: string
    readonly timestamp: number
    readonly type: string
    readonly title: string
    readonly detail?: string
  }

  /**
   * Patchable fields for `conference.update()`.
   * Only the fields that make sense to mutate from a plugin are exposed.
   */
  export interface ConferencePatch {
    phase?: string
    presentCount?: number
    votingCount?: number
    currentSpeaker?: { delegation: string; remaining: number } | null
    timelineId?: string | null
  }

  /**
   * Read-only conference data API.
   *
   * Each `update()` call automatically persists the change and emits a
   * corresponding `conference:*` event on the global EventBus so every
   * plugin sees the change in real time.
   *
   * ```ts
   * // List all conferences
   * const all = conference.list();
   *
   * // Transition a conference phase
   * conference.update(conf.id, { phase: "voting" });
   * // → emits conference:phase_changed automatically
   * ```
   */
  export interface Conference {
    /** List all conferences (summary view). */
    list(): ConferenceSummary[]

    /** Get a single conference with full detail (including minutes). */
    get(id: string): ConferenceEntry | null

    /**
     * Update one or more fields of a conference.
     * @returns The updated conference, or `null` if the id wasn't found.
     */
    update(id: string, patch: ConferencePatch): ConferenceEntry | null
  }

  // ============================================================================
  // 5. Timeline API
  // ============================================================================

  /** Lightweight timeline view returned by `timeline.list()`. */
  export interface TimelineSummary {
    readonly id: string
    readonly name: string
    readonly createdAt: number
    readonly paused: boolean
    readonly ratio: number
    readonly simTime: number
    readonly realAnchor: number
  }

  /** Full timeline record returned by `timeline.get()`. */
  export interface TimelineEntry {
    readonly id: string
    readonly name: string
    readonly createdAt: number
    readonly state: TimelineState
  }

  /** Mutable runtime state of a timeline. */
  export interface TimelineState {
    paused: boolean
    ratio: number
    simulationAnchor: number
    realAnchor: number
  }

  /**
   * Read-only timeline data API.
   *
   * Each `update()` call automatically persists the change and emits a
   * corresponding `timeline:*` event on the global EventBus.
   *
   * ```ts
   * // Pause a timeline
   * timeline.update(tl.id, { paused: true });
   * // → emits timeline:paused automatically
   * ```
   */
  export interface Timeline {
    /** List all timelines (summary view). */
    list(): TimelineSummary[]

    /** Get a single timeline with full detail. */
    get(id: string): TimelineEntry | null

    /**
     * Update one or more fields of a timeline's runtime state.
     * @returns The updated timeline, or `null` if the id wasn't found.
     */
    update(id: string, patch: Partial<TimelineState>): TimelineEntry | null
  }

  // ============================================================================
  // 6. Notifications
  // ============================================================================

  /** Severity level for toast notifications. */
  export type NotificationLevel = 'info' | 'success' | 'warn' | 'error'

  /** Options for `notifications.show()`. */
  export interface NotificationOptions {
    /** Severity level (default: `'info'`). */
    level?: NotificationLevel
    /** Display duration in milliseconds (default: 4000). */
    duration?: number
  }

  /**
   * Toast-level user notification API.
   *
   * Notifications appear in the Veto UI via svelte-sonner toasts.
   * They are non-blocking and do not require user interaction.
   *
   * ```ts
   * notifications.show("Plugin ready");
   * notifications.show("Connection lost", { level: "error" });
   * ```
   */
  export interface Notifications {
    /**
     * Show a toast notification in the Veto UI.
     * @param message — Notification text.
     * @param options — Optional severity level and duration.
     */
    show(message: string, options?: NotificationOptions): void
  }

  // ============================================================================
  // 7. Plugin Lifecycle
  // ============================================================================

  /**
   * The context object passed to a plugin's `activate` function.
   *
   * It carries everything a plugin needs to interact with the Veto platform.
   * `events`, `conference`, `timeline`, and `notifications` are shared
   * singletons; `logger` and `storage` are scoped to the calling plugin.
   */
  export interface PluginContext {
    /** Unique identifier for this plugin instance. */
    readonly id: string

    /** The plugin's own scoped logger. */
    readonly logger: Logger

    /** The plugin's own scoped persistent storage. */
    readonly storage: Storage

    /** The global event bus (shared across all plugins). */
    readonly events: EventBus

    /** Read-only access to conference data. */
    readonly conference: Conference

    /** Read-only access to timeline data. */
    readonly timeline: Timeline

    /** Toast-level user notifications. */
    readonly notifications: Notifications

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
