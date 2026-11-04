<template>
  <ion-page>
    <ion-content>
      <div class="site">
        <!-- Website header -->
        <header class="site-header">
          <div class="bar">
            <router-link to="/" class="logo" aria-label="DormLink home"><BrandLogo /></router-link>
            <nav class="links" aria-label="Website">
              <router-link to="/find">Find a place</router-link>
              <a href="#owners" @click.prevent="scrollTo('owners')">For owners</a>
              <router-link to="/about">About</router-link>
            </nav>
            <div class="actions">
              <DlIconButton :icon="isDark ? Sun : Moon" :label="isDark ? 'Switch to light mode' : 'Switch to dark mode'" variant="ghost" @click="toggleTheme" />
              <ion-button fill="clear" router-link="/login" class="sign-in">Sign in</ion-button>
              <ion-button router-link="/register" class="sign-up">Create account</ion-button>
            </div>
          </div>
        </header>

        <!-- Hero: search first -->
        <section class="hero">
          <div class="hero-copy">
            <p class="dl-eyebrow">Boarding houses · dorms · bedspaces</p>
            <h1 class="display">Find a place near your <DlGradientText>school.</DlGradientText></h1>
            <p class="lead">
              Compare rooms and bedspaces on a map, see what is free right now, and apply online. Once you move in,
              your bills, receipts and room expenses are in one place.
            </p>
            <form class="search" role="search" @submit.prevent="search">
              <Search :size="20" aria-hidden="true" class="search-icon" />
              <input v-model="q" type="search" placeholder="City, barangay or name of the place" aria-label="Search places" />
              <ion-button type="submit">Search</ion-button>
            </form>
            <div class="hero-links">
              <router-link to="/find" class="map-link"><MapIcon :size="18" aria-hidden="true" /> Browse on the map</router-link>
              <span class="dl-small">No account needed to look around. <router-link to="/register" class="inline-link">Create an account</router-link></span>
            </div>
          </div>

          <div class="hero-art" aria-hidden="true">
            <div class="art-card listing">
              <div class="row">
                <div class="stack">
                  <span class="dl-title">Sunny Dorm</span>
                  <span class="dl-small">0.6 km from campus · Bedspace</span>
                </div>
                <DlSticker size="sm" :rotate="-3">near campus!</DlSticker>
              </div>
              <div class="row baseline">
                <span class="price">₱2,800 <small>/mo</small></span>
                <DlStatusTag tone="success">1 of 4 beds free</DlStatusTag>
              </div>
            </div>
            <div class="art-card bill">
              <div class="row"><span class="dl-eyebrow on-ink">NEXT BILL</span><DlStatusTag status="due">Due 25 Nov</DlStatusTag></div>
              <span class="amount">₱3,130.00</span>
              <div class="row"><span class="dl-small on-ink">Rent</span><span class="dl-data on-ink">2,800.00</span></div>
              <div class="row"><span class="dl-small on-ink">Water + electricity</span><span class="dl-data on-ink">330.00</span></div>
            </div>
            <div class="art-card split">
              <span class="dl-small">Internet · split 3 ways</span>
              <div class="row"><DlAvatar name="Ericka Lim" :size="28" /><DlAvatar name="Kim Santos" :size="28" /><DlAvatar name="Mark Cruz" :size="28" /><span class="dl-data">₱500 each</span></div>
            </div>
          </div>
        </section>

        <!-- For boarders -->
        <section class="section" aria-labelledby="boarders-title">
          <p class="dl-eyebrow">For boarders</p>
          <h2 id="boarders-title" class="section-title">Everything about your stay, from search to move-out</h2>
          <div class="features">
            <article v-for="f in boarderFeatures" :key="f.title" class="feature">
              <DlIconTile :icon="f.icon" :tone="f.tone" />
              <h3 class="dl-title">{{ f.title }}</h3>
              <p class="dl-body">{{ f.text }}</p>
            </article>
          </div>
        </section>

        <!-- How it works -->
        <section class="section steps-section" aria-labelledby="steps-title">
          <h2 id="steps-title" class="section-title">How it works</h2>
          <ol class="steps">
            <li v-for="(s, i) in steps" :key="s.title">
              <span class="step-no">{{ i + 1 }}</span>
              <span class="stack">
                <strong>{{ s.title }}</strong>
                <span class="dl-small">{{ s.text }}</span>
              </span>
            </li>
          </ol>
        </section>

        <!-- For owners -->
        <section id="owners" class="section owners" aria-labelledby="owners-title">
          <div class="owners-copy">
            <p class="dl-eyebrow">For owners and caretakers</p>
            <h2 id="owners-title" class="section-title">Run your boarding house without the notebook</h2>
            <p class="dl-body">
              List your rooms and bedspaces, approve applications, and let DormLink issue the bills on time. Record
              payments, send reminders, and see what came in each month. Invite caretakers to help, with the access
              you choose.
            </p>
            <div class="owner-actions">
              <ion-button router-link="/register">List your property</ion-button>
              <ion-button fill="clear" router-link="/login">I already have an account</ion-button>
            </div>
            <p class="dl-small">Listings go live after a quick check of your ID and property documents.</p>
          </div>
          <ul class="owner-points">
            <li v-for="p in ownerPoints" :key="p.title">
              <component :is="p.icon" :size="20" aria-hidden="true" class="point-icon" />
              <span class="stack"><strong>{{ p.title }}</strong><span class="dl-small">{{ p.text }}</span></span>
            </li>
          </ul>
        </section>

        <!-- The app: an offer, never required -->
        <section class="section get-app" aria-labelledby="app-title">
          <div>
            <h2 id="app-title" class="section-title">Use it in your browser, or install it</h2>
            <p class="dl-body">
              DormLink works fully here in your browser, on a phone or a computer. You can also add it to your phone's
              home screen to open it like an app.
            </p>
          </div>
          <ion-button v-if="canInstall" class="dl-accent" @click="install"><Download slot="start" :size="18" aria-hidden="true" /> Install the app</ion-button>
          <p v-else class="dl-small install-tip">
            On your phone: open the browser menu and choose <strong>Add to Home screen</strong>.
          </p>
        </section>

        <footer class="site-footer">
          <BrandLogo />
          <nav class="footer-links" aria-label="More">
            <router-link to="/find">Find a place</router-link>
            <router-link to="/about">About us</router-link>
            <router-link to="/contact">Contact</router-link>
            <router-link to="/privacy">Privacy</router-link>
          </nav>
          <p class="dl-small">Made for boarders and boarding houses in Calapan City and nearby.</p>
        </footer>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonButton, IonContent, IonPage } from '@ionic/vue'
