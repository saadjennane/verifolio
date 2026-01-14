import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Company } from '@/lib/types/settings';

// ============================================================================
// Query Keys
// ============================================================================

export const companyKeys = {
  all: ['company'] as const,
  detail: () => [...companyKeys.all, 'detail'] as const,
  logo: () => [...companyKeys.all, 'logo'] as const,
};

// ============================================================================
// Fetchers
// ============================================================================

async function fetchCompany(): Promise<Company | null> {
  const res = await fetch('/api/settings/company', { credentials: 'include' });
  const data = await res.json();
  return data.data || null;
}

// ============================================================================
// Hooks - Queries
// ============================================================================

export function useCompany() {
  return useQuery({
    queryKey: companyKeys.detail(),
    queryFn: fetchCompany,
    staleTime: 10 * 60 * 1000, // 10 minutes - company data doesn't change often
  });
}

// ============================================================================
// Hooks - Mutations
// ============================================================================

export function useUpdateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<Company>) => {
      const res = await fetch('/api/settings/company', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update company');
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(companyKeys.detail(), data.data);
    },
  });
}

export function useUploadLogo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('logo', file);

      const res = await fetch('/api/settings/logo', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to upload logo');
      }
      return res.json();
    },
    onSuccess: (data) => {
      // Update the company data with new logo URL
      queryClient.setQueryData(companyKeys.detail(), (old: Company | null) =>
        old ? { ...old, logo_url: data.data.logo_url } : null
      );
    },
  });
}

export function useDeleteLogo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/settings/logo', {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to delete logo');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.setQueryData(companyKeys.detail(), (old: Company | null) =>
        old ? { ...old, logo_url: '' } : null
      );
    },
  });
}
