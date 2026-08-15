"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

const STORAGE_KEY = "casa-habitat:favoris";

interface FavoritesContextValue {
  favorites: string[];
  isFavorite: (reference: string) => boolean;
  toggle: (reference: string) => void;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Lecture de localStorage volontairement différée à l'effet plutôt qu'à
    // l'initialisation du state : ça garde le premier rendu client identique
    // au rendu serveur (pas de valeur venant du navigateur) et évite donc
    // une erreur d'hydratation Next.js. C'est la synchronisation avec un
    // système externe (le stockage du navigateur) que useEffect est censé
    // gérer, donc l'appel de setState ici est volontaire.
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setFavorites(JSON.parse(raw));
    } catch {
      // stockage indisponible : on continue avec une liste vide
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
    } catch {
      // stockage indisponible : rien à faire de plus ici
    }
  }, [favorites, hydrated]);

  const toggle = (reference: string) => {
    setFavorites((prev) =>
      prev.includes(reference)
        ? prev.filter((r) => r !== reference)
        : [...prev, reference]
    );
  };

  const isFavorite = (reference: string) => favorites.includes(reference);

  return (
    <FavoritesContext.Provider value={{ favorites, isFavorite, toggle }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) {
    throw new Error("useFavorites doit être utilisé dans un FavoritesProvider");
  }
  return ctx;
}
