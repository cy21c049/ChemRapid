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

export interface CoachingPlan {
  strengths: { 
    topic: string; 
    description: string; 
    blindSpots: string; 
    resourceSuggestion: string 
  }[];
  weaknesses: { 
    topic: string; 
    description: string; 
    actionPlan: string;
    resources: { name: string; url: string; type: 'video' | 'website' }[] 
  }[];
  opportunities: string[];
  threats: string[];
  coveredWellTopics: string[];
  strugglingTopics: string[];
}

import { EXACT_SYLLABUS_TOPICS } from './constants';

export async function generateCoachingPlan(sessionSummaries: string): Promise<CoachingPlan> {
  const ai = getAIClient();
  const allSubtopicsFlat = Object.values(EXACT_SYLLABUS_TOPICS).flat();
  const prompt = `You are an expert tutor for the HPCL Junior Executive QC exam and IIT-JAM Chemistry. 
Based on the following performance history of a student, provide a SWOT analysis and actionable coaching plan.
The performance history is provided as a text summary of their recent practice sessions.

PERFORMANCE HISTORY:
${sessionSummaries}

Analyze this data and find out their strengths, weaknesses, opportunities, and threats.
For strengths, identify blind spots and specific things to polish, along with a theoretical concept they should look up.
For weaknesses, provide highly actionable advice and recommend extremely specific resources (e.g. YouTube channels like "Khan Academy", "Physics Wallah", or specific websites like "Chem LibreTexts") to learn specific reactions (like Wittig, Kohlrausch law, etc) that they missed.
Make sure the topics you recommend are hyper-specific based on what they got wrong or right.

Additionally, based **strictly** on the exact list of syllabus subtopics below, classify which specific subtopics the student has covered and done well in (\`coveredWellTopics\`), and which ones they have covered but are struggling in (\`strugglingTopics\`).
If a topic has not been covered or there's not enough data, leave it out of both lists.
You must use the EXACT strings from this list:
${JSON.stringify(allSubtopicsFlat)}

Output the result as a strict JSON object.`;

  let response;
  try {
    response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        temperature: 0.7,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            strengths: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  topic: { type: Type.STRING, description: "The overarching topic, e.g., Chemical Kinetics or Organic Synthesis" },
                  description: { type: Type.STRING, description: "Why it's a strength" },
                  blindSpots: { type: Type.STRING, description: "Highly specific blind spots, e.g., 'Make sure to look at pseudo-first-order reactions'" },
                  resourceSuggestion: { type: Type.STRING, description: "A specific website or youtube search query to polish this strength." }
                },
                required: ["topic", "description", "blindSpots", "resourceSuggestion"]
              }
            },
            weaknesses: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  topic: { type: Type.STRING },
                  description: { type: Type.STRING },
                  actionPlan: { type: Type.STRING, description: "Actionable plan to convert this to a strength" },
                  resources: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        name: { type: Type.STRING, description: "Name of the resource, e.g., 'Khan Academy: Kohlrausch Law'" },
                        url: { type: Type.STRING, description: "A valid URL or Youtube search link, e.g., 'https://www.youtube.com/results?search_query=Kohlrausch+Law'" },
                        type: { type: Type.STRING, description: "video or website" }
                      },
                      required: ["name", "url", "type"]
                    }
                  }
                },
                required: ["topic", "description", "actionPlan", "resources"]
              }
            },
            opportunities: { type: Type.ARRAY, items: { type: Type.STRING } },
            threats: { type: Type.ARRAY, items: { type: Type.STRING } },
            coveredWellTopics: { type: Type.ARRAY, items: { type: Type.STRING } },
            strugglingTopics: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["strengths", "weaknesses", "opportunities", "threats", "coveredWellTopics", "strugglingTopics"]
        }
      }
    });
  } catch (error: any) {
    if (error.status === 429 || (error.message && error.message.includes('quota'))) {
      throw new Error("AI quota exceeded. Please check your Gemini API plan and billing details.");
    }
    throw error;
  }

  const jsonStr = response.text?.trim() || "{}";
  return JSON.parse(jsonStr) as CoachingPlan;
}

