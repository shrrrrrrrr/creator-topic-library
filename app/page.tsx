import { TopicLibrary } from "@/features/topics/components/topic-library";
import { ToolboxLayout } from "@/features/toolbox/components/toolbox-layout";

export default function TopicsPage() {
  return (
    <ToolboxLayout>
      <TopicLibrary />
    </ToolboxLayout>
  );
}
