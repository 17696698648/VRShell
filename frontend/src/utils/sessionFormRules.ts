import type {FormRules} from 'element-plus'
import type {SessionFormModel} from '../types/session'

export const sessionRules: FormRules<SessionFormModel> = {
  name: [{required: true, message: 'Name is required', trigger: 'blur'}],
  address: [{required: true, message: 'Address is required', trigger: 'blur'}],
  port: [{type: 'number', required: true, min: 1, max: 65535, message: 'Port must be 1-65535', trigger: 'change'}],
  user: [{required: true, message: 'User is required', trigger: 'blur'}],
}
