import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  AppNotification,
  Farmer,
  Language,
  LoadBalancingRecommendation,
  ProcurementCenter,
  QueueState,
  ScheduleSlot,
  SlotRecommendation,
  Token,
} from '../types';
import { centers as seedCenters, DEFAULT_CENTER_ID, getCenterById } from '../data/centers';
import { demoFarmer } from '../data/farmers';
import { initialFarmerQueue, initialOfficerQueue } from '../data/queue';
import { initialNotifications } from '../data/notifications';
import { todaysSchedule } from '../data/schedules';
import { TOKEN_SERIES_START } from '../data/tokens';
import {
  advanceQueue,
  attachToken,
  processNextToken,
  setRunning,
  skipToken,
  surgeQueue,
} from '../services/mockQueue';
import { computeLoadBalancing, predictWaitingTime } from '../services/mockAI';
import {
  notifyAIRecommendationApplied,
  notifyHighDemand,
  notifyLowCrowd,
  notifyScheduleChange,
  notifyTokenBooked,
} from '../services/mockNotifications';
import {
  USE_BACKEND,
  checkHealth,
  isBackendLive,
  authApi,
  farmerApi,
  centerApi,
  queueApi,
  tokenApi,
  procurementApi,
  notificationApi,
  aiApi,
  demoApi,
  adminApi,
  analyticsApi,
} from '../services/api';
import {
  centerIdMap,
  findEntryTokenId,
  toCenter,
  toFarmer,
  toLoadBalancing,
  toNotification,
  toQueueState,
  toTokenFromCreate,
} from '../services/adapters';

const clone = <T,>(v: T): T =>
  typeof structuredClone === 'function'
    ? structuredClone(v)
    : (JSON.parse(JSON.stringify(v)) as T);

const BOOKING_DATE = '9 September 2026';

type AuthRole = 'FARMER' | 'CENTER_OFFICER' | 'ADMIN';
const DEMO_EMAIL: Record<AuthRole, string> = {
  FARMER: 'farmer@demo.com',
  CENTER_OFFICER: 'officer@demo.com',
  ADMIN: 'admin@demo.com',
};
const DEMO_PASSWORD = 'demo1234';

type Connection = 'idle' | 'connecting' | 'online' | 'offline';

interface BackendIds {
  farmerId: string | null;
  centerIds: Record<string, string>;
  tokenBackendId: string | null;
}

interface AdminData {
  overview: Record<string, unknown> | null;
  centers: Record<string, unknown>[] | null;
  series: Record<string, unknown[]>;
  insights: string[];
}

interface AppState {
  // --- identity / preferences ---
  language: Language;
  user: Farmer | null;
  onboardingComplete: boolean;
  selectedCenterId: string;

  // --- procurement ---
  token: Token | null;
  centers: ProcurementCenter[];
  schedule: ScheduleSlot[];
  farmerQueue: QueueState;
  officerQueue: QueueState;

  // --- comms ---
  notifications: AppNotification[];
  toast: string | null;

  // --- demo ---
  demoMode: boolean;
  activeRecommendation: LoadBalancingRecommendation | null;

  // --- backend connection ---
  backendEnabled: boolean;
  connection: Connection;
  connectionError: string | null;
  authRole: AuthRole | null;
  backendIds: BackendIds;
  admin: AdminData;

  // --- Phase 4: farmer procurement / transport / payment ---
  farmerProfile: Record<string, unknown> | null;
  farmerProcurement: Record<string, unknown> | null;
  farmerTransport: Record<string, unknown> | null;
  needsCropSetup: boolean;

  // --- actions: preferences ---
  setLanguage: (l: Language) => void;
  setUser: (f: Farmer) => void;
  updateUser: (patch: Partial<Farmer>) => void;
  saveOnboardingDraft: (draft: Partial<Farmer>) => void;
  completeOnboarding: () => Promise<void>;
  resetOnboarding: () => void;
  setSelectedCenter: (id: string) => void;

  // --- Phase 4 ---
  __setBackendAuth: (role: AuthRole, farmerId: string | null) => void;
  __clearFarmerAuth: () => void;
  refreshFarmerProcurement: () => Promise<void>;
  bookTokenNextSlot: () => Promise<Token | null>;
  updateFarmerCrop: (cropId: string, cropName: string, quantity: number) => Promise<void>;

