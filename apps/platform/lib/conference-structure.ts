import type { CommitteeInput, RoleTemplateInput } from "@/lib/conference-client"

export function createClientId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`
}

export function roleReference(role: RoleTemplateInput): string {
  return role.id ?? role.clientId ?? ""
}

export function committeeReference(
  committee: CommitteeInput,
  index = 0
): string {
  return committee.id ?? committee.clientId ?? String(index)
}

export function roleAllowedInCommittee(
  role: RoleTemplateInput,
  committeeType: CommitteeInput["type"]
): boolean {
  if (role.systemCode === "staff") return true
  if (role.systemCode === "mpc_press") return committeeType === "mpc"
  if (role.systemCode === "ipc") return committeeType === "ipc"
  return committeeType !== "ipc"
}

export function createCommittee(): CommitteeInput {
  return {
    clientId: createClientId("committee"),
    name: "",
    type: "cabinet",
    seats: [],
    agenda: [],
  }
}
