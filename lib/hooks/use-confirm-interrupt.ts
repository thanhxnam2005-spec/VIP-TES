import { useCallback, useState } from "react";

/**
 * Hook for guarding destructive actions while an AI process is running.
 *
 * Usage:
 * ```tsx
 * const { showConfirm, guard, confirm, dismiss } = useConfirmInterrupt(isStreaming);
 * // Wrap the action that would interrupt the process:
 * <button onClick={() => guard(() => { cancel(); close(); })}>Close</button>
 * // Render the dialog:
 * <ConfirmInterruptDialog open={showConfirm} onConfirm={confirm} onCancel={dismiss} />
 * ```
 */
export function useConfirmInterrupt(isProcessing: boolean) {
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const guard = useCallback(
    (action: () => void) => {
      if (isProcessing) {
        setPendingAction(() => action);
      } else {
        action();
      }
    },
    [isProcessing],
  );

  const confirm = useCallback(() => {
    pendingAction?.();
    setPendingAction(null);
  }, [pendingAction]);

  const dismiss = useCallback(() => {
    setPendingAction(null);
  }, []);

  return { showConfirm: pendingAction !== null, guard, confirm, dismiss };
}
