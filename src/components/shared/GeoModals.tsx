import { GeoModal, GeoErrorToast } from "@/components/shared/GeoUI";

interface Props {
  showGeoModal: boolean;
  geoError: string | null;
  onAccept: () => void;
  onDismiss: () => void;
  onDismissError: () => void;
  onRetry: () => void;
}

export default function GeoModals({ showGeoModal, geoError, onAccept, onDismiss, onDismissError, onRetry }: Props) {
  return (
    <>
      {showGeoModal && <GeoModal onAccept={onAccept} onDismiss={onDismiss} />}
      {geoError && <GeoErrorToast message={geoError} onDismiss={onDismissError} onRetry={onRetry} />}
    </>
  );
}
