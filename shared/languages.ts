export type LanguageCode = "en" | "es" | "zh" | "fr" | "pt" | "de";

export interface LanguageConfig {
  code: LanguageCode;
  label: string;
  nativeLabel: string;
  bcp47: string;
  promptName: string;
}

export const LANGUAGES: Record<LanguageCode, LanguageConfig> = {
  en: { code: "en", label: "English", nativeLabel: "English", bcp47: "en-US", promptName: "English" },
  es: { code: "es", label: "Spanish", nativeLabel: "Español", bcp47: "es-ES", promptName: "Spanish" },
  zh: { code: "zh", label: "Mandarin", nativeLabel: "中文", bcp47: "zh-CN", promptName: "Mandarin Chinese (Simplified)" },
  fr: { code: "fr", label: "French", nativeLabel: "Français", bcp47: "fr-FR", promptName: "French" },
  pt: { code: "pt", label: "Portuguese", nativeLabel: "Português", bcp47: "pt-BR", promptName: "Portuguese" },
  de: { code: "de", label: "German", nativeLabel: "Deutsch", bcp47: "de-DE", promptName: "German" },
};

export const LANGUAGE_CODES = Object.keys(LANGUAGES) as LanguageCode[];

export function isLanguageCode(value: unknown): value is LanguageCode {
  return typeof value === "string" && value in LANGUAGES;
}

export interface LocalizedTopic {
  resolution: string;
  context: string;
  affArgs: string[];
  negArgs: string[];
}

/**
 * Curated topics with translated resolutions and context for each supported
 * language. Keys are stable topic IDs; English is the canonical fallback.
 */
