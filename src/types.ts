export interface UserProfile {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  role: 'author' | 'admin';
}

export interface Project {
  id: string;
  title: string;
  authorName: string;
  storyline: string;
  deadline: string;
  authorUid: string;
  createdAt: any; // Firestore Timestamp or ISO string
  status: 'active' | 'archived' | 'completed';
}

export interface Chapter {
  id: string;
  projectId: string;
  title: string;
  content: string;
  order: number;
  status: 'draft' | 'review' | 'completed';
  auditLog: AuditEntry[];
}

export interface AuditEntry {
  timestamp: any;
  action: string;
  userId: string;
  userName: string;
}

export interface SharedLink {
  token: string;
  projectId: string;
  role: 'viewer' | 'editor';
  expiresAt: any;
  createdBy: string;
}

export interface Illustration {
  id: string;
  projectId: string;
  chapterId?: string; // Optional: link to a specific chapter
  title: string;
  description: string;
  url: string;
  artistId: string;
  artistName: string;
  status: 'draft' | 'under_review' | 'final';
  createdAt: any;
}

export interface BrainstormNote {
  id: string;
  projectId: string;
  content: string;
  allocatedChapterId?: string;
  authorId: string;
  authorName: string;
  createdAt: any;
}

export interface Character {
  id: string;
  projectId: string;
  name: string;
  description: string;
  motivation: string;
  traits: string[];
  linkedChapterIds: string[];
  role: 'protagonist' | 'antagonist' | 'supporting' | 'minor';
  updatedAt: any;
}

export interface PlotPoint {
  id: string;
  projectId: string;
  title: string;
  description: string;
  linkedChapterIds: string[];
  importance: 'major' | 'minor' | 'twist';
  order: number;
  updatedAt: any;
}

export interface Collaborator {
  id: string;
  email: string;
  role: 'viewer' | 'editor' | 'artist' | 'manager' | 'publisher';
  invitedAt: any;
  status: 'pending' | 'active';
}

export type ProjectRoleShortcut = 'owner' | 'editor' | 'viewer' | 'artist' | 'manager' | 'publisher';
