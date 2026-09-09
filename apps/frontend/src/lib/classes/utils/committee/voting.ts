import type { MajorityRule, MajorityThresholds, VoteBallot } from '$lib/classes/types/committee'
import type { ParticipantSeat } from '$lib/classes/types/delegate'

/** Calculate attendance and voting thresholds from procedural seat state. */
export function calculateMajorityThresholds(seats: ParticipantSeat[]): MajorityThresholds {
  const presentCount = seats.filter((seat) => seat.procedure.attendance === 'present').length
  const votingCount = seats.filter(
    (seat) => seat.procedure.attendance === 'present' && seat.procedure.hasVotingRights
  ).length
  return {
    presentCount,
    votingCount,
    totalCount: seats.length,
    simpleMajorityThreshold: Math.floor(votingCount / 2) + 1,
    twoThirdsThreshold: Math.ceil((votingCount * 2) / 3)
  }
}

/** Determine whether yes ballots meet the selected majority threshold. */
export function determinePassFail(
  ballots: VoteBallot[],
  majorityRule: MajorityRule,
  seats: ParticipantSeat[]
): 'passed' | 'failed' {
  const { simpleMajorityThreshold, twoThirdsThreshold } = calculateMajorityThresholds(seats)
  const yesCount = ballots.filter((ballot) => ballot.vote === 'yes').length
  const threshold = majorityRule === 'simple_majority' ? simpleMajorityThreshold : twoThirdsThreshold
  return yesCount >= threshold ? 'passed' : 'failed'
}

/** Count yes, no, and abstain ballots; skipped ballots are intentionally ignored. */
export function tallyVotes(ballots: VoteBallot[]): {
  yes: number
  no: number
  abstain: number
} {
  let yes = 0
  let no = 0
  let abstain = 0
  for (const ballot of ballots) {
    if (ballot.vote === 'yes') yes++
    else if (ballot.vote === 'no') no++
    else if (ballot.vote === 'abstain') abstain++
  }
  return { yes, no, abstain }
}

/** Backwards-compatible name used by the legacy engine while consumers migrate. */
export const tallyVotesEngine = tallyVotes
