import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type InsertSite, type UpdateSiteRequest } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

export function useRates() {
  return useQuery({
    queryKey: [api.rates.get.path],
    queryFn: async () => {
      const res = await fetch(api.rates.get.path);
      if (!res.ok) throw new Error("Failed to fetch rates");
      return api.rates.get.responses[200].parse(await res.json());
    },
    enabled: false, // Only fetch on manual trigger usually
  });
}

export function useSites() {
  return useQuery({
    queryKey: [api.sites.list.path],
    queryFn: async () => {
      const res = await fetch(api.sites.list.path);
      if (!res.ok) throw new Error("Failed to fetch sites");
      return api.sites.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateSite() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (data: InsertSite) => {
      // Ensure numeric strings are valid before sending if using raw inputs, 
      // but zod schema handles validation on server.
      const res = await fetch(api.sites.create.path, {
        method: api.sites.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create site");
      }
      return api.sites.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.sites.list.path] });
      toast({ title: "Site Added", description: "New gambling site added successfully." });
    },
    onError: (err) => {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  });
}

export function useUpdateSite() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & UpdateSiteRequest) => {
      const url = buildUrl(api.sites.update.path, { id });
      const res = await fetch(url, {
        method: api.sites.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to update site");
      return api.sites.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.sites.list.path] });
      toast({ title: "Updated", description: "Site updated successfully." });
    },
    onError: (err) => {
      toast({ variant: "destructive", title: "Update Failed", description: err.message });
    }
  });
}

export function useDeleteSite() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.sites.delete.path, { id });
      const res = await fetch(url, { method: api.sites.delete.method });
      if (!res.ok) throw new Error("Failed to delete site");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.sites.list.path] });
      toast({ title: "Deleted", description: "Site removed successfully." });
    },
  });
}

export function useResetTurnover() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch(api.sites.resetTurnover.path, { 
        method: api.sites.resetTurnover.method 
      });
      if (!res.ok) throw new Error("Failed to reset turnovers");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.sites.list.path] });
      toast({ title: "Reset Complete", description: "All site turnovers have been reset to 0." });
    },
  });
}
