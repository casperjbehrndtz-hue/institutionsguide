import ScrollReveal from "@/components/shared/ScrollReveal";
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
      {popularData && <ScrollReveal><PopularSearches data={popularData} language={language} /></ScrollReveal>}
      <ScrollReveal><UseCases language={language} schoolCount={schoolCount} /></ScrollReveal>
      <ScrollReveal><HomeToolsSection /></ScrollReveal>
      <RecentlyViewed />
      <ScrollReveal><HomeFAQ items={faqItems} title={faqTitle} /></ScrollReveal>
      <ScrollReveal><SEOLinks language={language} /></ScrollReveal>
      <ScrollReveal><section className="max-w-xl mx-auto px-4 py-8"><EmailCapture /></section></ScrollReveal>
    </>
  );
}