import {
  BellRing,
  ChartColumn,
  ClipboardList,
  Download,
  FileCheck,
  HandCoins,
  Map as MapIcon,
  Moon,
  Receipt,
  Search,
  Sun,
  Users,
  UsersRound,
  Wrench,
} from 'lucide-vue-next'
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import BrandLogo from '@/components/BrandLogo.vue'
import { DlAvatar, DlGradientText, DlIconButton, DlIconTile, DlStatusTag, DlSticker, type PaletteTone } from '@/components/dl'
import { useTheme } from '@/composables/useTheme'
import { useInstallPrompt } from '@/lib/installPrompt'

/**
 * The website's front page (W1): what a browser visitor sees at "/", on a phone or a computer.
 * The installed app keeps the onboarding slides (HomePage.vue). Search goes straight to the Finder.
 */
const router = useRouter()
const { isDark, setMode } = useTheme()
const toggleTheme = () => setMode(isDark.value ? 'light' : 'dark')
const { canInstall, install } = useInstallPrompt()
const q = ref('')

function search() {
  router.push({ path: '/find', query: q.value.trim() ? { q: q.value.trim() } : {} })
}

/** The page scrolls inside ion-content, so an anchor link scrolls it there. */
function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const boarderFeatures: { icon: typeof Search; tone: PaletteTone; title: string; text: string }[] = [
  { icon: MapIcon, tone: 'sky', title: 'Find and compare', text: 'See places on a map with prices, what is included, and which rooms are free.' },
  { icon: FileCheck, tone: 'pine', title: 'Apply online', text: 'Pick a room or bedspace and send your application. You are told when it is approved.' },
  { icon: Receipt, tone: 'butter', title: 'Clear bills', text: 'Rent and utilities on time, reminders before the due date, and a receipt for every payment.' },
  { icon: UsersRound, tone: 'lilac', title: 'Shared costs, fair', text: 'Split the electricity or the internet with your roommates and see who has paid back.' },
  { icon: Wrench, tone: 'coral', title: 'Repairs and visitors', text: 'Report a problem with photos, register visitors, and ask for late entry.' },
  { icon: ClipboardList, tone: 'lagoon', title: 'House rules', text: 'Read the rules before you apply, and see every change after you move in.' },
]

