import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import api from "@/lib/api";
import Cookies from "js-cookie";

// ==================== ENHANCED ENUMS ====================
export enum InstitutionType {
  UNIVERSITY = "UNIVERSITY",
  GOVERNMENT = "GOVERNMENT",
  PRIVATE_COMPANY = "PRIVATE_COMPANY",
  NGO = "NGO",
}

export enum BwengeRole {
  SYSTEM_ADMIN = "SYSTEM_ADMIN",
  INSTITUTION_ADMIN = "INSTITUTION_ADMIN",
  CONTENT_CREATOR = "CONTENT_CREATOR",
  INSTRUCTOR = "INSTRUCTOR",
  LEARNER = "LEARNER",
}

export enum InstitutionRole {
  ADMIN = "ADMIN",
  CONTENT_CREATOR = "CONTENT_CREATOR",
  INSTRUCTOR = "INSTRUCTOR",
  MEMBER = "MEMBER",
}

export enum SystemType {
  BWENGEPLUS = "BWENGEPLUS",
  ONGERA = "ONGERA",
}

// ==================== ENHANCED INTERFACES ====================
interface LearningPreferences {
  preferred_language?: string;
  notification_settings?: any;
  learning_pace?: string;
  interests?: string[];
  theme?: "light" | "dark" | "system";
  two_factor_enabled?: boolean;
  last_password_change?: string;
}

interface Course {
  id: string;
  title: string;
  progress: number;
  instructor: string;
  thumbnail_url?: string;
}

interface Activity {
  id: string;
  type: string;
  description: string;
  timestamp: string;
}

interface UserProfile {
  id?: string;
  institution_name?: string;
  department?: string;
  academic_level?: string;
  research_interests?: string[];
  orcid_id?: string;
  google_scholar_url?: string;
  linkedin_url?: string;
  website_url?: string;
  cv_file_url?: string;
  current_position?: string;
  home_institution?: string;
  willing_to_mentor?: boolean;
  institution_address?: string;
  institution_phone?: string;
  institution_type?: string;
  institution_website?: string;
  institution_description?: string;
  institution_departments?: string[];
  institution_founded_year?: number;
  institution_accreditation?: string;
  total_projects_count?: number;
  total_followers_count?: number;
  total_following_count?: number;
}

interface InstitutionData {
  id: string;
  name: string;
  type: InstitutionType;
  logo_url?: string;
  description?: string;
  is_active: boolean;
  slug: string;
  created_at: string;
  updated_at: string;
  settings?: {
    allow_public_courses?: boolean;
    require_approval_for_spoc?: boolean;
    max_instructors?: number;
    custom_branding?: any;
  };
  user_role?: InstitutionRole;

  _protected?: {
    system: SystemType;
    last_updated: string;
    immutable_fields: string[];
    version: number;
  };
}

export interface BwengeUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  username?: string;
  phone_number?: string;
  profile_picture_url?: string;
  bio?: string;
  account_type: string;
  is_verified: boolean;
  country?: string;
  city?: string;
  date_joined: string | null;
  last_login?: string | null;

  // ==================== SYSTEM IDENTIFICATION (PROTECTED) ====================
  IsForWhichSystem: SystemType;

  // ==================== INSTITUTION-RELATED FIELDS (PROTECTED) ====================
  is_institution_member: boolean;
  institution_ids?: string[];
  primary_institution_id?: string;
  bwenge_role: BwengeRole;
  institution_role?: InstitutionRole;
  institution?: InstitutionData;
  spoc_access_codes_used?: string[];
  profile?: UserProfile;

  // ==================== BWENGEPLUS ENHANCEMENTS ====================
  enrolled_courses_count: number;
  completed_courses_count: number;
  total_learning_hours: number;
  certificates_earned: number;
  learning_preferences?: LearningPreferences;
  bwenge_profile_completed: boolean;
  last_login_bwenge?: string | null;
  updated_at: string | null;

  // ==================== LEGACY FIELDS ====================
  current_courses?: Course[];
  total_points?: number;
  is_active?: boolean;
  isUserLogin?: boolean;
  social_auth_provider?: string;
  social_auth_id?: string;
  application_status?: "pending" | "approved" | "rejected";
  applied_at?: string | null;
  rejection_reason?: string | null;

  // ==================== PROTECTION METADATA ====================
  _protection?: {
    fields_protected: string[];
    last_cross_system_sync: string;
    system_origin: SystemType;
    version: number;
    checksum?: string;
  };
}

export interface BwengeAuthState {
  token: string | null;
  user: BwengeUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  bwengeRole: BwengeRole | null;
  enrolledCourses: Course[];
  recentActivity: Activity[];
  ssoInitialized: boolean;
  hasOngeraSession: boolean;
  requiresVerification: boolean;
  verificationEmail: string | null;
  applicationSubmitted: boolean;
  applicationEmail: string | null;
  errorCode: string | null;
  rejectionReason: string | null;
  institutionAdminData?: {
    institutionId?: string;
    institutionName?: string;
    canCreateCourses?: boolean;
    canManageMembers?: boolean;
    canViewAnalytics?: boolean;
  };

  protection: {
    active: boolean;
    fieldsProtected: string[];
    lastSync: string | null;
    crossSystemCompatible: boolean;
    validationChecks: {
      institution: boolean;
      roles: boolean;
      system: boolean;
    };
  };
}

// ==================== SAFE STORAGE HELPERS ====================
const safeGetLocalStorage = (key: string, defaultValue: string = ""): string => {
  if (typeof window === "undefined") return defaultValue;
  try {
    return localStorage.getItem(key) || defaultValue;
  } catch (error) {
    return defaultValue;
  }
};

const safeSetLocalStorage = (key: string, value: string): void => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, value);
  } catch (error) {
  }
};

const safeRemoveLocalStorage = (key: string): void => {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(key);
  } catch (error) {
  }
};

const safeGetLocalStorageJSON = <T>(key: string, defaultValue: T): T => {
  const value = safeGetLocalStorage(key);
  if (!value) return defaultValue;
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    return defaultValue;
  }
};

const safeSetLocalStorageJSON = (key: string, value: any): void => {
  try {
    safeSetLocalStorage(key, JSON.stringify(value));
  } catch (error) {
  }
};

const toISOStringOrNull = (date: any): string | null => {
  if (!date) return null;
  if (typeof date === "string") return date;
  if (date instanceof Date) return date.toISOString();
  try {
    return new Date(date).toISOString();
  } catch {
    return null;
  }
};

const calculateChecksum = (data: any): string => {
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
};

// ==================== INITIAL STATE HYDRATION ====================
/**
 * Reads the persisted BwengeUser from cookies (primary) or localStorage (fallback)
 * so the Redux store is hydrated immediately on first render — fixing the
 * "Access Denied / No Institution Selected" flash that occurred because
 * `user` started as `null` before any async thunk ran.
 */
