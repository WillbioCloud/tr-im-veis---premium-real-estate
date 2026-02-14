import { GoogleGenerativeAI } from "@google/generative-ai";

// Inicializa a API com a chave que você colocou no .env.local
// Certifique-se que a variável no .env chama VITE_GEMINI_API_KEY
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

let genAI: GoogleGenerativeAI | null = null;

if (API_KEY) {
  genAI = new GoogleGenerativeAI(API_KEY);
} else {
  console.warn("Gemini API Key não encontrada. Funcionalidades de IA estarão desabilitadas.");
}

export const generateText = async (prompt: string): Promise<string | null> => {
  if (!genAI) return null;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Erro ao gerar texto com IA:", error);
    return null;
  }
};

// Exemplo de uso futuro:
// const description = await generatePropertyDescription(imovel);
export const generatePropertyDescription = async (propertyFeatures: string): Promise<string | null> => {
  const prompt = `
    Atue como um corretor de imóveis de luxo experiente.
    Escreva uma descrição atraente, persuasiva e elegante para um imóvel com as seguintes características:
    ${propertyFeatures}
    
    A descrição deve ter no máximo 3 parágrafos e focar no estilo de vida.
  `;
  return generateText(prompt);
};