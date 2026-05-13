import { storage } from "./storage";
import type { InsertCoach } from "@shared/schema";

const SAMPLE_COACHES: InsertCoach[] = [
  {
    slug: "maya-chen",
    name: "Maya Chen",
    photoUrl:
      "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=400&q=80",
    bio: "TOC champion and 4-year college LD coach. Focus on framework clarity and crisp rebuttals.",
    specialties: ["Framework", "Cross-ex", "Case writing"],
    formats: ["LD", "PF"],
    pricePerHour: 90,
    availability: [
      "Mon, May 18 — 4:00 PM ET",
      "Mon, May 18 — 6:30 PM ET",
      "Wed, May 20 — 5:00 PM ET",
      "Sat, May 23 — 11:00 AM ET",
    ],
  },
  {
    slug: "andre-okafor",
    name: "Andre Okafor",
    photoUrl:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
    bio: "Former NDT octofinalist. Specialist in policy strategy, evidence work, and speed drills.",
    specialties: ["Policy strategy", "Evidence", "Speed drills"],
    formats: ["Policy", "LD"],
    pricePerHour: 110,
    availability: [
      "Tue, May 19 — 7:00 PM ET",
      "Thu, May 21 — 4:30 PM ET",
      "Fri, May 22 — 6:00 PM ET",
      "Sun, May 24 — 2:00 PM ET",
    ],
  },
  {
    slug: "sara-bennett",
    name: "Sara Bennett",
    photoUrl:
      "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&q=80",
    bio: "PF national finalist. Friendly, beginner-friendly coach focused on delivery and confidence.",
    specialties: ["Public Forum", "Delivery", "Beginners"],
    formats: ["PF"],
    pricePerHour: 75,
    availability: [
      "Mon, May 18 — 5:00 PM ET",
      "Wed, May 20 — 7:00 PM ET",
      "Sat, May 23 — 10:00 AM ET",
      "Sun, May 24 — 4:00 PM ET",
    ],
  },
  {
    slug: "jamal-rivera",
    name: "Jamal Rivera",
    photoUrl:
      "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=400&q=80",
    bio: "Worlds-style debater and college coach. Helps students sharpen argumentation and rhetorical style.",
    specialties: ["Worlds", "Rhetoric", "Argument structure"],
    formats: ["LD", "PF", "Policy"],
    pricePerHour: 95,
    availability: [
      "Tue, May 19 — 5:30 PM ET",
      "Thu, May 21 — 7:00 PM ET",
      "Sat, May 23 — 1:00 PM ET",
    ],
  },
];

export async function seedCoaches() {
  const existing = await storage.listCoaches();
  if (existing.length >= SAMPLE_COACHES.length) return;
  for (const c of SAMPLE_COACHES) {
    await storage.upsertCoachBySlug(c);
  }
  console.log(`[seed] ensured ${SAMPLE_COACHES.length} sample coach profiles`);
}
