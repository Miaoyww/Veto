<script lang="ts">
  import { goto } from '$app/navigation'
  import { CircleAlert, ClipboardPaste, X } from '@lucide/svelte'
  import { REGEXP_ONLY_DIGITS_AND_CHARS } from 'bits-ui'

  import {
    CloudJoinError,
    saveCloudSeatSession,
    validateCloudInvite,
    type CloudClaimResult,
    type CloudJoinTarget
  } from '$lib/classes/clients/cloud-join-client'
  import * as Alert from '$lib/components/ui/alert'
  import { Button } from '$lib/components/ui/button'
  import * as Dialog from '$lib/components/ui/dialog'
  import * as Field from '$lib/components/ui/field'
  import * as InputOTP from '$lib/components/ui/input-otp'
  import { Spinner } from '$lib/components/ui/spinner'
  import ConferenceConfirmDialog from './join/conference-confirm-dialog.svelte'
  import ConferenceReadyDialog from './join/conference-ready-dialog.svelte'
  import JoinCredentialsDialog from './join/join-credentials-dialog.svelte'

  type JoinStage = 'invite' | 'confirm' | 'credentials' | 'ready'

  let { open = $bindable(false) }: { open: boolean } = $props()
  let stage = $state<JoinStage>('invite')
  let inviteCode = $state('')
  let target = $state<CloudJoinTarget | null>(null)
  let claimResult = $state<CloudClaimResult | null>(null)
  let validationError = $state('')
  let isValidating = $state(false)

  function getInviteCode(): string {
    return inviteCode
  }

  function setInviteCode(value: string): void {
    inviteCode = value.toUpperCase().replace(/[^A-HJ-NP-Z2-9]/g, '')
    validationError = ''
  }

  function clearInviteCode(): void {
    inviteCode = ''
    validationError = ''
  }

  async function pasteInviteCode(): Promise<void> {
    try {
      const clipboardText = await navigator.clipboard.readText()
      setInviteCode(clipboardText.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12))
    } catch {
      validationError = '无法读取剪贴板，请检查系统权限'
    }
  }

  function resetFlow(): void {
    stage = 'invite'
    inviteCode = ''
    target = null
    claimResult = null
    validationError = ''
    isValidating = false
  }

  function closeFlow(): void {
    open = false
    resetFlow()
  }

  function handleDialogOpenChange(value: boolean): void {
    if (!value) closeFlow()
  }

  async function handleInviteSubmit(event: SubmitEvent): Promise<void> {
    event.preventDefault()
    validationError = ''
    isValidating = true

    try {
      target = await validateCloudInvite(inviteCode)
      stage = 'confirm'
    } catch (error) {
      validationError = error instanceof CloudJoinError ? error.message : '无法验证邀请码，请重试'
    } finally {
      isValidating = false
    }
  }

  function handleClaimed(result: CloudClaimResult): void {
    claimResult = result
    saveCloudSeatSession(result)
    stage = 'ready'
  }

  function enterConference(): void {
    if (!claimResult) return
    const { conferenceId, committeeId } = claimResult
    closeFlow()
    void goto(`/client/${conferenceId}/committee/${committeeId}/seat`)
  }
</script>

<Dialog.Root open={open && stage === 'invite'} onOpenChange={handleDialogOpenChange}>
  <Dialog.Content class="sm:max-w-2xl" showCloseButton={!isValidating}>
    <form onsubmit={handleInviteSubmit} class="contents">
      <Dialog.Header>
        <Dialog.Title>加入大会</Dialog.Title>
        <Dialog.Description>输入大会邀请码，查找你受邀加入的大会和席位。</Dialog.Description>
      </Dialog.Header>

      <Field.FieldGroup>
        <Field.Field data-invalid={Boolean(validationError)}>
          <Field.FieldLabel for="conference-invite-code">邀请码</Field.FieldLabel>
          <div class="flex items-center justify-center gap-2">
            <InputOTP.Root
              inputId="conference-invite-code"
              bind:value={getInviteCode, setInviteCode}
              maxlength={12}
              pattern={REGEXP_ONLY_DIGITS_AND_CHARS}
              aria-invalid={Boolean(validationError)}
              disabled={isValidating}
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
              disabled={isValidating}
            >
              <X data-icon="inline-start" />
            </Button>
            <Button
              variant="outline"
              size="icon-lg"
              onclick={pasteInviteCode}
              aria-label="粘贴邀请码"
              title="粘贴邀请码"
              disabled={isValidating}
            >
              <ClipboardPaste data-icon="inline-start" />
            </Button>
          </div>
        </Field.Field>
      </Field.FieldGroup>

      {#if validationError}
        <Alert.Root variant="destructive">
          <CircleAlert />
          <Alert.Title>无法验证邀请码</Alert.Title>
          <Alert.Description>{validationError}</Alert.Description>
        </Alert.Root>
      {/if}

      <Dialog.Footer>
        <Button type="submit" variant="outline" disabled={isValidating || inviteCode.length !== 12}>
          {#if isValidating}
            <Spinner data-icon="inline-start" aria-label="正在验证" />
            正在验证
          {:else}
            加入
          {/if}
        </Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>

{#if target}
  <ConferenceConfirmDialog
    open={open && stage === 'confirm'}
    {target}
    onBack={() => (stage = 'invite')}
    onConfirm={() => (stage = 'credentials')}
    onOpenChange={handleDialogOpenChange}
  />

  <JoinCredentialsDialog
    open={open && stage === 'credentials'}
    {target}
    onBack={() => (stage = 'confirm')}
    onClaimed={handleClaimed}
    onOpenChange={handleDialogOpenChange}
  />
{/if}

{#if claimResult}
  <ConferenceReadyDialog
    open={open && stage === 'ready'}
    result={claimResult}
    onEnter={enterConference}
    onOpenChange={handleDialogOpenChange}
  />
{/if}
