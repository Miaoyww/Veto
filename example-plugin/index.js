/**
 * Example Veto Plugin
 *
 * Demonstrates all available veto module APIs:
 *   - logger    — scoped logging
 *   - events    — global EventBus (subscribe + emit)
 *   - storage   — scoped KV persistence
 *   - conference — read-only conference data
 *   - timeline  — read-only timeline data
 *   - notifications — toast-level user notifications
 */

/**
 * @param {import('veto').PluginContext} context
 */
export async function activate(context) {
  const { logger, events, storage, conference, timeline, notifications } = context

  logger.info(`Plugin "${context.id}" activated`)

  // ── Storage ──────────────────────────────────────────────────────
  const bootCount = (await storage.get('bootCount')) ?? 0
  await storage.set('bootCount', bootCount + 1)
  logger.info(`Boot count: ${bootCount + 1}`)

  // ── Events ──────────────────────────────────────────────────────
  // Subscribe to all conference phase changes
  const unsubPhase = events.on('conference:phase_changed', (data) => {
    logger.info(`Phase changed: conference=${data.conferenceId}, phase=${data.phase}`)
  })

  // Subscribe to timeline events
  const unsubTimeline = events.on('timeline:*', (data) => {
    logger.info(`Timeline event: ${data.timelineId}`)
  })

  // ── Conference ───────────────────────────────────────────────────
  const conferences = conference.list()
  logger.info(`Found ${conferences.length} conference(s)`)
  for (const conf of conferences) {
    logger.info(`  - ${conf.name} (${conf.phase})`)
  }

  // ── Timeline ────────────────────────────────────────────────────
  const timelines = timeline.list()
  logger.info(`Found ${timelines.length} timeline(s)`)

  // ── Notifications ────────────────────────────────────────────────
  notifications.show('Example plugin activated', { level: 'success' })

  // ── Store cleanup references for deactivate ──────────────────────
  context._disposables = [unsubPhase, unsubTimeline]
}

/**
 * Clean up resources when the plugin is deactivated.
 */
export async function deactivate() {
  // Cleanup is handled via the stored disposables
  // (In real plugins, store references and dispose here)
}
