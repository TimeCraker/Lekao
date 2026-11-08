export default function Loading() {
  return (
    <div className="animate-pulse">
      {/* TopBar 骨架（对齐实际 TopBar 高度与偏移） */}
      <div className="sticky top-14 md:top-0 z-20 bg-canvas-alt/80 backdrop-blur-md border-b border-hairline">
        <div className="px-6 md:px-12 h-[68px] flex items-center gap-2.5">
          <div className="w-[3px] h-5 bg-hairline rounded-full" />
          <div className="h-4 w-28 bg-hairline rounded" />
        </div>
      </div>
      {/* 内容骨架 */}
      <div className="px-6 md:px-12 py-10 md:py-16 max-w-6xl mx-auto">
        <div className="h-9 w-2/3 bg-hairline rounded mb-10 md:mb-14" />
        <div className="grid md:grid-cols-3 gap-5 mb-14 md:mb-20">
          <div className="md:col-span-2 h-44 bg-hairline rounded-2xl" />
          <div className="h-44 bg-hairline rounded-2xl" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          <div className="sm:col-span-2 lg:col-span-2 h-40 bg-hairline rounded-2xl" />
          <div className="h-40 bg-hairline rounded-2xl" />
          <div className="h-40 bg-hairline rounded-2xl" />
          <div className="sm:col-span-2 lg:col-span-2 h-40 bg-hairline rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
