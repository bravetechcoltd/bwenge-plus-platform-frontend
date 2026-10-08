import AuthReducer from "./features/auth/auth-slice";
import courseReducer from "./features/courses/course-slice";
import institutionReducer from "./features/institutions/institutionSlice";
import enrollmentReducer from "./features/enrollments/enrollmentSlice";
import { configureStore, combineReducers } from "@reduxjs/toolkit"
import { persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from "redux-persist"
import courseInstructorReducer from './features/courseInstructors/courseInstructorSlice';
import instructorReducer from "./features/instructor/instructorSlice"
import systemAdminUserManagementReducer from "./features/systemAdmin/userManagementSlice"
import systemSettingsReducer from "./features/system-settings/systemSettingsSlice";
import notificationReducer from "./features/notifications/notificationSlice";
import heroSlideReducer from "./features/auth/heroSlideSlice"
import storage from "redux-persist/lib/storage"
/**
 * AXM-CONS-001 finding A-05.
 *
 * The whitelist named `login`. No reducer is registered under that key — the
 * auth slice is `bwengeAuth` — so redux-persist has been persisting nothing at
 * all, and the `PersistGate` wrapping the whole application has been gating it
 * on the rehydration of an empty object. The transform that force-reset
 * `loading` was dead for the same reason.
 *
 * Session survival across a refresh has therefore rested entirely on the
 * cookie and localStorage reads in `use-auth.tsx` and `auth-slice.ts`, which
 * still work and are still the primary path. Naming the real key makes the
 * store a genuine third tier rather than a decorative one.
 *
 * Only durable identity is persisted. The transient fields are stripped on the
 * way in, because a persisted `isLoading: true` or a stale `error` would
 * survive the refresh and be read as current — the same class of bug this plan
 * exists to remove.
 */
const TRANSIENT_AUTH_KEYS = [
  "isLoading",
  "error",
  "errorCode",
  "enrolledCourses",
  "recentActivity",
  "requiresVerification",
  "verificationEmail",
  "applicationSubmitted",
  "applicationEmail",
  "rejectionReason",
] as const

const stripTransient = (state: any) => {
  if (!state || typeof state !== "object") return state
  const next = { ...state }
  for (const key of TRANSIENT_AUTH_KEYS) delete next[key]
  return { ...next, isLoading: false, error: null }
}

const persistConfig = {
  key: "root",
  storage,
  whitelist: ["bwengeAuth"],
  transforms: [
    {
      in: (inboundState: any, key: PropertyKey) =>
        key === "bwengeAuth" ? stripTransient(inboundState) : inboundState,
      out: (outboundState: any, key: PropertyKey) =>
        key === "bwengeAuth" ? stripTransient(outboundState) : outboundState,
    },
  ],
}

const rootReducer = combineReducers({
  systemSettings: systemSettingsReducer,
  bwengeAuth: AuthReducer,
  courses: courseReducer,
  institutions: institutionReducer,
  enrollments: enrollmentReducer,
  courseInstructors: courseInstructorReducer,
  instructor: instructorReducer,
  systemAdminUserManagement:systemAdminUserManagementReducer,
  notifications: notificationReducer,
  // HS-001. The homepage banner, which used to be an array in page.tsx.
  heroSlides: heroSlideReducer





})

const persistedReducer = persistReducer(persistConfig, rootReducer)

const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
})

const persistor = persistStore(store)

export { store, persistor }
export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch