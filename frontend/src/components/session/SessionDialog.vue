<template>
  <BaseDialog
    :visible="visible"
    :title="mode === 'create' ? 'New Session' : 'Edit Session'"
    message="Fill in connection details and save to the session tree."
    width="680px"
    max-height="calc(100vh - 64px)"
    body-scrollable
    flush
    @close="requestClose"
  >
    <template #headerActions>
      <button type="button" class="dialog-close" @click="requestClose">
        <X :size="18"/>
      </button>
    </template>

    <el-form ref="formRef" class="session-form" :model="form" :rules="sessionRules" @submit.prevent="submitForm">
      <div class="dialog-body">
        <DialogSection index="01" title="Basic information"
                       description="Name this endpoint and choose where it belongs.">

          <el-form-item prop="name">
            <FormField label="Name" :error="errors.name" :invalid="Boolean(errors.name)">
              <el-input :model-value="form.name" placeholder="prod-api-01" @blur="emit('validate-field', 'name')"
                        @input="updateFieldValue('name', $event); emit('clear-error', 'name')"/>
            </FormField>
          </el-form-item>

          <FormField label="Group">
            <GroupTreeSelect
              :open="groupTreeSelectOpen"
              :selected-group-id="form.groupId"
              :selected-group-name="selectedGroupName"
              :options="visibleGroupTreeOptions"
              :expanded-groups="formExpandedGroups"
              :normalize-display-text="normalizeDisplayText"
              @toggle="emit('toggle-group-select')"
              @close="groupTreeSelectOpen && emit('toggle-group-select')"
              @select="emit('select-group', $event)"
              @toggle-group="(mouseEvent, group) => emit('toggle-option-group', mouseEvent, group)"
            />
          </FormField>
        </DialogSection>

        <DialogSection index="02" title="Connection" description="Host, port, and authentication details.">

          <FormFieldGroup paired>
            <el-form-item prop="address">
              <FormField label="Address/Port" :error="errors.address" :invalid="Boolean(errors.address)">
                <el-input :model-value="form.address" placeholder="192.168.1.10"
                          @blur="emit('validate-field', 'address')"
                          @input="updateFieldValue('address', $event); emit('clear-error', 'address')"/>
              </FormField>
            </el-form-item>
            <el-form-item prop="port">
              <FormField label="Port" :error="errors.port" :invalid="Boolean(errors.port)" hide-label>
                <el-input-number :model-value="form.port" :min="1" :max="65535" controls-position="right"
                                 @blur="emit('validate-field', 'port')"
                                 @change="updateNumberValue('port', $event); emit('clear-error', 'port')"/>
              </FormField>
            </el-form-item>
          </FormFieldGroup>

          <SessionAuthFields
            :auth-method="form.authMethod"
            :user="form.user"
            :password="form.password"
            :private-key-path="form.privateKeyPath"
            :passphrase="form.passphrase"
            :user-error="errors.user"
            @update-field="updateFieldValue"
            @clear-user-error="emit('clear-error', 'user')"
            @validate-user="emit('validate-field', 'user')"
            @choose-private-key="choosePrivateKey"
          />
        </DialogSection>

        <DialogSection index="03" title="Notes" description="Optional context for environment or jump hosts." compact>
          <SessionNotesFields :remark="form.remark" @update="updateFieldValue('remark', $event)"/>
        </DialogSection>

        <DialogSection index="04" title="SSH Advanced" description="Reconnection, idle timeout, and host key options."
                       compact>

          <SessionAdvancedFields
            :auto-reconnect="form.autoReconnect"
            :hash-known-hosts="form.hashKnownHosts"
            :idle-timeout-secs="form.idleTimeoutSecs"
            :identity-file="form.identityFile"
            @update-field="(field, value) => emit('update-field', field, value)"
          />
        </DialogSection>

        <DialogSection v-if="diagnosticStages.length > 0" index="05" title="Connection Diagnostics" description="DNS, TCP, SSH, host key, and auth stage results." compact>
          <div class="diagnostic-list">
            <div v-for="stage in diagnosticStages" :key="stage.stage" class="diagnostic-row" :class="stage.status">
              <span class="diagnostic-stage">{{ stage.stage }}</span>
              <span class="diagnostic-status">{{ stage.status }}</span>
              <span class="diagnostic-message">{{ stage.message }}<template v-if="stage.latencyMs"> · {{ stage.latencyMs }}ms</template></span>
            </div>
          </div>
        </DialogSection>
      </div>
    </el-form>

    <template #footer>
      <UiButton class="test" :disabled="testing || diagnosticRunning" @click="runDiagnostics">
        <span v-if="testing" class="btn-spinner"></span>
        {{ testing || diagnosticRunning ? 'Testing...' : 'Test connection' }}
      </UiButton>
      <span class="dialog-action-spacer"></span>
      <UiButton variant="ghost" @click="requestClose">Cancel</UiButton>
      <UiButton variant="primary" @click="submitForm">Save</UiButton>
    </template>
  </BaseDialog>

  <BaseDialog
    :visible="discardConfirmVisible"
    title="Discard changes?"
    message="You have unsaved session changes. Close without saving?"
    width="380px"
    @close="discardConfirmVisible = false"
  >
    <template #footer>
      <UiButton variant="ghost" @click="discardConfirmVisible = false">Keep editing</UiButton>
      <UiButton variant="danger" @click="confirmDiscard">Discard</UiButton>
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
import {computed, ref, watch} from 'vue'
import {open} from '@tauri-apps/plugin-dialog'
import {X} from '@lucide/vue'
import {ElForm, ElFormItem, ElInput, ElInputNumber, type FormInstance} from 'element-plus'
import type {GroupTreeOption, SessionFormErrors, SessionFormModel} from '../../types/session'
import type {SessionGroup} from '../SessionTreeGroup.vue'
import BaseDialog from '../dialog/BaseDialog.vue'
import DialogSection from '../form/DialogSection.vue'
import FormField from '../form/FormField.vue'
import FormFieldGroup from '../form/FormFieldGroup.vue'
import GroupTreeSelect from './GroupTreeSelect.vue'
import SessionAdvancedFields from './SessionAdvancedFields.vue'
import SessionAuthFields from './SessionAuthFields.vue'
import SessionNotesFields from './SessionNotesFields.vue'
import UiButton from '../ui/UiButton.vue'
import {sessionRules} from '../../utils/sessionFormRules'
import {diagnoseSshConnection, type ConnectionDiagnosticStage} from '../../services/ssh'

