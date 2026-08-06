import type { BreadcrumbItem, ProductSwitcherItem, UserMenuItem } from "./navigation";
import { Breadcrumbs } from "./Breadcrumbs";
import { CommandPaletteTrigger } from "./CommandPaletteTrigger";
import { ProductSwitcher } from "./ProductSwitcher";
import { UserMenu } from "./UserMenu";

export interface GlobalHeaderProps {
  appName: string;
  productSwitcherItems: ProductSwitcherItem[];
  breadcrumbs: BreadcrumbItem[];
  userMenuItems?: UserMenuItem[];
  commandTriggerLabel?: string;
}

export function GlobalHeader({
  appName,
  productSwitcherItems,
  breadcrumbs,
  userMenuItems = [],
  commandTriggerLabel = "Command Palette",
}: GlobalHeaderProps) {
  return (
    <header className="ryvra-header">
      <div className="ryvra-header-row">
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <h1 className="ryvra-header-title">{appName}</h1>
          <ProductSwitcher items={productSwitcherItems} />
        </div>
        <div className="ryvra-header-actions">
          <CommandPaletteTrigger label={commandTriggerLabel} />
          <UserMenu items={userMenuItems} />
        </div>
      </div>
      <Breadcrumbs items={breadcrumbs} />
    </header>
  );
}
