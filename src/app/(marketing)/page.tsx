import { Hero } from "@/components/landing/hero";
import { FeatureCards } from "@/components/landing/feature-cards";
import { Stats } from "@/components/landing/stats";

export default function HomePage() {
  return (
    <>
      <Hero />
      <FeatureCards />
      <Stats />
    </>
  );
}