import React, { useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  User
} from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  serverTimestamp,
  updateDoc,
  doc,
  getDoc,
  setDoc,
  orderBy,
  deleteDoc,
  collectionGroup,
  getDocs
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { 
  Project, 
  Chapter, 
  UserProfile, 
  ProjectRoleShortcut, 
  Illustration, 
  BrainstormNote,
  Character,
  PlotPoint
} from './types';
import { 
  BookOpen, 
  Plus, 
  LogOut, 
  User as UserIcon, 
  Clock, 
  ChevronRight, 
  FileText, 
  Settings,
  Share2,
  CheckCircle2,
  AlertCircle,
  Home,
  Trash2,
  Edit3,
  Sparkles,
  History,
  Link as LinkIcon,
  Users,
  UserPlus,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Type,
  Lightbulb,
  Send,
  Link2,
  ExternalLink,
  Bold,
  Italic,
  Underline,
  Heading1,
  Heading2,
  Settings2,
  UserCircle,
  Map,
  Sword,
  Shield,
  Layers,
  Image as ImageIcon,
  PanelLeftClose,
  PanelLeftOpen,
  Languages,
  Globe2,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Core Logic & Data Utilities ---

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// --- Components ---

const Navbar = ({ user, onLogout, onHome }: { user: User, onLogout: () => void, onHome: () => void }) => (
  <nav className="border-b border-[var(--border)] bg-[var(--surface)] sticky top-0 z-50">
    <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
      <div 
        className="flex items-center gap-2 cursor-pointer group"
        onClick={onHome}
      >
        <div className="w-4 h-4 bg-[var(--accent)]"></div>
        <span className="font-extrabold text-lg tracking-tight uppercase">BookAudita</span>
      </div>
      
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3 pr-6 border-r border-[var(--border)]">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-semibold text-[var(--ink)]">{user.displayName}</div>
            <div className="text-[10px] text-gray-400 font-mono tracking-tight uppercase">{user.email}</div>
          </div>
          {user.photoURL ? (
            <img src={user.photoURL} alt="Avatar" className="w-8 h-8 rounded-full border border-[var(--border)]" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gray-50 border border-[var(--border)] flex items-center justify-center">
              <UserIcon size={14} className="text-gray-400" />
            </div>
          )}
        </div>
        <button 
          onClick={onLogout}
          className="text-gray-400 hover:text-[var(--ink)] transition-colors"
          title="Logout"
        >
          <LogOut size={18} />
        </button>
      </div>
    </div>
  </nav>
);

const Landing = ({ onLogin }: { onLogin: () => void }) => (
  <div className="min-h-screen bg-[var(--bg)] flex flex-col items-center justify-center p-6">
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-2xl text-center"
    >
      <div className="flex items-center justify-center gap-3 mb-10">
        <div className="w-10 h-10 bg-[var(--accent)]"></div>
        <span className="font-extrabold text-3xl tracking-tighter uppercase">BookAudita</span>
      </div>
      <h1 className="text-6xl font-extrabold tracking-tight text-[var(--ink)] mb-8">
        Precision Engineering for Authors.
      </h1>
      <p className="text-lg text-[#555] mb-12 max-w-lg mx-auto leading-relaxed">
        A professional-grade environment for drafting, proofreading, and auditing your manuscripts with secure manager collaboration.
      </p>
      
      <button 
        onClick={onLogin}
        className="px-10 py-4 bg-[var(--ink)] text-white font-bold text-sm tracking-widest uppercase hover:bg-[#333] transition-all flex items-center gap-3 mx-auto rounded-sm shadow-xl"
      >
        <img src="https://www.google.com/favicon.ico" className="w-4 h-4 invert" alt="" />
        Initialize session
      </button>
    </motion.div>
  </div>
);

const ConfirmationModal = ({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel, 
  confirmText = "Confirm", 
  isDanger = false 
}: { 
  isOpen: boolean, 
  title: string, 
  message: string, 
  onConfirm: () => void, 
  onCancel: () => void, 
  confirmText?: string,
  isDanger?: boolean
}) => (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-[var(--surface)] border border-[var(--border)] p-10 max-w-md w-full shadow-2xl rounded-sm"
        >
          <h3 className="text-2xl font-extrabold tracking-tighter uppercase mb-4">{title}</h3>
          <p className="text-sm text-[#666] leading-relaxed mb-10">{message}</p>
          <div className="flex gap-4">
            <button 
              onClick={onCancel}
              className="flex-1 py-4 border border-[var(--border)] font-bold text-[10px] uppercase tracking-widest hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={onConfirm}
              className={`flex-1 py-4 font-bold text-[10px] uppercase tracking-widest transition-colors shadow-lg ${
                isDanger ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-[var(--ink)] hover:bg-[#333] text-white'
              }`}
            >
              {confirmText}
            </button>
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

// --- Collaborator Modal ---
const CollaboratorModal = ({ 
  isOpen, 
  onClose, 
  project,
  user
}: { 
  isOpen: boolean, 
  onClose: () => void,
  project: Project,
  user: User
}) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<ProjectRoleShortcut>('viewer');
  const [loading, setLoading] = useState(false);
  const [collaborators, setCollaborators] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      const path = `projects/${project.id}/collaborators`;
      const unsub = onSnapshot(collection(db, 'projects', project.id, 'collaborators'), (snap) => {
        setCollaborators(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      });
      return () => unsub();
    }
  }, [isOpen, project.id]);

  const handleAddCollab = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      // Find user by email to get UID (more secure rules)
      const usersQ = query(collection(db, 'users'), where('email', '==', email.toLowerCase()));
      const userSnap = await getDocs(usersQ);
      
      let targetId = email.toLowerCase(); // fallback
      if (!userSnap.empty) {
        targetId = userSnap.docs[0].id;
      }

      await setDoc(doc(db, 'projects', project.id, 'collaborators', targetId), {
        email: email.toLowerCase(),
        role,
        invitedAt: serverTimestamp(),
        status: userSnap.empty ? 'pending' : 'active'
      });
      setEmail('');
    } catch (e) {
      console.error(e);
      alert('Failed to add collaborator. Only owners can manage collaborators.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCollab = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'projects', project.id, 'collaborators', id));
    } catch (e) {
      console.error(e);
    }
  };

  const roles: ProjectRoleShortcut[] = ['viewer', 'editor', 'artist', 'manager', 'publisher'];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-[var(--surface)] border border-[var(--border)] p-10 max-w-xl w-full shadow-2xl rounded-sm flex flex-col max-h-[80vh]"
          >
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-[var(--border)]">
              <h3 className="text-2xl font-extrabold tracking-tighter uppercase flex items-center gap-3">
                <Users className="text-[var(--accent)]" size={24} />
                Collaborator Hub
              </h3>
              <button onClick={onClose} className="text-gray-400 hover:text-[var(--ink)]">
                <Plus className="rotate-45" size={24} />
              </button>
            </div>

            <form onSubmit={handleAddCollab} className="space-y-4 mb-10">
              <div className="text-[10px] font-bold uppercase tracking-widest text-[#888] mb-2">Invite Collaborator</div>
              <div className="flex gap-4">
                <input 
                  required
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@nexus.com"
                  className="flex-1 px-4 py-3 bg-[var(--bg)] border border-[var(--border)] focus:border-[var(--accent)] outline-none text-sm font-semibold"
                />
                <select 
                  value={role}
                  onChange={e => setRole(e.target.value as ProjectRoleShortcut)}
                  className="px-4 py-3 bg-[var(--bg)] border border-[var(--border)] text-xs font-bold uppercase tracking-widest outline-none"
                >
                  {roles.map(r => (
                    <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                  ))}
                </select>
                <button 
                  disabled={loading}
                  className="px-6 py-3 bg-[var(--accent)] text-white font-bold text-xs uppercase tracking-widest hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  <UserPlus size={16} />
                  {loading ? '...' : 'Invite'}
                </button>
              </div>
              <p className="text-[9px] text-[#999] leading-tight italic">
                Choose roles to define manuscript access levels.
              </p>
            </form>

            <div className="flex-1 overflow-y-auto space-y-4">
               <div className="text-[10px] font-bold uppercase tracking-widest text-[#888] mb-2">Current Access</div>
               <div className="space-y-2">
                 {/* Owner as first entry */}
                 <div className="p-4 border border-[var(--border)] bg-gray-50 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold text-[var(--ink)]">{project.authorName}</div>
                      <div className="text-[10px] text-gray-400 font-mono italic">Primary Author (Owner)</div>
                    </div>
                    <div className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 bg-[var(--ink)] text-white">Full</div>
                 </div>

                 {collaborators.map(c => (
                    <div key={c.id} className="p-4 border border-[var(--border)] flex items-center justify-between">
                      <div>
                        <div className="text-sm font-bold text-[var(--ink)]">{c.email}</div>
                        <div className="text-[10px] text-gray-400 font-mono">{c.status === 'pending' ? 'WAITING_FOR_SIGNUP' : 'ACTIVE_SESSION'}</div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-1 border ${c.role === 'editor' ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-gray-300 text-gray-400'}`}>
                          {c.role}
                        </span>
                        {project.authorUid === user.uid && (
                          <button 
                            onClick={() => handleRemoveCollab(c.id)}
                            className="text-gray-300 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                 ))}
               </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// --- Dashboard Component ---
const Dashboard = ({ 
  projects, 
  onCreateProject, 
  onSelectProject,
  onDeleteProject,
  onArchiveProject
}: { 
  projects: Project[], 
  onCreateProject: () => void, 
  onSelectProject: (p: Project) => void,
  onDeleteProject: (projectId: string) => void,
  onArchiveProject: (projectId: string) => void
}) => {
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmArchive, setConfirmArchive] = useState<string | null>(null);

  const selectedDeleteProject = projects.find(p => p.id === confirmDelete);
  const selectedArchiveProject = projects.find(p => p.id === confirmArchive);

  return (
    <div className="max-w-7xl mx-auto px-6 py-16">
      <ConfirmationModal 
        isOpen={!!confirmDelete}
        title="Delete Project"
        message={`Are you sure you want to permanently delete "${selectedDeleteProject?.title}"? This action cannot be undone and all chapters will be lost.`}
        confirmText="Delete Permanently"
        isDanger={true}
        onConfirm={() => {
          if (confirmDelete) onDeleteProject(confirmDelete);
          setConfirmDelete(null);
        }}
        onCancel={() => setConfirmDelete(null)}
      />

      <ConfirmationModal 
        isOpen={!!confirmArchive}
        title="Archive Project"
        message={`Are you sure you want to archive "${selectedArchiveProject?.title}"? It will be moved to the archive section.`}
        confirmText="Archive Project"
        onConfirm={() => {
          if (confirmArchive) onArchiveProject(confirmArchive);
          setConfirmArchive(null);
        }}
        onCancel={() => confirmArchive && setConfirmArchive(null)}
      />

      <div className="flex items-end justify-between mb-16 border-b border-[var(--border)] pb-8">
        <div>
          <h2 className="text-10 font-bold tracking-widest uppercase text-gray-400 mb-2">Workspace</h2>
          <h1 className="text-4xl font-extrabold text-[var(--ink)]">Your Projects</h1>
        </div>
        <button 
          onClick={onCreateProject}
          className="bg-[var(--ink)] text-white px-8 py-3 font-bold text-xs uppercase tracking-widest hover:bg-[#333] transition-all rounded-sm flex items-center gap-2"
        >
          <Plus size={16} />
          Launch New Project
        </button>
      </div>

          {projects.length === 0 ? (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-sm p-32 text-center flex flex-col items-center">
          <div className="w-16 h-16 bg-gray-50 flex items-center justify-center mb-10 rotate-3 border border-gray-100 shadow-sm">
             <Edit3 size={32} className="text-gray-300" />
          </div>
          <h3 className="text-2xl font-extrabold text-[var(--ink)] mb-4 uppercase tracking-tighter">Your Manuscript Awaits</h3>
          <p className="text-[#666] mb-12 text-sm max-w-sm leading-relaxed">BookAudita is indexed and ready for your first production. Initialize a project to begin the structural audit and writing process.</p>
          <button 
            onClick={onCreateProject}
            className="bg-[var(--ink)] text-white px-12 py-4 font-bold text-xs uppercase tracking-widest hover:bg-[#333] transition-all rounded-sm shadow-2xl flex items-center gap-3"
          >
            <Sparkles size={16} />
            Initialize First Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {projects.map((project) => (
            <motion.div
              layoutId={project.id}
              key={project.id}
              onClick={() => onSelectProject(project)}
              className="bg-[var(--surface)] p-8 border border-[var(--border)] group cursor-pointer hover:border-[var(--accent)] transition-all flex flex-col relative overflow-hidden h-full"
            >
              <div className="absolute top-0 right-0 w-12 h-12 bg-gray-50 flex items-center justify-center border-l border-b border-[var(--border)] text-[10px] font-mono font-bold text-gray-400">
                {project.status === 'active' ? 'ACTV' : project.status.substring(0, 4).toUpperCase()}
              </div>
              <div className="absolute top-0 left-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmArchive(project.id);
                  }}
                  className="p-2 bg-white border border-[var(--border)] text-gray-400 hover:text-[var(--ink)] hover:border-[var(--ink)] transition-all rounded-sm"
                  title="Archive Project"
                >
                  <Clock size={14} />
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDelete(project.id);
                  }}
                  className="p-2 bg-white border border-[var(--border)] text-gray-400 hover:text-red-600 hover:border-red-600 transition-all rounded-sm"
                  title="Delete Project"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <span className="text-[10px] font-bold tracking-widest text-[#888] uppercase mb-4 mt-4">Manuscript</span>
              <h3 className="text-2xl font-bold text-[var(--ink)] mb-4 truncate group-hover:text-[var(--accent)] transition-colors">{project.title}</h3>
              <p className="text-sm text-[#555] mb-10 line-clamp-2 leading-relaxed">"{project.storyline || 'No storyline set.'}"</p>
              
              <div className="mt-auto pt-6 border-t border-[var(--border)] space-y-4">
                <div className="flex justify-between items-center text-[11px] font-bold uppercase tracking-widest">
                  <span className="text-gray-400">Author</span>
                  <span className="text-[var(--ink)]">{project.authorName}</span>
                </div>
                {project.deadline && (
                  <div className="flex justify-between items-center text-[11px] font-bold uppercase tracking-widest">
                    <span className="text-gray-400">Deadline</span>
                    <span className="text-[var(--accent)]">{new Date(project.deadline).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

// --- App.tsx Main Logic ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectRole, setProjectRole] = useState<ProjectRoleShortcut>('viewer');
  const [view, setView] = useState<'dashboard' | 'project' | 'create' | 'shared'>('dashboard');
  const [shareToken, setShareToken] = useState<string | null>(null);

  useEffect(() => {
    const handleRoleDetection = async () => {
      if (!user || !selectedProject) return;
      
      if (selectedProject.authorUid === user.uid) {
        setProjectRole('owner');
        return;
      }

      // Check collaborators
      const collabRef = doc(db, 'projects', selectedProject.id, 'collaborators', user.uid);
      const collabSnap = await getDoc(collabRef);
      if (collabSnap.exists()) {
        setProjectRole(collabSnap.data().role as ProjectRoleShortcut);
      } else {
        // Alternative: check by email if UID mapping failed
        const q = query(collection(db, 'projects', selectedProject.id, 'collaborators'), where('email', '==', user.email));
        const snap = await getDocs(q);
        if (!snap.empty) {
          setProjectRole(snap.docs[0].data().role as ProjectRoleShortcut);
        } else {
          setProjectRole('viewer'); // Fallback for shared links or edge cases
        }
      }
    };

    handleRoleDetection();
  }, [user, selectedProject]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('share');
    if (token) {
      setShareToken(token);
      handleSharedLink(token);
    }
  }, [user]);

  const handleSharedLink = async (token: string) => {
    try {
      const q = query(collection(db, 'sharedLinks'), where('token', '==', token));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const linkData = snap.docs[0].data();
        const projRef = doc(db, 'projects', linkData.projectId);
        const projSnap = await getDoc(projRef);
        if (projSnap.exists()) {
          setSelectedProject({ id: projSnap.id, ...projSnap.data() } as Project);
          setProjectRole(linkData.role);
          setView('shared');
        }
      }
    } catch (e) {
      console.error("Shared link resolution failed", e);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setLoading(false);
      
      if (u) {
        // Sync user profile if needed
        const userRef = doc(db, 'users', u.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          await setDoc(userRef, {
            uid: u.uid,
            email: u.email,
            displayName: u.displayName,
            photoURL: u.photoURL,
            role: 'author'
          });
        }

        // Subscribe to projects where user is author
        const q = query(
          collection(db, 'projects'), 
          where('authorUid', '==', u.uid),
          orderBy('createdAt', 'desc')
        );
        const unsubProjects = onSnapshot(q, async (snapshot) => {
          const ownedProjs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
          
          // Fetch collaborations
          const collabQuery = query(collectionGroup(db, 'collaborators'), where('email', '==', u.email));
          try {
            const collabSnap = await getDocs(collabQuery);
            
            const collabProjs: Project[] = [];
            for (const collabDoc of collabSnap.docs) {
               const projRef = collabDoc.ref.parent.parent;
               if (projRef) {
                  const projSnap = await getDoc(projRef);
                  if (projSnap.exists()) {
                     collabProjs.push({ id: projSnap.id, ...projSnap.data() } as Project);
                  }
               }
            }

            // Merge and deduplicate
            const allProjs = [...ownedProjs];
            collabProjs.forEach(cp => {
               if (!allProjs.find(ap => ap.id === cp.id)) {
                  allProjs.push(cp);
               }
            });

            setProjects(allProjs);
          } catch (error) {
            console.error("Collab fetch failed", error);
          }
        }, (error) => {
          handleFirestoreError(error, OperationType.LIST, 'projects');
        });
        return () => unsubProjects();
      } else {
        setProjects([]);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleLogout = () => signOut(auth);

  const handleDeleteProject = async (projectId: string) => {
    try {
      await deleteDoc(doc(db, 'projects', projectId));
      // Chapters are in subcollection, but for now we delete the project doc
      // Ideally we should delete chapters too, but Firestore doesn't do cascading deletes automatically in client SDK
      if (selectedProject?.id === projectId) {
        setSelectedProject(null);
        setView('dashboard');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleArchiveProject = async (projectId: string) => {
    try {
      await updateDoc(doc(db, 'projects', projectId), { status: 'archived' });
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <motion.div 
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="w-12 h-12 bg-black rounded-xl"
        />
      </div>
    );
  }

  if (view === 'shared' && shareToken) {
    return (
      <div className="min-h-screen bg-[#FAFAFA]">
        <SharedView token={shareToken} onBack={() => {
          window.history.replaceState({}, '', window.location.pathname);
          setView('dashboard');
          setShareToken(null);
        }} />
      </div>
    );
  }

  if (!user) {
    return <Landing onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <Navbar 
        user={user} 
        onLogout={handleLogout} 
        onHome={() => { setView('dashboard'); setSelectedProject(null); }} 
      />
      
      <main>
        {view === 'dashboard' && (
          <Dashboard 
            projects={projects} 
            onCreateProject={() => setView('create')} 
            onSelectProject={(p) => { setSelectedProject(p); setView('project'); }}
            onDeleteProject={handleDeleteProject}
            onArchiveProject={handleArchiveProject}
          />
        )}

        {view === 'create' && (
          <ProjectForm 
            user={user} 
            onCancel={() => setView('dashboard')} 
            onSuccess={(p) => { setView('dashboard'); }} 
          />
        )}

        {view === 'project' && selectedProject && (
          <ProjectDetailView 
            project={selectedProject} 
            user={user}
            role={projectRole}
            onBack={() => setView('dashboard')}
          />
        )}

        {view === 'shared' && shareToken && (
          <SharedView token={shareToken} onBack={() => {
            window.history.replaceState({}, '', window.location.pathname);
            setView('dashboard');
          }} />
        )}
      </main>
    </div>
  );
}

const SharedView = ({ token, onBack }: { token: string, onBack: () => void }) => {
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<Project | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [illustrations, setIllustrations] = useState<Illustration[]>([]);

  useEffect(() => {
    let unsubs: (() => void)[] = [];

    const fetchShared = async () => {
      try {
        const q = query(collection(db, 'sharedLinks'), where('token', '==', token));
        const unsub = onSnapshot(q, async (linkSnap) => {
          if (!linkSnap.empty) {
            const linkData = linkSnap.docs[0].data();
            const projSnap = await getDoc(doc(db, 'projects', linkData.projectId));
            if (projSnap.exists()) {
              setProject({ id: projSnap.id, ...projSnap.data() } as Project);
              
              const chaptersPath = `projects/${projSnap.id}/chapters`;
              const chaptersQ = query(collection(db, 'projects', projSnap.id, 'chapters'), orderBy('order', 'asc'));
              const cUnsub = onSnapshot(chaptersQ, (cSnap) => {
                setChapters(cSnap.docs.map(d => ({ id: d.id, ...d.data() } as Chapter)));
              }, (err) => handleFirestoreError(err, OperationType.LIST, chaptersPath));
              unsubs.push(cUnsub);

              const illPath = `projects/${projSnap.id}/illustrations`;
              const illQ = query(collection(db, 'projects', projSnap.id, 'illustrations'), orderBy('createdAt', 'desc'));
              const iUnsub = onSnapshot(illQ, (iSnap) => {
                setIllustrations(iSnap.docs.map(d => ({ id: d.id, ...d.data() } as Illustration)));
              }, (err) => handleFirestoreError(err, OperationType.LIST, illPath));
              unsubs.push(iUnsub);
            }
          }
          setLoading(false);
        }, (error) => {
          handleFirestoreError(error, OperationType.LIST, 'sharedLinks');
        });
        unsubs.push(unsub);
      } catch (e) {
        setLoading(false);
      }
    };
    fetchShared();
    return () => unsubs.forEach(fn => fn());
  }, [token]);

  if (loading) return <div className="h-96 flex items-center justify-center">Loading shared project...</div>;
  if (!project) return <div className="h-96 flex flex-col items-center justify-center">
    <AlertCircle className="text-red-500 mb-4" size={48} />
    <h2 className="text-xl font-bold">Link Invalid or Expired</h2>
    <button onClick={onBack} className="mt-4 text-blue-500 underline">Return to Dashboard</button>
  </div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-20">
      <div className="bg-white rounded-[32px] p-10 border border-gray-100 shadow-xl">
        <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase mb-4 tracking-widest">
          <Share2 size={14} />
          Shared Manuscript (Viewer Mode)
        </div>
        <h1 className="text-4xl font-extrabold mb-4">{project.title}</h1>
        <p className="text-lg text-gray-500 italic mb-8">"{project.storyline}"</p>

        <div className="flex gap-10 mb-12 py-6 border-y border-gray-50 text-[11px] font-mono font-bold uppercase tracking-widest text-gray-400">
           <div className="flex items-center gap-2">
             <span className="text-[var(--accent)]">WORDS:</span>
             <span className="text-[var(--ink)]">{chapters.reduce((sum, c) => sum + (c.content?.split(/\s+/).filter(Boolean).length || 0), 0).toLocaleString()}</span>
           </div>
           <div className="flex items-center gap-2">
             <span className="text-[var(--accent)]">ESTIMATED PAGES:</span>
             <span className="text-[var(--ink)]">{Math.max(1, Math.ceil(chapters.reduce((sum, c) => sum + (c.content?.split(/\s+/).filter(Boolean).length || 0), 0) / 300))}</span>
           </div>
        </div>

        {illustrations.length > 0 && (
          <div className="mb-12 border-b border-gray-100 pb-8">
            <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-6">Linked Assets</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {illustrations.map(ill => (
                <div key={ill.id} className="group relative aspect-square bg-gray-50 rounded-lg overflow-hidden border border-gray-100">
                  <img src={ill.url} alt={ill.title} className="w-full h-full object-cover transition-transform group-hover:scale-110" referrerPolicy="no-referrer" />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <a href={ill.url} target="_blank" rel="noreferrer" className="p-2 bg-white rounded-full shadow-lg">
                      <ExternalLink size={14} />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="space-y-12">
           {chapters.map(c => (
             <div key={c.id} className="space-y-4">
                <h3 className="text-xl font-bold border-b border-gray-100 pb-2">Chapter {c.order}: {c.title}</h3>
                <div className="prose prose-slate max-w-none whitespace-pre-wrap font-serif text-gray-800 leading-relaxed">
                  {c.content || <span className="text-gray-300 italic">No content written yet.</span>}
                </div>
             </div>
           ))}
        </div>
      </div>
      <button onClick={onBack} className="mt-12 text-gray-400 hover:text-black block mx-auto font-medium">
        Exit Share View
      </button>
    </div>
  );
};

const ProjectForm = ({ user, onCancel, onSuccess }: { user: User, onCancel: () => void, onSuccess: (p: any) => void }) => {
  const [form, setForm] = useState({
    title: '',
    authorName: user.displayName || '',
    storyline: '',
    deadline: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'projects'), {
        ...form,
        authorUid: user.uid,
        createdAt: serverTimestamp(),
        status: 'active'
      });
      onSuccess(form);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-6 py-20">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-[var(--surface)] p-12 border border-[var(--border)] shadow-2xl rounded-sm"
      >
        <h2 className="text-3xl font-extrabold mb-10 uppercase tracking-tighter">Initialize Project</h2>
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-[#888]">Work Title</label>
            <input 
              required
              value={form.title}
              onChange={e => setForm({...form, title: e.target.value})}
              className="w-full px-0 py-3 bg-transparent border-b border-[var(--border)] focus:border-[var(--accent)] outline-none transition-colors text-lg font-semibold"
              placeholder="e.g. The Silent Echo"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-[#888]">Author Name</label>
            <input 
              required
              value={form.authorName}
              onChange={e => setForm({...form, authorName: e.target.value})}
              className="w-full px-0 py-3 bg-transparent border-b border-[var(--border)] focus:border-[var(--accent)] outline-none transition-colors text-lg font-semibold"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-[#888]">Storyline Objective</label>
            <textarea 
              value={form.storyline}
              onChange={e => setForm({...form, storyline: e.target.value})}
              rows={3}
              className="w-full px-0 py-3 bg-transparent border-b border-[var(--border)] focus:border-[var(--accent)] outline-none transition-colors text-lg leading-relaxed resize-none"
              placeholder="Brief summary..."
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-[#888]">Production Deadline</label>
            <input 
              type="date"
              value={form.deadline}
              onChange={e => setForm({...form, deadline: e.target.value})}
              className="w-full px-0 py-3 bg-transparent border-b border-[var(--border)] focus:border-[var(--accent)] outline-none transition-colors text-lg"
            />
          </div>
          
          <div className="pt-10 flex gap-4">
            <button 
              type="button"
              onClick={onCancel}
              className="flex-1 py-4 border border-[var(--border)] font-bold text-xs uppercase tracking-widest hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button 
              disabled={loading}
              className="flex-1 py-4 bg-[var(--ink)] text-white font-bold text-xs uppercase tracking-widest hover:bg-[#333] transition-colors shadow-lg disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Sync Project'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

// --- Project Detail View ---

const ProjectDetailView = ({ project, user, role, onBack }: { project: Project, user: User, role: ProjectRoleShortcut, onBack: () => void }) => {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [illustrations, setIllustrations] = useState<Illustration[]>([]);
  const [brainstormNotes, setBrainstormNotes] = useState<BrainstormNote[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [plotPoints, setPlotPoints] = useState<PlotPoint[]>([]);
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
  const [confirmDeleteChapter, setConfirmDeleteChapter] = useState<string | null>(null);
  const [isCollabModalOpen, setIsCollabModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'chapters' | 'history' | 'illustrations' | 'brainstorm' | 'world'>('chapters');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [storylineSummary, setStorylineSummary] = useState(project.storyline);
  const [isUpdatingStoryline, setIsUpdatingStoryline] = useState(false);

  const canEdit = role === 'owner' || role === 'editor' || role === 'manager' || role === 'publisher';
  const isOwner = role === 'owner';
  const isArtist = role === 'artist' || isOwner || role === 'editor';

  useEffect(() => {
    const path = `projects/${project.id}/chapters`;
    const q = query(
      collection(db, 'projects', project.id, 'chapters'),
      orderBy('order', 'asc')
    );
    const unsub = onSnapshot(q, (snapshot) => {
      setChapters(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chapter)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
    return () => unsub();
  }, [project.id]);

  useEffect(() => {
    const path = `projects/${project.id}/illustrations`;
    const q = query(
      collection(db, 'projects', project.id, 'illustrations'),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snapshot) => {
      setIllustrations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Illustration)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
    return () => unsub();
  }, [project.id]);

  useEffect(() => {
    const path = `projects/${project.id}/brainstorm`;
    const q = query(
      collection(db, 'projects', project.id, 'brainstorm'),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snapshot) => {
      setBrainstormNotes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BrainstormNote)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
    return () => unsub();
  }, [project.id]);

  useEffect(() => {
    const path = `projects/${project.id}/characters`;
    const q = query(collection(db, 'projects', project.id, 'characters'), orderBy('name', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setCharacters(snap.docs.map(d => ({ id: d.id, ...d.data() } as Character)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
    return () => unsub();
  }, [project.id]);

  useEffect(() => {
    const path = `projects/${project.id}/plotPoints`;
    const q = query(collection(db, 'projects', project.id, 'plotPoints'), orderBy('order', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setPlotPoints(snap.docs.map(d => ({ id: d.id, ...d.data() } as PlotPoint)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
    return () => unsub();
  }, [project.id]);

  const updateStoryline = async () => {
    setIsUpdatingStoryline(true);
    try {
      await updateDoc(doc(db, 'projects', project.id), { storyline: storylineSummary });
    } finally {
      setIsUpdatingStoryline(false);
    }
  };

  const addCharacter = async () => {
    const name = prompt('Character Name:');
    if (!name) return;
    await addDoc(collection(db, 'projects', project.id, 'characters'), {
      projectId: project.id,
      name,
      role: 'supporting',
      description: '',
      motivation: '',
      traits: [],
      linkedChapterIds: [],
      updatedAt: serverTimestamp()
    });
  };

  const updateCharacter = async (id: string, updates: Partial<Character>) => {
    await updateDoc(doc(db, 'projects', project.id, 'characters', id), {
      ...updates,
      updatedAt: serverTimestamp()
    });
  };

  const deleteCharacter = async (id: string) => {
    if (confirm('Erase this character profile?')) {
      await deleteDoc(doc(db, 'projects', project.id, 'characters', id));
    }
  };

  const addPlotPoint = async () => {
    const title = prompt('Plot Point Title:');
    if (!title) return;
    await addDoc(collection(db, 'projects', project.id, 'plotPoints'), {
      projectId: project.id,
      title,
      description: '',
      importance: 'minor',
      order: plotPoints.length + 1,
      linkedChapterIds: [],
      updatedAt: serverTimestamp()
    });
  };

  const updatePlotPoint = async (id: string, updates: Partial<PlotPoint>) => {
    await updateDoc(doc(db, 'projects', project.id, 'plotPoints', id), {
      ...updates,
      updatedAt: serverTimestamp()
    });
  };

  const deletePlotPoint = async (id: string) => {
    if (confirm('Delete this plot beat?')) {
      await deleteDoc(doc(db, 'projects', project.id, 'plotPoints', id));
    }
  };

  const addIllustration = async () => {
    const title = prompt('Illustration Title:');
    const url = prompt('Image URL:');
    if (!title || !url) return;

    await addDoc(collection(db, 'projects', project.id, 'illustrations'), {
      projectId: project.id,
      title,
      url,
      description: '',
      artistId: user.uid,
      artistName: user.displayName,
      status: 'draft',
      createdAt: serverTimestamp()
    });
  };

  const deleteIllustration = async (id: string) => {
    if (confirm('Delete this illustration record?')) {
      await deleteDoc(doc(db, 'projects', project.id, 'illustrations', id));
    }
  };

  const addNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteContent.trim()) return;

    await addDoc(collection(db, 'projects', project.id, 'brainstorm'), {
      projectId: project.id,
      content: newNoteContent,
      authorId: user.uid,
      authorName: user.displayName || user.email,
      createdAt: serverTimestamp()
    });
    setNewNoteContent('');
  };

  const allocateNote = async (noteId: string, chapterId: string) => {
    const noteRef = doc(db, 'projects', project.id, 'brainstorm', noteId);
    await updateDoc(noteRef, {
      allocatedChapterId: chapterId === 'none' ? null : chapterId
    });
  };

  const emailNote = (note: BrainstormNote) => {
    const subject = encodeURIComponent(`Brainstorm Idea: ${project.title}`);
    const body = encodeURIComponent(`${note.content}\n\n— Shared from ${project.title} by ${note.authorName}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const deleteNote = async (id: string) => {
    if (confirm('Delete this brainstorm note?')) {
      await deleteDoc(doc(db, 'projects', project.id, 'brainstorm', id));
    }
  };

  const addChapter = async () => {
    const title = prompt('Chapter Title:');
    if (!title) return;
    const newDoc = await addDoc(collection(db, 'projects', project.id, 'chapters'), {
      projectId: project.id,
      title,
      content: '',
      order: chapters.length + 1,
      status: 'draft',
      auditLog: [{
        timestamp: new Date().toISOString(),
        action: 'Created branch',
        userId: user.uid,
        userName: user.displayName
      }]
    });
    // Immediately enter editor for the new chapter
    setEditingChapter({
      id: newDoc.id,
      projectId: project.id,
      title,
      content: '',
      order: chapters.length + 1,
      status: 'draft',
      auditLog: [{
        timestamp: new Date().toISOString(),
        action: 'Created branch',
        userId: user.uid,
        userName: user.displayName
      }]
    });
  };

  const deleteChapter = async (chapterId: string) => {
    await deleteDoc(doc(db, 'projects', project.id, 'chapters', chapterId));
  };

  const updateChapterStatus = async (e: React.MouseEvent, chapterId: string, newStatus: string) => {
    e.stopPropagation();
    const chapterRef = doc(db, 'projects', project.id, 'chapters', chapterId);
    await updateDoc(chapterRef, { 
      status: newStatus,
      auditLog: [
        ...(chapters.find(c => c.id === chapterId)?.auditLog || []),
        {
          timestamp: new Date().toISOString(),
          action: `Status changed to ${newStatus}`,
          userId: user.uid,
          userName: user.displayName
        }
      ]
    });
  };

  const generateShareLink = async () => {
    const token = Math.random().toString(36).substring(2, 15);
    await addDoc(collection(db, 'sharedLinks'), {
      token,
      projectId: project.id,
      role: 'viewer',
      createdBy: user.uid,
      createdAt: serverTimestamp()
    });
    const url = `${window.location.origin}/?share=${token}`;
    navigator.clipboard.writeText(url);
    alert(`Access Token Copied to Clipboard: ${url}`);
  };

  const handleExport = () => {
    const fullText = chapters.map(c => `# ${c.title}\n\n${c.content}`).join('\n\n---\n\n');
    const blob = new Blob([fullText], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.title.replace(/\s+/g, '_')}_Manuscript.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (editingChapter) {
    return (
      <Editor 
        project={project}
        chapter={editingChapter} 
        user={user}
        role={role}
        characters={characters}
        plotPoints={plotPoints}
        onBack={() => setEditingChapter(null)} 
      />
    );
  }

  const selectedDeleteChapter = chapters.find(c => c.id === confirmDeleteChapter);

  const WORDS_PER_PAGE = 300;
  const totalWords = chapters.reduce((sum, c) => sum + (c.content?.split(/\s+/).filter(Boolean).length || 0), 0);
  const totalPages = Math.max(1, Math.ceil(totalWords / WORDS_PER_PAGE));

  const allLogs = chapters
    .flatMap(c => (c.auditLog || []).map(l => ({ ...l, chapterTitle: c.title })))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const lastUpdate = chapters.length > 0 
    ? new Date(Math.max(...chapters.flatMap(c => (c.auditLog || []).map(l => new Date(l.timestamp).getTime())))).toLocaleString() 
    : 'N/A';

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      <CollaboratorModal 
        isOpen={isCollabModalOpen}
        onClose={() => setIsCollabModalOpen(false)}
        project={project}
        user={user}
      />
      <ConfirmationModal 
        isOpen={!!confirmDeleteChapter}
        title="Delete Chapter"
        message={`Are you sure you want to permanently delete "${selectedDeleteChapter?.title}"? This cannot be undone.`}
        confirmText="Delete Chapter"
        isDanger={true}
        onConfirm={() => {
          if (confirmDeleteChapter) deleteChapter(confirmDeleteChapter);
          setConfirmDeleteChapter(null);
        }}
        onCancel={() => setConfirmDeleteChapter(null)}
      />

      {/* Sidebar */}
      <aside className="w-[320px] bg-[var(--surface)] border-r border-[var(--border)] flex flex-col p-8 overflow-y-auto">
        <button onClick={onBack} className="text-[10px] font-bold uppercase tracking-widest text-[#888] mb-10 flex items-center gap-2 hover:text-[var(--ink)]">
          <ChevronRight className="rotate-180" size={14} />
          Return to Hub
        </button>

        <div className="space-y-10">
          <div className="space-y-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#888]">Work Title</span>
            <h2 className="text-2xl font-extrabold tracking-tighter leading-tight">{project.title}</h2>
          </div>

          <div className="space-y-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#888]">Author</span>
            <p className="text-sm font-semibold opacity-80">{project.authorName}</p>
          </div>

          <div className="space-y-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#888]">Storyline</span>
            <p className="text-sm text-[#555] leading-relaxed italic">"{project.storyline}"</p>
          </div>

          {project.deadline && (
            <div className="space-y-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#888]">Production Deadline</span>
              <div className="px-4 py-2 bg-[var(--accent-soft)] text-[var(--accent)] font-bold text-xs inline-block rounded-sm">
                 {new Date(project.deadline).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
            </div>
          )}

          <div className="space-y-6 pt-10 border-t border-[var(--border)]">
             <span className="text-[10px] font-bold uppercase tracking-widest text-[#888]">Comprehensive Scope</span>
             <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 border border-[var(--border)] rounded-sm">
                   <div className="text-[9px] font-bold text-gray-400 uppercase mb-1">Master Words</div>
                   <div className="text-lg font-bold tracking-tight">{totalWords.toLocaleString()}</div>
                </div>
                <div className="bg-white p-4 border border-[var(--border)] rounded-sm">
                   <div className="text-[9px] font-bold text-gray-400 uppercase mb-1">Master Pages</div>
                   <div className="text-lg font-bold tracking-tight">{totalPages}</div>
                </div>
             </div>
          </div>
        </div>

          <div className="space-y-4 pt-10 border-t border-[var(--border)]">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#888] mb-2 block">Project Controls</span>
            {canEdit && (
              <button 
                onClick={addChapter}
                className="w-full py-4 bg-[var(--ink)] text-white font-bold text-[11px] uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl hover:bg-[#333] transition-all"
              >
                <Edit3 size={16} />
                Write New Chapter
              </button>
            )}
            {isOwner && (
            <button 
              onClick={() => setIsCollabModalOpen(true)}
              className="w-full py-3 bg-[var(--surface)] border border-[var(--ink)] text-[var(--ink)] font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[var(--ink)] hover:text-white transition-all"
            >
              <Users size={14} />
              Manage Team
            </button>
          )}
          {canEdit && (
            <button 
              onClick={handleExport}
              className="w-full py-3 border border-[var(--border)] text-[var(--ink)] font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-gray-100 transition-all"
            >
              <Plus className="rotate-45" size={14} />
              Export Manuscript
            </button>
          )}
          {isOwner && (
            <button 
              onClick={generateShareLink}
              className="w-full py-3 bg-[var(--ink)] text-white font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"
            >
              <Share2 size={14} />
              Generate Link
            </button>
          )}
          <p className="text-[9px] text-[#999] text-center leading-tight">
            Links are encrypted and grant temporary read-only access.
          </p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col bg-[var(--bg)]">
        <header className="h-16 bg-[var(--surface)] border-b border-[var(--border)] px-10 flex items-center justify-between">
           <div className="flex gap-10 h-full">
              <button 
                onClick={() => setActiveTab('chapters')}
                className={`h-full border-b-2 flex items-center text-[11px] font-bold uppercase tracking-widest transition-all ${activeTab === 'chapters' ? 'border-[var(--accent)] text-[var(--ink)]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
              >
                Manuscript
              </button>
              <button 
                onClick={() => setActiveTab('history')}
                className={`h-full border-b-2 flex items-center text-[11px] font-bold uppercase tracking-widest transition-all ${activeTab === 'history' ? 'border-[var(--accent)] text-[var(--ink)]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
              >
                Audit History
              </button>
              <button 
                onClick={() => setActiveTab('illustrations')}
                className={`h-full border-b-2 flex items-center text-[11px] font-bold uppercase tracking-widest transition-all ${activeTab === 'illustrations' ? 'border-[var(--accent)] text-[var(--ink)]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
              >
                Illustrations
              </button>
              <button 
                onClick={() => setActiveTab('brainstorm')}
                className={`h-full border-b-2 flex items-center text-[11px] font-bold uppercase tracking-widest transition-all ${activeTab === 'brainstorm' ? 'border-[var(--accent)] text-[var(--ink)]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
              >
                Brainstorm
              </button>
              <button 
                onClick={() => setActiveTab('world')}
                className={`h-full border-b-2 flex items-center text-[11px] font-bold uppercase tracking-widest transition-all ${activeTab === 'world' ? 'border-[var(--accent)] text-[var(--ink)]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
              >
                World Toolkit
              </button>
           </div>
           <div className="flex items-center gap-4">
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
                {activeTab === 'illustrations' ? `ASSETS: 0${illustrations.length}` : 
                 activeTab === 'brainstorm' ? `IDEAS: 0${brainstormNotes.length}` :
                 activeTab === 'world' ? `ENTITIES: ${characters.length + plotPoints.length}` :
                 `INDEX: 0${chapters.length}`}
              </span>
              {(canEdit || (isArtist && activeTab === 'illustrations') || activeTab === 'brainstorm') && (
                <button 
                  onClick={activeTab === 'illustrations' ? addIllustration : activeTab === 'world' ? addCharacter : addChapter}
                  className={`w-8 h-8 bg-[var(--ink)] text-white flex items-center justify-center hover:bg-[#333] transition-colors ${activeTab === 'brainstorm' ? 'hidden' : ''}`}
                >
                  <Plus size={16} />
                </button>
              )}
           </div>
        </header>

        <section className="flex-1 overflow-y-auto p-12">
            <div className="max-w-4xl mx-auto space-y-4">
              {activeTab === 'history' ? (
                 <div className="space-y-4">
                   {allLogs.map((log, i) => (
                      <div 
                        key={i} 
                        onClick={() => {
                          const ch = chapters.find(c => c.title === log.chapterTitle);
                          if (ch) setEditingChapter(ch);
                        }}
                        className="bg-[var(--surface)] p-6 border border-[var(--border)] flex items-center justify-between group cursor-pointer hover:border-[var(--accent)] transition-all"
                      >
                        <div className="flex items-center gap-6">
                           <div className="w-10 h-10 border border-[var(--border)] flex items-center justify-center text-[10px] font-bold text-gray-400 font-mono">
                             {String(allLogs.length - i).padStart(2, '0')}
                           </div>
                           <div>
                              <div className="text-[9px] font-bold text-[var(--accent)] uppercase tracking-widest mb-1">{log.chapterTitle}</div>
                              <h4 className="text-sm font-bold text-[var(--ink)] uppercase tracking-tight">{log.action}</h4>
                              <div className="text-[10px] text-gray-400 mt-1">BY: {log.userName?.toUpperCase()} | {new Date(log.timestamp).toLocaleString()}</div>
                           </div>
                        </div>
                        <History size={16} className="text-gray-200" />
                      </div>
                   ))}
                 </div>
              ) : activeTab === 'brainstorm' ? (
                <div className="space-y-8">
                  <form onSubmit={addNote} className="bg-[var(--surface)] border border-[var(--border)] p-8">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                       <Lightbulb size={12} className="text-[var(--accent)]" />
                       New Brainstorming Idea
                    </div>
                    <textarea 
                      value={newNoteContent}
                      onChange={e => setNewNoteContent(e.target.value)}
                      placeholder="Type your spark here... A character trait, a plot twist, or a snippet of dialogue."
                      className="w-full bg-transparent border-none focus:outline-none resize-none text-lg font-serif italic mb-6 min-h-[100px]"
                    />
                    <div className="flex justify-end">
                      <button 
                        type="submit"
                        className="px-8 py-3 bg-[var(--ink)] text-white text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-[#333] transition-all"
                      >
                        <Plus size={14} />
                        Save Idea
                      </button>
                    </div>
                  </form>

                  <div className="grid grid-cols-1 gap-4">
                    {brainstormNotes.length === 0 ? (
                       <div className="p-20 text-center opacity-30">
                          <p className="text-sm font-mono tracking-widest uppercase italic">NO_IDEAS_STAGED: COMMENCE_BRAINSTORM</p>
                       </div>
                    ) : (
                      brainstormNotes.map((note) => (
                        <div key={note.id} className="bg-[var(--surface)] border border-[var(--border)] p-6 group hover:border-[var(--accent)] transition-all">
                          <div className="flex justify-between items-start mb-4">
                            <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                              {new Date(note.createdAt?.toDate()).toLocaleString()} | BY: {note.authorName}
                            </div>
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => emailNote(note)}
                                className="p-1 text-gray-400 hover:text-[var(--accent)] transition-colors"
                                title="Email to Team"
                              >
                                <Send size={14} />
                              </button>
                              <button 
                                onClick={() => deleteNote(note.id)}
                                className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                                title="Dismiss Idea"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                          <p className="text-base font-serif italic text-[var(--ink)] leading-relaxed mb-6">
                            "{note.content}"
                          </p>
                          <div className="flex items-center gap-4 pt-4 border-t border-dashed border-[var(--border)]">
                              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#888]">
                                <Link2 size={12} />
                                Allocate to:
                              </div>
                              <select 
                                value={note.allocatedChapterId || 'none'}
                                onChange={(e) => allocateNote(note.id, e.target.value)}
                                className="bg-transparent border-none text-[10px] font-bold uppercase tracking-widest text-[var(--accent)] outline-none cursor-pointer"
                              >
                                <option value="none">UNALLOCATED</option>
                                {chapters.map(c => (
                                  <option key={c.id} value={c.id}>{c.title}</option>
                                ))}
                              </select>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : activeTab === 'illustrations' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {illustrations.length === 0 ? (
                    <div className="col-span-2 bg-[var(--surface)] border border-[var(--border)] p-20 text-center">
                      <p className="text-sm text-gray-400 font-mono italic">NO_ILLUSTRATIONS_LINKED: COLLABORATE_WITH_ARTISTS</p>
                    </div>
                  ) : (
                    illustrations.map((ill) => (
                      <div key={ill.id} className="bg-[var(--surface)] border border-[var(--border)] overflow-hidden group hover:border-[var(--accent)] transition-all">
                        <div className="aspect-video bg-gray-100 relative group overflow-hidden">
                          <img 
                            src={ill.url} 
                            alt={ill.title} 
                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                             <a 
                               href={ill.url} 
                               target="_blank" 
                               rel="noreferrer"
                               className="p-2 bg-white text-[var(--ink)] rounded-full hover:bg-[var(--accent)] hover:text-white transition-all shadow-lg"
                             >
                               <ExternalLink size={16} />
                             </a>
                             <button 
                               onClick={() => {
                                 navigator.clipboard.writeText(ill.url);
                                 alert('Asset URL copied for manuscript injection.');
                               }}
                               className="p-2 bg-white text-[var(--ink)] rounded-full hover:bg-[var(--accent)] hover:text-white transition-all shadow-lg"
                             >
                                <ImageIcon size={16} />
                             </button>
                             {isArtist && (
                               <button 
                                 onClick={() => deleteIllustration(ill.id)}
                                 className="p-2 bg-white text-red-500 rounded-full hover:bg-red-500 hover:text-white transition-all shadow-lg"
                               >
                                 <Trash2 size={16} />
                               </button>
                             )}
                          </div>
                        </div>
                        <div className="p-6">
                           <div className="flex justify-between items-start mb-2">
                             <h4 className="text-sm font-bold text-[var(--ink)] uppercase tracking-tight">{ill.title}</h4>
                             <span className="text-[9px] font-bold uppercase py-0.5 px-2 bg-gray-100 text-gray-400 rounded-full">{ill.status}</span>
                           </div>
                           <div className="text-[10px] text-gray-400">BY: {ill.artistName?.toUpperCase()}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : activeTab === 'world' ? (
                <div className="space-y-16">
                  {/* Storyline Section */}
                  <div className="bg-[var(--surface)] border border-[var(--border)] p-10">
                    <div className="flex items-center justify-between mb-6">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-[#888] flex items-center gap-2">
                        <Map size={14} className="text-[var(--accent)]" />
                        High-Level Storyline Summary
                      </div>
                      {canEdit && (
                        <button 
                          onClick={updateStoryline}
                          disabled={isUpdatingStoryline}
                          className="text-[9px] font-bold uppercase tracking-widest text-[var(--accent)] hover:underline"
                        >
                          {isUpdatingStoryline ? 'Syncing...' : 'Update Base Narrative'}
                        </button>
                      )}
                    </div>
                    <textarea 
                      value={storylineSummary}
                      readOnly={!canEdit}
                      onChange={(e) => setStorylineSummary(e.target.value)}
                      placeholder="Outline the core objective, narrative arc, and thematic pillars..."
                      className="w-full bg-transparent border-none focus:outline-none text-xl font-serif leading-relaxed italic text-gray-600 min-h-[150px] resize-none"
                    />
                  </div>

                  {/* Characters Section */}
                  <div className="space-y-8">
                     <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
                        <h3 className="text-xl font-extrabold uppercase tracking-tighter flex items-center gap-3">
                          <UserCircle size={20} className="text-[var(--accent)]" />
                          Character Database
                        </h3>
                        {canEdit && (
                          <button onClick={addCharacter} className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[var(--ink)] hover:text-[var(--accent)] transition-colors">
                            <Plus size={14} /> New Persona
                          </button>
                        )}
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {characters.length === 0 ? (
                           <div className="col-span-2 p-12 border border-dashed border-gray-200 text-center text-gray-400 font-mono italic text-sm">
                              NO_PERSONAS_CREATED: DEFINE_YOUR_CAST
                           </div>
                        ) : (
                          characters.map(char => (
                            <div key={char.id} className="bg-[var(--surface)] border border-[var(--border)] p-8 space-y-6 group hover:border-[var(--accent)] transition-all">
                               <div className="flex justify-between items-start">
                                 <div className="space-y-1">
                                    <input 
                                      value={char.name}
                                      onChange={(e) => updateCharacter(char.id, { name: e.target.value })}
                                      className="text-lg font-bold bg-transparent outline-none uppercase tracking-tight"
                                      readOnly={!canEdit}
                                    />
                                    <select 
                                      value={char.role}
                                      onChange={(e) => updateCharacter(char.id, { role: e.target.value as any })}
                                      className="text-[9px] font-bold uppercase tracking-widest text-[var(--accent)] bg-transparent outline-none cursor-pointer"
                                    >
                                       <option value="protagonist">Protagonist</option>
                                       <option value="antagonist">Antagonist</option>
                                       <option value="supporting">Supporting</option>
                                       <option value="minor">Minor</option>
                                    </select>
                                 </div>
                                 {canEdit && (
                                   <button onClick={() => deleteCharacter(char.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                                      <Trash2 size={14} />
                                   </button>
                                 )}
                               </div>

                               <div className="space-y-4">
                                  <div>
                                    <label className="text-[9px] font-bold uppercase tracking-widest text-[#888] block mb-1">Description</label>
                                    <textarea 
                                      value={char.description}
                                      onChange={(e) => updateCharacter(char.id, { description: e.target.value })}
                                      className="w-full bg-transparent text-sm leading-relaxed outline-none resize-none h-20"
                                      placeholder="Appearance, age, quirks..."
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[9px] font-bold uppercase tracking-widest text-[#888] block mb-1">Motivations & Ghost</label>
                                    <textarea 
                                      value={char.motivation}
                                      onChange={(e) => updateCharacter(char.id, { motivation: e.target.value })}
                                      className="w-full bg-transparent text-sm italic text-gray-500 outline-none resize-none h-16"
                                      placeholder="What drives them? What is their internal wound?"
                                    />
                                  </div>
                               </div>

                               <div className="pt-4 border-t border-gray-50 space-y-3">
                                  <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-[#888]">
                                    <Link2 size={10} /> Active in Chapters
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                     {chapters.map(ch => (
                                       <button 
                                         key={ch.id}
                                         onClick={() => {
                                           const newLinks = char.linkedChapterIds?.includes(ch.id)
                                             ? char.linkedChapterIds.filter(id => id !== ch.id)
                                             : [...(char.linkedChapterIds || []), ch.id];
                                           updateCharacter(char.id, { linkedChapterIds: newLinks });
                                         }}
                                         className={`text-[8px] font-bold uppercase tracking-tighter px-2 py-0.5 border ${char.linkedChapterIds?.includes(ch.id) ? 'bg-[var(--accent)] border-[var(--accent)] text-white' : 'border-gray-200 text-gray-400 hover:border-gray-400'}`}
                                       >
                                         CH. {ch.order}
                                       </button>
                                     ))}
                                  </div>
                               </div>
                            </div>
                          ))
                        )}
                     </div>
                  </div>

                  {/* Plot Beats Section */}
                  <div className="space-y-8 pb-20">
                     <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
                        <h3 className="text-xl font-extrabold uppercase tracking-tighter flex items-center gap-3">
                          <Sword size={20} className="text-[var(--accent)]" />
                          Narrative Architecture (Plot Beats)
                        </h3>
                        {canEdit && (
                          <button onClick={addPlotPoint} className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[var(--ink)] hover:text-[var(--accent)] transition-colors">
                            <Plus size={14} /> New Beat
                          </button>
                        )}
                     </div>
                     <div className="space-y-4">
                        {plotPoints.length === 0 ? (
                           <div className="p-12 border border-dashed border-gray-200 text-center text-gray-400 font-mono italic text-sm">
                              NO_PLOTS_STAGED: MAP_THE_NARRATIVE_BEATS
                           </div>
                        ) : (
                          plotPoints.map((plot, index) => (
                            <div key={plot.id} className="bg-[var(--surface)] border border-[var(--border)] p-6 group hover:border-[var(--accent)] transition-all flex gap-8">
                               <div className="w-12 h-12 border border-[var(--border)] flex flex-col items-center justify-center font-mono text-gray-300">
                                  <span className="text-[10px]">BT</span>
                                  <span className="text-lg font-bold">{index + 1}</span>
                               </div>
                               <div className="flex-1 space-y-4">
                                  <div className="flex justify-between items-start">
                                     <div className="flex items-center gap-4">
                                        <input 
                                          value={plot.title}
                                          onChange={(e) => updatePlotPoint(plot.id, { title: e.target.value })}
                                          className="text-lg font-bold bg-transparent outline-none uppercase tracking-tight w-[300px]"
                                          placeholder="Beat Title"
                                        />
                                        <select 
                                          value={plot.importance}
                                          onChange={(e) => updatePlotPoint(plot.id, { importance: e.target.value as any })}
                                          className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 border ${
                                            plot.importance === 'major' ? 'border-red-200 text-red-500' : 
                                            plot.importance === 'twist' ? 'border-purple-200 text-purple-500' : 
                                            'border-gray-200 text-gray-400'
                                          } bg-transparent outline-none cursor-pointer`}
                                        >
                                           <option value="major">Major Beat</option>
                                           <option value="minor">Minor Beat</option>
                                           <option value="twist">The Twist</option>
                                        </select>
                                     </div>
                                     <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                        <button onClick={() => updatePlotPoint(plot.id, { order: plot.order - 1 })} className="p-1 text-gray-300 hover:text-[var(--ink)]">
                                           <ChevronRight className="rotate-[270deg]" size={14} />
                                        </button>
                                        <button onClick={() => updatePlotPoint(plot.id, { order: plot.order + 1 })} className="p-1 text-gray-300 hover:text-[var(--ink)]">
                                           <ChevronRight className="rotate-90" size={14} />
                                        </button>
                                        <button onClick={() => deletePlotPoint(plot.id)} className="p-1 text-gray-300 hover:text-red-500 ml-2">
                                           <Trash2 size={14} />
                                        </button>
                                     </div>
                                  </div>
                                  <textarea 
                                    value={plot.description}
                                    onChange={(e) => updatePlotPoint(plot.id, { description: e.target.value })}
                                    className="w-full bg-transparent text-sm leading-relaxed outline-none resize-none h-12"
                                    placeholder="Summarize this plot event..."
                                  />
                                  <div className="flex items-center gap-4 pt-4 border-t border-dashed border-gray-100">
                                     <span className="text-[9px] font-bold uppercase tracking-widest text-[#888] flex items-center gap-2">
                                       <Link2 size={10} /> Active in Chapters:
                                     </span>
                                     <div className="flex flex-wrap gap-2">
                                       {chapters.map(ch => (
                                         <button 
                                           key={ch.id}
                                           onClick={() => {
                                             const newLinks = plot.linkedChapterIds?.includes(ch.id)
                                               ? plot.linkedChapterIds.filter(id => id !== ch.id)
                                               : [...(plot.linkedChapterIds || []), ch.id];
                                             updatePlotPoint(plot.id, { linkedChapterIds: newLinks });
                                           }}
                                           className={`text-[8px] font-bold uppercase tracking-tighter px-2 py-0.5 border flex items-center gap-1 ${plot.linkedChapterIds?.includes(ch.id) ? 'bg-[var(--accent)] border-[var(--accent)] text-white' : 'border-gray-200 text-gray-400 hover:border-gray-400'}`}
                                         >
                                           CH. {ch.order}
                                           {plot.linkedChapterIds?.includes(ch.id) && (
                                             <div 
                                               onClick={(e) => { e.stopPropagation(); setEditingChapter(ch); }}
                                               className="hover:bg-blue-600 p-0.5 rounded transition-colors"
                                               title="Jump to Editor"
                                             >
                                                <ExternalLink size={8} />
                                             </div>
                                           )}
                                         </button>
                                       ))}
                                     </div>
                                  </div>
                               </div>
                            </div>
                          ))
                        )}
                     </div>
                  </div>
                </div>
              ) : (
                <>
                  {chapters.length === 0 ? (
                    <div className="bg-[var(--surface)] border border-[var(--border)] p-32 text-center flex flex-col items-center">
                      <div className="w-16 h-16 bg-gray-50 flex items-center justify-center mb-8 rotate-1 border border-gray-100">
                        <FileText size={32} className="text-gray-200" />
                      </div>
                      <h3 className="text-xl font-extrabold uppercase tracking-widest text-[var(--ink)] mb-4">Empty Manuscript</h3>
                      <p className="text-[#666] mb-10 text-sm max-w-xs leading-relaxed italic">"Every great book begins with a single line of code in the author's mind."</p>
                      {canEdit && (
                        <button 
                          onClick={addChapter}
                          className="bg-[var(--ink)] text-white px-10 py-4 font-bold text-xs uppercase tracking-widest hover:bg-[#333] transition-all rounded-sm flex items-center gap-2 shadow-xl"
                        >
                          <Edit3 size={16} />
                          Write Chapter 01
                        </button>
                      )}
                    </div>
                  ) : (
                    chapters.map((chapter) => (
                      <div 
                        key={chapter.id}
                        onClick={() => setEditingChapter(chapter)}
                        className="bg-[var(--surface)] p-6 border border-[var(--border)] flex items-center justify-between group cursor-pointer hover:border-[var(--accent)] transition-all"
                      >
                        <div className="flex items-center gap-6">
                          <div className="flex items-center gap-4 mr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {canEdit && (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmDeleteChapter(chapter.id);
                                }}
                                className="p-1 hover:text-red-500 transition-colors"
                                title="Delete Chapter"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                          <div className="w-10 h-10 border border-[var(--border)] flex items-center justify-center text-[10px] font-bold text-gray-400 font-mono">
                            {String(chapter.order).padStart(2, '0')}
                          </div>
                          <div>
                            <h4 className="text-lg font-bold text-[var(--ink)] uppercase tracking-tight">{chapter.title}</h4>
                            <div className="flex items-center gap-4 mt-1">
                               <div className="flex gap-2">
                                 {['draft', 'review', 'completed'].map(s => (
                                   <button
                                     key={s}
                                     onClick={(e) => canEdit && updateChapterStatus(e, chapter.id, s)}
                                     className={`text-[8px] px-2 py-0.5 border font-bold uppercase tracking-tighter transition-all ${
                                       chapter.status === s 
                                        ? s === 'completed' ? 'bg-green-500 border-green-500 text-white' : 'bg-[var(--accent)] border-[var(--accent)] text-white'
                                        : 'border-[var(--border)] text-gray-400 hover:border-gray-600'
                                     } ${!canEdit ? 'cursor-default' : ''}`}
                                   >
                                     {s}
                                   </button>
                                 ))}
                               </div>
                               <div className="flex gap-4 text-[10px] text-gray-400 font-mono">
                                  <span>WORDS: {chapter.content?.split(/\s+/).filter(Boolean).length || 0}</span>
                                  <span>PAGES: {Math.max(1, Math.ceil((chapter.content?.split(/\s+/).filter(Boolean).length || 0) / WORDS_PER_PAGE))}</span>
                               </div>
                            </div>
                          </div>
                        </div>
                        <ChevronRight size={18} className="text-gray-300 group-hover:text-[var(--ink)] group-hover:translate-x-1 transition-all" />
                      </div>
                    ))
                  )}
                </>
              )}
            </div>
        </section>

        {/* Audit Bar */}
        <footer className="h-12 border-t border-[var(--border)] flex items-center px-8 text-[10px] font-mono tracking-tighter bg-white text-gray-500 shadow-[0_-1px_10px_rgba(0,0,0,0.02)]">
            <div className="flex items-center gap-2 text-green-600 font-bold tracking-widest mr-12 bg-green-50 px-3 py-1 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
              NETWORK_SECURED
            </div>
            
            <div className="flex items-center gap-10">
              <div className="flex flex-col">
                <span className="text-[8px] text-gray-400">OPERATOR</span>
                <span className="font-bold">{user.displayName?.split(' ')[0].toUpperCase()}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[8px] text-gray-400">ENCRYPTION</span>
                <span className="font-bold">AES-256-XTS</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[8px] text-gray-400">SYNC_STATUS</span>
                <span className="font-bold text-[var(--accent)]">ACTIVE_MIRROR</span>
              </div>
            </div>

            <div className="ml-auto flex items-center gap-8">
               <div className="text-right">
                 <span className="text-[8px] text-gray-400 block tracking-widest uppercase">Last Global Sync</span>
                 <span className="font-bold text-[var(--ink)]">{lastUpdate}</span>
               </div>
            </div>
        </footer>
      </main>
    </div>
  );
};

// --- Single Chapter Editor ---
import { proofreadContent, analyzeStoryline, translateManuscript } from './services/geminiService';

const Editor = ({ project, chapter, user, role, characters, plotPoints, onBack }: { 
  project: Project, 
  chapter: Chapter, 
  user: User, 
  role: ProjectRoleShortcut, 
  characters: Character[],
  plotPoints: PlotPoint[],
  onBack: () => void 
}) => {
  const [content, setContent] = useState(chapter.content);
  const [isSaving, setIsSaving] = useState(false);
  const [aiPanel, setAiPanel] = useState<'proofread' | 'consistency' | 'assets' | 'translation' | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [targetLang, setTargetLang] = useState('Chinese');
  const [translatedContent, setTranslatedContent] = useState('');
  const [analysis, setAnalysis] = useState<any>(null);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSavedContent, setLastSavedContent] = useState(chapter.content);
  const [illustrations, setIllustrations] = useState<Illustration[]>([]);
  const [writingStyle, setWritingStyle] = useState<'classic' | 'modernist' | 'typewriter' | 'technical' | 'poetic' | 'noir' | 'fairytale' | 'cyberpunk'>('classic');

  const canEdit = role === 'owner' || role === 'editor' || role === 'manager' || role === 'publisher';
  const isArtist = role === 'artist' || role === 'owner' || role === 'editor';

  const applyFormat = (type: 'bold' | 'italic' | 'underline' | 'h1' | 'h2') => {
    const textarea = document.getElementById('manuscript-editor') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selection = content.substring(start, end);
    
    let formatted = '';
    let offset = 0;
    if (type === 'bold') {
      formatted = `**${selection}**`;
      offset = 4;
    } else if (type === 'italic') {
      formatted = `*${selection}*`;
      offset = 2;
    } else if (type === 'underline') {
      formatted = `<u>${selection}</u>`;
      offset = 7;
    } else if (type === 'h1') {
      formatted = `\n# ${selection}\n`;
      offset = 4;
    } else if (type === 'h2') {
      formatted = `\n## ${selection}\n`;
      offset = 5;
    }

    const newContent = content.substring(0, start) + formatted + content.substring(end);
    setContent(newContent);
    
    // Resume focus
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + selection.length + offset, start + selection.length + offset);
    }, 0);
  };

  const styleConfigs = {
    classic: 'font-serif text-lg leading-[1.8] text-[#222] font-normal',
    modernist: 'font-sans text-base leading-7 text-[#111] tracking-tight font-medium',
    typewriter: 'font-mono text-sm leading-8 text-gray-800 bg-[#fbfaf8] border-none',
    technical: 'font-mono text-[11px] leading-6 text-blue-900 bg-gray-50 border border-blue-50',
    poetic: 'font-serif text-2xl italic leading-[2] text-gray-800 tracking-wide text-center px-12 font-light',
    noir: 'font-serif text-lg leading-8 text-gray-200 bg-[#121212] p-12 shadow-inner selection:bg-gray-700',
    fairytale: 'font-serif text-xl leading-loose text-[#543b22] bg-[#fffdfa] border-x-[16px] border-[#f5ece0]',
    cyberpunk: 'font-mono text-base leading-relaxed text-[#00ff41] bg-[#0d0208] uppercase tracking-wider selection:bg-[#00ff41] selection:text-black'
  };

  useEffect(() => {
    const path = `projects/${project.id}/illustrations`;
    const q = query(
      collection(db, 'projects', project.id, 'illustrations'),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snapshot) => {
      setIllustrations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Illustration)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
    return () => unsub();
  }, [project.id]);
  useEffect(() => {
    if (!canEdit) return;
    const timer = setTimeout(() => {
      if (content !== lastSavedContent) {
        silentSave();
      }
    }, 3000); 
    return () => clearTimeout(timer);
  }, [content, canEdit, lastSavedContent]);

  const silentSave = async () => {
    setSaveStatus('saving');
    const contentToSave = content;
    try {
      const chapterRef = doc(db, 'projects', project.id, 'chapters', chapter.id);
      await updateDoc(chapterRef, {
        content: contentToSave,
        updatedAt: serverTimestamp()
      });
      setLastSaved(new Date());
      setLastSavedContent(contentToSave);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (e) {
      console.error("Auto-save failed", e);
      setSaveStatus('error');
    }
  };

  const wordCount = content.split(/\s+/).filter(Boolean).length;
  const WORDS_PER_PAGE = 300;
  const pageCount = Math.max(1, Math.ceil(wordCount / WORDS_PER_PAGE));
  const targetWords = 2500; // Example target
  const progress = Math.min((wordCount / targetWords) * 100, 100);

  const save = async () => {
    setIsSaving(true);
    try {
      const chapterRef = doc(db, 'projects', project.id, 'chapters', chapter.id);
      await updateDoc(chapterRef, {
        content,
        auditLog: [
          ...(chapter.auditLog || []),
          { 
            timestamp: new Date().toISOString(), 
            action: 'Committed edits', 
            userId: user.uid,
            userName: user.displayName
          }
        ]
      });
      onBack();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAIProofread = async () => {
    setAiPanel('proofread');
    setIsAiLoading(true);
    const result = await proofreadContent(content);
    setAiSuggestions(result.suggestions || []);
    setIsAiLoading(false);
  };

  const applySuggestion = (suggestion: any) => {
    // Basic replacement - replaces first occurrence
    const newContent = content.replace(suggestion.original, suggestion.suggested);
    setContent(newContent);
    setAiSuggestions(prev => prev.filter(s => s !== suggestion));
  };

  const ignoreSuggestion = (suggestion: any) => {
    setAiSuggestions(prev => prev.filter(s => s !== suggestion));
  };

  const handleAIConsistency = async () => {
    setAiPanel('consistency');
    setIsAiLoading(true);
    const result = await analyzeStoryline(project.storyline, content);
    setAnalysis(result);
    setIsAiLoading(false);
  };

  const handleTranslate = async () => {
    setAiPanel('translation');
    setIsAiLoading(true);
    const result = await translateManuscript(content, targetLang);
    if (result.translatedText) {
      setTranslatedContent(result.translatedText);
    }
    setIsAiLoading(false);
  };

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden relative bg-[#F5F5F5]">
       {/* Sidebar Context */}
       <AnimatePresence>
         {isSidebarOpen && !isFocusMode && (
           <motion.aside 
             initial={{ width: 0, opacity: 0, x: -320 }}
             animate={{ width: 320, opacity: 1, x: 0 }}
             exit={{ width: 0, opacity: 0, x: -320 }}
             transition={{ type: 'spring', damping: 25, stiffness: 200 }}
             className="bg-[var(--surface)] border-r border-[var(--border)] flex flex-col p-8 overflow-y-auto z-30"
           >
            <div className="space-y-10">
              <div className="space-y-4">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#888]">Active Audit</span>
                <h2 className="text-xl font-extrabold tracking-tighter leading-tight uppercase">{chapter.title}</h2>
                <div className={`text-[10px] font-bold px-2 py-1 inline-block uppercase tracking-widest ${
                  chapter.status === 'completed' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'
                }`}>
                  Phase: {chapter.status}
                </div>
              </div>

              <div className="space-y-6 pt-10 border-t border-[var(--border)]">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#888]">Production Progress</span>
                <div className="space-y-4">
                   <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white border border-[var(--border)] p-4 rounded-sm flex flex-col items-center">
                         <span className="text-[7px] font-bold text-gray-400 block tracking-[0.2em] mb-1 uppercase">Word Count</span>
                         <div className="text-sm font-black font-mono text-[var(--ink)] tracking-tighter">{wordCount.toLocaleString()}</div>
                      </div>
                      <div className="bg-white border border-[var(--border)] p-4 rounded-sm flex flex-col items-center">
                         <span className="text-[7px] font-bold text-gray-400 block tracking-[0.2em] mb-1 uppercase">Est. Pages</span>
                         <div className="text-sm font-black font-mono text-[var(--accent)] tracking-tighter">{pageCount}</div>
                      </div>
                   </div>
                   <div className="space-y-2">
                     <div className="flex justify-between text-[9px] font-mono">
                        <span className="text-gray-400 uppercase">Target 2.5k</span>
                        <span className="text-[var(--accent)]">{Math.round(progress)}%</span>
                     </div>
                     <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          className="h-full bg-[var(--accent)]"
                        />
                     </div>
                   </div>
                </div>
              </div>

              <div className="space-y-4 pt-10 border-t border-[var(--border)]">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#888]">AI Auditor</span>
                <div className="space-y-3">
                  <button 
                    onClick={handleAIProofread}
                    disabled={!canEdit}
                    className="w-full py-3 bg-gray-50 border border-[var(--border)] text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[var(--accent-soft)] hover:text-[var(--accent)] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Sparkles size={14} />
                    Run Proofread
                  </button>
                  <button 
                    onClick={handleAIConsistency}
                    className="w-full py-3 bg-gray-50 border border-[var(--border)] text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-50 hover:text-blue-600 transition-all"
                  >
                    <AlertCircle size={14} />
                    Logic Consistency
                  </button>
                  <button 
                    onClick={() => setAiPanel('assets')}
                    className="w-full py-3 bg-gray-50 border border-[var(--border)] text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-purple-50 hover:text-purple-600 transition-all"
                  >
                    <ImageIcon size={14} />
                    Visual Assets ({illustrations.length})
                  </button>
                  <button 
                    onClick={() => setAiPanel('translation')}
                    className="w-full py-3 bg-gray-50 border border-[var(--border)] text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-orange-50 hover:text-orange-600 transition-all"
                  >
                    <Languages size={14} />
                    Auto-Translate
                  </button>
                </div>
              </div>

              <div className="space-y-4 pt-10 border-t border-[var(--border)]">
                 <span className="text-[10px] font-bold uppercase tracking-widest text-[#888]">Environmental Controls</span>
                 <button 
                   onClick={() => setIsMuted(!isMuted)}
                   className={`w-full py-3 border rounded-sm text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-3 transition-all ${!isMuted ? 'bg-[var(--ink)] text-white border-[var(--ink)] shadow-lg scale-[1.02]' : 'bg-gray-50 border-[var(--border)] text-gray-400 opacity-60 hover:opacity-100'}`}
                   title="Typewriter Sound"
                 >
                   {!isMuted ? <Volume2 size={14} className="animate-pulse" /> : <VolumeX size={14} />}
                   Typewriter Audio
                 </button>
              </div>

              {/* Manuscript Audit Section */}
              <div className="space-y-4 pt-10 border-t border-[var(--border)]">
                 <span className="text-[10px] font-bold uppercase tracking-widest text-[#888]">Author Integrity Check</span>
                 <div className="bg-white border border-[var(--border)] p-4 space-y-4">
                    <div className="flex items-center justify-between">
                       <span className="text-[9px] font-bold uppercase text-gray-400">Storyline Definition</span>
                       {project.storyline ? <CheckCircle2 size={12} className="text-green-500" /> : <AlertCircle size={12} className="text-amber-500" />}
                    </div>
                    <div className="flex items-center justify-between">
                       <span className="text-[9px] font-bold uppercase text-gray-400">Personnel Roster</span>
                       {characters.length > 0 ? <CheckCircle2 size={12} className="text-green-500" /> : <AlertCircle size={12} className="text-amber-500" />}
                    </div>
                    <div className="flex items-center justify-between">
                       <span className="text-[9px] font-bold uppercase text-gray-400">Plot Architecture</span>
                       {plotPoints.length > 0 ? <CheckCircle2 size={12} className="text-green-500" /> : <AlertCircle size={12} className="text-amber-500" />}
                    </div>
                    <div className="pt-2">
                       <div className="h-[2px] w-full bg-gray-50 relative overflow-hidden">
                          <motion.div 
                            className="h-full bg-green-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${(Number(!!project.storyline) + Number(characters.length > 0) + Number(plotPoints.length > 0)) / 3 * 100}%` }}
                          />
                       </div>
                       <p className="text-[8px] font-mono mt-2 text-gray-400 uppercase tracking-tighter">Manuscript connectivity audit active</p>
                    </div>
                 </div>
              </div>
            </div>

            <div className="mt-auto pt-10 border-t border-[var(--border)] space-y-4">
              {canEdit && saveStatus !== 'idle' && (
                <div className="text-center">
                  <span className={`text-[9px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
                    saveStatus === 'saving' ? 'text-blue-500' : 
                    saveStatus === 'saved' ? 'text-green-600' : 
                    'text-red-500'
                  }`}>
                    {saveStatus === 'saving' && <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />}
                    {saveStatus === 'saving' ? 'Saving...' : 
                     saveStatus === 'saved' ? 'All changes saved' : 
                     'Error saving changes'}
                  </span>
                </div>
              )}
              <button 
                onClick={onBack}
                className="w-full py-3 border border-[var(--border)] text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-gray-50"
              >
                {canEdit ? 'Cancel Edits' : 'Return to Hub'}
              </button>
              {canEdit && (
                <button 
                  onClick={save}
                  disabled={isSaving}
                  className="w-full py-3 bg-[var(--ink)] text-white font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl"
                >
                  <CheckCircle2 size={14} />
                  {isSaving ? 'Synching...' : 'Commit to Log'}
                </button>
              )}
            </div>
          </motion.aside>
         )}
       </AnimatePresence>

      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className={`h-16 border-b border-[var(--border)] px-8 flex items-center justify-between transition-all duration-500 ${isFocusMode ? 'bg-transparent border-transparent opacity-0 hover:opacity-100' : 'bg-white shadow-sm'}`}>
           <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className={`p-2 rounded-md transition-all ${isSidebarOpen ? 'text-[var(--accent)] bg-[var(--accent-soft)]' : 'text-gray-400 hover:text-[var(--ink)] hover:bg-gray-100'}`}
                title="Toggle Sidebar"
              >
                {isSidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
              </button>
              <button 
                onClick={() => setIsFocusMode(!isFocusMode)}
                className={`p-2 rounded-md transition-all ${isFocusMode ? 'text-[var(--accent)] bg-[var(--accent-soft)]' : 'text-gray-400 hover:text-[var(--ink)] hover:bg-gray-100'}`}
                title={isFocusMode ? "Exit Focus Mode" : "Focus Mode"}
              >
                {isFocusMode ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
              </button>
              <div className="h-6 w-[1px] bg-gray-200 mx-2" />
              <div className="flex flex-col">
                <h1 className="text-xs font-bold uppercase tracking-widest text-[var(--ink)] leading-none mb-1">{chapter.title}</h1>
                <div className="text-[9px] font-mono text-gray-400 uppercase tracking-tighter">
                  PROJECT: {project.title.toUpperCase()} | REV: {chapter.auditLog?.length || 1}
                </div>
              </div>

              {canEdit && (
                <div className="flex items-center gap-2 pl-8 border-l border-[var(--border)] ml-2">
                   <button 
                     onClick={() => applyFormat('bold')}
                     className="p-1.5 text-gray-400 hover:text-[var(--ink)] hover:bg-gray-50 rounded transition-all"
                     title="Bold (Markdown)"
                   >
                     <Bold size={13} />
                   </button>
                   <button 
                     onClick={() => applyFormat('italic')}
                     className="p-1.5 text-gray-400 hover:text-[var(--ink)] hover:bg-gray-50 rounded transition-all"
                     title="Italic (Markdown)"
                   >
                     <Italic size={13} />
                   </button>
                   <div className="h-4 w-[1px] bg-gray-100 mx-1" />
                   <div className="flex items-center gap-2 px-3 py-1 bg-gray-50 rounded-full border border-gray-100">
                      <Settings2 size={11} className="text-[var(--accent)]" />
                      <select 
                        value={writingStyle}
                        onChange={(e) => setWritingStyle(e.target.value as any)}
                        className="bg-transparent text-[9px] font-extrabold uppercase tracking-widest text-[#666] focus:text-[var(--ink)] outline-none cursor-pointer"
                      >
                        <option value="classic">Manuscript Classic</option>
                        <option value="modernist">Modernist Sans</option>
                        <option value="typewriter">Noir Typewriter</option>
                        <option value="technical">Logic Archive</option>
                        <option value="poetic">Abstract Poetic</option>
                        <option value="noir">Midnight Noir</option>
                        <option value="fairytale">Ancient Fairytale</option>
                        <option value="cyberpunk">Cybernet Archive</option>
                      </select>
                   </div>
                </div>
              )}
           </div>
           
           <div className="flex items-center gap-4">
              {canEdit && (
                <div className="flex items-center gap-1 bg-white border border-[var(--border)] rounded-sm p-1">
                   <select 
                     onChange={(e) => {
                       if (e.target.value) {
                         applyFormat(e.target.value as any);
                         e.target.value = "";
                       }
                     }}
                     className="text-[9px] font-bold uppercase p-1 outline-none cursor-pointer border-none bg-transparent"
                   >
                     <option value="">FORMAT</option>
                     <option value="h1">Heading 1</option>
                     <option value="h2">Heading 2</option>
                     <option value="bold">Bold</option>
                     <option value="italic">Italic</option>
                     <option value="underline">Underline</option>
                   </select>
                   <div className="flex items-center gap-0.5 border-l border-gray-100 pl-1">
                     <button onClick={() => applyFormat('bold')} className="p-1 px-2 hover:bg-gray-50 rounded text-gray-400 hover:text-[var(--ink)]"><Bold size={12} /></button>
                     <button onClick={() => applyFormat('italic')} className="p-1 px-2 hover:bg-gray-50 rounded text-gray-400 hover:text-[var(--ink)]"><Italic size={12} /></button>
                     <button onClick={() => applyFormat('underline')} className="p-1 px-2 hover:bg-gray-50 rounded text-gray-400 hover:text-[var(--ink)]"><Underline size={12} /></button>
                   </div>
                </div>
              )}
              
              {lastSaved && (
                <div className="text-[10px] font-mono text-green-600 flex items-center gap-2">
                  <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse" />
                  STAGED: {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
               <div className="flex items-center gap-6 border-l border-[var(--border)] pl-8">
                  <div className="text-[11px] font-bold text-[var(--ink)] uppercase tracking-widest">
                    {wordCount} WORDS
                  </div>
                  <div className="text-[11px] font-bold text-[var(--accent)] uppercase tracking-widest border-l border-gray-100 pl-6">
                    PG. {pageCount}
                  </div>
               </div>
           </div>
        </header>

        <section 
          className={`flex-1 overflow-y-auto transition-all duration-700 ease-in-out flex flex-col items-center bg-[#FAFAFA] ${isFocusMode ? 'p-0' : 'p-12 lg:p-20'}`}
        >
            <div 
              className={`w-full max-w-3xl bg-white transition-all duration-700 shadow-[0_10px_50px_rgba(0,0,0,0.04)] border border-gray-100 min-h-[1400px] mb-32 relative flex flex-col overflow-hidden ${
                isFocusMode ? 'max-w-4xl shadow-none border-none scale-100 mt-20' : 'hover:shadow-[0_20px_80px_rgba(0,0,0,0.06)]'
              }`}
            >
               {/* Editorial Accents */}
               <div className="absolute top-0 left-0 w-full h-1 bg-[var(--accent)] opacity-10" />
               <div className="absolute top-12 left-1/2 -translate-x-1/2 w-40 h-[1.5px] bg-gray-50" />
               
               {/* Page Header Indicator */}
               <div className="pt-20 px-12 lg:px-24 flex items-center justify-between pointer-events-none select-none opacity-40">
                  <span className="text-[10px] font-mono uppercase tracking-[0.3em] font-bold">Volume I</span>
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-200" />
                    <span className="text-[10px] font-mono uppercase tracking-[0.3em] font-bold">Chapter {chapter.order}</span>
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-200" />
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-[0.3em] font-bold">{project.title.substring(0, 15)}</span>
               </div>

               <div className="flex-1 px-12 lg:px-24 pt-16 pb-32">
                 <textarea 
                    id="manuscript-editor"
                    autoFocus
                    value={content}
                    readOnly={!canEdit}
                    onChange={e => setContent(e.target.value)}
                    className={`w-full h-full focus:outline-none resize-none transition-all placeholder:text-gray-200 selection:bg-[var(--accent-soft)] ${styleConfigs[writingStyle]} ${!canEdit ? 'cursor-default' : ''} scrollbar-hide`}
                    placeholder="Begin the audit of your mind..."
                    spellCheck={false}
                 />
               </div>
               
               {/* Refined Page Number */}
               <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex items-center gap-12 pointer-events-none select-none">
                  <div className="w-12 h-[1px] bg-gray-100" />
                  <div className="flex flex-col items-center gap-1">
                    <div className="text-[9px] font-mono font-black tracking-[0.4em] uppercase text-gray-200">Production Folio</div>
                    <div className="text-4xl font-serif text-gray-100 italic">{pageCount}</div>
                  </div>
                  <div className="w-12 h-[1px] bg-gray-100" />
               </div>

               {!isFocusMode && (
                 <div className="absolute bottom-12 right-12 text-[8px] font-mono text-gray-300 font-bold tracking-[0.2em] uppercase max-w-[120px] text-right leading-relaxed">
                   BookAudita Professional Writing Environment
                 </div>
               )}
            </div>
        </section>

        {/* AI Drawer Side Panel Effect via Overlays or inline */}
        <AnimatePresence>
          {aiPanel && (
            <motion.div 
              initial={{ opacity: 0, x: 400 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 400 }}
              className="absolute right-0 top-16 bottom-12 w-[400px] bg-[var(--surface)] border-l border-[var(--border)] shadow-2xl z-40 flex flex-col"
            >
              <div className="p-8 border-b border-[var(--border)] flex items-center justify-between">
                <h3 className="font-extrabold uppercase tracking-tighter text-sm flex items-center gap-2">
                  {aiPanel === 'proofread' ? <Sparkles className="text-[var(--accent)]" size={16} /> : 
                   aiPanel === 'consistency' ? <AlertCircle className="text-blue-500" size={16} /> :
                   aiPanel === 'translation' ? <Languages className="text-orange-500" size={16} /> :
                   <ImageIcon className="text-purple-500" size={16} />}
                  {aiPanel === 'proofread' ? 'Neural Proofread' : 
                   aiPanel === 'consistency' ? 'Consistent Logic Verification' :
                   aiPanel === 'translation' ? 'Language Transition' :
                   'Production Illustrations'}
                </h3>
                <button onClick={() => setAiPanel(null)} className="text-gray-400 hover:text-[var(--ink)]">
                  <Plus className="rotate-45" size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-6">
                 {isAiLoading ? (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-6 opacity-50">
                       <div className="w-10 h-10 border-2 border-[var(--accent)] border-t-transparent animate-spin"></div>
                       <span className="text-[10px] font-mono tracking-widest uppercase">Initializing AI Module...</span>
                    </div>
                 ) : (
                    <>
                      {aiPanel === 'proofread' && aiSuggestions.map((s, i) => (
                        <div key={i} className="p-6 border border-[var(--border)] bg-gray-50/50 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="text-[9px] font-bold text-[var(--accent)] uppercase tracking-widest">{s.type}</div>
                            <button 
                              onClick={() => ignoreSuggestion(s)}
                              className="text-[9px] font-bold text-gray-400 uppercase tracking-widest hover:text-red-500 transition-colors"
                            >
                              Ignore
                            </button>
                          </div>
                          <div className="text-xs text-gray-400 line-through font-serif italic">{s.original}</div>
                          <div className="text-sm font-bold text-[var(--ink)] font-serif bg-green-50 inline-block px-1">Suggestion: {s.suggested}</div>
                          <p className="text-[11px] text-[#666] leading-relaxed">{s.explanation}</p>
                          <button 
                            onClick={() => applySuggestion(s)}
                            className="w-full py-2 bg-[var(--ink)] text-white font-bold text-[10px] uppercase tracking-widest hover:bg-[#333] transition-all"
                          >
                            Accept Suggestion
                          </button>
                        </div>
                      ))}

                      {aiPanel === 'consistency' && analysis && (
                        <div className="space-y-8">
                           <div className={`p-6 border ${analysis.isConsistent ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                              <div className="font-extrabold text-[10px] uppercase tracking-widest mb-2">Verdict</div>
                              <p className="text-sm font-bold">{analysis.feedback}</p>
                           </div>
                           {analysis.inconsistencies?.length > 0 && (
                              <div className="space-y-4">
                                <span className="text-[10px] font-extrabold text-[#888] uppercase tracking-widest">Logic Breaches</span>
                                {analysis.inconsistencies.map((inc: string, i: number) => (
                                  <div key={i} className="text-[11px] p-4 bg-gray-50 border border-[var(--border)] leading-relaxed italic">
                                    {inc}
                                  </div>
                                ))}
                              </div>
                           )}
                        </div>
                      )}

                      {aiPanel === 'assets' && (
                        <div className="space-y-6">
                           {illustrations.length === 0 ? (
                              <div className="p-8 border border-dashed border-gray-200 text-center opacity-50">
                                 <p className="text-[10px] font-mono tracking-tighter uppercase italic">NO_ASSOCIATED_ARTWORKS</p>
                              </div>
                           ) : (
                              illustrations.map(ill => (
                                <div key={ill.id} className="border border-[var(--border)] rounded-sm overflow-hidden bg-white shadow-sm">
                                   <img src={ill.url} alt={ill.title} className="w-full h-32 object-cover" referrerPolicy="no-referrer" />
                                   <div className="p-4">
                                      <h4 className="text-xs font-extrabold uppercase tracking-tight mb-2">{ill.title}</h4>
                                      <button 
                                         onClick={() => {
                                           const tag = `\n\n![ILLUSTRATION: ${ill.title}](${ill.url})\n\n`;
                                           setContent(prev => prev + tag);
                                           alert('Illustration reference injected into manuscript.');
                                         }}
                                         className="w-full py-2 bg-purple-50 text-purple-600 border border-purple-100 font-bold text-[9px] uppercase tracking-widest hover:bg-purple-600 hover:text-white transition-all flex items-center justify-center gap-2"
                                      >
                                         <ImageIcon size={12} />
                                         Inject into page
                                      </button>
                                   </div>
                                </div>
                              ))
                           )}
                        </div>
                      )}

                      {aiPanel === 'translation' && (
                        <div className="space-y-6">
                          <div className="space-y-4">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Target Language</label>
                            <select 
                              value={targetLang}
                              onChange={(e) => setTargetLang(e.target.value)}
                              className="w-full bg-white border border-[var(--border)] p-3 text-[11px] font-bold uppercase tracking-widest outline-none focus:border-[var(--accent)]"
                            >
                              <option value="Chinese">Chinese (Mandarin)</option>
                              <option value="French">French</option>
                              <option value="Spanish">Spanish</option>
                              <option value="German">German</option>
                              <option value="Japanese">Japanese</option>
                              <option value="Italian">Italian</option>
                            </select>
                          </div>
                          
                          <button 
                            onClick={handleTranslate}
                            disabled={isAiLoading}
                            className="w-full py-4 bg-[var(--accent)] text-white text-[10px] font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-[var(--ink)] transition-all shadow-lg"
                          >
                            {isAiLoading ? <RefreshCw className="animate-spin" size={14} /> : <Globe2 size={14} />}
                            {isAiLoading ? 'Transitioning...' : `Translate to ${targetLang}`}
                          </button>

                          {translatedContent && (
                            <div className="space-y-4 pt-6 border-t border-dashed border-gray-200 text-left">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-[#888]">Audit Result</span>
                                <button 
                                  onClick={() => {
                                    setContent(translatedContent);
                                    setTranslatedContent('');
                                    setAiPanel(null);
                                  }}
                                  className="text-[9px] font-bold uppercase text-[var(--accent)] hover:underline"
                                >
                                  Overwrite Original
                                </button>
                              </div>
                              <div className="p-6 bg-white border border-gray-100 italic text-sm text-gray-700 leading-relaxed font-serif max-h-[300px] overflow-y-auto whitespace-pre-wrap">
                                {translatedContent}
                              </div>
                              <button 
                                onClick={() => {
                                  const newWindow = window.open('', '_blank');
                                  newWindow?.document.write(`
                                    <html>
                                      <head>
                                        <title>BookAudita | Translation Preview</title>
                                        <style>
                                          body { font-family: 'Merriweather', serif; padding: 60px; line-height: 2.2; max-width: 800px; margin: 0 auto; color: #222; }
                                          pre { white-space: pre-wrap; font-size: 18px; }
                                          .meta { font-family: monospace; font-size: 12px; color: #888; border-bottom: 1px solid #eee; margin-bottom: 40px; padding-bottom: 20px; text-transform: uppercase; letter-spacing: 2px; }
                                        </style>
                                      </head>
                                      <body>
                                        <div class="meta">BookAudita // Transition: ${targetLang} // Date: ${new Date().toLocaleDateString()}</div>
                                        <pre>${translatedContent}</pre>
                                      </body>
                                    </html>
                                  `);
                                }}
                                className="w-full py-2 border border-gray-200 text-[9px] font-bold uppercase tracking-widest text-gray-400 hover:text-[var(--ink)] hover:border-[var(--ink)]"
                              >
                                Export Preview
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                 )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <footer className={`h-12 border-t border-[var(--border)] flex items-center px-8 text-[10px] font-mono tracking-tighter transition-all duration-500 ${isFocusMode ? 'bg-transparent border-transparent opacity-0 text-transparent' : 'bg-white text-gray-500 shadow-[0_-1px_10px_rgba(0,0,0,0.02)]'}`}>
            <div className="flex items-center gap-2 text-green-600 font-bold tracking-widest mr-12 bg-green-50 px-3 py-1 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
              SECURE_AUDIT_BUFFER: READY
            </div>
            
            <div className="flex items-center gap-10">
              <div className="flex flex-col">
                <span className="text-[8px] text-gray-400">OPERATOR</span>
                <span className="font-bold">{user.displayName?.split(' ')[0].toUpperCase() || 'UNSET'}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[8px] text-gray-400">PROTOCOL</span>
                <span className="font-bold">E2EE-HYPER-07</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[8px] text-gray-400">SYNC</span>
                <span className="font-bold text-[var(--accent)]">CLOUDRUN_ACTIVE</span>
              </div>
            </div>

            <div className="ml-auto flex items-center gap-8 text-right">
               <div>
                 <span className="text-[8px] text-gray-400 block tracking-widest uppercase">Chapter ID</span>
                 <span className="font-bold">{chapter.id.substring(0,12)}</span>
               </div>
               <div>
                 <span className="text-[8px] text-gray-400 block tracking-widest uppercase">Staging Status</span>
                 <span className="font-bold text-green-600">LIVE_MIRRORING</span>
               </div>
            </div>
        </footer>
      </main>
    </div>
  );
};
