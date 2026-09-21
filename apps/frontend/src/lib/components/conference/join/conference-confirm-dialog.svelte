<script lang="ts">
  import { TriangleAlert } from '@lucide/svelte'

  import type { CloudJoinTarget } from '$lib/classes/clients/cloud-join-client'
  import * as Alert from '$lib/components/ui/alert'
  import { Badge } from '$lib/components/ui/badge'
  import { Button } from '$lib/components/ui/button'
  import * as Card from '$lib/components/ui/card'
  import * as Dialog from '$lib/components/ui/dialog'

  let {
    open,
    target,
    onBack,
    onConfirm,
    onOpenChange
  }: {
    open: boolean
    target: CloudJoinTarget
    onBack: () => void
    onConfirm: () => void
    onOpenChange: (open: boolean) => void
  } = $props()

  const seatClaimed = $derived(target.seatState === 'claimed')
</script>

<Dialog.Root {open} {onOpenChange}>
  <Dialog.Content class="sm:max-w-lg">
    <Dialog.Header>
      <Dialog.Title>确认大会</Dialog.Title>
      <Dialog.Description>请确认邀请码对应的大会和席位。</Dialog.Description>
    </Dialog.Header>

    <Card.Root>
      <Card.Header>
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <Card.Title>{target.conferenceName}</Card.Title>
            <Card.Description>{target.organizer}</Card.Description>
          </div>
          <Badge variant={seatClaimed ? 'destructive' : 'secondary'}>
            {seatClaimed ? '已认领' : '可加入'}
          </Badge>
        </div>
      </Card.Header>
      <Card.Content>
        <dl class="grid gap-3 text-sm sm:grid-cols-2">
          <div class="flex flex-col gap-1">
            <dt class="text-muted-foreground">委员会</dt>
            <dd class="font-medium">{target.committeeName}</dd>
          </div>
          <div class="flex flex-col gap-1">
            <dt class="text-muted-foreground">席位</dt>
            <dd class="font-medium">{target.seatName}</dd>
          </div>
          <div class="flex flex-col gap-1 sm:col-span-2">
            <dt class="text-muted-foreground">角色</dt>
            <dd class="font-medium">{target.roleName}</dd>
          </div>
        </dl>
      </Card.Content>
    </Card.Root>

    {#if seatClaimed}
      <Alert.Root variant="destructive">
        <TriangleAlert />
        <Alert.Title>该席位已被认领</Alert.Title>
        <Alert.Description>当前加入接口暂不支持重新登录该席位。</Alert.Description>
      </Alert.Root>
    {/if}

    <Dialog.Footer>
      <Button variant="outline" onclick={onBack}>返回</Button>
      <Button onclick={onConfirm} disabled={seatClaimed}>确认大会</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
