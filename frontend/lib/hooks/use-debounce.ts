import { useEffect, useState } from "react";

/**
 * Returns a debounced copy of `value` that only updates after `delay`ms have
 * passed without a change. Use for search inputs so we don't fire a request on
 * every keystroke.
 *
 *   const [text, setText] = useState("");
 *   const debounced = useDebounce(text, 400);
 *   // fetch with `debounced`
 */
export function useDebounce<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
