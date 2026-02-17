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
  background-color: var(--muted, #f5f5f5);
  color: var(--foreground, #111827);
  border: 1px solid var(--border, rgba(0, 0, 0, 0.1));
  border-radius: var(--radius-small, 6px);
  cursor: pointer;
  transition: background-color 0.2s;
}

.speed-menu__trigger:hover {
  background-color: var(--muted, #f5f5f5);
  opacity: 0.8;
}

.speed-menu__dropdown {
  position: absolute;
  bottom: 100%;
  right: 0;
  margin-bottom: 0.5rem;
  min-width: 120px;
  background-color: var(--muted, #f5f5f5);
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
  color: var(--foreground, #111827);
}

.speed-menu__option:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

.speed-menu__option--active {
  background-color: rgba(0, 0, 0, 0.05);
  color: var(--foreground, #111827);
  font-weight: 600;
}

/* Dark mode support — use data-theme attribute to match the app's manual toggle */
:global([data-theme='dark']) .speed-menu__trigger {
  background-color: var(--muted, #2a2a2a);
  color: var(--foreground, #f9fafb);
  border-color: var(--border, rgba(255, 255, 255, 0.1));
}

:global([data-theme='dark']) .speed-menu__trigger:hover {
  background-color: var(--muted, #2a2a2a);
  opacity: 0.8;
}

:global([data-theme='dark']) .speed-menu__dropdown {
  background-color: var(--muted, #2a2a2a);
  border-color: rgba(255, 255, 255, 0.1);
}

:global([data-theme='dark']) .speed-menu__option {
  color: var(--foreground, #f9fafb);
}

:global([data-theme='dark']) .speed-menu__option:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

:global([data-theme='dark']) .speed-menu__option--active {
  background-color: rgba(255, 255, 255, 0.1);
  color: var(--foreground, #f9fafb);
}
</style>
