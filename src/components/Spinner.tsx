export default function Spinner({ size = 16 }: { size?: number }) {
  return (
    <span
      className="inline-block flex-shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
      style={{ width: size, height: size }}
      aria-hidden="true"
    />
  );
}
