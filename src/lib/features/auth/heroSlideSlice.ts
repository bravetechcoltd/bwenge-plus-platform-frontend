import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "@/lib/api";

/**
 * ============================================================================
 * Hero slides (HS-001)
 * ============================================================================
 *
 * The homepage's rotating banner. It was five objects in src/app/page.tsx, so
 * changing a headline on the front page meant a code change and a deploy.
 *
 * ── On the multipart calls ────────────────────────────────────────────────
 *
 * Create and update take a FormData rather than a plain object, because a
 * slide can carry an image and an image cannot travel as JSON. The Content-Type
 * is left unset on purpose: the browser has to add the multipart boundary
 * itself, and naming the type by hand omits it, which makes the server see an
 * empty body.
 */

export interface HeroSlide {
  id: string;
  title: string;
  eyebrow: string;
  headline: string;
  description: string;
  cta_text: string;
  cta_href: string;
  icon_name: string;
  image_url: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface HeroSlideState {
  slides: HeroSlide[];
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
}

const initialState: HeroSlideState = {
  slides: [],
  isLoading: false,
  isSubmitting: false,
  error: null,
};

/** The server's own sentence, when it sent one. */
function messageOf(error: any, fallback: string): string {
  return error?.response?.data?.message || error?.message || fallback;
}

/** Every slide, active or not. The admin screen's list. */
export const fetchAllHeroSlides = createAsyncThunk(
  "heroSlides/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/hero-slides/admin");
      if (response.data?.success) return response.data.data as HeroSlide[];
      return rejectWithValue(response.data?.message || "Failed to load hero slides");
    } catch (error: any) {
      return rejectWithValue(messageOf(error, "Failed to load hero slides"));
    }
  }
);

/** The active slides, for the homepage. Unauthenticated. */
export const fetchPublicHeroSlides = createAsyncThunk(
  "heroSlides/fetchPublic",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/hero-slides");
      if (response.data?.success) return response.data.data as HeroSlide[];
      return rejectWithValue(response.data?.message || "Failed to load hero slides");
    } catch (error: any) {
      return rejectWithValue(messageOf(error, "Failed to load hero slides"));
    }
  }
);

export const createHeroSlide = createAsyncThunk(
  "heroSlides/create",
  async (formData: FormData, { rejectWithValue }) => {
    try {
      const response = await api.post("/hero-slides/admin", formData);
      if (response.data?.success) return response.data.data as HeroSlide;
      return rejectWithValue(response.data?.message || "Failed to create the slide");
    } catch (error: any) {
      return rejectWithValue(messageOf(error, "Failed to create the slide"));
    }
  }
);

export const updateHeroSlide = createAsyncThunk(
  "heroSlides/update",
  async (
    { id, formData }: { id: string; formData: FormData },
    { rejectWithValue }
  ) => {
    try {
      const response = await api.put(`/hero-slides/admin/${id}`, formData);
      if (response.data?.success) return response.data.data as HeroSlide;
      return rejectWithValue(response.data?.message || "Failed to update the slide");
    } catch (error: any) {
      return rejectWithValue(messageOf(error, "Failed to update the slide"));
    }
  }
);

export const deleteHeroSlide = createAsyncThunk(
  "heroSlides/delete",
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await api.delete(`/hero-slides/admin/${id}`);
      if (response.data?.success) return id;
      return rejectWithValue(response.data?.message || "Failed to delete the slide");
    } catch (error: any) {
      return rejectWithValue(messageOf(error, "Failed to delete the slide"));
    }
  }
);

export const toggleHeroSlideStatus = createAsyncThunk(
  "heroSlides/toggle",
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/hero-slides/admin/${id}/toggle`);
      if (response.data?.success) return response.data.data as HeroSlide;
      return rejectWithValue(response.data?.message || "Failed to change the slide");
    } catch (error: any) {
      return rejectWithValue(messageOf(error, "Failed to change the slide"));
    }
  }
);

const heroSlideSlice = createSlice({
  name: "heroSlides",
  initialState,
  reducers: {
    clearHeroError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      /* ── reads ─────────────────────────────────────────────────────── */
      .addCase(fetchAllHeroSlides.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAllHeroSlides.fulfilled, (state, action) => {
        state.isLoading = false;
        state.slides = action.payload;
      })
      .addCase(fetchAllHeroSlides.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      .addCase(fetchPublicHeroSlides.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchPublicHeroSlides.fulfilled, (state, action) => {
        state.isLoading = false;
        state.slides = action.payload;
      })
      .addCase(fetchPublicHeroSlides.rejected, (state, action) => {
        state.isLoading = false;
        /*
         * Not surfaced as an error: the homepage falls back to its built-in
         * slides, and a visitor has nothing to do about a banner that failed
         * to load.
         */
        state.error = null;
      })

      /* ── writes ────────────────────────────────────────────────────── */
      .addCase(createHeroSlide.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(createHeroSlide.fulfilled, (state, action) => {
        state.isSubmitting = false;
        state.slides.push(action.payload);
      })
      .addCase(createHeroSlide.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = action.payload as string;
      })

      .addCase(updateHeroSlide.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(updateHeroSlide.fulfilled, (state, action) => {
        state.isSubmitting = false;
        const index = state.slides.findIndex((s) => s.id === action.payload.id);
        if (index !== -1) state.slides[index] = action.payload;
      })
      .addCase(updateHeroSlide.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = action.payload as string;
      })

      .addCase(deleteHeroSlide.fulfilled, (state, action) => {
        state.slides = state.slides.filter((s) => s.id !== action.payload);
      })
      .addCase(deleteHeroSlide.rejected, (state, action) => {
        state.error = action.payload as string;
      })

      .addCase(toggleHeroSlideStatus.fulfilled, (state, action) => {
        const index = state.slides.findIndex((s) => s.id === action.payload.id);
        if (index !== -1) state.slides[index] = action.payload;
      })
      .addCase(toggleHeroSlideStatus.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const { clearHeroError } = heroSlideSlice.actions;
export default heroSlideSlice.reducer;
