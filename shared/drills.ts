import { z } from "zod";

export const DRILL_TYPES = [
  "rebuttal-sprint",
  "cross-examination",
  "impact-calculus",
  "framing",
  "signposting",
  "extemp-speaking",
] as const;
export type DrillType = (typeof DRILL_TYPES)[number];

export type DrillDefinition = {
  id: DrillType;
  name: string;
  tagline: string;
  skill: string;
  durationSec: 30 | 45 | 60 | 75 | 90;
  instructions: string;
  scoringFocus: string;
  prompts: string[];
};

export const DRILLS: DrillDefinition[] = [
  {
    id: "rebuttal-sprint",
    name: "Rebuttal Sprint",
    tagline: "Tear down an argument in 60 seconds.",
    skill: "Rebuttal",
    durationSec: 60,
    instructions:
      "You'll see one opposing argument. In 60 seconds, deliver a clean rebuttal: name the argument, attack the warrant, weigh the impact, and end with a clear takeaway.",
    scoringFocus:
      "directness of the attack, quality of the warrant takedown, and whether the response actually engages the specific claim (not a generic counter).",
    prompts: [
      "Rebut: \"Banning single-use plastics will cripple low-income communities who rely on cheap packaged goods.\"",
      "Rebut: \"Universal basic income destroys the incentive to work.\"",
      "Rebut: \"Mandatory voting violates the freedom not to participate.\"",
      "Rebut: \"Social media should be age-restricted to 18+ because teens lack impulse control.\"",
      "Rebut: \"Nuclear power is too dangerous to expand, even to fight climate change.\"",
      "Rebut: \"Standardized testing is the fairest way to compare students nationally.\"",
      "Rebut: \"Free college tuition would devalue a degree by flooding the market.\"",
      "Rebut: \"AI-generated art is theft from human artists and should be banned.\"",
      "Rebut: \"Cities should ban cars from downtowns — it would devastate small businesses.\"",
      "Rebut: \"Defunding police inevitably leads to higher violent crime rates.\"",
      "Rebut: \"School uniforms suppress student individuality and harm self-expression.\"",
      "Rebut: \"Cryptocurrency should be banned because it mainly enables crime.\"",
      "Rebut: \"Animal testing is necessary and there is no viable alternative.\"",
      "Rebut: \"Paying college athletes will ruin amateur sports.\"",
      "Rebut: \"Genetic engineering of human embryos is a slippery slope to eugenics.\"",
      "Rebut: \"Remote work permanently damages company culture and mentorship.\"",
      "Rebut: \"Capital punishment deters violent crime more effectively than life in prison.\"",
    ],
  },
  {
    id: "cross-examination",
    name: "Cross-Examination",
    tagline: "Ask the questions that trap your opponent.",
    skill: "Cross-Examination",
    durationSec: 60,
    instructions:
      "You'll get an opponent's case summary. In 60 seconds, ask 3–4 sharp cross-ex questions that set up your rebuttal. Be specific, narrow, and lead the witness — don't argue.",
    scoringFocus:
      "whether questions are narrow and leading (not open-ended), whether they expose a real weakness in the case, and whether they set up a strategic attack rather than just sparring.",
    prompts: [
      "Opponent's case: \"The US should rejoin the Iran nuclear deal because it freezes uranium enrichment and reopens diplomacy.\" Cross-ex them.",
      "Opponent's case: \"Mandatory minimum sentences reduce judicial bias and ensure equal punishment.\" Cross-ex them.",
      "Opponent's case: \"Wealth taxes are necessary to fund universal healthcare without raising middle-class taxes.\" Cross-ex them.",
      "Opponent's case: \"Affirmative action in college admissions is the only way to remedy systemic disadvantage.\" Cross-ex them.",
      "Opponent's case: \"Lethal autonomous weapons should be banned by treaty before they proliferate.\" Cross-ex them.",
      "Opponent's case: \"The federal government should institute a four-day work week.\" Cross-ex them.",
      "Opponent's case: \"States should be allowed to secede if 60% of voters approve.\" Cross-ex them.",
      "Opponent's case: \"Public schools should require a year of community service to graduate.\" Cross-ex them.",
      "Opponent's case: \"Government surveillance saves lives and the privacy tradeoff is worth it.\" Cross-ex them.",
      "Opponent's case: \"Reparations for slavery are owed and should be paid in direct cash transfers.\" Cross-ex them.",
      "Opponent's case: \"The drinking age should be lowered to 18 to match military service eligibility.\" Cross-ex them.",
      "Opponent's case: \"Big tech platforms should be broken up under antitrust law.\" Cross-ex them.",
      "Opponent's case: \"Carbon offsets are an effective tool for corporations to fight climate change.\" Cross-ex them.",
      "Opponent's case: \"Homework should be banned in elementary school because it harms wellbeing.\" Cross-ex them.",
      "Opponent's case: \"Space colonization is a moral imperative for human survival.\" Cross-ex them.",
      "Opponent's case: \"Private prisons should be abolished nationwide.\" Cross-ex them.",
    ],
  },
  {
    id: "impact-calculus",
    name: "Impact Calculus",
    tagline: "Weigh the round on magnitude, probability, and timeframe.",
    skill: "Impact Calculus",
    durationSec: 60,
    instructions:
      "You'll get two competing impacts. In 60 seconds, weigh them on magnitude, probability, and timeframe — and tell the judge clearly which one to vote on and why.",
    scoringFocus:
      "explicit comparison on magnitude/probability/timeframe, clear judge instruction (\"prefer our impact because…\"), and avoiding the trap of just re-asserting your impact.",
    prompts: [
      "Aff impact: 200,000 lives lost from climate-driven famine by 2050. Neg impact: 8M jobs lost from a sudden green transition. Weigh them.",
      "Aff impact: Erosion of 1st Amendment protections. Neg impact: Increased domestic terror attacks. Weigh them.",
      "Aff impact: Risk of accidental nuclear escalation between two states. Neg impact: Conventional war killing 50,000 in a regional conflict. Weigh them.",
      "Aff impact: Mass surveillance chilling political dissent. Neg impact: Successful prevention of three terror plots a year. Weigh them.",
      "Aff impact: Ocean dead zones collapsing fisheries. Neg impact: $2T global GDP loss from agricultural runoff regulation. Weigh them.",
      "Aff impact: 30% reduction in voter turnout from a new ID law. Neg impact: 1,000 prevented cases of voter fraud. Weigh them.",
      "Aff impact: Ten years of stalled AI medical research. Neg impact: Algorithmic bias harming 40M patients in the same period. Weigh them.",
      "Aff impact: 12M children losing free school lunch. Neg impact: $80B added to the federal deficit. Weigh them.",
      "Aff impact: A constitutional crisis over executive overreach. Neg impact: Failure to respond to a fast-moving public health crisis. Weigh them.",
      "Aff impact: 500,000 displaced refugees from a regional war. Neg impact: Drawing the US into a costly intervention. Weigh them.",
      "Aff impact: Permanent loss of an endangered species. Neg impact: 3,000 jobs in a logging town. Weigh them.",
      "Aff impact: Long-term mental health damage to one generation of teens. Neg impact: Curtailing free speech online. Weigh them.",
      "Aff impact: A global cyberattack disabling power grids. Neg impact: Loss of personal financial privacy. Weigh them.",
      "Aff impact: Antibiotic-resistant pandemic killing millions in a decade. Neg impact: Collapse of factory farming and rural economies. Weigh them.",
      "Aff impact: Erosion of judicial independence. Neg impact: Repeated political gridlock blocking urgent legislation. Weigh them.",
      "Aff impact: A nuclear waste leak contaminating a major aquifer. Neg impact: Continued reliance on coal causing 50,000 annual deaths. Weigh them.",
    ],
  },
  {
    id: "framing",
    name: "Framing",
    tagline: "Set the lens the judge votes through.",
    skill: "Framing",
    durationSec: 60,
    instructions:
      "You'll see a resolution and a side. In 60 seconds, lay out the framework the judge should evaluate the round through — value, criterion, or weighing mechanism — and explain WHY this framing is fairer than your opponent's likely framing.",
    scoringFocus:
      "clarity of the value/criterion, justification for choosing it, and pre-emption of how the opponent will try to reframe.",
    prompts: [
      "Resolution: \"Resolved: Capital punishment is unjust.\" Side: Aff. Frame the round.",
      "Resolution: \"Resolved: A just government ought to provide a universal basic income.\" Side: Aff. Frame the round.",
      "Resolution: \"Resolved: Civil disobedience in a democracy is morally justified.\" Side: Neg. Frame the round.",
      "Resolution: \"Resolved: The federal government should substantially increase regulation of AI.\" Side: Aff. Frame the round.",
      "Resolution: \"Resolved: NATO should admit Ukraine.\" Side: Neg. Frame the round.",
      "Resolution: \"Resolved: Public colleges in the US ought to be tuition-free.\" Side: Aff. Frame the round.",
      "Resolution: \"Resolved: States ought to recognize a right to housing.\" Side: Aff. Frame the round.",
      "Resolution: \"Resolved: Standardized tests should not be used in college admissions.\" Side: Neg. Frame the round.",
      "Resolution: \"Resolved: Social media platforms have an obligation to fact-check political content.\" Side: Aff. Frame the round.",
      "Resolution: \"Resolved: The US should end qualified immunity for police officers.\" Side: Aff. Frame the round.",
      "Resolution: \"Resolved: The benefits of genetic engineering outweigh the harms.\" Side: Neg. Frame the round.",
      "Resolution: \"Resolved: Compulsory voting is desirable in a democracy.\" Side: Aff. Frame the round.",
      "Resolution: \"Resolved: Wealthy nations have a moral obligation to accept climate refugees.\" Side: Aff. Frame the round.",
      "Resolution: \"Resolved: A nation's right to self-defense supersedes international law.\" Side: Neg. Frame the round.",
      "Resolution: \"Resolved: Gig workers ought to be classified as employees.\" Side: Aff. Frame the round.",
      "Resolution: \"Resolved: The international community ought to prioritize global poverty over climate change.\" Side: Neg. Frame the round.",
    ],
  },
  {
    id: "signposting",
    name: "Signposting",
    tagline: "Make the judge's flow effortless.",
    skill: "Signposting",
    durationSec: 45,
    instructions:
      "You'll get a mini-case (3 contentions). In 45 seconds, deliver only the signposted skeleton: roadmap, contention tags, and clean transitions between them. No content — just the structure as the judge would flow it.",
    scoringFocus:
      "presence of an opening roadmap, distinct numbered/named contentions, clean transitions, and an explicit \"and now off to my opponent's case\" handoff.",
    prompts: [
      "Mini-case: 1) Climate harm, 2) Economic cost, 3) International credibility. Signpost it.",
      "Mini-case: 1) Constitutional rights, 2) Empirical evidence of harm, 3) Better alternatives exist. Signpost it.",
      "Mini-case: 1) Public health benefits, 2) Cost savings to taxpayers, 3) Moral obligation to act. Signpost it.",
      "Mini-case: 1) Historical precedent, 2) Current geopolitical risks, 3) Long-term stability. Signpost it.",
      "Mini-case: 1) Definitional clarity, 2) Framework: utilitarianism, 3) Three impacts. Signpost it.",
      "Mini-case: 1) Why the status quo fails, 2) Plan text, 3) Solvency. Signpost it.",
      "Mini-case: 1) Inherency, 2) Significance, 3) Solvency. Signpost it.",
      "Mini-case: 1) Free speech, 2) Marketplace of ideas, 3) Slippery slope to censorship. Signpost it.",
      "Mini-case: 1) Educational outcomes, 2) Equity gap, 3) Cost-effectiveness. Signpost it.",
      "Mini-case: 1) National security, 2) Diplomatic leverage, 3) Soft power. Signpost it.",
      "Mini-case: 1) Worker protections, 2) Inflation impact, 3) Small business survival. Signpost it.",
      "Mini-case: 1) Privacy harms, 2) Algorithmic bias, 3) Lack of accountability. Signpost it.",
      "Mini-case: 1) Public trust in institutions, 2) Rule of law, 3) Long-term democratic backsliding. Signpost it.",
      "Mini-case: 1) Environmental degradation, 2) Indigenous land rights, 3) International treaty obligations. Signpost it.",
      "Mini-case: 1) Mental health crisis, 2) Youth vulnerability, 3) Regulatory feasibility. Signpost it.",
      "Mini-case: 1) Innovation incentives, 2) Consumer welfare, 3) Antitrust precedent. Signpost it.",
    ],
  },
  {
    id: "extemp-speaking",
    name: "Extemp Speaking",
    tagline: "Speak fluently on a question with no prep.",
    skill: "Extemp Speaking",
    durationSec: 90,
    instructions:
      "You'll get a current-events question. In 90 seconds, deliver a structured extemp answer: a clear thesis, two reasons supporting it, and a confident conclusion. No filler, no hedging.",
    scoringFocus:
      "fluency without filler, a stated thesis early, two distinct supporting reasons, and a clean wrap-up that returns to the question.",
    prompts: [
      "Will AI regulation in the EU set a global standard, or fragment the market?",
      "Should the US treat semiconductor manufacturing as a national security issue?",
      "Is the global decline in birth rates a crisis or a course correction?",
      "Can renewable energy realistically replace fossil fuels by 2040?",
      "Should social media companies be held legally liable for algorithmic harm?",
      "Is the BRICS bloc a serious challenger to US economic dominance?",
      "Will remote work permanently reshape urban real estate?",
      "Should the US adopt a national right-to-repair law?",
      "Is universal childcare the most effective family policy?",
      "Can the WHO be reformed to handle the next pandemic better?",
      "Will the rise of e-sports legitimize gaming as a mainstream sport?",
      "Should the US rejoin or stay out of the Trans-Pacific Partnership?",
      "Is content moderation by AI inherently biased?",
      "Will gene-edited crops solve global food insecurity?",
      "Should national elections be moved to a federal holiday?",
      "Is space mining an economic opportunity or an environmental disaster waiting to happen?",
      "Should the US break diplomatic precedent and recognize Taiwan?",
    ],
  },
];

