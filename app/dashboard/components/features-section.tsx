import { Code, BookOpen } from "lucide-react"
import { FeatureCard } from "./feature-card"

export function FeaturesSection() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <FeatureCard
        title="DSA Tutor"
        description="Practice coding problems with our interactive DSA tutor"
        content="Our DSA tutor provides step-by-step guidance for solving data structure and algorithm problems. Get real-time feedback and hints as you code."
        icon={<Code className="h-4 w-4" />}
        linkHref="/dsa-tutor"
        linkText="Start Coding"
      />

      <FeatureCard
        title="Problem List"
        description="Browse our collection of coding problems"
        content="Explore our curated collection of coding problems, ranging from easy to hard difficulty. Filter by topic, difficulty, or company to find the perfect problems for your practice."
        icon={<BookOpen className="h-4 w-4" />}
        linkHref="/problems"
        linkText="Browse Problems"
      />
    </div>
  )
}
