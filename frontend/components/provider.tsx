"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  workspaceStorageKey,
  workspaceStorageSchema,
  type UploadDraft,
  type WorkspaceData,
} from "@/lib/workspace-storage";

const emptyWorkspace: WorkspaceData = {
  assessments: [],
  uploads: [],
  temporary: null,
  assessmentDraft: null,
  uploadDraft: null,
};

type StoragePreference = {
  ready: boolean;
  enabled: boolean;
  error: string;
};

type Session = WorkspaceData & {
  latest: WorkspaceData["assessments"][number] | null;
  setLatest: (value: WorkspaceData["assessments"][number]) => void;
  setTemporary: (value: WorkspaceData["temporary"]) => void;
  setAssessmentDraft: (value: WorkspaceData["assessmentDraft"]) => void;
  setUploadDraft: (value: WorkspaceData["uploadDraft"]) => void;
  recordUpload: (value: UploadDraft) => void;
  storage: StoragePreference;
  setStorageEnabled: (enabled: boolean) => void;
};

const Context = createContext<Session>(null!);

export function Provider({ children }: { children: ReactNode }) {
  const [workspace, setWorkspace] = useState(emptyWorkspace);
  const current = useRef(workspace);
  const enabled = useRef(false);
  const [storage, setStorage] = useState<StoragePreference>({
    ready: false,
    enabled: false,
    error: "",
  });

  useEffect(() => {
    let error = "";
    try {
      const saved = window.localStorage.getItem(workspaceStorageKey);
      if (saved !== null) {
        enabled.current = true;
        current.current = workspaceStorageSchema.parse(JSON.parse(saved));
        setWorkspace(current.current);
      }
    } catch {
      error = "Browser storage could not be read.";
    }
    setStorage({ ready: true, enabled: enabled.current, error });

    function onStorage(event: StorageEvent) {
      if (
        (event.key === workspaceStorageKey || event.key === null) &&
        event.newValue === null
      ) {
        enabled.current = false;
        setStorage({ ready: true, enabled: false, error: "" });
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const update = useCallback((changes: Partial<WorkspaceData>) => {
    current.current = { ...current.current, ...changes };
    setWorkspace(current.current);
    if (!enabled.current) return;

    try {
      if (window.localStorage.getItem(workspaceStorageKey) === null) {
        enabled.current = false;
      } else {
        window.localStorage.setItem(
          workspaceStorageKey,
          JSON.stringify(current.current),
        );
      }
      setStorage({ ready: true, enabled: enabled.current, error: "" });
    } catch {
      setStorage({
        ready: true,
        enabled: true,
        error: "Recent changes could not be saved in this browser.",
      });
    }
  }, []);

  function setStorageEnabled(next: boolean) {
    try {
      if (next) {
        window.localStorage.setItem(
          workspaceStorageKey,
          JSON.stringify(current.current),
        );
      } else {
        window.localStorage.removeItem(workspaceStorageKey);
      }
      enabled.current = next;
      setStorage({ ready: true, enabled: next, error: "" });
    } catch {
      setStorage({
        ready: true,
        enabled: enabled.current,
        error: next
          ? "Browser saving could not be enabled. Your work is still open in this tab."
          : "Saved workspace data could not be removed from this browser.",
      });
    }
  }

  const setAssessmentDraft = useCallback(
    (assessmentDraft: WorkspaceData["assessmentDraft"]) => {
      if (
        assessmentDraft !== null ||
        current.current.assessmentDraft !== null
      ) {
        update({ assessmentDraft });
      }
    },
    [update],
  );

  return (
    <Context.Provider
      value={{
        ...workspace,
        latest: workspace.assessments[0] ?? null,
        setLatest: (value) =>
          update({
            assessments: [value, ...current.current.assessments],
            assessmentDraft: null,
          }),
        setTemporary: (temporary) => update({ temporary }),
        setAssessmentDraft,
        setUploadDraft: (uploadDraft) => update({ uploadDraft }),
        recordUpload: (uploadDraft) =>
          update({
            uploadDraft,
            uploads: [
              ...current.current.uploads,
              { name: uploadDraft.name, rows: uploadDraft.rows.length },
            ],
          }),
        storage,
        setStorageEnabled,
      }}
    >
      {children}
    </Context.Provider>
  );
}

export const useSession = () => useContext(Context);
