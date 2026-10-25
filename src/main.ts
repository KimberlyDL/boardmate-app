import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router';
import './lib/dayjs';
import { initTheme } from './composables/useTheme';

import { IonicVue } from '@ionic/vue';

/* Core CSS required for Ionic components to work properly */
import '@ionic/vue/css/core.css';

/* Basic CSS for apps built with Ionic */
import '@ionic/vue/css/normalize.css';
import '@ionic/vue/css/structure.css';
import '@ionic/vue/css/typography.css';

/* Optional CSS utils that can be commented out */
import '@ionic/vue/css/padding.css';
import '@ionic/vue/css/float-elements.css';
import '@ionic/vue/css/text-alignment.css';
import '@ionic/vue/css/text-transformation.css';
import '@ionic/vue/css/flex-utils.css';
import '@ionic/vue/css/display.css';

/**
 * Ionic Dark Mode
 * -----------------------------------------------------
 * For more info, please see:
 * https://ionicframework.com/docs/theming/dark-mode
 */

/* @import '@ionic/vue/css/palettes/dark.always.css'; */
import '@ionic/vue/css/palettes/dark.class.css';

/* DormLink fonts, bundled so the installed app has them offline (latin and latin-ext load on demand) */
import '@fontsource-variable/bricolage-grotesque/wght.css';
import '@fontsource-variable/karla/wght.css';
import '@fontsource-variable/caveat/wght.css';
import '@fontsource-variable/jetbrains-mono/wght.css';

/* Theme: design tokens, Ionic mapped onto them, Ionic components restyled, app helpers */
import './theme/tokens.css';
import './theme/variables.css';
import './theme/ionic.css';
import './theme/app.css';

const app = createApp(App)
  .use(IonicVue)
  .use(createPinia())
  .use(router);

Promise.all([router.isReady(), initTheme()]).then(() => {
  app.mount('#app');
});
