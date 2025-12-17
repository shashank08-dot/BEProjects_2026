
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { LogOut, Bot, Stethoscope, FileText, LayoutDashboard, HeartPulse } from 'lucide-react';

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const commonLinkClasses = "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors";
  const activeLinkClasses = "bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white";
  const inactiveLinkClasses = "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800";

  return (
    <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm shadow-sm sticky top-0 z-50">
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <NavLink to="/" className="flex-shrink-0 flex items-center gap-2 text-xl font-bold text-teal-600 dark:text-teal-400">
              <Bot size={28} />
              <span>MindWell AI</span>
            </NavLink>
          </div>
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              {user ? (
                <>
                  <NavLink to="/dashboard" className={({ isActive }) => `${commonLinkClasses} ${isActive ? activeLinkClasses : inactiveLinkClasses}`}>
                    <LayoutDashboard size={18} /> Dashboard
                  </NavLink>
                  <NavLink to="/questionnaire" className={({ isActive }) => `${commonLinkClasses} ${isActive ? activeLinkClasses : inactiveLinkClasses}`}>
                    <FileText size={18} /> Assessment
                  </NavLink>
                  <NavLink to="/doctors" className={({ isActive }) => `${commonLinkClasses} ${isActive ? activeLinkClasses : inactiveLinkClasses}`}>
                    <Stethoscope size={18} /> Find Doctors
                  </NavLink>
                  <NavLink to="/chat" className={({ isActive }) => `${commonLinkClasses} ${isActive ? activeLinkClasses : inactiveLinkClasses}`}>
                    <Bot size={18} /> Chat with RIPEX
                  </NavLink>
                   <NavLink to="/help" className={({ isActive }) => `${commonLinkClasses} ${isActive ? activeLinkClasses : inactiveLinkClasses}`}>
                    <HeartPulse size={18} /> Help
                  </NavLink>
                  <button onClick={handleLogout} className={`${commonLinkClasses} ${inactiveLinkClasses}`}>
                    <LogOut size={18} /> Logout
                  </button>
                </>
              ) : (
                <>
                  <NavLink to="/help" className={({ isActive }) => `${commonLinkClasses} ${isActive ? activeLinkClasses : inactiveLinkClasses}`}>
                    <HeartPulse size={18} /> Help
                  </NavLink>
                  <NavLink to="/login" className={({ isActive }) => `${commonLinkClasses} ${isActive ? activeLinkClasses : inactiveLinkClasses}`}>Login</NavLink>
                  <NavLink to="/register" className={`${commonLinkClasses} bg-teal-500 text-white hover:bg-teal-600`}>Register</NavLink>
                </>
              )}
            </div>
          </div>
          <div className="md:hidden">
            {/* Mobile menu button could be added here */}
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Header;