const props = defineProps<{
  visible: boolean
  mode: 'create' | 'edit'
  form: SessionFormModel
  errors: SessionFormErrors
  testing: boolean
  groupTreeSelectOpen: boolean
  selectedGroupName: string
  visibleGroupTreeOptions: GroupTreeOption[]
  formExpandedGroups: Record<string, boolean>
  normalizeDisplayText: (value: string) => string
}>()

const formRef = ref<FormInstance>()
const discardConfirmVisible = ref(false)
const diagnosticRunning = ref(false)
const diagnosticStages = ref<ConnectionDiagnosticStage[]>([])
const initialFormSnapshot = ref('')
const currentFormSnapshot = computed(() => createDirtySnapshot(props.form))
const isDirty = computed(() => props.visible && initialFormSnapshot.value !== currentFormSnapshot.value)

const emit = defineEmits<{
  (event: 'update-field', field: keyof SessionFormModel, value: string | number | boolean): void
  (event: 'clear-error', field: keyof SessionFormErrors): void
  (event: 'validate-field', field: keyof SessionFormErrors): void
  (event: 'toggle-group-select'): void
  (event: 'select-group', groupId: string): void
  (event: 'toggle-option-group', mouseEvent: MouseEvent, group: SessionGroup): void
  (event: 'test'): void
  (event: 'save'): void
  (event: 'close'): void
}>()

watch(() => props.visible, (visible) => {
  if (visible) {
    initialFormSnapshot.value = currentFormSnapshot.value
  }
})

