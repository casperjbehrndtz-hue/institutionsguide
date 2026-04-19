import { useState } from "react";
import StreetViewImage from "@/components/shared/StreetViewImage";

export default function HeroImage({ inst }: { inst: { imageUrl?: string; lat: number; lng: number; name: string } }) {
  const [imgFailed, setImgFailed] = useState(false);
  const showExternal = inst.imageUrl && !imgFailed;
  return (
    <div className="max-w-[1020px] mx-auto px-4 pb-4">
      {showExternal ? (
        <img
          src={inst.imageUrl}
          alt={inst.name}
          fetchPriority="high"
          decoding="async"
          className="w-full h-[200px] sm:h-[260px] rounded-xl object-cover"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <StreetViewImage
          lat={inst.lat}
          lng={inst.lng}
          alt={inst.name}
          className="w-full h-[200px] sm:h-[260px] rounded-xl"
        />
      )}
    </div>
  );
}
