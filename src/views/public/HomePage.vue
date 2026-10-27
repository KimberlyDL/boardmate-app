<template>
  <ion-page>
    <ion-content :scroll-y="false" :fullscreen="true">
      <div class="screen">
        <!-- Top bar: theme toggle, wordmark, skip -->
        <header class="bar">
          <DlIconButton
            :icon="isDark ? Sun : Moon"
            :label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
            variant="ghost"
            @click="toggleTheme"
          />
          <brand-logo v-if="!onAuth" />
          <span v-else />
          <ion-button v-if="!onAuth" fill="clear" class="skip" @click="goTo(lastIndex)">Skip</ion-button>
          <span v-else class="skip-spacer" />
        </header>

        <!-- Swipeable slides -->
        <div ref="track" class="track" @scroll.passive="onScroll">
          <section v-for="s in slides" :key="s.key" class="slide" :aria-label="s.heading">
            <div class="art" :class="`tone-${s.tone}`" aria-hidden="true">
              <!-- 1: find -->
              <div v-if="s.key === 'find'" class="map">
                <span class="road r1" />
                <span class="road r2" />
                <span class="pin p1"><MapPin :size="20" /></span>
                <span class="pin p2 muted-pin"><MapPin :size="20" /></span>
                <span class="pin p3 big"><MapPin :size="24" /></span>
                <span class="pin p4 school"><GraduationCap :size="20" /></span>
                <div class="float-card">
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
              </div>

              <!-- 2: apply -->
              <div v-else-if="s.key === 'apply'" class="stack-art">
                <div class="mock">
                  <div class="row"><span class="dl-eyebrow">APPLICATION</span><DlStatusTag status="pending">Sent</DlStatusTag></div>
                  <span class="dl-title">Cozy Room · a bedspace</span>
                  <div class="row"><span class="dl-small">Move-in</span><span class="dl-data">01 NOV 2026</span></div>
                  <div class="row"><span class="dl-small">Monthly rent</span><span class="dl-small strong">₱4,500</span></div>
                  <p class="dl-small quote">Hi! I'm a 2nd-year student and can move in on the 1st.</p>
                </div>
                <span class="chip-note"><CircleCheck :size="16" /> The owner approves and assigns your bed</span>
              </div>

              <!-- 3: bills -->
              <div v-else-if="s.key === 'bills'" class="stack-art">
                <div class="mock ink">
                  <div class="row"><span class="dl-eyebrow on-ink">NEXT BILL</span><DlStatusTag status="due">Due 25 Oct</DlStatusTag></div>
                  <span class="amount">₱5,330.00</span>
                  <div class="row"><span class="dl-small on-ink-strong">Rent</span><span class="dl-data">4,500.00</span></div>
                  <div class="row"><span class="dl-small on-ink-strong">Electricity + water</span><span class="dl-data">830.00</span></div>
                </div>
                <div class="mock list">
                  <div class="line"><Receipt :size="18" class="ok" /><span>September · OR-2026-000118</span><DlStatusTag status="paid" /></div>
                  <div class="line divider"><Receipt :size="18" class="ok" /><span>August · OR-2026-000097</span><DlStatusTag status="paid" /></div>
                </div>
              </div>

              <!-- 4: shared -->
              <div v-else-if="s.key === 'shared'" class="stack-art">
                <div class="mock">
                  <div class="row baseline"><span class="dl-title">Electricity</span><span class="amount-sm">₱1,800.00</span></div>
                  <span class="dl-data muted">SPLIT EQUAL · 3 PEOPLE</span>
                  <div v-for="(p, i) in people" :key="p.name" class="line" :class="{ divider: i > 0 }">
                    <DlAvatar :name="p.name" :size="32" />
                    <span>{{ p.label }}</span>
                    <span class="dl-data">600.00</span>
                    <DlStatusTag :status="p.paid ? 'paid' : 'due'">{{ p.paid ? 'Paid' : 'Owes' }}</DlStatusTag>
                  </div>
                </div>
              </div>

              <!-- 5: stay -->
              <div v-else class="tiles">
                <div v-for="t in stayTiles" :key="t.title" class="tile">
                  <DlIconTile :icon="t.icon" :tone="t.tone" />
                  <strong>{{ t.title }}</strong>
                  <small>{{ t.text }}</small>
                </div>
              </div>
            </div>

            <div class="copy">
              <h1>{{ s.lead }}<DlGradientText>{{ s.hl }}</DlGradientText></h1>
              <p class="desc">{{ s.text }}</p>
              <p class="tag">{{ s.tagline }}</p>
            </div>
          </section>

          <!-- 6: get started (sign in, sign up, or browse) -->
          <section class="slide auth" aria-label="Get started">
            <span class="blob b1" aria-hidden="true" />
            <span class="blob b2" aria-hidden="true" />
            <div class="welcome">
              <span class="mark" aria-hidden="true"><House :size="32" :stroke-width="1.75" /></span>
              <p class="wordmark">DormLink</p>
              <h1 class="ready">Ready to get started?</h1>
              <p class="desc">Find a place, then everything after: bills, groups and requests.</p>
              <span class="dl-note">hey, welcome!</span>
            </div>

            <div class="auth-actions">
              <ion-button expand="block" router-link="/register">Create an account</ion-button>
              <ion-button expand="block" fill="outline" router-link="/login">Sign in to your account</ion-button>
              <google-sign-in-button />
              <ion-button expand="block" fill="clear" router-link="/find">
                <MapIcon slot="start" :size="18" class="btn-icon" />
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
          <div class="foot-row">
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
              >
                <span class="pip" />
              </button>
            </div>
            <ion-button class="next" @click="goTo(index + 1)">
              {{ index === 0 || index === lastIndex - 1 ? 'Get started' : 'Next' }}
              <ArrowRight slot="end" :size="20" class="btn-icon" />
            </ion-button>
          </div>
          <p class="signin">Already have an account? <router-link to="/login">Sign in</router-link></p>
        </footer>
        <footer v-else class="foot back">
          <ion-button fill="clear" @click="goTo(0)">
            <ArrowLeft slot="start" :size="18" class="btn-icon" />
            See what DormLink does
          </ion-button>
        </footer>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'
