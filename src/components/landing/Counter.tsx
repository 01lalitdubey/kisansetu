import { useCountUp, useReveal } from './hooks';

/** Big number that counts up when it scrolls into view. */
export function Counter({
  to,
  suffix = '',
  prefix = '',
  className = '',
  pad = 0,
}: {
  to: number;
  suffix?: string;
  prefix?: string;
  className?: string;
  pad?: number;
}) {
  const { ref, shown } = useReveal<HTMLSpanElement>({ threshold: 0.4 });
  const n = useCountUp(to, shown);
  const text = pad ? String(n).padStart(pad, '0') : String(n);
  return (
    <span ref={ref} className={className}>
      {prefix}
      {text}
      {suffix}
    </span>
  );
}
