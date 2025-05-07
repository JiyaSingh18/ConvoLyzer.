import React, { useRef, useEffect } from 'react';
import { Moon, Sun, Palette, Trash2, Shield, Volume2, VolumeX } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';

const Settings = () => {
  const {
    theme,
    color,
    fontSize,
    notifications,
    sound,
    setTheme,
    setColor,
    setFontSize,
    setNotifications,
    setSound,
  } = useSettings();

  // Create audio context for testing sound
  const audioContext = useRef<AudioContext | null>(null);
  const oscillator = useRef<OscillatorNode | null>(null);
  const gainNode = useRef<GainNode | null>(null);

  useEffect(() => {
    // Initialize audio context
    audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    gainNode.current = audioContext.current.createGain();
    gainNode.current.connect(audioContext.current.destination);
    
    return () => {
      if (audioContext.current) {
        audioContext.current.close();
      }
    };
  }, []);

  const playTestSound = () => {
    if (!sound || !audioContext.current || !gainNode.current) return;

    // Stop previous sound if playing
    if (oscillator.current) {
      oscillator.current.stop();
      oscillator.current.disconnect();
    }

    // Create and configure oscillator
    oscillator.current = audioContext.current.createOscillator();
    oscillator.current.type = 'sine';
    oscillator.current.frequency.setValueAtTime(440, audioContext.current.currentTime);
    
    // Connect and play
    oscillator.current.connect(gainNode.current);
    oscillator.current.start();
    oscillator.current.stop(audioContext.current.currentTime + 0.2);
  };

  const handleClearData = () => {
    if (window.confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-4xl text-white mb-8 text-center dark:text-gray-100">Settings</h1>

      <div className="space-y-6">
        <div className="retro-card">
          <h2 className="text-2xl font-bold mb-6 flex items-center dark:text-gray-100">
            <Palette className="mr-2" />
            Appearance
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="font-bold dark:text-gray-200">Theme</label>
              <div className="flex space-x-4">
                <ThemeButton
                  icon={<Sun />}
                  label="Light"
                  active={theme === 'light'}
                  onClick={() => setTheme('light')}
                />
                <ThemeButton
                  icon={<Moon />}
                  label="Dark"
                  active={theme === 'dark'}
                  onClick={() => setTheme('dark')}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="font-bold dark:text-gray-200">Color Scheme</label>
              <select
                className="retro-input text-dynamic"
                value={color}
                onChange={(e) => setColor(e.target.value as 'blue' | 'pink' | 'yellow')}
              >
                <option value="blue">Classic Blue</option>
                <option value="pink">Neon Pink</option>
                <option value="yellow">Retro Yellow</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <label className="font-bold dark:text-gray-200">Font Size</label>
              <select
                className="retro-input text-dynamic"
                value={fontSize}
                onChange={(e) => setFontSize(e.target.value as 'small' | 'medium' | 'large')}
              >
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
            </div>
          </div>
        </div>

        <div className="retro-card">
          <h2 className="text-2xl font-bold mb-6 flex items-center dark:text-gray-100">
            <Shield className="mr-2" />
            Sound & Privacy
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                {sound ? <Volume2 className="dark:text-gray-200" /> : <VolumeX className="dark:text-gray-200" />}
                <span className="ml-2 font-bold dark:text-gray-200">Sound Effects</span>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  className="retro-button px-3 py-2"
                  onClick={playTestSound}
                  disabled={!sound}
                >
                  Test
                </button>
                <ToggleSwitch
                  value={sound}
                  onChange={setSound}
                />
              </div>
            </div>
            
            <div className="pt-4 border-t-4 border-black dark:border-gray-600">
              <button 
                className="retro-button bg-red-500 text-white hover:bg-red-600 dark:bg-red-700 dark:hover:bg-red-800"
                onClick={handleClearData}
              >
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
    className={`retro-button flex items-center text-dynamic ${
      active ? 'bg-[var(--primary-color)] text-white' : 'bg-gray-200 dark:bg-gray-700'
    }`}
    onClick={onClick}
  >
    {icon}
    <span className="ml-2">{label}</span>
  </button>
);

const ToggleSwitch = ({
  value,
  onChange
}: {
  value: boolean;
  onChange: (value: boolean) => void;
}) => (
  <button
    className={`w-14 h-8 rounded-full relative transition-colors duration-200 ease-in-out ${
      value ? 'bg-[var(--primary-color)]' : 'bg-gray-300 dark:bg-gray-600'
    }`}
    onClick={() => onChange(!value)}
  >
    <span
      className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow transition-transform duration-200 ease-in-out transform ${
        value ? 'translate-x-6' : 'translate-x-0'
      }`}
    />
  </button>
);

export default Settings;