const getInitialAuthUser = (): BwengeUser | null => {
  if (typeof window === "undefined") return null;

  // Priority 1: cookies (set by storeAuthData on login)
  try {
    const raw = Cookies.get("bwenge_user");
    if (raw) {
      const decoded = decodeURIComponent(raw);
      const parsed = JSON.parse(decoded);
      if (parsed && parsed.id) {
        return parsed as BwengeUser;
      }
    }
  } catch (e) {
  }

  // Priority 2: localStorage fallback
  try {
    const raw = localStorage.getItem("bwengeplus_user");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.id) {
        return parsed as BwengeUser;
      }
    }
  } catch (e) {
  }

  return null;
};

const getInitialToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return (
    Cookies.get("bwenge_token") ||
    safeGetLocalStorage("bwengeplus_token") ||
    null
  );
};

const getInitialBwengeRole = (user: BwengeUser | null): BwengeRole | null => {
  return user?.bwenge_role ?? null;
};

// ============================================================
// ADD THESE THUNKS TO: auth-slice.ts
// Place alongside loginBwenge, loginWithGoogle, etc.
// ============================================================

// ── Apply to BwengePlus (Register) ───────────────────────────────────────
export const registerBwenge = createAsyncThunk(
  "bwengeAuth/register",
  async (
    data: {
      first_name: string;
      last_name: string;
      email: string;
      password: string;
      confirm_password: string;
      country?: string;
      phone_number?: string;
      date_of_birth?: string;
      gender?: string;
      education_level?: string;
      motivation?: string;
      linkedin_url?: string;
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await api.post("/auth/register", data);
      if (response.data.success) {
        return response.data.data; // { user, application_submitted, email }
      }
      return rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Application submission failed"
      );
    }
  }
);

// ── Request password change (send OTP) ────────────────────────────────────
export const requestPasswordChange = createAsyncThunk(
  "bwengeAuth/requestPasswordChange",
  async (email: string, { rejectWithValue }) => {
    try {
      const response = await api.post("/auth/request-password-change", { email });
      if (response.data.success) {
        return response.data;
      }
      return rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to send verification code"
      );
    }
  }
);

// ── Change password using OTP ─────────────────────────────────────────────
export const changePasswordWithOTP = createAsyncThunk(
  "bwengeAuth/changePasswordWithOTP",
  async (
    data: { email: string; otp: string; new_password: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await api.post("/auth/change-password-otp", data);
      if (response.data.success) {
        return response.data;
      }
      return rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to change password"
      );
    }
  }
);

// ==================== AUTH DATA HELPERS ====================
const storeAuthData = (user: BwengeUser, token: string) => {

  const protectedUser: BwengeUser = {
    ...user,
    _protection: user._protection || {
      fields_protected: [
        "IsForWhichSystem",
        "bwenge_role",
        "institution_ids",
        "primary_institution_id",
        "institution_role",
        "institution",
      ],
      last_cross_system_sync: new Date().toISOString(),
      system_origin: SystemType.BWENGEPLUS,
      version: 2,
      checksum: calculateChecksum(user),
    },
  };

  if (protectedUser.institution) {
    protectedUser.institution = {
      ...protectedUser.institution,
      _protected: protectedUser.institution._protected || {
        system: SystemType.BWENGEPLUS,
        last_updated: new Date().toISOString(),
        immutable_fields: ["id", "name", "type", "slug", "created_at"],
        version: 1,
      },
    };
  }

  Cookies.set("bwenge_token", token, {
    expires: 7,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });
  Cookies.set("bwenge_user", JSON.stringify(protectedUser), {
    expires: 7,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });

  if (protectedUser.institution) {
    Cookies.set("bwenge_institution", JSON.stringify(protectedUser.institution), {
      expires: 7,
      secure: process.env.NODE_ENV === "production",
    });
  }

  if (protectedUser.primary_institution_id) {
    Cookies.set("bwenge_primary_institution_id", protectedUser.primary_institution_id, {
      expires: 7,
      secure: process.env.NODE_ENV === "production",
    });
  }

  if (protectedUser.institution_role) {
    Cookies.set("bwenge_institution_role", protectedUser.institution_role, {
      expires: 7,
      secure: process.env.NODE_ENV === "production",
    });
  }

  safeSetLocalStorage("bwengeplus_token", token);
  safeSetLocalStorageJSON("bwengeplus_user", protectedUser);
  safeSetLocalStorage("bwenge_protection_active", "true");
  safeSetLocalStorage("last_system_login", SystemType.BWENGEPLUS);
  safeSetLocalStorage("last_protection_sync", new Date().toISOString());

  const crossSystemContext = {
    system: SystemType.BWENGEPLUS,
    bwenge_role: protectedUser.bwenge_role,
    institution_ids: protectedUser.institution_ids,
    primary_institution_id: protectedUser.primary_institution_id,
    institution_role: protectedUser.institution_role,
    last_sync: new Date().toISOString(),
    checksum: calculateChecksum(protectedUser),
  };

  safeSetLocalStorageJSON("cross_system_context", crossSystemContext);

};

const clearAuthData = () => {

  Cookies.remove("bwenge_token");
  Cookies.remove("bwenge_user");
  Cookies.remove("bwenge_institution");
  Cookies.remove("bwenge_primary_institution_id");
  Cookies.remove("bwenge_institution_role");

  safeRemoveLocalStorage("bwengeplus_token");
  safeRemoveLocalStorage("bwengeplus_user");
  safeRemoveLocalStorage("bwengeplus_institution");
  safeRemoveLocalStorage("bwengeplus_primary_institution_id");
  safeRemoveLocalStorage("bwengeplus_institution_role");
  safeRemoveLocalStorage("cross_system_context");
  safeRemoveLocalStorage("last_system_login");
  safeRemoveLocalStorage("ongera_cross_system_context");
  safeRemoveLocalStorage("ongera_last_sync");
  safeRemoveLocalStorage("ongera_protection_active");
  safeRemoveLocalStorage("bwenge_protection_active");
  safeRemoveLocalStorage("last_protection_sync");
  safeRemoveLocalStorage("user");
  safeRemoveLocalStorage("token")

  try {
    localStorage.removeItem("persist:root");
  } catch (_) { }

};

