const BARS = [
  { color: 'bg-canary', delay: '0s', duration: '0.85s' },
  { color: 'bg-cobalt', delay: '0.15s', duration: '1.05s' },
  { color: 'bg-lime', delay: '0.05s', duration: '0.95s' },
  { color: 'bg-punch', delay: '0.25s', duration: '1.15s' },
]

export default function EqualizerAnimation({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`flex h-8 items-end gap-1 ${className ?? ''}`}
    >
      {BARS.map((bar, index) => (
        <span
          key={index}
          className={`eq-bar h-full w-2 rounded-sm border-2 border-ink ${bar.color}`}
          style={{ animationDelay: bar.delay, animationDuration: bar.duration }}
        />
      ))}
    </div>
  )
}
