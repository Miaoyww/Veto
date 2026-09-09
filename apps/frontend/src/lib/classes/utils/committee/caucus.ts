/** Return the whole-speaker capacity for a moderated caucus. */
export function calcMaxSpeakers(totalTimeSec: number, speakingTimePerPersonSec: number): number {
  if (speakingTimePerPersonSec <= 0) return 0
  return Math.floor(totalTimeSec / speakingTimePerPersonSec)
}
