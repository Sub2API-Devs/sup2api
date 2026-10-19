import { computed, createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { i18n } from './i18n'
import { router } from './router'
import { setupHost } from './host'
import { vPermission } from './directives/permission'
import { SCHEMA_WIDGETS_KEY, TABLE_COLUMN_SCOPE_KEY } from '@sub2api/ui'
import { useAuthStore } from './stores/auth'
import { schemaWidgets } from './components/schema/widgets'
import './style.css'

const app = createApp(App)
app.use(createPinia())
app.use(i18n)
setupHost(router)
app.use(router)
app.directive('permission', vPermission)
// Native plugin UIs render SchemaForm too; they get the console's widgets here.
app.provide(SCHEMA_WIDGETS_KEY, schemaWidgets)
app.provide(TABLE_COLUMN_SCOPE_KEY, computed(() => useAuthStore().me?.id ?? null))
app.mount('#app')
