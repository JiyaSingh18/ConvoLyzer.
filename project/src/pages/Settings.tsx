import React, { useState } from 'react';
import { Moon, Sun, Palette, Trash2, Shield, Volume2 } from 'lucide-react';

const Settings = () => {
  const [settings, setSettings] = useState({
    theme: 'light',
    color: 'blue',
    fontSize: 'medium',
    notifications: true,
    sound: true
  });

  const handleSettingChange = (key: string, value: string | boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-4xl text-white mb-8 text-center">Settings</h1>

      <div className="space-y-6">
        <div className="retro-card">
          <h2 className="text-2xl font-bold mb-6 flex items-center">
            <Palette className="mr-2" />
            Appearance
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="font-bold">Theme</label>
              <div className="flex space-x-4">
                <ThemeButton
                  icon={<Sun />}
                  label="Light"
                  active={settings.theme === 'light'}
                  onClick={() => handleSettingChange('theme', 'light')}
                />
                <ThemeButton
                  icon={<Moon />}
                  label="Dark"
                  active={settings.theme === 'dark'}
                  onClick={() => handleSettingChange('theme', 'dark')}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="font-bold">Color Scheme</label>
              <select
                className="retro-input"
                value={settings.color}
                onChange={(e) => handleSettingChange('color', e.target.value)}
              >
                <option value="blue">Classic Blue</option>
                <option value="pink">Neon Pink</option>
                <option value="yellow">Retro Yellow</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <label className="font-bold">Font Size</label>
              <select
                className="retro-input"
                value={settings.fontSize}
                onChange={(e) => handleSettingChange('fontSize', e.target.value)}
              >
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
            </div>
          </div>
        </div>

        <div className="retro-card">
          <h2 className="text-2xl font-bold mb-6 flex items-center">
            <Shield className="mr-2" />
            Privacy & Notifications
          </h2>
          
          <div className="space-y-4">
            <ToggleOption
              icon={<Volume2 />}
              label="Sound Effects"
              value={settings.sound}
              onChange={(value) => handleSettingChange('sound', value)}
            />
            
            <div className="pt-4 border-t-4 border-black">
              <button className="retro-button bg-red-500 text-white">
                <Trash2 className="inline mr-2" />
                Clear All Data
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ThemeButton = ({ 
  icon, 
  label, 
  active, 
  onClick 
}: { 
  icon: React.ReactNode; 
  label: string; 
  active: boolean; 
  onClick: () => void;
}) => (
  <button
    className={`retro-button flex items-center ${
      active ? 'bg-blue-500 text-white' : 'bg-gray-200'
    }`}
    onClick={onClick}
  >
    {icon}
    <span className="ml-2">{label}</span>
  </button>
);

const ToggleOption = ({ 
  icon, 
  label, 
  value, 
  onChange 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: boolean; 
  onChange: (value: boolean) => void;
}) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center">
      {icon}
      <span className="ml-2 font-bold">{label}</span>
    </div>
    <button
      className={`w-14 h-8 rounded-full p-1 transition-colors ${
        value ? 'bg-blue-500' : 'bg-gray-300'
      }`}
      onClick={() => onChange(!value)}
    >
      <div
        className={`w-6 h-6 bg-white rounded-full transform transition-transform ${
          value ? 'translate-x-6' : ''
        }`}
      ></div>
    </button>
  </div>
);

export default Settings;