const normalizeBwengeUser = (backendUser: any): BwengeUser => {
  const normalizedUser: BwengeUser = {
    id: backendUser.id,
    email: backendUser.email,
    first_name: backendUser.first_name || "",
    last_name: backendUser.last_name || "",
    username: backendUser.username,
    phone_number: backendUser.phone_number,
    profile_picture_url: backendUser.profile_picture_url,
    bio: backendUser.bio,
    account_type: backendUser.account_type,
    is_verified: backendUser.is_verified,
    country: backendUser.country,
    city: backendUser.city,
    date_joined: toISOStringOrNull(backendUser.date_joined),
    last_login: toISOStringOrNull(backendUser.last_login),

    IsForWhichSystem: backendUser.IsForWhichSystem || SystemType.BWENGEPLUS,

    is_institution_member: backendUser.is_institution_member || false,
    institution_ids: backendUser.institution_ids || [],
    primary_institution_id: backendUser.primary_institution_id,
    bwenge_role: (backendUser.bwenge_role as BwengeRole) || BwengeRole.LEARNER,
    institution_role: backendUser.institution_role as InstitutionRole,

    institution: backendUser.institution
      ? {
        ...backendUser.institution,
        created_at:
          toISOStringOrNull(backendUser.institution.created_at) || "",
        updated_at:
          toISOStringOrNull(backendUser.institution.updated_at) || "",
        _protected: backendUser.institution._protected || {
          system: SystemType.BWENGEPLUS,
          last_updated: new Date().toISOString(),
          immutable_fields: ["id", "name", "type", "slug", "created_at"],
          version: 1,
        },
      }
      : undefined,

    spoc_access_codes_used: backendUser.spoc_access_codes_used || [],
    profile: backendUser.profile,

    enrolled_courses_count: backendUser.enrolled_courses_count || 0,
    completed_courses_count: backendUser.completed_courses_count || 0,
    total_learning_hours: backendUser.total_learning_hours || 0,
    certificates_earned: backendUser.certificates_earned || 0,
    learning_preferences: backendUser.learning_preferences,
    bwenge_profile_completed: backendUser.bwenge_profile_completed || false,
    last_login_bwenge: toISOStringOrNull(backendUser.last_login_bwenge),
    updated_at: toISOStringOrNull(backendUser.updated_at),

    current_courses: backendUser.current_courses || [],
    total_points: backendUser.total_points || 0,
    is_active:
      backendUser.is_active !== undefined ? backendUser.is_active : true,
    isUserLogin: backendUser.isUserLogin || false,
    social_auth_provider: backendUser.social_auth_provider,
    social_auth_id: backendUser.social_auth_id,

    _protection: backendUser._protection || {
      fields_protected: [
        "IsForWhichSystem",
        "bwenge_role",
        "institution_ids",
        "primary_institution_id",
        "institution_role",
        "institution",
      ],
      last_cross_system_sync: new Date().toISOString(),
      system_origin: SystemType.BWENGEPLUS,
      version: 2,
      checksum: calculateChecksum(backendUser),
    },
  };

  return normalizedUser;
};

const validateBwengeUser = (
  user: BwengeUser
): {
  isValid: boolean;
  missingFields: string[];
  warnings: string[];
  recoveryActions: string[];
} => {
  const missingFields: string[] = [];
  const warnings: string[] = [];
  const recoveryActions: string[] = [];

  if (!user.IsForWhichSystem) {
    missingFields.push("IsForWhichSystem");
    recoveryActions.push("Set to BWENGEPLUS");
  }

  if (!user.bwenge_role) {
    missingFields.push("bwenge_role");
    recoveryActions.push("Set to LEARNER");
  }

  if (user.is_institution_member && !user.primary_institution_id) {
    warnings.push("Institution member without primary institution");
  }

  if (
    user.institution_ids &&
    user.institution_ids.length > 0 &&
    !user.primary_institution_id
  ) {
    warnings.push("Has institution IDs but no primary institution");
  }

  if (!user._protection) {
    warnings.push("Missing protection metadata");
    recoveryActions.push("Initialize protection metadata");
  } else {
    if (!user._protection.fields_protected.includes("IsForWhichSystem")) {
      warnings.push("IsForWhichSystem not in protected fields");
    }
    if (!user._protection.fields_protected.includes("bwenge_role")) {
      warnings.push("bwenge_role not in protected fields");
    }
  }

  return {
    isValid: missingFields.length === 0,
    missingFields,
    warnings,
    recoveryActions,
  };
};

const recoverBwengeUser = (user: Partial<BwengeUser>): BwengeUser => {

  const recoveredUser: BwengeUser = {
    id: user.id || "recovered-user-id",
    email: user.email || "user@example.com",
    first_name: user.first_name || "User",
    last_name: user.last_name || "",
    username: user.username || "user",
    phone_number: user.phone_number || "",
    profile_picture_url: user.profile_picture_url || "",
    bio: user.bio || "",
    account_type: user.account_type || "user",
    is_verified: user.is_verified || false,
    country: user.country || "",
    city: user.city || "",
    date_joined: user.date_joined || new Date().toISOString(),
    last_login: user.last_login || new Date().toISOString(),

    IsForWhichSystem: user.IsForWhichSystem || SystemType.BWENGEPLUS,

    is_institution_member: user.is_institution_member || false,
    institution_ids: user.institution_ids || [],
    primary_institution_id: user.primary_institution_id,
    bwenge_role: user.bwenge_role || BwengeRole.LEARNER,
    institution_role: user.institution_role,
    institution: user.institution,
    spoc_access_codes_used: user.spoc_access_codes_used || [],
    profile: user.profile,

    enrolled_courses_count: user.enrolled_courses_count || 0,
    completed_courses_count: user.completed_courses_count || 0,
    total_learning_hours: user.total_learning_hours || 0,
    certificates_earned: user.certificates_earned || 0,
    learning_preferences: user.learning_preferences,
    bwenge_profile_completed: user.bwenge_profile_completed || false,
    last_login_bwenge: user.last_login_bwenge || new Date().toISOString(),
    updated_at: user.updated_at || new Date().toISOString(),

    current_courses: user.current_courses || [],
    total_points: user.total_points || 0,
    is_active: user.is_active !== undefined ? user.is_active : true,
    isUserLogin: user.isUserLogin || false,
    social_auth_provider: user.social_auth_provider,
    social_auth_id: user.social_auth_id,

    _protection: user._protection || {
      fields_protected: [
        "IsForWhichSystem",
        "bwenge_role",
        "institution_ids",
        "primary_institution_id",
        "institution_role",
        "institution",
      ],
      last_cross_system_sync: new Date().toISOString(),
      system_origin: SystemType.BWENGEPLUS,
      version: 2,
      checksum: "",
    },
  };

  if (!recoveredUser.IsForWhichSystem) {
    recoveredUser.IsForWhichSystem = SystemType.BWENGEPLUS;
  }

  if (!recoveredUser.bwenge_role) {
    recoveredUser.bwenge_role = BwengeRole.LEARNER;
  }

  if (
    recoveredUser.is_institution_member &&
    !recoveredUser.primary_institution_id
  ) {
    if (
      recoveredUser.institution_ids &&
      recoveredUser.institution_ids.length > 0
    ) {
      recoveredUser.primary_institution_id = recoveredUser.institution_ids[0];
    }
  }

  if (!recoveredUser._protection) {
    recoveredUser._protection = {
      fields_protected: [
        "IsForWhichSystem",
        "bwenge_role",
        "institution_ids",
        "primary_institution_id",
        "institution_role",
        "institution",
      ],
      last_cross_system_sync: new Date().toISOString(),
      system_origin: SystemType.BWENGEPLUS,
      version: 2,
      checksum: calculateChecksum(recoveredUser),
    };
  } else {
    recoveredUser._protection.checksum = calculateChecksum(recoveredUser);
  }

  return recoveredUser;
};

