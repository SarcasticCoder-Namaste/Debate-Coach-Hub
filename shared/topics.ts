export type TopicFormat =
  | "PF"
  | "LD"
  | "Policy"
  | "Parli"
  | "Congress"
  | "Worlds";

export type TopicDifficulty = "Beginner" | "Intermediate" | "Advanced";

export interface DebateTopic {
  id: string;
  format: TopicFormat;
  resolution: string;
  difficulty: TopicDifficulty;
  suggestedTime: string;
  context: string;
  background: string;
  keyTerms: { term: string; definition: string }[];
  affArguments: string[];
  negArguments: string[];
  prepQuestions: string[];
}

export const FORMAT_LABELS: Record<TopicFormat, string> = {
  PF: "Public Forum",
  LD: "Lincoln-Douglas",
  Policy: "Policy",
  Parli: "Parliamentary",
  Congress: "Congressional",
  Worlds: "World Schools",
};

export const FORMAT_DESCRIPTIONS: Record<TopicFormat, string> = {
  PF: "Two-on-two debate on current events; accessible, evidence-driven, 4-minute cases.",
  LD: "One-on-one value debate with framework and contentions; ~6-minute constructives.",
  Policy: "Two-on-two evidence-heavy plan debate; cross-examination and detailed solvency.",
  Parli: "Limited-prep two-on-two debate on a fresh motion; logic and rhetoric over evidence.",
  Congress: "Mock legislative chamber; 3-minute speeches on bills and resolutions.",
  Worlds: "Three-on-three British-Parliamentary-style debate emphasizing principle and persuasion.",
};

export const DIFFICULTIES: TopicDifficulty[] = [
  "Beginner",
  "Intermediate",
  "Advanced",
];

