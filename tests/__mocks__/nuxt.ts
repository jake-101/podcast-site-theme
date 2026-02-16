/**
 * Mock Nuxt auto-imports for testing outside Nuxt context
 */
import { vi } from 'vitest'
import { ref, computed, watch, reactive } from 'vue'

// Re-export Vue APIs that Nuxt auto-imports
export { ref, computed, watch, reactive }

// Mock useRoute
export function useRoute() {
  return reactive({
    query: {},
    params: {},
    path: '/',
    fullPath: '/',
    name: '',
  })
}

// Mock useRouter
export function useRouter() {
  return {
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
  }
}

// Mock useFetch
export function useFetch(url: string, options?: any) {
  return {
    data: ref(null),
    status: ref('idle'),
    error: ref(null),
    refresh: vi.fn(),
  }
}

// Mock useHead
export function useHead(input: any) {
  return {}
}

// Mock navigateTo
export function navigateTo(path: string) {
  return Promise.resolve()
}
