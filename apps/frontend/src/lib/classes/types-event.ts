import type { Capability, News, SituationUpdate } from './types-delegate'

export interface RoleTemplate {
  id: string
  name: string
  description?: string
  capabilities: Capability[]
  builtIn?: boolean
}

export interface ConferenceEvent {
  id: string
  name: string
  description?: string
  organizer?: string
  createdAt: number
  updatedAt: number
  conferenceIds: string[]
  roleTemplates: RoleTemplate[]
  news: News[]
  situationUpdates: SituationUpdate[]
}
