<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button default-href="/groups" /></ion-buttons>
        <ion-title>{{ group ? `Room ${group.room.label}` : 'Room group' }}</ion-title>
      </ion-toolbar>
      <ion-toolbar v-if="group">
        <ion-segment :value="tab" scrollable @ion-change="tab = String($event.detail.value) as Tab">
          <ion-segment-button value="lines"><ion-label>Bills</ion-label></ion-segment-button>
          <ion-segment-button v-if="isMember" value="balances"><ion-label>Balances</ion-label></ion-segment-button>
          <ion-segment-button v-if="isMember" value="repayments"><ion-label>Paybacks</ion-label></ion-segment-button>
          <ion-segment-button value="members"><ion-label>Members</ion-label></ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <ion-refresher slot="fixed" @ion-refresh="refresh">
        <ion-refresher-content />
      </ion-refresher>

      <div class="narrow">
        <p v-if="loading" class="muted">Loading…</p>

        <template v-else-if="group">
          <p class="muted small">{{ group.property.name }}<template v-if="!isMember"> · you see the members and the owner's bills only</template></p>

          <!-- Bills: the owner's shared bills and members' own expenses -->
          <template v-if="tab === 'lines'">
            <ion-button v-if="group.me?.is_current" size="small" @click="expenseOpen = true">Add expense</ion-button>
            <p v-if="!lines.length" class="muted center">Nothing to share yet. The owner's shared bills for this room show up here.</p>
            <ion-list v-else lines="full">
              <ion-item v-for="l in lines" :key="l.id" button :detail="false" @click="selected = l">
                <ion-label class="ion-text-wrap">
                  <h2>
                    {{ l.description }}
                    <ion-badge v-if="l.is_locked" color="medium">Owner bill</ion-badge>
                    <ion-badge v-else-if="l.kind === 'adjustment'" color="warning">Correction</ion-badge>
                  </h2>
                  <p>{{ manilaDate(l.spent_on).format('MMM D, YYYY') }} · paid by {{ l.paid_by.name }}</p>
                </ion-label>
                <ion-note slot="end" class="amounts">
                  {{ peso(l.amount_centavos) }}
                  <template v-if="l.my_share_centavos !== undefined"><br />You: {{ peso(l.my_share_centavos) }}</template>
                </ion-note>
              </ion-item>
            </ion-list>
          </template>

          <!-- Balances: who owes whom, pair by pair -->
          <template v-if="tab === 'balances' && balances">
            <ion-card>
              <ion-card-content>
                <p>You owe <strong>{{ peso(balances.me.owe_centavos) }}</strong>. Others owe you <strong>{{ peso(balances.me.owed_to_me_centavos) }}</strong>.</p>
                <p class="muted small">Each pair is counted on its own: what you owe one person is not swapped with what someone else owes you.</p>
              </ion-card-content>
            </ion-card>
            <p v-if="!balances.pairs.length" class="muted center">Everyone is even.</p>
            <ion-list v-else lines="full">
              <ion-item v-for="p in balances.pairs" :key="`${p.from.id}-${p.to.id}`">
                <ion-label class="ion-text-wrap">
                  <h2>{{ p.from.name }} → {{ p.to.name }}</h2>
                  <p>{{ peso(p.amount_centavos) }}</p>
                </ion-label>
                <ion-button v-if="p.from.id === group.me?.id" slot="end" size="small" @click="payBack(p)">Pay back</ion-button>
                <ion-button v-else-if="p.to.id === group.me?.id || group.can_manage" slot="end" size="small" fill="outline" @click="payBack(p)">Record payment</ion-button>
              </ion-item>
            </ion-list>
          </template>

          <!-- Paybacks: waiting ones first -->
          <template v-if="tab === 'repayments'">
            <p v-if="!repayments.length" class="muted center">No paybacks yet.</p>
            <ion-list v-else lines="full">
              <ion-item v-for="r in repayments" :key="r.id">
                <ion-label class="ion-text-wrap">
                  <h2>{{ r.from.name }} → {{ r.to.name }} · {{ peso(r.amount_centavos) }}</h2>
                  <p>
                    {{ r.method_label }}<template v-if="r.reference"> · {{ r.reference }}</template>
                    <template v-if="r.created_at"> · {{ manilaDate(r.created_at).format('MMM D, YYYY') }}</template>
                  </p>
                  <p v-if="r.note" class="muted">{{ r.note }}</p>
                  <p v-if="r.reject_reason" class="warn">Rejected: {{ r.reject_reason }}</p>
                  <a v-if="r.proof_url" :href="r.proof_url" target="_blank" rel="noopener" class="link">See screenshot</a>
                </ion-label>
                <ion-buttons v-if="r.can_decide" slot="end">
                  <ion-button size="small" :disabled="busy" @click="confirmRepayment(r)">Confirm</ion-button>
                  <ion-button size="small" fill="clear" color="danger" :disabled="busy" @click="rejectRepayment(r)">Reject</ion-button>
                </ion-buttons>
                <ion-badge v-else slot="end" :color="statusColor(r.status)">{{ r.status_label }}</ion-badge>
              </ion-item>
            </ion-list>
          </template>

          <!-- Members: roles and the default split -->
          <template v-if="tab === 'members'">
            <ion-list lines="full">
              <ion-item v-for="m in group.members" :key="m.id">
                <ion-label class="ion-text-wrap">
                  <h2>
                    {{ m.name }}<template v-if="m.is_me"> (me)</template>
                    <ion-badge v-if="m.role !== 'member'" :color="m.role === 'admin' ? 'tertiary' : 'secondary'">{{ m.role_label }}</ion-badge>
                    <ion-badge v-if="m.left_on" color="medium">Left</ion-badge>
                  </h2>
                  <p>
                    From {{ manilaDate(m.joined_on).format('MMM D, YYYY') }}<template v-if="m.left_on"> to {{ manilaDate(m.left_on).format('MMM D, YYYY') }}</template>
                    <template v-if="!m.has_account"> · no DormLink account</template>
                  </p>
                </ion-label>
                <ion-button
                  v-if="group.can_appoint_moderators && m.role !== 'admin' && !m.left_on && m.has_account"
                  slot="end"
                  size="small"
                  fill="clear"
                  :disabled="busy"
                  @click="toggleModerator(m)"
                >
                  {{ m.role === 'moderator' ? 'Remove moderator' : 'Make moderator' }}
                </ion-button>
              </ion-item>
            </ion-list>
            <p class="muted small">The leader and moderators can change splits and add corrections.</p>

            <ion-select
              v-if="group.can_manage"
              :value="group.default_split_method"
              label="Owner bills are split"
              label-placement="stacked"
              fill="outline"
              interface="popover"
              class="gap"
              @ion-change="setDefaultSplit(String($event.detail.value))"
            >
              <ion-select-option value="equal">Equally</ion-select-option>
              <ion-select-option value="occupant_days">By days each person stayed</ion-select-option>
            </ion-select>
            <p v-else class="muted small">Owner bills are split: {{ group.default_split_label }}.</p>
          </template>
        </template>
      </div>

      <template v-if="group">
        <line-sheet :line="selected" :group="group" @close="selected = null" @changed="changed" @edit="editLine" />
        <expense-sheet :open="expenseOpen" :group="group" :line="editing" @close="closeExpense" @done="expenseDone" />
        <repay-sheet :group-id="group.id" :my-member-id="group.me?.id ?? null" :preset="repay" @close="repay = null" @done="repayDone" />
      </template>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  type RefresherCustomEvent,
  IonBackButton,
  IonBadge,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonPage,
  IonRefresher,
  IonRefresherContent,
  IonSegment,
  IonSegmentButton,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToolbar,
  onIonViewWillEnter,
} from '@ionic/vue'
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import ExpenseSheet from '@/components/groups/ExpenseSheet.vue'
import LineSheet from '@/components/groups/LineSheet.vue'
import RepaySheet, { type RepayPreset } from '@/components/groups/RepaySheet.vue'
import { manilaDate } from '@/lib/dayjs'
import { peso } from '@/lib/money'
import { firstError } from '@/services/api'
import { groupService } from '@/services/groups'
import { usePrompt } from '@/composables/usePrompt'
import { useToast } from '@/composables/useToast'
import type { RepaymentStatus } from '@/types/enums'
import type { Balances, Group, GroupLine, GroupMemberRow, Repayment } from '@/types/groups'

