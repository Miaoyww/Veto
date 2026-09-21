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
    hasStoredCredential = false,
    isSubmitting = false,
    requestError = '',
    onBack,
    onConfirm,
    onOpenChange
  }: {
    open: boolean
    target: CloudJoinTarget
    hasStoredCredential?: boolean
    isSubmitting?: boolean
    requestError?: string
    onBack: () => void
    onConfirm: () => void
    onOpenChange: (open: boolean) => void
  } = $props()

  const seatClaimed = $derived(target.seatState === 'claimed')
  const canRejoin = $derived(seatClaimed && (hasStoredCredential || !target.hasPassword))
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

    {#if canRejoin}
      <Alert.Root>
        <TriangleAlert />
        <Alert.Title>重新入会</Alert.Title>
        <Alert.Description>
          {hasStoredCredential
            ? '已在本机找到入会密码，确认后将直接重新进入该席位。'
            : '该席位没有设置入会密码，确认后将直接重新进入。'}
        </Alert.Description>
      </Alert.Root>
    {:else if seatClaimed}
      <Alert.Root variant="destructive">
        <TriangleAlert />
        <Alert.Title>该席位已被认领</Alert.Title>
        <Alert.Description>未在本机找到有效入会密码，继续后需要重新填写密码。</Alert.Description>
      </Alert.Root>
    {/if}

    {#if requestError}
      <Alert.Root variant="destructive">
        <TriangleAlert />
        <Alert.Title>无法重新入会</Alert.Title>
        <Alert.Description>{requestError}</Alert.Description>
      </Alert.Root>
    {/if}

    <Dialog.Footer>
      <Button variant="outline" onclick={onBack} disabled={isSubmitting}>返回</Button>
      <Button onclick={onConfirm} disabled={isSubmitting}>
        {#if isSubmitting}
          正在重新入会
        {:else}
          确认大会
        {/if}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
