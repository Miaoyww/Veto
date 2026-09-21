<script lang="ts">
  import { CircleCheck, LogIn } from '@lucide/svelte'

  import type { CloudClaimResult } from '$lib/classes/clients/cloud-join-client'
  import * as Alert from '$lib/components/ui/alert'
  import { Button } from '$lib/components/ui/button'
  import * as Card from '$lib/components/ui/card'
  import * as Dialog from '$lib/components/ui/dialog'

  let {
    open,
    result,
    onEnter,
    onOpenChange
  }: {
    open: boolean
    result: CloudClaimResult
    onEnter: () => void
    onOpenChange: (open: boolean) => void
  } = $props()
</script>

<Dialog.Root {open} {onOpenChange}>
  <Dialog.Content class="sm:max-w-md">
    <Dialog.Header>
      <Dialog.Title>准备进入大会</Dialog.Title>
      <Dialog.Description>席位已认领完成，你现在可以进入大会。</Dialog.Description>
    </Dialog.Header>

    <Alert.Root>
      <CircleCheck />
      <Alert.Title>加入成功</Alert.Title>
      <Alert.Description>
        {result.identity.displayName}，你的身份信息已经准备完成。
      </Alert.Description>
    </Alert.Root>

    <Card.Root>
      <Card.Header>
        <Card.Title>{result.conferenceName}</Card.Title>
        <Card.Description>{result.committeeName}</Card.Description>
      </Card.Header>
      <Card.Content>
        <dl class="grid gap-3 text-sm sm:grid-cols-2">
          <div class="flex flex-col gap-1">
            <dt class="text-muted-foreground">席位</dt>
            <dd class="font-medium">{result.seatName}</dd>
          </div>
          <div class="flex flex-col gap-1">
            <dt class="text-muted-foreground">角色</dt>
            <dd class="font-medium">{result.roleName}</dd>
          </div>
        </dl>
      </Card.Content>
    </Card.Root>

    <Dialog.Footer>
      <Button onclick={onEnter}>
        <LogIn data-icon="inline-start" />
        进入大会
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
