import type { WorkExperienceItem, ProjectItem } from './resume';

export interface LibraryWorkItem extends WorkExperienceItem {
  notes?: string;
}

export interface LibraryProjectItem extends ProjectItem {
  notes?: string;
}

export type LibraryItemData = LibraryWorkItem | LibraryProjectItem;
