import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "@/lib/api";

// ==================== TYPES ====================
export interface NotificationItem {
  id: string;
  recipient_user_id: string;
  recipient_role: string;
  notification_type: string;
  title: string;
  body: string;
  entity_type: string;
  entity_id: string | null;
  is_read: boolean;
  read_at: string | null;
  actor_user_id: string | null;
  institution_id: string | null;
  created_at: string;
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

interface NotificationState {
  items: NotificationItem[];
  unreadCount: number;
  isLoading: boolean;
  hasMore: boolean;
  pagination: PaginationMeta | null;
  error: string | null;
}

const initialState: NotificationState = {
  items: [],
  unreadCount: 0,
  isLoading: false,
  hasMore: true,
  pagination: null,
  error: null,
};

// ==================== ASYNC THUNKS ====================

export const fetchNotifications = createAsyncThunk(
  "notifications/fetchNotifications",
  async (
    params: { page?: number; limit?: number; is_read?: boolean } = {},
    { rejectWithValue }
  ) => {
    try {
      const queryParams = new URLSearchParams();
      if (params.page) queryParams.set("page", String(params.page));
      if (params.limit) queryParams.set("limit", String(params.limit));
      if (params.is_read !== undefined)
        queryParams.set("is_read", String(params.is_read));

      const response = await api.get(
        `/notifications?${queryParams.toString()}`
      );
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch notifications"
      );
    }
  }
);

export const fetchUnreadCount = createAsyncThunk(
  "notifications/fetchUnreadCount",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/notifications/unread-count");
      return response.data.data.unreadCount;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch unread count"
      );
    }
  }
);

export const markNotificationAsRead = createAsyncThunk(
  "notifications/markAsRead",
  async (notificationId: string, { rejectWithValue }) => {
    try {
      const response = await api.patch(
        `/notifications/${notificationId}/read`
      );
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to mark notification as read"
      );
    }
  }
);

export const markAllNotificationsAsRead = createAsyncThunk(
  "notifications/markAllAsRead",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.patch("/notifications/read-all");
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to mark all as read"
      );
    }
  }
);

// ==================== SLICE ====================

const notificationSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {
    clearNotifications: (state) => {
      state.items = [];
      state.unreadCount = 0;
      state.pagination = null;
      state.hasMore = true;
    },
  },
  extraReducers: (builder) => {
    // Fetch notifications
    builder
      .addCase(fetchNotifications.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.isLoading = false;
        const { items, unreadCount, pagination } = action.payload;
        if (pagination.page === 1) {
          state.items = items;
        } else {
          // Append for infinite scroll, dedup by id
          const existingIds = new Set(state.items.map((n: NotificationItem) => n.id));
          const newItems = items.filter((n: NotificationItem) => !existingIds.has(n.id));
          state.items = [...state.items, ...newItems];
        }
        state.unreadCount = unreadCount;
        state.pagination = pagination;
        state.hasMore = pagination.hasMore;
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch unread count
    builder.addCase(fetchUnreadCount.fulfilled, (state, action) => {
      state.unreadCount = action.payload;
    });

    // Mark single as read
    builder.addCase(markNotificationAsRead.fulfilled, (state, action) => {
      const updated = action.payload;
      const index = state.items.findIndex((n) => n.id === updated.id);
      if (index >= 0) {
        state.items[index] = updated;
      }
      if (state.unreadCount > 0) state.unreadCount -= 1;
    });

    // Mark all as read
    builder.addCase(markAllNotificationsAsRead.fulfilled, (state) => {
      state.items = state.items.map((n) => ({
        ...n,
        is_read: true,
        read_at: new Date().toISOString(),
      }));
      state.unreadCount = 0;
    });
  },
});

export const { clearNotifications } = notificationSlice.actions;
export default notificationSlice.reducer;
