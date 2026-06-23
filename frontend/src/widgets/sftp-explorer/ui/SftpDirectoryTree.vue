<template>
  <UiTree
    class="sftp-directory-tree"
    :expanded-keys="expandedKeys"
    :get-key="(node) => node.path"
    :get-level="(node) => node.level"
    :get-parent-key="(node) => node.parentPath"
    :items="visibleNodes"
    :selected-key="selectedPath"
    label="Remote directory tree"
    @select="selectNode"
    @toggle="toggleNode"
  >
    <template #default="{item, treeItemProps}">
      <button v-bind="treeItemProps" class="sftp-directory-tree__item" type="button" :title="item.path">
        <ChevronDown v-if="item.type === 'directory' && expandedPaths.has(item.path)" class="sftp-directory-tree__chevron" :size="14" aria-hidden="true" />
        <ChevronRight v-else-if="item.type === 'directory'" class="sftp-directory-tree__chevron" :size="14" aria-hidden="true" />
        <span v-else class="sftp-directory-tree__chevron" aria-hidden="true" />
        <Folder v-if="item.type === 'directory'" :size="16" aria-hidden="true" />
        <File v-else :size="16" aria-hidden="true" />
        <span>{{ item.name }}</span>
        <small v-if="loadingPaths.has(item.path)">Loading…</small>
      </button>
    </template>
  </UiTree>
</template>

<script setup lang="ts">
import {ChevronDown, ChevronRight, File, Folder} from '@lucide/vue'
import {computed, reactive, ref, watch} from 'vue'
import type {SessionHost} from '../../../entities/session'
import type {SftpItem} from '../../../entities/sftp'
import {listRemoteDirectory} from '../../../entities/sftp/api/sftpRepository'
import {pushToast} from '../../../shared/feedback'
import {UiTree} from '../../../shared/ui'

type SftpTreeNode = SftpItem & {level: number; parentPath: string | null}

const props = defineProps<{items: SftpItem[]; rootPath: string; session: SessionHost | null}>()
const expandedPaths = reactive(new Set<string>())
const loadingPaths = reactive(new Set<string>())
const childrenByPath = reactive(new Map<string, SftpItem[]>())
const selectedPath = ref<string | null>(null)

const expandedKeys = computed(() => [...expandedPaths])
const visibleNodes = computed(() => buildNodes(props.rootPath, props.items, 1, null))

watch(
  () => [props.rootPath, props.items] as const,
  ([rootPath, items]) => {
    childrenByPath.set(rootPath, items)
    expandedPaths.add(rootPath)
  },
  {immediate: true},
)

async function selectNode(node: SftpTreeNode) {
  selectedPath.value = node.path
  if (node.type === 'directory') await toggleNode(node)
}

async function toggleNode(node: SftpTreeNode) {
  if (node.type !== 'directory') return
  if (expandedPaths.has(node.path)) {
    expandedPaths.delete(node.path)
    return
  }

  expandedPaths.add(node.path)
  if (!childrenByPath.has(node.path)) await loadChildren(node.path)
}

async function loadChildren(path: string) {
  if (!props.session || loadingPaths.has(path)) return
  loadingPaths.add(path)
  try {
    childrenByPath.set(path, await listRemoteDirectory(props.session, path))
  } catch (error) {
    expandedPaths.delete(path)
    pushToast({level: 'error', title: `Failed to expand ${path}`, detail: getErrorMessage(error)})
  } finally {
    loadingPaths.delete(path)
  }
}

function buildNodes(parentPath: string, items: SftpItem[], level: number, parentNodePath: string | null): SftpTreeNode[] {
  return items.flatMap((item) => {
    const node = {...item, level, parentPath: parentNodePath}
    const children = item.type === 'directory' && expandedPaths.has(item.path) ? childrenByPath.get(item.path) : null
    return children ? [node, ...buildNodes(item.path, children, level + 1, item.path)] : [node]
  })
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}
</script>
