import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import chroma from 'chroma-js';
import { Lock, Unlock, Copy, RefreshCw, Palette, Code, Check, SlidersHorizontal, Heart, Undo, Trash2, X, ChevronRight } from 'lucide-react';
import { cn } from './lib/utils';

type GenMode = 'random' | 'monochromatic' | 'analogous' | 'triadic' | 'tetradic';

const getColorsByMode = (mode: GenMode, baseColorHex: string) => {
  const base = chroma(baseColorHex);
  switch(mode) {
    case 'monochromatic':
        return chroma.scale([base.darken(2.5), base, base.brighten(2.5)]).colors(5);
    case 'analogous':
        return [
            base.set('hsl.h', '-45').hex(),
            base.set('hsl.h', '-20').hex(),
            base.hex(),
            base.set('hsl.h', '+20').hex(),
            base.set('hsl.h', '+45').hex(),
        ];
    case 'triadic':
        return [
            base.hex(),
            base.set('hsl.h', '+120').hex(),
            base.set('hsl.h', '+240').hex(),
            base.set('hsl.h', '+120').darken(1.5).hex(),
            base.set('hsl.h', '+240').brighten(1.5).hex(),
        ];
    case 'tetradic':
        return [
            base.hex(),
            base.set('hsl.h', '+90').hex(),
            base.set('hsl.h', '+180').hex(),
            base.set('hsl.h', '+270').hex(),
            base.brighten(2).hex(),
        ];
    case 'random':
    default:
        return Array.from({ length: 5 }, () => chroma.random().hex());
  }
};

