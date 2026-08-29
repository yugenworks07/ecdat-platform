import { type ScenarioId } from "@/lib/ecdatUi";
import { staticScenarioCatalog } from "@/lib/staticDemoData";

export const isStaticDeployment = import.meta.env.BASE_URL !== "/";

export function getStaticScenario(scenario: ScenarioId = "python-web") {
  return staticScenarioCatalog.find(item => item.id === scenario) ?? staticScenarioCatalog[0];
}