type Tab = 'lines' | 'balances' | 'repayments' | 'members'

/** A room's group (D5): shared bills, who owes whom, paybacks and roles. Staff see members and owner bills only. */
const route = useRoute()
const toast = useToast()
const prompt = usePrompt()
const groupId = Number(route.params.id)
const group = ref<Group | null>(null)
const lines = ref<GroupLine[]>([])
const balances = ref<Balances | null>(null)
const repayments = ref<Repayment[]>([])
const loading = ref(true)
const busy = ref(false)
const tab = ref<Tab>('lines')
const selected = ref<GroupLine | null>(null)
const expenseOpen = ref(false)
const editing = ref<GroupLine | null>(null)
const repay = ref<RepayPreset | null>(null)

const isMember = computed(() => group.value?.view === 'member')

async function load() {
  try {
    group.value = await groupService.get(groupId)
    const member = group.value.view === 'member'
    const [l, b, r] = await Promise.all([
      groupService.lines(groupId),
      member ? groupService.balances(groupId) : Promise.resolve(null),
      member ? groupService.repayments(groupId) : Promise.resolve([] as Repayment[]),
    ])
    lines.value = l
    balances.value = b
    repayments.value = r
  } catch (e) {
    toast.error(firstError(e))
  } finally {
    loading.value = false
  }
}

