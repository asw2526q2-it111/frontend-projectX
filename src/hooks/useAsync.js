import { useCallback, useEffect, useState } from "react";

export function useAsync(loader, dependencies) {
  const [state, setState] = useState({
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);

  useEffect(() => {
    void load();
  }, [load]);

  return { ...state, reload: load };
}
