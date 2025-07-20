// functions/src/index.ts
import admin from "firebase-admin";

admin.initializeApp();

// Export callable functions for client-side interaction
export { universalSearch } from "./universalSearch.js";
export { filterListings } from "./listingService.js";
