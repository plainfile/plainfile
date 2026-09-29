import HeicScenario from "@/pages/HeicScenario";
import { getHeicScenarioById } from "@/lib/heic-scenarios";

const scenario = getHeicScenarioById("cant-upload")!;

export default function HeicCantUpload() {
  return <HeicScenario scenario={scenario} />;
}
