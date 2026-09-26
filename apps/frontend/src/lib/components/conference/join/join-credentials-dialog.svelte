<script lang="ts">
  import { CircleAlert } from '@lucide/svelte'

  import {
    authenticateCloudSeat,
    claimCloudSeat,
    CloudJoinError,
    type CloudClaimResult,
    type CloudJoinTarget
  } from '$lib/classes/clients/cloud-join-client'
  import * as Alert from '$lib/components/ui/alert'
  import { Button } from '$lib/components/ui/button'
  import * as Dialog from '$lib/components/ui/dialog'
  import * as Field from '$lib/components/ui/field'
  import { Input } from '$lib/components/ui/input'
  import { Spinner } from '$lib/components/ui/spinner'

  let {
    open,
    target,
    mode = 'claim',
    onBack,
    onClaimed,
    onOpenChange
  }: {
    open: boolean
    target: CloudJoinTarget
    mode?: 'claim' | 'authenticate'
    onBack: () => void
    onClaimed: (result: CloudClaimResult, password?: string) => void
    onOpenChange: (open: boolean) => void
  } = $props()

  const isClaimMode = $derived(mode === 'claim')

  let displayName = $state('')
  let password = $state('')
  let nameError = $state('')
  let requestError = $state('')
  let isSubmitting = $state(false)

  function handleOpenChange(value: boolean): void {
    if (isSubmitting && !value) return
    onOpenChange(value)
  }

  async function handleSubmit(event: SubmitEvent): Promise<void> {
    event.preventDefault()
    requestError = ''

    if (isClaimMode) {
      const normalizedName = displayName.trim()
      nameError = normalizedName ? '' : '请填写姓名'
      if (nameError) return
    }

    if ((isClaimMode || target.hasPassword) && !password) {
      requestError = '请填写入会密码'
      return
    }

    isSubmitting = true
    try {
      const result = isClaimMode
        ? await claimCloudSeat({
            inviteCode: target.inviteCode,
            displayName: displayName.trim(),
            password
          })
        : await authenticateCloudSeat({
            inviteCode: target.inviteCode,
            password: password || undefined
          })
      onClaimed(result, password || undefined)
    } catch (error) {
      requestError = error instanceof CloudJoinError ? error.message : '加入大会失败，请重试'
    } finally {
      isSubmitting = false
    }
  }
</script>

<Dialog.Root {open} onOpenChange={handleOpenChange}>
  <Dialog.Content class="sm:max-w-md" showCloseButton={!isSubmitting}>
    <form onsubmit={handleSubmit} class="contents">
      <Dialog.Header>
        <Dialog.Title>{isClaimMode ? '填写身份信息' : '验证席位密码'}</Dialog.Title>
        <Dialog.Description>
          {isClaimMode
            ? `你将以“${target.seatName}”加入${target.committeeName}。`
            : `该席位已认领，请验证“${target.seatName}”的入会密码。`}
        </Dialog.Description>
      </Dialog.Header>

      <Field.FieldGroup>
        {#if isClaimMode}
          <Field.Field data-invalid={Boolean(nameError)}>
            <Field.FieldLabel for="join-display-name">姓名</Field.FieldLabel>
            <Input
              id="join-display-name"
              bind:value={displayName}
              maxlength={80}
              autocomplete="name"
              placeholder="请输入姓名"
              aria-invalid={Boolean(nameError)}
              disabled={isSubmitting}
              required
            />
            {#if nameError}
              <Field.FieldError>{nameError}</Field.FieldError>
            {/if}
          </Field.Field>
        {/if}

        <Field.Field>
          <Field.FieldLabel for="join-password">
            {isClaimMode ? '密码' : '入会密码'}
          </Field.FieldLabel>
          <Input
            id="join-password"
            type="password"
            bind:value={password}
            maxlength={128}
            autocomplete={isClaimMode ? 'new-password' : 'current-password'}
            placeholder={isClaimMode ? '为席位设置登录密码' : '请输入入会密码'}
            disabled={isSubmitting}
            required={isClaimMode || target.hasPassword}
          />
          {#if isClaimMode}
            <Field.FieldDescription>密码将用于后续重新登录该席位。</Field.FieldDescription>
          {/if}
        </Field.Field>
      </Field.FieldGroup>

      {#if requestError}
        <Alert.Root variant="destructive">
          <CircleAlert />
          <Alert.Title>无法加入大会</Alert.Title>
          <Alert.Description>{requestError}</Alert.Description>
        </Alert.Root>
      {/if}

      <Dialog.Footer>
        <Button type="button" variant="outline" onclick={onBack} disabled={isSubmitting}>
          返回
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting ||
            (isClaimMode && !displayName.trim()) ||
            ((isClaimMode || target.hasPassword) && !password)}
        >
          {#if isSubmitting}
            <Spinner data-icon="inline-start" aria-label="正在加入" />
            正在加入
          {:else}
            继续
          {/if}
        </Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>
