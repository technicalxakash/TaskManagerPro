import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, Task, School } from "../lib/api";
import { format, isPast, isToday, isTomorrow, parseISO } from "date-fns";
import { AlertCircle, Calendar, CheckCircle2, ChevronRight, Clock, Plus, School as SchoolIcon, Loader2, FileText } from "lucide-react";
import { cn } from "../lib/utils";

export default function Dashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [note, setNote] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modals
  const [isAddSchoolOpen, setIsAddSchoolOpen] = useState(false);
  const [newSchoolName, setNewSchoolName] = useState("");
  
  const [isEditSchoolOpen, setIsEditSchoolOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);

  const [isDeleteSchoolOpen, setIsDeleteSchoolOpen] = useState(false);
  const [deletingSchool, setDeletingSchool] = useState<School | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tasksData, schoolsData, noteData] = await Promise.all([
        api.tasks.list(),
        api.schools.list(),
        api.note.get(),
      ]);
      setTasks(tasksData);
      setSchools(schoolsData);
      setNote(noteData.content || "");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNote = async () => {
    setIsSavingNote(true);
    try {
      await api.note.update(note);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingNote(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const activeTasks = tasks.filter(t => t.status !== "Completed");
  const completedTasks = tasks.filter(t => t.status === "Completed");
  const filteredSchools = schools.filter(school => school.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const handleAddSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSchoolName.trim()) return;
    
    try {
      await api.schools.create(newSchoolName);
      setNewSchoolName("");
      setIsAddSchoolOpen(false);
      fetchData(); // Refresh Data
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSchool || !editingSchool.name.trim()) return;
    
    try {
      await api.schools.update(editingSchool.id, editingSchool.name);
      setEditingSchool(null);
      setIsEditSchoolOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const confirmDeleteSchool = async () => {
    if (!deletingSchool) return;
    try {
      await api.schools.delete(deletingSchool.id);
      setIsDeleteSchoolOpen(false);
      setDeletingSchool(null);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteSchool = async (id: number) => {
    try {
      await api.schools.delete(id);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const getTaskColor = (type: string) => {
    if (type === "Data Entry") return "bg-purple-100 text-purple-700 border-purple-200";
    if (type === "Proof") return "bg-amber-100 text-amber-700 border-amber-200";
    if (type === "Delivery") return "bg-blue-100 text-blue-700 border-blue-200";
    return "bg-gray-100 text-gray-700 border-gray-200";
  };

  const getDueDateLabel = (dateStr: string, isCompleted: boolean) => {
    const date = parseISO(dateStr);
    if (isCompleted) return <span className="text-gray-400">{format(date, "MMM d, yyyy")}</span>;
    
    if (isPast(date) && !isToday(date)) return <span className="text-red-600 font-bold flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Overdue: {format(date, "MMM d, yyyy")}</span>;
    if (isToday(date)) return <span className="text-orange-600 font-bold">Due Today!</span>;
    if (isTomorrow(date)) return <span className="text-amber-600 font-medium">Tomorrow</span>;
    
    return <span className="text-gray-600">{format(date, "MMM d, yyyy")}</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Active Operations</h1>
          <p className="text-gray-500 text-sm mt-1">Monitor upcoming deliveries and proofs across all schools.</p>
        </div>
        
        <button 
          onClick={() => setIsAddSchoolOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors flex items-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" />
          New School Order
        </button>
      </div>

      {loading ? (
        <div className="h-64 flex flex-col justify-center items-center text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-4" />
          <p>Loading records...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-8">
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-500" />
                Priority Task Queue
              </h2>
              
              {activeTasks.length === 0 ? (
                <div className="bg-white rounded-xl border border-dashed border-gray-300 p-10 text-center">
                  <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-gray-900">All caught up!</h3>
                  <p className="text-gray-500 mt-1">There are no active tasks in the system right now.</p>
                </div>
              ) : (
                <div className="bg-white shadow-sm border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
                  {activeTasks.map((task) => (
                    <div key={task.id} className="p-4 transition-colors hover:bg-blue-50/50 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <div className={cn("mt-0.5 w-2 h-2 rounded-full flex-shrink-0", (isPast(parseISO(task.due_date)) && !isToday(parseISO(task.due_date))) ? "bg-red-500" : "bg-blue-500")} />
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Link to={`/school/${task.school_id}`} className="font-semibold text-gray-900 hover:text-blue-600 transition-colors">
                              {task.school_name}
                            </Link>
                            <span className={cn("text-xs font-medium px-2 py-0.5 rounded-md border", getTaskColor(task.type))}>
                              {task.type}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-sm">
                            <span className="flex items-center gap-1.5">
                              <Calendar className="w-4 h-4 text-gray-400" />
                              {getDueDateLabel(task.due_date, false)}
                            </span>
                            <span className="flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-gray-500">
                              {task.status}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <Link 
                        to={`/school/${task.school_id}`}
                        className="text-blue-600 bg-blue-50 hover:bg-blue-100 p-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center self-end sm:self-auto"
                        title="Manage School Order"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {completedTasks.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  Completed Tasks
                </h2>
                <div className="bg-white shadow-sm border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
                  {completedTasks.map((task) => (
                    <div key={task.id} className="p-4 transition-colors hover:bg-gray-50 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between opacity-75">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="mt-0.5 w-2 h-2 rounded-full flex-shrink-0 bg-gray-300" />
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Link to={`/school/${task.school_id}`} className="font-semibold text-gray-900 hover:text-blue-600 transition-colors">
                              {task.school_name}
                            </Link>
                            <span className={cn("text-xs font-medium px-2 py-0.5 rounded-md border", getTaskColor(task.type))}>
                              {task.type}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-sm">
                            <span className="flex items-center gap-1.5">
                              <Calendar className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-400">{format(parseISO(task.due_date), "MMM d, yyyy")}</span>
                            </span>
                            <span className="flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-emerald-600">
                              <CheckCircle2 className="w-3 h-3" />
                              {task.status}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <Link 
                        to={`/school/${task.school_id}`}
                        className="text-blue-600 bg-blue-50 hover:bg-blue-100 p-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center self-end sm:self-auto"
                        title="Manage School Order"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6 flex flex-col">
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <SchoolIcon className="w-5 h-5 text-gray-400" />
                Schools Directory
              </h2>
              
              <div className="bg-white shadow-sm border border-gray-200 rounded-xl p-4 flex flex-col h-96">
                <input
                  type="text"
                  placeholder="Search schools..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 mb-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm text-gray-900"
                />
                {schools.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No schools registered yet.</p>
                ) : filteredSchools.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No schools match your search.</p>
                ) : (
                  <div className="divide-y divide-gray-100 overflow-y-auto pr-2 pb-2">
                    {filteredSchools.map(school => (
                      <div key={school.id} className="block py-3 hover:bg-gray-50 px-2 -mx-2 rounded-md transition-colors flex justify-between items-center group">
                        <Link to={`/school/${school.id}`} className="flex-1">
                          <h4 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">{school.name}</h4>
                          <p className="text-xs text-gray-400">Added {format(new Date(school.created_at), "MMM d, yyyy")}</p>
                        </Link>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={(e) => {
                              e.preventDefault();
                              setEditingSchool(school);
                              setIsEditSchoolOpen(true);
                            }}
                            className="p-1 px-2 text-xs text-blue-600 hover:bg-blue-100 rounded transition-colors"
                          >
                            Rename
                          </button>
                          <button 
                            onClick={(e) => {
                              e.preventDefault();
                              setDeletingSchool(school);
                              setIsDeleteSchoolOpen(true);
                            }}
                            className="p-1 px-2 text-xs text-red-600 hover:bg-red-100 rounded transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4 flex-1 flex flex-col">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-500" />
                Important Notes
              </h2>
              
              <div className="bg-[#fffcf0] shadow-sm border border-amber-200 rounded-xl p-4 flex-1 flex flex-col relative group min-h-[200px]">
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  onBlur={handleSaveNote}
                  placeholder="Jot down global reminders, guidelines, or contacts..."
                  className="w-full h-full resize-none bg-transparent outline-none text-sm text-gray-800 placeholder:text-gray-400 leading-relaxed font-sans"
                />
                <div className="absolute top-2 right-2 flex items-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  {isSavingNote && (
                    <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full animate-pulse mr-2">
                       SAVING...
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add School Modal */}
      {isAddSchoolOpen && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900">Add New School Order</h2>
              <p className="text-sm text-gray-500 mt-1">Register a new client school into the system.</p>
              
              <form onSubmit={handleAddSchool} className="mt-6">
                <div className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">School Name</label>
                    <input 
                      autoFocus
                      type="text" 
                      id="name"
                      required
                      value={newSchoolName}
                      onChange={(e) => setNewSchoolName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none text-gray-900"
                      placeholder="e.g. Lincoln High School"
                    />
                  </div>
                </div>
                
                <div className="mt-8 flex items-center justify-end gap-3">
                  <button 
                    type="button" 
                    onClick={() => setIsAddSchoolOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={!newSchoolName.trim()}
                    className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition-colors"
                  >
                    Create School
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {/* Edit School Modal */}
      {isEditSchoolOpen && editingSchool && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900">Rename School</h2>
              <form onSubmit={handleEditSchool} className="mt-6">
                <div className="space-y-4">
                  <div>
                    <label htmlFor="edit_name" className="block text-sm font-medium text-gray-700 mb-1">School Name</label>
                    <input 
                      autoFocus
                      type="text" 
                      id="edit_name"
                      required
                      value={editingSchool.name}
                      onChange={(e) => setEditingSchool({...editingSchool, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none text-gray-900"
                    />
                  </div>
                </div>
                
                <div className="mt-8 flex items-center justify-end gap-3">
                  <button 
                    type="button" 
                    onClick={() => {
                      setIsEditSchoolOpen(false);
                      setEditingSchool(null);
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={!editingSchool.name.trim()}
                    className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition-colors"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete School Modal */}
      {isDeleteSchoolOpen && deletingSchool && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900">Delete School</h2>
              <p className="text-sm text-gray-500 mt-2">
                Are you sure you want to delete <span className="font-semibold text-gray-800">{deletingSchool.name}</span>? 
                This action cannot be undone and will remove all associated tasks and history.
              </p>
              
              <div className="mt-8 flex items-center justify-end gap-3">
                <button 
                  onClick={() => {
                    setIsDeleteSchoolOpen(false);
                    setDeletingSchool(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmDeleteSchool}
                  className="px-6 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition-colors"
                >
                  Delete School
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
