<template>
  <ion-page>
    <ion-content :scroll-y="false" :fullscreen="true">
      <div class="screen">
        <!-- Top bar: theme toggle, logo, skip -->
        <header class="bar">
          <ion-button fill="clear" color="medium" :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'" @click="toggleTheme">
            <ion-icon slot="icon-only" :icon="isDark ? sunnyOutline : moonOutline" />
          </ion-button>
          <brand-logo v-if="!onAuth" />
          <span v-else />
          <ion-button v-if="!onAuth" fill="clear" color="medium" class="skip" @click="goTo(lastIndex)">Skip</ion-button>
          <span v-else class="skip-spacer" />
        </header>

        <!-- Swipeable slides -->
        <div ref="track" class="track" @scroll.passive="onScroll">
          <section v-for="s in slides" :key="s.key" class="slide" :aria-label="s.heading">
            <div class="art" aria-hidden="true">
              <!-- 1: find -->
              <div v-if="s.key === 'find'" class="map">
                <span class="pin p1"><ion-icon :icon="location" /><b>₱2,800</b></span>
                <span class="pin p2"><ion-icon :icon="location" /><b>₱4,500</b></span>
                <span class="pin p3"><ion-icon :icon="location" /><b>₱3,200</b></span>
                <div class="mini m1">
                  <ion-icon :icon="homeOutline" />
                  <div><strong>Sunny Dorm</strong><small>Bedspace · Near campus</small></div>
                </div>
                <div class="mini m2">
                  <ion-icon :icon="businessOutline" />
                  <div><strong>Cozy Room</strong><small>Whole room · Wi-Fi</small></div>
                </div>
              </div>

              <!-- 2: apply -->
              <div v-else-if="s.key === 'apply'" class="mock">
                <small class="label">Property</small>
                <h4>Cozy Room</h4>
                <p class="price">₱4,500 <span>/ month</span></p>
                <ul class="checks">
                  <li><ion-icon :icon="checkmarkCircle" /> Wi-Fi</li>
                  <li><ion-icon :icon="checkmarkCircle" /> Near campus</li>
                  <li><ion-icon :icon="checkmarkCircle" /> Furnished</li>
                </ul>
                <div class="fake-btn">Apply</div>
                <span class="badge sent"><ion-icon :icon="checkmarkCircle" /> Application sent</span>
              </div>

              <!-- 3: bills -->
              <div v-else-if="s.key === 'bills'" class="mock">
                <span class="badge bell"><ion-icon :icon="notificationsOutline" /> Rent due in 3 days</span>
                <small class="label">October balance</small>
                <dl class="lines">
                  <div><dt>Rent</dt><dd>₱4,500</dd></div>
                  <div><dt>Electricity</dt><dd>₱650</dd></div>
                  <div><dt>Water</dt><dd>₱180</dd></div>
                  <div class="total"><dt>Total</dt><dd>₱5,330</dd></div>
                </dl>
                <p class="due">Due October 25</p>
                <div class="fake-btn">View bill</div>
              </div>

              <!-- 4: shared -->
              <div v-else-if="s.key === 'shared'" class="mock">
                <small class="label">Shared electricity</small>
                <h4>₱1,800</h4>
                <ul class="people">
                  <li><span class="av">K</span> Kim <b>₱600</b><ion-icon :icon="checkmarkCircle" class="ok" /></li>
                  <li><span class="av">E</span> Ericka <b>₱600</b><ion-icon :icon="checkmarkCircle" class="ok" /></li>
                  <li><span class="av">M</span> Mark <b>₱600</b><ion-icon :icon="ellipseOutline" class="wait" /></li>
                </ul>
                <div class="fake-btn">Split bill</div>
              </div>

              <!-- 5: stay -->
              <div v-else class="tiles">
                <div v-for="t in stayTiles" :key="t.title" class="tile">
                  <ion-icon :icon="t.icon" />
                  <strong>{{ t.title }}</strong>
                  <small>{{ t.text }}</small>
                </div>
              </div>
            </div>

            <h1>{{ s.heading }}</h1>
            <p class="desc">{{ s.text }}</p>
            <p class="tag">{{ s.tagline }}</p>
          </section>

          <!-- 6: authentication -->
          <section class="slide auth" aria-label="Get started">
            <div class="art" aria-hidden="true">
              <div class="hero-mark"><brand-logo /></div>
            </div>
            <h1>Ready to get started?</h1>
            <p class="desc">Create your free account, or pick up where you left off.</p>

            <div class="auth-actions">
              <ion-button expand="block" size="large" router-link="/register">Create an account</ion-button>
              <ion-button expand="block" size="large" fill="outline" router-link="/login">Sign in to your account</ion-button>
              <google-sign-in-button />
              <ion-button expand="block" fill="clear" router-link="/find">
                <ion-icon slot="start" :icon="searchOutline" />
                Just browsing? Explore available places
              </ion-button>
            </div>

            <nav class="legal">
              <router-link to="/about">About us</router-link>
              <router-link to="/contact">Contact</router-link>
              <router-link to="/privacy">Privacy</router-link>
            </nav>
          </section>
        </div>

        <!-- Footer: dots + actions -->
        <footer v-if="!onAuth" class="foot">
          <div class="dots" role="tablist" aria-label="Slides">
            <button
              v-for="(s, i) in slides"
              :key="s.key"
              type="button"
              role="tab"
              class="dot"
              :class="{ on: i === index }"
              :aria-selected="i === index"
              :aria-label="`Slide ${i + 1}: ${s.heading}`"
              @click="goTo(i)"
            />
          </div>
          <ion-button expand="block" size="large" @click="goTo(index + 1)">
            {{ index === 0 || index === lastIndex - 1 ? 'Get started' : 'Next' }}
          </ion-button>
          <p class="signin">Already have an account? <router-link to="/login">Sign in</router-link></p>
        </footer>
        <footer v-else class="foot back">
          <ion-button fill="clear" color="medium" @click="goTo(0)">
            <ion-icon slot="start" :icon="arrowBackOutline" />
            See what BoardMate does
          </ion-button>
        </footer>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonButton, IonContent, IonIcon, IonPage } from '@ionic/vue'
