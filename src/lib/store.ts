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
import storage from "redux-persist/lib/storage"
const persistConfig = {
  key: "root",
  storage,
  whitelist: ["login"],
  transforms: [
    {
      in: (inboundState: any, key: PropertyKey) => {
        if (key === 'login' && inboundState) {
          return {
            ...inboundState,
            loading: false,
          }
        }
        return inboundState
      },
      out: (outboundState: any, key: PropertyKey) => {
        if (key === 'login' && outboundState) {
          return {
            ...outboundState,
            loading: false,
          }
        }
        return outboundState
      },
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
  systemAdminUserManagement:systemAdminUserManagementReducer





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