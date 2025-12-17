
import { GoogleGenAI, Type, Chat } from "@google/genai";
import { Answer, Question, Doctor, ReportData, Fact, Helpline } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const model = 'gemini-2.5-flash';

const questionSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            id: { type: Type.INTEGER, description: "A unique ID for the question, starting from 1." },
            questionText: { type: Type.STRING, description: "The mental health-related question." },
            type: { type: Type.STRING, enum: ['MCQ', 'RATING', 'SLIDER'], description: "The type of question." },
            options: { type: Type.ARRAY, items: { type: Type.STRING }, description: "An array of 4 options if type is MCQ." },
            min: { type: Type.INTEGER, description: "Minimum value for RATING or SLIDER, e.g., 1." },
            max: { type: Type.INTEGER, description: "Maximum value for RATING or SLIDER, e.g., 5 or 10." },
            minLabel: { type: Type.STRING, description: "Label for the minimum value, e.g., 'Not at all'." },
            maxLabel: { type: Type.STRING, description: "Label for the maximum value, e.g., 'Extremely'." },
        },
        required: ['id', 'questionText', 'type']
    }
};

export const generateQuestions = async (): Promise<Question[]> => {
    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: "Generate exactly 15 diverse mental health screening questions. Include a mix of MCQ (with 4 options), RATING (from 1 to 5), and SLIDER (from 1 to 10) types. The questions should cover topics like anxiety, depression, stress, and well-being. Ensure the JSON output adheres to the provided schema.",
            config: {
                responseMimeType: "application/json",
                responseSchema: questionSchema,
                temperature: 1.0, 
            },
        });
        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as Question[];
    } catch (error) {
        console.error("Error generating questions:", error);
        throw new Error("Failed to generate questions from AI. Please try again.");
    }
};

const reportSchema = {
    type: Type.OBJECT,
    properties: {
        summary: { type: Type.STRING, description: "A brief, empathetic overview of the user's responses." },
        concerns: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Areas where answers might indicate challenges." },
        strengths: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Areas suggesting resilience or positive coping." },
        suggestions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3-5 concrete, gentle suggestions for well-being." },
        disclaimer: { type: Type.STRING, description: "A clear disclaimer stating this is not a medical diagnosis." }
    },
    required: ['summary', 'concerns', 'strengths', 'suggestions', 'disclaimer']
};

export const analyzeAnswers = async (answers: Answer[]): Promise<ReportData> => {
    const prompt = `A user has completed a mental health questionnaire. Here are their answers:
    ${JSON.stringify(answers, null, 2)}

    Analyze these answers thoughtfully and empathetically. Generate a response in the specified JSON format.
    - For 'concerns' and 'strengths', provide each point as a separate string in the array.
    - For 'suggestions', provide 3-5 concrete, actionable tips as separate strings in the array.
    - The 'summary' should be a brief, supportive overview.
    - The 'disclaimer' must state this is not a diagnosis and recommend consulting a professional.
    Be encouraging and avoid alarming language.`;

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: reportSchema,
            }
        });
        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as ReportData;
    } catch (error) {
        console.error("Error analyzing answers:", error);
        throw new Error("Failed to analyze answers with AI. Please try again.");
    }
};

const doctorSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            name: { type: Type.STRING, description: "Full name of the doctor or clinic." },
            specialty: { type: Type.STRING, description: "e.g., Psychiatrist, Psychologist, Therapist." },
            address: { type: Type.STRING, description: "Full street address." },
            phone: { type: Type.STRING, description: "Contact phone number." },
            website: { type: Type.STRING, description: "Official website URL, if available." },
        },
        required: ['name', 'specialty', 'address', 'phone']
    }
};

export const findNearbyDoctors = async (lat: number, lon: number): Promise<Doctor[]> => {
    const prompt = `Find a list of 5-7 real or realistic-looking mental health professionals (psychiatrists, psychologists, therapists) near latitude ${lat} and longitude ${lon}. Provide their name, specialty, a plausible address, and a phone number. If a website is commonly available, include it. The data must be in the specified JSON format.`;
    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: doctorSchema,
            },
        });
        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as Doctor[];
    } catch (error) {
        console.error("Error finding doctors:", error);
        throw new Error("Failed to find nearby doctors with AI. Please try again.");
    }
};

export const createChat = (): Chat => {
    return ai.chats.create({
        model: model,
        config: {
            systemInstruction: 'You are RIPEX, a friendly and empathetic mental health support chatbot. Your goal is to provide a safe, non-judgmental space for users to express their feelings. Offer supportive conversation, active listening, and gentle guidance. Do not provide medical advice, diagnoses, or treatment plans. If a user expresses severe distress or mentions self-harm, gently guide them to seek immediate professional help and provide a crisis hotline number like the 988 Suicide & Crisis Lifeline. Keep your responses concise and caring.',
        },
    });
};

const factsSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING, description: "A catchy title for the fact or snippet." },
            snippet: { type: Type.STRING, description: "A short, engaging paragraph (2-3 sentences) about the mental health topic." },
        },
        required: ['title', 'snippet']
    }
};

export const generateMentalHealthFacts = async (): Promise<Fact[]> => {
    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: "Generate 3 short, engaging, and positive facts or news snippets about mental health, wellness, or recent psychological findings. Format the output as JSON according to the schema.",
            config: {
                responseMimeType: "application/json",
                responseSchema: factsSchema
            }
        });
        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as Fact[];
    } catch (error) {
        console.error("Error generating facts:", error);
        // Return a fallback array so the UI doesn't break
        return [
            { title: "Mindful Moments", snippet: "Taking just a few minutes each day to practice mindfulness can reduce stress and improve focus. Try focusing on your breath." },
            { title: "The Power of Connection", snippet: "Strong social connections can improve mental well-being. Reach out to a friend or family member today." }
        ];
    }
};

const helplinesSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            name: { type: Type.STRING, description: "The official name of the helpline or organization." },
            phone: { type: Type.STRING, description: "The contact phone number." },
            description: { type: Type.STRING, description: "A brief description of the services offered." },
            website: { type: Type.STRING, description: "The official website URL." },
        },
        required: ['name', 'phone', 'description']
    }
};

export const getEmergencyContacts = async (): Promise<Helpline[]> => {
    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: "Provide a list of major national mental health helplines for the USA. Must include the 988 Suicide & Crisis Lifeline, The Trevor Project, and NAMI Helpline. Ensure the output is JSON conforming to the schema.",
            config: {
                responseMimeType: "application/json",
                responseSchema: helplinesSchema
            }
        });
        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as Helpline[];
    } catch (error) {
        console.error("Error fetching helplines:", error);
        // Return a hardcoded fallback list
        return [
            { name: "988 Suicide & Crisis Lifeline", phone: "988", description: "Provides 24/7, free and confidential support for people in distress, prevention and crisis resources for you or your loved ones.", website: "https://988lifeline.org/" },
            { name: "NAMI Helpline", phone: "1-800-950-NAMI (6264)", description: "The National Alliance on Mental Illness provides advocacy, education, support and public awareness so that all individuals and families affected by mental illness can build better lives.", website: "https://www.nami.org/" },
            { name: "The Trevor Project", phone: "1-866-488-7386", description: "The leading national organization providing crisis intervention and suicide prevention services to lesbian, gay, bisexual, transgender, queer & questioning (LGBTQ) young people under 25.", website: "https://www.thetrevorproject.org/" }
        ];
    }
};
