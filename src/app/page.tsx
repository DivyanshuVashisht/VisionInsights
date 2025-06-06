
"use client";

import { useState, useRef } from 'react';
import type { ChangeEvent } from 'react';
import NextImage from 'next/image'; 
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Camera, Upload, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { analyzeImage } from '@/ai/flows/analyze-image';
import type { AnalyzeImageOutput } from '@/ai/flows/analyze-image';
import { useToast } from "@/hooks/use-toast";

export default function ImageInsightsPage() {
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imageDataUri, setImageDataUri] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalyzeImageOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const captureInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImageFile(file);
      setAnalysisResult(null);
      setError(null);
      setImageDataUri(null); 

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Image = reader.result as string;
        const img = new Image();
        img.onload = () => {
          const MAX_WIDTH = 1024;
          const MAX_HEIGHT = 1024;
          let { width, height } = img;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height = Math.round((height * MAX_WIDTH) / width);
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width = Math.round((width * MAX_HEIGHT) / height);
              height = MAX_HEIGHT;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');

          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressedDataUri = canvas.toDataURL('image/jpeg', 0.7); // Compress to 70% quality JPEG
            setImageDataUri(compressedDataUri);
            if (compressedDataUri.length < base64Image.length) {
                toast({ title: "Image Compressed", description: `Image size reduced for optimized analysis.` });
            }
          } else {
            setError("Failed to process image for compression. Using original image.");
            setImageDataUri(base64Image); // Use original if compression fails
          }
        };
        img.onerror = () => {
          setError("Failed to load image for processing.");
          setImageDataUri(null);
          setSelectedImageFile(null);
        };
        img.src = base64Image;
      };
      reader.onerror = () => {
        setError("Failed to read image file.");
        setImageDataUri(null);
        setSelectedImageFile(null);
      };
      reader.readAsDataURL(file);
    }
    
    if (event.target) {
      event.target.value = '';
    }
  };

  const handleAnalyze = async () => {
    if (!imageDataUri) {
      setError("No image selected for analysis.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);
    try {
      const result = await analyzeImage({ photoDataUri: imageDataUri });
      setAnalysisResult(result);
    } catch (err) {
      console.error("Analysis error:", err);
      let errorMessage = "Failed to analyze image. Please try again.";
      if (err instanceof Error) {
        errorMessage = err.message || errorMessage;
        if (errorMessage.includes("INTERNAL")) {
            errorMessage = "The AI model could not process the request. This might be due to safety filters or an issue with the image content. Try a different image or adjust the image content."
        }
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 sm:p-6 font-body">
      <Card className="w-full max-w-2xl shadow-2xl rounded-xl overflow-hidden bg-card">
        <CardHeader className="border-b border-border p-6">
          <CardTitle className="text-3xl font-headline text-center text-primary">Image Insights</CardTitle>
          <CardDescription className="text-center text-muted-foreground mt-2">
            Capture or upload an image to get AI-powered analysis and insights.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Button
                onClick={() => captureInputRef.current?.click()}
                variant="outline"
                className="w-full py-3 text-base hover:bg-accent hover:text-accent-foreground focus-visible:ring-accent"
                aria-label="Capture an image using your device camera"
              >
                <Camera className="mr-2 h-5 w-5" /> Capture Image
              </Button>
              <Input
                type="file"
                accept="image/*"
                capture="environment"
                ref={captureInputRef}
                onChange={handleImageSelect}
                className="hidden"
                id="capture-input"
                aria-labelledby="capture-button-label"
              />
              <Button
                onClick={() => uploadInputRef.current?.click()}
                variant="outline"
                className="w-full py-3 text-base hover:bg-accent hover:text-accent-foreground focus-visible:ring-accent"
                aria-label="Upload an image from your device gallery"
              >
                <Upload className="mr-2 h-5 w-5" /> Upload Image
              </Button>
              <Input
                type="file"
                accept="image/*"
                ref={uploadInputRef}
                onChange={handleImageSelect}
                className="hidden"
                id="upload-input"
                aria-labelledby="upload-button-label"
              />
            </div>
          </div>

          {imageDataUri && (
            <div className="mt-6 border border-border rounded-lg p-4 bg-muted/20 shadow-inner data-[state=visible]:animate-in data-[state=visible]:fade-in-0 duration-500" data-state={imageDataUri ? "visible" : "hidden"}>
              <h3 className="text-lg font-semibold text-foreground mb-3 text-center font-headline">Selected Image</h3>
              <div className="relative aspect-video w-full max-w-md mx-auto rounded-md overflow-hidden">
                <NextImage src={imageDataUri} alt="Selected preview" layout="fill" objectFit="contain" data-ai-hint="uploaded image" />
              </div>
            </div>
          )}

          {selectedImageFile && imageDataUri && (
             <div className="flex justify-center mt-6">
                <Button
                    onClick={handleAnalyze}
                    disabled={isLoading || !imageDataUri}
                    size="lg"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                    {isLoading ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ) : (
                    <Sparkles className="mr-2 h-5 w-5" />
                    )}
                    Analyze Image
                </Button>
            </div>
          )}
        </CardContent>

        {(isLoading || error || analysisResult) && (
          <CardFooter className="p-6 border-t border-border bg-card flex flex-col items-center">
            {isLoading && (
              <div className="flex flex-col items-center text-foreground animate-pulse py-4" data-testid="loading-indicator">
                <Loader2 className="h-10 w-10 text-primary animate-spin mb-3" />
                <p className="text-lg font-medium font-headline">Analyzing your image...</p>
                <p className="text-sm text-muted-foreground">Please wait a moment.</p>
              </div>
            )}

            {error && !isLoading && (
              <div role="alert" className="w-full p-4 bg-destructive/10 border border-destructive text-destructive rounded-md flex items-start space-x-3 data-[state=visible]:animate-in data-[state=visible]:fade-in-0 duration-500" data-state={error ? "visible" : "hidden"}>
                <AlertCircle className="h-6 w-6 mt-0.5 shrink-0" />
                <div>
                    <p className="font-semibold font-headline">Analysis Error</p>
                    <p className="text-sm">{error}</p>
                </div>
              </div>
            )}

            {analysisResult && !isLoading && !error && (
              <div aria-live="polite" className="w-full space-y-3 data-[state=visible]:animate-in data-[state=visible]:fade-in-0 duration-500" data-state={analysisResult ? "visible" : "hidden"}>
                <h3 className="text-xl font-headline text-primary text-center">Analysis Results</h3>
                <div className="p-4 bg-secondary/30 border border-secondary rounded-md shadow whitespace-pre-wrap text-foreground">
                  {analysisResult.analysisResult}
                </div>
              </div>
            )}
          </CardFooter>
        )}
      </Card>
      <p className="text-center text-sm text-muted-foreground mt-8">
        Powered by GenAI
      </p>
    </div>
  );
}
