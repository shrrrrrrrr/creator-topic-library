import { ScoreTopicList } from "@/features/scoring/components/score-topic-list";
import { ToolboxLayout } from "@/features/toolbox/components/toolbox-layout";

export default function ScorePage() {
  return (
    <ToolboxLayout>
      <ScoreTopicList />
    </ToolboxLayout>
  );
}