export const TOPICS: DebateTopic[] = [
  // ---------------- Public Forum ----------------
  {
    id: "pf-uhc",
    format: "PF",
    resolution:
      "Resolved: The United States federal government should establish a single-payer universal healthcare system.",
    difficulty: "Intermediate",
    suggestedTime: "4 min constructive · 3 min rebuttal · 2 min summary",
    context:
      "A perennial PF-style topic balancing access, cost, and quality of care.",
    background:
      "The U.S. spends roughly 17% of GDP on healthcare yet leaves tens of millions uninsured or under-insured. A single-payer system would consolidate insurance under the federal government while keeping providers private. Models include Canada's Medicare, the U.K.'s NHS-style hybrid, and Bernie Sanders' Medicare for All proposal.",
    keyTerms: [
      { term: "Single-payer", definition: "One public insurer pays all medical bills; providers may remain private." },
      { term: "Universal coverage", definition: "Every resident has guaranteed access to a defined package of care." },
      { term: "Administrative cost", definition: "Overhead spent on billing, claims, and insurance operations rather than care." },
    ],
    affArguments: [
      "Eliminating private insurance overhead saves an estimated $400B+ per year (Yale, Lancet 2020).",
      "Universal access closes the mortality gap for the 30M+ uninsured Americans.",
      "Negotiating power lowers drug and provider prices, similar to Medicare's leverage.",
    ],
    negArguments: [
      "Federal cost — CBO estimates $30T+ over a decade — requires major tax increases or borrowing.",
      "Wait times and supply shortages emerge in single-payer systems (e.g., Canadian elective queues).",
      "Disrupts 150M+ Americans on employer plans they currently rate favorably.",
    ],
    prepQuestions: [
      "What funding mechanism does the Aff defend, and what is its incidence?",
      "How does the Neg differentiate single-payer harms from broader Medicare expansion?",
      "Which country's system best models the resolution and why?",
      "How do you weigh access gains against transition disruption?",
      "What evidence quality bar should judges apply to cost figures?",
    ],
  },
  {
    id: "pf-nato",
    format: "PF",
    resolution:
      "Resolved: NATO should admit Ukraine as a full member.",
    difficulty: "Advanced",
    suggestedTime: "4 min constructive · 3 min rebuttal · 2 min summary",
    context: "Tests deterrence theory, alliance credibility, and escalation risk.",
    background:
      "Ukraine has sought NATO membership since 2008. Article 5's mutual-defense clause would obligate every member to treat an attack on Ukraine as an attack on themselves. Russia's 2022 invasion sharpened the debate over whether membership prevents or provokes conflict.",
    keyTerms: [
      { term: "Article 5", definition: "NATO's collective-defense provision triggering allied response to an armed attack." },
      { term: "Deterrence by denial", definition: "Convincing an aggressor that attack costs exceed benefits." },
      { term: "Membership Action Plan (MAP)", definition: "NATO's formal pre-accession reform program." },
    ],
    affArguments: [
      "Article 5 deters further Russian aggression and stabilizes Eastern Europe.",
      "Membership locks in democratic and military reforms in Ukraine.",
      "Strengthens alliance credibility after a decade of perceived hesitation.",
    ],
    negArguments: [
      "Admitting an active combatant risks dragging NATO into direct war with a nuclear power.",
      "Alliance unanimity is unlikely (Hungary, Turkey objections), eroding NATO cohesion.",
      "Security guarantees short of membership (bilateral pacts) achieve deterrence with less risk.",
    ],
    prepQuestions: [
      "When should Ukraine be admitted — during, after, or contingent on a ceasefire?",
      "How does the Aff respond to nuclear escalation scenarios?",
      "Does the Neg accept that the status quo is unsustainable?",
      "What's the strongest historical analogy: West Germany 1955 or Georgia 2008?",
      "Whose credibility matters more — NATO's or the U.S.'s?",
    ],
  },
  {
    id: "pf-ai-regulation",
    format: "PF",
    resolution:
      "Resolved: The benefits of generative artificial intelligence outweigh the harms.",
    difficulty: "Beginner",
    suggestedTime: "4 min constructive · 3 min rebuttal · 2 min summary",
    context: "An accessible on-balance debate with deep evidence on both sides.",
    background:
      "Since ChatGPT's 2022 launch, generative AI has reshaped work, education, and creative industries. Benefits include productivity gains, accessibility, and scientific acceleration. Harms include misinformation, labor displacement, copyright violation, and concentration of power among a few firms.",
    keyTerms: [
      { term: "Generative AI", definition: "Models that produce new text, image, audio, or code from prompts." },
      { term: "Hallucination", definition: "Confident but factually incorrect AI output." },
      { term: "On-balance", definition: "A weighing standard comparing aggregate benefits to aggregate harms." },
    ],
    affArguments: [
      "Productivity studies (MIT, BCG) show 25–40% output gains for knowledge workers.",
      "Accelerates scientific discovery — protein folding, drug screening, materials design.",
      "Democratizes access to legal, medical, and educational expertise globally.",
    ],
    negArguments: [
      "Mass labor displacement, particularly in entry-level white-collar roles.",
      "Misinformation and deepfakes erode trust in elections and journalism.",
      "Energy and water consumption accelerate climate harms.",
    ],
    prepQuestions: [
      "What weighing mechanism (magnitude, probability, reversibility) does each side prefer?",
      "How do you quantify diffuse benefits against concentrated harms?",
      "What's the most credible study you'll defend?",
      "Does regulation change the calculus, or is the resolution evaluated under status quo?",
      "Which timeframe matters: 2-year, 10-year, or generational?",
    ],
  },
  {
    id: "pf-social-media-minors",
    format: "PF",
    resolution:
      "Resolved: The United States federal government should ban social media platforms for users under 16.",
    difficulty: "Intermediate",
    suggestedTime: "4 min constructive · 3 min rebuttal · 2 min summary",
    context: "Tests harm magnitude, paternalism, and constitutional limits.",
    background:
      "Following Australia's 2024 ban and U.S. Surgeon General advisories, several states have moved to restrict youth access. Evidence links heavy use to anxiety, depression, and sleep disruption, especially for adolescent girls. Civil liberties groups raise First Amendment and enforcement concerns.",
    keyTerms: [
      { term: "Section 230", definition: "Federal liability shield for platforms hosting user content." },
      { term: "Age-verification", definition: "Systems for confirming user age, often via ID or biometrics." },
      { term: "Surgeon General Advisory", definition: "Public health guidance from the top U.S. medical officer." },
    ],
    affArguments: [
      "Causal evidence (Twenge, Haidt) links social media to teen mental-health collapse.",
      "Brain-development research supports protecting adolescents from algorithmic manipulation.",
      "Bans shift industry incentives; voluntary parental controls have failed.",
    ],
    negArguments: [
      "First Amendment doctrine likely strikes down a categorical ban.",
      "Drives teens to less-moderated platforms (VPNs, dark web).",
      "Cuts off marginalized youth (LGBTQ+, immigrant) from vital community.",
    ],
    prepQuestions: [
      "How is 'social media' defined — does YouTube, gaming chat, or Discord count?",
      "What enforcement mechanism does the Aff defend?",
      "Is the harm framework medical, psychological, or sociological?",
      "How does the Neg respond to the Australian early data?",
      "Does the Neg concede partial restrictions (algorithm bans) as a counter-plan?",
    ],
  },
  {
    id: "pf-carbon-tax",
    format: "PF",
    resolution:
      "Resolved: The United States federal government should adopt a national carbon tax.",
    difficulty: "Intermediate",
    suggestedTime: "4 min constructive · 3 min rebuttal · 2 min summary",
    context: "Classic economics-vs-equity climate debate.",
    background:
      "A carbon tax sets a price per ton of CO2 emitted, internalizing climate externalities. Variants include British Columbia's revenue-neutral tax and the EU Emissions Trading System. Debate centers on effectiveness, regressivity, and competitiveness.",
    keyTerms: [
      { term: "Pigouvian tax", definition: "Tax set equal to a negative externality's social cost." },
      { term: "Revenue-neutral", definition: "Returns proceeds via dividends or offsetting tax cuts." },
      { term: "Border adjustment", definition: "Tariff offsetting carbon costs on imports from non-taxing countries." },
    ],
    affArguments: [
      "Economists across the spectrum (3,500+ signatories) endorse carbon pricing as efficient.",
      "BC and EU evidence shows emissions cuts without GDP harm.",
      "Revenue can fund dividends that make the policy progressive.",
    ],
    negArguments: [
      "Without global coordination, leakage shifts emissions abroad.",
      "Regressive incidence disproportionately hurts low-income households.",
      "Subsidies and standards (IRA-style) deliver larger near-term cuts politically.",
    ],
    prepQuestions: [
      "What price level and trajectory does the Aff defend?",
      "Does the Aff bundle a dividend or assume general-fund use?",
      "How does the Neg quantify leakage?",
      "Is the comparison cap-and-trade, subsidies, or status quo?",
      "How are international free-rider concerns resolved?",
    ],
  },
  {
    id: "pf-college-athlete-pay",
    format: "PF",
    resolution:
      "Resolved: NCAA Division I athletes should be classified as employees of their universities.",
    difficulty: "Beginner",
    suggestedTime: "4 min constructive · 3 min rebuttal · 2 min summary",
    context: "Approachable PF topic exploring labor law and amateurism.",
    background:
      "Following Alston v. NCAA and the rise of NIL deals, the line between student-athlete and employee has blurred. The NLRB's 2024 Dartmouth decision recognized basketball players as employees, signaling broader shifts.",
    keyTerms: [
      { term: "NIL", definition: "Name, Image, and Likeness rights now commercializable for college athletes." },
      { term: "Title IX", definition: "Federal law requiring gender equity in education programs receiving federal funds." },
      { term: "Amateurism", definition: "NCAA's traditional principle separating college from professional sports." },
    ],
    affArguments: [
      "Generates billions in revenue; athletes deserve labor protections and bargaining rights.",
      "Workers' comp would cover injuries that currently end careers without recourse.",
      "Aligns U.S. college sports with global norms recognizing pro-level effort.",
    ],
    negArguments: [
      "Reclassification triggers Title IX and tax disasters for non-revenue programs.",
      "Most non-football/basketball programs lose money and would be cut.",
      "NIL already provides the economic correction without dismantling amateurism.",
    ],
    prepQuestions: [
      "Are all athletes employees or only revenue-sport scholarship players?",
      "What happens to Title IX equity in an employment model?",
      "How does the Neg address the existing NLRB precedent?",
      "Which stakeholder weighs heaviest — athletes, universities, or fans?",
      "Does NIL solve the underlying harm?",
    ],
  },
  {
    id: "pf-mandatory-voting",
    format: "PF",
    resolution:
      "Resolved: The United States should adopt mandatory voting for federal elections.",
    difficulty: "Beginner",
    suggestedTime: "4 min constructive · 3 min rebuttal · 2 min summary",
    context: "Approachable democratic-theory topic with clear comparative models.",
    background:
      "Australia, Belgium, and 20+ other democracies require voting under penalty of small fines. Proponents argue it boosts legitimacy; critics view it as compelled speech.",
    keyTerms: [
      { term: "Compulsory voting", definition: "Legal requirement to cast a ballot, often with modest fines." },
      { term: "Donkey vote", definition: "A randomly marked or invalid ballot cast under compulsion." },
      { term: "Turnout gap", definition: "Difference in voting rates between demographic groups." },
    ],
    affArguments: [
      "Australian turnout exceeds 90%, eliminating mobilization-based polarization.",
      "Reduces voter-suppression incentives by guaranteeing a near-universal electorate.",
      "Forces moderate platforms — candidates court the median voter, not just the base.",
    ],
    negArguments: [
      "Compelled speech violates First Amendment principles.",
      "Adds noise from uninformed donkey votes, lowering decision quality.",
      "Doesn't address root causes: registration, accessibility, and trust.",
    ],
    prepQuestions: [
      "What penalty does the Aff defend, and is conscientious objection allowed?",
      "Is 'none of the above' a required ballot option?",
      "How does the Neg respond to Australian empirical data?",
      "Does mandatory registration achieve most benefits with fewer harms?",
      "Whose freedom is more central — voters' or non-voters'?",
    ],
  },

  {
    id: "pf-tiktok-ban",
    format: "PF",
    resolution:
      "Resolved: The United States federal government should ban TikTok.",
    difficulty: "Beginner",
    suggestedTime: "4 min constructive · 3 min rebuttal · 2 min summary",
    context: "A timely PF resolution touching national security, speech, and trade.",
    background:
      "Congress passed the Protecting Americans from Foreign Adversary Controlled Applications Act in 2024, requiring ByteDance to divest TikTok or face a ban. The Supreme Court upheld the law in TikTok v. Garland (2025). Debate continues over enforcement, free speech, and the precedent for foreign-owned apps.",
    keyTerms: [
      { term: "PAFACA", definition: "2024 law requiring divestiture of foreign-adversary-owned apps." },
      { term: "Algorithmic recommendation", definition: "ML-driven content ranking that shapes what users see." },
      { term: "Data sovereignty", definition: "Principle that user data is governed by the laws of the user's country." },
    ],
    affArguments: [
      "ByteDance is legally compelled to share data with the Chinese government under PRC National Intelligence Law.",
      "Algorithmic manipulation by a hostile power threatens election integrity and youth mental health.",
      "Bans on adversary-controlled apps establish reciprocity with Chinese policy banning U.S. platforms.",
    ],
    negArguments: [
      "Bans burden the speech of 170M American users; Project Texas already isolates U.S. data.",
      "Sets precedent for politically-motivated bans of disfavored speech platforms.",
      "Drives users to less-regulated alternatives without solving the underlying data-broker problem.",
    ],
    prepQuestions: [
      "Does the Aff defend ban or forced divestiture?",
      "How does the Neg respond to the National Intelligence Law evidence?",
      "Is the harm framework national security, free speech, or both?",
      "Does Project Texas solve the Aff's data concerns?",
      "Whose precedent matters more — security carve-outs or First Amendment doctrine?",
    ],
  },
  // ---------------- Lincoln-Douglas ----------------
  {
    id: "ld-just-government-housing",
    format: "LD",
    resolution:
      "Resolved: A just government ought to recognize an unconditional right to housing.",
    difficulty: "Intermediate",
    suggestedTime: "6 min AC · 7 min NC · 4 min 1AR · 6 min NR · 3 min 2AR",
    context: "Classic LD value debate over positive rights and state obligation.",
    background:
      "Article 25 of the UDHR recognizes housing as a human right. Finland's Housing First program has driven chronic homelessness near zero. The U.S. treats housing as a market good with means-tested assistance.",
    keyTerms: [
      { term: "Positive right", definition: "An entitlement to be provided something by the state." },
      { term: "Justice", definition: "The principle governing the proper distribution of rights and duties." },
      { term: "Unconditional", definition: "Not contingent on behavior, employment, or means-testing." },
    ],
    affArguments: [
      "Housing is a precondition for exercising every other right (Pogge, Shue).",
      "Housing First evidence shows lower total cost than emergency-services churn.",
      "State legitimacy requires meeting basic survival needs, per social-contract theory.",
    ],
    negArguments: [
      "Unconditional rights generate moral hazard and crowd out personal responsibility.",
      "Positive rights conflict with property and taxpayer rights (Nozick).",
      "Means-tested assistance better targets those in need without creating dependency.",
    ],
    prepQuestions: [
      "What value-criterion pair anchors your case?",
      "Is justice procedural (Nozick) or distributive (Rawls)?",
      "How does 'unconditional' interact with rule-following requirements?",
      "What evidence base for Housing First do you trust?",
      "Does the Neg accept any housing right, or reject the framing entirely?",
    ],
  },
  {
    id: "ld-civil-disobedience",
    format: "LD",
    resolution:
      "Resolved: In a democracy, civil disobedience is justified as a means of advancing justice.",
    difficulty: "Beginner",
    suggestedTime: "6 min AC · 7 min NC · 4 min 1AR · 6 min NR · 3 min 2AR",
    context: "Approachable LD topic with rich philosophical literature.",
    background:
      "From Thoreau and Gandhi to King and contemporary climate activists, civil disobedience has shaped democracies. The debate weighs rule-of-law against moral conscience.",
    keyTerms: [
      { term: "Civil disobedience", definition: "Public, nonviolent law-breaking aimed at moral or political reform." },
      { term: "Rule of law", definition: "Principle that all are equally subject to publicly known law." },
      { term: "Letter from Birmingham Jail", definition: "MLK's seminal defense of disobedience against unjust laws." },
    ],
    affArguments: [
      "Democratic legitimacy requires correcting majority injustice (Rawls, King).",
      "Historical movements (suffrage, civil rights) advanced justice through disobedience.",
      "Acceptance of legal punishment preserves rule-of-law respect while challenging unjust laws.",
    ],
    negArguments: [
      "Democracies provide legal channels — disobedience is unnecessary and undermines them.",
      "Allowing disobedience invites motivated reasoning and tribal lawlessness.",
      "Subjective 'justice' standards collapse rule-of-law into majoritarian preference.",
    ],
    prepQuestions: [
      "Does justified civil disobedience require nonviolence?",
      "How is 'advancing justice' verified — by intent, outcome, or consensus?",
      "Are you defending Rawlsian, Kingian, or contemporary frameworks?",
      "What constitutes an 'unjust law' worth disobeying?",
      "Does the Neg concede any historical examples?",
    ],
  },
  {
    id: "ld-targeted-killing",
    format: "LD",
    resolution:
      "Resolved: Targeted killing is a morally permissible foreign policy tool.",
    difficulty: "Advanced",
    suggestedTime: "6 min AC · 7 min NC · 4 min 1AR · 6 min NR · 3 min 2AR",
    context: "Just-war and human-rights debate suited to advanced LD.",
    background:
      "Drone strikes against named individuals have become routine since 2002. Soleimani's 2020 killing reignited debate over sovereignty, law of armed conflict, and assassination bans.",
    keyTerms: [
      { term: "Targeted killing", definition: "Premeditated lethal force against a named individual outside conventional combat." },
      { term: "Jus in bello", definition: "Just-war principles governing conduct during war (proportionality, distinction)." },
      { term: "Sovereignty", definition: "A state's exclusive authority over its territory." },
    ],
    affArguments: [
      "Minimizes collateral harm vs. broader military operations (proportionality).",
      "Disrupts continuing terrorist plots when capture is infeasible.",
      "Holds individual decision-makers accountable rather than punishing populations.",
    ],
    negArguments: [
      "Violates sovereignty and the international ban on assassination.",
      "Creates martyrs and accelerates radicalization (CIA-acknowledged blowback).",
      "Procedural opacity — secret kill lists — corrodes democratic accountability.",
    ],
    prepQuestions: [
      "Is the framework Walzer's just-war, Kantian rights, or consequentialist?",
      "Does the Aff distinguish wartime from non-wartime killings?",
      "What due process, if any, is morally required?",
      "How is 'effectiveness' measured against radicalization claims?",
      "Does the Neg ban all targeted killing or only specific categories?",
    ],
  },
  {
    id: "ld-juvenile-offenders",
    format: "LD",
    resolution:
      "Resolved: In the United States criminal justice system, juveniles charged with violent felonies ought to be tried as juveniles.",
    difficulty: "Intermediate",
    suggestedTime: "6 min AC · 7 min NC · 4 min 1AR · 6 min NR · 3 min 2AR",
    context: "A traditional LD topic with strong philosophical and empirical depth.",
    background:
      "Roper v. Simmons (2005) and Miller v. Alabama (2012) limited harsh punishments for juveniles based on neuroscience showing developmental differences. State waiver laws still allow trying many juveniles as adults.",
    keyTerms: [
      { term: "Waiver / transfer", definition: "Mechanism by which a juvenile case is moved to adult court." },
      { term: "Mens rea", definition: "The mental state required for criminal culpability." },
      { term: "Rehabilitation", definition: "Penological goal of reforming offenders rather than only punishing them." },
    ],
    affArguments: [
      "Adolescent brains lack adult impulse control and culpability (Roper).",
      "Juvenile system focuses on rehabilitation, reducing recidivism.",
      "Adult prisons expose juveniles to abuse and hardened-criminal networks.",
    ],
    negArguments: [
      "Severity of violent felonies demands proportional punishment.",
      "Victims' rights and societal protection require adult-level sentencing.",
      "Deterrence effect on serious juvenile crime is undermined by juvenile-only treatment.",
    ],
    prepQuestions: [
      "Does the resolution apply to all juveniles or carve out 17-year-olds?",
      "Is your value retributive, rehabilitative, or restorative justice?",
      "What neuroscience evidence is most defensible?",
      "Does the Neg accept any age floor for transfer?",
      "How are victims' interests integrated into your framework?",
    ],
  },
  {
    id: "ld-animal-rights",
    format: "LD",
    resolution:
      "Resolved: The legal system ought to recognize personhood for sentient non-human animals.",
    difficulty: "Advanced",
    suggestedTime: "6 min AC · 7 min NC · 4 min 1AR · 6 min NR · 3 min 2AR",
    context: "A philosophy-heavy resolution for advanced LD competitors.",
    background:
      "The Nonhuman Rights Project has filed habeas petitions for chimpanzees and elephants. Spain and New Zealand have granted legal standing to great apes. Singer's 'Animal Liberation' frames the moral debate.",
    keyTerms: [
      { term: "Sentience", definition: "Capacity to experience subjective states like pleasure and pain." },
      { term: "Legal personhood", definition: "Status of being a rights-bearing entity in law." },
      { term: "Speciesism", definition: "Prejudice favoring one's own species over others (Singer)." },
    ],
    affArguments: [
      "Sentience, not species, should ground moral consideration (Singer, Regan).",
      "Personhood already extends to corporations — extending to animals is principled.",
      "Recognition is necessary to halt mass cruelty in factory farming and research.",
    ],
    negArguments: [
      "Personhood requires moral agency animals cannot reciprocate.",
      "Welfare protections achieve practical goals without legal upheaval.",
      "Slippery slope to standing for ecosystems, plants, or AI destabilizes law.",
    ],
    prepQuestions: [
      "Which animals does 'sentient' include — vertebrates only, octopuses, insects?",
      "Does personhood entail all rights or a subset (e.g., bodily integrity)?",
      "What philosophical framework anchors your case?",
      "How does the Neg respond to the corporate-personhood analogy?",
      "What replaces personhood for the Neg — welfare? guardianship?",
    ],
  },
  {
    id: "ld-jury-nullification",
    format: "LD",
    resolution:
      "Resolved: In the United States, jury nullification ought to be used as a check on unjust laws.",
    difficulty: "Intermediate",
    suggestedTime: "6 min AC · 7 min NC · 4 min 1AR · 6 min NR · 3 min 2AR",
    context: "Tests rule-of-law against democratic jury power.",
    background:
      "Juries have long held de facto power to acquit against the law (Zenger, Fugitive Slave Act, Vietnam draft cases). Courts forbid instructing jurors of this power.",
    keyTerms: [
      { term: "Jury nullification", definition: "Acquittal by jury despite evidence of guilt to reject the law itself." },
      { term: "Petit jury", definition: "The trial-level jury that decides guilt or innocence." },
      { term: "Double jeopardy", definition: "Constitutional bar on retrying after acquittal — making nullification final." },
    ],
    affArguments: [
      "Provides community check against unjust prosecution (drug, protest cases).",
      "Constitutional design contemplated juries as buffer against state overreach.",
      "Historical record shows nullification advancing justice (Zenger, Fugitive Slave).",
    ],
    negArguments: [
      "Equal application of law collapses when juries can selectively excuse defendants.",
      "Used historically to acquit white defendants of racial violence.",
      "Legitimate channels (legislation, appeals, clemency) address unjust laws better.",
    ],
    prepQuestions: [
      "Should jurors be instructed about nullification power?",
      "How does the Aff respond to historical race-based nullification abuses?",
      "Is your value rule-of-law, justice, or popular sovereignty?",
      "Does the Aff defend nullification only when the law is independently unjust?",
      "How does the Neg account for cases like draft resistance?",
    ],
  },

  {
    id: "ld-mandatory-vaccination",
    format: "LD",
    resolution:
      "Resolved: A just government ought to mandate vaccination against communicable diseases.",
    difficulty: "Intermediate",
    suggestedTime: "6 min AC · 7 min NC · 4 min 1AR · 6 min NR · 3 min 2AR",
    context: "Tests autonomy, public-good obligation, and harm-principle framings.",
    background:
      "Smallpox eradication, polio elimination, and recent measles outbreaks frame the debate. Jacobson v. Massachusetts (1905) upheld state vaccine mandates; modern debates extend to COVID-era requirements and school-entry rules.",
    keyTerms: [
      { term: "Herd immunity", definition: "Population-level protection achieved when enough individuals are immune." },
      { term: "Bodily autonomy", definition: "Right to control what happens to one's own body." },
      { term: "Harm principle", definition: "Mill's view that liberty may be limited only to prevent harm to others." },
    ],
    affArguments: [
      "Communicable disease creates externalities that justify state intervention (Mill).",
      "Mandates are the only mechanism that reliably reaches herd-immunity thresholds.",
      "Protects the immunocompromised who cannot be vaccinated themselves.",
    ],
    negArguments: [
      "Bodily autonomy is a near-absolute right state coercion cannot override.",
      "Mandates erode trust and produce backlash that lowers long-term uptake.",
      "Targeted education and access programs achieve high coverage without coercion.",
    ],
    prepQuestions: [
      "Which diseases trigger the mandate — only deadly, or any communicable?",
      "Are religious or medical exemptions permitted under your framework?",
      "What value-criterion pair anchors your case?",
      "How do you weigh autonomy against externality harms?",
      "What evidence base for vaccine hesitancy do you trust?",
    ],
  },
  // ---------------- Policy ----------------
  {
    id: "policy-water-protection",
    format: "Policy",
    resolution:
      "Resolved: The United States federal government should substantially increase its protection of water resources in the United States.",
    difficulty: "Advanced",
    suggestedTime: "8 min constructives · 3 min CX · 5 min rebuttals",
    context: "Mirrors recent NSDA Policy topics with broad plan-text flexibility.",
    background:
      "Sackett v. EPA (2023) narrowed Clean Water Act jurisdiction over wetlands. PFAS contamination, Colorado River allocation, and Great Lakes invasive species all sit on the federal agenda.",
    keyTerms: [
      { term: "WOTUS", definition: "'Waters of the United States' — the jurisdictional reach of the Clean Water Act." },
      { term: "PFAS", definition: "'Forever chemical' contaminants persistent in water and biology." },
      { term: "Prior appropriation", definition: "Western water-rights doctrine of 'first in time, first in right'." },
    ],
    affArguments: [
      "Restoring WOTUS jurisdiction protects wetlands critical to flood control and biodiversity.",
      "Federal PFAS standards are necessary because state action is uneven.",
      "Reforming Colorado River compact prevents looming agricultural and urban shortages.",
    ],
    negArguments: [
      "States and tribes have superior local knowledge for water management (federalism DA).",
      "Industry compliance costs trigger inflation and offshoring (econ DA).",
      "Status quo EPA action solves; plan triggers court rollback (politics/courts DA).",
    ],
    prepQuestions: [
      "What is your plan text and agent of action?",
      "How do you generate solvency advocates for your specific mechanism?",
      "Which advantages outweigh — environment, economy, or warming?",
      "What disad turns the case fastest?",
      "How do you respond to a state-action counterplan?",
    ],
  },
  {
    id: "policy-criminal-justice",
    format: "Policy",
    resolution:
      "Resolved: The United States federal government should substantially reduce its restrictions on legal immigration to the United States.",
    difficulty: "Advanced",
    suggestedTime: "8 min constructives · 3 min CX · 5 min rebuttals",
    context: "Strong evidence base across visas, asylum, and labor markets.",
    background:
      "U.S. legal immigration caps (H-1B, family preference, refugee) have not kept pace with labor demand or humanitarian need. Reforms range from raising visa caps to overhauling the asylum system.",
    keyTerms: [
      { term: "H-1B", definition: "Specialty-occupation visa capped at 85,000/year." },
      { term: "Adjustment of status", definition: "Process of becoming a permanent resident from inside the U.S." },
      { term: "Diversity Visa Lottery", definition: "Annual program offering 55,000 visas to underrepresented countries." },
    ],
    affArguments: [
      "Increasing skilled visas closes labor shortages and grows GDP (NBER).",
      "Family-reunification expansion reduces deportation harms.",
      "Robust legal pathways reduce dangerous border crossings and cartel revenue.",
    ],
    negArguments: [
      "Wage-suppression effects in low-skill labor markets (Borjas).",
      "Backlash politics threaten broader liberal-democratic stability.",
      "Brain drain from origin countries undermines development.",
    ],
    prepQuestions: [
      "Which visa category does your plan modify?",
      "Are you defending an explicit numerical increase or removal of restriction?",
      "What's your strongest topicality response?",
      "How do you turn the politics DA?",
      "What case-turn does the Neg deploy first?",
    ],
  },
  {
    id: "policy-china",
    format: "Policy",
    resolution:
      "Resolved: The United States federal government should substantially reduce its arms sales to one or more countries in the Indo-Pacific region.",
    difficulty: "Advanced",
    suggestedTime: "8 min constructives · 3 min CX · 5 min rebuttals",
    context: "Geopolitically rich Policy resolution touching deterrence and arms-trade ethics.",
    background:
      "U.S. arms transfers to Taiwan, the Philippines, Japan, South Korea, and Australia have surged amid China-rivalry. Critics argue sales fuel arms races; supporters cite deterrence.",
    keyTerms: [
      { term: "Foreign Military Sales (FMS)", definition: "Government-to-government U.S. arms transfer program." },
      { term: "AUKUS", definition: "Trilateral pact transferring nuclear-submarine tech to Australia." },
      { term: "Taiwan Relations Act", definition: "1979 law obligating U.S. to provide defensive arms to Taiwan." },
    ],
    affArguments: [
      "Ending sales to specific partners de-escalates regional arms race.",
      "Reorients U.S. policy toward diplomacy and multilateral security architecture.",
      "Reduces complicity in human-rights abuses by recipient governments.",
    ],
    negArguments: [
      "Removing arms guarantees emboldens Chinese revisionism (deterrence DA).",
      "Allies hedge by acquiring nuclear weapons or shifting to Russian arms (prolif DA).",
      "Domestic defense industrial base collapses, weakening U.S. military (econ/heg DA).",
    ],
    prepQuestions: [
      "Which country does the plan target — Taiwan, Philippines, Japan?",
      "Do you defend full halt or partial reduction?",
      "How does your case handle the Taiwan Relations Act?",
      "What kritik (security, IR realism) might Neg run?",
      "How do you weigh proliferation vs. deterrence impacts?",
    ],
  },
  {
    id: "policy-cybersec",
    format: "Policy",
    resolution:
      "Resolved: The United States federal government should substantially strengthen domestic cybersecurity standards for critical infrastructure.",
    difficulty: "Intermediate",
    suggestedTime: "8 min constructives · 3 min CX · 5 min rebuttals",
    context: "Topical and technically rich, with clear advocate evidence.",
    background:
      "CISA's voluntary frameworks have not prevented Colonial Pipeline (2021), Change Healthcare (2024), or water-utility intrusions. Mandatory standards remain politically contested.",
    keyTerms: [
      { term: "Critical infrastructure", definition: "16 sectors designated by Presidential Policy Directive 21." },
      { term: "CISA", definition: "Cybersecurity and Infrastructure Security Agency within DHS." },
      { term: "Zero Trust", definition: "Security model assuming no implicit trust inside or outside networks." },
    ],
    affArguments: [
      "Mandatory standards prevent cascading attacks that disrupt power, water, and finance.",
      "Federal coordination overcomes industry under-investment due to externality.",
      "Deterrence by denial reduces incentive for state-sponsored attacks.",
    ],
    negArguments: [
      "Compliance burden raises consumer prices and crowds out small operators.",
      "Federal one-size-fits-all weaker than tailored sectoral expertise.",
      "Mandates leak proprietary architectures, increasing attack surface.",
    ],
    prepQuestions: [
      "Which sectors does your plan cover?",
      "What enforcement mechanism — fines, license revocation, criminal liability?",
      "How do you handle small-utility carve-outs?",
      "What advantage outweighs the federalism DA?",
      "Are kritiks of surveillance/securitization in play?",
    ],
  },

  {
    id: "policy-ai-governance",
    format: "Policy",
    resolution:
      "Resolved: The United States federal government should substantially regulate the development of frontier artificial intelligence systems.",
    difficulty: "Intermediate",
    suggestedTime: "8 min constructives · 3 min CX · 5 min rebuttals",
    context: "Topical Policy resolution with rich existing-evidence base.",
    background:
      "Following the 2023 Executive Order on AI and the 2024 EU AI Act, U.S. legislative proposals (SAFE Innovation, Schumer Framework) seek pre-deployment evaluations, compute thresholds, and liability rules for frontier models.",
    keyTerms: [
      { term: "Frontier model", definition: "AI system at the leading edge of capability, typically requiring 10^26+ FLOPs." },
      { term: "Pre-deployment evaluation", definition: "Mandatory safety testing before public release." },
      { term: "NIST AI RMF", definition: "Voluntary AI Risk Management Framework published by NIST." },
    ],
    affArguments: [
      "Pre-deployment evals prevent catastrophic biosecurity and cyber misuse risks.",
      "Federal standards prevent state-level patchwork that fragments the AI market.",
      "Liability rules align developer incentives with safety, not just capability.",
    ],
    negArguments: [
      "Regulation entrenches incumbents (OpenAI, Anthropic) over open-source innovators.",
      "Compute thresholds become obsolete fast and miss algorithmic-efficiency risks.",
      "Pushes leading-edge research offshore to less-restrictive jurisdictions.",
    ],
    prepQuestions: [
      "What is your plan text — licensing, evals, liability, or compute caps?",
      "Which advantage outweighs — bio, cyber, misinformation, or labor?",
      "How do you respond to a counterplan that mandates only NIST-style voluntary frameworks?",
      "What kritik (cap, neolib, securitization) might Neg deploy?",
      "How do you defend against the offshoring DA?",
    ],
  },
  // ---------------- Parliamentary ----------------
  {
    id: "parli-meat-tax",
    format: "Parli",
    resolution:
      "This House would impose a tax on the production and sale of meat.",
    difficulty: "Intermediate",
    suggestedTime: "20 min prep · 7 min PMC · 8 min LOC · 8 min MGC · 8 min MOC · 5 min LOR · 5 min PMR",
    context: "Parliamentary motion blending environment, public health, and ethics.",
    background:
      "Livestock contributes ~14.5% of global greenhouse emissions (FAO). Denmark passed a per-cow tax in 2024. Opponents cite agricultural livelihoods and consumer freedom.",
    keyTerms: [
      { term: "Pigouvian tax", definition: "Tax priced to match a negative externality." },
      { term: "Methane", definition: "Potent short-lived greenhouse gas emitted by cattle and rice paddies." },
      { term: "Sin tax", definition: "Tax aimed at discouraging consumption of harmful goods." },
    ],
    affArguments: [
      "Internalizes climate and health externalities of livestock.",
      "Funds plant-based research and rural transition support.",
      "Reduces antibiotic resistance by shrinking factory-farm scale.",
    ],
    negArguments: [
      "Regressive — burdens low-income families dependent on cheap protein.",
      "Devastates rural farming economies dependent on livestock.",
      "Subsidies and labeling achieve change without coercion.",
    ],
    prepQuestions: [
      "What rate of tax does Government propose?",
      "Are exemptions provided for small farmers or rural communities?",
      "How is the revenue used?",
      "What is the Opposition's counter-model — subsidies, labeling, or status quo?",
      "Whose autonomy weighs heaviest?",
    ],
  },
  {
    id: "parli-gerontocracy",
    format: "Parli",
    resolution:
      "This House would impose a maximum age limit for elected federal office.",
    difficulty: "Beginner",
    suggestedTime: "20 min prep · 7 min PMC · 8 min LOC · 8 min MGC · 8 min MOC · 5 min LOR · 5 min PMR",
    context: "Accessible Parli motion on representation and democratic theory.",
    background:
      "The U.S. Senate's median age is the oldest in modern history. Polls show majority support for age caps, but constitutional amendment would be required.",
    keyTerms: [
      { term: "Gerontocracy", definition: "Rule by a disproportionately elderly governing class." },
      { term: "Term limits", definition: "Caps on consecutive or total years in elected office." },
      { term: "Qualifications Clause", definition: "Constitutional provision setting minimum age for federal office." },
    ],
    affArguments: [
      "Generational representation matters for issues like climate and tech.",
      "Cognitive decline data justifies a screening line.",
      "Forces talent renewal and reduces incumbency lock-in.",
    ],
    negArguments: [
      "Voters already choose — paternalistic to override their judgment.",
      "Age-based exclusion is the kind of discrimination democracy rejects elsewhere.",
      "Experience and institutional memory benefit governance.",
    ],
    prepQuestions: [
      "What age cap does Government propose, and to which offices?",
      "Is a sitting officeholder grandfathered?",
      "How does Government handle the discrimination analogy?",
      "What is Opposition's counter-mechanism?",
      "Whose representation matters most — voters' or candidates'?",
    ],
  },
  {
    id: "parli-fast-fashion",
    format: "Parli",
    resolution:
      "This House would ban the sale of fast-fashion garments produced under unsafe labor conditions.",
    difficulty: "Intermediate",
    suggestedTime: "20 min prep · 7 min PMC · 8 min LOC · 8 min MGC · 8 min MOC · 5 min LOR · 5 min PMR",
    context: "Labor-rights and trade-policy parli motion.",
    background:
      "From Rana Plaza (2013) to ongoing Xinjiang concerns, fast-fashion supply chains face scrutiny. France and Germany have introduced supply-chain due-diligence laws.",
    keyTerms: [
      { term: "Fast fashion", definition: "Rapid, low-cost production of trend-driven clothing (e.g., Shein, Zara)." },
      { term: "Supply-chain due diligence", definition: "Required corporate audits of upstream labor conditions." },
      { term: "Race to the bottom", definition: "Competitive pressure pushing standards downward globally." },
    ],
    affArguments: [
      "Bans force major brands to enforce safety upstream.",
      "Worker deaths are a foreseeable, preventable cost of cheap apparel.",
      "Levels the playing field for ethical producers.",
    ],
    negArguments: [
      "Bans collapse jobs in the very countries we aim to help.",
      "Enforcement and verification at customs is impossible at scale.",
      "Voluntary standards (Better Work, ILO partnerships) outperform coercion.",
    ],
    prepQuestions: [
      "How is 'unsafe labor conditions' verified?",
      "Are imports, sales, or both restricted?",
      "What transition plan exists for displaced workers?",
      "Counter-model: due-diligence law vs. ban?",
      "Whose rights weigh heaviest — workers' or consumers'?",
    ],
  },
  {
    id: "parli-deepfake-criminal",
    format: "Parli",
    resolution:
      "This House would criminalize the creation of deepfake content depicting real individuals without consent.",
    difficulty: "Intermediate",
    suggestedTime: "20 min prep · 7 min PMC · 8 min LOC · 8 min MGC · 8 min MOC · 5 min LOR · 5 min PMR",
    context: "Free-speech and emerging-tech parli motion.",
    background:
      "Generative AI now produces convincing video impersonations. The EU AI Act and U.S. state laws have begun criminalizing non-consensual sexual deepfakes; broader regulation remains contested.",
    keyTerms: [
      { term: "Deepfake", definition: "Synthetic media depicting real persons doing or saying things they did not." },
      { term: "Mens rea", definition: "Intent element required for criminal liability." },
      { term: "Prior restraint", definition: "Government action restricting speech before publication." },
    ],
    affArguments: [
      "Protects bodily autonomy, reputation, and democratic integrity.",
      "Civil remedies are too slow and inaccessible to victims.",
      "Clear criminal line deters platforms from hosting such content.",
    ],
    negArguments: [
      "Chills satire, parody, and political commentary protected as free speech.",
      "Enforcement requires content surveillance threatening privacy.",
      "Existing harassment, defamation, and IP laws cover most harms.",
    ],
    prepQuestions: [
      "Does criminalization require consent absence, intent to harm, or both?",
      "How are satire and parody carved out?",
      "What penalty range does Government defend?",
      "How does Government respond to the chilling-effect critique?",
      "Counter-model: civil liability with statutory damages?",
    ],
  },

  // ---------------- Congressional ----------------
  {
    id: "congress-student-loan",
    format: "Congress",
    resolution:
      "A Bill to Cancel Up to $50,000 in Federal Student Loan Debt Per Borrower.",
    difficulty: "Beginner",
    suggestedTime: "3 min speech · 2 min cross-examination",
    context: "High-relevance Congressional bill with strong affirmative and negative speeches.",
    background:
      "Outstanding federal student debt exceeds $1.7T. Biden-era cancellations were largely struck down by the Supreme Court (Biden v. Nebraska, 2023), routing reform back to Congress.",
    keyTerms: [
      { term: "PSLF", definition: "Public Service Loan Forgiveness program for nonprofit and government workers." },
      { term: "Income-driven repayment", definition: "Plans capping monthly payments as a share of discretionary income." },
      { term: "Major questions doctrine", definition: "Court principle requiring clear congressional authorization for major economic policy." },
    ],
    affArguments: [
      "Frees borrowers to buy homes, start families, and form businesses.",
      "Corrects predatory lending against first-generation and minority students.",
      "Stimulus effect boosts consumer demand and tax revenue downstream.",
    ],
    negArguments: [
      "Regressive — most benefit flows to higher-earning college graduates.",
      "Inflationary pressure on tuition without underlying cost reform.",
      "Costs $300B+ shifted to non-college taxpayers.",
    ],
    prepQuestions: [
      "Does the bill cap forgiveness by income?",
      "How are private and federal loans treated differently?",
      "What is your strongest moral or economic frame?",
      "How would you handle a colleague's amendment to cap at $10K?",
      "What parliamentary motion might you make to strengthen the bill?",
    ],
  },
  {
    id: "congress-electoral-college",
    format: "Congress",
    resolution:
      "A Resolution to Initiate the Repeal of the Electoral College.",
    difficulty: "Intermediate",
    suggestedTime: "3 min speech · 2 min cross-examination",
    context: "Tests procedural knowledge and democratic-theory speeches.",
    background:
      "Two of the last six presidential elections produced popular-vote losers as winners. The National Popular Vote Interstate Compact has 209 of 270 electoral votes pledged.",
    keyTerms: [
      { term: "Electoral College", definition: "538 state-allocated electors who formally elect the president." },
      { term: "NPVIC", definition: "Interstate compact pledging electors to the national popular-vote winner." },
      { term: "Article V", definition: "Constitutional amendment process requiring 2/3 of Congress and 3/4 of states." },
    ],
    affArguments: [
      "One person, one vote — the popular winner should win.",
      "Eliminates swing-state distortion of campaign attention.",
      "Aligns presidential elections with all other U.S. elections.",
    ],
    negArguments: [
      "Federalist design prevents urban dominance over rural states.",
      "Forces broad coalition-building across regions.",
      "Recount nightmares would be national rather than state-contained.",
    ],
    prepQuestions: [
      "Does your speech support amendment, NPVIC, or both?",
      "What recount mechanism replaces the College?",
      "How do you respond to small-state arguments?",
      "What's your one-line frame for the chamber?",
      "What amendment might you offer to gain swing votes?",
    ],
  },
  {
    id: "congress-paid-leave",
    format: "Congress",
    resolution:
      "A Bill to Establish 12 Weeks of Federally Funded Paid Family and Medical Leave.",
    difficulty: "Beginner",
    suggestedTime: "3 min speech · 2 min cross-examination",
    context: "Approachable Congress bill grounded in OECD data.",
    background:
      "The U.S. is the only OECD country without national paid family leave. State programs (CA, NY, NJ) demonstrate feasibility.",
    keyTerms: [
      { term: "FMLA", definition: "1993 federal unpaid leave law covering certain employees." },
      { term: "Payroll tax", definition: "Tax on wages typically used to fund social-insurance programs." },
      { term: "Replacement rate", definition: "Share of usual wages a leave program pays out." },
    ],
    affArguments: [
      "Improves infant and maternal health outcomes.",
      "Increases female labor-force participation, growing GDP.",
      "Reduces costly turnover for employers.",
    ],
    negArguments: [
      "Payroll-tax burden hits low-wage workers hardest.",
      "Small businesses absorb scheduling and replacement costs.",
      "Federal one-size mandate displaces flexible state innovation.",
    ],
    prepQuestions: [
      "What is the replacement rate and cap?",
      "Who pays — employers, payroll tax, general fund?",
      "Are part-time workers covered?",
      "What evidence from state programs anchors your speech?",
      "What's your closing line for the chamber?",
    ],
  },
  {
    id: "congress-space-mining",
    format: "Congress",
    resolution:
      "A Bill to Authorize and Regulate Commercial Asteroid Mining by U.S. Companies.",
    difficulty: "Intermediate",
    suggestedTime: "3 min speech · 2 min cross-examination",
    context: "Future-facing Congress bill with international-law angles.",
    background:
      "The 2015 SPACE Act granted U.S. companies rights to mined resources, contested under the 1967 Outer Space Treaty's non-appropriation clause.",
    keyTerms: [
      { term: "Outer Space Treaty", definition: "1967 treaty barring national appropriation of celestial bodies." },
      { term: "Artemis Accords", definition: "U.S.-led agreements on lunar resource utilization." },
      { term: "Common heritage of mankind", definition: "Principle that certain resources belong to all humanity." },
    ],
    affArguments: [
      "Establishes U.S. leadership in trillion-dollar future industry.",
      "Resources (platinum, water) reduce launch costs and enable deeper exploration.",
      "Clear regulation prevents reckless racing by other actors.",
    ],
    negArguments: [
      "Violates Outer Space Treaty obligations and erodes international cooperation.",
      "Concentrates space wealth in a few companies and superpowers.",
      "Diverts resources from climate and infrastructure needs on Earth.",
    ],
    prepQuestions: [
      "Does the bill require multilateral agreement or proceed unilaterally?",
      "What environmental review applies in space?",
      "How is liability for space accidents allocated?",
      "What's your strongest one-line frame?",
      "Which amendment could you propose to broaden support?",
    ],
  },

  // ---------------- World Schools ----------------
  {
    id: "worlds-colonial-artifacts",
    format: "Worlds",
    resolution:
      "This House would require Western museums to repatriate cultural artifacts taken during colonial rule.",
    difficulty: "Intermediate",
    suggestedTime: "8 min substantive · 4 min reply",
    context: "Principle-rich Worlds motion with concrete cases.",
    background:
      "The British Museum holds the Parthenon Marbles and the Benin Bronzes. France and Germany have begun returning artifacts to Senegal, Nigeria, and Cameroon. UNESCO advocates restitution as part of decolonization.",
    keyTerms: [
      { term: "Repatriation", definition: "Return of cultural property to its country or community of origin." },
      { term: "Provenance", definition: "Documented chain of ownership and origin of an object." },
      { term: "1970 UNESCO Convention", definition: "Treaty against illicit transfer of cultural property." },
    ],
    affArguments: [
      "Historical injustice demands restoration of stolen heritage.",
      "Cultural objects belong in their living context — communities and rituals.",
      "Modern technology (3D casts, digital archives) enables sharing without retention.",
    ],
    negArguments: [
      "Universal museums offer global access millions of visitors enjoy.",
      "Some origin states lack capacity to preserve and secure artifacts.",
      "Ownership claims become unworkable across millennia of conquests and gifts.",
    ],
    prepQuestions: [
      "Is the requirement universal or case-by-case?",
      "Who decides provenance — the holding state, origin state, or international body?",
      "How does the team handle preservation-capacity concerns?",
      "Does 'colonial rule' include pre-1500 conquests?",
      "What principle frames the round?",
    ],
  },
  {
    id: "worlds-mandatory-public-service",
    format: "Worlds",
    resolution:
      "This House believes that liberal democracies should require one year of public service from young adults.",
    difficulty: "Beginner",
    suggestedTime: "8 min substantive · 4 min reply",
    context: "A balanced civic-virtue Worlds motion.",
    background:
      "Israel, South Korea, Switzerland, and Singapore require service. France's Service National Universel began in 2019. Debates weigh civic cohesion, autonomy, and labor-market impact.",
    keyTerms: [
      { term: "Civic republicanism", definition: "Tradition emphasizing citizens' duties to the political community." },
      { term: "Conscription", definition: "Compulsory enrollment, usually military." },
      { term: "Opportunity cost", definition: "Value of foregone alternatives during service period." },
    ],
    affArguments: [
      "Builds cross-class solidarity and civic identity.",
      "Provides skills and exposure that improve later employment.",
      "Addresses labor shortages in care, conservation, and education sectors.",
    ],
    negArguments: [
      "Compulsion violates personal autonomy in liberal society.",
      "Year-long delay harms career and educational trajectories.",
      "Volunteer corps achieve civic goals without coercion.",
    ],
    prepQuestions: [
      "What types of service qualify — military, civic, or both?",
      "How are exemptions and accommodations handled?",
      "What is your principle — duty, equality, or solidarity?",
      "How do you respond to the autonomy critique?",
      "What's your team-line for the round?",
    ],
  },
  {
    id: "worlds-wealth-tax",
    format: "Worlds",
    resolution:
      "This House would impose a global wealth tax on individuals with net worth exceeding $50 million.",
    difficulty: "Advanced",
    suggestedTime: "8 min substantive · 4 min reply",
    context: "Worlds motion combining economics, ethics, and international cooperation.",
    background:
      "The G20 has discussed coordinated wealth taxation following Zucman's 2024 proposals. Estimates suggest $250B/year in revenue from a 2% global tax.",
    keyTerms: [
      { term: "Net worth", definition: "Total assets minus total liabilities of an individual." },
      { term: "Tax haven", definition: "Jurisdiction with minimal effective taxation, used to shelter wealth." },
      { term: "FATCA", definition: "U.S. law requiring foreign banks to report on U.S. citizens' accounts." },
    ],
    affArguments: [
      "Reverses extreme wealth concentration that distorts democracy.",
      "Funds global public goods — climate adaptation, pandemic preparedness.",
      "Coordinated design prevents tax-haven evasion.",
    ],
    negArguments: [
      "Capital flight to non-cooperating jurisdictions undermines revenue.",
      "Valuation of illiquid assets is contested and litigated.",
      "Investment incentive losses harm growth and employment.",
    ],
    prepQuestions: [
      "How is enforcement coordinated across jurisdictions?",
      "What rate and asset coverage does Government defend?",
      "How are illiquid assets valued?",
      "How does Government answer capital-flight concerns?",
      "What principle anchors the team-line?",
    ],
  },
  {
    id: "worlds-nuclear-energy",
    format: "Worlds",
    resolution:
      "This House would massively expand nuclear energy as a primary tool to combat climate change.",
    difficulty: "Intermediate",
    suggestedTime: "8 min substantive · 4 min reply",
    context: "Climate-policy Worlds motion with strong technical and ethical layers.",
    background:
      "IEA modeling shows nuclear capacity must double by 2050 for net-zero. France, Korea, and the UAE demonstrate large-scale deployment; new SMR designs promise modular construction.",
    keyTerms: [
      { term: "SMR", definition: "Small Modular Reactor, factory-built and 10–300 MW capacity." },
      { term: "Capacity factor", definition: "Share of theoretical maximum output a plant actually delivers (nuclear ~92%)." },
      { term: "Levelized cost", definition: "Lifetime cost per MWh, allowing comparison across energy sources." },
    ],
    affArguments: [
      "Nuclear delivers reliable, dense, low-carbon baseload renewables cannot.",
      "Lifecycle deaths-per-TWh lower than fossil fuels and even some renewables.",
      "Grid stability enables faster fossil-fuel retirement.",
    ],
    negArguments: [
      "Construction costs and timelines (Hinkley Point, Vogtle) make scale-up infeasible.",
      "Waste storage and proliferation risks remain unsolved.",
      "Renewables and storage are cheaper, faster, and safer per dollar.",
    ],
    prepQuestions: [
      "What design and timeline does Government defend?",
      "How is waste handled — repository, reprocessing, dry cask?",
      "How do you respond to the cost-overrun critique?",
      "Whose burden weighs more — climate victims or local nuclear-risk communities?",
      "What principle anchors the team-line?",
    ],
  },
];

export function getTopicById(id: string): DebateTopic | undefined {
  return TOPICS.find((t) => t.id === id);
}

export function getTopicsByFormat(format: TopicFormat): DebateTopic[] {
  return TOPICS.filter((t) => t.format === format);
}
