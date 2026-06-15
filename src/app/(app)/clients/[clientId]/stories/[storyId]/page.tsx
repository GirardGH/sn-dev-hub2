import { notFound } from "next/navigation";
import { getStory } from "@/features/stories/story.actions";
import { getDevelopmentsByStory } from "@/features/developments/development.actions";
import { StoryFormClient } from "@/features/stories/StoryForm";
import type { Story } from "@/features/stories/story.types";
import type { Development } from "@/features/developments/development.types";

interface Props {
  params: Promise<{ clientId: string; storyId: string }>;
}

export default async function StoryPage({ params }: Props) {
  const { clientId, storyId } = await params;
  try {
    const [story, developments] = await Promise.all([
      getStory(storyId),
      getDevelopmentsByStory(storyId),
    ]);
    return (
      <StoryFormClient
        story={story as Story}
        developments={developments as Development[]}
        clientId={clientId}
      />
    );
  } catch {
    notFound();
  }
}
