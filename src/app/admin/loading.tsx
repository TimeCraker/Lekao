export default function Loading() {
  return (
    <div className="animate-pulse space-y-5">
      <div className="h-7 w-40 bg-hairline rounded" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 bg-hairline rounded-xl" />
        ))}
      </div>
      <div className="h-72 bg-hairline rounded-xl" />
    </div>
  );
}
