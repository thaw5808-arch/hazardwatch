import dynamic from 'next/dynamic';

const HazardMap = dynamic(() => import('@/components/map/HazardMap'), { ssr: false });

export default function MapPage() {
  return (
    <div className="h-screen w-full">
      <HazardMap />
    </div>
  );
}
