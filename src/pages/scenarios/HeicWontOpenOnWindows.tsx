import HeicScenario from "@/pages/HeicScenario";
import { getHeicScenarioById } from "@/lib/heic-scenarios";

const scenario = getHeicScenarioById("wont-open-on-windows")!;

export default function HeicWontOpenOnWindows() {
  return <HeicScenario scenario={scenario} />;
}
