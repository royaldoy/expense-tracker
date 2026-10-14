import { writable } from 'svelte/store';
import type { ParsedVoiceTransaction } from '$lib/domain/voiceParser';

export interface VoiceTransactionData {
	rawText: string;
	parsed: ParsedVoiceTransaction;
}

const innerStore = writable<VoiceTransactionData | null>(null);

export const voiceTransactionStore = {
	subscribe: innerStore.subscribe,
	set: (data: VoiceTransactionData | null) => innerStore.set(data),
	consume: (): VoiceTransactionData | null => {
		let current: VoiceTransactionData | null = null;
		innerStore.update((val) => {
			current = val;
			return null;
		});
		return current;
	},
	clear: () => innerStore.set(null)
};
