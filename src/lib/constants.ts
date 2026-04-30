export const EXACT_SYLLABUS_TOPICS: Record<string, string[]> = {
  "Inorganic Chemistry": [
    "Atomic structure", "quantum numbers", "electronic configurations", "periodic table trends", "ionization energy", 
    "electron affinity", "electronegativity", "ionic and covalent bonding", "VSEPR theory", "hybridization", 
    "molecular orbital theory", "lattice energy", "solubility of ionic compounds", "s-block elements", 
    "p-block elements", "d-block elements", "f-block elements", "transition metal chemistry", "oxidation states", 
    "color and magnetic properties", "lanthanides and actinides", "coordination compounds", "Werner’s theory", 
    "types of isomerism in complexes", "ligand types", "crystal field theory", "crystal field splitting energy", 
    "spectrochemical series", "bioinorganic chemistry", "metal ions in biological systems", "metalloproteins", 
    "hemoglobin", "myoglobin", "nitrogen fixation", "organometallic compounds", "metal-carbon bonds", 
    "catalysis (Wilkinson’s, Ziegler-Natta)", "HSAB principle", "metallurgical processes", "environmental pollution by metals", 
    "green chemistry", "nuclear chemistry"
  ],
  "Organic Chemistry": [
    "Classification of organic compounds", "IUPAC nomenclature", "types of isomerism", "resonance and inductive effects", 
    "hyperconjugation", "reactive intermediates (carbocations, carbanions, free radicals)", "alkanes", "alkenes", "alkynes", 
    "cycloalkanes", "aromaticity", "benzene and its derivatives", "electrophilic substitution reactions", "alcohols", "phenols", 
    "ethers", "aldehydes", "ketones", "carboxylic acids", "acid derivatives", "amines", "diazonium salts", "nitration", 
    "sulphonation", "halogenation", "Friedel-Crafts reactions", "stereochemistry", "chirality", "optical activity", 
    "enantiomers and diastereomers", "conformational analysis", "carbohydrates (glucose, fructose)", "amino acids", "proteins", 
    "nucleic acids", "lipids", "vitamins", "alkaloids", "terpenes", "steroids", "heterocyclic compounds (furan, pyrrole, pyridine)", 
    "organic reagents (LiAlH₄, NaBH₄, PCC)", "organic photochemistry", "pericyclic reactions", "modern synthetic methods"
  ],
  "Physical Chemistry": [
    "States of matter", "ideal and real gases", "van der Waals equation", "critical phenomena", "surface tension", "viscosity", 
    "laws of thermodynamics", "enthalpy", "entropy", "Gibbs free energy", "spontaneous and non-spontaneous processes", 
    "chemical equilibrium", "Le Chatelier’s principle", "ionic equilibria", "pH", "buffer solutions", "solubility product", 
    "chemical kinetics", "rate laws", "order and molecularity of reactions", "Arrhenius equation", "collision theory", 
    "phase rule", "phase diagrams", "colligative properties", "Raoult’s law", "elevation of boiling point", 
    "depression of freezing point", "osmotic pressure", "conductivity of electrolytes", "Kohlrausch’s law", 
    "electrochemical cells", "Nernst equation", "EMF", "corrosion", "adsorption", "Freundlich and Langmuir isotherms", 
    "colloids", "emulsions", "quantum chemistry basics", "wave-particle duality", "Schrödinger equation", "atomic orbitals", 
    "molecular orbitals", "UV-Vis spectroscopy", "IR spectroscopy", "NMR spectroscopy", "ESR spectroscopy", "statistical thermodynamics"
  ],
  "Others": [
    "Qualitative analysis of inorganic salts", "detection of acidic and basic radicals", "preparation of inorganic compounds", 
    "detection of organic functional groups", "synthesis of organic compounds (e.g., aspirin, benzoic acid)", 
    "purification by crystallization and distillation", "melting point and boiling point determination", 
    "volumetric analysis (acid-base, redox, complexometric titrations)", "kinetics experiments", "determination of rate constants", 
    "conductometric and potentiometric titrations", "determination of partition coefficient", "measurement of surface tension and viscosity", 
    "UV-Vis spectrophotometry", "IR spectroscopy", "paper chromatography", "thin-layer chromatography (TLC)", "column chromatography"
  ]
};

export const CATEGORIES = [
  {
    id: "inorganic-chemistry",
    title: "Inorganic Chemistry",
    subtopics: [
      "Atomic structure & Quantum numbers", 
      "Electronic configurations & Periodic trends", 
      "Chemical bonding & VSEPR", 
      "MOT & Hybridization",
      "s, p, d, f-block elements",
      "Coordination compounds & CFT",
      "Bioinorganic chemistry",
      "Organometallic compounds",
      "Metallurgical processes & HSAB",
      "Nuclear & Green chemistry"
    ]
  },
  {
    id: "organic-chemistry",
    title: "Organic Chemistry",
    subtopics: [
      "Nomenclature & Isomerism",
      "Reactive intermediates & Electronic effects",
      "Alkanes, Alkenes, Alkynes & Cycloalkanes",
      "Aromaticity & Benzene derivatives",
      "Alcohols, Phenols, Ethers & Carbonyls",
      "Amines & Diazonium salts",
      "Stereochemistry & Conformational analysis",
      "Biomolecules (Carbs, Proteins, Lipids)",
      "Heterocyclic compounds",
      "Organic reagents & Modern synthesis",
      "Pericyclic & Photochemistry"
    ]
  },
  {
    id: "physical-chemistry",
    title: "Physical Chemistry",
    subtopics: [
      "States of matter & Real gases",
      "Thermodynamics & Spontaneity",
      "Chemical & Ionic equilibrium",
      "Chemical kinetics & Collision theory",
      "Phase rule & Phase diagrams",
      "Colligative properties",
      "Electrochemistry & Nernst equation",
      "Surface chemistry, Adsorption & Colloids",
      "Quantum chemistry & Schrödinger eq",
      "Spectroscopy (UV-Vis, IR, NMR, ESR)",
      "Statistical thermodynamics"
    ]
  },
  {
    id: "analytical-experimental",
    title: "Analytical & Experimental",
    subtopics: [
      "Qualitative analysis of salts",
      "Organic functional group detection",
      "Synthesis & Purification techniques",
      "Volumetric analysis & Titrations",
      "Conductometric & Potentiometric titrations",
      "Spectrophotometry & Spectroscopy",
      "Chromatography (Paper, TLC, Column)",
      "Physical properties measurement"
    ]
  }
];
