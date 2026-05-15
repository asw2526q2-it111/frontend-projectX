import { useCallback, useEffect, useState } from "react";

type AsyncState<T> = {
  data: T | null;
  error: Error | null;
  loading: boolean;
};

export function useAsync<T>(loader: () => Promise<T>, dependencies: React.DependencyList) {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    error: null,
    loading: true,
  });

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: null }));

    try {
      const data = await loader();
      setState({ data, error: null, loading: false });
    } catch (error) {
      setState({
        data: null,
        error: error instanceof Error ? error : new Error("Unexpected error"),
        loading: false,
      });
    }
    // The callers own the dependency list, mirroring useEffect's API.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);

  useEffect(() => {
    void load();
  }, [load]);

  return { ...state, reload: load };
}