import {
  arrowBackOutline,
  businessOutline,
  checkmarkCircle,
  clipboardOutline,
  constructOutline,
  ellipseOutline,
  homeOutline,
  location,
  moonOutline,
  notificationsOutline,
  peopleOutline,
  searchOutline,
  sunnyOutline,
} from 'ionicons/icons'
import { computed, ref } from 'vue'
import BrandLogo from '@/components/BrandLogo.vue'
import GoogleSignInButton from '@/components/GoogleSignInButton.vue'
import { useTheme } from '@/composables/useTheme'

const slides = [
  {
    key: 'find',
    heading: 'Find a place that fits.',
    text: 'Browse available rooms, bedspaces, and rental properties in one place. Compare prices, inclusions, and house rules before you apply.',
    tagline: 'Browse. Compare. Apply.',
  },
  {
    key: 'apply',
    heading: 'Apply when you find the right one.',
    text: 'Send an application directly to a property with your contact details, planned move-in date, and a short message.',
    tagline: 'From browsing to booking, without the hassle.',
  },
  {
    key: 'bills',
    heading: 'Know what you owe.',
    text: 'Keep rent, utility bills, payments, receipts, and balances organized in one place. Get reminders before and after your due dates.',
    tagline: 'Clear bills. Clear records. Less confusion.',
  },
  {
    key: 'shared',
    heading: 'Split shared expenses fairly.',
    text: "Keep shared utilities and group expenses organized. See your share, record repayments, and keep everyone's balance clear.",
    tagline: 'Everyone knows their share.',
  },
  {
    key: 'stay',
    heading: 'More than just a rental app.',
    text: 'Keep everyday house matters organized, from maintenance requests and house rules to visitors, curfew, and shared responsibilities.',
    tagline: 'Everything about your stay, in one place.',
  },
]

