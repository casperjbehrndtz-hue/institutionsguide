interface Props {
  mobileView: "list" | "map";
  onListView: () => void;
  onMapView: () => void;
  listLabel: string;
  mapLabel: string;
}

export default function MobileViewToggle({ mobileView, onListView, onMapView, listLabel, mapLabel }: Props) {
  return (
    <div className="lg:hidden flex justify-center py-2 px-4">
      <div className="inline-flex rounded-lg border border-border overflow-hidden">
        <button
          onClick={onListView}
          className={`px-5 py-2 text-sm font-medium transition-colors min-h-[44px] ${
            mobileView === "list" ? "bg-primary text-primary-foreground" : "bg-bg-card text-foreground hover:bg-primary/5"
          }`}
        >
          {listLabel}
        </button>
        <button
          onClick={onMapView}
          className={`px-5 py-2 text-sm font-medium transition-colors min-h-[44px] ${
            mobileView === "map" ? "bg-primary text-primary-foreground" : "bg-bg-card text-foreground hover:bg-primary/5"
          }`}
        >
          {mapLabel}
        </button>
      </div>
    </div>
  );
}