export function getDrillById(id: string): DrillDefinition | undefined {
  return DRILLS.find((d) => d.id === id);
}

export function getDailyDrill(date: Date = new Date()): DrillDefinition {
  const dayKey =
    date.getUTCFullYear() * 1000 +
    Math.floor(
      (date.getTime() -
        Date.UTC(date.getUTCFullYear(), 0, 0)) /
        (1000 * 60 * 60 * 24),
    );
  return DRILLS[dayKey % DRILLS.length];
}

export function getDailyPromptIndex(
  drill: DrillDefinition,
  date: Date = new Date(),
): number {
  const dayKey =
    date.getUTCFullYear() * 1000 +
    Math.floor(
      (date.getTime() -
        Date.UTC(date.getUTCFullYear(), 0, 0)) /
        (1000 * 60 * 60 * 24),
    );
  return dayKey % drill.prompts.length;
}

export const drillScoreRequestSchema = z.object({
  drillId: z.enum(DRILL_TYPES),
  prompt: z.string().min(1).max(2000),
  response: z.string().min(1).max(8000),
  durationSec: z.number().nonnegative().max(600).optional(),
});
export type DrillScoreRequest = z.infer<typeof drillScoreRequestSchema>;

export const drillScoreSchema = z.object({
  score: z.number().min(0).max(100),
  headline: z.string(),
  whatWorked: z.array(z.string()).min(1).max(4),
  whatToFix: z.array(z.string()).min(1).max(4),
  oneTip: z.string(),
});
export type DrillScore = z.infer<typeof drillScoreSchema>;
