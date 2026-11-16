import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export function useResource(path: string) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    setError("");
    api(path)
      .then((r) => {
        if (alive) setData(r);
      })
      .catch((e) => {
        if (alive) setError(e.message);
      });
    return () => {
      alive = false;
    };
  }, [path, tick]);
  return { data, error, reload: () => setTick((v) => v + 1) };
}
