
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { VehicleProfile, SetupFormData } from './types';
import { generateVehicleImage, generateVehicle360 } from './services/geminiService';
import { Input } from './components/Input';
import { Button } from './components/Button';

// --- Constants ---
const STORAGE_KEY = 'combustiblesam_profile';

const COMMON_BRANDS = [
  "Toyota", "Honda", "Ford", "Chevrolet", "Nissan", "Hyundai", "Kia", "Volkswagen", "BMW", 
  "Mercedes-Benz", "Audi", "Mazda", "Subaru", "Jeep", "Tesla", "Volvo", "Lexus", "Porsche", 
  "Suzuki", "Mitsubishi", "Peugeot", "Renault", "Fiat", "Chery", "BYD", "MG"
];

const COMMON_MODELS = [
  "Corolla", "Civic", "Camry", "RAV4", "CR-V", "F-150", "Silverado", "Ram", "Model 3", "Model Y", 
  "Accord", "Sentra", "Altima", "Elantra", "Tucson", "Sportage", "Mustang", "Explorer", "Golf", 
  "Jetta", "Yaris", "Hilux", "Ranger", "Swift", "Duster", "Rio", "Sail", "Spark"
];

const COMMON_TYPES = [
  "Sedan", "SUV", "Hatchback", "Coupe", "Convertible", "Pickup", "Minivan", "Wagon", 
  "Crossover", "Sport", "Van", "4x4"
];

const COMMON_COLORS = [
  "Blanco", "Negro", "Plateado", "Gris", "Rojo", "Azul", "Verde", "Marron", 
  "Naranja", "Amarillo", "Dorado", "Beige", "Vino", "Grafito", "Blanco Perla"
];

const YEARS = Array.from({ length: 46 }, (_, i) => (2025 - i).toString());

// --- Components ---

const LogoIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#4ade80" />
        <stop offset="100%" stopColor="#3b82f6" />
      </linearGradient>
      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="2" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
    {/* Hexagon Frame Background */}
    <path d="M50 10 L85 30 V70 L50 90 L15 70 V30 Z" fill="#1e293b" stroke="url(#logoGradient)" strokeWidth="1.5" strokeOpacity="0.5" />
    
    {/* Internal Circuit S Shape */}
    <path d="M65 35 C65 35 35 35 35 50 C35 65 65 65 65 80" stroke="url(#logoGradient)" strokeWidth="6" strokeLinecap="round" filter="url(#glow)" />
    <path d="M65 35 C65 35 35 35 35 50 C35 65 65 65 65 80" stroke="white" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
    
    {/* Tech Dots */}
    <circle cx="65" cy="35" r="3" fill="#4ade80" />
    <circle cx="65" cy="80" r="3" fill="#3b82f6" />
    <circle cx="35" cy="50" r="2" fill="#ffffff" opacity="0.5" />
    
    {/* Connection Lines */}
    <path d="M85 30 L65 35" stroke="#3b82f6" strokeWidth="1" opacity="0.3" />
    <path d="M15 70 L35 65" stroke="#4ade80" strokeWidth="1" opacity="0.3" />
  </svg>
);

// Helper to compress images to save LocalStorage space
const compressImage = (base64Str: string, maxWidth = 500, quality = 0.7): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = maxWidth / img.width;
      canvas.width = maxWidth;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      } else {
        resolve(base64Str);
      }
    };
    img.onerror = () => resolve(base64Str);
  });
};

