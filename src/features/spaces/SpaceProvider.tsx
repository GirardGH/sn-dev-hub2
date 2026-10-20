"use client";
import { createContext, useContext } from 'react';
import type { SpaceContext } from './space.types';
const Context = createContext<SpaceContext | null>(null);
export function SpaceProvider({ value, children }: { value: SpaceContext; children: React.ReactNode }) { return <Context.Provider value={value}>{children}</Context.Provider>; }
export const useSpace = () => useContext(Context);
