<script lang="ts">
  import { onMount } from 'svelte'
  import { page } from '$app/stores'
  import { ArrowLeft, Check, Copy, KeyRound, Pencil, RefreshCw, Users } from '@lucide/svelte'
  import { goto } from '$app/navigation'
  import { resolve } from '$app/paths'
  import { conferences, loadConference } from '$lib/classes/stores/conference/conference-store'
  import { rotateSeatInviteCode, updateSeat } from '$lib/classes/stores/delegate/delegate-store'
  import type { Seat } from '$lib/classes/types/delegate'
  import { Button } from '$lib/components/ui/button'
  import { Input } from '$lib/components/ui/input'
  import * as Dialog from '$lib/components/ui/dialog'

  const conferenceId = $derived($page.params.conference_id ?? '')
  const committeeId = $derived($page.params.committee_id ?? '')
  const conference = $derived($conferences.find((item) => item.id === conferenceId) ?? null)
  const committee = $derived(conference?.committees.find((item) => item.id === committeeId) ?? null)
  let ready = $state(false)
  let editingSeat = $state<Seat | null>(null)
  let editorOpen = $state(false)
  let editName = $state('')
  let copied = $state('')

  onMount(() => {
    loadConference(conferenceId, committeeId)
    ready = true
  })
  function inviteCode(seatId: string): string {
    return conference?.seatAccesses.find((access) => access.seatId === seatId)?.inviteCode ?? ''
  }
  async function copyCode(code: string, id: string): Promise<void> {
    if (!code) return
    await navigator.clipboard.writeText(code)
    copied = id
    setTimeout(() => copied === id && (copied = ''), 1400)
  }
  function openEditor(seat: Seat): void {
    editingSeat = seat
    editName = seat.name
    editorOpen = true
  }
  function saveName(): void {
    const seat = editingSeat
    const name = editName.trim()
    if (!seat || !name) return
    updateSeat(seat.id, { name })
    editingSeat = null
    editorOpen = false
  }
</script>

<div class="flex min-h-0 flex-1 flex-col bg-background">
  {#if !ready}
    <div class="flex flex-1 items-center justify-center text-sm text-muted-foreground">加载中</div>
  {:else if !conference || !committee}
    <div class="flex flex-1 items-center justify-center text-sm text-muted-foreground">
      未找到委员会
    </div>
  {:else}
    <header class="shrink-0 border-b px-8 py-6">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="text-xs font-medium text-muted-foreground">{conference.name}</p>
          <h1 class="mt-1 text-xl font-semibold">{committee.name}</h1>
          <p class="mt-1 text-sm text-muted-foreground">席位管理 · 重命名与访问 key</p>
        </div>
        <div class="flex items-center gap-2 text-sm text-muted-foreground">
          <Users class="size-4" />{committee.seats.length} 个席位
        </div>
      </div>
    </header>
    <div class="min-h-0 flex-1 overflow-auto px-8 py-6">
      <Button
        variant="ghost"
        size="sm"
        class="mb-4 gap-1.5 text-xs"
        onclick={() => goto(resolve(`/conference/${conferenceId}/committee/${committeeId}`))}
        ><ArrowLeft /> 返回委员会</Button
      >
      <div class="overflow-hidden rounded-lg border bg-card">
        <table class="w-full text-sm">
          <thead class="bg-muted/50 text-xs text-muted-foreground"
            ><tr
              ><th class="px-4 py-3 text-left font-medium">席位</th><th
                class="px-4 py-3 text-left font-medium">角色</th
              ><th class="px-4 py-3 text-left font-medium">访问 key</th><th
                class="px-4 py-3 text-right font-medium">操作</th
              ></tr
            ></thead
          ><tbody>
            {#each committee.seats as seat (seat.id)}
              {@const code = inviteCode(seat.id)}
              <tr class="border-t"
                ><td class="px-4 py-3 font-medium">{seat.name}</td><td
                  class="px-4 py-3 text-muted-foreground">{seat.role ?? '-'}</td
                ><td class="px-4 py-3"><code class="font-mono text-xs">{code || '未生成'}</code></td
                ><td class="px-4 py-3"
                  ><div class="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      title="复制 key"
                      aria-label="复制 key"
                      disabled={!code}
                      onclick={() => void copyCode(code, seat.id)}
                      >{#if copied === seat.id}<Check />{:else}<Copy />{/if}</Button
                    ><Button
                      variant="ghost"
                      size="icon"
                      title="重新生成 key"
                      aria-label="重新生成 key"
                      onclick={() => rotateSeatInviteCode(seat.id)}><RefreshCw /></Button
                    ><Button
                      variant="ghost"
                      size="icon"
                      title="重命名席位"
                      aria-label="重命名席位"
                      onclick={() => openEditor(seat)}><Pencil /></Button
                    >
                  </div></td
                ></tr
              >
            {:else}<tr
                ><td colspan="4" class="px-4 py-10 text-center text-muted-foreground">暂无席位</td
                ></tr
              >{/each}
          </tbody>
        </table>
      </div>
      <p class="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <KeyRound class="size-3.5" />重新生成后，旧 key 会立即失效。
      </p>
    </div>
  {/if}
</div>

<Dialog.Root bind:open={editorOpen}>
  <Dialog.Content class="sm:max-w-md"
    ><Dialog.Header
      ><Dialog.Title>重命名席位</Dialog.Title><Dialog.Description
        >更新 host 和代表端看到的席位名称。</Dialog.Description
      ></Dialog.Header
    >
    <div class="py-4">
      <Input
        bind:value={editName}
        aria-label="席位名称"
        onkeydown={(event) => event.key === 'Enter' && saveName()}
      />
    </div>
    <Dialog.Footer
      ><Button
        variant="outline"
        onclick={() => {
          editingSeat = null
          editorOpen = false
        }}>取消</Button
      ><Button disabled={!editName.trim()} onclick={saveName}>保存</Button></Dialog.Footer
    ></Dialog.Content
  >
</Dialog.Root>
