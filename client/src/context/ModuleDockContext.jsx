import React, { createContext, useContext, useState, useCallback } from 'react';

const ModuleDockContext = createContext(null);

export const ModuleDockProvider = ({ children }) => {
  const [dockedModules, setDockedModules] = useState([]);

  // Modülü dock'a kaydet veya güncelle
  const registerModule = useCallback((moduleData) => {
    setDockedModules(prev => {
      const idx = prev.findIndex(m => m.id === moduleData.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], ...moduleData };
        return copy;
      }
      return [...prev, moduleData];
    });
  }, []);

  // Canlı durum bilgisini (ör. sayaç, aktif harf) anlık güncelle
  const updateModule = useCallback((id, updates) => {
    setDockedModules(prev =>
      prev.map(m => (m.id === id ? { ...m, ...updates } : m))
    );
  }, []);

  // Simge durumuna küçült
  const minimizeModule = useCallback((id) => {
    setDockedModules(prev =>
      prev.map(m => (m.id === id ? { ...m, isMinimized: true } : m))
    );
  }, []);

  // Simge durumundan geri yükle
  const restoreModule = useCallback((id) => {
    setDockedModules(prev => {
      const target = prev.find(m => m.id === id);
      if (target && typeof target.onRestore === 'function') {
        target.onRestore();
      }
      return prev.map(m => (m.id === id ? { ...m, isMinimized: false } : m));
    });
  }, []);

  // Modülü kapat ve dock'tan çıkar
  const closeModule = useCallback((id) => {
    setDockedModules(prev => {
      const target = prev.find(m => m.id === id);
      if (target && typeof target.onClose === 'function') {
        target.onClose();
      }
      return prev.filter(m => m.id !== id);
    });
  }, []);

  // Modül unmount olduğunda dock'tan sil
  const unregisterModule = useCallback((id) => {
    setDockedModules(prev => prev.filter(m => m.id !== id));
  }, []);

  return (
    <ModuleDockContext.Provider
      value={{
        dockedModules,
        registerModule,
        updateModule,
        minimizeModule,
        restoreModule,
        closeModule,
        unregisterModule
      }}
    >
      {children}
    </ModuleDockContext.Provider>
  );
};

export const useModuleDock = () => {
  const context = useContext(ModuleDockContext);
  if (!context) {
    // If used outside provider, return safe no-ops
    return {
      dockedModules: [],
      registerModule: () => {},
      updateModule: () => {},
      minimizeModule: () => {},
      restoreModule: () => {},
      closeModule: () => {},
      unregisterModule: () => {}
    };
  }
  return context;
};