// ==================== INITIAL STATE ====================
// NOTE: user is hydrated from cookies/localStorage so pages render correctly
// on first load without waiting for an async thunk.
const _initialToken = getInitialToken();
const _initialUser = getInitialAuthUser();

const initialState: BwengeAuthState = {
  token: _initialToken,
  user: _initialUser,
  isAuthenticated: !!_initialToken,
  isLoading: false,
  error: null,
  bwengeRole: getInitialBwengeRole(_initialUser),
  enrolledCourses: [],
  recentActivity: [],
  ssoInitialized: false,
  hasOngeraSession: false,
  requiresVerification: false,
  verificationEmail: null,
  applicationSubmitted: false,
  applicationEmail: null,
  errorCode: null,
  rejectionReason: null,

  // Derive institutionAdminData from the hydrated user
  institutionAdminData:
    _initialUser?.bwenge_role === BwengeRole.INSTITUTION_ADMIN &&
      _initialUser?.primary_institution_id
      ? {
        institutionId: _initialUser.primary_institution_id,
        institutionName: _initialUser.institution?.name,
        canCreateCourses: true,
        canManageMembers: true,
        canViewAnalytics: true,
      }
      : undefined,

  protection: {
    active: safeGetLocalStorage("bwenge_protection_active") === "true",
    fieldsProtected: [
      "IsForWhichSystem",
      "bwenge_role",
      "institution_ids",
      "primary_institution_id",
      "institution_role",
      "institution",
    ],
    lastSync: safeGetLocalStorage("last_protection_sync") || null,
    crossSystemCompatible: true,
    validationChecks: {
      institution: !!_initialUser?.institution,
      roles:
        !!_initialUser?.bwenge_role && !!_initialUser?.IsForWhichSystem,
      system: !!_initialUser?.IsForWhichSystem,
    },
  },
};

// ==================== ENHANCED ASYNC THUNKS ====================

export const loginBwenge = createAsyncThunk(
  "bwengeAuth/login",
  async (
    credentials: { email: string; password: string },
    { rejectWithValue }
  ) => {
    try {

      const response = await api.post("/auth/login", credentials);

      if (response.data.success) {

        const normalizedUser = normalizeBwengeUser(response.data.data.user);
        const validation = validateBwengeUser(normalizedUser);

        if (!validation.isValid) {

          const recoveredUser = recoverBwengeUser(normalizedUser);
          const recoveryValidation = validateBwengeUser(recoveredUser);

          if (recoveryValidation.isValid) {
            return {
              token: response.data.data.token,
              user: recoveredUser,
            };
          } else {
            throw new Error("User data validation and recovery failed");
          }
        }

        return {
          token: response.data.data.token,
          user: normalizedUser,
        };
      }

      return rejectWithValue(response.data.message);
    } catch (error: any) {

      if (error.response?.data?.requires_verification) {
        return rejectWithValue({
          message: error.response.data.message,
          requires_verification: true,
          email: error.response.data.email,
        });
      }

      if (error.response?.data?.code) {
        return rejectWithValue({
          message: error.response.data.message,
          code: error.response.data.code,
          rejection_reason: error.response.data.rejection_reason || null,
        });
      }

      return rejectWithValue(
        error.response?.data?.message || "Login failed"
      );
    }
  }
);

// ── Register + auto-join institution via invite token (for new invited users) ─
export const registerAndJoin = createAsyncThunk(
  "bwengeAuth/registerAndJoin",
  async (
    data: {
      first_name: string;
      last_name: string;
      email: string;
      password: string;
      confirm_password: string;
      motivation?: string;
      token: string;
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await api.post("/auth/register-and-join", data);
      if (response.data.success) {
        const normalizedUser = normalizeBwengeUser(response.data.data.user);
        return { token: response.data.data.token, user: normalizedUser };
      }
      return rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Registration failed"
      );
    }
  }
);

// ── Login + auto-join institution via invite token (for existing invited users) ─
export const loginAndJoin = createAsyncThunk(
  "bwengeAuth/loginAndJoin",
  async (
    data: { email: string; password: string; token: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await api.post("/auth/login-and-join", data);
      if (response.data.success) {
        const normalizedUser = normalizeBwengeUser(response.data.data.user);
        return { token: response.data.data.token, user: normalizedUser };
      }
      return rejectWithValue(response.data.message);
    } catch (error: any) {
      if (error.response?.data?.requires_verification) {
        return rejectWithValue({
          message: error.response.data.message,
          requires_verification: true,
          email: error.response.data.email,
        });
      }
      if (error.response?.data?.code) {
        return rejectWithValue({
          message: error.response.data.message,
          code: error.response.data.code,
        });
      }
      return rejectWithValue(
        error.response?.data?.message || "Login failed"
      );
    }
  }
);

export const loginWithGoogle = createAsyncThunk(
  "bwengeAuth/loginWithGoogle",
  async (googleToken: string, { rejectWithValue }) => {
    try {

      const response = await api.post("/auth/google", { token: googleToken });

      if (response.data.success) {
        const normalizedUser = normalizeBwengeUser(response.data.data.user);

        if (!normalizedUser.IsForWhichSystem) {
          normalizedUser.IsForWhichSystem = SystemType.BWENGEPLUS;
        }

        if (!normalizedUser.bwenge_role) {
          normalizedUser.bwenge_role = BwengeRole.LEARNER;
        }

        return {
          token: response.data.data.token,
          user: normalizedUser,
        };
      }

      return rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Google login failed"
      );
    }
  }
);

export const consumeSSOToken = createAsyncThunk(
  "bwengeAuth/consumeSSO",
  async (token: string, { rejectWithValue }) => {
    try {
      const crossSystemContext = safeGetLocalStorageJSON<any>(
        "cross_system_context",
        null
      );

      const response = await api.get(
        "/auth/sso/consume?token=" + encodeURIComponent(token)
      );

      if (response.data.success) {
        const normalizedUser = normalizeBwengeUser(response.data.data.user);

        if (crossSystemContext) {

          if (!normalizedUser.bwenge_role && crossSystemContext.bwenge_role) {
            normalizedUser.bwenge_role = crossSystemContext.bwenge_role;
          }

          if (
            !normalizedUser.primary_institution_id &&
            crossSystemContext.primary_institution_id
          ) {
            normalizedUser.primary_institution_id =
              crossSystemContext.primary_institution_id;
          }

          if (
            !normalizedUser.institution_role &&
            crossSystemContext.institution_role
          ) {
            normalizedUser.institution_role = crossSystemContext.institution_role;
          }

          if (
            !normalizedUser.institution_ids?.length &&
            crossSystemContext.institution_ids?.length
          ) {
            normalizedUser.institution_ids = crossSystemContext.institution_ids;
          }
        }

        normalizedUser._protection = {
          ...normalizedUser._protection!,
          last_cross_system_sync: new Date().toISOString(),
          fields_protected: [
            ...new Set([
              ...(normalizedUser._protection?.fields_protected || []),
              ...(crossSystemContext ? Object.keys(crossSystemContext) : []),
            ]),
          ],
        };

        return {
          token: response.data.data.token,
          user: normalizedUser,
        };
      }

      return rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "SSO authentication failed"
      );
    }
  }
);

