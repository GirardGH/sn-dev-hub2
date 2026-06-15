import { getStories } from "@/features/stories/story.actions";
import { StoryListClient } from "@/features/stories/StoryList";

export default async function StoriesPage() {
  const stories = await getStories();
  return <StoryListClient stories={stories} />;
}
