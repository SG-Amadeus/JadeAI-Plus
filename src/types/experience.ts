// Experience library types — independent from resume section types.
// The library stores full narrative experiences; resume sections store display-ready highlights.

export interface LibraryWorkData {
  company: string;
  position: string;
  department?: string;
  location?: string;
  startDate: string;
  endDate: string | null;
  current: boolean;
  summary: string;             // full narrative description — the source of truth
  technologies: string[];
  highlights?: string[];       // AI-generated per JD, NOT manually maintained
  projects?: { name: string; highlights: string[] }[];  // sub-projects
  notes?: string;              // internal AI reference, stripped when copying to resume
}

export interface LibraryProjectData {
  name: string;
  url?: string;
  startDate: string;
  endDate: string | null;
  summary: string;
  technologies: string[];
  highlights?: string[];
  notes?: string;
}

export type LibraryItemData = LibraryWorkData | LibraryProjectData;

// Backward compat: read summary from old "description" key if present
export function getSummary(data: Record<string, unknown>): string {
  return (data.summary as string) || (data.description as string) || '';
}
