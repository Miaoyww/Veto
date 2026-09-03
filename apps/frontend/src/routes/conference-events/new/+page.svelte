<script lang="ts">
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'
  import { resolve } from '$app/paths'
  import {
    ArrowLeft,
    ArrowRight,
    Building2,
    Check,
    ClipboardList,
    Plus,
    ShieldCheck,
    Trash2,
    Users
  } from '@lucide/svelte'
  import { Badge } from '$lib/components/ui/badge'
  import { Button } from '$lib/components/ui/button'
  import { Input } from '$lib/components/ui/input'
  import { Label } from '$lib/components/ui/label'
  import { Textarea } from '$lib/components/ui/textarea'
  import type { Capability, SeatGroupType } from '$lib/classes/types/delegate'
  import type { RoleTemplate } from '$lib/classes/types/event'
  import { createConferenceEvent } from '$lib/classes/stores/conference/conference-event-store'

  interface SeatDraft {
    id: string
    name: string
    roleId: string
  }

  interface MeetingDraft {
    id: string
    name: string
    venue: string
    type: SeatGroupType
    seats: SeatDraft[]
  }

  const steps = [
    { title: '大会信息', icon: Building2 },
    { title: '会场规划', icon: ClipboardList },
    { title: '角色权限', icon: ShieldCheck },
    { title: '席位分配', icon: Users },
    { title: '确认创建', icon: Check }
  ] as const

  const capabilityOptions: Array<{ value: Capability; label: string }> = [
    { value: 'view_conference', label: '查看会议' },
    { value: 'view_situation', label: '查看局势' },
    { value: 'view_news', label: '查看新闻' },
    { value: 'view_files', label: '查看文件' },
    { value: 'submit_directive', label: '发送指令' },
    { value: 'send_files', label: '发送文件' },
    { value: 'draft_news', label: '撰写新闻' },
    { value: 'review_news', label: '审核新闻' },
    { value: 'process_directive', label: '处理指令' },
    { value: 'publish_situation', label: '发布局势' },
    { value: 'draft_resolution', label: '起草文件' },
    { value: 'control_conference', label: '控制会议' }
  ]

  const defaultRoles: RoleTemplate[] = [
    {
      id: crypto.randomUUID(),
      name: '常规代表',
      capabilities: [
        'view_conference',
        'view_situation',
        'view_news',
        'view_files',
        'submit_directive',
        'send_files',
        'draft_resolution'
      ],
      builtIn: true
    },
    {
      id: crypto.randomUUID(),
      name: 'MPC 记者',
      capabilities: [
        'view_conference',
        'view_situation',
        'view_news',
        'view_files',
        'draft_news',
        'send_files'
      ],
      builtIn: true
    },
    {
      id: crypto.randomUUID(),
      name: '观察员',
      capabilities: ['view_conference', 'view_situation', 'view_news', 'view_files'],
      builtIn: true
    },
    {
      id: crypto.randomUUID(),
      name: '学团控制者',
      capabilities: [
        'view_conference',
        'view_situation',
        'view_news',
        'view_files',
        'process_directive',
        'review_news',
        'publish_situation',
        'control_conference'
      ],
      builtIn: true
    }
  ]

  let currentStep = $state(0)
  let eventName = $state('')
  let eventDescription = $state('')
  let organizer = $state('')
  let roles = $state<RoleTemplate[]>(structuredClone(defaultRoles))
  let meetings = $state<MeetingDraft[]>([])
  let creating = $state(false)
  let createError = $state('')

  const totalSeatCount = $derived(meetings.reduce((sum, meeting) => sum + meeting.seats.length, 0))
  const roleUsage = $derived.by(() => {
    const usage = new Map<string, number>()
    for (const meeting of meetings) {
      for (const seat of meeting.seats) {
        usage.set(seat.roleId, (usage.get(seat.roleId) ?? 0) + 1)
      }
    }
    return usage
  })

  const eventValid = $derived(eventName.trim().length > 0)
  const meetingValid = $derived(
    meetings.length > 0 && meetings.every((meeting) => meeting.name.trim().length > 0)
  )
  const roleValid = $derived(
    roles.length > 0 &&
      roles.every((role) => role.name.trim().length > 0 && role.capabilities.length > 0)
  )
  const seatValid = $derived(
    meetingValid &&
      meetings.every(
        (meeting) =>
          meeting.seats.length > 0 &&
          meeting.seats.every(
            (seat) => seat.name.trim().length > 0 && roles.some((role) => role.id === seat.roleId)
          )
      )
  )
  const canContinue = $derived(
    currentStep === 0
      ? eventValid
      : currentStep === 1
        ? meetingValid
        : currentStep === 2
          ? roleValid
          : currentStep === 3
            ? seatValid
            : true
  )

  function addMeeting(): void {
    meetings = [
      ...meetings,
      { id: crypto.randomUUID(), name: '', venue: '', type: 'cabinet', seats: [] }
    ]
  }

  function removeMeeting(id: string): void {
    meetings = meetings.filter((meeting) => meeting.id !== id)
  }

  function addRole(): void {
    roles = [...roles, { id: crypto.randomUUID(), name: '', capabilities: ['view_conference'] }]
  }

  function removeRole(id: string): void {
    if ((roleUsage.get(id) ?? 0) > 0) return
    roles = roles.filter((role) => role.id !== id)
  }

  function toggleCapability(roleId: string, capability: Capability): void {
    roles = roles.map((role) => {
      if (role.id !== roleId) return role
      const enabled = role.capabilities.includes(capability)
      return {
        ...role,
        capabilities: enabled
          ? role.capabilities.filter((item) => item !== capability)
          : [...role.capabilities, capability]
      }
    })
  }

  function addSeat(meetingId: string): void {
    meetings = meetings.map((meeting) => {
      if (meeting.id !== meetingId) return meeting
      return {
        ...meeting,
        seats: [...meeting.seats, { id: crypto.randomUUID(), name: '', roleId: roles[0]?.id ?? '' }]
      }
    })
  }

  function removeSeat(meetingId: string, seatId: string): void {
    meetings = meetings.map((meeting) => {
      if (meeting.id !== meetingId) return meeting
      return { ...meeting, seats: meeting.seats.filter((seat) => seat.id !== seatId) }
    })
  }

  function nextStep(): void {
    if (!canContinue) return
    currentStep = Math.min(currentStep + 1, steps.length - 1)
  }

  function previousStep(): void {
    currentStep = Math.max(currentStep - 1, 0)
  }

  function roleLabel(roleId: string): string {
    return roles.find((role) => role.id === roleId)?.name ?? '未指定角色'
  }

  function capabilityLabel(capability: Capability): string {
    return capabilityOptions.find((item) => item.value === capability)?.label ?? capability
  }

  async function submit(): Promise<void> {
    if (!eventValid || !meetingValid || !roleValid || !seatValid || creating) return

    creating = true
    createError = ''
    try {
      const eventId = await createConferenceEvent({
        name: eventName,
        description: eventDescription,
        organizer,
        roleTemplates: roles,
        conferences: meetings
      })
      if (!eventId) {
        createError = '创建失败，请检查会议和席位配置'
        return
      }
      goto(resolve('/conference-events/[event_id]', { event_id: eventId }))
    } catch {
      createError = '创建失败，请重试'
    } finally {
      creating = false
    }
  }

  onMount(() => {
    if (meetings.length === 0) addMeeting()
  })
