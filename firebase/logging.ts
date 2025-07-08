
export const logFirebaseError = (functionName: string, error: unknown): void => {
  let errorMessage = "An unknown error occurred";
  let errorObject: any = error;

  if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === 'string') {
    errorMessage = error;
  } else if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') {
    errorMessage = error.message;
  }

  console.error(`Firebase Error in ${functionName}: ${errorMessage}`, errorObject);
  // In a real application, you might send this to a logging service:
  // Sentry.captureException(error, { extra: { functionName, originalError: error } });
};
