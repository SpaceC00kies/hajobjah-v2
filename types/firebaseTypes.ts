
import type { User } from './types'; // Assuming User type is in types.ts

export interface FirebaseHelperCurrentUser {
  uid: string;
  username: string;
  contactDetails?: string; // For Job, HelperProfile
  photo?: string;          // For WebboardPost
  gender?: User['gender'];         // For HelperProfile
  birthdate?: User['birthdate'];     // For HelperProfile
  educationLevel?: User['educationLevel']; // For HelperProfile
}
