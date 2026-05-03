import { Routes, Route, Link } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import SchoolDetail from "./pages/SchoolDetail";
import { Printer } from "lucide-react";

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-blue-900 text-white shadow-md rounded-b-xl mb-6 mx-2 mt-2 sticky top-2 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-xl tracking-tight">
            <Printer className="w-6 h-6 text-blue-300" />
            <span>PrinteMartTask<span className="text-blue-300">pro</span></span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/school/:id" element={<SchoolDetail />} />
        </Routes>
      </main>
      
      {/* Footer */}
      <footer className="mt-12 py-6 text-center text-gray-400 text-sm">
        <p>&copy; {new Date().getFullYear()} PrinteMartTaskpro - Print Workflow System.</p>
      </footer>
    </div>
  );
}
