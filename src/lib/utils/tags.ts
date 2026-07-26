import { type CollectionEntry, getCollection } from "astro:content";

/**
 * Published posts grouped by tag — the one place the "drafts can't mint
 * tag pages" rule lives. Both the tag pages and their QR routes enumerate
 * from here so the two route families can never disagree.
 */
export const postsByTag = async (): Promise<
  Map<string, CollectionEntry<"blog">[]>
> => {
  const published = (await getCollection("blog")).filter(
    (post) => post.data.published,
  );
  const byTag = new Map<string, CollectionEntry<"blog">[]>();
  for (const post of published) {
    for (const tag of post.data.tags ?? []) {
      byTag.set(tag, [...(byTag.get(tag) ?? []), post]);
    }
  }
  return byTag;
};
