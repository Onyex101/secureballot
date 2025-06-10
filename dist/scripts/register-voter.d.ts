#!/usr/bin/env ts-node
/**
 * Script to register a single voter with realistic Nigerian data
 * This script demonstrates the voter registration process and shows
 * available elections for a Lagos-based voter.
 */
/**
 * Register a new voter
 */
declare function registerVoter(): Promise<void>;
export { registerVoter };