export const LOCALIZED_TOPICS: Record<string, Record<LanguageCode, LocalizedTopic>> = {
  ubi: {
    en: {
      resolution: "Resolved: The United States ought to provide a universal basic income.",
      context: "A UBI guarantees every citizen a recurring cash payment regardless of employment status.",
      affArgs: ["Reduces poverty floor", "Cushions automation shocks", "Simplifies welfare bureaucracy"],
      negArgs: ["Fiscal cost and inflation risk", "Work disincentives", "Crowds out targeted programs"],
    },
    es: {
      resolution: "Resuelto: Estados Unidos debe proporcionar una renta básica universal.",
      context: "Una renta básica universal garantiza a cada ciudadano un pago en efectivo recurrente sin importar su situación laboral.",
      affArgs: ["Reduce el umbral de pobreza", "Amortigua los choques de la automatización", "Simplifica la burocracia del bienestar"],
      negArgs: ["Costo fiscal y riesgo inflacionario", "Desincentivos al trabajo", "Desplaza programas focalizados"],
    },
    zh: {
      resolution: "辩题:美国应当提供全民基本收入。",
      context: "全民基本收入向每位公民定期发放现金,无论其就业状况如何。",
      affArgs: ["提升贫困底线", "缓冲自动化冲击", "简化福利官僚体制"],
      negArgs: ["财政成本与通胀风险", "削弱劳动激励", "挤压针对性援助项目"],
    },
    fr: {
      resolution: "Résolu : Les États-Unis devraient instaurer un revenu de base universel.",
      context: "Un revenu de base universel garantit à chaque citoyen un versement régulier, indépendamment de son emploi.",
      affArgs: ["Relève le seuil de pauvreté", "Atténue les chocs de l'automatisation", "Simplifie la bureaucratie sociale"],
      negArgs: ["Coût budgétaire et risque inflationniste", "Désincitations au travail", "Évince les programmes ciblés"],
    },
    pt: {
      resolution: "Resolvido: Os Estados Unidos devem fornecer uma renda básica universal.",
      context: "Uma renda básica universal garante a cada cidadão um pagamento periódico em dinheiro, independentemente do emprego.",
      affArgs: ["Eleva o piso da pobreza", "Amortece choques da automação", "Simplifica a burocracia do bem-estar"],
      negArgs: ["Custo fiscal e risco inflacionário", "Desincentivos ao trabalho", "Desloca programas focalizados"],
    },
    de: {
      resolution: "Beschlossen: Die Vereinigten Staaten sollten ein bedingungsloses Grundeinkommen einführen.",
      context: "Ein bedingungsloses Grundeinkommen sichert jedem Bürger eine regelmäßige Geldzahlung unabhängig vom Beschäftigungsstatus.",
      affArgs: ["Hebt die Armutsgrenze an", "Federt Automatisierungsschocks ab", "Vereinfacht die Sozialbürokratie"],
      negArgs: ["Fiskalkosten und Inflationsrisiko", "Arbeitsanreize sinken", "Verdrängt zielgerichtete Programme"],
    },
  },
  agi: {
    en: {
      resolution: "Resolved: The development of artificial general intelligence is, on balance, beneficial.",
      context: "AGI refers to AI systems that match or exceed human cognitive ability across most economically valuable tasks.",
      affArgs: ["Accelerates science and medicine", "Boosts productivity and growth", "Solves coordination problems"],
      negArgs: ["Existential and alignment risk", "Mass labor displacement", "Concentration of power"],
    },
    es: {
      resolution: "Resuelto: El desarrollo de la inteligencia artificial general es, en general, beneficioso.",
      context: "La IAG se refiere a sistemas de IA que igualan o superan la capacidad cognitiva humana en la mayoría de las tareas económicamente valiosas.",
      affArgs: ["Acelera la ciencia y la medicina", "Impulsa la productividad y el crecimiento", "Resuelve problemas de coordinación"],
      negArgs: ["Riesgo existencial y de alineación", "Desplazamiento laboral masivo", "Concentración del poder"],
    },
    zh: {
      resolution: "辩题:通用人工智能的发展总体上利大于弊。",
      context: "通用人工智能指在大多数具有经济价值的任务上匹敌或超越人类认知能力的人工智能系统。",
      affArgs: ["加速科学与医学进步", "提升生产力与经济增长", "解决协调难题"],
      negArgs: ["生存与对齐风险", "大规模劳动力被替代", "权力高度集中"],
    },
    fr: {
      resolution: "Résolu : Le développement de l'intelligence artificielle générale est, globalement, bénéfique.",
      context: "L'IAG désigne des systèmes d'IA qui égalent ou dépassent la capacité cognitive humaine dans la plupart des tâches à forte valeur économique.",
      affArgs: ["Accélère la science et la médecine", "Stimule la productivité et la croissance", "Résout des problèmes de coordination"],
      negArgs: ["Risque existentiel et d'alignement", "Déplacement massif d'emplois", "Concentration du pouvoir"],
    },
    pt: {
      resolution: "Resolvido: O desenvolvimento da inteligência artificial geral é, em equilíbrio, benéfico.",
      context: "A IAG refere-se a sistemas de IA que igualam ou superam a capacidade cognitiva humana na maioria das tarefas economicamente valiosas.",
      affArgs: ["Acelera a ciência e a medicina", "Aumenta a produtividade e o crescimento", "Resolve problemas de coordenação"],
      negArgs: ["Risco existencial e de alinhamento", "Deslocamento massivo de empregos", "Concentração de poder"],
    },
    de: {
      resolution: "Beschlossen: Die Entwicklung künstlicher allgemeiner Intelligenz ist insgesamt vorteilhaft.",
      context: "AGI bezeichnet KI-Systeme, die die menschliche kognitive Leistungsfähigkeit in den meisten wirtschaftlich wertvollen Aufgaben erreichen oder übertreffen.",
      affArgs: ["Beschleunigt Wissenschaft und Medizin", "Steigert Produktivität und Wachstum", "Löst Koordinationsprobleme"],
      negArgs: ["Existenzielles und Alignment-Risiko", "Massive Arbeitsplatzverdrängung", "Machtkonzentration"],
    },
  },
  food: {
    en: {
      resolution: "Resolved: Just governments ought to ensure food security for their citizens.",
      context: "Food security means reliable access to sufficient, safe, and nutritious food for an active life.",
      affArgs: ["Right to life and dignity", "Public health and stability", "Reduces inequality"],
      negArgs: ["Market and incentive distortions", "Fiscal trade-offs", "Federalism and local control"],
    },
    es: {
      resolution: "Resuelto: Los gobiernos justos deben garantizar la seguridad alimentaria de sus ciudadanos.",
      context: "La seguridad alimentaria significa el acceso confiable a alimentos suficientes, seguros y nutritivos para una vida activa.",
      affArgs: ["Derecho a la vida y a la dignidad", "Salud pública y estabilidad", "Reduce la desigualdad"],
      negArgs: ["Distorsiones de mercado e incentivos", "Compensaciones fiscales", "Federalismo y control local"],
    },
    zh: {
      resolution: "辩题:正义的政府应当保障公民的粮食安全。",
      context: "粮食安全意味着稳定地获得足够、安全且富有营养的食物以维持积极生活。",
      affArgs: ["生命权与尊严", "公共健康与社会稳定", "减少不平等"],
      negArgs: ["扭曲市场与激励机制", "财政取舍", "联邦制与地方自治"],
    },
    fr: {
      resolution: "Résolu : Les gouvernements justes doivent garantir la sécurité alimentaire de leurs citoyens.",
      context: "La sécurité alimentaire désigne l'accès fiable à une nourriture suffisante, sûre et nutritive pour une vie active.",
      affArgs: ["Droit à la vie et à la dignité", "Santé publique et stabilité", "Réduit les inégalités"],
      negArgs: ["Distorsions de marché et d'incitations", "Arbitrages budgétaires", "Fédéralisme et contrôle local"],
    },
    pt: {
      resolution: "Resolvido: Governos justos devem garantir a segurança alimentar de seus cidadãos.",
      context: "A segurança alimentar significa acesso confiável a alimentos suficientes, seguros e nutritivos para uma vida ativa.",
      affArgs: ["Direito à vida e à dignidade", "Saúde pública e estabilidade", "Reduz a desigualdade"],
      negArgs: ["Distorções de mercado e incentivos", "Trade-offs fiscais", "Federalismo e controle local"],
    },
    de: {
      resolution: "Beschlossen: Gerechte Regierungen sollten die Ernährungssicherheit ihrer Bürger gewährleisten.",
      context: "Ernährungssicherheit bedeutet zuverlässigen Zugang zu ausreichenden, sicheren und nährstoffreichen Lebensmitteln für ein aktives Leben.",
      affArgs: ["Recht auf Leben und Würde", "Öffentliche Gesundheit und Stabilität", "Verringert Ungleichheit"],
      negArgs: ["Markt- und Anreizverzerrungen", "Fiskalische Abwägungen", "Föderalismus und lokale Kontrolle"],
    },
  },
};

export function topicsForLanguage(lang: LanguageCode): { id: string; resolution: string; context: string }[] {
  return Object.entries(LOCALIZED_TOPICS).map(([id, byLang]) => {
    const t = byLang[lang] ?? byLang.en;
    return { id, resolution: t.resolution, context: t.context };
  });
}
