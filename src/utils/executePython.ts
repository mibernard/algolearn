import axios from 'axios';

const JUDGE0_API_URL = 'https://judge0-ce.p.rapidapi.com/submissions';
const RAPIDAPI_KEY = '15c8f0d337mshf942e9d9c652c94p1890c7jsn88a8e0bcc86d'; // Replace with your RapidAPI key

type Judge0Response = {
  token: string;
  status: { id: number; description: string };
  stdout?: string;
  stderr?: string;
  compile_output?: string;
};

type ErrorWithResponse = {
  response?: {
    data?: {
      message?: string;
      [key: string]: unknown;
    };
  };
};

export async function executePython(code: string): Promise<string> {
  const submission = {
    source_code: code,
    language_id: 71, // Python 3
  };

  try {
    // Submit the code
    const { data: submissionResponse } = await axios.post<Judge0Response>(JUDGE0_API_URL, submission, {
      headers: {
        'Content-Type': 'application/json',
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
      },
    });

    const token = submissionResponse.token;

    // Poll for result
    for (let i = 0; i < 10; i++) {
      const { data: result } = await axios.get<Judge0Response>(`${JUDGE0_API_URL}/${token}`, {
        headers: {
          'Content-Type': 'application/json',
          'X-RapidAPI-Key': RAPIDAPI_KEY,
          'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
        },
      });

      if (result.status.id > 2) {
        // Execution complete
        return result.stdout || result.stderr || result.compile_output || 'No output.';
      }

      // Wait 1 second before retrying
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    throw new Error('Execution timed out.');
  } catch (error: unknown) {
    if (error instanceof Error) {
      if ('response' in error && (error as ErrorWithResponse).response) {
        const errorResponse = (error as ErrorWithResponse).response?.data;
        console.error('Judge0 API Error Response:', errorResponse);
        throw new Error(`Execution failed: ${errorResponse?.message}`);
      } else {
        console.error('Unexpected Error:', error.message);
        throw new Error('Unexpected error occurred during execution.');
      }
    }
    console.error('Unexpected unknown error:', error);
    throw new Error('An unknown error occurred.');
  }
}
