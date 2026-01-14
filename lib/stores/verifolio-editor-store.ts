import { create } from 'zustand';
import type { VerifolioProfile, VerifolioActivity, VerifolioPublicReview } from '@/lib/verifolio/types';
import type { VerifolioThemeColor } from '@/lib/verifolio/themes';

// ============================================================================
// Types
// ============================================================================

interface VerifolioEditorState {
  // Data
  profile: VerifolioProfile | null;
  activities: VerifolioActivity[];
  reviews: VerifolioPublicReview[];

  // UI State
  loading: boolean;
  saving: boolean;
  showSettings: boolean;
  showDesign: boolean;

  // Creation
  creating: boolean;
  createName: string;

  // Actions - Data
  setProfile: (profile: VerifolioProfile | null) => void;
  setActivities: (activities: VerifolioActivity[]) => void;
  setReviews: (reviews: VerifolioPublicReview[]) => void;
  updateProfile: (updates: Partial<VerifolioProfile>) => void;

  // Actions - UI
  setLoading: (loading: boolean) => void;
  setSaving: (saving: boolean) => void;
  setShowSettings: (show: boolean) => void;
  setShowDesign: (show: boolean) => void;
  setCreating: (creating: boolean) => void;
  setCreateName: (name: string) => void;

  // Actions - API
  loadData: () => Promise<void>;
  createProfile: (name: string) => Promise<boolean>;
  togglePublish: () => Promise<void>;
  updateTheme: (color: VerifolioThemeColor) => Promise<void>;
  updateShowLogo: (show: boolean) => Promise<void>;

  // Reset
  reset: () => void;
}

const initialState = {
  profile: null,
  activities: [],
  reviews: [],
  loading: true,
  saving: false,
  showSettings: false,
  showDesign: false,
  creating: false,
  createName: '',
};

// ============================================================================
// Store
// ============================================================================

export const useVerifolioEditorStore = create<VerifolioEditorState>((set, get) => ({
  ...initialState,

  // Actions - Data
  setProfile: (profile) => set({ profile }),
  setActivities: (activities) => set({ activities }),
  setReviews: (reviews) => set({ reviews }),
  updateProfile: (updates) => set((state) => ({
    profile: state.profile ? { ...state.profile, ...updates } : null,
  })),

  // Actions - UI
  setLoading: (loading) => set({ loading }),
  setSaving: (saving) => set({ saving }),
  setShowSettings: (show) => set({ showSettings: show }),
  setShowDesign: (show) => set({ showDesign: show }),
  setCreating: (creating) => set({ creating }),
  setCreateName: (name) => set({ createName: name }),

  // Actions - API
  loadData: async () => {
    set({ loading: true });
    try {
      const res = await fetch('/api/verifolio');
      const data = await res.json();

      if (data.profile) {
        // Load activities and reviews in parallel
        const [activitiesRes, reviewsRes] = await Promise.all([
          fetch('/api/verifolio/activities'),
          fetch('/api/verifolio/reviews'),
        ]);

        const [activitiesData, reviewsData] = await Promise.all([
          activitiesRes.json(),
          reviewsRes.json(),
        ]);

        set({
          profile: data.profile,
          activities: activitiesData.activities || [],
          reviews: reviewsData.reviews || [],
        });
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      set({ loading: false });
    }
  },

  createProfile: async (name) => {
    if (!name.trim()) return false;

    set({ creating: true });
    try {
      const res = await fetch('/api/verifolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: name }),
      });

      if (res.ok) {
        await get().loadData();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error creating profile:', error);
      return false;
    } finally {
      set({ creating: false });
    }
  },

  togglePublish: async () => {
    const { profile } = get();
    if (!profile) return;

    set({ saving: true });
    try {
      await fetch('/api/verifolio', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_published: !profile.is_published }),
      });
      await get().loadData();
    } finally {
      set({ saving: false });
    }
  },

  updateTheme: async (color) => {
    const { profile } = get();
    if (!profile) return;

    // Optimistic update
    set((state) => ({
      profile: state.profile ? { ...state.profile, theme_color: color } : null,
    }));

    await fetch('/api/verifolio', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme_color: color }),
    });
  },

  updateShowLogo: async (show) => {
    const { profile } = get();
    if (!profile) return;

    // Optimistic update
    set((state) => ({
      profile: state.profile ? { ...state.profile, show_company_logo: show } : null,
    }));

    await fetch('/api/verifolio', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ show_company_logo: show }),
    });
  },

  reset: () => set(initialState),
}));
