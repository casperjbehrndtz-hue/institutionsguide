export const CATEGORY_PATHS: Record<string, string> = {
  vuggestue: "/vuggestue", boernehave: "/boernehave", dagpleje: "/dagpleje",
  skole: "/skole", sfo: "/sfo", fritidsklub: "/fritidsklub", efterskole: "/efterskole",
};

export const CATEGORY_TITLES: Record<string, Record<string, string>> = {
  da: {
    vuggestue: "Vuggestuer i Danmark",
    boernehave: "Børnehaver i Danmark",
    dagpleje: "Dagplejere i Danmark",
    skole: "Skoler i Danmark",
    sfo: "SFO og fritidsordninger",
    fritidsklub: "Fritidsklubber i Danmark",
    efterskole: "Efterskoler i Danmark",
  },
  en: {
    vuggestue: "Nurseries in Denmark",
    boernehave: "Kindergartens in Denmark",
    dagpleje: "Childminders in Denmark",
    skole: "Schools in Denmark",
    sfo: "After-school care in Denmark",
    fritidsklub: "Youth clubs in Denmark",
    efterskole: "Boarding schools in Denmark",
  },
};

export const CATEGORY_SEO_DESCRIPTIONS: Record<string, Record<string, string>> = {
  da: {
    vuggestue: "Find og sammenlign vuggestuer i alle 98 kommuner. Se normering, kvalitetsdata, priser og kontaktinfo.",
    boernehave: "Find og sammenlign børnehaver i alle 98 kommuner. Se normering, kvalitetsdata, priser og kontaktinfo.",
    dagpleje: "Find og sammenlign dagplejere i alle 98 kommuner. Se normering, kvalitetsdata, priser og kontaktinfo.",
    skole: "Find og sammenlign skoler i Danmark. Se kvalitetsdata, karakterer, trivsel og fravær.",
    sfo: "Find og sammenlign SFO og fritidsordninger i alle 98 kommuner. Se priser og kontaktinfo.",
    fritidsklub: "Find og sammenlign fritidsklubber for 4.-7. klasse i alle kommuner. Se priser og kontaktinfo.",
    efterskole: "Sammenlign efterskoler i hele Danmark. Se profiler, ledige pladser, ugepris og årspris.",
  },
  en: {
    vuggestue: "Find and compare nurseries in all 98 municipalities. See staff ratios, quality data, prices and contact info.",
    boernehave: "Find and compare kindergartens in all 98 municipalities. See staff ratios, quality data and prices.",
    dagpleje: "Find and compare childminders in all 98 municipalities. See staff ratios, quality data and prices.",
    skole: "Find and compare schools in Denmark. See quality data, grades, well-being and absence.",
    sfo: "Find and compare after-school care in all 98 municipalities.",
    fritidsklub: "Find and compare youth clubs for ages 10-14 in all municipalities.",
    efterskole: "Compare boarding schools across Denmark. See profiles, available spots, weekly and yearly prices.",
  },
};

export const SUBTYPE_LABELS: Record<string, string> = {
  folkeskole: "Folkeskole", friskole: "Friskole", efterskole: "Efterskole",
  kommunal: "Kommunal", selvejende: "Selvejende", privat: "Privat", udliciteret: "Udliciteret",
};