const stayTiles = [
  { icon: constructOutline, title: 'Maintenance', text: 'Report problems' },
  { icon: clipboardOutline, title: 'House rules', text: "Know what's expected" },
  { icon: peopleOutline, title: 'Visitors', text: 'Keep visits organized' },
  { icon: moonOutline, title: 'Late entry', text: 'Request access when needed' },
]

/** The last "page" is the sign-in screen, after the content slides. */
const lastIndex = slides.length
const track = ref<HTMLElement | null>(null)
const index = ref(0)
const onAuth = computed(() => index.value === lastIndex)

const { isDark, setMode } = useTheme()
const toggleTheme = () => setMode(isDark.value ? 'light' : 'dark')

function onScroll() {
  const el = track.value
  if (el && el.clientWidth) index.value = Math.round(el.scrollLeft / el.clientWidth)
}

function goTo(i: number) {
  const el = track.value
  const target = Math.max(0, Math.min(lastIndex, i))
  index.value = target
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  el?.scrollTo?.({ left: target * el.clientWidth, behavior: reduce ? 'auto' : 'smooth' })
}
</script>

<style scoped>
.screen {
  display: flex;
  flex-direction: column;
  height: 100%;
  max-width: 480px;
  margin: 0 auto;
  padding-top: var(--ion-safe-area-top, 0);
  padding-bottom: var(--ion-safe-area-bottom, 0);
}

.bar {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  padding: 6px 8px;
}
.bar > :first-child {
  justify-self: start;
}
.skip {
  justify-self: end;
}

/* Slides */
.track {
  flex: 1;
  min-height: 0;
  display: flex;
  overflow-x: auto;
  overflow-y: hidden;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
}
.track::-webkit-scrollbar {
  display: none;
}
.slide {
  flex: 0 0 100%;
  scroll-snap-align: center;
  scroll-snap-stop: always;
  overflow-y: auto;
  padding: 8px 24px 16px;
  text-align: center;
  display: flex;
  flex-direction: column;
}
.art {
  flex: 1 1 auto;
  min-height: 250px;
  display: grid;
  place-items: center;
  margin-bottom: 16px;
}
h1 {
  font-size: 1.85rem;
  line-height: 1.15;
  font-weight: 800;
  letter-spacing: -0.02em;
  margin: 0 0 10px;
}
.desc {
  margin: 0 0 10px;
  line-height: 1.55;
  color: var(--ion-color-step-600, var(--ion-color-medium));
}
.tag {
  margin: 0;
  font-weight: 700;
  color: var(--ion-color-primary);
}

/* Footer */
.foot {
  padding: 8px 24px 16px;
}
.dots {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 14px;
}
.dot {
  width: 8px;
  height: 8px;
  padding: 0;
  border: 0;
  border-radius: 8px;
  background: var(--bm-border);
  transition: width 0.25s, background 0.25s;
}
.dot.on {
  width: 24px;
  background: var(--ion-color-primary);
}
.signin {
  margin: 10px 0 0;
  text-align: center;
  color: var(--ion-color-medium);
}
.signin a {
  font-weight: 700;
}
.foot.back {
  display: flex;
  justify-content: center;
}

/* Auth screen */
.auth {
  justify-content: center;
}
.auth .art {
  min-height: 150px;
  flex: 0 0 auto;
}
.hero-mark {
  transform: scale(1.8);
}
.auth-actions {
  margin-top: 8px;
}
.auth-actions ion-button {
  margin: 0 0 10px;
}
.legal {
  display: flex;
  justify-content: center;
  gap: 18px;
  margin-top: 8px;
  font-size: 0.9rem;
}
.legal a {
  color: var(--ion-color-medium);
}

