<script setup lang="ts">
interface Props {
  currentSpeed: number
  speedPresets: number[]
}

interface Emits {
  (e: 'selectSpeed', speed: number): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const isOpen = ref(false)

const toggleMenu = () => {
  isOpen.value = !isOpen.value
}

const selectSpeed = (speed: number) => {
  emit('selectSpeed', speed)
  isOpen.value = false
}

// Close menu when clicking outside
const menuRef = ref<HTMLElement>()

onMounted(() => {
  const handleClickOutside = (event: MouseEvent) => {
    if (menuRef.value && !menuRef.value.contains(event.target as Node)) {
      isOpen.value = false
    }
  }
  
  document.addEventListener('click', handleClickOutside)
  
  onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside)
  })
})
</script>

<template>
  <div class="speed-menu" ref="menuRef">
    <button
      type="button"
      class="speed-menu__trigger"
      @click="toggleMenu"
      :aria-expanded="isOpen"
      :title="`Playback speed: ${currentSpeed}x`"
    >
      {{ currentSpeed }}x
    </button>

    <div v-if="isOpen" class="speed-menu__dropdown">
      <button
        v-for="speed in speedPresets"
        :key="speed"
        type="button"
        class="speed-menu__option"
        :class="{ 'speed-menu__option--active': speed === currentSpeed }"
        @click="selectSpeed(speed)"
      >
        {{ speed }}x
        <span v-if="speed === 1" class="speed-menu__label">(Normal)</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.speed-menu {
  position: relative;
}

.speed-menu__trigger {
  min-width: 48px;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  font-weight: 500;
  background-color: var(--bg-secondary, #f3f4f6);
  color: var(--fg-primary, #111827);
  border: 1px solid var(--border, rgba(0, 0, 0, 0.1));
  border-radius: var(--radius-small, 6px);
  cursor: pointer;
  transition: background-color 0.2s;
}

.speed-menu__trigger:hover {
  background-color: var(--bg-tertiary, #e5e7eb);
}

.speed-menu__dropdown {
  position: absolute;
  bottom: 100%;
  right: 0;
  margin-bottom: 0.5rem;
  min-width: 120px;
  background-color: var(--bg-primary, #ffffff);
  border: 1px solid var(--border, rgba(0, 0, 0, 0.1));
  border-radius: var(--radius-small, 6px);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  z-index: 1000;
  overflow: hidden;
}

.speed-menu__option {
  width: 100%;
  padding: 0.625rem 1rem;
  text-align: left;
  font-size: 0.875rem;
  background-color: transparent;
  border: none;
  cursor: pointer;
  transition: background-color 0.15s;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--fg-primary, #111827);
}

.speed-menu__option:hover {
  background-color: var(--bg-secondary, #f3f4f6);
}

.speed-menu__option--active {
  background-color: var(--bg-accent, #3b82f6);
  color: var(--fg-on-accent, #ffffff);
  font-weight: 600;
}

.speed-menu__label {
  font-size: 0.75rem;
  opacity: 0.7;
  margin-left: 0.5rem;
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .speed-menu__trigger {
    background-color: var(--bg-secondary, #374151);
    color: var(--fg-primary, #f9fafb);
    border-color: var(--border, rgba(255, 255, 255, 0.1));
  }

  .speed-menu__trigger:hover {
    background-color: var(--bg-tertiary, #4b5563);
  }

  .speed-menu__dropdown {
    background-color: var(--bg-primary, #1f2937);
    border-color: var(--border, rgba(255, 255, 255, 0.1));
  }

  .speed-menu__option {
    color: var(--fg-primary, #f9fafb);
  }

  .speed-menu__option:hover {
    background-color: var(--bg-secondary, #374151);
  }

  .speed-menu__option--active {
    background-color: var(--bg-accent, #3b82f6);
    color: var(--fg-on-accent, #ffffff);
  }
}
</style>
