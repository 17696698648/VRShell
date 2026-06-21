let index = 0

export function createId(prefix: string) {
  index += 1
  return `${prefix}-${Date.now().toString(36)}-${index}`
}
