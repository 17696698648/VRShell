<template>
  <section :class="classes" :style="layoutStyle">
    <nav v-if="showResponsiveSwitcher" class="workbench-layout__responsive-switcher" aria-label="Workbench panels">
      <button type="button" :class="{active: responsivePanel === 'primary'}" @click="responsivePanel = 'primary'">Terminal</button>
      <button v-if="hasSecondary" type="button" :class="{active: responsivePanel === 'secondary'}" @click="responsivePanel = 'secondary'">Editor</button>
      <button v-if="hasDock" type="button" :class="{active: responsivePanel === 'dock'}" @click="responsivePanel = 'dock'">Details</button>
    </nav>
    <UiSplitPane
      v-if="hasDock"
      v-model="dockSplitRatio"
      :direction="dockSplitDirection"
      :first-pane-class="responsivePaneClass('primary')"
      :second-pane-class="responsivePaneClass('dock')"
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
import {computed, defineComponent, h, ref, useSlots, watch} from 'vue'
import {setBottomPanelHeight, setMainSplitRatio, setRightDockWidth} from '../../../entities/workspace'
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
    rightDockWidth?: number
  }>(),
  {
    bottomPanelHeight: 220,
    dockPlacement: 'bottom',
    mainSplitRatio: 62,
    mode: 'horizontal-split',
    preset: 'operations',
    rightDockWidth: 340,
  },
)

const slots = useSlots()
const responsivePanel = ref<ResponsivePanel>('primary')
const hasSecondary = computed(() => Boolean(slots.secondary) && props.mode !== 'single')
const hasDock = computed(() => Boolean(slots.dock) && (props.dockPlacement === 'bottom' || props.dockPlacement === 'right'))
const showResponsiveSwitcher = computed(() => hasSecondary.value || hasDock.value)
const mainSplitDirection = computed(() => (props.mode === 'vertical-split' ? 'horizontal' : 'vertical'))
const dockSplitDirection = computed(() => (props.dockPlacement === 'right' ? 'horizontal' : 'vertical'))
const dockSplitRatio = computed({
  get: () => (props.dockPlacement === 'right' ? widthToRatio(props.rightDockWidth, 1280) : heightToRatio(props.bottomPanelHeight, 820)),
  set: (value) => {
    if (props.dockPlacement === 'right') setRightDockWidth(ratioToWidth(value, 1280))
    else setBottomPanelHeight(ratioToHeight(value, 820))
  },
})
const dockSplitMin = computed(() => (props.dockPlacement === 'right' ? 58 : 48))
const dockSplitMax = computed(() => (props.dockPlacement === 'right' ? 82 : 78))
const classes = computed(() => [
  'workbench-layout',
  `workbench-layout--${props.mode}`,
  `workbench-layout--preset-${props.preset}`,
  `workbench-layout--dock-${props.dockPlacement}`,
  {'workbench-layout--has-dock': hasDock.value},
])
const layoutStyle = computed(() => ({
  '--dock-bottom-height': `${props.bottomPanelHeight}px`,
  '--dock-right-width': `${props.rightDockWidth}px`,
}))

const MainSplitContent = defineComponent({
  name: 'MainSplitContent',
  props: {
    responsivePanel: {
      default: 'primary',
      type: String,
    },
  },
  setup() {
    return () => {
      const primary = h('div', {class: ['workbench-layout__primary', responsivePaneClass('primary')]}, slots.primary?.())
      if (!hasSecondary.value) return primary
      return h(
        UiSplitPane,
        {
          direction: mainSplitDirection.value,
          firstPaneClass: responsivePaneClass('primary'),
          max: 75,
          min: 30,
          modelValue: props.mainSplitRatio,
          secondPaneClass: responsivePaneClass('secondary'),
          'onUpdate:modelValue': setMainSplitRatio,
          onResizeEnd: setMainSplitRatio,
        },
        {
          first: () => primary,
          second: () => h('div', {class: ['workbench-layout__secondary', responsivePaneClass('secondary')]}, slots.secondary?.()),
        },
      )
    }
  },
})

watch([hasSecondary, hasDock], () => {
  if (responsivePanel.value === 'secondary' && !hasSecondary.value) responsivePanel.value = 'primary'
  if (responsivePanel.value === 'dock' && !hasDock.value) responsivePanel.value = 'primary'
})

function responsivePaneClass(panel: ResponsivePanel) {
  return {'workbench-layout__pane--responsive-active': responsivePanel.value === panel}
}

function commitDockResize(value: number) {
  if (props.dockPlacement === 'right') setRightDockWidth(ratioToWidth(value, 1280))
  else setBottomPanelHeight(ratioToHeight(value, 820))
}

function heightToRatio(height: number, total: number) {
  return Math.round(((total - height) / total) * 100)
}

function ratioToHeight(ratio: number, total: number) {
  return Math.round(total - (total * ratio) / 100)
}

function widthToRatio(width: number, total: number) {
  return Math.round(((total - width) / total) * 100)
}

function ratioToWidth(ratio: number, total: number) {
  return Math.round(total - (total * ratio) / 100)
}
</script>
