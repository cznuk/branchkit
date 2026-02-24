import { IconInfoCircle } from "@tabler/icons-react";

interface InfoIconProps {
  className?: string;
}

export function InfoIcon({ className }: InfoIconProps) {
  return <IconInfoCircle className={className} size={12} stroke={2} />;
}
