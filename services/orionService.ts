// services/orionService.ts
import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase"; 

/**
 * Sends a command to the Cloud Function "orionAnalyze" 
 * and returns its string response.
 */
export async function runOrion(command: string): Promise<string> {
  const callFn = httpsCallable(functions, "orionAnalyze");
  const res = await callFn({ command });
  return res.data as string;
}