const App: React.FC = () => {
  // --- State ---
  // Global 'variables' stored in State and LocalStorage
  const [profile, setProfile] = useState<VehicleProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 0 });
  
  // Calculator State
  const [calcAmount, setCalcAmount] = useState<string>('');
  const [predictedKm, setPredictedKm] = useState<number | null>(null);

  // Setup Form State
  const [formData, setFormData] = useState<SetupFormData>({
    brand: '',
    model: '',
    type: '',
    year: '',
    color: '',
    baselineMoney: '',
    baselineKm: '',
    baselineLiters: ''
  });

  // 360 View State
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef<number>(0);
  const dragStartIndex = useRef<number>(0);

  // PWA Install State
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  // --- Effects ---
  // Load "Global Variables" from "Flat File" (LocalStorage) on startup
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Ensure backward compatibility for profiles without 'type'
        if (!parsed.type) parsed.type = '';
        setProfile(parsed);
        // Pre-populate form in case user wants to edit later
        setFormData({
          brand: parsed.brand,
          model: parsed.model,
          type: parsed.type || '',
          year: parsed.year,
          color: parsed.color,
          baselineMoney: parsed.baselineMoney.toString(),
          baselineKm: parsed.baselineKm.toString(),
          baselineLiters: parsed.baselineLiters.toString(),
        });
      } catch (e) {
        console.error("Failed to parse profile", e);
      }
    }
  }, []);

  // Listen for PWA install prompt
  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // --- Handlers ---

  const handleInstallClick = () => {
    if (installPrompt) {
      installPrompt.prompt();
      installPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          setInstallPrompt(null);
        }
      });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLoadingProgress({ current: 0, total: 8 });

    try {
      let images = profile?.images || [];
      let imageBase64 = profile?.imageBase64 || null;

      const detailsChanged = 
        formData.brand !== profile?.brand || 
        formData.model !== profile?.model || 
        formData.type !== profile?.type ||
        formData.year !== profile?.year ||
        formData.color !== profile?.color;

      if (images.length === 0 || detailsChanged) {
        // Call Gemini AI to generate 360 images
        const rawImages = await generateVehicle360(
          formData.brand, 
          formData.model, 
          formData.type,
          formData.year, 
          formData.color,
          (current, total) => setLoadingProgress({ current, total })
        );

        // Compress images to fit in LocalStorage
        images = await Promise.all(rawImages.map(img => compressImage(img)));
        imageBase64 = images[0]; // Use the first one (Front/Side) as thumb
      }

      const newProfile: VehicleProfile = {
        brand: formData.brand,
        model: formData.model,
        type: formData.type,
        year: formData.year,
        color: formData.color,
        baselineMoney: parseFloat(formData.baselineMoney) || 0,
        baselineKm: parseFloat(formData.baselineKm) || 0,
        baselineLiters: parseFloat(formData.baselineLiters) || 0,
        imageBase64,
        images,
      };

      // Save to Global State
      setProfile(newProfile);
      
      // Persist to "Flat File" (LocalStorage)
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newProfile));
      } catch (storageError) {
        console.error("LocalStorage quota exceeded, clearing images to save data", storageError);
        // Fallback: save without images if quota full
        const minimalProfile = { ...newProfile, images: [], imageBase64: null };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(minimalProfile));
        alert("Nota: El almacenamiento local está lleno. Los datos se guardaron pero las imágenes no se persistirán al recargar.");
      }

      setIsEditing(false);
      setCalcAmount('');
      setPredictedKm(null);
    } catch (error) {
      console.error("Error saving profile", error);
      alert("Hubo un error guardando los datos. Por favor intenta de nuevo.");
    } finally {
      setIsLoading(false);
    }
  };

  const calculatePrediction = useCallback(() => {
    if (!profile || !calcAmount) return;
    
    const moneyToSpend = parseFloat(calcAmount);
    if (isNaN(moneyToSpend) || moneyToSpend <= 0) {
      setPredictedKm(null);
      return;
    }

    // Formula: (Money To Spend * Baseline Km) / Baseline Money
    const result = (moneyToSpend * profile.baselineKm) / profile.baselineMoney;
    setPredictedKm(result);
  }, [profile, calcAmount]);

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    if (profile) {
      setIsEditing(false);
      setFormData({
        brand: profile.brand,
        model: profile.model,
        type: profile.type || '',
        year: profile.year,
        color: profile.color,
        baselineMoney: profile.baselineMoney.toString(),
        baselineKm: profile.baselineKm.toString(),
        baselineLiters: profile.baselineLiters.toString(),
      });
    }
  };

  // --- 360 Viewer Logic ---
  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    dragStartX.current = clientX;
    dragStartIndex.current = currentImageIndex;
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging || !profile?.images?.length) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const diff = clientX - dragStartX.current;
    const sensitivity = 15; // pixels per frame
    
    const frameDiff = Math.floor(diff / sensitivity);
    const totalFrames = profile.images.length;
    
    // Calculate new index wrapping around
    let newIndex = (dragStartIndex.current - frameDiff) % totalFrames;
    if (newIndex < 0) newIndex += totalFrames;
    
    setCurrentImageIndex(newIndex);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // --- Renders ---

  // 1. Setup / Edit View
  if (!profile || isEditing) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-dark safe-area-top safe-area-bottom">
        <div className="max-w-md w-full bg-card p-8 rounded-2xl shadow-2xl border border-gray-800 my-auto">
          <div className="mb-8 text-center">
            <LogoIcon className="w-20 h-20 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
              {profile ? 'Editar Vehículo' : 'Combustible SamApp'}
            </h1>
            <p className="text-gray-400 mt-2 text-sm">
              Ingresa los datos de tu auto y el consumo de referencia para calibrar la IA y generar la vista 360°.
            </p>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Marca"
                name="brand"
                placeholder="Ej. Toyota"
                value={formData.brand}
                onChange={handleInputChange}
                options={COMMON_BRANDS}
                required
              />
              <Input
                label="Modelo"
                name="model"
                placeholder="Ej. Corolla"
                value={formData.model}
                onChange={handleInputChange}
                options={COMMON_MODELS}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Tipo"
                name="type"
                placeholder="Ej. Sedan, SUV"
                value={formData.type}
                onChange={handleInputChange}
                options={COMMON_TYPES}
                required
              />
              <Input
                label="Año"
                name="year"
                type="text"
                placeholder="2022"
                value={formData.year}
                onChange={handleInputChange}
                options={YEARS}
                required
              />
            </div>
            <div className="grid grid-cols-1">
               <Input
                label="Color"
                name="color"
                placeholder="Rojo"
                value={formData.color}
                onChange={handleInputChange}
                options={COMMON_COLORS}
                required
              />
            </div>

            <div className="border-t border-gray-700 my-6 pt-4">
              <h3 className="text-lg font-semibold text-white mb-4">Datos de Referencia (Base)</h3>
              <div className="bg-gray-900/50 p-4 rounded-lg space-y-4">
                 <Input
                  label="Dinero echado (Moneda Local)"
                  name="baselineMoney"
                  type="number"
                  placeholder="Ej. 500"
                  value={formData.baselineMoney}
                  onChange={handleInputChange}
                  required
                />
                 <Input
                  label="Litros Ingresados"
                  name="baselineLiters"
                  type="number"
                  placeholder="Ej. 20"
                  value={formData.baselineLiters}
                  onChange={handleInputChange}
                  required
                />
                <Input
                  label="Km Recorridos con esa cantidad"
                  name="baselineKm"
                  type="number"
                  placeholder="Ej. 250"
                  value={formData.baselineKm}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2 flex-col">
              {isLoading && (
                <div className="text-center mb-2">
                  <div className="w-full bg-gray-700 rounded-full h-2.5 mb-1">
                    <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${(loadingProgress.current / loadingProgress.total) * 100}%` }}></div>
                  </div>
                  <p className="text-xs text-gray-400">Generando vistas 360... ({loadingProgress.current}/{loadingProgress.total})</p>
                </div>
              )}
              <div className="flex gap-3">
                {profile && (
                  <Button type="button" variant="outline" onClick={handleCancelEdit} disabled={isLoading}>
                    Cancelar
                  </Button>
                )}
                <Button type="submit" isLoading={isLoading}>
                  {profile ? 'Actualizar Datos' : 'Guardar y Generar'}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // 2. Dashboard / Calculator View
  return (
    <div className="min-h-screen bg-dark p-4 md:p-8 flex flex-col items-center safe-area-top safe-area-bottom">
      {/* Navbar / Header */}
      <div className="w-full max-w-4xl flex justify-between items-center mb-8 mt-2">
        <div className="flex items-center gap-3">
          <LogoIcon className="w-10 h-10" />
          <span className="font-bold text-xl tracking-tight text-white hidden sm:inline">Combustible SamApp</span>
        </div>
        
        <div className="flex gap-2">
           {installPrompt && (
            <button
              onClick={handleInstallClick}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold py-2 px-4 rounded-lg shadow-lg transition-all animate-pulse"
            >
              Instalar App
            </button>
           )}
          <button 
            onClick={handleEditClick}
            className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-gray-800"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
            <span className="hidden sm:inline">Editar Vehículo</span>
            <span className="sm:hidden">Editar</span>
          </button>
        </div>
      </div>

      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 pb-8">
        
        {/* Left Col: Car Visuals (360 View) */}
        <div className="flex flex-col gap-6">
          <div 
            className={`relative aspect-video rounded-2xl overflow-hidden shadow-2xl border border-gray-800 bg-black group select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleMouseDown}
            onTouchMove={handleMouseMove}
            onTouchEnd={handleMouseUp}
          >
             {profile.images && profile.images.length > 0 && profile.images[currentImageIndex] ? (
               <img 
                src={profile.images[currentImageIndex]} 
                alt={`${profile.brand} ${profile.model}`} 
                className="w-full h-full object-contain pointer-events-none"
                draggable={false}
              />
             ) : profile.imageBase64 ? (
               <img 
               src={profile.imageBase64} 
               alt="Static View" 
               className="w-full h-full object-contain"
               />
             ) : (
               <div className="w-full h-full flex items-center justify-center text-gray-600">No Image</div>
             )}
             
             {/* 360 Indicator */}
             {profile.images && profile.images.length > 1 && (
               <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm px-3 py-1 rounded-full flex items-center gap-2 pointer-events-none">
                 <svg className="w-4 h-4 text-white animate-spin-slow" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                 <span className="text-xs text-white font-bold">360°</span>
               </div>
             )}

             <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-6 pointer-events-none">
                <h2 className="text-2xl font-bold text-white">{profile.brand} {profile.model}</h2>
                <p className="text-blue-400 font-medium">{profile.year} • {profile.type} • {profile.color}</p>
                {profile.images && profile.images.length > 1 && (
                   <p className="text-gray-500 text-xs mt-1 flex items-center gap-1">
                     <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>
                     Arrastra para rotar
                   </p>
                )}
             </div>
          </div>

          {/* Stats Card */}
          <div className="bg-card p-6 rounded-xl border border-gray-800 shadow-lg grid grid-cols-2 gap-4">
             <div>
                <p className="text-gray-400 text-xs uppercase tracking-wider">Eficiencia Base</p>
                <p className="text-lg font-semibold text-white">{(profile.baselineKm / profile.baselineMoney).toFixed(2)} km/$</p>
             </div>
             <div>
                <p className="text-gray-400 text-xs uppercase tracking-wider">Consumo Real</p>
                <p className="text-lg font-semibold text-white">{(profile.baselineKm / profile.baselineLiters).toFixed(2)} km/L</p>
             </div>
          </div>
        </div>

        {/* Right Col: Calculator */}
        <div className="flex flex-col justify-center">
          <div className="bg-gray-800/40 backdrop-blur-sm p-8 rounded-3xl border border-gray-700/50 shadow-2xl">
            <h3 className="text-2xl font-bold mb-6 text-center">Calculadora de Rango</h3>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-blue-300 mb-2 uppercase tracking-wide">
                  ¿Cuánto dinero vas a echar?
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl">$</span>
                  <input 
                    type="number" 
                    value={calcAmount}
                    onChange={(e) => {
                      setCalcAmount(e.target.value);
                    }}
                    onKeyUp={calculatePrediction}
                    placeholder="0.00"
                    className="w-full bg-gray-900 border border-gray-600 rounded-xl py-4 pl-10 pr-4 text-3xl font-bold text-white placeholder-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  />
                </div>
              </div>

              <Button onClick={calculatePrediction} variant="primary" className="text-lg py-4 shadow-blue-900/20">
                Calcular Distancia
              </Button>
              
              <div className="pt-6 mt-2 border-t border-gray-700 text-center">
                <p className="text-gray-400 mb-2">Distancia estimada a recorrer</p>
                {predictedKm !== null ? (
                  <div className="animate-pulse-slow">
                    <span className="text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-blue-500">
                      {Math.round(predictedKm)}
                    </span>
                    <span className="text-xl text-gray-500 ml-2 font-medium">km</span>
                  </div>
                ) : (
                  <div className="h-20 flex items-center justify-center text-gray-600 font-mono text-sm">
                    Ingresa un monto para calcular
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default App;