async function submitForm() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  emit('save')
}

function createDirtySnapshot(form: SessionFormModel) {
  const {identityFile, ...dirtyFields} = form
  return JSON.stringify(dirtyFields)
}

function requestClose() {
  if (isDirty.value) {
    discardConfirmVisible.value = true
    return
  }
  emit('close')
}

function confirmDiscard() {
  discardConfirmVisible.value = false
  emit('close')
}

function updateFieldValue(field: keyof SessionFormModel, value: string | number) {
  emit('update-field', field, value)
}

function updateNumberValue(field: keyof SessionFormModel, value: number | undefined) {
  emit('update-field', field, value ?? 22)
}

async function choosePrivateKey() {
  const selected = await open({multiple: false, directory: false})
  if (typeof selected === 'string') {
    emit('update-field', 'privateKeyPath', selected)
  }
}

async function runDiagnostics() {
  diagnosticRunning.value = true
  diagnosticStages.value = []
  try {
    diagnosticStages.value = await diagnoseSshConnection({
      host: props.form.address,
      port: props.form.port,
      username: props.form.user,
      password: props.form.authMethod === 'password' ? props.form.password || null : null,
      privateKeyPath: props.form.authMethod === 'key' ? props.form.privateKeyPath || null : null,
      passphrase: props.form.authMethod === 'key' ? props.form.passphrase || null : null,
    })
  } finally {
    diagnosticRunning.value = false
    emit('test')
  }
}
</script>

<style scoped>
.session-form {
  min-height: 0;
}

.dialog-close {
  width: 26px;
  height: 26px;
  border-radius: 4px;
  background: transparent;
  color: #cbd5e1;
}

.dialog-close:hover {
  background: var(--idea-hover);
  color: var(--idea-text);
}

.dialog-body {
  display: grid;
  gap: 12px;
  min-height: 0;
  padding: 4px 0;
}

.diagnostic-list {
  display: grid;
  gap: 6px;
}

.diagnostic-row {
  display: grid;
  grid-template-columns: 74px 72px 1fr;
  gap: 8px;
  align-items: center;
  padding: 7px 9px;
  border: 1px solid var(--idea-border);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.45);
  font-size: 12px;
}

.diagnostic-row.success { border-color: rgba(34, 197, 94, 0.36); }
.diagnostic-row.error { border-color: rgba(239, 68, 68, 0.42); }
.diagnostic-row.skipped { opacity: 0.68; }

.diagnostic-stage {
  color: var(--idea-text-muted);
  text-transform: uppercase;
}

.diagnostic-status {
  font-weight: 800;
}

.diagnostic-message {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

:deep(.base-dialog-body::-webkit-scrollbar) {
  width: 10px;
}

:deep(.base-dialog-body::-webkit-scrollbar-track) {
  background: transparent;
}

:deep(.base-dialog-body::-webkit-scrollbar-thumb) {
  border: 3px solid transparent;
  border-radius: 999px;
  background: color-mix(in srgb, var(--accent) 28%, #64748b);
  background-clip: content-box;
}

.dialog-action-spacer {
  flex: 1;
}

:deep(.base-dialog-actions .ui-button) {
  min-width: 78px;
  padding: 7px 14px;
}

:deep(.base-dialog-actions .ui-button.test) {
  border-color: color-mix(in srgb, var(--status-online) 32%, transparent);
  background: rgba(22, 101, 52, 0.18);
  color: #bbf7d0;
}

:deep(.toggle-field) {
  grid-template-columns: 1fr auto;
}

:deep(.hint-field) {
  grid-template-columns: 208px minmax(0, 1fr);
}

.hint-text {
  padding: 6px 0;
  color: #7f8ea3;
  font-size: 11px;
  font-style: italic;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.btn-spinner {
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 2px solid rgba(187, 247, 208, 0.3);
  border-top-color: #bbf7d0;
  border-radius: 999px;
  animation: spin 0.6s linear infinite;
  vertical-align: middle;
  margin-right: 4px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
