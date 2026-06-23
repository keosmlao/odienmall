import { getGroupMenu } from "@/lib/catalog";
import MegaMenu from "./MegaMenu";

// Primary storefront nav. Server component — fetches the group_main → group_sub
// tree once per request and hands it to the client-side MegaMenu (desktop hover
// panel + mobile drawer).
export default async function GroupMenu() {
  const groups = await getGroupMenu();
  return <MegaMenu groups={groups} />;
}