  // --- actions: backend lifecycle ---
  bootstrap: () => Promise<void>;
  retryConnection: () => Promise<void>;
  ensureAuth: (role: AuthRole) => Promise<boolean>;
  refreshCenters: () => Promise<void>;
  hydrateFarmer: () => Promise<void>;
  refreshFarmerQueue: () => Promise<void>;
  refreshOfficerQueue: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  refreshAdmin: () => Promise<void>;

  // --- actions: farmer ---
  bookSlot: (rec: SlotRecommendation) => Promise<Token>;
  cancelToken: () => Promise<void>;
  tickFarmerQueue: () => Promise<void> | void;
  setFarmerQueueRunning: (running: boolean) => void;

  // --- actions: officer ---
  officerProcessNext: () => Promise<void>;
  officerSkip: () => Promise<void>;
  officerMarkComplete: () => Promise<void>;
  setOfficerQueueRunning: (running: boolean) => Promise<void>;

  // --- actions: AI ---
  refreshRecommendation: () => Promise<void>;
  applyRecommendation: () => Promise<void>;

  // --- actions: demo ---
  simulateHighDemand: () => Promise<void>;
  simulateQueueReduction: () => Promise<void>;
  simulateScheduleChange: () => Promise<void>;
  processNextTokenDemo: () => Promise<void>;
  resetDemo: () => Promise<void>;

  // --- actions: notifications ---
  pushNotification: (n: AppNotification) => void;
  markAllNotificationsRead: () => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;

  setToast: (msg: string | null) => void;
}

function overloadedCenter(centers: ProcurementCenter[]): ProcurementCenter | undefined {
  return [...centers]
    .filter((c) => c.served / c.capacity >= 0.9 || c.queueLength >= 50)
    .sort((a, b) => b.queueLength - a.queueLength)[0];
}

