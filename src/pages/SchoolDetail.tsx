import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api, Task, School, HistoryEntry } from "../lib/api";
import { format, parseISO } from "date-fns";
import { ArrowLeft, Calendar, FileText, Package, CheckSquare, ListOrdered, CalendarDays, Plus, Truck, History, GripVertical } from "lucide-react";
import { cn } from "../lib/utils";
import { Reorder } from "motion/react";

export default function SchoolDetail() {
  const { id } = useParams<{ id: string }>();
  const [school, setSchool] = useState<School | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [isAddHistoryOpen, setIsAddHistoryOpen] = useState(false);
  const [isEditTaskOpen, setIsEditTaskOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const [isDeleteTaskOpen, setIsDeleteTaskOpen] = useState(false);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);
  
  // Forms
  const [newTask, setNewTask] = useState({ type: "", due_date: format(new Date(), "yyyy-MM-dd") });
  const [newHistory, setNewHistory] = useState({ action: "Order Received", description: "", action_date: format(new Date(), "yyyy-MM-dd") });

  const fetchData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [schoolData, tasksData, historyData] = await Promise.all([
        api.schools.get(Number(id)),
        api.tasks.list(Number(id)),
        api.history.list(Number(id)),
      ]);
      setSchool(schoolData);
      setTasks(tasksData);
      setHistory(historyData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const activeTasks = tasks.filter(t => t.status !== "Completed");
  const completedTasks = tasks.filter(t => t.status === "Completed");

  const handleReorderTasks = async (newOrder: Task[]) => {
    // Optimistic UI update
    const updatedTasks = [...newOrder, ...completedTasks];
    setTasks(updatedTasks);
    
    // API Call
    try {
      await api.tasks.reorder(newOrder.map(t => t.id));
    } catch (error) {
      console.error("Failed to reorder tasks", error);
      fetchData(); // Rollback on failure
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.tasks.create(Number(id), newTask.type, newTask.due_date);
      setIsAddTaskOpen(false);
      
      // Auto logic: Log task creation in history
      await api.history.create(Number(id), `Task Added: ${newTask.type}`, `Due on ${newTask.due_date}`, new Date().toISOString().split('T')[0]);
      
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask || !editingTask.type.trim()) return;
    try {
      await api.tasks.update(editingTask.id, editingTask.type, editingTask.due_date);
      setIsEditTaskOpen(false);
      setEditingTask(null);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const confirmDeleteTask = async () => {
    if (!deletingTask) return;
    try {
      await api.tasks.delete(deletingTask.id);
      setIsDeleteTaskOpen(false);
      setDeletingTask(null);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTask = async (id: number) => {
    try {
      await api.tasks.delete(id);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddHistory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.history.create(Number(id), newHistory.action, newHistory.description, newHistory.action_date);
      setIsAddHistoryOpen(false);
      setNewHistory({ ...newHistory, description: "" });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const toggleTaskStatus = async (task: Task) => {
    try {
      const newStatus = task.status === "Pending" ? "Completed" : "Pending";
      await api.tasks.updateStatus(task.id, newStatus);
      
      // If completed, add to history log as well
      if (newStatus === "Completed") {
         await api.history.create(Number(id), `Task Completed`, `Completed ${task.type} task`, new Date().toISOString().split('T')[0]);
      }
      
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const getActionIcon = (action: string) => {
    if (action.includes("Received")) return <Package className="w-5 h-5 text-indigo-500" />;
    if (action.includes("Data")) return <ListOrdered className="w-5 h-5 text-blue-500" />;
    if (action.includes("Proof")) return <FileText className="w-5 h-5 text-amber-500" />;
    if (action.includes("Deliver")) return <Truck className="w-5 h-5 text-emerald-500" />;
    if (action.includes("Completed")) return <CheckSquare className="w-5 h-5 text-purple-500" />;
    return <History className="w-5 h-5 text-gray-500" />;
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading school details...</div>;
  if (!school) return <div className="p-8 text-center text-red-500 font-medium">School not found.</div>;

  return (
    <div className="space-y-6">
      <div>
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{school.name}</h1>
            <p className="text-gray-500 text-sm mt-1">Joined {format(new Date(school.created_at), "MMM d, yyyy")}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* left col: Tasks */}
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
               <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-blue-500" />
                Tasks
              </h2>
              <button 
                onClick={() => setIsAddTaskOpen(true)}
                className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Task
              </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {activeTasks.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-sm">No active tasks.</div>
              ) : (
                <Reorder.Group axis="y" values={activeTasks} onReorder={handleReorderTasks} className="divide-y divide-gray-100">
                  {activeTasks.map(task => (
                    <Reorder.Item key={task.id} value={task} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors group bg-white cursor-grab active:cursor-grabbing">
                      <div className="flex items-start gap-3">
                        <div className="mt-1 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing">
                          <GripVertical className="w-5 h-5" />
                        </div>
                        <button onClick={() => toggleTaskStatus(task)} className="mt-0.5 rounded-md border flex items-center justify-center transition-colors w-5 h-5 border-gray-300 hover:border-blue-500">
                        </button>
                        <div>
                          <p className="font-medium text-gray-900">{task.type}</p>
                          <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                            <CalendarDays className="w-3 h-3" />
                            Due: {format(parseISO(task.due_date), "MMM d, yyyy")}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => {
                              setEditingTask(task);
                              setIsEditTaskOpen(true);
                            }}
                            className="p-1 px-2 text-xs text-blue-600 hover:bg-blue-100 rounded transition-colors"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => {
                              setDeletingTask(task);
                              setIsDeleteTaskOpen(true);
                            }}
                            className="p-1 px-2 text-xs text-red-600 hover:bg-red-100 rounded transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700">
                          {task.status}
                        </span>
                      </div>
                    </Reorder.Item>
                  ))}
                </Reorder.Group>
              )}
            </div>
          </div>

          {completedTasks.length > 0 && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                 <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-emerald-500" />
                  Completed Tasks
                </h2>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <ul className="divide-y divide-gray-100">
                  {completedTasks.map(task => (
                    <li key={task.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors bg-gray-50 opacity-75 group relative">
                      <div className="flex items-start gap-3">
                        <button onClick={() => toggleTaskStatus(task)} className="mt-0.5 rounded-md border flex items-center justify-center transition-colors w-5 h-5 bg-emerald-500 border-emerald-500 text-white">
                           <CheckSquare className="w-3.5 h-3.5" />
                        </button>
                        <div>
                          <p className="font-medium text-gray-900 line-through text-gray-500">{task.type}</p>
                          <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                            <CalendarDays className="w-3 h-3" />
                            Due: {format(parseISO(task.due_date), "MMM d, yyyy")}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => {
                              setEditingTask(task);
                              setIsEditTaskOpen(true);
                            }}
                            className="p-1 px-2 text-xs text-blue-600 hover:bg-blue-100 rounded transition-colors"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => {
                              setDeletingTask(task);
                              setIsDeleteTaskOpen(true);
                            }}
                            className="p-1 px-2 text-xs text-red-600 hover:bg-red-100 rounded transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 whitespace-nowrap">
                          {task.status}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* right col: History Timeline */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
             <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <History className="w-5 h-5 text-indigo-500" />
              Action Timeline
            </h2>
            <button 
              onClick={() => setIsAddHistoryOpen(true)}
              className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Log Event
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 relative">
             {history.length === 0 ? (
                <div className="text-center text-gray-500 text-sm py-4">No history logged yet.</div>
             ) : (
                <div className="absolute top-10 bottom-10 left-10 w-px bg-gray-200"></div>
             )}
             
             <ul className="space-y-6 relative z-10">
               {history.map((item, idx) => (
                 <li key={item.id} className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-50 border-2 border-white shadow-sm flex items-center justify-center relative bg-white z-10">
                      {getActionIcon(item.action)}
                    </div>
                    <div className="flex-1 pb-1">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-1">
                        <h4 className="font-semibold text-gray-900">{item.action}</h4>
                        <time className="text-xs font-medium text-gray-500 whitespace-nowrap bg-gray-100 px-2 py-0.5 rounded-md self-start sm:self-auto uppercase tracking-wider mt-1 sm:mt-0">
                          {format(parseISO(item.action_date), "MMM d, yyyy")}
                        </time>
                      </div>
                      {item.description && <p className="text-sm text-gray-600 bg-gray-50 p-2.5 rounded-lg border border-gray-100">{item.description}</p>}
                    </div>
                 </li>
               ))}
             </ul>
          </div>
        </div>

      </div>


      {/* Add Task Modal */}
      {isAddTaskOpen && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900">Add New Task</h2>
              <form onSubmit={handleAddTask} className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Task Type</label>
                  <input 
                    type="text"
                    required
                    value={newTask.type}
                    onChange={(e) => setNewTask({...newTask, type: e.target.value})}
                    placeholder="e.g. Graphic Design"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                  <input 
                    type="date" 
                    required
                    value={newTask.due_date}
                    onChange={(e) => setNewTask({...newTask, due_date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                  />
                </div>
                
                <div className="mt-8 flex items-center justify-end gap-3">
                  <button type="button" onClick={() => setIsAddTaskOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
                  <button type="submit" className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors">Add Task</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      {isEditTaskOpen && editingTask && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900">Edit Task</h2>
              <form onSubmit={handleEditTask} className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Task Type</label>
                  <input 
                    type="text"
                    required
                    value={editingTask.type}
                    onChange={(e) => setEditingTask({...editingTask, type: e.target.value})}
                    placeholder="e.g. Graphic Design"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                  <input 
                    type="date" 
                    required
                    value={editingTask.due_date}
                    onChange={(e) => setEditingTask({...editingTask, due_date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                  />
                </div>
                
                <div className="mt-8 flex items-center justify-end gap-3">
                  <button type="button" onClick={() => { setIsEditTaskOpen(false); setEditingTask(null); }} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
                  <button type="submit" className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors">Save Changes</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Add History Modal */}
      {isAddHistoryOpen && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900">Log Timeline Event</h2>
              <form onSubmit={handleAddHistory} className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Action Type</label>
                  <select 
                    required
                    value={newHistory.action}
                    onChange={(e) => setNewHistory({...newHistory, action: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900"
                  >
                    <option value="Order Received">Order Received</option>
                    <option value="Data Collected">Data Collected</option>
                    <option value="Proof Sent">Proof Sent</option>
                    <option value="Delivered">Delivered</option>
                    <option value="Additional Note">Additional Note</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Action Date</label>
                  <input 
                    type="date" 
                    required
                    value={newHistory.action_date}
                    onChange={(e) => setNewHistory({...newHistory, action_date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                  <textarea 
                    rows={3}
                    value={newHistory.description}
                    onChange={(e) => setNewHistory({...newHistory, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 resize-none"
                    placeholder="Provide more context..."
                  />
                </div>
                
                <div className="mt-8 flex items-center justify-end gap-3">
                  <button type="button" onClick={() => setIsAddHistoryOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
                  <button type="submit" className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors">Save Event</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Task Modal */}
      {isDeleteTaskOpen && deletingTask && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900">Delete Task</h2>
              <p className="text-sm text-gray-500 mt-2">
                Are you sure you want to delete <span className="font-semibold text-gray-800">{deletingTask.type}</span>? 
                This action cannot be undone.
              </p>
              
              <div className="mt-8 flex items-center justify-end gap-3">
                <button 
                  onClick={() => {
                    setIsDeleteTaskOpen(false);
                    setDeletingTask(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmDeleteTask}
                  className="px-6 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition-colors"
                >
                  Delete Task
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
