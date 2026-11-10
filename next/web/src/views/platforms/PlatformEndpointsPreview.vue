<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SDisclosure } from '@sub2api/ui'
import { usePlatforms } from '@/composables/platforms'
import PlatformEndpointList from './PlatformEndpointList.vue'
import { convertedEndpoints } from './convertedEndpoints'

// Endpoints reachable through the given platforms, grouped by platform
// (e.g. what an API key of a group can call), followed by the endpoints of
// the other platforms that accounts of these platforms serve through protocol
// conversion. `max` limits endpoints per platform; `fold` keeps the converted
// platforms behind a toggle that names them, for a small box.
const props = defineProps<{ ids: string[]; max?: number; fold?: boolean }>()
const { t } = useI18n()
const platforms = usePlatforms()
platforms.load()

const own = computed(() => platforms.endpointsOf(props.ids))
const converted = computed(() => convertedEndpoints(platforms.platforms.value, own.value))
const convertedLabel = computed(() =>
  t('platforms.convertedAlso', { platforms: converted.value.map(g => platforms.label(g.id)).join(t('common.listSeparator')) })
)
</script>

<template>
  <div class="space-y-2" data-testid="platform-endpoints">
    <PlatformEndpointList v-for="g in own" :key="g.id" v-bind="g" :max="max" />
    <!-- The toggle already says "via protocol conversion", so the lists behind it are not marked again. -->
    <SDisclosure v-if="fold && converted.length" :label="convertedLabel" :open-label="convertedLabel" data-testid="converted-endpoints">
      <div class="space-y-2">
        <PlatformEndpointList v-for="g in converted" :key="g.id" v-bind="g" :max="max" />
      </div>
    </SDisclosure>
    <template v-else>
      <PlatformEndpointList v-for="g in converted" :key="g.id" v-bind="g" converted :max="max" />
    </template>
  </div>
</template>