function mostAvailableCenter(
  centers: ProcurementCenter[],
  excludeId: string,
): ProcurementCenter | undefined {
  return [...centers]
    .filter((c) => c.id !== excludeId)
    .sort((a, b) => a.served / a.capacity - b.served / b.capacity)[0];
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      language: 'en',
      user: null,
      onboardingComplete: false,
      selectedCenterId: DEFAULT_CENTER_ID,

      token: null,
      centers: clone(seedCenters),
      schedule: clone(todaysSchedule),
      farmerQueue: clone(initialFarmerQueue),
      officerQueue: clone(initialOfficerQueue),

      notifications: clone(initialNotifications),
      toast: null,

      demoMode: true,
      activeRecommendation: null,

      backendEnabled: USE_BACKEND,
      connection: 'idle',
      connectionError: null,
      authRole: null,
      backendIds: { farmerId: null, centerIds: {}, tokenBackendId: null },
      admin: { overview: null, centers: null, series: {}, insights: [] },

      farmerProfile: null,
      farmerProcurement: null,
      farmerTransport: null,
      needsCropSetup: false,

      setLanguage: (l) => {
        set({ language: l });
        const u = get().user;
        if (u) set({ user: { ...u, language: l } });
      },

      setUser: (f) => set({ user: f }),
      updateUser: (patch) => {
        const u = get().user;
        if (u) set({ user: { ...u, ...patch } });
      },

      /** Phase 4: onboarding only collects basic info before sign-in. */
      saveOnboardingDraft: (draft) => {
        const base: Farmer = get().user ?? { ...demoFarmer, crop: 'Wheat', quantityQuintals: 0 };
        set({ user: { ...base, ...draft, language: get().language } });
      },

      completeOnboarding: async () => {
        // Basic info captured — the SIGN IN / CREATE ACCOUNT step comes next.
        if (!get().user) set({ user: { ...demoFarmer, quantityQuintals: 0, language: get().language } });
        set({ onboardingComplete: true });
      },
      resetOnboarding: () => set({ onboardingComplete: false }),

      // --- Phase 4: auth glue (called by authStore) ---
      __setBackendAuth: (role, farmerId) =>
        set({
          authRole: role,
          connection: 'online',
          connectionError: null,
          backendIds: { ...get().backendIds, farmerId: farmerId ?? get().backendIds.farmerId },
        }),

      __clearFarmerAuth: () =>
        set({
          user: null,
          authRole: null,
          token: null,
          onboardingComplete: false,
          farmerProfile: null,
          farmerProcurement: null,
          farmerTransport: null,
          needsCropSetup: false,
          backendIds: { ...get().backendIds, farmerId: null, tokenBackendId: null },
        }),

      refreshFarmerProcurement: async () => {
        if (!(await isBackendLive())) return;
        const farmerId = get().backendIds.farmerId;
        if (!farmerId) return;
        try {
          const rows = (await procurementApi.list({ farmerId })) as {
            id: string;
            status: string;
            createdAt: string;
            transport?: Record<string, unknown> | null;
            crop?: { name?: string };
            token?: { tokenNumber?: string };
          }[];
          const completed = rows
            .filter((r) => r.status === 'COMPLETED')
            .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
          const current = completed[0] ?? null;
          set({
            farmerProcurement: current as Record<string, unknown> | null,
            farmerTransport: (current?.transport ?? null) as Record<string, unknown> | null,
          });
        } catch {
          /* keep last known */
        }
      },

      bookTokenNextSlot: async () => {
        const state = get();
        const backendOk = state.backendEnabled && (await state.ensureAuth('FARMER'));
        if (backendOk && state.backendIds.farmerId) {
          const slug = state.selectedCenterId;
          const cuid = state.backendIds.centerIds[slug];
          if (!cuid) {
            get().setToast('Select a procurement centre first.');
            return null;
          }
          try {
            const r = (await centerApi.recommendedSchedule(cuid)) as { scheduleId: string };
            const schedules = (await centerApi.schedules(cuid)) as { id: string; cropId: string }[];
            const cropId =
              schedules.find((s) => s.id === r.scheduleId)?.cropId ?? schedules[0]?.cropId;
            const created = (await tokenApi.create({
              farmerId: state.backendIds.farmerId,
              centerId: cuid,
              scheduleId: r.scheduleId,
              cropId: cropId!,
              quantity: state.user?.quantityQuintals ?? 25,
            })) as Parameters<typeof toTokenFromCreate>[0] & { id: string };
            const token = toTokenFromCreate(created);
            set({
              token,
              backendIds: { ...state.backendIds, tokenBackendId: created.id },
              farmerQueue: { ...state.farmerQueue, yourToken: token.id },
            });
            await get().refreshFarmerQueue();
            await get().refreshNotifications();
            get().setToast(`Token ${token.id} booked.`);
            return token;
          } catch (err) {
            get().setToast(err instanceof Error ? err.message : 'Could not book a token.');
            return null;
          }
        }

        // mock fallback: synthesise a token
        const center = getCenterById(state.selectedCenterId) ?? state.centers[0];
        const token: Token = {
          id: `A${TOKEN_SERIES_START}`,
          farmerName: state.user?.name ?? demoFarmer.name,
          centerId: center.id,
          centerName: center.name,
          crop: state.user?.crop ?? 'Wheat',
          quantityQuintals: state.user?.quantityQuintals ?? 25,
          date: BOOKING_DATE,
          slot: '11:30 AM – 12:00 PM',
          estimatedWaitMinutes: 35,
          queueAhead: 18,
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
        };
        set({ token, farmerQueue: attachToken(state.farmerQueue, token.id) });
        get().pushNotification(notifyTokenBooked(token.id, token.slot));
        return token;
      },

      updateFarmerCrop: async (cropId, cropName, quantity) => {
        const u = get().user;
        if (u) set({ user: { ...u, crop: cropName as Farmer['crop'], quantityQuintals: quantity } });
        set({ needsCropSetup: false });
        const farmerId = get().backendIds.farmerId;
        if (get().backendEnabled && farmerId && (await isBackendLive())) {
          try {
            await farmerApi.update(farmerId, { primaryCropId: cropId, approxQuantity: quantity });
            await get().hydrateFarmer();
          } catch (err) {
            get().setToast(err instanceof Error ? err.message : 'Could not save crop details.');
          }
        }
      },

      setSelectedCenter: (id) => {
        set({ selectedCenterId: id });
        if (get().backendEnabled && get().authRole === 'CENTER_OFFICER') {
          void get().refreshOfficerQueue();
        }
      },

      // -------------------------------------------------------------------
      //  Backend lifecycle
      // -------------------------------------------------------------------
      bootstrap: async () => {
        if (!USE_BACKEND) {
          set({ connection: 'offline' });
          return;
        }
        if (get().connection === 'connecting') return;
        set({ connection: 'connecting', connectionError: null });
        const ok = await checkHealth();
        if (!ok) {
          set({
            connection: 'offline',
            connectionError: 'Unable to connect to procurement services.',
          });
          return;
        }
        set({ connection: 'online' });
        await get().refreshCenters();
      },

      retryConnection: async () => {
        await isBackendLive(true); // bust the cached health result
        await get().bootstrap();
        const role = get().authRole;
        if (get().connection === 'online' && role) {
          set({ authRole: null }); // force re-auth
          await get().ensureAuth(role);
          if (role === 'FARMER') await get().hydrateFarmer();
          if (role === 'CENTER_OFFICER') {
            await get().refreshOfficerQueue();
            await get().refreshRecommendation();
          }
          if (role === 'ADMIN') await get().refreshAdmin();
        }
      },

      ensureAuth: async (role) => {
        if (!USE_BACKEND) return false;
        if (!(await isBackendLive())) return false;
        if (get().authRole === role && get().connection === 'online') return true;
        try {
          const { user } = await authApi.login(DEMO_EMAIL[role], DEMO_PASSWORD);
          set({
            authRole: role,
            connection: 'online',
            connectionError: null,
            backendIds: {
              ...get().backendIds,
              farmerId: user.profileId ?? get().backendIds.farmerId,
            },
          });
          return true;
        } catch (err) {
          set({
            connectionError:
              err instanceof Error ? err.message : 'Login to procurement services failed.',
          });
          return false;
        }
      },

      refreshCenters: async () => {
        if (!(await isBackendLive())) return;
        try {
          const list = (await centerApi.list()) as Parameters<typeof centerIdMap>[0];
          set({
            centers: list.map(toCenter),
            backendIds: { ...get().backendIds, centerIds: centerIdMap(list) },
            connection: 'online',
          });
        } catch (err) {
          set({ connectionError: err instanceof Error ? err.message : 'Failed to load centres.' });
        }
      },

      hydrateFarmer: async () => {
        const ok = await get().ensureAuth('FARMER');
        if (!ok) return;
        await get().refreshCenters();
        const farmerId = get().backendIds.farmerId;
        if (!farmerId) return;
        try {
          const profile = (await farmerApi.get(farmerId)) as {
            language?: Language;
            crop?: string | null;
            quantity?: number;
          } & Record<string, unknown>;
          const mapped = toFarmer(profile as never, get().language);
          set({
            user: mapped,
            farmerProfile: profile,
            language: profile.language ?? get().language,
            // Phase 4: prompt for crop + quantity if not yet set on the profile
            needsCropSetup: !profile.crop || !profile.quantity || profile.quantity <= 0,
          });
        } catch {
          /* keep existing user */
        }
        await get().refreshNotifications();
        await get().refreshFarmerQueue();
        await get().refreshFarmerProcurement();
      },

      refreshFarmerQueue: async () => {
        if (!(await isBackendLive())) return;
        const slug = get().selectedCenterId;
        const cuid = get().backendIds.centerIds[slug];
        if (!cuid) return;
        try {
          const snap = await queueApi.get(cuid);
          const t = get().token;
          const your = t && t.status === 'ACTIVE' ? t.id : get().farmerQueue.yourToken;
          set({ farmerQueue: toQueueState(snap as never, your, get().farmerQueue.running) });
        } catch {
          /* keep last known queue */
        }
      },

      refreshOfficerQueue: async () => {
        const ok = await get().ensureAuth('CENTER_OFFICER');
        if (!ok) return;
        const slug = get().selectedCenterId;
        const cuid = get().backendIds.centerIds[slug];
        if (!cuid) return;
        try {
          const snap = await queueApi.get(cuid);
          set({ officerQueue: toQueueState(snap as never, null, (snap as { running: boolean }).running) });
        } catch {
          /* keep last known */
        }
      },

      refreshNotifications: async () => {
        if (!(await isBackendLive())) return;
        const farmerId = get().backendIds.farmerId;
        try {
          const list = (await notificationApi.list(farmerId ?? undefined)) as Parameters<
            typeof toNotification
          >[0][];
          set({ notifications: list.map(toNotification) });
        } catch {
          /* keep local notifications */
        }
      },

      refreshAdmin: async () => {
        const ok = await get().ensureAuth('ADMIN');
        if (!ok) return;
        try {
          const [overview, centers, farmersServed, waitingTime, utilization, crop, peak, lb, insights] =
            await Promise.all([
              adminApi.overview(),
              adminApi.centers(),
              analyticsApi.farmersServed(),
              analyticsApi.waitingTime(),
              analyticsApi.centerUtilization(),
              analyticsApi.cropProcurement(),
              analyticsApi.peakHours(),
              aiApi.loadBalancing(),
              adminApi.insights(),
            ]);
          set({
            admin: {
              overview: overview as Record<string, unknown>,
              centers: centers as Record<string, unknown>[],
              series: {
                farmersServed: farmersServed as unknown[],
                waitingTime: waitingTime as unknown[],
                utilization: utilization as unknown[],
                crop: crop as unknown[],
                peak: peak as unknown[],
              },
              insights: ((insights as { insights?: string[] }).insights ?? []) as string[],
            },
            activeRecommendation: toLoadBalancing(lb as never),
          });
          await get().refreshCenters();
        } catch (err) {
          set({ connectionError: err instanceof Error ? err.message : 'Failed to load admin data.' });
        }
      },

      // -------------------------------------------------------------------
      //  Farmer
      // -------------------------------------------------------------------
      bookSlot: async (rec) => {
        const state = get();
        const backendOk = state.backendEnabled && (await state.ensureAuth('FARMER'));

        if (backendOk && state.backendIds.farmerId) {
          const slug = state.selectedCenterId;
          const cuid = state.backendIds.centerIds[slug];
          let scheduleId = rec.scheduleId;
          let cropId = rec.cropId;
          if (!scheduleId) {
            const r = (await centerApi.recommendedSchedule(cuid)) as {
              scheduleId: string;
              options?: { scheduleId: string }[];
            };
            scheduleId = r.scheduleId;
          }
          if (!cropId) {
            const schedules = (await centerApi.schedules(cuid)) as { id: string; cropId: string }[];
            cropId = schedules.find((s) => s.id === scheduleId)?.cropId ?? schedules[0]?.cropId;
          }
          const created = (await tokenApi.create({
            farmerId: state.backendIds.farmerId,
            centerId: cuid,
            scheduleId: scheduleId!,
            cropId: cropId!,
            quantity: state.user?.quantityQuintals ?? 25,
          })) as Parameters<typeof toTokenFromCreate>[0] & { id: string };
          const token = toTokenFromCreate(created);
          set({
            token,
            backendIds: { ...state.backendIds, tokenBackendId: created.id },
            farmerQueue: { ...state.farmerQueue, yourToken: token.id },
          });
          await get().refreshFarmerQueue();
          await get().refreshNotifications();
          return token;
        }

        // ---- mock fallback ----
        const center = getCenterById(state.selectedCenterId) ?? state.centers[0];
        const tokenId = `A${TOKEN_SERIES_START}`;
        const token: Token = {
          id: tokenId,
          farmerName: state.user?.name ?? demoFarmer.name,
          centerId: center.id,
          centerName: center.name,
          crop: state.user?.crop ?? 'Wheat',
          quantityQuintals: state.user?.quantityQuintals ?? 25,
          date: BOOKING_DATE,
          slot: rec.slot,
          estimatedWaitMinutes: rec.waitMinutes,
          queueAhead: rec.queueAhead,
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
        };
        set({ token, farmerQueue: attachToken(state.farmerQueue, tokenId) });
        get().pushNotification(notifyTokenBooked(tokenId, rec.slot));
        return token;
      },

      cancelToken: async () => {
        const t = get().token;
        if (!t) return;
        const backendId = get().backendIds.tokenBackendId;
        if (get().backendEnabled && backendId && (await isBackendLive())) {
          try {
            await tokenApi.cancel(backendId);
          } catch {
            /* fall through to local update */
          }
        }
        set({
          token: { ...t, status: 'CANCELLED' },
          farmerQueue: { ...get().farmerQueue, yourToken: null },
          backendIds: { ...get().backendIds, tokenBackendId: null },
        });
        if (get().backendEnabled) await get().refreshFarmerQueue();
      },

      tickFarmerQueue: async () => {
        if (get().backendEnabled && (await isBackendLive())) {
          await get().refreshFarmerQueue();
          return;
        }
        set({ farmerQueue: advanceQueue(get().farmerQueue) });
      },
      setFarmerQueueRunning: (running) =>
        set({ farmerQueue: setRunning(get().farmerQueue, running) }),

      // -------------------------------------------------------------------
      //  Officer queue
      // -------------------------------------------------------------------
      officerProcessNext: async () => {
        const ok = get().backendEnabled && (await get().ensureAuth('CENTER_OFFICER'));
        const cuid = get().backendIds.centerIds[get().selectedCenterId];
        if (ok && cuid) {
          try {
            const snap = await queueApi.processNext(cuid);
            set({
              officerQueue: toQueueState(snap as never, null, (snap as { running: boolean }).running),
            });
            get().setToast(`Now serving ${(snap as { currentlyServing: string }).currentlyServing}`);
            await get().refreshCenters();
            return;
          } catch (err) {
            get().setToast(err instanceof Error ? err.message : 'Could not process next token.');
            return;
          }
        }
        const q = processNextToken(get().officerQueue);
        set({ officerQueue: q });
        get().setToast(`Processing ${q.nowServing}`);
      },

      officerSkip: async () => {
        const ok = get().backendEnabled && (await get().ensureAuth('CENTER_OFFICER'));
        const cuid = get().backendIds.centerIds[get().selectedCenterId];
        if (ok && cuid) {
          try {
            const current = await queueApi.get(cuid);
            const firstWaiting =
              (current as { queueEntries: { tokenNumber: string; status: string }[] }).queueEntries.find(
                (e) => e.status === 'WAITING',
              )?.tokenNumber ?? null;
            const tokenId = findEntryTokenId(current as never, firstWaiting);
            if (!tokenId) throw new Error('No token to skip');
            const snap = await queueApi.skip(cuid, tokenId);
            set({
              officerQueue: toQueueState(snap as never, null, (snap as { running: boolean }).running),
            });
            get().setToast('Token skipped');
            await get().refreshCenters();
            return;
          } catch (err) {
            get().setToast(err instanceof Error ? err.message : 'Could not skip token.');
            return;
          }
        }
        const q = skipToken(get().officerQueue);
        set({ officerQueue: q });
        get().setToast(`Skipped — now serving ${q.nowServing}`);
      },

      officerMarkComplete: async () => {
        const ok = get().backendEnabled && (await get().ensureAuth('CENTER_OFFICER'));
        const cuid = get().backendIds.centerIds[get().selectedCenterId];
        if (ok && cuid) {
          try {
            const current = await queueApi.get(cuid);
            const tokenId = (current as { currentTokenId: string | null }).currentTokenId;
            if (!tokenId) throw new Error('No token is being served');
            const res = (await queueApi.complete(cuid, tokenId)) as { queue: unknown };
            set({
              officerQueue: toQueueState(
                res.queue as never,
                null,
                (res.queue as { running: boolean }).running,
              ),
            });
            get().setToast('Procurement completed');
            await get().refreshCenters();
            return;
          } catch (err) {
            get().setToast(err instanceof Error ? err.message : 'Could not complete procurement.');
            return;
          }
        }
        const q = processNextToken(get().officerQueue);
        set({ officerQueue: q });
        get().setToast('Marked complete');
      },

      setOfficerQueueRunning: async (running) => {
        const ok = get().backendEnabled && (await get().ensureAuth('CENTER_OFFICER'));
        const cuid = get().backendIds.centerIds[get().selectedCenterId];
        if (ok && cuid) {
          try {
            const snap = await queueApi.setRunning(cuid, running);
            set({
              officerQueue: toQueueState(snap as never, null, (snap as { running: boolean }).running),
            });
            return;
          } catch {
            /* fall through */
          }
        }
        set({ officerQueue: setRunning(get().officerQueue, running) });
      },

      // -------------------------------------------------------------------
      //  AI load balancing
      // -------------------------------------------------------------------
      refreshRecommendation: async () => {
        if (get().backendEnabled && (await isBackendLive())) {
          try {
            const lb = await aiApi.loadBalancing();
            set({ activeRecommendation: toLoadBalancing(lb as never) });
            return;
          } catch {
            /* fall through */
          }
        }
        const centers = get().centers;
        const from = overloadedCenter(centers);
        if (!from) {
          set({ activeRecommendation: null });
          return;
        }
        const to = mostAvailableCenter(centers, from.id);
        if (!to) {
          set({ activeRecommendation: null });
          return;
        }
        set({ activeRecommendation: computeLoadBalancing(from, to) });
      },

      applyRecommendation: async () => {
        const rec = get().activeRecommendation;
        if (!rec || rec.applied) return;

        if (get().backendEnabled && (await get().ensureAuth('CENTER_OFFICER'))) {
          try {
            await aiApi.applyLoadBalancing(rec.id);
            await get().refreshCenters();
            await get().refreshRecommendation();
            await get().refreshNotifications();
            set((s) => ({
              activeRecommendation: s.activeRecommendation
                ? { ...s.activeRecommendation, applied: true }
                : { ...rec, applied: true },
            }));
            get().setToast('AI recommendation applied successfully.');
            return;
          } catch (err) {
            get().setToast(err instanceof Error ? err.message : 'Could not apply recommendation.');
            return;
          }
        }

        // ---- mock fallback ----
        const centers = get().centers.map((c) => {
          if (c.id === rec.fromCenterId) {
            const queueLength = Math.max(0, c.queueLength - rec.redirectFarmers);
            return {
              ...c,
              queueLength,
              served: Math.max(0, c.served - Math.round(rec.redirectFarmers * 0.3)),
              load: (queueLength >= 50 ? 'high' : queueLength <= 20 ? 'low' : 'normal') as ProcurementCenter['load'],
              predictedWaitMinutes: predictWaitingTime(queueLength, c.avgProcessingMinutes),
            };
          }
          if (c.id === rec.toCenterId) {
            const queueLength = c.queueLength + rec.redirectFarmers;
            return {
              ...c,
              queueLength,
              load: (queueLength >= 50 ? 'high' : queueLength <= 20 ? 'low' : 'normal') as ProcurementCenter['load'],
              predictedWaitMinutes: predictWaitingTime(queueLength, c.avgProcessingMinutes),
            };
          }
          return c;
        });
        set({ centers, activeRecommendation: { ...rec, applied: true } });
        get().pushNotification(
          notifyAIRecommendationApplied(rec.fromCenterName, rec.toCenterName, rec.redirectFarmers),
        );
        get().setToast('AI recommendation applied successfully.');
      },

      // -------------------------------------------------------------------
      //  Demo mode
      // -------------------------------------------------------------------
      simulateHighDemand: async () => {
        if (get().backendEnabled && (await get().ensureAuth('CENTER_OFFICER'))) {
          try {
            await demoApi.highDemand();
            await get().refreshCenters();
            await get().refreshRecommendation();
            await get().refreshOfficerQueue();
            await get().refreshNotifications();
            get().setToast('High demand simulated at Amer Procurement Center.');
            return;
          } catch (err) {
            get().setToast(err instanceof Error ? err.message : 'Demo action failed.');
            return;
          }
        }
        const centers = get().centers.map((c) =>
          c.id === 'amer'
            ? { ...c, served: 118, queueLength: 75, load: 'high' as const, predictedWaitMinutes: 128 }
            : c,
        );
        set({ centers, officerQueue: surgeQueue(get().officerQueue, 40) });
        await get().refreshRecommendation();
        get().pushNotification(notifyHighDemand('Amer Procurement Center'));
        get().setToast('High demand simulated at Amer Procurement Center.');
      },

      simulateQueueReduction: async () => {
        if (get().backendEnabled && (await get().ensureAuth('CENTER_OFFICER'))) {
          try {
            await demoApi.queueReduction();
            await get().refreshCenters();
            await get().refreshRecommendation();
            await get().refreshOfficerQueue();
            get().setToast('Queues reduced across all centers.');
            return;
          } catch (err) {
            get().setToast(err instanceof Error ? err.message : 'Demo action failed.');
            return;
          }
        }
        const centers = get().centers.map((c) => {
          const queueLength = Math.max(4, Math.round(c.queueLength * 0.4));
          return {
            ...c,
            queueLength,
            load: (queueLength >= 50 ? 'high' : queueLength <= 20 ? 'low' : 'normal') as ProcurementCenter['load'],
            predictedWaitMinutes: predictWaitingTime(queueLength, c.avgProcessingMinutes),
          };
        });
        set({ centers });
        await get().refreshRecommendation();
        get().pushNotification(notifyLowCrowd(25));
        get().setToast('Queues reduced across all centers.');
      },

      simulateScheduleChange: async () => {
        if (get().backendEnabled && (await get().ensureAuth('CENTER_OFFICER'))) {
          try {
            await demoApi.scheduleChange();
            await get().refreshNotifications();
            const t = get().token;
            if (t && t.status === 'ACTIVE') set({ token: { ...t, slot: '1:00 PM – 1:30 PM' } });
            set({
              schedule: get().schedule.map((s, i) =>
                i === 3 ? { ...s, status: 'active' as const } : s,
              ),
            });
            get().setToast('Procurement schedule updated.');
            return;
          } catch (err) {
            get().setToast(err instanceof Error ? err.message : 'Demo action failed.');
            return;
          }
        }
        const schedule = get().schedule.map((s, i) =>
          i === 3 ? { ...s, status: 'active' as const } : s,
        );
        set({ schedule });
        get().pushNotification(notifyScheduleChange('11:30 AM', '1:00 PM'));
        const t = get().token;
        if (t && t.status === 'ACTIVE') set({ token: { ...t, slot: '1:00 PM – 1:30 PM' } });
        get().setToast('Procurement schedule updated.');
      },

      processNextTokenDemo: async () => {
        if (get().backendEnabled && (await get().ensureAuth('CENTER_OFFICER'))) {
          try {
            await demoApi.processToken();
            await get().refreshOfficerQueue();
            await get().refreshFarmerQueue();
            await get().refreshCenters();
            get().setToast('Processed next token.');
            return;
          } catch (err) {
            get().setToast(err instanceof Error ? err.message : 'Demo action failed.');
            return;
          }
        }
        await get().officerProcessNext();
      },

      resetDemo: async () => {
        if (get().backendEnabled && (await get().ensureAuth('CENTER_OFFICER'))) {
          try {
            await demoApi.reset();
            await get().refreshCenters();
            await get().refreshOfficerQueue();
            await get().refreshFarmerQueue();
            await get().refreshNotifications();
            set({ activeRecommendation: null });
            get().setToast('Demo state reset.');
            return;
          } catch (err) {
            get().setToast(err instanceof Error ? err.message : 'Demo reset failed.');
            return;
          }
        }
        set({
          centers: clone(seedCenters),
          schedule: clone(todaysSchedule),
          farmerQueue: get().token
            ? attachToken(clone(initialFarmerQueue), get().token!.id)
            : clone(initialFarmerQueue),
          officerQueue: clone(initialOfficerQueue),
          activeRecommendation: null,
          notifications: clone(initialNotifications),
        });
        get().setToast('Demo state reset.');
      },

      // -------------------------------------------------------------------
      //  Notifications
      // -------------------------------------------------------------------
      pushNotification: (n) => set({ notifications: [n, ...get().notifications] }),

      markAllNotificationsRead: async () => {
        set({ notifications: get().notifications.map((n) => ({ ...n, read: true })) });
        const farmerId = get().backendIds.farmerId;
        if (get().backendEnabled && farmerId && (await isBackendLive())) {
          try {
            await notificationApi.markAllRead(farmerId);
          } catch {
            /* optimistic update already applied */
          }
        }
      },

      markNotificationRead: async (id) => {
        set({
          notifications: get().notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
        });
        if (get().backendEnabled && (await isBackendLive())) {
          try {
            await notificationApi.markRead(id);
          } catch {
            /* optimistic */
          }
        }
      },

      setToast: (msg) => set({ toast: msg }),
    }),
    {
      name: 'kisansetu-ai',
      partialize: (s) => ({
        language: s.language,
        user: s.user,
        onboardingComplete: s.onboardingComplete,
        selectedCenterId: s.selectedCenterId,
        token: s.token,
        demoMode: s.demoMode,
        centers: s.centers,
        schedule: s.schedule,
        farmerQueue: s.farmerQueue,
        notifications: s.notifications,
      }),
    },
  ),
);

/** Selectors */
export const selectSelectedCenter = (s: AppState): ProcurementCenter =>
  s.centers.find((c) => c.id === s.selectedCenterId) ?? s.centers[0];

export const selectUnreadCount = (s: AppState): number =>
  s.notifications.filter((n) => !n.read).length;
