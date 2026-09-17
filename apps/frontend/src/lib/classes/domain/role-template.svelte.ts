import type { Capability } from '$lib/classes/types/delegate'
import type { RoleTemplate as RoleTemplateData } from '$lib/classes/types/event'

/** 大会级角色模板实体。席位通过 roleId 引用它。 */
export class RoleTemplate {
  readonly id: string
  name = $state('')
  description = $state<string | undefined>(undefined)
  capabilities = $state<Capability[]>([])
  builtIn = $state(false)

  constructor(data: RoleTemplateData) {
    this.id = data.id
    this.name = data.name
    this.description = data.description
    this.capabilities = [...data.capabilities]
    this.builtIn = data.builtIn ?? false
  }

  toJSON(): RoleTemplateData {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      capabilities: [...this.capabilities],
      builtIn: this.builtIn
    }
  }
}