import { IonButton, IonContent, IonPage } from '@ionic/vue'
import {
  ArrowLeft,
  ArrowRight,
  CircleCheck,
  ClipboardList,
  DoorOpen,
  GraduationCap,
  House,
  Map as MapIcon,
  MapPin,
  Moon,
  Receipt,
  Sun,
  Users,
  Wrench,
} from 'lucide-vue-next'
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import BrandLogo from '@/components/BrandLogo.vue'
import GoogleSignInButton from '@/components/GoogleSignInButton.vue'
import { DlAvatar, DlGradientText, DlIconButton, DlIconTile, DlStatusTag, DlSticker, type PaletteTone } from '@/components/dl'
import { useTheme } from '@/composables/useTheme'

/** Splits a heading so its last word carries the screen's one gradient phrase. */
function slide(key: string, tone: PaletteTone, heading: string, text: string, tagline: string) {
  const cut = heading.lastIndexOf(' ') + 1
  return { key, tone, heading, lead: heading.slice(0, cut), hl: heading.slice(cut), text, tagline }
}

const slides = [
  slide(
    'find',
    'sky',
    'Find a place that fits.',
    'Browse available rooms, bedspaces, and rental properties in one place. Compare prices, inclusions, and house rules before you apply.',
    'Browse. Compare. Apply.',
  ),
  slide(
    'apply',
    'pine',
    'Apply when you find the right one.',
    'Send an application directly to a property with your contact details, planned move-in date, and a short message.',
    'From browsing to booking, without the hassle.',
  ),
  slide(
    'bills',
    'butter',
    'Know what you owe.',
    'Keep rent, utility bills, payments, receipts, and balances organized in one place. Get reminders before and after your due dates.',
    'Clear bills. Clear records. Less confusion.',
  ),
  slide(
    'shared',
    'lilac',
    'Split shared expenses fairly.',
    "Keep shared utilities and group expenses organized. See your share, record repayments, and keep everyone's balance clear.",
    'Everyone knows their share.',
  ),
  slide(
    'stay',
    'lagoon',
    'More than just a rental app.',
    'Keep everyday house matters organized, from maintenance requests and house rules to visitors, curfew, and shared responsibilities.',
    'Everything about your stay, in one place.',
  ),
]

const people = [
  { name: 'Ericka Lim', label: 'Ericka · leader', paid: true },
  { name: 'Kim Santos', label: 'Kim', paid: true },
  { name: 'Mark Cruz', label: 'Mark', paid: false },
]

