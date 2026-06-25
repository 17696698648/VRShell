<template>
  <Transition name="overlay-fade">
    <div v-if="dialogState.confirm" class="dialog-backdrop" @click.self="resolveConfirm(false)">
      <section class="dialog" role="dialog" aria-modal="true" :aria-labelledby="`${dialogState.confirm.id}-title`">
        <header>
          <h2 :id="`${dialogState.confirm.id}-title`">{{ dialogState.confirm.title }}</h2>
        </header>
        <p>{{ dialogState.confirm.message }}</p>
        <footer>
          <button type="button" @click="resolveConfirm(false)">{{ dialogState.confirm.cancelLabel }}</button>
          <button type="button" :class="{'dialog__danger': dialogState.confirm.tone === 'danger'}" @click="resolveConfirm(true)">
            {{ dialogState.confirm.confirmLabel }}
          </button>
        </footer>
      </section>
    </div>
  </Transition>

  <Transition name="overlay-fade">
    <div v-if="dialogState.prompt" class="dialog-backdrop" @click.self="resolvePrompt(null)">
      <form class="dialog" role="dialog" aria-modal="true" :aria-labelledby="`${dialogState.prompt.id}-title`" @submit.prevent="resolvePrompt(promptValue)">
        <header>
          <h2 :id="`${dialogState.prompt.id}-title`">{{ dialogState.prompt.title }}</h2>
        </header>
        <label class="dialog__field">
          <span>{{ dialogState.prompt.label }}</span>
          <input v-model="promptValue" />
        </label>
        <footer>
          <button type="button" @click="resolvePrompt(null)">{{ dialogState.prompt.cancelLabel }}</button>
          <button type="submit">{{ dialogState.prompt.confirmLabel }}</button>
        </footer>
      </form>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import {ref, watch} from 'vue'
import {dialogState, resolveConfirm, resolvePrompt} from '../../shared/dialog'

const promptValue = ref('')

watch(
  () => dialogState.prompt?.value,
  (value) => {
    promptValue.value = value ?? ''
  },
  {immediate: true},
)
</script>