export const logoutBwenge = createAsyncThunk(
  "bwengeAuth/logout",
  async (logoutAllSystems: boolean = false, { rejectWithValue }) => {
    try {

      const currentUser = Cookies.get("bwenge_user");
      if (currentUser) {
        try {
          const user = JSON.parse(currentUser);
          const crossSystemContext = {
            system: SystemType.BWENGEPLUS,
            bwenge_role: user.bwenge_role,
            institution_ids: user.institution_ids,
            primary_institution_id: user.primary_institution_id,
            institution_role: user.institution_role,
            last_sync: new Date().toISOString(),
            checksum: calculateChecksum(user),
          };

          safeSetLocalStorageJSON("cross_system_context", crossSystemContext);
        } catch (e) {
        }
      }

      await api.post(
        `/auth/logout?logout_all_systems=${logoutAllSystems}`
      );

      return { logoutAllSystems };
    } catch (error: any) {

      clearAuthData();

      return rejectWithValue(
        error.response?.data?.message || "Logout failed"
      );
    }
  }
);

export const checkOngeraSession = createAsyncThunk(
  "bwengeAuth/checkOngeraSession",
  async (_, { rejectWithValue }) => {
    try {

      const response = await api.get("/auth/check-ongera-session");

      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to check Ongera session"
      );
    }
  }
);

export const fetchBwengeProfile = createAsyncThunk(
  "bwengeAuth/fetchProfile",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/auth/profile");

      if (response.data.success) {
        const normalizedUser = normalizeBwengeUser(response.data.data);

        const validation = validateBwengeUser(normalizedUser);

        if (!validation.isValid) {

          const recoveredUser = recoverBwengeUser(normalizedUser);

          return recoveredUser;
        }

        return normalizedUser;
      }

      return rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch profile"
      );
    }
  }
);

export const updateBwengeProfile = createAsyncThunk(
  "bwengeAuth/updateProfile",
  async (profileData: Partial<BwengeUser>, { rejectWithValue }) => {
    try {

      const protectedFields = [
        "IsForWhichSystem",
        "bwenge_role",
        "institution_ids",
        "primary_institution_id",
        "institution_role",
      ];

      const safeUpdateData = { ...profileData };

      protectedFields.forEach((field) => {
        if (field in safeUpdateData) {
          delete (safeUpdateData as any)[field];
        }
      });

      const response = await api.put("/auth/profile", safeUpdateData);

      if (response.data.success) {
        const normalizedUser = normalizeBwengeUser(response.data.data);
        return normalizedUser;
      }

      return rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to update profile"
      );
    }
  }
);

export const fetchEnrolledCourses = createAsyncThunk(
  "bwengeAuth/fetchEnrolledCourses",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/courses/enrolled");

      if (response.data.success) {
        return response.data.data;
      }

      return rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch courses"
      );
    }
  }
);

export const fetchRecentActivity = createAsyncThunk(
  "bwengeAuth/fetchRecentActivity",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/activity/recent");

      if (response.data.success) {
        return response.data.data;
      }

      return rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch activity"
      );
    }
  }
);

export const syncCrossSystemData = createAsyncThunk(
  "bwengeAuth/syncCrossSystemData",
  async (
    data: { fromSystem: SystemType; data: any },
    { rejectWithValue }
  ) => {
    try {

      const requiredFields = ["system", "last_sync"];
      const missingFields = requiredFields.filter(
        (field) => !data.data[field]
      );

      if (missingFields.length > 0) {
        throw new Error(
          `Missing required sync fields: ${missingFields.join(", ")}`
        );
      }

      return data;
    } catch (error: any) {
      return rejectWithValue(
        error.message || "Failed to sync cross-system data"
      );
    }
  }
);

export const validateProtectionStatus = createAsyncThunk(
  "bwengeAuth/validateProtectionStatus",
  async (_, { rejectWithValue, getState }) => {
    try {

      const state = getState() as { bwengeAuth: BwengeAuthState };
      const reduxUser = state.bwengeAuth.user;

      if (reduxUser) {
        const validation = validateBwengeUser(reduxUser);

        const protectionValid =
          reduxUser._protection &&
          reduxUser._protection.system_origin === SystemType.BWENGEPLUS &&
          reduxUser._protection.version >= 2;

        let checksumValid = true;
        if (reduxUser._protection?.checksum) {
          const currentChecksum = calculateChecksum(reduxUser);
          checksumValid =
            reduxUser._protection.checksum === currentChecksum;
          if (!checksumValid) {
          }
        }

        const isValid =
          validation.isValid && protectionValid && checksumValid;

        return {
          isValid,
          validation,
          protectionValid,
          checksumValid,
          user: reduxUser,
          needsRecovery:
            !isValid && validation.missingFields.length > 0,
        };
      }

      const token = Cookies.get("bwenge_token");
      const userCookie = Cookies.get("bwenge_user");

      if (!token || !userCookie) {
        const crossSystemContext = safeGetLocalStorageJSON<any>(
          "cross_system_context",
          null
        );
        if (crossSystemContext) {
          return {
            isValid: false,
            validation: {
              isValid: false,
              missingFields: ["user_data"],
              warnings: ["No user data, using cross-system context"],
              recoveryActions: ["Initialize from cross-system context"],
            },
            protectionValid: false,
            checksumValid: false,
            user: recoverBwengeUser({
              bwenge_role: crossSystemContext.bwenge_role,
              primary_institution_id:
                crossSystemContext.primary_institution_id,
              institution_ids: crossSystemContext.institution_ids,
              institution_role: crossSystemContext.institution_role,
              IsForWhichSystem: crossSystemContext.system,
            } as Partial<BwengeUser>),
            needsRecovery: true,
          };
        }

        return {
          isValid: false,
          validation: {
            isValid: false,
            missingFields: [],
            warnings: ["No user data - not authenticated"],
            recoveryActions: [],
          },
          protectionValid: false,
          checksumValid: false,
          user: null,
          needsRecovery: false,
        };
      }

      let user: BwengeUser;
      try {
        user = JSON.parse(userCookie);
      } catch (e) {
        throw new Error("Failed to parse user data");
      }

      const validation = validateBwengeUser(user);

      const protectionValid =
        user._protection &&
        user._protection.system_origin === SystemType.BWENGEPLUS &&
        user._protection.version >= 2;

      let checksumValid = true;
      if (user._protection?.checksum) {
        const currentChecksum = calculateChecksum(user);
        checksumValid = user._protection.checksum === currentChecksum;
        if (!checksumValid) {
        }
      }

      const isValid = validation.isValid && protectionValid && checksumValid;

      return {
        isValid,
        validation,
        protectionValid,
        checksumValid,
        user,
        needsRecovery: !isValid && validation.missingFields.length > 0,
      };
    } catch (error: any) {
      return rejectWithValue(
        error.message || "Protection validation failed"
      );
    }
  }
);