const steps = [
  { title: 'Search', text: 'Near your school, your location, or anywhere on the map.' },
  { title: 'Apply', text: 'Choose a room or bedspace and send a short message to the owner.' },
  { title: 'Move in', text: 'Pay your deposit and first rent; your bills start from there.' },
]

const ownerPoints = [
  { icon: Receipt, title: 'Bills on time, every month', text: 'Rent in advance, utilities after use, with no back-and-forth.' },
  { icon: HandCoins, title: 'Payments and reminders', text: 'Record cash or check payment screenshots; reminders go out by themselves.' },
  { icon: ChartColumn, title: 'See your numbers', text: 'Collected, unpaid and occupancy, by property and room.' },
  { icon: Users, title: 'Caretakers', text: 'Let someone collect or manage for you, property by property.' },
  { icon: BellRing, title: 'Requests in one place', text: 'Applications, repairs, visitors and late entries.' },
]
</script>

<style scoped>
.site {
  --site-max: 1120px;
  min-height: 100%;
  background: var(--gradient-canvas);
  color: var(--text-primary);
}

/* ---------- Header ---------- */
.site-header {
  position: sticky;
  top: 0;
  z-index: 5;
  padding-top: var(--ion-safe-area-top, 0);
  border-bottom: 1px solid var(--border-default);
  background: color-mix(in oklch, var(--bg-canvas) 88%, transparent);
  backdrop-filter: blur(10px);
}
.bar {
  display: flex;
  align-items: center;
  gap: 16px;
  max-width: var(--site-max);
  min-height: 60px;
  margin: 0 auto;
  padding: 0 var(--screen-pad);
}
.logo {
  text-decoration: none;
}
.links {
  display: none;
  gap: 24px;
  margin-left: 16px;
}
.links a {
  color: var(--text-secondary);
  font-weight: 600;
  text-decoration: none;
}
.links a:hover {
  color: var(--text-primary);
}
.actions {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
}
.sign-up {
  display: none;
}

