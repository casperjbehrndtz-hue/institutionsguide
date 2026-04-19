import PopularSearches from "@/components/home/PopularSearches";
import UseCases from "@/components/home/UseCases";
import HomeToolsSection from "@/components/home/HomeToolsSection";
import HomeFAQ from "@/components/home/HomeFAQ";
import SEOLinks from "@/components/home/SEOLinks";
import EmailCapture from "@/components/shared/EmailCapture";
import RecentlyViewed from "@/components/shared/RecentlyViewed";

interface Props {
  popularData: Parameters<typeof PopularSearches>[0]["data"] | null;
  language: string;
  schoolCount: string;
  faqItems: { q: string; a: string }[];
  faqTitle: string;
}

export default function HomeDiscovery({ popularData, language, schoolCount, faqItems, faqTitle }: Props) {
  return (
    <>
      {popularData && <PopularSearches data={popularData} language={language} />}
      <UseCases language={language} schoolCount={schoolCount} />
      <HomeToolsSection />
      <RecentlyViewed />
      <HomeFAQ items={faqItems} title={faqTitle} />
      <SEOLinks language={language} />
      <section className="border-t border-border/70">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <EmailCapture />
        </div>
      </section>
    </>
  );
}
