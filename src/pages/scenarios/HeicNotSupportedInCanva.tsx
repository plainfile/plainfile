import HeicScenario from "@/pages/HeicScenario";
import { getHeicScenarioById } from "@/lib/heic-scenarios";

const scenario = getHeicScenarioById("not-supported-in-canva")!;

export default function HeicNotSupportedInCanva() {
  return <HeicScenario scenario={scenario} />;
}
