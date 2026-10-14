/**
 * Skema Valibot untuk Berkas Fixture Voice Transaction Parser
 * Memvalidasi kalimat suara bahasa Indonesia dan ekspektasi hasil parsing ground-truth.
 */
import * as v from 'valibot';

export const VoiceFixtureExpectedSchema = v.object({
	type: v.picklist(['expense', 'income', 'transfer']),
	amount: v.nullable(v.pipe(v.number(), v.integer(), v.minValue(0))),
	categoryName: v.nullable(v.string()),
	walletName: v.nullable(v.string()),
	toWalletName: v.nullable(v.string()),
	relativeDays: v.optional(v.number()), // 0 = hari ini, -1 = kemarin, -2 = 2 hari lalu, dll
	dateString: v.optional(v.string()), // YYYY-MM-DD bila tanggal mutlak
	note: v.nullable(v.string()),
	uncertain: v.optional(
		v.object({
			type: v.optional(v.boolean()),
			amount: v.optional(v.boolean()),
			category: v.optional(v.boolean()),
			wallet: v.optional(v.boolean()),
			toWallet: v.optional(v.boolean()),
			date: v.optional(v.boolean())
		})
	)
});

export const VoiceFixtureItemSchema = v.object({
	id: v.string(),
	sentence: v.string(),
	description: v.optional(v.string()),
	expected: VoiceFixtureExpectedSchema
});

export const VoiceFixturesFileSchema = v.object({
	version: v.literal(1),
	description: v.string(),
	fixtures: v.array(VoiceFixtureItemSchema)
});

export type VoiceFixtureExpected = v.InferOutput<typeof VoiceFixtureExpectedSchema>;
export type VoiceFixtureItem = v.InferOutput<typeof VoiceFixtureItemSchema>;
export type VoiceFixturesFile = v.InferOutput<typeof VoiceFixturesFileSchema>;