const stayTiles: { icon: typeof Wrench; tone: PaletteTone; title: string; text: string }[] = [
  { icon: Wrench, tone: 'coral', title: 'Maintenance', text: 'Report problems' },
  { icon: ClipboardList, tone: 'pine', title: 'House rules', text: "Know what's expected" },
  { icon: Users, tone: 'sky', title: 'Visitors', text: 'Keep visits organized' },
  { icon: DoorOpen, tone: 'lilac', title: 'Late entry', text: 'Request access when needed' },
]

/** The last "page" is the get-started screen, after the content slides. */
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

function goTo(i: number, instant = false) {
  const el = track.value
  const target = Math.max(0, Math.min(lastIndex, i))
  index.value = target
  const reduce = instant || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  el?.scrollTo?.({ left: target * el.clientWidth, behavior: reduce ? 'auto' : 'smooth' })
}

/**
 * The installed app (home-screen PWA or native) shows the slides once: after someone has
 * reached the get-started screen, it opens there. In a browser tab the slides always show.
 */
const SEEN_KEY = 'dormlink.onboarding_seen'
const installed = () => Capacitor.isNativePlatform() || !!window.matchMedia?.('(display-mode: standalone)').matches

watch(onAuth, (reached) => {
  if (reached) Preferences.set({ key: SEEN_KEY, value: '1' }).catch(() => undefined)
})

onMounted(async () => {
  if (!installed()) return
  const seen = (await Preferences.get({ key: SEEN_KEY }).catch(() => ({ value: null }))).value
  if (seen) {
    await nextTick()
    goTo(lastIndex, true)
  }
})
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
  min-height: 56px;
  padding: 4px 8px;
}
.bar > :first-child {
  justify-self: start;
}
.skip {
  justify-self: end;
  --color: var(--text-secondary);
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
  position: relative;
  flex: 0 0 100%;
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 8px 16px 12px;
  box-sizing: border-box;
  overflow-y: auto;
  scroll-snap-align: center;
  scroll-snap-stop: always;
}
.art {
  position: relative;
  flex: 1 1 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  max-height: 380px;
  padding: 20px;
  border-radius: var(--radius-xl);
  box-sizing: border-box;
  overflow: hidden;
}
.tone-sky { background: var(--card-sky-gradient); }
.tone-pine { background: var(--card-pine-gradient); }
.tone-butter { background: var(--card-butter-gradient); }
.tone-lilac { background: var(--card-lilac-gradient); }
.tone-lagoon { background: var(--card-lagoon-gradient); }

.copy {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 0 4px;
}
h1 {
  margin: 0;
  font-family: var(--font-display);
  font-size: 32px;
  line-height: 36px;
  font-weight: 800;
  letter-spacing: -0.03em;
}
.desc {
  margin: 0;
  font-size: 15px;
  line-height: 23px;
  color: var(--text-secondary);
}
.tag {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: var(--brand-primary);
}

/* Shared bits of the illustrations (decorative, aria-hidden) */
.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.row.baseline { align-items: baseline; }
.stack { display: flex; flex-direction: column; gap: 2px; }
.strong { font-weight: 700; color: var(--text-primary); }
.muted { color: var(--text-muted); }
.mock {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  max-width: 320px;
  padding: 16px;
  box-sizing: border-box;
  border-radius: var(--radius-lg);
  background: var(--bg-surface);
  color: var(--text-primary);
}
.mock.ink { background: var(--bg-ink); color: var(--text-on-ink); }
.mock.list { gap: 0; padding: 4px 14px; }
.on-ink { color: var(--text-on-ink-muted); }
.on-ink-strong { color: var(--text-on-ink); }
.stack-art {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  width: 100%;
}
.line {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  font-size: 14px;
  font-weight: 700;
}
.line > span:first-of-type { flex: 1; }
.line.divider { border-top: 1px solid var(--border-default); }
.ok { color: var(--success-solid); }
.amount { font-family: var(--font-display); font-size: 32px; line-height: 36px; font-weight: 800; letter-spacing: -0.03em; }
.amount-sm { font-family: var(--font-display); font-size: 20px; font-weight: 700; }
.quote {
  margin: 0;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  background: var(--bg-muted);
  color: var(--text-secondary);
}
.chip-note {
  display: inline-flex;
  align-items: center;
  align-self: flex-end;
  gap: 8px;
  padding: 10px 14px;
  border-radius: var(--radius-full);
  background: var(--brand-primary);
  color: var(--text-on-primary);
  font-size: 13px;
  font-weight: 700;
}

