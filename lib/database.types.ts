// lib/database.types.ts
export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export interface Problem {
  id: number;
  title: string;
  description: string;
  difficulty: Difficulty;
  test_cases: {
    sample: { inputs: string[]; outputs: string[] };
    hidden: { inputs: string[]; outputs: string[] };
  };
  solution: string | null;
  hint: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  first_name: string;
  last_name: string;
  display_name: string | null;
  role: string;
  progress: {
    problemsProgress: Record<
      number,
      {
        id: number;
        status: 'unsolved' | 'solved' | 'attempted';
        lastAttempted?: string;
        completedAt?: string;
        attempts: number;
      }
    >;
    totalSolved: number;
    totalAttempted: number;
    streak: number;
    lastActive?: string;
  };
  created_at: string;
  updated_at: string;
}