export default function App() {
  const [colors, setColors] = useState<{ hex: string; locked: boolean }[]>([]);
  const [format, setFormat] = useState<'HEX' | 'RGB' | 'HSL'>('HEX');
  const [toast, setToast] = useState<string | null>(null);
  const [generationMode, setGenerationMode] = useState<GenMode>('random');
  const [history, setHistory] = useState<{ hex: string; locked: boolean }[][]>([]);
  const [savedPalettes, setSavedPalettes] = useState<string[][]>([]);
  
  const [showSaved, setShowSaved] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('palettes');
    if (saved) {
      try {
        setSavedPalettes(JSON.parse(saved));
      } catch(e){}
    }
    setColors(getColorsByMode('random', chroma.random().hex()).map(hex => ({ hex, locked: false })));
  }, []);

  const savePalettesToLocal = (palettes: string[][]) => {
     setSavedPalettes(palettes);
     localStorage.setItem('palettes', JSON.stringify(palettes));
  };

  const generateNewColors = useCallback(() => {
    setColors(prev => {
        if (prev.length > 0) setHistory(h => [...h.slice(-15), prev]);

        let baseColorHex = chroma.random().hex();
        const lockedC = prev.find(c => c.locked);
        if (lockedC) baseColorHex = lockedC.hex;

        const newHexes = getColorsByMode(generationMode, baseColorHex);
        
        return prev.map((c, i) => c.locked ? c : { hex: newHexes[i] || chroma.random().hex(), locked: false });
    });
  }, [generationMode]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && e.target === document.body && !showExport && !showSaved) {
        e.preventDefault();
        generateNewColors();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [generateNewColors, showExport, showSaved]);

  const toggleLock = (index: number) => {
    setColors(prev => {
      const next = [...prev];
      next[index].locked = !next[index].locked;
      return next;
    });
  };

  const copyToClipboard = (text: string, index?: number) => {
    navigator.clipboard.writeText(text);
    setToast(`${text} nusxi olindi!`);
    if (index !== undefined) {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 1500);
    }
    setTimeout(() => setToast(null), 2000);
  };

  const undo = () => {
    if (history.length > 0) {
      const prev = history[history.length - 1];
      setHistory(h => h.slice(0, -1));
      setColors(prev);
    }
  };

  const saveCurrentPalette = () => {
    const hexes = colors.map(c => c.hex);
    if (!savedPalettes.some(p => p.join(',') === hexes.join(','))) {
      savePalettesToLocal([...savedPalettes, hexes]);
      setToast('Palitra saqlandi!');
      setTimeout(() => setToast(null), 2000);
    } else {
      setToast('Bu palitra allaqachon saqlangan');
      setTimeout(() => setToast(null), 2000);
    }
  };

  const loadSavedPalette = (hexes: string[]) => {
    if (colors.length > 0) setHistory(h => [...h.slice(-15), colors]);
    setColors(hexes.map(hex => ({ hex, locked: false })));
    setShowSaved(false);
  };

  const getFormattedColor = (hex: string) => {
    if (format === 'RGB') {
      const [r, g, b] = chroma(hex).rgb();
      return `rgb(${r}, ${g}, ${b})`;
    }
    if (format === 'HSL') {
      const [h, s, l] = chroma(hex).hsl();
      return `hsl(${isNaN(h) ? 0 : Math.round(h)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
    }
    return hex.toUpperCase();
  };

  if (colors.length === 0) return null;

  return (
    <div className="h-screen w-full flex flex-col font-sans overflow-hidden bg-gray-50 text-gray-900">
      
      {/* Header */}
      <header className="h-16 flex items-center justify-between px-4 md:px-6 bg-white border-b border-gray-200 z-20 shrink-0">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 p-2 rounded-lg shadow-sm">
             <Palette className="w-5 h-5 text-white" />
          </div>
          <h1 className="font-bold text-lg md:text-xl tracking-tight hidden sm:block">Rang Palitrasi</h1>
        </div>
        
        <div className="flex items-center gap-2 md:gap-4">
          <div className="hidden xl:flex items-center gap-2 text-sm text-gray-500 mr-2 font-medium bg-gray-50 px-3 py-1.5 rounded-md border border-gray-100">
            <span className="bg-white flex items-center justify-center rounded px-2 py-0.5 shadow-sm border border-gray-200 text-xs text-gray-700 font-mono">Space</span>
            tugmasini bosib yangilang
          </div>

          <div className="flex items-center bg-gray-100 rounded-md p-1 border border-gray-200">
            <button 
              onClick={undo} 
              disabled={history.length === 0}
              className={cn("p-1.5 rounded-sm transition-colors", history.length === 0 ? "opacity-30 cursor-not-allowed" : "hover:bg-white hover:shadow-sm")}
              title="Orqaga (Undo)"
            >
              <Undo className="w-4 h-4" />
            </button>
            <div className="w-px h-4 bg-gray-300 mx-1"></div>
            <button 
              onClick={() => setShowSaved(true)} 
              className="p-1.5 rounded-sm hover:bg-white hover:shadow-sm transition-colors text-rose-600 relative"
              title="Saqlanganlar"
            >
              <Heart className={cn("w-4 h-4", savedPalettes.length > 0 && "fill-rose-100")} />
              {savedPalettes.length > 0 && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 text-white flex items-center justify-center rounded-full text-[8px] font-bold">
                  {savedPalettes.length}
                </span>
              )}
            </button>
          </div>

          <div className="hidden sm:flex border border-gray-200 rounded-md overflow-hidden text-xs md:text-sm font-medium bg-gray-50">
            {['HEX', 'RGB', 'HSL'].map(f => (
              <button 
                key={f}
                onClick={() => setFormat(f as any)} 
                className={cn("px-3 py-1.5 transition-colors", format === f ? "bg-white shadow-sm font-semibold" : "text-gray-500 hover:text-gray-900 hover:bg-gray-100")}
              >
                {f}
              </button>
            ))}
          </div>
          
          <button 
            onClick={() => setShowExport(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-xs md:text-sm font-medium rounded-md text-white bg-gray-900 hover:bg-gray-800 transition-colors shadow-sm"
          >
            <Code className="w-4 h-4 hidden lg:block" />
            <span>Eksport</span>
          </button>
          
          <button 
            onClick={saveCurrentPalette}
            className="flex items-center gap-2 px-3 py-1.5 text-xs md:text-sm font-medium rounded-md text-indigo-700 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 transition-colors"
          >
            <Heart className="w-4 h-4 hidden lg:block" />
            <span>Saqlash</span>
          </button>

          <button 
            onClick={generateNewColors}
            className="flex lg:hidden items-center p-2 text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Colors Area */}
      <main className="flex-1 flex flex-col md:flex-row w-full h-full relative z-0">
        {colors.map((color, index) => {
          const displayColor = getFormattedColor(color.hex);
          const colorObj = chroma(color.hex);
          const contrastColor = chroma.contrast(color.hex, 'black') > 4.5 ? '#000000' : '#FFFFFF';
          const buttonHoverBg = contrastColor === '#000000' ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.15)';
          const name = colorObj.name();

          return (
            <motion.div
              key={index}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, backgroundColor: color.hex, scale: 1 }}
              transition={{ type: "spring", stiffness: 150, damping: 20 }}
              className="flex-1 flex flex-row md:flex-col items-center justify-between md:justify-center p-4 md:p-8 cursor-pointer group relative overflow-hidden"
              style={{ color: contrastColor }}
              onClick={(e) => {
                const target = e.target as HTMLElement;
                if (target.closest('button')) return;
                copyToClipboard(displayColor, index);
              }}
            >
              <div className="hidden md:flex flex-1 items-end pb-8 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                 <button 
                  onClick={(e) => { e.stopPropagation(); toggleLock(index); }}
                  className="p-3 rounded-full backdrop-blur-md transition-all hover:scale-110 active:scale-95"
                  style={{ backgroundColor: buttonHoverBg }}
                  title="Qulflash / Qulfdan chiqarish"
                >
                  {color.locked ? <Lock className="w-6 h-6" /> : <Unlock className="w-6 h-6" />}
                </button>
              </div>

              <div className="flex flex-col items-start md:items-center gap-1 md:gap-2 z-10 w-48 md:w-auto">
                <span className={cn("font-bold tracking-wider font-mono", format === 'HEX' ? "text-2xl md:text-3xl lg:text-4xl" : "text-lg md:text-xl lg:text-2xl")}>
                  {displayColor}
                </span>
                <span className="text-xs md:text-sm font-medium opacity-80 uppercase tracking-widest flex items-center gap-1">
                  {name === color.hex ? 'RANG' : name}
                </span>
              </div>

              <div className="flex md:flex-1 md:items-start md:pt-8 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity gap-2 md:gap-3 z-10">
                <button 
                  onClick={(e) => { e.stopPropagation(); toggleLock(index); }}
                  className="p-3 md:hidden rounded-full backdrop-blur-md transition-colors"
                  style={{ backgroundColor: buttonHoverBg }}
                >
                  {color.locked ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); copyToClipboard(displayColor, index); }}
                  className="p-3 rounded-full backdrop-blur-md transition-all hover:scale-110 active:scale-95 relative"
                  style={{ backgroundColor: buttonHoverBg }}
                  title="Nusxa olish"
                >
                  {copiedIndex === index ? <Check className="w-5 h-5 md:w-6 md:h-6" /> : <Copy className="w-5 h-5 md:w-6 md:h-6" />}
                </button>
              </div>
              
              {/* Active copy indicator */}
              <AnimatePresence>
                {copiedIndex === index && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="absolute inset-0 bg-black/10 backdrop-blur-sm z-20 flex items-center justify-center font-bold text-2xl tracking-widest uppercase pointer-events-none"
                    style={{ color: contrastColor }}
                  >
                    Nusxa Olindi
                  </motion.div>
                )}
              </AnimatePresence>

            </motion.div>
          );
        })}
      </main>

      {/* Bottom Toolbar */}
      <div className="h-16 md:h-20 bg-white border-t border-gray-200 flex items-center justify-between px-4 md:px-8 shrink-0 z-20">
        <div className="flex items-center gap-4 w-full max-w-4xl mx-auto justify-between">
          
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-gray-500 hidden sm:block" />
            <select 
              value={generationMode}
              onChange={(e) => setGenerationMode(e.target.value as GenMode)}
              className="bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2 md:p-2.5 font-medium outline-none cursor-pointer hover:bg-gray-100 transition-colors"
            >
              <option value="random">Tasodifiy (Random)</option>
              <option value="monochromatic">Bir xil rangli (Monochromatic)</option>
              <option value="analogous">O'xshash (Analogous)</option>
              <option value="triadic">Uchlik (Triadic)</option>
              <option value="tetradic">To'rtlik (Tetradic)</option>
            </select>
          </div>

          <button 
            onClick={generateNewColors}
            className="flex items-center gap-2 px-6 md:px-8 py-2 md:py-3 text-sm md:text-base font-bold rounded-full text-white bg-indigo-600 hover:bg-indigo-700 transition-all active:scale-95 shadow-md hover:shadow-lg"
          >
            <RefreshCw className="w-5 h-5" />
            <span className="hidden sm:inline">Palitrani Yangilash</span>
            <span className="inline sm:hidden">Yangilash</span>
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-24 md:bottom-28 left-1/2 -translate-x-1/2 bg-gray-900/95 backdrop-blur text-white px-5 md:px-6 py-2.5 md:py-3 rounded-full shadow-xl text-sm md:text-base font-medium tracking-wide z-50 flex items-center gap-2 pointer-events-none border border-gray-700"
          >
            <Check className="w-4 h-4 text-green-400" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Saved Palettes Sidebar */}
      <AnimatePresence>
        {showSaved && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSaved(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full sm:w-96 bg-white shadow-2xl z-40 flex flex-col border-l border-gray-200"
            >
              <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                <div className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-rose-500 fill-rose-500" />
                  <h2 className="font-bold text-lg">Saqlanganlar</h2>
                </div>
                <button onClick={() => setShowSaved(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {savedPalettes.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-4">
                    <Heart className="w-12 h-12 stroke-1" />
                    <p className="text-sm font-medium">Hali palitralar saqlanmagan</p>
                  </div>
                ) : (
                  savedPalettes.map((palette, idx) => (
                    <div key={idx} className="bg-white border text-gray-800 border-gray-200 rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow group relative pr-12">
                      <div 
                        className="flex h-12 rounded-lg overflow-hidden cursor-pointer"
                        onClick={() => loadSavedPalette(palette)}
                      >
                        {palette.map((pColor, cIdx) => (
                          <div key={cIdx} className="flex-1 transition-transform hover:scale-105 origin-center relative z-10" style={{ backgroundColor: pColor }} />
                        ))}
                      </div>
                      <div className="mt-2 flex justify-between items-center text-xs text-gray-500 font-mono pl-1">
                        <span>{palette[0].toUpperCase()} ...</span>
                      </div>
                      <button 
                        onClick={() => savePalettesToLocal(savedPalettes.filter((_, i) => i !== idx))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="O'chirish"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Export Modal */}
      <AnimatePresence>
        {showExport && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowExport(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-2xl bg-white rounded-2xl shadow-2xl z-40 overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="p-5 md:p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                <div className="flex items-center gap-2 text-gray-900">
                  <Code className="w-6 h-6" />
                  <h2 className="font-bold text-xl">Kodni Eksport Qilish</h2>
                </div>
                <button onClick={() => setShowExport(false)} className="p-2 hover:bg-gray-200 text-gray-500 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-5 md:p-6 bg-gray-50">
                
                <div className="space-y-6">
                  {/* CSS Variables */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-700 text-sm">CSS Variables</h3>
                      <button 
                        onClick={() => copyToClipboard(`:root {\n${colors.map((c, i) => `  --color-${i + 1}: ${c.hex};`).join('\n')}\n}`)}
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded"
                      >
                         Nusxa Olish
                      </button>
                    </div>
                    <pre className="bg-gray-900 text-green-400 p-4 rounded-xl text-xs md:text-sm font-mono overflow-x-auto shadow-inner">
                      <code>
{`:root {
${colors.map((c, i) => `  --color-${i + 1}: ${c.hex};`).join('\n')}
}`}
                      </code>
                    </pre>
                  </div>

                  {/* Tailwind Config */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-700 text-sm">Tailwind CSS Options</h3>
                      <button 
                        onClick={() => copyToClipboard(`colors: {\n  palette: {\n${colors.map((c, i) => `    ${(i + 1) * 100}: '${c.hex}',`).join('\n')}\n  }\n}`)}
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded"
                      >
                         Nusxa Olish
                      </button>
                    </div>
                    <pre className="bg-gray-900 text-sky-400 p-4 rounded-xl text-xs md:text-sm font-mono overflow-x-auto shadow-inner">
                      <code>
{`// tailwind.config.js / theme.extend.colors
colors: {
  palette: {
${colors.map((c, i) => `    ${(i + 1) * 100}: '${c.hex}',`).join('\n')}
  }
}`}
                      </code>
                    </pre>
                  </div>
                  
                  {/* SCSS Variables */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-700 text-sm">SCSS Variables</h3>
                      <button 
                        onClick={() => copyToClipboard(`${colors.map((c, i) => `$color-${i + 1}: ${c.hex};`).join('\n')}`)}
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded"
                      >
                         Nusxa Olish
                      </button>
                    </div>
                    <pre className="bg-gray-900 text-pink-400 p-4 rounded-xl text-xs md:text-sm font-mono overflow-x-auto shadow-inner">
                      <code>
{`${colors.map((c, i) => `$color-${i + 1}: ${c.hex};`).join('\n')}`}
                      </code>
                    </pre>
                  </div>
                </div>

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}

