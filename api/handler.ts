
/**
 * CLOUDFLARE WORKER INTEGRATION
 * This module handles communication with the external Cloudflare Worker API.
 */

const WORKER_URL = "https://rough-wildflower-615f.issamchibi123.workers.dev";

/**
 * secureAnalyzeHandler
 * Sends text to the Cloudflare Worker for processing.
 * 
 * @param ip - The client IP (for logging/tracking)
 * @param payload - The request payload containing text, mode, and tone
 * @returns Promise<any> - The processed result mapped to the frontend's expected format
 */
export const secureAnalyzeHandler = async (ip: string, payload: any) => {
  try {
    // 1. Send POST request to the Cloudflare Worker API
    const response = await fetch(WORKER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: payload.text,
        mode: payload.mode, // "grammar" | "paraphrase"
        tone: payload.tone || "neutral",
      }),
    });

    // 2. Handle API errors
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API request failed with status ${response.status}`);
    }

    // 3. Extract the "corrected" field from the response
    const data = await response.json();
    
    if (!data || typeof data.corrected === 'undefined') {
      throw new Error("Invalid response format: 'corrected' field missing");
    }

    // 4. Return the result back to the frontend UI
    return data;

  } catch (error: any) {
    // 5. Proper error handling and fallback
    console.error(`[WORKER_INTEGRATION_ERROR]: ${error.message}`);
    
    // Re-throw with a user-friendly message
    throw new Error(error.message || "The writing assistant service is currently unavailable. Please try again later.");
  }
};

export default {
  secureAnalyzeHandler
};

