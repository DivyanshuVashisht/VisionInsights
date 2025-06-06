
'use server';

/**
 * @fileOverview An AI agent that analyzes an image to extract text and answer questions.
 *
 * - analyzeImage - A function that handles the image analysis process.
 * - AnalyzeImageInput - The input type for the analyzeImage function.
 * - AnalyzeImageOutput - The return type for the analyzeImage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeImageInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo to analyze, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type AnalyzeImageInput = z.infer<typeof AnalyzeImageInputSchema>;

const AnalyzeImageOutputSchema = z.object({
  analysisResult: z.string().describe('The extracted text from the image, and if a question is present, the answer to that question.'),
});
export type AnalyzeImageOutput = z.infer<typeof AnalyzeImageOutputSchema>;

export async function analyzeImage(input: AnalyzeImageInput): Promise<AnalyzeImageOutput> {
  return analyzeImageFlow(input);
}

const analyzeImagePrompt = ai.definePrompt({
  name: 'analyzeImagePrompt',
  input: {schema: AnalyzeImageInputSchema},
  output: {schema: AnalyzeImageOutputSchema},
  prompt: `You are an AI assistant specialized in extracting text from images and answering questions based on that text. Your primary goal is to accurately read all text within the image.

If the image contains a question, especially a multiple-choice question (MCQ), identify the question and its options, and then provide the correct answer. Focus on accuracy for text extraction and answering questions. Do not provide general descriptions of the image.

Image: {{media url=photoDataUri}}`,
});

const analyzeImageFlow = ai.defineFlow(
  {
    name: 'analyzeImageFlow',
    inputSchema: AnalyzeImageInputSchema,
    outputSchema: AnalyzeImageOutputSchema,
  },
  async input => {
    const {output} = await analyzeImagePrompt(input);
    // Handle cases where the model might return an empty or unexpected response
    if (!output || !output.analysisResult) {
      // Consider throwing a more specific error or returning a default value
      throw new Error('AI analysis did not return the expected result. The image might be unclear or contain content that could not be processed.');
    }
    return output;
  }
);