// ==================== ENHANCED SLICE ====================
const bwengeAuthSlice = createSlice({
  name: "bwengeAuth",
  initialState,
  reducers: {
    clearAuth: (state) => {

      if (state.user) {
        const crossSystemContext = {
          system: SystemType.BWENGEPLUS,
          bwenge_role: state.user.bwenge_role,
          institution_ids: state.user.institution_ids,
          primary_institution_id: state.user.primary_institution_id,
          institution_role: state.user.institution_role,
          last_sync: new Date().toISOString(),
          checksum: calculateChecksum(state.user),
        };

        safeSetLocalStorageJSON("cross_system_context", crossSystemContext);
      }

      state.token = null;
      state.user = null;
      state.isAuthenticated = false;
      state.bwengeRole = null;
      state.enrolledCourses = [];
      state.recentActivity = [];
      state.ssoInitialized = false;
      state.hasOngeraSession = false;
      state.error = null;
      state.institutionAdminData = undefined;

      state.protection.active = true;
      state.protection.lastSync = new Date().toISOString();

      clearAuthData();
    },

    clearError: (state) => {
      state.error = null;
      state.errorCode = null;
      state.rejectionReason = null;
    },

    setProtectionStatus: (
      state,
      action: PayloadAction<{
        active: boolean;
        reason?: string;
        fields?: string[];
      }>
    ) => {
      state.protection.active = action.payload.active;

      if (action.payload.fields) {
        state.protection.fieldsProtected = [
          ...new Set([
            ...state.protection.fieldsProtected,
            ...action.payload.fields,
          ]),
        ];
      }

      state.protection.lastSync = new Date().toISOString();

    },

    updateValidationChecks: (
      state,
      action: PayloadAction<
        Partial<{
          institution: boolean;
          roles: boolean;
          system: boolean;
        }>
      >
    ) => {
      state.protection.validationChecks = {
        ...state.protection.validationChecks,
        ...action.payload,
      };
    },

    setSSOInitialized: (state, action: PayloadAction<boolean>) => {
      state.ssoInitialized = action.payload;
    },

    setOngeraSession: (state, action: PayloadAction<boolean>) => {
      state.hasOngeraSession = action.payload;
    },

    clearVerificationState: (state) => {
      state.requiresVerification = false;
      state.verificationEmail = null;
    },

    setInstitutionAdminData: (
      state,
      action: PayloadAction<BwengeAuthState["institutionAdminData"]>
    ) => {
      state.institutionAdminData = action.payload;
    },

    updateUserInstitutionData: (
      state,
      action: PayloadAction<
        Partial<{
          institution: InstitutionData;
          primary_institution_id: string;
          institution_role: InstitutionRole;
          is_institution_member: boolean;
          institution_ids: string[];
        }>
      >
    ) => {
      if (state.user) {
        const updates = action.payload;

        if (
          updates.institution &&
          (!state.user.institution || !state.user.institution.id)
        ) {
          state.user.institution = {
            ...updates.institution,
            _protected: updates.institution._protected || {
              system: SystemType.BWENGEPLUS,
              last_updated: new Date().toISOString(),
              immutable_fields: ["id", "name", "type", "slug", "created_at"],
              version: 1,
            },
          };
        }

        if (
          updates.primary_institution_id &&
          !state.user.primary_institution_id
        ) {
          state.user.primary_institution_id =
            updates.primary_institution_id;
        }

        if (updates.institution_role && !state.user.institution_role) {
          state.user.institution_role = updates.institution_role;
        }

        if (
          updates.is_institution_member !== undefined &&
          !state.user.is_institution_member
        ) {
          state.user.is_institution_member = updates.is_institution_member;
        }

        if (updates.institution_ids) {
          const currentIds = state.user.institution_ids || [];
          const newIds = updates.institution_ids;
          state.user.institution_ids = [
            ...new Set([...currentIds, ...newIds]),
          ];
        }

        if (state.user._protection) {
          state.user._protection.last_cross_system_sync =
            new Date().toISOString();
          state.user._protection.checksum = calculateChecksum(state.user);
        }

        Cookies.set("bwenge_user", JSON.stringify(state.user), {
          expires: 7,
        });
      }
    },

    manualSyncCrossSystemData: (state, action: PayloadAction<any>) => {
      if (state.user) {
        const crossSystemData = action.payload;

        const fieldsToSync = [
          "bwenge_role",
          "institution_ids",
          "primary_institution_id",
          "institution_role",
        ];

        fieldsToSync.forEach((field) => {
          if (
            crossSystemData[field] !== undefined &&
            !(state.user as any)[field]
          ) {
            (state.user as any)[field] = crossSystemData[field];
          }
        });

        if (state.user._protection) {
          state.user._protection.last_cross_system_sync =
            new Date().toISOString();
          state.user._protection.fields_protected = [
            ...new Set([
              ...state.user._protection.fields_protected,
              ...fieldsToSync,
            ]),
          ];
        }

        state.protection.lastSync = new Date().toISOString();
      }
    },

    setInstitutionData: (state, action: PayloadAction<any>) => {
      if (state.user) {
        if (action.payload) {
          state.user.institution = {
            ...action.payload,
            _protected: action.payload._protected || {
              system: SystemType.BWENGEPLUS,
              last_updated: new Date().toISOString(),
              immutable_fields: ["id", "name", "type", "slug", "created_at"],
              version: 1,
            },
          };

          if (state.user._protection) {
            state.user._protection.last_cross_system_sync =
              new Date().toISOString();
          }

          Cookies.set("bwenge_user", JSON.stringify(state.user), {
            expires: 7,
          });
        }
      }
    },

    resetProtection: (state) => {

      state.protection = {
        active: true,
        fieldsProtected: [
          "IsForWhichSystem",
          "bwenge_role",
          "institution_ids",
          "primary_institution_id",
          "institution_role",
          "institution",
        ],
        lastSync: new Date().toISOString(),
        crossSystemCompatible: true,
        validationChecks: {
          institution: false,
          roles: false,
          system: false,
        },
      };

      if (state.user) {
        state.user._protection = {
          fields_protected: state.protection.fieldsProtected,
          last_cross_system_sync: new Date().toISOString(),
          system_origin: SystemType.BWENGEPLUS,
          version: 2,
          checksum: calculateChecksum(state.user),
        };

        Cookies.set("bwenge_user", JSON.stringify(state.user), {
          expires: 7,
        });
      }

      safeSetLocalStorage("bwenge_protection_active", "true");
      safeSetLocalStorage(
        "last_protection_sync",
        new Date().toISOString()
      );
    },
  },
  extraReducers: (builder) => {
    builder
      // ==================== LOGIN BWENGE ====================
      .addCase(loginBwenge.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        state.protection.active = true;
      })
      .addCase(loginBwenge.fulfilled, (state, action) => {
        state.isLoading = false;
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.bwengeRole = action.payload.user.bwenge_role;
        state.isAuthenticated = true;
        state.requiresVerification = false;

        storeAuthData(action.payload.user, action.payload.token);

        state.protection.active = true;
        state.protection.lastSync = new Date().toISOString();

        const validation = validateBwengeUser(action.payload.user);
        state.protection.validationChecks = {
          institution: !!action.payload.user.institution,
          roles:
            !!action.payload.user.bwenge_role &&
            !!action.payload.user.IsForWhichSystem,
          system: !!action.payload.user.IsForWhichSystem,
        };

        if (
          action.payload.user.bwenge_role ===
          BwengeRole.INSTITUTION_ADMIN &&
          action.payload.user.primary_institution_id
        ) {
          state.institutionAdminData = {
            institutionId: action.payload.user.primary_institution_id,
            institutionName: action.payload.user.institution?.name,
            canCreateCourses: true,
            canManageMembers: true,
            canViewAnalytics: true,
          };
        }

      })
      .addCase(loginBwenge.rejected, (state, action: any) => {
        state.isLoading = false;

        const payload = action.payload;
        if (typeof payload === "object" && payload.requires_verification) {
          state.error = payload.message;
          state.requiresVerification = true;
          state.verificationEmail = payload.email;
        } else if (typeof payload === "object" && payload.code) {
          state.error = payload.message;
          state.errorCode = payload.code;
          state.rejectionReason = payload.rejection_reason || null;
        } else {
          state.error = payload as string;
          state.errorCode = null;
        }

        state.protection.active = true;
      })

      // ==================== LOGIN WITH GOOGLE ====================
      .addCase(loginWithGoogle.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginWithGoogle.fulfilled, (state, action) => {
        state.isLoading = false;
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.bwengeRole = action.payload.user.bwenge_role;
        state.isAuthenticated = true;
        state.requiresVerification = false;

        storeAuthData(action.payload.user, action.payload.token);

        if (
          action.payload.user.bwenge_role ===
          BwengeRole.INSTITUTION_ADMIN &&
          action.payload.user.primary_institution_id
        ) {
          state.institutionAdminData = {
            institutionId: action.payload.user.primary_institution_id,
            institutionName: action.payload.user.institution?.name,
            canCreateCourses: true,
            canManageMembers: true,
            canViewAnalytics: true,
          };
        }
      })
      .addCase(loginWithGoogle.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // ==================== SSO CONSUME ====================
      .addCase(consumeSSOToken.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(consumeSSOToken.fulfilled, (state, action) => {
        state.isLoading = false;
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.bwengeRole = action.payload.user.bwenge_role;
        state.isAuthenticated = true;
        state.ssoInitialized = true;
        state.hasOngeraSession = true;

        storeAuthData(action.payload.user, action.payload.token);

        if (
          action.payload.user.bwenge_role ===
          BwengeRole.INSTITUTION_ADMIN &&
          action.payload.user.primary_institution_id
        ) {
          state.institutionAdminData = {
            institutionId: action.payload.user.primary_institution_id,
            institutionName: action.payload.user.institution?.name,
            canCreateCourses: true,
            canManageMembers: true,
            canViewAnalytics: true,
          };
        }

      })
      .addCase(consumeSSOToken.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.ssoInitialized = false;
      })

      // ==================== LOGOUT ====================
      .addCase(logoutBwenge.fulfilled, (state) => {

        state.token = null;
        state.user = null;
        state.isAuthenticated = false;
        state.bwengeRole = null;
        state.enrolledCourses = [];
        state.recentActivity = [];
        state.ssoInitialized = false;
        state.hasOngeraSession = false;
        state.institutionAdminData = undefined;

        state.protection.active = true;
        state.protection.lastSync = new Date().toISOString();

        clearAuthData();
      })

      // ==================== CHECK ONGERA SESSION ====================
      .addCase(checkOngeraSession.fulfilled, (state, action) => {
        state.hasOngeraSession = action.payload.has_ongera_session;
      })
      .addCase(checkOngeraSession.rejected, (state) => {
        state.hasOngeraSession = false;
      })

      // ==================== FETCH PROFILE ====================
      .addCase(fetchBwengeProfile.fulfilled, (state, action) => {
        state.user = action.payload;
        if (state.user) {
          Cookies.set("bwenge_user", JSON.stringify(state.user), {
            expires: 7,
          });

          state.protection.validationChecks = {
            institution: !!state.user.institution,
            roles:
              !!state.user.bwenge_role && !!state.user.IsForWhichSystem,
            system: !!state.user.IsForWhichSystem,
          };
        }
      })

      // ==================== UPDATE PROFILE ====================
      .addCase(updateBwengeProfile.fulfilled, (state, action) => {
        state.user = action.payload;
        if (state.user) {
          Cookies.set("bwenge_user", JSON.stringify(state.user), {
            expires: 7,
          });
        }
      })

      // ==================== FETCH ENROLLED COURSES ====================
      .addCase(fetchEnrolledCourses.fulfilled, (state, action) => {
        state.enrolledCourses = action.payload;
      })

      // ==================== FETCH RECENT ACTIVITY ====================
      .addCase(fetchRecentActivity.fulfilled, (state, action) => {
        state.recentActivity = action.payload;
      })

      // ==================== SYNC CROSS-SYSTEM DATA ====================
      .addCase(syncCrossSystemData.fulfilled, (state, action) => {
        if (state.user) {
          const { fromSystem, data } = action.payload;

          if (!state.user.bwenge_role && data.bwenge_role) {
            state.user.bwenge_role = data.bwenge_role;
          }

          if (
            !state.user.primary_institution_id &&
            data.primary_institution_id
          ) {
            state.user.primary_institution_id =
              data.primary_institution_id;
          }

          if (!state.user.institution_role && data.institution_role) {
            state.user.institution_role = data.institution_role;
          }

          if (
            !state.user.institution_ids?.length &&
            data.institution_ids?.length
          ) {
            state.user.institution_ids = data.institution_ids;
          }

          if (!state.user.IsForWhichSystem && data.system) {
            state.user.IsForWhichSystem = data.system;
          }

          if (state.user._protection) {
            state.user._protection.last_cross_system_sync =
              new Date().toISOString();
            state.user._protection.fields_protected = [
              ...new Set([
                ...state.user._protection.fields_protected,
                ...Object.keys(data),
              ]),
            ];
            state.user._protection.checksum = calculateChecksum(state.user);
          }

          state.protection.lastSync = new Date().toISOString();

          Cookies.set("bwenge_user", JSON.stringify(state.user), {
            expires: 7,
          });

        }
      })

      // ==================== VALIDATE PROTECTION STATUS ====================
      .addCase(validateProtectionStatus.fulfilled, (state, action) => {
        const {
          isValid,
          validation,
          protectionValid,
          checksumValid,
          user,
          needsRecovery,
        } = action.payload;

        if (needsRecovery && user) {

          const recoveredUser = recoverBwengeUser(user);
          state.user = recoveredUser;

          if (recoveredUser.bwenge_role) {
            state.bwengeRole = recoveredUser.bwenge_role;
          }

          Cookies.set("bwenge_user", JSON.stringify(recoveredUser), {
            expires: 7,
          });

          state.protection.validationChecks = {
            institution: !!recoveredUser.institution,
            roles:
              !!recoveredUser.bwenge_role &&
              !!recoveredUser.IsForWhichSystem,
            system: !!recoveredUser.IsForWhichSystem,
          };
        } else if (user && !needsRecovery) {
          state.protection.validationChecks = {
            institution: !!user.institution,
            roles:
              !!user.bwenge_role && !!user.IsForWhichSystem,
            system: !!user.IsForWhichSystem,
          };
        }

        state.protection.active = !!(
          isValid &&
          protectionValid &&
          checksumValid
        );
        state.protection.lastSync = new Date().toISOString();

      })
      .addCase(validateProtectionStatus.rejected, (state, action) => {
      })
      .addCase(registerBwenge.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(registerBwenge.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload.application_submitted) {
          state.applicationSubmitted = true;
          state.applicationEmail = action.payload.email;
        } else if (action.payload.requires_verification) {
          state.requiresVerification = true;
          state.verificationEmail = action.payload.email;
        }
      })
      .addCase(registerBwenge.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // ── Register & Join (invited new user) ───────────────────────────────────
      .addCase(registerAndJoin.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(registerAndJoin.fulfilled, (state, action) => {
        state.isLoading = false;
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.bwengeRole = action.payload.user.bwenge_role;
        state.isAuthenticated = true;
        state.requiresVerification = false;
        storeAuthData(action.payload.user, action.payload.token);
        state.protection.active = true;
      })
      .addCase(registerAndJoin.rejected, (state, action) => {
        state.isLoading = false;
        const payload = action.payload as any;
        state.error = typeof payload === "string" ? payload : payload?.message || "Registration failed";
      })

      // ── Login & Join (invited existing user) ─────────────────────────────────
      .addCase(loginAndJoin.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginAndJoin.fulfilled, (state, action) => {
        state.isLoading = false;
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.bwengeRole = action.payload.user.bwenge_role;
        state.isAuthenticated = true;
        state.requiresVerification = false;
        storeAuthData(action.payload.user, action.payload.token);
        state.protection.active = true;
      })
      .addCase(loginAndJoin.rejected, (state, action) => {
        state.isLoading = false;
        const payload = action.payload as any;
        if (typeof payload === "object" && payload?.requires_verification) {
          state.requiresVerification = true;
          state.verificationEmail = payload.email;
          state.error = payload.message;
        } else {
          state.error = typeof payload === "string" ? payload : payload?.message || "Login failed";
        }
      })

      // ── Request password change ───────────────────────────────────────────────
      .addCase(requestPasswordChange.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(requestPasswordChange.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(requestPasswordChange.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      .addCase(changePasswordWithOTP.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(changePasswordWithOTP.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(changePasswordWithOTP.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

  },
});

// ==================== ENHANCED EXPORTS ====================
export const {
  clearAuth,
  clearError,
  setProtectionStatus,
  updateValidationChecks,
  setSSOInitialized,
  setInstitutionData,
  setOngeraSession,
  clearVerificationState,
  setInstitutionAdminData,
  updateUserInstitutionData,
  manualSyncCrossSystemData,
  resetProtection,
} = bwengeAuthSlice.actions;

export default bwengeAuthSlice.reducer;

// ==================== ENHANCED HELPER FUNCTIONS ====================
export const isInstitutionAdmin = (user: BwengeUser | null): boolean => {
  return user?.bwenge_role === BwengeRole.INSTITUTION_ADMIN;
};

export const getPrimaryInstitutionId = (
  user: BwengeUser | null
): string | undefined => {
  return user?.primary_institution_id;
};

export const hasInstitutionAccess = (user: BwengeUser | null): boolean => {
  return !!(user?.is_institution_member || user?.institution);
};

export const getUserInstitutionRole = (
  user: BwengeUser | null
): InstitutionRole | undefined => {
  return user?.institution_role;
};

export const parseISODate = (
  isoString: string | null | undefined
): Date | null => {
  if (!isoString) return null;
  try {
    return new Date(isoString);
  } catch {
    return null;
  }
};

export const initializeProtectedAuth = (): {
  token: string | null;
  user: BwengeUser | null;
  protectionActive: boolean;
  needsRecovery: boolean;
} => {
  const token = Cookies.get("bwenge_token");
  const userCookie = Cookies.get("bwenge_user");

  if (token && userCookie) {
    try {
      const user = JSON.parse(userCookie) as BwengeUser;
      const validation = validateBwengeUser(user);

      if (!validation.isValid) {

        const recoveredUser = recoverBwengeUser(user);
        const recoveryValidation = validateBwengeUser(recoveredUser);

        if (recoveryValidation.isValid) {
          Cookies.set("bwenge_user", JSON.stringify(recoveredUser), {
            expires: 7,
          });
          return {
            token,
            user: recoveredUser,
            protectionActive: true,
            needsRecovery: true,
          };
        } else {
          return {
            token: null,
            user: null,
            protectionActive: false,
            needsRecovery: false,
          };
        }
      }

      return {
        token,
        user,
        protectionActive: true,
        needsRecovery: false,
      };
    } catch (error) {
      clearAuthData();
      return {
        token: null,
        user: null,
        protectionActive: false,
        needsRecovery: false,
      };
    }
  }

  return {
    token: null,
    user: null,
    protectionActive: false,
    needsRecovery: false,
  };
};

export const checkCrossSystemCompatibility = (
  user: BwengeUser
): {
  compatible: boolean;
  issues: string[];
  recommendations: string[];
} => {
  const issues: string[] = [];
  const recommendations: string[] = [];

  if (!user.IsForWhichSystem) {
    issues.push("Missing system identification");
    recommendations.push("Set IsForWhichSystem to appropriate value");
  }

  if (
    user.bwenge_role === BwengeRole.INSTITUTION_ADMIN &&
    !user.primary_institution_id
  ) {
    issues.push("Institution admin without primary institution");
    recommendations.push("Assign primary institution or review role");
  }

  if (!user._protection) {
    issues.push("Missing protection metadata");
    recommendations.push("Initialize protection system");
  } else if (user._protection.version < 2) {
    issues.push("Outdated protection version");
    recommendations.push("Update protection metadata");
  }

  return {
    compatible: issues.length === 0,
    issues,
    recommendations,
  };
};

export const getCrossSystemContext = () => {
  return safeGetLocalStorageJSON("cross_system_context", null);
};