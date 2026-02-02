import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";

export function DemoPage() {
  return (
    <div className="min-h-screen p-8 pb-24">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="flex items-center justify-between">
          <h1 className="text-sm font-medium text-muted-foreground">uifork</h1>
          <Link to="/">
            <Button variant="ghost" size="sm">
              Back to Home
            </Button>
          </Link>
        </header>

        <div className="space-y-4">
          <h1 className="text-4xl font-bold text-foreground">Demo Page</h1>
          <p className="text-muted-foreground">
            This is a demo page to showcase React Router integration.
          </p>
        </div>
      </div>
    </div>
  );
}
