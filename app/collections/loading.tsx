import { PosterGridSkeleton } from '@/components/ui/Skeleton'

// Franchises reads the user's watch entries and then renders a popular-collections
// feed on top, so the route blocks for long enough to be worth a skeleton.
export default function CollectionsLoading() {
  return <PosterGridSkeleton count={10} />
}
