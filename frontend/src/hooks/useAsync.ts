import { useCallback, useEffect, useRef, useState } from 'react';

export function useAsync<T>(task: () => Promise<T>, dependencies: unknown[] = []) {
  const taskRef = useRef(task);
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    taskRef.current = task;
  }, [task]);

  const execute = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await taskRef.current();
      setData(result);
      return result;
    } catch (requestError) {
      setError(requestError);
      throw requestError;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void execute().catch(() => undefined);
    // The caller controls reloads through the dependency list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);

  return { data, error, isLoading, execute };
}

export default useAsync;
