<script lang="ts">
  import { ClipboardPaste, X } from '@lucide/svelte'
  import { REGEXP_ONLY_DIGITS_AND_CHARS } from 'bits-ui'

  import { Button } from '$lib/components/ui/button'
  import * as Dialog from '$lib/components/ui/dialog'
  import * as Field from '$lib/components/ui/field'
  import * as InputOTP from '$lib/components/ui/input-otp'

  let { open = $bindable(false) }: { open: boolean } = $props()
  let inviteCode = $state('')

  function getInviteCode(): string {
    return inviteCode
  }

  function setInviteCode(value: string): void {
    inviteCode = value.toUpperCase()
  }

  function clearInviteCode(): void {
    inviteCode = ''
  }

  async function pasteInviteCode(): Promise<void> {
    try {
      const clipboardText = await navigator.clipboard.readText()
      setInviteCode(clipboardText.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12))
    } catch {
      // Clipboard access can be denied by the browser or operating system.
    }
  }

  function handleOpenChange(value: boolean): void {
    open = value
    if (!value) inviteCode = ''
  }
</script>

<Dialog.Root bind:open onOpenChange={handleOpenChange}>
  <Dialog.Content class="sm:max-w-2xl">
    <Dialog.Header>
      <Dialog.Title>加入大会</Dialog.Title>
      <Dialog.Description>输入大会邀请码，加入一场已有的大会。</Dialog.Description>
    </Dialog.Header>

    <Field.FieldGroup>
      <Field.Field>
        <Field.FieldLabel for="conference-invite-code">邀请码</Field.FieldLabel>
        <div class="flex items-center justify-center gap-2">
          <InputOTP.Root
            inputId="conference-invite-code"
            bind:value={getInviteCode, setInviteCode}
            maxlength={12}
            pattern={REGEXP_ONLY_DIGITS_AND_CHARS}
          >
            {#snippet children({ cells })}
              <InputOTP.Group>
                {#each cells.slice(0, 4) as cell (cell)}
                  <InputOTP.Slot {cell} />
                {/each}
              </InputOTP.Group>
              <InputOTP.Separator />
              <InputOTP.Group>
                {#each cells.slice(4, 8) as cell (cell)}
                  <InputOTP.Slot {cell} />
                {/each}
              </InputOTP.Group>
              <InputOTP.Separator />
              <InputOTP.Group>
                {#each cells.slice(8, 12) as cell (cell)}
                  <InputOTP.Slot {cell} />
                {/each}
              </InputOTP.Group>
            {/snippet}
          </InputOTP.Root>

          <Button
            variant="outline"
            size="icon-lg"
            onclick={clearInviteCode}
            aria-label="全部删除"
            title="全部删除"
          >
            <X data-icon="inline-start" />
          </Button>
          <Button
            variant="outline"
            size="icon-lg"
            onclick={pasteInviteCode}
            aria-label="粘贴邀请码"
            title="粘贴邀请码"
          >
            <ClipboardPaste data-icon="inline-start" />
          </Button>
        </div>
      </Field.Field>
    </Field.FieldGroup>

    <Dialog.Footer>
      <Button variant="outline">加入</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
