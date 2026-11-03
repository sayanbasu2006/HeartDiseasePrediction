"use client";
import { createContext, useContext, useState, ReactNode } from "react";
type Session = {
  latest: any;
  assessments: any[];
  setLatest: (v: any) => void;
  uploads: any[];
  setUploads: (v: any[]) => void;
  temporary: any;
  setTemporary: (v: any) => void;
};
const Context = createContext<Session>(null!);
export function Provider({ children }: { children: ReactNode }) {
  const [latest, updateLatest] = useState<any>(null);
  const [assessments, setAssessments] = useState<any[]>([]);
  const setLatest = (v: any) => {
    updateLatest(v);
    setAssessments((previous) => [v, ...previous]);
  };
  const [uploads, setUploads] = useState<any[]>([]);
  const [temporary, setTemporary] = useState<any>(null);
  return (
    <Context.Provider
      value={{
        latest,
        assessments,
        setLatest,
        uploads,
        setUploads,
        temporary,
        setTemporary,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export const useSession = () => useContext(Context);
