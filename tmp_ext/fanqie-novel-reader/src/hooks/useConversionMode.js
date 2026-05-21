import { useState, useCallback } from 'react';
import { getConversionMode, setConversionMode } from '../utils/storage';

export function useConversionMode(onChange) {
  const [mode, setModeState] = useState(getConversionMode);

  const setMode = useCallback(
    (newMode) => {
      setConversionMode(newMode);
      setModeState(newMode);
      if (onChange) onChange(newMode);
    },
    [onChange]
  );

  return [mode, setMode];
}
