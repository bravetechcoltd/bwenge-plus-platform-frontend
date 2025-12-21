import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "@/lib/api";
import Cookies from "js-cookie";

interface BwengeUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  username?: string;
  profile_picture_url?: string;
  bio?: string;
  account_type: string;
  bwenge_role: "LEARNER" | "INSTRUCTOR" | "CONTENT_CREATOR" | "ADMIN";
  enrolled_courses_count: number;
  completed_courses_count: number;
  total_learning_hours: number;
  achievements?: string[];
  learning_preferences?: any;
  profile?: any;
}

interface BwengeAuthState {
  token: string | null;
  user: BwengeUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  ssoInitialized: boolean;
}

const parseCookieJSON = (cookieValue: string | undefined): any => {
  if (!cookieValue) return null;
  try {
    return JSON.parse(cookieValue);
  } catch (error) {
    console.error("Failed to parse cookie JSON:", error);
    return null;
  }
};

const initialState: BwengeAuthState = {
  token: Cookies.get("bwenge_token") || null,
  user: parseCookieJSON(Cookies.get("bwenge_user")),
  isAuthenticated: !!Cookies.get("bwenge_token"),
  isLoading: false,
  error: null,
  ssoInitialized: false,
};

// ==================== LOGIN WITH EMAIL/PASSWORD ====================
export const loginBwenge = createAsyncThunk(
  "bwengeAuth/login",
  async (credentials: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await api.post("/auth/login", credentials);

      if (response.data.success) {
        return response.data.data;
      }
      return rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Login failed"
      );
    }
  }
);

// ==================== CONSUME SSO TOKEN FROM ONGERA ====================
export const consumeSSOToken = createAsyncThunk(
  "bwengeAuth/consumeSSOToken",
  async (ssoToken: string, { rejectWithValue }) => {
    try {
      console.log("🔓 [Frontend] Consuming SSO token...");
      
      const response = await api.post("/auth/sso/consume", {
        sso_token: ssoToken,
      });

      console.log("✅ [Frontend] SSO token consumed:", response.data);

      if (response.data.success) {
        return response.data.data;
      }
      return rejectWithValue(response.data.message);
    } catch (error: any) {
      console.error("❌ [Frontend] SSO consumption failed:", error);
      return rejectWithValue(
        error.response?.data?.message || "SSO authentication failed"
      );
    }
  }
);

// ==================== GET PROFILE ====================
export const fetchBwengeProfile = createAsyncThunk(
  "bwengeAuth/fetchProfile",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/auth/profile");

      if (response.data.success) {
        return response.data.data;
      }
      return rejectWithValue(response.data.message);
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch profile"
      );
    }
  }
);

// ==================== LOGOUT ====================
export const logoutBwenge = createAsyncThunk(
  "bwengeAuth/logout",
  async (crossSystem: boolean = false, { rejectWithValue }) => {
    try {
      await api.post(`/auth/logout?cross_system=${crossSystem}`);
      return { crossSystem };
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Logout failed"
      );
    }
  }
);

const bwengeAuthSlice = createSlice({
  name: "bwengeAuth",
  initialState,
  reducers: {
    clearBwengeError: (state) => {
      state.error = null;
    },
    setSSOInitialized: (state, action) => {
      state.ssoInitialized = action.payload;
    },
    clearBwengeAuth: (state) => {
      state.token = null;
      state.user = null;
      state.isAuthenticated = false;
      state.error = null;
      state.ssoInitialized = false;
      Cookies.remove("bwenge_token");
      Cookies.remove("bwenge_user");
    },
  },
  extraReducers: (builder) => {
    builder
      // ==================== LOGIN ====================
      .addCase(loginBwenge.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginBwenge.fulfilled, (state, action) => {
        state.isLoading = false;
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.isAuthenticated = true;
        
        Cookies.set("bwenge_token", action.payload.token, { expires: 7 });
        Cookies.set("bwenge_user", JSON.stringify(action.payload.user), { expires: 7 });
      })
      .addCase(loginBwenge.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // ==================== SSO TOKEN CONSUMPTION ====================
      .addCase(consumeSSOToken.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(consumeSSOToken.fulfilled, (state, action) => {
        console.log("✅ [Redux] SSO token consumed successfully");
        
        state.isLoading = false;
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.isAuthenticated = true;
        state.ssoInitialized = true;
        
        Cookies.set("bwenge_token", action.payload.token, { expires: 7 });
        Cookies.set("bwenge_user", JSON.stringify(action.payload.user), { expires: 7 });
      })
      .addCase(consumeSSOToken.rejected, (state, action) => {
        console.error("❌ [Redux] SSO consumption failed:", action.payload);
        
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // ==================== FETCH PROFILE ====================
      .addCase(fetchBwengeProfile.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchBwengeProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        Cookies.set("bwenge_user", JSON.stringify(action.payload), { expires: 7 });
      })
      .addCase(fetchBwengeProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // ==================== LOGOUT ====================
      .addCase(logoutBwenge.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(logoutBwenge.fulfilled, (state) => {
        state.isLoading = false;
        state.token = null;
        state.user = null;
        state.isAuthenticated = false;
        state.ssoInitialized = false;
        
        Cookies.remove("bwenge_token");
        Cookies.remove("bwenge_user");
      })
      .addCase(logoutBwenge.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearBwengeError, setSSOInitialized, clearBwengeAuth } = bwengeAuthSlice.actions;
export default bwengeAuthSlice.reducer;