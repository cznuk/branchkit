export default function DashboardContent() {
  return (
    <div className="">
      {/* Heading */}
      <div className="mb-8">
        <h1 className="text-left font-semibold tracking-tight text-3xl text-muted-foreground">
          Welcome back, Sam
        </h1>
      </div>

      {/* Two column layout */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left column */}
        <div className="col-span-8 space-y-6">
          {/* Top card */}
          <div className="h-96 rounded-lg bg-muted"></div>

          {/* Three cards below */}
          <div className="grid grid-cols-3 gap-6">
            <div className="h-48 rounded-lg bg-muted"></div>
            <div className="h-48 rounded-lg bg-muted"></div>
            <div className="h-48 rounded-lg bg-muted"></div>
          </div>
        </div>

        {/* Right column */}
        <div className="col-span-4 space-y-6">
          {/* Top card */}
          <div className="h-96 rounded-lg bg-muted"></div>

          {/* Three list items below */}
          <div className="space-y-3">
            <div className="h-8 rounded-lg bg-muted"></div>
            <div className="h-8 rounded-lg bg-muted"></div>
            <div className="h-8 rounded-lg bg-muted"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
