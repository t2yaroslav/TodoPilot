import { useEffect, useState, useRef } from 'react';
import { Progress, Group, Text } from '@mantine/core';
import { getAvgDuration } from '@/api/client';

interface AIProgressBarProps {
  /** Operation type key matching backend operation_type, e.g. "survey_generate_step_2" */
  operationType: string;
  /** Whether the operation is currently running */
  active: boolean;
  /** Hint text to show below the bar */
  hint?: string;
}

/** Default estimated duration when no historical data exists (ms) */
const DEFAULT_DURATION_MS = 15_000;

/** How often to update the visual progress (ms) */
const TICK_MS = 200;

/**
 * Animated progress bar that estimates completion time based on
 * average historical duration for the given operation type.
 *
 * Uses an asymptotic curve: progress slows down as it approaches 95%,
 * so it never reaches 100% until the operation actually completes.
 */
export function AIProgressBar({ operationType, active, hint }: AIProgressBarProps) {
  const [progress, setProgress] = useState(0);
  const [remainingSec, setRemainingSec] = useState<number | null>(null);
  const [estimatedMs, setEstimatedMs] = useState<number | null>(null);
  const startTimeRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  // Fetch average duration when operation starts
  useEffect(() => {
    if (!active) {
      setProgress(0);
      setEstimatedMs(null);
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    startTimeRef.current = Date.now();

    getAvgDuration(operationType)
      .then(({ data }) => {
        setEstimatedMs(data.avg_duration_ms ?? DEFAULT_DURATION_MS);
      })
      .catch(() => {
        setEstimatedMs(DEFAULT_DURATION_MS);
      });
  }, [active, operationType]);

  // Animate progress bar
  useEffect(() => {
    if (!active || estimatedMs === null) return;

    const duration = estimatedMs;

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      // Asymptotic curve: approaches 95% but never reaches it
      // Formula: progress = 95 * (1 - e^(-2 * elapsed / duration))
      const ratio = elapsed / duration;
      const value = 95 * (1 - Math.exp(-2 * ratio));
      setProgress(Math.min(value, 95));
      // Update remaining time estimate
      const remaining = Math.max(0, Math.round((duration - elapsed) / 1000));
      setRemainingSec(remaining);
    }, TICK_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [active, estimatedMs]);

  if (!active) return null;

  return (
    <div style={{ width: '100%', marginTop: 8 }}>
      <Progress
        value={progress}
        size="sm"
        radius="xl"
        color="indigo"
        animated
        striped
      />
      <Group gap="xs" justify="center" mt={4}>
        {hint && (
          <Text size="xs" c="dimmed">
            {hint}
          </Text>
        )}
        {remainingSec !== null && remainingSec > 0 && (
          <Text size="xs" c="dimmed">
            ~{remainingSec} сек
          </Text>
        )}
      </Group>
    </div>
  );
}
