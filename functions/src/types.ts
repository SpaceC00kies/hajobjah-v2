// This file acts as a bridge, re-exporting all necessary types
// from the single source of truth in the root `types` directory
// for use within the Firebase Functions backend environment.
// The .js extension is required due to the "NodeNext" module resolution strategy.

export * from '../../types/types.js';
