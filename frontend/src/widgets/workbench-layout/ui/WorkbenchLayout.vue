<template>
  <section ref="rootRef" :class="classes" :style="layoutStyle">
    <nav v-if="showResponsiveSwitcher" class="workbench-layout__responsive-switcher" aria-label="Workbench panels">
      <button type="button" :class="{active: responsivePanel === 'primary'}" :aria-pressed="responsivePanel === 'primary'" @click="responsivePanel = 'primary'">Terminal</button>
      <button v-if="hasSecondary" type="button" :class="{active: responsivePanel === 'secondary'}" :aria-pressed="responsivePanel === 'secondary'" @click="responsivePanel = 'secondary'">Editor</button>
      <button v-if="hasDock" type="button" :class="{active: responsivePanel === 'dock'}" :aria-pressed="responsivePanel === 'dock'" @click="responsivePanel = 'dock'">Details</button>
    </nav>
    <UiSplitPane
      v-if="hasDock"
      v-model="dockSplitRatio"
      :direction="dockSplitDirection"
      :min="dockSplitMin"
      :max="dockSplitMax"
      @resize-end="commitDockResize"
    >
      <template #first>
        <MainSplitContent :responsive-panel="responsivePanel" />
      </template>
      <template #second>
        <aside class="workbench-layout__dock" :class="responsivePaneClass('dock')" :data-placement="dockPlacement">
          <slot name="dock" />
        </aside>
      </template>
    </UiSplitPane>
    <MainSplitContent v-else :responsive-panel="responsivePanel" />
  </section>
</template>

<script setup lang="ts">
import {computed, defineComponent, h, onMounted, onUnmounted, ref, useSlots, watch} from 'vue'
import {setBottomPanelHeight, setMainSplitRatio} from '../../../entities/workspace'
import type {MainAreaMode, PanelPlacement, WorkspaceLayoutPreset} from '../../../entities/workspace'
import {UiSplitPane} from '../../../shared/ui'

type ResponsivePanel = 'primary' | 'secondary' | 'dock'

const props = withDefaults(
  defineProps<{
    bottomPanelHeight?: number
    mainSplitRatio?: number
    mode?: MainAreaMode
    preset?: WorkspaceLayoutPreset
    dockPlacement?: PanelPlacement
    visible?: boolean
  }>(),
  {
    bottomPanelHeight: 220,
    dockPlacement: 'bottom',
    mainSplitRatio: 62,
    mode: 'horizontal-split',
    preset: 'operations',
    visible: true,
  },
)

const slots = useSlots()
const rootRef = ref<HTMLElement | null>(null)
const layoutHeight = ref(820)
const responsivePanel = ref<ResponsivePanel>('primary')
const hasSecondary = computed(() => Boolean(slots.secondary) && props.mode !== 'single')
const hasDock = computed(() => props.visible && props.dockPlacement === 'bottom')
const showResponsiveSwitcher = computed(() => hasSecondary.value || hasDock.value)
const mainSplitDirection = computed(() => (props.mode === 'vertical-split' ? 'horizontal' : 'vertical'))
const dockSplitDirection = 'vertical' as const
const dockSplitRatio = computed({
  get: () => heightToRatio(props.bottomPanelHeight, layoutHeight.value),
  set: (value) => setBottomPanelHeight(ratioToHeight(value, layoutHeight.value)),
})
const dockSplitMin = computed(() => 48)
const dockSplitMax = computed(() => 78)
const classes = computed(() => [
  'workbench-layout-root',
  hasDock.value ? `workbench-layout--dock-${props.dockPlacement}` : null,
  {'workbench-layout--has-dock': hasDock.value},
])
const layoutStyle = computed(() => ({
  '--dock-bottom-height': `${props.bottomPanelHeight}px`,
}))

let resizeObserver: ResizeObserver | null = null

const MainSplitContent = defineComponent({
  name: 'MainSplitContent',
  props: {
    responsivePanel: {
      default: 'primary',
      type: String,
    },
  },
  setup(componentProps) {
    return () => {
      const activePanel = componentProps.responsivePanel as ResponsivePanel
      const primary = h('div', {class: ['workbench-layout__primary', responsivePaneClass('primary', activePanel)]}, slots.primary?.())
      if (!hasSecondary.value) return primary
      return h(
        UiSplitPane,
        {
          direction: mainSplitDirection.value,
          firstPaneClass: null,
          max: 75,
          min: 30,
          modelValue: props.mainSplitRatio,
          secondPaneClass: null,
          'onUpdate:modelValue': setMainSplitRatio,
          onResizeEnd: setMainSplitRatio,
        },
        {
          first: () => primary,
          second: () => h('div', {class: ['workbench-layout__secondary', responsivePaneClass('secondary', activePanel)]}, slots.secondary?.()),
        },
      )
    }
  },
})

onMounted(() => {
  updateLayoutHeight()
  if (!rootRef.value) return
  resizeObserver = new ResizeObserver(updateLayoutHeight)
  resizeObserver.observe(rootRef.value)
})

onUnmounted(() => resizeObserver?.disconnect())

watch([hasSecondary, hasDock], () => {
  if (responsivePanel.value === 'secondary' && !hasSecondary.value) responsivePanel.value = 'primary'
  if (responsivePanel.value === 'dock' && !hasDock.value) responsivePanel.value = 'primary'
})

function commitDockResize(value: number) {
  setBottomPanelHeight(ratioToHeight(value, layoutHeight.value))
}

function updateLayoutHeight() {
  const nextHeight = rootRef.value?.getBoundingClientRect().height
  if (nextHeight && nextHeight > 0) layoutHeight.value = Math.round(nextHeight)
}

function responsivePaneClass(panel: ResponsivePanel, activePanel = responsivePanel.value) {
  return {'workbench-layout__pane--responsive-hidden': activePanel !== panel}
}

function heightToRatio(height: number, total: number) {
  return Math.round(((total - height) / total) * 100)
}

function ratioToHeight(ratio: number, total: number) {
  return Math.round(total - (total * ratio) / 100)
}
</script>
