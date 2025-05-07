import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, BarChart3, BookOpen, Settings } from 'lucide-react';

const Navbar = () => {
  const location = useLocation();
  
  const isActive = (path: string) => location.pathname === path;
  
  return (
    <nav className="bg-black text-white p-4 shadow-lg">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold tracking-wider hover:text-yellow-400 transition-colors">
          CONVO<span className="text-pink-500">LYZER</span>
        </Link>
        
        <div className="flex space-x-6">
          <NavLink to="/" icon={<Home />} text="Home" isActive={isActive('/')} />
          <NavLink to="/dashboard" icon={<BarChart3 />} text="Dashboard" isActive={isActive('/dashboard')} />
          <NavLink to="/resources" icon={<BookOpen />} text="Resources" isActive={isActive('/resources')} />
          <NavLink to="/settings" icon={<Settings />} text="Settings" isActive={isActive('/settings')} />
        </div>
      </div>
    </nav>
  );
};

const NavLink = ({ to, icon, text, isActive }: { to: string; icon: React.ReactNode; text: string; isActive: boolean }) => (
  <Link
    to={to}
    className={`flex items-center space-x-2 hover:text-yellow-400 transition-colors ${
      isActive ? 'text-pink-500' : ''
    }`}
  >
    {icon}
    <span>{text}</span>
  </Link>
);

export default Navbar;