import type {
  Conference as ConferenceDTO,
  Committee as CommitteeDTO
} from '$lib/classes/types/conference'
import type { RoleTemplate } from '$lib/classes/types/event'
import type { News, SeatGroup, SituationUpdate } from '$lib/classes/types/delegate'
import { Committee } from '$lib/classes/domain/committee.svelte'

/** Runtime Conference aggregate. Its JSON shape remains the persisted ConferenceDTO. */
export class Conference {
  readonly id: string
  name = $state('')
  description = $state<string | undefined>(undefined)
  organizer = $state<string | undefined>(undefined)
  createdAt = $state(0)
  updatedAt = $state(0)

  private _committees = $state<Committee[]>([])
  private _roleTemplates = $state<RoleTemplate[]>([])
  private _seatGroups = $state<SeatGroup[]>([])
  private _news = $state<News[]>([])
  private _situationUpdates = $state<SituationUpdate[]>([])
  timelineId = $state<string | null | undefined>(undefined)

  constructor(data?: Partial<ConferenceDTO>) {
    this.id = data?.id ?? crypto.randomUUID()
    this.name = data?.name ?? ''
    this.description = data?.description
    this.organizer = data?.organizer
    this.createdAt = data?.createdAt ?? Date.now()
    this.updatedAt = data?.updatedAt ?? this.createdAt
    this._committees = (data?.committees ?? []).map((committee) =>
      committee instanceof Committee ? committee : Committee.fromJSON(committee)
    )
    this._roleTemplates = [...(data?.roleTemplates ?? [])]
    this._seatGroups = [...(data?.seatGroups ?? [])]
    this._news = [...(data?.news ?? [])]
    this._situationUpdates = [...(data?.situationUpdates ?? [])]
    this.timelineId = data?.timelineId
  }

  /** Return copies so callers cannot mutate aggregate collections directly. */
  get committees(): Committee[] {
    return [...this._committees]
  }

  get roleTemplates(): RoleTemplate[] {
    return [...this._roleTemplates]
  }

  get seatGroups(): SeatGroup[] {
    return [...this._seatGroups]
  }

  get news(): News[] {
    return [...this._news]
  }

  get situationUpdates(): SituationUpdate[] {
    return [...this._situationUpdates]
  }

  getCommittee(id: string): Committee | undefined {
    return this._committees.find((committee) => committee.id === id)
  }

  addCommittee(committee: Committee | CommitteeDTO): void {
    this._committees = [
      ...this._committees,
      committee instanceof Committee ? committee : Committee.fromJSON(committee)
    ]
    this.touch()
  }

  removeCommittee(id: string): void {
    this._committees = this._committees.filter((committee) => committee.id !== id)
    this.touch()
  }

  replaceCommittee(committee: Committee | CommitteeDTO): void {
    const next = committee instanceof Committee ? committee : Committee.fromJSON(committee)
    this._committees = this._committees.map((item) => (item.id === next.id ? next : item))
    this.touch()
  }

  rename(name: string): void {
    const trimmed = name.trim()
    if (!trimmed) return
    this.name = trimmed
    this.touch()
  }

  bindTimeline(timelineId: string | null): void {
    this.timelineId = timelineId
    this.touch()
  }

  updateSeatGroups(updater: (groups: SeatGroup[]) => SeatGroup[]): void {
    this._seatGroups = updater(this.seatGroups)
    this.touch()
  }

  setRoleTemplates(templates: RoleTemplate[]): void {
    this._roleTemplates = [...templates]
    this.touch()
  }

  addSeatGroup(group: SeatGroup): void {
    this._seatGroups = [...this._seatGroups, { ...group }]
    this.touch()
  }

  updateSeatGroup(id: string, updates: Partial<SeatGroup>): void {
    this._seatGroups = this._seatGroups.map((group) =>
      group.id === id ? { ...group, ...updates } : group
    )
    this.touch()
  }

  updateNews(updater: (items: News[]) => News[]): void {
    this._news = updater(this.news)
    this.touch()
  }

  addNews(item: News): void {
    this._news = [...this._news, { ...item }]
    this.touch()
  }

  updateSituationUpdates(updater: (items: SituationUpdate[]) => SituationUpdate[]): void {
    this._situationUpdates = updater(this.situationUpdates)
    this.touch()
  }

  addSituationUpdate(item: SituationUpdate): void {
    this._situationUpdates = [...this._situationUpdates, { ...item }]
    this.touch()
  }

  toJSON(): ConferenceDTO {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      organizer: this.organizer,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      committees: this._committees.map((committee) => committee.toJSON()),
      roleTemplates: this._roleTemplates,
      seatGroups: this._seatGroups,
      news: this._news,
      situationUpdates: this._situationUpdates,
      timelineId: this.timelineId
    }
  }

  static fromJSON(data: ConferenceDTO): Conference {
    return new Conference(data)
  }

  private touch(): void {
    this.updatedAt = Date.now()
  }
}
