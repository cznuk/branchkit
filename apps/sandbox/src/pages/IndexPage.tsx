import { useTheme } from "../components/theme-provider";
import { ExampleContainer } from "../components/ExampleContainer";
import ExplainerAnimation from "../components/ExplainerAnimation";
import Example1 from "../examples/Example1";
import Example2 from "../examples/Example2";
import Example3 from "../examples/Example3";
import ContactCard from "../components/ContactCard";
import { Button } from "../components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import { TooltipProvider } from "../components/ui/tooltip";
import { ChevronDown } from "lucide-react";

export function IndexPage() {
  const { theme, setTheme } = useTheme();

  // Contact card data
  const contacts = [
    { id: 1, avatar: "👨‍💻", name: "Alex Johnson", profession: "Software Engineer" },
    { id: 2, avatar: "👩‍🎨", name: "Sarah Chen", profession: "Product Designer" },
    { id: 3, avatar: "👨‍💼", name: "Michael Brown", profession: "Product Manager" },
  ];

  return (
    <TooltipProvider>
      <div className="min-h-screen p-8 pb-24">
        <div className="max-w-4xl mx-auto space-y-16">
          <header className="flex items-center justify-between">
            <h1 className="text-sm font-medium text-muted-foreground">branchkit</h1>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground [&_svg:last-child]:h-3 [&_svg:last-child]:w-3 gap-1"
                >
                  {theme === "light" ? "Light" : theme === "dark" ? "Dark" : "System"}
                  <ChevronDown className="ml-1 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-40" align="end" side="bottom">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Theme</DropdownMenuLabel>
                  <DropdownMenuCheckboxItem
                    checked={theme === "light"}
                    onCheckedChange={(checked) => {
                      if (checked) setTheme("light");
                    }}
                  >
                    Light
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={theme === "dark"}
                    onCheckedChange={(checked) => {
                      if (checked) setTheme("dark");
                    }}
                  >
                    Dark
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={theme === "system"}
                    onCheckedChange={(checked) => {
                      if (checked) setTheme("system");
                    }}
                  >
                    System
                  </DropdownMenuCheckboxItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>

          {/* Explainer Animation Hero */}
          <ExplainerAnimation />

          {/* Example 1 */}
          <div className="space-y-4">
            <h2 className="text-3xl font-semibold text-foreground">Example 1</h2>
            <ExampleContainer>
              <Example1 />
            </ExampleContainer>
          </div>

          {/* Example 2 */}
          <div className="space-y-4">
            <h2 className="text-3xl font-semibold text-foreground">Example 2</h2>
            <ExampleContainer>
              <Example2 />
            </ExampleContainer>
          </div>

          {/* Example 3 */}
          <div className="space-y-4">
            <h2 className="text-3xl font-semibold text-foreground">Example 3</h2>
            <ExampleContainer>
              <Example3 />
            </ExampleContainer>
          </div>

          {/* Test Modal for Cmd+Arrow Shortcuts */}
          <div className="space-y-4">
            <h2 className="text-3xl font-semibold text-foreground">Test Keyboard Shortcuts</h2>
            <ExampleContainer>
              <div className="flex items-center justify-center p-8">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>Open Test Modal</Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Sign in</DialogTitle>
                      <DialogDescription>
                        Enter your credentials to continue
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <label htmlFor="email" className="text-sm font-medium">
                          Email
                        </label>
                        <input
                          id="email"
                          type="email"
                          placeholder="you@example.com"
                          className="w-full px-3 py-2 border border-input rounded-md bg-background"
                        />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="password" className="text-sm font-medium">
                          Password
                        </label>
                        <input
                          id="password"
                          type="password"
                          placeholder="••••••••"
                          className="w-full px-3 py-2 border border-input rounded-md bg-background"
                        />
                      </div>
                      <div className="flex justify-end">
                        <button className="text-sm text-primary hover:underline">
                          Forgot password?
                        </button>
                      </div>
                      <Button className="w-full">Sign in</Button>
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-background px-2 text-muted-foreground">
                            Or continue with
                          </span>
                        </div>
                      </div>
                      <Button variant="outline" className="w-full">
                        <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                          <path
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            fill="#4285F4"
                          />
                          <path
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            fill="#34A853"
                          />
                          <path
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            fill="#FBBC05"
                          />
                          <path
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            fill="#EA4335"
                          />
                        </svg>
                        Continue with Google
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </ExampleContainer>
          </div>

          {/* Contact Cards List */}
          <div className="space-y-4">
            <h2 className="text-3xl font-semibold text-foreground">Contact Cards</h2>
            <ExampleContainer>
              <div className="grid grid-cols-3 gap-4">
                {contacts.map((contact) => (
                  <ContactCard
                    key={contact.id}
                    avatar={contact.avatar}
                    name={contact.name}
                    profession={contact.profession}
                  />
                ))}
              </div>
            </ExampleContainer>
          </div>
        </div>

        {/* <FakeDevTool /> */}
        {/* <FakeDevTool2 /> */}
      </div>
    </TooltipProvider>
  );
}
