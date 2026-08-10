import type { ReactNode } from "react";
import type { BreadcrumbItem, UserMenuItem } from "./navigation";
import { Breadcrumbs } from "./Breadcrumbs";
import { CommandPaletteTrigger } from "./CommandPaletteTrigger";
import { NotificationCenter } from "./NotificationCenter";
import { UserMenu } from "./UserMenu";
import { LocalePreferences } from "./LocalePreferences";

export interface GlobalHeaderProps {
  appName: string;
  breadcrumbs: BreadcrumbItem[];
  userMenuItems?: UserMenuItem[];
  commandTriggerLabel?: string;
  scopeSwitcher?: ReactNode;
}

export function GlobalHeader({
  appName,
  breadcrumbs,
  userMenuItems = [],
  commandTriggerLabel = "Command Palette",
  scopeSwitcher,
}: GlobalHeaderProps) {
  return (
    <header className="ryvra-header">
      <div className="ryvra-header-row">
        <div className="ryvra-header-identity">
          <h1 className="ryvra-header-title">{appName}</h1>
          {scopeSwitcher ? <div className="ryvra-header-scope">{scopeSwitcher}</div> : null}
        </div>
        <div className="ryvra-header-actions">
          <CommandPaletteTrigger label={commandTriggerLabel} />
          <LocalePreferences />
          <NotificationCenter />
          <UserMenu items={userMenuItems} />
        </div>
      </div>
      <Breadcrumbs items={breadcrumbs} />
    </header>
  );
}
