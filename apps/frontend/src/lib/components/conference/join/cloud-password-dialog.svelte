<script lang="ts">
  import { CircleAlert } from '@lucide/svelte'

  import { CloudJoinError } from '$lib/classes/clients/cloud-join-client'
  import {
    getCloudMembershipPassword,
    updateCloudMembershipPassword,
    type CloudMembership
  } from '$lib/classes/stores/conference/cloud-membership-store'
  import * as Alert from '$lib/components/ui/alert'
  import { Button } from '$lib/components/ui/button'
  import * as Dialog from '$lib/components/ui/dialog'
  import * as Field from '$lib/components/ui/field'
  import { Input } from '$lib/components/ui/input'
  import { Spinner } from '$lib/components/ui/spinner'

  let {
    open,
    membership,
    onOpenChange
  }: {
    open: boolean
    membership: CloudMembership | null
    onOpenChange: (open: boolean) => void
  } = $props()

  let currentPassword = $state('')
  let nextPassword = $state('')
  let confirmPassword = $state('')
  let requestError = $state('')
  let isSubmitting = $state(false)

  const passwordsDoNotMatch = $derived(
    confirmPassword.length > 0 && nextPassword !== confirmPassword
  )

  function resetForm(): void {
    currentPassword = ''
    nextPassword = ''
    confirmPassword = ''
    requestError = ''
    isSubmitting = false
  }

  $effect(() => {
    if (!open || !membership) {
      resetForm()
      return
    }

    let active = true
    getCloudMembershipPassword(membership).then((password) => {
      if (active) currentPassword = password ?? ''
    })

    return () => {
      active = false
    }
  })

  function handleOpenChange(value: boolean): void {
    if (isSubmitting && !value) return
    onOpenChange(value)
  }

  async function handleSubmit(event: SubmitEvent): Promise<void> {
    event.preventDefault()
    if (!membership || !nextPassword || passwordsDoNotMatch || isSubmitting) return

    requestError = ''
    isSubmitting = true
    try {
      await updateCloudMembershipPassword(membership, nextPassword)
      onOpenChange(false)
    } catch (error) {
      requestError = error instanceof CloudJoinError ? error.message : '无法保存入会密码，请重试'
    } finally {
      isSubmitting = false
    }
  }
</script>

<Dialog.Root {open} onOpenChange={handleOpenChange}>
  <Dialog.Content class="sm:max-w-md" showCloseButton={!isSubmitting}>
    <form onsubmit={handleSubmit} class="contents">
      <Dialog.Header>
        <Dialog.Title>重新填写入会密码</Dialog.Title>
        <Dialog.Description>
          这里只修改本机保存的入会密码，不会修改云端席位密码。
        </Dialog.Description>
      </Dialog.Header>

      <Field.FieldGroup>
        <Field.Field>
          <Field.FieldLabel for="cloud-current-password">当前密码</Field.FieldLabel>
          <Input
            id="cloud-current-password"
            bind:value={currentPassword}
            type="text"
            readonly
            placeholder="未在本机找到密码"
          />
        </Field.Field>

        <Field.Field data-invalid={!nextPassword}>
          <Field.FieldLabel for="cloud-next-password">新的入会密码</Field.FieldLabel>
          <Input
            id="cloud-next-password"
            bind:value={nextPassword}
            type="password"
            maxlength={128}
            autocomplete="new-password"
            placeholder="请输入新的入会密码"
            aria-invalid={!nextPassword}
            disabled={isSubmitting}
            required
          />
          {#if !nextPassword}
            <Field.FieldError>请填写新的入会密码</Field.FieldError>
          {/if}
        </Field.Field>

        <Field.Field data-invalid={passwordsDoNotMatch}>
          <Field.FieldLabel for="cloud-confirm-password">确认新密码</Field.FieldLabel>
          <Input
            id="cloud-confirm-password"
            bind:value={confirmPassword}
            type="password"
            maxlength={128}
            autocomplete="new-password"
            placeholder="请再次输入新的入会密码"
            aria-invalid={passwordsDoNotMatch}
            disabled={isSubmitting}
            required
          />
          {#if passwordsDoNotMatch}
            <Field.FieldError>两次输入的密码不一致</Field.FieldError>
          {/if}
        </Field.Field>
      </Field.FieldGroup>

      {#if requestError}
        <Alert.Root variant="destructive">
          <CircleAlert />
          <Alert.Title>无法保存密码</Alert.Title>
          <Alert.Description>{requestError}</Alert.Description>
        </Alert.Root>
      {/if}

      <Dialog.Footer>
        <Button type="button" variant="outline" onclick={() => onOpenChange(false)}>取消</Button>
        <Button type="submit" disabled={isSubmitting || !nextPassword || passwordsDoNotMatch}>
          {#if isSubmitting}
            <Spinner data-icon="inline-start" aria-label="正在保存" />
            正在保存
          {:else}
            保存密码
          {/if}
        </Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>
