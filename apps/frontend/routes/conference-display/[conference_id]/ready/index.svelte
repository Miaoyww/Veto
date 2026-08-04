<script lang="ts">
  import type { ConferenceDisplayData } from '$lib/types-conference'
  import DisplayPage from '$lib/components/conference-display/display-page.svelte'

  let { data }: { data: ConferenceDisplayData } = $props()
</script>

<DisplayPage>
  <div class="flex flex-col items-center gap-6">
    <div class="text-9xl font-light tracking-[0.06em] text-white/20">准备就绪</div>
    {#if data.speakersList?.length > 0}
      <div class="text-base tracking-wider text-white/10">
        发言名单 · {data.speakersList.length} 位代表
      </div>
    {/if}
  </div>
</DisplayPage>
