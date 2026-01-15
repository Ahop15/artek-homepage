/**
 * ARTEK AI Worker - String Normalization for Deterministic Hashing
 *
 * Provides preprocessing functions to ensure consistent hash output
 * regardless of platform-specific string representations.
 */

/**
 * Normalize a string for deterministic hashing
 *
 * Applies the following transformations:
 * 1. Unicode NFC normalization - converts different unicode representations to canonical form
 *    Example: "café" (e + combining acute) → "café" (precomposed é)
 * 2. Line ending standardization - converts all line endings to Unix style (\n)
 *    \r\n (Windows) → \n
 *    \r (old Mac) → \n
 *
 * @param str - Input string to normalize
 * @returns Normalized string
 */
export function normalizeString(str: string): string {
	return (
		str
			// Unicode NFC (Canonical Decomposition, followed by Canonical Composition)
			// This ensures that characters like é are represented consistently
			// regardless of whether they were input as a single character or as e + combining accent
			.normalize('NFC')
			// Line ending standardization
			// Windows uses \r\n, old Mac uses \r, Unix uses \n
			// We standardize to \n for consistent hashing
			.replace(/\r\n/g, '\n')
			.replace(/\r/g, '\n')
	);
}

/**
 * Normalize a chat message for hashing
 *
 * @param msg - Message with role and content
 * @returns Normalized message
 */
export function normalizeMessage(msg: { role: string; content: string }): {
	role: string;
	content: string;
} {
	return {
		role: normalizeString(msg.role),
		content: normalizeString(msg.content),
	};
}

/**
 * Normalize an array of chat messages for hashing
 *
 * @param messages - Array of messages
 * @returns Array of normalized messages
 */
export function normalizeMessages(messages: Array<{ role: string; content: string }>): Array<{
	role: string;
	content: string;
}> {
	return messages.map(normalizeMessage);
}
