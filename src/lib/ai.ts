import { GoogleGenAI, Type } from "@google/genai";

let aiClient: GoogleGenAI | null = null;

function getAIClient() {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.error("GEMINI_API_KEY is not defined in the environment variables.");
      throw new Error("API configuration is missing. Please add GEMINI_API_KEY to your environment variables.");
    }
    aiClient = new GoogleGenAI({ apiKey: key });
  }
  return aiClient;
}

export interface MCQ {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  subtopic: string;
}

export async function generateMCQs(category: string, subtopics: string[]): Promise<MCQ[]> {
  const subtopicStr = subtopics.length > 0 ? subtopics.join(", ") : "Randomized across category";
  const prompt = `YOUR OBJECTIVE:
Generate exactly 10 MCQs based on the provided input. 
- Category: '${category}'
- Specific Subtopics: ${subtopicStr}
If Specific Subtopics are provided, all 10 questions must be deeply focused on the set of concepts evenly distributed randomly.
If "Randomized across category", the 10 questions must be randomly distributed across the broader parent Category.

DIFFICULTY & CONSTRAINTS:
1. HPCL Exam Format: This is a speed-based exam where candidates have roughly 50 seconds per question. Questions must be factual, theoretical, or involve direct, single-step formula applications. 
2. Prohibited Content: Do NOT generate highly complex, multi-step numerical derivations or overly abstract conceptual problems. 
3. Practical Focus: Whenever possible, lean towards the analytical and practical side of chemistry (e.g., laboratory techniques, spectroscopy, chromatography, and qualitative analysis), as this is for a Quality Control role.

SYLLABUS REFERENCE:
Inorganic Chemistry: Atomic structure, quantum numbers, electronic configurations, periodic table trends, ionization energy, electron affinity, electronegativity, ionic and covalent bonding, VSEPR theory, hybridization, molecular orbital theory, lattice energy, solubility of ionic compounds, s-block elements, p-block elements, d-block elements, f-block elements, transition metal chemistry, oxidation states, color and magnetic properties, lanthanides and actinides, coordination compounds, Werner's theory, types of isomerism in complexes, ligand types, crystal field theory, crystal field splitting energy, spectrochemical series, bioinorganic chemistry, metal ions in biological systems, metalloproteins, hemoglobin, myoglobin, nitrogen fixation, organometallic compounds, metal-carbon bonds, catalysis (Wilkinson's, Ziegler-Natta), HSAB principle, metallurgical processes, environmental pollution by metals, green chemistry, and nuclear chemistry.

Organic Chemistry: Classification of organic compounds, IUPAC nomenclature, types of isomerism, resonance and inductive effects, hyperconjugation, reactive intermediates (carbocations, carbanions, free radicals), alkanes, alkenes, alkynes, cycloalkanes, aromaticity, benzene and its derivatives, electrophilic substitution reactions, alcohols, phenols, ethers, aldehydes, ketones, carboxylic acids, acid derivatives, amines, diazonium salts, nitration, sulphonation, halogenation, Friedel-Crafts reactions, stereochemistry, chirality, optical activity, enantiomers and diastereomers, conformational analysis, carbohydrates (glucose, fructose), amino acids, proteins, nucleic acids, lipids, vitamins, alkaloids, terpenes, steroids, heterocyclic compounds (furan, pyrrole, pyridine), organic reagents (LiAlH4, NaBH4, PCC), organic photochemistry, pericyclic reactions, and modern synthetic methods.

Physical Chemistry: States of matter, ideal and real gases, van der Waals equation, critical phenomena, surface tension, viscosity, laws of thermodynamics, enthalpy, entropy, Gibbs free energy, spontaneous and non-spontaneous processes, chemical equilibrium, Le Chatelier's principle, ionic equilibria, pH, buffer solutions, solubility product, chemical kinetics, rate laws, order and molecularity of reactions, Arrhenius equation, collision theory, phase rule, phase diagrams, colligative properties, Raoult's law, elevation of boiling point, depression of freezing point, osmotic pressure, conductivity of electrolytes, Kohlrausch's law, electrochemical cells, Nernst equation, EMF, corrosion, adsorption, Freundlich and Langmuir isotherms, colloids, emulsions, quantum chemistry basics, wave-particle duality, Schrödinger equation, atomic orbitals, molecular orbitals, UV-Vis spectroscopy, IR spectroscopy, NMR spectroscopy, ESR spectroscopy, and statistical thermodynamics.

Others: Qualitative analysis of inorganic salts, detection of acidic and basic radicals, preparation of inorganic compounds, detection of organic functional groups, synthesis of organic compounds (e.g., aspirin, benzoic acid), purification by crystallization and distillation, melting point and boiling point determination, volumetric analysis (acid-base, redox, complexometric titrations), kinetics experiments, determination of rate constants, conductometric and potentiometric titrations, determination of partition coefficient, measurement of surface tension and viscosity, UV-Vis spectrophotometry, IR spectroscopy, paper chromatography, thin-layer chromatography (TLC), column chromatography.

Use LaTeX for chemical formulas and equations, e.g., $H_2O$ or $\\Delta H = -200$ kJ/mol.
Make sure all options are plausible but only one is strictly correct. Focus on conceptual understanding, mechanism, or calculation typical of HPCL Junior Executive QC exams.`;

  try {
    const ai = getAIClient();
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: {
                type: Type.STRING,
                description: "The chemistry question text, with robust use of inline LaTeX (e.g. $...$) for formulas and symbols.",
              },
              options: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Four plausible answer options (including LaTeX if needed). Must be exactly 4.",
              },
              correctAnswer: {
                type: Type.STRING,
                description: "The correct answer, must match one of the options exactly.",
              },
              explanation: {
                type: Type.STRING,
                description: "A step-by-step rigorous explanation of the answer, using LaTeX.",
              },
              subtopic: {
                 type: Type.STRING,
                 description: "The specific subtopic this question belongs to.",
              }
            },
            required: ["question", "options", "correctAnswer", "explanation", "subtopic"],
          },
        },
      },
    });

    const jsonStr = response.text?.trim() || "[]";
    const data = JSON.parse(jsonStr) as MCQ[];
    return data;
  } catch (error) {
    console.error("AI Generation Error:", error);
    throw new Error("Failed to generate questions. Please try again.");
  }
}
