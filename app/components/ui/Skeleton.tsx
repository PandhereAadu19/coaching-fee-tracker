export default function Skeleton({ className = "" }: { className?: string }) {
    return <div aria-hidden className={`animate-pulse rounded-lg bg-neutral-200 ${className}`} />;
  }