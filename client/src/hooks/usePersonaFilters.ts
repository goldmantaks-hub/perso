import { useQuery } from "@tanstack/react-query";

export interface FilterItem {
  icon: string;
  label: string;
  value: string;
}

export interface PersonaFilters {
  filters: {
    emotion: FilterItem[];
    personaType: FilterItem[];
  };
}

export function usePersonaFilters() {
  return useQuery<PersonaFilters>({
    queryKey: ["/api/personas/filters"],
  });
}
