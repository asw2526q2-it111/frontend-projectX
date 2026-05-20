import { useCallback, useEffect, useState } from "react";

export function useAsync(loader, dependencies) {
  const [state, setState] = useState({
    data: null,
    error: null,
    loading: true,
  });

  const load = useCallback(async (options = {}) => {
    const silent = options.silent === true;
    setState((current) => ({
      ...current,
      loading: silent ? current.loading : true,
      error: null,
    }));

    try {
      const data = await loader();
      setState({ data, error: null, loading: false });
    } catch (error) {
      setState((current) => ({
        data: silent ? current.data : null,
        error: error instanceof Error ? error : new Error("Unexpected error"),
        loading: false,
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);

  const setData = useCallback((data) => {
    setState((current) => ({ ...current, data, error: null, loading: false }));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { ...state, reload: load, setData };
}
