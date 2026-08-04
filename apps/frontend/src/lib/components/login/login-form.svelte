<script lang="ts">
  import { Button } from '$lib/components/ui/button/index.js'
  import { FieldGroup, Field, FieldLabel } from '$lib/components/ui/field/index.js'
  import { Input } from '$lib/components/ui/input/index.js'
  import { Tabs, TabsList, TabsTrigger, TabsContent } from '$lib/components/ui/tabs/index.js'
  import { cn, type WithElementRef } from '$lib/utils.js'
  import type { HTMLFormAttributes } from 'svelte/elements'

  let {
    ref = $bindable(null),
    class: className,
    ...restProps
  }: WithElementRef<HTMLFormAttributes> = $props()
  const id = $props.id()

  let activeTab = $state('password')
</script>

<form class={cn('flex flex-col gap-6', className)} bind:this={ref} {...restProps}>
  <Tabs bind:value={activeTab} class="flex-col">
    <TabsList class="mb-6 flex w-full flex-row">
      <TabsTrigger value="phone">手机号登录</TabsTrigger>
      <TabsTrigger value="password">账号密码登录</TabsTrigger>
      <TabsTrigger value="invite">邀请码入会</TabsTrigger>
    </TabsList>

    <!-- 手机号登录 -->
    <TabsContent value="phone">
      <FieldGroup>
        <Field>
          <FieldLabel for="phone-{id}">手机号</FieldLabel>
          <Input id="phone-{id}" type="tel" placeholder="请输入手机号" required />
        </Field>
        <Field>
          <FieldLabel for="sms-code-{id}">验证码</FieldLabel>
          <div class="flex gap-3">
            <Input
              id="sms-code-{id}"
              type="text"
              placeholder="请输入验证码"
              required
              class="flex-1"
            />
            <Button type="button" variant="outline" class="shrink-0">获取验证码</Button>
          </div>
        </Field>
        <Field>
          <Button type="submit" class="w-full">登录</Button>
        </Field>
      </FieldGroup>
    </TabsContent>

    <!-- 账号密码登录 -->
    <TabsContent value="password">
      <FieldGroup>
        <Field>
          <FieldLabel for="email-{id}">邮箱</FieldLabel>
          <Input id="email-{id}" type="email" placeholder="m@example.com" required />
        </Field>
        <Field>
          <div class="flex items-center">
            <FieldLabel for="password-{id}">密码</FieldLabel>
            <a href="##" class="ms-auto text-sm text-gray-400 underline-offset-4 hover:underline">
              忘记密码?
            </a>
          </div>
          <Input id="password-{id}" type="password" required />
        </Field>
        <Field>
          <Button type="submit" class="w-full">登录</Button>
        </Field>
      </FieldGroup>
    </TabsContent>

    <!-- 邀请码入会 -->
    <TabsContent value="invite">
      <FieldGroup>
        <Field>
          <FieldLabel for="invite-code-{id}">邀请码</FieldLabel>
          <Input id="invite-code-{id}" type="text" placeholder="请输入邀请码" required />
        </Field>
        <Field>
          <Button type="submit" class="w-full">加入</Button>
        </Field>
      </FieldGroup>
    </TabsContent>
  </Tabs>
</form>
