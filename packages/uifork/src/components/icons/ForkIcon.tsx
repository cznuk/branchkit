import { IconGitBranch } from "@tabler/icons-react";

interface ForkIconProps {
  className?: string;
}

export function ForkIcon({ className }: ForkIconProps) {
  return <IconGitBranch className={className} size={16} stroke={1.5} />;
}
