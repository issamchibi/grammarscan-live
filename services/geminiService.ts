
import { AnalysisResponse } from "../types";

/**
 * Service Layer (Frontend)
 * Optimized for secure communication with the backend handler.
 */
export const analyzeText = async (
  payload: any
): Promise<AnalysisResponse> => {
  try {
    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Failed to analyze text");
    }

    return await response.json();
  } catch (error: any) {
    throw new Error(error.message);
  }
};
