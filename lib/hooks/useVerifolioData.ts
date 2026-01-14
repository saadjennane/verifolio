import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { VerifolioProfile, VerifolioActivity, VerifolioPublicReview } from '@/lib/verifolio/types';
import type { VerifolioThemeColor } from '@/lib/verifolio/themes';

// ============================================================================
// Query Keys
// ============================================================================

export const verifolioKeys = {
  all: ['verifolio'] as const,
  profile: () => [...verifolioKeys.all, 'profile'] as const,
  activities: () => [...verifolioKeys.all, 'activities'] as const,
  reviews: () => [...verifolioKeys.all, 'reviews'] as const,
  publicProfile: (username: string) => [...verifolioKeys.all, 'public', username] as const,
};

// ============================================================================
// Fetchers
// ============================================================================

async function fetchProfile(): Promise<VerifolioProfile | null> {
  const res = await fetch('/api/verifolio');
  const data = await res.json();
  return data.profile || null;
}

async function fetchActivities(): Promise<VerifolioActivity[]> {
  const res = await fetch('/api/verifolio/activities');
  const data = await res.json();
  return data.activities || [];
}

async function fetchReviews(): Promise<VerifolioPublicReview[]> {
  const res = await fetch('/api/verifolio/reviews');
  const data = await res.json();
  return data.reviews || [];
}

// ============================================================================
// Hooks - Queries
// ============================================================================

export function useVerifolioProfile() {
  return useQuery({
    queryKey: verifolioKeys.profile(),
    queryFn: fetchProfile,
  });
}

export function useVerifolioActivities() {
  return useQuery({
    queryKey: verifolioKeys.activities(),
    queryFn: fetchActivities,
  });
}

export function useVerifolioReviews() {
  return useQuery({
    queryKey: verifolioKeys.reviews(),
    queryFn: fetchReviews,
  });
}

// Combined hook for loading all Verifolio data at once
export function useVerifolioData() {
  const profileQuery = useVerifolioProfile();
  const activitiesQuery = useVerifolioActivities();
  const reviewsQuery = useVerifolioReviews();

  return {
    profile: profileQuery.data,
    activities: activitiesQuery.data || [],
    reviews: reviewsQuery.data || [],
    isLoading: profileQuery.isLoading || activitiesQuery.isLoading || reviewsQuery.isLoading,
    isError: profileQuery.isError || activitiesQuery.isError || reviewsQuery.isError,
    refetch: () => {
      profileQuery.refetch();
      activitiesQuery.refetch();
      reviewsQuery.refetch();
    },
  };
}

// ============================================================================
// Hooks - Mutations
// ============================================================================

export function useCreateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (displayName: string) => {
      const res = await fetch('/api/verifolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: displayName }),
      });
      if (!res.ok) throw new Error('Failed to create profile');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: verifolioKeys.profile() });
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<VerifolioProfile>) => {
      const res = await fetch('/api/verifolio', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error('Failed to update profile');
      return res.json();
    },
    // Optimistic update
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: verifolioKeys.profile() });
      const previousProfile = queryClient.getQueryData(verifolioKeys.profile());

      queryClient.setQueryData(verifolioKeys.profile(), (old: VerifolioProfile | null) =>
        old ? { ...old, ...updates } : null
      );

      return { previousProfile };
    },
    onError: (_err, _updates, context) => {
      if (context?.previousProfile) {
        queryClient.setQueryData(verifolioKeys.profile(), context.previousProfile);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: verifolioKeys.profile() });
    },
  });
}

export function useTogglePublish() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (isPublished: boolean) => {
      const res = await fetch('/api/verifolio', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_published: !isPublished }),
      });
      if (!res.ok) throw new Error('Failed to toggle publish');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: verifolioKeys.profile() });
    },
  });
}

export function useUpdateTheme() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (color: VerifolioThemeColor) => {
      const res = await fetch('/api/verifolio', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme_color: color }),
      });
      if (!res.ok) throw new Error('Failed to update theme');
      return res.json();
    },
    // Optimistic update
    onMutate: async (color) => {
      await queryClient.cancelQueries({ queryKey: verifolioKeys.profile() });
      const previousProfile = queryClient.getQueryData(verifolioKeys.profile());

      queryClient.setQueryData(verifolioKeys.profile(), (old: VerifolioProfile | null) =>
        old ? { ...old, theme_color: color } : null
      );

      return { previousProfile };
    },
    onError: (_err, _color, context) => {
      if (context?.previousProfile) {
        queryClient.setQueryData(verifolioKeys.profile(), context.previousProfile);
      }
    },
  });
}

// ============================================================================
// Activity Mutations
// ============================================================================

export function useCreateActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (activity: { title: string; description?: string; image_url?: string }) => {
      const res = await fetch('/api/verifolio/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activity),
      });
      if (!res.ok) throw new Error('Failed to create activity');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: verifolioKeys.activities() });
    },
  });
}

export function useUpdateActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<VerifolioActivity> }) => {
      const res = await fetch(`/api/verifolio/activities/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error('Failed to update activity');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: verifolioKeys.activities() });
    },
  });
}

export function useDeleteActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/verifolio/activities/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete activity');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: verifolioKeys.activities() });
    },
  });
}
