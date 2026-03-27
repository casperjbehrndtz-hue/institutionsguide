export type Language = "da" | "en";

export interface TranslationStrings {
  common: {
    perMonth: string;
    perYear: string;
    unknown: string;
    show: string;
    close: string;
    clear: string;
    compare: string;
    search: string;
    allMunicipalities: string;
    allCategories: string;
    allRatings: string;
    institutions: string;
    found: string;
    showing: string;
    of: string;
    results: string;
    useFilters: string;
    nearMe: string;
    seeFullProfile: string;
    advisory: string;
    partOfFamily: string;
    noJsMessage: string;
  };
  nav: {
    skipToContent: string;
  };
  categories: {
    vuggestue: string;
    boernehave: string;
    dagpleje: string;
    skole: string;
    sfo: string;
    alle: string;
  };
  categoryDescriptions: {
    vuggestue: string;
    boernehave: string;
    dagpleje: string;
    skole: string;
    sfo: string;
  };
  ageGroups: {
    vuggestue: string;
    boernehave: string;
    dagpleje: string;
    skole: string;
    sfo: string;
  };
  home: {
    heroTitle: string;
    heroSubtitle: string;
    municipalityOverview: string;
    moreTools: string;
    moreToolsSubtitle: string;
    faq: string;
  };
  detail: {
    prices: string;
    monthlyRate: string;
    annualRate: string;
    qualityData: string;
    overallRating: string;
    wellbeing: string;
    grades: string;
    absence: string;
    competenceCoverage: string;
    teachingEffect: string;
    classSize: string;
    studentCount: string;
    nationalAvg: string;
    contact: string;
    leader: string;
    website: string;
    nearby: string;
    awayKm: string;
    addToCompare: string;
    aboveAvg: string;
    average: string;
    belowAvg: string;
    dataSource: string;
  };
  friplads: {
    title: string;
    householdIncome: string;
    singleParent: string;
    childrenUnder18: string;
    child: string;
    children: string;
    fullRate: string;
    yourSubsidy: string;
    siblingDiscount: string;
    youPay: string;
    annualSavings: string;
    savingsPercent: string;
    disclaimer: string;
  };
  sort: {
    name: string;
    price: string;
    municipality: string;
    rating: string;
    grades: string;
    absence: string;
  };
  municipality: {
    institutionsIn: string;
    seeOtherMunicipalities: string;
    andMore: string;
  };
  compare: {
    title: string;
    noSelection: string;
    selectAtLeast2: string;
    backToSearch: string;
    monthlyRates: string;
    qualityComparison: string;
    detailedComparison: string;
    property: string;
    category: string;
    address: string;
    type: string;
  };
  footer: {
    categories: string;
    seeAlso: string;
    legal: string;
    privacy: string;
    terms: string;
    dataSources: string;
    disclaimer: string;
  };
  cookie: {
    message: string;
    accept: string;
    decline: string;
  };
  errors: {
    loadFailed: string;
    notFound: string;
    notFoundMessage: string;
    goHome: string;
    somethingWrong: string;
    unexpectedError: string;
    reload: string;
  };
  suiteProducts: {
    nemtbudget: string;
    parfinans: string;
    boerneskat: string;
  };
  dagplejeInfo: {
    title: string;
    pros: string;
    prosList: string[];
    cons: string;
    consList: string[];
  };
  schoolInfo: {
    title: string;
    description: string;
  };
  popular: string;
}