/* Illustrations (decorative) */
.map,
.mock,
.tiles {
  width: 100%;
  max-width: 320px;
}
.map {
  position: relative;
  height: 250px;
  border-radius: 24px;
  overflow: hidden;
  border: 1px solid var(--bm-border);
  background:
    linear-gradient(var(--bm-border) 1px, transparent 1px) 0 0 / 36px 36px,
    linear-gradient(90deg, var(--bm-border) 1px, transparent 1px) 0 0 / 36px 36px,
    var(--bm-surface-alt);
  text-align: left;
}
.pin {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  color: var(--ion-color-primary);
  font-size: 30px;
  line-height: 1;
}
.pin b {
  font-size: 0.7rem;
  padding: 2px 7px;
  border-radius: 10px;
  background: var(--ion-color-secondary);
  color: var(--ion-color-secondary-contrast);
}
.p1 { top: 22px; left: 36px; }
.p2 { top: 58px; right: 40px; }
.p3 { top: 14px; left: 150px; }
.mini {
  position: absolute;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 14px;
  background: var(--bm-surface);
  border: 1px solid var(--bm-border);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
}
.mini ion-icon {
  font-size: 24px;
  color: var(--ion-color-primary);
}
.mini strong,
.mini small {
  display: block;
}
.mini strong {
  font-size: 0.85rem;
}
.mini small {
  font-size: 0.7rem;
  color: var(--ion-color-medium);
}
.m1 { left: 14px; bottom: 74px; }
.m2 { right: 14px; bottom: 16px; }

.mock {
  position: relative;
  padding: 18px;
  border-radius: 22px;
  text-align: left;
  background: var(--bm-surface);
  border: 1px solid var(--bm-border);
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.12);
}
.mock .label {
  color: var(--ion-color-medium);
  font-weight: 600;
}
.mock h4 {
  margin: 2px 0 4px;
  font-size: 1.4rem;
  font-weight: 800;
}
.price {
  margin: 0 0 10px;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--ion-color-primary);
}
.price span {
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--ion-color-medium);
}
.checks,
.people {
  list-style: none;
  margin: 0 0 14px;
  padding: 0;
  display: grid;
  gap: 6px;
}
.checks li {
  display: flex;
  align-items: center;
  gap: 8px;
}
.checks ion-icon,
.ok {
  color: var(--ion-color-primary);
  font-size: 20px;
}
.wait {
  color: var(--ion-color-medium);
  font-size: 20px;
}
.fake-btn {
  text-align: center;
  padding: 11px;
  border-radius: 12px;
  font-weight: 700;
  background: var(--ion-color-primary);
  color: var(--ion-color-primary-contrast);
}
.badge {
  position: absolute;
  right: -8px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 700;
  background: var(--ion-color-secondary);
  color: var(--ion-color-secondary-contrast);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.18);
}
.badge.sent {
  bottom: 20px;
  animation: pop 0.5s 0.4s both;
}
.badge.bell {
  top: -14px;
  animation: pop 0.5s 0.4s both;
}
.lines {
  margin: 8px 0 6px;
}
.lines div {
  display: flex;
  justify-content: space-between;
  padding: 5px 0;
}
.lines dt,
.lines dd {
  margin: 0;
}
.lines .total {
  margin-top: 4px;
  border-top: 1px solid var(--bm-border);
  font-weight: 800;
}
.due {
  margin: 0 0 12px;
  color: var(--ion-color-medium);
  font-size: 0.9rem;
}
.people li {
  display: flex;
  align-items: center;
  gap: 10px;
}
.people b {
  margin-left: auto;
}
.av {
  display: inline-grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  font-size: 0.8rem;
  font-weight: 700;
  background: var(--bm-surface-alt);
  color: var(--ion-color-primary);
  border: 1px solid var(--bm-border);
}

.tiles {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.tile {
  padding: 16px 12px;
  border-radius: 18px;
  background: var(--bm-surface);
  border: 1px solid var(--bm-border);
  text-align: left;
}
.tile ion-icon {
  display: block;
  font-size: 28px;
  margin-bottom: 8px;
  color: var(--ion-color-primary);
}
.tile strong,
.tile small {
  display: block;
}
.tile small {
  margin-top: 2px;
  color: var(--ion-color-medium);
}

@keyframes pop {
  from { opacity: 0; transform: scale(0.8) translateY(6px); }
  to { opacity: 1; transform: none; }
}
@media (prefers-reduced-motion: reduce) {
  .badge { animation: none; }
  .dot { transition: none; }
}
@media (max-height: 700px) {
  .art { min-height: 200px; }
  h1 { font-size: 1.6rem; }
}
</style>
