import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Lock, Award } from "lucide-react";

interface AssessmentLockScreenProps {
  assessment: {
    title: string;
    description?: string;
    passing_score?: number;
  };
  previousScore: number;
  completedDate?: string;
}

export function AssessmentLockScreen({ 
  assessment, 
  previousScore, 
  completedDate 
}: AssessmentLockScreenProps) {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card className="border-2 border-green-200 bg-green-50/50 dark:bg-green-950/20">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <Lock className="w-16 h-16 text-green-600" />
              <CheckCircle className="w-8 h-8 text-green-600 absolute -bottom-1 -right-1 bg-white rounded-full" />
            </div>
          </div>
          <CardTitle className="text-2xl text-green-800 dark:text-green-200">
            Assessment Already Completed
          </CardTitle>
          <p className="text-muted-foreground mt-2">{assessment.title}</p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-green-200">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Award className="w-6 h-6 text-green-600" />
              <h3 className="text-lg font-semibold text-green-800 dark:text-green-200">
                Assessment Locked
              </h3>
            </div>
            <p className="text-center text-gray-700 dark:text-gray-300">
              You have successfully completed this assessment and cannot retake it.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg text-center bg-white dark:bg-gray-800">
              <div className="text-3xl font-bold text-green-600">{previousScore}%</div>
              <div className="text-sm text-muted-foreground mt-1">Your Score</div>
            </div>
            <div className="p-4 border rounded-lg text-center bg-white dark:bg-gray-800">
              <div className="text-3xl font-bold text-blue-600">
                {assessment.passing_score || 70}%
              </div>
              <div className="text-sm text-muted-foreground mt-1">Passing Score</div>
            </div>
          </div>

          {completedDate && (
            <div className="p-4 border rounded-lg text-center bg-white dark:bg-gray-800">
              <div className="text-sm text-muted-foreground">Completed On</div>
              <div className="text-lg font-medium mt-1">
                {new Date(completedDate).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
            </div>
          )}

          <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-green-800 dark:text-green-200 mb-2">
                  What This Means:
                </p>
                <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
                  <li>• You have passed this assessment</li>
                  <li>• Your progress has been recorded</li>
                  <li>• You can continue to the next lesson</li>
                  <li>• This assessment is now locked</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}