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

export async function generateMCQs(category: string, subtopics: string[], avoidQuestions: string[] = []): Promise<MCQ[]> {
  const subtopicStr = subtopics.length > 0 ? subtopics.join(", ") : "Randomized across category";
  
  let avoidStr = "";
  if (avoidQuestions.length > 0) {
    // Only pass a handful to save tokens, but enough to give context
    avoidStr = `\n\nPREVIOUSLY ASKED QUESTIONS (CRITICAL: DO NOT REPEAT THESE CONCEPTS OR QUESTIONS):\n${avoidQuestions.slice(0, 20).map((q, i) => `${i + 1}. ${q}`).join("\n")}`;
  }

  const prompt = `YOUR OBJECTIVE:
Generate exactly 10 MCQs based on the provided input. 
- Category: '${category}'
- Specific Subtopics: ${subtopicStr}
If Specific Subtopics are provided, all 10 questions must be deeply focused on the set of concepts evenly distributed randomly.
If "Randomized across category", the 10 questions must be randomly distributed across the broader parent Category.
${avoidStr}

DIFFICULTY & CONSTRAINTS:
1. HPCL Exam Format: This is a speed-based exam where candidates have roughly 50 seconds per question. Questions must be factual, theoretical, or involve direct, single-step formula applications. 
2. Prohibited Content: Do NOT generate highly complex, multi-step numerical derivations or overly abstract conceptual problems. 
3. Practical Focus: Whenever possible, lean towards the analytical and practical side of chemistry (e.g., laboratory techniques, spectroscopy, chromatography, and qualitative analysis), as this is for a Quality Control role.
4. UNIQUENESS & BREADTH (CRITICAL): Draw inspiration from a wide variety of competitive exam question banks. Do NOT rely on the most common, surface-level examples. Dig deep into the syllabus constraints to find niche, under-tested formulas, concepts, variations, or edge-cases. You MUST generate questions on completely different facets of the subtopics than usual. Avoid asking the same standard textbook questions.

SYLLABUS REFERENCE:
Inorganic Chemistry: Atomic structure, quantum numbers, electronic configurations, periodic table trends, ionization energy, electron affinity, electronegativity, ionic and covalent bonding, VSEPR theory, hybridization, molecular orbital theory, lattice energy, solubility of ionic compounds, s-block elements, p-block elements, d-block elements, f-block elements, transition metal chemistry, oxidation states, color and magnetic properties, lanthanides and actinides, coordination compounds, Werner's theory, types of isomerism in complexes, ligand types, crystal field theory, crystal field splitting energy, spectrochemical series, bioinorganic chemistry, metal ions in biological systems, metalloproteins, hemoglobin, myoglobin, nitrogen fixation, organometallic compounds, metal-carbon bonds, catalysis (Wilkinson's, Ziegler-Natta), HSAB principle, metallurgical processes, environmental pollution by metals, green chemistry, and nuclear chemistry.

Organic Chemistry: Classification of organic compounds, IUPAC nomenclature, types of isomerism, resonance and inductive effects, hyperconjugation, reactive intermediates (carbocations, carbanions, free radicals), alkanes, alkenes, alkynes, cycloalkanes, aromaticity, benzene and its derivatives, electrophilic substitution reactions, alcohols, phenols, ethers, aldehydes, ketones, carboxylic acids, acid derivatives, amines, diazonium salts, nitration, sulphonation, halogenation, Friedel-Crafts reactions, stereochemistry, chirality, optical activity, enantiomers and diastereomers, conformational analysis, carbohydrates (glucose, fructose), amino acids, proteins, nucleic acids, lipids, vitamins, alkaloids, terpenes, steroids, heterocyclic compounds (furan, pyrrole, pyridine), organic reagents (LiAlH4, NaBH4, PCC), organic photochemistry, pericyclic reactions, and modern synthetic methods.

Physical Chemistry: States of matter, ideal and real gases, van der Waals equation, critical phenomena, surface tension, viscosity, laws of thermodynamics, enthalpy, entropy, Gibbs free energy, spontaneous and non-spontaneous processes, chemical equilibrium, Le Chatelier's principle, ionic equilibria, pH, buffer solutions, solubility product, chemical kinetics, rate laws, order and molecularity of reactions, Arrhenius equation, collision theory, phase rule, phase diagrams, colligative properties, Raoult's law, elevation of boiling point, depression of freezing point, osmotic pressure, conductivity of electrolytes, Kohlrausch's law, electrochemical cells, Nernst equation, EMF, corrosion, adsorption, Freundlich and Langmuir isotherms, colloids, emulsions, quantum chemistry basics, wave-particle duality, Schrödinger equation, atomic orbitals, molecular orbitals, UV-Vis spectroscopy, IR spectroscopy, NMR spectroscopy, ESR spectroscopy, and statistical thermodynamics.

Others: Qualitative analysis of inorganic salts, detection of acidic and basic radicals, preparation of inorganic compounds, detection of organic functional groups, synthesis of organic compounds (e.g., aspirin, benzoic acid), purification by crystallization and distillation, melting point and boiling point determination, volumetric analysis (acid-base, redox, complexometric titrations), kinetics experiments, determination of rate constants, conductometric and potentiometric titrations, determination of partition coefficient, measurement of surface tension and viscosity, UV-Vis spectrophotometry, IR spectroscopy, paper chromatography, thin-layer chromatography (TLC), column chromatography.

Use LaTeX for chemical formulas and equations, e.g., $H_2O$ or $\\Delta H = -200$ kJ/mol.
Make sure all options are plausible but only one is strictly correct. Focus on conceptual understanding, mechanism, or calculation typical of HPCL Junior Executive QC exams.`;

  const ai = getAIClient();
  const angles = [
      "Focus heavily on numerical applications, exact values, and analytical techniques rather than pure theory.",
      "Focus heavily on exceptions to general rules, edge-cases, and deep theoretical principles.",
      "Focus heavily on specific reagent roles, intermediate structures, and less widely taught corollaries.",
      "Focus heavily on historical context, specific named reactions, and exact reaction conditions (temperature, catalysts, pressure).",
      "Focus heavily on extreme conditions, rare compounds, and graphical interpretations of data or thermodynamic plots.",
      "Focus heavily on real-world industrial applications, qualitative analysis color/precipitate changes, and specific physical constants.",
      "Focus heavily on tricky wordings, common misconceptions, identifying false statements among true ones, and multi-step synthesis pathways."
    ];
    const angle = angles[Math.floor(Math.random() * angles.length)];

    let lastError: unknown;
    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        // Fallback to gemini-2.0-flash after 3 attempts
        const currentModel = attempt <= 3 ? "gemini-2.5-flash" : "gemini-2.0-flash";
        console.log(`AI Generation attempt ${attempt} using ${currentModel}...`);

        const response = await ai.models.generateContent({
          model: currentModel,
          contents: prompt + `\n\nCRITICAL UNIQUENESS DIRECTIVE: ${angle}\nEnsure this specific set of questions is completely unique and differs from any typical or previously generated sets. Do not use textbook cliches. (Random seed for unique generation: ${Math.random()})\nSystem Time: ${Date.now()}`,
          config: {
            temperature: 1.5 + (attempt - 1) * 0.1, // Increase temp slightly on retries for variety if it matters
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
        lastError = error;
        console.warn(`AI Generation attempt ${attempt} failed:`, error);
        
        if (error instanceof Error && error.message.includes("API configuration is missing")) {
          throw new Error("Missing Gemini API Key. Please add the GEMINI_API_KEY to your Vercel project Environment Variables and redeploy.");
        }
        
        if (attempt < 5) {
          // Wait before retrying (exponential backoff but cap it)
          const delay = Math.min(Math.pow(2, attempt) * 1000, 10000); // Max delay of 10 seconds between attempts
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(lastError instanceof Error ? `Generation failed after 5 attempts: ${lastError.message}` : "Failed to generate questions after 5 attempts. Please try again.");
}