</script>

<div class="flex h-full min-h-0 flex-col bg-background">
  <header class="flex shrink-0 items-center justify-between gap-4 border-b px-8 py-5">
    <div>
      <h1 class="text-xl font-semibold">创建大会</h1>
      <p class="mt-1 text-sm text-muted-foreground">配置大会、小会议、角色权限与席位 key</p>
    </div>
    <Badge variant="outline" class="shrink-0">步骤 {currentStep + 1}/{steps.length}</Badge>
  </header>

  <div class="flex min-h-0 flex-1">
    <nav class="hidden w-56 shrink-0 border-r px-4 py-5 lg:block">
      <div class="flex flex-col gap-1">
        {#each steps as step, index (step.title)}
          <button
            type="button"
            class="flex items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent {currentStep ===
            index
              ? 'bg-accent font-medium text-accent-foreground'
              : index < currentStep
                ? 'text-foreground'
                : 'text-muted-foreground'}"
            onclick={() => (currentStep = index)}
          >
            <step.icon class="size-4 shrink-0" />
            <span class="min-w-0 flex-1 truncate">{step.title}</span>
            {#if index < currentStep}<Check class="size-3.5 text-emerald-500" />{/if}
          </button>
        {/each}
      </div>
    </nav>

    <main class="min-w-0 flex-1 overflow-y-auto px-8 py-6">
      <div class="mx-auto flex min-h-full w-full max-w-5xl flex-col">
        {#if currentStep === 0}
          <section class="grid gap-5 md:grid-cols-2">
            <div class="flex flex-col gap-2">
              <Label for="event-name">大会名称</Label>
              <Input id="event-name" bind:value={eventName} />
            </div>
            <div class="flex flex-col gap-2">
              <Label for="organizer">主办方</Label>
              <Input id="organizer" bind:value={organizer} />
            </div>
            <div class="flex flex-col gap-2 md:col-span-2">
              <Label for="event-description">大会说明</Label>
              <Textarea
                id="event-description"
                bind:value={eventDescription}
                class="min-h-28"
                placeholder="大会主题、范围或备注"
              />
            </div>
          </section>
        {:else if currentStep === 4}
          <section class="flex flex-col gap-5">
            <article class="rounded-lg border p-4">
              <h2 class="text-sm font-semibold">{eventName}</h2>
              <dl class="mt-3 grid gap-3 text-sm sm:grid-cols-3">
                <div>
                  <dt class="text-xs text-muted-foreground">小会议</dt>
                  <dd class="mt-1 font-medium">{meetings.length}</dd>
                </div>
                <div>
                  <dt class="text-xs text-muted-foreground">角色模板</dt>
                  <dd class="mt-1 font-medium">{roles.length}</dd>
                </div>
                <div>
                  <dt class="text-xs text-muted-foreground">席位 key</dt>
                  <dd class="mt-1 font-medium">{totalSeatCount}</dd>
                </div>
              </dl>
            </article>

            <div class="grid gap-4 lg:grid-cols-2">
              {#each meetings as meeting (meeting.id)}
                <article class="rounded-lg border p-4">
                  <div class="flex items-center justify-between gap-3">
                    <h3 class="text-sm font-semibold">{meeting.name}</h3>
                    <Badge variant="outline">{meeting.seats.length} 个席位</Badge>
                  </div>
                  <ul class="mt-3 flex flex-col gap-2 text-sm">
                    {#each meeting.seats as seat (seat.id)}
                      <li
                        class="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
                      >
                        <span class="min-w-0 flex-1 truncate">{seat.name}</span>
                        <span class="shrink-0 text-xs text-muted-foreground">
                          {roleLabel(seat.roleId)}
                        </span>
                      </li>
                    {/each}
                  </ul>
                </article>
              {/each}
            </div>

            <article class="rounded-lg border p-4">
              <h3 class="text-sm font-semibold">角色权限</h3>
              <div class="mt-3 flex flex-col gap-2">
                {#each roles as role (role.id)}
                  <div class="rounded-md border px-3 py-2">
                    <div class="flex items-center justify-between gap-3">
                      <span class="text-sm font-medium">{role.name}</span>
                      <Badge variant="outline">{roleUsage.get(role.id) ?? 0} 个席位</Badge>
                    </div>
                    <p class="mt-1 text-xs text-muted-foreground">
                      {role.capabilities.map(capabilityLabel).join('、')}
                    </p>
                  </div>
                {/each}
              </div>
            </article>
            {#if createError}
              <p class="text-sm text-destructive">{createError}</p>
            {/if}
          </section>
        {:else if currentStep === 2}
          <section class="flex flex-col gap-4">
            {#each roles as role (role.id)}
              <article class="rounded-lg border p-4">
                <div class="flex items-center gap-3">
                  <Input bind:value={role.name} placeholder="角色名称" class="max-w-72" />
                  <Badge variant="outline">{role.capabilities.length} 项权限</Badge>
                  <div class="ml-auto">
                    <Button
                      variant="ghost"
                      size="icon"
                      title={(roleUsage.get(role.id) ?? 0) > 0 ? '角色已被席位使用' : '删除角色'}
                      disabled={(roleUsage.get(role.id) ?? 0) > 0}
                      onclick={() => removeRole(role.id)}
                    >
                      <Trash2 class="size-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                <div class="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {#each capabilityOptions as option (option.value)}
                    <label class="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                      <input
                        type="checkbox"
                        checked={role.capabilities.includes(option.value)}
                        onchange={() => toggleCapability(role.id, option.value)}
                      />
                      <span>{option.label}</span>
                    </label>
                  {/each}
                </div>
              </article>
            {/each}
            <Button variant="outline" class="w-fit gap-2" onclick={addRole}>
              <Plus class="size-4" />
              添加角色
            </Button>
          </section>
        {:else if currentStep === 3}
          <section class="flex flex-col gap-4">
            {#each meetings as meeting (meeting.id)}
              <article class="rounded-lg border p-4">
                <div class="flex items-center justify-between gap-3">
                  <h2 class="text-sm font-semibold">{meeting.name || '未命名会议'}</h2>
                  <Button
                    variant="outline"
                    size="sm"
                    class="gap-2"
                    onclick={() => addSeat(meeting.id)}
                  >
                    <Plus class="size-4" />
                    添加席位
                  </Button>
                </div>
                <div class="mt-3 flex flex-col gap-2">
                  {#each meeting.seats as seat (seat.id)}
                    <div class="grid gap-2 md:grid-cols-[1fr_240px_40px]">
                      <Input bind:value={seat.name} />
                      <select
                        bind:value={seat.roleId}
                        class="h-9 rounded-md border bg-transparent px-3 text-sm"
                      >
                        {#each roles as role (role.id)}
                          <option value={role.id}>{role.name || '未命名角色'}</option>
                        {/each}
                      </select>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="删除席位"
                        onclick={() => removeSeat(meeting.id, seat.id)}
                      >
                        <Trash2 class="size-4 text-destructive" />
                      </Button>
                    </div>
                  {:else}
                    <p
                      class="rounded-md border border-dashed px-3 py-6 text-center text-sm text-muted-foreground"
                    >
                      尚未分配席位
                    </p>
                  {/each}
                </div>
              </article>
            {/each}
          </section>
        {:else if currentStep === 1}
          <section class="flex flex-col gap-4">
            {#each meetings as meeting (meeting.id)}
              <article class="rounded-lg border p-4">
                <div class="grid gap-3 md:grid-cols-[1fr_1fr_180px_40px]">
                  <div class="flex flex-col gap-2">
                    <Label for={`meeting-name-${meeting.id}`}>会议名称</Label>
                    <Input id={`meeting-name-${meeting.id}`} bind:value={meeting.name} />
                  </div>
                  <div class="flex flex-col gap-2">
                    <Label for={`meeting-venue-${meeting.id}`}>会场</Label>
                    <Input id={`meeting-venue-${meeting.id}`} bind:value={meeting.venue} />
                  </div>
                  <div class="flex flex-col gap-2">
                    <Label for={`meeting-type-${meeting.id}`}>类型</Label>
                    <select
                      id={`meeting-type-${meeting.id}`}
                      bind:value={meeting.type}
                      class="h-9 rounded-md border bg-transparent px-3 text-sm"
                    >
                      <option value="cabinet">内阁 / 委员会</option>
                      <option value="mpc">MPC</option>
                      <option value="ipc">学团 IPC</option>
                    </select>
                  </div>
                  <div class="flex items-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      title="删除会议"
                      onclick={() => removeMeeting(meeting.id)}
                    >
                      <Trash2 class="size-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </article>
            {/each}
            <Button variant="outline" class="w-fit gap-2" onclick={addMeeting}>
              <Plus class="size-4" />
              添加分会议
            </Button>
          </section>
        {/if}

        <footer
          class="sticky bottom-0 mt-6 flex items-center justify-between gap-3 border-t bg-background py-4"
        >
          <Button
            variant="ghost"
            class="gap-2"
            disabled={currentStep === 0 || creating}
            onclick={previousStep}
          >
            <ArrowLeft class="size-4" />
            上一步
          </Button>
          {#if currentStep < steps.length - 1}
            <Button class="gap-2" disabled={!canContinue} onclick={nextStep}>
              下一步
              <ArrowRight class="size-4" />
            </Button>
          {:else}
            <Button class="gap-2" disabled={!canContinue || creating} onclick={() => void submit()}>
              {#if creating}
                创建中
              {:else}
                创建大会
              {/if}
              <Check class="size-4" />
            </Button>
          {/if}
        </footer>
      </div>
    </main>
  </div>
</div>
