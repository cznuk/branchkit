import DashboardContent from "./DashboardContent";

export function DemoPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="border-b border-border/30 bg-background">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Left side: Logo and links */}
            <div className="flex items-center gap-8">
              <div className="w-24 h-6 bg-muted rounded"></div>
              <div className="flex items-center gap-6">
                <div className="w-12 h-4 bg-muted rounded"></div>
                <div className="w-16 h-4 bg-muted rounded"></div>
                <div className="w-16 h-4 bg-muted rounded"></div>
                <div className="w-14 h-4 bg-muted rounded"></div>
              </div>
            </div>
            {/* Right side: Avatar */}
            <div>
              <div className="w-8 h-8 bg-muted rounded-full"></div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <div className="container mx-auto px-4 py-8">
        <DashboardContent />
      </div>
    </div>
  );
}
