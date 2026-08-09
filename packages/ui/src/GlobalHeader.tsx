import type { BreadcrumbItem, UserMenuItem } from "./navigation";
import { Breadcrumbs } from "./Breadcrumbs";
import { CommandPaletteTrigger } from "./CommandPaletteTrigger";
import { NotificationCenterControl } from "./NotificationCenter";
import { UserMenu } from "./UserMenu";

export interface GlobalHeaderProps {
  appName: string;
  breadcrumbs: BreadcrumbItem[];
  userMenuItems?: UserMenuItem[];
  commandTriggerLabel?: string;
}

export function GlobalHeader({
  appName,
  breadcrumbs,
  userMenuItems = [],
  commandTriggerLabel = "Command Palette",
}: GlobalHeaderProps) {
  return (
    <header className="ryvra-header">
      <div className="ryvra-header-row">
        <h1 className="ryvra-header-title">{appName}</h1>
        <div className="ryvra-header-actions">
          <CommandPaletteTrigger label={commandTriggerLabel} />
          <NotificationCenterControl />
          <UserMenu items={userMenuItems} />
        </div>
      </div>
      <Breadcrumbs items={breadcrumbs} />
    </header>
  );
}