/* ---------- Hero ---------- */
.hero {
  display: grid;
  gap: 32px;
  max-width: var(--site-max);
  margin: 0 auto;
  padding: 32px var(--screen-pad) 24px;
}
.display {
  margin: 8px 0 12px;
  font-family: var(--font-display);
  font-size: 34px;
  line-height: 1.1;
  font-weight: 800;
  letter-spacing: -0.03em;
}
.lead {
  margin: 0 0 20px;
  color: var(--text-secondary);
  font-size: 16px;
  line-height: 1.55;
}
.search {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 6px 6px 14px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  background: var(--bg-surface);
}
.search:focus-within {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
}
.search-icon {
  flex-shrink: 0;
  color: var(--text-muted);
}
.search input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--text-primary);
  font: inherit;
  font-size: 16px;
}
.search ion-button {
  margin: 0;
}
.hero-links {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 16px;
  margin-top: 14px;
}
.map-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--brand-primary);
  font-weight: 700;
  text-decoration: none;
}
.inline-link {
  color: var(--brand-primary);
  font-weight: 700;
}
.hero-art {
  position: relative;
  display: grid;
  gap: 12px;
}
.art-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
  border-radius: var(--radius-lg);
  background: var(--bg-surface);
  box-shadow: 0 10px 30px rgb(0 0 0 / 0.08);
}
.art-card.bill {
  background: var(--bg-ink);
  color: var(--text-on-ink);
}
.on-ink {
  color: var(--text-on-ink-muted);
}
.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.row.baseline {
  align-items: baseline;
}
.split .row {
  justify-content: flex-start;
}
.split .dl-data {
  margin-left: auto;
}
.stack {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.price {
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 800;
}
.price small {
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 500;
}
.amount {
  font-family: var(--font-display);
  font-size: 30px;
  font-weight: 800;
  letter-spacing: -0.02em;
}

/* ---------- Sections ---------- */
.section {
  max-width: var(--site-max);
  margin: 0 auto;
  padding: 40px var(--screen-pad);
}
.section-title {
  margin: 6px 0 20px;
  font-family: var(--font-display);
  font-size: 24px;
  line-height: 1.2;
  font-weight: 800;
  letter-spacing: -0.02em;
}
.features {
  display: grid;
  gap: 12px;
}
.feature {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 18px;
  border-radius: var(--radius-lg);
  background: var(--bg-surface);
}
.feature .dl-body {
  color: var(--text-secondary);
}
.steps {
  display: grid;
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.steps li {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}
.step-no {
  display: grid;
  flex-shrink: 0;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: var(--radius-full);
  background: var(--brand-primary);
  color: var(--text-on-primary);
  font-family: var(--font-display);
  font-weight: 800;
}
.owners {
  display: grid;
  gap: 24px;
  /* Lands below the sticky header when opened from "For owners". */
  scroll-margin-top: 64px;
}
.owners-copy .dl-body {
  margin-bottom: 16px;
  color: var(--text-secondary);
}
.owner-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}
.owner-points {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0;
  padding: 8px;
  border-radius: var(--radius-lg);
  background: var(--bg-surface);
  list-style: none;
}
.owner-points li {
  display: flex;
  gap: 12px;
  padding: 12px;
}
.point-icon {
  flex-shrink: 0;
  margin-top: 2px;
  color: var(--brand-primary);
}
.get-app {
  display: grid;
  gap: 16px;
  align-items: center;
}
.get-app .dl-body {
  color: var(--text-secondary);
}
.install-tip {
  margin: 0;
}
.site-footer {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: var(--site-max);
  margin: 0 auto;
  padding: 32px var(--screen-pad) calc(32px + var(--ion-safe-area-bottom, 0px));
  border-top: 1px solid var(--border-default);
}
.footer-links {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 20px;
}
.footer-links a {
  color: var(--text-secondary);
  text-decoration: none;
}

/* ---------- Tablet and up ---------- */
@media (min-width: 768px) {
  .links,
  .sign-up {
    display: flex;
  }
  .features {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .steps {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .get-app {
    grid-template-columns: minmax(0, 1fr) auto;
    padding: 28px;
    border-radius: var(--radius-xl);
    background: var(--bg-surface);
  }
}

/* ---------- Desktop ---------- */
@media (min-width: 992px) {
  .hero {
    grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
    align-items: center;
    gap: 48px;
    padding-top: 64px;
    padding-bottom: 48px;
  }
  .display {
    font-size: 52px;
  }
  .lead {
    font-size: 18px;
  }
  .hero-art .listing {
    transform: rotate(-2deg);
  }
  .hero-art .bill {
    margin-left: 48px;
    transform: rotate(1.5deg);
  }
  .hero-art .split {
    margin-right: 48px;
  }
  .features {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .owners {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    align-items: start;
    gap: 48px;
  }
  .section-title {
    font-size: 32px;
  }
}
</style>