export interface ReportResult {
  isValidError: boolean;
  creditUser: boolean;
  feedback: string;
  updatedQuestion?: MCQ;
}

export async function reviewQuestionReport(originalQuestion: MCQ, userReport: string): Promise<ReportResult> {
  const ai = getAIClient();
  const prompt = `A user has reported an issue with a chemistry question from a quiz.
Original Question:
Question: ${originalQuestion.question}
Options: ${JSON.stringify(originalQuestion.options)}
Correct Answer: ${originalQuestion.correctAnswer}
Explanation: ${originalQuestion.explanation}

User's Report/Reasoning:
"${userReport}"

Evaluate the user's report. 
1. Is the original question/answer actually wrong or flawed?
2. If the user is correct and the question has a mistake, credit the user, and provide an updated version of the question, options, correct answer, and explanation. (The corrected version should still test the same basic concept or be a corrected version of the question).
3. If the user is wrong, explain why the original question is correct and they are wrong.

Output as JSON.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isValidError: { type: Type.BOOLEAN, description: "True if the question actually had an error, false otherwise." },
            creditUser: { type: Type.BOOLEAN, description: "True if the user should be given points for this (e.g. they got it marked wrong but they were actually right because of a flaw)." },
            feedback: { type: Type.STRING, description: "Feedback explaining the analysis." },
            updatedQuestion: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING },
                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                correctAnswer: { type: Type.STRING },
                explanation: { type: Type.STRING },
                subtopic: { type: Type.STRING }
              },
              required: ["question", "options", "correctAnswer", "explanation", "subtopic"]
            }
          },
          required: ["isValidError", "creditUser", "feedback"]
        }
      }
    });

    const jsonStr = response.text?.trim() || "{}";
    return JSON.parse(jsonStr) as ReportResult;
  } catch (error: any) {
    console.error("Failed to review report", error);
    throw new Error(error.message || "Failed to analyze report");
  }
}

export async function generateMockTest(count: number, priorityTopics: string[] = []): Promise<MCQ[]> {
  const allInorganic = EXACT_SYLLABUS_TOPICS["Inorganic Chemistry"] || [];
  const allOrganic = EXACT_SYLLABUS_TOPICS["Organic Chemistry"] || [];
  const allPhysical = EXACT_SYLLABUS_TOPICS["Physical Chemistry"] || [];
  
  let priorityStr = "";
  if (priorityTopics.length > 0) {
    priorityStr = `\nPRIORITY SUBTOPICS (Ensure breadth-first coverage, prioritizing these weak or uncovered topics):\n${priorityTopics.join(', ')}`;
  }

  const prompt = `YOUR OBJECTIVE:
Generate exactly ${count} completely unique MCQs covering a broad mix of Inorganic Chemistry, Organic Chemistry, and Physical Chemistry.
The questions MUST be evenly distributed across these three domains.
YOU MUST STRICTLY ONLY PICK CONCEPTS FROM THESE OFFICIAL SYLLABUS LISTS:
- Inorganic: ${allInorganic.join(', ')}
- Organic: ${allOrganic.join(', ')}
- Physical: ${allPhysical.join(', ')}
${priorityStr}

DIFFICULTY & CONSTRAINTS:
1. HPCL Exam Format: Questions must be factual, theoretical, or involve direct, single-step formula applications.
2. Prohibited Content: Do NOT generate highly complex, multi-step numerical derivations.
3. UNIQUENESS (CRITICAL): Generate varied questions. Avoid common textbook cliches.

Use LaTeX for chemical formulas ($...$).
Use [SMILES] tags for organic structures.`;

  const ai = getAIClient();
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      console.log(`Generating mock test... attempt ${attempt}`);
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt + `\n\n(Random seed: ${Math.random()})`,
        config: {
          temperature: 0.9,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING },
                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                correctAnswer: { type: Type.STRING },
                explanation: { type: Type.STRING },
                subtopic: { type: Type.STRING }
              },
              required: ["question", "options", "correctAnswer", "explanation", "subtopic"]
            }
          }
        }
      });
      const jsonStr = response.text?.trim() || "[]";
      let data = JSON.parse(jsonStr) as MCQ[];
      data = data.filter(q => 
        typeof q.question === 'string' && q.question.trim().length > 0 &&
        Array.isArray(q.options) && q.options.length === 4 &&
        typeof q.correctAnswer === 'string' && q.options.includes(q.correctAnswer)
      );
      if (data.length > count * 0.8) {
        return data;
      } else {
        throw new Error(`Only generated ${data.length} valid questions, need at least ${count * 0.8}`);
      }
    } catch (error: any) {
      lastError = error;
      if (attempt < 3) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }
  throw new Error(lastError instanceof Error ? lastError.message : "Failed to generate mock test.");
}

export async function generateMCQs(
  category: string, 
  subtopics: string[], 
  avoidQuestions: string[] = [],
  priorityTopics: string[] = []
): Promise<MCQ[]> {
  const allCategoryTopics = EXACT_SYLLABUS_TOPICS[category] || [];
  const subtopicStr = subtopics.length > 0 ? subtopics.join(", ") : `Randomized across category. You MUST ONLY pick from these official syllabus concepts: ${allCategoryTopics.join(', ')}`;
  
  let avoidStr = "";
  if (avoidQuestions.length > 0) {
    // Only pass a handful to save tokens, but enough to give context
    avoidStr = `\n\nPREVIOUSLY ASKED QUESTIONS (CRITICAL: DO NOT REPEAT THESE CONCEPTS OR QUESTIONS):\n${avoidQuestions.slice(0, 20).map((q, i) => `${i + 1}. ${q}`).join("\n")}`;
  }

  let priorityStr = "";
  if (priorityTopics.length > 0) {
    priorityStr = `\nPRIORITY SUBTOPICS (Ensure breadth-first coverage, prioritizing these weak or uncovered topics):\n${priorityTopics.join(', ')}`;
  }

  const prompt = `YOUR OBJECTIVE:
Generate exactly 10 MCQs based on the provided input. 
- Category: '${category}'
- Specific Subtopics: ${subtopicStr}${priorityStr}
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
When evaluating complex organic chemistry structures or reactions, use SMILES representation enclosed in [SMILES] tags.
For example, to display a structure, use [SMILES]CC(=O)O[/SMILES]. To demonstrate a reaction, use [SMILES]C=C>>CC[/SMILES].
Do NOT use [SMILES] for simple inorganic molecules like H2O, CO2, or simple ions like H+; rely on LaTeX for those instead.
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
        let currentModel = "gemini-2.5-flash";
        if (attempt === 3) currentModel = "gemini-2.0-flash";
        if (attempt === 4) currentModel = "gemini-1.5-pro";
        if (attempt === 5) currentModel = "gemini-1.5-flash";
        
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
                    description: "The chemistry question text, with robust use of inline LaTeX (e.g. $...$) for formulas and symbols. Also use [SMILES]...[/SMILES] tags to render organic chemical structures or reactions as visual SVGs instead of text whenever necessary.",
                  },
                  options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "Four plausible answer options (including LaTeX or [SMILES]...[/SMILES] tags if needed). Must be exactly 4.",
                  },
                  correctAnswer: {
                    type: Type.STRING,
                    description: "The correct answer, must match one of the options exactly.",
                  },
                  explanation: {
                    type: Type.STRING,
                    description: "A step-by-step rigorous explanation of the answer, using LaTeX and [SMILES] tags.",
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
        let data = JSON.parse(jsonStr) as MCQ[];
        
        // Ensure each option has 4 options and valid strings
        data = data.filter(q => 
          typeof q.question === 'string' && q.question.trim().length > 0 &&
          Array.isArray(q.options) && q.options.length >= 2 &&
          typeof q.correctAnswer === 'string' && q.options.includes(q.correctAnswer)
        );
        
        return data;
      } catch (error: any) {
        lastError = error;
        console.warn(`AI Generation attempt ${attempt} failed:`, error);
        
        if (error instanceof Error && error.message.includes("API configuration is missing")) {
          throw new Error("Missing Gemini API Key. Please add the GEMINI_API_KEY to your Vercel project Environment Variables and redeploy.");
        }

        if (error.status === 429 || (error.message && error.message.includes('quota'))) {
          throw new Error("AI quota exceeded. Please check your Gemini API plan and billing details.");
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
