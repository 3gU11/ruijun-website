<template>
  <div class="parameter-grid" :data-ruijun-structured-value="serializedValue">
    <label v-for="field in parameterFields" :key="field.key" class="parameter-field">
      <span class="parameter-label">{{ field.label }}</span>
      <span class="parameter-control" :class="{ disabled }">
        <input
          :type="field.kind === 'number' ? 'number' : 'text'"
          :value="displayParameterValue(value, field)"
          :placeholder="field.placeholder"
          :disabled="disabled"
          :inputmode="field.kind === 'number' ? 'decimal' : 'text'"
          @input="handleInput(field, $event.target.value)"
        >
        <span class="parameter-unit">{{ field.unit }}</span>
      </span>
    </label>
  </div>
</template>

<script>
import { computed } from 'vue';
import { displayParameterValue, parameterFields, parameterRecord, updateParameterValue } from './parameter-value.js';

export default {
  props: {
    value: { type: [Object, String], default: null },
    disabled: { type: Boolean, default: false }
  },
  emits: ['input'],
  setup(props, { emit }) {
    const serializedValue = computed(() => JSON.stringify(parameterRecord(props.value)));
    return {
      parameterFields,
      displayParameterValue,
      serializedValue,
      handleInput(field, value) {
        emit('input', updateParameterValue(props.value, field, value));
      }
    };
  }
};
</script>

<style scoped>
.parameter-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px 20px;
}

.parameter-field {
  display: grid;
  gap: 8px;
  min-width: 0;
}

.parameter-label {
  color: var(--theme--foreground, var(--foreground-normal));
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
}

.parameter-control {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  min-height: 52px;
  overflow: hidden;
  background: var(--theme--form--field--input--background, var(--background-page));
  border: var(--theme--border-width, 1px) solid var(--theme--form--field--input--border-color, var(--border-normal));
  border-radius: 8px;
  transition: border-color 120ms ease, box-shadow 120ms ease;
}

.parameter-control:focus-within {
  border-color: var(--theme--primary, var(--primary));
  box-shadow: 0 0 0 1px var(--theme--primary, var(--primary));
}

.parameter-control.disabled {
  opacity: 0.6;
}

input {
  width: 100%;
  min-width: 0;
  height: 50px;
  padding: 0 14px;
  color: var(--theme--foreground, var(--foreground-normal));
  font: inherit;
  font-size: 15px;
  background: transparent;
  border: 0;
  outline: 0;
}

input::placeholder {
  color: var(--theme--foreground-subdued, var(--foreground-subdued));
}

.parameter-unit {
  min-width: 42px;
  padding: 0 14px 0 10px;
  color: var(--theme--foreground-subdued, var(--foreground-subdued));
  font-size: 13px;
  text-align: right;
}

@media (max-width: 700px) {
  .parameter-grid {
    grid-template-columns: 1fr;
  }
}
</style>
