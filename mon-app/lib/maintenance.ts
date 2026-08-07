import "server-only";

import maintenanceData from "@/data/maintenance.json";

export function isSiteInMaintenance(): boolean {
  return maintenanceData.enabled === true;
}
