"use client";
import { useSpace } from './SpaceProvider';
import { canWrite } from './space.types';
export function SpaceWriteOnly({ children }: { children: React.ReactNode }) { const context=useSpace();return !context || canWrite(context.active.role) ? <>{children}</> : null; }
