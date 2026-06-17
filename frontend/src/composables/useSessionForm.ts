import {reactive, ref} from 'vue'
import type {SessionGroup, SessionHost} from '../components/SessionTreeGroup.vue'
import type {SessionFormModel} from '../types/session'

export function useSessionForm(defaultGroupId: () => string) {
  const sessionDialog = reactive({visible: false, mode: 'create' as 'create' | 'edit', originalName: ''})
  const sessionForm = reactive<SessionFormModel>({
    name: '',
    groupId: '',
    address: '',
    port: 22,
    authMethod: 'password',
    user: '',
    password: '',
    privateKeyPath: '',
    passphrase: '',
    remark: '',
    autoReconnect: false,
    idleTimeoutSecs: 0,
    hashKnownHosts: false,
    identityFile: ''
  })
  const sessionFormErrors = reactive<Record<string, string>>({})
  const sessionTestLoading = ref(false)
  const groupTreeSelectOpen = ref(false)
  const formExpandedGroups = reactive<Record<string, boolean>>({})

  function validateSessionField(field: string) {
    const value = (sessionForm as Record<string, unknown>)[field]
    if (field === 'name' && !String(value ?? '').trim()) sessionFormErrors[field] = 'Name is required'
    else if (field === 'address' && !String(value ?? '').trim()) sessionFormErrors[field] = 'Address is required'
    else if (field === 'user' && !String(value ?? '').trim()) sessionFormErrors[field] = 'User is required'
    else if (field === 'port') {
      const port = Number(value)
      if (!port || port < 1 || port > 65535) sessionFormErrors[field] = 'Port must be 1-65535'
      else delete sessionFormErrors[field]
    } else if (value && String(value).trim()) delete sessionFormErrors[field]
  }

  function validateRequiredSessionFields() {
    validateSessionField('name');
    validateSessionField('address');
    validateSessionField('port');
    validateSessionField('user')
    return Object.keys(sessionFormErrors).length === 0
  }

  function clearSessionFormErrors() {
    Object.keys(sessionFormErrors).forEach((key) => delete sessionFormErrors[key])
  }

  function clearSessionFormError(field: string) {
    delete sessionFormErrors[field]
  }

  function updateSessionFormField(field: keyof SessionFormModel, value: string | number | boolean) {
    if (field === 'port' || field === 'idleTimeoutSecs') {
      sessionForm[field] = Number(value);
      return
    }
    if (field === 'autoReconnect' || field === 'hashKnownHosts') {
      sessionForm[field] = Boolean(value);
      return
    }
    sessionForm[field] = String(value) as never
  }

  function resetSessionForm() {
    sessionForm.name = '';
    sessionForm.groupId = defaultGroupId();
    sessionForm.address = '';
    sessionForm.port = 22
    sessionForm.authMethod = 'password';
    sessionForm.user = '';
    sessionForm.password = '';
    sessionForm.privateKeyPath = '';
    sessionForm.passphrase = '';
    sessionForm.remark = ''
    sessionForm.autoReconnect = false;
    sessionForm.idleTimeoutSecs = 0;
    sessionForm.hashKnownHosts = false;
    sessionForm.identityFile = ''
  }

  function closeSessionDialog() {
    sessionDialog.visible = false;
    groupTreeSelectOpen.value = false
  }

  function prepareCreateSession(groupId: string) {
    resetSessionForm();
    clearSessionFormErrors();
    sessionDialog.visible = true;
    sessionDialog.mode = 'create';
    sessionDialog.originalName = ''
    sessionForm.groupId = groupId || defaultGroupId();
    groupTreeSelectOpen.value = false
  }

  function prepareEditSession(host: SessionHost, group: SessionGroup, groupId: string) {
    sessionDialog.visible = true;
    sessionDialog.mode = 'edit';
    sessionDialog.originalName = host.name
    sessionForm.name = host.name;
    sessionForm.groupId = groupId || group.id;
    groupTreeSelectOpen.value = false
    sessionForm.address = host.address;
    sessionForm.port = host.port;
    sessionForm.authMethod = host.authMethod;
    sessionForm.user = host.user
    sessionForm.password = host.password;
    sessionForm.privateKeyPath = host.privateKeyPath ?? '';
    sessionForm.passphrase = host.passphrase ?? '';
    sessionForm.remark = host.remark
    sessionForm.autoReconnect = host.autoReconnect ?? false;
    sessionForm.idleTimeoutSecs = host.idleTimeoutSecs ?? 0;
    sessionForm.hashKnownHosts = host.hashKnownHosts ?? false;
    sessionForm.identityFile = host.identityFile ?? ''
  }

  function buildSessionHost(name: string): SessionHost {
    return {
      name,
      user: sessionForm.user,
      address: sessionForm.address,
      port: sessionForm.port,
      authMethod: sessionForm.authMethod,
      password: sessionForm.authMethod === 'password' ? sessionForm.password : '',
      privateKeyPath: sessionForm.authMethod === 'key' ? sessionForm.privateKeyPath : '',
      passphrase: sessionForm.authMethod === 'key' ? sessionForm.passphrase : '',
      remark: sessionForm.remark,
      latency: '-',
      status: 'idle',
      active: false,
      autoReconnect: sessionForm.autoReconnect,
      idleTimeoutSecs: sessionForm.idleTimeoutSecs,
      hashKnownHosts: sessionForm.hashKnownHosts,
      identityFile: sessionForm.identityFile
    }
  }

  return {
    sessionDialog,
    sessionForm,
    sessionFormErrors,
    sessionTestLoading,
    groupTreeSelectOpen,
    formExpandedGroups,
    validateSessionField,
    validateRequiredSessionFields,
    clearSessionFormErrors,
    clearSessionFormError,
    updateSessionFormField,
    resetSessionForm,
    closeSessionDialog,
    prepareCreateSession,
    prepareEditSession,
    buildSessionHost
  }
}