onIonViewWillEnter(load)

async function refresh(event: RefresherCustomEvent) {
  await load()
  event.target.complete()
}

function statusColor(status: RepaymentStatus) {
  return status === 'confirmed' ? 'success' : status === 'rejected' ? 'danger' : 'warning'
}

async function changed(message: string) {
  toast.success(message)
  selected.value = null
  await load()
}

function editLine(line: GroupLine) {
  selected.value = null
  editing.value = line
  expenseOpen.value = true
}

function closeExpense() {
  expenseOpen.value = false
  editing.value = null
}

async function expenseDone(message: string) {
  closeExpense()
  await changed(message)
}

function payBack(p: Balances['pairs'][number]) {
  repay.value = { fromId: p.from.id, fromName: p.from.name, toId: p.to.id, toName: p.to.name, owed: p.amount_centavos }
}

async function repayDone(message: string) {
  repay.value = null
  await changed(message)
}

async function run(action: () => Promise<string>) {
  busy.value = true
  try {
    toast.success(await action())
    await load()
  } catch (e) {
    toast.error(firstError(e))
  } finally {
    busy.value = false
  }
}

async function confirmRepayment(r: Repayment) {
  if (!(await prompt.confirm('Got the money?', `${r.from.name} paid you ${peso(r.amount_centavos)} (${r.method_label}).`, 'Confirm'))) return
  await run(() => groupService.confirmRepayment(groupId, r.id))
}

async function rejectRepayment(r: Repayment) {
  const reason = await prompt.reason('Reject this payback?', `${r.from.name}, ${peso(r.amount_centavos)}. Tell them why.`, 'Reject', 'Reason (shown to them)')
  if (!reason) return
  await run(() => groupService.rejectRepayment(groupId, r.id, reason))
}

async function toggleModerator(m: GroupMemberRow) {
  await run(() => groupService.setRole(groupId, m.id, m.role === 'moderator' ? 'member' : 'moderator'))
}

async function setDefaultSplit(method: string) {
  if (!group.value || method === group.value.default_split_method) return
  await run(() => groupService.setDefaultSplit(groupId, method as 'equal' | 'occupant_days'))
}
</script>

<style scoped>
.small {
  font-size: 0.85rem;
}
.gap {
  margin-top: 12px;
}
.amounts {
  text-align: right;
}
.link {
  color: var(--ion-color-primary);
  font-size: 0.85rem;
}
.warn {
  color: var(--ion-color-danger);
}
</style>
