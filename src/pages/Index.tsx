import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import ProblemSection from "@/components/landing/ProblemSection";
import StepsSection from "@/components/landing/StepsSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import CTASection from "@/components/landing/CTASection";
import AudienceSection from "@/components/landing/AudienceSection";
import InvestSection from "@/components/landing/InvestSection";
import FAQSection from "@/components/landing/FAQSection";
import Footer from "@/components/landing/Footer";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <HeroSection />
      <ProblemSection />
      <StepsSection />
      <FeaturesSection />
      <CTASection />
      <AudienceSection />
      <InvestSection />
      <FAQSection />
      <Footer />
    </div>
  );
};

export default Index;