/* 1: map */
.map {
  position: absolute;
  inset: 0;
}
.road {
  position: absolute;
  background: #ffffff;
  opacity: 0.7;
}
:root.ion-palette-dark .road { opacity: 0.12; }
.r1 { left: 0; right: 0; top: 130px; height: 14px; transform: rotate(-8deg); }
.r2 { top: 0; bottom: 0; left: 62%; width: 12px; transform: rotate(12deg); }
.pin {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: var(--radius-full);
  background: var(--brand-primary);
  color: var(--text-on-primary);
}
.pin.big { width: 48px; height: 48px; }
.muted-pin { background: var(--stone-500); color: #ffffff; }
.school { background: var(--card-sky-solid); color: #ffffff; }
.p1 { left: 12%; top: 40px; }
.p2 { left: 70%; top: 60px; }
.p3 { left: 42%; top: 96px; }
.p4 { left: 78%; top: 150px; }
.float-card {
  position: absolute;
  left: 16px;
  right: 16px;
  bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  border-radius: var(--radius-lg);
  background: var(--bg-surface);
  color: var(--text-primary);
}
.price {
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 700;
  color: var(--brand-primary);
}
.price small {
  font-family: var(--font-body);
  font-size: 13px;
  font-weight: 400;
  color: var(--text-muted);
}

/* 5: tiles */
.tiles {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  width: 100%;
  max-width: 320px;
}
.tile {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 16px 14px;
  border-radius: var(--radius-lg);
  background: var(--bg-surface);
  color: var(--text-primary);
}
.tile strong { margin-top: 8px; font-size: 15px; }
.tile small { font-size: 12px; color: var(--text-muted); }

/* Footer */
.foot {
  padding: 8px 16px 16px;
}
.foot-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.dots {
  display: flex;
  align-items: center;
}
.dot {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 44px;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
}
.dot.on { width: 32px; }
.pip {
  display: block;
  width: 8px;
  height: 8px;
  border-radius: var(--radius-full);
  background: var(--stone-300);
  transition: width var(--motion-base) var(--ease-out), background var(--motion-base) var(--ease-out);
}
:root.ion-palette-dark .pip { background: var(--stone-700); }
.dot.on .pip {
  width: 24px;
  background: var(--brand-primary);
}
.next {
  min-width: 140px;
  height: 52px;
  font-size: 16px;
}
.btn-icon { margin: 0 2px; }
.signin {
  margin: 10px 0 0;
  text-align: center;
  font-size: 13px;
  color: var(--text-muted);
}
.signin a {
  font-weight: 700;
  color: var(--brand-primary);
  text-decoration: none;
}
.foot.back {
  display: flex;
  justify-content: center;
}
.foot.back ion-button { --color: var(--text-secondary); }

/* 6: get started */
.auth {
  justify-content: flex-end;
  padding: 0 24px 8px;
  overflow: hidden;
}
.blob {
  position: absolute;
  border-radius: var(--radius-full);
  pointer-events: none;
}
.b1 { left: -110px; top: -150px; width: 420px; height: 420px; background: var(--card-pine-tint); }
.b2 { right: -80px; top: 190px; width: 170px; height: 170px; background: var(--card-butter-tint); }
.welcome {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.mark {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  border-radius: var(--radius-full);
  background: var(--brand-primary);
  color: var(--text-on-primary);
}
.wordmark {
  margin: 0;
  font-family: var(--font-display);
  font-size: 48px;
  line-height: 52px;
  font-weight: 800;
  letter-spacing: -0.03em;
}
.ready {
  font-size: 20px;
  line-height: 26px;
  font-weight: 700;
  letter-spacing: -0.01em;
}
.auth-actions {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.auth-actions ion-button { margin: 0; }
.legal {
  position: relative;
  display: flex;
  justify-content: center;
  gap: 18px;
  font-size: 13px;
}
.legal a {
  color: var(--text-muted);
  text-decoration: none;
}

@media (max-height: 700px) {
  .art { min-height: 240px; }
  h1 { font-size: 26px; line-height: 30px; }
  .wordmark { font-size: 40px; line-height: 44px; }
}
</style>
