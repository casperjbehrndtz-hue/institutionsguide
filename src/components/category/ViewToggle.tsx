import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  mobileView: "list" | "map";
  onListView: () => void;
  onMapView: () => void;
}

export default function ViewToggle({ mobileView, onListView, onMapView }: Props) {
  const { t } = useLanguage();

  return (
    <div className="lg:hidden flex justify-center py-3 px-4">
      <div className="inline-flex rounded-lg border border-border overflow-hidden">
        <button
          onClick={onListView}
          className={`px-5 py-2 text-sm font-medium transition-colors min-h-[44px] ${
            mobileView === "list" ? "bg-primary text-primary-foreground" : "bg-bg-card text-foreground hover:bg-primary/5"
          }`}
        >
          {t.home.listView}
        </button>
        <button
          onClick={onMapView}
          className={`px-5 py-2 text-sm font-medium transition-colors min-h-[44px] ${
            mobileView === "map" ? "bg-primary text-primary-foreground" : "bg-bg-card text-foreground hover:bg-primary/5"
          }`}
        >
          {t.home.mapView}
        </button>
      </div>
    </div>
  );
}
