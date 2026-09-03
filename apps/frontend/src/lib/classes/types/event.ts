import type { Capability } from './delegate'

export interface RoleTemplate {
  id: string
  name: string
  description?: string
  capabilities: Capability[]
  builtIn?: boolean
}
